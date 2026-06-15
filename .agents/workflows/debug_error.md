---
scope: [".agents/workflows/debug_error.md"]
domain: "workflows"
situation: 심층 디버깅
trigger: /debug_error
level: Recommended
description: 코드 기반 심층 디버깅 워크플로우 - Frontend/Backend 전체 호출 흐름 추적 및 근본 원인 분석
version: 1.0.0
last_updated: 2026-05-06
---
<!-- Language: ko -->

# 🔍 코드 기반 심층 디버깅 워크플로우 (/debug)

이 워크플로우는 **콘솔 에러 또는 사용자 보고**에서 시작하여, **Frontend → Backend 전체 호출 흐름을 코드 기반으로 추적**하고 **근본 원인(Root Cause)** 을 분석한 후, 수정 사항을 구현하고 전달 프롬프트를 문서화하는 절차를 정의합니다.

---

## 입력·출력 요약

- **입력**: 브라우저 DevTools, 사용자 보고, HTTP 응답, 필요 시 기존 `error_logs/*.md` 붙여넣기
- **초점**: 코드 경로 추적 → 근본 원인 → 수정 구현 및 문서화
- **범위**: 브라우저·Next.js(App Router)·Server Actions·Route Handlers·Turso/Auth 전 구간
- **출력**: `docs/knowledge/debug/` 전달 문서; 장기·다단계 해결안은 `docs/plans/` Blueprint (`/plan`)로 이어짐

---

## 🚀 실행 프로세스

### 페이즈 A: 분석 (Steps 1-6)

#### 1단계: 에러 메시지 분석

- **동작**: 브라우저 DevTools Console 또는 네트워크 탭에서 에러 메시지 확인
- **체크리스트**:
  - [ ] API 호출 경로 (`GET /api/...` 등)
  - [ ] HTTP 상태 코드 (403, 500, 401 등)
  - [ ] 에러 유형 (`ApiError`, `NetworkError` 등)
  - [ ] 에러 발생 위치 (파일:라인 번호)
- **Output**: `[에러 유형]`, `[HTTP 경로]`, `[상태 코드]` 요약

**예시 (FamilySync)**:
```
에러 유형: Server Action 실패 / 500
HTTP 요청: POST /dashboard (또는 fetch /api/health)
에러 위치: app/(dashboard)/… 또는 lib/… — 스택 트레이스의 파일:라인
```

---

#### 2단계: 전체 스택 트레이스 추적

- **동작**: UI → Server Action / Route Handler → `lib/`·`db/` 를 `grep`·`read_file`로 추적
- **추적 순서**:
  1. UI 호출점 (`"use client"` 컴포넌트, `fetch`, 폼 `action`)
  2. Server Action 또는 `app/api/**/route.ts`
  3. `lib/auth`·`lib/*` 유효성·권한
  4. Drizzle 쿼리·`db/client` (Turso)
  5. 외부 연동(Auth.js, OAuth 콜백 등)
  6. 에러·리다이렉트·HTTP 응답 매핑
- **Output**: 호출 흐름 다이어그램 (텍스트 기반)

**예시 (FamilySync)**:
```
[UI] app/(dashboard)/QuickActionPanel.tsx
  └─ form action → createEvent (Server Action)

[Server] app/actions/events.ts
  └─ getActiveProfileContext() → family_id 검증
     └─ db.insert(events) … → Turso 오류 시 500 / 로그
```

---

#### 3단계: 핵심 파일 목록 작성

- **동작**: 관련 파일의 경로, 역할, 중요 코드 스니펫 정리
- **분류**: Frontend / Backend 로 구분하여 표 형식 작성
- **포함 항목**: 파일 경로, 역할 설명, 중요 코드 스니펫 (필요시)
- **Output**: 핵심 파일 목록 테이블

