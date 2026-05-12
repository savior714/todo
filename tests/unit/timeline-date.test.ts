import { describe, expect, it } from "vitest";
import {
  formatDateKey,
  formatKoreanWeekdayLong,
  getRelativeDayCaption,
  isWeekend,
  parseDateKey,
  startOfLocalDay,
} from "@/lib/timeline-date";

describe("getRelativeDayCaption", () => {
  it("maps keys to 오늘/어제/내일", () => {
    const today = startOfLocalDay(new Date(2026, 4, 12));
    const y = formatDateKey(startOfLocalDay(new Date(2026, 4, 11)));
    const t = formatDateKey(today);
    const tom = formatDateKey(startOfLocalDay(new Date(2026, 4, 13)));
    expect(getRelativeDayCaption(today, t, y, tom)).toBe("오늘");
    expect(getRelativeDayCaption(parseDateKey(y), t, y, tom)).toBe("어제");
    expect(getRelativeDayCaption(parseDateKey(tom), t, y, tom)).toBe("내일");
    expect(getRelativeDayCaption(parseDateKey("2026-05-01"), t, y, tom)).toBeNull();
  });
});

describe("formatKoreanWeekdayLong", () => {
  it("returns long weekday in ko-KR", () => {
    const tue = startOfLocalDay(new Date(2026, 4, 12));
    expect(formatKoreanWeekdayLong(tue)).toMatch(/요일$/);
  });
});

describe("isWeekend", () => {
  it("is true for Saturday and Sunday", () => {
    expect(isWeekend(startOfLocalDay(new Date(2026, 4, 9)))).toBe(true); // Sat May 9 2026
    expect(isWeekend(startOfLocalDay(new Date(2026, 4, 10)))).toBe(true); // Sun
    expect(isWeekend(startOfLocalDay(new Date(2026, 4, 11)))).toBe(false); // Mon
  });
});
