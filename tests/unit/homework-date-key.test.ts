import { describe, expect, test } from "bun:test";
import { addDays, formatDateKey, startOfLocalDay } from "@/lib/timeline-date";
import { assertHomeworkLogDateKey } from "@/lib/homework-date-key";

describe("assertHomeworkLogDateKey", () => {
  test("형식이 아니면 거부한다", () => {
    expect(() => assertHomeworkLogDateKey("2026-5-9")).toThrow();
    expect(() => assertHomeworkLogDateKey("")).toThrow();
  });

  test("어제(로컬)는 허용한다", () => {
    const y = formatDateKey(addDays(startOfLocalDay(new Date()), -1));
    expect(assertHomeworkLogDateKey(y)).toBe(y);
  });

  test("먼 미래는 거부한다", () => {
    const f = formatDateKey(addDays(startOfLocalDay(new Date()), 400));
    expect(() => assertHomeworkLogDateKey(f)).toThrow();
  });
});
