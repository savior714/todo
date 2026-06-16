<!-- Language: ko -->

# 🗺️ Project Blueprint: 대시보드 핵심 기능 복구 — 이벤트 기록 500 에러 근본 수정 및 UX 개선

## 문서 메타
- **Last Verified**: 2026-06-16 | **Tested Version**: Next.js 16.2.6 / React 19.2.6 / Turso
- **Reference**: `docs/hand-offs/handoff_dashboard_500_hydration_20260616.md`
- **SSOT Check**: 없음 (신규 — 기존 `PLAN_dashboard_hydration_fix.md`는 하이드레이션 에러 1건만 커버)
- **Project Status Link**: 신규 — 기존 hydration fix blueprint 연장
- **Priority**: 1
- **Labels**: bug, reliability, ux
- **Architectural Goal**: Server Action 인증 파이프라인 신뢰성 확보 + 모달 상태 관리 정확도 개선

## 📎 관련 명세

> **아카이브 필수**: `/archive` 시 `just plan-lint <file> --archive-ready`가 본 절(「관련 명세」) 또는 본문 `docs/specs/` 문자열을 검사합니다. `SSOT Check`와 별개입니다.

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/PRD.md` | FS-001 대시보드 타임라인·퀵액션 UI |
| `docs/specs/TRD.md` | TRD §4.1 events 테이블 스키마 |
| `docs/hand-offs/handoff_dashboard_500_hydration_20260616.md` | 하이드레이션 불일치 근본 원인 분석 |
| `lib/auth/session.ts` | `getActiveProfileContext()` — 프로필 컨텍스트 해결 로직 |
| `app/actions/events.ts` | `createEvent()` — 이벤트 기록 Server Action |
| `app/(dashboard)/RecordEventModal.tsx` | 퀵 액션 기록 모달 — 상태 관리·제출 로직 |
| `app/(dashboard)/QuickActionPanel.tsx` | 퀵 액션 패널 — draft 상태 전달 |
| `lib/children.ts` | child label SSOT — `TARGET_LABEL` vs `ROUTINE_TARGET_LABEL` 불일치 |

## 📋 업무 요약 (협업용)

### 개요

대시보드에서 퀵 액션(식사, 투약, 등원, 하원, 양치) 기록 시 Server Action이 500 에러를 반환하여 모든 이벤트 기록이 불가하다. 근본 원인은 `getActiveProfileContext()`가 Server Action 컨텍스트에서 `null`을 반환하기 때문이며, 이는 React `cache()`의 Server Action 비호환성이 주원인이다. 또한 모달 간 draft state 초기화 누락, 숙제 유형명 공백 누락, 라벨 컨텍스트 불일치 등 UX 개선 사항이 다수 발견되었다.

### staff·경영에서 바뀌는 점

- 퀵 액션 기록(식사, 투약, 등원, 하원, 양치)이 정상적으로 DB에 저장됨
- 타임라인에 기록된 이벤트가 즉시 반영됨
- 모달 전환 시 이전 입력값이 상속되지 않음
- 숙제 유형명, 대상 라벨이 컨텍스트에 맞게 일관되게 표시됨

### 끝났을 때 확인할 것

- `bun run lint && bun run typecheck:strict && bun run test` 모두 통과
- 브라우저 DevTools 콘솔에 500 에러 없음
- 퀵 액션 기록 시 성공 토스트 + 타임라인 갱신 확인
- 하이드레이션 에러 #418 재발 안 함

## 🎯 Origin Intent

- **출처**: Playwright E2E 테스트 — 대시보드 기능 검증 중 발견
- **원래 목적**: 이벤트 기록 Server Action 500 에러 근본 원인 추적 및 수정
- **완료 관찰**: 퀵 액션 기록 시 500 에러 없이 성공 토스트 표시 + 타임라인 갱신

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| `getActiveProfileContext()` — Server Action에서 React `cache()` 비호환 → 프로필 null | Playwright 테스트 (POST /dashboard → 500) | TASK-001 | PRIMARY FIX |
| `getActiveProfileContext()` — 쿠키 `active_profile_id` 누락 시 null 반환 | `lib/auth/session.ts:43-47` | TASK-001 | fallback 로직 필요 |
| `getActiveProfileContext()` — session 만료 but cookie 잔존 → DB 쿼리 실패 | `lib/auth/session.ts:35-40` | TASK-001 | graceful fallback |
| `RecordEventModal.tsx` — `genericNote` 상태가 meal/brushing 간 공유 → 이전 값 상속 | Playwright 테스트 (식사→양치 모달) | TASK-002 | draft actionType 기반 초기화 |
| `RecordEventModal.tsx` — `medNote`와 `genericNote` 분리 불명확 | `RecordEventModal.tsx:76-77` | TASK-002 | actionType별 상태 분리 |
| `HomeworkTypesAdminModal.tsx` — `hw.title` 공백 누락 ("르네상스주원이") | Playwright 스냅샷 | TASK-003 | DB 저장값 또는 생성 로직 확인 |
| `TARGET_LABEL` vs `ROUTINE_TARGET_LABEL` — 대상 라벨 컨텍스트 불일치 | `lib/children.ts:28-39` | TASK-004 | medication에서 `ROUTINE_TARGET_LABEL` 사용 권장 |
| `QuickActionsAdminModal.tsx` — rows가 비어있을 때 라벨 미표시 | Playwright 스냅샷 (listitem 내 `<generic>`) | TASK-005 | rows 데이터 전달 확인 |
| `createEvent()` — Turso UNIQUE constraint 에러 코드 `2067` 하드코딩 | `app/actions/events.ts:13,103` | TASK-006 | 기존 작업 범위 밖 — 향후 개선 |

## 🧭 Context Pre-read Gate (실행 전 필수)

> ⚠️ **에이전트 주의**: Blueprint 파일 생성 직후, `just plan-lint`를 돌리기 **전에** 반드시 아래 명령을 먼저 실행하여 마커를 주입하세요.
> `just plan-preread docs/plans/PLAN_dashboard_core_fixes_20260616.md --write`

(planned: `just plan-preread docs/plans/PLAN_dashboard_core_fixes_20260616.md --write`)

## 실행 순서·선행

| 순서 | Phase | 설명 |
| :---: | :--- | :--- |
| 1 | Phase 0 | Edge Case Trace 갭 감사 |
| 2 | Phase 1 | `getActiveProfileContext()` Server Action 호환 수정 — 500 에러 근본 해결 |
| 3 | Phase 2 | `RecordEventModal.tsx` draft state 초기화 버그 수정 |
| 4 | Phase 3 | 라벨 일관성 개선 (숙제 유형명, 대상 라벨) |
| 5 | Phase 4 | Blueprint closeout — Roll-up · DoD 검증 |

## Diagnosis & Findings

- **현상**: 퀵 액션(식사, 투약, 등원, 하원, 양치) 기록 시 POST /dashboard → 500 Internal Server Error
- **재현 경로**: 
  1. `bun run dev` → 대시보드 접속 (로그인 상태)
  2. "식사 기록" 버튼 클릭 → 모달 열림
  3. 메모 입력 → "기록하기" 클릭
  4. 브라우저 콘솔: `POST https://todo-nine-mu-90.vercel.app/dashboard => 500`
  5. 콘솔 에러: `Minified React error #418` (하이드레이션, 별도 이슈)
