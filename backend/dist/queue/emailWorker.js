"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = void 0;
const bullmq_1 = require("bullmq");
const connection_1 = require("./connection");
const emailQueue_1 = require("./emailQueue");
const prisma_1 = require("../db/prisma");
const mailer_1 = require("../services/mailer");
const rateLimiter_1 = require("../services/rateLimiter");
const env_1 = require("../config/env");


async function processEmailJob(job, token) {
    const { emailJobId } = job.data;
    const emailJob = await prisma_1.prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: { sender: true, campaign: true },
    });
    if (!emailJob) {
        console.warn(`[worker] EmailJob ${emailJobId} not found in DB, skipping (job ${job.id})`);
        return { skipped: true, reason: "not_found" };
    }
    
    if (emailJob.status === "SENT") {
        console.log(`[worker] EmailJob ${emailJobId} already SENT, skipping duplicate delivery`);
        return { skipped: true, reason: "already_sent" };
    }
    
    const rateLimitKey = `sender:${emailJob.senderId}`;
    const effectiveHourlyLimit = Math.min(emailJob.campaign.hourlyLimit, emailJob.sender.maxEmailsPerHour, env_1.env.MAX_EMAILS_PER_HOUR_GLOBAL);
    const rateCheck = await (0, rateLimiter_1.tryConsumeRateLimit)(rateLimitKey, effectiveHourlyLimit);
    if (!rateCheck.allowed) {
        const retryAfterMs = rateCheck.retryAfterMs ?? 60 * 60 * 1000;
        console.log(`[worker] Rate limit hit for sender ${emailJob.senderId} (${rateCheck.currentCount}/${rateCheck.limit}). ` +
            `Rescheduling job ${job.id} in ${Math.round(retryAfterMs / 1000)}s`);
        await prisma_1.prisma.emailJob.update({
            where: { id: emailJobId },
            data: { status: "RESCHEDULED", scheduledFor: new Date(Date.now() + retryAfterMs) },
        });
        if (token) {
           
            await job.moveToDelayed(Date.now() + retryAfterMs, token);
            throw new bullmq_1.DelayedError();
        }
        
        throw new Error("rate_limited_no_token");
    }
    try {
        const result = await (0, mailer_1.sendEmail)({
            sender: emailJob.sender,
            to: emailJob.recipientEmail,
            subject: emailJob.subject,
            body: emailJob.body,
        });
        await prisma_1.prisma.emailJob.update({
            where: { id: emailJobId },
            data: { status: "SENT", sentAt: new Date(), lastError: null },
        });
        console.log(`[worker] Sent ${emailJobId} to ${emailJob.recipientEmail} — preview: ${result.previewUrl}`);
        return { sent: true, previewUrl: result.previewUrl };
    }
    catch (err) {
        await prisma_1.prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
                status: "FAILED",
                attempts: { increment: 1 },
                lastError: String(err?.message ?? err),
            },
        });
        throw err; 
    }
}
exports.emailWorker = new bullmq_1.Worker(emailQueue_1.EMAIL_QUEUE_NAME, processEmailJob, {
    connection: connection_1.redisConnection,
    concurrency: env_1.env.WORKER_CONCURRENCY,

    limiter: {
        max: 1,
        duration: env_1.env.MIN_DELAY_BETWEEN_EMAILS_MS,
    },
});
exports.emailWorker.on("completed", (job) => {
    console.log(`[worker] job ${job.id} completed`);
});
exports.emailWorker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
});
console.log(`[worker] started — concurrency=${env_1.env.WORKER_CONCURRENCY}, ` +
    `minDelayBetweenSends=${env_1.env.MIN_DELAY_BETWEEN_EMAILS_MS}ms`);
