---
scope: [".agents/workflows/context_gap_scan.md"]
domain: "workflows"
situation: 맥락 갭 자동 탐지
trigger: /context_gap_scan
level: Recommended
description: Jira/Incident/PR/검증 실패 이력을 스캔해 문서화되지 않은 Institutional Knowledge 갭을 탐지하고 우선순위 큐를 생성하는 워크플로우
version: 1.0.0
last_updated: 2026-05-06
---
<!-- Language: ko -->

# 🔎 Context Gap Scanner 워크플로우 (/context_gap_scan)

이 워크플로우는 과거 업무 기록에서 반복 실패 패턴을 자동 탐지해, 기관 지식 공백(Context Gap)을 문서화 가능한 작업 단위로 변환합니다.

> **Fatal Rule**: 스캔 결과는 반드시 "증거 링크 + 영향도 + 문서화 대상 + 담당자"를 포함한 큐 항목으로 남겨야 합니다.

---

## 1) 입력 소스 수집

1. Jira 티켓(설명/코멘트/재오픈 이력)
2. Incident 기록(Postmortem 포함)
3. PR 리뷰 코멘트 및 반복 수정 흔적
4. 검증 실패 기록(세션 터미널 로그, CI 링크, 또는 — 존재 시 — `verify-last-result.json` 등 임의 산출물)

## 2) 갭 후보 탐지 휴리스틱

- 동일 실패가 2회 이상 재발
- "암묵 룰", "운영 관례", "원래 이렇게" 표현 반복
- 코드 변경 없이 설명 추가로만 해결된 이슈 누적
- 신규 담당자/에이전트가 동일 질문을 반복

## 3) 정규화 규칙 (Gap Entry Contract)

각 후보는 아래 필드를 반드시 포함합니다.

- `gapId`: 예) `CGS-20260506-001`
- `title`: 한 줄 요약
- `context`: 업무/시나리오 맥락
- `failureSignal`: 로그/오류/재시도 패턴
- `impact`: `patient_safety | outage | delay | quality`
- `evidenceLinks`: Jira/Incident/PR/리포트 링크
- `recommendedArtifact`: `docs/specs/technical/*` 또는 `docs/knowledge/*`
- `owner`: 담당자
- `dueDate`: 처리 목표일
- `status`: `new | triaged | documented | verified`

## 4) 우선순위 산정

우선순위 점수 = `영향도(40)` + `재발도(30)` + `해결난이도 역점수(20)` + `감사/인증 연관도(10)`

- P0: 환자 안전 또는 운영 중단 위험
- P1: 반복 장애/지연 유발
- P2: 품질/온보딩 저하

## 5) 산출물

1. 갭 큐 리포트: `docs/reports/context-gaps/context_gap_scan_YYYYMMDD.md`
2. 구조화 데이터: `docs/reports/context-gaps/context_gap_scan_YYYYMMDD.json`
3. 후속 액션:
   - P0/P1은 `/plan`으로 즉시 태스크 분해
   - 문서화 완료 시 `.agents/memory/MEMORY.md`에 링크 1줄 추가

## 5.1) 실행 명령 (표준)

```bash
python3 scripts/context_gap_scanner.py
```

### 외부 입력(Jira/Incident export) 포함 실행

```bash
python3 scripts/context_gap_scanner.py --jira-export "/path/to/jira_export.json" --incident-export "/path/to/incidents.csv"
```

### 스키마 힌트(추출 정확도 강화)

```bash
python3 scripts/context_gap_scanner.py --jira-export "/path/to/jira_export.json" --jira-schema jira-cloud
python3 scripts/context_gap_scanner.py --incident-export "/path/to/incidents.json" --incident-schema pagerduty
```

## 6) 실행 체크리스트

- [ ] 입력 소스 4종 중 최소 2종 이상 스캔
- [ ] 신규 Gap 1건 이상 또는 "No new gap" 근거 기록
- [ ] P0/P1 항목에 Owner/Due Date 지정
- [ ] 최소 1건 이상 문서화 대상(`recommendedArtifact`) 지정
- [ ] MEMORY 인덱스 링크 업데이트

## 7) 운영 가드레일

- 추측 금지: Evidence 없는 갭 등록 금지
- 중복 금지: 기존 gapId/title 유사도 확인 후 병합
- SSOT 우선: 정책성 내용은 `docs/specs/technical/`, 사례성 내용은 `docs/knowledge/`
- 감사 가능성: 모든 항목은 재검증 가능한 증거 링크를 유지

상세 정책: `docs/specs/technical/demand_driven_context_protocol.md`
