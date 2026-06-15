import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { families, profiles, userFamilies } from "@/db/schema";
import { seedQuickActionsForFamilyTx } from "@/lib/quick-actions/seed";

function randomInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 첫 Google 로그인(createUser) 시 가족·멤버십·기본 프로필을 만든다.
 * 이미 user_families가 있으면 아무 것도 하지 않는다.
 * 전체 과정을 db.transaction()으로 감싸 동시 로그인 시 중복 생성 및 고아 데이터 방지.
 *
 * P-5 해결: seedQuickActionsForFamily(tx, famId) 를 트랜잭션 내부에서 호출하여
 * family/userFamilies/profiles/quickActions 생성이 원자적으로 동작하도록 변경.
 */
export async function ensureDefaultFamilyForUser(userId: string, displayName: string | null | undefined) {
  const familyId = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ familyId: userFamilies.familyId })
      .from(userFamilies)
      .where(eq(userFamilies.userId, userId))
      .limit(1);
    if (existing.length > 0) {
      return existing[0].familyId;
    }

    const famId = crypto.randomUUID();
    const adminProfileId = crypto.randomUUID();
    const memberProfileId = crypto.randomUUID();
    const primaryName = displayName?.trim() || "관리자";

    await tx.insert(families).values({
      id: famId,
      name: "우리 가족",
      inviteCode: randomInviteCode(),
    });

    await tx.insert(userFamilies).values({
      userId,
      familyId: famId,
    });

    await tx.insert(profiles).values([
      { id: adminProfileId, familyId: famId, name: primaryName, role: "admin" },
      { id: memberProfileId, familyId: famId, name: "가족 구성원", role: "executor" },
    ]);

    // 퀵 액션 시드도 트랜잭션 내에서 실행 (P-5 해결)
    await seedQuickActionsForFamilyTx(tx, famId);

    return famId;
  });

  return familyId;
}
