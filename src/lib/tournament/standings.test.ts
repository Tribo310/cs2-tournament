import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import type { MatchDoc, MatchMap } from "@/lib/db/types";
import { computeStandings } from "./standings";

const [A, B, C, D] = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
const names = new Map([A, B, C, D].map((id, i) => [id.toHexString(), "ABCD"[i]]));
const settings = { pointsWin: 1, pointsLoss: 0 };

function fin(t1: number, t2: number): MatchMap {
  return { order: 1, mapName: "Nuke", team1Rounds: t1, team2Rounds: t2, status: "finished" };
}

type M = Pick<MatchDoc, "status" | "team1Id" | "team2Id" | "winnerId" | "maps">;
function match(team1Id: ObjectId, team2Id: ObjectId, maps: MatchMap[], status: MatchDoc["status"] = "finished"): M {
  const w1 = maps.filter((m) => m.team1Rounds > m.team2Rounds).length;
  const w2 = maps.length - w1;
  return { status, team1Id, team2Id, maps, winnerId: status === "finished" ? (w1 > w2 ? team1Id : team2Id) : undefined };
}

const order = (rows: { teamId: string }[]) => rows.map((r) => names.get(r.teamId)).join("");

describe("computeStandings", () => {
  const group = { teams: [A, B, C, D].map((teamId) => ({ teamId })) };

  it("lists every team even with no matches played", () => {
    const rows = computeStandings(group, [], settings);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
  });

  it("aggregates wins, maps and rounds; ignores unfinished matches", () => {
    const rows = computeStandings(
      group,
      [
        match(A, B, [fin(13, 5), fin(13, 7)]),
        match(A, C, [fin(13, 11), fin(9, 13), fin(13, 10)]),
        match(B, C, [fin(13, 0)], "live"),
      ],
      settings,
    );
    const a = rows[0];
    expect(names.get(a.teamId)).toBe("A");
    expect(a).toMatchObject({ played: 2, wins: 2, losses: 0, mapsWon: 4, mapsLost: 1, mapDiff: 3, points: 2 });
    expect(a.roundsWon).toBe(13 + 13 + 13 + 9 + 13);
    expect(a.roundsLost).toBe(5 + 7 + 11 + 13 + 10);
  });

  it("breaks ties by map diff, then round diff", () => {
    // A and B both 1-0; A won 2-0, B won 2-1 → A ahead on map diff
    const rows = computeStandings(
      group,
      [match(A, C, [fin(13, 3), fin(13, 3)]), match(B, D, [fin(13, 3), fin(3, 13), fin(13, 3)])],
      settings,
    );
    expect(order(rows).slice(0, 2)).toBe("AB");
  });

  it("uses head-to-head when points and diffs are equal", () => {
    // Three-way tie impossible to split by diffs except via h2h between B and A
    const rows = computeStandings(
      group,
      [
        match(B, A, [fin(13, 10), fin(13, 10)]),
        match(A, C, [fin(13, 10), fin(13, 10)]),
        match(C, B, [fin(13, 10), fin(13, 10)]),
      ],
      settings,
    );
    // A, B, C each 1-1, map diff 0, round diff 0 → h2h among all three is 1 win each,
    // so the admin tiebreak / id order decides; D last
    expect(order(rows).at(-1)).toBe("D");

    const withRank = { teams: [{ teamId: A, tiebreakRank: 3 }, { teamId: B, tiebreakRank: 1 }, { teamId: C, tiebreakRank: 2 }, { teamId: D }] };
    expect(order(computeStandings(withRank, [
      match(B, A, [fin(13, 10), fin(13, 10)]),
      match(A, C, [fin(13, 10), fin(13, 10)]),
      match(C, B, [fin(13, 10), fin(13, 10)]),
    ], settings))).toBe("BCAD");
  });

  it("two-way tie is decided by the match between them", () => {
    // A and B both 1-1 with zero map/round diff; B beat A head-to-head
    const rows = computeStandings(
      group,
      [match(B, A, [fin(13, 11)]), match(A, C, [fin(13, 11)]), match(D, B, [fin(13, 11)])],
      settings,
    );
    expect(order(rows)).toBe("DBAC");
  });

  it("applies configurable points", () => {
    const rows = computeStandings(group, [match(A, B, [fin(13, 2)])], { pointsWin: 3, pointsLoss: 1 });
    expect(rows.find((r) => r.teamId === A.toHexString())?.points).toBe(3);
    expect(rows.find((r) => r.teamId === B.toHexString())?.points).toBe(1);
  });
});
