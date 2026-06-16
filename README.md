# FamilySync MVP

가족 공동 육아/살림 상황을 실시간으로 공유하는 모바일 웹(PWA) 프로젝트입니다. 다중 양육자 환경에서 "누가, 언제, 무엇을 했는지"를 즉시 공유하고, 중복 실수(특히 투약)를 줄이는 것을 목표로 합니다.

## 프로젝트 상태

- **버전**: 0.1.0
- **핵심 범위**: MVP 핵심 기능 (FS-001 ~ FS-015) **모두 완료**
- **요구사항 SSOT**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **핵심 불변·의사결정**: `PROJECT_RULES.md` §8 (Critical Logic)
- **실행 프로토콜**: `AGENTS.md`
- **최근 주요 업데이트**(2026-06 기준):
  - 투약 중복 constraint 위반 방지 (CORE-04)
  - 하이드레이션 불일치 해결 + DashboardDeferred try/catch (RELIAB-02/03)
  - 프로필 소프트 삭제 + 로그 revert 가드 (CORE-02)
  - 고정 child ID/action_type 중앙화 (`lib/children.ts`) (SSOT-01)
  - `/admin` 인라인 섹션 → 서브모달 리팩토링 (UI-03)
  - GitHub Actions 자동 마이그레이션 파이프라인 (INFRA-01)
  - UNIQUE 제약 추가 + 프로필 삭제 UI (DB-01)

## 핵심 기능 구현 현황

### 인증/권한
- Google OAuth 로그인 (Auth.js v5 beta + DB 세션 어댑터)
- Netflix 스타일 2-depth 프로필 선택
- `active_profile_id` 쿠키 기반 대시보드 접근 가드
- 관리자(`admin`) 권한 가드 + `FAMILY_CO_ADMIN_EMAILS` 기반 공동 관리자 자동 승격
- 프로필 소프트 삭제 (`is_deleted`) + revert 가드

### 대시보드/이벤트
- 퀵 액션(식사, 투약, 등하원, 집안일 등) 이벤트 생성
- 3열 타임라인(어제/오늘/내일) — 주말 열 시각 구분
- Undo(취소) 처리 — 투약 30분, 기타 24시간 윈도우
- 투약 2시간 중복 차단 + `metadata.override` 강행 플로우
- `revalidatePath("/dashboard")` 기반 RSC 실시간 갱신
- 하이드레이션 불일치 방지 + try/catch 격리

### 가족 운영 기능
- **숙제**: 타입 관리 + 완료 로그 (`homework_types`, `homework_logs`)
- **일일 지시사항**(Daily Pin): 가족당 활성 1개 제약, 고정 및 해제
- **루틴 체크리스트**: `routine_items`(마스터) + `routine_logs`(날짜별 완료)
- **퀵 액션**: 라벨·타겟·정렬 순서 관리, 대시보드 바로가기

### 관리자 페이지 (`/admin`)
- 퀵 액션 CRUD (서브모달)
- 숙제 타입 CRUD (서브모달)
- 루틴 항목 CRUD (서브모달)
- 프로필 삭제 UI

### 배포/품질
- PWA 메타데이터 및 매니페스트
- Storybook 컴포넌트 스토리 (대시보드, 서브모달, 관리자 섹션)
- E2E 계약 테스트 + 단위 테스트 (Node + Bun)
- lint/type/test/build 기반 최소 CI 게이트

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js (App Router), React, TailwindCSS |
| **Backend/Auth** | Auth.js v5 beta (Google OAuth, DB Session) |
| **Data** | Turso (libSQL) + Drizzle ORM (`mode: "timestamp_ms"`) |
| **검증** | Zod v4 |
| **배포** | Vercel + GitHub Actions (자동 마이그레이션) |
| **테스트** | Node test runner (E2E) + Bun (unit/integration) |
| **Component** | Storybook v10.3.6 |

## 데이터베이스 스키마

### Auth.js 테이블 (5)
`users`, `accounts`, `sessions`, `verificationTokens`, `authenticators` — `@auth/drizzle-adapter` 자동 관리

### FamilySync 핵심 테이블 (9)
| 테이블 | 주요 필드 | 설명 |
|--------|-----------|------|
| `families` | `id`, `name`, `invite_code` | 가족 단위 |
| `user_families` | `user_id`, `family_id` | 사용자-가족 매핑 |
| `profiles` | `id`, `family_id`, `name`, `role`, `is_deleted` | 프로필 (admin/executor) |
| `events` | `id`, `family_id`, `profile_id`, `action_type`, `target`, `metadata`, `is_reverted` | 타임라인 이벤트 |
| `daily_pins` | `id`, `family_id`, `content`, `is_active` | 일일 지시사항 |
| `homework_types` | `id`, `family_id`, `child_group`, `title`, `is_active` | 숙제 타입 |
| `homework_logs` | `id`, `family_id`, `homework_type_id`, `date_key`, `completed_by` | 숙제 완료 로그 |
| `quick_actions` | `id`, `family_id`, `label`, `action_type`, `target`, `sort_order` | 퀵 액션 설정 |
| `routine_items` | `id`, `family_id`, `title`, `target`, `sort_order` | 루틴 항목 마스터 |
| `routine_logs` | `id`, `family_id`, `routine_item_id`, `date_key`, `completed_by` | 루틴 완료 로그 |

