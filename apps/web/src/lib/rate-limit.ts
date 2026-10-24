import { NextResponse } from "next/server";
import { getRedis } from "./bus";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetSeconds: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window rate limiter.
 * Uses Redis when configured (production), falls back to per-process memory
 * for local development. Key by user id or IP — never by raw email.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;

  try {
    const redis = getRedis();
    if (redis) {
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }
      const ttl = await redis.ttl(redisKey);
      return {
        ok: count <= limit,
        remaining: Math.max(0, limit - count),
        resetSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    }
  } catch (err) {
    console.error("Rate limiter backend failed, allowing request:", err);
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, resetSeconds: windowSeconds };
  }
  entry.count += 1;
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { message: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.resetSeconds),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/** Best-effort client identity for unauthenticated endpoints. */
export function clientKey(req: Request, prefix: string) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `${prefix}:${ip}`;
}
