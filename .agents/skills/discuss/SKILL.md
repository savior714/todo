---
name: discuss
description: >
  코드 변경 없이 프로젝트 전체 상황을 파악하고, 한 턴 한 결정 AskQuestion(`question` 병용)(권장 + 이유)으로
  대화하며 "어디를 어떻게 개선할지" 방향을 합의한다. 합의 내용은 전용 논의 노트
  docs/discussions/DISCUSS_*.md에 점진 누적하고, 끝나면 plan(Blueprint)으로 핸드오프.
  같은 세션에서 주제마다 discuss→plan(multi-cycle) 반복 가능 — 주제별 DISCUSS+PLAN 1세트.
  Use when the user says discuss, /discuss, 논의, DISCUSS_, 또는 막연한 개선 욕구만 있고 아직 문제·계획이 없을 때. Not for /plan Blueprint 작성, /diagnose 디버깅, /assess 아키텍처 분석, or Task 구현 착수.
license: MIT
metadata:
  version: "1.1.3"
disable-model-invocation: true
---

<!-- Language: ko -->

# Discuss

> **도구 별칭**: 본 SKILL의 `AskQuestion` 지시는 `question` 도구 호출에도 동일 적용([principles.md §1.1.1](../../core/principles.md)).

**Discuss** = 코드를 건드리지 않고 프로젝트 전체를 둘러보며 **개선 방향**을 대화로 합의한다. 막연한 방향 잡기부터 **이미 있는 계획·설계 맹점 심문**, **문제→방향+범위 정리**까지 무코드 대화는 전부 여기로 모은다. 산출물은 **전용 논의 노트**(`docs/discussions/DISCUSS_*.md`)다.

## Skill Boundary (MUST)

| 사용자 요청 | discuss | 대안 |
| :--- | :--- | :--- |
| 막연한 개선 방향·범위 합의 (무코드) | ✅ discuss | — |
| 방향·범위 확정 후 Task·Verify 분해 | — | [plan.md](../../workflows/plan.md) |
| feature 정밀 아키텍처 분석 | — | **`/assess` 별도** — discuss 메뉴에 **넣지 않음** |
| Task·구현 착수 | — | plan **이후** |
| 단순 코드 리뷰·한 줄 피드백 | — | [review](../review/SKILL.md) |

정석 흐름: `discuss`(방향 + 범위 합의) → `plan`(Task 분해).

## When to use / NOT

| Use | NOT |
| :--- | :--- |
| "프로젝트 어디를 개선할까" **막연한 방향** 논의 | Task·구현 착수 → `/plan` **이후** |
| 이미 있는 `PLAN_*.md`·설계 **맹점 심문** | feature 정밀 아키텍처 분석 → **`/assess` 별도** |
| 문제 프롬프트 → 방향+범위 **차근차근** 정리 | 단순 코드 리뷰·한 줄 피드백 |
| 코드 **안 건드리고** 대화·문서 폴리싱 / 여러 영역 우선순위 합의 | 방향·범위 이미 선명 → 바로 `/plan` |

**입력**: 사용자의 막연한 개선 의도(+선택: 관심 영역). **산출**: `docs/discussions/DISCUSS_<slug>.md`.

## Reference Read 게이트

| 시점 | Read |
| :--- | :--- |
| **매** `AskQuestion`/`question`(병용) 전 | [turn-decision-tree.md](references/turn-decision-tree.md) §턴 판별 · §도구 불가 fallback |
| **converge** 턴 | [close-handoff.md](references/close-handoff.md) §방향 수렴 + [ambiguity-zero-gate.md](references/ambiguity-zero-gate.md) |
| **close**·메뉴 A/B·plan 핸드오프 | [close-handoff.md](references/close-handoff.md) |
| Blueprint·«계획으로» 허용 판단 | [ambiguity-zero-gate.md](references/ambiguity-zero-gate.md) |
| 질문 문장·라벨 템플릿 | [plain-language-questions.md](references/plain-language-questions.md) |
| 조사 게이트·본 턴 예시 | [askquestion-two-turn-examples.md](references/askquestion-two-turn-examples.md) |

## 철칙 (우선순위 — Workflow 보다 위)

