"use server";

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { collections } from "@/lib/db/mongo";
import { parseId } from "@/lib/data/queries";
import { TAGS } from "@/lib/data/tags";
import {
  failure,
  formObject,
  fromZod,
  handleError,
  invalidate,
  optionalInt,
  requiredText,
  success,
  type ActionState,
} from "./shared";

const groupSchema = z.object({
  name: requiredText("Группийн нэр", 40),
  sortOrder: optionalInt(0, 99),
});

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = groupSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const { groups } = await collections();
    const count = await groups.countDocuments();
    await groups.insertOne({
      _id: new ObjectId(),
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? count,
      teams: [],
      createdAt: new Date(),
    });
    invalidate(TAGS.groups);
    return success("Групп нэмэгдлээ.");
  } catch (err) {
    return handleError(err);
  }
}

export async function updateGroup(groupId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(groupId);
  if (!_id) return failure("Групп олдсонгүй.");
  const parsed = groupSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const { groups } = await collections();
    await groups.updateOne({ _id }, { $set: { name: parsed.data.name, sortOrder: parsed.data.sortOrder ?? 0 } });
    invalidate(TAGS.groups);
    return success("Групп хадгалагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteGroup(groupId: string): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(groupId);
  if (!_id) return failure("Групп олдсонгүй.");
  try {
    const { groups, matches } = await collections();
    const played = await matches.countDocuments({ groupId: _id, status: { $ne: "scheduled" } });
    if (played > 0) {
      return failure("Энэ группт эхэлсэн эсвэл дууссан тоглолт байгаа тул устгах боломжгүй.");
    }
    await matches.deleteMany({ groupId: _id });
    await groups.deleteOne({ _id });
    invalidate(TAGS.groups, TAGS.matches);
  } catch (err) {
    return handleError(err);
  }
  redirect("/admin/groups");
}

export async function addTeamToGroup(groupId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(groupId);
  const teamId = parseId(String(formData.get("teamId") ?? ""));
  if (!_id || !teamId) return failure("Баг сонгоно уу.");
  try {
    const { groups, teams } = await collections();
    if (!(await teams.countDocuments({ _id: teamId }))) return failure("Баг олдсонгүй.");
    const other = await groups.findOne({ "teams.teamId": teamId }, { projection: { name: 1 } });
    if (other) return failure(`Энэ баг "${other.name}" группт аль хэдийн байна.`);
    await groups.updateOne({ _id }, { $push: { teams: { teamId } } });
    invalidate(TAGS.groups);
    return success("Баг нэмэгдлээ.");
  } catch (err) {
    return handleError(err);
  }
}

export async function removeTeamFromGroup(groupId: string, teamId: string): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(groupId);
  const tid = parseId(teamId);
  if (!_id || !tid) return failure("Олдсонгүй.");
  try {
    const { groups, matches } = await collections();
    const teamMatches = { groupId: _id, $or: [{ team1Id: tid }, { team2Id: tid }] };
    if (await matches.countDocuments({ ...teamMatches, status: { $ne: "scheduled" } })) {
      return failure("Энэ баг группт тоглосон тул хасах боломжгүй.");
    }
    const removed = await matches.deleteMany(teamMatches);
    await groups.updateOne({ _id }, { $pull: { teams: { teamId: tid } } });
    invalidate(TAGS.groups, TAGS.matches);
    return success(
      removed.deletedCount ? `Баг хасагдаж, ${removed.deletedCount} товлогдсон тоглолт устлаа.` : "Баг хасагдлаа.",
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function setTiebreakRank(groupId: string, teamId: string, rank: number | null): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(groupId);
  const tid = parseId(teamId);
  if (!_id || !tid) return failure("Олдсонгүй.");
  if (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 99)) return failure("1-99 хооронд тоо оруулна уу.");
  try {
    const { groups } = await collections();
    await groups.updateOne(
      { _id, "teams.teamId": tid },
      rank === null ? { $unset: { "teams.$.tiebreakRank": "" } } : { $set: { "teams.$.tiebreakRank": rank } },
    );
    invalidate(TAGS.groups);
    return success("Хадгалагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}
