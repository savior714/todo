import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("Turso 초기 마이그레이션에 핵심 테이블이 정의되어 있다", () => {
  const sql = read("db/migrations/0000_initial.sql");
  assert.match(sql, /CREATE TABLE events/i);
  assert.match(sql, /CREATE TABLE profiles/i);
  assert.match(sql, /CREATE TABLE sessions/i);
  assert.match(sql, /daily_pins_active_family_unique_idx/i);
});

test("투약 안전장치 로직이 서버 액션에 존재한다", () => {
  const eventsAction = read("app/actions/events.ts");
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  assert.match(eventsAction, /payload\.actionType === "medication"/);
  assert.match(eventsAction, /blocked:\s*true/);
  assert.match(quickAction, /metadata:\s*\{\s*override:\s*true\s*\}/);
});

test("접근성 기준(퀵 액션 최소 60px)이 유지된다", () => {
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  assert.match(quickAction, /min-h-\[60px\]/);
});

test("linked_action 가이드 힌트가 퀵 액션 패널에 노출된다", () => {
  const quickAction = read("app/(dashboard)/QuickActionPanel.tsx");
  const dashboard = read("app/(dashboard)/dashboard/page.tsx");
  assert.match(dashboard, /linkedAction: careGuides\.linkedAction/);
  assert.match(quickAction, /guideHints/);
  assert.match(quickAction, /연결 가이드/);
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
  assert.match(health, /tables/);
});

test("Drizzle 기반 DB 계층 파일이 존재한다", () => {
  const dbClient = read("db/client.ts");
  const dbSchema = read("db/schema.ts");
  assert.match(dbClient, /drizzle/);
  assert.match(dbSchema, /sqliteTable/);
});
