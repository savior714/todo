"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createHomeworkTypeForModal,
  deactivateHomeworkTypeForModal,
} from "@/app/actions/admin";

function StatusWrapper({ children }: { children: React.ReactNode }) {
  const status = useFormStatus();
  void status.pending;
  return <>{children}</>;
}

export type HomeworkTypeAdminRow = {
  id: string;
  title: string;
  childGroup: "kid7" | "kid4";
  isActive: boolean;
};

type HomeworkTypesAdminModalProps = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
  rows: HomeworkTypeAdminRow[];
};

const CHILD_GROUP_LABEL: Record<"kid7" | "kid4", string> = {
  kid7: "주원이",
  kid4: "승원이",
};

export default function HomeworkTypesAdminModal({
  open,
  onClose,
  onChanged,
  rows,
}: HomeworkTypesAdminModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    }
  }, [open]);

  useEffect(() => {
    if (formSubmitted) {
      setFormSubmitted(false);
      onChanged?.();
    }
  }, [formSubmitted, onChanged]);

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
            숙제 유형 관리
          </h2>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-300 px-3 text-sm font-medium leading-snug dark:border-neutral-600"
            onClick={() => dialogRef.current?.close()}
          >
            닫기
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            잘못 추가한 유형은 숨기기로 비활성화합니다.
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
                  </span>
                </div>
                {hw.isActive ? (
                  <StatusWrapper>
                    <form action={deactivateHomeworkTypeForModal}>
                      <input type="hidden" name="id" value={hw.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-[44px] items-center rounded-md border border-neutral-400 px-3 text-sm font-medium leading-snug dark:border-neutral-500"
                      >
                        숨기기
                      </button>
                    </form>
                  </StatusWrapper>
                ) : null}
              </li>
            ))}
          </ul>

          <StatusWrapper>
            <form action={createHomeworkTypeForModal} className="mt-4 grid gap-2">
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
          </StatusWrapper>
        </div>
      </div>
    </dialog>
  );
}
