import { REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";
import {
  DEFAULT_PREFERENCES,
  type Interest,
  type MatchPreferences,
} from "./platform-types";

declare global {
  // eslint-disable-next-line no-var
  var chinwagPrefStore: Map<string, MatchPreferences> | undefined;
}

const prefStore = global.chinwagPrefStore ?? (global.chinwagPrefStore = new Map());

function normalizePreferences(input?: Partial<MatchPreferences> | null): MatchPreferences {
  if (!input) return { ...DEFAULT_PREFERENCES };

  const allowed: Interest[] = [
    "music",
    "movies",
    "gaming",
    "sports",
    "tech",
    "travel",
    "study",
    "memes",
  ];
  const interests = Array.isArray(input.interests)
    ? input.interests.filter((item): item is Interest => allowed.includes(item as Interest))
    : [];

  return {
    language: input.language ?? DEFAULT_PREFERENCES.language,
    region: input.region ?? DEFAULT_PREFERENCES.region,
    mood: input.mood ?? DEFAULT_PREFERENCES.mood,
    interests: interests.slice(0, 5),
  };
}

export function preferencesCompatible(
  a: MatchPreferences,
  b: MatchPreferences,
): boolean {
  if (a.language !== "any" && b.language !== "any" && a.language !== b.language) {
    return false;
  }
  if (a.region !== "any" && b.region !== "any" && a.region !== b.region) {
    return false;
  }
  if (a.mood !== b.mood && a.mood !== "chat" && b.mood !== "chat") {
    return false;
  }
  if (a.interests.length > 0 && b.interests.length > 0) {
    const overlap = a.interests.some((item) => b.interests.includes(item));
    if (!overlap) return false;
  }
  return true;
}

export async function setUserPreferences(
  userId: string,
  prefs: Partial<MatchPreferences>,
): Promise<MatchPreferences> {
  const normalized = normalizePreferences(prefs);
  const redis = getRedis();
  if (redis) {
    await redis.set(
      REDIS_KEYS.preferences(userId),
      JSON.stringify(normalized),
      "EX",
      3600,
    );
    return normalized;
  }
  prefStore.set(userId, normalized);
  return normalized;
}

export async function getUserPreferences(userId: string): Promise<MatchPreferences> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(REDIS_KEYS.preferences(userId));
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return normalizePreferences(JSON.parse(raw) as MatchPreferences);
  }
  return prefStore.get(userId) ?? { ...DEFAULT_PREFERENCES };
}