import { and, asc, desc, eq, gte, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import DailyPinBanner from "@/app/(dashboard)/DailyPinBanner";
import QuickActionPanel from "@/app/(dashboard)/QuickActionPanel";
import TimelineFeed from "@/app/(dashboard)/TimelineFeed";
import { db } from "@/db/client";
import { careGuides, events, quickActions } from "@/db/schema";
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

  const guides = await db
    .select({ linkedAction: careGuides.linkedAction, title: careGuides.title })
    .from(careGuides)
    .where(and(eq(careGuides.familyId, profile.familyId), isNotNull(careGuides.linkedAction)))
    .orderBy(desc(careGuides.createdAt));

  const guideHints = guides.reduce<Record<string, string>>((acc, guide) => {
    if (!guide.linkedAction || acc[guide.linkedAction]) {
      return acc;
    }
    acc[guide.linkedAction] = guide.title;
    return acc;
  }, {});

  const normalizedEvents = timelineRows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at).toISOString(),
    is_reverted: Boolean(row.is_reverted),
    metadata: row.metadata ?? "{}",
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">FamilySync Dashboard</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        active_profile_id 쿠키가 있는 경우에만 접근 가능합니다.
      </p>
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
      <QuickActionPanel actions={quickActionRows} guideHints={guideHints} />
      <TimelineFeed initialEvents={normalizedEvents} />
    </main>
  );
}
