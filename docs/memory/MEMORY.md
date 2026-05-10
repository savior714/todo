# MEMORY

## Session Notes
- 2026-05-10: `error=Configuration`이 DB(Adapter) 실패일 수 있음을 README에 명시하고, 배포 후 `GET /api/health`로 env 플래그·`SELECT 1` Turso ping을 확인할 수 있게 `app/api/health/route.ts`·계약 테스트 추가.
- 2026-05-10: Auth.js 기본 `Server error`(Configuration) 대응으로 `auth.ts`에 `secret: process.env.AUTH_SECRET` 명시, README에 Vercel 점검 체크리스트 추가, `instrumentation.ts`에서 Vercel 시 `AUTH_SECRET`/`TURSO_DATABASE_URL` 공백 시 stderr 로그, 계약 테스트에 secret 바인딩 검증 추가.
- 2026-05-10: 구글 로그인이 다른 배포로 넘어가는 원인(Auth.js가 `AUTH_URL`로 OAuth redirect 고정, Preview가 Production `AUTH_URL` 상속, 로컬에서 `AUTH_URL`만 프로덕션인 경우)에 대응해 루트 `instrumentation.ts`에서 Preview·로컬 호스트 불일치 시 `AUTH_URL`/`NEXTAUTH_URL` 제거, `scripts/sync-vercel-authjs-env.mjs`에 `AUTH_URL_PRODUCTION`/CLI URL·경고 추가, README에 배포 도메인·콘솔 redirect 정합성 안내 보강.
- 2026-05-10: Turso+Auth.js 전환 후속으로 `events.createUser`에서 가족/프로필 자동 시드(`lib/auth/bootstrap-family.ts`), `daily_pins` 부분 유니크 인덱스(SQL+Drizzle) 정리, `next build` 시 `TURSO_DATABASE_URL` 없을 때 임시 sqlite 폴백(`db/client.ts`), `.env.example`·README(Vercel/Google redirect·`npm run vercel:sync-auth`) 보강, `vercel` devDependency 및 동기화 스크립트 추가. Vercel `AUTH_*` 키는 프로젝트에 이미 존재함(`vercel env ls` 확인); `TURSO_*`는 대시보드에서 추가 후 `npm run db:migrate` 필요.
- 2026-05-09: 루트 `README.md`를 신규 작성해 PRD/TRD/Blueprint 기준의 구현 현황(FS-001~FS-015 done), 실행/검증 명령, 다음 단계(운영·관측 고도화)를 반영함.
- 2026-05-09: FS-011 누락분(퀵액션 하단 linked_action 힌트)을 Red→Green으로 보완해 `dashboard/page.tsx`에서 가이드 힌트를 로딩하고 `QuickActionPanel.tsx`에 액션별 힌트를 노출하도록 완료함.
- 2026-05-09: 세션 부트스트랩 완료. `AGENTS.md`, `PROJECT_RULES.md`, `docs/specs/PRD.md`, `docs/specs/TRD.md`를 로드함.
- 2026-05-09: Blueprint `FS-001(Task 1.1)` 수행으로 Next.js 초기 스캐폴딩 및 실행 스크립트 정렬을 완료함.
- 2026-05-09: FS-002/003 SQL 및 FS-004/005 인증·쿠키 가드 구현을 진행함.
- 2026-05-09: FS-006/007/008/009의 이벤트 생성·강행·Undo·Realtime 타임라인 코드를 연속 구현함.
- 2026-05-09: FS-010/011/012의 숙제·가이드·핀 및 관리자 가드 기본 흐름을 추가 구현함.
- 2026-05-09: Docker 기반 로컬 Supabase를 실제 기동하고 DB reset으로 마이그레이션 적용 검증을 완료함.
- 2026-05-09: Next.js dev/build 런타임 검증 중 `/dashboard` 라우트 누락을 발견해 경로를 보정하고 가드 리다이렉트를 실제 HTTP 응답으로 확인함.
- 2026-05-09: OAuth 실사용 검증에서 Google provider 비활성(400 validation_failed) 블로커를 확인함.
- 2026-05-09: Google provider 활성화/redirect URI 보정 후 authorize 302까지는 진행되나 client_id 실값 미주입으로 최종 OAuth가 차단됨.
- 2026-05-09: `.env` 주입 후 Supabase 재시작으로 Google authorize URL에 실제 client_id 반영을 확인함.
- 2026-05-09: Phase 5(FS-013~015) 구현으로 오프라인 토스트, PWA 메타데이터, E2E 계약 테스트/배포 설정을 추가함.
- 2026-05-09: 실사용 확인 결과 `localhost` 단일 호스트에서 Google 로그인 완료 후 진입이 정상 동작하여 FS-004를 done으로 전환함.

## Decisions
- 2026-05-09: `/plan` 요청에 따라 PRD/TRD 기반 구현 Blueprint를 `docs/plans/`에 신규 작성하기로 결정.
- 2026-05-09: 구현 순서를 안전성 우선(멀티테넌시/RLS/투약 차단)으로 재정렬하고, FS-001~FS-015 저수준 Task로 분해함.

