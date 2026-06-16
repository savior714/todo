"use client";

import { useState, useCallback } from "react";

/** useConfirm 훅 — native confirm()/alert() 대체용 커스텀 확인 훅 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => setConfirmState({ message, resolve }));
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState?.resolve(true);
    setConfirmState(null);
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    confirmState?.resolve(false);
    setConfirmState(null);
  }, [confirmState]);

  return { confirm, handleConfirm, handleCancel, confirmState };
}
