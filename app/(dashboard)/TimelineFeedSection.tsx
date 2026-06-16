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
import { safeDbQuery } from "@/lib/dashboard/error";
import { TIMELINE_EVENT_LIMIT, TIMELINE_LOOKBACK_MS } from "@/lib/dashboard/timeline";
import { addDays, formatDateKey, startOfLocalDay } from "@/lib/timeline/date";
import { normalizeChildGroup, normalizeRoutineTarget } from "@/lib/children";

type TimelineFeedSectionProps = Readonly<{
  familyId: string;
}>;

export default async function TimelineFeedSection({ familyId }: TimelineFeedSectionProps) {
  const t0 = dashboardPerfNow();
  const timelineSince = new Date(Date.now() - TIMELINE_LOOKBACK_MS);

  const todayStart = startOfLocalDay(new Date());
  const minLogKey = formatDateKey(addDays(todayStart, -90));
  const maxLogKey = formatDateKey(addDays(todayStart, 14));
  const todayKey = formatDateKey(startOfLocalDay(new Date()));
  const yesterdayKey = formatDateKey(addDays(startOfLocalDay(new Date()), -1));
  const tomorrowKey = formatDateKey(addDays(startOfLocalDay(new Date()), 1));

  const { rows: timelineRows, failed: timelineFailed } = await safeDbQuery(
    () =>
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
    "timeline_events",
    { familyId }
  );

  const { rows: hwRows, failed: hwTypesFailed } = await safeDbQuery(
    () =>
      db
        .select({
          id: homeworkTypesTable.id,
          title: homeworkTypesTable.title,
          childGroup: homeworkTypesTable.childGroup,
        })
        .from(homeworkTypesTable)
        .where(and(eq(homeworkTypesTable.familyId, familyId), eq(homeworkTypesTable.isActive, true)))
        .orderBy(asc(homeworkTypesTable.createdAt)),
    "timeline_homework_types",
    { familyId }
  );

  const { rows: logRows, failed: hwLogsFailed } = await safeDbQuery(
    () =>
      db
        .select({
          dateKey: homeworkLogs.dateKey,
          homeworkTypeId: homeworkLogs.homeworkTypeId,
        })
        .from(homeworkLogs)
        .where(
          and(eq(homeworkLogs.familyId, familyId), eq(homeworkLogs.isReverted, false), gte(homeworkLogs.dateKey, minLogKey), lte(homeworkLogs.dateKey, maxLogKey))
        ),
    "timeline_homework_logs",
    { familyId }
  );

  const { rows: rtRows, failed: rtTypesFailed } = await safeDbQuery(
    () =>
      db
        .select({
          id: routineItemsTable.id,
          title: routineItemsTable.title,
          target: routineItemsTable.target,
        })
        .from(routineItemsTable)
        .where(and(eq(routineItemsTable.familyId, familyId), eq(routineItemsTable.isActive, true)))
        .orderBy(asc(routineItemsTable.sortOrder), asc(routineItemsTable.createdAt)),
    "timeline_routine_types",
    { familyId }
  );

  const { rows: routineLogRows, failed: rtLogsFailed } = await safeDbQuery(
    () =>
      db
        .select({
          dateKey: routineLogs.dateKey,
          routineItemId: routineLogs.routineItemId,
        })
        .from(routineLogs)
        .where(
          and(eq(routineLogs.familyId, familyId), eq(routineLogs.isReverted, false), gte(routineLogs.dateKey, minLogKey), lte(routineLogs.dateKey, maxLogKey))
        ),
    "timeline_routine_logs",
    { familyId }
  );

  logDashboardPerf("timeline", t0);

  const hasTimelineError = timelineFailed || hwTypesFailed || hwLogsFailed || rtTypesFailed || rtLogsFailed;

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
    <>
      {hasTimelineError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
        >
          타임라인 데이터를 불러오지 못했습니다.
        </p>
      )}
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
    </>
  );
}
