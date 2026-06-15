<!-- Language: ko -->

# Blueprint 전체 골격 템플릿 (참고)

`/plan` 또는 `docs/plans/PLAN_*.md` **신규 작성** 시 본 파일은 **구조·필드·Conclusion 형식 참고용**이다. 전체를 무조건 복붙하지 않아도 된다.

- **절차 SSOT**: [`.agents/workflows/plan.md`](../../.agents/workflows/plan.md) §1.9 (신규 작성) · §1.10 (Task 종료)
- **협업용 자연어 절**: [`TEMPLATE_blueprint_collaboration_summary.md`](TEMPLATE_blueprint_collaboration_summary.md)
- **lint**: `just plan-lint docs/plans/<file>.md`

---

## 필수 3항 (활성 `docs/plans/PLAN_*.md` — `plan_lint` HARD)

| # | 항목 | 위치 |
| :---: | :--- | :--- |
| 1 | `## Agent Completion Contract` | Execution Plan **직전** |
| 2 | `> **에이전트 스코프**:` blockquote | Execution Plan **첫 Task 직전** — Verify → Conclusion → `done` → `just plan-lint` |
| 3 | 각 Task `- **Conclusion**:` | todo/running: CSF 슬롯 · done: 실측 1줄 |

아카이브(`docs/plans/archive/**`) Blueprint는 위 3항 lint **미적용**(레거시 유지).

---

## MUST (기존 plan_lint — 전체 Blueprint)

1. `<!-- Language: ko -->` · `# 🗺️ Project Blueprint: …`
2. 문서 메타: `SSOT Check`, `Project Status Link`, `Architectural Goal`, `Linear-Issue` (TEM-XXX placeholder 필수)
3. `## 📎 관련 명세` — repo 루트 기준 `docs/specs/...` 경로 1건 이상 (**활성 Blueprint `plan-lint` HARD** · `--archive-ready` 동일 검사; `../specs/` 상대 링크만으로는 통과하지 않음)
4. `## 📋 업무 요약 (협업용)` — 경로·CLI·백틱 없음
5. Task 헤딩: `#### Task X.Y: 제목 [Unit: Atomic]` (X·Y 숫자만)
6. Task 필드: `Task-ID`, `Pre-read`, `Action`, `Target`, `Goal`, `Diagnostics`, `Verify`, `Conclusion`, `Dependency`
7. `Verify`: 셸 명령 **1개** (`;` `&&` `||` 금지)
8. `## 🔁 Conclusion & Summary` (문서 롤업)
9. **마지막 Task = Blueprint closeout** — 구현 Task 다음 **항상 1개** 배치(§「마지막 Closeout Task」 참고)

## 마지막 Closeout Task (신규 Blueprint MUST)

구현 Task만 `done`으로 닫고 Roll-up·DoD·`plan-close`를 빼먹는 사고를 막기 위해, Execution Plan **맨 끝**에 아래 closeout Task **1개**를 둔다.

| 필드 | 규칙 |
| :--- | :--- |
| Phase | `### Phase N — Blueprint closeout` (마지막 Phase) |
| Goal | 선행 Task Conclusion을 근거로 `## 🔁 Conclusion & Summary`의 **Roll-up 1문단**을 작성한다. (단일 목표 — `및`/`그리고` 금지) |
| Target | `docs/plans/PLAN_<slug>.md` (Roll-up 줄만 편집; 다른 Task `Status`/`Conclusion` 직접 수정 금지) |
| Verify | `just plan-close plan=docs/plans/PLAN_<slug>.md` — DoD 백틱 명령은 게이트가 **자동 실행** |
| Dependency | 직전 Phase의 **마지막 구현 Task** Task-ID |
| Conclusion (done) | `[PASS] Roll-up 작성. plan-close exit 0 (DoD 명령 일괄 PASS).` |

**DoD와의 관계**: DoD는 `[ ]` 체크리스트가 아니라 **백틱 명령 목록**이다. closeout Task의 `plan-close`가 DoD 명령을 파싱·실행하므로, 「DoD 전부 완료」= closeout Verify PASS와 동일하다.

