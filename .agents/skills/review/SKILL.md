---
name: review
description: >
  PR·브랜치·스테이징 변경분을 diff-first로 리뷰한다 — 정확성·회귀·권한·보안·부작용에 집중하고
  스타일 nitpick은 생략한다. 에이전트가 git diff·관련 테스트·just를 직접 실행해 근거를 확보한 뒤
  High/Medium/Low로 보고하고 close 턴에 AskQuestion으로 후속(plan/discuss/fix/마무리)을 수렴한다.
  Use for /review, 코드 리뷰, PR 검토, 변경분 점검, merge 전 검토, 회귀 리스크.
  테스트 실패 원인 조사는 investigate/diagnose. 테스트 파일 품질 분석은 test-analysis.
license: MIT
metadata:
  version: "1.1.0"
disable-model-invocation: true
---

<!-- Language: ko -->

# Review

**변경분 리뷰** — 에이전트가 **직접 diff·테스트·검증**한 뒤 근거 기반으로 보고한다.

**하지 않는 것**: 실패 테스트 **원인 추적** 루프, 테스트 파일 **품질 분석** 전체, 스타일 nitpick.

> **이웃 스킬**: PR·diff 리뷰 → **review** · 실패 원인 조사 → [investigate](../investigate/SKILL.md) · 수정+고정 → [diagnose](../diagnose/SKILL.md) · 테스트 품질 → [test-analysis](../test-analysis/SKILL.md)

---

# Response Language (MUST)

세션 채팅·리뷰 보고 **한국어**. 코드·로그·파일 경로는 영문 가능.

---

# Skill Boundary (MUST)

| 사용자 요청 | 이 스킬 | 대안 |
| :--- | :--- | :--- |
| PR·브랜치·스테이징 **변경분** 리뷰, merge 전 점검 | ✅ review | — |
| 테스트 **실패**·flaky·CI red 원인 찾기 | — | [investigate](../investigate/SKILL.md) → 필요 시 [diagnose](../diagnose/SKILL.md) |
| 특정 **테스트 파일** 품질·커버리지·assertion 구조 점검 | — | [test-analysis](../test-analysis/SKILL.md) |
| 변수명·포맷만 불만, 로직 변경 없음 | ✅ review — **로직·리스크만**, naming nitpick 생략 | — |
| 명세↔코드 drift·code lock | 보조 | [sync](../sync/SKILL.md) |

**오분기 시**: 리뷰를 시작하지 말고, 위 표의 대안 스킬을 **한 줄로 안내**하고 사용자 의도를 확인한다.

---

# Iron Law

1. **추측 금지** — "probably safe", "looks okay" 같은 표현 금지.
2. **diff-first** — 변경 범위 밖 파일은 리뷰하지 않는다.
3. **실행 후 보고** — 아래 §Agent-executable verification을 시도한 뒤 발견을 쓴다.
4. **close 수렴** — 리뷰 본문 후 **같은 턴** AskQuestion/`question`(병용) 필수 (Cursor).

---

# Agent-executable verification (MUST)

보고 전에 아래를 **직접** 수행한다. "로컬에서 확인해주세요"로 넘기지 않는다.

| 유형 | EMR 예시 |
| :--- | :--- |
| 변경 범위 | `git diff <base>...HEAD` 또는 `git diff` (스테이징·워킹트리) |
| 관련 테스트 | 변경 파일과 매칭되는 `vitest run <file>` — 실패 시 **증거로 기록**, 원인 추적은 investigate로 handoff |
| 레시피 | `just --list`로 존재 확인 후 `just lint-*`, `just test-*` 등 **변경과 연관된** 검증 |
| 코드 추적 | Read, `rg`로 호출 경로·권한 체크·null 경로 추적 |
| 구조 체크 | [code_quality_lifecycle.md](../../core/code_quality_lifecycle.md) §3 R-1~R-5 |

### 보고서에 넣을 섹션: **실행한 검증**

최소 1행 표. 예: `git diff`, `vitest run Foo.test.tsx` PASS/FAIL, `just plan-lint` 등.

### 사용자에게만 요청 (극히 좁게)

| 항목 | 전제 |
| :--- | :--- |
| 프로덕션 전용 런타임 로그 | 로컬·docker·hub로 **대체 불가** 입증 후 |
| 외부 배포 환경 재현 | 로컬 vitest·MSW로 **동일 시나리오 재현 불가** 후 |
| 의도적 동작 변경 여부 | diff·코드만으로 **제품 의도**를 알 수 없을 때 |

