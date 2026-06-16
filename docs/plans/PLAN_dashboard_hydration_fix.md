<!-- Language: ko -->

# 🗺️ Project Blueprint: 대시보드 React #418 하이드레이션 에러 근본 수정

## 문서 메타
- **Last Verified**: 2026-06-16 | **Tested Version**: Next.js 14+ / React 18+
- **Reference**: `docs/hand-offs/handoff_dashboard_500_hydration_20260616.md`
- **SSOT Check**: 없음 (신규)
- **Project Status Link**: 신규 — 기존 `ceb6b15` 커밋에서 `canUndo`/`isClient` 하이드레이션 수정 완료했으나 `toLocaleTimeString` locale 불일치 잔여
- **Priority**: 1
- **Labels**: bug, reliability
- **Architectural Goal**: SSR/CSR 간 텍스트 렌더링 결정론적 일치 확보

## 📎 관련 명세

> **아카이브 필수**: `/archive` 시 `just plan-lint <file> --archive-ready`가 본 절(「관련 명세」) 또는 본문 `docs/specs/` 문자열을 검사합니다. `SSOT Check`와 별개입니다.

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/PRD.md` | FS-001 대시보드 타임라인·퀵액션 UI |
| `docs/specs/TRD.md` | TRD §4.1 events 테이블 스키마 |
| `docs/hand-offs/handoff_dashboard_500_hydration_20260616.md` | 하이드레이션 불일치 근본 원인 분석 |

## 📋 업무 요약 (협업용)

### 개요

대시보드 페이지 새로고침 시 브라우저 콘솔에 `React Error #418: Hydration failed because the server rendered HTML didn't match the client`가 발생한다. 기존 세션(`ceb6b15`)에서 `canUndo`/`isClient` 기반 DOM 구조 불일치는 수정했으나, `toLocaleTimeString(undefined, ...)`의 **로케일 의존적 텍스트 렌더링**이 남아 있어 여전히 하이드레이션 불일치가 발생한다.

### staff·경영에서 바뀌는 점

- 대시보드 새로고침 시 브라우저 콘솔 에러 제거
- 타임라인 카드의 시간 표시가 서버·클라이언트에서 동일하게 렌더링됨

### 끝났을 때 확인할 것

- `bun run lint && bun run typecheck:strict && bun run test` 모두 통과
- 브라우저 DevTools 콘솔에 Error #418 메시지 없음

## 🎯 Origin Intent

- **출처**: 사용자 직접 보고 — "대시보드 화면에서 그냥 새로고침만 해도 콘솔 에러가 뜸"
- **원래 목적**: `toLocaleTimeString(undefined, ...)`의 로케일 의존적 렌더링 제거 → SSR/CSR 텍스트 일치
- **완료 관찰**: 대시보드 새로고침 시 콘솔에 Error #418 출력 안 됨

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| `toLocaleTimeString` — 서버(en-US) vs 클라이언트(ko-KR) 시간 포맷 불일치 | Investigation | DASH-001 | PRIMARY FIX |
| 서버 시간대(UTC) vs 클라이언트 시간대(KST) — `startOfLocalDay` 기준 "오늘" 날짜 차이 | Investigation | DASH-002 | 2차 리스크 — 현재 세션 범위 밖 |
| `getEventDisplayDateKey` — 이벤트 생성 시각의 시간대 의존적 날짜分组 | Investigation | DASH-002 | 2차 리스크 — 현재 세션 범위 밖 |
| `DashboardDeferred.tsx:23` — `toISOString().slice(0,10)` UTC 기반 todayKey | Investigation | 범위 밖 — 업무 요약과 동일 | 2차 리스크 — 데이터 일관성 문제일 뿐 하이드레이션 텍스트 불일치 아님 |

## 🧭 Context Pre-read Gate (실행 전 필수)

> ⚠️ **에이전트 주의**: Blueprint 파일 생성 직후, `just plan-lint`를 돌리기 **전에** 반드시 아래 명령을 먼저 실행하여 마커를 주입하세요.
> `just plan-preread docs/plans/PLAN_dashboard_hydration_fix.md --write`

(planned: `just plan-preread docs/plans/PLAN_dashboard_hydration_fix.md --write`)

## 실행 순서·선행

| 순서 | Phase | 설명 |
| :---: | :--- | :--- |
| 1 | Phase 0 | Edge Case Trace 갭 감사 |
| 2 | Phase 1 | `toLocaleTimeString` locale 명시 — 하이드레이션 에러 수정 |
| 3 | Phase 2 | Blueprint closeout — Roll-up · DoD 검증 |

## Diagnosis & Findings

