"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = exports.EMAIL_QUEUE_NAME = void 0;
exports.enqueueEmailJob = enqueueEmailJob;
const bullmq_1 = require("bullmq");
const connection_1 = require("./connection");
exports.EMAIL_QUEUE_NAME = "email-send-queue";
exports.emailQueue = new bullmq_1.Queue(exports.EMAIL_QUEUE_NAME, {
    connection: connection_1.redisConnection,
    defaultJobOptions: {
        // Job data itself stays in Postgres as the source of truth; BullMQ
        // only needs to remember recent history for debugging/inspection.
        removeOnComplete: { age: 60 * 60 * 24, count: 5000 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
    },
});
/**
 * Enqueue a single email job.
 *
 * Idempotency: we pass emailJobId as the BullMQ jobId. BullMQ guarantees
 * jobId uniqueness per queue — calling add() twice with the same jobId is a
 * no-op (it returns the existing job instead of creating a duplicate). This
 * is our second layer of dedup on top of the DB's unique idempotencyKey.
 */
async function enqueueEmailJob(params) {
    const job = await exports.emailQueue.add("send-email", { emailJobId: params.emailJobId }, {
        jobId: params.emailJobId,
        delay: Math.max(0, params.delayMs),
    });
    return job;
}
//# sourceMappingURL=emailQueue.js.map