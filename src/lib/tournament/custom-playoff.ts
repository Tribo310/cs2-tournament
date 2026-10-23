import type { Link, Match } from "@/lib/data/dto";
import type { PlayoffStage } from "@/lib/db/types";

// Pure helpers for the custom playoff builder. They work on DTOs (string ids)
// so the admin UI, the public view and the server actions share them.

/** Where a match slot gets its team: picked by hand, or the winner/loser of another match. */
export type SlotSource =
  | { kind: "empty" }
  | { kind: "team"; teamId: string }
  | { kind: "winner" | "loser"; matchId: string };

type Wired = Pick<Match, "id" | "next" | "nextExtra" | "loserNext" | "loserNextExtra">;

export const winnerLinksOf = (m: Wired): Link[] => [m.next, ...(m.nextExtra ?? [])].filter((l): l is Link => Boolean(l));
export const loserLinksOf = (m: Wired): Link[] =>
  [m.loserNext, ...(m.loserNextExtra ?? [])].filter((l): l is Link => Boolean(l));

const points = (links: Link[], matchId: string, slot: 1 | 2) => links.some((l) => l.matchId === matchId && l.slot === slot);

/** The source of one slot: a feeding match wins over whatever team sits there now. */
export function slotSource(all: Wired[], match: Pick<Match, "id" | "team1Id" | "team2Id">, slot: 1 | 2): SlotSource {
  for (const m of all) {
    if (points(winnerLinksOf(m), match.id, slot)) return { kind: "winner", matchId: m.id };
    if (points(loserLinksOf(m), match.id, slot)) return { kind: "loser", matchId: m.id };
  }
  const teamId = slot === 1 ? match.team1Id : match.team2Id;
  return teamId ? { kind: "team", teamId } : { kind: "empty" };
}

/** Form value for a source: "", "team:<id>", "win:<id>" or "lose:<id>". */
export function encodeSource(s: SlotSource): string {
  if (s.kind === "empty") return "";
  if (s.kind === "team") return `team:${s.teamId}`;
  return `${s.kind === "winner" ? "win" : "lose"}:${s.matchId}`;
}

export function decodeSource(value: string): SlotSource | null {
  if (!value) return { kind: "empty" };
  const [prefix, id] = value.split(":");
  if (!id || !/^[0-9a-f]{24}$/.test(id)) return null;
  if (prefix === "team") return { kind: "team", teamId: id };
  if (prefix === "win") return { kind: "winner", matchId: id };
  if (prefix === "lose") return { kind: "loser", matchId: id };
  return null;
}

/** True when `to` can be reached from `from` by following winner/loser links. */
export function feedsInto(all: Wired[], from: string, to: string): boolean {
  const byId = new Map(all.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const m = byId.get(id);
    if (m) for (const l of [...winnerLinksOf(m), ...loserLinksOf(m)]) stack.push(l.matchId);
  }
  return false;
}

export interface CustomLayout {
  stages: { stage: PlayoffStage; matches: Match[] }[];
  // Playoff matches without a (known) stage, e.g. left over from a preset bracket
  orphans: Match[];
  // Short public names: M1, M2… in stage order
  codes: Record<string, string>;
}

export function customLayout(stages: PlayoffStage[], playoff: Match[]): CustomLayout {
  const byPosition = (a: Match, b: Match) =>
    (a.position ?? 0) - (b.position ?? 0) || (a.round ?? 0) - (b.round ?? 0) || a.id.localeCompare(b.id);
  const known = new Set(stages.map((s) => s.key));
  const layout: CustomLayout = {
    stages: stages.map((stage) => ({
      stage,
      matches: playoff.filter((m) => m.stageKey === stage.key).sort(byPosition),
    })),
    orphans: playoff.filter((m) => !m.stageKey || !known.has(m.stageKey)).sort(byPosition),
    codes: {},
  };
  let n = 0;
  for (const m of [...layout.stages.flatMap((s) => s.matches), ...layout.orphans]) layout.codes[m.id] = `M${++n}`;
  return layout;
}

/** Placeholder for an unknown team: "M3 ялагч", "M5 ялагдагч". */
export function sourcePlaceholder(s: SlotSource, codes: Record<string, string>): string | undefined {
  if (s.kind === "winner") return `${codes[s.matchId] ?? "?"} ялагч`;
  if (s.kind === "loser") return `${codes[s.matchId] ?? "?"} ялагдагч`;
  return undefined;
}

/**
 * Round-robin pairings (circle method): every participant meets every other once,
 * ordered so each "round" has everyone playing at most once. Indexes are 0-based.
 */
export function roundRobinPairs(n: number): [number, number][] {
  const ids: (number | null)[] = Array.from({ length: n }, (_, i) => i);
  if (n % 2) ids.push(null);
  const pairs: [number, number][] = [];
  for (let r = 0; r < ids.length - 1; r++) {
    for (let i = 0; i < ids.length / 2; i++) {
      const a = ids[i];
      const b = ids[ids.length - 1 - i];
      if (a !== null && b !== null) pairs.push(a < b ? [a, b] : [b, a]);
    }
    ids.splice(1, 0, ids.pop()!); // rotate everyone but the first
  }
  return pairs;
}
