# AGENTS.md — Execution Protocol

본 문서는 에이전트 실행 방식(How)을 정의한다. 정책·스택·도메인 제약은 `PROJECT_RULES.md`를 따른다.

## 1. Rule Precedence
1. `PROJECT_RULES.md` → 2. `AGENTS.md` → 3. 기타 문서

## 2. Core Rules

**MUST**
- **Disk State First**: 수정 전 `read_file`로 exact snippet 확보. 디스크 상태만 truth.
- **Verification First**: lint/type/test 실패 상태에서 완료 선언 금지. severity 하향(`error → warn`)·gate 우회 금지.
- **Plan First**: 계획 요구(“계획”, “plan”, “blueprint”, “roadmap”) 시 `/plan` 워크플로우 강제 트리거. 자유형 계획 텍스트 금지.
- **TDD Red-First**: 구현 전 실패 테스트 작성·실행 로그 확인. `Red → Green → Refactor` 강제.
- **Roadmap Integrity**: 미래 태스크(`todo`/`pending`) 명시적 폐기 없이 삭제 금지.
- **Guideline Compliance**: 모든 작업 시작 전 `ADAPTIVE_GUIDELINES.json`을 읽고, 현재 태스크와 연관된 규칙이 있다면 이를 계획(`blueprint`)에 반드시 반영해야 한다. 누적된 권장사항을 무시하는 것은 정책 위반으로 간주한다.

**SHOULD**: 작은 semantic patch 단위, formatter 후 재읽기, AST/codemod 선호.

## 3. Execution Flow

| Step | Action |
|---|---|
| 1. Context Sync | `PROJECT_RULES.md` → 관련 specs → `docs/memory/{MEMORY.md, ADAPTIVE_GUIDELINES.json}` → `tests/` 확인 및 연관 가이드라인 추출 |
| 2. Read Before Edit | 파일 read → exact snippet → patch. (grep 결과 기억만으로 patch 금지) |
| 3. SSOT/TDD | 우선순위: tests → specs → impl. Red→Green→Refactor 사이클. |
| 4. Implementation | minimal patch, bounded scope, dirty-write 금지. |
| 5. Verification | 작업 범위 기반 검증 통과 후 완료 선언. |

**Red-First 강제 게이트**: 구현 후 테스트 덧붙임, assertion 없는 테스트, Red 실행 로그 없는 "TDD 적용 완료" 선언 — 모두 정책 위반.

## 4. Verification Matrix

본 매트릭스는 **FamilySync MVP (`todo`)** 레포의 `package.json`·`justfile` 기준이다. (`just lint`/`just ty`/`just tdd-fast` 등은 다른 워크스페이스용이며 **이 레포에 레시피가 없다**.)

| Scope | Required |
|---|---|
| Docs | link/path 정합성; 한글 `docs/**` 변경 시 (스크립트 존재 시) `python3 scripts/verify_korean_text.py --dir docs` |
| L1 small | `bun run lint` + `bun run typecheck:strict` |
| L2 feature | L1 + `bun run test` (+ 필요 시 `bun run build`) |
| L3 structural | L2 + `just ci` |
| Frontend UI | L1과 동일: `bun run lint` + `bun run typecheck:strict` |
| Plan / memory | `just ci` (플랜 Blueprint 계약·`PLAN_STATUS.json`·`just memory-verify`) |

산출물: **필수 고정 파일 없음** — 필요 시 세션 보고에 명령·exit 코드를 적는다. (`verify-last-result.json` 등은 본 레포 표준이 아님.)

## 5. Patch Integrity

**Safe Edit Loop**: lint/type → 에러 1건 선택 → 파일 read → exact snippet → minimal patch → formatter/lint 재실행 → 변경 시 재read.

formatter는 multiline wrapping / prop ordering / import sorting / indentation을 변경할 수 있으므로 이전 patch context는 신뢰 금지. JSX/Tailwind 수정은 regex보다 AST 기반 선호.

## 6. File Access Priority

1. **Built-in Tools**: Read / Write / Grep / Glob / SemanticSearch.
2. **Shell**: batch / system-level / large pipeline / permissions 필요 시에만.

## 7. Adaptive Thinking

| Level | When |
|---|---|
| L1 | optional |
| L2 | recommended |
| L3 | **mandatory**: architecture, migration, data integrity, external integration, large refactor |

## 8. Retry & Resilience

Trigger: `terminated`, `timeout`, `context_length_exceeded`, `connection_reset`, `rate_limit`.

- text/search → chunked retry, code → task/file split, large ops → grouped retry.
- exponential backoff, retry log, partial failure 보고 필수.

## 9. Plan & Completion Gate

### 9.1 Blueprint Contract 자동 검증 (Self-Enforcement)
모든 plan 파일(`docs/plans/*.md`)의 **생성 및 모든 수정** 시 즉시 `scripts/plan_loop/plan_lint.py` 실행 필수. 통과 전 저장 금지.
사용자가 `/plan` 워크플로우를 명시적으로 호출하지 않더라도, 태스크 분할(Task Splitting)이나 수동 수정 시에도 Blueprint 템플릿 구조(`Conclusion`, `Goal`, `SSOT Check` 등)를 반드시 유지해야 함.

