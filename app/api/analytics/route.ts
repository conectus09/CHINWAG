import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsSummary, trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getAnalyticsSummary();
  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    name?: string;
    userId?: string;
    meta?: Record<string, string | number | boolean>;
  };

  if (!body.name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  await trackEvent({
    name: body.name,
    userId: body.userId,
    meta: body.meta,
  });

  return NextResponse.json({ ok: true });
}