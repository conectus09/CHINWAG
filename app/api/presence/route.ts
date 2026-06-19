import { NextRequest, NextResponse } from "next/server";
import {
  getLivePresenceSnapshot,
  recordLiveHeartbeat,
  removeLiveSession,
} from "@/lib/live-presence";
import { getActivityCounts } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activity = await getActivityCounts();
    const snapshot = await getLivePresenceSnapshot(activity);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[presence GET]", error);
    return NextResponse.json({ error: "Failed to read presence" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      action?: "heartbeat" | "leave";
    };

    const { sessionId, action = "heartbeat" } = body;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const online =
      action === "leave"
        ? await removeLiveSession(sessionId)
        : await recordLiveHeartbeat(sessionId);

    const activity = await getActivityCounts();
    const snapshot = await getLivePresenceSnapshot(activity);

    return NextResponse.json({ ...snapshot, online }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[presence POST]", error);
    return NextResponse.json({ error: "Presence update failed" }, { status: 500 });
  }
}