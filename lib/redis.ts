import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var chinwagRedis: Redis | undefined;
  // eslint-disable-next-line no-var
  var chinwagRedisInit: Promise<void> | undefined;
}

let memoryFallback = false;

export function isMemoryStore(): boolean {
  return memoryFallback || !process.env.REDIS_URL;
}

export async function initRedis(): Promise<void> {
  const url = process.env.REDIS_URL?.trim();
  if (!url || memoryFallback) return;

  if (!global.chinwagRedis) {
    global.chinwagRedis = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }

  try {
    if (global.chinwagRedis.status !== "ready") {
      await global.chinwagRedis.connect();
    }
    await global.chinwagRedis.ping();
  } catch (error) {
    console.warn("[CHINWAG] Redis unavailable — using in-memory store", error);
    memoryFallback = true;
    try {
      global.chinwagRedis.disconnect();
    } catch {
      // ignore
    }
    global.chinwagRedis = undefined;
  }
}

export function getRedis(): Redis | null {
  if (memoryFallback || !process.env.REDIS_URL) return null;
  return global.chinwagRedis ?? null;
}

export async function ensureRedisReady(): Promise<Redis | null> {
  if (!global.chinwagRedisInit) {
    global.chinwagRedisInit = initRedis();
  }
  await global.chinwagRedisInit;
  return getRedis();
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL) && !memoryFallback;
}