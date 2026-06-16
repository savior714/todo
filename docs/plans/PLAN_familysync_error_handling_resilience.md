<!-- Language: ko -->

# 🗺️ Project Blueprint: FamilySync 오류 처리 및 탄력성 개선 (HIGH)

## 문서 메타
- **Last Verified**: 2026-06-16 | **Tested Version**: N/A
- **Reference**: N/A
- **SSOT Check**: 활성 Blueprint — plan-lint HARD 검증 대상
- **Project Status Link**: N/A
- **Priority**: 1
- **Labels**: refactor, resilience, high-severity
- **Architectural Goal**: 중복 try/catch 보일러플레이트 제거 + DB 실패 시 사용자 피드백 확보 + `void status.pending` 안티패턴 제거

## 📎 관련 명세

> **아카이브 필수**: `/archive` 시 `just plan-lint <file> --archive-ready`가 본 절(「관련 명세」) 또는 본문 `docs/specs/` 문자열을 검사합니다. `SSOT Check`와 별개입니다.

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/TRD.md` | §3.1 프론트엔드 RSC/Client 분리, §3.3 인증/권한 — 서버 오류 시 Graceful degradation 요구사항 |

## 📋 업무 요약 (협업용)

### 개요

대시보드 화면에서 데이터베이스 쿼리 실패 시 사용자가 전혀 인지하지 못하는 silent failure가 3개 컴포넌트에서 발생하고 있으며, DashboardDeferred.tsx에는 4개의 완전히 동일한 try/catch 보일러플레이트가 복사·붙여넣기 상태로 존재합니다. 또한 관리자 모달 3곳에서 `void status.pending` 안티패턴이 사용되어 React Form Status API의 의도된 용도와 다르게 사용되고 있습니다.

### staff·경영에서 바뀌는 점

- DB 연결 실패 시 "테이블을 불러오지 못했습니다" 안내가 화면에 표시되어 운영자가 즉시 인지 가능
- 동일한 오류 처리 코드가 한 곳에서 관리되어 수정·보수가 쉬워짐
- 폼 제출 중 상태 표시가 React의 표준 방식으로 동작

### 끝났을 때 확인할 것

- 대시보드 로딩 시 DB 오류 발생 → 화면에 amber 경고 배너 표시
- TimelineFeed / DailyPinBanner 로딩 시 DB 오류 발생 → 화면에 경고 표시 또는 빈 상태 명확히 전달
- 관리자 모달에서 폼 제출 중 pending 상태가 정상적으로 동작

## 🎯 Origin Intent

- **출처**: 직접 코드 리뷰 발견
- **원래 목적**: HIGH severity 오류 처리 패턴 개선 — silent failure 제거 + 코드 중복 제거
- **완료 관찰**: 대시보드에서 DB 오류 발생 시 amber 경고 배너가 표시되고, 모든 try/catch가 `lib/dashboard/error.ts`로 통합됨

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| Turso 연결 타임아웃 시 빈 배열 반환 → UI가 "데이터 없음"으로 오인 | Risk | FS-HIGH-003, FS-HIGH-004 | `failed` 플래그로 구분 |
| `console.error`에 전체 Error 객체 전달 → 시크릿 노출 위험 | Risk | FS-HIGH-005 | message + digest만 추출 |
| `void status.pending` 제거 후 폼 재전송 시 duplicate submission | Risk | FS-HIGH-006~008 | `router.refresh()`로 데이터 갱신 |
| 대시보드 4개 쿼리 중 일부만 실패 → 혼합된 성공/실패 상태 UI | Origin | FS-HIGH-002 | 각 failed 플래그 개별 렌더링 |
| `safeDbQuery` 제네릭 타입 — 실패 시 빈 배열의 타입 안정성 | Risk | FS-HIGH-003~005 | `T[]` 제네릭 파라미터 사용 |

## 🧭 Context Pre-read Gate (실행 전 필수)

> ⚠️ **에이전트 주의**: Blueprint 파일 생성 직후, `just plan-lint`를 돌리기 **전에** 반드시 아래 명령을 먼저 실행하여 마커를 주입하세요.
> `just plan-preread docs/plans/PLAN_familysync_error_handling_resilience.md --write`

(planned: `just plan-preread docs/plans/PLAN_familysync_error_handling_resilience.md --write`)

## Diagnosis & Findings

### 현상 1: DashboardDeferred.tsx의 중복 try/catch 보일러플레이트 (HIGH)

`DashboardDeferred.tsx`에는 `loadQuickActionsForDashboard`, `loadHomeworkTypesForDashboard`, `loadRoutineItemsForDashboard`, `loadHomeworkLogsTodayForDashboard` 4개의 함수가 존재하며, 각각이 **완전히 동일한** try/catch 패턴을 복사·붙여넣기하고 있다.

```typescript
// 4개 함수 모두 동일한 패턴 (예시: loadQuickActionsForDashboard)
try {
  rows = await db.select(...).from(...).where(...);
} catch (err: unknown) {
  failed = true;
  const message = err instanceof Error ? err.message : String(err);
  const code = /* 10줄의 타입 가드 */;
  console.error("[dashboard] quick_actions load failed", { familyId, message, ...(code !== undefined ? { code } : {}) });
}
```

이 10줄의 코드 블록이 4개 함수에 완전히 동일하게 반복된다.

### 현상 2: TimelineFeedSection.tsx의 silent DB failure (HIGH)

`TimelineFeedSection.tsx:83-142`에서 5개의 DB 쿼리를 `Promise.all`로 실행하고, catch 블록에서 `console.error`만 호출한 후 **사용자에게 아무런 피드백 없이 빈 배열을 반환**한다. 대시보드 사용자가 DB 오류를 전혀 인지할 수 없다.

### 현상 3: DailyPinBanner.tsx의 silent DB failure (HIGH)

`DailyPinBanner.tsx:24-26`에서 DB 쿼리 실패 시 `console.error("[DailyPinBanner] DB query failed:", err)`만 호출하고 `pin`은 `undefined`로 남아 `return null`한다. 사용자는 빈 화면을 보지만 오류 원인을 알 수 없다.

### 현상 4: error.tsx의 `console.error` 전체 객체 전달 (MEDIUM)

`app/(dashboard)/error.tsx:13`과 `app/(admin)/error.tsx:13`에서 `console.error("[Dashboard Error]", error)`로 **전체 Error 객체를 전달**한다. Next.js Error Boundary의 `error` 객체에 내부 경로·시크릿이 포함될 수 있다.

### 현상 5: admin modal의 `void status.pending` 안티패턴 (MEDIUM)

`QuickActionsAdminModal.tsx:10-14`, `HomeworkTypesAdminModal.tsx:10-14`, `RoutineItemsAdminModal.tsx:10-14`에서 `StatusWrapper` 컴포넌트가 `useFormStatus()`를 호출한 후 `void status.pending`으로 결과를 무시한다. `status.pending`을 읽지 않으면 React가 re-render를 트리거하지 않아 폼 제출 중 UI 피드백이 작동하지 않는다.

## Architectural Deepening

### Seam: `lib/dashboard/error.ts` 신규 모듈

DB 로딩 오류 처리의 단일 진입점을 제공한다. 다음 2개 함수로 구성:

- `logDbLoadError(label, context)`: 구조화된 에러 로깅 (console.error)
- `safeDbQuery<T>(fn, label)`: try/catch 래퍼 — 실패 시 `{ rows: T[], failed: true }` 반환

### Leverage: 기존 `failed` 플래그 패턴 유지

DashboardDeferred.tsx가 이미 `{ rows, failed }` 반환 패턴을 사용하고 있으므로, 신규 utility도 동일한 시그니처를 채택하여 UI 렌더링 로직 변경을 최소화한다.

### Leverage: 기존 `role="alert"` amber 배너 패턴 유지

DashboardDeferred.tsx의 성공적인 amber 배너 UI를 다른 컴포넌트로도 확장한다.

## Conceptual Sketch

```typescript
// lib/dashboard/error.ts — 신규 utility
export function logDbLoadError(label: string, context: Record<string, unknown>): void {
  console.error(`[dashboard] ${label} load failed`, context);
}