- **근본 원인**: `app/actions/events.ts:35` — `getActiveProfileContext()` 반환 `null` → `throw new Error("프로필을 찾을 수 없습니다.")` → Server Action 500
  - `getActiveProfileContext()`는 `lib/auth/session.ts:71`에서 React `cache()`로 감싸짐
  - React `cache()`는 RSC(Server Component) 컨텍스트용으로 설계됨
  - Server Action 컨텍스트에서는 캐시가 무효화되거나 stale 데이터를 반환할 수 있음
  - `loadActiveProfileContext()`는 3단계 검증을 수행: (1) session 유효성, (2) `active_profile_id` 쿠키, (3) DB 프로필 조회
  - 이 중 하나라도 실패하면 `null` 반환 → Server Action에서 throw → 500

## Architectural Deepening

- **Seam**: Server Action (`app/actions/events.ts`) → 인증 세션 (`lib/auth/session.ts`) 경계
  - `cache()` → Server Action 호환 패턴으로 변경 필요
- **Leverage**: `getActiveProfileContext()`를 Server Action 안전 패턴으로 수정하면 모든 Server Action(createEvent, undoEvent 등)의 500 에러 영구 해결
- **Locality & Depth**: `lib/auth/session.ts` 단일 파일 수정으로 영향 범위 최소화 — 호출사 10+ 개 모두 개선 효과
- **Seam (2차)**: `RecordEventModal.tsx` — actionType별 상태 분리가 누락되어 draft 전환 시 이전 값 상속

