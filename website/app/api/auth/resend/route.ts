import { NextResponse } from "next/server";
import { createVerificationCode, getPending } from "@/lib/auth-server";
import { sendVerificationEmail, devCodeExposable } from "@/lib/mailer";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getPending();
  if (!userId) {
    return NextResponse.json({ error: "No pending verification." }, { status: 400 });
  }
  const user = getDb()
    .prepare("SELECT email, name FROM users WHERE id = ?")
    .get(userId) as { email: string; name: string } | undefined;
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const code = createVerificationCode(userId);
  await sendVerificationEmail(user.email, user.name, code);
  return NextResponse.json({ ok: true, devCode: devCodeExposable() ? code : undefined });
}
