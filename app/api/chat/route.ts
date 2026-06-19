import { NextRequest, NextResponse } from "next/server";
import {
  addChatMessage,
  addReaction,
  getChatMessagesSince,
  isPartnerTyping,
  markMessageRead,
  setChatTyping,
  validateImageDataUrl,
} from "@/lib/fallback-chat";
import { LONG_POLL_TIMEOUT_MS } from "@/lib/constants";
import { waitUntil } from "@/lib/wait-until";

export const dynamic = "force-dynamic";

async function loadChatSnapshot(
  roomId: string,
  since: number,
  partnerId: string | null,
  readerId: string | null,
) {
  const messages = await getChatMessagesSince(roomId, since);
  const partnerTyping = partnerId
    ? await isPartnerTyping(roomId, partnerId)
    : false;

  if (readerId) {
    for (const message of messages) {
      if (message.sender !== readerId && !(message.readBy ?? []).includes(readerId)) {
        await markMessageRead(roomId, message.id, readerId);
        message.readBy = [...new Set([...(message.readBy ?? []), readerId])];
      }
    }
  }

  return { messages, partnerTyping };
}

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  const partnerId = request.nextUrl.searchParams.get("partnerId");
  const readerId = request.nextUrl.searchParams.get("readerId");
  const sinceRaw = request.nextUrl.searchParams.get("since");
  const since = sinceRaw ? Number(sinceRaw) : 0;
  const wait = request.nextUrl.searchParams.get("wait") === "1";

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  try {
    let snapshot = await loadChatSnapshot(roomId, since, partnerId, readerId);

    if (wait && snapshot.messages.length === 0 && !snapshot.partnerTyping) {
      const updated = await waitUntil(
        async () => {
          const next = await loadChatSnapshot(roomId, since, partnerId, readerId);
          if (next.messages.length > 0 || next.partnerTyping) {
            return next;
          }
          return null;
        },
        { intervalMs: 80, timeoutMs: LONG_POLL_TIMEOUT_MS },
      );

      if (updated) {
        snapshot = updated;
      }
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[chat GET]", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      roomId?: string;
      userId?: string;
      action?: "message" | "typing" | "reaction" | "image";
      text?: string;
      active?: boolean;
      messageId?: string;
      reaction?: string;
      imageUrl?: string;
    };

    const { roomId, userId, action } = body;

    if (!roomId || !userId || !action) {
      return NextResponse.json(
        { error: "roomId, userId, and action are required" },
        { status: 400 },
      );
    }

    if (action === "message") {
      const text = body.text?.trim();
      if (!text) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
      }

      const message = await addChatMessage(roomId, userId, text);
      return NextResponse.json({ message });
    }

    if (action === "image") {
      const imageUrl = body.imageUrl?.trim();
      if (!imageUrl || !validateImageDataUrl(imageUrl)) {
        return NextResponse.json({ error: "Invalid image" }, { status: 400 });
      }

      const message = await addChatMessage(roomId, userId, "📷 Photo", {
        kind: "image",
        imageUrl,
      });
      return NextResponse.json({ message });
    }

    if (action === "reaction") {
      const messageId = body.messageId;
      const reaction = body.reaction?.trim();
      if (!messageId || !reaction) {
        return NextResponse.json({ error: "messageId and reaction required" }, { status: 400 });
      }

      const message = await addReaction(roomId, messageId, userId, reaction);
      if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }
      return NextResponse.json({ message });
    }

    if (action === "typing") {
      await setChatTyping(roomId, userId, Boolean(body.active));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[chat POST]", error);
    const message = error instanceof Error ? error.message : "Chat action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}