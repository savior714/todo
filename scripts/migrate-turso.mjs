import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;

if (!url) {
  throw new Error("Missing TURSO_DATABASE_URL.");
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const sql = readFileSync("db/migrations/0000_initial.sql", "utf8");
await client.batch(
  sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => ({ sql: statement })),
  "write"
);

console.log("Applied Turso migration: 0000_initial.sql");
