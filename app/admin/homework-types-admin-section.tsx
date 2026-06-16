"use client";

import { CHILD_GROUP_LABEL } from "@/lib/children";

export type HomeworkTypeAdminRow = {
  id: string;
  title: string;
  childGroup: "kid7" | "kid4";
  isActive: boolean;
};

type HomeworkTypesAdminSectionProps = {
  rows: HomeworkTypeAdminRow[];
  submitHomeworkType: (formData: FormData) => Promise<void>;
  submitDeactivateHomeworkType: (formData: FormData) => Promise<void>;
};

/** 대시보드 「숙제 유형 관리」→ `/admin#homework-types-admin` 과 동일 블록 */
export function HomeworkTypesAdminSection({
  rows,
  submitHomeworkType,
  submitDeactivateHomeworkType,
}: HomeworkTypesAdminSectionProps) {
  return (
    <section
      id="homework-types-admin"
      className="scroll-mt-6 mt-4 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700"
    >
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">숙제 유형</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        잘못 추가한 유형은 숨기기로 비활성화합니다. (숙제 트래커에는 활성 유형만 표시됩니다.)
      </p>
      <ul className="mt-3 grid gap-2">
        {rows.map((hw) => (
          <li
            key={hw.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-600"
          >
            <div className="min-w-0 leading-snug">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{hw.title}</span>
              <span className="ml-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {CHILD_GROUP_LABEL[hw.childGroup]}
                {!hw.isActive ? " · 비활성" : ""}
              </span>
            </div>
            {hw.isActive ? (
              <form action={submitDeactivateHomeworkType}>
                <input type="hidden" name="id" value={hw.id} />
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
      <form action={submitHomeworkType} className="mt-4 grid gap-2">
        <input
          name="title"
          required
          placeholder="숙제 제목"
          className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700"
        />
        <select
          name="childGroup"
          defaultValue="kid7"
          className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700"
        >
          <option value="kid7">kid7 (주원이)</option>
          <option value="kid4">kid4 (승원이)</option>
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
