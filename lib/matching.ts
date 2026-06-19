import { nanoid } from "nanoid";
import {
  MATCH_QUEUE_SCAN_LIMIT,
  MATCHED_STALE_MS,
  RECENT_PARTNER_LIMIT,
  REDIS_KEYS,
  SKIP_COOLDOWN_MS,
  WAITING_STALE_MS,
  type MatchResponse,
  type PublicUserProfile,
  type UserState,
  type UserStatus,
} from "./constants";
import { seedMatchWelcome } from "./fallback-chat";
import { estimateWaitSeconds, GUEST_DAILY_MATCH_LIMIT } from "./guest-constants";
import {
  canGuestMatch,
  getGuestMatchCount,
  incrementGuestMatchCount,
} from "./guest-limits";
import { commonInterests, randomIcebreaker } from "./icebreakers";
import { isUserBanned, recordReport } from "./moderation";
import {
  getUserPreferences,
  preferencesCompatible,
  setUserPreferences,
} from "./preferences";
import type { MatchPreferences } from "./platform-types";
import { getRedis } from "./redis";
import { trackPresence } from "./stats";

declare global {
  // eslint-disable-next-line no-var
  var chinwagMatchStore:
    | {
        queue: string[];
        users: Map<string, UserState>;
        profiles: Map<string, PublicUserProfile>;
      }
    | undefined;
  // eslint-disable-next-line no-var
  var chinwagRecentStore: Map<string, string[]> | undefined;
}

const matchStore =
  global.chinwagMatchStore ??
  (global.chinwagMatchStore = {
    queue: [],
    users: new Map<string, UserState>(),
    profiles: new Map<string, PublicUserProfile>(),
  });

if (!matchStore.profiles) {
  matchStore.profiles = new Map<string, PublicUserProfile>();
}

let matchLock: Promise<unknown> = Promise.resolve();

function defaultState(): UserState {
  return {
    status: "idle",
    roomId: null,
    partnerId: null,
    updatedAt: Date.now(),
  };
}

function normalizeProfile(
  profile?: { name?: string; age?: number } | null,
): PublicUserProfile | null {
  if (!profile) return null;

  const name = profile.name?.trim();
  const age = Number(profile.age);

  if (!name || name.length < 2 || !Number.isFinite(age) || age < 18) {
    return null;
  }

  return { name, age };
}

async function setPublicProfile(
  userId: string,
  profile: PublicUserProfile,
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(
      REDIS_KEYS.profile(userId),
      JSON.stringify(profile),
      "EX",
      3600,
    );
    return;
  }
  matchStore.profiles.set(userId, profile);
}

async function getPublicProfile(
  userId: string,
): Promise<PublicUserProfile | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(REDIS_KEYS.profile(userId));
    if (!raw) return null;
    return normalizeProfile(JSON.parse(raw) as PublicUserProfile);
  }
  return matchStore.profiles.get(userId) ?? null;
}

async function clearPublicProfile(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(REDIS_KEYS.profile(userId));
    return;
  }
  matchStore.profiles.delete(userId);
}

const recentStore =
  global.chinwagRecentStore ?? (global.chinwagRecentStore = new Map());

async function getRecentPartners(userId: string): Promise<string[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.lrange(REDIS_KEYS.recentPartners(userId), 0, -1);
    return raw;
  }
  return recentStore.get(userId) ?? [];
}

async function rememberPartner(userId: string, partnerId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const key = REDIS_KEYS.recentPartners(userId);
    await redis.lrem(key, 0, partnerId);
    await redis.lpush(key, partnerId);
    await redis.ltrim(key, 0, RECENT_PARTNER_LIMIT - 1);
    await redis.expire(key, 86400);
    return;
  }
  const list = recentStore.get(userId) ?? [];
  const next = [partnerId, ...list.filter((id: string) => id !== partnerId)].slice(
    0,
    RECENT_PARTNER_LIMIT,
  );
  recentStore.set(userId, next);
}

async function getQueuePosition(userId: string): Promise<{
  position: number;
  ahead: number;
} | null> {
  const redis = getRedis();
  if (redis) {
    const position = await redis.lpos(REDIS_KEYS.queue, userId);
    if (position === null) return null;
    return { position: position + 1, ahead: position };
  }
  const index = matchStore.queue.indexOf(userId);
  if (index === -1) return null;
  return { position: index + 1, ahead: index };
}

