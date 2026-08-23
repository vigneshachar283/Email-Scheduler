import { Worker, Job, DelayedError } from "bullmq";
import { redisConnection } from "./connection";
import { EMAIL_QUEUE_NAME, EmailJobPayload, enqueueEmailJob } from "./emailQueue";
import { prisma } from "../db/prisma";
import { sendEmail } from "../services/mailer";
import { tryConsumeRateLimit } from "../services/rateLimiter";
import { env } from "../config/env";


async function processEmailJob(job: Job<EmailJobPayload>, token?: string) {
  const { emailJobId } = job.data;

  const emailJob = await prisma.emailJob.findUnique({
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

  const effectiveHourlyLimit = Math.min(
  emailJob.campaign.hourlyLimit,
  emailJob.sender.maxEmailsPerHour,
  env.MAX_EMAILS_PER_HOUR_GLOBAL
);


const rateCheck = await tryConsumeRateLimit(
  rateLimitKey,
  effectiveHourlyLimit
);

  if (!rateCheck.allowed) {
    const retryAfterMs = rateCheck.retryAfterMs ?? 60 * 60 * 1000;
    console.log(
      `[worker] Rate limit hit for sender ${emailJob.senderId} (${rateCheck.currentCount}/${rateCheck.limit}). ` +
        `Rescheduling job ${job.id} in ${Math.round(retryAfterMs / 1000)}s`
    );

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "RESCHEDULED", scheduledFor: new Date(Date.now() + retryAfterMs) },
    });

    if (token) {
    
      await job.moveToDelayed(Date.now() + retryAfterMs, token);
      throw new DelayedError();
    }
    throw new Error("rate_limited_no_token");
  }

  try {
    const result = await sendEmail({
      sender: emailJob.sender,
      to: emailJob.recipientEmail,
      subject: emailJob.subject,
      body: emailJob.body,
    });

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "SENT", sentAt: new Date(), lastError: null },
    });

    console.log(`[worker] Sent ${emailJobId} to ${emailJob.recipientEmail} — preview: ${result.previewUrl}`);
    return { sent: true, previewUrl: result.previewUrl };
  } catch (err: any) {
    await prisma.emailJob.update({
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

export const emailWorker = new Worker<EmailJobPayload>(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redisConnection,
  concurrency: env.WORKER_CONCURRENCY,

  limiter: {
    max: 1,
    duration: env.MIN_DELAY_BETWEEN_EMAILS_MS,
  },
});

emailWorker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

console.log(
  `[worker] started — concurrency=${env.WORKER_CONCURRENCY}, ` +
    `minDelayBetweenSends=${env.MIN_DELAY_BETWEEN_EMAILS_MS}ms`
);

