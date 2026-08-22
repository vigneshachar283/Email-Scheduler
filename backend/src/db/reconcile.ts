import { prisma } from "./prisma";
import { emailQueue, enqueueEmailJob } from "../queue/emailQueue";

/**
 * Defensive backstop for persistence-on-restart.
 *
 * Normal case: Redis persists BullMQ's delayed jobs across restarts (see
 * docker-compose.yml appendonly config), so nothing here needs to run.
 *
 * Edge case this guards against: Redis data itself was wiped (fresh
 * container, volume loss, etc.) while Postgres — our source of truth —
 * still has PENDING/QUEUED rows with no corresponding BullMQ job. Run this
 * once on server boot to re-enqueue anything that's missing, using the
 * DB-unique idempotencyKey/bullJobId so nothing gets double-sent.
 */
export async function reconcilePendingJobs() {
  const candidates = await prisma.emailJob.findMany({
    where: { status: { in: ["PENDING", "QUEUED", "RESCHEDULED"] } },
  });

  let requeued = 0;

  for (const job of candidates) {
    const existing = job.bullJobId ? await emailQueue.getJob(job.bullJobId) : undefined;
    if (existing) continue; // already present in Redis, nothing to do

    const delayMs = Math.max(0, job.scheduledFor.getTime() - Date.now());
    const bullJob = await enqueueEmailJob({ emailJobId: job.id, delayMs });

    await prisma.emailJob.update({
      where: { id: job.id },
      data: { bullJobId: bullJob.id, status: "QUEUED" },
    });
    requeued++;
  }

  if (requeued > 0) {
    console.log(`[reconcile] re-enqueued ${requeued} job(s) missing from Redis`);
  }
  return requeued;
}
