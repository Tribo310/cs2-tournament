import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { collections } from "@/lib/db/mongo";
import { SETTINGS_ID, type MatchDoc } from "@/lib/db/types";
import { computeStandings, type StandingRow } from "@/lib/tournament/standings";
import { toGroup, toMatch, toSettings, toTeam } from "./dto";

// Uncached reads. Admin pages use these directly (always fresh);
// public pages wrap them in "use cache" functions (phase 3).

export function parseId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

export async function getSettings() {
  const { settings } = await collections();
  const doc = await settings.findOne({ _id: SETTINGS_ID });
  if (!doc) throw new Error("Settings document missing — run `pnpm db:setup`");
  return toSettings(doc);
}

export async function listTeams() {
  const { teams } = await collections();
  const docs = await teams.find().collation({ locale: "en", strength: 2 }).sort({ name: 1 }).toArray();
  return docs.map(toTeam);
}

export async function getTeam(id: string) {
  const _id = parseId(id);
  if (!_id) return null;
  const { teams } = await collections();
  const doc = await teams.findOne({ _id });
  return doc ? toTeam(doc) : null;
}

export async function listGroups() {
  const { groups } = await collections();
  const docs = await groups.find().sort({ sortOrder: 1, name: 1 }).toArray();
  return docs.map(toGroup);
}

export async function getGroup(id: string) {
  const _id = parseId(id);
  if (!_id) return null;
  const { groups } = await collections();
  const doc = await groups.findOne({ _id });
  return doc ? toGroup(doc) : null;
}

export interface MatchFilter {
  stage?: MatchDoc["stage"];
  status?: MatchDoc["status"];
  groupId?: string;
  teamId?: string;
}

export async function listMatches(filter: MatchFilter = {}) {
  const query: Filter<MatchDoc> = {};
  if (filter.stage) query.stage = filter.stage;
  if (filter.status) query.status = filter.status;
  const groupId = filter.groupId ? parseId(filter.groupId) : null;
  if (groupId) query.groupId = groupId;
  const teamId = filter.teamId ? parseId(filter.teamId) : null;
  if (teamId) query.$or = [{ team1Id: teamId }, { team2Id: teamId }];

  const { matches } = await collections();
  // Unscheduled matches sort last
  const docs = await matches
    .aggregate<MatchDoc>([
      { $match: query },
      { $addFields: { _unscheduled: { $cond: [{ $ifNull: ["$scheduledAt", false] }, 0, 1] } } },
      { $sort: { _unscheduled: 1, scheduledAt: 1, bracket: 1, round: 1, position: 1, createdAt: 1 } },
      { $project: { _unscheduled: 0 } },
    ])
    .toArray();
  return docs.map(toMatch);
}

export async function getMatch(id: string) {
  const _id = parseId(id);
  if (!_id) return null;
  const { matches } = await collections();
  const doc = await matches.findOne({ _id });
  return doc ? toMatch(doc) : null;
}

/** Fresh group standings for admin decisions (bracket seeding), keyed by group id. */
export async function getGroupStandings(): Promise<Record<string, StandingRow[]>> {
  const { groups, matches, settings } = await collections();
  const [groupDocs, matchDocs, settingsDoc] = await Promise.all([
    groups.find().sort({ sortOrder: 1, name: 1 }).toArray(),
    matches.find({ stage: "group" }).toArray(),
    settings.findOne({ _id: SETTINGS_ID }),
  ]);
  const points = settingsDoc ?? { pointsWin: 1, pointsLoss: 0 };
  return Object.fromEntries(
    groupDocs.map((g) => [
      g._id.toHexString(),
      computeStandings(g, matchDocs.filter((m) => m.groupId?.equals(g._id)), points),
    ]),
  );
}
