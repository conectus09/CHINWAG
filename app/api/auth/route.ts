import { NextRequest, NextResponse } from "next/server";
import { getSession, loginUser, signupUser } from "@/lib/auth-server";
import { isCaptchaMatch } from "@/lib/captcha";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  return NextResponse.json({ session });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: "login" | "signup";
      email?: string;
      password?: string;
      name?: string;
      captcha?: string;
      captchaCode?: string;
    };

    if (!body.captcha || !body.captchaCode || !isCaptchaMatch(body.captcha, body.captchaCode)) {
      return NextResponse.json({ error: "Invalid captcha" }, { status: 400 });
    }

    if (body.action === "signup") {
      const session = await signupUser({
        email: body.email ?? "",
        password: body.password ?? "",
        name: body.name ?? "User",
      });
      await trackEvent({ name: "auth_signup", userId: session.userId });
      return NextResponse.json({ session });
    }

    const session = await loginUser({
      email: body.email ?? "",
      password: body.password ?? "",
    });
    await trackEvent({ name: "auth_login", userId: session.userId });
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}