import { and, asc, eq } from "drizzle-orm";
import { completeHomework } from "@/app/actions/admin";
import { createEvent } from "@/app/actions/events";
import QuickActionPanel from "@/app/(dashboard)/QuickActionPanel";
import { db } from "@/db/client";
import { homeworkLogs, homeworkTypes, quickActions, routineItems } from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard/perf";
import type { ResolvedActiveProfile } from "@/lib/auth/session";
import { ensureDefaultQuickActionsForFamily } from "@/lib/quick-actions/seed";

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

export default async function DashboardDeferred({ profile }: DashboardDeferredProps) {
  const t0 = dashboardPerfNow();
  const todayKey = new Date().toISOString().slice(0, 10);

  const [{ rows: quickActionRows, failed: quickActionsLoadFailed }, homeworkTypeRows, routineItemRows, homeworkLogsToday] =
    await Promise.all([
      loadQuickActionsForDashboard(profile.familyId),
      db
        .select({
          id: homeworkTypes.id,
          title: homeworkTypes.title,
          childGroup: homeworkTypes.childGroup,
        })
        .from(homeworkTypes)
        .where(and(eq(homeworkTypes.familyId, profile.familyId), eq(homeworkTypes.isActive, true)))
        .orderBy(asc(homeworkTypes.createdAt)),
      db
        .select({
          id: routineItems.id,
          title: routineItems.title,
          target: routineItems.target,
          isActive: routineItems.isActive,
        })
        .from(routineItems)
        .where(and(eq(routineItems.familyId, profile.familyId), eq(routineItems.isActive, true)))
        .orderBy(asc(routineItems.createdAt)),
      db
        .select({ homeworkTypeId: homeworkLogs.homeworkTypeId })
        .from(homeworkLogs)
        .where(and(eq(homeworkLogs.familyId, profile.familyId), eq(homeworkLogs.dateKey, todayKey))),
    ]);

  logDashboardPerf("parallel_quick_homework", t0);

  const homeworkCompletedToday = new Set((homeworkLogsToday ?? []).map((r) => r.homeworkTypeId));
  const homeworkShortcuts = homeworkTypeRows.map((row) => ({
    id: row.id,
    title: row.title,
    childGroup: row.childGroup,
    completedToday: homeworkCompletedToday.has(row.id),
  }));

  const routineItemRowsTyped = routineItemRows.map((r) => ({
    id: r.id,
    title: r.title,
    target: (r.target === "kid7" || r.target === "kid4" || r.target === "family") ? r.target : "family",
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

  const homeworkTypeRowsTyped = homeworkTypeRows.map((r) => ({
    id: r.id,
    title: r.title,
    childGroup: r.childGroup,
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
