import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, userFamilies } from "@/db/schema";

/** 쉼표·세미콜론·공백으로 구분된 Google 계정 이메일 목록 (대소문자 무시). */
export const FAMILY_CO_ADMIN_EMAILS_ENV = "FAMILY_CO_ADMIN_EMAILS";

function parseCoAdminEmailAllowlist(): Set<string> {
  const raw = process.env[FAMILY_CO_ADMIN_EMAILS_ENV] ?? "";
  const next = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const e = part.trim().toLowerCase();
    if (e.length > 0) {
      next.add(e);
    }
  }
  return next;
}

/**
 * 같은 가족에서 부모·공동 양육자가 모두 `/admin`을 쓰도록,
 * allowlist에 포함된 계정으로 로그인할 때 해당 family의 **executor** 프로필을 admin으로 승격한다 (멱등).
 *
 * 주의: 가족에 executor 역할을 유지해야 하는 프로필(예: 돌봄이)이 있으면 승격되므로, allowlist는 신뢰할 수 있는 이메일만 넣는다.
 */
export async function promoteExecutorsToAdminForCoAdminEmail(userId: string, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return;
  }
  const allow = parseCoAdminEmailAllowlist();
  if (!allow.has(normalized)) {
    return;
  }

  const [membership] = await db
    .select({ familyId: userFamilies.familyId })
    .from(userFamilies)
    .where(eq(userFamilies.userId, userId))
    .limit(1);

  if (!membership?.familyId) {
    return;
  }

  await db
    .update(profiles)
    .set({ role: "admin" })
    .where(and(eq(profiles.familyId, membership.familyId), eq(profiles.role, "executor")));
}