export async function safeDbQuery<T>(
  fn: () => Promise<T[]>,
  label: string
): Promise<{ rows: T[]; failed: boolean }> {
  try {
    const rows = await fn();
    return { rows, failed: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = extractErrorCode(err);
    logDbLoadError(label, { familyId: context.familyId, message, ...(code ? { code } : {}) });
    return { rows: [], failed: true };
  }
}

// DashboardDeferred.tsx — 리팩토링 후
const { rows: quickActionRows, failed: quickActionsLoadFailed } =
  await safeDbQuery(() => loadQuickActionsFromDB(familyId), "quick_actions");

// TimelineFeedSection.tsx — 리팩토링 후
const { rows: timelineRows, failed: timelineFailed } =
  await safeDbQuery(() => loadTimelineFromDB(familyId), "timeline");

// admin modal — 리팩토링 후
"use client";
import { useRouter } from "next/navigation";

function StatusWrapper({ children }: { children: React.ReactNode }) {
  const status = useFormStatus();
  const router = useRouter();
  // void status.pending 제거 → 폼 제출 후 router.refresh()로 데이터 갱신
  return <>{children}</>;
}

// error.tsx — 리팩토링 후
useEffect(() => {
  console.error("[Dashboard Error]", error.message, error.digest);
}, [error]);
```

## 🛡️ Risk & Strategy

- **Risk**: `safeDbQuery` 도입으로 DashboardDeferred.tsx의 시그니처 변경 — **Strategy**: `failed` 플래그 반환 패턴을 유지하여 UI 렌더링 코드 변경 최소화
- **Risk**: TimelineFeedSection에 amber 배너 추가 → 레이아웃 흔들림 — **Strategy**: `min-h-[60vh]` 최소 높이 확보로 레이아웃 shift 방지
- **Risk**: `void status.pending` 제거 후 폼 상태 미반영 — **Strategy**: `router.refresh()`로 Server Action 완료 후 데이터 갱신

## 🔍 Impact Scope

| 수정 대상 | 역할 |
| :--- | :--- |
| `lib/dashboard/error.ts` (신규) | DB 로딩 오류 처리 통합 utility |
| `app/(dashboard)/dashboard/DashboardDeferred.tsx` | 4개 try/catch → `safeDbQuery`로 리팩토링 |
| `app/(dashboard)/TimelineFeedSection.tsx` | silent failure → failed flag + user-facing alert |
| `app/(dashboard)/DailyPinBanner.tsx` | silent failure → consistent error logging + alert |
| `app/(dashboard)/error.tsx` | 전체 error 객체 → message/digest만 추출 |
| `app/(admin)/error.tsx` | 전체 error 객체 → message/digest만 추출 |
| `app/(dashboard)/QuickActionsAdminModal.tsx` | `void status.pending` → `router.refresh()` |
| `app/(dashboard)/HomeworkTypesAdminModal.tsx` | `void status.pending` → `router.refresh()` |
| `app/(dashboard)/RoutineItemsAdminModal.tsx` | `void status.pending` → `router.refresh()` |

## Agent Completion Contract

본 Blueprint Task를 실행하는 세션(`@PLAN_* task N.M`, `/plan` 후 구현)에서 사용자가 별도 금지하지 않는 한, 아래는 **해당 Task 범위에 포함**된다 ([planning.md](../../.agents/core/planning.md) §2.2 · [plan.md](../../.agents/workflows/plan.md) §1.10).

| 허용 | 금지 |
| :--- | :--- |
| `just plan-task-close` CLI를 사용한 Task `Status`·`Conclusion` 자동 갱신 | 텍스트 에디터(replace 등)로 본 파일 Task 상태 In-place 직접 수정 |
| Task `Verify` 직후 `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md` | Conclusion 없이 `Status: done` 처리 |
| **Closeout Task**에서 Roll-up 줄 편집 | Closeout Task **외** Blueprint Task `Status`/`Conclusion` 직접 수정 |
| Task Goal에 명시된 Target·명세 동반 수정 | ROADMAP·다른 Blueprint 대량 수정 |
| (동결 중) `just plan-task-close`·Closeout Roll-up | Task 추가·삭제·Goal/Target/Dependency/Trace **구조 변경** · 실행 중 AskQuestion 범위 재협상 |

**실행 동결**: `plan-lint` PASS 후 사용자가 **전체 진행**을 요청하면 Blueprint 구조는 고정. 표준 패턴 — 파일 작성 완료 → `@PLAN_*` 전체 순차 실행 → Closeout. 상세: [plan.md](../../.agents/workflows/plan.md) §Blueprint 실행 동결.

**Task 완료 정의**: `Verify` exit 0 → `just plan-task-close` 실행 → `just plan-lint` PASS. **플랜 전체 완료**는 마지막 Closeout Task까지 포함한다.

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: 사용자가 Blueprint **전체 실행**을 요청하면 Task를 **Dependency 순**으로 1개씩만 진행한다. Blueprint Task 구조는 **동결** — `plan-task-close`·Closeout Roll-up만 예외. `Verify` PASS → `just plan-task-close plan=... task=... conclusion="..."` → `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md` → 다음 Task. **마지막 Closeout Task**에서 Roll-up 후 `just plan-close` Verify.

### Phase 0 — Edge case gap audit

#### Task 0.1: Edge Case Trace 갭 감사 및 보완 Task 반영 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-000] | Status: todo | Priority: 1 | Labels: plan | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
  2. `[rule]` `.agents/core/code_quality_lifecycle.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-000 `Conclusion`·`Status`)
