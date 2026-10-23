"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { collections } from "@/lib/db/mongo";
import { BRACKET_TYPES, MATCH_FORMATS, SETTINGS_ID } from "@/lib/db/types";
import { TAGS } from "@/lib/data/tags";
import { parseLocalDate } from "@/lib/time";
import { isValidBracket } from "@/lib/tournament/bracket-plan";
import {
  failure,
  formObject,
  fromZod,
  handleError,
  invalidate,
  optionalText,
  requiredInt,
  requiredText,
  success,
  type ActionState,
} from "./shared";

const localDate = z.preprocess(
  (v) => (typeof v === "string" && v ? parseLocalDate(v) : undefined),
  z.date().optional(),
);

const settingsSchema = z
  .object({
    name: requiredText("Тэмцээний нэр", 80),
    description: optionalText(500),
    startsOn: localDate,
    endsOn: localDate,
    bracketType: z.enum(BRACKET_TYPES),
    bracketSize: z.coerce.number().pipe(z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(16)])),
    teamsAdvancePerGroup: requiredInt("Шалгарах багийн тоо", 1, 8),
    pointsWin: requiredInt("Ялалтын оноо", 0, 10),
    pointsLoss: requiredInt("Ялагдлын оноо", 0, 10),
    defaultGroupFormat: z.enum(MATCH_FORMATS),
  })
  .refine((s) => isValidBracket(s.bracketType, s.bracketSize), {
    path: ["bracketSize"],
    message: "Энэ төрөлд 4, 8 эсвэл 16 баг (шигшээ + финалын тойрогт 4, 6 эсвэл 8 баг) сонгоно уу.",
  })
  .refine((s) => !s.startsOn || !s.endsOn || s.endsOn >= s.startsOn, {
    path: ["endsOn"],
    message: "Дуусах огноо эхлэх огнооноос өмнө байна.",
  });

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(formObject(formData));
  if (!parsed.success) return fromZod(parsed.error);

  try {
    const { settings } = await collections();
    const { startsOn, endsOn, description, ...rest } = parsed.data;
    const unset: Record<string, ""> = {};
    if (!startsOn) unset.startsOn = "";
    if (!endsOn) unset.endsOn = "";
    if (!description) unset.description = "";

    const res = await settings.updateOne(
      { _id: SETTINGS_ID },
      {
        $set: { ...rest, startsOn, endsOn, description, updatedAt: new Date() },
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      },
    );
    if (res.matchedCount === 0) return failure("Тохиргоо олдсонгүй. `pnpm db:setup` ажиллуулна уу.");
    invalidate(TAGS.settings);
    return success("Тохиргоо хадгалагдлаа.");
  } catch (err) {
    return handleError(err);
  }
}
