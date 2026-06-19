export const APP_NAME = "CHINWAG";
export const APP_TAGLINE = "Meet New People Around The World Instantly";
export const APP_LOGO_URL =
  "https://res.cloudinary.com/doafv0hxx/image/upload/v1781636025/ChatGPT_Image_Jun_17_2026_12_22_33_AM_lxq8ah.png";

export const CONTACT_EMAIL = "connectsus09@gmail.com";
export const CONTACT_PHONE = "+91 8287735448";
export const CONTACT_PHONE_HREF = "tel:+918287735448";
export const LEGAL_LAST_UPDATED = "17 June 2026";

export const MATCH_POLL_INTERVAL_MS = 120;
export const MATCH_BURST_POLL_MS = 40;
export const CHAT_POLL_INTERVAL_MS = 400;
/** Keep below typical reverse-proxy timeouts (e.g. Render ~30s) to avoid hung workers. */
export const LONG_POLL_TIMEOUT_MS = 12000;
export const LONG_POLL_RETRY_MS = 60;
export const MATCH_QUEUE_SCAN_LIMIT = 64;
export const SKIP_COOLDOWN_MS = 1500;
/** Drop queue entries if the user has not polled recently (ghost tabs). */
export const WAITING_STALE_MS = 90_000;
export const MATCHED_STALE_MS = 90_000;
export const RECENT_PARTNER_LIMIT = 8;
export const CHAT_TOPIC = "chinwag-chat";
export const SYSTEM_TOPIC = "chinwag-system";
export const TYPING_IDLE_MS = 1500;
export const TYPING_HEARTBEAT_MS = 1000;
export const TYPING_PARTNER_TIMEOUT_MS = 3000;

/** Socket.io presence SET — one member per connected socket */
export const ONLINE_USERS_KEY = "online_users";
export const ONLINE_USERS_LAST_EMIT_KEY = "online_users:last_emit";

export const REDIS_KEYS = {
  queue: "chinwag:queue",
  user: (userId: string) => `chinwag:user:${userId}`,
  profile: (userId: string) => `chinwag:profile:${userId}`,
  preferences: (userId: string) => `chinwag:prefs:${userId}`,
  recentPartners: (userId: string) => `chinwag:recent:${userId}`,
  presence: "chinwag:presence",
  ban: (userId: string) => `chinwag:ban:${userId}`,
  reports: (userId: string) => `chinwag:reportcount:${userId}`,
  authAccount: (userId: string) => `chinwag:auth:account:${userId}`,
  authEmail: (email: string) => `chinwag:auth:email:${email}`,
  authSession: (token: string) => `chinwag:auth:session:${token}`,
  webrtc: (key: string) => `chinwag:webrtc:${key}`,
  game: (roomId: string) => `chinwag:game:${roomId}`,
  analytics: "chinwag:analytics",
  referral: (userId: string) => `chinwag:referral:${userId}`,
  referralUse: (code: string) => `chinwag:referral-use:${code}`,
  roomMessages: (roomId: string) => `chinwag:room:${roomId}:messages`,
  roomTyping: (roomId: string, userId: string) =>
    `chinwag:room:${roomId}:typing:${userId}`,
  guestMatches: (userId: string) => `chinwag:guest:matches:${userId}`,
} as const;

export type { ChatMessagePayload } from "./platform-types";

export interface PublicUserProfile {
  name: string;
  age: number;
}

export type UserStatus = "waiting" | "matched" | "partner_left" | "idle";

export interface UserState {
  status: UserStatus;
  roomId: string | null;
  partnerId: string | null;
  updatedAt: number;
  lastSkipAt?: number;
  isGuest?: boolean;
}

export interface MatchResponse {
  status: UserStatus;
  roomId?: string;
  partnerId?: string;
  partnerName?: string;
  partnerAge?: number;
  queuePosition?: number;
  queueAhead?: number;
  commonInterests?: string[];
  icebreaker?: string;
  error?: string;
  guestMatchesToday?: number;
  guestDailyLimit?: number;
  guestRemaining?: number;
  estimatedWaitSec?: number;
  waitingOnline?: number;
}