import { Worker, Job, DelayedError } from "bullmq";
import { redisConnection } from "./connection";
import { EMAIL_QUEUE_NAME, EmailJobPayload, enqueueEmailJob } from "./emailQueue";
import { prisma } from "../db/prisma";
import { sendEmail } from "../services/mailer";
import { tryConsumeRateLimit } from "../services/rateLimiter";
import { env } from "../config/env";

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

  // Idempotency: already sent (e.g. duplicate delivery after a crash) — no-op.
  if (emailJob.status === "SENT") {
    console.log(`[worker] EmailJob ${emailJobId} already SENT, skipping duplicate delivery`);
    return { skipped: true, reason: "already_sent" };
  }

  // Rate limit check — bucketed per (sender, campaign) so two campaigns
  // sharing a sender each get their own hourly budget, using whatever
  // hourlyLimit the user set when scheduling this campaign.
  const rateLimitKey = `${emailJob.senderId}:${emailJob.campaignId}`;
  const rateCheck = await tryConsumeRateLimit(rateLimitKey, emailJob.campaign.hourlyLimit);

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
      // Push this same job further into the future without consuming a
      // retry attempt or marking it failed — it stays the same job.
      await job.moveToDelayed(Date.now() + retryAfterMs, token);
      throw new DelayedError();
    }
    // Fallback (shouldn't normally happen — token is always provided by the Worker)
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
    throw err; // let BullMQ's retry/backoff (see defaultJobOptions) take over
  }
}

export const emailWorker = new Worker<EmailJobPayload>(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redisConnection,
  concurrency: env.WORKER_CONCURRENCY,
  // Queue-wide throttle: at most 1 job leaves the queue every
  // MIN_DELAY_BETWEEN_EMAILS_MS, mimicking real SMTP provider throttling.
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
