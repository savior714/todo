---
scope: ["*"]
always_apply: true
priority: 1
---
<!-- Language: ko -->
# Core Execution & Operating Principles

에이전트의 핵심 사고 방식(Why/What)과 실행 방식(How)을 규정한다.

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

- "기능 추가"는 테스트 포함으로 정의한다.
- "버그 수정"은 재현 테스트 후 통과로 정의한다.
- "리팩터링"은 전/후 테스트 통과로 정의한다.
- multi-step task는 짧은 계획을 먼저 제시한다.

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

- 계획 요구("계획", "plan", "blueprint", "roadmap")가 있으면 `/plan` 워크플로우를 강제 트리거한다.
- 자유형 계획 텍스트만 던지는 것으로 대체하지 않는다.

#### 2.4 TDD Red-First

- 구현 전 실패 테스트를 작성하고 실행 로그를 확인한다.
- `Red → Green → Refactor`를 강제한다.
- 구현 후 테스트를 덧붙이는 방식 금지.
- assertion 없는 테스트, Red 로그 없는 "TDD 완료" 선언 금지.

#### 2.5 Roadmap Integrity

- 미래 태스크(`todo`, `pending`)는 명시적 폐기 없이 삭제하지 않는다.

#### 2.6 Guideline Compliance

- 모든 작업 시작 전 `.agents/memory/ADAPTIVE_GUIDELINES.json`을 읽는다.
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
2. 관련 specs (`docs/specs/PRD.md`, `TRD.md` 등)
3. `.agents/memory/MEMORY.md`
4. `.agents/memory/ADAPTIVE_GUIDELINES.json`
5. `tests/`

`db/migrations` SQL을 추가·수정하는 작업이면 `PROJECT_RULES.md`의 Turso 마이그레이션 적용 절차와 `ADAPTIVE_GUIDELINES.json`(AAG-007)을 따른다.

### 3.2 Read Before Edit

- 파일 읽기 → exact snippet 확보 → patch
- 수정 전에는 반드시 현재 디스크 상태를 다시 확인한다.
- formatter가 wrapping / prop ordering / import sorting / indentation을 바꿀 수 있으므로 이전 patch context를 신뢰하지 않는다.

### 3.3 SSOT / TDD

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

## 4. File Access Priority

1. Built-in Tools: Read / Write / Grep / Glob / SemanticSearch
2. Shell: batch / system-level / large pipeline / permissions 필요 시에만
