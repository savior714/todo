import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 배포(Vercel)에서 Auth.js `error=Configuration` / Server error 원인을 빠르게 좁히기 위한 점검용.
 * 비밀 값은 노출하지 않고, 각 변수의 **존재 여부**와 선택적 DB ping만 반환합니다.
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
  if (checks.TURSO_DATABASE_URL) {
    try {
      const { createClient } = await import("@libsql/client");
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN || undefined,
      });
      await client.execute("SELECT 1");
      db = "ok";
    } catch {
      db = "error";
    }
  }

  const ok = envOk && db !== "error";
  return NextResponse.json({ ok, checks, db }, { status: ok ? 200 : 503 });
}
