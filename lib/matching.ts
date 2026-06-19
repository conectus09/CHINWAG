import { nanoid } from "nanoid";
import {
  MATCH_QUEUE_SCAN_LIMIT,
  REDIS_KEYS,
  type MatchResponse,
  type PublicUserProfile,
  type UserState,
} from "./constants";
import { getRedis } from "./redis";

declare global {
  // eslint-disable-next-line no-var
  var chinwagMatchStore:
    | {
        queue: string[];
        users: Map<string, UserState>;
        profiles: Map<string, PublicUserProfile>;
      }
    | undefined;
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

async function enrichWithPartnerProfile(
  response: MatchResponse,
): Promise<MatchResponse> {
  if (response.status !== "matched" || !response.partnerId) {
    return response;
  }

  const partnerProfile = await getPublicProfile(response.partnerId);
  if (!partnerProfile) return response;

  return {
    ...response,
    partnerName: partnerProfile.name,
    partnerAge: partnerProfile.age,
  };
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
      if (candidateState.status === "waiting") {
        await redis.lrem(REDIS_KEYS.queue, 1, candidate);
        return candidate;
      }

      await redis.lrem(REDIS_KEYS.queue, 1, candidate);
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
    if (candidateState.status === "waiting") {
      matchStore.queue.splice(index, 1);
      return candidate;
    }

    matchStore.queue.splice(index, 1);
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

async function matchPair(
  userId: string,
  waitingUser: string,
): Promise<MatchResponse> {
  const roomId = `chinwag-${nanoid(12)}`;

  await removeFromQueue(userId);
  await removeFromQueue(waitingUser);
  await setUserState(userId, buildMatchedState(roomId, waitingUser));
  await setUserState(waitingUser, buildMatchedState(roomId, userId));

  return enrichWithPartnerProfile({
    status: "matched",
    roomId,
    partnerId: waitingUser,
  });
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

  await pushToQueue(userId);
  await setUserState(userId, {
    status: "waiting",
    roomId: null,
    partnerId: null,
    updatedAt: Date.now(),
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

  return { status: "waiting" };
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

  await pushToQueue(userId);
  await setUserState(userId, {
    status: "waiting",
    roomId: null,
    partnerId: null,
    updatedAt: Date.now(),
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

  return { status: "waiting" };
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
  return enrichWithPartnerProfile({
    status: state.status,
    roomId: state.roomId ?? undefined,
    partnerId: state.partnerId ?? undefined,
  });
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
): Promise<MatchResponse> {
  if (!userId || userId.length < 8) {
    throw new Error("Invalid user id");
  }

  const profile = normalizeProfile(profileInput);
  if (profile) {
    await setPublicProfile(userId, profile);
  }

  return withMatchLock(async () => {
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
    return;
  }

  console.warn("[CHINWAG REPORT]", entry);
}