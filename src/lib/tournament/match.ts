import type { ObjectId } from "mongodb";
import type { MatchDoc, MatchFormat, MatchMap } from "@/lib/db/types";

export type MapResult = "team1" | "team2" | null;

export function mapsToWin(format: MatchFormat): number {
  return { bo1: 1, bo3: 2, bo5: 3 }[format];
}

export function maxMaps(format: MatchFormat): number {
  return { bo1: 1, bo3: 3, bo5: 5 }[format];
}

// A map counts only once the admin marks it finished.
export function mapWinner(map: MatchMap): MapResult {
  if (map.status !== "finished" || map.team1Rounds === map.team2Rounds) return null;
  return map.team1Rounds > map.team2Rounds ? "team1" : "team2";
}

// Standard CS2 MR12 rules: 13 rounds wins regulation; overtime is MR3 (first to 4 of 6).
// Used by the admin UI to suggest finishing a map; never enforced.
export function isMapDecided(team1Rounds: number, team2Rounds: number): boolean {
  const hi = Math.max(team1Rounds, team2Rounds);
  const lo = Math.min(team1Rounds, team2Rounds);
  if (hi === 13 && lo <= 11) return true;
  if (hi < 16) return false;
  // Overtime: each OT block of 6 rounds starts at 12-12, 15-15, ...
  const otBase = 12 + 3 * Math.floor((lo - 12) / 3);
  return hi === otBase + 4 && hi - lo >= 2;
}

type DerivedFields = Pick<MatchDoc, "team1Score" | "team2Score" | "winnerId" | "winnerManual">;

/**
 * Recomputes maps won and the winner from the match's maps.
 * Must run before every match write — this replaces DB triggers.
 */
export function deriveMatchResult(
  match: Pick<MatchDoc, "maps" | "status" | "team1Id" | "team2Id" | "winnerId" | "winnerManual">,
): DerivedFields {
  let team1Score = 0;
  let team2Score = 0;
  for (const map of match.maps) {
    const w = mapWinner(map);
    if (w === "team1") team1Score++;
    else if (w === "team2") team2Score++;
  }

  if (match.status !== "finished") {
    return { team1Score, team2Score, winnerId: undefined, winnerManual: false };
  }

  if (match.winnerManual && match.winnerId && isParticipant(match, match.winnerId)) {
    return { team1Score, team2Score, winnerId: match.winnerId, winnerManual: true };
  }

  let winnerId: ObjectId | undefined;
  if (team1Score > team2Score) winnerId = match.team1Id;
  else if (team2Score > team1Score) winnerId = match.team2Id;
  return { team1Score, team2Score, winnerId, winnerManual: false };
}

function isParticipant(
  match: Pick<MatchDoc, "team1Id" | "team2Id">,
  teamId: ObjectId,
): boolean {
  return Boolean(match.team1Id?.equals(teamId) || match.team2Id?.equals(teamId));
}

export function loserId(match: Pick<MatchDoc, "team1Id" | "team2Id" | "winnerId">): ObjectId | undefined {
  if (!match.winnerId) return undefined;
  return match.team1Id && match.winnerId.equals(match.team1Id) ? match.team2Id : match.team1Id;
}