**자동 감지 규칙** (수동 지시 없이 적용):
1. Task 헤딩에 체크박스 `[X]` 또는 `[ ]` 포함 → 즉시 제거 (`#### Task X.Y: 제목 [Level: Low]` 형식만 허용)
2. 모든 Task에 Conclusion 필드 필수 — `todo` 상태는 `[완료 시 기입]` placeholder 사용
3. Status 값 검증 — 허용값: `blocked`, `done`, `failed`, `running`, `todo` (`completed` 금지)
4. Dependency 필드 누락 → 자동 추가 (선행 Task 없음 시 `None`)
5. plan_lint.py 실패 시 → 에러 메시지 기반 수정 후 재실행

**Conclusion 강제 게이트 (강화)**:
- **Task 완료 선언 전**: Conclusion 필드에 실제 수행 내용 기입 **필수**. `[완료 시 기입]` placeholder가 남아있는 상태에서 `Status: done` 또는 `completed` 선언 **금지**.
- **완료 조건**: Conclusion에 최소 10자 이상의 구체적인 변경 파일명·행위·검증 결과 포함 (예: "파일 X 수정 완료. lint 통과 확인.").
- **자동 검증**: 세션 종료 시 `grep -rn "\[완료 시 기입\]" docs/plans/` 실행. 0건이 아니면 메모리에 불완전 세션 기록.
- **사용자 피드백**: 사용자가 "Conclusion을 채워" 또는 "기결론 업데이트"라고 지시하면 즉시 해당 Task의 Conclusion 필드를 실제 증적으로 갱신.

**자동 검증 명령어**:
```bash
python3 scripts/plan_loop/plan_lint.py docs/plans/<파일명>.md
```

**Task 분할(Splitting) 시 필수 준수 사항**:
1. 기존 Task의 상위 구조(Heading, Metadata)를 유지하면서 `spN` 형태로 분해하거나 신규 Task로 나열.
2. 모든 신규/분할된 Task에도 `Conclusion: [완료 시 기입]` 필드를 반드시 포함.
3. 문서 상단의 `SSOT Check`, `Project Status Link` 등 메타 필드를 삭제하지 말 것.

### 9.2 Plan Update Hard Gate (다음 중 하나면 완료 선언 전 plan Conclusion 업데이트 필수):
1. plan 파일 수정 포함  2. `/plan` 트리거됨  3. 세션 내 plan 파일 read

**Completion Checklist** (PASS 확인):
```bash
grep -rn "\[완료 시 기입\]" docs/plans/   # 0건
# Status: completed 라인은 Conclusion: 동반 필수
```

### 9.3 Plan Close Gate:
```bash
just plan-close plan=docs/plans/<target>.md verify="<cwd>::<cmd>|||..."
```
- `verify` exit ≠ 0 → 완료 금지
- `Script not found` 1회 발생 → 완료 금지 (cwd/명령 정정 후 재실행)
- `verify-last-result.json` fail → 상태 `in_progress` 유지

## 10. Reporting Protocol

**전 구간 간결 보고** (중간·세션 종료 동일). 토큰 효율 우선. 동일 정보 반복 금지.

- **기본**: 3~5줄 이내. 한 줄 요약 + 필요 시 변경 파일·검증 한 줄(`✓ [명령] passed`). 잔여 이슈 있으면 한 줄.
- **상세**: 검증 실패·블로커·사용자가 명시적으로 요청한 경우에만.

**금지**: 장문 템플릿 보고, 영문-only 리포트, "Final Completion Report" 헤더, evidence 없는 "완료" 선언, **사용자에게 가이드라인 갱신을 터미널로 직접 실행하라고 떠넘기기**.

### 10.1 Self-Evolution Protocol (Agent-Led Persistence)
세션 종료 시 개선 제안 및 가이드라인 반영은 다음 절차를 따른다:
1. **제안**: 에이전트가 개선안을 자연어로 제안.
2. **동의**: 사용자가 자연어로 승인 (예: "반영해줘").
3. **수행**: 에이전트가 `docs/memory/ADAPTIVE_GUIDELINES.json`을 직접 편집·저장해 반영한다(레포에 전용 `just` 레시피·스크립트가 추가되면 그 경로를 사용해도 된다). 사용자에게 명령 입력을 요구하지 말 것.

### 10.2 Memory Hygiene Check (AAG-006)
세션 종료 전 `docs/memory/MEMORY.md`의 라인 수(200라인 제한) 및 중복 링크 여부를 확인해야 한다.
- **실행**: `just memory-verify`
- **실패 시**: `MEMORY.md` 본문 중 오래된 로그나 결정을 아카이브(`docs/memory/changelog/`)로 이관하여 200라인 이하로 유지한다.
- **강제성**: `MEMORY.md` 위생 상태가 불량한 경우 세션을 종료해서는 안 된다.

## 11. Workflow Index

