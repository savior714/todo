import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { completeHomework, completeRoutineItem } from "@/app/actions/admin";
import { undoEvent } from "@/app/actions/events";
import TimelineFeed, {
  type HomeworkTypeForTimeline,
  type RoutineTypeForTimeline,
} from "@/app/(dashboard)/TimelineFeed";
import { db } from "@/db/client";
import {
  events,
  homeworkLogs,
  homeworkTypes as homeworkTypesTable,
  routineItems as routineItemsTable,
  routineLogs,
} from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard/perf";
import { TIMELINE_EVENT_LIMIT, TIMELINE_LOOKBACK_MS } from "@/lib/dashboard/timeline";
import { addDays, formatDateKey, startOfLocalDay } from "@/lib/timeline/date";

type TimelineFeedSectionProps = Readonly<{
  familyId: string;
}>;

function normalizeChildGroup(raw: string): "kid7" | "kid4" {
  return raw === "kid7" || raw === "kid4" ? raw : "kid4";
}

function normalizeRoutineTarget(raw: string): "kid7" | "kid4" | "family" {
  if (raw === "kid7" || raw === "kid4" || raw === "family") {
    return raw;
  }
  return "family";
}

export default async function TimelineFeedSection({ familyId }: TimelineFeedSectionProps) {
  const t0 = dashboardPerfNow();
  const timelineSince = new Date(Date.now() - TIMELINE_LOOKBACK_MS);

  const todayStart = startOfLocalDay(new Date());
  const minLogKey = formatDateKey(addDays(todayStart, -90));
  const maxLogKey = formatDateKey(addDays(todayStart, 14));
  const todayKey = formatDateKey(startOfLocalDay(new Date()));
  const yesterdayKey = formatDateKey(addDays(startOfLocalDay(new Date()), -1));
  const tomorrowKey = formatDateKey(addDays(startOfLocalDay(new Date()), 1));

  type TimelineRow = {
    id: string;
    action_type: string;
    target: string;
    created_at: Date | string;
    is_reverted: boolean | null;
    metadata: string | null;
  };

  type HomeworkTypeRow = {
    id: string;
    title: string;
    childGroup: string;
  };

  type HomeworkLogRow = {
    dateKey: string;
    homeworkTypeId: string;
  };

  type RoutineTypeRow = {
    id: string;
    title: string;
    target: string;
  };

  type RoutineLogRow = {
    dateKey: string;
    routineItemId: string;
  };

  let timelineRows: TimelineRow[] = [];
  let hwRows: HomeworkTypeRow[] = [];
  let logRows: HomeworkLogRow[] = [];
  let rtRows: RoutineTypeRow[] = [];
  let routineLogRows: RoutineLogRow[] = [];

  try {
    [timelineRows, hwRows, logRows, rtRows, routineLogRows] = await Promise.all([
      db
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
          and(eq(events.familyId, familyId), eq(events.isReverted, false), gte(events.createdAt, timelineSince))
        )
        .orderBy(desc(events.createdAt))
        .limit(TIMELINE_EVENT_LIMIT),
      db
        .select({
          id: homeworkTypesTable.id,
          title: homeworkTypesTable.title,
          childGroup: homeworkTypesTable.childGroup,
        })
        .from(homeworkTypesTable)
        .where(and(eq(homeworkTypesTable.familyId, familyId), eq(homeworkTypesTable.isActive, true)))
        .orderBy(asc(homeworkTypesTable.createdAt)),
      db
        .select({
          dateKey: homeworkLogs.dateKey,
          homeworkTypeId: homeworkLogs.homeworkTypeId,
        })
        .from(homeworkLogs)
        .where(
          and(eq(homeworkLogs.familyId, familyId), gte(homeworkLogs.dateKey, minLogKey), lte(homeworkLogs.dateKey, maxLogKey))
        ),
      db
        .select({
          id: routineItemsTable.id,
          title: routineItemsTable.title,
          target: routineItemsTable.target,
        })
        .from(routineItemsTable)
        .where(and(eq(routineItemsTable.familyId, familyId), eq(routineItemsTable.isActive, true)))
        .orderBy(asc(routineItemsTable.sortOrder), asc(routineItemsTable.createdAt)),
      db
        .select({
          dateKey: routineLogs.dateKey,
          routineItemId: routineLogs.routineItemId,
        })
        .from(routineLogs)
        .where(
          and(eq(routineLogs.familyId, familyId), gte(routineLogs.dateKey, minLogKey), lte(routineLogs.dateKey, maxLogKey))
        ),
    ]);
  } catch (err) {
    console.error("[TimelineFeedSection] DB query failed", {
      familyId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logDashboardPerf("timeline", t0);

  const normalizedEvents = timelineRows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at).toISOString(),
    is_reverted: Boolean(row.is_reverted),
    metadata: row.metadata ?? "{}",
  }));

  const homeworkTypes: HomeworkTypeForTimeline[] = hwRows.map((row) => ({
    id: row.id,
    title: row.title,
    childGroup: normalizeChildGroup(row.childGroup),
  }));

  const homeworkLoggedKeys = logRows.map((r) => `${r.dateKey}|${r.homeworkTypeId}`);

  const routineTypes: RoutineTypeForTimeline[] = rtRows.map((row) => ({
    id: row.id,
    title: row.title,
    target: normalizeRoutineTarget(row.target),
  }));

  const routineLoggedKeys = routineLogRows.map((r) => `${r.dateKey}|${r.routineItemId}`);

  return (
    <TimelineFeed
      initialTodayKey={todayKey}
      initialYesterdayKey={yesterdayKey}
      initialTomorrowKey={tomorrowKey}
      initialEvents={normalizedEvents}
      undoEventAction={undoEvent}
      homeworkTypes={homeworkTypes}
      homeworkLoggedKeys={homeworkLoggedKeys}
      completeHomeworkAction={completeHomework}
      routineTypes={routineTypes}
      routineLoggedKeys={routineLoggedKeys}
      completeRoutineAction={completeRoutineItem}
    />
  );
}
