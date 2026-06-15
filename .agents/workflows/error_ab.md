---
situation: 에러 A/B 해결
trigger: /error_ab
level: Recommended
description: 외부 LLM(arena.ai)의 A/B 답변을 활용하여 최적의 에러 해결책을 도출하고 검증
version: 1.0.0
last_updated: 2026-05-06
---

# Workflow: /error_ab (External A/B Comparison)

이 워크플로우는 사용자가 외부 벤치마크 도구(arena.ai 등)에서 얻은 두 가지 모델의 답변(A, B)을 비교 분석하여 최적의 해결책을 도출하는 과정을 정의한다.

## 0. Trigger
사용자가 `/error_ab <에러_설명>`을 입력할 때 시작한다.

---

## Phase 1: Context Analysis & Prompt Generation (Agent)
1. **분석**: 에러 로그와 관련 코드를 읽고 문제의 핵심을 파악한다.
2. **프롬프트 생성**: 사용자가 외부 LLM에 그대로 복사해 넣을 수 있는 정교한 프롬프트를 작성하여 안내한다.
   - 출력 파일: `docs/reports/errors/<에러>_external_prompt.md`

---

## Phase 2: External Inference & Input (User)
1. **외부 질의**: 에이전트가 준 프롬프트를 **arena.ai** 등에 입력하여 두 가지 답변을 얻는다.
2. **답변 전달**: 결과로 나온 **답변 A**와 **답변 B**의 텍스트를 에이전트에게 그대로 붙여넣어 준다.

---

## Phase 3: Comparative Analysis (Agent)
1. **평가**: 전달받은 답변 A와 B를 정확도, 깊이, 실행 가능성, 안전성 기준으로 비교 평가한다.
2. **리포트 생성**: `docs/reports/errors/<에러>_evaluation.md`에 평가 점수와 승자 선정 이유를 기록한다.

---

## Phase 4: Implementation & Verification (Agent)
1. **반영**: 승리한 답변(또는 통합안)을 실제 코드에 반영한다.
2. **검증**: `bun run lint && bun run typecheck:strict` (+ 필요 시 `bun run test`) 및 `just ci`로 에러 해결을 확인한다.
3. **Memory 업데이트**: `.agents/memory/MEMORY.md`에 결과를 요약 기록한다.

---

## Guardrails
- **독립성**: A안과 B안을 선입견 없이 객관적으로 비교한다.
- **최종 책임**: 외부 답변을 맹신하지 않고, 프로젝트 규칙(`PROJECT_RULES.md`)에 부합하는지 에이전트가 최종 검증한다.

상세 지침: (레포에 별도 프로토콜 문서가 있으면 `docs/specs/`에서 링크한다.)
