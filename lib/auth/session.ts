import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth, unauthorized } from "@/auth";
import { db } from "@/db/client";
import { profiles, userFamilies } from "@/db/schema";

export const ACTIVE_PROFILE_COOKIE = "active_profile_id";

export type ResolvedActiveProfile = {
  id: string;
  familyId: string;
  role: "admin" | "executor";
  name: string;
};

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    unauthorized();
  }

  return userId as string;
}

export async function getCurrentFamilyId(userId: string) {
  const [row] = await db.select({ familyId: userFamilies.familyId }).from(userFamilies).where(eq(userFamilies.userId, userId));
  return row?.familyId ?? null;
}

async function loadActiveProfileContext(): Promise<ResolvedActiveProfile | null> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return null;
    }

    const cookieStore = await cookies();
    const profileId = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value;

    if (!profileId) {
      return null;
    }

    const familyId = await getCurrentFamilyId(userId);
    if (!familyId) {
      return null;
    }

    const [profile] = await db
      .select({
        id: profiles.id,
        familyId: profiles.familyId,
        role: profiles.role,
        name: profiles.name,
      })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.familyId, familyId), eq(profiles.isDeleted, false)));

    return profile ?? null;
  } catch {
    return null;
  }
}

export async function getActiveProfileContext(): Promise<ResolvedActiveProfile | null> {
  return await loadActiveProfileContext();
}
