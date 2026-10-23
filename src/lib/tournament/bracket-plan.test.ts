import { describe, expect, it } from "vitest";
import type { BracketSize } from "@/lib/db/types";
import {
  isValidBracket,
  planBracket,
  seedOrder,
  seedsFromStandings,
  suggestFirstRound,
  type PlannedMatch,
} from "./bracket-plan";

/** Each match must receive exactly two entrants: seeds and/or incoming links. */
function inputsPerMatch(plan: PlannedMatch[]) {
  const inputs = new Map(plan.map((m) => [m.key, [] as string[]]));
  for (const m of plan) {
    if (m.seed1) inputs.get(m.key)!.push(`seed${m.seed1}`);
    if (m.seed2) inputs.get(m.key)!.push(`seed${m.seed2}`);
    if (m.next) inputs.get(m.next.key)!.push(`W:${m.key}@${m.next.slot}`);
    for (const extra of m.nextExtra ?? []) inputs.get(extra.key)!.push(`W:${m.key}@${extra.slot}`);
    if (m.loserNext) inputs.get(m.loserNext.key)!.push(`L:${m.key}@${m.loserNext.slot}`);
  }
  return inputs;
}

function slotsAreDistinct(plan: PlannedMatch[]) {
  const used = new Set<string>();
  for (const m of plan) {
    for (const link of [m.next, ...(m.nextExtra ?? []), m.loserNext]) {
      if (!link) continue;
      const id = `${link.key}@${link.slot}`;
      if (used.has(id)) return false;
      used.add(id);
    }
  }
  return true;
}

describe("seedOrder", () => {
  it("pairs top seeds against bottom seeds", () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(seedOrder(16)).toHaveLength(16);
    expect(new Set(seedOrder(16)).size).toBe(16);
  });
});

describe.each([4, 8, 16] as BracketSize[])("single elimination, %i teams", (size) => {
  const plan = planBracket("single", size);

  it("has size-1 matches ending in one final", () => {
    expect(plan).toHaveLength(size - 1);
    expect(plan.filter((m) => !m.next)).toHaveLength(1);
    expect(plan.every((m) => m.bracket === "upper" && !m.loserNext)).toBe(true);
  });

  it("feeds every match exactly two entrants into distinct slots", () => {
    for (const [, inputs] of inputsPerMatch(plan)) expect(inputs).toHaveLength(2);
    expect(slotsAreDistinct(plan)).toBe(true);
  });
});

describe.each([4, 8, 16] as BracketSize[])("double elimination, %i teams", (size) => {
  const plan = planBracket("double", size);
  const upper = plan.filter((m) => m.bracket === "upper");
  const lower = plan.filter((m) => m.bracket === "lower");

  it("has 2*size-2 matches (no bracket reset)", () => {
    expect(upper).toHaveLength(size - 1);
    expect(lower).toHaveLength(size - 2);
    expect(plan.filter((m) => m.bracket === "final")).toHaveLength(1);
    expect(plan).toHaveLength(2 * size - 2);
  });

  it("feeds every match exactly two entrants into distinct slots", () => {
    for (const [, inputs] of inputsPerMatch(plan)) expect(inputs).toHaveLength(2);
    expect(slotsAreDistinct(plan)).toBe(true);
  });

  it("sends every upper-bracket loser to the lower bracket; lower losers are eliminated", () => {
    expect(upper.every((m) => m.loserNext && m.loserNext.key.startsWith("L"))).toBe(true);
    expect(lower.every((m) => !m.loserNext)).toBe(true);
  });

  it("ends with the upper and lower winners meeting in the grand final", () => {
    const toFinal = plan.filter((m) => m.next?.key === "F1-1");
    expect(toFinal.map((m) => m.bracket).sort()).toEqual(["lower", "upper"]);
  });
});

