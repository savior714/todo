<!-- Language: ko -->

# 🗺️ Project Blueprint: FamilySync 코드 품질 리팩토링 — 타입 안전성·SSOT·보안

## 문서 메타
- **Last Verified**: 2026-06-16 | **Tested Version**: N/A
- **Reference**: N/A
- **SSOT Check**: ✅ verified
- **Project Status Link**: https://github.com/anomalyco/opencode
- **Priority**: 2
- **Labels**: refactor, code-quality
- **Architectural Goal**: 중복 상수·매직 넘버·비공개 정보 노출·미검증 타입 캐스트를 제거하여 코드베이스의 SSOT 단일화, 타입 안전성, 보안 강화를 달성한다.

## 📎 관련 명세

> **아카이브 필수**: `/archive` 시 `just plan-lint <file> --archive-ready`가 본 절(「관련 명세」) 또는 본문 `docs/specs/` 문자열을 검사합니다. `SSOT Check`와 별개입니다.

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/TRD.md` | FamilySync 기술 레퍼런스 — 데이터 흐름·보안 요구사항 |

## 📋 업무 요약 (협업용)

> **독자**: 원장·원무·기획. 코드·경로·명령은 아래 기술 절.

### 개요

FamilySync 코드베이스에 누적된 중저 severity 코드 품질 이슈 9가지를 일괄 리팩토링합니다. 보호자 데이터(아이 이름, 프로필 ID 등)가 반복적으로 여러 파일에 복제되어 있고, 매직 넘버가 파일 곳곳에 흩어져 있으며, 일부 타입 캐스트가 컴파일러 검사를 우회하고 있습니다. 또한 에러 페이지에서 전체 오류 객체가 콘솔에 노출되고, 프로필 삭제 시 브라우저 기본 confirm/alert 다이얼로그를 사용하고 있습니다.

### staff·경영에서 바뀌는 점

- UI 라벨(아이 이름, 액션 종류 등)이 한 곳에서 관리되어 수정 시 모든 페이지가 동시에 반영됨
- 투약 간격, 타임라인 조회 기간 등 설정값이 한 곳에서 관리되어 변경이 쉬워짐
- 프로필 삭제 시 사용자 친화적인 커스텀 확인 다이얼로그로 변경됨

### 끝났을 때 확인할 것

- 모든 페이지에서 아이 이름·액션 라벨이 기존과 동일하게 표시됨
- 프로필 삭제 시 커스텀 확인 다이얼로그가 나타나고 삭제/취소 동작이 정상임
- 에러 발생 시 콘솔에 민감한 정보 없이 요약 메시지만 기록됨

## 🎯 Origin Intent

- **출처**: 직접 요청 (코드 품질 개선)
- **원래 목적**: 중복 상수·매직 넘버·비공개 정보 노출·미검증 타입 캐스트 등 중저 severity 코드 품질 이슈 9가지를 일괄 해결하여 유지보수성·보안·타입 안전성을 향상시킨다.
- **완료 관찰**: 코드베이스에서 상수 중복이 제거되고, 매직 넘버가 config로 통합되며, 타입 캐스트가 Zod 검증으로 대체된다.

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| 라벨 값 변경 시 하위 호환성 (기존 DB에 저장된 actionType/target) | Origin | FS-MED-001 ~ FS-MED-009 | 라벨은 UI 전용 — DB 값과 무관 |
| `normalizeChildGroup`/`normalizeRoutineTarget` silent fallback으로 인한 데이터 손실 가려짐 | Risk | FS-MED-006 | warn 로그 추가로 감지 가능해야 함 |
| `@deprecated` export 제거 시 하위 호환성 깨짐 | Risk | FS-MED-008, FS-MED-009 | runtime warn으로 우회 — 즉시 제거 금지 |
| `useConfirm` 훅 추가 시 기존 confirm/alert 의존 코드 전파 | Origin | FS-MED-005 | 현재는 profile-delete-section.tsx 1개만 적용 |
| `ACTIVE_PROFILE_COOKIE` SSOT화 후 layout/login 페이지의 import 누락 | Risk | FS-MED-003 | plan-lint로 import 유효성 검증 |
| 시드 데이터 하드코딩된 actionType/target가 DB 마이그레이션과 불일치 | Origin | 범위 밖 — 시드 데이터는 현재 DB 스키마와 일치하므로 변경 안 함 |

## 🧭 Context Pre-read Gate (실행 전 필수)

> ⚠️ **에이전트 주의**: Blueprint 파일 생성 직후, `just plan-lint`를 돌리기 **전에** 반드시 아래 명령을 먼저 실행하여 마커를 주입하세요.
> `just plan-preread docs/plans/PLAN_familysync_code_quality_refactor.md --write`

(planned: `just plan-preread docs/plans/PLAN_familysync_code_quality_refactor.md --write`)

## Diagnosis & Findings

- **현상 1**: `DashboardDeferred.tsx`에서 `row.childGroup as "kid7" | "kid4"` 타입 캐스트가 Zod 검증 없이 강제 형변환 — DB에 이상한 값이 들어오면 런타임 에러 발생
- **현상 2**: `TimelineFeedSection.tsx`의 `normalizeChildGroup`/`normalizeRoutineTarget`이 유효하지 않은 값을 받으면 silently `"kid4"`/`"family"`로 폴백 — 데이터 이상을 발견할 수 없음
- **현상 3**: `error.tsx`에서 `console.error("[Dashboard Error]", error)` — 전체 Error 객체(스택 트레이스 포함)가 콘솔에 노출
- **현상 4**: `ACTIVE_PROFILE_COOKIE`가 `session.ts`, `layout.tsx`, `login/page.tsx`에 3곳에서 중복 정의 — 하나만 바꿔도 동기화 깨짐
- **현상 5**: `CHILD_GROUP_LABEL`, `TARGET_LABEL`, `ACTION_TYPE_LABEL`이 7개 이상의 컴포넌트에 분산 — 라벨 수정 시 모든 파일 수동 업데이트 필요
- **현상 6**: `TWO_HOURS_MS`, `LOW_RISK_UNDO_WINDOW_MS`, `TIMELINE_LOOKBACK_MS` 등 매직 넘버가 파일 곳곳에 흩어져 — 값 변경 시 영향 범위 파악 어려움
- **현상 7**: `profile-delete-section.tsx`에서 `confirm()`/`alert()` — 모바일 환경에서 스타일 일관성 깨지고, 접근성 문제
- **현상 8**: `admin.ts`, `events.ts`, `auth.ts` Server Action에 JSDoc 없음 — IDE 자동 완성·타입 추론 저하
- **현상 9**: `metadata.ts`의 `KNOWN_ACTION_TYPES_SET`, `undo-policy.ts`의 `KNOWN_ACTION_TYPES_LIST`/`ActionType`이 `@deprecated`로 표시되었지만 여전히 export — 코드베이스 전체에서 import 참조 가능

## Architectural Deepening

- **Seam**: `lib/ui/labels.ts` — UI 라벨 전용 SSOT 모듈. 모든 컴포넌트는 이 파일에서 import해야 함
- **Seam**: `lib/config.ts` — 비즈니스 매직 넘버 전용 SSOT 모듈. 시간 간격·제한값·반복 주기 등
- **Leverage**: Zod schema — `DashboardDeferred.tsx`의 타입 캐스트를 검증 함수로 대체하여 런타임 안전성 확보
- **Leverage**: `useConfirm` 훅 — `profile-delete-section.tsx`의 native confirm/alert를 React 컴포넌트로 대체

## Conceptual Sketch

```typescript
// lib/ui/labels.ts — UI 라벨 SSOT
export const CHILD_GROUP_LABEL: Record<"kid7" | "kid4", string> = {
  kid7: "주원이",
  kid4: "승원이",
};

