"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePendingJobs = reconcilePendingJobs;
const prisma_1 = require("./prisma");
const emailQueue_1 = require("../queue/emailQueue");
async function reconcilePendingJobs() {
    const candidates = await prisma_1.prisma.emailJob.findMany({
        where: { status: { in: ["PENDING", "QUEUED", "RESCHEDULED"] } },
    });
    let requeued = 0;
    for (const job of candidates) {
        const existing = job.bullJobId ? await emailQueue_1.emailQueue.getJob(job.bullJobId) : undefined;
        if (existing)
            continue;
        const delayMs = Math.max(0, job.scheduledFor.getTime() - Date.now());
        const bullJob = await (0, emailQueue_1.enqueueEmailJob)({ emailJobId: job.id, delayMs });
        await prisma_1.prisma.emailJob.update({
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
//# sourceMappingURL=reconcile.js.map