- **Goal**: Origin Intent와 Risk를 근거로 Edge Case Trace 표를 채우고, 인범위·미매핑 엣지마다 Atomic Task를 추가하거나 범위 밖 사유를 업무 요약에 기록한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 1 — Create lib/dashboard/error.ts utility

#### Task 1.1: lib/dashboard/error.ts 신규 생성 — logDbLoadError, safeDbQuery [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-001] | Status: todo | Priority: 1 | Labels: lib, utility | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `lib/dashboard/perf.ts` (기존 lib 패턴 참고)
  2. `app/(dashboard)/dashboard/DashboardDeferred.tsx` (기존 try/catch 패턴 분석)
- **Action**: Edit File | **Target**: `lib/dashboard/error.ts`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-001 `Conclusion`·`Status`)
- **Goal**: DB 로딩 오류 처리 통합 utility 파일 `lib/dashboard/error.ts`를 생성한다. `logDbLoadError(label, context)` 함수와 제네릭 `safeDbQuery<T>(fn, label)` 함수를 구현한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 2 — Refactor DashboardDeferred.tsx

#### Task 2.1: DashboardDeferred.tsx 4개 try/catch → safeDbQuery로 리팩토링 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-002] | Status: todo | Priority: 1 | Labels: refactor | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/dashboard/DashboardDeferred.tsx` (현재 전체 코드)
  2. `lib/dashboard/error.ts` (Phase 1에서 생성된 utility)
