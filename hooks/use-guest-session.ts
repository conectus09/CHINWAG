"use client";

import { useSyncExternalStore } from "react";
import { GUEST_DAILY_MATCH_LIMIT } from "@/lib/guest-constants";
import {
  readGuestSession,
  subscribeGuest,
  type GuestSessionStats,
} from "@/lib/guest-session";

export function useGuestSession() {
  const stats = useSyncExternalStore(
    subscribeGuest,
    readGuestSession,
    (): GuestSessionStats => ({
      matchesToday: 0,
      totalMatches: 0,
      chatsStartedAt: Date.now(),
      soundEnabled: true,
      lastIcebreaker: null,
    }),
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