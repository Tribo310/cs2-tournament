import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import type { MatchMap } from "@/lib/db/types";
import { deriveMatchResult, isMapDecided, loserId } from "./match";

const A = new ObjectId();
const B = new ObjectId();

function map(order: number, t1: number, t2: number, status: MatchMap["status"] = "finished"): MatchMap {
  return { order, mapName: "Mirage", team1Rounds: t1, team2Rounds: t2, status };
}

describe("isMapDecided", () => {
  it.each([
    [13, 11, true],
    [13, 5, true],
    [13, 12, false],
    [12, 12, false],
    [16, 14, true],
    [16, 12, true],
    [15, 15, false],
    [16, 15, false],
    [19, 17, true],
    [19, 15, true],
  ])("%i-%i → %s", (a, b, expected) => {
    expect(isMapDecided(a, b)).toBe(expected);
    expect(isMapDecided(b, a)).toBe(expected);
  });
});

describe("deriveMatchResult", () => {
  const base = { team1Id: A, team2Id: B, winnerId: undefined, winnerManual: false };

  it("counts only finished maps", () => {
    const r = deriveMatchResult({ ...base, status: "live", maps: [map(1, 13, 7), map(2, 8, 4, "live")] });
    expect(r).toMatchObject({ team1Score: 1, team2Score: 0, winnerId: undefined });
  });

  it("sets the winner only when the match is finished", () => {
    const r = deriveMatchResult({ ...base, status: "finished", maps: [map(1, 10, 13), map(2, 13, 9), map(3, 11, 13)] });
    expect(r.team1Score).toBe(1);
    expect(r.team2Score).toBe(2);
    expect(r.winnerId?.equals(B)).toBe(true);
  });

  it("keeps a manual winner (forfeit) with no maps", () => {
    const r = deriveMatchResult({ ...base, status: "finished", maps: [], winnerId: A, winnerManual: true });
    expect(r.winnerId?.equals(A)).toBe(true);
    expect(r.winnerManual).toBe(true);
  });

  it("clears the winner when a finished match is reopened", () => {
    const r = deriveMatchResult({ ...base, status: "live", maps: [map(1, 13, 2)], winnerId: A, winnerManual: true });
    expect(r.winnerId).toBeUndefined();
    expect(r.winnerManual).toBe(false);
  });

  it("returns no winner on a tied finished match", () => {
    const r = deriveMatchResult({ ...base, status: "finished", maps: [map(1, 13, 2), map(2, 2, 13)] });
    expect(r.winnerId).toBeUndefined();
  });
});

describe("loserId", () => {
  it("returns the other team", () => {
    expect(loserId({ team1Id: A, team2Id: B, winnerId: A })?.equals(B)).toBe(true);
    expect(loserId({ team1Id: A, team2Id: B, winnerId: B })?.equals(A)).toBe(true);
    expect(loserId({ team1Id: A, team2Id: B, winnerId: undefined })).toBeUndefined();
  });
});
