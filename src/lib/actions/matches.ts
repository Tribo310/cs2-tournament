"use server";

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { collections } from "@/lib/db/mongo";
import { MAP_STATUSES, MATCH_FORMATS, MATCH_STATUSES, type MatchDoc } from "@/lib/db/types";
import { toMatch, type Match } from "@/lib/data/dto";
import { writeMatch, validate } from "@/lib/data/match-writer";
import { parseId } from "@/lib/data/queries";
import { TAGS } from "@/lib/data/tags";
import { parseLocalDateTime } from "@/lib/time";
import {
  failure,
  formObject,
  fromZod,
  handleError,
  invalidate,
  optionalText,
  optionalUrl,
  success,
  UserError,
  type ActionState,
} from "./shared";

const objectId = (label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v ? parseId(v) ?? "invalid" : undefined),
    z.instanceof(ObjectId, { message: `${label} буруу байна.` }).optional(),
  );

const detailsSchema = z.object({
  groupId: objectId("Групп"),
  team1Id: objectId("Баг 1"),
  team2Id: objectId("Баг 2"),
  format: z.enum(MATCH_FORMATS),
  scheduledAt: z.preprocess(
    (v) => (typeof v === "string" && v ? parseLocalDateTime(v) ?? "invalid" : undefined),
    z.date({ error: "Огноо буруу байна." }).optional(),
  ),
  label: optionalText(60),
  streamUrl: optionalUrl(),
  notes: optionalText(500),
});

export async function createMatch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = detailsSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;
  if (!d.groupId) return failure("Талбаруудаа шалгана уу.", { groupId: "Групп сонгоно уу." });

  let id: ObjectId;
  try {
    const { matches, groups } = await collections();
    const group = await groups.findOne({ _id: d.groupId });
    if (!group) return failure("Групп олдсонгүй.");
    for (const t of [d.team1Id, d.team2Id]) {
      if (t && !group.teams.some((g) => g.teamId.equals(t))) {
        return failure(`Сонгосон баг "${group.name}" группт байхгүй байна.`);
      }
    }

    const now = new Date();
    const doc: MatchDoc = {
      _id: new ObjectId(),
      stage: "group",
      ...d,
      status: "scheduled",
      maps: [],
      team1Score: 0,
      team2Score: 0,
      winnerManual: false,
      createdAt: now,
      updatedAt: now,
    };
    validate(doc);
    await matches.insertOne(doc);
    id = doc._id;
    invalidate(TAGS.matches);
  } catch (err) {
    return handleError(err);
  }
  // Inline forms (group page) stay put so the admin can add the next match right away
  if (formData.get("stay") === "1") return success("Тоглолт нэмэгдлээ.");
  redirect(`/admin/matches/${id.toHexString()}`);
}

