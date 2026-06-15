---
name: diagnose
description: >
  하드 버그 고정 — Phase 1 피드백 루프(실패 테스트·vitest·just·hub 로그)를 에이전트가 직접
  구축·실행한 뒤 6단계(reproduce → hypothesise → instrument → fix + regression test → cleanup).
  수정·회귀 테스트 작성·루프 없이 Phase 2+ 진행 금지.
  Use for /diagnose, 버그 수정, flaky 고정, 성능 회귀, 재현 루프 구축, 테스트 실패 해결.
  조사만·원인 파악만은 investigate. PR·diff 리뷰는 review. 테스트 파일 품질은 test-analysis.
license: MIT
metadata:
  version: "1.1.1"
disable-model-invocation: true
---

<!-- Language: ko -->

# Diagnose

**하드 버그 고정** — 에이전트가 **직접 루프를 만들고·돌리고·수정·회귀 테스트**까지 마친다.

**하지 않는 것**: 조사만(report-only), PR diff 리뷰, 테스트 파일 품질 분석 전체.

> **이웃 스킬**: 범위 좁히기+실행 검증(수정 없음) → [investigate](../investigate/SKILL.md) · 수정+고정 루프 → **diagnose** · PR 리뷰 → [review](../review/SKILL.md) · 테스트 품질 → [test-analysis](../test-analysis/SKILL.md)

코드베이스 탐색 시 도메인 용어·ADR(`docs/specs/`, `docs/plans/adr/`)을 참고한다.

---

# Response Language (MUST)

세션 채팅·Phase 보고 **한국어**. 코드·로그·CLI·`[DEBUG-...]` 태그는 영문 가능. **영문-only 단락·결론 금지.**

정책 SSOT: [markdown.md](../../domains/documentation/markdown.md) Korean First Policy, [reporting.md](../../core/reporting.md) §1.6

---

# Skill Boundary (MUST)

| 사용자 요청 | 이 스킬 | 대안 |
| :--- | :--- | :--- |
| 버그 **수정**, flaky **고정**, 회귀 테스트 **작성** | ✅ diagnose | — |
| 실패 **원인만** 파악·로그 분석·범위 좁히기(패치 없음) | — | [investigate](../investigate/SKILL.md) |
| investigate 후 "이제 고쳐줘" | ✅ diagnose | investigate 결과를 Phase 1~2 입력으로 이어받음 |
| PR·브랜치 **변경분** merge 전 점검 | — | [review](../review/SKILL.md) |
| 특정 **테스트 파일** 품질·assertion 구조 점검 | — | [test-analysis](../test-analysis/SKILL.md) |
| 루프 없이 "아마 이거" 추측 패치 | — | Phase 1 먼저 — 아래 Iron Law |

**오분기 시**: 수정에 착수하지 말고, 위 표의 대안 스킬을 **한 줄로 안내**하고 사용자 의도를 확인한다.

### investigate ↔ diagnose 양방향 handoff

| 출발 | 조건 | 다음 |
| :--- | :--- | :--- |
| investigate | 가설·범위 확정, **수정·회귀 테스트** 필요 | `/diagnose` — 수집 신호·실행 검증 표를 Phase 1~2에 재사용 |
| diagnose | 루프 구축 전, 원인·범위 불명 | `/investigate` — 패치 없이 신호·hub·DB·diff로 좁힌 뒤 복귀 |
| diagnose | 루프는 있으나 **seam 없어** 회귀 테스트 불가 | Phase 5에 기록 → Phase 6에서 [improve-codebase-architecture](../improve-codebase-architecture/SKILL.md) handoff |
| diagnose | 사용자가 **조사만** 요청 (수정 금지) | **investigate SKILL Read 후 그 워크플로 전체 실행** — diagnose Phase 5 진입 금지 (아래 §Investigate 모드) |

### Investigate 모드 (diagnose 트리거였으나 수정 금지)

`/diagnose`로 들어왔어도 사용자가 **「원인만」「수정하지 마」**면:

1. [investigate/SKILL.md](../investigate/SKILL.md)를 **Read**한다.
2. investigate **Iron Law·Agent-executable·Step 1~5·Output Format**을 그대로 따른다.
3. diagnose Phase 5(수정)는 **진입하지 않는다**.
4. 보고서 **다음 단계**에 "고정 원하면 `/diagnose`" 한 줄 + **AskQuestion** close (§Close turn).

