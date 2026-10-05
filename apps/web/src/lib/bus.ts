import { EventEmitter } from "events";
import { Redis } from "ioredis";

const g = globalThis as unknown as {
  __innoverseBus?: EventEmitter;
  __innoverseRedis?: Redis | null;
  __innoverseRedisTried?: boolean;
};

if (!g.__innoverseBus) {
  g.__innoverseBus = new EventEmitter();
  g.__innoverseBus.setMaxListeners(200);
}

/** Same-instance delivery (local dev, and fast path in production). */
export const bus: EventEmitter = g.__innoverseBus;

/** Lazily-connected Redis client for cross-instance delivery (Vercel). Null locally. */
export function getRedis(): Redis | null {
  if (g.__innoverseRedisTried) return g.__innoverseRedis ?? null;
  g.__innoverseRedisTried = true;
  const url = process.env.REDIS_URL || process.env.KV_URL;
  if (!url) {
    g.__innoverseRedis = null;
    return null;
  }
  try {
    g.__innoverseRedis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
  } catch (err) {
    console.error("Redis client init failed, using local bus:", err);
    g.__innoverseRedis = null;
  }
  return g.__innoverseRedis ?? null;
}

export function usesRedisBus(): boolean {
  return Boolean(process.env.REDIS_URL || process.env.KV_URL);
}

/**
 * Publish to local subscribers AND Redis (when configured).
 * Synchronous signature; Redis errors are logged, never thrown —
 * live updates are best-effort, never fatal to the request.
 */
export function publish(channel: string, event: Record<string, unknown>) {
  bus.emit(channel, event);
  const redis = getRedis();
  if (redis) {
    redis
      .publish(channel, JSON.stringify(event))
      .catch((err) => console.error("Redis publish failed:", err));
  }
}
