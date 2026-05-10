"use client";

import { useMemo, useState, useTransition } from "react";
import { undoEvent } from "@/app/actions/events";

type TimelineItem = {
  id: string;
  action_type: string;
  target: string;
  created_at: string;
  is_reverted: boolean;
};

type TimelineFeedProps = {
  initialEvents: TimelineItem[];
};

const UNDO_WINDOW_MS = 5 * 60 * 1000;

export default function TimelineFeed({ initialEvents }: TimelineFeedProps) {
  const [events, setEvents] = useState<TimelineItem[]>(initialEvents);
  const [isPending, startTransition] = useTransition();

  const visibleEvents = useMemo(() => events.filter((event) => !event.is_reverted), [events]);

  const handleUndo = (eventId: string) => {
    startTransition(async () => {
      await undoEvent(eventId);
      setEvents((prev) => prev.map((item) => (item.id === eventId ? { ...item, is_reverted: true } : item)));
    });
  };

  return (
    <section className="mt-4 grid gap-2">
      <h2 className="text-xl font-semibold">최근 타임라인</h2>
      {visibleEvents.map((event) => {
        const canUndo = Date.now() - new Date(event.created_at).getTime() <= UNDO_WINDOW_MS;

        return (
          <article key={event.id} className="rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
            <p className="font-medium">{event.action_type}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{event.target}</p>
            <p className="text-xs text-neutral-500">{new Date(event.created_at).toLocaleString()}</p>
            {canUndo && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleUndo(event.id)}
                className="mt-2 inline-flex min-h-[44px] items-center rounded-md bg-neutral-200 px-3 text-sm dark:bg-neutral-800"
              >
                Undo
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
