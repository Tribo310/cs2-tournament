"use client";

import { cn } from "@/lib/utils";
import { useLiveStatus } from "./live-provider";

/** Small header indicator: green when scores update in real time. */
export function LiveStatus() {
  const status = useLiveStatus();
  const label = status === "open" ? "Шууд шинэчлэгдэж байна" : status === "connecting" ? "Холбогдож байна" : "Шууд шинэчлэлт унтарсан";
  return (
    <span title={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "open" ? "bg-win" : status === "connecting" ? "bg-side-t animate-live" : "bg-muted-foreground/50",
        )}
      />
      <span className="sr-only md:not-sr-only">{status === "open" ? "Шууд" : label}</span>
    </span>
  );
}
