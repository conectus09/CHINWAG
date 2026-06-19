"use client";

import { useSyncExternalStore } from "react";
import { GUEST_DAILY_MATCH_LIMIT } from "@/lib/guest-constants";
import {
  readGuestSession,
  subscribeGuest,
  type GuestSessionStats,
} from "@/lib/guest-session";

const SERVER_GUEST_SNAPSHOT: GuestSessionStats = {
  matchesToday: 0,
  totalMatches: 0,
  chatsStartedAt: 0,
  soundEnabled: true,
  lastIcebreaker: null,
};

export function useGuestSession() {
  const stats = useSyncExternalStore(
    subscribeGuest,
    readGuestSession,
    () => SERVER_GUEST_SNAPSHOT,
  );

  const remaining = Math.max(0, GUEST_DAILY_MATCH_LIMIT - stats.matchesToday);
  const sessionMinutes = Math.max(
    1,
    Math.floor((Date.now() - stats.chatsStartedAt) / 60_000),
  );

  return {
    ...stats,
    dailyLimit: GUEST_DAILY_MATCH_LIMIT,
    remaining,
    sessionMinutes,
    isNearLimit: remaining <= 5,
  };
}