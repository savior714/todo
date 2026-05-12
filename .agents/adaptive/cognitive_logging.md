---
scope: ["*"]
always_apply: true
priority: 2
---
<!-- Language: ko -->
# Cognitive Observability & Sparse-Gold Logging

본 문서는 `/ai-log` 워크플로우를 통한 인지 관측성(Cognitive Observability) 로깅 및 Sparse-Gold 원칙을 규정합니다.

---

## 1. Core Philosophy: Sparse-Gold

단순한 작업 로그가 아닌, 미래의 학습 데이터(Gold Data)로서 가치가 높은 **인지적 흔적(Cognitive Trace)**을 선별적으로 기록한다.

- **Sparse**: 모든 활동을 기록하지 않는다. 노이즈를 최소화한다.
- **Gold**: 사고의 전환이나 중요한 아키텍처 결정 등 고시그널 이벤트를 우선한다.

---

## 2. Logging Criteria (Material Impact)

다음과 같이 프로젝트의 방향성에 실질적인 영향(Material Impact)을 준 이벤트만 기록한다.

- **Assumption Shift**: 초기 가정이 틀렸음을 발견하고 수정한 경우.
- **Architectural Decision**: 아키텍처 Seam 식별이나 핵심 컴포넌트 구조 결정.
- **Complex Debugging**: 근본 원인(Root Cause)을 찾기 위해 여러 가설을 검증한 과정.
- **Strategic Pivot**: 사용자의 요청이나 환경 변화로 인해 계획을 전면 수정한 경우.

**제외 대상 (Noise)**:

- 단순 CRUD 작업.
- 포맷팅 및 린트 에러 수정.
- 사소한 오타 수정.

---

## 3. Tool Usage: correction_delta & cvs

로깅 시 다음 필드를 활용하여 인지 가치를 극대화한다.

- **correction_delta**: 에러나 오해를 바로잡은 구체적인 차이(Delta)를 기록한다.
- **cvs (Cognitive Value Score)**: 해당 기록이 미래의 에이전트나 개발자에게 줄 인사이트의 가치를 1~5점으로 평가한다.

(워크플로 상세·CLI·토큰 휴리스틱은 [.agents/workflows/ai-log.md](../workflows/ai-log.md)를 따른다. `tools/ai_worklog/`가 없으면 CLI 기록은 생략하고 본 절의 원칙만 적용한다.)

---

## 4. Workflow Strategy

1. **생략 제안**: 단순 작업의 경우 에이전트가 먼저 로그 생략을 제안할 수 있다.
2. **Trajectory Analysis**: 단순히 "무엇을 했는가"가 아니라 "왜 방향(Trajectory)을 바꿨는가"를 기술한다.