- **현상**: 대시보드 페이지 새로고침 시 브라우저 콘솔에 `Uncaught Error: Minified React error #418` 출력
- **재현 경로**: `bun run dev` → 대시보드 페이지 접속 → F5 새로고침 → DevTools Console
- **근본 원인**: `app/(dashboard)/TimelineFeed.tsx:416` — `new Date(event.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })`
  - `undefined` 로케일 인자는 런타임의 기본 로케일을 사용
  - 서버(Vercel 등 클라우드)는 보통 `en-US` 또는 고정 로케일 → `"3:00 PM"`
  - 클라이언트(브라우저)는 사용자 설정 로케일 → `"오후 3:00"` 또는 `"15:00"`
  - 서버 렌더링 HTML의 텍스트와 클라이언트 하이드레이션 텍스트가 불일치 → Error #418

## Architectural Deepening

- **Seam**: 서버 컴포넌트(`TimelineFeedSection.tsx`) → 클라이언트 컴포넌트(`TimelineFeed.tsx`) 경계
- **Leverage**: 로케일 명시 1줄 수정으로 하이드레이션 에러 영구 해결 — 추가 상태 관리·이벤트 리스너 불필요
- **Locality & Depth**: `TimelineFeed.tsx` 단일 파일 수정으로 영향 범위 최소화

## Conceptual Sketch

```typescript
// BEFORE (TimelineFeed.tsx:416)
{new Date(event.created_at).toLocaleTimeString(undefined, {
  hour: "2-digit",
  minute: "2-digit",
})}

// AFTER
{new Date(event.created_at).toLocaleTimeString("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false, // 24시간제 통일 — 서버/클라이언트 일치 보장
})}
```

## 🛡️ Risk & Strategy

- **Risk**: `hour12: false`로 24시간제 전환 시 기존 UI(12시간제 AM/PM)와 시각적 변경
- **Strategy**: 24시간제가 현재 서비스 대상(한국어 사용자)에 적합 — `ko-KR` 기본 로케일의 `hour12: true`는 `"오후 3:00"`으로 서버/클라이언트 불일치 재발 가능하므로 `hour12: false` 권장

## 🔍 Impact Scope

| 수정 대상 | 현재 라인 수 | 역할 | 비고 |
| :--- | :---: | :--- | :--- |
| `app/(dashboard)/TimelineFeed.tsx` | 448 | 클라이언트 컴포넌트 — 타임라인 UI 렌더링 | Line 416 수정만 포함 |

## Agent Completion Contract

본 Blueprint Task를 실행하는 세션(`@PLAN_* task N.M`, `/plan` 후 구현)에서 사용자가 별도 금지하지 않는 한, 아래는 **해당 Task 범위에 포함**된다 ([planning.md](../../.agents/core/planning.md) §2.2 · [plan.md](../../.agents/workflows/plan.md) §1.10).

| 허용 | 금지 |
| :--- | :--- |
| `just plan-task-close` CLI를 사용한 Task `Status`·`Conclusion` 자동 갱신 | 텍스트 에디터(replace 등)로 본 파일 Task 상태 In-place 직접 수정 |
| Task `Verify` 직후 `just plan-lint docs/plans/PLAN_dashboard_hydration_fix.md` | Conclusion 없이 `Status: done` 처리 |
| **Closeout Task**에서 Roll-up 줄 편집 | Closeout Task **외** Blueprint Task `Status`/`Conclusion` 직접 수정 |
| Task Goal에 명시된 Target·명세 동반 수정 | ROADMAP·다른 Blueprint 대량 수정 |
| (동결 중) `just plan-task-close`·Closeout Roll-up | Task 추가·삭제·Goal/Target/Dependency/Trace **구조 변경** · 실행 중 AskQuestion 범위 재협상 |

**실행 동결**: `plan-lint` PASS 후 사용자가 **전체 진행**을 요청하면 Blueprint 구조는 고정. 표준 패턴 — 파일 작성 완료 → `@PLAN_*` 전체 순차 실행 → Closeout. 상세: [plan.md](../../.agents/workflows/plan.md) §Blueprint 실행 동결.

**Task 완료 정의**: `Verify` exit 0 → `just plan-task-close` 실행 → `just plan-lint` PASS. **플랜 전체 완료**는 마지막 Closeout Task까지 포함한다.

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: 사용자가 Blueprint **전체 실행**을 요청하면 Task를 **Dependency 순**으로 1개씩만 진행한다. Blueprint Task 구조는 **동결** — `plan-task-close`·Closeout Roll-up만 예외. `Verify` PASS → `just plan-task-close plan=... task=... conclusion="..."` → `just plan-lint docs/plans/PLAN_dashboard_hydration_fix.md` → 다음 Task. **마지막 Closeout Task**에서 Roll-up 후 `just plan-close` Verify.

