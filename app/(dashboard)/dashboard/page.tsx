import { and, asc, desc, eq, gte, isNotNull } from "drizzle-orm";
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
  const timelineSince = Date.now() - TIMELINE_LOOKBACK_MS;

  if (profile) {
    await ensureDefaultQuickActionsForFamily(profile.familyId);
  }

  const quickActionRows = profile
    ? await db
        .select({
          id: quickActions.id,
          label: quickActions.label,
          actionType: quickActions.actionType,
          target: quickActions.target,
        })
        .from(quickActions)
        .where(and(eq(quickActions.familyId, profile.familyId), eq(quickActions.isActive, true)))
        .orderBy(asc(quickActions.sortOrder), asc(quickActions.createdAt))
    : [];

  const timelineRows = profile
    ? await db
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
        .limit(500)
    : [];

  const guides = profile
    ? await db
        .select({ linkedAction: careGuides.linkedAction, title: careGuides.title })
        .from(careGuides)
        .where(and(eq(careGuides.familyId, profile.familyId), isNotNull(careGuides.linkedAction)))
        .orderBy(desc(careGuides.createdAt))
    : [];

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
      <DailyPinBanner />
      <QuickActionPanel actions={quickActionRows} guideHints={guideHints} />
      <TimelineFeed initialEvents={normalizedEvents} />
    </main>
  );
}