**예외**: 문서-only·1-Task pilot 등 **애초에 구현 Task가 0개**인 Blueprint는 closeout Task 생략 가능( Roll-up + `plan-close`는 작성 세션에서 수동 수행).

## Origin Intent · Edge Case Trace (활성 Blueprint MUST — 문서, lint 미검증)

`just plan-lint` 전 [plan.md](../../.agents/workflows/plan.md) §「작성 — Origin Intent & Edge Case Trace」를 따른다.

| 절 | 규칙 |
| :--- | :--- |
| `## 🎯 Origin Intent` | 업무 요약 **직후**·Diagnosis **직전**. 원래 목적(사용자 요청·discuss §3·discover evidence·research 결론) 1~3줄. 경로·CLI·백틱 **금지**. discuss §3 「엣지 케이스」·plan §Edge Case Design Gate AskQuestion 답을 Trace에 이관. |
| `## ⚠️ Edge Case Trace` | Origin Intent **직후**. 표 **최소 1행**(없으면 `해당 없음` 1행). 각 행은 `Task-ID` **또는** `범위 밖`+사유 필수. |
| Phase 0 (권장) | `### Phase 0 — Edge case gap audit` — 표 반영·누락 Task 보완. **표준**: `plan-lint` PASS **전** 작성 단계에서 완료. 파일에 남으면 전체 실행 시 **첫 1 Task만** 구조 보완 후 실행 동결([plan.md](../../.agents/workflows/plan.md) §Blueprint 실행 동결). |

**Edge Case Trace 표 형식** (Conclusion·Task 본문에 표 복사 **금지** — Blueprint 전용 절만):

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| (관찰 가능 한 줄) | Origin / Risk / discuss / 도메인 | `XXX-00N` 또는 `범위 밖 — 사유` | (선택) |

- **인범위** 엣지 → 기존 Task에 매핑되지 않으면 **Atomic Task 추가**(Red 테스트·실패 경로 우선 — [code_quality_lifecycle.md](../../.agents/core/code_quality_lifecycle.md) I-4).
- **범위 밖** → `## 📋 업무 요약` 「이번에 안 하는 것」에 동일 문장 기재.

## 권장 (참고·복붙 OK, lint 미검증)

- `- **Closeout**:` — Task 종료 시 갱신할 Blueprint 경로 힌트
- Diagnosis / Architectural Deepening / Conceptual Sketch 등 아래 「복사용 뼈대」 전 절

## MUST NOT

- **Linear-Issue 누락**: `Linear-Issue` 필드가 없거나 비어 있으면 lint FAIL (단, `Linear-Policy: internal` 명시 시 예외)
- Task 제목·Goal에 `(선택)` `(Optional)` `(필요 시)`
- Task Goal에 `및`, `그리고`, `또한`, `동시에` 등 다중 액션을 암시하는 접속사 사용 금지 (반드시 Atomic한 단일 문장으로 작성)
- **추상적/선언적 Task Goal 금지**: "레이아웃을 재배치한다", "상태를 정비한다" 등 모호한 목표를 쓰지 마시오. ("A 컴포넌트를 지우고 B 훅을 주입해 Grid를 x에서 y로 변경한다" 형태의 White-box 명세 필수)
- **거대 파일 단일 타겟팅 집중 금지**: `page.tsx` 같은 하나의 큰 파일에 Layout/State 수정 Task를 연속으로 배치하지 마시오. 반드시 신규 파일(Hook, View Component) 생성 Task를 선행하여 책임(Seam)을 분리하시오.
- **Target 필드에 디렉토리 지정 금지**: `Target: path/to/dir/` 형태로 지정하면 Pre-read 시 컨텍스트가 폭발합니다. 반드시 `path/to/file.ts` 처럼 구체적 파일명으로 제한하시오.
- **1 Task = 1 File 원칙**: Target 필드에 수정할 파일을 2개 이상 명시하면 안 됩니다. 하나의 Task는 단 하나의 파일만 수정해야 합니다. 여러 파일을 동시에 수정해야 한다면 각 파일별로 별도 Task를 작성하시오.
- **TDD(실패 테스트 작성) 누락 금지**: 신규 컴포넌트/로직 생성 시 Task Goal 내에 "실패 테스트를 먼저 작성한다"는 단계를 생략하지 마시오.
- Conclusion에 마크다운 표(`|`)
- todo Task에 `[PASS]` 등 실측 Conclusion (Verify 전)
- **Verify에 `grep`, `echo`, `cat`, `ls`, `find` 단독 사용 금지** — runner(`just`, `pytest`, `uv run pytest`, `pnpm run test`, `python3`)가 없으면 lint FAIL
- **Verify에 `;` `&&` `||` 체인 금지** — 명령 1개만 허용. 검증이 2개 이상이면 Task를 분리하시오.
- **`plan-preread` 없이 `plan-lint` 실행 금지** — Blueprint 저장 후 반드시 `just plan-preread docs/plans/<file>.md --write` 먼저 실행. 미실행 시 전 Task "missing Task-level Pre-read" FAIL
- **todo/running Task Conclusion에 임의 문구 사용 금지** — 반드시 아래 CSF 슬롯 중 하나만 사용:
  - `[판정 — 비개발자용 요약. 검증 결과]`  ← 기본값 (이것만 써도 됨)
  - `[판정 — 비개발자용 요약. 검증 결과. 코드 이름 배제]`

