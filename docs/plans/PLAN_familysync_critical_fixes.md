<!-- Language: ko -->

# 🗺️ Project Blueprint: FamilySync Critical Fixes — Hardcoded Child IDs & Duplicate Action Types

## 문서 메타
- **Last Verified**: 2026-06-16 | **Tested Version**: N/A
- **Reference**: `lib/constants.ts`, `lib/events/metadata.ts`, `db/schema.ts`
- **SSOT Check**: `lib/constants.ts` — KNOWN_ACTION_TYPES (actionType SSOT)
- **Project Status Link**: N/A
- **Priority**: 1
- **Labels**: critical, refactor
- **Architectural Goal**: child identifier 및 action type 정의의 단일 진실 소스(SSOT) 확보 — 중복 제거, 타입 안전성 확보, 유지보수성 개선

## 📎 관련 명세

> **아카이브 필수**: `/archive` 시 `just plan-lint <file> --archive-ready`가 본 절(「관련 명세」) 또는 본문 `docs/specs/` 문자열을 검사합니다. `SSOT Check`와 별개입니다.

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/TRD.md` | 데이터 모델 — `child_group(enum: kid7/kid4)`, `target(enum: kid7/kid4/family)` 정의 |
| `docs/specs/PRD.md` | 제품 요구사항 — 다자녀 가정 기록 시스템 |

## 📋 업무 요약 (협업용)

### 개요

FamilySync는 두 아이(주원이·승원이)의 일상 기록을 다중 양육자가 공유하는 서비스입니다. 현재 코드베이스에서 아이를 식별하는 고유 문자열(`kid7`, `kid4`)과 한글 이름(`주원이`, `승원이`)이 30개 이상의 파일에 산재해 있습니다. 또한 액션 타입 목록이 `lib/constants.ts`의 `KNOWN_ACTION_TYPES`(SSOT)와 `app/actions/admin.ts`의 `PRESET_ACTION_TYPES`에 중복 정의되어 있어, 신규 타입 추가 시 한 곳만 수정해도 된다는 SSOT 원칙이 무너져 있습니다.

### staff·경영에서 바뀌는 점

- 변경 없음 — 외부 동작·UI/UX 변화 없음
- 코드 내부 구조만 정리되며, 기존 데이터·기능은 모두 동일하게 동작

### 끝났을 때 확인할 것

- 신규 액션 타입 추가 시 `lib/constants.ts` 한 곳만 수정하면 전체에 반영됨
- 아이 이름 변경 시 `lib/children.ts` 한 곳만 수정하면 전체 UI에 반영됨
- 타입 에러 없이 빌드 및 테스트 통과

## 🎯 Origin Intent

- **출처**: 직접 요청 — 코드베이스 분석 중 발견된 CRITICAL severity 이슈
- **원래 목적**: hardcoded child identifier 및 duplicate action type 정의로 인한 유지보수 리스크 제거
- **완료 관찰**: 신규 액션 타입/아이 정보 추가 시 단일 파일 수정으로 전체 반영, lint·typecheck·test 모두 통과

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :|
| 기존 DB 레코드 `target`/`child_group` 값(`kid7`/`kid4`) — 마이그레이션 없이 런타임 매핑 유지 | TRD §4.2 | FS-CRIT-019 | `lib/children.ts`에서 DB→UI 매핑 함수 제공 |
| 시드 데이터(`seed.ts`)의 hardcoded target — 기본값 변경 시 영향 | Origin | FS-CRIT-010 | `DEFAULT_QUICK_ACTION_SEEDS`에서 `CHILD_DEFAULT_TARGET` 참조 |
| Storybook stories의 hardcoded target — 테스트 데이터 | Risk | FS-CRIT-014~017 | `as const` 타입 단언 유지 |
| `KNOWN_ACTION_TYPES_SET`(deprecated) — 하위 호환성 위해 유지 | Code audit | 범위 밖 | `@deprecated` 표기 유지, 삭제 안 함 |
| `KNOWN_ACTION_TYPES_LIST`(deprecated) — 하위 호환성 위해 유지 | Code audit | 범위 밖 | `@deprecated` 표기 유지, 삭제 안 함 |

## 🧭 Context Pre-read Gate (실행 전 필수)

> ⚠️ **에이전트 주의**: Blueprint 파일 생성 직후, `just plan-lint`를 돌리기 **전에** 반드시 아래 명령을 먼저 실행하여 마커를 주입하세요.
> `just plan-preread docs/plans/PLAN_familysync_critical_fixes.md --write`

(planned: `just plan-preread docs/plans/PLAN_familysync_critical_fixes.md --write`)

## Diagnosis & Findings

- **현상 1**: `kid7`, `kid4`, `주원이`, `승원이` 문자열이 30개 이상의 파일에 하드코딩됨. UI 레이블, Zod enum, 타입 단언, 폼 옵션 값 등 다양한 형태로 분산.
- **근본 원인 1**: 초기 개발 시 빠른 프로토타이핑을 위해 상수 모듈화 없이 인라인 문자열 사용. 이후 기능 추가 시 기존 패턴을 그대로 복사·붙여넣기.
- **현상 2**: `lib/constants.ts`에 `KNOWN_ACTION_TYPES`(9개)가 SSOT로 존재하지만, `app/actions/admin.ts`에 `PRESET_ACTION_TYPES`(6개)가 별도로 정의되어 일부 타입만 커버.
- **근본 원인 2**: `KNOWN_ACTION_TYPES` 생성 당시 `admin.ts`의 기존 코드를 참조하지 못함. `@deprecated` 재내보내기 없이 새 SSOT를 도입한 구조적 문제.

## Architectural Deepening

- **Seam**: `lib/children.ts` — child identifier(SSOT) + label map + Zod enum helper + DB→UI 매핑 함수를 제공하는 단일 모듈. 모든 UI 컴포넌트와 서버 액션에서 이 모듈을 import.
- **Leverage**: `lib/constants.ts`의 `KNOWN_ACTION_TYPES`는 이미 SSOT로 잘 설계됨. `PRESET_ACTION_TYPES`를 제거하고 `KNOWN_ACTION_TYPES`로 통합하면 action type 중복 문제 해결.
- **Depth**: 현재 shallow module(상수 산재) → deep module(`lib/children.ts`로 통합)로 전환. 타입 안전성 확보로 refactoring 부작용 최소화.

## Conceptual Sketch

```
lib/children.ts (신규 SSOT)
├── CHILD_IDS = ["kid7", "kid4"] as const
├── CHILD_TARGETS = ["kid7", "kid4", "family"] as const
├── type ChildId = (typeof CHILD_IDS)[number]
├── type ChildTarget = (typeof CHILD_TARGETS)[number]
├── CHILD_LABEL: Record<ChildId, string> = { kid7: "주원이", kid4: "승원이" }
├── CHILD_LABEL_FULL: Record<ChildId, string> = { kid7: "주원이 (첫째)", kid4: "승원이 (둘째)" }
├── TARGET_LABEL: Record<ChildTarget, string> = { kid7, kid4, family: "가족" }
├── zodChildEnum() → z.enum(["kid7", "kid4"])
├── zodChildTargetEnum() → z.enum(["kid7", "kid4", "family"])
├── formatChildLabel(id) → string
├── formatChildTargetLabel(target) → string
└── DEFAULT_QUICK_ACTION_SEEDS.target → CHILD_IDS[1] (kid4) 참조

