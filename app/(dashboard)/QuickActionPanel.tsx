"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import RecordEventModal, { type CreateEventAction, type RecordDraft } from "@/app/(dashboard)/RecordEventModal";
import QuickActionsAdminModal, { type QuickActionAdminRow } from "@/app/(dashboard)/QuickActionsAdminModal";
import HomeworkTypesAdminModal, { type HomeworkTypeAdminRow } from "@/app/(dashboard)/HomeworkTypesAdminModal";
import RoutineItemsAdminModal, { type RoutineItemAdminRow } from "@/app/(dashboard)/RoutineItemsAdminModal";

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
  /** 관리자 프로필일 때만 편집 모달을 노출한다. */
  showAdminSettingsLink?: boolean;
  /** 관리자용 퀵 액션 행 (모달에 전달) */
  quickActionRows?: QuickActionAdminRow[];
  /** 관리자용 숙제 유형 행 (모달에 전달) */
  homeworkTypeRows?: HomeworkTypeAdminRow[];
  /** 관리자용 루틴 체크 행 (모달에 전달) */
  routineItemRows?: RoutineItemAdminRow[];
  completeHomeworkAction: (homeworkTypeId: string, dateKey?: string) => Promise<unknown>;
  createEventAction: CreateEventAction;
};

export default function QuickActionPanel({
  actions,
  homeworkShortcuts = [],
  showAdminSettingsLink = false,
  quickActionRows = [],
  homeworkTypeRows = [],
  routineItemRows = [],
  completeHomeworkAction,
  createEventAction,
}: QuickActionPanelProps) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [hwPendingId, setHwPendingId] = useState<string | null>(null);
  const [quickActionsModalOpen, setQuickActionsModalOpen] = useState(false);
  const [homeworkTypesModalOpen, setHomeworkTypesModalOpen] = useState(false);
  const [routineItemsModalOpen, setRoutineItemsModalOpen] = useState(false);
  const [, startHwTransition] = useTransition();

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const hasEventActions = actions.length > 0;
  const hasHomework = homeworkShortcuts.length > 0;

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
          <button
            type="button"
            onClick={() => setQuickActionsModalOpen(true)}
            className={toolbarSecondaryLinkClass}
          >
            퀵 액션 편집
          </button>
        ) : null}
      </div>
      {hasEventActions ? (
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
      ) : (
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          등록된 퀵 액션이 없습니다. 관리자는{" "}
          <span className="font-medium text-neutral-800 dark:text-neutral-200">/admin</span>의 퀵 액션
          편집에서 추가할 수 있습니다.
        </p>
      )}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h3 className={panelBlockHeadingClass}>오늘 숙제</h3>
          {showAdminSettingsLink ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setHomeworkTypesModalOpen(true)}
                className={toolbarSecondaryLinkClass}
              >
                숙제 유형 관리
              </button>
              <button
                type="button"
                onClick={() => setRoutineItemsModalOpen(true)}
                className={toolbarSecondaryLinkClass}
              >
                루틴 체크 관리
              </button>
            </div>
          ) : null}
        </div>
        {hasHomework ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {homeworkShortcuts.filter((hw) => !hw.completedToday).map((hw) => {
              const busy = hwPendingId === hw.id;
              return (
                <article key={hw.id} className="grid gap-1">
                  <button
                    type="button"
                    disabled={busy}
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
        ) : (
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {homeworkShortcuts.some((hw) => !hw.completedToday)
              ? "오늘 완료할 숙제가 없습니다."
              : "표시할 숙제 유형이 없습니다."}
            {showAdminSettingsLink
              ? " 위 링크에서 유형을 추가하면 버튼이 나타납니다."
              : " 가족 관리자가 /admin 에서 숙제 유형을 등록하면 여기에 버튼이 나타납니다."}
          </p>
        )}
      </div>
      <RecordEventModal
        draft={draft}
        onClose={() => setDraft(null)}
        onRecorded={() => router.refresh()}
        showToast={showToast}
        createEventAction={createEventAction}
      />
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-[fade-in-up_0.2s_ease-out] rounded-lg bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
        >
          {toastMessage}
        </div>
      )}
      <QuickActionsAdminModal
        open={quickActionsModalOpen}
        onClose={() => setQuickActionsModalOpen(false)}
        rows={quickActionRows}
      />
      <HomeworkTypesAdminModal
        open={homeworkTypesModalOpen}
        onClose={() => setHomeworkTypesModalOpen(false)}
        rows={homeworkTypeRows}
      />
      <RoutineItemsAdminModal
        open={routineItemsModalOpen}
        onClose={() => setRoutineItemsModalOpen(false)}
        rows={routineItemRows}
      />
    </section>
  );
}
