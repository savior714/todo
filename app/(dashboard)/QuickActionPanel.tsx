"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEvent } from "@/app/actions/events";

const ACTIONS = [
  { actionType: "meal", label: "식사 기록", target: "family" },
  { actionType: "medication", label: "투약 기록", target: "kid4" },
  { actionType: "school_run", label: "등·하원", target: "kid4" },
  { actionType: "brushing", label: "양치", target: "kid4" },
] as const;

type QuickActionPanelProps = {
  guideHints?: Record<string, string>;
};

export default function QuickActionPanel({ guideHints = {} }: QuickActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAction = (actionType: string, target: string) => {
    if (!navigator.onLine) {
      showToast("인터넷 연결이 필요합니다.");
      return;
    }

    startTransition(async () => {
      const result = await createEvent({ actionType, target });

      if ("blocked" in result && result.blocked) {
        const shouldOverride = window.confirm(
          "최근 2시간 내 동일 투약 기록이 있습니다. 정말 강행하시겠습니까?"
        );

        if (!shouldOverride) {
          return;
        }

        const overrideResult = await createEvent({
          actionType,
          target,
          metadata: { override: true },
        });

        if ("blocked" in overrideResult && overrideResult.blocked) {
          showToast("강행 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        showToast("강행으로 투약 이벤트를 기록했습니다.");
        router.refresh();
        return;
      }

      showToast("이벤트가 기록되었습니다.");
      router.refresh();
    });
  };

  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-semibold">퀵 액션</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <article key={action.actionType} className="grid gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleAction(action.actionType, action.target)}
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
