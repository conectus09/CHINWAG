import { REDIS_KEYS } from "./constants";
import { getLivePresenceSnapshot } from "./live-presence";
import { ensureRedisReady, getRedis } from "./redis";
import type { PlatformStats } from "./platform-types";

declare global {
  // eslint-disable-next-line no-var
  var chinwagStatsStore: { users: Map<string, { status: string; updatedAt: number }> } | undefined;
}

const statsStore =
  global.chinwagStatsStore ??
  (global.chinwagStatsStore = { users: new Map() });

const ACTIVITY_STALE_MS = 90_000;

export async function trackPresence(userId: string, status: string): Promise<void> {
  const redis = getRedis();
  const payload = JSON.stringify({ status, updatedAt: Date.now() });
  if (redis) {
    await redis.hset(REDIS_KEYS.presence, userId, payload);
    await redis.expire(REDIS_KEYS.presence, 3600);
    return;
  }
  statsStore.users.set(userId, { status, updatedAt: Date.now() });
}

export async function getActivityCounts(): Promise<{
  waiting: number;
  chatting: number;
}> {
  await ensureRedisReady();
  const redis = getRedis();
  const now = Date.now();
  let waiting = 0;
  let chatting = 0;

  if (redis) {
    const all = await redis.hgetall(REDIS_KEYS.presence);
    for (const raw of Object.values(all)) {
      try {
        const entry = JSON.parse(raw) as { status: string; updatedAt: number };
        if (now - entry.updatedAt > ACTIVITY_STALE_MS) continue;
        if (entry.status === "waiting") waiting += 1;
        if (entry.status === "matched") chatting += 1;
      } catch {
        // ignore
      }
    }
  } else {
    for (const entry of statsStore.users.values()) {
      if (now - entry.updatedAt > ACTIVITY_STALE_MS) continue;
      if (entry.status === "waiting") waiting += 1;
      if (entry.status === "matched") chatting += 1;
    }
  }

  return { waiting, chatting };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const activity = await getActivityCounts();
  const snapshot = await getLivePresenceSnapshot(activity);

  return {
    online: snapshot.online,
    waiting: snapshot.waiting,
    chatting: snapshot.chatting,
    totalToday: snapshot.online,
  };
}