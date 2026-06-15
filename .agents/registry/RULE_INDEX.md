---
scope: [".agents/registry/RULE_INDEX.md"]
domain: "registry"
---
<!-- Language: ko -->
# Agent Rule Index

프로젝트의 에이전트 지침·규칙 파일 중앙 색인이다.

## Constitution (Root)

| 파일 | 설명 | 비고 |
| :--- | :--- | :--- |
| [AGENTS.md](../../AGENTS.md) | 우선순위, 전역 원칙, 워크플로우 색인 | 헌법 |
| [PROJECT_RULES.md](../../PROJECT_RULES.md) | 스택·품질·아키텍처 제약 | 정책 허브 |
| [CRITICAL_RULES.md](../../CRITICAL_RULES.md) | `PROJECT_RULES.md` §8 진입점 | 불변 SSOT 링크 |

## Registry & Metadata

| 파일 | 설명 | 비고 |
| :--- | :--- | :--- |
| [LOAD_ORDER.md](LOAD_ORDER.md) | 규칙 로딩 순서·Phase | 로딩 SSOT |
| [CONTEXT_ROUTING.md](CONTEXT_ROUTING.md) | 경로별 동적 라우팅 | 라우팅 SSOT |
| [RULE_INDEX.md](RULE_INDEX.md) | 본 색인 | 인덱스 |

## Core (Common)

| 파일 | 설명 | 핵심 키워드 |
| :--- | :--- | :--- |
| [.agents/core/execution.md](../core/execution.md) | 사고 방식, 실행 흐름, 파일 접근 | Simplicity, Surgical, Disk First |
| [.agents/core/verification.md](../core/verification.md) | 검증 매트릭스, Safe Edit Loop | Gate, Lint, Type, Test |
| [.agents/core/planning.md](../core/planning.md) | Thinking Levels, Blueprint, Plan Gate | /plan, Conclusion |
| [.agents/core/reporting.md](../core/reporting.md) | 보고 프로토콜 | Concise, Summary |
| [.agents/core/resilience.md](../core/resilience.md) | 재시도·복구 | Retry, Timeout |
| [.agents/core/memory_hygiene.md](../core/memory_hygiene.md) | MEMORY.md 위생 | 200 lines |

## Domain Specific

| 분류 | 파일 | 설명 |
| :--- | :---: | :--- |
| **Frontend** | [.agents/domains/frontend/react.md](../domains/frontend/react.md) | PascalCase, 컴포넌트, UI |
| | [.agents/domains/frontend/typescript.md](../domains/frontend/typescript.md) | Strict, Narrowing, no habitual any |
| **Backend** | [.agents/domains/backend/ddd.md](../domains/backend/ddd.md) | app/lib/db 경계, 서버 신뢰 |
| | [.agents/domains/backend/api_contracts.md](../domains/backend/api_contracts.md) | Server Actions, Zod, API 계약 |
| **Product** | [.agents/domains/product/critical_logic.md](../domains/product/critical_logic.md) | 가족 격리·투약·PROJECT_RULES.md §8 |
| **Testing** | [.agents/domains/testing/tdd.md](../domains/testing/tdd.md) | Red-First, assertion 필수 |
| | [.agents/domains/testing/playwright.md](../domains/testing/playwright.md) | E2E·Discovery |
| **Docs** | [.agents/domains/documentation/markdown.md](../domains/documentation/markdown.md) | 한국어 우선, Language Gate |
| | [.agents/domains/documentation/planning_docs.md](../domains/documentation/planning_docs.md) | Blueprint 요약 규칙 |

## Adaptive

| 파일 | 설명 |
| :--- | :--- |
| [.agents/adaptive/self_evolution.md](../adaptive/self_evolution.md) | 가이드라인 갱신 3단계 |
| [.agents/adaptive/cognitive_logging.md](../adaptive/cognitive_logging.md) | Sparse-Gold `/ai-log` |

## Workflows (`/command` 상세)

| 파일 | 설명 |
| :--- | :--- |
| [.agents/workflows/plan.md](../workflows/plan.md) | `/plan` Blueprint·7단계 |
| [.agents/workflows/ai-log.md](../workflows/ai-log.md) | `/ai-log` CLI·토큰 휴리스틱 |
| [.agents/workflows/linear.md](../workflows/linear.md) | `/linear` Linear 동기화 **템플릿**(스크립트 미도입 시 참고만) |
| [.agents/workflows/emr_process_mirror.md](../workflows/emr_process_mirror.md) | `/emr-process-mirror` upstream **프로세스**만 비교·반영 |
| [.agents/workflows/](../workflows/) | 그 외 `/go`, `/playwright`, `/archive` 등 |

---

**Last Updated**: 2026-05-12 (emr 대비 재동기화)