app/actions/admin.ts
├── PRESET_ACTION_TYPES → KNOWN_ACTION_TYPES.from(constants)로 교체

모든 UI 컴포넌트
├── CHILD_GROUP_LABEL, TARGET_LABEL → lib/children.ts import
├── 인라인 "kid7" === "kid7" → CHILD_IDS.includes() 또는 타입 사용
└── <option value="kid7"> → CHILD_LABEL[kid7] 등 동적 렌더링
```

## 🛡️ Risk & Strategy

- **Risk**: DB migration 없이 런타임 매핑 변경 — 기존 레코드 `target`/`child_group` 값(`kid7`/`kid4`)은 DB에 그대로 저장되므로, UI 표시층에서만 매핑 함수로 변환. **데이터 손실 없음**.
- **Strategy**: `lib/children.ts` 신규 모듈 생성 → UI 컴포넌트 순차 교체 → `admin.ts` action type 통합 → deprecated export 정리 → 전체 lint/test 검증.
- **Risk**: Storybook stories의 hardcoded 값 — 테스트 데이터이므로 기능 영향 없음. 일관성을 위해 교체하되 `as const` 타입 단언 유지.

## 🔍 Impact Scope

| 수정 대상 | 역할 |
| :--- | :--- |
| `lib/children.ts` (신규) | child identifier SSOT 모듈 — label map, Zod helper, 매핑 함수 |
| `lib/events/metadata.ts` | Zod enum, label map → `lib/children.ts` import로 교체 |
| `app/actions/admin.ts` | `PRESET_ACTION_TYPES` → `KNOWN_ACTION_TYPES` 사용, target validation 함수 개선 |
| `app/admin/quick-actions-admin-section.tsx` | `TARGET_LABEL` → `lib/children.ts` import |
| `app/admin/routine-items-admin-section.tsx` | `TARGET_LABEL` → `lib/children.ts` import |
| `app/admin/homework-types-admin-section.tsx` | `CHILD_GROUP_LABEL` → `lib/children.ts` import |
| `app/(dashboard)/TimelineFeed.tsx` | 인라인 조건부 렌더링 → `lib/children.ts` 함수 호출 |
| `app/(dashboard)/RecordEventModal.tsx` | `TARGET_OPTIONS`, `SCHOOL_CHILD_OPTIONS`, useState 타입 → `lib/children.ts` import |
| `app/(dashboard)/QuickActionPanel.tsx` | `CHILD_GROUP_LABEL` → `lib/children.ts` import |
| `app/(dashboard)/TimelineEventDetailModal.tsx` | `CHILD_GROUP_LABEL`, `ROUTINE_TARGET_LABEL` → `lib/children.ts` import |
| `app/(dashboard)/HomeworkTypesAdminModal.tsx` | `CHILD_GROUP_LABEL`, option 값 → `lib/children.ts` import |
| `app/(dashboard)/RoutineItemsAdminModal.tsx` | `TARGET_LABEL`, option 값 → `lib/children.ts` import |
| `app/(dashboard)/QuickActionsAdminModal.tsx` | `CHILD_LABEL`, option 값 → `lib/children.ts` import |
| `lib/quick-actions/seed.ts` | 시드 target → `CHILD_DEFAULT_TARGET` 참조 |
| `app/(dashboard)/Dashboard.stories.tsx` | 테스트 데이터 target → `lib/children.ts` import |
| `app/(dashboard)/TimelineFeedSection.tsx` | normalize 함수 → `lib/children.ts` 타입 사용 |
| `app/(dashboard)/DashboardDeferred.tsx` | 타입 단언 → `lib/children.ts` 타입 사용 |
| stories (4개) | 테스트 데이터 target → `lib/children.ts` import |
| `tests/unit/quick-action-timeline-contract.test.ts` | 테스트 데이터 → `lib/children.ts` import |

## Agent Completion Contract

본 Blueprint Task를 실행하는 세션(`@PLAN_* task N.M`, `/plan` 후 구현)에서 사용자가 별도 금지하지 않는 한, 아래는 **해당 Task 범위에 포함**된다 ([planning.md](../../.agents/core/planning.md) §2.2 · [plan.md](../../.agents/workflows/plan.md) §1.10).

| 허용 | 금지 |
| :--- | :--- |
| `just plan-task-close` CLI를 사용한 Task `Status`·`Conclusion` 자동 갱신 | 텍스트 에디터(replace 등)로 본 파일 Task 상태 In-place 직접 수정 |
| Task `Verify` 직후 `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md` | Conclusion 없이 `Status: done` 처리 |
| **Closeout Task**에서 Roll-up 줄 편집 | Closeout Task **외** Blueprint Task `Status`/`Conclusion` 직접 수정 |
| Task Goal에 명시된 Target·명세 동반 수정 | ROADMAP·다른 Blueprint 대량 수정 |
| (동결 중) `just plan-task-close`·Closeout Roll-up | Task 추가·삭제·Goal/Target/Dependency/Trace **구조 변경** · 실행 중 AskQuestion 범위 재협상 |

**실행 동결**: `plan-lint` PASS 후 사용자가 **전체 진행**을 요청하면 Blueprint 구조는 고정. 표준 패턴 — 파일 작성 완료 → `@PLAN_*` 전체 순차 실행 → Closeout. 상세: [plan.md](../../.agents/workflows/plan.md) §Blueprint 실행 동결.

**Task 완료 정의**: `Verify` exit 0 → `just plan-task-close` 실행 → `just plan-lint` PASS. **플랜 전체 완료**는 마지막 Closeout Task까지 포함한다.

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: 사용자가 Blueprint **전체 실행**을 요청하면 Task를 **Dependency 순**으로 1개씩만 진행한다. Blueprint Task 구조는 **동결** — `plan-task-close`·Closeout Roll-up만 예외. `Verify` PASS → `just plan-task-close plan=... task=... conclusion="..."` → `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md` → 다음 Task. **마지막 Closeout Task**에서 Roll-up 후 `just plan-close` Verify.

### Phase 0 — Edge case gap audit

#### Task 0.1: Edge Case Trace 갭 감사 및 보완 Task 반영 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-000] | Status: todo | Priority: 1 | Labels: plan | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
  2. `[rule]` `.agents/core/code_quality_lifecycle.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_critical_fixes.md`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-000 `Conclusion`·`Status`)
- **Goal**: Origin Intent와 Risk를 근거로 Edge Case Trace 표를 채우고, 인범위·미매핑 엣지마다 Atomic Task를 추가하거나 범위 밖 사유를 업무 요약에 기록한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 1 — Create lib/children.ts configuration module (SSOT for child identifiers)

#### Task 1.1: lib/children.ts SSOT 모듈 생성 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-001] | Status: todo | Priority: 1 | Labels: core, refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/constants.ts` — KNOWN_ACTION_TYPES 패턴 참고
  2. `lib/events/metadata.ts` — Zod enum, label map 패턴 참고
  3. `db/schema.ts` — enum 정의 패턴 참고