export const TARGET_LABEL: Record<"kid7" | "kid4" | "family", string> = {
  kid7: "주원이",
  kid4: "승원이",
  family: "가족 전체",
};

export const ACTION_TYPE_LABEL: Record<string, string> = {
  meal: "식사",
  medication: "투약",
  school_dropoff: "등원",
  school_pickup: "하원",
  brushing: "양치",
  cleaning: "청소",
};

export const ROUTINE_TARGET_LABEL: Record<"kid7" | "kid4" | "family", string> = {
  kid7: "주원이 (첫째)",
  kid4: "승원이 (둘째)",
  family: "가족 공통",
};

// lib/config.ts — 매직 넘버 SSOT
export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
export const LOW_RISK_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MEDICATION_UNDO_WINDOW_MS = 30 * 60 * 1000;
export const HOMEWORK_UNDO_WINDOW_MS = 0;
export const ROUTINE_CHECK_UNDO_WINDOW_MS = 0;
export const TIMELINE_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;
export const TIMELINE_EVENT_LIMIT = 300;

// lib/hooks/use-confirm.ts — 커스텀 확인 훅
export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => setConfirmState({ message, resolve }));
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState?.resolve(true);
    setConfirmState(null);
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    confirmState?.resolve(false);
    setConfirmState(null);
  }, [confirmState]);

  return { confirm, handleConfirm, handleCancel, confirmState };
}