async function withGuestMeta(
  response: MatchResponse,
  userId: string,
): Promise<MatchResponse> {
  const state = await getUserState(userId);
  if (!state.isGuest) return response;

  const count = await getGuestMatchCount(userId);
  const enriched: MatchResponse = {
    ...response,
    guestMatchesToday: count,
    guestDailyLimit: GUEST_DAILY_MATCH_LIMIT,
    guestRemaining: Math.max(0, GUEST_DAILY_MATCH_LIMIT - count),
  };

  if (response.status === "waiting") {
    enriched.estimatedWaitSec = estimateWaitSeconds(response.queueAhead ?? 0);
  }

  return enriched;
}

async function enrichWithPartnerProfile(
  response: MatchResponse,
  userId?: string,
): Promise<MatchResponse> {
  if (response.status !== "matched" || !response.partnerId) {
    return response;
  }

  const partnerProfile = await getPublicProfile(response.partnerId);
  const enriched: MatchResponse = { ...response };
  if (partnerProfile) {
    enriched.partnerName = partnerProfile.name;
    enriched.partnerAge = partnerProfile.age;
  }

  if (userId) {
    const [myPrefs, partnerPrefs] = await Promise.all([
      getUserPreferences(userId),
      getUserPreferences(response.partnerId),
    ]);
    const shared = commonInterests(myPrefs.interests, partnerPrefs.interests);
    if (shared.length > 0) enriched.commonInterests = shared;
    enriched.icebreaker = randomIcebreaker();
    return withGuestMeta(enriched, userId);
  }

  return enriched;
}

async function withMatchLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = matchLock.then(fn, fn);
  matchLock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function getUserState(userId: string): Promise<UserState> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(REDIS_KEYS.user(userId));
    if (!raw) return defaultState();
    return JSON.parse(raw) as UserState;
  }
  return matchStore.users.get(userId) ?? defaultState();
}

async function setUserState(userId: string, state: UserState): Promise<void> {
  const redis = getRedis();
  const payload = { ...state, updatedAt: Date.now() };
  if (redis) {
    await redis.set(REDIS_KEYS.user(userId), JSON.stringify(payload), "EX", 3600);
    return;
  }
  matchStore.users.set(userId, payload);
}

async function removeFromQueue(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.lrem(REDIS_KEYS.queue, 0, userId);
    return;
  }
  const index = matchStore.queue.indexOf(userId);
  if (index !== -1) matchStore.queue.splice(index, 1);
}

async function isInQueue(userId: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const position = await redis.lpos(REDIS_KEYS.queue, userId);
    return position !== null;
  }
  return matchStore.queue.includes(userId);
}

async function pushToQueue(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const position = await redis.lpos(REDIS_KEYS.queue, userId);
    if (position === null) {
      await redis.rpush(REDIS_KEYS.queue, userId);
    }
    return;
  }
  if (!matchStore.queue.includes(userId)) {
    matchStore.queue.push(userId);
  }
}

function liveThreshold(status: UserStatus): number {
  if (status === "waiting") return WAITING_STALE_MS;
  if (status === "matched") return MATCHED_STALE_MS;
  return Number.POSITIVE_INFINITY;
}

async function isUserLive(userId: string): Promise<boolean> {
  const state = await getUserState(userId);
  if (state.status === "idle") return false;
  return Date.now() - state.updatedAt < liveThreshold(state.status);
}

async function evictStaleUser(userId: string): Promise<void> {
  const state = await getUserState(userId);
  if (state.partnerId) {
    await notifyPartnerLeft(state.partnerId);
  }
  await removeFromQueue(userId);
  await setUserState(userId, defaultState());
  await clearPublicProfile(userId);
}

async function pruneStaleQueue(): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const members = await redis.lrange(REDIS_KEYS.queue, 0, -1);
    for (const userId of members) {
      if (!(await isUserLive(userId))) {
        await evictStaleUser(userId);
      }
    }
    return;
  }

  for (const userId of [...matchStore.queue]) {
    if (!(await isUserLive(userId))) {
      await evictStaleUser(userId);
    }
  }
}

async function touchWaitingHeartbeat(userId: string, state: UserState): Promise<void> {
  if (state.status !== "waiting") return;
  await setUserState(userId, { ...state, updatedAt: Date.now() });
}

async function reconcileWaitingUser(userId: string): Promise<void> {
  const state = await getUserState(userId);
  if (state.status !== "waiting") return;

  if (!(await isInQueue(userId))) {
    await pushToQueue(userId);
  }
}

