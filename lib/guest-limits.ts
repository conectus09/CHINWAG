import { REDIS_KEYS } from "./constants";
import { GUEST_DAILY_MATCH_LIMIT } from "./guest-constants";
import { getRedis } from "./redis";

export { GUEST_DAILY_MATCH_LIMIT } from "./guest-constants";

declare global {
  // eslint-disable-next-line no-var
  var chinwagGuestLimitStore: Map<string, number> | undefined;
}

const memoryStore =
  global.chinwagGuestLimitStore ?? (global.chinwagGuestLimitStore = new Map());

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function limitKey(userId: string): string {
  return `${REDIS_KEYS.guestMatches(userId)}:${todayKey()}`;
}

export async function getGuestMatchCount(userId: string): Promise<number> {
  const redis = getRedis();
  const key = limitKey(userId);
  if (redis) {
    const raw = await redis.get(key);
    return raw ? Number(raw) : 0;
  }
  return memoryStore.get(key) ?? 0;
}

export async function incrementGuestMatchCount(userId: string): Promise<number> {
  const redis = getRedis();
  const key = limitKey(userId);
  if (redis) {
    const count = await redis.incr(key);
    await redis.expire(key, 86400);
    return count;
  }
  const next = (memoryStore.get(key) ?? 0) + 1;
  memoryStore.set(key, next);
  return next;
}

export async function canGuestMatch(userId: string): Promise<boolean> {
  const count = await getGuestMatchCount(userId);
  return count < GUEST_DAILY_MATCH_LIMIT;
}

