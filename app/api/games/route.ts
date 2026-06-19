import { NextRequest, NextResponse } from "next/server";
import { getTicTacToe, playTicTacToe, resetTicTacToe } from "@/lib/games";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const state = await getTicTacToe(roomId);
  return NextResponse.json({ state });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    roomId?: string;
    action?: "move" | "reset";
    index?: number;
    mark?: "X" | "O";
  };

  if (!body.roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  if (body.action === "reset") {
    const state = await resetTicTacToe(body.roomId);
    return NextResponse.json({ state });
  }

  if (body.action === "move" && typeof body.index === "number" && body.mark) {
    const state = await playTicTacToe(body.roomId, body.index, body.mark);
    return NextResponse.json({ state });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}