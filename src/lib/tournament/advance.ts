import type { ObjectId } from "mongodb";
import type { BracketLink, MatchDoc } from "@/lib/db/types";
import { loserId } from "./match";

export interface SlotChange {
  link: BracketLink;
  from?: ObjectId; // team that was sent before this change
  to?: ObjectId; // team that should be in the slot now (undefined = clear it)
}

type Source = Pick<MatchDoc, "stage" | "team1Id" | "team2Id" | "winnerId" | "next" | "loserNext">;

const same = (a?: ObjectId, b?: ObjectId) => (a && b ? a.equals(b) : a === b);

/**
 * Which bracket slots must change when a playoff match goes from `prev` to `next`:
 * the winner moves along `next`, the loser along `loserNext` (double elimination).
 */
export function slotChanges(prev: Source, next: Source): SlotChange[] {
  if (next.stage !== "playoff") return [];
  const changes: SlotChange[] = [];
  const pairs: [BracketLink | undefined, ObjectId | undefined, ObjectId | undefined][] = [
    [next.next, prev.winnerId, next.winnerId],
    [next.loserNext, loserId(prev), loserId(next)],
  ];
  for (const [link, from, to] of pairs) {
    if (link && !same(from, to)) changes.push({ link, from, to });
  }
  return changes;
}

/**
 * The value the target slot should take, or null when it must be left alone:
 * clearing only removes the team this match put there, so manual fixes survive.
 */
export function resolveSlot(current: ObjectId | undefined, change: SlotChange): { value: ObjectId | undefined } | null {
  if (change.to) return same(current, change.to) ? null : { value: change.to };
  return change.from && same(current, change.from) ? { value: undefined } : null;
}
