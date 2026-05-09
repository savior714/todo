---
situation: 경로 검증
trigger: /path_verification
level: Mandatory
description: 파일 시스템 경로 검증 및 MCP 기반 경로 확정 워크플로우
version: 1.0.0
last_updated: 2026-05-06
---

# 🔍 파일 시스템 경로 검증 워크플로우 (/path_verification)

이 워크플로우는 **파일 작업 전에 MCP를 통해 실제 경로를 확정**하고, **설계 문서와 실제 환경의 불일치를 사전에 탐지**하여 ENOENT 오류를 방지하기 위한 절차입니다.

> **목적**: "내가 알고 있는 지도(Blueprint)와 실제 지형(File System)이 달라서" 발생하는 오류를 **MCP를 통한 실시간 구조 파악**으로 방지합니다.


---

## 📋 핵심 실행 로직

### 0. 🛡️ 가이드라인 준수 (Compliance)

- **1 Task = 1 Action (Hallucination Guard)**: 하나의 태스크는 반드시 단일 도구 호출로 제한하여 환각 발생 가능성을 차단한다.
- **Step-Lock**: 경로가 불확실하거나 설계 문서와 다를 경우, 다음 단계 실행 전 반드시 사용자의 확인을 대기한다.
- **Case Sensitivity**: macOS 개발 환경과 Linux 배포 환경의 대소문자 구분 차이를 인지하고, 반드시 실제 파일 시스템의 스펠링을 그대로 따른다.

---

### 1. 🎯 목표 설정

파일 작업 전에 **실제 물리적 경로**를 MCP로 확정합니다.

| 항목 | 설명 |
|------|------|
| **목표** | `backend/src/main/api/v1/cds_router.py`와 같은 **실제 경로**를 MCP로 확인 |
| **대상** | 설계 문서(Blueprint)에 명시된 Target 경로 |
| **산출물** | `docs/memory/path-verification-result.md` (SSOT 자산화) |

---

### 2. 🧭 MCP 기반 경로 탐색 절차

#### Step 1: 상위 디렉토리부터 계층적으로 탐색

> **원칙**: `src` 등 중간 디렉토리 누락이 빈번하므로, **상위 디렉토리부터 MCP로 확인**합니다.

| 단계 | MCP 명령 | 예시 | 목적 |
|------|----------|------|------|
| 1 | `list_files(path="backend", recursive=false)` | `backend/` 목록 확인 | `src` 디렉토리 존재 여부 확인 |
| 2 | `list_files(path="backend/src", recursive=false)` | `backend/src/` 목록 확인 | `main` 디렉토리 존재 여부 확인 |
| 3 | `list_files(path="backend/src/main", recursive=false)` | `backend/src/main/` 목록 확인 | `api` 또는 `routers` 디렉토리 확인 |
| 4 | `list_files(path="backend/src/main/api/v1", recursive=false)` | `backend/src/main/api/v1/` 목록 확인 | `cds_router.py` 존재 여부 확인 |

#### Step 2: 설계 문서와 비교

| 항목 | 설계 문서 | MCP 결과 | 일치 여부 |
|------|-----------|----------|-----------|
| 경로 | `backend/src/main/routers/cds_router.py` | `backend/src/main/api/v1/cds_router.py` | ❌ 불일치 |
| 경로 | `backend/src/main/api/v1/cds_router.py` | `backend/src/main/api/v1/cds_router.py` | ✅ 일치 |

#### Step 3: 불일치 시 사용자 보고

> **ENOENT 발생 시 즉시 보고**: MCP 탐색 결과 파일이 없거나 경로가 다를 경우, **즉시 작업 중단**하고 사용자에게 보고합니다.

