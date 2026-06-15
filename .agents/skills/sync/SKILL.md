---
name: sync
description: >
  Unified Sync Gate — code lock hash verification plus spec alignment (spec-sync /
  code-sync). Agent-driven Phase 2 updates spec body to match implementation; session
  end runs sync --check then sync-turn-end (lint-turn-end chained; AskQuestion forbidden). Use for /sync,
  /spec-sync, spec drift, required drift, code-sync-lock violation, Last Verified,
  세션 종료 정합, just sync --check FAIL, 스펙 역검증, Blueprint 종료 spec 갱신.
  Not for Linear sync (linear-sync), git push, or PR code review (review skill).
license: MIT
metadata:
  version: "1.3.0"
disable-model-invocation: true
---

<!-- Language: ko -->

# Unified Sync (Code Lock & Spec Drift Gate)

코드 무결성 락(`code-sync`)과 스펙 정합(`spec-sync`)을 **한 워크플로·한 CLI**로 묶습니다.
스펙 본문 갱신은 [sync 워크플로 Phase 2](../../workflows/sync.md)에 따라 **에이전트가 자동**으로 수행합니다.

> **이웃 스킬**: PR·diff 리뷰 → [review](../review/SKILL.md) · Blueprint Task → [plan](../plan/SKILL.md) · 하드 버그 → [diagnose](../diagnose/SKILL.md) · 지식 자산 → [knowledge-asset](../knowledge-asset/SKILL.md)

---

# Skill Boundary (MUST)

| 사용자 요청 | 이 스킬 | 대안 |
| :--- | :--- | :--- |
| `/sync` · `/spec-sync` · spec drift · code lock 위반 | ✅ sync | — |
| 세션 종료 · `just sync --check` · Unified Sync PASS | ✅ sync | [reporting §1.5](../../core/reporting.md) |
| `@code-sync-lock` 생성·해시 갱신 | ✅ sync §1 | — |
| PR·브랜치 **변경분** 리뷰 | — | [review](../review/SKILL.md) |
| Linear 이슈·댓글 동기화 | — | `just linear-sync` · [linear.md](../../workflows/linear.md) |
| Blueprint 작성·Task 실행 | — | [plan](../plan/SKILL.md) — drift 시 sync 보조 |
| Biome import만 실패 (sync PASS) | — | [biome-baseline-empty.md](references/biome-baseline-empty.md) |

**오분기 시**: sync 절차를 시작하지 말고 대안 스킬을 **한 줄로 안내**한다.

---

## 0. 사용자 기대와 실제 동작

| 기대 | 실제 |
|------|------|
| "코드·스펙이 지금 구현과 맞다" | Phase 2에서 **에이전트가 문서 본문**을 맞추고, Phase 3에서 **검증** |
| `just sync --check` 한 번에 끝 | ✅ 락 해시 + **문서가 diff에 포함됐는지** 자동 검사 |
| 스펙 문장 자동 생성 | ✅ 에이전트 자동 ([sync 워크플로 Phase 2](../../workflows/sync.md)) |

---

## 1. CLI (`just sync`)

| 명령 | 동작 |
|------|------|
| `just sync --check` | ① `@code-sync-lock` 해시 ② **spec alignment** (+ drift 힌트) |
| `just sync-turn-end` | **/sync 종료 1줄** — `sync --check` → `lint-turn-end` (AskQuestion 금지) |
| `just lint` / `lint-turn-end` | `sync-check-gate` 포함 (`CI=true` → `--strict`) |
| `just sync --check --ack-spec` | 수동 역검증 완료 선언 (비권장) |
| `just sync --check --strict` | CI: required + 문서 미갱신 → exit 2 |
| `just sync --lock` / `--update` | 락 생성·해시 갱신 |

**Spec alignment FAIL 시**: 후보 스펙 목록 출력 → 문서 갱신 → 재실행.

---

## 2. 세션 종료 실행 순서 (SSOT)

Justfile `sync-turn-end` · `lint-turn-end` · [reporting.md](../../core/reporting.md) §1.0과 연결. **충돌 시 본 절 우선.**

### `/sync` MUST — AskQuestion 금지

Phase 2에서 spec·Claim 갱신 후 `just sync --check`가 **PASS**이면, **`just sync-turn-end`를 즉시 실행**한다.
`lint-turn-end` 실행 여부를 사용자에게 **묻지 않는다** (기본 포함).

| 순서 | 단계 | 명령 | 비고 |
|------|------|------|------|
| 1 | 진행 중 (선택) | `just lint-fe` / `just lint-be` | 완료 선언 대체 불가 |
| 2 | **Phase 2** | `just sync --check` → spec·Claim 갱신 → **PASS** | [workflow Phase 2](../../workflows/sync.md) |
| 3 | **종료 게이트** | `just sync-turn-end` | `sync --check` + `lint-turn-end` 1줄 체인 |
| 3a | sync FAIL | → 순서 2 | spec 갱신 후 `sync-turn-end` 재실행 |
| 4 | 런타임 (해당 시) | `just renderer-route-smoke` | 라우트·proxy·middleware |
| 5 | Blueprint (해당 시) | `docs-ssot-headers` → `linear-sync` → `plan-close` | [reporting §1.0](../../core/reporting.md) |
| 6 | 로드맵 (권장) | [`ROADMAP.md`](../../../docs/plans/ROADMAP.md) | |
| 7 | 보고 | **Unified Sync PASS** | `Last Verified` 반영 |

> **중복 금지**: 순서 3 PASS 후 별도 `just sync --check` 불필요. `just lint-turn-end` 단독 호출 대신 **`just sync-turn-end`** 사용.

---

## 3. Pitfalls (요약 — 상세는 references/)

| 증상 | Read |
|------|------|
| `required` drift · Phase 2 루프 · PASS인데 힌트만 | [required-drift-and-phase2.md](references/required-drift-and-phase2.md) |
| CSS·렌더링 최적화만 변경 | [drift-false-positives.md](references/drift-false-positives.md) |
| Biome baseline 0 · import 정렬 | [biome-baseline-empty.md](references/biome-baseline-empty.md) |
| CSS 변수 순환 참조 | [css-variable-circular-reference.md](references/css-variable-circular-reference.md) |

---

## 관련 SSOT

- [.agents/workflows/sync.md](../../workflows/sync.md)
- [scripts/agent/sync.py](../../../scripts/agent/sync.py)
- [docs/specs/technical/spec_integrated_sync_roadmap.md](../../../docs/specs/technical/spec_integrated_sync_roadmap.md)
