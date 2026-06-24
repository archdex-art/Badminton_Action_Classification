"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ROUTES } from "@/lib/auth";

// Email 2FA step: validates the emailed sign-in code, then issues the session.
export default function TwoFactorPage() {
  const router = useRouter();
  const [email, setEmail] = useState("your inbox");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    try {
      const e = sessionStorage.getItem("sc_2fa_email");
      if (e) setEmail(e);
      const c = sessionStorage.getItem("sc_dev_code");
      if (c) {
        setDevCode(c);
        setDigits(c.split("").slice(0, 6));
      }
    } catch {}
    refs.current[0]?.focus();
  }, []);

  const code = digits.join("");
  const complete = code.length === 6;

  function setAt(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = clean;
      return next;
    });
    if (clean && i < 5) refs.current[i + 1]?.focus();
  }
  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }
  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text) {
      e.preventDefault();
      setDigits(text.padEnd(6, "").split("").slice(0, 6).map((c) => c || ""));
      refs.current[Math.min(text.length, 5)]?.focus();
    }
  }

  async function submit() {
    if (!complete) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        setPending(false);
        return;
      }
      try {
        sessionStorage.removeItem("sc_2fa_email");
        sessionStorage.removeItem("sc_dev_code");
      } catch {}
      router.push(ROUTES.app);
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/resend", { method: "POST" });
      const data = await res.json();
      if (data.devCode) {
        setDevCode(data.devCode);
        setDigits(String(data.devCode).split("").slice(0, 6));
        try {
          sessionStorage.setItem("sc_dev_code", data.devCode);
        } catch {}
      }
    } catch {}
  }

  return (
    <div className="w-full max-w-sm text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-accent">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-ink">
        Two-factor authentication
      </h1>
      <p className="mt-2 text-sm text-muted">
        Enter the 6-digit code we sent to <span className="font-medium text-ink">{email}</span>.
      </p>

      {devCode && (
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-lg bg-elevated px-3 py-1.5 text-xs text-muted">
          <span className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">dev</span>
          No email server configured — your code is{" "}
          <span className="font-mono font-semibold text-ink">{devCode}</span>
        </p>
      )}

      <div className="mt-8 flex justify-center gap-2" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            aria-label={`Digit ${i + 1}`}
            className="h-12 w-11 rounded-xl border bg-surface text-center font-mono text-lg text-ink outline-none transition-colors focus:border-accent"
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <motion.button
        type="button"
        onClick={submit}
        disabled={!complete || pending}
        whileTap={{ scale: 0.98 }}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-ink text-sm font-semibold text-canvas transition-opacity disabled:opacity-50"
      >
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-canvas/40 border-t-canvas" />
        ) : (
          "Verify & sign in"
        )}
      </motion.button>

      <p className="mt-5 text-sm text-muted">
        Didn&apos;t get it?{" "}
        <button type="button" onClick={resend} className="font-medium text-ink underline-offset-4 hover:underline">
          Resend code
        </button>
      </p>
    </div>
  );
}
