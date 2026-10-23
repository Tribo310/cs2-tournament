"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { collections } from "@/lib/db/mongo";
import {
  MATCH_FORMATS,
  SETTINGS_ID,
  STAGE_KINDS,
  type BracketLink,
  type MatchDoc,
  type PlayoffStage,
} from "@/lib/db/types";
import { toMatch } from "@/lib/data/dto";
import { writeMatch } from "@/lib/data/match-writer";
import { parseId } from "@/lib/data/queries";
import { TAGS } from "@/lib/data/tags";
import { loserLinks, winnerLinks } from "@/lib/tournament/advance";
import { decodeSource, feedsInto, roundRobinPairs, slotSource, type SlotSource } from "@/lib/tournament/custom-playoff";
import {
  failure,
  formObject,
  fromZod,
  handleError,
  invalidate,
  optionalInt,
  optionalText,
  requiredText,
  success,
  UserError,
  type ActionState,
} from "./shared";

// Custom playoff builder: the admin creates stages, adds matches to them and
// wires each slot to a team or to the winner/loser of another match.

const stageSchema = z.object({
  name: requiredText("Шатны нэр", 40),
  kind: z.enum(STAGE_KINDS),
  qualify: optionalInt(0, 16),
});

async function loadStages(): Promise<PlayoffStage[]> {
  const { settings } = await collections();
  const s = await settings.findOne({ _id: SETTINGS_ID }, { projection: { playoffStages: 1 } });
  if (!s) throw new UserError("Тохиргоо олдсонгүй.");
  return s.playoffStages ?? [];
}

async function saveStages(stages: PlayoffStage[]) {
  const { settings } = await collections();
  await settings.updateOne({ _id: SETTINGS_ID }, { $set: { playoffStages: stages, updatedAt: new Date() } });
}

export async function addStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = stageSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const stages = await loadStages();
    stages.push({ key: new ObjectId().toHexString(), ...parsed.data });
    await saveStages(stages);
    invalidate(TAGS.settings);
    return success("Шат нэмэгдлээ.");
  } catch (err) {
    return handleError(err);
  }
}

