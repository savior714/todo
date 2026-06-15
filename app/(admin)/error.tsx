"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          일시적 오류가 발생했습니다
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          인증 정보를 확인하고 다시 시도해 주세요.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
          >
            로그인 페이지로 이동
          </button>
          <button
            onClick={() => reset()}
            className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
