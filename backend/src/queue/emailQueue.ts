import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const EMAIL_QUEUE_NAME = "email-send-queue";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 60 * 60 * 24, count: 5000 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export interface EmailJobPayload {
  emailJobId: string; 
}


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
