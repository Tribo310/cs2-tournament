import { connection } from "next/server";
import { encodeEvent } from "@/lib/live/events";
import { liveHub } from "@/lib/live/hub";

// Close before the platform's function limit; EventSource reconnects on its own.
export const maxDuration = 300;
const STREAM_LIFETIME_MS = 270_000;
const HEARTBEAT_MS = 20_000;

export async function GET(request: Request) {
  await connection();
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };

      // Reconnect after 3 s if the connection drops
      send("retry: 3000\n\n");
      const unsubscribe = liveHub.subscribe((event) => send(encodeEvent(event)));
      // Comments keep proxies from closing an idle connection
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      const lifetime = setTimeout(() => cleanup(), STREAM_LIFETIME_MS);

      let closed = false;
      cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      };
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
