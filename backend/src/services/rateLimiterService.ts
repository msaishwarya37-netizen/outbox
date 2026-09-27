import { redisConnection } from '../config/redis';
import { env } from '../config/env';

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  senderCount: number;
  globalCount: number;
  msUntilNextHour: number;
}

// Fallback in-memory counters if Redis is unreachable
const memoryCounters = new Map<string, { count: number; expiresAt: number }>();

function getHourWindowKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
}

export function getMsUntilNextHourWindow(): number {
  const now = new Date();
  const nextHour = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours() + 1,
    0,
    0,
    0
  ));
  return Math.max(1000, nextHour.getTime() - now.getTime());
}

export async function checkAndIncrementRateLimit(
  senderEmail: string,
  customMaxPerHour?: number,
  customMaxPerSender?: number
): Promise<RateLimitCheckResult> {
  const maxGlobal = customMaxPerHour || env.MAX_EMAILS_PER_HOUR;
  const maxSender = customMaxPerSender || env.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const windowKey = getHourWindowKey();
  const msUntilNextHour = getMsUntilNextHourWindow();

  const senderRedisKey = `ratelimit:sender:${senderEmail.toLowerCase()}:${windowKey}`;
  const globalRedisKey = `ratelimit:global:${windowKey}`;

  try {
    // Atomic check using Redis multi/pipeline
    const pipeline = redisConnection.pipeline();
    pipeline.incr(senderRedisKey);
    pipeline.expire(senderRedisKey, 3600);
    pipeline.incr(globalRedisKey);
    pipeline.expire(globalRedisKey, 3600);

    const results = await pipeline.exec();
    const senderCount = (results?.[0]?.[1] as number) || 1;
    const globalCount = (results?.[2]?.[1] as number) || 1;

    if (senderCount > maxSender) {
      return {
        allowed: false,
        reason: `Sender ${senderEmail} exceeded hourly limit (${senderCount}/${maxSender})`,
        senderCount,
        globalCount,
        msUntilNextHour,
      };
    }

    if (globalCount > maxGlobal) {
      return {
        allowed: false,
        reason: `System exceeded global hourly limit (${globalCount}/${maxGlobal})`,
        senderCount,
        globalCount,
        msUntilNextHour,
      };
    }

    return {
      allowed: true,
      senderCount,
      globalCount,
      msUntilNextHour,
    };
  } catch (error) {
    // Graceful fallback to memory counters if Redis offline
    const now = Date.now();
    const senderMemKey = `sender:${senderEmail.toLowerCase()}:${windowKey}`;
    const globalMemKey = `global:${windowKey}`;

    const currentSenderObj = memoryCounters.get(senderMemKey) || { count: 0, expiresAt: now + 3600000 };
    const currentGlobalObj = memoryCounters.get(globalMemKey) || { count: 0, expiresAt: now + 3600000 };

    currentSenderObj.count += 1;
    currentGlobalObj.count += 1;

    memoryCounters.set(senderMemKey, currentSenderObj);
    memoryCounters.set(globalMemKey, currentGlobalObj);

    if (currentSenderObj.count > maxSender) {
      return {
        allowed: false,
        reason: `Sender ${senderEmail} exceeded hourly limit (mem fallback)`,
        senderCount: currentSenderObj.count,
        globalCount: currentGlobalObj.count,
        msUntilNextHour,
      };
    }

    return {
      allowed: true,
      senderCount: currentSenderObj.count,
      globalCount: currentGlobalObj.count,
      msUntilNextHour,
    };
  }
}