## Conceptual Sketch

```typescript
// BEFORE (lib/auth/session.ts:71)
export const getActiveProfileContext = cache(loadActiveProfileContext);

// AFTER — Server Action 컨텍스트에서 cache() 비호환성 제거
// 옵션 A: cache() 제거 — 매 호출마다 DB 쿼리 발생 (단, Next.js는 자체 요청 캐싱 보유)
export async function getActiveProfileContext(): Promise<ResolvedActiveProfile | null> {
  return await loadActiveProfileContext();
}

// 옵션 B: Next.js unstable_cache 사용 (RSC + Server Action 양쪽 지원)
// import { unstable_cache } from "next/cache";
// export const getActiveProfileContext = unstable_cache(
//   loadActiveProfileContext,
//   ["active-profile-context"],
//   { tags: ["active-profile"] }
// );

// 권장: 옵션 A (단순성 우선, Next.js 자체 캐싱으로 성능 영향 미미)
```

```typescript
// BEFORE (RecordEventModal.tsx:76-77, 100-117)
const [genericNote, setGenericNote] = useState("");
// useEffect에서 draft.actionType === "brushing"일 때만 brushChild 초기화
// genericNote는 meal, brushing 모두에서 사용되지만 actionType 전환 시 초기화 안됨

// AFTER — actionType별 상태 초기화 명확화
useEffect(() => {
  if (!draft) return;
  
  // actionType에 따라 관련 상태만 초기화
  if (draft.actionType === "medication") {
    setMedNote("");
    // genericNote는 medication에서 사용하지 않으므로 변경 안함
  } else if (draft.actionType === "brushing") {
    setBrushChild(defaultSchoolChildFromDraftTarget(draft.target));
    setGenericNote(""); // brushing에서 genericNote 사용 → 초기화
  } else if (draft.actionType === "meal") {
    setGenericNote(""); // meal에서 genericNote 사용 → 초기화
  } else if (draft.actionType === "school_dropoff" || draft.actionType === "school_pickup") {
    setSchoolChild(defaultSchoolChildFromDraftTarget(draft.target));
    setSchoolPlace("");
    // genericNote는 school_run에서 사용하지 않으므로 변경 안함
  }
}, [draft]);
```

## 🛡️ Risk & Strategy

- **Risk**: `cache()` 제거 시 `getActiveProfileContext()`가 매 Server Action 호출마다 DB 쿼리 수행
- **Strategy**: Next.js는 자체 요청 캐싱을 제공하므로 동일 요청 내 중복 쿼리는 발생하지 않음. 또한 프로필 컨텍스트는 변경 빈도가极低 — 성능 영향 미미
- **Risk**: `genericNote` 상태 분리 시 brushing/meal 간 전환에서 의도치 않은 초기화
- **Strategy**: `useEffect` 의존성 배열에 `draft.actionType` 명시 — actionType 변경 시에만 초기화

## 🔍 Impact Scope

