import { prisma } from "./prisma";
import { emailQueue, enqueueEmailJob } from "../queue/emailQueue";

export async function reconcilePendingJobs() {
  const candidates = await prisma.emailJob.findMany({
    where: { status: { in: ["PENDING", "QUEUED", "RESCHEDULED"] } },
  });

  let requeued = 0;

  for (const job of candidates) {
    const existing = job.bullJobId ? await emailQueue.getJob(job.bullJobId) : undefined;
    if (existing) continue; 

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
