import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  windowStart: number;
};

const store = new Map<string, Bucket>();

const PRUNE_EVERY = 200;
let pruneCounter = 0;

function pruneExpired(windowMs: number) {
  const now = Date.now();
  const maxAge = windowMs * 2;
  for (const [key, bucket] of store) {
    if (now - bucket.windowStart > maxAge) {
      store.delete(key);
    }
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window limiter (in-memory). On serverless, limits apply per instance—still useful against abuse.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  pruneCounter += 1;
  if (pruneCounter % PRUNE_EVERY === 0) {
    pruneExpired(windowMs);
  }

  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
  }

  if (bucket.count >= limit) {
    const retryAfterMs = bucket.windowStart + windowMs - now;
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return { allowed: false, retryAfterSec };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return { allowed: true };
}

export function authRateLimitConfig() {
  const max = Number(process.env.RATE_LIMIT_AUTH_MAX ?? 30);
  const windowMs = Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? 900_000);
  return {
    max: Number.isFinite(max) && max > 0 ? max : 30,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 900_000,
  };
}

export function rateLimitedResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfterSec)),
      },
    },
  );
}
