import "server-only";
import type { ChangeStream, ChangeStreamDocument } from "mongodb";
import { toMatch } from "@/lib/data/dto";
import { collections } from "@/lib/db/mongo";
import type { MatchDoc } from "@/lib/db/types";
import type { LiveEvent } from "./events";

type Listener = (event: LiveEvent) => void;

const IDLE_CLOSE_MS = 30_000;
const RETRY_MS = 2_000;

/**
 * One MongoDB change stream per server instance, fanned out to every connected
 * viewer. Keeps database load constant no matter how many people are watching.
 */
class LiveHub {
  private listeners = new Set<Listener>();
  private stream: ChangeStream<MatchDoc> | null = null;
  private starting: Promise<void> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    clearTimeout(this.idleTimer);
    void this.ensureStream();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.idleTimer = setTimeout(() => void this.stop(), IDLE_CLOSE_MS);
      }
    };
  }

  private async ensureStream() {
    if (this.stream || this.starting) return;
    this.starting = (async () => {
      try {
        const { matches } = await collections();
        const stream = matches.watch([], { fullDocument: "updateLookup" });
        stream.on("change", (change) => this.handle(change));
        stream.on("error", (err) => {
          console.error("[live] change stream error", err);
          if (this.stream === stream) this.stream = null;
          stream.close().catch(() => {});
          if (this.listeners.size) setTimeout(() => void this.ensureStream(), RETRY_MS);
        });
        this.stream = stream;
      } catch (err) {
        console.error("[live] could not open change stream", err);
        if (this.listeners.size) setTimeout(() => void this.ensureStream(), RETRY_MS);
      }
    })().finally(() => {
      this.starting = null;
    });
    await this.starting;
  }

  private handle(change: ChangeStreamDocument<MatchDoc>) {
    switch (change.operationType) {
      case "insert":
      case "update":
      case "replace":
        if (change.fullDocument) this.emit({ type: "match", match: toMatch(change.fullDocument) });
        break;
      case "delete":
        this.emit({ type: "delete", id: change.documentKey._id.toHexString() });
        break;
    }
  }

  private emit(event: LiveEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[live] listener failed", err);
      }
    }
  }

  private async stop() {
    const stream = this.stream;
    this.stream = null;
    await stream?.close().catch(() => {});
  }
}

const globalForHub = globalThis as unknown as { liveHub?: LiveHub };
export const liveHub = (globalForHub.liveHub ??= new LiveHub());
