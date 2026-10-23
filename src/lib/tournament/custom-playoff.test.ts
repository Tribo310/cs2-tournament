import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/data/dto";
import {
  customLayout,
  decodeSource,
  encodeSource,
  feedsInto,
  roundRobinPairs,
  slotSource,
  sourcePlaceholder,
} from "./custom-playoff";

const id = (n: number) => n.toString(16).padStart(24, "0");
const match = (n: number, extra: Partial<Match> = {}) => ({ id: id(n), ...extra }) as Match;

describe("slotSource", () => {
  const semi = match(1, { next: { matchId: id(3), slot: 1 }, loserNext: { matchId: id(4), slot: 2 } });
  const semi2 = match(2, { next: { matchId: id(3), slot: 2 } });
  const final = match(3, { team1Id: id(99) });
  const third = match(4, { team1Id: id(98) });
  const all = [semi, semi2, final, third];

  it("prefers the feeding match over the team in the slot", () => {
    expect(slotSource(all, final, 1)).toEqual({ kind: "winner", matchId: id(1) });
    expect(slotSource(all, final, 2)).toEqual({ kind: "winner", matchId: id(2) });
    expect(slotSource(all, third, 2)).toEqual({ kind: "loser", matchId: id(1) });
  });

  it("falls back to the team picked by hand, or empty", () => {
    expect(slotSource(all, third, 1)).toEqual({ kind: "team", teamId: id(98) });
    expect(slotSource(all, semi, 1)).toEqual({ kind: "empty" });
  });

  it("finds extra destinations too", () => {
    const rr = match(5, { next: { matchId: id(6), slot: 1 }, nextExtra: [{ matchId: id(7), slot: 2 }] });
    expect(slotSource([rr], match(7), 2)).toEqual({ kind: "winner", matchId: id(5) });
  });
});

describe("encode / decode source", () => {
  it("round-trips every kind", () => {
    for (const s of [
      { kind: "empty" },
      { kind: "team", teamId: id(1) },
      { kind: "winner", matchId: id(2) },
      { kind: "loser", matchId: id(3) },
    ] as const) {
      expect(decodeSource(encodeSource(s))).toEqual(s);
    }
  });

  it("rejects garbage", () => {
    expect(decodeSource("win:nope")).toBeNull();
    expect(decodeSource(`other:${id(1)}`)).toBeNull();
  });
});

describe("feedsInto", () => {
  const all = [match(1, { next: { matchId: id(2), slot: 1 } }), match(2, { loserNext: { matchId: id(3), slot: 1 } }), match(3)];
  it("follows winner and loser links", () => {
    expect(feedsInto(all, id(1), id(3))).toBe(true);
    expect(feedsInto(all, id(3), id(1))).toBe(false);
  });
});

describe("customLayout", () => {
  const stages = [
    { key: "a", name: "Шигшээ", kind: "knockout" as const },
    { key: "b", name: "Финал", kind: "knockout" as const },
  ];
  it("groups by stage, sorts by position and numbers M1, M2… in stage order", () => {
    const layout = customLayout(stages, [
      match(1, { stageKey: "b", position: 1 }),
      match(2, { stageKey: "a", position: 2 }),
      match(3, { stageKey: "a", position: 1 }),
      match(4, { bracket: "upper", round: 1, position: 1 }),
    ]);
    expect(layout.stages.map((s) => s.matches.map((m) => m.id))).toEqual([[id(3), id(2)], [id(1)]]);
    expect(layout.orphans.map((m) => m.id)).toEqual([id(4)]);
    expect(layout.codes).toEqual({ [id(3)]: "M1", [id(2)]: "M2", [id(1)]: "M3", [id(4)]: "M4" });
    expect(sourcePlaceholder({ kind: "loser", matchId: id(2) }, layout.codes)).toBe("M2 ялагдагч");
  });
});

describe("roundRobinPairs", () => {
  it.each([2, 3, 4, 5, 6])("pairs every participant once for %i teams", (n) => {
    const pairs = roundRobinPairs(n);
    expect(pairs).toHaveLength((n * (n - 1)) / 2);
    expect(new Set(pairs.map((p) => p.join("-"))).size).toBe(pairs.length);
  });
});
