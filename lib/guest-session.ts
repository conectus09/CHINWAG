"use client";

const STORAGE_KEY = "chinwag-guest-session";

export interface GuestSessionStats {
  matchesToday: number;
  totalMatches: number;
  chatsStartedAt: number;
  soundEnabled: boolean;
  lastIcebreaker: string | null;
}

const DEFAULT: GuestSessionStats = {
  matchesToday: 0,
  totalMatches: 0,
  chatsStartedAt: Date.now(),
  soundEnabled: true,
  lastIcebreaker: null,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): GuestSessionStats {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as GuestSessionStats & { day?: string };
    if (parsed.day !== today()) {
      return { ...parsed, matchesToday: 0, day: today() } as GuestSessionStats;
    }
    return parsed;
  } catch {
    return { ...DEFAULT };
  }
}

function save(stats: GuestSessionStats) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...stats, day: today() }),
  );
  window.dispatchEvent(new Event("chinwag-guest-change"));
}

export function readGuestSession(): GuestSessionStats {
  return load();
}

export function subscribeGuest(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("chinwag-guest-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("chinwag-guest-change", callback);
  };
}

export function recordGuestMatch() {
  const stats = load();
  stats.matchesToday += 1;
  stats.totalMatches += 1;
  save(stats);
}

export function setGuestSoundEnabled(enabled: boolean) {
  const stats = load();
  stats.soundEnabled = enabled;
  save(stats);
}

export function setGuestIcebreaker(prompt: string) {
  const stats = load();
  stats.lastIcebreaker = prompt;
  save(stats);
}