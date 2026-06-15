---
situation: 지식 인덱싱
trigger: /index_knowledge
level: Recommended
description: docs/knowledge/ INDEX.md 자동 갱신 및 정합성 검증
version: 1.1.0
last_updated: 2026-05-11
---

# docs/knowledge/ 인덱싱 워크플로우

> **목적**: `docs/knowledge/` 문서를 정리·인덱싱하여 `AGENTS.md` §10.2 (`MEMORY.md` 위생)와 맞물리게 하고, 빠른 네비게이션을 제공합니다.

---

## 📋 개요

`docs/knowledge/`는 외부 지식 아카이브로, 웹 검색 결과·기술 리서치 등이 저장됩니다. `INDEX.md`는 **과대해지지 않도록** 링크 위주로 유지하고, 장문은 하위 문서로 분산합니다. (`MEMORY.md` 200라인 제한은 `just memory-verify` — 별도 문서.)

---

## 🔄 인덱싱 프로세스

### 1단계: 구조 분석

```bash
# docs/knowledge/ 폴더 구조 확인
ls -la docs/knowledge/
```

**대상**:
- `docs/knowledge/*.md` (루트 문서)
- `docs/knowledge/certification/*.md` (인증 하위 폴더)
- `docs/knowledge/integration/*.md` (연동 하위 폴더)

### 2단계: 인덱스 생성

```bash
# (선택) 레포에 scripts/index_knowledge.py가 있을 때만
# python3 scripts/index_knowledge.py
```

**동작** (스크립트 없으면 수동으로 `INDEX.md`에 링크 추가):
1. `docs/knowledge/` 하위 모든 `.md` 파일 스캔
2. 각 파일의 메타 헤더(`## 문서 메타`) 추출
3. 카테고리별로 그룹화
4. `docs/knowledge/INDEX.md`에 링크 목록 생성

### 3단계: 검증

```bash
bun run lint && bun run typecheck:strict && just ci
```

**검증 항목**:
- `docs/knowledge/INDEX.md` 존재 여부
- **INDEX 과대 여부** — 필요 시 섹션·파일 분할
- **인코딩 검증**: `python3 scripts/verify_korean_text.py --file docs/knowledge/INDEX.md` (스크립트 있을 때)
- **링크 유효성**: 생성된 모든 상대 경로 링크가 실제 파일에 도달하는지 확인

---

## 🛠️ 자동화 스크립트

### `scripts/index_knowledge.py`

**기능**:
- `docs/knowledge/` 하위 모든 `.md` 파일 스캔
- 파일명, 제목, 설명 추출
- 카테고리별 정렬 및 그룹화
- `docs/knowledge/INDEX.md` 자동 생성

**사용법**:
```bash
# 자동 인덱싱
python3 scripts/index_knowledge.py

# 상세 로그
python3 scripts/index_knowledge.py --verbose

# 검증 모드 (실제 수정 없이 체크)
python3 scripts/index_knowledge.py --check
```

---

## 📊 인덱스 구조

### 카테고리 분류

| 카테고리 | 하위 폴더/패턴 | 설명 |
|:---|:---|:---|
| **인증·심사** | `certification/` | EMR 인증 기준, 심사 리포트 |
| **연동·표준** | `integration/` | FHIR, KCD, LOINC, NIMS |
| **임상·CDS** | 루트/용어 매핑 | CDS 훅, 처방 로직 |
| **인프라·보안** | 루트/인프라 | PostgreSQL, OpenBao, CSAP |
| **프론트·도구** | 루트/프론트 | Next.js, shadcn/ui, AI |
| **개발 도구** | 루트/도구 | DTO, 검증 도구 |

---

## 📝 문서 작성 규칙

### 1. 메타 헤더 필수

모든 `docs/knowledge/` 문서는 다음 메타 헤더를 포함해야 합니다:

```md
## 문서 메타 (Version SSOT)
- **Last Verified**: YYYY-MM-DD
- **Tested Version**: (스택/버전 또는 기준 문서)
- **Min Supported**: (최소 지원 버전/조건)
- **Reference**: (관련 SSOT/외부 근거)
```

### 2. 인덱스 링크 규칙

`docs/knowledge/INDEX.md`에 추가할 때:
- **한 줄 링크**: `| [파일명](링크) | 설명 | SSOT 링크 |`
- **긴 설명 금지**: 설명은 문서 본문에만 작성
- **SSOT 링크**: 관련 `docs/specs/` 또는 `PROJECT_RULES.md` §8 링크

### 3. 500라인 제한 준수

`docs/knowledge/INDEX.md`는 **500라인을 초과하지 않아야** 합니다. 초과 시:
1. **계층적 인덱싱**: `docs/knowledge/certification/INDEX.md` 처럼 하위 폴더별 인덱스를 별도로 생성하고, 루트 인덱스에서는 하위 인덱스로의 링크만 유지한다 (**Push-down** 전략).
2. **아카이브**: 오래된 지식 문서는 `docs/knowledge/archive/`로 이동하고 인덱스에서 제거한다.
3. **요약 축소**: 설명 열의 텍스트 길이를 최소화한다.

### 4. 자동 생성 원칙
- `docs/knowledge/INDEX.md`는 **스크립트에 의해 자동 관리**되는 파일입니다. 
- 수동으로 내용을 추가할 경우, 다음 인덱싱 작업 시 소실될 수 있으므로 반드시 스크립트를 통해 생성하거나 고정된 템플릿 영역을 사용하십시오.

---

## 🚨 예외 처리

### PDF 파일

`docs/knowledge/certification/`에 있는 PDF 파일은 인덱스에 포함하지 않습니다.

### 중복 파일

동일 주제의 중복 문서가 있으면:
1. **최신 버전만 유지**
2. **이전 버전은 아카이브**
3. **참조 일괄 갱신**: `scripts/archive_plans.py` 사용

---

## 📈 유지보수

### 주간 점검

- [ ] `docs/knowledge/`에 신규 문서 추가 여부 확인
- [ ] `docs/knowledge/INDEX.md` 200라인 제한 확인
- [ ] 링크 유효성 검증

### 월간 정리

- [ ] 완료된 리서치 문서 아카이브
- [ ] 중복 문서 정리
- [ ] 인덱스 구조 재정비

---

## 📚 관련 문서

| 문서 | 설명 |
|:---|:---|
| [`docs/knowledge/INDEX.md`](../knowledge/INDEX.md) | 인덱스 SSOT |
| [`docs/knowledge/README.md`](../knowledge/README.md) | 상세 설명 (보조) |
| [`.agents/memory/MEMORY.md`](../memory/MEMORY.md) | 세션 지식 인덱스 |
| [`PROJECT_RULES.md`](../../PROJECT_RULES.md) | 핵심 설계 결정 |
| [`docs/specs/`](../specs/) | 요구사항 SSOT |

---

## 📝 작성일
- **2026-04-13**: 최초 생성
