import { NextResponse } from "next/server";
import { clearTwofaPending, consumeCode, createSession, getTwofaPending } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { twoFaSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

// Completes a 2FA login: validates the emailed code for the pending user and
// issues the session only then.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const userId = await getTwofaPending();

  if (!userId) {
    return NextResponse.json({ error: "No sign-in in progress. Please log in again." }, { status: 400 });
  }

  // Rate Limiting: 5 requests / 10 minutes per IP/User pair
  const rateLimitKey = `2fa:${userId}:${ip}`;
  const rateLimit = checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000);
  if (!rateLimit.success) {
    console.warn(`[SECURITY] Rate limit exceeded on 2FA for user ${userId} IP: ${ip}`);
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

  const parsed = twoFaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { code } = parsed.data;

  if (!consumeCode(userId, code, "2fa")) {
    console.warn(`[SECURITY] Failed 2FA code attempt for user ${userId} IP: ${ip}`);
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
  }

  await createSession(userId);
  await clearTwofaPending();
  console.log(`[AUTH] Successful 2FA login for user: ${userId}`);
  return NextResponse.json({ ok: true });
}
