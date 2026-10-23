// Pure bracket generation: which matches exist and how winners/losers flow between them.

import type { BracketSide, BracketSize, BracketType } from "@/lib/db/types";

export interface PlanLink {
  key: string;
  slot: 1 | 2;
}

export interface PlannedMatch {
  key: string; // stable within a plan, e.g. "U1-2"
  bracket: BracketSide;
  round: number;
  position: number;
  seed1?: number; // first-round seeds (1-based)
  seed2?: number;
  next?: PlanLink;
  nextExtra?: PlanLink[]; // more winner destinations (round-robin final)
  loserNext?: PlanLink;
}

/** Which sizes each playoff format supports. */
export function isValidBracket(type: BracketType, size: number): size is BracketSize {
  if (type === "custom") return true; // the admin builds every stage, size is not used
  return type === "knockout_rr" ? [4, 6, 8].includes(size) : [4, 8, 16].includes(size);
}

/** Standard seeding order: [1, 8, 4, 5, 2, 7, 3, 6] for 8, so top seeds meet as late as possible. */
export function seedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    seeds = seeds.flatMap((s) => [s, n + 1 - s]);
  }
  return seeds;
}

const key = (side: string, round: number, position: number) => `${side}${round}-${position}`;

export function planBracket(type: BracketType, size: BracketSize): PlannedMatch[] {
  if (type === "knockout_rr") return planKnockoutRoundRobin(size);
  const upperRounds = Math.log2(size);
  const plan = new Map<string, PlannedMatch>();
  const add = (m: PlannedMatch) => plan.set(m.key, m);

  // Upper bracket (the whole bracket in single elimination)
  const order = seedOrder(size);
  for (let r = 1; r <= upperRounds; r++) {
    const count = size / 2 ** r;
    for (let p = 1; p <= count; p++) {
      add({
        key: key("U", r, p),
        bracket: "upper",
        round: r,
        position: p,
        ...(r === 1 ? { seed1: order[(p - 1) * 2], seed2: order[(p - 1) * 2 + 1] } : {}),
        ...(r < upperRounds ? { next: { key: key("U", r + 1, Math.ceil(p / 2)), slot: (p % 2 === 1 ? 1 : 2) as 1 | 2 } } : {}),
      });
    }
  }
  if (type === "single") return [...plan.values()];

  // Lower bracket: 2 * (upperRounds - 1) rounds.
  // Odd rounds pair up survivors; even rounds take drop-ins from the upper bracket.
  const lowerRounds = 2 * (upperRounds - 1);
  for (let lr = 1; lr <= lowerRounds; lr++) {
    // Round 1 and every even round have size/2^(k+1) matches where k = ceil(lr/2)
    const k = Math.ceil(lr / 2);
    const count = lr === 1 ? size / 4 : size / 2 ** (k + 1);
    for (let p = 1; p <= count; p++) {
      add({ key: key("L", lr, p), bracket: "lower", round: lr, position: p });
    }
  }
  add({ key: "F1-1", bracket: "final", round: 1, position: 1 });

  // Upper round 1 losers pair up in lower round 1
  for (let p = 1; p <= size / 2; p++) {
    plan.get(key("U", 1, p))!.loserNext = { key: key("L", 1, Math.ceil(p / 2)), slot: (p % 2 === 1 ? 1 : 2) as 1 | 2 };
  }
  // Losers of upper round r (r ≥ 2) drop into lower round 2(r-1), reversed to avoid early rematches
  for (let r = 2; r <= upperRounds; r++) {
    const count = size / 2 ** r;
    for (let p = 1; p <= count; p++) {
      plan.get(key("U", r, p))!.loserNext = { key: key("L", 2 * (r - 1), count + 1 - p), slot: 2 };
    }
  }
  // Lower bracket winners
  for (let lr = 1; lr <= lowerRounds; lr++) {
    const count = [...plan.values()].filter((m) => m.bracket === "lower" && m.round === lr).length;
    for (let p = 1; p <= count; p++) {
      const m = plan.get(key("L", lr, p))!;
      if (lr === lowerRounds) m.next = { key: "F1-1", slot: 2 };
      else if (lr % 2 === 1) m.next = { key: key("L", lr + 1, p), slot: 1 }; // into a drop-in round
      else m.next = { key: key("L", lr + 1, Math.ceil(p / 2)), slot: (p % 2 === 1 ? 1 : 2) as 1 | 2 };
    }
  }
  // Upper final winner meets the lower bracket winner (no bracket reset)
  plan.get(key("U", upperRounds, 1))!.next = { key: "F1-1", slot: 1 };

  return [...plan.values()];
}

/**
 * One knockout round (size/2 matches), then the winners play each other once.
 * Each first-round winner feeds several final matches: the first via `next`, the rest via `nextExtra`.
 */
function planKnockoutRoundRobin(size: number): PlannedMatch[] {
  const k = size / 2;
  const firstRound: PlannedMatch[] = Array.from({ length: k }, (_, i) => ({
    key: key("U", 1, i + 1),
    bracket: "upper",
    round: 1,
    position: i + 1,
  }));
  const finals: PlannedMatch[] = [];
  const links = firstRound.map(() => [] as PlanLink[]);
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const f = key("F", 1, finals.length + 1);
      finals.push({ key: f, bracket: "final", round: 1, position: finals.length + 1 });
      links[i].push({ key: f, slot: 1 });
      links[j].push({ key: f, slot: 2 });
    }
  }
  firstRound.forEach((m, i) => {
    m.next = links[i][0];
    if (links[i].length > 1) m.nextExtra = links[i].slice(1);
  });
  return [...firstRound, ...finals];
}

/**
 * Suggested first-round pairs from group standings (the admin can change them):
 * - 2 qualifiers per group and one match per group → each winner meets the next group's
 *   runner-up (A1–B2, B1–C2, C1–A2; with two groups A1–B2, B1–A2)
 * - power-of-two sizes → standard seeding (1–8, 4–5, …) from group winners, then runners-up
 * - otherwise → best remaining seed vs worst remaining seed
 */
export function suggestFirstRound(standingsByGroup: string[][], perGroup: number, size: number): [string, string][] {
  const matches = size / 2;
  const groups = standingsByGroup.length;
  if (perGroup === 2 && groups === matches && groups >= 2) {
    return standingsByGroup.map((g, i) => [g[0] ?? "", standingsByGroup[(i + 1) % groups][1] ?? ""]);
  }
  const seeds = seedsFromStandings(standingsByGroup, perGroup);
  const seed = (n: number) => seeds[n - 1] ?? "";
  if (Number.isInteger(Math.log2(size))) {
    const order = seedOrder(size);
    return Array.from({ length: matches }, (_, p) => [seed(order[p * 2]), seed(order[p * 2 + 1])]);
  }
  return Array.from({ length: matches }, (_, p) => [seed(p + 1), seed(size - p)]);
}

/**
 * Seeds from group standings: all group winners first (in group order), then all
 * runners-up, and so on. Combined with seedOrder this pits A1 vs B-last, B1 vs A-last…
 */
export function seedsFromStandings(standingsByGroup: string[][], perGroup: number): string[] {
  const seeds: string[] = [];
  for (let place = 0; place < perGroup; place++) {
    for (const group of standingsByGroup) {
      if (group[place]) seeds.push(group[place]);
    }
  }
  return seeds;
}
