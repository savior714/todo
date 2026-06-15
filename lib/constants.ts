/**
 * KNOWN_ACTION_TYPES — 액션 타입 단일 SSOT.
 *
 * P-9 해결: event-metadata.ts 와 event-undo-policy.ts 에 중복 정의되던
 * actionType 목록을 단일 파일로 통합. 신규 actionType 추가 시 한 곳만
 * 수정하면 되므로 동기화 버그를 방지.
 */

export const KNOWN_ACTION_TYPES = [
  "medication",
  "meal",
  "school_dropoff",
  "school_pickup",
  "brushing",
  "cleaning",
  "homework",
  "routine_check",
] as const;

export type ActionType = (typeof KNOWN_ACTION_TYPES)[number];
