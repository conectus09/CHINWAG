/**
 * Redis-backed online presence for Socket.io.
 * Uses a Redis SET `online_users` so counts stay accurate across multiple server instances.
 */

import { ONLINE_USERS_KEY, ONLINE_USERS_LAST_EMIT_KEY } from "../lib/constants";
import { createClient, type RedisClientType } from "redis";

/** In-memory fallback when REDIS_URL is not set (local dev only) */
const memoryOnline = new Set<string>();
let memoryLastEmit = -1;

let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

export async function initRedisClients(): Promise<{
  pub: RedisClientType | null;
  sub: RedisClientType | null;
}> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[presence] REDIS_URL not set — using in-memory online set (single instance only)");
    return { pub: null, sub: null };
  }

  pubClient = createClient({ url });
  subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("[presence] Redis pub error:", err));
  subClient.on("error", (err) => console.error("[presence] Redis sub error:", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  return { pub: pubClient, sub: subClient };
}

export async function addOnlineUser(socketId: string): Promise<number> {
  if (pubClient?.isOpen) {
    await pubClient.sAdd(ONLINE_USERS_KEY, socketId);
    return pubClient.sCard(ONLINE_USERS_KEY);
  }

  memoryOnline.add(socketId);
  return memoryOnline.size;
}

export async function removeOnlineUser(socketId: string): Promise<number> {
  if (pubClient?.isOpen) {
    await pubClient.sRem(ONLINE_USERS_KEY, socketId);
    return pubClient.sCard(ONLINE_USERS_KEY);
  }

  memoryOnline.delete(socketId);
  return memoryOnline.size;
}

export async function getOnlineCount(): Promise<number> {
  if (pubClient?.isOpen) {
    return pubClient.sCard(ONLINE_USERS_KEY);
  }
  return memoryOnline.size;
}

/**
 * Returns true when the count changed since the last broadcast (all instances share Redis state).
 */
export async function shouldBroadcastCount(count: number): Promise<boolean> {
  if (pubClient?.isOpen) {
    const last = await pubClient.get(ONLINE_USERS_LAST_EMIT_KEY);
    if (last === String(count)) return false;
    await pubClient.set(ONLINE_USERS_LAST_EMIT_KEY, String(count));
    return true;
  }

  if (memoryLastEmit === count) return false;
  memoryLastEmit = count;
  return true;
}

export async function closeRedisClients(): Promise<void> {
  await Promise.all([
    pubClient?.isOpen ? pubClient.quit() : undefined,
    subClient?.isOpen ? subClient.quit() : undefined,
  ]);
  pubClient = null;
  subClient = null;
}