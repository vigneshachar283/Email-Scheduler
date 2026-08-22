"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryConsumeRateLimit = tryConsumeRateLimit;
exports.peekRateLimit = peekRateLimit;
const connection_1 = require("../queue/connection");
/**
 * Sliding-hour-bucket rate limiter backed by Redis INCR + EXPIRE.
 *
 * Why Redis and not in-memory counters: the worker can (and in production
 * should) run as multiple processes/instances. An in-memory counter would
 * be per-process and let each instance independently think it has quota
 * left, blowing past the real limit. Redis gives every worker instance a
 * single shared, atomic source of truth.
 *
 * Bucketing strategy: counters are keyed by `sender:<id>:<hourEpoch>`, where
 * hourEpoch is the current hour truncated to the hour boundary (e.g.
 * 2026-08-22T14:00). This is simpler and cheaper than a true sliding window
 * (e.g. a Redis sorted set with per-send timestamps) and is precise enough
 * for "N emails per clock hour" — the trade-off is it resets at the top of
 * each hour rather than being a strict rolling 60-minute window.
 */
function hourBucketKey(rateLimitKey, date) {
    const hourEpoch = Math.floor(date.getTime() / (60 * 60 * 1000));
    return `ratelimit:${rateLimitKey}:${hourEpoch}`;
}
/**
 * Atomically increments the counter for the given sender's current hour
 * bucket and reports whether the send is allowed. We increment optimistically
 * and roll back (decrement) if it turns out we're over the limit, so the
 * check-and-increment is effectively atomic without needing a Lua script.
 */
async function tryConsumeRateLimit(rateLimitKey, hourlyLimit, at = new Date()) {
    const key = hourBucketKey(rateLimitKey, at);
    const newCount = await connection_1.redisConnection.incr(key);
    if (newCount === 1) {
        // First increment in this bucket — set expiry so old buckets self-clean.
        await connection_1.redisConnection.expire(key, 60 * 60 * 2); // 2h safety margin
    }
    if (newCount > hourlyLimit) {
        // Over budget — roll back our increment and report denial.
        await connection_1.redisConnection.decr(key);
        const msIntoHour = at.getTime() % (60 * 60 * 1000);
        const retryAfterMs = 60 * 60 * 1000 - msIntoHour;
        return { allowed: false, currentCount: newCount - 1, limit: hourlyLimit, retryAfterMs };
    }
    return { allowed: true, currentCount: newCount, limit: hourlyLimit };
}
/** Read-only peek at the current bucket count, for dashboards/debugging. */
async function peekRateLimit(rateLimitKey, at = new Date()) {
    const key = hourBucketKey(rateLimitKey, at);
    const val = await connection_1.redisConnection.get(key);
    return val ? Number(val) : 0;
}
//# sourceMappingURL=rateLimiter.js.map