- **DoD(Definition of Done)에 `just plan-close` 포함 금지**: Closeout Task `Verify`만 plan-close를 호출한다. DoD에 넣으면 `plan_close_gate` 재귀 타임아웃 — **`plan_lint` HARD** ([`recurrence.py`](../../scripts/plan_loop/plan_lint/recurrence.py)).
- **DoD(Definition of Done)의 `just <recipe>`는 Justfile에 존재해야 함**: unknown recipe면 **`plan_lint` HARD** ([`justfile_recipes.py`](../../scripts/plan_loop/plan_lint/justfile_recipes.py)).
- **DoD(Definition of Done)에 수동 검증(사람이 직접 확인하는 스모크 테스트) 항목 포함 금지**: DoD의 모든 항목은 반드시 스크립트(`just`, `pytest` 등)나 Playwright 등을 이용한 **기계적 자동 검증**이 가능한 형태로 작성하시오.

---

## 복사용 뼈대

```markdown
<!-- Language: ko -->

# 🗺️ Project Blueprint: {제목} ({Linear-Issue})

## 문서 메타
- **Last Verified**: YYYY-MM-DD | **Tested Version**: N/A
- **Reference**: N/A
- **SSOT Check**: N/A
- **Project Status Link**: N/A
- **Linear-Issue**: TEM-XXX  <!-- MUST: ensure_plan_linear가 실제 번호로 치환 -->
- **Priority**: 1
- **Labels**: feature
- **Architectural Goal**: …

## 📎 관련 명세

> **아카이브 필수**: `/archive` 시 `just plan-lint <file> --archive-ready`가 본 절(「관련 명세」) 또는 본문 `docs/specs/` 문자열을 검사합니다. `SSOT Check`와 별개입니다.

| 문서 | 범위 |
| :--- | :--- |
| `docs/specs/technical/SPEC_TECH_….md` | (한 줄) |

## 📋 업무 요약 (협업용)

> **독자**: 원장·원무·기획. 코드·경로·명령은 아래 기술 절.

### 개요

(한 문단)

### staff·경영에서 바뀌는 점

- …

### 끝났을 때 확인할 것

- …

## 🎯 Origin Intent

- **출처**: (discuss handoff / discover-emit / research / 직접 요청)
- **원래 목적**: (한 문장 — 무엇을 왜 바꾸는지)
- **완료 관찰**: (끝났을 때 staff·시스템에서 보이는 변화 1줄)

## ⚠️ Edge Case Trace

| 엣지 케이스 | 출처 | Task-ID / 범위 밖 | 비고 |
| :--- | :--- | :--- | :--- |
| 해당 없음 — {사유 한 줄} | Origin | 범위 밖 — {업무 요약과 동일} | |
| {예: API 404·시드 없음} | Risk | XXX-002 | Red 테스트 선행 |
| {예: 빈 대기 목록 UI} | Origin | XXX-003 | |

## 🧭 Context Pre-read Gate (실행 전 필수)

> ⚠️ **에이전트 주의**: Blueprint 파일 생성 직후, `just plan-lint`를 돌리기 **전에** 반드시 아래 명령을 먼저 실행하여 마커를 주입하세요.
> `just plan-preread docs/plans/PLAN_xxx.md --write`

(planned: `just plan-preread docs/plans/PLAN_xxx.md --write`)

## 실행 순서·선행

| … | … |

## 🔍 Diagnosis & Findings

- **현상**: …
- **근본 원인**: …

## 🏗️ Architectural Deepening

- **Seam**: …
- **Leverage**: …

## 📜 Conceptual Sketch

```
(의사 코드)
```

## 🛡️ Risk & Strategy

- **Risk**: … — **Strategy**: …

## 🔍 Impact Scope

| 수정 대상 | 역할 |
| :--- | :--- |
| … | … |

## Agent Completion Contract

본 Blueprint Task를 실행하는 세션(`@PLAN_* task N.M`, `/plan` 후 구현)에서 사용자가 별도 금지하지 않는 한, 아래는 **해당 Task 범위에 포함**된다 ([planning.md](../../.agents/core/planning.md) §2.2 · [plan.md](../../.agents/workflows/plan.md) §1.10).

| 허용 | 금지 |
| :--- | :--- |
| `just plan-task-close` CLI를 사용한 Task `Status`·`Conclusion` 자동 갱신 | 텍스트 에디터(replace 등)로 본 파일 Task 상태 In-place 직접 수정 |
| Task `Verify` 직후 `just plan-lint docs/plans/PLAN_xxx.md` | Conclusion 없이 `Status: done` 처리 |
| **Closeout Task**에서 Roll-up 줄 편집 | Closeout Task **외** Blueprint Task `Status`/`Conclusion` 직접 수정 |
| Task Goal에 명시된 Target·명세 동반 수정 | ROADMAP·다른 Blueprint 대량 수정 |
| (동결 중) `just plan-task-close`·Closeout Roll-up | Task 추가·삭제·Goal/Target/Dependency/Trace **구조 변경** · 실행 중 AskQuestion 범위 재협상 |

**실행 동결**: `plan-lint` PASS 후 사용자가 **전체 진행**을 요청하면 Blueprint 구조는 고정. 표준 패턴 — 파일 작성 완료 → `@PLAN_*` 전체 순차 실행 → Closeout. 상세: [plan.md](../../.agents/workflows/plan.md) §Blueprint 실행 동결.

**Task 완료 정의**: `Verify` exit 0 → `just plan-task-close` 실행 → `just plan-lint` PASS. **플랜 전체 완료**는 마지막 Closeout Task까지 포함한다.

## 🛠️ Step-by-Step Execution Plan

> **에이전트 스코프**: 사용자가 Blueprint **전체 실행**을 요청하면 Task를 **Dependency 순**으로 1개씩만 진행한다. Blueprint Task 구조는 **동결** — `plan-task-close`·Closeout Roll-up만 예외. `Verify` PASS → `just plan-task-close plan=... task=... conclusion="..."` → `just plan-lint docs/plans/PLAN_xxx.md` → 다음 Task. **마지막 Closeout Task**에서 Roll-up 후 `just plan-close` Verify.

### Phase 0 — Edge case gap audit

#### Task 0.1: Edge Case Trace 갭 감사 및 보완 Task 반영 [Unit: Atomic]
- Task-ID: [XXX-001] | Linear-Issue: TEM-XXX | Status: todo | Priority: 1 | Labels: plan | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
  2. `[rule]` `.agents/core/code_quality_lifecycle.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_xxx.md`
- **Closeout**: `docs/plans/PLAN_xxx.md` (Task XXX-001 `Conclusion`·`Status`)
- **Goal**: Origin Intent와 Risk를 근거로 Edge Case Trace 표를 채우고, 인범위·미매핑 엣지마다 Atomic Task를 추가하거나 범위 밖 사유를 업무 요약에 기록한다.
- **Diagnostics**: 0
- **Verify**: `just plan-lint docs/plans/PLAN_xxx.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: None