// DashboardDeferred.tsx — Zod 검증 예시
import { z } from "zod";

const childGroupSchema = z.enum(["kid7", "kid4"]);
const routineTargetSchema = z.enum(["kid7", "kid4", "family"]);

function validateChildGroup(raw: string): "kid7" | "kid4" {
  const result = childGroupSchema.safeParse(raw);
  if (!result.success) {
    console.warn("[DashboardDeferred] Invalid childGroup:", raw, "defaulting to kid4");
    return "kid4";
  }
  return result.data;
}

function validateRoutineTarget(raw: string): "kid7" | "kid4" | "family" {
  const result = routineTargetSchema.safeParse(raw);
  if (!result.success) {
    console.warn("[DashboardDeferred] Invalid routine target:", raw, "defaulting to family");
    return "family";
  }
  return result.data;
}
```

## 🛡️ Risk & Strategy

- **Risk**: `@deprecated` export 제거 시 기존 import가 깨질 수 있음 — **Strategy**: 즉시 제거 대신 `console.warn` 추가 후 점진적 마이그레이션
- **Risk**: 라벨 값의 미세한 불일치 (예: "주원이" vs "주원이 (첫째)") — **Strategy**: 각 컨텍스트별로 별도 map 분리, 기존 값 유지
- **Risk**: `useConfirm` 훅 신규 파일 생성 시 레이아웃/스타일 영향 — **Strategy**: minimal 훅만 생성, dialog 컴포넌트는 현재 유지

## 🔍 Impact Scope

| 수정 대상 | 역할 |
| :--- | :--- |
| `lib/ui/labels.ts` (신규) | UI 라벨 SSOT — CHILD_GROUP_LABEL, TARGET_LABEL, ACTION_TYPE_LABEL, ROUTINE_TARGET_LABEL |
| `lib/config.ts` (신규) | 매직 넘버 SSOT — 시간 간격, 제한값, 조회 주기 |
| `lib/auth/session.ts` | ACTIVE_PROFILE_COOKIE SSOT (기존 유지) |
| `app/(dashboard)/layout.tsx` | ACTIVE_PROFILE_COOKIE import로 변경 |
| `app/(auth)/login/page.tsx` | ACTIVE_PROFILE_COOKIE import로 변경 |
| `app/(dashboard)/QuickActionPanel.tsx` | CHILD_GROUP_LABEL import로 변경 |
| `app/admin/homework-types-admin-section.tsx` | CHILD_GROUP_LABEL import로 변경 |
| `app/(dashboard)/TimelineEventDetailModal.tsx` | CHILD_GROUP_LABEL, ROUTINE_TARGET_LABEL import로 변경 |
| `app/(dashboard)/QuickActionsAdminModal.tsx` | TARGET_LABEL, ACTION_TYPE_LABEL import로 변경 |
| `app/admin/quick-actions-admin-section.tsx` | TARGET_LABEL, ACTION_TYPE_LABEL import로 변경 |
| `app/(dashboard)/RoutineItemsAdminModal.tsx` | TARGET_LABEL import로 변경 |
| `app/admin/routine-items-admin-section.tsx` | TARGET_LABEL import로 변경 |
| `app/(dashboard)/dashboard/DashboardDeferred.tsx` | 타입 캐스트 → Zod 검증 |
| `app/(dashboard)/TimelineFeedSection.tsx` | silent fallback → warn 로그 추가 |
| `app/(dashboard)/error.tsx` | 전체 객체 로깅 → 요약 메시지 |
| `lib/events/db-queries.ts` | 매직 넘버를 lib/config.ts에서 import |
| `lib/events/undo-policy.ts` | 매직 넘버를 lib/config.ts에서 import + @deprecated export 제거 |
| `lib/dashboard/timeline.ts` | 매직 넘버를 lib/config.ts에서 import |
| `lib/events/metadata.ts` | @deprecated export 제거 |
| `app/actions/admin.ts` | JSDoc 추가 |
| `app/actions/events.ts` | JSDoc 추가 |
| `app/actions/auth.ts` | JSDoc 추가 |
| `app/admin/profile-delete-section.tsx` | native confirm/alert → useConfirm 훅 |
| `lib/hooks/use-confirm.ts` (신규) | useConfirm 훅 |

## Agent Completion Contract

본 Blueprint Task를 실행하는 세션(`@PLAN_* task N.M`, `/plan` 후 구현)에서 사용자가 별도 금지하지 않는 한, 아래는 **해당 Task 범위에 포함**된다 ([planning.md](../../.agents/core/planning.md) §2.2 · [plan.md](../../.agents/workflows/plan.md) §1.10).

| 허용 | 금지 |
| :--- | :--- |
| `just plan-task-close` CLI를 사용한 Task `Status`·`Conclusion` 자동 갱신 | 텍스트 에디터(replace 등)로 본 파일 Task 상태 In-place 직접 수정 |
| Task `Verify` 직후 `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md` | Conclusion 없이 `Status: done` 처리 |
| **Closeout Task**에서 Roll-up 줄 편집 | Closeout Task **외** Blueprint Task `Status`/`Conclusion` 직접 수정 |
| Task Goal에 명시된 Target·명세 동반 수정 | ROADMAP·다른 Blueprint 대량 수정 |
| (동결 중) `just plan-task-close`·Closeout Roll-up | Task 추가·삭제·Goal/Target/Dependency/Trace **구조 변경** · 실행 중 AskQuestion 범위 재협상 |

**실행 동결**: `plan-lint` PASS 후 사용자가 **전체 진행**을 요청하면 Blueprint 구조는 고정. 표준 패턴 — 파일 작성 완료 → `@PLAN_*` 전체 순차 실행 → Closeout. 상세: [plan.md](../../.agents/workflows/plan.md) §Blueprint 실행 동결.

**Task 완료 정의**: `Verify` exit 0 → `just plan-task-close` 실행 → `just plan-lint` PASS. **플랜 전체 완료**는 마지막 Closeout Task까지 포함한다.

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: 사용자가 Blueprint **전체 실행**을 요청하면 Task를 **Dependency 순**으로 1개씩만 진행한다. Blueprint Task 구조는 **동결** — `plan-task-close`·Closeout Roll-up만 예외. `Verify` PASS → `just plan-task-close plan=... task=... conclusion="..."` → `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md` → 다음 Task. **마지막 Closeout Task**에서 Roll-up 후 `just plan-close` Verify.

### Phase 0 — Edge case gap audit

#### Task 0.1: Edge Case Trace 갭 감사 및 보완 Task 반영 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-000] | Status: todo | Priority: 1 | Labels: plan | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
  2. `[rule]` `.agents/core/code_quality_lifecycle.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-000 `Conclusion`·`Status`)
