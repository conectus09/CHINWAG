import type { Interest, Language, MatchPreferences, Mood, Region } from "./platform-types";
import { DEFAULT_PREFERENCES } from "./platform-types";

export interface UserProfile {
  name: string;
  age: number;
  isAdultConfirmed: boolean;
  preferences?: MatchPreferences;
}

const STORAGE_KEY = "chinwag-user-profile";

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UserProfile;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.age === "number" &&
      parsed.isAdultConfirmed === true &&
      parsed.age >= 18
    ) {
      return {
        ...parsed,
        preferences: parsed.preferences ?? { ...DEFAULT_PREFERENCES },
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function setUserProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getMatchPreferences(): MatchPreferences {
  return getUserProfile()?.preferences ?? { ...DEFAULT_PREFERENCES };
}

export function setMatchPreferences(preferences: Partial<MatchPreferences>) {
  const profile = getUserProfile();
  if (!profile) return;
  setUserProfile({
    ...profile,
    preferences: {
      language: (preferences.language ?? profile.preferences?.language ?? "any") as Language,
      region: (preferences.region ?? profile.preferences?.region ?? "any") as Region,
      mood: (preferences.mood ?? profile.preferences?.mood ?? "chat") as Mood,
      interests: (preferences.interests ?? profile.preferences?.interests ?? []) as Interest[],
    },
  });
}

export function hasCompletedStartGate() {
  return getUserProfile() !== null;
}