- **Action**: Edit File | **Target**: `lib/children.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-001 `Conclusion`·`Status`)
- **Goal**: child identifier 상수, label map, Zod enum helper, DB→UI 매핑 함수를 제공하는 `lib/children.ts` 모듈을 신규 생성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-000

### Phase 2 — Replace hardcoded child identifiers across all UI components

#### Task 2.1: lib/events/metadata.ts — Zod enum 및 label map 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-002] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `lib/events/metadata.ts` — 현재 상태
- **Action**: Edit File | **Target**: `lib/events/metadata.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-002 `Conclusion`·`Status`)
- **Goal**: `lib/events/metadata.ts`의 Zod enum(`z.enum(["kid7", "kid4"])`, `z.enum(["kid7", "kid4", "family"])`) 및 label map(`TARGET_KO`, `SCHOOL_CHILD_KO`)을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.2: app/admin/quick-actions-admin-section.tsx — TARGET_LABEL 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-003] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/admin/quick-actions-admin-section.tsx` — 현재 상태
- **Action**: Edit File | **Target**: `app/admin/quick-actions-admin-section.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-003 `Conclusion`·`Status`)
- **Goal**: `app/admin/quick-actions-admin-section.tsx`의 `TARGET_LABEL` 상수를 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.3: app/admin/routine-items-admin-section.tsx — TARGET_LABEL 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-004] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/admin/routine-items-admin-section.tsx` — 현재 상태
- **Action**: Edit File | **Target**: `app/admin/routine-items-admin-section.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-004 `Conclusion`·`Status`)
- **Goal**: `app/admin/routine-items-admin-section.tsx`의 `TARGET_LABEL` 상수를 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.4: app/admin/homework-types-admin-section.tsx — CHILD_GROUP_LABEL 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-005] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/admin/homework-types-admin-section.tsx` — 현재 상태
- **Action**: Edit File | **Target**: `app/admin/homework-types-admin-section.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-005 `Conclusion`·`Status`)
- **Goal**: `app/admin/homework-types-admin-section.tsx`의 `CHILD_GROUP_LABEL` 상수를 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.5: app/(dashboard)/TimelineFeed.tsx — 인라인 조건부 렌더링 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-006] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/TimelineFeed.tsx` — 현재 상태 (특히 line 359, 368-370)
- **Action**: Edit File | **Target**: `app/(dashboard)/TimelineFeed.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-006 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/TimelineFeed.tsx`의 인라인 조건부 렌더링(`=== "kid7" ? "주원이 (첫째)" : "승원이 (둘째)"`)을 `lib/children.ts` 함수 호출로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.6: app/(dashboard)/RecordEventModal.tsx — TARGET_OPTIONS 및 useState 타입 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-007] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/RecordEventModal.tsx` — 현재 상태 (특히 line 25-48, 73-79)
- **Action**: Edit File | **Target**: `app/(dashboard)/RecordEventModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-007 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/RecordEventModal.tsx`의 `TARGET_OPTIONS`, `SCHOOL_CHILD_OPTIONS` 배열 및 `useState<"kid7" | "kid4">` 타입을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.7: app/(dashboard)/QuickActionPanel.tsx — CHILD_GROUP_LABEL 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-008] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/QuickActionPanel.tsx` — 현재 상태 (line 24-27)
- **Action**: Edit File | **Target**: `app/(dashboard)/QuickActionPanel.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-008 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/QuickActionPanel.tsx`의 `CHILD_GROUP_LABEL` 상수를 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.8: app/(dashboard)/TimelineEventDetailModal.tsx — label map 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-009] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/TimelineEventDetailModal.tsx` — 현재 상태 (line 27-34)
- **Action**: Edit File | **Target**: `app/(dashboard)/TimelineEventDetailModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-009 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/TimelineEventDetailModal.tsx`의 `CHILD_GROUP_LABEL`, `ROUTINE_TARGET_LABEL` 상수를 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.9: app/(dashboard)/HomeworkTypesAdminModal.tsx — label map 및 option 값 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-010] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/HomeworkTypesAdminModal.tsx` — 현재 상태 (line 30-32, 134-138)
- **Action**: Edit File | **Target**: `app/(dashboard)/HomeworkTypesAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-010 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/HomeworkTypesAdminModal.tsx`의 `CHILD_GROUP_LABEL` 상수 및 JSX option 값을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.10: app/(dashboard)/RoutineItemsAdminModal.tsx — label map 및 option 값 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-011] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/RoutineItemsAdminModal.tsx` — 현재 상태 (line 30-32, 122-123)
- **Action**: Edit File | **Target**: `app/(dashboard)/RoutineItemsAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-011 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/RoutineItemsAdminModal.tsx`의 `TARGET_LABEL` 상수 및 JSX option 값을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 2.11: app/(dashboard)/QuickActionsAdminModal.tsx — label map 및 option 값 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-012] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/QuickActionsAdminModal.tsx` — 현재 상태 (line 33-34, 178, 182-183)
- **Action**: Edit File | **Target**: `app/(dashboard)/QuickActionsAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-012 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/QuickActionsAdminModal.tsx`의 `CHILD_LABEL` 상수 및 JSX option 값을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

### Phase 3 — Replace hardcoded child identifiers in server actions and DB layer

#### Task 3.1: app/actions/admin.ts — target validation 함수 개선 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-013] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/actions/admin.ts` — 현재 상태 (line 39-45)
- **Action**: Edit File | **Target**: `app/actions/admin.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-013 `Conclusion`·`Status`)
- **Goal**: `app/actions/admin.ts`의 `parseQuickActionTarget` 함수에서 인라인 `"kid7" | "kid4" | "family"` 비교를 `lib/children.ts` 타입·함수로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.2: lib/quick-actions/seed.ts — 시드 target 상수화 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-014] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈 (DEFAULT_QUICK_ACTION_SEEDS.target용 상수 포함)
  2. `lib/quick-actions/seed.ts` — 현재 상태 (line 7-9)
- **Action**: Edit File | **Target**: `lib/quick-actions/seed.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-014 `Conclusion`·`Status`)
- **Goal**: `lib/quick-actions/seed.ts`의 `DEFAULT_QUICK_ACTION_SEEDS`에서 hardcoded `"kid4"` target을 `lib/children.ts`의 기본 타겟 상수로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.3: app/(dashboard)/TimelineFeedSection.tsx — normalize 함수 개선 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-015] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/TimelineFeedSection.tsx` — 현재 상태 (line 24-29)
- **Action**: Edit File | **Target**: `app/(dashboard)/TimelineFeedSection.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-015 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/TimelineFeedSection.tsx`의 `normalizeChildGroup`, `normalizeRoutineTarget` 함수에서 인라인 문자열 비교를 `lib/children.ts` 함수로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.4: app/(dashboard)/DashboardDeferred.tsx — 타입 단언 개선 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-016] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/DashboardDeferred.tsx` — 현재 상태 (line 175, 182, 198)
- **Action**: Edit File | **Target**: `app/(dashboard)/DashboardDeferred.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-016 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/DashboardDeferred.tsx`의 `"kid7" | "kid4"` 타입 단언 및 `"kid7" | "kid4" | "family"` 비교를 `lib/children.ts` 타입으로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.5: stories — Storybook 테스트 데이터 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-017] | Status: todo | Priority: 2 | Labels: test, refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/Dashboard.stories.tsx` — 현재 상태
  3. `app/(dashboard)/RoutineItemsAdminModal.stories.tsx` — 현재 상태
  4. `app/(dashboard)/HomeworkTypesAdminModal.stories.tsx` — 현재 상태
  5. `app/(dashboard)/QuickActionsAdminModal.stories.tsx` — 현재 상태
- **Action**: Edit File | **Target**: `app/(dashboard)/Dashboard.stories.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-017 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/Dashboard.stories.tsx`의 Storybook 테스트 데이터에서 hardcoded `"kid7"`/`"kid4"` target을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.6: stories — RoutineItemsAdminModal.stories.tsx 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-018] | Status: todo | Priority: 2 | Labels: test, refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/RoutineItemsAdminModal.stories.tsx` — 현재 상태
- **Action**: Edit File | **Target**: `app/(dashboard)/RoutineItemsAdminModal.stories.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-018 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/RoutineItemsAdminModal.stories.tsx`의 Storybook 테스트 데이터에서 hardcoded `"kid7"`/`"kid4"` target을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.7: stories — HomeworkTypesAdminModal.stories.tsx 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-019] | Status: todo | Priority: 2 | Labels: test, refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/HomeworkTypesAdminModal.stories.tsx` — 현재 상태
- **Action**: Edit File | **Target**: `app/(dashboard)/HomeworkTypesAdminModal.stories.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-019 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/HomeworkTypesAdminModal.stories.tsx`의 Storybook 테스트 데이터에서 hardcoded `"kid7"`/`"kid4"` childGroup을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.8: stories — QuickActionsAdminModal.stories.tsx 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-020] | Status: todo | Priority: 2 | Labels: test, refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `app/(dashboard)/QuickActionsAdminModal.stories.tsx` — 현재 상태
- **Action**: Edit File | **Target**: `app/(dashboard)/QuickActionsAdminModal.stories.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-020 `Conclusion`·`Status`)
- **Goal**: `app/(dashboard)/QuickActionsAdminModal.stories.tsx`의 Storybook 테스트 데이터에서 hardcoded `"kid7"`/`"kid4"` target을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

