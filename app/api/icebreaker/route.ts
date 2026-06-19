import { NextResponse } from "next/server";
import { randomIcebreaker } from "@/lib/icebreakers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ prompt: randomIcebreaker() });
}