- **Goal**: Origin Intent와 Risk를 근거로 Edge Case Trace 표를 검증하고, 인범위·미매핑 엣지마다 Atomic Task를 추가하거나 범위 밖 사유를 업무 요약에 기록한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 1 — Centralize duplicate constants (CHILD_GROUP_LABEL, TARGET_LABEL, ACTION_TYPE_LABEL, ROUTINE_TARGET_LABEL)

#### Task 1.1: UI label constants SSOT 파일 생성 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-001] | Status: todo | Priority: 1 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/QuickActionPanel.tsx` (CHILD_GROUP_LABEL)
  2. `app/admin/homework-types-admin-section.tsx` (CHILD_GROUP_LABEL)
  3. `app/(dashboard)/TimelineEventDetailModal.tsx` (CHILD_GROUP_LABEL, ROUTINE_TARGET_LABEL)
  4. `app/(dashboard)/QuickActionsAdminModal.tsx` (TARGET_LABEL, ACTION_TYPE_LABEL)
  5. `app/admin/quick-actions-admin-section.tsx` (TARGET_LABEL, ACTION_TYPE_LABEL)
  6. `app/(dashboard)/RoutineItemsAdminModal.tsx` (TARGET_LABEL)
  7. `app/admin/routine-items-admin-section.tsx` (TARGET_LABEL)