## 마이그레이션 이력

| # | 파일 | 설명 |
|---|------|------|
| 0 | `0000_initial.sql` | 초기 스키마 (families, profiles, events 등) |
| 1 | `0001_quick_actions.sql` | quick_actions 테이블 추가 |
| 2 | `0002_drop_care_guides.sql` | care_guides 테이블 제거 (MVP 제외) |
| 3 | `0003_events_timeline_idx.sql` | events 타임라인 인덱스 |
| 4 | `0004_routine_checklist.sql` | routine_items, routine_logs 추가 |
| 5 | `0005_events_duplicate_guard.sql` | 이벤트 중복 방지 |
| 6 | `0006_add_unique_constraints.sql` | 테이블별 UNIQUE 제약 |
| 7 | `0007_soft_delete_columns.sql` | soft delete (`is_deleted`) 지원 |

## 디렉토리 개요

- `app/`: 라우트, 화면, Server Actions, API Routes
  - `(auth)/` — 로그인, 프로필 선택
  - `(dashboard)/` — 대시보드, 타임라인, 퀵 액션, 서브모달
  - `(admin)/` — 관리자 페이지 (역할 가드)
  - `actions/` — Server Actions (auth, events, admin)
  - `api/` — API Routes (health check, Auth.js)
- `db/migrations/`: Turso SQL 마이그레이션 (8개)
- `lib/`: 공통 유틸리티 — `auth/`, `events/`, `dashboard/`, `quick-actions/`, `homework/`, `timeline/`, `children.ts` 등
- `types/`: 전역 TypeScript 타입 정의
- `tests/`: E2E 계약 테스트, 단위 테스트
- `docs/specs/`: PRD/TRD
- `docs/plans/`: 실행 Blueprint 및 계획 상태 (아카이브)
- `.agents/memory/`: 세션 메모리 및 검증/이슈 이력
- `scripts/`: 마이그레이션, plan lint, memory verify 등 운영 스크립트

## Getting Started

### 필수 도구