"investigate handoff"를 **한 줄만 쓰고 끝내는 것은 불충분** — investigate 본문을 실행해야 한다.

---

# Iron Law

1. **Phase 1이 이 스킬의 핵심** — pass/fail 신호(루프) 없이 Phase 2+ 진행 **금지**.
2. **실행 후 보고** — 루프·테스트·just·hub 로그는 에이전트가 **직접** 돌린 뒤 보고한다.
3. **추측 패치 금지** — 계측·반증 전에 소스 수정하지 않는다(Phase 5만 수정).
4. **회귀 테스트** — correct seam이 있으면 fix **전에** failing test를 만든다.

---

# Agent-executable verification (MUST)

보고 전에 아래를 **직접** 수행한다. "로컬에서 확인해주세요"로 넘기지 않는다.

| 유형 | EMR 예시 |
| :--- | :--- |
| Phase 1 루프 | `vitest run <file>`, bash 반복(flaky), curl/CLI fixture, Playwright 스크립트 |
| 테스트 반복 | vitest `--repeat` 없으면 **bash 루프** — investigate §CLI 우회와 동일 |
| hub·API | `just api-response-errors`, `just raw-logs`, `var/log/emr/hub/*.jsonl` **Read/집계** |
| DB | docker postgres 기동 시 `psql`/`just postgres-setup` 후 가설 쿼리 |
| 코드·diff | `git diff`, `rg`, Read — bisect·differential loop에 활용 |
| 레시피 | `just --list` 확인 후 `just error-logs`, `just renderer-route-smoke` 등 |

### CLI 우회 + 사용자 소통

investigate와 동일:

1. 대안을 **한 줄로 제시** — 예: "bash로 30회 돌릴 수 있습니다. **지금 진행할까요?**"
2. **짧은 검증(≤30회)** — AskQuestion 없이 **바로 실행** 후 결과 보고.
3. **긴 검증(50회+)** — AskQuestion(`question` 병용)으로 동의 후 실행.

### 사용자에게만 요청 (극히 좁게)

아래 **전부 시도 후**에도 데이터가 없을 때만:

| 항목 | 전제 |
| :--- | :--- |
| 원격 **프로덕션** 전용 재현 | repo·docker·hub·로컬 vitest로 **대체 불가** 입증 후 |
| 비식별화 전 PII raw | 쿼리 결과 마스킹 불가 |
| VPN/자격 없는 외부 배포 | 로컬·docker·hub로 **대체 불가** 후 |
| HITL 클릭만 가능한 UI | Phase 1 항목 10 — **구조화된 체크리스트**로 루프 유지 |

**금지**: hub jsonl 전체 Read·로컬 psql·fingerprint 조회 **미시도** 상태에서 "에이전트 확인 불가".

### 보고서 필수: **피드백 루프 · 실행한 검증**

Phase 1~2 보고에 루프 정의 + **실행 결과**(PASS/FAIL/flake rate) 표를 포함한다.

---

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. Fast, deterministic, agent-runnable pass/fail signal이 있으면 원인은 bisection·가설·계측으로 좁혀진다. 없으면 코드만 봐서는 안 된다.

**Be aggressive. Be creative. Refuse to give up** — 단, 위 §Agent-executable로 **직접 실행**한다.

### Ways to construct one — try in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with fixture input, diff stdout against known-good snapshot.
4. **Headless browser** (Playwright) — DOM/console/network assert.
5. **Replay captured trace** — network request / payload / event log on disk.
6. **Throwaway harness** — minimal subset, mocked deps, single call path.
7. **Property / fuzz loop** — 1000 random inputs for "sometimes wrong".
8. **Bisection harness** — `git bisect run` automation.
9. **Differential loop** — old vs new version or two configs, diff outputs.
10. **HITL bash script** — last resort; structured checklist so output still feeds back.

Build the right loop → bug is 90% fixed.

### Iterate on the loop itself

- Faster? (cache setup, narrow scope)
- Sharper signal? (assert specific symptom, not "didn't crash")
- More deterministic? (pin time, seed RNG, isolate FS/network)

A 2-second deterministic loop beats a 30-second flaky one.

### Non-deterministic bugs

목표는 clean repro가 아니라 **재현률 상승**. 100× loop, parallelise, stress, sleeps. 50% flake는 디버깅 가능; 1%는 rate를 올릴 때까지.