async function notifyPartnerLeft(partnerId: string): Promise<void> {
  const partnerState = await getUserState(partnerId);
  if (partnerState.status !== "matched") return;

  await setUserState(partnerId, {
    ...partnerState,
    status: "partner_left",
    roomId: null,
    partnerId: null,
  });
}

async function sanitizeUserState(userId: string): Promise<UserState> {
  const state = await getUserState(userId);

  if (state.status !== "matched" || !state.partnerId || !state.roomId) {
    return state;
  }

  const partnerState = await getUserState(state.partnerId);
  const isMutual =
    partnerState.status === "matched" &&
    partnerState.partnerId === userId &&
    partnerState.roomId === state.roomId;

  if (isMutual) {
    if (!(await isUserLive(state.partnerId))) {
      await notifyPartnerLeft(userId);
      const healed = defaultState();
      await setUserState(userId, healed);
      return healed;
    }
    return state;
  }

  const healed = defaultState();
  await setUserState(userId, healed);
  return healed;
}

async function removeQueueEntry(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.lrem(REDIS_KEYS.queue, 1, userId);
    return;
  }
  const index = matchStore.queue.indexOf(userId);
  if (index !== -1) matchStore.queue.splice(index, 1);
}

async function pruneStaleQueueEntry(userId: string): Promise<void> {
  const state = await getUserState(userId);
  if (state.status === "waiting") return;
  await removeQueueEntry(userId);
}

async function isCandidateMatch(joinerId: string, candidate: string): Promise<boolean> {
  if (await isUserBanned(candidate)) return false;
  if (!(await isUserLive(candidate))) return false;

  const recent = await getRecentPartners(joinerId);
  if (recent.includes(candidate)) return false;

  const [joinerState, candidateState] = await Promise.all([
    getUserState(joinerId),
    getUserState(candidate),
  ]);

  if (joinerState.isGuest || candidateState.isGuest) {
    return true;
  }

  const [joinerPrefs, candidatePrefs] = await Promise.all([
    getUserPreferences(joinerId),
    getUserPreferences(candidate),
  ]);

  return (
    preferencesCompatible(joinerPrefs, candidatePrefs) &&
    preferencesCompatible(candidatePrefs, joinerPrefs)
  );
}

async function popValidWaitingUser(joinerId: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    const candidates = await redis.lrange(
      REDIS_KEYS.queue,
      0,
      MATCH_QUEUE_SCAN_LIMIT - 1,
    );

    for (const candidate of candidates) {
      if (candidate === joinerId) continue;

      const candidateState = await getUserState(candidate);
      if (!(await isUserLive(candidate)) || candidateState.status !== "waiting") {
        await redis.lrem(REDIS_KEYS.queue, 1, candidate);
        if (!(await isUserLive(candidate))) {
          await evictStaleUser(candidate);
        }
        continue;
      }

      if (await isCandidateMatch(joinerId, candidate)) {
        await redis.lrem(REDIS_KEYS.queue, 1, candidate);
        return candidate;
      }
    }

    return null;
  }

  let index = 0;
  while (index < matchStore.queue.length) {
    const candidate = matchStore.queue[index];
    if (!candidate || candidate === joinerId) {
      index += 1;
      continue;
    }

    const candidateState = await getUserState(candidate);
    if (!(await isUserLive(candidate)) || candidateState.status !== "waiting") {
      matchStore.queue.splice(index, 1);
      if (!(await isUserLive(candidate))) {
        await evictStaleUser(candidate);
      }
      continue;
    }

    if (await isCandidateMatch(joinerId, candidate)) {
      matchStore.queue.splice(index, 1);
      return candidate;
    }

    index += 1;
  }

  return null;
}

function buildMatchedState(roomId: string, partnerId: string): UserState {
  return {
    status: "matched",
    roomId,
    partnerId,
    updatedAt: Date.now(),
  };
}

async function maybeIncrementGuestMatch(userId: string): Promise<void> {
  const state = await getUserState(userId);
  if (state.isGuest) {
    await incrementGuestMatchCount(userId);
  }
}

