import type { GroupDoc, MatchDoc, SettingsDoc } from "@/lib/db/types";
import { mapWinner } from "./match";

export interface StandingRow {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  mapsWon: number;
  mapsLost: number;
  mapDiff: number;
  roundsWon: number;
  roundsLost: number;
  roundDiff: number;
  points: number;
  tiebreakRank?: number;
}

export type StandingMatch = Pick<MatchDoc, "status" | "team1Id" | "team2Id" | "winnerId" | "maps">;

/** Standings for a round-robin final: the participants are whoever is in its matches. */
export function roundRobinStandings(
  matches: StandingMatch[],
  settings: Pick<SettingsDoc, "pointsWin" | "pointsLoss">,
): StandingRow[] {
  const seen = new Map<string, NonNullable<StandingMatch["team1Id"]>>();
  for (const m of matches) {
    for (const t of [m.team1Id, m.team2Id]) if (t && !seen.has(t.toHexString())) seen.set(t.toHexString(), t);
  }
  return computeStandings({ teams: [...seen.values()].map((teamId) => ({ teamId })) }, matches, settings);
}

/** Tables for the round-robin stages of a custom playoff. */
export function customStageStandings(
  settings: Pick<SettingsDoc, "bracketType" | "playoffStages" | "pointsWin" | "pointsLoss">,
  matchDocs: (StandingMatch & Pick<MatchDoc, "stage" | "stageKey">)[],
): Record<string, StandingRow[]> {
  if (settings.bracketType !== "custom") return {};
  return Object.fromEntries(
    (settings.playoffStages ?? [])
      .filter((st) => st.kind === "round_robin")
      .map((st) => [st.key, roundRobinStandings(matchDocs.filter((m) => m.stage === "playoff" && m.stageKey === st.key), settings)]),
  );
}

/**
 * Group standings from finished matches.
 * Order: points → map diff → round diff → head-to-head wins among tied teams
 * → admin tiebreak rank → team id (stable).
 */
export function computeStandings(
  group: Pick<GroupDoc, "teams">,
  matches: StandingMatch[],
  settings: Pick<SettingsDoc, "pointsWin" | "pointsLoss">,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const gt of group.teams) {
    rows.set(gt.teamId.toHexString(), {
      teamId: gt.teamId.toHexString(),
      played: 0,
      wins: 0,
      losses: 0,
      mapsWon: 0,
      mapsLost: 0,
      mapDiff: 0,
      roundsWon: 0,
      roundsLost: 0,
      roundDiff: 0,
      points: 0,
      tiebreakRank: gt.tiebreakRank,
    });
  }

  const finished = matches.filter(
    (m) => m.status === "finished" && m.team1Id && m.team2Id && m.winnerId,
  );

  for (const m of finished) {
    const t1 = rows.get(m.team1Id!.toHexString());
    const t2 = rows.get(m.team2Id!.toHexString());
    if (!t1 || !t2) continue; // team no longer in this group

    let maps1 = 0;
    let maps2 = 0;
    let rounds1 = 0;
    let rounds2 = 0;
    for (const map of m.maps) {
      if (map.status !== "finished") continue;
      rounds1 += map.team1Rounds;
      rounds2 += map.team2Rounds;
      const w = mapWinner(map);
      if (w === "team1") maps1++;
      else if (w === "team2") maps2++;
    }

    const team1Won = m.winnerId!.equals(m.team1Id!);
    apply(t1, team1Won, maps1, maps2, rounds1, rounds2, settings);
    apply(t2, !team1Won, maps2, maps1, rounds2, rounds1, settings);
  }

  const list = [...rows.values()];
  for (const r of list) {
    r.mapDiff = r.mapsWon - r.mapsLost;
    r.roundDiff = r.roundsWon - r.roundsLost;
  }

  const primary = (a: StandingRow, b: StandingRow) =>
    b.points - a.points || b.mapDiff - a.mapDiff || b.roundDiff - a.roundDiff;

  list.sort(primary);

  // Resolve ties block by block using head-to-head among the tied teams only
  const result: StandingRow[] = [];
  let i = 0;
  while (i < list.length) {
    let j = i + 1;
    while (j < list.length && primary(list[i], list[j]) === 0) j++;
    const block = list.slice(i, j);
    if (block.length > 1) {
      const ids = new Set(block.map((r) => r.teamId));
      const h2h = headToHeadWins(finished, ids);
      block.sort(
        (a, b) =>
          (h2h.get(b.teamId) ?? 0) - (h2h.get(a.teamId) ?? 0) ||
          (a.tiebreakRank ?? Infinity) - (b.tiebreakRank ?? Infinity) ||
          a.teamId.localeCompare(b.teamId),
      );
    }
    result.push(...block);
    i = j;
  }
  return result;
}

function apply(
  row: StandingRow,
  won: boolean,
  mapsFor: number,
  mapsAgainst: number,
  roundsFor: number,
  roundsAgainst: number,
  settings: Pick<SettingsDoc, "pointsWin" | "pointsLoss">,
) {
  row.played++;
  if (won) {
    row.wins++;
    row.points += settings.pointsWin;
  } else {
    row.losses++;
    row.points += settings.pointsLoss;
  }
  row.mapsWon += mapsFor;
  row.mapsLost += mapsAgainst;
  row.roundsWon += roundsFor;
  row.roundsLost += roundsAgainst;
}

function headToHeadWins(matches: StandingMatch[], ids: Set<string>): Map<string, number> {
  const wins = new Map<string, number>();
  for (const m of matches) {
    const a = m.team1Id!.toHexString();
    const b = m.team2Id!.toHexString();
    if (!ids.has(a) || !ids.has(b)) continue;
    const w = m.winnerId!.toHexString();
    wins.set(w, (wins.get(w) ?? 0) + 1);
  }
  return wins;
}