describe("seedsFromStandings", () => {
  it("orders all group winners, then runners-up", () => {
    expect(seedsFromStandings([["A1", "A2", "A3"], ["B1", "B2", "B3"]], 2)).toEqual(["A1", "B1", "A2", "B2"]);
  });

  it("4-team playoff from 2 groups: each group winner meets the other group's runner-up", () => {
    const seeds = seedsFromStandings([["A1", "A2", "A3", "A4"], ["B1", "B2", "B3", "B4"]], 2);
    const order = seedOrder(4);
    const pairs = [0, 2].map((i) => [seeds[order[i] - 1], seeds[order[i + 1] - 1]]);
    expect(pairs).toEqual([
      ["A1", "B2"],
      ["B1", "A2"],
    ]);
  });

  it("puts teams from the same group in opposite first-round matches", () => {
    const seeds = seedsFromStandings([["A1", "A2", "A3", "A4"], ["B1", "B2", "B3", "B4"]], 4);
    const order = seedOrder(8);
    for (let i = 0; i < 8; i += 2) {
      const a = seeds[order[i] - 1];
      const b = seeds[order[i + 1] - 1];
      expect(a[0]).not.toBe(b[0]);
    }
  });
});

describe.each([4, 6, 8] as BracketSize[])("knockout + round-robin final, %i teams", (size) => {
  const plan = planBracket("knockout_rr", size);
  const first = plan.filter((m) => m.bracket === "upper");
  const finals = plan.filter((m) => m.bracket === "final");
  const k = size / 2;

  it("has one knockout round and every pairing of the winners", () => {
    expect(first).toHaveLength(k);
    expect(first.every((m) => m.round === 1)).toBe(true);
    expect(finals).toHaveLength((k * (k - 1)) / 2);
  });

  it("feeds every final match exactly two different winners into distinct slots", () => {
    const inputs = inputsPerMatch(plan);
    for (const f of finals) {
      const fed = inputs.get(f.key)!;
      expect(fed).toHaveLength(2);
      expect(new Set(fed.map((x) => x.split("@")[0])).size).toBe(2);
    }
    expect(slotsAreDistinct(plan)).toBe(true);
  });

  it("sends each first-round winner to k-1 final matches and nobody down", () => {
    for (const m of first) {
      expect(1 + (m.nextExtra?.length ?? 0)).toBe(k - 1);
      expect(m.loserNext).toBeUndefined();
    }
  });
});

describe("isValidBracket", () => {
  it("accepts the supported combinations only", () => {
    expect(isValidBracket("knockout_rr", 6)).toBe(true);
    expect(isValidBracket("knockout_rr", 16)).toBe(false);
    expect(isValidBracket("single", 6)).toBe(false);
    expect(isValidBracket("double", 8)).toBe(true);
  });
});

describe("suggestFirstRound", () => {
  const groups3 = [["A1", "A2", "A3"], ["B1", "B2", "B3"], ["C1", "C2", "C3"]];

  it("3 groups × 2 qualifiers: each winner meets the next group's runner-up", () => {
    expect(suggestFirstRound(groups3, 2, 6)).toEqual([
      ["A1", "B2"],
      ["B1", "C2"],
      ["C1", "A2"],
    ]);
  });

  it("2 groups × 2 qualifiers into 4: A1–B2, B1–A2", () => {
    expect(suggestFirstRound([["A1", "A2"], ["B1", "B2"]], 2, 4)).toEqual([
      ["A1", "B2"],
      ["B1", "A2"],
    ]);
  });

  it("falls back to standard seeding for 8", () => {
    const pairs = suggestFirstRound([["A1", "A2", "A3", "A4"], ["B1", "B2", "B3", "B4"]], 4, 8);
    expect(pairs[0]).toEqual(["A1", "B4"]);
  });

  it("leaves slots empty when standings are short", () => {
    expect(suggestFirstRound([["A1"], ["B1"], ["C1"]], 2, 6)).toEqual([
      ["A1", ""],
      ["B1", ""],
      ["C1", ""],
    ]);
  });
});