**예시 (FamilySync)**:
| 파일 | 경로 | 역할 |
|------|------|------|
| `dashboard/page.tsx` | `app/(dashboard)/dashboard/` | 대시보드 SSR·퀵 액션 데이터 로드 |
| `events.ts` | `app/actions/` | 이벤트 생성·실행 취소 Server Actions |
| `session.ts` | `lib/auth/` | 프로필·가족 문맥 (`getActiveProfileContext`) |
| `schema.ts` | `db/` | Drizzle 스키마 |
| `route.ts` | `app/api/health/` | DB·테이블 가용성 점검 |

---

#### 4단계: 잠재적 문제 지점 가설 수립 (H1, H2, ...)

- **동작**: 호출 흐름 분석 기반 가능성 순서대로 잠재적 문제 지점 가설 작성
- **형식**: `H1: [가장 유력]`, `H2: [다음 가능성]`, ...
- **각 가설 포함 항목**: 위치 (파일:라인), 로직 설명, 확인 방법, 영향
- **Output**: 가설 리스트 (H1, H2, ...)

**예시 (B007)**:
```
H1: 환자 동의 레코드 누락 (가장 유력)
  위치: external_inquiry_service.py:58-60
  로직: consent_repo.get_by_patient_category() → status != ACTIVE 시 ConsentRequiredError(403)
  확인: DB patient_interop_consents 테이블에서 대상 patient_id 의 category='common', status='active' 레코드 존재 여부

H2: Redis 연결 실패 (캐시 폴백)
  위치: redis_client.py:36-49
  로직: Redis 연결 실패 시 get() 항상 None → 폴백으로 외부 API 호출
  영향: 캐시 미스 빈번 (기능은 동작)

H3: RBAC 권한 문제
  위치: auth_permissions.py:109
  로직: B007RecordAccess = Depends(RoleChecker(["doctor", "nurse"]))
  영향: 로그인 사용자 roles 에 doctor/nurse 없으면 403 Forbidden
```

---

#### 5단계: 환경 설정 및 데이터 모델 검증

- **동작**: DB 스키마, 시드 데이터, 환경 변수 확인
- **검증 항목**:
  - [ ] `.env.example` 기준 환경 변수 (`DATABASE_URL`, `REDIS_URL`)
  - [ ] DB 스키마 (테이블 구조, 컬럼 타입)
  - [ ] 시드 데이터 생성 스크립트 (`scripts/seed/`)
  - [ ] Mock 데이터 (외부 API 클라이언트의 고정 응답)
- **Output**: 환경 설정 요약 + 시드 데이터 생성 방법

**예시 (B007)**:
```
.env.example 기준:
  DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/emr
  REDIS_URL=redis://127.0.0.1:6379/0

Mock 데이터 (central_repository_client.py):
  search_patient_records() → 고정 Mock 2건 반환
  → 외부 API 연동이 아님, 문제는 DB 동의 검증 또는 인증/인가 레이어
```

---

#### 6단계: 핵심 문제 발견 (Root Cause)

- **동작**: 가설 검증 결과 기반 근본 원인 식별
- **확인 방법**:
  - [ ] 백엔드 서버 로그 검색 (`[B007]` 태그 등)
  - [ ] DB 쿼리 검증 (`SELECT * FROM ...`)
  - [ ] Redis 상태 확인 (`redis-cli ping`)
  - [ ] JWT 토큰 검증 (브라우저 DevTools → jwt.io)
- **Output**: 근본 원인 명확히 식별 + HTTP 상태 코드에 따른 에러 매핑 테이블

**예시 (B007)**:
```
핵심 문제: 카테고리 불일치
  시드 스크립트 (seed_b001_b002_interop_consent.py): category="clinical", "research" 사용
  B007 API (external_inquiry_service.py:58): ConsentCategory.COMMON.value="common" 조회
  결과: 시드 데이터가 있어도 B007 API 는 "동의 레코드 없음" 으로 403 반환
```

---

### 페이즈 B: 대응 (Steps 7-8)

#### 7단계: 수정 사항 구현

