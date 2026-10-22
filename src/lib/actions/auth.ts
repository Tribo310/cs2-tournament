"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { normalizeUsername } from "@/lib/auth/username";
import { collections } from "@/lib/db/mongo";
import { failure, type ActionState } from "./shared";

const loginSchema = z.object({
  username: z.preprocess(normalizeUsername, z.string().min(1)),
  password: z.string().min(1),
  next: z.string().optional(),
});

// Compared against when the username is unknown, so response time doesn't reveal which usernames exist
let dummyHash: Promise<string> | undefined;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return failure("Нэвтрэх нэр болон нууц үгээ оруулна уу.");

  const { admins } = await collections();
  const admin = await admins.findOne({ username: parsed.data.username });
  dummyHash ??= hashPassword("not-a-real-password");
  const valid = await verifyPassword(parsed.data.password, admin?.passwordHash ?? (await dummyHash));
  if (!admin || !valid) return failure("Нэвтрэх нэр эсвэл нууц үг буруу байна.");

  await admins.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  await createSession(admin._id.toHexString());

  const next = parsed.data.next;
  redirect(next && next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
