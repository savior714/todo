import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { families, profiles, userFamilies } from "@/db/schema";

function randomInviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 첫 Google 로그인(createUser) 시 가족·멤버십·기본 프로필을 만든다.
 * 이미 user_families가 있으면 아무 것도 하지 않는다.
 */
export async function ensureDefaultFamilyForUser(userId: string, displayName: string | null | undefined) {
  const existing = await db
    .select({ familyId: userFamilies.familyId })
    .from(userFamilies)
    .where(eq(userFamilies.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const familyId = crypto.randomUUID();
  const adminProfileId = crypto.randomUUID();
  const memberProfileId = crypto.randomUUID();
  const primaryName = displayName?.trim() || "관리자";

  await db.insert(families).values({
    id: familyId,
    name: "우리 가족",
    inviteCode: randomInviteCode(),
  });

  await db.insert(userFamilies).values({
    userId,
    familyId,
  });

  await db.insert(profiles).values([
    { id: adminProfileId, familyId, name: primaryName, role: "admin" },
    { id: memberProfileId, familyId, name: "가족 구성원", role: "executor" },
  ]);
}
