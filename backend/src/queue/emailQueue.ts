import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const EMAIL_QUEUE_NAME = "email-send-queue";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // Job data itself stays in Postgres as the source of truth; BullMQ
    // only needs to remember recent history for debugging/inspection.
    removeOnComplete: { age: 60 * 60 * 24, count: 5000 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export interface EmailJobPayload {
  emailJobId: string; // our Postgres EmailJob.id — worker loads full row from DB
}

/**
 * Enqueue a single email job.
 *
 * Idempotency: we pass emailJobId as the BullMQ jobId. BullMQ guarantees
 * jobId uniqueness per queue — calling add() twice with the same jobId is a
 * no-op (it returns the existing job instead of creating a duplicate). This
 * is our second layer of dedup on top of the DB's unique idempotencyKey.
 */
export async function enqueueEmailJob(params: {
  emailJobId: string;
  delayMs: number;
}) {
  const job = await emailQueue.add(
    "send-email",
    { emailJobId: params.emailJobId } satisfies EmailJobPayload,
    {
      jobId: params.emailJobId,
      delay: Math.max(0, params.delayMs),
    }
  );
  return job;
}
