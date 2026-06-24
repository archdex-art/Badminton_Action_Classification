import { NextResponse } from "next/server";
import { ACTIONS } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-server";
import { recordClassification, type Prediction } from "@/lib/classifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Configuration ---------------------------------------------------------
const ACCEPTED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.reset) {
    buckets.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT) return false;
  b.count += 1;
  return true;
}
function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

// Map the model's snake_case class slugs → display names used across the UI.
const SLUG_TO_NAME = new Map(ACTIONS.map((a) => [a.slug, a.name]));
function titleCase(slug: string) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Forward the uploaded clip to the Python model server for a real prediction.
async function classifyWithModel(clip: File): Promise<Prediction[]> {
  const base = process.env.MODEL_SERVER_URL!.replace(/\/$/, "");
  const fd = new FormData();
  fd.append("clip", clip, clip.name);
  const res = await fetch(`${base}/v1/predict/video`, {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`model server responded ${res.status}`);
  const data = (await res.json()) as { probabilities: Record<string, number> };
  return Object.entries(data.probabilities)
    .map(([slug, p]) => ({
      action: SLUG_TO_NAME.get(slug) ?? titleCase(slug),
      confidence: Math.round(p * 1000) / 10,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

// Deterministic-ish simulated inference over the real 5-class label set,
// used when no model server is configured (or it is unreachable).
function simulateInference(): Prediction[] {
  const pool = [...ACTIONS];
  const picks: typeof ACTIONS = [];
  for (let i = 0; i < 4 && pool.length; i++) {
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picks
    .map((a, i) => ({
      action: a.name,
      confidence: Math.max(40, Math.min(99, a.confidence - i * (4 + Math.random() * 5))),
    }))
    .sort((x, y) => y.confidence - x.confidence);
}

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 415 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const clip = form.get("clip");
  if (!(clip instanceof File)) {
    return NextResponse.json({ error: "No clip provided." }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.has(clip.type)) {
    return NextResponse.json({ error: "Unsupported media type." }, { status: 415 });
  }
  if (clip.size === 0 || clip.size > MAX_BYTES) {
    return NextResponse.json({ error: "File size out of bounds." }, { status: 413 });
  }

  // Real model server when configured; otherwise simulate. Falls back to
  // simulation if the model server is unreachable so the app stays usable.
  let predictions: Prediction[] | null = null;
  let source = "simulated";
  if (process.env.MODEL_SERVER_URL) {
    try {
      predictions = await classifyWithModel(clip);
      source = "model";
    } catch (e) {
      console.error("[classify] model server failed, falling back to simulation:", e);
    }
  }
  if (!predictions) {
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
    predictions = simulateInference();
  }
  const safeName = clip.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80);

  // Persist for signed-in users; the public demo runs anonymously.
  const user = await getCurrentUser();
  if (user) {
    recordClassification({
      userId: user.id,
      filename: safeName,
      size: clip.size,
      mime: clip.type,
      predictions,
      source,
    });
    return NextResponse.json({ predictions, persisted: true, source }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ predictions, source }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
}
