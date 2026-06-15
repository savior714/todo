---
situation: 지식 자산화
trigger: /asset
level: Recommended
description: 해결된 문제 및 노하우를 docs/knowledge 로 자산화
version: 1.0.0
last_updated: 2026-05-06
---

# 지식 자산화 (Asset) 워크플로우

> **목적**: 문제 해결 후 **지식 자산화 여부를 판단**하고, `docs/knowledge/` 또는 `docs/knowledge/COMMON_ERROR_RESOLUTIONS.md`에 **정석 해결 패턴**을 저장하여 향후 재사용한다.

---

## 📋 개요

에이전트/개발자가 오류를 해결할 때, 다음 조건 중 하나를 충족하면 지식 자산화를 진행한다:

1. **30분 이상 소요**: 특정 에러 해결에 30분 이상의 분석/수정 시간이 소요된 경우
2. **3회 이상 반복**: 동일한 패턴의 에러가 3회 이상 재발생한 경우
3. **초보자에게 유용한 교훈**: 프로젝트 신규 멤버나 외부 에이전트가 참고할 가치가 있는 해결 패턴인 경우

**자산화 대상**:
- `docs/knowledge/COMMON_ERROR_RESOLUTIONS.md` — 자주 발생하는 코드 오류 및 기술 스택별 해결 방법 (경량)
- `docs/knowledge/{topic}.md` — 상세 가이드가 필요한 심층 주제 (중량)
- `.agents/memory/feedback_*.md` — "함께 일하는 방식"에 대한 교정/확인

---

## 🔄 자산화 프로세스

### 1단계: 자산화 필요성 판단

다음 체크리스트를 확인한다:

| 항목 | 질문 | 판단 |
|------|------|------|
| **복잡도** | 해결에 30분 이상 소요되었는가? | `YES` → 진행 |
| **반복성** | 동일한 패턴이 3회 이상 발생했는가? | `YES` → 진행 |
| **가치** | 신규 멤버/외부 에이전트가 참고하는가? | `YES` → 진행 |

- **모든 NO**: 자산화 불필요 (메모로만 남김)
- **하나라도 YES**: 자산화 진행

### 2단계: 대상 파일 결정

자산의 성격에 따라 저장 위치를 선택한다:

| 유형 | 저장 위치 | 예시 |
|------|-----------|------|
| **경량** — 짧은 설명 + 코드 스니펫 | `docs/knowledge/COMMON_ERROR_RESOLUTIONS.md` | ty 정적 분석 오류, Pydantic v2 마이그레이션 |
| **중량** — 상세 가이드, 아키텍처 결정 | `docs/knowledge/{topic}.md` | FHIR SMART on FHIR 연동, PostgreSQL 마이그레이션 |
| **행동 교정** — "함께 일하는 방식" | `.agents/memory/feedback_*.md` | 코드 스타일 선호, 리뷰 피드백 |

### 3단계: 콘텐츠 작성

#### 경량 자산 (`COMMON_ERROR_RESOLUTIONS.md`)

다음 형식을 준수한다:

```markdown
### N. [타입] 문제 요약
- **현상**: `error[...]: ...` 또는 오류 메시지 전체
- **원인**: 기술적 근본 원인 (1~2문장)
- **해결**: 정석적인 해결 방법 (코드 스니펫 포함)
- **적용 파일**: `[relative/path/to/file.py](relative/path/to/file.py)`
```

**작성 규칙**:
- 현상/원인/해결은 명확히 분리 (`Context → Issue → Correction` 구조)
- 코드 스니펫은 `❌ 오류` / `✅ 정석 해결` 쌍으로 제시
- 적용 파일은 **실제 수정된 파일 경로** (추측 아님)

#### 중량 자산 (`docs/knowledge/{topic}.md`)

다음 메타 헤더를 포함한다:

```markdown
# docs/knowledge/{topic}.md

## 문서 메타 (Version SSOT)
- **Last Verified**: YYYY-MM-DD
- **Tested Version**: (스택/버전 또는 기준 문서)
- **Min Supported**: (최소 지원 버전/조건)
- **Reference**: (관련 SSOT/외부 근거)

---

## 문제 정의
(발생 배경, 영향 범위)

---

## 해결 과정
(단계별 분석, 대안 비교, 채택 이유)

---

## 정석 해결 방법
(코드 예시, 적용 가이드)

---

## 관련 문서
| 문서 | 설명 |
|:---|:---|
| [`docs/knowledge/COMMON_ERROR_RESOLUTIONS.md`](../knowledge/COMMON_ERROR_RESOLUTIONS.md) | 경량 버전 |
```

