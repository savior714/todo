import { and, asc, eq } from "drizzle-orm";
import { completeHomework } from "@/app/actions/admin";
import { createEvent } from "@/app/actions/events";
import QuickActionPanel from "@/app/(dashboard)/QuickActionPanel";
import { db } from "@/db/client";
import { homeworkLogs, homeworkTypes, quickActions, routineItems } from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard/perf";
import { safeDbQuery } from "@/lib/dashboard/error";
import type { ResolvedActiveProfile } from "@/lib/auth/session";
import type { HomeworkQuickShortcut } from "@/app/(dashboard)/QuickActionPanel";
import type { HomeworkTypeAdminRow } from "@/app/(dashboard)/HomeworkTypesAdminModal";
import type { RoutineItemAdminRow } from "@/app/(dashboard)/RoutineItemsAdminModal";
import { ensureDefaultQuickActionsForFamily } from "@/lib/quick-actions/seed";
import { isValidTarget, isChildId } from "@/lib/children";

type DashboardDeferredProps = Readonly<{
  profile: ResolvedActiveProfile;
}>;

export default async function DashboardDeferred({ profile }: DashboardDeferredProps) {
  const t0 = dashboardPerfNow();
  const familyId = profile.familyId;
  const todayKey = new Date().toISOString().slice(0, 10);

  const { rows: quickActionRows, failed: quickActionsLoadFailed } = await safeDbQuery(
    () => Promise.all([
      ensureDefaultQuickActionsForFamily(familyId),
      db
        .select({
          id: quickActions.id,
          label: quickActions.label,
          actionType: quickActions.actionType,
          target: quickActions.target,
        })
        .from(quickActions)
        .where(and(eq(quickActions.familyId, familyId), eq(quickActions.isActive, true)))
        .orderBy(asc(quickActions.sortOrder), asc(quickActions.createdAt)),
    ]).then(([, rows]) => rows),
    "quick_actions",
    { familyId }
  );

  const { rows: homeworkTypeRows, failed: homeworkTypesLoadFailed } = await safeDbQuery(
    () =>
      db
        .select({
          id: homeworkTypes.id,
          title: homeworkTypes.title,
          childGroup: homeworkTypes.childGroup,
        })
        .from(homeworkTypes)
        .where(and(eq(homeworkTypes.familyId, familyId), eq(homeworkTypes.isActive, true)))
        .orderBy(asc(homeworkTypes.createdAt)),
    "homework_types",
    { familyId }
  );

  const { rows: routineItemRows, failed: routineItemsLoadFailed } = await safeDbQuery(
    () =>
      db
        .select({
          id: routineItems.id,
          title: routineItems.title,
          target: routineItems.target,
          isActive: routineItems.isActive,
        })
        .from(routineItems)
        .where(and(eq(routineItems.familyId, familyId), eq(routineItems.isActive, true)))
        .orderBy(asc(routineItems.createdAt)),
    "routine_items",
    { familyId }
  );

  const { rows: homeworkLogsToday, failed: homeworkLogsLoadFailed } = await safeDbQuery(
    () =>
      db
        .select({ homeworkTypeId: homeworkLogs.homeworkTypeId })
        .from(homeworkLogs)
        .where(and(eq(homeworkLogs.familyId, familyId), eq(homeworkLogs.dateKey, todayKey), eq(homeworkLogs.isReverted, false))),
    "homework_logs_today",
    { familyId, todayKey }
  );

  logDashboardPerf("parallel_quick_homework", t0);

  const homeworkCompletedToday = new Set((homeworkLogsToday ?? []).map((r) => r.homeworkTypeId));
  const homeworkShortcuts: HomeworkQuickShortcut[] = homeworkTypeRows.map((row) => ({
    id: row.id,
    title: row.title,
    childGroup: isChildId(row.childGroup) ? (row.childGroup as "kid7" | "kid4") : "kid4",
    completedToday: homeworkCompletedToday.has(row.id),
  }));

  const routineItemRowsTyped: RoutineItemAdminRow[] = routineItemRows.map((r) => ({
    id: r.id,
    title: r.title,
    target: isValidTarget(r.target) ? r.target : "family",
    isActive: r.isActive,
  }));

  const quickActionRowsTyped = quickActionRows.map((r) => ({
    id: r.id,
    label: r.label,
    actionType: r.actionType,
    target: r.target,
    sortOrder: 0,
    isActive: true,
  }));

  const homeworkTypeRowsTyped: HomeworkTypeAdminRow[] = homeworkTypeRows.map((r) => ({
    id: r.id,
    title: r.title,
    childGroup: isChildId(r.childGroup) ? (r.childGroup as "kid7" | "kid4") : "kid4",
    isActive: true,
  }));

  return (
    <>
      {quickActionsLoadFailed && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
        >
          퀵 액션 DB 테이블을 불러오지 못했습니다. 운영 Turso에{" "}
          <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/60">npm run db:migrate</code>를
          실행해 <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/60">quick_actions</code>{" "}
          마이그레이션을 적용한 뒤 다시 시도해 주세요. 점검:{" "}
          <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/60">GET /api/health</code>
        </p>
      )}
      {homeworkTypesLoadFailed && (
        <p role="alert" className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          숙제 유형 DB 테이블을 불러오지 못했습니다.
        </p>
      )}
      {routineItemsLoadFailed && (
        <p role="alert" className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          루틴 체크리스트 DB 테이블을 불러오지 못했습니다.
        </p>
      )}
      {homeworkLogsLoadFailed && (
        <p role="alert" className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          당일 숙제 완료 기록 DB 테이블을 불러오지 못했습니다.
        </p>
      )}
      <QuickActionPanel
        actions={quickActionRows}
        homeworkShortcuts={homeworkShortcuts}
        showAdminSettingsLink={profile.role === "admin"}
        quickActionRows={quickActionRowsTyped}
        homeworkTypeRows={homeworkTypeRowsTyped}
        routineItemRows={routineItemRowsTyped}
        completeHomeworkAction={completeHomework}
        createEventAction={createEvent}
      />
    </>
  );
}