## Verification Findings
- 2026-05-09: `justfile`의 `ci` 레시피에 `just memory-verify`를 포함해 세션 종료 전 메모리 위생 검증이 자동 수행되도록 동기화함.
- 2026-05-09: `just ci` 실행 시 `lint-fix`, `plans-index`, `memory-verify` 순으로 통과하고 `ci: minimal checks passed`를 확인함.
- 2026-05-09: linked_action 힌트 계약 테스트를 추가한 직후 `bun run test`에서 1건 실패(Red) 확인 후 구현 반영 뒤 재실행으로 PASS(Green) 전환.
- 2026-05-09: `bun run lint && bun run typecheck:strict && bun run build` 재검증 통과.
- 2026-05-09: `bunx supabase db reset` 재실행 성공으로 `0001_init.sql` 재적용 및 로컬 DB 상태 정상 확인.
- 2026-05-09: FS-006~FS-015 상태를 `done`으로 갱신한 뒤 `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` 재검증 예정.
- 2026-05-09: 세션 종료 위생 점검용 `just memory-verify`는 Justfile에 recipe 부재로 실패하여 별도 도구 추가 또는 AGENTS 규칙 정합화가 필요함.
- 2026-05-09: 필수 파일 점검 결과 `docs/memory/MEMORY.md`는 세션 중 생성됨.
- 2026-05-09: `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` 실행 시 스크립트 경로 부재로 실패(`No such file or directory`).
- 2026-05-09: `python3 script/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` 재실행 결과 PASS 확인.
- 2026-05-09: 사용자 수정 후 `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` 실행 PASS 확인.
- 2026-05-09: Task 1.1 구현 후 `bun run lint`, `bun run typecheck:strict` 모두 통과.
- 2026-05-09: Task 1.1 반영 후 `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` PASS 확인.
- 2026-05-09: `bunx supabase db lint` 실행 시 로컬 DB `127.0.0.1:54322` 연결 거부로 실패하여 DB 검증이 환경 블로커 상태.
- 2026-05-09: FS-004/005 구현 후 `bun run lint`, `bun run typecheck:strict` 모두 통과.
- 2026-05-09: 상태 반영 후 `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` PASS 확인.
- 2026-05-09: FS-006~FS-009 구현 후에도 `bun run lint`, `bun run typecheck:strict` 통과 유지.
- 2026-05-09: FS-002~FS-009 상태 갱신 후 `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` PASS 확인.
- 2026-05-09: FS-010~FS-012 구현 후 `bun run lint`, `bun run typecheck:strict` 통과 확인.
- 2026-05-09: Phase 4 상태 반영 후 `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` PASS 확인.
- 2026-05-09: `bunx supabase init`, `bunx supabase start`, `bunx supabase db reset` 성공으로 FS-002/003 검증 블로커 해소.
- 2026-05-09: `bunx supabase db lint`는 `failed to parse rows: unexpected EOF`로 실패했으나, 대체 검증 조건(`db reset` 성공 로그)은 충족.
- 2026-05-09: `bun run dev` 기동 후 `curl -I /dashboard`가 `307 /select-profile`, `curl -I /select-profile`가 `307 /login`을 반환해 인증 가드 흐름을 검증함.
- 2026-05-09: 라우트 수정 후 `bunx next typegen`, `bun run typecheck:strict`, `bun run build` 모두 통과.
- 2026-05-09: `/login` 서버 액션 POST는 `303`으로 Supabase authorize URL 이동 성공, 이후 authorize endpoint는 `Unsupported provider: provider is not enabled` 응답으로 중단됨.
- 2026-05-09: `supabase/config.toml`의 Google provider를 활성화한 뒤 authorize endpoint가 `302`로 Google URL 리다이렉트했고, URL의 `client_id`가 `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` 문자열로 전달되어 실제 자격증명 입력 필요를 확인함.
- 2026-05-09: 자격증명 입력 이후 `client_id_looks_env_literal=False`를 확인해 Google OAuth 설정이 환경변수 값으로 치환됨을 검증함.
- 2026-05-09: `bun run lint && bun run typecheck:strict && bun run test && bun run build` 전체 검증 패스.
- 2026-05-09: FS-004 상태 갱신 후 `python3 scripts/plan_loop/plan_lint.py docs/plans/20260509_familysync_mvp_blueprint.md` PASS 확인.

## Consistency Issues
- 2026-05-09: `AGENTS.md`에서 필수로 참조하는 `docs/memory/ADAPTIVE_GUIDELINES.json` 파일이 현재 저장소에 없음. (영향: Guideline Compliance 항목 실적용 불가)
  - 권장 조치: `docs/memory/ADAPTIVE_GUIDELINES.json` 초기 템플릿 추가 및 태스크별 가이드라인 매핑 체계 도입.
- 2026-05-09: `AGENTS.md`의 plan 검증 필수 경로 `scripts/plan_loop/plan_lint.py`가 현재 저장소에 없음. (영향: Blueprint 자동 lint 게이트 실행 불가)
  - 권장 조치: 해당 스크립트 복구 또는 대체 검증 명령을 `AGENTS.md`/`PROJECT_RULES.md`에 명시해 정책-실행 불일치 해소.
- 2026-05-09: `docs/memory/ADAPTIVE_GUIDELINES.json` 파일 복구됨. 현재는 스키마 유지 + `guidelines: []` 초기 상태로 리셋됨.
- 2026-05-09: `scripts/plan_loop/plan_lint.py` 경로가 복구되어 경로 정합성 이슈 해소됨.
- 2026-05-09: `AGENTS.md` §10.2의 `just memory-verify` 레시피 부재 이슈는 `justfile`에 레시피 추가 및 `ci` 연동으로 해소됨.
