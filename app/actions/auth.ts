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

/**
 * Google OAuth 로그인을 시작한다.
 * Google signIn을 호출하고 /select-profile 페이지로 리다이렉트한다.
 */
export async function beginGoogleLogin() {
  await signIn("google", { redirectTo: "/select-profile" });
}

/**
 * 프로필을 선택하고 활성 프로필 쿠키를 설정한다.
 *
 * @param profileId - 선택할 프로필 ID (UUID 형식)
 * @throws 가족 정보가 없거나, 선택한 프로필에 접근 권한이 없을 경우
 * @description 유효성 검증 → 사용자/가족 정보 조회 → 프로필 접근 권한 확인 → 쿠키 설정 → /dashboard 리다이렉트 순으로 실행한다.
 */
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
    .where(and(eq(profiles.id, profileId), eq(profiles.familyId, familyId), eq(profiles.isDeleted, false)));

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

/**
 * 로그아웃한다.
 *
 * @description signOut 호출 후 활성 프로필 쿠키를 삭제한다.
 * 예외 발생 여부와 관계없이 finally 블록에서 쿠키 삭제를 보장한다.
 */
export async function logoutProfile() {
  try {
    await signOut({ redirectTo: "/login" });
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_PROFILE_COOKIE);
  }
}
