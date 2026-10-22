"use server";

import { Binary, ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { collections } from "@/lib/db/mongo";
import { PLAYER_ROLES, ROSTER_LIMITS, type LogoDoc } from "@/lib/db/types";
import { parseId } from "@/lib/data/queries";
import { TAGS } from "@/lib/data/tags";
import {
  checkbox,
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

const MAX_LOGO_BYTES = 1024 * 1024;

const teamSchema = z.object({
  name: requiredText("Багийн нэр", 64),
  tag: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
    z
      .string({ error: "Товчлол оруулна уу." })
      .min(1, "Товчлол оруулна уу.")
      .max(8, "Товчлол 8 тэмдэгтээс ихгүй.")
      .regex(/^[\p{L}\p{N}._-]+$/u, "Зөвхөн үсэг, тоо ашиглана уу."),
  ),
  country: optionalText(60),
  city: optionalText(60),
  removeLogo: checkbox(),
});

/** Detects the real image type from magic bytes; the browser-provided type is not trusted. */
function sniffImage(buf: Buffer): LogoDoc["contentType"] | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

async function storeLogo(file: FormDataEntryValue | null): Promise<ObjectId | undefined> {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > MAX_LOGO_BYTES) throw new UserError("Лого 1 MB-аас ихгүй байх ёстой.");
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImage(buf);
  if (!contentType) throw new UserError("Лого PNG, JPEG эсвэл WebP байх ёстой.");

  const { logos } = await collections();
  const _id = new ObjectId();
  await logos.insertOne({ _id, contentType, data: new Binary(buf), size: buf.length, createdAt: new Date() });
  return _id;
}

export async function createTeam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = teamSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  let id: ObjectId;
  try {
    const { teams } = await collections();
    const logoId = await storeLogo(formData.get("logo"));
    const { removeLogo, ...fields } = parsed.data;
    void removeLogo;
    const now = new Date();
    try {
      const res = await teams.insertOne({
        _id: new ObjectId(),
        ...fields,
        logoId,
        players: [],
        createdAt: now,
        updatedAt: now,
      });
      id = res.insertedId;
    } catch (err) {
      if (logoId) await (await collections()).logos.deleteOne({ _id: logoId });
      throw err;
    }
    invalidate(TAGS.teams);
  } catch (err) {
    return handleError(err);
  }
  redirect(`/admin/teams/${id.toHexString()}`);
}

export async function updateTeam(teamId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(teamId);
  if (!_id) return failure("Баг олдсонгүй.");
  const parsed = teamSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  try {
    const { teams, logos } = await collections();
    const current = await teams.findOne({ _id }, { projection: { logoId: 1 } });
    if (!current) return failure("Баг олдсонгүй.");

    const newLogoId = await storeLogo(formData.get("logo"));
    const { removeLogo, country, city, ...fields } = parsed.data;
    const dropOldLogo = Boolean(current.logoId && (newLogoId || removeLogo));

    const unset: Record<string, ""> = {};
    if (!country) unset.country = "";
    if (!city) unset.city = "";
    if (removeLogo && !newLogoId) unset.logoId = "";

    try {
      await teams.updateOne(
        { _id },
        {
          $set: { ...fields, country, city, logoId: newLogoId, updatedAt: new Date() },
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
      );
    } catch (err) {
      if (newLogoId) await logos.deleteOne({ _id: newLogoId });
      throw err;
    }
    if (dropOldLogo) await logos.deleteOne({ _id: current.logoId });
    invalidate(TAGS.teams);
    return success("Баг хадгалагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteTeam(teamId: string): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(teamId);
  if (!_id) return failure("Баг олдсонгүй.");

  try {
    const { teams, matches, groups, logos } = await collections();
    const used = await matches.countDocuments({ $or: [{ team1Id: _id }, { team2Id: _id }] });
    if (used > 0) {
      return failure(`Энэ баг ${used} тоглолтод бүртгэлтэй тул устгах боломжгүй. Эхлээд тоглолтуудыг устгана уу.`);
    }
    const team = await teams.findOneAndDelete({ _id });
    if (team?.logoId) await logos.deleteOne({ _id: team.logoId });
    await groups.updateMany({ "teams.teamId": _id }, { $pull: { teams: { teamId: _id } } });
    invalidate(TAGS.teams, TAGS.groups);
  } catch (err) {
    return handleError(err);
  }
  redirect("/admin/teams");
}

// --- Players -----------------------------------------------------------------

const playerSchema = z.object({
  playerId: z.string().optional(),
  nickname: requiredText("Ник нэр", 32),
  fullName: optionalText(80),
  role: z.enum(PLAYER_ROLES),
  country: optionalText(60),
  sortOrder: optionalInt(0, 99),
});

const ROLE_LABEL = { player: "үндсэн тоглогч", sub: "сэлгээ", coach: "дасгалжуулагч" } as const;

export async function savePlayer(teamId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(teamId);
  if (!_id) return failure("Баг олдсонгүй.");
  const parsed = playerSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { playerId, sortOrder, ...fields } = parsed.data;
  const existingId = playerId ? parseId(playerId) : null;

  try {
    const { teams } = await collections();
    const team = await teams.findOne({ _id });
    if (!team) return failure("Баг олдсонгүй.");

    const others = team.players.filter((p) => !existingId || !p._id.equals(existingId));
    if (others.filter((p) => p.role === fields.role).length >= ROSTER_LIMITS[fields.role]) {
      return failure(`Багт ${ROSTER_LIMITS[fields.role]}-аас олон ${ROLE_LABEL[fields.role]} байх боломжгүй.`);
    }

    const player = {
      _id: existingId ?? new ObjectId(),
      ...fields,
      sortOrder: sortOrder ?? team.players.length,
    };
    const players = existingId
      ? team.players.map((p) => (p._id.equals(existingId) ? player : p))
      : [...team.players, player];

    // Guard against a concurrent edit replacing the roster
    const res = await teams.updateOne(
      { _id, updatedAt: team.updatedAt },
      { $set: { players, updatedAt: new Date() } },
    );
    if (res.matchedCount === 0) return failure("Баг өөр газраас өөрчлөгдсөн байна. Дахин оролдоно уу.");
    invalidate(TAGS.teams);
    return success(existingId ? "Тоглогч хадгалагдлаа." : "Тоглогч нэмэгдлээ.");
  } catch (err) {
    return handleError(err);
  }
}

export async function deletePlayer(teamId: string, playerId: string): Promise<ActionState> {
  await requireAdmin();
  const _id = parseId(teamId);
  const pid = parseId(playerId);
  if (!_id || !pid) return failure("Тоглогч олдсонгүй.");
  try {
    const { teams } = await collections();
    await teams.updateOne({ _id }, { $pull: { players: { _id: pid } }, $set: { updatedAt: new Date() } });
    invalidate(TAGS.teams);
    return success("Тоглогч хасагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}
