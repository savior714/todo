<!-- Language: ko -->

# Close · Handoff · Same-session plan · Multi-cycle

**SSOT**: converge/close·메뉴 A/B·plan 연속·multi-cycle. 해당 턴 직전에 Read.

**관련**: [turn-decision-tree.md](turn-decision-tree.md) · [ambiguity-zero-gate.md](ambiguity-zero-gate.md) · [plain-language-questions.md](plain-language-questions.md) §표준 메뉴

---

## 수명·보관 (handed-off 이후)

- **SSOT**: [DOC_discuss_lifecycle.md](../../../../docs/discussions/DOC_discuss_lifecycle.md) — status 3값, `linked_plan`, `docs/discussions/archive/` 이관.
- **`handed-off` 기록 시**: frontmatter `linked_plan:` 에 plan repo 상대 경로를 채운다( plan 파일 생성 직후 동일 세션).
- **plan 아카이브 후**: `archive_discussions`가 연결 discuss를 `docs/discussions/archive/`로 옮긴다 — 노트를 루트에 두지 않는다.
- **검사**: `just docs-discuss-lifecycle` — 신규·수정 discuss의 `handed-off` + `linked_plan` 누락 시 FAIL.

---

## 방향 수렴 (converge) — pre-close

**언제**: §2 `[열림]`이 0~1개이고 방향·범위가 한 덩어리로 맞아 보일 때. `direction` 중 **수렴 직전 1턴**에만 쓴다(매 턴 필수 아님).

**조기 종료 권장 금지 (가드레일)**: `[열림]` 항목이 0개가 되었다고 해서 기계적으로 `방향 확정 → 계획으로` 옵션을 `(권장)`하지 않는다. 사용자가 명시적으로 멈추자고 하기 전까지는, 에이전트가 주도적으로 논의에서 누락된 심층 주제(예: 예외 처리, UI 세부 스펙, 연동 리스크 등)를 새 `[열림]` 질문으로 발굴하여 이를 `(권장)` 옵션으로 제시함으로써 브레인스토밍 파트너로서 논의를 계속 파고든다.

**엣지 케이스 수렴 전제**: [ambiguity-zero-gate.md §converge 엣지 전제](ambiguity-zero-gate.md).

**행동** (본문 18줄 이내 유지):
1. 합의 요약 **2~3줄**(또는 이번 턴 확정 1문장) + **권장 1줄**. (권장은 심층 논의 계속을 기본으로 함)
2. **`AskQuestion`/`question`(병용) 수렴 메뉴** — 텍스트로 「정리」입력을 요구하지 않는다.

| 옵션 (라벨 예) | 다음 |
| :--- | :--- |
| **방향 확정 → 계획으로** | `close` 트리거 — §3·`direction-set` 후 **§Same-session plan 직행**(메뉴 A·Blueprint **재질문 생략**) |
| **{새로운 심층 주제} 더 논의하기** `(권장)` | 새 분기를 발굴하여 **질문 1개** 추가 (`direction` 유지) |
| **아직 더 논의** | `direction` 계속, 노트만 갱신 |

- **방향 확정 → 계획으로** 선택 = Blueprint 작성 의사 **확정** + `close` — **같은 세션**에서 PLAN 작성(plan-lint PASS)까지 진행. **메뉴 A로 «Blueprint 만들기»를 다시 묻지 않는다**.
- `{새로운 심층 주제}`는 에이전트가 새롭게 제안하는 다음 논의 포인트를 명시한다.

`실행 계획(Blueprint)으로 만들기`·converge «계획으로» **허용 전** [ambiguity-zero-gate.md](ambiguity-zero-gate.md) 선적용.

---

## 종료 (close) — 사용자 신호 우선

**트리거** (둘 중 하나):
- 사용자가 「정리」「끝」「방향 정해졌다」라고 하거나
- **수렴 메뉴**에서 **방향 확정 → 계획으로**(또는 동등 라벨)를 선택했을 때

그 전엔 대화를 계속하고 노트만 점진 갱신한다. 방향이 잡혀 보여도 **에이전트가 먼저 `close`를 실행하지 않는다** — **`converge` 턴**으로 `AskQuestion`/`question`(병용) 수렴 메뉴를 제시한다.