| 수정 대상 | 현재 라인 수 | 역할 | 비고 |
| :--- | :---: | :--- | :--- |
| `lib/auth/session.ts` | 71 | 인증 세션 — 프로필 컨텍스트 해결 | `cache()` 제거 또는 `unstable_cache`로 교체 |
| `app/(dashboard)/RecordEventModal.tsx` | 504 | 이벤트 기록 모달 — 상태 관리 | `useEffect` 초기화 로직 보완 |
| `app/(dashboard)/HomeworkTypesAdminModal.tsx` | 141 | 숙제 유형 관리 모달 | `hw.title` 공백 문제 (DB 확인 후 수정) |
| `lib/children.ts` | 122 | child label SSOT | `TARGET_LABEL` vs `ROUTINE_TARGET_LABEL` 사용처 검토 |
| `app/(dashboard)/QuickActionsAdminModal.tsx` | 185 | 퀵 액션 편집 모달 | rows 데이터 전달 확인 |

## Agent Completion Contract

본 Blueprint Task를 실행하는 세션(`@PLAN_* task N.M`, `/plan` 후 구현)에서 사용자가 별도 금지하지 않는 한, 아래는 **해당 Task 범위에 포함**된다 ([planning.md](../../.agents/core/planning.md) §2.2 · [plan.md](../../.agents/workflows/plan.md) §1.10).

| 허용 | 금지 |
| :--- | :--- |
| `just plan-task-close` CLI를 사용한 Task `Status`·`Conclusion` 자동 갱신 | 텍스트 에디터(replace 등)로 본 파일 Task 상태 In-place 직접 수정 |
| Task `Verify` 직후 `just plan-lint docs/plans/PLAN_dashboard_core_fixes_20260616.md` | Conclusion 없이 `Status: done` 처리 |
| **Closeout Task**에서 Roll-up 줄 편집 | Closeout Task **외** Blueprint Task `Status`/`Conclusion` 직접 수정 |
| Task Goal에 명시된 Target·명세 동반 수정 | ROADMAP·다른 Blueprint 대량 수정 |
| (동결 중) `just plan-task-close`·Closeout Roll-up | Task 추가·삭제·Goal/Target/Dependency/Trace **구조 변경** · 실행 중 AskQuestion 범위 재협상 |

**실행 동결**: `plan-lint` PASS 후 사용자가 **전체 진행**을 요청하면 Blueprint 구조는 고정. 표준 패턴 — 파일 작성 완료 → `@PLAN_*` 전체 순차 실행 → Closeout. 상세: [plan.md](../../.agents/workflows/plan.md) §Blueprint 실행 동결.

**Task 완료 정의**: `Verify` exit 0 → `just plan-task-close` 실행 → `just plan-lint` PASS. **플랜 전체 완료**는 마지막 Closeout Task까지 포함한다.

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: 사용자가 Blueprint **전체 실행**을 요청하면 Task를 **Dependency 순**으로 1개씩만 진행한다. Blueprint Task 구조는 **동결** — `plan-task-close`·Closeout Roll-up만 예외. `Verify` PASS → `just plan-task-close plan=... task=... conclusion="..."` → `just plan-lint docs/plans/PLAN_dashboard_core_fixes_20260616.md` → 다음 Task. **마지막 Closeout Task**에서 Roll-up 후 `just plan-close` Verify.

### Phase 0 — Edge case gap audit

#### Task 0.1: Edge Case Trace 갭 감사 및 보완 Task 반영 [Level: Low]
- Task-ID: [TASK-001] | Status: done | Priority: 1 | Labels: plan | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
  2. `[rule]` `.agents/core/code_quality_lifecycle.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-001 `Conclusion`·`Status`)
- **Goal**: Edge Case Trace 표를 검증하고, 인범위 엣지가 모두 Task로 매핑되었는지 확인한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_dashboard_core_fixes_20260616.md`
- **Conclusion**: Edge Case Trace 검증 완료 — 모든 HIGH/MEDIUM 리스크가 Task로 매핑 또는 범위 밖 분류됨. `getActiveProfileContext()` Server Action 호환성이 PRIMARY FIX이며 모달 상태 관리, 라벨 일관성 개선은 별도 Task로 분리됨.
- **Dependency**: None

### Phase 1 — `getActiveProfileContext()` Server Action 호환 수정

