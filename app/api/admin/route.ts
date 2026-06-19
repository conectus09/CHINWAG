import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics";
import { listRecentReports } from "@/lib/moderation";
import { getPlatformStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const adminKey = process.env.ADMIN_KEY ?? "chinwag-admin";
  const provided = new URL(request.url).searchParams.get("key");

  if (provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, analytics, reports] = await Promise.all([
    getPlatformStats(),
    getAnalyticsSummary(),
    listRecentReports(30),
  ]);

  return NextResponse.json({ stats, analytics, reports });
}