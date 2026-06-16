/**
 * 실행 취소(soft revert) 허용 시간 — 액션 위험도별.
 * 서버 `undoEvent`와 타임라인 UI 노출 조건이 동일 함수를 쓴다.
 */

import { KNOWN_ACTION_TYPES } from "@/lib/constants";

export { type ActionType } from "@/lib/constants";

/** @deprecated Use KNOWN_ACTION_TYPES from @/lib/constants (SSOT) */
export const KNOWN_ACTION_TYPES_LIST = KNOWN_ACTION_TYPES;

export { KNOWN_ACTION_TYPES };

/** 식사·등하원 등 저위험 기록: 실수 복구를 넓게 */
export const LOW_RISK_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 투약: 감사·안전상 상대적으로 짧은 창 */
export const MEDICATION_UNDO_WINDOW_MS = 30 * 60 * 1000;

/** 숙제·루틴 완료: 일일 로그와 쌍을 맞추지 않고 타임라인만 되돌리면 상태가 어긋나므로 UI 실행 취소 비활성화 */
export const HOMEWORK_UNDO_WINDOW_MS = 0;
export const ROUTINE_CHECK_UNDO_WINDOW_MS = 0;

export function getUndoWindowMsForActionType(actionType: string): number {
  switch (actionType) {
    case "medication":
      return MEDICATION_UNDO_WINDOW_MS;
    case "meal":
    case "school_dropoff":
    case "school_pickup":
    case "brushing":
    case "cleaning":
      return LOW_RISK_UNDO_WINDOW_MS;
    case "homework":
      return HOMEWORK_UNDO_WINDOW_MS;
    case "routine_check":
      return ROUTINE_CHECK_UNDO_WINDOW_MS;
    default:
      return LOW_RISK_UNDO_WINDOW_MS;
  }
}
