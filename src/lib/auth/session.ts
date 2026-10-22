import "server-only";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { collections } from "@/lib/db/mongo";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./token";

export async function createSession(adminId: string) {
  const token = await signSession({ adminId });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export interface CurrentAdmin {
  id: string;
  username: string;
}

// Verifies the cookie AND that the admin still exists, so deleting an admin revokes access.
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session || !ObjectId.isValid(session.adminId)) return null;

  const { admins } = await collections();
  const admin = await admins.findOne(
    { _id: new ObjectId(session.adminId) },
    { projection: { username: 1 } },
  );
  return admin ? { id: admin._id.toHexString(), username: admin.username } : null;
});

/** Call at the top of every admin page component and every admin Server Action. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
