import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  } else {
    console.warn("⚠️ Missing Upstash Redis credentials. Rate limiting will throw errors if accessed.");
  }
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://dummy-url.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "dummy-token",
});
