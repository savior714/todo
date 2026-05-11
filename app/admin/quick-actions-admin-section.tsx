"use client";

const TARGET_LABEL: Record<string, string> = {
  kid7: "주원이",
  kid4: "승원이",
  family: "가족 전체",
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  meal: "식사",
  medication: "투약",
  school_dropoff: "등원",
  school_pickup: "하원",
  brushing: "양치",
};

export type QuickActionAdminRow = {
  id: string;
  label: string;
  actionType: string;
  target: string;
  sortOrder: number;
  isActive: boolean;
};

function formatQuickActionMeta(actionType: string, target: string) {
  const typeLabel = ACTION_TYPE_LABEL[actionType] ?? actionType;
  const who = TARGET_LABEL[target] ?? target;
  return `${typeLabel} · ${who}`;
}

type QuickActionsAdminSectionProps = {
  rows: QuickActionAdminRow[];
  quickActionError?: string | null;
  submitQuickAction: (formData: FormData) => Promise<void>;
  submitDeactivateQuickAction: (formData: FormData) => Promise<void>;
};

/** 대시보드 「퀵 액션 편집」→ `/admin#quick-actions-admin` 과 동일 블록 */
export function QuickActionsAdminSection({
  rows,
  quickActionError,
  submitQuickAction,
  submitDeactivateQuickAction,
}: QuickActionsAdminSectionProps) {
  return (
    <section
      id="quick-actions-admin"
      className="scroll-mt-6 mt-6 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700"
    >
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">퀵 액션</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        대시보드 단축 버튼입니다. 누르면 타임라인에 같은 종류로 기록됩니다.
      </p>
      {quickActionError ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
          {quickActionError}
        </p>
      ) : null}

      <ul className="mt-4 grid gap-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-600"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                {row.label}
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {formatQuickActionMeta(row.actionType, row.target)}
                {!row.isActive ? " · 숨김" : ""}
              </div>
            </div>
            {row.isActive ? (
              <form action={submitDeactivateQuickAction}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] shrink-0 items-center rounded-md border border-neutral-400 px-3 text-sm font-medium leading-snug dark:border-neutral-500"
                >
                  숨기기
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      <form action={submitQuickAction} className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium leading-normal text-neutral-800 dark:text-neutral-100">
          버튼 이름
          <input
            name="label"
            required
            placeholder="예: 저녁 식사"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base font-normal leading-normal dark:border-neutral-700"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium leading-normal text-neutral-800 dark:text-neutral-100">
            기록 종류
            <select
              name="actionPreset"
              defaultValue="meal"
              className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base font-normal leading-normal dark:border-neutral-700"
            >
              <option value="meal">식사</option>
              <option value="medication">투약</option>
              <option value="school_dropoff">등원</option>
              <option value="school_pickup">하원</option>
              <option value="brushing">양치</option>
              <option value="custom">기타(직접 입력)</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium leading-normal text-neutral-800 dark:text-neutral-100">
            기록 대상
            <select
              name="target"
              defaultValue="kid4"
              className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base font-normal leading-normal dark:border-neutral-700"
            >
              <option value="family">가족 전체</option>
              <option value="kid7">주원이</option>
              <option value="kid4">승원이</option>
            </select>
          </label>
        </div>
        <details className="rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm leading-normal dark:border-neutral-600">
          <summary className="cursor-pointer select-none font-medium text-neutral-700 dark:text-neutral-300">
            기타(직접 입력)일 때만 펼치기
          </summary>
          <input
            name="actionCustom"
            placeholder="영문 코드 (예: laundry)"
            className="mt-2 min-h-[44px] w-full rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700"
          />
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            소문자로 시작, 영문·숫자·밑줄만 사용합니다.
          </p>
        </details>
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-sm font-semibold leading-snug text-white"
        >
          버튼 추가
        </button>
      </form>
    </section>
  );
}
