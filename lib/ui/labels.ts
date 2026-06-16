/**
 * lib/ui/labels.ts — UI 라벨 전용 SSOT (Single Source of Truth)
 *
 * ACTION_TYPE_LABEL 등 UI 표시용 라벨 상수를 단일 모듈에서 관리합니다.
 * 모든 컴포넌트는 이 파일에서 import해야 합니다.
 *
 * CHILD_GROUP_LABEL, TARGET_LABEL, ROUTINE_TARGET_LABEL 는
 * `@/lib/children` 에서 import 합니다 (자식 식별자 SSOT).
 */

/** quick-actions 기록 종류 라벨 — "식사", "투약", "등원" 등 */
export const ACTION_TYPE_LABEL: Record<string, string> = {
  meal: "식사",
  medication: "투약",
  school_dropoff: "등원",
  school_pickup: "하원",
  brushing: "양치",
  cleaning: "청소",
};
