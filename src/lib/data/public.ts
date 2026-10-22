import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { computeStandings, type StandingRow } from "@/lib/tournament/standings";
import { collections } from "@/lib/db/mongo";
import { SETTINGS_ID } from "@/lib/db/types";
import { toGroup, toMatch, toSettings, toTeam, type Group, type Match, type Settings, type Team } from "./dto";
import { TAGS } from "./tags";

export { matchContext } from "@/lib/tournament/context";

export interface Snapshot {
  settings: Settings;
  teams: Team[];
  groups: Group[];
  matches: Match[];
  standings: Record<string, StandingRow[]>; // by group id
}

/**
 * Everything the public site shows, loaded in one cached pass. The whole tournament
 * is small (a few dozen teams/matches), so one shared entry keeps database load flat
 * no matter how many visitors are watching.
 */
export async function getSnapshot(): Promise<Snapshot> {
  "use cache";
  cacheLife("tournament");
  cacheTag(TAGS.settings, TAGS.teams, TAGS.groups, TAGS.matches);

  const c = await collections();
  const [settingsDoc, teamDocs, groupDocs, matchDocs] = await Promise.all([
    c.settings.findOne({ _id: SETTINGS_ID }),
    c.teams.find().collation({ locale: "en", strength: 2 }).sort({ name: 1 }).toArray(),
    c.groups.find().sort({ sortOrder: 1, name: 1 }).toArray(),
    c.matches.find().toArray(),
  ]);
  if (!settingsDoc) throw new Error("Settings document missing — run `pnpm db:setup`");

  const settings = toSettings(settingsDoc);
  const standings: Record<string, StandingRow[]> = {};
  for (const g of groupDocs) {
    const groupMatches = matchDocs.filter((m) => m.stage === "group" && m.groupId?.equals(g._id));
    standings[g._id.toHexString()] = computeStandings(g, groupMatches, settings);
  }

  return {
    settings,
    teams: teamDocs.map(toTeam),
    groups: groupDocs.map(toGroup),
    matches: matchDocs.map(toMatch).sort(compareMatches),
    standings,
  };
}

// Scheduled time first (unscheduled last), then bracket order
function compareMatches(a: Match, b: Match): number {
  const ta = a.scheduledAt?.getTime() ?? Infinity;
  const tb = b.scheduledAt?.getTime() ?? Infinity;
  if (ta !== tb) return ta - tb;
  return (a.round ?? 0) - (b.round ?? 0) || (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id);
}

// --- Helpers over a snapshot ----------------------------------------------------

export function teamLookup(s: Snapshot): Record<string, Team> {
  return Object.fromEntries(s.teams.map((t) => [t.id, t]));
}
