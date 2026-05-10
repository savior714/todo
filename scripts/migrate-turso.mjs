import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;

if (!url) {
  throw new Error("Missing TURSO_DATABASE_URL.");
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrationsDir = "db/migrations";
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  await client.batch(
    sql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map((statement) => ({ sql: statement })),
    "write"
  );
  console.log(`Applied Turso migration: ${file}`);
}