**종료 시** (공통 1~2):
1. 합의 방향 + **범위 스케치**를 노트 §3에 확정, `status: direction-set`로 갱신.
2. 노트 §4 — converge «계획» 경로: `핸드오프: plan — in progress` 후 PLAN 완료 시 `handed-off` 갱신. 텍스트 close만: `핸드오프: pending`(명령형 다음 단계 금지).

**텍스트 close 전 계획 의도 확인 (MUST)** — converge «계획» **없이** 「정리」「끝」「방향 정해졌다」만 온 경우, **메뉴 A 전** `AskQuestion`/`question`(병용) **1개**:

- 「이번 discuss의 목표가 **실행 계획(Blueprint) 문서**까지인가요?」
- **예** → 메뉴 A에서 Blueprint `(권장)` 허용 (§1·답변에 계획 의도 있을 때)
- **아니오** → 메뉴 A에서 **이 주제 더 논의하기** `(권장)`, Blueprint `(권장)` **금지**

**converge «방향 확정 → 계획으로»** 선택 = plan 의사 **확인 완료** — 위 질문·메뉴 A **생략** → §Same-session plan 직행.

**경로 분기** (3):
- **A — converge «방향 확정 → 계획으로» 직후**: 채팅 합의 요약 2~3줄 → **§Same-session plan** (메뉴 A·계획 확인 **생략**) → 산출물 요약 **메뉴 B**.
- **B — 「정리」「끝」「방향 정해졌다」만**: 합의 요약 2~3줄 → **«계획 문서가 목표?»** → **표준 메뉴 A `AskQuestion`/`question`(병용)**.

**금지**: converge «계획» 선택 뒤 **메뉴 A·Blueprint 재질문**. 채팅에 `/plan`·파일 첨부 지시만 텍스트로 쓰기.

---

## 표준 AskQuestion/`question`(병용) 메뉴 (MUST)

주제 분기(`scan`·`direction`·`converge`)가 **아닌** discuss 마무리 턴은 **항상** 아래 메뉴로 `AskQuestion`/`question`(병용)을 끝낸다. 라벨 예는 [plain-language-questions.md](plain-language-questions.md) §표준 메뉴.

- 옵션 **3~4개**, `(권장)` **정확히 1개**
- **`(권장)` 항상 1번** · **「여기서 마무리」는 항상 마지막** — [SKILL.md](../SKILL.md) §옵션 표시 순서
- **assess·「더 깊게 분석」옵션 금지**

| 메뉴 | 언제 | `(권장)` | 구성 |
| :--- | :--- | :--- | :--- |
| **A — 설계 전** | **텍스트** `close`만 (`linked_plan` 없음). converge «계획» 경로 **금지** | §1·close 확인에 **계획 의도 있을 때만** Blueprint; **없으면** **이 주제 더 논의** | 권장 + 부가 1~2 + **마무리** |
| **B — 설계 후** | 산출물 요약, handed-off 재진입, PLAN 존재 | **이 PLAN 전체 순차 실행** | **3옵션**: PLAN 전체 · 새 주제 · **마무리** (Task 1.1만 **금지**) |

### 메뉴 A — 설계 전 (핸드오프)

**`(권장)` 조건**: §1 «이번 discuss에서 끝까지: …»·close «계획 문서가 목표?» **답변**에 **계획·설계 넘기기 의도**가 있을 때만 **Blueprint** `(권장)`. §1에 계획 의도 **없으면** — 「끝」이어도 **이 주제 더 논의하기** `(권장)`, Blueprint `(권장)` **금지**.

**표시 순서 (MUST)**: 2단계 `(권장)` 선정 후 **1번=`(권장)`**, **마지막=마무리**. 계획 의도 없을 때 Blueprint를 1번에 두지 **않음**.

| `(권장)` | 1번 | 2번 | 마지막 |
| :--- | :--- | :--- | :--- |
| Blueprint | Blueprint | 더 논의 | 마무리 |
| 더 논의 | 더 논의 | Blueprint | 마무리 |

| 옵션 (역할) | 선택 후 |
| :--- | :--- |
| **실행 계획(Blueprint)으로 만들기** | §Same-session plan 연속 |
| **이 주제 더 논의하기** | `direction` 계속 |
| **여기서 마무리** | 세션 종료(PLAN·handed-off 없음) |

