import { NextResponse } from "next/server";
import {
  createUser,
  createVerificationCode,
  findUserByEmail,
  setPending,
} from "@/lib/auth-server";
import { sendVerificationEmail, devCodeExposable } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 422 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 422 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 422 });

  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = createUser(email, name, password);
  await setPending(user.id);
  const code = createVerificationCode(user.id);
  await sendVerificationEmail(email, name, code);

  return NextResponse.json({
    ok: true,
    email,
    // Only present in dev without SMTP, so verification is testable locally.
    devCode: devCodeExposable() ? code : undefined,
  });
}
