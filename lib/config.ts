/**
 * lib/config.ts — 비즈니스 매직 넘버 전용 SSOT (Single Source of Truth)
 *
 * 시간 간격, 제한값, 조회 주기 등 하드코딩된 숫자 상수를 단일 모듈에서 관리합니다.
 * 관련 파일에서 이 모듈로 import 하여 사용해야 합니다.
 */

// ── Transaction / Duplicate Check Windows ─────────────────────────────────────

/** medication 중복 트랜잭션 체크 윈도우 — 2시간 */
export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// ── Undo Policy Windows (ms) ────────────────────────────────────────────────

/** 식사·등하원 등 저위험 기록: 실수 복구를 넓게 (24시간) */
export const LOW_RISK_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 투약: 감사·안전상 상대적으로 짧은 창 (30분) */
export const MEDICATION_UNDO_WINDOW_MS = 30 * 60 * 1000;

/** 숙제 완료: 일일 로그와 쌍을 맞추지 않고 타임라인만 되돌리면 상태가 어긋나므로 UI 실행 취소 비활성화 */
export const HOMEWORK_UNDO_WINDOW_MS = 0;

/** 루틴 완료: 숙제 완료와 동일 reason — UI 실행 취소 비활성화 */
export const ROUTINE_CHECK_UNDO_WINDOW_MS = 0;

// ── Timeline Query Limits ───────────────────────────────────────────────────

/** 대시보드 타임라인 초기 로드 조회 기간 — 90일 */
export const TIMELINE_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

/** 대시보드 타임라인 초기 로드 최대 이벤트 수 */
export const TIMELINE_EVENT_LIMIT = 300;
