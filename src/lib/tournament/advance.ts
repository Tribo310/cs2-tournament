import type { ObjectId } from "mongodb";
import type { BracketLink, MatchDoc } from "@/lib/db/types";
import { loserId } from "./match";

export interface SlotChange {
  link: BracketLink;
  from?: ObjectId; // team that was sent before this change
  to?: ObjectId; // team that should be in the slot now (undefined = clear it)
}

type Source = Pick<
  MatchDoc,
  "stage" | "team1Id" | "team2Id" | "winnerId" | "next" | "nextExtra" | "loserNext" | "loserNextExtra"
>;

const same = (a?: ObjectId, b?: ObjectId) => (a && b ? a.equals(b) : a === b);
const sameLink = (a: BracketLink, b: BracketLink) => a.matchId.equals(b.matchId) && a.slot === b.slot;

export const winnerLinks = (m: Pick<MatchDoc, "next" | "nextExtra">): BracketLink[] =>
  [m.next, ...(m.nextExtra ?? [])].filter((l): l is BracketLink => Boolean(l));
export const loserLinks = (m: Pick<MatchDoc, "loserNext" | "loserNextExtra">): BracketLink[] =>
  [m.loserNext, ...(m.loserNextExtra ?? [])].filter((l): l is BracketLink => Boolean(l));

/**
 * Which bracket slots must change when a playoff match goes from `prev` to `next`:
 * the winner moves along `next` (and `nextExtra`), the loser along `loserNext` (and
 * `loserNextExtra`). Rewiring counts too: a dropped link clears what this match sent
 * there, a new link receives the current winner/loser.
 */
export function slotChanges(prev: Source, next: Source): SlotChange[] {
  if (next.stage !== "playoff") return [];
  return [
    ...diff(winnerLinks(prev), prev.winnerId, winnerLinks(next), next.winnerId),
    ...diff(loserLinks(prev), loserId(prev), loserLinks(next), loserId(next)),
  ];
}

function diff(prevLinks: BracketLink[], prevTeam: ObjectId | undefined, nextLinks: BracketLink[], nextTeam: ObjectId | undefined) {
  const changes: SlotChange[] = [];
  const all = [...nextLinks, ...prevLinks.filter((p) => !nextLinks.some((n) => sameLink(p, n)))];
  for (const link of all) {
    const from = prevLinks.some((p) => sameLink(p, link)) ? prevTeam : undefined;
    const to = nextLinks.some((n) => sameLink(n, link)) ? nextTeam : undefined;
    if (!same(from, to)) changes.push({ link, from, to });
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
