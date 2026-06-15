import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("Turso 초기 마이그레이션에 핵심 테이블이 정의되어 있다", () => {
  const sql = read("db/migrations/0000_initial.sql");
  assert.match(sql, /CREATE TABLE events/i);
  assert.match(sql, /CREATE TABLE profiles/i);
  assert.match(sql, /CREATE TABLE sessions/i);
  assert.match(sql, /daily_pins_active_family_unique_idx/i);
  assert.doesNotMatch(sql, /CREATE TABLE care_guides/i);
});

test("퀵 액션용 follow-up 마이그레이션이 존재한다", () => {
  const sql = read("db/migrations/0001_quick_actions.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS quick_actions/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS quick_actions_family_active_sort_idx/i);
});

test("care_guides 제거용 follow-up 마이그레이션이 존재한다", () => {
  const sql = read("db/migrations/0002_drop_care_guides.sql");
  assert.match(sql, /DROP TABLE IF EXISTS care_guides/i);
});

test("투약 안전장치 로직이 서버 액션에 존재한다", () => {
  const eventsAction = read("app/actions/events.ts");
  const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
  assert.match(eventsAction, /actionType === "medication"/);
  assert.match(eventsAction, /blocked:\s*true/);
  assert.match(recordModal, /override:\s*true/);
});

test("이벤트 생성·실행 취소 후 router.refresh가 새 타임라인을 받도록 대시보드를 revalidate한다", () => {
  const eventsAction = read("app/actions/events.ts");
  const matches = eventsAction.match(/revalidatePath\("\/dashboard"\)/g);
  assert.ok(matches && matches.length >= 2, "createEvent·undoEvent 각각 revalidatePath(/dashboard) 필요");
});

test("이벤트 메타데이터 검증이 lib/events/metadata에 정의되어 있다", () => {
  const meta = read("lib/events/metadata.ts");
  const eventsAction = read("app/actions/events.ts");
  assert.match(meta, /normalizeAndValidateEventMetadata/);
  assert.match(meta, /medicationDetailSchema/);
  assert.match(meta, /schoolRunDetailSchema/);
  assert.match(eventsAction, /normalizeAndValidateEventMetadata/);
});

test("등·하원 기록 모달이 대상·장소 입력과 schoolRun 메타를 사용한다", () => {
  const modal = read("app/(dashboard)/RecordEventModal.tsx");
  assert.match(modal, /school_dropoff/);
  assert.match(modal, /school_pickup/);
  assert.match(modal, /schoolRun/);
  assert.match(modal, /장소 \(선택\)/);
  assert.match(modal, /SCHOOL_CHILD_OPTIONS/);
});

test("접근성 기준(퀵 액션 최소 60px)이 유지된다", () => {
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  assert.match(quickAction, /min-h-\[60px\]/);
});

test("퀵 액션 패널은 버튼만 렌더하고 연결 가이드 문구는 쓰지 않는다", () => {
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  const deferred = read("app/(dashboard)/dashboard/DashboardDeferred.tsx");
  assert.match(deferred, /<QuickActionPanel\s+actions=\{/);
  assert.match(quickAction, /actions\.map/);
  assert.doesNotMatch(quickAction, /연결 가이드/);
});

test("대시보드 퀵 액션에 오늘 숙제 완료 바로가기가 연결된다", () => {
  const deferred = read("app/(dashboard)/dashboard/DashboardDeferred.tsx");
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  assert.match(deferred, /homeworkShortcuts=\{homeworkShortcuts\}/);
  assert.match(deferred, /homeworkLogs/);
  assert.match(quickAction, /completeHomework/);
  assert.match(quickAction, /오늘 숙제/);
});

test("숙제 완료 시 타임라인용 events 행이 함께 기록된다", () => {
  const admin = read("app/actions/admin.ts");
  const meta = read("lib/events/metadata.ts");
  assert.match(admin, /actionType:\s*"homework"/);
  assert.match(admin, /\.insert\(events\)/);
  assert.match(admin, /normalizeAndValidateEventMetadata\(\s*"homework"/);
  assert.match(meta, /actionType === "homework"/);
});

test("루틴 완료 시 타임라인용 events 행이 함께 기록된다", () => {
  const admin = read("app/actions/admin.ts");
  const meta = read("lib/events/metadata.ts");
  assert.match(admin, /actionType:\s*"routine_check"/);
  assert.match(admin, /\.insert\(events\)/);
  assert.match(admin, /normalizeAndValidateEventMetadata\(\s*"routine_check"/);
  assert.match(meta, /actionType === "routine_check"/);
});

test("관리자는 대시보드에서 퀵 액션·숙제 설정 링크를 받는다", () => {
  const deferred = read("app/(dashboard)/dashboard/DashboardDeferred.tsx");
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  const adminPage = read("app/admin/page.tsx");
  assert.match(deferred, /showAdminSettingsLink=\{profile\.role === "admin"\}/);
  assert.match(quickAction, /showAdminSettingsLink/);
  assert.match(quickAction, /\/admin#quick-actions-admin/);
  assert.match(quickAction, /\/admin#homework-types-admin/);
  assert.match(quickAction, /\/admin#routine-items-admin/);
  const quickActionsSection = read("app/admin/quick-actions-admin-section.tsx");
  const homeworkSection = read("app/admin/homework-types-admin-section.tsx");
  const routineSection = read("app/admin/routine-items-admin-section.tsx");
  assert.match(quickActionsSection, /id="quick-actions-admin"/);
  assert.match(homeworkSection, /id="homework-types-admin"/);
  assert.match(routineSection, /id="routine-items-admin"/);
  assert.match(adminPage, /QuickActionsAdminSection/);
  assert.match(adminPage, /HomeworkTypesAdminSection/);
  assert.match(adminPage, /RoutineItemsAdminSection/);
});

test("타임라인 피드가 3열·주 단위 이동·날짜 메타를 지원한다", () => {
  const feed = read("app/(dashboard)/TimelineFeed.tsx");
  const dashboard = read("app/(dashboard)/dashboard/page.tsx");
  const timelineSection = read("app/(dashboard)/TimelineFeedSection.tsx");
  const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
  assert.match(feed, /grid-cols-3/);
  assert.match(feed, /type="date"/);
  assert.match(feed, /getEventDisplayDateKey/);
  assert.match(recordModal, /timelineDate/);
  assert.match(timelineSection, /metadata: events\.metadata/);
  assert.match(timelineSection, /homeworkLogs/);
  assert.match(timelineSection, /completeHomework/);
  assert.match(timelineSection, /routineLogs/);
  assert.match(timelineSection, /completeRoutineItem/);
  assert.match(dashboard, /TimelineFeedSection/);
  assert.match(dashboard, /Suspense/);
});

test("대시보드 로딩은 프로필 캐시·병렬 데이터 패치·핀 배너 familyId를 사용한다", () => {
  const session = read("lib/auth/session.ts");
  const banner = read("app/(dashboard)/DailyPinBanner.tsx");
  const dashboard = read("app/(dashboard)/dashboard/page.tsx");
  const deferred = read("app/(dashboard)/dashboard/DashboardDeferred.tsx");
  assert.match(session, /from\s+["']react["']/);
  assert.match(session, /\bcache\(/);
  assert.match(banner, /familyId:\s*string/);
  assert.match(deferred, /Promise\.all\(/);
  assert.match(dashboard, /<DailyPinBanner\s+familyId=\{/);
});

test("타임라인 조회 상수와 이벤트 부분 인덱스 마이그레이션이 존재한다", () => {
  const constants = read("lib/dashboard/timeline.ts");
  const migration = read("db/migrations/0003_events_timeline_idx.sql");
  const routineMigration = read("db/migrations/0004_routine_checklist.sql");
  assert.match(constants, /TIMELINE_EVENT_LIMIT/);
  assert.match(constants, /TIMELINE_LOOKBACK_MS/);
  assert.match(migration, /events_family_active_created_idx/i);
  assert.match(migration, /is_reverted\s*=\s*0/i);
  assert.match(routineMigration, /routine_items/i);
  assert.match(routineMigration, /routine_logs/i);
});

test("실행 취소 정책이 액션 타입별 SSOT로 정의되고 서버·타임라인이 공유한다", () => {
  const policy = read("lib/events/undo-policy.ts");
  const eventsAction = read("app/actions/events.ts");
  const feed = read("app/(dashboard)/TimelineFeed.tsx");
  assert.match(policy, /getUndoWindowMsForActionType/);
  assert.match(policy, /LOW_RISK_UNDO_WINDOW_MS/);
  assert.match(policy, /MEDICATION_UNDO_WINDOW_MS/);
  assert.match(policy, /HOMEWORK_UNDO_WINDOW_MS/);
  assert.match(policy, /ROUTINE_CHECK_UNDO_WINDOW_MS/);
  assert.match(eventsAction, /getUndoWindowMsForActionType/);
  assert.match(eventsAction, /action_type:\s*events\.actionType/);
  assert.match(feed, /getUndoWindowMsForActionType\(\s*event\.action_type\s*\)/);
});

test("PWA 매니페스트가 선언되어 있다", () => {
  const manifest = read("public/manifest.json");
  assert.match(manifest, /"display":\s*"standalone"/);
  assert.match(manifest, /"icons"/);
});

test("로그인 페이지는 기존 세션이 있으면 자동 우회한다", () => {
  const loginPage = read("app/(auth)/login/page.tsx");
  assert.match(loginPage, /auth\(\)/);
  assert.match(loginPage, /redirect\(activeProfileId \? "\/dashboard" : "\/select-profile"\)/);
});

test("Auth.js 설정 파일과 라우트 핸들러가 존재한다", () => {
  const authConfig = read("auth.ts");
  const authRoute = read("app/api/auth/[...nextauth]/route.ts");
  assert.match(authConfig, /NextAuth\(/);
  assert.match(authConfig, /secret:\s*process\.env\.AUTH_SECRET/);
  assert.match(authConfig, /Google/);
  assert.match(authConfig, /createUser/);
  assert.match(authRoute, /export const \{ GET, POST \} = handlers/);
});

test("Auth.js Configuration/500 혼동 방지 SSOT 모듈이 존재한다", () => {
  const contract = read("lib/auth/authjs-configuration-contract.ts");
  assert.match(contract, /AUTH_JS_CONFIGURATION_ERROR_PAGE_STATUS/);
  assert.match(contract, /AUTH_JS_CONFIGURATION_ERROR_QUERY/);
  assert.match(contract, /500/);
});

test("배포 점검용 /api/health 라우트가 Auth 필수 env 존재 여부를 반환한다", () => {
  const health = read("app/api/health/route.ts");
  assert.match(health, /AUTH_SECRET/);
  assert.match(health, /TURSO_DATABASE_URL/);
  assert.match(health, /SELECT 1/);
  assert.match(health, /NextResponse\.json/);
});

test("/api/health는 Auth.js 어댑터 핵심 테이블의 마이그레이션 적용 여부도 함께 보고한다", () => {
  const health = read("app/api/health/route.ts");
  assert.match(health, /sqlite_master/);
  assert.match(health, /users/);
  assert.match(health, /accounts/);
  assert.match(health, /sessions/);
  assert.match(health, /quick_actions/);
  assert.match(health, /tables/);
});

test("Drizzle 기반 DB 계층 파일이 존재한다", () => {
  const dbClient = read("db/client.ts");
  const dbSchema = read("db/schema.ts");
  assert.match(dbClient, /drizzle/);
  assert.match(dbSchema, /sqliteTable/);
});

test("Turso 마이그레이션 스크립트가 Node 단독 실행 시 env 파일을 로드한다", () => {
  const script = read("scripts/migrate-turso.mjs");
  assert.match(script, /function loadEnvFiles/);
  assert.match(script, /\.env\.local/);
  assert.match(script, /\.env\.vercel\.dev/);
  assert.match(script, /\.env\.vercel\.prod/);
});

test("Turso 마이그레이션 스크립트가 재실행 시 기존 DB와 충돌하지 않도록 적용 기록을 둔다", () => {
  const script = read("scripts/migrate-turso.mjs");
  assert.match(script, /_turso_applied_migrations/);
  assert.match(script, /bootstrapLegacyApplied/);
});

test("일회성 어드민 마이그레이션 라우트는 사용 직후 제거되어야 한다", () => {
  // app/api/admin/* 경로의 어떤 라우트도 존재하지 않아야 한다 (Sensitive env 우회 채널 잔존 금지).
  assert.equal(
    existsSync("app/api/admin"),
    false,
    "app/api/admin 디렉토리가 남아있다. 어드민 라우트는 1회 사용 후 즉시 제거할 것."
  );
});

test("공동 관리자 이메일 allowlist가 로그인 시 executor→admin 승격 훅과 연결된다", () => {
  const promote = read("lib/auth/promote-co-admins.ts");
  const authConfig = read("auth.ts");
  assert.match(promote, /FAMILY_CO_ADMIN_EMAILS/);
  assert.match(promote, /promoteExecutorsToAdminForCoAdminEmail/);
  assert.match(promote, /set\(\{\s*role:\s*"admin"\s*\}\)/);
  assert.match(authConfig, /promoteExecutorsToAdminForCoAdminEmail/);
});

test("관리자가 숙제 유형을 비활성화할 수 있는 서버 액션이 존재한다", () => {
  const adminActions = read("app/actions/admin.ts");
  assert.match(adminActions, /deactivateHomeworkType/);
  assert.match(adminActions, /homeworkTypes/);
  assert.match(adminActions, /isActive:\s*false/);
});

test("퀵 액션 커스텀 타입 유효성 실패는 500 throw 대신 에러 상태로 처리한다", () => {
  const adminActions = read("app/actions/admin.ts");
  const adminPage = read("app/admin/page.tsx");
  assert.match(adminActions, /createQuickAction/);
  assert.match(adminActions, /success:\s*false/);
  assert.doesNotMatch(adminActions, /throw new Error\("커스텀 타입은 소문자 시작/);
  assert.match(adminPage, /quickActionError/);
});

test("대시보드에서 로그아웃 폼(server action)·접근성 라벨이 노출된다", () => {
  const dashboard = read("app/(dashboard)/dashboard/page.tsx");
  assert.match(dashboard, /logoutProfile/);
  assert.match(dashboard, /action=\{logoutProfile\}/);
  assert.match(dashboard, /aria-label="로그아웃"/);
});

test("글로벌 스타일이 모바일 자동 줌 완화(폼 최소 폰트)·핀치 완화(touch pan)·동적 뷰포트 높이를 사용한다", () => {
  const globals = read("app/globals.css");
  assert.match(globals, /max\(16px,\s*1em\)|max\(1em,\s*16px\)/);
  assert.match(globals, /touch-action:\s*pan-x\s+pan-y/);
  assert.match(globals, /100dvh/);
  assert.match(globals, /dashboard-pinch-lock/);
});

test("대시보드 레이아웃이 핀치 줌 잠금 클라이언트 가드를 마운트한다", () => {
  const layout = read("app/(dashboard)/layout.tsx");
  const lock = read("app/(dashboard)/DashboardPinchZoomLock.tsx");
  assert.match(layout, /DashboardPinchZoomLock/);
  assert.match(lock, /gesturestart/);
  assert.match(lock, /ctrlKey/);
});
