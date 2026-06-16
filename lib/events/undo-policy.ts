/**
 * 실행 취소(soft revert) 허용 시간 — 액션 위험도별.
 * 서버 `undoEvent`와 타임라인 UI 노출 조건이 동일 함수를 쓴다.
 */

import { KNOWN_ACTION_TYPES } from "@/lib/constants";
import {
  HOMEWORK_UNDO_WINDOW_MS,
  LOW_RISK_UNDO_WINDOW_MS,
  MEDICATION_UNDO_WINDOW_MS,
  ROUTINE_CHECK_UNDO_WINDOW_MS,
} from "@/lib/config";

export { KNOWN_ACTION_TYPES };

export {
  HOMEWORK_UNDO_WINDOW_MS,
  LOW_RISK_UNDO_WINDOW_MS,
  MEDICATION_UNDO_WINDOW_MS,
  ROUTINE_CHECK_UNDO_WINDOW_MS,
};

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
