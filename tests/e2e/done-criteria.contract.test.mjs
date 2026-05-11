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
});

test("퀵 액션용 follow-up 마이그레이션이 존재한다", () => {
  const sql = read("db/migrations/0001_quick_actions.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS quick_actions/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS quick_actions_family_active_sort_idx/i);
});

test("투약 안전장치 로직이 서버 액션에 존재한다", () => {
  const eventsAction = read("app/actions/events.ts");
  const recordModal = read("app/(dashboard)/RecordEventModal.tsx");
  assert.match(eventsAction, /payload\.actionType === "medication"/);
  assert.match(eventsAction, /blocked:\s*true/);
  assert.match(recordModal, /override:\s*true/);
});

test("이벤트 메타데이터 검증이 lib/event-metadata에 정의되어 있다", () => {
  const meta = read("lib/event-metadata.ts");
  const eventsAction = read("app/actions/events.ts");
  assert.match(meta, /normalizeAndValidateEventMetadata/);
  assert.match(meta, /medicationDetailSchema/);
  assert.match(eventsAction, /normalizeAndValidateEventMetadata/);
});

test("접근성 기준(퀵 액션 최소 60px)이 유지된다", () => {
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  assert.match(quickAction, /min-h-\[60px\]/);
});

test("linked_action 가이드 힌트가 퀵 액션 패널에 노출된다", () => {
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  const dashboard = read("app/(dashboard)/dashboard/page.tsx");
  assert.match(dashboard, /linkedAction: careGuides\.linkedAction/);
  assert.match(dashboard, /<QuickActionPanel\s+actions=\{/);
  assert.match(quickAction, /guideHints/);
  assert.match(quickAction, /연결 가이드/);
});

test("타임라인 피드가 3열·주 단위 이동·날짜 메타를 지원한다", () => {
  const feed = read("app/(dashboard)/TimelineFeed.tsx");
  const dashboard = read("app/(dashboard)/dashboard/page.tsx");
  assert.match(feed, /grid-cols-3/);
  assert.match(feed, /type="date"/);
  assert.match(feed, /timelineDate/);
  assert.match(dashboard, /metadata: events\.metadata/);
});

test("실행 취소 정책이 액션 타입별 SSOT로 정의되고 서버·타임라인이 공유한다", () => {
  const policy = read("lib/event-undo-policy.ts");
  const eventsAction = read("app/actions/events.ts");
  const feed = read("app/(dashboard)/TimelineFeed.tsx");
  assert.match(policy, /getUndoWindowMsForActionType/);
  assert.match(policy, /LOW_RISK_UNDO_WINDOW_MS/);
  assert.match(policy, /MEDICATION_UNDO_WINDOW_MS/);
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
