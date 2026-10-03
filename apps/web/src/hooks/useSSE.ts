"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subscribe to a live-update channel. The browser's EventSource
 * reconnects automatically; we only mark connection state.
 */
export function useSSE(channel: string | null, onEvent: (event: any) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!channel) return;

    const eventSource = new EventSource(
      `/api/events?channel=${encodeURIComponent(channel)}`
    );

    eventSource.onopen = () => setIsConnected(true);
    // Do NOT close on error — EventSource retries on its own.
    eventSource.onerror = () => setIsConnected(false);
    eventSource.onmessage = (ev) => {
      try {
        callbackRef.current(JSON.parse(ev.data));
      } catch {
        // Ignore heartbeats and malformed frames.
      }
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [channel]);

  return { isConnected };
}
