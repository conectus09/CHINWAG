import { REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";

const BLOCKED_WORDS = [
  "kill yourself",
  "kys",
  "nazi",
  "terrorist",
  "rape",
  "pedo",
  "child porn",
];

declare global {
  // eslint-disable-next-line no-var
  var chinwagModerationStore:
    | {
        reports: Map<string, number>;
        bans: Map<string, number>;
      }
    | undefined;
}

const modStore =
  global.chinwagModerationStore ??
  (global.chinwagModerationStore = {
    reports: new Map(),
    bans: new Map(),
  });

const REPORTS_BEFORE_BAN = 3;
const BAN_DURATION_MS = 60 * 60 * 1000;

export function filterMessage(text: string): { ok: boolean; reason?: string } {
  const lower = text.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return { ok: false, reason: "Message blocked by safety filter" };
    }
  }
  return { ok: true };
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const until = await redis.get(REDIS_KEYS.ban(userId));
    if (!until) return false;
    return Number(until) > Date.now();
  }

  const until = modStore.bans.get(userId);
  if (!until) return false;
  if (until <= Date.now()) {
    modStore.bans.delete(userId);
    return false;
  }
  return true;
}

export async function recordReport(reportedId: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    const count = await redis.incr(REDIS_KEYS.reports(reportedId));
    await redis.expire(REDIS_KEYS.reports(reportedId), 86400);
    if (count >= REPORTS_BEFORE_BAN) {
      await redis.set(
        REDIS_KEYS.ban(reportedId),
        String(Date.now() + BAN_DURATION_MS),
        "EX",
        3600,
      );
    }
    return count;
  }

  const count = (modStore.reports.get(reportedId) ?? 0) + 1;
  modStore.reports.set(reportedId, count);
  if (count >= REPORTS_BEFORE_BAN) {
    modStore.bans.set(reportedId, Date.now() + BAN_DURATION_MS);
  }
  return count;
}

export async function listRecentReports(limit = 50): Promise<
  Array<{ reporterId: string; reportedId?: string; roomId?: string; reason?: string; reportedAt: string }>
> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.lrange("chinwag:reports", 0, limit - 1);
    return raw
      .map((entry) => {
        try {
          return JSON.parse(entry) as {
            reporterId: string;
            reportedId?: string;
            roomId?: string;
            reason?: string;
            reportedAt: string;
          };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }
  return [];
}