import "server-only";
import { getDb } from "./db";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Validates a rate limit using a Token Bucket algorithm backed by SQLite.
 *
 * @param key Unique identifier (e.g., 'login:192.168.1.1')
 * @param maxTokens Maximum number of requests in the window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(key: string, maxTokens: number, windowMs: number): RateLimitResult {
  const db = getDb();
  const now = Date.now();

  let row = db
    .prepare("SELECT tokens, last_refill FROM rate_limits WHERE key = ?")
    .get(key) as { tokens: number; last_refill: number } | undefined;

    if (!row) {
      db.prepare("INSERT INTO rate_limits (key, tokens, last_refill) VALUES (?, ?, ?)").run(
        key,
        maxTokens - 1,
        now
      );
      return { success: true, limit: maxTokens, remaining: maxTokens - 1, reset: now + windowMs };
    }

    // Refill tokens based on time elapsed
    const timePassed = now - row.last_refill;
    const refillAmount = Math.floor((timePassed / windowMs) * maxTokens);

    let newTokens = Math.min(maxTokens, row.tokens + refillAmount);
    let newRefill = row.last_refill;

    if (refillAmount > 0) {
      newRefill = now;
    }

    let success = false;
    if (newTokens > 0) {
      success = true;
      newTokens -= 1;
    }

    db.prepare("UPDATE rate_limits SET tokens = ?, last_refill = ? WHERE key = ?").run(
      newTokens,
      newRefill,
      key
    );

    return {
      success,
      limit: maxTokens,
      remaining: newTokens,
      reset: newRefill + windowMs,
    };
}

// Optionally, clean up expired entries periodically
export function cleanupRateLimits() {
  const db = getDb();
  // An entry is fully refilled (and safe to delete) if now - last_refill > largest_window
  // We'll use 1 hour (3600000ms) as a safe threshold since that's our largest window.
  db.prepare("DELETE FROM rate_limits WHERE ? - last_refill > 3600000").run(Date.now());
}