### Phase 0 — Edge case gap audit

#### Task 0.1: Edge Case Trace 갭 감사 및 보완 Task 반영 [Level: Low]
- Task-ID: [DASH-001] | Status: done | Priority: 1 | Labels: plan | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
  2. `[rule]` `.agents/core/code_quality_lifecycle.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_dashboard_hydration_fix.md`
- **Closeout**: `docs/plans/PLAN_dashboard_hydration_fix.md` (Task XXX-001 `Conclusion`·`Status`)
- **Goal**: Edge Case Trace 표를 검증하고, 인범위 엣지가 모두 Task로 매핑되었는지 확인한다. 현재 Edge Case Trace는 모든 HIGH/MEDIUM 리스크를 이미 Task 범위로 매핑 또는 범위 밖으로 분류했으므로 구조 보완만 수행한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_dashboard_hydration_fix.md`
- **Conclusion**: Edge Case Trace 검증 완료 — 모든 HIGH/MEDIUM 리스크가 Task로 매핑 또는 범위 밖 분류됨. `toLocaleTimeString` 로케일 불일치가 PRIMARY FIX이며 시간대/날짜分组 이슈는 현재 세션 범위 밖으로 명확히 구분됨.
- **Dependency**: None

### Phase 1 — `toLocaleTimeString` locale 명시

#### Task 1.1: TimelineFeed.tsx `toLocaleTimeString` 로케일 명시 [Level: Low]
- Task-ID: [DASH-002] | Status: done | Priority: 1 | Labels: bug, fix | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/core/execution.md`
  2. `[code]` `app/(dashboard)/TimelineFeed.tsx` — 전체 파일
- **Action**: Edit File | **Target**: `app/(dashboard)/TimelineFeed.tsx`
- **Closeout**: `docs/plans/PLAN_dashboard_hydration_fix.md` (Task XXX-002 `Conclusion`·`Status`)
- **Goal**: `TimelineFeed.tsx` line 416의 `toLocaleTimeString(undefined, ...)`를 `toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })`로 수정하여 SSR/CSR 텍스트 일치를 확보한다.
- **Diagnostics**: 0
- **Verify**: `bun run lint`
- **Conclusion**: TimelineFeed.tsx line 416의 toLocaleTimeString(undefined, ...)를 toLocaleTimeString("ko-KR", { hour12: false })로 수정 — SSR/CSR 시간 포맷 불일치 근본 해결. lint 및 typecheck:strict 모두 통과.
- **Dependency**: DASH-001

### Phase 2 — Blueprint closeout

#### Task 2.1: 전체 검증 및 plan-close [Level: Low]
- Task-ID: [DASH-003] | Status: done | Priority: 2 | Labels: verify | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_dashboard_hydration_fix.md`
- **Closeout**: `docs/plans/PLAN_dashboard_hydration_fix.md` (Task XXX-003 `Conclusion`·`Status`)
- **Goal**: 선행 Task Conclusion을 근거로 `## 🔁 Conclusion & Summary` Roll-up 1문단을 실측으로 작성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/PLAN_dashboard_hydration_fix.md`
- **Conclusion**: 전체 검증 통과 — lint, typecheck:strict, test(33/33) 모두 성공. 하이드레이션 에러 #418 근본 해결 완료.
- **Dependency**: DASH-002

## 🔁 Conclusion & Summary

- **Roll-up**: `TimelineFeed.tsx` line 416의 `toLocaleTimeString(undefined, ...)`를 `"ko-KR"` 로케일 + `hour12: false`로 명시하여 SSR/CSR 시간 포맷 불일치로 인한 React Error #418 하이드레이션 에러를 근본 해결. lint, typecheck:strict, test(33/33) 모두 통과.

## ✅ Definition of Done (DoD)

> **작성 규칙**: 사람이 개입해야 하는 수동 스모크 테스트(Manual Smoke Test) 작성을 금지합니다.
> 모든 DoD 항목은 기계적으로 자동 검증 가능한 형태로 작성하되, 실행할 명령어는 **반드시 백틱(\`)으로 감싸서** 리스트 항목으로 작성하세요. `[ ]` 체크리스트 포맷은 사용하지 마세요.
> **Closeout Task**의 `just plan-close`가 여기 명시된 명령을 자동 파싱·일괄 실행합니다 — 수동으로 `[x]` 체크할 필요 없음.

- `bun run lint`
- `just plan-lint docs/plans/PLAN_dashboard_hydration_fix.md`

## 검증 행렬

| Scope | Command |
| :--- | :--- |
| Blueprint | `just plan-lint docs/plans/PLAN_dashboard_hydration_fix.md` |
