import { and, asc, eq } from "drizzle-orm";
import { completeHomework } from "@/app/actions/admin";
import { createEvent } from "@/app/actions/events";
import QuickActionPanel from "@/app/(dashboard)/QuickActionPanel";
import { db } from "@/db/client";
import { homeworkLogs, homeworkTypes, quickActions, routineItems } from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard/perf";
import type { ResolvedActiveProfile } from "@/lib/auth/session";
import type { HomeworkQuickShortcut } from "@/app/(dashboard)/QuickActionPanel";
import type { HomeworkTypeAdminRow } from "@/app/(dashboard)/HomeworkTypesAdminModal";
import type { RoutineItemAdminRow } from "@/app/(dashboard)/RoutineItemsAdminModal";
import { ensureDefaultQuickActionsForFamily } from "@/lib/quick-actions/seed";
import { isValidTarget } from "@/lib/children";

type DashboardDeferredProps = Readonly<{
  profile: ResolvedActiveProfile;
}>;

async function loadQuickActionsForDashboard(familyId: string): Promise<{
  rows: { id: string; label: string; actionType: string; target: string }[];
  failed: boolean;
}> {
  let rows: { id: string; label: string; actionType: string; target: string }[] = [];
  let failed = false;
  try {
    await ensureDefaultQuickActionsForFamily(familyId);
    rows = await db
      .select({
        id: quickActions.id,
        label: quickActions.label,
        actionType: quickActions.actionType,
        target: quickActions.target,
      })
      .from(quickActions)
      .where(and(eq(quickActions.familyId, familyId), eq(quickActions.isActive, true)))
      .orderBy(asc(quickActions.sortOrder), asc(quickActions.createdAt));
  } catch (err: unknown) {
    failed = true;
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (typeof (err as { code: unknown }).code === "string" || typeof (err as { code: unknown }).code === "number")
        ? (err as { code: string | number }).code
        : undefined;
    console.error("[dashboard] quick_actions load failed", {
      familyId,
      message,
      ...(code !== undefined ? { code } : {}),
    });
  }
  return { rows, failed };
}

async function loadHomeworkTypesForDashboard(familyId: string): Promise<{
  rows: { id: string; title: string; childGroup: string }[];
  failed: boolean;
}> {
  let rows: { id: string; title: string; childGroup: string }[] = [];
  let failed = false;
  try {
    rows = await db
      .select({
        id: homeworkTypes.id,
        title: homeworkTypes.title,
        childGroup: homeworkTypes.childGroup,
      })
      .from(homeworkTypes)
      .where(and(eq(homeworkTypes.familyId, familyId), eq(homeworkTypes.isActive, true)))
      .orderBy(asc(homeworkTypes.createdAt));
  } catch (err: unknown) {
    failed = true;
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (typeof (err as { code: unknown }).code === "string" || typeof (err as { code: unknown }).code === "number")
        ? (err as { code: string | number }).code
        : undefined;
    console.error("[dashboard] homework_types load failed", {
      familyId,
      message,
      ...(code !== undefined ? { code } : {}),
    });
  }
  return { rows, failed };
}

async function loadRoutineItemsForDashboard(familyId: string): Promise<{
  rows: { id: string; title: string; target: string; isActive: boolean }[];
  failed: boolean;
}> {
  let rows: { id: string; title: string; target: string; isActive: boolean }[] = [];
  let failed = false;
  try {
    rows = await db
      .select({
        id: routineItems.id,
        title: routineItems.title,
        target: routineItems.target,
        isActive: routineItems.isActive,
      })
      .from(routineItems)
      .where(and(eq(routineItems.familyId, familyId), eq(routineItems.isActive, true)))
      .orderBy(asc(routineItems.createdAt));
  } catch (err: unknown) {
    failed = true;
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (typeof (err as { code: unknown }).code === "string" || typeof (err as { code: unknown }).code === "number")
        ? (err as { code: string | number }).code
        : undefined;
    console.error("[dashboard] routine_items load failed", {
      familyId,
      message,
      ...(code !== undefined ? { code } : {}),
    });
  }
  return { rows, failed };
}

async function loadHomeworkLogsTodayForDashboard(familyId: string, todayKey: string): Promise<{
  rows: { homeworkTypeId: string }[];
  failed: boolean;
}> {
  let rows: { homeworkTypeId: string }[] = [];
  let failed = false;
  try {
    rows = await db
      .select({ homeworkTypeId: homeworkLogs.homeworkTypeId })
      .from(homeworkLogs)
      .where(and(eq(homeworkLogs.familyId, familyId), eq(homeworkLogs.dateKey, todayKey), eq(homeworkLogs.isReverted, false)));
  } catch (err: unknown) {
    failed = true;
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (typeof (err as { code: unknown }).code === "string" || typeof (err as { code: unknown }).code === "number")
        ? (err as { code: string | number }).code
        : undefined;
    console.error("[dashboard] homework_logs_today load failed", {
      familyId,
      todayKey,
      message,
      ...(code !== undefined ? { code } : {}),
    });
  }
  return { rows, failed };
}

export default async function DashboardDeferred({ profile }: DashboardDeferredProps) {
  const t0 = dashboardPerfNow();
  const todayKey = new Date().toISOString().slice(0, 10);

  const [{ rows: quickActionRows, failed: quickActionsLoadFailed }, { rows: homeworkTypeRows, failed: homeworkTypesLoadFailed }, { rows: routineItemRows, failed: routineItemsLoadFailed }, { rows: homeworkLogsToday, failed: homeworkLogsLoadFailed }] =
    await Promise.all([
      loadQuickActionsForDashboard(profile.familyId),
      loadHomeworkTypesForDashboard(profile.familyId),
      loadRoutineItemsForDashboard(profile.familyId),
      loadHomeworkLogsTodayForDashboard(profile.familyId, todayKey),
    ]);

  logDashboardPerf("parallel_quick_homework", t0);

  const homeworkCompletedToday = new Set((homeworkLogsToday ?? []).map((r) => r.homeworkTypeId));
  const homeworkShortcuts: HomeworkQuickShortcut[] = homeworkTypeRows.map((row) => ({
    id: row.id,
    title: row.title,
    childGroup: row.childGroup as "kid7" | "kid4",
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
    childGroup: r.childGroup as "kid7" | "kid4",
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
