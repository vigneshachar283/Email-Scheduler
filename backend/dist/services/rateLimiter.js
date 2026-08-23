"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryConsumeRateLimit = tryConsumeRateLimit;
exports.peekRateLimit = peekRateLimit;
const connection_1 = require("../queue/connection");
function hourBucketKey(rateLimitKey, date) {
    const hourEpoch = Math.floor(date.getTime() / (60 * 60 * 1000));
    return `ratelimit:${rateLimitKey}:${hourEpoch}`;
}
async function tryConsumeRateLimit(rateLimitKey, hourlyLimit, at = new Date()) {
    const key = hourBucketKey(rateLimitKey, at);
    const newCount = await connection_1.redisConnection.incr(key);
    if (newCount === 1) {
        await connection_1.redisConnection.expire(key, 60 * 60 * 2);
    }
    if (newCount > hourlyLimit) {
        await connection_1.redisConnection.decr(key);
        const msIntoHour = at.getTime() % (60 * 60 * 1000);
        const retryAfterMs = 60 * 60 * 1000 - msIntoHour;
        return { allowed: false, currentCount: newCount - 1, limit: hourlyLimit, retryAfterMs };
    }
    return { allowed: true, currentCount: newCount, limit: hourlyLimit };
}
async function peekRateLimit(rateLimitKey, at = new Date()) {
    const key = hourBucketKey(rateLimitKey, at);
    const val = await connection_1.redisConnection.get(key);
    return val ? Number(val) : 0;
}
//# sourceMappingURL=rateLimiter.js.map