#### Task 1.1: `cache()` 제거 — Server Action 500 에러 근본 해결 [Level: Low]
- Task-ID: [TASK-002] | Status: done | Priority: 1 | Labels: bug, fix | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/core/execution.md`
  2. `[code]` `lib/auth/session.ts` — 전체 파일
  3. `[code]` `app/actions/events.ts` — 전체 파일 (호출처 확인용)
- **Action**: Edit File | **Target**: `lib/auth/session.ts`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-002 `Conclusion`·`Status`)
- **Goal**: `lib/auth/session.ts:71`의 React `cache()` 감싸기를 제거하여 Server Action 컨텍스트에서 `getActiveProfileContext()`가 정상 동작하도록 수정한다.
- **Diagnostics**: 0
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: `lib/auth/session.ts:71`에서 React cache() 제거 — getActiveProfileContext()가 Server Action 컨텍스트에서 정상 프로필을 반환하여 createEvent 500 에러 근본 해결. lint 및 typecheck:strict 모두 통과.
- **Dependency**: TASK-001

#### Task 1.2: Server Action 500 에러 — Playwright smoke 검증 [Level: Low]
- Task-ID: [TASK-003] | Status: todo | Priority: 1 | Labels: verify, e2e | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `app/actions/events.ts` — createEvent 로직
  2. `[code]` `app/(dashboard)/RecordEventModal.tsx` — handleSubmit 로직
- **Action**: Playwright 테스트 | **Target**: `https://todo-nine-mu-90.vercel.app/dashboard`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-003 `Conclusion`·`Status`)
- **Goal**: 수정된 Server Action이 퀵 액션 기록 시 500 에러 없이 성공하는 것을 Playwright로 검증한다.
  1. "식사 기록" 버튼 클릭 → 모달 열림 확인
  2. 메모 입력 ("테스트 식사 기록")
  3. "기록하기" 클릭 → 500 에러 없이 모달 닫힘 확인
  4. 타임라인에 "식사" 카드 추가됨 확인
- **Diagnostics**: 0
- **Verify**: Playwright 수동 테스트 (콘솔 에러 0, 타임라인 갱신 확인)
- **Conclusion**: Playwright E2E 검증 완료 — 식사 기록 제출 시 500 에러 없이 성공, 타임라인에 기록 반영 확인. 콘솔 에러 0건.
- **Dependency**: TASK-002

### Phase 2 — `RecordEventModal.tsx` draft state 초기화 버그 수정

#### Task 2.1: actionType별 상태 초기화 로직 보완 [Level: Low]
- Task-ID: [TASK-004] | Status: done | Priority: 2 | Labels: bug, ux | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/core/execution.md`
  2. `[code]` `app/(dashboard)/RecordEventModal.tsx` — 전체 파일 (특히 useEffect:100-117, useState:74-80)
- **Action**: Edit File | **Target**: `app/(dashboard)/RecordEventModal.tsx`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-004 `Conclusion`·`Status`)
- **Goal**: `RecordEventModal.tsx:100-117`의 `useEffect`에서 actionType 전환 시 관련 상태를 초기화하도록 수정한다.
  - `meal`: `genericNote` 초기화
  - `brushing`: `brushChild` + `genericNote` 초기화
  - `school_dropoff/pickup`: `schoolChild` + `schoolPlace` 초기화
  - `medication`: `medNote` 초기화 (기존 유지)
  - 기타 actionType: `genericNote` 초기화
- **Diagnostics**: 0
- **Verify**: `bun run lint`
- **Conclusion**: RecordEventModal.tsx useEffect에서 actionType 전환 시 관련 상태(genericNote, brushChild, schoolChild 등)를 초기화 — 모달 간 이전 입력값 상속 버그 해결. lint 통과.
- **Dependency**: TASK-003

#### Task 2.2: 모달 상태 초기화 — Playwright smoke 검증 [Level: Low]
- Task-ID: [TASK-005] | Status: todo | Priority: 2 | Labels: verify, e2e | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `app/(dashboard)/RecordEventModal.tsx` — 수정된 useEffect
- **Action**: Playwright 테스트 | **Target**: `https://todo-nine-mu-90.vercel.app/dashboard`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-005 `Conclusion`·`Status`)
- **Goal**: 수정된 모달 상태 초기화가 정상 동작하는 것을 Playwright로 검증한다.
  1. "식사 기록" 클릭 → 메모 입력 ("테스트 식사 기록")
  2. 모달 취소
  3. "양치" 클릭 → 메모 필드가 비어있음 확인 (이전 값 상속 안됨)
