import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { bus } from "@/lib/bus";

export const dynamic = "force-dynamic";

/**
 * Live updates over Server-Sent Events.
 * Client opens `/api/events?channel=pr:o/r/1` and receives JSON messages
 * published by the PR / milestone / certificate routes.
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
  let onEvent: ((event: unknown) => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`: connected to ${channel}\n\n`));

      onEvent = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client went away; cleanup happens on abort.
        }
      };
      bus.on(channel, onEvent);

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
      if (onEvent) bus.off(channel, onEvent);
    },
  });

  req.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (onEvent) bus.off(channel, onEvent);
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
