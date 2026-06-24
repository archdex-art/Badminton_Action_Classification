import { NextResponse } from "next/server";
import { clearTwofaPending, consumeCode, createSession, getTwofaPending } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Completes a 2FA login: validates the emailed code for the pending user and
// issues the session only then.
export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  const userId = await getTwofaPending();
  if (!userId) {
    return NextResponse.json({ error: "No sign-in in progress. Please log in again." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 422 });
  }
  if (!consumeCode(userId, code, "2fa")) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
  }

  await createSession(userId);
  await clearTwofaPending();
  return NextResponse.json({ ok: true });
}
