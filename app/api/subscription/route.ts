import { NextRequest, NextResponse } from "next/server";
import { getSession, upgradeUserTier } from "@/lib/auth-server";
import { trackEvent } from "@/lib/analytics";
import type { SubscriptionTier } from "@/lib/platform-types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    token?: string;
    tier?: SubscriptionTier;
    paymentRef?: string;
  };

  if (!body.token || !body.tier || body.tier === "free") {
    return NextResponse.json({ error: "Invalid upgrade request" }, { status: 400 });
  }

  const session = await getSession(body.token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await upgradeUserTier(session.userId, body.tier);
  await trackEvent({
    name: "subscription_upgrade",
    userId: session.userId,
    meta: { tier: body.tier, paymentRef: body.paymentRef ?? "demo" },
  });

  return NextResponse.json({
    ok: true,
    tier: body.tier,
    message: `${body.tier.toUpperCase()} activated (demo mode)`,
  });
}