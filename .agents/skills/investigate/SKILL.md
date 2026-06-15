---
name: investigate
description: >
  경량 버그·실패 조사 — 로그·스택·diff·테스트·just·DB·hub 로그를 에이전트가 직접 실행·조회해
  가설과 범위를 좁힌다. CLI 한계(vitest --repeat 등)는 bash 루프 등 대안을 제안·실행한다.
  코드 수정·회귀 테스트 작성·피드백 루프 구축은 하지 않는다.
  Use for /investigate, 원인 파악, 로그 분석, CI flaky, MSW warn, hub/DB 증거 확인.
  수정·하드 버그 고정은 diagnose. PR 리뷰는 review, 테스트 품질은 test-analysis.
license: MIT
metadata:
  version: "1.3.0"
disable-model-invocation: true
---

<!-- Language: ko -->

# Investigate

**경량 조사** — 에이전트가 **직접 돌리고·읽고·조회**한 결과까지 보고한다.

**하지 않는 것**: 소스 패치, 회귀 테스트 **작성**, diagnose식 실패 **고정** 루프.

> **이웃 스킬**: 범위 좁히기+실행 검증 → **investigate** · 수정+고정 루프 → [diagnose](../diagnose/SKILL.md) · PR 리뷰 → [review](../review/SKILL.md)

---

# Response Language (MUST)

세션 채팅·보고 **한국어**. 코드·로그·CLI는 영문 가능.

---

# Iron Law

**코드 수정 금지.** **읽기·실행·조회는 기본 의무.**

---

# Agent-executable verification (MUST)

보고 전에 아래를 **직접** 수행한다. 사용자에게 "해보세요"로 넘기지 않는다.

| 유형 | EMR 예시 |
| :--- | :--- |
| 테스트 반복 | `vitest run <file>` — `--repeat` 없으면 **bash 루프** (아래 §CLI 우회) |
| MSW·warn | vitest 출력 전체 캡처 후 `rg -i 'msw|unhandled request|warn'` — **에이전트가 확인** |
| hub 로그 | `just error-logs`, `just api-response-errors`, `var/log/emr/hub/*.jsonl` **전행 Read/집계** |
| DB 조회 | Docker postgres 기동 시 `psql`/`just postgres-setup` 후 **로컬 emr DB** 쿼리 시도 |
| 코드·diff | `git diff`, `rg`, Read |

### CLI 우회 + 사용자 소통 (MUST)

도구가 옵션을 지원하지 않을 때:

1. **대안을 채팅에서 한 줄로 제시** — 예: "vitest 4.x는 `--repeat`가 없어서 bash로 30회 돌릴 수 있습니다. **지금 진행할까요?**"
2. **짧은 검증(≤30회)** — AskQuestion 없이 **바로 실행** 후 결과 보고.
3. **긴 검증(50회+)** — AskQuestion(`question` 병용)으로 동의 후 실행.
4. 보고서에 "사용자가 CI에서 warn 확인" 같은 문구 **금지** — 로컬 vitest 출력에서 warn을 **직접** 찾거나 "로컬 0건, CI 캡처 없음"으로 명시.

### 사용자에게만 요청 (극히 좁게)

아래 **전부 시도 후**에도 데이터가 없을 때만:

| 항목 | 전제 |
| :--- | :--- |
| 원격 **프로덕션** 전용 로그 | repo·`var/log`·`just error-logs`·docker 로컬에 **동일 fingerprint 없음** |
| 비식별화 전 PII | 쿼리 결과 마스킹 불가한 raw 환자 데이터 |
| VPN/자격 없는 외부 배포 | 로컬 재현·docker·hub로 **대체 불가** 입증 후 |

**금지 표현**: "에이전트 확인 불가"를 hub jsonl 전체 Read·로컬 psql·fingerprint JSON 조회에 쓰지 않는다.  
**가능한데 안 한 것**이면 실패다 — `just --list`로 레시피 확인 후 시도.

### DB·hub 체크리스트 (prod 500 등)

보고서에 "prod DB 필요" 쓰기 **전에**:

- [ ] `var/log/emr/hub/events.jsonl` 해당 fingerprint **전체 JSON** Read
- [ ] `just error-logs --fingerprint <id> --json`
- [ ] docker postgres: `pg_isready` → `psql`로 가설 쿼리 (예: `created_at IS NULL` count)
- [ ] 실패 시: **무엇을 시도했고** 왜 안 됐는지 (docker 미기동·테이블 없음 등)

---

# Investigation Workflow

## Step 1 — Gather signals

## Step 2 — Isolate

## Step 2.5 — Run verification (MUST)

최소 1개 실행. flaky면 bash 반복 + **MSW warn grep**. prod 로그면 hub·just·DB 체크리스트.

## Step 3 — Trace

[references/domain-signals.md](references/domain-signals.md) — 해당 시만.

## Step 4 — Hypothesise

실행 결과 반영, 3~5개 순위.

## Step 5 — Decide next step

| 결과 | 다음 |
| :--- | :--- |
| 충분 | 보고서 마무리 |
| 수정·회귀 테스트 작성 | `/diagnose` |
| 위 체크리스트 **전부** 실패 | **시도 로그** + 사용자에게 **남은 1~2항목만** 요청 |

---

# Investigation Output Format

## 증상 · 수집한 신호 · 실행한 검증 · 가설 · 좁혀진 범위 · 다음 단계

**실행한 검증** 표 필수. **시도했으나 실패한 조회**(docker down 등)도 한 줄 기록.

**다음 단계**에 "사용자가 확인" 나열 금지 — 에이전트 미시도 항목이 있으면 먼저 시도.

---

# Final Rule

**돌려 보고, 읽고, 쿼리하고, 보고한다.** 수정만 diagnose.
