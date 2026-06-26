import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { s3Client, S3_BUCKET } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const user = await getCurrentUser();
  const rateLimitKey = user ? `ratelimit:presign:${user.id}` : `ratelimit:presign:${ip}`;
  const rateLimit = await checkRateLimit(rateLimitKey, 30, 60 * 1000); // 30 req / 1 minute

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { filename, contentType } = body;
  if (!filename || !contentType) {
    return NextResponse.json({ error: "Missing filename or contentType." }, { status: 400 });
  }

  // Randomize storage name and sanitize
  const safeName = `${crypto.randomUUID()}-${filename.replace(/[^\w.\- ]+/g, "_").slice(0, 80)}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: safeName,
    ContentType: contentType,
  });

  try {
    // URL expires in 5 minutes
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    return NextResponse.json({ url, key: safeName });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate upload URL." }, { status: 500 });
  }
}
