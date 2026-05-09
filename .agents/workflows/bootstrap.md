---
situation: 환경 동기화
trigger: /bootstrap
level: Recommended
description: 현재 프로젝트의 최신 개발 지침, TDD 게이트 로직, 검증 스크립트를 `dev/bootstrap/templates`로 동기화
version: 1.0.0
last_updated: 2026-05-06
---

# Workflow: Bootstrap System Synchronization (/bootstrap)

이 워크플로우는 현재 프로젝트의 최신 개발 지침, TDD 게이트 로직, 검증 스크립트를 상위 디렉토리인 `../bootstrap/templates`로 동기화하여 다른 프로젝트에서 언제든 최신 상태로 부트스트랩할 수 있도록 합니다.

## 🎯 목표
- 현재 프로젝트의 `AGENTS.md`, `PROJECT_RULES.md`, `Justfile`, `verify.sh`, `tools/`를 템플릿화
- `just ci`를 표준 검증 인터페이스로 설정하여 부트스트랩된 프로젝트의 품질 보장
- 프로젝트 특화 정보를 변수화(`[PLACEHOLDER]`)하여 범용성 확보
- `dev/bootstrap` 패키지를 항상 최신 상태로 유지

---

## 🛠️ 실행 절차

### Step 1. 현재 시스템 분석
- 최신 `AGENTS.md`, `PROJECT_RULES.md` 내용을 확인한다.
- `Justfile`의 `ci`, `verify` 레시피와 `verify.sh`의 TDD 게이트 로직, `tools/tdd_gate_plugin.py`의 변경사항을 확인한다.

### Step 2. 템플릿 추출 및 일반화
- 각 파일을 `dev/bootstrap/templates/` 경로로 복사하되, 아래 규칙을 적용한다.
- **AGENTS.md**: 프로젝트 고유의 컨텍스트를 제거하고 범용적인 TDD/SSOT 지침으로 변환.
- **PROJECT_RULES.md**: 기술 스택 부분을 `[PLACEHOLDER]` 처리.
- **verify.sh**: 복잡한 모듈화 기능을 제외하고 핵심 TDD 게이트 로직 위주로 추출.
- **tools/tdd_gate_plugin.py**: 경로 검사 로직 등을 범용적으로 수정.
- **docs/specs/technical/DESIGN.md**: 프로젝트 고유 브랜딩을 제거하고 `{{PLACEHOLDER}}` 처리하여 범용 디자인 명세로 변환.

### Step 3. 부트스트랩 스크립트 업데이트
- `dev/bootstrap/bootstrap.sh`가 새로운 파일 구조나 설치 단계를 반영해야 하는지 검토하고 업데이트한다.

### Step 4. 검증 및 보고
- `dev/bootstrap` 구조가 올바른지 확인한다.
- 동기화된 주요 변경사항을 요약하여 사용자에게 보고한다.

---

## 🚫 주의 사항
- 현재 프로젝트의 DB 비밀번호, 특정 API 키 등 민감 정보가 템플릿에 포함되지 않도록 절대 주의한다.
- 덮어쓰기 전 기존 템플릿과 큰 차이가 있다면 사용자에게 확인을 요청한다.
