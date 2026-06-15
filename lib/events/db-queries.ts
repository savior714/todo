import { and, desc, eq, gte, sql } from "drizzle-orm";
import { events } from "@/db/schema";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * 일반 DB 컨텍스트에서 medication 중복 체크.
 * @param db - drizzle-orm libsql database instance
 */
export async function checkRecentMedicationDb(
  db: typeof import("@/db/client").db,
  familyId: string,
  target: string,
): Promise<{ blocked: true; lastEventAt: string } | { blocked: false }> {
  const windowStart = new Date(Date.now() - TWO_HOURS_MS);

  const [recentMedication] = await db
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

/**
 * 트랜잭션 컨텍스트에서 medication 중복 체크.
 * @param tx - db.transaction() 콜백의 tx 파라미터 (LibSQLTransaction)
 *
 * Note: Drizzle v0.45+ 의 엄격한 제네릭 타입으로 인해
 * tx 타입을 정확히 추출할 수 없어 `unknown` 으로 선언하고 내부에서 캐스팅.
 * 런타임에서는 db.transaction(async (tx) => { ... }) 의 tx 가 전달됨.
 */
export async function checkRecentMedicationTx(
  tx: unknown,
  familyId: string,
  target: string,
): Promise<{ blocked: true; lastEventAt: string } | { blocked: false }> {
  const windowStart = new Date(Date.now() - TWO_HOURS_MS);

  // @ts-expect-error Drizzle v0.45+ tx 타입 추출 불가로 인한 우회
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
