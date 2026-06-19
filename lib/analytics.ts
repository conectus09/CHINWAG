import { REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";
import type { AnalyticsEvent } from "./platform-types";

declare global {
  // eslint-disable-next-line no-var
  var chinwagAnalyticsStore: AnalyticsEvent[] | undefined;
}

const analyticsStore =
  global.chinwagAnalyticsStore ?? (global.chinwagAnalyticsStore = []);

export async function trackEvent(params: {
  name: string;
  userId?: string;
  meta?: Record<string, string | number | boolean>;
}): Promise<void> {
  const event: AnalyticsEvent = {
    name: params.name,
    userId: params.userId,
    meta: params.meta,
    at: Date.now(),
  };

  const redis = getRedis();
  if (redis) {
    await redis.lpush(REDIS_KEYS.analytics, JSON.stringify(event));
    await redis.ltrim(REDIS_KEYS.analytics, 0, 4999);
    return;
  }

  analyticsStore.unshift(event);
  if (analyticsStore.length > 5000) analyticsStore.length = 5000;
}

export async function getAnalyticsSummary(): Promise<{
  total: number;
  byName: Record<string, number>;
}> {
  const redis = getRedis();
  const events: AnalyticsEvent[] = redis
    ? (
        await redis.lrange(REDIS_KEYS.analytics, 0, 4999)
      ).map((raw) => JSON.parse(raw) as AnalyticsEvent)
    : [...analyticsStore];

  const byName: Record<string, number> = {};
  for (const event of events) {
    byName[event.name] = (byName[event.name] ?? 0) + 1;
  }

  return { total: events.length, byName };
}