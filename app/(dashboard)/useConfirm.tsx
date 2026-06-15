"use client";

import { useState, useCallback, useRef } from "react";

type ConfirmOptions = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

// 커스텀 확인 모달을 위한 React hook.
// window.confirm() 대신 앱 내 커스텀 다이얼로그를 사용하며,
// Promise 기반 API로 비동기 확인/취소 처리가 가능함.
//
// P-7 해결: useRef 로 resolve 저장 → 단일 렌더에서 resolve 접근 보장.
// 기존 double setState 패턴(setState → setState(prev => ...)) 은
// React 의 비동기 setState 로 인해 resolve 가 누락될 위험이 있었음.
//
// Example:
// const [confirm, ConfirmDialog] = useConfirm();
// const handleOverride = async () => {
//   const shouldOverride = await confirm({ message: "정말 강행하시겠습니까?" });
//   if (shouldOverride) { /* proceed */ }
// };
// return (<>
//   <button onClick={handleOverride}>강행</button>
//   <ConfirmDialog />
// </>);
export function useConfirm(): [
  (options: ConfirmOptions) => Promise<boolean>,
  () => React.ReactNode,
] {
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [state, setState] = useState<{ options: ConfirmOptions } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve; // 즉시 저장
      setState({ options });
    });
  }, []);

  const handleConfirm = useCallback((value: boolean) => {
    resolveRef.current?.(value); // useRef 에서 호출
    resolveRef.current = null;
    setState(null);
  }, []);

  const ConfirmDialog = () => {
    if (!state) return null;

    const {
      message,
      confirmLabel = "확인",
      cancelLabel = "취소",
    } = state.options;

    return (
      <dialog
        open
        className="m-auto max-w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-950"
        onClose={() => handleConfirm(false)}
      >
        <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
          {message}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="inline-flex flex-1 min-h-[44px] items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-medium leading-snug dark:border-neutral-600"
            onClick={() => handleConfirm(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="inline-flex flex-1 min-h-[44px] items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold leading-snug tracking-tight text-white"
            onClick={() => handleConfirm(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    );
  };

  return [confirm, ConfirmDialog];
}
