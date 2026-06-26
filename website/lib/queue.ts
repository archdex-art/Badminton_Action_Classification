import { Queue } from "bullmq";
import Redis from "ioredis";

export const redisConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const classificationQueue = new Queue("classification-jobs", {
  connection: redisConnection as any,
});