### 4단계: 인덱스 갱신 (중량 자산만)

`docs/knowledge/{topic}.md` 생성 시 `docs/knowledge/INDEX.md`에 링크를 추가한다.

```bash
# 자동 인덱싱 스크립트 실행
python3 scripts/index_knowledge.py
```

### 5단계: 검증

```bash
# 이 레포 표준 — 세션에서 아직 안 돌렸다면 실행
bun run lint && bun run typecheck:strict && just ci
```

**검증 항목**:
- `docs/knowledge/COMMON_ERROR_RESOLUTIONS.md` 라인 수 (100라인 이내 권장)
- 생성된 링크가 실제 파일에 도달하는지 확인
- 한국어 텍스트 인코딩 (`python3 scripts/verify_korean_text.py --file docs/knowledge/COMMON_ERROR_RESOLUTIONS.md`, 스크립트 있을 때)

---

## 🛠️ 자동화 도구

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

## 📊 자산화 예시 (ty 정적 분석)

### 사례: `error[invalid-argument-type]: Expected 'Reference', found 'dict[str, str]'`

**판단**: 45분 소요 + 10회 이상 재발 → **자산화 YES**

**저장 위치**: `docs/knowledge/COMMON_ERROR_RESOLUTIONS.md` (경량)

**작성**:
```markdown
### 4. ty 정적 분석: FHIR Reference 타입 불일치
- **현상**: `error[invalid-argument-type]: Expected 'Reference', found 'dict[str, str]'`
- **원인**: FHIR 리소스의 `patient`, `subject` 필드가 `Reference` 객체를 기대하는데 `{"reference": "Patient/..."}` 같은 딕셔너리를 전달함.
- **해결**: `from fhir.resources.reference import Reference` 후 `Reference(reference="Patient/{id}")`로 생성하여 전달.
- **적용 파일**: 예) [`app/actions/events.ts`](../../app/actions/events.ts) — **FamilySync**에서는 실제 수정 파일 경로로 바꾼다.
```

---

## 🚨 예외 처리

### 이미 문서화된 패턴

`docs/knowledge/COMMON_ERROR_RESOLUTIONS.md` 또는 `docs/knowledge/{topic}.md`에 동일한 내용이 존재하는지 먼저 검색한다. 중복 시:
1. **기존 문서 업데이트**: 새 정보 추가 또는 코드 스니펫 갱신
2. **링크 연결**: 서로 다른 파일의 관련 섹션을 상호 참조

### 500라인 제한 (중량 자산)

`docs/knowledge/INDEX.md`가 500라인을 초과하면:
1. **계층적 인덱싱**: 하위 폴더별 인덱스 생성 (`docs/knowledge/certification/INDEX.md`)
2. **아카이브**: 오래된 문서를 `docs/knowledge/archive/`로 이동

---

## 📈 유지보수

### 세션 종료 시 점검
- [ ]이번 세션에서 해결한 문제가 자산화 대상인지 판단
- [ ]자산화 필요 시 `docs/knowledge/COMMON_ERROR_RESOLUTIONS.md` 또는 별도 파일에 기록
- [ ]인덱스 갱신 필요 시 `python3 scripts/index_knowledge.py` 실행

### 주간 점검
- [ ]`docs/knowledge/COMMON_ERROR_RESOLUTIONS.md` 라인 수 확인 (100라인 이내 권장)
- [ ]새로 추가된 자산의 링크 유효성 검증
- [ ]중복 패턴 병합 검토

---

## 📚 관련 문서

| 문서 | 설명 |
|:---|:---|
| [`docs/knowledge/COMMON_ERROR_RESOLUTIONS.md`](../knowledge/COMMON_ERROR_RESOLUTIONS.md) | 경량 해결 패턴 SSOT |
| [`docs/knowledge/INDEX.md`](../knowledge/INDEX.md) | 지식 인덱스 SSOT |
| [`.agents/memory/MEMORY.md`](../memory/MEMORY.md) | 세션 지식 인덱스 |
| [`AGENTS.md`](../../AGENTS.md) §2.3 | 문서 경계 (SSOT) 규약 |

---

## 📝 작성일
- **2026-04-18**: 최초 생성