### When you genuinely cannot build a loop

**명시적으로 중단** — 시도 목록 + 사용자에게 (a) 재현 환경 접근 (b) 캡처 아티팩트(HAR, log dump) (c) 임시 prod 계측 허가 중 **1~2항만** 요청.

### When the loop runs but does not reproduce (0% flake locally)

**「미재현」으로 끝내지 않는다** — 사용자가 간헐 실패를 보고했으면, 패치 보류와 **원인 추적 강화**를 병행한다.

#### Escalation ladder (순서대로 시도·보고)

1. **루프 강화** — 30~100× bash vitest, `--pool=forks`/`--no-file-parallelism` 등 vitest 옵션 변경, MSW warn grep 매 회
2. **코드·환경 diff** — 테스트·handler·setup Read, `git log -10 -- <test>`, 최근 MSW/route 변경 diff
3. **CI 증거** — `gh run list` / `gh run view` / Actions 로그에서 동일 테스트 failure·MSW warn fingerprint (네트워크·`gh` 가능 시)
4. **정적 가설 검증** — handler URL 누락·race·타이머·`vi.useFakeTimers` 등 코드 리뷰로 **반증 가능** probe (패치 없이 Read/rg)
5. **investigate 모드** — 위로도 원인 좁히기 부족하면 §Investigate 모드로 전환, **수집한 신호·실행 검증 표**를 보고서에 포함

#### 패치 보류 조건 (여전히 유효)

- 로컬 루프 **0/N FAIL** + CI fingerprint **없음** → **추측 MSW/handler 패치 금지**
- 대신 escalation 시도 **목록·결과**를 「실행한 검증」 표에 남긴다

#### Close (미재현·원인 미확정)

AskQuestion으로 **구체적 다음 증거**를 요청한다 — 막연한 "CI 확인해주세요" 금지:

| 옵션 (비개발자 라벨) | 내부 |
| :--- | :--- |
| CI 실패 로그 URL/스크린 붙여주시면 이어서 조사 `(권장)` | investigate 재개 |
| bash 100회 더 돌려 flake rate 측정 | escalation 1 |
| 지금은 여기서 마무리 (시도 로그만) | 종료 |

**Do not proceed to Phase 5 fix** until reproduced **or** CI/static evidence identifies a falsifiable root cause.

---

## Phase 2 — Reproduce

Run the loop. Confirm:

- [ ] User-described failure mode — not a nearby different failure
- [ ] Reproducible across runs (or **escalation ladder** exhausted with documented flake rate)
- [ ] Exact symptom captured for later fix verification

**로컬 0% flake:** §Escalation ladder 결과로 대체 — "재현됨" 또는 "N회 0 FAIL + CI/정적 가설 기록" 중 하나 필수.

Do not proceed to **Phase 5 fix** until reproduced or CI/static evidence supports a specific fix.

---

## Phase 3 — Hypothesise

**3–5 ranked hypotheses** before testing any. Each must be **falsifiable**:

> "If \<X\> is the cause, then \<changing Y\> will make the bug disappear / \<changing Z\> will make it worse."

Optional checkpoint: ranked list를 사용자에게 보여 re-rank 요청 — **블로킹하지 않음**, AFK면 순위대로 진행.

---

## Phase 4 — Instrument

Each probe maps to one Phase 3 prediction. **One variable at a time.**

1. Debugger / REPL if available
2. Targeted logs at hypothesis boundaries
3. Never "log everything and grep"

**Tag logs** `[DEBUG-a4f2]` — cleanup은 grep 한 번.

**Perf branch:** baseline measure first, then bisect — logs are usually wrong.

**{{PROJECT_NAME}} — hub raw JSONL (format mismatch):** 타입 캐스트·방어적 `get()` **전에** raw body:

1. `just api-response-errors` → `var/log/emr/hub/api_response_errors.jsonl`
2. `just raw-logs` → `api_log.jsonl`, `tool_log.jsonl`

SSOT: [diagnose.md](../../workflows/diagnose.md) {{PROJECT_NAME}} 부록 · [execution.md](../../core/execution.md) §3.5

---

## Phase 5 — Fix + regression test

Regression test **before fix** — only if **correct seam** exists (real bug pattern at call site).

No correct seam → **that is the finding**; note for Phase 6 / architecture handoff.

