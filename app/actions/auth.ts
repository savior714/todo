"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { signIn, signOut } from "@/auth";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { ACTIVE_PROFILE_COOKIE, getCurrentFamilyId, requireUserId } from "@/lib/auth/session";
import { z } from "zod";


const profileIdSchema = z.string().uuid();

export async function beginGoogleLogin() {
  await signIn("google", { redirectTo: "/select-profile" });
}

export async function selectProfile(profileId: string) {
  profileIdSchema.parse(profileId);
  const userId = await requireUserId();
  const familyId = await getCurrentFamilyId(userId);

  if (!familyId) {
    throw new Error("가족 정보가 없습니다.");
  }

  const [allowedProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.familyId, familyId)));

  if (!allowedProfile) {
    throw new Error("선택한 프로필에 접근할 수 없습니다.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}

export async function logoutProfile() {
  try {
    await signOut({ redirectTo: "/login" });
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_PROFILE_COOKIE);
  }
}
