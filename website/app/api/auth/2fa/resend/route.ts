import { NextResponse } from "next/server";
import { createCode, getTwofaPending } from "@/lib/auth-server";
import { sendTwoFactorEmail, devCodeExposable } from "@/lib/mailer";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getTwofaPending();
  if (!userId) return NextResponse.json({ error: "No sign-in in progress." }, { status: 400 });

  const user = getDb()
    .prepare("SELECT email, name FROM users WHERE id = ?")
    .get(userId) as { email: string; name: string } | undefined;
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const code = createCode(userId, "2fa");
  await sendTwoFactorEmail(user.email, user.name, code);
  return NextResponse.json({ ok: true, devCode: devCodeExposable() ? code : undefined });
}