- **Action**: Edit File | **Target**: `app/(dashboard)/dashboard/DashboardDeferred.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-002 `Conclusion`·`Status`)
- **Goal**: 4개 로딩 함수의 중복 try/catch를 `safeDbQuery`로 대체하고, `failed` 플래그 반환 패턴을 유지한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-001

### Phase 3 — Refactor TimelineFeedSection.tsx

#### Task 3.1: TimelineFeedSection.tsx silent failure → failed flag + user-facing alert [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-003] | Status: todo | Priority: 1 | Labels: refactor, ux | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/TimelineFeedSection.tsx` (현재 전체 코드)
  2. `lib/dashboard/error.ts` (Phase 1에서 생성된 utility)
  3. `app/(dashboard)/dashboard/DashboardDeferred.tsx` (amber 배너 UI 패턴 참고)
- **Action**: Edit File | **Target**: `app/(dashboard)/TimelineFeedSection.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-003 `Conclusion`·`Status`)
- **Goal**: DB 쿼리 실패 시 `failed` 플래그를 반환하고, TimelineFeed에 `hasError` prop을 전달하여 amber 경고 배너를 렌더링한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-001

### Phase 4 — Refactor DailyPinBanner.tsx

#### Task 4.1: DailyPinBanner.tsx consistent error logging + alert [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-004] | Status: todo | Priority: 1 | Labels: refactor, ux | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/DailyPinBanner.tsx` (현재 전체 코드)
  2. `lib/dashboard/error.ts` (Phase 1에서 생성된 utility)
- **Action**: Edit File | **Target**: `app/(dashboard)/DailyPinBanner.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-004 `Conclusion`·`Status`)
- **Goal**: DB 쿼리 실패 시 `safeDbQuery`로 래핑하고, `failed` 플래그에 따라 amber 경고 배너를 렌더링한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-001

### Phase 5 — Refactor error.tsx files

#### Task 5.1: app/(dashboard)/error.tsx console.error message/digest만 추출 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-005] | Status: todo | Priority: 2 | Labels: refactor, security | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/error.tsx` (현재 전체 코드)
- **Action**: Edit File | **Target**: `app/(dashboard)/error.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-005 `Conclusion`·`Status`)
- **Goal**: `console.error`에 전달하는 인자를 전체 Error 객체에서 `message` + `digest` 필드만 추출하도록 변경한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 5.2: app/(admin)/error.tsx console.error message/digest만 추출 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-006] | Status: todo | Priority: 2 | Labels: refactor, security | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(admin)/error.tsx` (현재 전체 코드)
- **Action**: Edit File | **Target**: `app/(admin)/error.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-006 `Conclusion`·`Status`)
- **Goal**: `console.error`에 전달하는 인자를 전체 Error 객체에서 `message` + `digest` 필드만 추출하도록 변경한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-005

### Phase 6 — Replace void status.pending in admin modals

#### Task 6.1: QuickActionsAdminModal.tsx void status.pending → router.refresh() [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-007] | Status: todo | Priority: 2 | Labels: refactor, ux | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/QuickActionsAdminModal.tsx` (현재 전체 코드)
  2. `app/(dashboard)/useConfirm.tsx` (기존 hook 패턴 참고)
