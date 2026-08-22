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
/**
 * Processes one "send-email" job.
 *
 * Flow:
 *  1. Idempotency guard — if the DB already shows this job SENT, skip.
 *     (Covers the case where a job somehow gets processed twice, e.g. after
 *     a crash mid-send before the status update committed.)
 *  2. Rate-limit check against the sender's per-hour Redis counter.
 *     - If over budget: instead of failing the job, we push it into the
 *       next hour window via job.moveToDelayed() and mark it RESCHEDULED.
 *       This satisfies "don't drop jobs, reschedule into next available
 *       window" from the spec.
 *  3. Send via Ethereal SMTP, update DB to SENT/FAILED.
 *
 * Throttling (minimum delay between sends) is handled at the Worker level
 * via BullMQ's built-in `limiter` option below, not inside this function —
 * that way it applies queue-wide regardless of which job runs.
 */
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
    // Idempotency: already sent (e.g. duplicate delivery after a crash) — no-op.
    if (emailJob.status === "SENT") {
        console.log(`[worker] EmailJob ${emailJobId} already SENT, skipping duplicate delivery`);
        return { skipped: true, reason: "already_sent" };
    }
    // Rate limit check — bucketed per (sender, campaign) so two campaigns
    // sharing a sender each get their own hourly budget, using whatever
    // hourlyLimit the user set when scheduling this campaign.
    const rateLimitKey = `${emailJob.senderId}:${emailJob.campaignId}`;
    const rateCheck = await (0, rateLimiter_1.tryConsumeRateLimit)(rateLimitKey, emailJob.campaign.hourlyLimit);
    if (!rateCheck.allowed) {
        const retryAfterMs = rateCheck.retryAfterMs ?? 60 * 60 * 1000;
        console.log(`[worker] Rate limit hit for sender ${emailJob.senderId} (${rateCheck.currentCount}/${rateCheck.limit}). ` +
            `Rescheduling job ${job.id} in ${Math.round(retryAfterMs / 1000)}s`);
        await prisma_1.prisma.emailJob.update({
            where: { id: emailJobId },
            data: { status: "RESCHEDULED", scheduledFor: new Date(Date.now() + retryAfterMs) },
        });
        if (token) {
            // Push this same job further into the future without consuming a
            // retry attempt or marking it failed — it stays the same job.
            await job.moveToDelayed(Date.now() + retryAfterMs, token);
            throw new bullmq_1.DelayedError();
        }
        // Fallback (shouldn't normally happen — token is always provided by the Worker)
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
        throw err; // let BullMQ's retry/backoff (see defaultJobOptions) take over
    }
}
exports.emailWorker = new bullmq_1.Worker(emailQueue_1.EMAIL_QUEUE_NAME, processEmailJob, {
    connection: connection_1.redisConnection,
    concurrency: env_1.env.WORKER_CONCURRENCY,
    // Queue-wide throttle: at most 1 job leaves the queue every
    // MIN_DELAY_BETWEEN_EMAILS_MS, mimicking real SMTP provider throttling.
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
/**
 * Restart-recovery note:
 * We deliberately do NOT re-scan the DB for pending jobs on worker boot.
 * BullMQ's delayed jobs already live inside Redis (which itself is
 * persisted via RDB/AOF — see docker-compose.yml), so as long as Redis's
 * data survives the restart, every previously-scheduled delayed job is
 * still sitting in the queue and will fire at its original timestamp.
 * The `reconcilePendingJobs` script (src/db/reconcile.ts) is provided as a
 * defensive backstop for the edge case where Redis data was lost but
 * Postgres (the source of truth) still has PENDING/QUEUED rows.
 */
//# sourceMappingURL=emailWorker.js.map