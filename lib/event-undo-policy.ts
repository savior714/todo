/**
 * 실행 취소(soft revert) 허용 시간 — 액션 위험도별.
 * 서버 `undoEvent`와 타임라인 UI 노출 조건이 동일 함수를 쓴다.
 */

/** 식사·등하원 등 저위험 기록: 실수 복구를 넓게 */
export const LOW_RISK_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 투약: 감사·안전상 상대적으로 짧은 창 */
export const MEDICATION_UNDO_WINDOW_MS = 30 * 60 * 1000;

export function getUndoWindowMsForActionType(actionType: string): number {
  return actionType === "medication" ? MEDICATION_UNDO_WINDOW_MS : LOW_RISK_UNDO_WINDOW_MS;
}
