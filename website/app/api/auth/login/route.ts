import { NextResponse } from "next/server";
import {
  createCode,
  createSession,
  createVerificationCode,
  findUserByEmail,
  setPending,
  setTwofaPending,
  verifyPassword,
} from "@/lib/auth-server";
import { sendTwoFactorEmail, sendVerificationEmail, devCodeExposable } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    // Same message for both to avoid user enumeration.
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  // Unverified accounts get bounced to verification with a fresh code.
  if (!user.email_verified) {
    await setPending(user.id);
    const code = createVerificationCode(user.id);
    await sendVerificationEmail(user.email, user.name, code);
    return NextResponse.json(
      { error: "verify", devCode: devCodeExposable() ? code : undefined },
      { status: 403 },
    );
  }

  // Email 2FA: if enabled, require an emailed code before issuing a session.
  if (user.twofa_enabled) {
    await setTwofaPending(user.id);
    const code = createCode(user.id, "2fa");
    await sendTwoFactorEmail(user.email, user.name, code);
    return NextResponse.json({
      twofa: true,
      email: user.email,
      devCode: devCodeExposable() ? code : undefined,
    });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