- **Action**: Edit File | **Target**: `lib/ui/labels.ts` (신규 파일 생성)
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-001 `Conclusion`·`Status`)
- **Goal**: CHILD_GROUP_LABEL, TARGET_LABEL, ACTION_TYPE_LABEL, ROUTINE_TARGET_LABEL 4개 상수 map을 `lib/ui/labels.ts`에 생성하고 JSDoc 주석을 추가한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 1.2: QuickActionPanel.tsx에서 CHILD_GROUP_LABEL import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-002] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/ui/labels.ts` (Task 1.1에서 생성)
  2. `app/(dashboard)/QuickActionPanel.tsx`
- **Action**: Edit File | **Target**: `app/(dashboard)/QuickActionPanel.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-002 `Conclusion`·`Status`)
- **Goal**: `QuickActionPanel.tsx`의 정적 `CHILD_GROUP_LABEL` 상수 정의를 `lib/ui/labels.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-001

#### Task 1.3: homework-types-admin-section.tsx에서 CHILD_GROUP_LABEL import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-003] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/ui/labels.ts` (Task 1.1에서 생성)
  2. `app/admin/homework-types-admin-section.tsx`
- **Action**: Edit File | **Target**: `app/admin/homework-types-admin-section.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-003 `Conclusion`·`Status`)
- **Goal**: `homework-types-admin-section.tsx`의 정적 `CHILD_GROUP_LABEL` 상수 정의를 `lib/ui/labels.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-001

#### Task 1.4: TimelineEventDetailModal.tsx에서 CHILD_GROUP_LABEL·ROUTINE_TARGET_LABEL import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-004] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/ui/labels.ts` (Task 1.1에서 생성)
  2. `app/(dashboard)/TimelineEventDetailModal.tsx`
- **Action**: Edit File | **Target**: `app/(dashboard)/TimelineEventDetailModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-004 `Conclusion`·`Status`)
- **Goal**: `TimelineEventDetailModal.tsx`의 정적 `CHILD_GROUP_LABEL`과 `ROUTINE_TARGET_LABEL` 상수 정의를 `lib/ui/labels.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-001

#### Task 1.5: QuickActionsAdminModal.tsx에서 TARGET_LABEL·ACTION_TYPE_LABEL import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-005] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/ui/labels.ts` (Task 1.1에서 생성)
  2. `app/(dashboard)/QuickActionsAdminModal.tsx`
- **Action**: Edit File | **Target**: `app/(dashboard)/QuickActionsAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-005 `Conclusion`·`Status`)
- **Goal**: `QuickActionsAdminModal.tsx`의 정적 `TARGET_LABEL`과 `ACTION_TYPE_LABEL` 상수 정의를 `lib/ui/labels.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-001

#### Task 1.6: quick-actions-admin-section.tsx에서 TARGET_LABEL·ACTION_TYPE_LABEL import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-006] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/ui/labels.ts` (Task 1.1에서 생성)
  2. `app/admin/quick-actions-admin-section.tsx`
- **Action**: Edit File | **Target**: `app/admin/quick-actions-admin-section.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-006 `Conclusion`·`Status`)
- **Goal**: `quick-actions-admin-section.tsx`의 정적 `TARGET_LABEL`과 `ACTION_TYPE_LABEL` 상수 정의를 `lib/ui/labels.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-001

#### Task 1.7: RoutineItemsAdminModal.tsx에서 TARGET_LABEL import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-007] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/ui/labels.ts` (Task 1.1에서 생성)
  2. `app/(dashboard)/RoutineItemsAdminModal.tsx`
- **Action**: Edit File | **Target**: `app/(dashboard)/RoutineItemsAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-007 `Conclusion`·`Status`)
- **Goal**: `RoutineItemsAdminModal.tsx`의 정적 `TARGET_LABEL` 상수 정의를 `lib/ui/labels.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-001

#### Task 1.8: routine-items-admin-section.tsx에서 TARGET_LABEL import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-008] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/ui/labels.ts` (Task 1.1에서 생성)
  2. `app/admin/routine-items-admin-section.tsx`
