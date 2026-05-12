import { formatDateKey, startOfLocalDay } from "@/lib/timeline-date";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 대시보드 타임라인 열과 동일한 기준의 “오늘” (로컬 자정 기준). */
export function todayLocalDateKey(): string {
  return formatDateKey(startOfLocalDay(new Date()));
}

export function assertHomeworkLogDateKey(dateKey: string): string {
  const trimmed = dateKey.trim();
  if (!DATE_KEY_RE.test(trimmed)) {
    throw new Error("날짜 형식이 올바르지 않습니다.");
  }
  const maxAllowed = todayLocalDateKey();
  if (trimmed > maxAllowed) {
    throw new Error("미래 날짜에는 완료를 기록할 수 없습니다.");
  }
  return trimmed;
}
