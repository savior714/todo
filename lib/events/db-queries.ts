import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { events } from "@/db/schema";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

type TxType = Parameters<typeof db.transaction>[0] extends (tx: infer Tx) => unknown ? Tx : never;

/**
 * 트랜잭션 컨텍스트에서 medication 중복 체크.
 * @param tx - db.transaction() 콜백의 tx 파라미터 (LibSQLTransaction)
 */
export async function checkRecentMedicationTx(
  tx: TxType,
  familyId: string,
  target: string,
): Promise<{ blocked: true; lastEventAt: string } | { blocked: false }> {
  const windowStart = new Date(Date.now() - TWO_HOURS_MS);

  const [recentMedication] = await tx
    .select({ created_at: events.createdAt })
    .from(events)
    .where(
      and(
        eq(events.familyId, familyId),
        eq(events.actionType, "medication"),
        eq(events.target, target),
        eq(events.isReverted, false),
        gte(events.createdAt, windowStart),
      ),
    )
    .orderBy(desc(events.createdAt))
    .limit(1);

  if (recentMedication) {
    return { blocked: true, lastEventAt: new Date(recentMedication.created_at).toISOString() };
  }
  return { blocked: false };
}

/** 트랜잭션 내에서 createdDate 자동 계산용 SQL 표현식. */
export function getCreatedDateSql() {
  return sql`(strftime('%Y-%m-%d', 'now'))`;
}
