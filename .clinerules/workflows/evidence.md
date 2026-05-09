---
situation: 인증 증적 생성
trigger: /evidence
level: Mandatory
description: 인증 지표(Axxx, Bxxx, Cxxx) 증적 자동 생성 및 검증 리포트 작성 워크플로우
version: 1.0.0
last_updated: 2026-05-06
---


# /evidence: Certification Evidence Workflow

이 워크플로우는 의료기관 인증 지표 구현 후, 필요한 물리적 증적(JSON/PDF)을 생성하고 이를 `docs/CRITICAL_LOGIC.md` 및 검증 리포트에 통합하는 과정을 표준화합니다.

## 1. 전제 조건
- 대상 인증 지표(예: `B005`)가 구현 완료되었거나 테스트 가능한 상태여야 함.
- 관련 증적 생성 스크립트(`scripts/cert_gap/generate_{id}_evidence.py`)가 존재해야 함.

## 2. 실행 프로토콜

### Step 1: 증적 스크립트 실행
// turbo
1. 해당 지표의 증적 생성 스크립트를 실행합니다.
   - 예: `python scripts/cert_gap/generate_b005_evidence.py`
   - 생성된 결과물이 `scripts/cert_gap/evidence/` 또는 지정된 경로에 생성되었는지 확인합니다.

### Step 2: 결과 데이터 검증
2. 생성된 JSON 또는 PDF 파일을 읽어, 요구사항(AC)을 충족하는 데이터가 포함되었는지 확인합니다.
   - FHIR 리소스의 경우 필수 필드 누락 여부를 체크합니다.

### Step 3: CRITICAL_LOGIC.md 업데이트
3. `docs/CRITICAL_LOGIC.md`의 `Decision Log`에 해당 지표의 결정 사항을 기록합니다.
   - `Decision`, `Rationale`, `증적(Evidence Path)`을 반드시 포함합니다.

### Step 4: 검증 리포트 생성 또는 업데이트
4. `docs/verification/` 하위의 관련 리포트에 실행 결과를 요약하여 추가합니다.

## 3. 완료 체크리스트
- [ ] 증적 파일이 물리적으로 존재하는가?
- [ ] `CRITICAL_LOGIC.md`에 증적 경로가 올바르게 기재되었는가?
- [ ] `PROJECT_RULES.md`의 SSOT 원칙을 위배하지 않는가?
