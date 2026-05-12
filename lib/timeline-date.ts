/** Local-calendar helpers for timeline columns (no external date libs). */

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return startOfLocalDay(new Date(y, m - 1, d));
}

export function getEventDisplayDateKey(createdAtIso: string, metadataJson: string): string {
  try {
    const meta = JSON.parse(metadataJson || "{}") as Record<string, unknown>;
    const td = meta.timelineDate;
    if (typeof td === "string" && /^\d{4}-\d{2}-\d{2}$/.test(td)) {
      return td;
    }
  } catch {
    /* ignore invalid metadata */
  }
  return formatDateKey(startOfLocalDay(new Date(createdAtIso)));
}

/** "오늘" / "어제" / "내일" 또는 해당 없음(그 외 날짜). */
export function getRelativeDayCaption(
  d: Date,
  todayKey: string,
  yesterdayKey: string,
  tomorrowKey: string,
): "오늘" | "어제" | "내일" | null {
  const key = formatDateKey(d);
  if (key === todayKey) {
    return "오늘";
  }
  if (key === yesterdayKey) {
    return "어제";
  }
  if (key === tomorrowKey) {
    return "내일";
  }
  return null;
}

/** 로케일 기준 긴 요일 문자열 (예: "화요일"). */
export function formatKoreanWeekdayLong(d: Date): string {
  return d.toLocaleDateString("ko-KR", { weekday: "long" });
}

/** 주말(토·일). 공휴일은 별도 캘린더 없이 주말만 휴일 스타일에 사용한다. */
export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}
