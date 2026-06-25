import { NextResponse } from "next/server";
import {
  createUser,
  createVerificationCode,
  findUserByEmail,
  setPending,
} from "@/lib/auth-server";
import { sendVerificationEmail, devCodeExposable } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Rate Limiting: 3 requests / 1 hour per IP
  const rateLimit = checkRateLimit(`signup:${ip}`, 3, 60 * 60 * 1000);
  if (!rateLimit.success) {
    console.warn(`[SECURITY] Rate limit exceeded on signup for IP: ${ip}`);
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
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

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const lowerEmail = email.toLowerCase();

  if (findUserByEmail(lowerEmail)) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = createUser(lowerEmail, name, password);
  await setPending(user.id);
  const code = createVerificationCode(user.id);
  await sendVerificationEmail(lowerEmail, name, code);
  
  console.log(`[AUTH] New user signup: ${lowerEmail}`);

  return NextResponse.json({
    ok: true,
    email: lowerEmail,
    // Only present in dev without SMTP, so verification is testable locally.
    devCode: devCodeExposable() ? code : undefined,
  });
}