- 부가를 2개 쓸 때: **{§2 [열림] 한 항목}만 더 맞추기** 등 **한 가지**를 `(권장)`·마무리 **사이** 중간 슬롯에 넣고, **마무리는 항상 마지막**.

### 메뉴 B — 설계 후 (산출물·재진입)

**구성 고정 3옵션** — `(권장)`=PLAN 전체 → **표시 1번**, **마무리 항상 마지막**. **「Task 1.1만 먼저 시작」옵션 금지** (사용자 혼란·실익 없음).

| 표시 | 옵션 라벨 (예) | 선택 후 |
| :---: | :--- | :--- |
| 1 | **이 PLAN 전체 순차 실행** `(권장)` | `plan-lint` PASS Blueprint **동결** — Dependency 순 Task 전부(Verify→`plan-task-close` 반복) — [plan.md](../../../workflows/plan.md) §Blueprint 실행 동결 |
| 2 | **새 주제로 discuss 더 하기** | §Same-session multi-cycle |
| 3 | **여기서 마무리** | 세션 종료 |

- **같은 DISCUSS**에 메뉴 A·「Blueprint 만들기」**재호출 금지**.

---

## Handoffs (EMR)

| `close` 경로 | 마무리 |
| :--- | :--- |
| **converge «방향 확정 → 계획으로»** | 메뉴 A **없음** → §Same-session plan 직행 |
| **텍스트** (정리·끝·방향 정해졌다) | **표준 메뉴 A `AskQuestion`/`question`(병용)** 필수 |

**메뉴 A 선택 시**:

| 선택 | 다음 |
| :--- | :--- |
| Blueprint `(권장)` | §Same-session plan |
| 이 주제 더 논의 | `direction`, §4 `pending` 유지 |
| 마무리 | 세션 종료 |

**`handed-off` 기록 시점**: `PLAN_*.md`·plan-lint PASS·`linked_plan` **후에만**. 선택 전 채팅·노트에 「@… + /plan」형 문장 금지.

---

## Same-session plan 연속 (MUST)

**트리거** (둘 중 하나):
- converge **「방향 확정 → 계획으로」** 선택 직후 `close`
- **텍스트** `close` 후 메뉴 A에서 **실행 계획(Blueprint)으로 만들기** 선택

**에이전트 순서** (사용자에게 `/plan`을 시키지 않음):

1. [plan.md](../../../workflows/plan.md) SSOT Read.
1b. §3 「엣지 케이스」·Ambiguity-Zero 7번 **없으면** [plan.md §Edge Case Design Gate](../../../workflows/plan.md) **AskQuestion 1턴** → 답을 DISCUSS §3에 먼저 기록.
2. `DISCUSS_*.md` §3·§2·엣지 불릿을 입력으로 `docs/plans/PLAN_<slug>.md` 작성(Origin Intent · Edge Case Trace 포함) → `just plan-preread` → `just plan-lint` PASS.
3. DISCUSS frontmatter `linked_plan`·`status: handed-off`·§4 한 줄 갱신.
4. **산출물 요약 턴**으로 채팅 종료(§산출물 요약 턴). **같은 DISCUSS**에 대해 「Blueprint 작성」AskQuestion(`question` 병용) **재호출 금지** — **새 주제 discuss**는 §Same-session multi-cycle.

### 산출물 요약 턴

plan-lint PASS **직후 같은 세션·같은 DISCUSS** 전용. 본문 18줄 이내. 마지막은 **표준 메뉴 B `AskQuestion`**(§표준 AskQuestion/`question`(병용) 메뉴).

**필수 포함**:

- 논의·방향: 방금 `handed-off`한 DISCUSS 노트 한 줄.
- 설계: 방금 작성한 PLAN 한 줄(Task 개수·plan-lint PASS).
- **다음 단계(필수 문장)**: **이 PLAN**에 대해 Blueprint 작성은 **이미 끝났음**을 명시. (같은 DISCUSS 재-plan 안내 금지)

**금지 문구** (이 턴에 쓰지 말 것):

- **이 DISCUSS·PLAN**에 대해 `/plan` 다시 · plan 시행 · Blueprint 작성 · 노트 붙여 /plan
- **같은 handed-off DISCUSS**에 「실행 계획(Blueprint)으로 만들기」재호출
- 「정리」「끝」만 던지고 선택 없이 종료

#### GOOD (산출물 요약 턴) — 복붙용

