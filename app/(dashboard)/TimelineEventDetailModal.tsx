"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { TimelineItem } from "@/app/(dashboard)/TimelineFeed";
import { formatEventTargetForDisplay, summarizeEventMetadataForDisplay } from "@/lib/event-metadata";
import { getUndoWindowMsForActionType } from "@/lib/event-undo-policy";
import { timelineActionLabel } from "@/lib/timeline-action-labels";

export type TimelineDetailOpen =
  | { kind: "closed" }
  | { kind: "event"; event: TimelineItem }
  | {
      kind: "homework_pending";
      dateKey: string;
      homeworkTypeId: string;
      title: string;
      childGroup: "kid7" | "kid4";
    }
  | {
      kind: "routine_pending";
      dateKey: string;
      routineItemId: string;
      title: string;
      target: "kid7" | "kid4" | "family";
    };

const CHILD_GROUP_LABEL: Record<"kid7" | "kid4", string> = {
  kid7: "주원이",
  kid4: "승원이",
};

const ROUTINE_TARGET_LABEL: Record<"kid7" | "kid4" | "family", string> = {
  kid7: "주원이 (첫째)",
  kid4: "승원이 (둘째)",
  family: "가족 공통",
};

type TimelineEventDetailModalProps = {
  open: TimelineDetailOpen;
  onClose: () => void;
  undoEventAction: (eventId: string) => Promise<unknown>;
  completeHomeworkAction: (homeworkTypeId: string, dateKey?: string) => Promise<unknown>;
  completeRoutineAction: (routineItemId: string, dateKey?: string) => Promise<unknown>;
  onAfterMutation: () => void;
};

export default function TimelineEventDetailModal({
  open,
  onClose,
  undoEventAction,
  completeHomeworkAction,
  completeRoutineAction,
  onAfterMutation,
}: TimelineEventDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) {
      return;
    }
    if (open.kind !== "closed") {
      setErrorMessage(null);
      el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  const handleDialogClose = () => {
    onClose();
  };

  if (open.kind === "closed") {
    return null;
  }

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const runUndo = () => {
    if (open.kind !== "event") {
      return;
    }
    startTransition(async () => {
      try {
        await undoEventAction(open.event.id);
        closeDialog();
        onAfterMutation();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "실행 취소에 실패했습니다.");
      }
    });
  };

  const runCompleteHomework = () => {
    if (open.kind !== "homework_pending") {
      return;
    }
    if (!navigator.onLine) {
      setErrorMessage("인터넷 연결이 필요합니다.");
      return;
    }
    startTransition(async () => {
      try {
        await completeHomeworkAction(open.homeworkTypeId, open.dateKey);
        closeDialog();
        onAfterMutation();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "완료 처리에 실패했습니다.");
      }
    });
  };

  const runCompleteRoutine = () => {
    if (open.kind !== "routine_pending") {
      return;
    }
    if (!navigator.onLine) {
      setErrorMessage("인터넷 연결이 필요합니다.");
      return;
    }
    startTransition(async () => {
      try {
        await completeRoutineAction(open.routineItemId, open.dateKey);
        closeDialog();
        onAfterMutation();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "완료 처리에 실패했습니다.");
      }
    });
  };

  const headerTitle =
    open.kind === "event"
      ? `${timelineActionLabel(open.event.action_type)} · 상세`
      : open.kind === "homework_pending"
        ? "숙제 · 완료"
        : "루틴 · 완료";

  return (
    <dialog
      ref={dialogRef}
      className="dialog-record m-auto max-h-none w-[min(36rem,calc(100vw-1rem))] max-w-none border-0 bg-transparent p-0 shadow-none"
      aria-labelledby="timeline-detail-title"
      onClose={handleDialogClose}
    >
      <div className="dialog-record-panel flex max-h-[min(90dvh,48rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 px-4 py-3.5 dark:border-neutral-700">
          <h2
            id="timeline-detail-title"
            className="text-lg font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50"
          >
            {headerTitle}
          </h2>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
          {open.kind === "event" ? (
            <EventBody event={open.event} isPending={isPending} onUndo={runUndo} />
          ) : open.kind === "homework_pending" ? (
            <HomeworkPendingBody open={open} isPending={isPending} onComplete={runCompleteHomework} />
          ) : (
            <RoutinePendingBody open={open} isPending={isPending} onComplete={runCompleteRoutine} />
          )}
          {errorMessage && (
            <p role="alert" className="text-sm leading-relaxed text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
        </div>

        <footer className="border-t border-neutral-200 bg-white px-4 py-3.5 dark:border-neutral-700 dark:bg-neutral-950">
          <button
            type="button"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-medium leading-snug dark:border-neutral-600"
            onClick={() => dialogRef.current?.close()}
          >
            닫기
          </button>
        </footer>
      </div>
    </dialog>
  );
}

function EventBody({
  event,
  isPending,
  onUndo,
}: {
  event: TimelineItem;
  isPending: boolean;
  onUndo: () => void;
}) {
  const undoMs = getUndoWindowMsForActionType(event.action_type);
  const canUndo = Date.now() - new Date(event.created_at).getTime() <= undoMs;
  const detailLines = summarizeEventMetadataForDisplay(event.metadata, event.action_type);
  const isHomework = event.action_type === "homework";
  const isRoutine = event.action_type === "routine_check";

  return (
    <>
      <p className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
        {timelineActionLabel(event.action_type)}
      </p>
      <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
        {formatEventTargetForDisplay(event.target)}
      </p>
      {detailLines.length > 0 && (
        <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          {detailLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {new Date(event.created_at).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
      {isHomework && (
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          이미 해당 날짜에 완료로 기록된 숙제입니다.
        </p>
      )}
      {isRoutine && (
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          이미 해당 날짜에 완료로 기록된 루틴입니다.
        </p>
      )}
      {canUndo && (
        <button
          type="button"
          disabled={isPending}
          onClick={onUndo}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-neutral-200 px-3 text-sm font-medium leading-none dark:bg-neutral-800"
        >
          {isPending ? "처리 중…" : "실행 취소"}
        </button>
      )}
    </>
  );
}

function HomeworkPendingBody({
  open,
  isPending,
  onComplete,
}: {
  open: Extract<TimelineDetailOpen, { kind: "homework_pending" }>;
  isPending: boolean;
  onComplete: () => void;
}) {
  return (
    <>
      <p className="text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-100">{open.title}</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{CHILD_GROUP_LABEL[open.childGroup]}</p>
      <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">날짜: {open.dateKey}</p>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        아래 버튼으로 이 날짜의 숙제를 완료로 기록합니다.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={onComplete}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold leading-snug text-white disabled:opacity-60"
      >
        {isPending ? "저장 중…" : "완료 체크"}
      </button>
    </>
  );
}

function RoutinePendingBody({
  open,
  isPending,
  onComplete,
}: {
  open: Extract<TimelineDetailOpen, { kind: "routine_pending" }>;
  isPending: boolean;
  onComplete: () => void;
}) {
  return (
    <>
      <p className="text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-100">{open.title}</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{ROUTINE_TARGET_LABEL[open.target]}</p>
      <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">날짜: {open.dateKey}</p>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        다른 보호자도 동일하게 완료 체크할 수 있습니다.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={onComplete}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold leading-snug text-white disabled:opacity-60"
      >
        {isPending ? "저장 중…" : "완료 체크"}
      </button>
    </>
  );
}
