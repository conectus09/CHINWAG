export const LANGUAGES = ["english", "hindi", "hinglish", "any"] as const;
export const REGIONS = ["india", "global", "any"] as const;
export const MOODS = ["chat", "fun", "deep", "gaming", "study"] as const;
export const INTERESTS = [
  "music",
  "movies",
  "gaming",
  "sports",
  "tech",
  "travel",
  "study",
  "memes",
] as const;

export type Language = (typeof LANGUAGES)[number];
export type Region = (typeof REGIONS)[number];
export type Mood = (typeof MOODS)[number];
export type Interest = (typeof INTERESTS)[number];
export type SubscriptionTier = "free" | "pro" | "max";

export interface MatchPreferences {
  language: Language;
  region: Region;
  mood: Mood;
  interests: Interest[];
}

export interface AuthAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  tier: SubscriptionTier;
  verified: boolean;
  blockedUsers: string[];
  createdAt: number;
}

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  name: string;
  tier: SubscriptionTier;
  expiresAt: number;
}

export type MessageKind = "text" | "image" | "reaction" | "system";

export interface ChatMessagePayload {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  kind?: MessageKind;
  imageUrl?: string;
  reaction?: string;
  replyTo?: string;
  readBy?: string[];
}

export interface PlatformStats {
  online: number;
  waiting: number;
  chatting: number;
  totalToday: number;
}

export interface QueueStatus {
  position: number;
  ahead: number;
}

export interface WebRtcSignal {
  id: string;
  roomId: string;
  from: string;
  to: string;
  type: "offer" | "answer" | "ice";
  payload: string;
  createdAt: number;
}

export interface TicTacToeState {
  board: Array<"X" | "O" | null>;
  turn: "X" | "O";
  scores: { X: number; O: number };
  winner: "X" | "O" | "draw" | null;
  updatedAt: number;
}

export interface AnalyticsEvent {
  name: string;
  userId?: string;
  meta?: Record<string, string | number | boolean>;
  at: number;
}

export const DEFAULT_PREFERENCES: MatchPreferences = {
  language: "any",
  region: "any",
  mood: "chat",
  interests: [],
};