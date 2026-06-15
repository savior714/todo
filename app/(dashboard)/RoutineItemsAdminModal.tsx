"use client";

import { createRoutineItem, deactivateRoutineItem } from "@/app/actions/admin";
import { useEffect, useRef } from "react";

export type RoutineItemAdminRow = {
  id: string;
  title: string;
  target: "kid7" | "kid4" | "family";
  isActive: boolean;
};

type RoutineItemsAdminModalProps = {
  open: boolean;
  onClose: () => void;
  rows: RoutineItemAdminRow[];
};

async function submitRoutineItem(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const target = String(formData.get("target") ?? "") as "kid7" | "kid4" | "family";
  if (!title || (target !== "kid7" && target !== "kid4" && target !== "family")) {
    throw new Error("입력값이 올바르지 않습니다.");
  }
  await createRoutineItem(target, title);
}

async function submitDeactivateRoutineItem(formData: FormData) {
  "use server";
  await deactivateRoutineItem(formData);
}

const TARGET_LABEL: Record<"kid7" | "kid4" | "family", string> = {
  kid7: "주원이 (첫째)",
  kid4: "승원이 (둘째)",
  family: "가족 공통",
};

export default function RoutineItemsAdminModal({ open, onClose, rows }: RoutineItemsAdminModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    }
  }, [open]);

  function handleDialogClose() {
    onClose();
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="dialog-record m-auto max-h-none w-[min(36rem,calc(100vw-1rem))] max-w-none border-0 bg-transparent p-0 shadow-none"
      onClose={handleDialogClose}
    >
      <div className="dialog-record-panel flex max-h-[min(80dvh,40rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3.5 dark:border-neutral-700">
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50">
            루틴 체크 관리
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-300 px-3 text-sm font-medium leading-snug dark:border-neutral-600"
          >
            닫기
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            숙제와 별개로, 매일 챙길 일(물 마시기, 준비물 등)을 등록합니다.
          </p>

          <ul className="mt-3 grid gap-2">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-600">
                <div className="min-w-0 leading-snug">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{row.title}</span>
                  <span className="ml-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {TARGET_LABEL[row.target]}
                  </span>
                </div>
                {row.isActive ? (
                  <form action={submitDeactivateRoutineItem}>
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="inline-flex min-h-[44px] items-center rounded-md border border-neutral-400 px-3 text-sm font-medium leading-snug dark:border-neutral-500">
                      숨기기
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>

          <form action={submitRoutineItem} className="mt-4 grid gap-2">
            <input name="title" required placeholder="예: 물통 채우기, 준비물 가방" className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700" />
            <select name="target" defaultValue="family" className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700">
              <option value="family">가족 공통</option>
              <option value="kid7">주원이 (첫째)</option>
              <option value="kid4">승원이 (둘째)</option>
            </select>
            <button type="submit" className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-sm font-semibold leading-snug text-white">
              추가
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
