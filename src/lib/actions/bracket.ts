"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { collections } from "@/lib/db/mongo";
import { MATCH_FORMATS, SETTINGS_ID, type MatchDoc } from "@/lib/db/types";
import { parseId } from "@/lib/data/queries";
import { TAGS } from "@/lib/data/tags";
import { isValidBracket, planBracket } from "@/lib/tournament/bracket-plan";
import { failure, handleError, invalidate, success, type ActionState } from "./shared";

const STARTED = { stage: "playoff", status: { $ne: "scheduled" } } as const;

const formatsSchema = z.object({
  format: z.enum(MATCH_FORMATS),
  finalFormat: z.enum(MATCH_FORMATS),
});

/**
 * Creates the playoff bracket. The admin picks both teams of every first-round match
 * (fields r1_<match>_1 / r1_<match>_2); later rounds fill in as results come in.
 * Empty slots stay TBD and can be filled later on the match page.
 */
export async function generateBracket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const formats = formatsSchema.safeParse({ format: formData.get("format"), finalFormat: formData.get("finalFormat") });
  if (!formats.success) return failure("Формат сонгоно уу.");

  try {
    const { settings, matches, teams } = await collections();
    const s = await settings.findOne({ _id: SETTINGS_ID });
    if (!s) return failure("Тохиргоо олдсонгүй.");
    if (s.bracketType === "custom") return failure("Чөлөөт төрөлд шат, тоглолтуудыг гараар бүтээнэ.");
    if (!isValidBracket(s.bracketType, s.bracketSize)) {
      return failure("Тохиргооны плей-оффын төрөл ба багийн тоо таарахгүй байна. Тохиргоог шалгана уу.");
    }

    const fieldErrors: Record<string, string> = {};
    const chosen: ObjectId[] = [];
    const pairs: [ObjectId | undefined, ObjectId | undefined][] = [];
    for (let p = 1; p <= s.bracketSize / 2; p++) {
      const pair: [ObjectId | undefined, ObjectId | undefined] = [undefined, undefined];
      for (const slot of [1, 2] as const) {
        const name = `r1_${p}_${slot}`;
        const raw = String(formData.get(name) ?? "");
        if (!raw) continue;
        const id = parseId(raw);
        if (!id) fieldErrors[name] = "Баг олдсонгүй.";
        else if (chosen.some((x) => x.equals(id))) fieldErrors[name] = "Энэ баг давхардсан байна.";
        else {
          chosen.push(id);
          pair[slot - 1] = id;
        }
      }
      pairs.push(pair);
    }
    if (Object.keys(fieldErrors).length) return failure("Нэг баг хоёр удаа сонгогдсон байна.", fieldErrors);
    if (chosen.length === 0) return failure("1-р тойргийн тоглолтуудын багийг сонгоно уу.");
    if ((await teams.countDocuments({ _id: { $in: chosen } })) !== chosen.length) return failure("Сонгосон баг олдсонгүй.");

    if (await matches.countDocuments(STARTED)) {
      return failure("Плей-оффын тоглолт эхэлсэн байна. Шинээр үүсгэхийн тулд эхлээд одоогийн шатыг устгана уу.");
    }

    const plan = planBracket(s.bracketType, s.bracketSize);
    const ids = new Map(plan.map((m) => [m.key, new ObjectId()]));
    const lastUpper = Math.max(...plan.filter((m) => m.bracket === "upper").map((m) => m.round));
    // "Final format" covers the grand final, the single-elimination final or the round-robin final
    const isFinal = (m: (typeof plan)[number]) =>
      m.bracket === "final" || (s.bracketType === "single" && m.round === lastUpper);
    const now = new Date();

    const docs: MatchDoc[] = plan.map((m) => ({
      _id: ids.get(m.key)!,
      stage: "playoff",
      bracket: m.bracket,
      round: m.round,
      position: m.position,
      // First-round matchups come straight from the admin's choices
      team1Id: m.bracket === "upper" && m.round === 1 ? pairs[m.position - 1][0] : undefined,
      team2Id: m.bracket === "upper" && m.round === 1 ? pairs[m.position - 1][1] : undefined,
      format: isFinal(m) ? formats.data.finalFormat : formats.data.format,
      status: "scheduled",
      maps: [],
      team1Score: 0,
      team2Score: 0,
      winnerManual: false,
      next: m.next ? { matchId: ids.get(m.next.key)!, slot: m.next.slot } : undefined,
      nextExtra: m.nextExtra?.map((l) => ({ matchId: ids.get(l.key)!, slot: l.slot })),
      loserNext: m.loserNext ? { matchId: ids.get(m.loserNext.key)!, slot: m.loserNext.slot } : undefined,
      createdAt: now,
      updatedAt: now,
    }));

    await matches.deleteMany({ stage: "playoff" });
    await matches.insertMany(docs);
    invalidate(TAGS.matches);
    const empty = pairs.flat().filter((t) => !t).length;
    return success(
      empty
        ? `Шат үүслээ: ${docs.length} тоглолт. ${empty} хоосон байрыг тоглолтын хуудаснаас бөглөнө үү.`
        : `Плей-оффын шат үүслээ: ${docs.length} тоглолт.`,
    );
  } catch (err) {
    return handleError(err);
  }
}

/** Removes every playoff match. Allowed at any time, so the admin can start over. */
export async function deleteBracket(): Promise<ActionState> {
  await requireAdmin();
  try {
    const { matches } = await collections();
    const res = await matches.deleteMany({ stage: "playoff" });
    invalidate(TAGS.matches);
    return success(`Шат устлаа (${res.deletedCount} тоглолт).`);
  } catch (err) {
    return handleError(err);
  }
}
