<!-- Language: ko -->

# 턴 판별 결정 트리 · Typed Answer · 확장 자가검사

**SSOT**: discuss SKILL에서 분리. 매 `AskQuestion`/`question`(병용) 전·converge/close 직전에 Read.

**관련**: [ambiguity-zero-gate.md](ambiguity-zero-gate.md) · [close-handoff.md](close-handoff.md) · [plain-language-questions.md](plain-language-questions.md)

---

## 턴 판별 결정 트리 (매 AskQuestion/`question`(병용) 전 MUST)

**Blueprint `(권장)`·메뉴 A·「실행 계획으로 만들기」**는 **텍스트 `close` 턴**에서만. `direction`·`converge`·노트 §3 갱신만으로는 **close 아님**.

| 순서 | 질문 | YES → | NO → |
| :---: | :--- | :--- | :--- |
| 1a | **close** + 직전 converge **「방향 확정 → 계획으로」** 선택 | [close-handoff.md §종료](close-handoff.md) 1~2 → **§Same-session plan 직행** (메뉴 A·Blueprint **재질문 생략**) → 산출물 요약 **메뉴 B** | 1b |
| 1b | **close** + 「정리」「끝」「방향 정해졌다」**(converge «계획» **없음**) | **메뉴 A** (`linked_plan` 없을 때) | 2번 |
| 2 | **converge** 턴인가? — `[열림]` 0~1개·방향·범위가 한 덩어리로 보임 | **수렴 메뉴**. `(권장)` = **{심층 주제} 더 논의**. «계획으로»·Blueprint `(권장)` **금지** (7/7 YES여도) | 3번 |
| 3 | **scan / direction** | **Blueprint·메뉴 A·«계획으로» 전면 금지**. `status`는 **`discussing` 유지** | — |

**흔한 오판 (FAIL)**:

- §3·Ambiguity-Zero를 채웠다 → close로 착각 → 메뉴 A Blueprint `(권장)` ❌
- 「방향과 범위는 맞춰 두었습니다」문구만으로 close ❌ — **close 트리거(표 1a·1b) 없으면** `direction`/`converge` 계속
- converge **「방향 확정 → 계획으로」** 선택 후 **메뉴 A·Blueprint 재질문** ❌ — 이미 plan 의사가 확정됨
- 노트 `status: direction-set` 갱신 → **메뉴 A만** 띄우고 plan 미작성 ❌ — converge «계획» 경로면 **same-session plan**까지 이어야 함
- `linked_plan`·PLAN이 이미 있음 → 메뉴 A 재호출 ❌ — **메뉴 B**만

---

## 채팅 텍스트 답변 수용 (Typed Answer Equiv) (MUST)

Cursor에서 사용자가 **채팅으로 답을내면** 대기 중 `AskQuestion`/`question`(병용) 카드가 `Questions skipped by the user`로 닫힐 수 있다. **타이핑은 정상 입력 채널**이며, 카드 클릭과 동등하게 처리한다.

**직전 턴 `AskQuestion`/`question`(병용) 직후** 사용자 메시지가 오면, **다음 분기로 가기 전** `pending_ask`(§논의 노트)와 대조한다.

| 매핑 신뢰도 | 판정 | 행동 |
| :--- | :--- | :--- |
| **높음** | 옵션 `id`·라벨·A/B/C·1/2/3·close 트리거(정리·끝·방향 정해졌다)·`(권장)` 옵션과 의미 일치 | 확정 1문장 → §2 `[확정]`·노트 갱신 → `pending_ask` 비움 → **다음 분기** (동일 질문 재호출 **금지**) |
| **중간** | 의도는 보이나 옵션 2개 이상에 걸침 | **2지 확인** `AskQuestion`/`question`(병용) 1회만 — 「{해석}」으로 이해했습니다. 맞나요? (예 / 아니오, 다시) |
| **낮음** | `pending_ask`와 무관·빈 메시지·새 주제만 | §**AskQuestion(`question` 병용) 스킵 시** 표로 폴백 |

**매핑 규칙** (높음 판정 예):

- `A` `B` `C` 또는 `1` `2` `3` (대소문자 무관)
- 옵션 **라벨** 전체 또는 핵심 구절 일치 (예: «접수·대기부터», «계획으로», «마무리»)
- 수렴·메뉴 A/B 표준 라벨과 일치 ([plain-language-questions.md](plain-language-questions.md))
- 자유 서술 1문장이 **단일 옵션** 의미와 명확히 같을 때

**금지**: 매핑 **실패**인데 route·스캔만으로 다음 분기 추진. 매핑 **성공**인데 «스킵»을 이유로 동일 질문 재호출.

### AskQuestion/`question`(병용) 스킵 시 (MUST)

도구 결과가 `Questions skipped by the user`이면 **호출 실패가 아니라 UI 스킵 이벤트**로 본다. **먼저** §**채팅 텍스트 답변 수용**으로 사용자 메시지 매핑을 시도한다. 주제별 `DISCUSS_*.md`가 아니라 **discuss SKILL**이 SSOT다.

| 조건 | 행동 |
| :--- | :--- |
| 스킵 + 사용자 메시지가 `pending_ask` 옵션에 **높음** 매핑 | §Typed Answer — 확정 후 다음 분기 |
| 스킵 + **중간** 매핑 | 2지 확인 `AskQuestion`/`question`(병용) 1회 |
| 스킵 + 매핑 **낮음** | 채팅 한 줄: «카드로 고르거나 **A/B/옵션 이름**으로 답해 주셔도 됩니다» → **동일 질문** `AskQuestion`/`question`(병용) 1회 재시도 (채팅 A/B/C만으로 대체 **금지**) |
| 재시도도 스킵 + 여전히 낮음 | 입력 방식 안내 후 사용자 답 대기 (연속 `AskQuestion`/`question`(병용) **금지**) |

