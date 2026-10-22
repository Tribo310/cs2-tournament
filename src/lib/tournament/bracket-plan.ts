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
  loserNext?: PlanLink;
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