**보고 형식**:
```markdown
### 🔴 경로 불일치 감지

- **설계 문서 경로**: `backend/src/main/routers/cds_router.py`
- **실제 MCP 경로**: `backend/src/main/api/v1/cds_router.py`
- **결론**: 설계 문서의 Target 경로를 실제 환경에 맞춰 수정해야 합니다.

**수정 제안**:
1. 설계 문서(`docs/plans/archive/20260414_cds_rule_engine_implementation_blueprint.md`)의 Target 경로를 `backend/src/main/api/v1/cds_router.py`로 수정
2. 또는, 실제 파일을 `backend/src/main/routers/cds_router.py`로 이동 (비권장 - 기존 구조 변경)
```

---

### 3. 🛠️ 실제 파일 작업

#### 3.1. 경로 확정 후 파일 작업

| 작업 유형 | 권장 도구 (Common MCP) | 예시 시나리오 |
|-----------|------------------------|----------------|
| 파일 읽기 | `read_file` | `path="backend/src/..."` |
| 파일 수정 | `edit_file` | 라인 기반 부분 수정 |
| 파일 생성 | `write_file` | 신규 파일 생성 |
| 디렉토리 탐색 | `list_files` | 존재 여부 계층적 탐색 |

#### 3.2. 상위 디렉토리 생성 확인

> **파일 생성 전 검사**: 신규 파일 생성 시, 상위 디렉토리가 존재하는지 MCP로 확인합니다.

```python
# 예시: backend/src/main/new_api/v1/cds_router.py 생성 시
1. `list_files(path="backend/src/main/new_api", recursive=false)` -> 존재하지 않음
2. 디렉토리 생성 도구(또는 셸)로 `backend/src/main/new_api/v1` 생성
3. `write_file(...)` -> 파일 생성
```

---

## 📊 예시 시나리오

### 시나리오 1: 설계 문서 경로가 실제와 일치

| 단계 | 동작 | MCP 결과 |
|------|------|----------|
| 1 | `list_files(path="backend/src/main/api/v1", recursive=false)` | `cds_router.py` 존재 |
| 2 | 설계 문서 경로 비교 | `backend/src/main/api/v1/cds_router.py` ✅ 일치 |
| 3 | 파일 작업 수행 | `read_file` 또는 `edit_file` 실행 |

### 시나리오 2: 설계 문서 경로가 실제와 불일치

| 단계 | 동작 | MCP 결과 |
|------|------|----------|
| 1 | `list_files(path="backend/src/main/routers", recursive=false)` | 디렉토리 없음 ❌ |
| 2 | `list_files(path="backend/src/main/api/v1", recursive=false)` | `cds_router.py` 존재 |
| 3 | 사용자 보고 | 경로 불일치 보고 + 수정 제안 |

---

## 🎯 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| **ENOENT 발생 횟수** | 0회/Task | MCP 탐색 후 작업 |
| **경로 탐색 소요 토큰** | ~50 tokens | MCP 1회 호출 |
| **설계-구현 불일치** | 0건/프로젝트 | 설계 문서 사전 수정 |

---

## 📌 주의사항

1. **MCP First**: 파일 작업 전 **반드시 MCP로 경로를 확인**합니다.
2. **Sequential Thinking**: 탐색 전 단계별 계획을 세워 토큰 소모를 최소화합니다.
3. **불일치 시 즉시 보고**: MCP 결과와 설계 문서가 다를 경우, **즉시 작업 중단**하고 사용자에게 보고합니다.
4. **Full-Path 사용**: 모든 경로는 **프로젝트 루트 기준 상대 경로**를 사용합니다 (`backend/src/main/api/v1/cds_router.py`).
5. **Evidence**: 검증된 경로는 `docs/memory/path-verification-result.md`에 기록하여 다음 에이전트를 위한 지식으로 남깁니다.

---

## 🔄 관련 워크플로우

- **`/plan`**: 설계 시 **이 워크플로우를 선행**하여 실제 경로를 확정한 뒤 Blueprint 작성
- **`/git`**: 커밋 전 **경로 검증 결과**를 `path-verification-result.md`로 기록하여 SSOT로 활용
