import { NextResponse } from "next/server";
import { ACTIONS } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-server";
import { recordClassification, type Prediction } from "@/lib/classifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { fileTypeFromBuffer } from "file-type";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Configuration ---------------------------------------------------------
const ACCEPTED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

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
  const ip = clientIp(req);
  const user = await getCurrentUser();
  const rateLimitKey = user ? `ratelimit:classify:${user.id}` : `ratelimit:classify:${ip}`;
  const rateLimit = await checkRateLimit(rateLimitKey, 30, 60 * 1000); // 30 req / 1 minute

  if (!rateLimit.success) {
    console.warn(`[SECURITY] Rate limit exceeded on classify for ${rateLimitKey}`);
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { 
        status: 429, 
        headers: { 
          "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.reset.toString(),
        } 
      }
    );
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
  
  if (clip.size === 0 || clip.size > MAX_BYTES) {
    return NextResponse.json({ error: "File size out of bounds." }, { status: 413 });
  }

  // Read magic bytes using file-type
  const buffer = await clip.arrayBuffer();
  const fileType = await fileTypeFromBuffer(buffer);
  
  if (!fileType || !ACCEPTED_TYPES.has(fileType.mime)) {
    console.warn(`[SECURITY] MIME spoofing or invalid file type detected from IP: ${ip}. FileType: ${fileType?.mime}`);
    return NextResponse.json({ error: "Unsupported media type." }, { status: 415 });
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
  
  // Randomize storage name and sanitize
  const safeName = `${crypto.randomUUID()}-${clip.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80)}`;

  // Persist for signed-in users; the public demo runs anonymously.
  if (user) {
    recordClassification({
      userId: user.id,
      filename: safeName,
      size: clip.size,
      mime: fileType.mime, // Use verified MIME
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