- **동작**: 근본 원인 기반 수정 사항 적용
- **유형**:
  - [ ] 시드 데이터 보강 (카테고리 불일치 해결 등)
  - [ ] 디버깅 로깅 추가 (프론트엔드 콘솔, 백엔드 서버 로그)
  - [ ] 코드 수정 (카테고리 매핑 로직 등)
  - [ ] 환경 설정 변경
- **Output**: 적용된 수정 사항 목록 + 적용 방법 (명령어)

**예시 (FamilySync)**:
```bash
# 1. Turso 스키마·시드 이슈면 마이그레이션 재실행(README 참고)
npm run db:migrate

# 2. 로컬 앱 재기동
bun run dev

# 3. 헬스·계약 테스트
curl -sS http://localhost:3000/api/health
bun run test
```

---

#### 8단계: 전달 프롬프트 문서화

- **동작**: `docs/knowledge/debug/` 디렉토리에 종합 디버깅 문서 생성
- **파일명 형식**: `docs/knowledge/debug/{YYYYMMDD}_{TASK_ID}_{brief_description}.md`
- **포함 내용**:
  - 문제 요약 (에러 유형, HTTP 경로, 에러 위치)
  - 전체 스택 트레이스 (Frontend → Backend 호출 흐름)
  - 핵심 파일 목록 및 상태
  - 잠재적 문제 지점 가설 (H1, H2, ...)
  - 환경 설정 및 데이터 모델
  - 디버깅 체크리스트
  - HTTP 응답 및 에러 매핑 테이블
  - 핵심 문제 발견 및 조치 완료 사항
  - 추가 정보 (프로젝트 배경, 기술 스택)
- **Output**: `docs/knowledge/debug/` 디렉토리 내 문서 생성

**참고**: 이 문서는 다른 LLM, 팀원, 또는 후속 세션과 공유하여 동일한 문제를 빠르게 해결할 수 있도록 합니다.

---

## 📋 분석 가이드 (Prompting)

- **"왜 발생했는가?"** 에 그치지 않고, **"어떤 코드 경로로 인해 근본 원인이 발생하는가?"** 를 반드시 추적합니다.
- `AGENTS.md` 의 Allowlist 기술 스택을 벗어나지 않는 해결책을 제시합니다.
- 가설 (H1, H2, ...) 은 **가능성 순**으로 작성하고, 각 가설에 **확인 방법**을 명시합니다.
- 분석 결과 중 `docs/specs/` 명세와 충돌하는 부분이 발견되면, `PROJECT_RULES.md` §8에 기록합니다.

---

## ✅ Definition of Done (DoD)

- [ ] 브라우저 콘솔 에러에서 실제 API 호출 경로와 에러 유형이 파악됨.
- [ ] Frontend → Backend 전체 호출 흐름이 코드 기반으로 추적됨.
- [ ] 핵심 파일 목록 (경로, 역할, 중요 코드) 이 정리됨.
- [ ] 잠재적 문제 지점 가설 (H1, H2, ...) 이 가능성 순으로 작성됨.
- [ ] 환경 설정 (DB 스키마, 시드 데이터, 환경 변수) 이 검증됨.
- [ ] 근본 원인 (Root Cause) 이 명확히 식별됨.
- [ ] 수정 사항이 구현되고 적용 방법이 문서화됨.
- [ ] 전달 프롬프트가 `docs/knowledge/debug/` 에 생성됨.
- [ ] 필요 시 `error_logs/*.md` 를 정리·갱신하고, Blueprint가 필요하면 `/plan` 으로 `docs/plans/` 설계를 진행함.

---

## Blueprint 연계 (`/plan`)

`/debug_error` 분석 중 근본 원인이 복잡하여 실행 계획 문서가 필요한 경우:

1. 단계 6에서 근본 원인을 식별한다.
2. 필요하면 `error_logs/{TASK_ID}_{brief}.md` 에 맥락을 남긴다.
3. `/plan` 으로 Blueprint를 작성하고 `docs/plans/` 에 반영한 뒤, 후속 세션에서 구현한다.