async function matchPair(
  userId: string,
  waitingUser: string,
): Promise<MatchResponse> {
  const roomId = `chinwag-${nanoid(12)}`;
  const [userState, partnerState] = await Promise.all([
    getUserState(userId),
    getUserState(waitingUser),
  ]);

  await removeFromQueue(userId);
  await removeFromQueue(waitingUser);
  await setUserState(userId, {
    ...buildMatchedState(roomId, waitingUser),
    isGuest: userState.isGuest,
  });
  await setUserState(waitingUser, {
    ...buildMatchedState(roomId, userId),
    isGuest: partnerState.isGuest,
  });
  await Promise.all([
    maybeIncrementGuestMatch(userId),
    maybeIncrementGuestMatch(waitingUser),
  ]);
  await rememberPartner(userId, waitingUser);
  await rememberPartner(waitingUser, userId);
  await trackPresence(userId, "matched");
  await trackPresence(waitingUser, "matched");

  const [profileA, profileB] = await Promise.all([
    getPublicProfile(userId),
    getPublicProfile(waitingUser),
  ]);
  await seedMatchWelcome(
    roomId,
    profileA?.name ?? "Guest",
    profileB?.name ?? "Stranger",
  );

  return enrichWithPartnerProfile(
    {
      status: "matched",
      roomId,
      partnerId: waitingUser,
    },
    userId,
  );
}

async function tryMatchFromQueue(userId: string): Promise<MatchResponse | null> {
  const state = await getUserState(userId);
  if (state.status !== "waiting") return null;

  await reconcileWaitingUser(userId);

  const partnerId = await popValidWaitingUser(userId);
  if (!partnerId) return null;

  return matchPair(userId, partnerId);
}

async function drainMatchQueue(): Promise<void> {
  let safety = 0;

  while (safety < 32) {
    safety += 1;

    const redis = getRedis();
    const nextUser = redis
      ? (await redis.lrange(REDIS_KEYS.queue, 0, 0))[0]
      : matchStore.queue[0];

    if (!nextUser) break;

    const state = await getUserState(nextUser);
    if (state.status !== "waiting") {
      await pruneStaleQueueEntry(nextUser);
      continue;
    }

    const partnerId = await popValidWaitingUser(nextUser);
    if (!partnerId) break;

    await matchPair(nextUser, partnerId);
  }
}

async function joinMatchQueueMemory(userId: string): Promise<MatchResponse> {
  const current = await sanitizeUserState(userId);

  if (current.status === "matched" && current.roomId && current.partnerId) {
    return enrichWithPartnerProfile({
      status: "matched",
      roomId: current.roomId,
      partnerId: current.partnerId,
    });
  }

  if (current.partnerId) {
    await notifyPartnerLeft(current.partnerId);
  }

  await removeFromQueue(userId);

  const waitingUser = await popValidWaitingUser(userId);

  if (waitingUser) {
    return matchPair(userId, waitingUser);
  }

  const guestFlag = (await getUserState(userId)).isGuest;
  await pushToQueue(userId);
  await setUserState(userId, {
    status: "waiting",
    roomId: null,
    partnerId: null,
    updatedAt: Date.now(),
    isGuest: guestFlag,
  });

  await drainMatchQueue();

  const refreshed = await getUserState(userId);
  if (refreshed.status === "matched" && refreshed.roomId && refreshed.partnerId) {
    return enrichWithPartnerProfile({
      status: "matched",
      roomId: refreshed.roomId,
      partnerId: refreshed.partnerId,
    });
  }

  const queue = await getQueuePosition(userId);
  await trackPresence(userId, "waiting");
  return withGuestMeta(
    {
      status: "waiting",
      queuePosition: queue?.position,
      queueAhead: queue?.ahead,
    },
    userId,
  );
}

async function joinMatchQueueRedis(userId: string): Promise<MatchResponse> {
  const redis = getRedis();
  if (!redis) {
    return joinMatchQueueMemory(userId);
  }

  const current = await sanitizeUserState(userId);

  if (current.status === "matched" && current.roomId && current.partnerId) {
    return enrichWithPartnerProfile({
      status: "matched",
      roomId: current.roomId,
      partnerId: current.partnerId,
    });
  }

  if (current.partnerId) {
    await notifyPartnerLeft(current.partnerId);
  }

  await removeFromQueue(userId);

  const waitingUser = await popValidWaitingUser(userId);
  if (waitingUser) {
    return matchPair(userId, waitingUser);
  }

  const guestFlag = (await getUserState(userId)).isGuest;
  await pushToQueue(userId);
  await setUserState(userId, {
    status: "waiting",
    roomId: null,
    partnerId: null,
    updatedAt: Date.now(),
    isGuest: guestFlag,
  });

  await drainMatchQueue();

  const refreshed = await getUserState(userId);
  if (refreshed.status === "matched" && refreshed.roomId && refreshed.partnerId) {
    return enrichWithPartnerProfile({
      status: "matched",
      roomId: refreshed.roomId,
      partnerId: refreshed.partnerId,
    });
  }

  const queue = await getQueuePosition(userId);
  await trackPresence(userId, "waiting");
  return withGuestMeta(
    {
      status: "waiting",
      queuePosition: queue?.position,
      queueAhead: queue?.ahead,
    },
    userId,
  );
}