0. **Blueprint 조기 진입 금지 (Anti-rush)** — `discuss`의 기본 모드는 **선택지로 합의를 쌓는 것**이다. `converge`·`close`·same-session plan은 **사용자가 명시적으로 끝내거나** Ambiguity-Zero 7/7이 **노트 §3에 체크된 뒤**에만 허용. `[열림]` 0개·방향만 잡힌 턴에 **방향 확정 → 계획**을 `(권장)`로 두지 않는다 — 그때 `(권장)`은 **{새 심층 주제} 더 논의**. 채팅에 A/B/C 불릿만 쓰고 `AskQuestion`/`question`(병용)을 생략하는 것도 조기 종료와 동일하게 **금지**.
1. **무코드 (Meta-Only Boundary)** — `discuss` 진행 중 애플리케이션 소스(`.ts`, `.py`, `.tsx` 등)를 **절대 수정·패치하지 않는다**. 편집은 오직 `docs/discussions/DISCUSS_*.md` 노트 하나뿐.
2. **한 턴 = 한 결정** — 결정 트리 **분기 하나**만 전진. 갈래 2~4개면 **반드시 `AskQuestion`/`question` 도구를 직접 호출(병용)**(텍스트로 흉내 금지). 도구 불가 시 [turn-decision-tree.md §도구 불가 fallback](references/turn-decision-tree.md). 자유 서술이면 질문 **1문장**.
3. **권장 + 이유 필수** — 옵션마다 **기대 결과 1줄**, `(권장)` 태그는 **정말 하나만**(**2단계** 선정 — §1·[확정] 우선, 동률 시 4요소), 권장 아래 **이유 1줄(10단어 이내)**.
4. **비개발자 톤** — 사용자-facing 문장에 경로·API·Phase·린트 등 기술 용어 최소화 ([reporting.md](../../core/reporting.md) §1.6.0). 경로·`just plan-lint`는 **노트 갱신·핸드오프 때만**.
5. **짧게** — 채팅 본문 **18줄 이내**(Quick Pick·한 줄 메모 제외). mermaid·긴 표·로드맵·"다음에 물을 것" 목록 **금지**.
6. **표준 메뉴로 마무리** — 텍스트 `close`·산출물 요약·handed-off 재진입은 [close-handoff.md](references/close-handoff.md) §표준 메뉴 A/B. converge **「방향 확정 → 계획으로」** 선택 후 close는 **메뉴 A 생략** → same-session plan 직행 후 **메뉴 B**만. **assess 옵션 금지**. **메뉴 B「Task 1.1만」옵션 금지**. **「여기서 마무리」**는 메뉴 A/B에 항상 포함.
7. **엣지 케이스 선제 유도** — 사용자가 예외·엣지를 **요청하지 않아도**, `direction` 중 **2~3턴마다** 또는 happy path `[확정]` 직후 **AskQuestion 1턴**으로 빈 상태·저장 실패·권한·오프라인·데이터 없음 등을 묻는다. 질문 뱅크: [plain-language-questions.md](references/plain-language-questions.md) §엣지 케이스 선제. 답은 §3 **「엣지 케이스」** 불릿·§2 `[확정]`에 기록 → same-session plan 시 PLAN Edge Case Trace로 이관. **금지**: 사용자 미언급만으로 엣지 논의 생략.

## 선택지 표시 패턴 (MUST)

`AskQuestion`/`question`(병용)으로 선택지를 제시할 때:

```
1. [선택지 A] (권장)
   • 이유: [10단어 이내] — 가장 안전하고 프로젝트 표준과 일치
2. [선택지 B]
   • 이유: 특정 상황에서만 유리
3. [선택지 C]
   • 이유: 실험적이지만 리스크 있음
```

`(권장)` **2단계 선정** (MUST):

| 순위 | 기준 | 적용 |
| :---: | :--- | :--- |
| **1순위** | **§1 «이번 discuss에서 끝까지: …»** + 누적 **[확정]** 합의와 **aligned**된 선택지 | `scan`·`direction`·`converge` 본 분기 |
| **2순위** | 1순위 **동률**일 때만 — 안전·프로젝트 표준·복구 용이·유지보수 친화 **4요소** | 의도-aligned 후보끼리만 비교 |

