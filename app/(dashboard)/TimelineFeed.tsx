"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TimelineEventDetailModal, { type TimelineDetailOpen } from "@/app/(dashboard)/TimelineEventDetailModal";
import { formatEventTargetForDisplay, summarizeEventMetadataForDisplay } from "@/lib/event-metadata";
import { getUndoWindowMsForActionType } from "@/lib/event-undo-policy";
import { timelineActionLabel } from "@/lib/timeline-action-labels";
import {
  addDays,
  formatDateKey,
  formatWeekdayLabel,
  getEventDisplayDateKey,
  parseDateKey,
  startOfLocalDay,
} from "@/lib/timeline-date";

export type TimelineItem = {
  id: string;
  action_type: string;
  target: string;
  created_at: string;
  is_reverted: boolean;
  metadata: string;
};

export type HomeworkTypeForTimeline = {
  id: string;
  title: string;
  childGroup: "kid7" | "kid4";
};

export type RoutineTypeForTimeline = {
  id: string;
  title: string;
  target: "kid7" | "kid4" | "family";
};

type TimelineSlot =
  | {
      key: string;
      kind: "homework_pending";
      dateKey: string;
      homeworkTypeId: string;
      title: string;
      childGroup: "kid7" | "kid4";
    }
  | {
      key: string;
      kind: "routine_pending";
      dateKey: string;
      routineItemId: string;
      title: string;
      target: "kid7" | "kid4" | "family";
    }
  | { key: string; kind: "event"; event: TimelineItem };

type TimelineFeedProps = {
  initialEvents: TimelineItem[];
  undoEventAction: (eventId: string) => Promise<unknown>;
  homeworkTypes: HomeworkTypeForTimeline[];
  homeworkLoggedKeys: string[];
  completeHomeworkAction: (homeworkTypeId: string, dateKey?: string) => Promise<unknown>;
  routineTypes: RoutineTypeForTimeline[];
  routineLoggedKeys: string[];
  completeRoutineAction: (routineItemId: string, dateKey?: string) => Promise<unknown>;
};