export async function attemptQueueMatch(
  userId: string,
): Promise<MatchResponse | null> {
  return withMatchLock(async () => {
    await reconcileWaitingUser(userId);
    return tryMatchFromQueue(userId);
  });
}

export async function getMatchStatus(userId: string): Promise<MatchResponse> {
  const state = await sanitizeUserState(userId);
  await touchWaitingHeartbeat(userId, state);
  await trackPresence(userId, state.status);

  const base: MatchResponse = {
    status: state.status,
    roomId: state.roomId ?? undefined,
    partnerId: state.partnerId ?? undefined,
  };

  if (state.status === "waiting") {
    const queue = await getQueuePosition(userId);
    base.queuePosition = queue?.position;
    base.queueAhead = queue?.ahead;
    return withGuestMeta(base, userId);
  }

  return enrichWithPartnerProfile(base, userId);
}

export async function leaveMatch(userId: string): Promise<void> {
  const state = await getUserState(userId);

  if (state.partnerId) {
    await notifyPartnerLeft(state.partnerId);
  }

  await removeFromQueue(userId);
  await setUserState(userId, defaultState());
  await clearPublicProfile(userId);
}

export async function joinMatchQueue(
  userId: string,
  profileInput?: { name?: string; age?: number } | null,
  preferencesInput?: Partial<MatchPreferences> | null,
  options?: { isSkip?: boolean; isGuest?: boolean },
): Promise<MatchResponse> {
  if (!userId || userId.length < 8) {
    throw new Error("Invalid user id");
  }

  if (await isUserBanned(userId)) {
    return { status: "idle", error: "Account temporarily restricted" };
  }

  if (options?.isGuest) {
    const allowed = await canGuestMatch(userId);
    if (!allowed) {
      const count = await getGuestMatchCount(userId);
      return {
        status: "idle",
        error: `Daily guest limit reached (${GUEST_DAILY_MATCH_LIMIT} matches). Login for unlimited.`,
        guestMatchesToday: count,
        guestDailyLimit: GUEST_DAILY_MATCH_LIMIT,
        guestRemaining: 0,
      };
    }
  }

  const current = await getUserState(userId);
  if (
    options?.isSkip &&
    current.lastSkipAt &&
    Date.now() - current.lastSkipAt < SKIP_COOLDOWN_MS
  ) {
    return {
      status: "idle",
      error: `Please wait ${Math.ceil((SKIP_COOLDOWN_MS - (Date.now() - current.lastSkipAt)) / 1000)}s before skipping again`,
    };
  }

  const profile = normalizeProfile(profileInput);
  if (profile) {
    await setPublicProfile(userId, profile);
  }

  if (preferencesInput) {
    await setUserPreferences(userId, preferencesInput);
  }

  const isGuest = options?.isGuest ?? false;

  return withMatchLock(async () => {
    await pruneStaleQueue();

    if (options?.isSkip) {
      await setUserState(userId, {
        ...defaultState(),
        lastSkipAt: Date.now(),
        isGuest,
      });
    } else if (isGuest) {
      const state = await getUserState(userId);
      await setUserState(userId, { ...state, isGuest: true });
    }

    const redis = getRedis();
    if (redis) {
      return joinMatchQueueRedis(userId);
    }
    return joinMatchQueueMemory(userId);
  });
}

export async function reportUser(params: {
  reporterId: string;
  reportedId?: string;
  roomId?: string;
  reason?: string;
}): Promise<void> {
  const redis = getRedis();
  const entry = {
    ...params,
    reportedAt: new Date().toISOString(),
  };

  if (redis) {
    await redis.lpush("chinwag:reports", JSON.stringify(entry));
    await redis.ltrim("chinwag:reports", 0, 999);
  } else {
    console.warn("[CHINWAG REPORT]", entry);
  }

  if (params.reportedId) {
    await recordReport(params.reportedId);
  }
}