**금지**: «더 빠름·쉬움·표준» **단독**으로 §1·[확정]과 **충돌**하는 `(권장)` 역전. 모든 선택지가 동등·미검증 접근·사용자 컨텍스트만으로 갈릴 때 `(권장)` 생략. 목표 — **권장만 눌러도 성공 확률 90%+**.

**§1 vs [확정] 충돌**: 노트 §1·누적 [확정]이 어긋나면 **AskQuestion(`question` 병용) 1턴**으로 따를 쪽 확인 후 `(권장)` 선정.

### 옵션 표시 순서 (AskQuestion UX) (MUST)

**2단계 `(권장)` 선정 직후**, `AskQuestion`/`question`(병용) `options[]` 순서를 **재정렬**한다 ([principles.md](../../core/principles.md) §1.1.1 · Cursor AskQuestion 도구 힌트와 정합).

| 슬롯 | 규칙 |
| :---: | :--- |
| **1번** | `(권장)` 옵션 **항상** — 라벨 끝 `(권장)` |
| **중간** | 나머지 비권장 옵션 — 의미상 우선순위 유지 가능 |
| **마지막** | **「여기서 마무리」**(또는 동등 세션 종료 옵션) **항상** |

- **적용 범위**: discuss **모든** `AskQuestion`/`question`(병용) — 조사 게이트·`scan`/`direction`·converge·엣지·메뉴 A/B.
- **plain-language 역할 vs 표시**: [plain-language-questions.md](references/plain-language-questions.md) 표의 「첫·두 번째·세 번째 **옵션**」은 **내용 역할**(예: converge «계획으로»)이지 고정 표시 슬롯이 **아님**. `(권장)`·마무리 규칙으로 **표시 순서**를 맞춘다.
- **메뉴 A 예** — §1·close에 계획 의도 **없을 때**: 표시 1=**이 주제 더 논의하기** `(권장)` · 2=Blueprint · 3=마무리 (Blueprint를 1번에 두지 **않음**).
- **금지**: `(권장)`을 2번째 이후 슬롯에 두기 · 마무리를 1·2번에 두기 · 채팅 A/B/C 순서와 카드 `options[]` 순서 **불일치**.

## AskQuestion/`question`(병용) 직전 맥락·조사 게이트 (MUST)

본 AskQuestion(`question` 병용)(방향·분기 선택)과 `(권장)` 선정 **직전**에 프로젝트 맥락을 읽는다. 조사 없이 업계·경쟁 관행을 근거로 쓰지 않는다.
또한 `/discuss` 입력 해석에서 **의도·범위·용어·완료기준 4축 중 하나라도 불명확하면 즉시 AskQuestion(`question` 병용)**으로 수렴한다(가정·추정으로 다음 분기 진행 금지).

**턴 판별·Typed Answer·스킵·도구 불가 fallback**: [turn-decision-tree.md](references/turn-decision-tree.md).

### 맥락 수집 (항상)

1. **`just route`** (주제가 넓으면 `just route-smart '<query>' <paths> --json`) — 관련 경로의 rules·must_read를 Read.
2. **이번 discuss 주제** — 사용자가 준 영역·경로, `DISCUSS_*.md` §1~3, scan 범위의 backlog·plans·spec **일부**.
3. **권장 선정** — §**선택지 표시 패턴** **2단계**(§1·[확정] → 동률 시 4요소). 업계·경쟁은 **조사 게이트 «예»**일 때만 [deep-research](../deep-research/SKILL.md) 요약을 보조 근거로 쓴다.

### `scan`·`direction` — 두 턴 흐름

| 턴 | 내부 | 행동 |
| :---: | :--- | :--- |
| **1** | `research-gate` | **`AskQuestion`/`question`(병용) 1개만**: «이 분기 전 **외부·업계 조사**가 필요한가요?» — 라벨 예는 [plain-language-questions.md](references/plain-language-questions.md) §외부 조사 게이트. **방향 후보·본 (권장) 없음.** |
| **2** | `scan` / `direction` | 게이트 «예» → deep-research **1회**(규제·거시·업계 벤치가 분기에 필요할 때) 후 요약 1~2줄. «아니오» → route+주제 맥락만. §턴 출력 형식대로 **본 AskQuestion(`question` 병용)** + `(권장)` 1개. |