- **Action**: Edit File | **Target**: `app/admin/routine-items-admin-section.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-008 `Conclusion`·`Status`)
- **Goal**: `routine-items-admin-section.tsx`의 정적 `TARGET_LABEL` 상수 정의를 `lib/ui/labels.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-001

### Phase 2 — Centralize ACTIVE_PROFILE_COOKIE (SSOT for cookie name)

#### Task 2.1: layout.tsx에서 ACTIVE_PROFILE_COOKIE import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-009] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/auth/session.ts` (ACTIVE_PROFILE_COOKIE SSOT)
  2. `app/(dashboard)/layout.tsx`
- **Action**: Edit File | **Target**: `app/(dashboard)/layout.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-009 `Conclusion`·`Status`)
- **Goal**: `layout.tsx`의 정적 `ACTIVE_PROFILE_COOKIE` 상수 정의를 `lib/auth/session.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 2.2: login/page.tsx에서 ACTIVE_PROFILE_COOKIE import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-010] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/auth/session.ts` (ACTIVE_PROFILE_COOKIE SSOT)
  2. `app/(auth)/login/page.tsx`
- **Action**: Edit File | **Target**: `app/(auth)/login/page.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-010 `Conclusion`·`Status`)
- **Goal**: `login/page.tsx`의 정적 `ACTIVE_PROFILE_COOKIE` 상수 정의를 `lib/auth/session.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 3 — Replace type casts with proper validation (Zod schemas)

#### Task 3.1: DashboardDeferred.tsx에서 타입 캐스트 → Zod 검증으로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-011] | Status: todo | Priority: 2 | Labels: refactor, type-safety | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/dashboard/DashboardDeferred.tsx`
  2. `app/(dashboard)/QuickActionPanel.tsx` (HomeworkQuickShortcut 타입 참조)
  3. `app/(dashboard)/QuickActionsAdminModal.tsx` (HomeworkTypeAdminRow 타입 참조)
  4. `app/(dashboard)/RoutineItemsAdminModal.tsx` (RoutineItemAdminRow 타입 참조)
- **Action**: Edit File | **Target**: `app/(dashboard)/dashboard/DashboardDeferred.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-011 `Conclusion`·`Status`)
- **Goal**: `DashboardDeferred.tsx`의 `as "kid7" | "kid4"` 타입 캐스트를 Zod 기반 검증 함수로 대체하여 런타임 타입 안전성을 확보한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 4 — Add warning logs to silent fallback functions

#### Task 4.1: TimelineFeedSection.tsx에 warn 로그 추가 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-012] | Status: todo | Priority: 2 | Labels: refactor, observability | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/TimelineFeedSection.tsx`
- **Action**: Edit File | **Target**: `app/(dashboard)/TimelineFeedSection.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-012 `Conclusion`·`Status`)
- **Goal**: `TimelineFeedSection.tsx`의 `normalizeChildGroup`와 `normalizeRoutineTarget` 함수에 유효하지 않은 값 수신 시 `console.warn` 로그를 추가한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 5 — Centralize magic numbers into lib/config.ts

#### Task 5.1: 매직 넘버 SSOT 파일 lib/config.ts 생성 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-013] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/events/db-queries.ts` (TWO_HOURS_MS)
  2. `lib/events/undo-policy.ts` (LOW_RISK_UNDO_WINDOW_MS, MEDICATION_UNDO_WINDOW_MS, HOMEWORK_UNDO_WINDOW_MS, ROUTINE_CHECK_UNDO_WINDOW_MS)
  3. `lib/dashboard/timeline.ts` (TIMELINE_LOOKBACK_MS, TIMELINE_EVENT_LIMIT)
- **Action**: Edit File | **Target**: `lib/config.ts` (신규 파일 생성)
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-013 `Conclusion`·`Status`)
- **Goal**: `db-queries.ts`, `undo-policy.ts`, `timeline.ts`에 흩어진 매직 넘버 상수를 `lib/config.ts`에 집합하고 JSDoc 주석을 추가한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 5.2: db-queries.ts에서 매직 넘버를 lib/config.ts import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-014] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/config.ts` (Task 5.1에서 생성)
  2. `lib/events/db-queries.ts`
- **Action**: Edit File | **Target**: `lib/events/db-queries.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-014 `Conclusion`·`Status`)
- **Goal**: `db-queries.ts`의 정적 `TWO_HOURS_MS` 상수 정의를 `lib/config.ts` import로 대체하고 로컬 정의를 제거한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-013