### Phase 1 — …

#### Task 1.1: … [Unit: Atomic]
- Task-ID: [XXX-002] | Linear-Issue: TEM-XXX | Status: todo | Priority: N | Labels: … | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/core/execution.md` <!-- (경로가 없을 때 plan-preread 에러 방지용) -->
  - **Hook 추출 시 타입 정의 확인**: `useExamination.types.ts` 등 실제 타입 정의를 Read 후 추출 — Guess 금지 (TEM-355 세션 오류 방지)
- **Action**: Edit File | **Target**: `path/to/code.py` <!-- (백틱 파일 경로 필수) -->
- **Closeout**: `docs/plans/PLAN_xxx.md` (Task XXX-002 `Conclusion`·`Status`)
- **Goal**: … | **Diagnostics**: 0
- **Verify**: `python3 -c "from target_module import target_func; import inspect; sig = inspect.signature(target_func); assert 'new_param' in sig.parameters"` <!-- (존재하지 않는 테스트 파일 실행 금지. inspect/ast.parse 기반 inline 검증 또는 실제 존재하는 pytest -k <single_test> 사용) -->
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: XXX-001

### Phase 9 — Blueprint closeout

#### Task 9.9: Roll-up 작성 및 plan-close [Unit: Atomic]
- Task-ID: [XXX-099] | Linear-Issue: TEM-XXX | Status: todo | Priority: 3 | Labels: docs | RetryPolicy: none
- **Pre-read**: 이 Task만 — `write`/`patch` 전 **전부** Read
  1. `[rule]` `.agents/workflows/plan.md`
- **Action**: Edit File | **Target**: `docs/plans/PLAN_xxx.md`
- **Closeout**: `docs/plans/PLAN_xxx.md` (Task XXX-099 `Conclusion`·`Status`)
- **Goal**: 선행 Task Conclusion을 근거로 `## 🔁 Conclusion & Summary` Roll-up 1문단을 실측으로 작성한다.
- **Diagnostics**: 0
- **Verify**: `just plan-close plan=docs/plans/PLAN_xxx.md`
- **Conclusion**: [판정 — 비개발자용 요약. 검증 결과]
- **Dependency**: XXX-00N <!-- 직전 구현 Task-ID -->

