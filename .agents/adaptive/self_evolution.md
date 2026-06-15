---
domain: "adaptive"
scope: ["*"]
always_apply: true
priority: 2
---
<!-- Language: ko -->
# Self-Evolution Protocol (Agent-Led Persistence)

본 문서는 에이전트가 세션 종료 시 스스로의 가이드라인을 개선하고 진화시키는 표준 절차를 규정합니다.

---

## 1. Execution Flow

세션 종료 시 개선 제안 및 가이드라인 반영은 다음 순서를 따른다.

1. **에이전트가 개선안을 자연어로 제안**: 세션 내 반복된 실패나 비효율을 분석하여 제안한다.
2. **사용자가 자연어로 승인**: 사용자의 명시적 동의를 구한다.
3. **에이전트가 직접 실행**: 에이전트가 `just update-guidelines`를 실행하여 `ADAPTIVE_GUIDELINES.json`을 갱신한다. (`justfile`에 해당 레시피가 없으면 승인 후 JSON을 직접 편집하고 변경 범위를 명시한다.)

---

## 2. Core Principles

- **Agent-Led**: 사용자가 터미널 명령어를 직접 입력하게 하지 않는다.
- **Explicit Consent**: 사용자의 자연어 승인 후 작업을 수행한다.
- **Continuous Improvement**: 세션의 교훈을 프로젝트 자산으로 즉시 환원한다.
