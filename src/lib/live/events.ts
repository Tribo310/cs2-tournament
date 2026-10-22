import type { Match } from "@/lib/data/dto";

// Messages sent over /api/live (Server-Sent Events). Shared by server and browser.

export type LiveEvent = { type: "match"; match: Match } | { type: "delete"; id: string };

export function encodeEvent(event: LiveEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** JSON turns Dates into strings; restore them so live data matches server-rendered props. */
export function decodeEvent(data: string): LiveEvent | null {
  try {
    const event = JSON.parse(data) as LiveEvent;
    if (event.type === "match") {
      const m = event.match as Match & { scheduledAt?: string | Date; updatedAt: string | Date };
      event.match = {
        ...m,
        scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : undefined,
        updatedAt: new Date(m.updatedAt),
      };
    }
    return event;
  } catch {
    return null;
  }
}
