"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { Match } from "@/lib/data/dto";
import { decodeEvent } from "@/lib/live/events";

type Status = "connecting" | "open" | "offline";

const LiveContext = createContext<{ overrides: Record<string, Match>; status: Status }>({
  overrides: {},
  status: "offline",
});

// Derived views (standings, bracket paths) refresh from the server shortly after a change
const REFRESH_DELAY_MS = 1500;

export function LiveProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, Match>>({});
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    let source: EventSource | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let connectedBefore = false;

    const scheduleRefresh = (delay = REFRESH_DELAY_MS) => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), delay);
    };

    const connect = () => {
      source = new EventSource("/api/live");
      source.onopen = () => {
        setStatus("open");
        // After a reconnect, catch up on anything missed while offline
        if (connectedBefore) scheduleRefresh(0);
        connectedBefore = true;
      };
      source.onerror = () => setStatus(source?.readyState === EventSource.CLOSED ? "offline" : "connecting");
      source.onmessage = (message) => {
        const event = decodeEvent(message.data);
        if (!event) return;
        if (event.type === "match") {
          const incoming = event.match;
          setOverrides((current) => {
            const known = current[incoming.id];
            return known && known.updatedAt >= incoming.updatedAt ? current : { ...current, [incoming.id]: incoming };
          });
        }
        scheduleRefresh();
      };
    };

    const disconnect = () => {
      source?.close();
      source = null;
    };

    // Save battery on phones: drop the connection while the tab is hidden
    const onVisibility = () => {
      if (document.hidden) {
        disconnect();
        setStatus("offline");
      } else if (!source) {
        connect();
      }
    };

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disconnect();
      clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return <LiveContext value={{ overrides, status }}>{children}</LiveContext>;
}

/** The newest known version of a match: a live update if it's newer than the server render. */
export function useLiveMatch(match: Match): Match {
  const { overrides } = use(LiveContext);
  const live = overrides[match.id];
  return live && live.updatedAt > match.updatedAt ? live : match;
}

export function useLiveStatus(): Status {
  return use(LiveContext).status;
}
