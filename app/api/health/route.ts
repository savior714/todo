import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REQUIRED_TABLES = [
  "users",
  "accounts",
  "sessions",
  "verificationTokens",
  "families",
  "user_families",
  "profiles",
] as const;

type TableMap = Record<(typeof REQUIRED_TABLES)[number], boolean>;

/**
 * 배포(Vercel)에서 Auth.js `error=Configuration` / Server error 원인을 빠르게 좁히기 위한 점검용.
 * 비밀 값은 노출하지 않고, 각 변수의 **존재 여부**, DB ping, 핵심 테이블의 마이그레이션 적용 여부만 반환합니다.
 *
 * 어댑터 호출(예: OAuth 콜백의 사용자 upsert)이 실패하면 Auth.js는 `error=Configuration` 페이지로 리다이렉트하므로,
 * `tables`에서 `false`가 보이면 운영 Turso DB에 `npm run db:migrate` 미실행이 가장 유력한 원인입니다.
 */
export async function GET() {
  const checks = {
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET?.trim()),
    TURSO_DATABASE_URL: Boolean(process.env.TURSO_DATABASE_URL?.trim()),
    TURSO_AUTH_TOKEN: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
    AUTH_GOOGLE_ID: Boolean(process.env.AUTH_GOOGLE_ID?.trim()),
    AUTH_GOOGLE_SECRET: Boolean(process.env.AUTH_GOOGLE_SECRET?.trim()),
  };

  const envOk = Object.values(checks).every(Boolean);

  let db: "skipped" | "ok" | "error" = "skipped";
  const tables: TableMap = REQUIRED_TABLES.reduce<TableMap>((acc, name) => {
    acc[name] = false;
    return acc;
  }, {} as TableMap);
  let tablesOk = false;

  if (checks.TURSO_DATABASE_URL) {
    try {
      const { createClient } = await import("@libsql/client");
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN || undefined,
      });
      await client.execute("SELECT 1");
      db = "ok";

      const result = await client.execute({
        sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${REQUIRED_TABLES.map(() => "?").join(",")})`,
        args: [...REQUIRED_TABLES],
      });
      const present = new Set(result.rows.map((row) => String(row.name)));
      for (const name of REQUIRED_TABLES) {
        tables[name] = present.has(name);
      }
      tablesOk = REQUIRED_TABLES.every((name) => tables[name]);
    } catch {
      db = "error";
    }
  }

  const ok = envOk && db !== "error" && tablesOk;
  return NextResponse.json({ ok, checks, db, tables }, { status: ok ? 200 : 503 });
}
