import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quickActions } from "@/db/schema";

export const DEFAULT_QUICK_ACTION_SEEDS = [
  { label: "식사 기록", actionType: "meal", target: "family", sortOrder: 0 },
  { label: "투약 기록", actionType: "medication", target: "kid4", sortOrder: 1 },
  { label: "등원", actionType: "school_dropoff", target: "kid4", sortOrder: 2 },
  { label: "하원", actionType: "school_pickup", target: "kid4", sortOrder: 3 },
  { label: "양치", actionType: "brushing", target: "kid4", sortOrder: 4 },
  { label: "청소", actionType: "cleaning", target: "family", sortOrder: 5 },
] as const;

/**
 * 가족에 퀵 액션 행이 하나도 없을 때만 기본 버튼 세트를 넣는다 (기존 DB·신규 가족 공통).
 */
export async function ensureDefaultQuickActionsForFamily(familyId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(quickActions)
    .where(eq(quickActions.familyId, familyId));

  if ((row?.value ?? 0) > 0) {
    return;
  }

  await db.insert(quickActions).values(
    DEFAULT_QUICK_ACTION_SEEDS.map((s) => ({
      id: crypto.randomUUID(),
      familyId,
      label: s.label,
      actionType: s.actionType,
      target: s.target,
      sortOrder: s.sortOrder,
      isActive: true,
    }))
  );
}
