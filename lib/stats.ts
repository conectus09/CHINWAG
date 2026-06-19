import { ONLINE_USERS_KEY, REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";
import type { PlatformStats } from "./platform-types";

declare global {
  // eslint-disable-next-line no-var
  var chinwagStatsStore: { users: Map<string, { status: string; updatedAt: number }> } | undefined;
}

const statsStore =
  global.chinwagStatsStore ??
  (global.chinwagStatsStore = { users: new Map() });

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

export async function getPlatformStats(): Promise<PlatformStats> {
  const redis = getRedis();
  const now = Date.now();
  const staleMs = 90_000;

  // Prefer Socket.io presence set when available (same source as live counter)
  if (redis) {
    const socketOnline = await redis.scard(ONLINE_USERS_KEY);
    if (socketOnline > 0) {
      return {
        online: socketOnline,
        waiting: 0,
        chatting: 0,
        totalToday: Math.max(socketOnline, Math.round(socketOnline * 1.4 + 12)),
      };
    }
  }

  let waiting = 0;
  let chatting = 0;

  if (redis) {
    const all = await redis.hgetall(REDIS_KEYS.presence);
    for (const raw of Object.values(all)) {
      try {
        const entry = JSON.parse(raw) as { status: string; updatedAt: number };
        if (now - entry.updatedAt > staleMs) continue;
        if (entry.status === "waiting") waiting += 1;
        if (entry.status === "matched") chatting += 1;
      } catch {
        // ignore
      }
    }
  } else {
    for (const entry of statsStore.users.values()) {
      if (now - entry.updatedAt > staleMs) continue;
      if (entry.status === "waiting") waiting += 1;
      if (entry.status === "matched") chatting += 1;
    }
  }

  const online = waiting + chatting;
  const totalToday = Math.max(online, Math.round(online * 1.4 + 12));

  return { online, waiting, chatting, totalToday };
}