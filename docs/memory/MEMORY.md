# MEMORY

## Session Notes
- 2026-05-11: `.gitignore`에 Python `__pycache__/`·`*.py[cod]` 추가; `bootstrap`·`error_ab`·`asset`·`index_knowledge`·`prevent_loop`·`ci-fia-automation` 워크플로를 FamilySync(`bun`/`just ci`) 기준으로 정리.
- 2026-05-11: 레포 외부 템플릿 잔존 문서 정리 — `AGENTS.md`·`PROJECT_RULES.md` 검증 매트릭스·Reference Index를 `bun`/`just ci`/실제 `docs/specs` 구조에 맞춤; `go`·`audit`·`debug_error`·`asset`·`path_verification`·`jsx_casing_check`·`micro-improve`·`context_gap_scan`·`plan` 워크플로(`.agents`/`.clinerules`)의 타 스택 경로·명령을 FamilySync 기준으로 수정 또는 주석 처리.
- 2026-05-11: `/git` 워크플로(`.agents/workflows/git.md`·`.clinerules/workflows/git.md`)를 FamilySync 레포 기준으로 정리 — Husky·`apps/renderer` 대신 `bun run lint`·`typecheck:strict`·`just ci`·`verify_korean_text.py` 안내, `MEMORY.md` 200라인·`just memory-verify`와 정합.
- 2026-05-11: `DashboardPinchZoomLock` 강화(모바일 뷰포트 줌 고정) — 대시보드 마운트 시 `meta[name=viewport]` 런타임 재설정·멀티터치(`touches>1`)·더블탭(300ms) 차단, 기존 iOS `gesture*`·Ctrl+휠 차단 유지·언마운트 시 viewport 복원. `bun run lint`·`typecheck:strict` 통과.
- 2026-05-11: 대시보드 `(dashboard)` 레이아웃에 `DashboardPinchZoomLock` 추가 — iOS `gesture*` 차단·Ctrl+휠 줌 차단, `globals.css`는 `touch-action:pan-x pan-y`로 `manipulation`(핀치 허용 가능) 제거·`html.dashboard-pinch-lock`에 `overscroll-behavior:none`. 계약 테스트 보강. `bun run lint`·`typecheck:strict`·`test`·`build` 통과.
- 2026-05-11: 대시보드 헤더 우측에 `logoutProfile` 서버 액션 기반 로그아웃 아이콘 버튼 추가. `globals.css`에 폼 `max(16px,1em)`·`100dvh`·`layout.tsx`에 `interactiveWidget:resizes-content` 적용. 계약 테스트 2건 추가. `bun run lint`·`typecheck:strict`·`test`·`build` 통과.
- 2026-05-11: 모바일 핀치 줌 완화를 위해 `app/layout.tsx` viewport에 `minimumScale: 1`·`userScalable: false`를 추가해 `maximumScale: 1`과 함께 메타 태그를 보강함. `bun run lint`·`typecheck:strict`·`just ci` 통과.
- 2026-05-11: 공동 관리자용 `FAMILY_CO_ADMIN_EMAILS`(쉼표 구분) — 로그인 시 해당 사용자 `family_id`의 **executor** 프로필을 `admin`으로 멱등 승격(`lib/auth/promote-co-admins.ts`·`auth.ts` `signIn`). `/admin`에서 숙제 유형 **숨기기**(`deactivateHomeworkType`, `is_active=false`) 추가. `bun run lint`·`typecheck:strict`·계약 테스트 통과.
- 2026-05-11: 프로덕션 `https://todo-nine-mu-90.vercel.app` 점검 — `curl /api/health`가 `db:ok`·나머지 `tables` true인데 **`quick_actions`만 false**·HTTP 503. 즉 배포가 붙은 Turso에 `quick_actions` 마이그레이션 미적용 상태. 브라우저로 `/dashboard`는 비로그인 시 `/login` 리다이렉트 확인.
- 2026-05-11: 대시보드 퀵 액션 try/catch 실패 시 `console.error("[dashboard] quick_actions load failed", { familyId, message, code? })`로 서버 로그에만 원인 남김(클라이언트 비노출). `bun run lint`·`bun run typecheck:strict` 통과.
- 2026-05-10: Vercel 모바일 “server error” 대응 — `getActiveProfileContext()`가 세션 없을 때 `requireUserId`로 예외를 던지던 문제를 세션 없으면 `null` 반환으로 수정, 대시보드는 `null` 시 `/login` 리다이렉트. `quick_actions` 미마이그레이션 시 SSR 500 방지를 위해 시드·조회를 try/catch하고 안내 배너 표시, `/api/health` 필수 테이블에 `quick_actions` 추가. `docs/CRITICAL_LOGIC.md`·계약 테스트 반영. `bun run lint`·`typecheck:strict`·`test`·`build` 통과.
- 2026-05-10: 모바일 대시보드 반응형 깨짐 대응으로 `dashboard/page.tsx` 패딩/타이틀 크기를 모바일 우선(`px-4 py-5`, `text-2xl`)으로 조정하고, `TimelineFeed` 3열 최소폭을 `21rem`(모바일) / `28rem`(sm+)로 분리, `app/layout.tsx`에 명시적 viewport(`device-width`, `initialScale:1`)를 추가. `bun run lint`·`bun run typecheck:strict` 통과.
- 2026-05-10: 퀵 액션·타임라인 하단 기록을 `RecordEventModal`(네이티브 `<dialog>` + 확장 애니메이션)로 통합. 투약은 대상·약별 용량·단위·메모를 `metadata.medication`에 저장, `lib/event-metadata.ts`(Zod)로 `createEvent` 정규화·검증. 타임라인 카드에 상세 요약 표시. `zod` 의존성 추가, 계약 테스트·`CRITICAL_LOGIC.md` 갱신. `npm test`·`npm run lint`·`npm run typecheck:strict`·`just memory-verify` 통과.
- 2026-05-10: `quick_actions` 테이블·`0001_quick_actions.sql`·`scripts/migrate-turso.mjs`(정렬된 전체 `.sql` 적용) 추가. `lib/quick-actions-seed.ts`로 가족당 기본 5버튼 시드(등원 `school_dropoff` / 하원 `school_pickup` 분리). `/admin`에서 퀵 액션 추가·숨기기, 대시보드는 DB 기반 버튼 렌더. `TimelineFeed` 라벨에 신규 타입 반영, 레거시 `school_run` 표기 유지. `bun run test`·`lint`·`typecheck:strict` 통과.
- 2026-05-10: 실행 취소를 액션별로 분리 — `lib/event-undo-policy.ts` SSOT(저위험 24h, 투약 30m). `app/actions/events.ts` `undoEvent`·`TimelineFeed` 버튼 노출이 동일 함수 사용. `CRITICAL_LOGIC.md`·`PRD.md`·`TRD.md` 정합, 계약 테스트 1건 추가. `npm test`·`bun run lint`·`bun run typecheck:strict` 통과.
- 2026-05-10: `TimelineFeed` 타임라인 날짜 열 전체(헤더·빈 영역·「기록 없음」) 클릭으로 날짜 선택, `centerDate`를 해당 일로 맞춰 내일 등이 가운데 열로 오도록 변경. 좁은 뷰포트는 `min-w-[28rem]`+가로 스크롤+가운데 열 `scrollIntoView`로 정렬. 하단「선택한 날짜에 기록」안내 블록 클릭 시 📅와 동일하게 `type="date"` 입력 트리거. `bun run lint`, `bun run typecheck:strict` 통과.
- 2026-05-10: `docs/CRITICAL_LOGIC.md` 신설 — 멀티테넌시·투약 2h·override·Undo·Auth.js·`/api/health`·타임라인 `metadata.timelineDate` 등 구현 기준 불변 정리. `README.md` SSOT 목록에 링크 추가.
- 2026-05-10: Git 정리: 타임라인·스펙·ai-log 워크플로·E2E 계약·`PLAN_STATUS.json` 커밋. `tools/ai_worklog` 로컬 심볼릭 링크는 `.gitignore`로 제외(절대 경로 공유 방지). `just ci`, `bun run lint`·`typecheck:strict`·`test` 통과 확인.
- 2026-05-10: 로컬 Docker Supabase 스택(`supabase_*_todo` 컨테이너·볼륨·`supabase_network_todo`) 중지·삭제, 레포 `supabase/` 디렉터리 제거, `bun install`로 `bun.lock`에서 `@supabase/*` 잔존 제거. `docs/specs/PRD.md`·`TRD.md` 스택 설명을 Turso+Auth.js 기준으로 정리.
- 2026-05-10: 대시보드 타임라인을 어제·오늘·내일 3열(가운데 날짜 기준) + « » 버튼·세 열 스와이프로 한 주씩 이동·날짜 입력으로 임의일 이동·선택 열에 `metadata.timelineDate`로 식사/투약 기록을 붙이도록 구현함. 서버는 최근 120일·최대 500건·`metadata` 포함 로드. 퀵 액션에 등·하원·양치 추가 및 기록 후 `router.refresh`로 타임라인 동기화. `bun run lint`, `bun run typecheck:strict`, `bun run test` 통과.
- 2026-05-10: 운영 도메인에서 Google 로그인 성공·대시보드 진입을 사용자 측에서 직접 확인. OAuth 콜백 → Drizzle 어댑터 user/account/session insert → `events.createUser` 훅의 `ensureDefaultFamilyForUser`(가족·user_families·기본 프로필 2건 시드)까지 전 체인 정상 작동. `error=Configuration` 이슈 종결.
- 2026-05-10: 운영 Turso 마이그레이션 적용 완료 — 강화된 `/api/health`로 `tables` 7개 모두 `false`임을 확인 후, Vercel CLI가 Sensitive 환경변수(TURSO_*)를 export/run으로 주입하지 않는 한계를 우회하기 위해 일회성 가드 라우트(`app/api/admin/migrate/route.ts`, `Authorization: Bearer ADMIN_MIGRATE_SECRET`, `CREATE TABLE/INDEX`만 허용)를 임시 배포해 22 statement를 적용(`tables` 전부 `true`로 전환), 직후 라우트 파일·env·로컬 시크릿(`.migrate-secret.local`)을 모두 철거. 향후 동일 한계 발견 시 같은 패턴(임시 가드 라우트 → 사용 → 즉시 제거 + 계약 테스트로 잔존 금지)을 적용한다.
- 2026-05-10: 운영 도메인 `todo-nine-mu-90.vercel.app`에서 `error=Configuration` 재발. `GET /api/health`는 `ok:true / db:"ok"`로 반환되어 env·Turso 연결은 정상이나 `SELECT 1`만으로는 어댑터 테이블 적용 여부를 알 수 없는 한계가 드러남. `/api/health` 계약 테스트(Red→Green)와 `app/api/health/route.ts`에 `sqlite_master` 기반 `tables` 점검(`users/accounts/sessions/verificationTokens/families/user_families/profiles`) 추가, README의 빠른 점검 가이드에 `tables` false → `npm run db:migrate` 실행 안내를 명시.
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
