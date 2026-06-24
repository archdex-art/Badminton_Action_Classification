import "server-only";
import nodemailer from "nodemailer";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// Email delivery. If SMTP_* env vars are set, sends real mail via nodemailer.
// Otherwise falls back to a dev transport that prints the message and appends it
// to data/outbox.log — so the verification flow is fully testable locally.

const FROM = process.env.MAIL_FROM ?? "SkeletonCourt <no-reply@skeletoncourt.dev>";

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

let transporter: nodemailer.Transporter | null = null;
function getTransport(): nodemailer.Transporter {
  if (transporter) return transporter;
  if (smtpConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

function logToOutbox(to: string, subject: string, code: string) {
  try {
    const dir = path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    appendFileSync(
      path.join(dir, "outbox.log"),
      `[${new Date().toISOString()}] to=${to} subject="${subject}" code=${code}\n`,
    );
  } catch {
    /* best effort */
  }
}

export async function sendVerificationEmail(to: string, name: string, code: string) {
  const subject = "Verify your SkeletonCourt email";
  const text = `Hi ${name},\n\nYour SkeletonCourt verification code is: ${code}\n\nIt expires in 15 minutes.\n\n— SkeletonCourt`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#0F172A;margin:0 0 8px">Verify your email</h2>
      <p style="color:#64748B;margin:0 0 20px">Hi ${name}, enter this code to finish creating your SkeletonCourt account.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#283593;background:#eef0fb;border-radius:12px;padding:16px;text-align:center">${code}</div>
      <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">This code expires in 15 minutes. If you didn't request it, ignore this email.</p>
    </div>`;

  // Always record to the outbox log (handy in dev; harmless in prod).
  logToOutbox(to, subject, code);

  if (smtpConfigured()) {
    await getTransport().sendMail({ from: FROM, to, subject, text, html });
  } else {
    // Dev: surface the message in the server console.
    console.log(`\n📧 [dev mail] to=${to}  code=${code}\n`);
  }
}

export async function sendTwoFactorEmail(to: string, name: string, code: string) {
  const subject = "Your SkeletonCourt sign-in code";
  const text = `Hi ${name},\n\nYour SkeletonCourt sign-in code is: ${code}\n\nIt expires in 15 minutes. If you didn't try to sign in, change your password.\n\n— SkeletonCourt`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#0F172A;margin:0 0 8px">Sign-in verification</h2>
      <p style="color:#64748B;margin:0 0 20px">Hi ${name}, enter this code to finish signing in to SkeletonCourt.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#283593;background:#eef0fb;border-radius:12px;padding:16px;text-align:center">${code}</div>
      <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">This code expires in 15 minutes. If this wasn't you, change your password.</p>
    </div>`;

  logToOutbox(to, subject, code);
  if (smtpConfigured()) {
    await getTransport().sendMail({ from: FROM, to, subject, text, html });
  } else {
    console.log(`\n🔐 [dev mail] 2FA to=${to}  code=${code}\n`);
  }
}

// In non-production we expose the code to the client so the flow is testable
// without a configured SMTP server. Never do this in production.
export function devCodeExposable() {
  return process.env.NODE_ENV !== "production" && !smtpConfigured();
}