#### Task 5.3: undo-policy.ts에서 매직 넘버를 lib/config.ts import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-015] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/config.ts` (Task 5.1에서 생성)
  2. `lib/events/undo-policy.ts`
- **Action**: Edit File | **Target**: `lib/events/undo-policy.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-015 `Conclusion`·`Status`)
- **Goal**: `undo-policy.ts`의 정적 매직 넘버 상수(`LOW_RISK_UNDO_WINDOW_MS`, `MEDICATION_UNDO_WINDOW_MS`, `HOMEWORK_UNDO_WINDOW_MS`, `ROUTINE_CHECK_UNDO_WINDOW_MS`)를 `lib/config.ts` import로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-013

#### Task 5.4: timeline.ts에서 매직 넘버를 lib/config.ts import로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-016] | Status: todo | Priority: 2 | Labels: refactor, ssot | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/config.ts` (Task 5.1에서 생성)
  2. `lib/dashboard/timeline.ts`
- **Action**: Edit File | **Target**: `lib/dashboard/timeline.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-016 `Conclusion`·`Status`)
- **Goal**: `timeline.ts`의 정적 상수(`TIMELINE_LOOKBACK_MS`, `TIMELINE_EVENT_LIMIT`)를 `lib/config.ts`에서 re-export하도록 변경한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-013

### Phase 6 — Replace native confirm()/alert() with useConfirm hook

#### Task 6.1: useConfirm 훅 생성 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-017] | Status: todo | Priority: 2 | Labels: refactor, ui | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/admin/profile-delete-section.tsx` (현재 confirm/alert 사용 패턴)
- **Action**: Edit File | **Target**: `lib/hooks/use-confirm.ts` (신규 파일 생성)
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-017 `Conclusion`·`Status`)
- **Goal**: `confirm()` 대체용 `useConfirm` 훅을 `lib/hooks/use-confirm.ts`에 생성하고 JSDoc 주석을 추가한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 6.2: profile-delete-section.tsx에서 native confirm/alert → useConfirm 훅으로 변경 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-018] | Status: todo | Priority: 2 | Labels: refactor, ui | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/hooks/use-confirm.ts` (Task 6.1에서 생성)
  2. `app/admin/profile-delete-section.tsx`
- **Action**: Edit File | **Target**: `app/admin/profile-delete-section.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-018 `Conclusion`·`Status`)
- **Goal**: `profile-delete-section.tsx`의 native `confirm()`과 `alert()` 호출을 `useConfirm` 훅으로 대체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-017

### Phase 7 — Add JSDoc to Server Actions

#### Task 7.1: admin.ts Server Action에 JSDoc 추가 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-019] | Status: todo | Priority: 2 | Labels: docs, jsdoc | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/actions/admin.ts`
- **Action**: Edit File | **Target**: `app/actions/admin.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-019 `Conclusion`·`Status`)
- **Goal**: `admin.ts`의 모든 export 함수(`upsertDailyPin`, `createHomeworkType`, `deactivateHomeworkType`, `completeHomework`, `createRoutineItem`, `deactivateRoutineItem`, `completeRoutineItem`, `createQuickAction`, `deactivateQuickAction`, `createQuickActionForModal`, `deactivateQuickActionForModal`, `createHomeworkTypeForModal`, `deactivateHomeworkTypeForModal`, `createRoutineItemForModal`, `deactivateRoutineItemForModal`, `deleteProfile`)에 JSDoc 주석을 추가한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 7.2: events.ts Server Action에 JSDoc 추가 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-020] | Status: todo | Priority: 2 | Labels: docs, jsdoc | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/actions/events.ts`
- **Action**: Edit File | **Target**: `app/actions/events.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-020 `Conclusion`·`Status`)
- **Goal**: `events.ts`의 모든 export 함수(`createEvent`, `undoEvent`)에 JSDoc 주석을 추가한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 7.3: auth.ts Server Action에 JSDoc 추가 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-021] | Status: todo | Priority: 2 | Labels: docs, jsdoc | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/actions/auth.ts`
- **Action**: Edit File | **Target**: `app/actions/auth.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-021 `Conclusion`·`Status`)
- **Goal**: `auth.ts`의 모든 export 함수(`beginGoogleLogin`, `selectProfile`, `logoutProfile`)에 JSDoc 주석을 추가한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 8 — Remove @deprecated exports or add runtime warnings

#### Task 8.1: undo-policy.ts에서 @deprecated export 제거 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-022] | Status: todo | Priority: 2 | Labels: refactor, cleanup | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/events/undo-policy.ts`
  2. 코드베이스 전체에서 `KNOWN_ACTION_TYPES_LIST`, `ActionType` (undo-policy.ts에서 import) grep 검색