export default function TimelineFeed({
  initialEvents,
  undoEventAction,
  homeworkTypes,
  homeworkLoggedKeys,
  completeHomeworkAction,
  routineTypes,
  routineLoggedKeys,
  completeRoutineAction,
}: TimelineFeedProps) {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineItem[]>(initialEvents);
  const [centerDate, setCenterDate] = useState(() => startOfLocalDay(new Date()));
  const [detailOpen, setDetailOpen] = useState<TimelineDetailOpen>({ kind: "closed" });
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const centerColumnRef = useRef<HTMLDivElement | null>(null);

  const todayLocalKey = formatDateKey(startOfLocalDay(new Date()));

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const todayStart = startOfLocalDay(new Date());
  const yesterdayKey = formatDateKey(addDays(todayStart, -1));
  const todayKey = formatDateKey(todayStart);
  const tomorrowKey = formatDateKey(addDays(todayStart, 1));

  const visibleEvents = useMemo(() => events.filter((event) => !event.is_reverted), [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const event of visibleEvents) {
      const key = getEventDisplayDateKey(event.created_at, event.metadata);
      const list = map.get(key);
      if (list) {
        list.push(event);
      } else {
        map.set(key, [event]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return map;
  }, [visibleEvents]);

  const columnDays = useMemo(() => [-1, 0, 1].map((o) => addDays(centerDate, o)), [centerDate]);

  const loggedHomeworkSet = useMemo(() => new Set(homeworkLoggedKeys), [homeworkLoggedKeys]);
  const loggedRoutineSet = useMemo(() => new Set(routineLoggedKeys), [routineLoggedKeys]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, TimelineSlot[]>();
    const keys = new Set<string>();
    for (const k of eventsByDay.keys()) {
      keys.add(k);
    }
    for (const d of columnDays) {
      keys.add(formatDateKey(d));
    }
    for (const dayKey of keys) {
      const dayEvents = eventsByDay.get(dayKey) ?? [];
      const slots: TimelineSlot[] = [];
      if (dayKey <= todayLocalKey) {
        for (const hw of homeworkTypes) {
          if (!loggedHomeworkSet.has(`${dayKey}|${hw.id}`)) {
            slots.push({
              key: `pending-hw-${dayKey}-${hw.id}`,
              kind: "homework_pending",
              dateKey: dayKey,
              homeworkTypeId: hw.id,
              title: hw.title,
              childGroup: hw.childGroup,
            });
          }
        }
        for (const rt of routineTypes) {
          if (!loggedRoutineSet.has(`${dayKey}|${rt.id}`)) {
            slots.push({
              key: `pending-rt-${dayKey}-${rt.id}`,
              kind: "routine_pending",
              dateKey: dayKey,
              routineItemId: rt.id,
              title: rt.title,
              target: rt.target,
            });
          }
        }
      }
      for (const event of dayEvents) {
        slots.push({ key: `event-${event.id}`, kind: "event", event });
      }
      map.set(dayKey, slots);
    }
    return map;
  }, [columnDays, eventsByDay, homeworkTypes, loggedHomeworkSet, loggedRoutineSet, routineTypes, todayLocalKey]);

  const centerDateKey = formatDateKey(centerDate);

  const refreshFromServer = useCallback(() => {
    router.refresh();
  }, [router]);

  const shiftWeek = useCallback((deltaDays: number) => {
    setCenterDate((c) => startOfLocalDay(addDays(c, deltaDays)));
  }, []);

  const selectDayColumn = useCallback((day: Date) => {
    setCenterDate(startOfLocalDay(day));
  }, []);

  const handleUndoWithRefresh = useCallback(
    async (eventId: string) => {
      await undoEventAction(eventId);
      setEvents((prev) => prev.map((item) => (item.id === eventId ? { ...item, is_reverted: true } : item)));
      refreshFromServer();
    },
    [undoEventAction, refreshFromServer]
  );

  const onCalendarChange = (value: string) => {
    if (!value) {
      return;
    }
    setCenterDate(parseDateKey(value));
  };

  const jumpToToday = () => {
    setCenterDate(startOfLocalDay(new Date()));
  };

  const hasCenteredInitially = useRef(false);
  useEffect(() => {
    if (!hasCenteredInitially.current) {
      hasCenteredInitially.current = true;
      return;
    }
    centerColumnRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [centerDate]);

  return (
    <section className="mt-6 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
          타임라인
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg font-semibold leading-none dark:border-neutral-600 dark:bg-neutral-900"
            aria-label="이전 주"
          >
            «
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(7)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg font-semibold leading-none dark:border-neutral-600 dark:bg-neutral-900"
            aria-label="다음 주"
          >
            »
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3.5 text-[0.9375rem] font-semibold leading-none dark:border-neutral-600 dark:bg-neutral-900"
          >
            오늘
          </button>
          <label className="relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900">
            <span className="text-lg leading-none" aria-hidden>
              📅
            </span>
            <span className="sr-only">날짜로 이동</span>
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={formatDateKey(centerDate)}
              onChange={(e) => onCalendarChange(e.target.value)}
              aria-label="날짜 선택"
            />
          </label>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        가운데 열 기준으로 어제·오늘·내일을 한 번에 보고, « » 로 한 주씩 이동합니다. 날짜 열을 터치하면
        해당 날짜가 가운데로 정렬됩니다. 카드를 누르면 상세를 보거나 숙제·루틴 완료를 체크할 수 있습니다.
      </p>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="overflow-x-hidden scroll-smooth sm:overflow-visible">
          <div className="grid w-full min-w-[21rem] grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-700 sm:min-w-[28rem]">
          {columnDays.map((day, colIndex) => {
            const key = formatDateKey(day);
            const slots = slotsByDay.get(key) ?? [];
            const isSelected = centerDateKey === key;
            return (
              <div
                key={key}
                ref={colIndex === 1 ? centerColumnRef : undefined}
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("button")) {
                    return;
                  }
                  selectDayColumn(day);
                }}
                className={`flex min-h-[280px] cursor-pointer flex-col gap-2 p-2 sm:p-3 ${isSelected ? "bg-blue-50/80 ring-2 ring-inset ring-blue-400/50 dark:bg-blue-950/30 dark:ring-blue-500/40" : "bg-white dark:bg-neutral-950"}`}
              >
                <div className="pointer-events-none w-full rounded-lg border border-transparent px-1 py-2 text-left">
                  <p className="text-xs font-medium leading-snug text-neutral-500 dark:text-neutral-400">
                    {formatWeekdayLabel(day, todayKey, yesterdayKey, tomorrowKey)}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
                    {key}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {slots.length === 0 ? (
                    <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">기록 없음</p>
                  ) : (
                    slots.map((slot) => {
                      if (slot.kind === "homework_pending") {
                        return (
                          <button
                            key={slot.key}
                            type="button"
                            onClick={() =>
                              setDetailOpen({
                                kind: "homework_pending",
                                dateKey: slot.dateKey,
                                homeworkTypeId: slot.homeworkTypeId,
                                title: slot.title,
                                childGroup: slot.childGroup,
                              })
                            }
                            className="rounded-lg border border-dashed border-emerald-400/80 bg-emerald-50/60 p-2.5 text-left dark:border-emerald-600/60 dark:bg-emerald-950/25"
                          >
                            <p className="text-sm font-semibold leading-snug text-emerald-900 dark:text-emerald-100">
                              숙제 (미완료)
                            </p>
                            <p className="mt-0.5 text-xs font-medium leading-relaxed text-emerald-800/90 dark:text-emerald-200/90">
                              {slot.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-emerald-700/85 dark:text-emerald-300/85">
                              {slot.childGroup === "kid7" ? "주원이 (첫째)" : "승원이 (둘째)"}
                            </p>
                          </button>
                        );
                      }
                      if (slot.kind === "routine_pending") {
                        const who =
                          slot.target === "family"
                            ? "가족 공통"
                            : slot.target === "kid7"
                              ? "주원이 (첫째)"
                              : "승원이 (둘째)";
                        return (
                          <button
                            key={slot.key}
                            type="button"
                            onClick={() =>
                              setDetailOpen({
                                kind: "routine_pending",
                                dateKey: slot.dateKey,
                                routineItemId: slot.routineItemId,
                                title: slot.title,
                                target: slot.target,
                              })
                            }
                            className="rounded-lg border border-dashed border-violet-400/80 bg-violet-50/60 p-2.5 text-left dark:border-violet-600/60 dark:bg-violet-950/25"
                          >
                            <p className="text-sm font-semibold leading-snug text-violet-900 dark:text-violet-100">
                              루틴 (미완료)
                            </p>
                            <p className="mt-0.5 text-xs font-medium leading-relaxed text-violet-800/90 dark:text-violet-200/90">
                              {slot.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-violet-700/85 dark:text-violet-300/85">
                              {who}
                            </p>
                          </button>
                        );
                      }
                      const event = slot.event;
                      const undoMs = getUndoWindowMsForActionType(event.action_type);
                      const canUndo =
                        Date.now() - new Date(event.created_at).getTime() <= undoMs;
                      const detailLines = summarizeEventMetadataForDisplay(event.metadata, event.action_type);
                      return (
                        <button
                          key={slot.key}
                          type="button"
                          onClick={() => setDetailOpen({ kind: "event", event })}
                          className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-left dark:border-neutral-700 dark:bg-neutral-900/40"
                        >
                          <p className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                            {timelineActionLabel(event.action_type)}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                            {formatEventTargetForDisplay(event.target)}
                          </p>
                          {detailLines.length > 0 && (
                            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                              {detailLines.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-1.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                            {new Date(event.created_at).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {canUndo && (
                            <p className="mt-1.5 text-xs font-medium leading-none text-neutral-600 dark:text-neutral-300">
                              실행 취소는 상세에서
                            </p>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <TimelineEventDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen({ kind: "closed" })}
        undoEventAction={handleUndoWithRefresh}
        completeHomeworkAction={completeHomeworkAction}
        completeRoutineAction={completeRoutineAction}
        onAfterMutation={refreshFromServer}
      />
    </section>
  );
}
