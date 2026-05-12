<!-- Language: ko -->
# AGENTS.md — Unified Execution Constitution

본 문서는 에이전트의 **핵심 헌법(Constitution)**입니다. 모든 실행 가이드라인의 최상위 SSOT이며, 도메인별 세부 규칙은 `.agents/` 디렉토리의 모듈화된 파일로 위임합니다.

---

## 0. Priority / Rule Precedence

1. `PROJECT_RULES.md`
2. 본 문서 (`AGENTS.md`)
3. `.agents/core/*.md` (전역 핵심 규칙)
4. `.agents/domains/**/*.md` (도메인 특화 규칙)
5. 기타 명세 및 가이드라인

문서 간 충돌 시 위 우선순위를 따르며, 불명확할 경우 명시적으로 질문하십시오.

---

## 1. Core Operating Principles (Summary)

모든 작업은 다음의 3대 원칙을 최우선으로 합니다. 상세 내용은 [.agents/core/execution.md](.agents/core/execution.md)를 참조하십시오.

- **Think Before Coding**: 가설은 명시하고, 불확실성은 즉시 질문한다.
- **Simplicity First**: 요청받지 않은 기능을 추가하지 않으며, 설계를 단순화한다.
- **Surgical Changes**: 최소한의 범위만 수정하며, 기존 스타일을 존중한다.

---

## 2. Global Execution Gates

- **Disk State First**: 모든 수정 전 `read_file`로 디스크 상태를 SSOT로 확보한다.
- **Verification First**: lint/type/test 실패 상태에서 완료를 선언하지 않는다.
- **Plan First**: 복합 작업 전 `/plan` 워크플로우를 통한 설계가 선행되어야 한다.
- **TDD Red-First**: 구현 전 실패하는 테스트를 먼저 작성한다.

상세 게이트 규칙: [.agents/core/planning.md](.agents/core/planning.md), [.agents/core/verification.md](.agents/core/verification.md), [.agents/domains/testing/tdd.md](.agents/domains/testing/tdd.md)

---

## 3. Dynamic Rules Loading System

에이전트는 작업 경로에 따라 [.agents/registry/CONTEXT_ROUTING.md](.agents/registry/CONTEXT_ROUTING.md)에 정의된 규칙을 동적으로 로딩합니다.

### Always Load (핵심 규칙)

다음 파일은 모든 세션에서 상시 적용됩니다.

- [.agents/core/execution.md](.agents/core/execution.md)
- [.agents/core/verification.md](.agents/core/verification.md)
- [.agents/core/planning.md](.agents/core/planning.md)
- [.agents/core/reporting.md](.agents/core/reporting.md)
- [.agents/core/resilience.md](.agents/core/resilience.md)
- [.agents/core/memory_hygiene.md](.agents/core/memory_hygiene.md)
- [.agents/domains/documentation/markdown.md](.agents/domains/documentation/markdown.md)

---

## 4. Verification Matrix (Summary)

| Scope | Required | Path |
|---|---|---|
| Docs | link/path 정합성 | [markdown.md](.agents/domains/documentation/markdown.md) |
| L1 small | `bun run lint` + `bun run typecheck:strict` | [verification.md](.agents/core/verification.md) |
| L2 feature | L1 + `bun run test` | [tdd.md](.agents/domains/testing/tdd.md) |
| L3 structural | L2 + `just ci` | [ddd.md](.agents/domains/backend/ddd.md) |
| Frontend UI | L1과 동일 | [react.md](.agents/domains/frontend/react.md) |
| Directory | `/directory_verify` | [.agents/workflows/directory_verify.md](.agents/workflows/directory_verify.md) |

---

## 5. Workflow Index

| Workflow | Usage | 상세 가이드 |
|---|---|---|
| `/ai-log` | 인지 관측성 로깅 (Sparse-Gold) | [cognitive_logging.md](.agents/adaptive/cognitive_logging.md), [ai-log.md](.agents/workflows/ai-log.md) |
| `/plan` | 통합 심층 설계 및 태스크 분해 | [planning.md](.agents/core/planning.md), [plan.md](.agents/workflows/plan.md) |
| `/diagnose` | 문제 진단·재현(실행 원칙) | [execution.md](.agents/core/execution.md) — 절차 상세는 [diagnose.md](.agents/workflows/diagnose.md) |
| `/asset` | 지식 자산화 (`docs/knowledge` 등) | [markdown.md](.agents/domains/documentation/markdown.md) |
| `/playwright` | UI 탐색·자동 문제 발견 | [playwright.md](.agents/workflows/playwright.md) |
| `/linear` | Linear–Blueprint 동기화 | [linear.md](.agents/workflows/linear.md) (선택·템플릿) |
| `/emr-process-mirror` | upstream(emr) **진행 방식**만 점검·갭 도출 | [emr_process_mirror.md](.agents/workflows/emr_process_mirror.md) |
| 기타 | `/archive`, `/go`, `/git`, `/bootstrap`, `/directory_verify` 등 | [.agents/registry/RULE_INDEX.md](.agents/registry/RULE_INDEX.md) → Workflows |

---

## 6. Self-Evolution

개선 제안 및 가이드라인 반영은 [self_evolution.md](.agents/adaptive/self_evolution.md)의 3단계 프로세스를 따릅니다.

---

## 7. Reference Index

- **Core**: `PROJECT_RULES.md`, `CRITICAL_RULES.md` (→ `docs/CRITICAL_LOGIC.md` 진입점) — 에디터 규칙은 `.cursor/rules/`에 있으면 함께 참고
- **Specs**: `docs/specs/PRD.md`, `docs/specs/TRD.md` (`docs/specs/technical/` 등 하위는 선택)
- **불변·운영 경계**: `docs/CRITICAL_LOGIC.md`
- **Index**: [.agents/registry/RULE_INDEX.md](.agents/registry/RULE_INDEX.md)
- **Adaptive Guidelines**: `docs/memory/ADAPTIVE_GUIDELINES.json`
- **Plan 린터**: `scripts/plan_loop/plan_lint.py`
- **Session Language Gate**: [markdown.md](.agents/domains/documentation/markdown.md)
