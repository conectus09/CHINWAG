export const APP_NAME = "CHINWAG";
export const APP_TAGLINE = "Meet New People Around The World Instantly";
export const APP_LOGO_URL =
  "https://res.cloudinary.com/doafv0hxx/image/upload/v1781636025/ChatGPT_Image_Jun_17_2026_12_22_33_AM_lxq8ah.png";

export const CONTACT_EMAIL = "connectsus09@gmail.com";
export const CONTACT_PHONE = "+91 8287735448";
export const CONTACT_PHONE_HREF = "tel:+918287735448";
export const LEGAL_LAST_UPDATED = "17 June 2026";

export const MATCH_POLL_INTERVAL_MS = 250;
export const MATCH_BURST_POLL_MS = 80;
export const CHAT_POLL_INTERVAL_MS = 400;
export const LONG_POLL_TIMEOUT_MS = 25000;
export const LONG_POLL_RETRY_MS = 120;
export const MATCH_QUEUE_SCAN_LIMIT = 48;
export const CHAT_TOPIC = "chinwag-chat";
export const SYSTEM_TOPIC = "chinwag-system";
export const TYPING_IDLE_MS = 1500;
export const TYPING_HEARTBEAT_MS = 1000;
export const TYPING_PARTNER_TIMEOUT_MS = 3000;

export const REDIS_KEYS = {
  queue: "chinwag:queue",
  user: (userId: string) => `chinwag:user:${userId}`,
  profile: (userId: string) => `chinwag:profile:${userId}`,
  roomMessages: (roomId: string) => `chinwag:room:${roomId}:messages`,
  roomTyping: (roomId: string, userId: string) =>
    `chinwag:room:${roomId}:typing:${userId}`,
} as const;

export interface ChatMessagePayload {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

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
}

export interface MatchResponse {
  status: UserStatus;
  roomId?: string;
  partnerId?: string;
  partnerName?: string;
  partnerAge?: number;
}