**금지**: diff도 안 읽고, 관련 테스트도 안 돌리고 "확인 불가"로 마무리.

---

# Core Rules

## Anti-pattern at write

**Symptom**: 리뷰가 추측 위주이거나 close 없이 멈춤.

**Cause**: evidence·실행 검증·AskQuestion 생략.

❌ WRONG: "probably safe", close 없이 "/plan 하세요"만 안내

✅ CORRECT: 실패 시나리오 + 코드 근거 + **실행한 검증** + close AskQuestion

Reference: [`docs/agent-context/ANTI_PATTERN_FORMAT.md`](../../../docs/agent-context/ANTI_PATTERN_FORMAT.md)

## Diff-first

```bash
git diff <base>...HEAD
```

- 변경점·깨질 수 있는 것·의도치 않은 부작용에 집중
- 변경 0건이어도 사용자가 지정한 파일은 **정적 리뷰** 가능 — "현재 상태 잠재 리스크"로 구분

## Evidence Required

모든 이슈에:

1. 왜 중요한지
2. 어떻게 실패하는지 (실행 경로·조건)
3. 코드/실행 근거 (파일·라인·테스트 결과)

## Focus Areas

우선순위: auth/permission · null/undefined · async · stale state · race · transaction · silent failure · hidden regression · input validation · API contract · prompt injection · missing error handling

**구조·결합**: [code_quality_lifecycle.md](../../core/code_quality_lifecycle.md) §3 R-1~R-5

## Ignore

포맷 · naming 취향 · lint 수준 · 주관적 스타일 — formatter/linter에 맡김.

---

# Review Process

1. **경계 확인** — §Skill Boundary. 오분기면 대안 안내 후 중단.
2. **Gather** — `git diff`, 변경 파일 Read.
3. **Run verification** — 관련 vitest/just (§Agent-executable).
4. **Trace** — 실행 경로·권한·엣지 케이스.
5. **Findings** — High / Medium / Low (아래 형식).
6. **Final check** — 추측 제거, actionable 확인.
7. **Close** — 본문 후 AskQuestion (§Close turn).

---

# Finding Format

### High Risk

- issue · impact · evidence · suggested fix

### Medium Risk

- issue · edge case · evidence

### Low Risk

의미 있을 때만.

---

# Fix-first Principle

명백하고 국소적·저위험이면 **직접 수정** 가능.

먼저 물어볼 것: 아키텍처·스키마·동작 변경·destructive 작업.

---

# Close turn (세션 종료)

리뷰 본문을 **한 턴에 제시**한 뒤, **같은 턴 마지막**에 `AskQuestion`/`question`(병용).

### Handoff (권장 수정·후속 1건 이상)

| 옵션 (비개발자 라벨) | 내부 |
| :--- | :--- |
| 권장 수정을 실행 계획(Blueprint)으로 정리하기 `(권장)` | same-session `/plan` |
| 리뷰·수정 범위 더 discuss하기 | `/discuss` |
| 지금 바로 소규모만 고치기 | Fix-first |
| 여기서 마무리 | 종료 |

복수 파일·동작 변경이면 Blueprint `(권장)`. 단일 1~2줄 버그면 「지금 바로 소규모만 고치기」 `(권장)` 가능.

### 실질 이슈 없음

| 옵션 | 내부 |
| :--- | :--- |
| 마무리 `(권장)` | 종료 |
| 다른 변경 범위 리뷰 | 새 diff로 `/review` |

### Fast-path

사용자가 이미 plan·Blueprint 연속을 선택했으면 handoff **생략** → [plan.md](../../workflows/plan.md).

### Same-session plan

plan 선택 시 같은 세션에서 `PLAN_*.md` + `just plan-lint` PASS. Task는 리뷰 High/Medium 근거.

### Cursor 강제

- close 턴은 **반드시** AskQuestion/`question` tool call.
- 텍스트만 "선택지를 골라주세요" 하고 종료 = 정책 위반.

### 금지

- `/plan` 명령만 남기고 선택 없이 종료
- 리뷰 본문 없이 handoff만
- literal `\n` in AskQuestion strings

---

# Final Rule

**diff 읽고, 테스트 돌리고, 근거로 리뷰하고, close에서 수렴한다.** 원인 추적은 investigate.
