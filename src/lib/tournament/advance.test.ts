import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { resolveSlot, slotChanges } from "./advance";

const [A, B, C] = [new ObjectId(), new ObjectId(), new ObjectId()];
const nextM = new ObjectId();
const lowerM = new ObjectId();
const base = {
  stage: "playoff" as const,
  team1Id: A,
  team2Id: B,
  next: { matchId: nextM, slot: 1 as const },
  loserNext: { matchId: lowerM, slot: 2 as const },
};

describe("slotChanges", () => {
  it("sends the winner forward and the loser down when a match finishes", () => {
    const changes = slotChanges({ ...base, winnerId: undefined }, { ...base, winnerId: A });
    expect(changes).toHaveLength(2);
    expect(changes[0]).toMatchObject({ link: base.next, to: A });
    expect(changes[1]).toMatchObject({ link: base.loserNext, to: B });
  });

  it("clears both slots when a finished match is reopened", () => {
    const changes = slotChanges({ ...base, winnerId: A }, { ...base, winnerId: undefined });
    expect(changes.map((c) => [c.from, c.to])).toEqual([
      [A, undefined],
      [B, undefined],
    ]);
  });

  it("swaps teams when the result is corrected", () => {
    const changes = slotChanges({ ...base, winnerId: A }, { ...base, winnerId: B });
    expect(changes[0]).toMatchObject({ from: A, to: B });
    expect(changes[1]).toMatchObject({ from: B, to: A });
  });

  it("does nothing when the winner is unchanged or for group matches", () => {
    expect(slotChanges({ ...base, winnerId: A }, { ...base, winnerId: A })).toEqual([]);
    expect(slotChanges({ ...base, stage: "group", winnerId: undefined }, { ...base, stage: "group", winnerId: A })).toEqual([]);
  });

  it("only moves the winner in single elimination (no loserNext)", () => {
    const single = { ...base, loserNext: undefined };
    expect(slotChanges({ ...single, winnerId: undefined }, { ...single, winnerId: A })).toHaveLength(1);
  });
});

describe("resolveSlot", () => {
  it("fills or replaces the slot", () => {
    expect(resolveSlot(undefined, { link: base.next, to: A })).toEqual({ value: A });
    expect(resolveSlot(B, { link: base.next, from: B, to: A })).toEqual({ value: A });
    expect(resolveSlot(A, { link: base.next, to: A })).toBeNull();
  });

  it("clears only the team this match sent, keeping manual fixes", () => {
    expect(resolveSlot(A, { link: base.next, from: A, to: undefined })).toEqual({ value: undefined });
    expect(resolveSlot(C, { link: base.next, from: A, to: undefined })).toBeNull();
  });
});
