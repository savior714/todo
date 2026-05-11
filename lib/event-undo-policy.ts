/**
 * 실행 취소(soft revert) 허용 시간 — 액션 위험도별.
 * 서버 `undoEvent`와 타임라인 UI 노출 조건이 동일 함수를 쓴다.
 */

/** 식사·등하원 등 저위험 기록: 실수 복구를 넓게 */
export const LOW_RISK_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 투약: 감사·안전상 상대적으로 짧은 창 */
export const MEDICATION_UNDO_WINDOW_MS = 30 * 60 * 1000;

/** 숙제 완료: `homework_logs`와 쌍을 맞추지 않고 타임라인만 되돌리면 상태가 어긋나므로 UI 실행 취소 비활성화 */
export const HOMEWORK_UNDO_WINDOW_MS = 0;

export function getUndoWindowMsForActionType(actionType: string): number {
  if (actionType === "medication") {
    return MEDICATION_UNDO_WINDOW_MS;
  }
  if (actionType === "homework") {
    return HOMEWORK_UNDO_WINDOW_MS;
  }
  return LOW_RISK_UNDO_WINDOW_MS;
}