### 조사 게이트 스킵 (MAY — 스코프 이미 좁힌 경우)

**턴1 `research-gate` 생략**하고 **턴2 본 AskQuestion**으로 바로 갈 수 있다 — 아래 **하나 이상**이면.

| 신호 | 예 |
| :--- | :--- |
| 구체 화면·기능 | «접수실 2열», «TodayPatientTable», «원장별 대기열» |
| 구체 파일·경로 | `{{FRONTEND_APP_PATH}}/src/features/reception/...` |
| 기존 DISCUSS·주제 | `DISCUSS_*.md` 경로 + 구체 불일치·범위 |
| 증상+영역 한 문장 | «2열이 1열이랑 안 맞아, 어디부터?» |

**스킵해도 MUST**: `just route` · 주제 맥락 Read · 턴2 본 AskQuestion + `(권장)` · §1 고정(턴2).

**스킵 금지**: 막연한 «전체 개선», «뭐부터 하지»만, 업계·규제 비교가 분기 핵심일 때.

- **`converge`·`close`·핸드오프** `AskQuestion`/`question`(병용)에는 게이트를 **쓰지 않는다**.
- 게이트 턴 채팅: 질문·옵션·권장 1줄만 — 스캔 장문·다음 분기 노출 금지.

## 턴 출력 형식 (MUST)

**2턴 조사 게이트·본 AskQuestion 복붙 예시**: [references/askquestion-two-turn-examples.md](references/askquestion-two-turn-examples.md).

**§1 인용 (MUST)** — `direction`·`converge` 본 분기 턴마다 채팅에 **한 줄** 고정:

```text
이번 discuss에서 끝까지: {DISCUSS §1 1문장 — scan 턴2에 paraphrase로 고정}
```

`scan` 턴2(본 AskQuestion(`question` 병용))에서 노트 §1에 위 템플릿을 **첫 메시지 paraphrase**로 작성·고정한다. 이후 매 턴 대조·인용. **multi-cycle** 새 주제마다 **새 DISCUSS + 새 §1** 리셋.

순서 고정. 아래 블록만. (Quick Pick 제외 본문 18줄 이내.)

```
{한 줄: 지금 무엇을 맞추는 중인지 — 업무 말}

{선택: 이번 턴에 확정한 한 문장. 없으면 생략}

{선택: A/B/C 각각 기대 결과 1줄 — 표 대신 불릿}

{권장: X — 이유 1줄}

카드로 고르거나, A/B/옵션 이름으로 답해 주셔도 됩니다.

AskQuestion(`question` 병용) 도구 호출  ← 갈래 2~4개면 필수. 자유 답이면 텍스트 질문 1문장. 호출 직후 DISCUSS `pending_ask` 갱신.
```

**첫 턴**: 「확정」생략. 스캔 요약 **2~3줄** + 곧바로 **방향 후보 질문 1개**.

#### GOOD (첫 턴·scan) — 복붙용

```text
접수·대기 화면은 요구는 있으나, 원무가 매일 쓰는 흐름은 아직 덜 맞춰진 상태로 보입니다.

이번 discuss에서 끝까지: 원무가 매일 쓰는 접수·대기 흐름을 먼저 맞춘다.

- A) 접수·대기부터 — staff가 매일 여는 화면, 손대기 쉬움
- B) 청구·수납 연동부터 — 나중 정산이 한 번에 맞춰짐
- C) 진료 화면만 — 범위는 좁지만 체감은 빠를 수 있음

권장: A — backlog와도 맞고, 일상 업무와 직결

AskQuestion(`question` 병용) (방향 후보 1개)
```

#### GOOD (direction 턴) — 복붙용

```text
이번 discuss에서 끝까지: 에이전트가 규칙을 지키는지부터 맞춘다.

이번에 확정: 우선순위 렌즈는 «에이전트가 규칙을 지키는지»

- A) 응답 형식만 통일 — 빠르고 눈에 띔
- B) 금지 문구까지 기계 검사 — 느리지만 확실
- C) 둘 다 이번에 — 범위가 커짐

권장: A — SKILL 예시만으로도 바로 효과

AskQuestion(`question` 병용) (다음 분기 1개)
```