- **Action**: Edit File | **Target**: `lib/events/undo-policy.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-022 `Conclusion`·`Status`)
- **Goal**: `undo-policy.ts`의 `@deprecated` export인 `KNOWN_ACTION_TYPES_LIST`와 `ActionType` 타입을 제거한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 8.2: metadata.ts에서 @deprecated export 제거 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-023] | Status: todo | Priority: 2 | Labels: refactor, cleanup | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/events/metadata.ts`
  2. 코드베이스 전체에서 `KNOWN_ACTION_TYPES_SET` grep 검색
- **Action**: Edit File | **Target**: `lib/events/metadata.ts`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-023 `Conclusion`·`Status`)
- **Goal**: `metadata.ts`의 `@deprecated` export인 `KNOWN_ACTION_TYPES_SET`를 제거한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 9 — Security fix: console.error in error page

#### Task 9.1: error.tsx에서 전체 객체 로깅 → 요약 메시지 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-024] | Status: todo | Priority: 1 | Labels: security, fix | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/error.tsx`
- **Action**: Edit File | **Target**: `app/(dashboard)/error.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-024 `Conclusion`·`Status`)
- **Goal**: `error.tsx`의 `console.error("[Dashboard Error]", error)`를 `console.error("[Dashboard Error]", error.message)`로 변경하여 전체 객체 노출을 방지한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 10 — Verification & linting

#### Task 10.1: 전체 검증 실행 [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-025] | Status: todo | Priority: 3 | Labels: verify | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. preceding tasks의 git diff 전체
- **Action**: Bash | **Target**: N/A (verification only)
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-025 `Conclusion`·`Status`)
- **Goal**: `just verify`를 실행하여 lint, typecheck, test가 모두 통과하는지 검증한다.
- **Diagnostics**: 0
- **Verify**: `just verify`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-024

### Phase 11 — Blueprint closeout

#### Task 11.1: Roll-up 작성 및 plan-close [Level: Low] [Unit: Atomic]
- Task-ID: [FS-MED-099] | Status: todo | Priority: 3 | Labels: docs, closeout | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Closeout**: `docs/plans/PLAN_familysync_code_quality_refactor.md` (Task FS-MED-099 `Conclusion`·`Status`)
- **Goal**: 선행 Task Conclusion을 근거로 `## 🔁 Conclusion & Summary` Roll-up 1문단을 실측으로 작성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/PLAN_familysync_code_quality_refactor.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-MED-025

## 🔁 Conclusion & Summary

- **Roll-up**: <!-- Closeout Task(FS-MED-099)에서 실측 작성. todo 상태 placeholder 금지 -->

## ✅ Definition of Done (DoD)

> **작성 규칙**: 사람이 개입해야 하는 수동 스모크 테스트(Manual Smoke Test) 작성을 금지합니다.
> 모든 DoD 항목은 기계적으로 자동 검증 가능한 형태로 작성하되, 실행할 명령어는 **반드시 백틱(\`)으로 감싸서** 리스트 항목으로 작성하세요. `[ ]` 체크리스트 포맷은 사용하지 마세요.
> **Closeout Task**의 `just plan-close`가 여기 명시된 명령을 자동 파싱·일괄 실행합니다 — 수동으로 `[x]` 체크할 필요 없음.

- `just verify`
- `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md`

## 검증 행렬

| Scope | Command |
| :--- | :--- |
| Blueprint | `just plan-lint docs/plans/PLAN_familysync_code_quality_refactor.md` |
| Full verification | `just verify` |
