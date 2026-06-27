import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken } from "@/lib/jwt";
import {
  findUserByEmail,
  getPending,
  clearPending,
  getTwofaPending,
  clearTwofaPending,
  setEmailVerified,
  createSession,
} from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/auth/login", req.url);

  if (!token) {
    loginUrl.searchParams.set("error", "missing_token");
    return NextResponse.redirect(loginUrl);
  }

  const payload = verifyMagicToken(token);
  if (!payload) {
    loginUrl.searchParams.set("error", "invalid_token");
    return NextResponse.redirect(loginUrl);
  }

  const user = findUserByEmail(payload.email);
  if (!user || user.id !== payload.sub) {
    loginUrl.searchParams.set("error", "user_not_found");
    return NextResponse.redirect(loginUrl);
  }

  if (payload.purpose === "verify") {
    if (user.email_verified) {
      // Idempotent: already verified, just login and redirect
      const res = NextResponse.redirect(new URL("/app/dashboard", req.url));
      await createSession(user.id, res);
      return res;
    }

    setEmailVerified(user.id);
    const res = NextResponse.redirect(new URL("/app/dashboard?verified=1", req.url));
    await clearPending(res);
    await createSession(user.id, res);
    
    return res;
  }

  if (payload.purpose === "2fa") {
    const res = NextResponse.redirect(new URL("/app/dashboard", req.url));
    await clearTwofaPending(res);
    await createSession(user.id, res);
    return res;
  }

  loginUrl.searchParams.set("error", "invalid_purpose");
  return NextResponse.redirect(loginUrl);
}
