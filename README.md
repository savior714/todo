# FamilySync MVP

가족 공동 육아/살림 상황을 실시간으로 공유하는 모바일 웹(PWA) 프로젝트입니다.
다중 양육자 환경에서 "누가, 언제, 무엇을 했는지"를 즉시 공유하고, 중복 실수(특히 투약)를 줄이는 것을 목표로 합니다.

## 프로젝트 상태 (2026-05-09 기준)

- **계획 문서**: `docs/plans/20260509_familysync_mvp_blueprint.md`
- **요구사항 SSOT**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **구현 진행도**: Blueprint의 FS-001 ~ FS-015 **모두 done**
- **핵심 검증 이력**:
  - `bun run lint && bun run typecheck:strict && bun run test && bun run build` 통과
  - `node scripts/migrate-turso.mjs` 기반 Turso 마이그레이션 적용 검증
  - Google OAuth + 프로필 선택 + 대시보드 가드 플로우 검증

## 핵심 기능 구현 현황

### 완료된 범위

- **인증/권한**
  - Google OAuth 로그인
  - 프로필 선택(Netflix 스타일 2-depth)
  - `active_profile_id` 쿠키 기반 대시보드 접근 가드
  - 관리자(`admin`) 권한 가드

- **대시보드/이벤트**
  - 퀵 액션(식사, 투약, 집안일 등) 이벤트 생성
  - 타임라인 이벤트/Undo 반영
  - Undo(취소) 처리 + `is_reverted` 필터링
  - 투약 2시간 중복 차단 + 강행(override) 플로우

- **가족 운영 기능**
  - 숙제 타입/완료 로그 관리
  - 가이드 등록 및 `linked_action` 기반 컨텍스트 힌트 노출
  - 오늘의 지시사항(Daily Pin) 고정 및 가족당 활성 1개 제약

- **배포/품질**
  - PWA 메타데이터 및 매니페스트
  - E2E 계약 테스트(`tests/e2e/done-criteria.contract.test.mjs`)
  - lint/type/test/build 기반 최소 CI 게이트

## 기술 스택

- **Frontend**: Next.js (App Router), React, TailwindCSS
- **Backend/Auth**: Auth.js (Google OAuth, DB Session)
- **Data**: Turso (libSQL) + Drizzle ORM
- **배포**: Vercel
- **테스트**: Node test runner 기반 E2E 계약 테스트

## 디렉토리 개요

- `app/`: 라우트, 화면, Server Actions
- `db/migrations/`: Turso SQL 마이그레이션 (`0000_initial.sql`)
- `tests/e2e/`: Done Criteria 계약 테스트
- `docs/specs/`: PRD/TRD
- `docs/plans/`: 실행 Blueprint 및 계획 상태
- `docs/memory/`: 세션 메모리 및 검증/이슈 이력

## 로컬 실행

```bash
bun install
bun run dev
```

## 검증 명령어

```bash
bun run lint
bun run typecheck:strict
bun run test
bun run build
```

Turso 스키마 적용(원격 DB에 `TURSO_*` 설정 후):

```bash
npm run db:migrate
```

## 환경 변수

프로젝트 루트의 `.env.local`/`.env`에 Auth.js/Turso 값을 설정해야 합니다. 템플릿은 `.env.example` 참고.

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_URL` (배포 주소, 예: `https://todo-nine-mu-90.vercel.app`)
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `NEXT_PUBLIC_SITE_URL` (예: 로컬 `http://localhost:3000`, 프로덕션과 동일 도메인 권장)

### Google OAuth (Auth.js)

`AUTH_URL`은 **지금 브라우저로 접속한 도메인과 같아야** 합니다. NextAuth는 이 값이 있으면 OAuth `redirect_uri`를 고정하므로, Vercel Preview가 Production의 `AUTH_URL`(예: 다른 배포 URL)을 물려받으면 구글 로그인 뒤 그 주소로 넘어갑니다. 이 레포는 **Preview**에서 `instrumentation.ts`가 `AUTH_URL`을 제거해 현재 호스트를 쓰게 합니다(해당 Preview URL이 Google 콘솔에 없으면 `redirect_uri_mismatch`가 날 수 있어, 프리뷰 OAuth는 별도 OAuth 클라이언트·리다이렉트 등록이 필요할 수 있습니다).

로컬 개발 시에는 `.env.local`에 `NEXT_PUBLIC_SITE_URL=http://localhost:3000`인데 `AUTH_URL`만 프로덕션으로 두지 마세요. 프로덕션 전용 `AUTH_URL`은 Vercel **Production** 환경에만 두는 것이 안전합니다.

Google Cloud Console의 **Authorized redirect URIs**에 다음을 추가합니다.

- 프로덕션: `https://<배포-도메인>/api/auth/callback/google` (예: `https://todo-nine-mu-90.vercel.app/api/auth/callback/google`)
- 로컬: `http://localhost:3000/api/auth/callback/google`

### Vercel에 Auth 환경변수 일괄 반영

기존 Vercel에 `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`가 **Development** 환경에 실값으로 남아 있다면, 아래로 `AUTH_*`로 복사할 수 있습니다(Production pull은 값이 비는 경우가 있어 Development pull을 사용).

```bash
npx vercel env pull .env.vercel.dev --environment development --yes --scope savior714s-projects
npm run vercel:sync-auth
```

그 다음 Vercel 대시보드에서 **`TURSO_DATABASE_URL`**, **`TURSO_AUTH_TOKEN`**을 Production/Development에 추가하고, 배포 후 `npm run db:migrate`로 스키마를 적용합니다. 레거시 `NEXT_PUBLIC_SUPABASE_*` 등은 제거해도 됩니다.

## 다음 단계

현재 MVP 핵심 범위(FS-001~FS-015)는 완료 상태입니다.
다음 이터레이션은 Blueprint에 명시된 후속 과제대로 **운영/관측 고도화(알림 품질, 장애 대응, 운영 자동화)** 중심의 2차 계획 수립이 권장됩니다.