| Workflow | Usage |
|---|---|
| `/plan` | **통합 심층 설계 (Unified Deep Planning)**: 진단 → 아키텍처 심화 → 태스크 분해 통합 |
| `/archive` | 완료된 Blueprint를 archive로 이관하고 참조 갱신 (+ 잔여 이슈 자동 탐지 및 후속 `/plan` 트리거) |
| `/debug_error`, `/diagnose` | 디버깅·진단 (개별 실행용) |
| `/fia`, `/deep_research` | 사실 조사·리서치 |
| `/grill-me` | 설계 스트레스 테스트 |
| `/asset`, `/index_knowledge` | 지식 자산화 |
| `/go`, `/git` | 세션 이관·Git |
| `/prevent_loop` | 루프 방지 |
| `/directory_verify` | 디렉토리 정합성 |
| `/next` | 다음 우선순위 태스크 분석 (Context Lean: `PLAN_STATUS.json` 우선 사용) |
| `/micro-improve` | 아키텍처 개선 (개별 실행용) |
| `/playwright <scope>` | Playwright MCP 기반 자동 페이지 문제 발견 → Blueprint 생성 |

### 통합 심층 설계 프로토콜 (Unified Deep Planning)

**트리거**: `/plan` 또는 자연어 "통합 설계"

**목적**: `/diagnose`(진단) + `/plan`(분해) + `/improve-codebase-architecture`(심화)를 하나의 Blueprint 문서와 프로세스로 통합하여, **현상 분석부터 아키텍처 개선까지의 논리적 연속성**을 확보함. 특히 계획 단계에서의 **코드 읽기, 임시 수정, 테스트 실행**을 허용하여 "추측"이 아닌 "실증"에 기반한 완벽한 설계를 지향함.

**단계별 필수 포함 항목 (Blueprint Structure)**:
1.  **🔍 Diagnosis & Findings (진단)**: 현상(Symptoms) 및 재현 경로(Evidence), 근본 원인 분석(Root Cause). 계획 단계에서 직접 코드를 실행하여 확인한 증거를 포함해야 함.
2.  **🏗️ Architectural Deepening (아키텍처 심화)**: Seam 식별, Locality & Depth 확보 전략, Leverage 설계.
3.  **📜 Conceptual Sketch (의사 코드)**: 복잡한 로직의 구현 방향을 미리 확정하기 위한 의사 코드 스케치.
4.  **🛠️ Step-by-Step Execution Plan (실행)**: `[Level: Low]` 원자적 태스크 분해. 50개 이상의 단계라도 상관없으며, 각 Task가 다음 Task의 완벽한 기반이 되도록 **무결점 순차성(Zero-Friction Sequentiality)**을 보장해야 함.

### /playwright 워크플로우 정의

**트리거**: `/playwright <scope>` 또는 자연어 "playwright로 [scope] 확인"

**목적**: Playwright MCP를 사용해 브라우저에서 실제 페이지 탐색 후, 발견된 문제를 Blueprint 문서로 자동화 (Discovery & Planning ONLY)

**실행 프로토콜 (Discovery & Planning ONLY)**:
1. **Scope 분석**: 사용자 입력에서 대상 페이지/플로우 파싱 (예: `login`, `dashboard`, `전체`)
2. **브라우저 탐색**: 
   - `browser_navigate`로 진입점 이동
   - `browser_console_messages(level="error")`로 에러 수집
   - `browser_snapshot(boxes=true)`로 UI 상태 스냅샷
3. **문제 분류**:
   - Critical: 500 빌드 에러, 페이지 진입 불가 (`"use client"` 누락 등)
   - High: API 연결 실패, 리디렉션 루프
   - Medium: 스타일/UX 이슈, 경고 메시지
   - Low: 개선 제안 (stale 버전 등)
4. **Blueprint 생성**: `docs/plans/playwright_<scope>_<date>.md` 형식
   - **주의**: 문제를 해결하기 위해 코드를 수정하지 마십시오. 오직 계획 수립까지만 허용됩니다.
5. **plan_lint 검증**: `python3 scripts/plan_loop/plan_lint.py <blueprint_path>` 필수 실행
6. **보고**: 발견된 문제 요약 (severity별) + Blueprint 경로

**출력 형식**: Blueprint 문서 (`docs/plans/`) - 기존 `/plan` 워크플로우와 동일한 컨트랙트 준수

**기본 Scope 매핑** (사용자 코멘트 없을 시):
- `login` → `/login`, `/auth/*` 라우트 + 세션 리디렉션 확인
- `dashboard` → `/dashboard/*` 전체 + API 연동 상태
- `full` 또는 생략 → 핵심 플로우 (login → dashboard → 주요 기능)

## 12. Reference Index

- **Core**: `PROJECT_RULES.md`, `docs/CRITICAL_LOGIC.md`, `README.md`
- **Specs**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **Plan Workflow**: `scripts/plan_loop/plan_lint.py`, `.agents/workflows/plan.md` (Blueprint 계약은 플랜 파일 메타·`plan_lint` 출력 기준)
- **Playwright Discovery**: `.agents/workflows/playwright.md` (MCP 사용 시)
- **Adaptive Guidelines**: `docs/memory/ADAPTIVE_GUIDELINES.json`
