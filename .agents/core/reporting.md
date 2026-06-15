---
domain: "core"
scope: ["*"]
always_apply: true
priority: 1
---
<!-- Language: ko -->
# Reporting Protocol

에이전트의 보고 원칙과 형식을 규정한다. 전 구간 간결 보고로 토큰 효율을 유지한다.

---

## 1. Reporting Principles

중간 보고와 세션 종료 보고는 동일한 원칙을 따른다.

### 1.1 기본 보고 (Default)

- 3~5줄 이내
- 한 줄 요약
- 필요 시 변경 파일 목록과 검증 결과를 한 줄로
- 잔여 이슈가 있으면 한 줄 추가

### 1.2 상세 보고 (Detailed)

다음 경우에만 상세 보고한다.

- 검증 실패
- 블로커 존재
- 사용자가 명시적으로 요청

### 1.3 금지 (Prohibited)

- 장문 템플릿 보고
- 영문 전용(English-only) 리포트
- `Final Completion Report` 등 거창한 헤더
- 증거 없는 "완료" 선언
- 사용자에게 `just update-guidelines` 등을 **직접 실행하라고** 요구하는 것 (에이전트가 수행)
