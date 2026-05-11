import { and, asc, desc, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { completeHomework } from "@/app/actions/admin";
import { logoutProfile } from "@/app/actions/auth";
import { createEvent, undoEvent } from "@/app/actions/events";
import DailyPinBanner from "@/app/(dashboard)/DailyPinBanner";
import QuickActionPanel from "@/app/(dashboard)/QuickActionPanel";
import TimelineFeed from "@/app/(dashboard)/TimelineFeed";
import { db } from "@/db/client";
import { events, homeworkLogs, homeworkTypes, quickActions } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { ensureDefaultQuickActionsForFamily } from "@/lib/quick-actions-seed";

const TIMELINE_LOOKBACK_MS = 120 * 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const profile = await getActiveProfileContext();
  if (!profile) {
    redirect("/login");
  }

  const timelineSince = Date.now() - TIMELINE_LOOKBACK_MS;

  let quickActionRows: {
    id: string;
    label: string;
    actionType: string;
    target: string;
  }[] = [];
  let quickActionsLoadFailed = false;
  try {
    await ensureDefaultQuickActionsForFamily(profile.familyId);
    quickActionRows = await db
      .select({
        id: quickActions.id,
        label: quickActions.label,
        actionType: quickActions.actionType,
        target: quickActions.target,
      })
      .from(quickActions)
      .where(and(eq(quickActions.familyId, profile.familyId), eq(quickActions.isActive, true)))
      .orderBy(asc(quickActions.sortOrder), asc(quickActions.createdAt));
  } catch (err: unknown) {
    quickActionsLoadFailed = true;
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (typeof (err as { code: unknown }).code === "string" ||
        typeof (err as { code: unknown }).code === "number")
        ? (err as { code: string | number }).code
        : undefined;
    console.error("[dashboard] quick_actions load failed", {
      familyId: profile.familyId,
      message,
      ...(code !== undefined ? { code } : {}),
    });
  }

  const timelineRows = await db
    .select({
      id: events.id,
      action_type: events.actionType,
      target: events.target,
      created_at: events.createdAt,
      is_reverted: events.isReverted,
      metadata: events.metadata,
    })
    .from(events)
    .where(
      and(
        eq(events.familyId, profile.familyId),
        eq(events.isReverted, false),
        gte(events.createdAt, timelineSince)
      )
    )
    .orderBy(desc(events.createdAt))
    .limit(500);

  const todayKey = new Date().toISOString().slice(0, 10);
  const homeworkTypeRows = await db
    .select({
      id: homeworkTypes.id,
      title: homeworkTypes.title,
      childGroup: homeworkTypes.childGroup,
    })
    .from(homeworkTypes)
    .where(and(eq(homeworkTypes.familyId, profile.familyId), eq(homeworkTypes.isActive, true)))
    .orderBy(asc(homeworkTypes.createdAt));

  const homeworkLogsToday = await db
    .select({ homeworkTypeId: homeworkLogs.homeworkTypeId })
    .from(homeworkLogs)
    .where(and(eq(homeworkLogs.familyId, profile.familyId), eq(homeworkLogs.dateKey, todayKey)));

  const homeworkCompletedToday = new Set((homeworkLogsToday ?? []).map((r) => r.homeworkTypeId));
  const homeworkShortcuts = homeworkTypeRows.map((row) => ({
    id: row.id,
    title: row.title,
    childGroup: row.childGroup,
    completedToday: homeworkCompletedToday.has(row.id),
  }));

  const normalizedEvents = timelineRows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at).toISOString(),
    is_reverted: Boolean(row.is_reverted),
    metadata: row.metadata ?? "{}",
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">FamilySync Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            active_profile_id 쿠키가 있는 경우에만 접근 가능합니다.
          </p>
        </div>
        <form action={logoutProfile} className="shrink-0 pt-0.5">
          <button
            type="submit"
            aria-label="로그아웃"
            title="로그아웃"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
              />
            </svg>
          </button>
        </form>
      </header>
      {quickActionsLoadFailed && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
        >
          퀵 액션 DB 테이블을 불러오지 못했습니다. 운영 Turso에{" "}
          <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/60">npm run db:migrate</code>를
          실행해 <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/60">quick_actions</code>{" "}
          마이그레이션을 적용한 뒤 다시 시도해 주세요. 점검:{" "}
          <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/60">GET /api/health</code>
        </p>
      )}
      <DailyPinBanner />
      <QuickActionPanel
        actions={quickActionRows}
        homeworkShortcuts={homeworkShortcuts}
        showAdminSettingsLink={profile.role === "admin"}
        completeHomeworkAction={completeHomework}
        createEventAction={createEvent}
      />
      <TimelineFeed initialEvents={normalizedEvents} undoEventAction={undoEvent} />
    </main>
  );
}