export async function updateMatchDetails(matchId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(matchId);
  if (!_id) return failure("Тоглолт олдсонгүй.");
  const parsed = detailsSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;

  try {
    await writeMatch(_id, (current) => {
      if (current.status !== "scheduled" && (!d.team1Id || !d.team2Id)) {
        throw new UserError("Эхэлсэн тоглолтоос багийг хасах боломжгүй.");
      }
      return {
        // Group is fixed for playoff matches (their slot is managed by the bracket)
        groupId: current.stage === "group" ? (d.groupId ?? current.groupId) : undefined,
        team1Id: d.team1Id,
        team2Id: d.team2Id,
        format: d.format,
        scheduledAt: d.scheduledAt,
        label: d.label,
        streamUrl: d.streamUrl,
        notes: d.notes,
      };
    });
    invalidate(TAGS.matches);
    return success("Тоглолт хадгалагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}

export interface MatchActionResult {
  ok: boolean;
  message?: string;
  match?: Match;
}

function toResult(err: unknown): MatchActionResult {
  const state = handleError(err);
  return { ok: false, message: state?.message };
}

export async function setMatchStatus(
  matchId: string,
  status: MatchDoc["status"],
  expectedUpdatedAt: string,
): Promise<MatchActionResult> {
  await requireAdmin();
  const _id = parseId(matchId);
  if (!_id || !MATCH_STATUSES.includes(status)) return { ok: false, message: "Буруу хүсэлт." };
  try {
    const doc = await writeMatch(
      _id,
      (current) => ({
        status,
        // Going live marks the first unfinished map live, if any
        maps:
          status === "live" && !current.maps.some((m) => m.status === "live")
            ? markFirstUpcomingLive(current.maps)
            : current.maps,
      }),
      { expectedUpdatedAt: new Date(expectedUpdatedAt) },
    );
    invalidate(TAGS.matches);
    return { ok: true, match: toMatch(doc) };
  } catch (err) {
    return toResult(err);
  }
}

function markFirstUpcomingLive(maps: MatchDoc["maps"]): MatchDoc["maps"] {
  const sorted = [...maps].sort((a, b) => a.order - b.order);
  const first = sorted.find((m) => m.status === "upcoming");
  return sorted.map((m) => (m === first ? { ...m, status: "live" as const } : m));
}

const mapsSchema = z
  .array(
    z.object({
      order: z.number().int().min(1).max(5),
      mapName: z.string().trim().min(1, "Картын нэр оруулна уу.").max(30),
      pickedBy: z.string().optional(),
      team1Rounds: z.number().int().min(0).max(99),
      team2Rounds: z.number().int().min(0).max(99),
      status: z.enum(MAP_STATUSES),
    }),
  )
  .max(5);

/** Saves all maps of a match at once (called from the live score editor). */
export async function saveMaps(
  matchId: string,
  maps: Match["maps"],
  expectedUpdatedAt: string,
): Promise<MatchActionResult> {
  await requireAdmin();
  const _id = parseId(matchId);
  if (!_id) return { ok: false, message: "Тоглолт олдсонгүй." };
  const parsed = mapsSchema.safeParse(maps);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Буруу өгөгдөл." };

  try {
    const doc = await writeMatch(
      _id,
      {
        maps: parsed.data.map((m) => ({
          ...m,
          pickedBy: m.pickedBy ? (parseId(m.pickedBy) ?? undefined) : undefined,
        })),
      },
      { expectedUpdatedAt: new Date(expectedUpdatedAt) },
    );
    invalidate(TAGS.matches);
    return { ok: true, match: toMatch(doc) };
  } catch (err) {
    return toResult(err);
  }
}

/** Forfeit / technical win: finishes the match with the chosen winner. Pass null to undo. */
export async function setManualWinner(
  matchId: string,
  winnerId: string | null,
  expectedUpdatedAt: string,
): Promise<MatchActionResult> {
  await requireAdmin();
  const _id = parseId(matchId);
  if (!_id) return { ok: false, message: "Тоглолт олдсонгүй." };
  const winner = winnerId ? parseId(winnerId) : null;
  try {
    const doc = await writeMatch(
      _id,
      (current) => {
        if (!winner) {
          return {
            winnerManual: false,
            winnerId: undefined,
            status: current.maps.length ? "live" : "scheduled",
          };
        }
        if (!current.team1Id?.equals(winner) && !current.team2Id?.equals(winner)) {
          throw new UserError("Сонгосон баг энэ тоглолтод оролцоогүй байна.");
        }
        return { status: "finished", winnerId: winner, winnerManual: true };
      },
      { expectedUpdatedAt: new Date(expectedUpdatedAt) },
    );
    invalidate(TAGS.matches);
    return { ok: true, match: toMatch(doc) };
  } catch (err) {
    return toResult(err);
  }
}

export async function deleteMatch(matchId: string): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(matchId);
  if (!_id) return failure("Тоглолт олдсонгүй.");
  try {
    const { matches } = await collections();
    const match = await matches.findOne({ _id }, { projection: { stage: 1 } });
    if (match?.stage === "playoff") {
      return failure("Плей-оффын тоглолтыг шатны хэсгээс удирдана.");
    }
    await matches.deleteOne({ _id });
    invalidate(TAGS.matches);
  } catch (err) {
    return handleError(err);
  }
  redirect("/admin/matches");
}
