"use client";

import { useEffect, useRef } from "react";
import { createQuickAction, deactivateQuickAction } from "@/app/actions/admin";

export type QuickActionAdminRow = {
  id: string;
  label: string;
  actionType: string;
  target: string;
  sortOrder: number;
  isActive: boolean;
};

type QuickActionsAdminModalProps = {
  open: boolean;
  onClose: () => void;
  rows: QuickActionAdminRow[];
};

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
  cleaning: "청소",
};

function formatQuickActionMeta(actionType: string, target: string) {
  const typeLabel = ACTION_TYPE_LABEL[actionType] ?? actionType;
  const who = TARGET_LABEL[target] ?? target;
  return `${typeLabel} · ${who}`;
}

export default function QuickActionsAdminModal({ open, onClose, rows }: QuickActionsAdminModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const el = dialogRef.current;
    if (el) {
      el.showModal();
    }
  }, [open]);

  const handleDialogClose = () => {
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog-record m-auto max-h-none w-[min(36rem,calc(100vw-1rem))] max-w-none border-0 bg-transparent p-0 shadow-none"
      onClose={handleDialogClose}
    >
      <div className="dialog-record-panel flex max-h-[min(80dvh,40rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3.5 dark:border-neutral-700">
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50">
            퀵 액션 편집
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-neutral-300 px-3 text-sm font-medium leading-snug dark:border-neutral-600"
          >
            닫기
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <ul className="grid gap-2">
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
                    <form action={async (formData) => { await deactivateQuickAction(formData); }}>
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

            <form action={async (formData) => { await createQuickAction(formData); }} className="mt-4 grid gap-3">
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
                    <option value="cleaning">청소</option>
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
              <input
                name="actionCustom"
                placeholder="영문 코드 (예: laundry)"
                className="min-h-[44px] w-full rounded-md border border-neutral-300 bg-transparent px-2 text-base leading-normal dark:border-neutral-700"
              />
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-sm font-semibold leading-snug text-white"
              >
                버튼 추가
              </button>
            </form>
          </div>
        </div>
      </div>
    </dialog>
  );
}
