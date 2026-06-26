import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const db = getDb();
  
  const { id } = await params;
  
  let row;
  if (user) {
    row = db.prepare("SELECT predicted, confidence, status, probabilities FROM classifications WHERE id = ? AND user_id = ?").get(id, user.id);
  } else {
    // For guests, we don't enforce user_id, but the id is random
    row = db.prepare("SELECT predicted, confidence, status, probabilities FROM classifications WHERE id = ?").get(id);
  }

  if (!row) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const result = row as { predicted: string, confidence: number, status: string, probabilities: string };

  if (result.status !== "complete" && result.status !== "error") {
    return NextResponse.json({ status: result.status }, { status: 200 });
  }

  let predictions = [];
  try {
    predictions = JSON.parse(result.probabilities);
  } catch {}

  return NextResponse.json({
    status: result.status,
    predictions,
  }, { status: 200 });
}
