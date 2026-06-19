import { NextRequest, NextResponse } from "next/server";
import { drainSignals, pushSignal } from "@/lib/webrtc-signaling";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  const userId = request.nextUrl.searchParams.get("userId");
  const sinceRaw = request.nextUrl.searchParams.get("since");
  const since = sinceRaw ? Number(sinceRaw) : 0;

  if (!roomId || !userId) {
    return NextResponse.json({ error: "roomId and userId required" }, { status: 400 });
  }

  const signals = await drainSignals(roomId, userId, since);
  return NextResponse.json({ signals });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    roomId?: string;
    from?: string;
    to?: string;
    type?: "offer" | "answer" | "ice";
    payload?: string;
  };

  if (!body.roomId || !body.from || !body.to || !body.type || !body.payload) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const signal = await pushSignal({
    roomId: body.roomId,
    from: body.from,
    to: body.to,
    type: body.type,
    payload: body.payload,
  });

  return NextResponse.json({ signal });
}