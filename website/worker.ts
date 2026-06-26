import { Worker, Job } from "bullmq";
import { redisConnection } from "./lib/queue";
import { s3Client, S3_BUCKET } from "./lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { updateClassification } from "./lib/classifications";
import { ACTIONS } from "./lib/data";

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || "http://localhost:8000";
const SLUG_TO_NAME = new Map(ACTIONS.map((a) => [a.slug, a.name]));

function titleCase(slug: string) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function classifyWithModel(clipFile: File): Promise<{ action: string; confidence: number }[]> {
  const base = MODEL_SERVER_URL.replace(/\/$/, "");
  const fd = new FormData();
  fd.append("clip", clipFile, clipFile.name);
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

const worker = new Worker(
  "classification-jobs",
  async (job: Job) => {
    const { classificationId, key, filename, mime, isGuest } = job.data;
    console.log(`[Worker] Processing job ${job.id} for ${filename}`);

    try {
      // 1. Download from MinIO
      const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
      const response = await s3Client.send(command);
      if (!response.Body) throw new Error("No body in S3 response");
      
      const arrayBuffer = await response.Body.transformToByteArray();
      const clipFile = new File([arrayBuffer as any], filename, { type: mime });

      // 2. Predict
      const predictions = await classifyWithModel(clipFile);
      
      // 3. Update SQLite DB
      if (!isGuest) {
        updateClassification(classificationId, {
          predictions,
          source: "model",
          status: "complete",
        });
      }
      
      console.log(`[Worker] Completed job ${job.id}`);
      return predictions;
    } catch (error) {
      console.error(`[Worker] Job ${job.id} failed:`, error);
      if (!isGuest) {
        updateClassification(classificationId, {
          predictions: [],
          source: "error",
          status: "error",
        });
      }
      throw error;
    }
  },
  { connection: redisConnection as any }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
