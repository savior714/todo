"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import RecordEventModal, { type RecordDraft } from "@/app/(dashboard)/RecordEventModal";
import { undoEvent } from "@/app/actions/events";
import { summarizeEventMetadataForDisplay } from "@/lib/event-metadata";
import { getUndoWindowMsForActionType } from "@/lib/event-undo-policy";
import {
  addDays,
  formatDateKey,
  formatWeekdayLabel,
  getEventDisplayDateKey,
  parseDateKey,
  startOfLocalDay,
} from "@/lib/timeline-date";

type TimelineItem = {
  id: string;
  action_type: string;
  target: string;
  created_at: string;
  is_reverted: boolean;
  metadata: string;
};

type TimelineFeedProps = {
  initialEvents: TimelineItem[];
};

const SWIPE_PX = 56;

const ACTION_LABEL: Record<string, string> = {
  meal: "식사",
  medication: "투약",
  school_run: "등·하원",
  school_dropoff: "등원",
  school_pickup: "하원",
  brushing: "양치",
};

function labelForAction(actionType: string): string {
  return ACTION_LABEL[actionType] ?? actionType;
}

export default function TimelineFeed({ initialEvents }: TimelineFeedProps) {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineItem[]>(initialEvents);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [centerDate, setCenterDate] = useState(() => startOfLocalDay(new Date()));
  const [recordDateKey, setRecordDateKey] = useState<string | null>(null);
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const touchStartX = useRef<number | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const centerColumnRef = useRef<HTMLDivElement | null>(null);

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

  const effectiveRecordKey = recordDateKey ?? formatDateKey(centerDate);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  const refreshFromServer = useCallback(() => {
    router.refresh();
  }, [router]);

  const shiftWeek = useCallback((deltaDays: number) => {
    setCenterDate((c) => startOfLocalDay(addDays(c, deltaDays)));
  }, []);

  const selectDayColumn = useCallback((day: Date) => {
    setCenterDate(startOfLocalDay(day));
    setRecordDateKey(null);
  }, []);

  const openDatePicker = useCallback(() => {
    dateInputRef.current?.click();
  }, []);

  const handleUndo = (eventId: string) => {
    startTransition(async () => {
      await undoEvent(eventId);
      setEvents((prev) => prev.map((item) => (item.id === eventId ? { ...item, is_reverted: true } : item)));
      refreshFromServer();
    });
  };

  const onCalendarChange = (value: string) => {
    if (!value) {
      return;
    }
    setCenterDate(parseDateKey(value));
    setRecordDateKey(null);
  };

  const jumpToToday = () => {
    setCenterDate(startOfLocalDay(new Date()));
    setRecordDateKey(null);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">타임라인</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 text-lg dark:border-neutral-600 dark:bg-neutral-900"
            aria-label="이전 주"
          >
            «
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(7)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 text-lg dark:border-neutral-600 dark:bg-neutral-900"
            aria-label="다음 주"
          >
            »
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          >
            오늘
          </button>
          <label className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 dark:border-neutral-600 dark:bg-neutral-900">
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

      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        가운데 열 기준으로 어제·오늘·내일을 한 번에 보고, « » 로 한 주씩 이동합니다. 모바일에서는 아래
        세 열을 좌우로 스와이프해도 됩니다.
      </p>

      <div
        className="rounded-xl border border-neutral-200 dark:border-neutral-700"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.screenX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) {
            return;
          }
          const end = e.changedTouches[0]?.screenX ?? start;
          const dx = end - start;
          if (dx > SWIPE_PX) {
            shiftWeek(-7);
          } else if (dx < -SWIPE_PX) {
            shiftWeek(7);
          }
        }}
      >
        <div className="overflow-x-auto scroll-smooth sm:overflow-visible">
          <div className="grid w-full min-w-[21rem] grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-700 sm:min-w-[28rem]">
          {columnDays.map((day, colIndex) => {
            const key = formatDateKey(day);
            const items = eventsByDay.get(key) ?? [];
            const isSelected = effectiveRecordKey === key;
            return (
              <div
                key={key}
                ref={colIndex === 1 ? centerColumnRef : undefined}
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("article") || t.closest("button")) {
                    return;
                  }
                  selectDayColumn(day);
                }}
                className={`flex min-h-[200px] cursor-pointer flex-col gap-2 p-2 sm:p-3 ${isSelected ? "bg-blue-50/80 ring-2 ring-inset ring-blue-400/50 dark:bg-blue-950/30 dark:ring-blue-500/40" : "bg-white dark:bg-neutral-950"}`}
              >
                <div className="pointer-events-none w-full rounded-lg border border-transparent px-1 py-2 text-left">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {formatWeekdayLabel(day, todayKey, yesterdayKey, tomorrowKey)}
                  </p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{key}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">기록 없음</p>
                  ) : (
                    items.map((event) => {
                      const undoMs = getUndoWindowMsForActionType(event.action_type);
                      const canUndo =
                        Date.now() - new Date(event.created_at).getTime() <= undoMs;
                      const detailLines = summarizeEventMetadataForDisplay(event.metadata, event.action_type);
                      return (
                        <article
                          key={event.id}
                          className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-left dark:border-neutral-700 dark:bg-neutral-900/40"
                        >
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {labelForAction(event.action_type)}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-300">{event.target}</p>
                          {detailLines.length > 0 && (
                            <ul className="mt-1 list-inside list-disc text-[11px] text-neutral-600 dark:text-neutral-400">
                              {detailLines.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          )}
                          <p className="text-[10px] text-neutral-500">
                            {new Date(event.created_at).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {canUndo && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleUndo(event.id)}
                              className="mt-1 inline-flex min-h-[40px] items-center rounded-md bg-neutral-200 px-2 text-xs dark:bg-neutral-800"
                            >
                              실행 취소
                            </button>
                          )}
                        </article>
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

      <div className="rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-600">
        <button
          type="button"
          onClick={openDatePicker}
          className="w-full rounded-md px-0 py-1 text-left transition hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50"
        >
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            선택한 날짜에 기록:{" "}
            <span className="text-blue-700 dark:text-blue-300">{effectiveRecordKey}</span>
          </p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            이 영역이나 타임라인 열 아무 곳이나 눌러 날짜를 바꿀 수 있습니다. 달력(📅)으로 먼저 이동한 뒤
            기록해도 됩니다.
          </p>
        </button>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              setRecordDraft({ actionType: "meal", target: "family", label: "식사" })
            }
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm text-white disabled:opacity-60 sm:flex-none"
          >
            식사
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              setRecordDraft({ actionType: "medication", target: "kid4", label: "투약" })
            }
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm text-white disabled:opacity-60 sm:flex-none"
          >
            투약
          </button>
        </div>
      </div>

      <RecordEventModal
        draft={recordDraft}
        onClose={() => setRecordDraft(null)}
        timelineDate={effectiveRecordKey}
        onRecorded={refreshFromServer}
        showToast={showToast}
      />

      {toastMessage && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-neutral-900 px-4 py-3 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          {toastMessage}
        </p>
      )}
    </section>
  );
}
