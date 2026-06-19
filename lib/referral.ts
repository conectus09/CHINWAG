import { nanoid } from "nanoid";
import { REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";

declare global {
  // eslint-disable-next-line no-var
  var chinwagReferralStore: Map<string, { code: string; invites: number }> | undefined;
}

const referralStore =
  global.chinwagReferralStore ?? (global.chinwagReferralStore = new Map());

export async function getReferralCode(userId: string): Promise<string> {
  const redis = getRedis();
  if (redis) {
    const existing = await redis.get(REDIS_KEYS.referral(userId));
    if (existing) return existing;
    const code = `CW-${nanoid(6).toUpperCase()}`;
    await redis.set(REDIS_KEYS.referral(userId), code, "EX", 86400 * 30);
    return code;
  }

  const entry = referralStore.get(userId);
  if (entry) return entry.code;
  const code = `CW-${nanoid(6).toUpperCase()}`;
  referralStore.set(userId, { code, invites: 0 });
  return code;
}

export async function recordReferralUse(code: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.incr(REDIS_KEYS.referralUse(code));
    return;
  }

  for (const entry of referralStore.values()) {
    if (entry.code === code) {
      entry.invites += 1;
      return;
    }
  }
}