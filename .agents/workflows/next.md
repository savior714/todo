---
trigger: /next
description: 활성화된 계획(docs/plans) 중 다음에 할 일을 논리적으로 분석하여 추천
---

# /next — Next Task Prioritizer

현재 `docs/plans/` 아래에 있는 모든 활성 Blueprint를 분석하여, 의존성이 해결되었고 즉시 시작 가능한 가장 우선순위가 높은 태스크를 추천합니다.

## 실행 절차

1.  **데이터 추출**: `just next` 명령을 실행합니다. 이 명령은 `scripts/plan_loop/plan_orchestrator.py`를 실행하여 `docs/plans/PLAN_STATUS.json`을 갱신하고 요약을 출력합니다.
2.  **컨텍스트 최적화**: 
    *   **절대 금지**: `docs/plans/*.md` 파일들을 직접 모두 읽지 마십시오.
    *   대신 `docs/plans/PLAN_STATUS.json` 파일 하나만 읽어 현재 상태를 파악하십시오.
3.  **결과 보고**: 추천된 태스크와 해당 파일 경로를 사용자에게 제시하고, 사용자가 특정 태스크의 상세 내용을 원할 때만 해당 `.md` 파일을 읽으십시오.

## 사용법

```bash
just next
```

## 핵심 원칙
- **Dependency First**: 선행 태스크가 완료되지 않은 항목은 추천하지 않습니다.
- **Blocked Visibility**: `blocked` 상태인 태스크를 명시하여 병목 지점을 알립니다.
- **Context Lean**: 불필요한 계획 파일 로드를 방지하여 모델의 토큰 사용량을 최소화합니다.
