import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const META_TABLE = "_turso_applied_migrations";

/**
 * `next dev`는 `.env.local`을 자동 로드하지만, `node scripts/...`는 하지 않는다.
 * Turso 마이그레이션만 동일한 규칙으로 읽게 한다 (뒤 파일이 앞을 덮어쓴다).
 */
function loadEnvFiles() {
  const root = process.cwd();
  /** `.env.vercel.dev` = 보통 `vercel env pull --environment development`; `.env.vercel.prod` = `--environment production` (운영 Turso) */
  const files = [".env", ".env.local", ".env.vercel.dev", ".env.vercel.prod"];
  for (const name of files) {
    const path = join(root, name);
    if (!existsSync(path)) {
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const exportStripped = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
      const eq = exportStripped.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = exportStripped.slice(0, eq).trim();
      let val = exportStripped.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadEnvFiles();

const url = process.env.TURSO_DATABASE_URL;

if (!url) {
  throw new Error(
    "Missing TURSO_DATABASE_URL. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env.local (or .env). For Vercel: copy from Project → Settings → Environment Variables (Production), or `vercel env pull .env.vercel.prod --environment production` then re-run npm run db:migrate."
  );
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function ensureMetaTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${META_TABLE} (
      filename TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
}

/** @returns {Promise<Set<string>>} */
async function loadApplied() {
  const result = await client.execute(`SELECT filename FROM ${META_TABLE}`);
  return new Set(result.rows.map((row) => String(row.filename)));
}

/** @param {string} name */
async function tableExists(name) {
  const result = await client.execute({
    sql: "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [name],
  });
  return result.rows.length > 0;
}

/** @param {string} filename */
async function markApplied(filename) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO ${META_TABLE} (filename) VALUES (?)`,
    args: [filename],
  });
}

/**
 * 예전에 메타 테이블 없이 `0000`만 적용된 DB: `0000`을 다시 실행하면 충돌하므로 기록만 남긴다.
 * @param {Set<string>} applied
 */
async function bootstrapLegacyApplied(applied) {
  if (applied.size > 0) {
    return;
  }
  if (!(await tableExists("users"))) {
    return;
  }
  await markApplied("0000_initial.sql");
  applied.add("0000_initial.sql");
  console.log(
    "Recorded 0000_initial.sql as applied (existing tables, no migration log). Re-run is safe for newer .sql files only."
  );
}

const migrationsDir = "db/migrations";
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

await ensureMetaTable();
let applied = await loadApplied();
await bootstrapLegacyApplied(applied);
applied = await loadApplied();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`Skip (already applied): ${file}`);
    continue;
  }
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  await client.batch(
    sql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map((statement) => ({ sql: statement })),
    "write"
  );
  await markApplied(file);
  console.log(`Applied Turso migration: ${file}`);
}