- **한 턴 질문 1개** — 연속 `AskQuestion`/`question`(병용)으로 UI 충돌 가능성을 줄인다.

---

## AskQuestion 도구 불가 시 (Runtime Fallback) (MUST)

`AskQuestion`·`question` 도구가 **런타임에 없거나** 호출이 불가할 때(서브에이전트·일부 자동화 세션 등). **채팅 A/B/C 불릿만으로 끝내는 것은 여전히 FAIL** — 아래 **fallback 3종을 모두** 수행한다.

| 순서 | 필수 | 내용 |
| :---: | :---: | :--- |
| 1 | **도구 시도** | 노출된 이름 순으로 `AskQuestion` → `question` → `AskQuestion` 병용 지시가 있으면 **1회 호출 시도**. 실패·미노출이면 2번으로. |
| 2 | **`pending_ask` SSOT** | `DISCUSS_*.md` frontmatter에 **도구 호출 직후와 동일한** `pending_ask` 기록 — `turn`·`prompt`·`options[]`(각 `id`·`label` 필수). **채팅만 있고 pending_ask 없음 = FAIL.** |
| 3 | **채팅 최소 형식** | SKILL §턴 출력 형식 유지 — 옵션 라벨·`(권장)` 1개·이유 1줄·「카드로 고르거나, A/B/옵션 이름으로 답해 주셔도 됩니다」. Typed Answer(§위)는 **동일**하게 적용. |

**금지**:

- «도구가 없어서» 텍스트 선택지만 제시하고 `pending_ask` 생략
- fallback인데 옵션 `id`·`label`을 pending_ask에 남기지 않음 → 다음 턴 텍스트 답 매핑 불가
- fallback을 이유로 18줄·조기 Blueprint·메뉴 규칙 완화

**판정**: fallback 턴도 §**확장 자가검사**에서 «AskQuestion 호출 **또는** fallback 3종 충족」으로 PASS.

---

## 확장 자가검사 (전송 전 — SKILL §의도 우선 5항 **이후**)

SKILL 본문의 **의도 우선 5항**을 통과한 뒤, 아래도 확인한다. 하나라도 NO면 삭제 후 재작성.

- [ ] **AskQuestion/`question` 호출 또는 §도구 불가 fallback** — 도구 호출했거나 `pending_ask`(turn·prompt·options id/label) + 채팅 옵션·권장·입력 안내를 **모두** 충족했는가? (채팅 불릿만 = FAIL)
- [ ] **`(권장)` 표시 순서** — `(권장)`이 **1번**, 마무리가 **마지막**인가? `options[]`·채팅 A/B/C·`pending_ask.options` **일치**? ([SKILL.md](../SKILL.md) §옵션 표시 순서)
- [ ] `AskQuestion`/`question`(병용) 호출 직후 DISCUSS **`pending_ask`** 를 갱신했는가? (다음 턴 텍스트 답 매핑 SSOT)
- [ ] 직전 턴 스킵·텍스트 답이 있었는가? → §**Typed Answer** 매핑 후 재질문 없이 진행했는가?
- [ ] `scan`·`direction` **첫 본 분기 전** 조사 게이트 턴을 거쳤거나 **§조사 게이트 스킵** 조건(구체 화면·경로·DISCUSS·증상+영역)에 해당하는가? (게이트+본 질문을 한 메시지에 합치지 않았는가?)
- [ ] §**턴 판별 결정 트리** 1번(close 트리거) 없이 Blueprint·메뉴 A·«계획으로» `(권장)`을 쓰지 않았는가?
- [ ] `converge`인가? → **방향 확정 → 계획**이 `(권장)`이 **아닌가**? (7/7 YES·사용자 종료 신호 전이면 `(권장)`은 **심층 논의 계속**)
- [ ] `scan`/`direction`인가? → `status`를 **`discussing` 유지**했는가? (`direction-set`은 close에서만)
- [ ] 이번 턴 **질문이 정확히 1개**인가?
- [ ] **다른 분기**를 미리 노출하지 않았는가?
- [ ] 본문 **18줄** 이내인가?
- [ ] 소스 코드를 건드리지 않았는가? (노트만)
- [ ] converge «계획» `close`인가? → **메뉴 A·Blueprint 재질문 없이** same-session plan 후 **메뉴 B**만 썼는가?
- [ ] 텍스트 `close`·산출물·handed-off 재진입인가? → §**표준 메뉴** A/B·**마무리**·assess 없음? (텍스트 close에 메뉴 A 없이 PLAN = FAIL)
- [ ] PLAN·plan-lint PASS **직후**(같은 DISCUSS)인가? → **그 PLAN**에 대해 `/plan` 재안내 금지. AskQuestion(`question` 병용)에 **PLAN 전체 순차 실행**·**새 주제 discuss**·마무리 중 하나는 포함했는가? (**Task 1.1만** 옵션 **금지**)
- [ ] **새 discuss 사이클** 시작인가? → 이전 `handed-off` DISCUSS를 재편집·재-plan하지 않고 **새** `DISCUSS_<slug>.md`로 scan부터 진행하는가?
