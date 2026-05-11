import { and, desc, eq, gte } from "drizzle-orm";
import { undoEvent } from "@/app/actions/events";
import TimelineFeed from "@/app/(dashboard)/TimelineFeed";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard-perf";
import { TIMELINE_EVENT_LIMIT, TIMELINE_LOOKBACK_MS } from "@/lib/dashboard-timeline";

type TimelineFeedSectionProps = Readonly<{
  familyId: string;
}>;

export default async function TimelineFeedSection({ familyId }: TimelineFeedSectionProps) {
  const t0 = dashboardPerfNow();
  const timelineSince = Date.now() - TIMELINE_LOOKBACK_MS;

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
        eq(events.familyId, familyId),
        eq(events.isReverted, false),
        gte(events.createdAt, timelineSince)
      )
    )
    .orderBy(desc(events.createdAt))
    .limit(TIMELINE_EVENT_LIMIT);

  logDashboardPerf("timeline", t0);

  const normalizedEvents = timelineRows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at).toISOString(),
    is_reverted: Boolean(row.is_reverted),
    metadata: row.metadata ?? "{}",
  }));

  return <TimelineFeed initialEvents={normalizedEvents} undoEventAction={undoEvent} />;
}