If seam exists:

1. Minimised repro → failing test at seam
2. Watch fail → apply fix → watch pass
3. Re-run Phase 1 loop on original (un-minimised) scenario

---

## Phase 6 — Cleanup + post-mortem

Required before done:

- [ ] Original repro no longer reproduces (Phase 1 loop re-run)
- [ ] Regression test passes (or seam absence documented)
- [ ] All `[DEBUG-...]` removed (`grep` prefix)
- [ ] Throwaway prototypes deleted or marked debug-only
- [ ] Correct hypothesis in commit/PR message
- [ ] Material Impact debugging → `/ai-log` Golden Log ([cognitive_logging.md](../../adaptive/cognitive_logging.md))

**Then:** what would have prevented this? Architecture/seam issues → [improve-codebase-architecture](../improve-codebase-architecture/SKILL.md) **after** fix.

### Agent tool mistake → error_patterns (MUST)

Root cause가 **에이전트 도구/편집 실수**일 때 — 앱 로직이 아닐 때 — done 전:

- bump 전 [error_patterns.md](../../core/error_patterns.md) «메타 금지 7» Read
- [ ] `just error-pattern-add "<name>" "<symptom>" "<cause>" "<fix>"` — 동일 name이면 bump
- [ ] editor mistake prose는 error_patterns SSOT; RES/knowledge-asset에 중복 금지

판단: edit-tool chain, gate skip, repeat pattern — [runtime_edit_tools.md](../../core/runtime_edit_tools.md), error_patterns §1–§4.

Runtime symptoms → [RES_COMMON_ERROR_RESOLUTIONS.md](../../../docs/knowledge/RES_COMMON_ERROR_RESOLUTIONS.md); product knowledge → [knowledge-asset](../knowledge-asset/SKILL.md).

### Phase 6.5 — Spec sync

Fix touched routes, `next.config`, `proxy.ts`, auth/middleware, or Plan Conclusion:

- [ ] [sync](../sync/SKILL.md): Claim Inventory → `just sync --check` → Phase 2 → PASS
- [ ] Renderer up: `just renderer-route-smoke`
- [ ] Stale Plan Conclusions before knowledge-asset

### 미해결 인프라·후속 작업 (MUST)

수정 과정에서 **Justfile recipe 누락**(`just raw-logs` 등)·스크립트는 있는데 wiring 없음·spec sync 미완 등 **남은 항목**이 있으면, 종료 전 **AskQuestion** (`question` 병용):

| 옵션 (비개발자 라벨) | 설명 |
| :--- | :--- |
| `<recipe>` Justfile에 추가하기 `(권장)` | 왜 필요한지 한 줄(예: "다음 hub 디버그 때 raw jsonl tail 일관") |
| Blueprint/plan으로만 남기기 | 범위가 클 때 |
| 이번 세션에서는 생략 | 사용자 명시적 선택 |

**금지**: "미해결: recipe 추가 필요"만 적고 **묻지 않고** 종료.

---

# Close turn (세션 종료)

수정 완료·미재현 마무리·investigate 모드 종료 시, 보고 본문 **같은 턴 마지막**에 AskQuestion/`question`.

### Fix 완료

| 옵션 | 내부 |
| :--- | :--- |
| 마무리 `(권장)` | 종료 |
| spec sync / knowledge-asset 이어하기 | sync · knowledge-asset |
| 관련 테스트 품질 점검 | test-analysis |

### 미재현·원인 미확정

§Escalation ladder Close 표 사용.

### Cursor 강제

close 턴은 **반드시** AskQuestion tool call — 텍스트만 "골라주세요" 금지.

---

# Diagnose Output Format

Phase 진행·완료 시 필요한 섹션만, **항상 한국어**.

## 증상 (Symptom)

## 피드백 루프 (Feedback Loop)

pass/fail 신호 정의 + **실행 결과**

## 실행한 검증

표 필수 — vitest/just/hub/DB/bash loop 등

## 가설 (Hypotheses)

순위 + 반증 가능 예측

## 근본 원인 (Root Cause)

## 수정 (Fix)

최소 수정 + 회귀 테스트 여부

## 사후 분석 (Post-mortem)

---

# Final Rule

**루프 만들고, 직접 돌리고, 계측하고, 고치고, 회귀 테스트하고, 한국어로 마무리한다.** 조사만은 investigate.
