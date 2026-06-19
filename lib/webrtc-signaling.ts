import { nanoid } from "nanoid";
import { REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";
import type { WebRtcSignal } from "./platform-types";

declare global {
  // eslint-disable-next-line no-var
  var chinwagSignalStore: Map<string, WebRtcSignal[]> | undefined;
}

const signalStore =
  global.chinwagSignalStore ?? (global.chinwagSignalStore = new Map());

function roomKey(roomId: string, userId: string) {
  return `${roomId}:${userId}`;
}

export async function pushSignal(params: {
  roomId: string;
  from: string;
  to: string;
  type: WebRtcSignal["type"];
  payload: string;
}): Promise<WebRtcSignal> {
  const signal: WebRtcSignal = {
    id: nanoid(12),
    roomId: params.roomId,
    from: params.from,
    to: params.to,
    type: params.type,
    payload: params.payload,
    createdAt: Date.now(),
  };

  const redis = getRedis();
  const key = REDIS_KEYS.webrtc(roomKey(params.roomId, params.to));
  if (redis) {
    await redis.rpush(key, JSON.stringify(signal));
    await redis.expire(key, 300);
    await redis.ltrim(key, -40, -1);
    return signal;
  }

  const bucket = signalStore.get(roomKey(params.roomId, params.to)) ?? [];
  bucket.push(signal);
  if (bucket.length > 40) bucket.splice(0, bucket.length - 40);
  signalStore.set(roomKey(params.roomId, params.to), bucket);
  return signal;
}

export async function drainSignals(
  roomId: string,
  userId: string,
  since = 0,
): Promise<WebRtcSignal[]> {
  const redis = getRedis();
  const key = roomKey(roomId, userId);
  if (redis) {
    const raw = await redis.lrange(REDIS_KEYS.webrtc(key), 0, -1);
    const signals = raw
      .map((entry) => JSON.parse(entry) as WebRtcSignal)
      .filter((signal) => signal.createdAt > since);
    if (signals.length > 0) {
      await redis.del(REDIS_KEYS.webrtc(key));
    }
    return signals;
  }

  const bucket = signalStore.get(key) ?? [];
  const fresh = bucket.filter((signal: WebRtcSignal) => signal.createdAt > since);
  signalStore.set(key, []);
  return fresh;
}