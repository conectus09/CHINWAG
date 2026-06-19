import { NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getPlatformStats();
  return NextResponse.json(stats);
}