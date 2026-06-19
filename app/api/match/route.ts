import { NextRequest, NextResponse } from "next/server";
import {
  attemptQueueMatch,
  getMatchStatus,
  joinMatchQueue,
  leaveMatch,
} from "@/lib/matching";
import { LONG_POLL_TIMEOUT_MS } from "@/lib/constants";
import type { MatchPreferences } from "@/lib/platform-types";
import { trackEvent } from "@/lib/analytics";
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
        { intervalMs: 15, timeoutMs: LONG_POLL_TIMEOUT_MS },
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
      preferences?: Partial<MatchPreferences>;
    };

    const { userId, action = "join", profile, preferences } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (action === "leave") {
      await leaveMatch(userId);
      await trackEvent({ name: "match_leave", userId });
      return NextResponse.json({ status: "idle" });
    }

    if (action === "next") {
      await leaveMatch(userId);
      let result = await joinMatchQueue(userId, profile, preferences, {
        isSkip: true,
      });
      if (result.status === "waiting") {
        const matched = await attemptQueueMatch(userId);
        if (matched) result = matched;
      }
      await trackEvent({ name: "match_next", userId });
      return NextResponse.json(result);
    }

    let result = await joinMatchQueue(userId, profile, preferences);
    if (result.status === "waiting") {
      const matched = await attemptQueueMatch(userId);
      if (matched) result = matched;
    }
    await trackEvent({ name: "match_join", userId });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[match POST]", error);
    return NextResponse.json({ error: "Match request failed" }, { status: 500 });
  }
}