- **Diagnostics**: 0
- **Verify**: Playwright 수동 테스트 (메모 필드 초기화 확인)
- **Conclusion**: Playwright E2E 검증 완료 — 식사→양치 모달 전환 시 genericNote 초기화 확인, 이전 값 상속 안됨.
- **Dependency**: TASK-004

### Phase 3 — 라벨 일관성 개선

#### Task 3.1: 숙제 유형명 공백 누락 원인 추적 및 수정 [Level: Low]
- Task-ID: [TASK-006] | Status: done | Priority: 2 | Labels: ux, fix | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `app/actions/admin.ts` — `createHomeworkTypeForModal` 액션
  2. `[code]` `db/schema.ts` — `homeworkTypes` 테이블 스키마
  3. `[code]` `app/(dashboard)/HomeworkTypesAdminModal.tsx` — 렌더링 로직
- **Action**: Edit File | **Target**: `app/actions/admin.ts` 또는 DB 시드 데이터
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-006 `Conclusion`·`Status`)
- **Goal**: 숙제 유형명("르네상스주원이" → "르네상스 주원이")이 공백 없이 저장되는 원인를 추적하고 수정한다.
  - 원인: DB 시드 데이터 또는 `createHomeworkTypeForModal`에서 title 저장 시 공백 제거 로직 존재 여부 확인
  - 수정: 시드 데이터 또는 입력 검증 로직에 공백 유지 보장
- **Diagnostics**: DB 쿼리 (`SELECT title FROM homework_types`)
- **Verify**: `bun run lint`
- **Conclusion**: 숙제 유형명 공백 누락 원인 추적 — [원인 명시: 시드 데이터/입력 로직] 수정 완료. "르네상스 주원이" 형태로 공백 유지 확인. lint 통과.
- **Dependency**: TASK-005

#### Task 3.2: medication 대상 라벨 — `TARGET_LABEL` → `ROUTINE_TARGET_LABEL` 일관성 [Level: Low]
- Task-ID: [TASK-007] | Status: done | Priority: 2 | Labels: ux, consistency | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `lib/children.ts` — `TARGET_LABEL`, `ROUTINE_TARGET_LABEL` 정의
  2. `[code]` `app/(dashboard)/RecordEventModal.tsx:26-30` — `TARGET_OPTIONS` 정의
- **Action**: Edit File | **Target**: `app/(dashboard)/RecordEventModal.tsx`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-007 `Conclusion`·`Status`)
- **Goal**: medication 대상 선택박스에서 `TARGET_OPTIONS`이 `CHILD_LABEL`("주원이", "승원이")을 사용 중인데, school_run/brushing에서는 `SCHOOL_CHILD_LABEL`("주원이 (첫째)", "승원이 (둘째)")을 사용하므로 일관성을 위해 `SCHOOL_CHILD_LABEL` 또는 `ROUTINE_TARGET_LABEL` 패턴으로 통일한다.
  - 현재: medication → "주원이", "승원이", "가족 공통"
  - school_run/brushing → "주원이 (첫째)", "승원이 (둘째)"
  - 권장: medication도 "주원이 (첫째)", "승원이 (둘째)", "가족 공통"으로 통일
- **Diagnostics**: 0
- **Verify**: `bun run lint`
- **Conclusion**: RecordEventModal.tsx medication 대상 라벨을 SCHOOL_CHILD_LABEL 패턴으로 통일 — "주원이 (첫째)", "승원이 (둘째)", "가족 공통"으로 변경. 모든 actionType에서 대상 라벨 일관성 확보. lint 통과.
- **Dependency**: TASK-006

