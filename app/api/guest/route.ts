import { NextRequest, NextResponse } from "next/server";
import {
  canGuestMatch,
  getGuestMatchCount,
  GUEST_DAILY_MATCH_LIMIT,
} from "@/lib/guest-limits";
import { getReferralCode } from "@/lib/referral";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const [matchesToday, referralCode, allowed] = await Promise.all([
    getGuestMatchCount(userId),
    getReferralCode(userId),
    canGuestMatch(userId),
  ]);

  return NextResponse.json({
    matchesToday,
    dailyLimit: GUEST_DAILY_MATCH_LIMIT,
    remaining: Math.max(0, GUEST_DAILY_MATCH_LIMIT - matchesToday),
    allowed,
    referralCode,
    inviteUrl: `${request.nextUrl.origin}/?ref=${referralCode}`,
  });
}