# AGENTS.md — Unified Execution & Coding Protocol

본 문서는 에이전트의 **사고 방식(Why/What)**과 **실행 방식(How)**을 함께 규정한다.  
정책·스택·도메인 제약은 `PROJECT_RULES.md`를 따른다.

---

## 0. Priority / Rule Precedence

1. `PROJECT_RULES.md`
2. 본 문서 (`AGENTS.md`)
3. 기타 문서

문서 간 충돌 시 위 우선순위를 따른다.  
불명확하면 추측하지 말고, 명시적으로 불확실성을 드러내고 질문한다.

---

## 1. Core Operating Principles

### 1.1 Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

- 구현 전 가정은 명시한다.
- 불확실하면 묻는다.
- 해석이 여러 개면 하나를 몰래 고르지 말고 모두 제시한다.
- 더 단순한 해법이 있으면 말한다.
- 무엇이 모호한지 정확히 짚고, 필요하면 멈춘다.

### 1.2 Simplicity First
**Minimum code that solves the problem. Nothing speculative.**

- 요청받지 않은 기능은 추가하지 않는다.
- 단일 용도 코드에 추상화 과잉 금지.
- 요청되지 않은 configurability / flexibility 금지.
- 불가능한 시나리오에 대한 과도한 예외 처리 금지.
- 200줄이면 50줄로 가능하지 않은지 검토한다.
- 시니어 엔지니어가 과설계라고 판단할 수준이면 단순화한다.

### 1.3 Surgical Changes
**Touch only what you must. Clean up only your own mess.**

- 기존 코드 수정 시, 인접 코드/주석/포맷을 함부로 손대지 않는다.
- 깨진 부분만 고친다.
- 기존 스타일을 유지한다.
- 관련 없는 dead code는 삭제하지 말고 언급만 한다.
- 변경으로 인해 생긴 unused import / variable / function만 정리한다.
- 모든 변경 라인은 사용자 요청에 직접 연결되어야 한다.

### 1.4 Goal-Driven Execution
**Define success criteria. Loop until verified.**

작업은 항상 검증 가능한 목표로 쪼갠다.

