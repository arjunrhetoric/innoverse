import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { bus, getRedis, usesRedisBus } from "@/lib/bus";

export const dynamic = "force-dynamic";

// Serverless functions cap stream length (60s on Hobby). The client
// auto-reconnects via EventSource, so delivery resumes transparently.
export const maxDuration = 60;

/**
 * Live updates over Server-Sent Events.
 * Client opens `/api/events?channel=pr:o/r/1` and receives JSON messages
 * published by the PR / milestone / certificate routes.
 *
 * Transport: Redis pub/sub when REDIS_URL (or KV_URL) is set so events
 * cross serverless instances on Vercel; otherwise the in-process bus.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const channel = req.nextUrl.searchParams.get("channel");
  if (!channel) {
    return NextResponse.json({ message: "channel is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let onLocalEvent: ((event: unknown) => void) | undefined;
  let subscriber: { disconnect: () => void } | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client went away; cleanup happens on abort.
        }
      };

      controller.enqueue(encoder.encode(`: connected to ${channel}\n\n`));

      if (usesRedisBus()) {
        try {
          const redis = getRedis();
          if (!redis) throw new Error("Redis unavailable");
          subscriber = redis.duplicate();
          await (subscriber as import("ioredis").Redis).subscribe(channel);
          (subscriber as import("ioredis").Redis).on("message", (_ch, message) => {
            try {
              send(JSON.parse(message));
            } catch {
              // Ignore malformed frames.
            }
          });
        } catch (err) {
          console.error("Redis subscribe failed, falling back to local bus:", err);
          subscriber = null;
          onLocalEvent = send;
          bus.on(channel, onLocalEvent);
        }
      } else {
        onLocalEvent = send;
        bus.on(channel, onLocalEvent);
      }

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          // Stream closed; abort handler cleans up.
        }
      }, 15000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (onLocalEvent) bus.off(channel, onLocalEvent);
      try {
        subscriber?.disconnect();
      } catch {
        // Already gone.
      }
    },
  });

  req.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (onLocalEvent) bus.off(channel, onLocalEvent);
    try {
      subscriber?.disconnect();
    } catch {
      // Already gone.
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