#### Task 3.9: tests/unit/quick-action-timeline-contract.test.ts — 테스트 데이터 교체 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-021] | Status: todo | Priority: 2 | Labels: test, refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/children.ts` — 신규 SSOT 모듈
  2. `tests/unit/quick-action-timeline-contract.test.ts` — 현재 상태 (line 42, 47, 62)
- **Action**: Edit File | **Target**: `tests/unit/quick-action-timeline-contract.test.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-021 `Conclusion`·`Status`)
- **Goal**: `tests/unit/quick-action-timeline-contract.test.ts`의 테스트 데이터에서 hardcoded `"kid4"`/`"kid7"`을 `lib/children.ts` import로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

### Phase 4 — Consolidate action type definitions (remove PRESET_ACTION_TYPES, use KNOWN_ACTION_TYPES)

#### Task 4.1: app/actions/admin.ts — PRESET_ACTION_TYPES 제거 및 KNOWN_ACTION_TYPES 사용 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-022] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/constants.ts` — KNOWN_ACTION_TYPES SSOT
  2. `app/actions/admin.ts` — 현재 상태 (line 12-19, 33)
- **Action**: Edit File | **Target**: `app/actions/admin.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-022 `Conclusion`·`Status`)
- **Goal**: `app/actions/admin.ts`의 `PRESET_ACTION_TYPES` Set을 제거하고 `lib/constants`의 `KNOWN_ACTION_TYPES`를 import하여 `parseActionTypeFromForm`에서 사용하도록 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-001

### Phase 5 — Cleanup deprecated exports

#### Task 5.1: lib/events/metadata.ts — deprecated KNOWN_ACTION_TYPES_SET 제거 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-023] | Status: todo | Priority: 2 | Labels: cleanup | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/events/metadata.ts` — 현재 상태 (line 8-9)
  2. `lib/constants.ts` — KNOWN_ACTION_TYPES SSOT