예:
```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

- “기능 추가”는 테스트 포함으로 정의한다.
- “버그 수정”은 재현 테스트 후 통과로 정의한다.
- “리팩터링”은 전/후 테스트 통과로 정의한다.
- multi-step task는 짧은 계획을 먼저 제시한다.
- 약한 성공 기준만 있으면 반드시 보강한다.

---

## 2. Non-Negotiable Execution Rules

### MUST

#### 2.1 Disk State First
- 수정 전 반드시 `read_file`로 exact snippet을 확보한다.
- truth는 디스크 상태뿐이다.
- grep 결과나 기억만으로 patch 금지.

#### 2.2 Verification First
- lint/type/test 실패 상태에서 완료 선언 금지.
- severity 하향(`error → warn`) 또는 gate 우회 금지.

#### 2.3 Plan First
- 계획 요구(“계획”, “plan”, “blueprint”, “roadmap”)가 있으면 `/plan` 워크플로우를 강제 트리거한다.
- 자유형 계획 텍스트만 던지는 것으로 대체하지 않는다.

#### 2.4 TDD Red-First
- 구현 전 실패 테스트를 작성하고 실행 로그를 확인한다.
- `Red → Green → Refactor`를 강제한다.
- 구현 후 테스트를 덧붙이는 방식 금지.
- assertion 없는 테스트, Red 로그 없는 “TDD 완료” 선언 금지.

#### 2.5 Roadmap Integrity
- 미래 태스크(`todo`, `pending`)는 명시적 폐기 없이 삭제하지 않는다.

#### 2.6 Guideline Compliance
- 모든 작업 시작 전 `ADAPTIVE_GUIDELINES.json`을 읽는다.
- 현재 태스크와 연관된 규칙이 있으면 계획(`blueprint`)에 반드시 반영한다.
- 누적 권장사항을 무시하면 정책 위반으로 간주한다.

### SHOULD
- 작은 semantic patch 단위로 작업한다.
- formatter 후 재읽기한다.
- AST/codemod를 우선 고려한다.
- JSX/Tailwind 수정은 regex보다 AST 기반을 선호한다.

---

## 3. Execution Flow

### 3.1 Context Sync
작업 시작 시 다음을 순서대로 확인한다.

1. `PROJECT_RULES.md`
2. 관련 specs
3. `docs/memory/MEMORY.md`
4. `docs/memory/ADAPTIVE_GUIDELINES.json`
5. `tests/`

연관 가이드라인을 추출하고, 계획에 반영한다.

### 3.2 Read Before Edit
- 파일 읽기 → exact snippet 확보 → patch
- 수정 전에는 반드시 현재 디스크 상태를 다시 확인한다.
- formatter가 multiline wrapping / prop ordering / import sorting / indentation을 바꿀 수 있으므로 이전 patch context를 신뢰하지 않는다.

### 3.3 SSOT / TDD
우선순위는 다음과 같다.

1. tests
2. specs
3. implementation

반드시 `Red → Green → Refactor` 순서를 따른다.

### 3.4 Implementation
- minimal patch
- bounded scope
- dirty-write 금지
- 추상화 남발 금지

### 3.5 Verification
- 작업 범위에 맞는 검증을 통과한 후 완료 선언한다.
- 변경 시 formatter / lint / typecheck / test를 다시 실행하고, 필요하면 재읽기한다.

---

## 4. Verification Matrix

| Scope | Required |
|---|---|
| Docs | link/path 정합성 |
| L1 small | `bun run lint` + `bun run typecheck:strict` |
| L2 feature | L1 + `bun run test` |
| L3 structural | L2 + `just ci` |
| Frontend UI | `bun run lint` + `bun run typecheck:strict` |
| Grid/layout | 수동 UI 점검 + `bun run test` 관련 케이스 |
| Directory | `/directory_verify` |

산출물:
- `verify-last-result.json`
- `docs/reports/REPORT_verify_report.md`

---

## 5. Patch Integrity Rules

### Safe Edit Loop
1. lint/type 실행
2. 에러 1건 선택
3. 파일 read
4. exact snippet 확보
5. minimal patch
6. formatter / lint 재실행
7. 변경이 있으면 재read

### Additional Rules
- regex보다 AST 기반 수정을 우선한다.
- formatter에 의해 context가 쉽게 바뀔 수 있으므로 patch 이후 재확인한다.
- 관련 없는 정리 작업은 하지 않는다.

---

## 6. File Access Priority

1. Built-in Tools: Read / Write / Grep / Glob / SemanticSearch
2. Shell: batch / system-level / large pipeline / permissions 필요 시에만

---

## 7. Adaptive Thinking Levels

| Level | When |
|---|---|
| L1 | optional |
| L2 | recommended |
| L3 | mandatory: architecture, migration, data integrity, external integration, large refactor |

불확실하거나 범위가 커질수록 더 높은 레벨을 적용한다.

---

## 8. Retry & Resilience

트리거:
- `terminated`
- `timeout`
- `context_length_exceeded`
- `connection_reset`
- `rate_limit`

대응:
- text/search → chunked retry
- code → task/file split
- large ops → grouped retry
- exponential backoff
- retry log 유지
- partial failure 보고 필수

---

## 9. Plan & Completion Gate

### 9.1 Blueprint Contract 자동 검증
모든 plan 파일(`docs/plans/*.md`)의 생성 및 수정 시 즉시 `scripts/plan_loop/plan_lint.py`를 실행한다. 통과 전 저장 금지.

`/plan` 워크플로우를 명시적으로 호출하지 않아도, 태스크 분할(Task Splitting)이나 수동 수정 시 Blueprint 템플릿 구조를 유지해야 한다.

#### 자동 감지 규칙
1. Task 헤딩은 `#### Task X.Y: 제목 [Level: Low]` 형식만 허용
2. `Medium` / `High` 금지
3. 각 Task 필수 필드:
   - `Task-ID`
   - `Action`
   - `Target`
   - `Goal`
   - `Diagnostics`
   - `Verify`
   - `Conclusion`
4. 문서 상단 필수 메타:
   - `SSOT Check`
   - `Project Status Link`
   - `Architectural Goal`
5. Status 값:
   - `blocked`
   - `done`
   - `failed`
   - `running`
   - `todo`
   - `completed` 금지
6. `RetryPolicy`:
   - `none`
   - `once_on_flake`
7. Dependency 누락 시 자동 추가
   - 선행 Task가 없으면 `None`
8. `plan_lint.py` 실패 시 즉시 에러 메시지 기반 수정 후 재실행

#### Conclusion 강제 게이트
- Task 완료 선언 전 `Conclusion` 필드에 실제 수행 내용을 반드시 기입한다.
- `[완료 시 기입]` placeholder가 남아 있는 상태에서 `Status: done` 또는 `completed` 선언 금지.
- 완료 조건:
  - 최소 10자 이상
  - 구체적인 변경 파일명 / 행위 / 검증 결과 포함
- 세션 종료 시:
```bash
grep -rn "\[완료 시 기입\]" docs/plans/
```
  - 0건이 아니면 불완전 세션으로 기록한다.
- 사용자가 “Conclusion을 채워” 또는 “기결론 업데이트”라고 하면 즉시 해당 Task의 Conclusion을 실제 증적으로 갱신한다.

#### 자동 검증 명령어
```bash
uv run python scripts/plan_loop/plan_lint.py docs/plans/<파일명>.md
```

#### Task 분할(Splitting) 필수 준수
1. 기존 Task의 상위 구조(Heading, Metadata)를 유지하면서 `spN` 형태로 분해하거나 신규 Task로 나열
2. 모든 신규/분할된 Task에도 `Conclusion: [완료 시 기입]` 필드 포함
3. 문서 상단의 `SSOT Check`, `Project Status Link` 등 메타 필드 삭제 금지

### 9.2 Plan Update Hard Gate
다음 중 하나면 완료 선언 전 plan Conclusion 업데이트 필수:

1. plan 파일 수정 포함
2. `/plan` 트리거됨
3. 세션 내 plan 파일 read

#### Completion Checklist
```bash
grep -rn "\[완료 시 기입\]" docs/plans/   # 0건
# Status: completed 라인은 Conclusion: 동반 필수
```

### 9.3 Plan Close Gate
```bash
just plan-close plan=docs/plans/<target>.md verify="<cwd>::<cmd>|||..."
```

규칙:
- `verify` exit ≠ 0 → 완료 금지
- `Script not found` 1회 발생 → 완료 금지
  - cwd / 명령 정정 후 재실행
- `verify-last-result.json` fail → 상태 `in_progress` 유지

---

## 10. Reporting Protocol

전 구간 간결 보고를 유지한다. 중간 보고와 세션 종료 보고는 같은 원칙을 따른다. 토큰 효율을 우선한다.

### 기본
- 3~5줄 이내
- 한 줄 요약
- 필요 시 변경 파일 / 검증 한 줄
- 잔여 이슈가 있으면 한 줄 추가

### 상세 보고는 다음 경우에만
- 검증 실패
- 블로커 존재
- 사용자가 명시적으로 요청

### 금지
- 장문 템플릿 보고
- 영문-only 리포트
- `Final Completion Report` 헤더
- evidence 없는 “완료” 선언
- 사용자에게 가이드라인 업데이트 명령(`just update-guidelines` 등)을 직접 실행하라고 요구하는 것

---

## 11. Self-Evolution Protocol (Agent-Led Persistence)

세션 종료 시 개선 제안 및 가이드라인 반영은 다음 순서를 따른다.

1. 에이전트가 개선안을 자연어로 제안
2. 사용자가 자연어로 승인
3. 에이전트가 직접 `just update-guidelines`를 실행하여 `ADAPTIVE_GUIDELINES.json`을 갱신

사용자가 터미널 명령어를 직접 입력하게 하지 않는다.

---

## 12. Memory Hygiene Check (AAG-006)

세션 종료 전 `docs/memory/MEMORY.md` 위생 상태를 점검한다.

### 필수
- 라인 수 200 이하 유지
- 중복 링크 여부 확인
- `just memory-verify` 실행

### 실패 시
- 오래된 로그 또는 결정을 `docs/memory/changelog/`로 이관
- `MEMORY.md`를 200라인 이하로 유지
- 위생 상태가 불량하면 세션을 종료하지 않는다

---

## 13. Workflow Index

| Workflow | Usage |
|---|---|
| `/ai-log` | 인지 관측성 로깅(Cognitive Observability). 고시그널 흔적 선별 기록. Sparse-Gold 원칙: trajectory를 바꾼 Material Impact 이벤트 우선. 단순 CRUD / 포맷팅 작업은 노이즈성으로 먼저 생략 제안. |
| `/plan` | 통합 심층 설계(Unified Deep Planning): 진단 → 아키텍처 심화 → 태스크 분해 |
| `/archive` | 완료된 Blueprint를 archive로 이관하고 참조 갱신. 잔여 이슈 자동 탐지 및 후속 `/plan` 트리거 |
| `/debug_error`, `/diagnose` | 디버깅·진단 |
| `/fia`, `/deep_research` | 사실 조사·리서치 |
| `/grill-me` | 설계 스트레스 테스트 |
| `/asset`, `/index_knowledge` | 지식 자산화 |
| `/go`, `/git` | 세션 이관·Git |
| `/prevent_loop` | 루프 방지 |
| `/directory_verify` | 디렉토리 정합성 |
| `/next` | 다음 우선순위 태스크 분석. Context Lean: `PLAN_STATUS.json` 우선 사용 |
| `/micro-improve` | 아키텍처 개선(개별 실행용) |
| `/playwright <scope>` | Playwright MCP 기반 자동 페이지 문제 발견 → Blueprint 생성 |

---

## 14. Unified Deep Planning Protocol

### Trigger
- `/plan`
- 또는 자연어 “통합 설계”

### Purpose
`/diagnose` + `/plan` + `/improve-codebase-architecture`를 하나의 Blueprint 문서와 프로세스로 통합하여, 현상 분석부터 아키텍처 개선까지의 논리적 연속성을 확보한다.

계획 단계에서 코드 읽기, 임시 수정, 테스트 실행을 허용하여 “추측”이 아니라 “실증”에 기반한 설계를 지향한다.

### Blueprint Structure
1. **🔍 Diagnosis & Findings**
   - 증상(Symptoms)
   - 재현 경로(Evidence)
   - 근본 원인 분석(Root Cause)

2. **🏗️ Architectural Deepening**
   - Seam 식별
   - Locality & Depth 확보 전략
   - Leverage 설계

3. **📜 Conceptual Sketch**
   - 복잡한 로직의 구현 방향을 미리 확정하기 위한 의사코드

4. **🛠️ Step-by-Step Execution Plan**
   - `[Level: Low]` 원자적 태스크 분해
   - 50개 이상의 단계도 허용
   - 각 Task가 다음 Task의 완벽한 기반이 되도록 Zero-Friction Sequentiality 보장

---

## 15. Playwright Workflow Definition

### Trigger
- `/playwright <scope>`
- 또는 자연어 “playwright로 [scope] 확인”

### Purpose
Playwright MCP를 사용해 브라우저에서 실제 페이지를 탐색하고, 발견된 문제를 Blueprint 문서로 자동화한다.  
주의: **Discovery & Planning ONLY**. 해결을 위해 코드를 수정하지 않는다.

### Execution Protocol
1. Scope 분석
   - 대상 페이지 / 플로우 파싱
   - 예: `login`, `dashboard`, `전체`

2. 브라우저 탐색
   - `browser_navigate`로 진입점 이동
   - `browser_console_messages(level="error")`로 에러 수집
   - `browser_snapshot(boxes=true)`로 UI 상태 스냅샷

3. 문제 분류
   - Critical: 500 빌드 에러, 페이지 진입 불가, `"use client"` 누락 등
   - High: API 연결 실패, 리디렉션 루프
   - Medium: 스타일 / UX 이슈, 경고 메시지
   - Low: 개선 제안, stale 버전 등

4. Blueprint 생성
   - `docs/plans/playwright_<scope>_<date>.md`

5. plan_lint 검증
   - `uv run python scripts/plan_loop/plan_lint.py <blueprint_path>`

6. 보고
   - severity별 문제 요약
   - Blueprint 경로

### 기본 Scope 매핑
- `login` → `/login`, `/auth/*` 라우트 + 세션 리디렉션 확인
- `dashboard` → `/dashboard/*` 전체 + API 연동 상태
- `full` 또는 생략 → 핵심 플로우 (`login → dashboard → 주요 기능`)

---

## 16. Session Language Gate (AAG-008)

### Trigger
- 신규 `.md` 문서 생성 시 자동 실행

### 목적
한국어 우선 정책을 위해, 모든 새 Markdown 파일의 첫 줄에 아래 주석을 넣는다.

```markdown
<!-- Language: ko -->
# 문서 제목
```

### 실행 프로토콜
1. 문서 생성 전 확인
   - 신규 `.md` 파일 생성 시 첫 줄에 언어 주석 삽입
2. 기존 문서 검증 (선택적)
   - `just session-gate`
   - `just session-gate-strict`
3. 영문 단락 감지
   - `scripts/verify_korean_text.py`가 3줄 이상 연속 영문 행을 탐지

### 금지
- 언어 주석 없이 문서 생성
- 영문-only 문서 작성

---

## 17. Proactive Execution Strategy

에이전트는 명시적 명령 없이도 상황에 따라 최적의 워크플로우를 선제적으로 제안하거나, 특정 임계치 도달 시 자동 실행한다.

| 상황 | 권장 워크플로우 | 실행 방식 |
|---|---|---|
| 에러 / 경고 발생(Runtime, Build, Test) | `/diagnose` 또는 `/debug_error` | 즉시 제안 |
| 복합적 수정 예상(파일 3개↑ 또는 로직 변경) | `/plan` | 강제 전환 제안 |
| 중요 결정 / 아키텍처 변경 완료 | `/ai-log` | 세션 중 수시 기록 |
| 해결된 고난도 이슈 / 노하우 발견 | `/asset` | 세션 종료 전 제안 |
| 설계 결함 / shallow module 발견 | `/micro-improve` | 발견 즉시 제안 |
| 세션 종료 / 이관 직전 | `/go` | 자동 실행 |
| MEMORY.md 위생 불량(200라인↑) | `just memory-verify` | 종료 게이트 자동 실행 |

---

## 18. Reference Index

- **Core**: `PROJECT_RULES.md`, `.cursor/rules/Execution-Routine.mdc`
- **Specs**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **Verification**: `justfile`, `scripts/plan_loop/plan_lint.py`
- **Plan Workflow**: `scripts/plan_loop/plan_lint.py`, `.agents/workflows/plan.md`, `docs/plans/`
- **Playwright Discovery**: `.agents/workflows/playwright.md`
- **Adaptive Guidelines**: `docs/memory/ADAPTIVE_GUIDELINES.json`, `scripts/memory/update_adaptive_guidelines.py`
- **Session Language Gate**: `scripts/verify_korean_text.py`

---

## 19. Operating Test

이 문서가 제대로 작동하면 다음이 관찰되어야 한다.

- 불필요한 변경이 줄어든다.
- 과설계가 줄어든다.
- 확인 없는 완료 선언이 사라진다.
- 질문이 필요한 지점에서 먼저 질문하게 된다.
- 계획/구현/검증의 경계가 분명해진다.