```text
논의: DISCUSS 접수 개선 — handed-off, 방향·범위 확정.
설계: PLAN 접수 phase2 — Task 5개, plan-lint PASS.

이 주제의 설계는 끝났습니다. 다음은 이 PLAN 전체를 순서대로 실행하거나, 다른 주제를 새로 논의할 수 있습니다.

AskQuestion(`question` 병용): 이 PLAN 전체 순차 실행 (권장) / 새 주제 discuss / 마무리
```

**단계 구분 (채팅에 쓸 말)**:

| 이미 있는 것 | 사용자에게 말하는 다음 단계 | 금지 |
| :--- | :--- | :--- |
| DISCUSS만 (텍스트 close) | 표준 **메뉴 A** | PLAN 있다고 가정 |
| DISCUSS + converge «계획» close | **same-session plan** → **메뉴 B** | **메뉴 A·Blueprint 재질문** |
| DISCUSS + PLAN (방금 작성, 같은 주제) | 표준 **메뉴 B** (PLAN 전체 실행 권장 · 새 주제 · 마무리) | **같은 DISCUSS**에 Blueprint 재안내 |
| DISCUSS handed-off + linked_plan (재진입) | 표준 **메뉴 B** | **그 DISCUSS**에 `/plan`·Blueprint 재안내 |
| 세션 내 N번째 discuss→plan 완료 | 위와 동일 — **주제마다** DISCUSS+PLAN 1세트 | 이전 handed-off DISCUSS **재편집·재-plan** |

---

## Same-session multi-cycle (MUST)

**목적**: 한 채팅 세션에서 discuss→plan을 **주제마다 반복** — A 주제 Blueprint 작성 후 B 주제를 새로 논의하고 **별도** Blueprint를 또 만들 수 있다.

**트리거** (둘 중 하나):

- 산출물 요약 턴 **`AskQuestion`/`question`(병용)에서 「새 주제로 discuss 더 하기」** 선택
- close **메뉴 A**에서 「이 주제 더 논의하기」— `direction` 계속 (동일 노트, §4 `pending` 유지)

**에이전트 순서**:

1. **이전 DISCUSS는 그대로** — `handed-off`·`linked_plan` 유지, 본문 **수정 금지**.
2. **새** `docs/discussions/DISCUSS_<new_slug>.md` 생성 (`status: discussing`, §1~4 뼈대) — **새 §1** «이번 discuss에서 끝까지: …» 리셋.
3. `scan`부터 재진입 — 사용자가 준 새 주제·영역에 한정. 이전 PLAN·Task·§1과 **섞지 않음**.
4. 새 주제 `close` → converge «계획» 또는 메뉴 A Blueprint 선택 시 → **새** `PLAN_<new_slug>.md` → plan-lint PASS → **새 DISCUSS**만 `handed-off`·`linked_plan` 갱신.
5. 4 완료 후 다시 **산출물 요약 턴** — 2~4를 사용자가 멈출 때까지 반복 가능.

**slug 규칙**: 주제가 다르면 DISCUSS·PLAN slug도 **다르게**. 같은 slug로 두 번째 PLAN을 덮어쓰지 않는다. slug는 **의미 단어(kebab/snake)** 만 쓰고 순서·이슈 번호(`01_`, `tem102`, `20260418`)는 넣지 않는다 — [DOC_documentation_governance.md §2](../../../../docs/ops/rules/DOC_documentation_governance.md).

**금지**:

- handed-off DISCUSS를 reopen하여 두 번째 PLAN에 연결
- 「이미 Blueprint가 있으니 discuss/plan 불가」 — **세션·주제 단위**로만 금지(동일 DISCUSS)
- 새 사이클에서 이전 PLAN의 Task 번호·범위를 섞어 적기

### handed-off 이후 (동일 DISCUSS·재진입)

**대상**: 특정 `DISCUSS_*.md`가 이미 `handed-off`이고 `linked_plan` PLAN이 **디스크에 존재**할 때, 사용자가 **그 노트·그 주제**로 다시 들어온 경우.

- **그 DISCUSS에 대해** `/plan`·메뉴 A(Blueprint) **재호출 금지**.
- 마지막은 **표준 메뉴 B `AskQuestion`/`question`(병용)**만.

**「새 주제로 discuss 더 하기」** 선택 시 → §Same-session multi-cycle 1번부터.
