import { ONLINE_USERS_KEY, REDIS_KEYS } from "./constants";
import { ensureRedisReady, getRedis } from "./redis";

/** How long a heartbeat stays "online" without refresh */
export const LIVE_PRESENCE_TTL_MS = 45_000;

declare global {
  // eslint-disable-next-line no-var
  var chinwagLivePresenceStore: Map<string, number> | undefined;
}

const memoryStore =
  global.chinwagLivePresenceStore ??
  (global.chinwagLivePresenceStore = new Map<string, number>());

function pruneMemory(now = Date.now()): void {
  for (const [sessionId, lastSeen] of memoryStore) {
    if (now - lastSeen > LIVE_PRESENCE_TTL_MS) {
      memoryStore.delete(sessionId);
    }
  }
}

async function pruneRedis(now = Date.now()): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.zremrangebyscore(
    REDIS_KEYS.livePresence,
    0,
    now - LIVE_PRESENCE_TTL_MS,
  );
}

export async function recordLiveHeartbeat(sessionId: string): Promise<number> {
  if (!sessionId || sessionId.length < 8) {
    throw new Error("Invalid presence session");
  }

  await ensureRedisReady();
  const now = Date.now();
  const redis = getRedis();

  if (redis) {
    await redis.zadd(REDIS_KEYS.livePresence, now, sessionId);
    await pruneRedis(now);
    return redis.zcard(REDIS_KEYS.livePresence);
  }

  pruneMemory(now);
  memoryStore.set(sessionId, now);
  return memoryStore.size;
}

export async function removeLiveSession(sessionId: string): Promise<number> {
  await ensureRedisReady();
  const redis = getRedis();

  if (redis) {
    await redis.zrem(REDIS_KEYS.livePresence, sessionId);
    await pruneRedis();
    return redis.zcard(REDIS_KEYS.livePresence);
  }

  memoryStore.delete(sessionId);
  pruneMemory();
  return memoryStore.size;
}

export async function getHeartbeatOnlineCount(): Promise<number> {
  await ensureRedisReady();
  const now = Date.now();
  const redis = getRedis();

  if (redis) {
    await pruneRedis(now);
    return redis.zcard(REDIS_KEYS.livePresence);
  }

  pruneMemory(now);
  return memoryStore.size;
}

async function getSocketOnlineCount(): Promise<number> {
  await ensureRedisReady();
  const redis = getRedis();
  if (!redis) return 0;
  const count = await redis.scard(ONLINE_USERS_KEY);
  return count > 0 ? count : 0;
}

export interface LivePresenceSnapshot {
  online: number;
  waiting: number;
  chatting: number;
  source: "heartbeat" | "socket" | "none";
}

/** Real online count — 1 browser tab session = 1 user via heartbeat ZSET. */
export async function getLivePresenceSnapshot(activity?: {
  waiting: number;
  chatting: number;
}): Promise<LivePresenceSnapshot> {
  const waiting = activity?.waiting ?? 0;
  const chatting = activity?.chatting ?? 0;

  const [heartbeat, socket] = await Promise.all([
    getHeartbeatOnlineCount(),
    getSocketOnlineCount(),
  ]);

  if (heartbeat > 0) {
    return { online: heartbeat, waiting, chatting, source: "heartbeat" };
  }

  if (socket > 0) {
    return { online: socket, waiting, chatting, source: "socket" };
  }

  return { online: 0, waiting, chatting, source: "none" };
}