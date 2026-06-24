import { NextResponse } from "next/server";
import {
  clearPending,
  consumeVerificationCode,
  createSession,
  getPending,
  setEmailVerified,
} from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  const userId = await getPending();
  if (!userId) {
    return NextResponse.json({ error: "No pending verification. Please sign up again." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 422 });
  }

  if (!consumeVerificationCode(userId, code)) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
  }

  setEmailVerified(userId);
  await createSession(userId);
  await clearPending();

  return NextResponse.json({ ok: true });
}