#### BAD (한 줄) — 이렇게 쓰지 말 것

```text
「로드맵·스펙·plans를 훑어보니 reception phase2와 claim이 겹하고… (장문) … 어떻게 생각하세요?」
```

### 채팅 금지 (MUST NOT)

- 질문 2개 이상·「그리고」「또한」이은 follow-up
- 결정 트리 전체·내부 단계 번호 노출·긴 분석 나열
- mermaid·긴 표·여러 영역 동시 심문
- 옵션 없이 「어떻게 생각하세요?」만 던지기
- 「정리」「끝」**입력을 요구하는 문장만** 던지기 (수렴 `AskQuestion`/`question`(병용) 없이)
- 사용자 종료 신호 없이 Summarize·핸드오프 **실행**
- **명령형 다음 단계** — 「다음: `@DISCUSS_…` 붙이고 `/plan` 시작」등 **채팅·노트에 슬래시·@경로 지시만 던지기**
- **assess·분석 워크플로 옵션** — discuss `AskQuestion`/`question`(병용)에 `/assess`·「더 깊게 분석」 등 **넣지 않음**
- **이중 plan 안내 (동일 DISCUSS)** — **같은** `DISCUSS_*.md`가 이미 `handed-off`·`linked_plan`이면 그 노트에 대해 「`/plan` 다시」「Blueprint 작성」을 **재안내하지 않음**
- **AskQuestion/`question`(병용) 없이 close 종료** — [close-handoff.md](references/close-handoff.md) §종료·메뉴 A/B 준수

### 전송 전 자가검사 (MUST)

**의도 우선 5항** (direction·converge·close 본 분기 — 게이트·close 메뉴 제외):

- [ ] **§1 인용**: `direction`·`converge` 턴에 «이번 discuss에서 끝까지: …» **한 줄**을 썼는가?
- [ ] **(권장) 정합**: `(권장)`이 §1·누적 [확정]과 **aligned**인가? (2단계 1순위)
- [ ] **표시 순서**: `(권장)`이 **1번**, 마무리가 **마지막**인가? `options[]`·채팅 A/B/C **일치**?
- [ ] **Blueprint nudge 금지**: `scan`·`direction`·`converge`에서 Blueprint·메뉴 A·«계획으로» `(권장)`을 쓰지 않았는가?
- [ ] **4요소 역전 금지**: «더 빠름·쉬움»만으로 §1 의도와 **충돌**하는 `(권장)`을 붙이지 않았는가?
- [ ] **충돌 시 AskQuestion(`question` 병용)**: §1 vs [확정] 어긋남이 있으면 **1턴 확인** 후 선정했는가?

**확장 항목**: [turn-decision-tree.md §확장 자가검사](references/turn-decision-tree.md) — 5항 통과 후 확인. 하나라도 NO면 삭제 후 재작성.

## 세션 흐름 (내부 — 사용자에게 번호 노출 금지)

| 순서 | 내부 | 한 턴에 하는 일 |
| :---: | :--- | :--- |
| 1 | `scan` | **사용자가 준 영역에 한정한 심층 스캔** → 방향 후보 + 가장 먼저 정할 분기 1개 질문 |
| 2 | `direction` | 답 확정 1문장 + (선택) 그 방향의 trade-off 1~2문장 + **다음 분기** 질문 1개 |
| 3 | `polish` | 결정이 쌓일 때마다 `DISCUSS_*.md` 노트를 **점진 갱신** — §3·Ambiguity-Zero 일부 채워도 **`status: discussing` 유지** |
| 3.5 | `converge` | [close-handoff.md §방향 수렴](references/close-handoff.md) |
| 4 | `close` | [close-handoff.md §종료](references/close-handoff.md) |

### 1. scan (첫 턴)