## 🔁 Conclusion & Summary

- **Roll-up**: … <!-- Closeout Task(XXX-099)에서 실측 작성. todo 상태 placeholder 금지 -->

## ✅ Definition of Done (DoD)

> **작성 규칙**: 사람이 개입해야 하는 수동 스모크 테스트(Manual Smoke Test) 작성을 금지합니다.
> 모든 DoD 항목은 기계적으로 자동 검증 가능한 형태로 작성하되, 실행할 명령어는 **반드시 백틱(\`)으로 감싸서** 리스트 항목으로 작성하세요. `[ ]` 체크리스트 포맷은 사용하지 마세요.
> **Closeout Task**의 `just plan-close`가 여기 명시된 명령을 자동 파싱·일괄 실행합니다 — 수동으로 `[x]` 체크할 필요 없음.

- `just pytest path/to/test`
- `just plan-lint docs/plans/PLAN_xxx.md`

## 검증 행렬

| Scope | Command |
| :--- | :--- |
| Blueprint | `just plan-lint docs/plans/PLAN_xxx.md` |
```

---

## Conclusion 치트시트

| Status | Conclusion |
| :--- | :--- |
| `todo` / `running` | `[판정 — 비개발자용 요약. 검증 결과]` |
| `done` | `[PASS] {업무 변화}. {변경}. Verify \`...\` exit 0.` |
| `blocked` | `[FAIL] {원인}. {다음 조치}. Verify \`...\` exit N.` |
