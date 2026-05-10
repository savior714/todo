import { NextResponse } from "next/server";
import type { Client } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_TABLES = [
  "users",
  "accounts",
  "sessions",
  "verificationTokens",
  "families",
  "user_families",
  "profiles",
] as const;

/**
 * Vercel CLI는 Sensitive 환경변수(예: TURSO_*)를 export/run으로 주입하지 않으므로
 * 로컬 셸에서는 운영 Turso에 마이그레이션을 적용할 수 없다. 본 라우트는 그 한계를
 * 우회하기 위한 **일회성** 어드민 채널이다. 사용 직후 라우트 파일과
 * `ADMIN_MIGRATE_SECRET` env를 모두 제거해야 한다.
 *
 * - 가드: `Authorization: Bearer <ADMIN_MIGRATE_SECRET>` 일치 시에만 실행.
 *   env가 비어 있으면 항상 401을 반환하도록 구성하여, env 제거만으로도 효과적으로 무력화된다.
 * - Sanity: 본문 SQL은 `CREATE TABLE` / `CREATE INDEX` / `CREATE UNIQUE INDEX`만 허용하고
 *   `DROP` / `DELETE` / `UPDATE` / `ALTER` / `INSERT` 키워드가 포함되면 즉시 거부.
 * - Idempotent: 적용 전후로 sqlite_master에서 어댑터 핵심 테이블 스냅샷을 함께 반환.
 */
export async function POST(request: Request): Promise<Response> {
  const expected = process.env.ADMIN_MIGRATE_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 401 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const presented = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!presented || presented !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.TURSO_DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: "missing TURSO_DATABASE_URL" }, { status: 503 });
  }

  const sqlText = await request.text();
  if (!sqlText.trim()) {
    return NextResponse.json({ ok: false, error: "empty body" }, { status: 400 });
  }

  const statements = sqlText
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  // 명령형 SQL만 차단한다. 외래키 절(`ON DELETE CASCADE` 등)의 키워드 오탐을 피하기 위해
  // 키워드 단독이 아닌 다음 토큰까지 패턴화한다.
  const FORBIDDEN = new RegExp(
    [
      String.raw`\bDROP\s+(TABLE|INDEX|VIEW|TRIGGER|DATABASE)\b`,
      String.raw`\bDELETE\s+FROM\b`,
      String.raw`\bUPDATE\s+\S+\s+SET\b`,
      String.raw`\bALTER\s+(TABLE|INDEX)\b`,
      String.raw`\bINSERT\s+(OR\s+\S+\s+)?INTO\b`,
      String.raw`\bREPLACE\s+(OR\s+\S+\s+)?INTO\b`,
      String.raw`\bTRUNCATE\b`,
      String.raw`\bATTACH\b`,
      String.raw`\bDETACH\b`,
      String.raw`\bPRAGMA\b`,
      String.raw`\bVACUUM\b`,
    ].join("|"),
    "i"
  );
  const ALLOWED_PREFIX = /^CREATE\s+(TABLE|UNIQUE\s+INDEX|INDEX)\b/i;
  for (const [i, stmt] of statements.entries()) {
    if (FORBIDDEN.test(stmt)) {
      return NextResponse.json(
        { ok: false, error: "forbidden keyword in statement", index: i },
        { status: 400 }
      );
    }
    if (!ALLOWED_PREFIX.test(stmt)) {
      return NextResponse.json(
        { ok: false, error: "only CREATE TABLE/INDEX statements are allowed", index: i, head: stmt.slice(0, 40) },
        { status: 400 }
      );
    }
  }

  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

  const before = await snapshotTables(client);
  try {
    await client.batch(
      statements.map((sql) => ({ sql })),
      "write"
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "execution failed", message: (err as Error).message, before },
      { status: 500 }
    );
  }
  const after = await snapshotTables(client);

  const ok = REQUIRED_TABLES.every((name) => after[name]);
  return NextResponse.json(
    { ok, applied: statements.length, before, after },
    { status: ok ? 200 : 500 }
  );
}

type TableMap = Record<(typeof REQUIRED_TABLES)[number], boolean>;

async function snapshotTables(client: Client): Promise<TableMap> {
  const result = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${REQUIRED_TABLES.map(() => "?").join(",")})`,
    args: [...REQUIRED_TABLES] as string[],
  });
  const present = new Set(result.rows.map((row) => String(row.name)));
  return REQUIRED_TABLES.reduce<TableMap>((acc, name) => {
    acc[name] = present.has(name);
    return acc;
  }, {} as TableMap);
}
