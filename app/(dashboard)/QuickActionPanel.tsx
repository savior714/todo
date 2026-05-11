"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import RecordEventModal, { type CreateEventAction, type RecordDraft } from "@/app/(dashboard)/RecordEventModal";

export type QuickActionButton = {
  id: string;
  label: string;
  actionType: string;
  target: string;
};

export type HomeworkQuickShortcut = {
  id: string;
  title: string;
  childGroup: "kid7" | "kid4";
  completedToday: boolean;
};

const CHILD_GROUP_LABEL: Record<HomeworkQuickShortcut["childGroup"], string> = {
  kid7: "주원이",
  kid4: "승원이",
};

/** 패널 내 블록 제목 (퀵 액션 / 오늘 숙제) — 동일 크기 */
const panelBlockHeadingClass =
  "text-lg font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50";

/** 섹션 헤더 오른쪽 보조 링크: 높이·글자 크기 통일 (대시보드 툴바) */
const toolbarSecondaryLinkClass =
  "inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3.5 text-[0.9375rem] font-semibold leading-none text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900";

type QuickActionPanelProps = {
  actions: QuickActionButton[];
  homeworkShortcuts?: HomeworkQuickShortcut[];
  /** 관리자 프로필일 때만 `/admin` 편집 링크를 노출한다. */
  showAdminSettingsLink?: boolean;
  completeHomeworkAction: (homeworkTypeId: string) => Promise<unknown>;
  createEventAction: CreateEventAction;
};

export default function QuickActionPanel({
  actions,
  homeworkShortcuts = [],
  showAdminSettingsLink = false,
  completeHomeworkAction,
  createEventAction,
}: QuickActionPanelProps) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [hwPendingId, setHwPendingId] = useState<string | null>(null);
  const [, startHwTransition] = useTransition();

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const hasEventActions = actions.length > 0;
  const hasHomework = homeworkShortcuts.length > 0;
  const isEmpty = !hasEventActions && !hasHomework;

  const handleHomeworkComplete = (homeworkTypeId: string) => {
    if (!navigator.onLine) {
      showToast("인터넷 연결이 필요합니다.");
      return;
    }
    setHwPendingId(homeworkTypeId);
    startHwTransition(async () => {
      try {
        await completeHomeworkAction(homeworkTypeId);
        showToast("숙제 완료로 기록했습니다.");
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "처리에 실패했습니다.";
        showToast(message);
      } finally {
        setHwPendingId(null);
      }
    });
  };

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className={panelBlockHeadingClass}>퀵 액션</h2>
        {showAdminSettingsLink ? (
          <Link href="/admin#quick-actions-admin" className={toolbarSecondaryLinkClass}>
            퀵 액션 편집
          </Link>
        ) : null}
      </div>
      {isEmpty ? (
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          등록된 버튼이 없고 오늘 표시할 숙제도 없습니다. 관리자는{" "}
          <span className="font-medium text-neutral-800 dark:text-neutral-200">/admin</span>
          에서 퀵 액션·숙제 유형을 추가할 수 있습니다.
        </p>
      ) : (
        <>
          {hasEventActions && (
            <div className="grid gap-3 sm:grid-cols-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() =>
                    setDraft({
                      actionType: action.actionType,
                      target: action.target,
                      label: action.label,
                    })
                  }
                  className="inline-flex min-h-[60px] w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white disabled:opacity-60 sm:text-base"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {hasHomework && (
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h3 className={panelBlockHeadingClass}>오늘 숙제</h3>
                {showAdminSettingsLink ? (
                  <Link href="/admin#homework-types-admin" className={toolbarSecondaryLinkClass}>
                    숙제 유형 관리
                  </Link>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {homeworkShortcuts.map((hw) => {
                  const busy = hwPendingId === hw.id;
                  return (
                    <article key={hw.id} className="grid gap-1">
                      <button
                        type="button"
                        disabled={hw.completedToday || busy}
                        onClick={() => handleHomeworkComplete(hw.id)}
                        className="inline-flex min-h-[60px] w-full flex-col items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 py-3 text-center text-white disabled:opacity-60"
                      >
                        <span className="text-[0.9375rem] font-semibold leading-tight tracking-tight sm:text-base">
                          {hw.title}
                        </span>
                        <span className="text-xs font-medium leading-snug text-white/90">
                          {CHILD_GROUP_LABEL[hw.childGroup]}
                        </span>
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      <RecordEventModal
        draft={draft}
        onClose={() => setDraft(null)}
        onRecorded={() => router.refresh()}
        showToast={showToast}
        createEventAction={createEventAction}
      />
      {toastMessage && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          {toastMessage}
        </p>
      )}
    </section>
  );
}
