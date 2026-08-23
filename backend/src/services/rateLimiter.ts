import { redisConnection } from "../queue/connection";



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


export async function tryConsumeRateLimit(
  rateLimitKey: string,
  hourlyLimit: number,
  at: Date = new Date()
): Promise<RateLimitCheckResult> {
  const key = hourBucketKey(rateLimitKey, at);

  const newCount = await redisConnection.incr(key);
  if (newCount === 1) {
    await redisConnection.expire(key, 60 * 60 * 2); 
  }

  if (newCount > hourlyLimit) {
    await redisConnection.decr(key);
    const msIntoHour = at.getTime() % (60 * 60 * 1000);
    const retryAfterMs = 60 * 60 * 1000 - msIntoHour;
    return { allowed: false, currentCount: newCount - 1, limit: hourlyLimit, retryAfterMs };
  }

  return { allowed: true, currentCount: newCount, limit: hourlyLimit };
}

export async function peekRateLimit(rateLimitKey: string, at: Date = new Date()): Promise<number> {
  const key = hourBucketKey(rateLimitKey, at);
  const val = await redisConnection.get(key);
  return val ? Number(val) : 0;
}
