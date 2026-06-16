"use client";

import { ROUTINE_TARGET_LABEL } from "@/lib/children";

export type RoutineItemAdminRow = {
  id: string;
  title: string;
  target: "kid7" | "kid4" | "family";
  isActive: boolean;
};

type RoutineItemsAdminSectionProps = {
  rows: RoutineItemAdminRow[];
  submitRoutineItem: (formData: FormData) => Promise<void>;
  submitDeactivateRoutineItem: (formData: FormData) => Promise<void>;
};

export function RoutineItemsAdminSection({
  rows,
  submitRoutineItem,
  submitDeactivateRoutineItem,
}: RoutineItemsAdminSectionProps) {
  return (
    <section
      id="routine-items-admin"
      className="scroll-mt-6 mt-4 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700"
    >
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">루틴 체크</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        숙제와 별개로, 매일 챙길 일(물 마시기, 준비물 등)을 등록합니다. 보호자 누구나 타임라인에서 해당 날짜 완료를 체크할
        수 있습니다.
      </p>
      <ul className="mt-3 grid gap-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-600"
          >
            <div className="min-w-0 leading-snug">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{row.title}</span>
              <span className="ml-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {ROUTINE_TARGET_LABEL[row.target]}
                {!row.isActive ? " · 비활성" : ""}
              </span>
            </div>
            {row.isActive ? (
              <form action={submitDeactivateRoutineItem}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center rounded-md border border-neutral-400 px-3 text-sm font-medium leading-snug dark:border-neutral-500"
                >
                  숨기기
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      <form action={submitRoutineItem} className="mt-4 grid gap-2">
        <input
          name="title"
          required
          placeholder="예: 물통 채우기, 준비물 가방"
          className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700"
        />
        <select
          name="target"
          defaultValue="family"
          className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700"
        >
          <option value="family">가족 공통</option>
          <option value="kid7">주원이 (첫째)</option>
          <option value="kid4">승원이 (둘째)</option>
        </select>
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-sm font-semibold leading-snug text-white"
        >
          추가
        </button>
      </form>
    </section>
  );
}