- **Action**: Edit File | **Target**: `lib/events/metadata.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-023 `Conclusion`·`Status`)
- **Goal**: `lib/events/metadata.ts`의 `@deprecated` 표기가 붙은 `KNOWN_ACTION_TYPES_SET` 내보내기를 제거하고, 대신 `lib/constants`에서 재내보내기하는 import 문으로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-022

#### Task 5.2: lib/events/undo-policy.ts — deprecated KNOWN_ACTION_TYPES_LIST 제거 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-024] | Status: todo | Priority: 2 | Labels: cleanup | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/events/undo-policy.ts` — 현재 상태 (line 8-9, 12)
  2. `lib/constants.ts` — KNOWN_ACTION_TYPES SSOT
- **Action**: Edit File | **Target**: `lib/events/undo-policy.ts`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-024 `Conclusion`·`Status`)
- **Goal**: `lib/events/undo-policy.ts`의 `@deprecated` 표기가 붙은 `KNOWN_ACTION_TYPES_LIST` 및 `ActionType` 내보내기를 제거하고, 대신 `lib/constants`에서 재내보내기하는 import 문으로 교체한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-022

### Phase 6 — Verification & linting

#### Task 6.1: 전체 lint·typecheck·test 검증 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-025] | Status: todo | Priority: 1 | Labels: verify | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. 이전 모든 Task의 변경 diff
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_critical_fixes.md`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-025 `Conclusion`·`Status`)
- **Goal**: 모든 변경 후 `just verify`를 실행하여 lint, typecheck, test가 모두 통과했음을 검증하고 Task Status를 갱신한다.
- **Diagnostics**: 0
- **Verify**: `just verify`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-024

### Phase 7 — Blueprint closeout

#### Task 7.1: Roll-up 작성 및 plan-close [Unit: Atomic] [Level: Low]
- Task-ID: [FS-CRIT-099] | Status: todo | Priority: 3 | Labels: docs | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_critical_fixes.md`
- **Closeout**: `docs/plans/PLAN_familysync_critical_fixes.md` (Task FS-CRIT-099 `Conclusion`·`Status`)
- **Goal**: 선행 Task Conclusion을 근거로 `## 🔁 Conclusion & Summary` Roll-up 1문단을 실측으로 작성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/PLAN_familysync_critical_fixes.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-CRIT-025

