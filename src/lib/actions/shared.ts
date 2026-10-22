import "server-only";
import { MongoServerError } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import type { Tag } from "@/lib/data/tags";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  // Changes on every submit so the client can react to repeated identical results
  at: number;
} | null;

export function success(message?: string): ActionState {
  return { ok: true, message, at: Date.now() };
}

export function failure(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors, at: Date.now() };
}

/** User-facing error thrown from data helpers; message is shown as-is (Mongolian). */
export class UserError extends Error {}

export function fromZod(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return failure("Талбаруудаа шалгана уу.", fieldErrors);
}

export function handleError(err: unknown): ActionState {
  if (err instanceof UserError) return failure(err.message);
  if (err instanceof MongoServerError && err.code === 11000) {
    return failure("Ийм нэр эсвэл товчлол аль хэдийн бүртгэгдсэн байна.");
  }
  // Let Next.js redirects/notFound propagate
  if (err && typeof err === "object" && "digest" in err) throw err;
  console.error(err);
  return failure("Алдаа гарлаа. Дахин оролдоно уу.");
}

/** Expire public cache tags and refresh the admin page that triggered the action. */
export function invalidate(...tags: Tag[]) {
  for (const tag of tags) updateTag(tag);
  refresh();
}

// --- FormData field helpers -------------------------------------------------

const trimmed = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);

export const requiredText = (label: string, max = 100) =>
  z.preprocess(
    trimmed,
    z.string({ error: `${label} оруулна уу.` }).max(max, `${label} хэт урт байна.`),
  );

export const optionalText = (max = 200) =>
  z.preprocess(trimmed, z.string().max(max, "Хэт урт байна.").optional());

export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (trimmed(v) === undefined ? undefined : Number(v)),
    z.number().int("Бүхэл тоо оруулна уу.").min(min).max(max).optional(),
  );

export const requiredInt = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (trimmed(v) === undefined ? undefined : Number(v)),
    z
      .number({ error: `${label} оруулна уу.` })
      .int("Бүхэл тоо оруулна уу.")
      .min(min, `${label} хамгийн багадаа ${min}.`)
      .max(max, `${label} хамгийн ихдээ ${max}.`),
  );

export const optionalUrl = () =>
  z.preprocess(trimmed, z.url({ protocol: /^https?$/, error: "Зөв холбоос оруулна уу." }).optional());

export const checkbox = () => z.preprocess((v) => v === "on" || v === "true", z.boolean());

export function formObject(formData: FormData): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) if (!k.startsWith("$ACTION")) obj[k] = v;
  return obj;
}
