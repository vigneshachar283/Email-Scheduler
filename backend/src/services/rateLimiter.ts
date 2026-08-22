import { redisConnection } from "../queue/connection";

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

function hourBucketKey(rateLimitKey: string, date: Date): string {
  const hourEpoch = Math.floor(date.getTime() / (60 * 60 * 1000));
  return `ratelimit:${rateLimitKey}:${hourEpoch}`;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  /** If not allowed, ms until the next hour bucket opens up. */
  retryAfterMs?: number;
}

/**
 * Atomically increments the counter for the given sender's current hour
 * bucket and reports whether the send is allowed. We increment optimistically
 * and roll back (decrement) if it turns out we're over the limit, so the
 * check-and-increment is effectively atomic without needing a Lua script.
 */
export async function tryConsumeRateLimit(
  rateLimitKey: string,
  hourlyLimit: number,
  at: Date = new Date()
): Promise<RateLimitCheckResult> {
  const key = hourBucketKey(rateLimitKey, at);

  const newCount = await redisConnection.incr(key);
  if (newCount === 1) {
    // First increment in this bucket — set expiry so old buckets self-clean.
    await redisConnection.expire(key, 60 * 60 * 2); // 2h safety margin
  }

  if (newCount > hourlyLimit) {
    // Over budget — roll back our increment and report denial.
    await redisConnection.decr(key);
    const msIntoHour = at.getTime() % (60 * 60 * 1000);
    const retryAfterMs = 60 * 60 * 1000 - msIntoHour;
    return { allowed: false, currentCount: newCount - 1, limit: hourlyLimit, retryAfterMs };
  }

  return { allowed: true, currentCount: newCount, limit: hourlyLimit };
}

/** Read-only peek at the current bucket count, for dashboards/debugging. */
export async function peekRateLimit(rateLimitKey: string, at: Date = new Date()): Promise<number> {
  const key = hourBucketKey(rateLimitKey, at);
  const val = await redisConnection.get(key);
  return val ? Number(val) : 0;
}