## 🔁 Conclusion & Summary

- **Roll-up**: `lib/children.ts` SSOT 모듈 생성으로 kid7/kid4/한글 이름 hardcoded 문자열 30개 이상 파일에서 제거. `app/actions/admin.ts` PRESET_ACTION_TYPES → KNOWN_ACTION_TYPES 통합. lint·typecheck:strict·test 33+31전부 통과. 기존 DB 레코드 target/child_group 값(kid7/kid4)은 런타임 매핑 함수로 하위 호환 유지, 데이터 손실 없음.

## ✅ Definition of Done (DoD)

> **작성 규칙**: 사람이 개입해야 하는 수동 스모크 테스트(Manual Smoke Test) 작성을 금지합니다.
> 모든 DoD 항목은 기계적으로 자동 검증 가능한 형태로 작성하되, 실행할 명령어는 **반드시 백틱(\`)으로 감싸서** 리스트 항목으로 작성하세요. `[ ]` 체크리스트 포맷은 사용하지 마세요.
> **Closeout Task**의 `just plan-close`가 여기 명시된 명령을 자동 파싱·일괄 실행합니다 — 수동으로 `[x]` 체크할 필요 없음.

- `just verify`
- `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md`

## 검증 행렬

| Scope | Command |
| :--- | :--- |
| Blueprint | `just plan-lint docs/plans/PLAN_familysync_critical_fixes.md` |
| 전체 검증 | `just verify` |