- 사용자가 영역을 지정했으면 **그 영역에 한정**해 깊게 본다(소스·spec·backlog·plans·CONTEXT). 영역 미지정이면 `docs/agent-context/memory/PROJECT_REFACTORING_BACKLOG.md`·`docs/specs/`·`docs/plans/`·CONTEXT 등 앵커부터 보고 **범위를 좁히는 질문 1개**부터.
- **무한 확장 금지** — "심층이되 사용자가 준 영역에 한정". 새 영역으로 번지면 한 턴만 써서 범위를 다시 묻는다.
- **진입 순서**: §AskQuestion 직전 맥락·조사 게이트 — **턴1** `research-gate` → (선택) deep-research → **턴2** route 맥락 반영 후 스캔 요약 2~3줄 + 방향 후보 **본 AskQuestion(`question` 병용)**.

## 논의 노트 (`docs/discussions/DISCUSS_<slug>.md`)

**경량 4섹션 고정.** 결정이 쌓일 때마다 in-place 갱신(전체 재작성 금지, append/update 우선).

```markdown
---
status: discussing   # discussing | direction-set | handed-off
created: <YYYY-MM-DD>
scope: <대화 대상 영역>
linked_plan:          # handed-off 시 필수 — docs/plans/PLAN_<slug>.md
pending_ask:          # AskQuestion(`question` 병용) 직후만 — 확정·다음 분기 시 null
  turn: <scan|direction|converge|close-menu-a|close-menu-b|research-gate>
  prompt: "<질문 한 줄>"
  options:
    - id: a
      label: "<옵션 A 라벨>"
    - id: b
      label: "<옵션 B 라벨>"
---
<!-- Language: ko -->

# DISCUSS: <주제>

## 1. 현황 요약
- **이번 discuss에서 끝까지:** {scan 턴2 본 AskQuestion에서 사용자 첫 메시지 paraphrase — 1문장 고정}
- (스캔으로 파악한 사실·마찰·기회 — 불릿)

## 2. 진행 중 결정 (누적)
- [확정] <결정> — 근거 1줄
- [열림] <아직 안 정한 분기>

## 3. 합의된 방향 · 범위
- 방향: (사용자가 동의한 개선 방향)
- 이번에 하는 것 / 안 하는 것 / 완료 기준: (plan 직행 전 한 줄씩 — 미정이면 "미정")
- 엣지 케이스: (§엣지 케이스 선제 AskQuestion 답 — 인범위·범위 밖 각 1줄; 없으면 `엣지: 해당 없음 — {사유}` [확정])
- Ambiguity-Zero 체크: (상세 — [ambiguity-zero-gate.md](references/ambiguity-zero-gate.md))

## 4. 미해결 · 핸드오프
- 미해결 긴장: ...
- 핸드오프: pending — (사용자 `AskQuestion`/`question`(병용) 선택 전; plan | 더 논의 | 마무리)
```

**`pending_ask` 수명**: `AskQuestion`/`question`(병용) 호출 **직후** frontmatter에 기록(prompt·options·turn). 사용자 선택 확정(카드 또는 §Typed Answer) 시 **`pending_ask: null`**. multi-cycle 새 DISCUSS 생성 시 비움.

노트 §4에 **`/plan` 실행 지시·`@DISCUSS` 첨부·Task 분해 안내**를 쓰지 않는다 — [close-handoff.md](references/close-handoff.md)가 핸드오프 SSOT.

노트는 **방향과 범위**까지만 담는다. 구체 Task·Verify·인터페이스 코드는 **여기 쓰지 않는다**(plan으로 이관).

## Close · Handoff · Plan 연속

전문: [close-handoff.md](references/close-handoff.md) — converge · close · 메뉴 A/B · same-session plan · 산출물 요약 턴 · multi-cycle · handed-off 재진입.

Ambiguity-Zero: [ambiguity-zero-gate.md](references/ambiguity-zero-gate.md).

수명·보관: [close-handoff.md §수명·보관](references/close-handoff.md) · `just docs-discuss-lifecycle`.

## Principles

- 추천 없이 질문만 던지지 않는다 — **권장 1줄**은 매 턴.
- 답이 막연하면 **그 분기만** 한 번 더 좁힌다(새 분기 추가 금지).
- 소스 코드는 **절대** 건드리지 않는다 — 합의가 끝나면 핸드오프로만 구현 단계 진입.
- 노트는 **방향의 정본**이고, 회의록처럼 길게 쌓지 않는다(4섹션 cap).
