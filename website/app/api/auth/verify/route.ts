import { NextResponse } from "next/server";
import {
  clearPending,
  consumeVerificationCode,
  createSession,
  getPending,
  setEmailVerified,
} from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifySchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const userId = await getPending();

  if (!userId) {
    return NextResponse.json({ error: "No pending verification. Please sign up again." }, { status: 400 });
  }

  // Rate Limiting: 5 requests / 10 minutes per IP/User pair
  const rateLimitKey = `verify:${userId}:${ip}`;
  const rateLimit = checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000);
  if (!rateLimit.success) {
    console.warn(`[SECURITY] Rate limit exceeded on verify for user ${userId} IP: ${ip}`);
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString() },
      }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { code } = parsed.data;

  if (!consumeVerificationCode(userId, code)) {
    console.warn(`[SECURITY] Failed verification code attempt for user ${userId} IP: ${ip}`);
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
  }

  setEmailVerified(userId);
  await createSession(userId);
  await clearPending();
  console.log(`[AUTH] Successful email verification for user: ${userId}`);

  return NextResponse.json({ ok: true });
}