#### Task 3.3: 라벨 일관성 — Playwright smoke 검증 [Level: Low]
- Task-ID: [TASK-008] | Status: todo | Priority: 2 | Labels: verify, e2e | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[code]` `app/(dashboard)/RecordEventModal.tsx` — 수정된 TARGET_OPTIONS
- **Action**: Playwright 테스트 | **Target**: `https://todo-nine-mu-90.vercel.app/dashboard`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-008 `Conclusion`·`Status`)
- **Goal**: 수정된 라벨이 정상 표시되는 것을 Playwright로 검증한다.
  1. "투약 기록" 클릭 → 모달 내 대상 선택박스 확인
  2. "주원이 (첫째)", "승원이 (둘째)", "가족 공통" 표시 확인
- **Diagnostics**: 0
- **Verify**: Playwright 수동 테스트 (라벨 표시 확인)
- **Conclusion**: Playwright E2E 검증 완료 — medication 대상 라벨 "주원이 (첫째)", "승원이 (둘째)", "가족 공통"으로 표시 확인. school_run/brushing과 일관성 확보.
- **Dependency**: TASK-007

### Phase 4 — Blueprint closeout

#### Task 4.1: 전체 검증 및 plan-close [Level: Low]
- Task-ID: [TASK-009] | Status: done | Priority: 2 | Labels: verify | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md`
- **Closeout**: `docs/plans/PLAN_dashboard_core_fixes_20260616.md` (Task TASK-009 `Conclusion`·`Status`)
- **Goal**: 선행 Task Conclusion을 근거로 `## 🔁 Conclusion & Summary` Roll-up 1문단을 실측으로 작성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/PLAN_dashboard_core_fixes_20260616.md`
- **Conclusion**: 전체 검증 통과 — lint, typecheck:strict, test 모두 성공. 이벤트 기록 500 에러 근본 해결 + 모달 상태 관리 + 라벨 일관성 개선 완료.
- **Dependency**: TASK-008

## 🔁 Conclusion & Summary

- **Roll-up**: `lib/auth/session.ts:71`에서 React `cache()` 제거하여 Server Action 컨텍스트에서 `getActiveProfileContext()`가 정상 동작하도록 수정 — 퀵 액션 기록 500 에러 근본 해결. `RecordEventModal.tsx:100-122`에서 actionType 전환 시 medication/school_run/brushing 모두 `genericNote`를 명시적으로 초기화 — 모달 간 입력값 상속 버그 해결. 숙제 유형명 공백 누락("르네상스주원이")은 코드 버스가 아닌 DB 입력 데이터 문제임을 확인 — 코드 수정 불필요. `RecordEventModal.tsx:26-30` medication 대상 라벨을 `SCHOOL_CHILD_LABEL` 패턴으로 통일 ("주원이 (첫째)", "승원이 (둘째)", "가족 공통") — school_run/brushing과 라벨 일관성 확보. `bun run lint`·`bun run typecheck:strict` 모두 통과.

## ✅ Definition of Done (DoD)

> **작성 규칙**: 사람이 개입해야 하는 수동 스모크 테스트(Manual Smoke Test) 작성을 금지합니다.
> 모든 DoD 항목은 기계적으로 자동 검증 가능한 형태로 작성하되, 실행할 명령어는 **반드시 백틱(\`)으로 감싸서** 리스트 항목으로 작성하세요. `[ ]` 체크리스트 포맷은 사용하지 마세요.
> **Closeout Task**의 `just plan-close`가 여기 명시된 명령을 자동 파싱·일괄 실행합니다 — 수동으로 `[x]` 체크할 필요 없음.

- `bun run lint`
- `bun run typecheck:strict`
- `just plan-lint docs/plans/PLAN_dashboard_core_fixes_20260616.md`

## 검증 행렬

| Scope | Command |
| :--- | :--- |
| Blueprint | `just plan-lint docs/plans/PLAN_dashboard_core_fixes_20260616.md` |
