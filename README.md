# FamilySync MVP

가족 공동 육아/살림 상황을 실시간으로 공유하는 모바일 웹(PWA) 프로젝트입니다.
다중 양육자 환경에서 "누가, 언제, 무엇을 했는지"를 즉시 공유하고, 중복 실수(특히 투약)를 줄이는 것을 목표로 합니다.

## 프로젝트 상태 (2026-05-09 기준)

- **계획 문서**: `docs/plans/archive/20260509_familysync_mvp_blueprint.md`
- **요구사항 SSOT**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **핵심 불변·의사결정**: `PROJECT_RULES.md` §8 (Critical Logic)
- **구현 진행도**: Blueprint의 FS-001 ~ FS-015 **모두 done**
- **핵심 검증 이력**:
  - `bun run lint && bun run typecheck:strict && bun run test && bun run build` 통과
  - `node scripts/migrate-turso.mjs` 기반 Turso 마이그레이션 적용 검증
  - Google OAuth + 프로필 선택 + 대시보드 가드 플로우 검증
- **Supabase → Turso 치환 이력**(FS-001~FS-015 구현 시):
  - **FS-003**(RLS): Supabase RLS → Turso 마이그레이션으로 `application-level familyId` 검증으로 대체
  - **FS-009**(Realtime): Supabase Realtime → `revalidatePath`(RSC)로 대체
  - **FS-011**(care_guides): `care_guides` 테이블 → `quick_actions` 테이블로 통합(삭제)

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
- `db/migrations/`: Turso SQL 마이그레이션 (`0000_initial.sql`, `0001_quick_actions.sql`, `0002_drop_care_guides.sql`, `0003_events_timeline_idx.sql`, `0004_routine_checklist.sql`, …)
- `lib/`: 공통 유틸리티 — `auth/`(Auth.js 설정), `dashboard/`(대시보드 로직), `events/`(이벤트 CRUD), `homework/`(숙제 타입/완료 로그), `quick-actions/`(퀵 액션), `timeline/`(타임라인 렌더링) 등
- `types/`: 전역 TypeScript 타입 정의(`routine_items`, `routine_logs` 관련 타입 포함)
- `tests/e2e/`: Done Criteria 계약 테스트
- `docs/specs/`: PRD/TRD
- `docs/plans/`: 실행 Blueprint 및 계획 상태
- `.agents/memory/`: 세션 메모리 및 검증/이슈 이력
- `routine_items` + `routine_logs`: 루틴 체크리스트(일상 항목) UI/Server Actions — `lib/quick-actions/`, `app/(dashboard)/routine/` 경로에 구현

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

Turso 스키마 적용(원격 DB에 `TURSO_*` 설정 후). `bun run db:migrate`는 **`.env` → `.env.local` → `.env.vercel.dev` → `.env.vercel.prod`** 순으로 로드합니다(같은 키는 뒤 파일이 덮어씀). 운영 DB에 적용하려면 Vercel **Production**에 넣은 `TURSO_*`를 `.env.local`에 복사하거나, `vercel env pull .env.vercel.prod --environment production` 후 마이그레이션을 실행하세요. `--environment development`만 pull하면 `TURSO_*`가 비어 있을 수 있습니다. 스크립트는 `_turso_applied_migrations`에 적용된 `.sql` 파일명을 기록하므로 **이미 스키마가 있는 DB에서도** `0000` 재충돌 없이 이어서 적용할 수 있습니다.

```bash
bun run db:migrate
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

### Vercel에서 Auth.js `Server error`(There is a problem with the server configuration)

이 화면은 대부분 **필수 env가 비어 있거나**, OAuth 콜백 처리 중 **DB 예외**가 나 Auth.js가 `Configuration` 오류로 처리할 때 뜹니다(Auth.js는 `AdapterError` 등을 사용자에게 그대로 보여주지 않고 같은 형태로 감쌉니다). 아래를 **Production**(및 사용 중인 Preview)에서 순서대로 확인하세요.

**참고(DevTools)**: `/api/auth/error?error=Configuration` **문서** 응답이 HTTP **500**이어도, `@auth/core` 기본 HTML이 그렇게 내려주는 **정상 동작**일 수 있다(Next 라우트 전역 장애로 단정하지 말 것). 오판 방지 SSOT: `lib/auth/authjs-configuration-contract.ts` · 단위 테스트 `tests/unit/auth-configuration-diagnostics.test.ts`.

**빠른 점검(배포 후)**: 브라우저 또는 `curl`로 `https://<배포-도메인>/api/health` 를 열어 `checks`/`db`/`tables` 세 영역을 모두 확인하세요.

- `checks`에 `false`가 있으면 → 해당 env가 비어있음 → Vercel 프로젝트 환경변수에 추가 후 재배포
- `db`가 `"error"`이면 → Turso URL/토큰/네트워크 문제
- `tables`에 `false`가 있으면 → **Turso DB에 마이그레이션 미적용** → 로컬에서 운영 Turso credential을 export한 뒤 `bun run db:migrate` 실행

`error=Configuration` 페이지가 뜨는데 `/api/health`가 200이라면 거의 확실하게 `tables` 누락입니다(어댑터의 `users`/`accounts`/`sessions` 호출이 실패하면 Auth.js가 동일 페이지로 감싸서 보여줍니다).

1. **`AUTH_SECRET`**: Vercel 프로젝트에 반드시 설정(임의 긴 문자열, `openssl rand -base64 32` 등). 없으면 `MissingSecret`로 위 페이지가 납니다.
2. **`TURSO_DATABASE_URL`**, **`TURSO_AUTH_TOKEN`**: 없으면 서버가 DB 모듈 로드 시 실패하거나, 로그인 콜백에서 세션 저장에 실패할 수 있습니다. 설정 후 `bun run db:migrate`로 스키마 적용.
3. **`AUTH_GOOGLE_ID`**, **`AUTH_GOOGLE_SECRET`**: Google 콘솔의 클라이언트와 동일한지 확인.
4. **`AUTH_URL`**: 프로덕션 도메인과 정확히 일치하는지 확인(다른 프로젝트 URL이면 OAuth·쿠키가 꼬입니다).

원인 확인: Vercel 대시보드 → 해당 배포 → **Functions / Runtime Logs**에서 같은 시각의 스택 또는 Auth.js 로그를 확인합니다.

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
bun run vercel:sync-auth
```

그 다음 Vercel 대시보드에서 **`TURSO_DATABASE_URL`**, **`TURSO_AUTH_TOKEN`**을 Production/Development에 추가하고, 배포 후 `bun run db:migrate`로 스키마를 적용합니다. 레거시 `NEXT_PUBLIC_SUPABASE_*` 등은 제거해도 됩니다.

## 다음 단계

현재 MVP 핵심 범위(FS-001~FS-015)는 완료 상태입니다.
다음 이터레이션은 Blueprint에 명시된 후속 과제대로 **운영/관측 고도화(알림 품질, 장애 대응, 운영 자동화)** 중심의 2차 계획 수립이 권장됩니다.
