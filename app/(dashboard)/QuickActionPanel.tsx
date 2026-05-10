"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import RecordEventModal, { type RecordDraft } from "@/app/(dashboard)/RecordEventModal";

export type QuickActionButton = {
  id: string;
  label: string;
  actionType: string;
  target: string;
};

type QuickActionPanelProps = {
  actions: QuickActionButton[];
  guideHints?: Record<string, string>;
};

export default function QuickActionPanel({ actions, guideHints = {} }: QuickActionPanelProps) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecordDraft | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-semibold">퀵 액션</h2>
      {actions.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          등록된 버튼이 없습니다. 관리자는 <span className="font-medium">/admin</span>에서 퀵 액션을 추가할 수
          있습니다.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <article key={action.id} className="grid gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    actionType: action.actionType,
                    target: action.target,
                    label: action.label,
                  })
                }
                className="inline-flex min-h-[60px] items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
              >
                {action.label}
              </button>
              {guideHints[action.actionType] && (
                <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                  연결 가이드: {guideHints[action.actionType]}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      <RecordEventModal
        draft={draft}
        onClose={() => setDraft(null)}
        onRecorded={() => router.refresh()}
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
