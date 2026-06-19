import { nanoid } from "nanoid";
import { REDIS_KEYS } from "./constants";
import { filterMessage } from "./moderation";
import type { ChatMessagePayload } from "./platform-types";
import { getRedis } from "./redis";

const ROOM_TTL_SECONDS = 7200;
const MAX_MESSAGES_PER_ROOM = 200;
const TYPING_TTL_SECONDS = 5;
const MAX_IMAGE_CHARS = 120_000;

declare global {
  // eslint-disable-next-line no-var
  var chinwagFallbackChatStore:
    | Map<
        string,
        {
          messages: ChatMessagePayload[];
          typing: Map<string, { active: boolean; updatedAt: number }>;
        }
      >
    | undefined;
}

const memoryStore =
  global.chinwagFallbackChatStore ??
  (global.chinwagFallbackChatStore = new Map());

function getMemoryRoom(roomId: string) {
  let room = memoryStore.get(roomId);
  if (!room) {
    room = { messages: [], typing: new Map() };
    memoryStore.set(roomId, room);
  }
  return room;
}

function parseMessage(raw: string): ChatMessagePayload | null {
  try {
    const parsed = JSON.parse(raw) as ChatMessagePayload;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.sender === "string" &&
      typeof parsed.text === "string" &&
      typeof parsed.timestamp === "number"
    ) {
      return parsed;
    }
  } catch {
    // ignore malformed entries
  }
  return null;
}

export async function addChatMessage(
  roomId: string,
  sender: string,
  text: string,
  options?: { kind?: ChatMessagePayload["kind"]; imageUrl?: string; replyTo?: string },
): Promise<ChatMessagePayload> {
  const isSystem = sender === "system" || options?.kind === "system";
  if (!isSystem) {
    const filtered = filterMessage(text);
    if (!filtered.ok) {
      throw new Error(filtered.reason ?? "Message blocked");
    }
  }

  const message: ChatMessagePayload = {
    id: `${sender}-${nanoid(10)}`,
    sender,
    text: text.trim(),
    timestamp: Date.now(),
    kind: options?.kind ?? (isSystem ? "system" : "text"),
    imageUrl: options?.imageUrl,
    replyTo: options?.replyTo,
    readBy: isSystem ? [] : [sender],
  };

  const redis = getRedis();
  if (redis) {
    const key = REDIS_KEYS.roomMessages(roomId);
    await redis.rpush(key, JSON.stringify(message));
    await redis.ltrim(key, -MAX_MESSAGES_PER_ROOM, -1);
    await redis.expire(key, ROOM_TTL_SECONDS);
    return message;
  }

  const room = getMemoryRoom(roomId);
  room.messages.push(message);
  if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
    room.messages.splice(0, room.messages.length - MAX_MESSAGES_PER_ROOM);
  }
  return message;
}

export async function addReaction(
  roomId: string,
  messageId: string,
  sender: string,
  reaction: string,
): Promise<ChatMessagePayload | null> {
  const redis = getRedis();
  const key = REDIS_KEYS.roomMessages(roomId);

  if (redis) {
    const rawMessages = await redis.lrange(key, 0, -1);
    for (let index = 0; index < rawMessages.length; index += 1) {
      const message = parseMessage(rawMessages[index]);
      if (!message || message.id !== messageId) continue;
      message.reaction = reaction;
      await redis.lset(key, index, JSON.stringify(message));
      return message;
    }
    return null;
  }

  const room = getMemoryRoom(roomId);
  const message = room.messages.find((entry: ChatMessagePayload) => entry.id === messageId);
  if (!message) return null;
  message.reaction = reaction;
  return message;
}

export async function markMessageRead(
  roomId: string,
  messageId: string,
  readerId: string,
): Promise<void> {
  const redis = getRedis();
  const key = REDIS_KEYS.roomMessages(roomId);

  if (redis) {
    const rawMessages = await redis.lrange(key, 0, -1);
    for (let index = 0; index < rawMessages.length; index += 1) {
      const message = parseMessage(rawMessages[index]);
      if (!message || message.id !== messageId) continue;
      const readBy = new Set(message.readBy ?? []);
      readBy.add(readerId);
      message.readBy = [...readBy];
      await redis.lset(key, index, JSON.stringify(message));
      return;
    }
    return;
  }

  const room = getMemoryRoom(roomId);
  const message = room.messages.find((entry: ChatMessagePayload) => entry.id === messageId);
  if (!message) return;
  const readBy = new Set(message.readBy ?? []);
  readBy.add(readerId);
  message.readBy = [...readBy];
}

export async function getChatMessagesSince(
  roomId: string,
  since: number,
): Promise<ChatMessagePayload[]> {
  const redis = getRedis();
  if (redis) {
    const key = REDIS_KEYS.roomMessages(roomId);
    const rawMessages = await redis.lrange(key, 0, -1);
    return rawMessages
      .map(parseMessage)
      .filter((message): message is ChatMessagePayload => message !== null)
      .filter((message) => message.timestamp > since);
  }

  return getMemoryRoom(roomId).messages.filter(
    (message: ChatMessagePayload) => message.timestamp > since,
  );
}

export async function setChatTyping(
  roomId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const key = REDIS_KEYS.roomTyping(roomId, userId);
    if (active) {
      await redis.set(key, "1", "EX", TYPING_TTL_SECONDS);
    } else {
      await redis.del(key);
    }
    return;
  }

  const room = getMemoryRoom(roomId);
  if (active) {
    room.typing.set(userId, { active: true, updatedAt: Date.now() });
  } else {
    room.typing.delete(userId);
  }
}

export async function isPartnerTyping(
  roomId: string,
  partnerId: string,
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const key = REDIS_KEYS.roomTyping(roomId, partnerId);
    return (await redis.exists(key)) === 1;
  }

  const entry = getMemoryRoom(roomId).typing.get(partnerId);
  if (!entry?.active) return false;

  return Date.now() - entry.updatedAt < TYPING_TTL_SECONDS * 1000;
}

export async function seedMatchWelcome(
  roomId: string,
  nameA: string,
  nameB: string,
): Promise<void> {
  const redis = getRedis();
  const key = REDIS_KEYS.roomMessages(roomId);

  if (redis) {
    const existing = await redis.llen(key);
    if (existing > 0) return;
  } else {
    const room = getMemoryRoom(roomId);
    if (room.messages.length > 0) return;
  }

  await addChatMessage(
    roomId,
    "system",
    `${nameA} and ${nameB} are connected. You're chatting with a real person — say hi!`,
    { kind: "system" },
  );
}

export function validateImageDataUrl(dataUrl: string): boolean {
  return (
    dataUrl.startsWith("data:image/") &&
    dataUrl.includes("base64,") &&
    dataUrl.length <= MAX_IMAGE_CHARS
  );
}