export async function updateStage(key: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = stageSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const stages = await loadStages();
    const i = stages.findIndex((s) => s.key === key);
    if (i < 0) return failure("Шат олдсонгүй.");
    stages[i] = { key, ...parsed.data };
    await saveStages(stages);
    invalidate(TAGS.settings);
    return success("Шат хадгалагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}

export async function moveStage(key: string, direction: -1 | 1): Promise<ActionState> {
  await requireAdmin();
  try {
    const stages = await loadStages();
    const i = stages.findIndex((s) => s.key === key);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= stages.length) return null;
    [stages[i], stages[j]] = [stages[j], stages[i]];
    await saveStages(stages);
    invalidate(TAGS.settings, TAGS.matches);
    return null;
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteStage(key: string): Promise<ActionState> {
  await requireAdmin();
  try {
    const { matches } = await collections();
    const stages = await loadStages();
    if (!stages.some((s) => s.key === key)) return failure("Шат олдсонгүй.");
    const inStage = await matches.find({ stage: "playoff", stageKey: key }).toArray();
    if (inStage.some((m) => m.status !== "scheduled")) {
      return failure("Энэ шатанд эхэлсэн эсвэл дууссан тоглолт байгаа тул устгах боломжгүй.");
    }
    for (const m of inStage) await removeMatch(m._id);
    await saveStages(stages.filter((s) => s.key !== key));
    invalidate(TAGS.settings, TAGS.matches);
    return success("Шат устлаа.");
  } catch (err) {
    return handleError(err);
  }
}

// --- Matches ------------------------------------------------------------------------

async function nextPosition(stageKey: string): Promise<number> {
  const { matches } = await collections();
  const last = await matches.find({ stage: "playoff", stageKey }).sort({ position: -1 }).limit(1).next();
  return (last?.position ?? 0) + 1;
}

async function defaultFormat() {
  const { settings } = await collections();
  return (await settings.findOne({ _id: SETTINGS_ID }))?.defaultGroupFormat ?? "bo3";
}

function newMatch(stageKey: string, position: number, format: MatchDoc["format"], teams: [ObjectId?, ObjectId?] = []): MatchDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    stage: "playoff",
    stageKey,
    position,
    team1Id: teams[0],
    team2Id: teams[1],
    format,
    status: "scheduled",
    maps: [],
    team1Score: 0,
    team2Score: 0,
    winnerManual: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function addStageMatch(stageKey: string): Promise<ActionState> {
  await requireAdmin();
  try {
    if (!(await loadStages()).some((s) => s.key === stageKey)) return failure("Шат олдсонгүй.");
    const { matches } = await collections();
    await matches.insertOne(newMatch(stageKey, await nextPosition(stageKey), await defaultFormat()));
    invalidate(TAGS.matches);
    return success("Тоглолт нэмэгдлээ.");
  } catch (err) {
    return handleError(err);
  }
}

const matchSchema = z.object({
  stageKey: z.string({ error: "Шат сонгоно уу." }).min(1, "Шат сонгоно уу."),
  source1: z.string().default(""),
  source2: z.string().default(""),
  format: z.enum(MATCH_FORMATS),
  label: optionalText(60),
});

const sameSource = (a: SlotSource, b: SlotSource) => JSON.stringify(a) === JSON.stringify(b);

/** Patch that sets a match's winner or loser destinations, first link in the main field. */
function linksPatch(kind: "winner" | "loser", links: BracketLink[]): Partial<MatchDoc> {
  const [first, ...rest] = links;
  return kind === "winner"
    ? { next: first, nextExtra: rest.length ? rest : undefined }
    : { loserNext: first, loserNextExtra: rest.length ? rest : undefined };
}

async function addFeed(feeder: ObjectId, kind: "winner" | "loser", link: BracketLink) {
  await writeMatch(feeder, (m) => linksPatch(kind, [...(kind === "winner" ? winnerLinks(m) : loserLinks(m)), link]));
}

async function removeFeed(feeder: ObjectId, kind: "winner" | "loser", link: BracketLink) {
  await writeMatch(feeder, (m) =>
    linksPatch(
      kind,
      (kind === "winner" ? winnerLinks(m) : loserLinks(m)).filter((l) => !(l.matchId.equals(link.matchId) && l.slot === link.slot)),
    ),
  );
}

/** Checks that a slot source points at something real and does not loop back. */
function checkSource(source: SlotSource | null, targetId: string, all: ReturnType<typeof toMatch>[], teamIds: Set<string>) {
  if (!source) throw new UserError("Эх сурвалж буруу байна.");
  if (source.kind === "team" && !teamIds.has(source.teamId)) throw new UserError("Сонгосон баг олдсонгүй.");
  if (source.kind === "winner" || source.kind === "loser") {
    if (!all.some((m) => m.id === source.matchId)) throw new UserError("Сонгосон тоглолт олдсонгүй.");
    if (source.matchId === targetId || feedsInto(all, targetId, source.matchId)) {
      throw new UserError("Тоглолт өөрөө рүүгээ эсвэл өмнөх шат руугаа баг илгээх боломжгүй.");
    }
  }
}

/**
 * Saves one builder row: stage, format, label and where each slot's team comes from.
 * Rewiring goes through writeMatch, so finished feeders push their teams right away.
 */
export async function saveStageMatch(matchId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(matchId);
  if (!_id) return failure("Тоглолт олдсонгүй.");
  const parsed = matchSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;

  try {
    const { matches, teams } = await collections();
    if (!(await loadStages()).some((s) => s.key === d.stageKey)) return failure("Шат олдсонгүй.");
    const docs = await matches.find({ stage: "playoff" }).toArray();
    const target = docs.find((m) => m._id.equals(_id));
    if (!target) return failure("Тоглолт олдсонгүй.");
    const all = docs.map(toMatch);
    const self = toMatch(target);
    const teamIds = new Set((await teams.find({}, { projection: { _id: 1 } }).toArray()).map((t) => t._id.toHexString()));

    const wanted = [decodeSource(d.source1), decodeSource(d.source2)] as const;
    wanted.forEach((s) => checkSource(s, matchId, all, teamIds));
    const [w1, w2] = wanted as [SlotSource, SlotSource];
    if (w1.kind !== "empty" && sameSource(w1, w2)) return failure("Хоёр байр ижил эх сурвалжтай байна.");

    const currentSources = [slotSource(all, self, 1), slotSource(all, self, 2)];
    const changed = ([1, 2] as const).filter((slot) => !sameSource(currentSources[slot - 1], wanted[slot - 1]!));
    if (changed.length && target.status !== "scheduled") {
      return failure("Эхэлсэн тоглолтын багийг солих боломжгүй. Эхлээд «Товлогдсон» төлөвт буцаана уу.");
    }

    // 1. The match itself: stage, format, label and hand-picked teams
    const moving = target.stageKey !== d.stageKey;
    const teamField = (slot: 1 | 2) => (slot === 1 ? "team1Id" : "team2Id");
    const teamPatch: Partial<MatchDoc> = {};
    for (const slot of changed) {
      const w = wanted[slot - 1]!;
      // Feeders fill their slot themselves below; anything else is set (or cleared) here
      teamPatch[teamField(slot)] = w.kind === "team" ? new ObjectId(w.teamId) : undefined;
    }
    await writeMatch(_id, {
      stageKey: d.stageKey,
      bracket: undefined,
      round: undefined,
      position: moving ? await nextPosition(d.stageKey) : target.position,
      format: d.format,
      label: d.label,
      ...teamPatch,
    });

    // 2. Rewire feeding matches: drop the old link, then add the new one
    for (const slot of changed) {
      const link: BracketLink = { matchId: _id, slot };
      const old = currentSources[slot - 1];
      if (old.kind === "winner" || old.kind === "loser") await removeFeed(new ObjectId(old.matchId), old.kind, link);
    }
    for (const slot of changed) {
      const w = wanted[slot - 1]!;
      if (w.kind === "winner" || w.kind === "loser") await addFeed(new ObjectId(w.matchId), w.kind, { matchId: _id, slot });
    }

    invalidate(TAGS.matches);
    return success("Тоглолт хадгалагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}

/** Deletes a match and every link that points to it (target slots are going away too). */
async function removeMatch(_id: ObjectId) {
  const { matches } = await collections();
  const pointing = await matches
    .find({
      $or: [
        { "next.matchId": _id },
        { "nextExtra.matchId": _id },
        { "loserNext.matchId": _id },
        { "loserNextExtra.matchId": _id },
      ],
    })
    .toArray();
  for (const m of pointing) {
    const keep = (links: BracketLink[]) => links.filter((l) => !l.matchId.equals(_id));
    const patch = { ...linksPatch("winner", keep(winnerLinks(m))), ...linksPatch("loser", keep(loserLinks(m))) };
    await matches.replaceOne({ _id: m._id }, { ...m, ...patch, updatedAt: new Date() });
  }
  await matches.deleteOne({ _id });
}

export async function deleteStageMatch(matchId: string): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(matchId);
  if (!_id) return failure("Тоглолт олдсонгүй.");
  try {
    const { matches } = await collections();
    const m = await matches.findOne({ _id, stage: "playoff" });
    if (!m) return failure("Тоглолт олдсонгүй.");
    if (m.status !== "scheduled") return failure("Эхэлсэн тоглолтыг устгахын өмнө «Товлогдсон» төлөвт буцаана уу.");
    await removeMatch(_id);
    invalidate(TAGS.matches);
    return success("Тоглолт устлаа.");
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Fills an empty round-robin stage: one match per pair of participants. Each
 * participant is a team or the winner/loser of an earlier match (fields p_1…p_n).
 */
export async function createRoundRobin(stageKey: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const count = Number(formData.get("count"));
  const format = z.enum(MATCH_FORMATS).safeParse(formData.get("format"));
  if (!Number.isInteger(count) || count < 2 || count > 8) return failure("Оролцогчийн тоо 2–8 байна.");
  if (!format.success) return failure("Формат сонгоно уу.");

  try {
    const stage = (await loadStages()).find((s) => s.key === stageKey);
    if (!stage) return failure("Шат олдсонгүй.");
    const { matches, teams } = await collections();
    if (await matches.countDocuments({ stage: "playoff", stageKey })) {
      return failure("Энэ шатанд тоглолт байна. Тойргийг шинээр үүсгэх бол эхлээд тэдгээрийг устгана уу.");
    }
    const all = (await matches.find({ stage: "playoff" }).toArray()).map(toMatch);
    const teamIds = new Set((await teams.find({}, { projection: { _id: 1 } }).toArray()).map((t) => t._id.toHexString()));

    const sources = Array.from({ length: count }, (_, i) => decodeSource(String(formData.get(`p_${i + 1}`) ?? "")));
    const fieldErrors: Record<string, string> = {};
    sources.forEach((s, i) => {
      try {
        checkSource(s, "", all, teamIds);
        if (s!.kind !== "empty" && sources.findIndex((o) => o && sameSource(o, s!)) !== i) {
          fieldErrors[`p_${i + 1}`] = "Давхардсан байна.";
        }
      } catch (err) {
        fieldErrors[`p_${i + 1}`] = err instanceof UserError ? err.message : "Буруу байна.";
      }
    });
    if (Object.keys(fieldErrors).length) return failure("Оролцогчдоо шалгана уу.", fieldErrors);

    const teamOf = (s: SlotSource) => (s.kind === "team" ? new ObjectId(s.teamId) : undefined);
    const docs = roundRobinPairs(count).map(([a, b], i) =>
      newMatch(stageKey, i + 1, format.data, [teamOf(sources[a]!), teamOf(sources[b]!)]),
    );
    await matches.insertMany(docs);

    // Each feeder sends its team into every match of that participant
    for (let p = 0; p < count; p++) {
      const s = sources[p]!;
      if (s.kind !== "winner" && s.kind !== "loser") continue;
      const links = roundRobinPairs(count).flatMap<BracketLink>(([a, b], i) =>
        a === p ? [{ matchId: docs[i]._id, slot: 1 as const }] : b === p ? [{ matchId: docs[i]._id, slot: 2 as const }] : [],
      );
      for (const link of links) await addFeed(new ObjectId(s.matchId), s.kind, link);
    }

    invalidate(TAGS.matches);
    return success(`Тойргийн ${docs.length} тоглолт үүслээ.`);
  } catch (err) {
    return handleError(err);
  }
}