| 도구 | 버전 | 설치 방법 |
|------|------|-----------|
| **Bun** | `>=1.1.0` | `curl -fsSL https://bun.sh/install | bash` |
| **Node.js** | `>=20.0.0` | [nodejs.org](https://nodejs.org) 또는 `fnm`, `nvm` |
| **just** | 최신 | `brew install just` (macOS), [github.com/casey/just](https://github.com/casey/just) |
| **Git** | 최신 | 기본 내장 또는 [git-scm.com](https://git-scm.com) |

> **참고**: 프로젝트는 Bun을 주요 런타임으로 사용합니다. E2E 테스트와 마이그레이션 스크립트는 Node.js에서 실행됩니다.

### 1단계: Clone & Install

```bash
git clone <repository-url>
cd todo
bun install
```

`bun.lock` 파일이 이미 있으므로 `bun install`은 **동일한 버전**을 설치합니다.

### 2단계: 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값을 채웁니다.

#### Turso 데이터베이스 (필수)

1. [turso.tech](https://turso.tech)에서 계정 생성
2. New Database → 이름 입력 (예: `familysync-dev`)
3. `Database URL` 복사 → `TURSO_DATABASE_URL`에 붙여넣기
4. `Auth Tokens` → Generate Token → 토큰 복사 → `TURSO_AUTH_TOKEN`에 붙여넣기

```bash
# .env 예시
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=http://localhost:3000
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Google OAuth (필수)

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
3. Application type: `Web application`
4. Authorized redirect URIs 추가:
   - 로컬: `http://localhost:3000/api/auth/callback/google`
   - 프로덕션: `https://<도메인>/api/auth/callback/google`
5. Client ID → `AUTH_GOOGLE_ID`, Client Secret → `AUTH_GOOGLE_SECRET`에 붙여넣기

#### AUTH_SECRET 생성 (로컬 개발용)

```bash
openssl rand -base64 32
```

### 3단계: 데이터베이스 마이그레이션

```bash
bun run db:migrate
```

`db/migrations/` 디렉토리의 SQL 파일이 Turso DB에 적용됩니다.

### 4단계: 개발 서버 실행

```bash
bun run dev
```

[http://localhost:3000](http://localhost:3000)에서 앱 확인.

### 검증

```bash
just verify    # lint + typecheck + test 전체 실행
just ci        # CI 게이트 (TDD gate, DDD boundary 등 포함)
```

Auth.js `error=Configuration` 관련 계약 테스트: `tests/unit/auth-configuration-diagnostics.test.ts`, `lib/auth/authjs-configuration-contract.ts`

### Vercel 배포 (선택)

```bash
# Vercel CLI 설치
npm i -g vercel

# Vercel 로그인
vercel login

# 배포
vercel

# 환경변수 동기화 (로컬 → Vercel development 환경)
npx vercel env pull .env.vercel.dev --environment development --yes --scope <your-scope>
bun run vercel:sync-auth
```

### 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| `bun: command not found` | Bun 미설치 | 위 필수 도구 테이블 참조 |
| `node: command not found` | Node 미설치 | Bun과 별개로 Node.js도 필요 (E2E 테스트용) |
| `just: command not found` | just 미설치 | `brew install just` |
| `There is a problem with the server configuration` | env 누락 또는 DB 미적용 | `/api/health` 엔드포인트 확인, `bun run db:migrate` 재실행 |
| `bun.lock` 불일치 | 다른 패키지 매니저(pnpm/npm)로 install 시도 | 반드시 `bun install` 사용 |
| `TURSO_DATABASE_URL not set` | .env 파일 누락 | `.env.example` 복사 후 값 채움 |
| E2E 테스트 실패 (`node --test`) | Node.js 버전 불일치 | Node `>=20.0.0` 사용 |

## 검증 명령어

```bash
bun run lint              # ESLint
bun run typecheck:strict  # tsc --noEmit
bun run test              # E2E (Node) + 단위 (Bun)
bun run build             # Next.js 빌드
```

전체 검증: `just verify` (lint + typecheck + test)
CI 게이트: `just ci`

## Turso 마이그레이션

```bash
bun run db:migrate
```

`bun run db:migrate`는 **`.env` → `.env.local` → `.env.vercel.dev` → `.env.vercel.prod`** 순으로 `TURSO_*`를 로드합니다. 적용한 `.sql` 파일명은 `_turso_applied_migrations` 테이블에 기록되므로, 이미 스키마가 있는 DB에서도 `0000` 재충돌 없이 이어서 적용할 수 있습니다.

## 환경 변수

프로젝트 루트의 `.env.local`/`.env`에 설정합니다 (`.env.example` 참고).

| 변수 | 필수 | 설명 |
|------|------|------|
| `AUTH_SECRET` | 예 | Auth.js 서명 키 |
| `AUTH_GOOGLE_ID` | 예 | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | 예 | Google OAuth Client Secret |
| `AUTH_URL` | 예 (배포) | 프로덕션 도메인 |
| `TURSO_DATABASE_URL` | 예 | Turso 데이터베이스 URL |
| `TURSO_AUTH_TOKEN` | 예 | Turso 인증 토큰 |
| `NEXT_PUBLIC_SITE_URL` | 예 | 앱 베이스 URL (로컬: `http://localhost:3000`) |
| `FAMILY_CO_ADMIN_EMAILS` | 선택 | 공동 관리자 승격 대상 이메일 (쉼표 구분) |
| `FAMILYSYNC_DASHBOARD_PERF` | 선택 | 대시보드 성능 로깅 (`1`) |

### Vercel에서 Auth.js `Server error`(There is a problem with the server configuration)

이 화면은 대부분 **필수 env가 비어 있거나**, OAuth 콜백 처리 중 **DB 예외**가 나서 Auth.js가 `error=Configuration` 쿼리 파라미터와 함께 응답할 때 뜹니다.

**빠른 점검**: `curl https://<배포-도메인>/api/health` 로 `checks`/`db`/`tables` 세 영역을 모두 확인하세요. 상세 원인 분석은 `lib/auth/authjs-configuration-contract.ts` 참조.
- `checks`에 `false` → env 누락 → Vercel 환경변수 추가 후 재배포
- `db`가 `"error"` → Turso URL/토큰/네트워크 문제
- `` `tables` ``에 `false` → **Turso DB에 마이그레이션 미적용** → `bun run db:migrate` 실행

### Google OAuth 설정

Google Cloud Console의 **Authorized redirect URIs**에 다음을 추가합니다.
- 프로덕션: `https://<배포-도메인>/api/auth/callback/google`
- 로컬: `http://localhost:3000/api/auth/callback/google`

### Vercel에 Auth 환경변수 일괄 반영

```bash
npx vercel env pull .env.vercel.dev --environment development --yes --scope savior714s-projects
bun run vercel:sync-auth
```

## 다음 단계

현재 MVP 핵심 범위(FS-001~FS-015)는 완료 상태입니다.
다음 이터레이션은 Blueprint에 명시된 후속 과제대로 **운영/관측 고도화(알림 품질, 장애 대응, 운영 자동화)** 중심의 2차 계획 수립이 권장됩니다.
