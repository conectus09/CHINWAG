import { NextRequest, NextResponse } from "next/server";
import {
  attemptQueueMatch,
  getMatchStatus,
  joinMatchQueue,
  leaveMatch,
} from "@/lib/matching";
import { LONG_POLL_TIMEOUT_MS } from "@/lib/constants";
import { waitUntil } from "@/lib/wait-until";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const wait = request.nextUrl.searchParams.get("wait") === "1";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    let status = await getMatchStatus(userId);

    if (status.status === "waiting") {
      const matched = await attemptQueueMatch(userId);
      if (matched) {
        status = matched;
      }
    }

    if (wait && status.status === "waiting") {
      const updated = await waitUntil(
        async () => {
          const matched = await attemptQueueMatch(userId);
          if (matched) return matched;

          const next = await getMatchStatus(userId);
          if (next.status !== "waiting") {
            return next;
          }
          return null;
        },
        { intervalMs: 35, timeoutMs: LONG_POLL_TIMEOUT_MS },
      );

      if (updated) {
        status = updated;
      }
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("[match GET]", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      action?: "join" | "next" | "leave";
      profile?: { name?: string; age?: number };
    };

    const { userId, action = "join", profile } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (action === "leave") {
      await leaveMatch(userId);
      return NextResponse.json({ status: "idle" });
    }

    if (action === "next") {
      await leaveMatch(userId);
      const result = await joinMatchQueue(userId, profile);
      return NextResponse.json(result);
    }

    const result = await joinMatchQueue(userId, profile);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[match POST]", error);
    return NextResponse.json({ error: "Match request failed" }, { status: 500 });
  }
}