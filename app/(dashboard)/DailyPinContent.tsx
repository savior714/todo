"use client";

import { useState } from "react";

type DailyPinContentProps = {
  pin: { content: string };
  shouldTruncate: boolean;
};

export default function DailyPinContent({ pin, shouldTruncate }: DailyPinContentProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
      <h3 className="text-sm font-semibold leading-none tracking-tight">오늘의 지시사항</h3>
      <p className={`mt-2 text-base leading-relaxed ${!expanded && shouldTruncate ? "line-clamp-3" : ""}`}>
        {pin.content}
      </p>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs font-medium leading-snug text-amber-700 underline dark:text-amber-300"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </section>
  );
}