- **Action**: Edit File | **Target**: `app/(dashboard)/QuickActionsAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-007 `Conclusion`·`Status`)
- **Goal**: `StatusWrapper`의 `void status.pending`을 제거하고, Server Action 완료 후 `router.refresh()`로 데이터를 갱신하도록 변경한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

#### Task 6.2: HomeworkTypesAdminModal.tsx void status.pending → router.refresh() [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-008] | Status: todo | Priority: 2 | Labels: refactor, ux | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/HomeworkTypesAdminModal.tsx` (현재 전체 코드)
  2. `app/(dashboard)/useConfirm.tsx` (기존 hook 패턴 참고)
- **Action**: Edit File | **Target**: `app/(dashboard)/HomeworkTypesAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-008 `Conclusion`·`Status`)
- **Goal**: `StatusWrapper`의 `void status.pending`을 제거하고, Server Action 완료 후 `router.refresh()`로 데이터를 갱신하도록 변경한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-007

#### Task 6.3: RoutineItemsAdminModal.tsx void status.pending → router.refresh() [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-009] | Status: todo | Priority: 2 | Labels: refactor, ux | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `app/(dashboard)/RoutineItemsAdminModal.tsx` (현재 전체 코드)
  2. `app/(dashboard)/useConfirm.tsx` (기존 hook 패턴 참고)
- **Action**: Edit File | **Target**: `app/(dashboard)/RoutineItemsAdminModal.tsx`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-009 `Conclusion`·`Status`)
- **Goal**: `StatusWrapper`의 `void status.pending`을 제거하고, Server Action 완료 후 `router.refresh()`로 데이터를 갱신하도록 변경한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-008

### Phase 7 — Verification & linting

#### Task 7.1: 전체 lint + typecheck 검증 [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-010] | Status: todo | Priority: 3 | Labels: verify | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `docs/plans/PLAN_familysync_error_handling_resilience.md` (전체 변경 내역 확인)
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-010 `Conclusion`·`Status`)
- **Goal**: 전체 변경분에 대해 plan-lint를 실행하여 Blueprint contract를 검증한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-009

### Phase 8 — Blueprint closeout

#### Task 8.1: Roll-up 작성 및 plan-close [Unit: Atomic] [Level: Low]
- Task-ID: [FS-HIGH-099] | Status: todo | Priority: 3 | Labels: docs | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Closeout**: `docs/plans/PLAN_familysync_error_handling_resilience.md` (Task FS-HIGH-099 `Conclusion`·`Status`)
- **Goal**: 선행 Task Conclusion을 근거로 `## 🔁 Conclusion & Summary` Roll-up 1문단을 실측으로 작성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/PLAN_familysync_error_handling_resilience.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: FS-HIGH-010

## 🔁 Conclusion & Summary

- **Roll-up**: <!-- Closeout Task(FS-HIGH-099)에서 실측 작성. todo 상태 placeholder 금지 -->

## ✅ Definition of Done (DoD)

> **작성 규칙**: 사람이 개입해야 하는 수동 스모크 테스트(Manual Smoke Test) 작성을 금지합니다.
> 모든 DoD 항목은 기계적으로 자동 검증 가능한 형태로 작성하되, 실행할 명령어는 **반드시 백틱(\`)으로 감싸서** 리스트 항목으로 작성하세요. `[ ]` 체크리스트 포맷은 사용하지 마세요.
> **Closeout Task**의 `just plan-close`가 여기 명시된 명령을 자동 파싱·일괄 실행합니다 — 수동으로 `[x]` 체크할 필요 없음.

- `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md`

## 검증 행렬

| Scope | Command |
| :--- | :--- |
| Blueprint | `just plan-lint docs/plans/PLAN_familysync_error_handling_resilience.md` |
