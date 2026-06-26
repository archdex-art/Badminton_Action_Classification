import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "minioadmin",
  },
  forcePathStyle: true, // Required for MinIO
});

export const S3_BUCKET = process.env.S3_BUCKET || "badminton-videos";
