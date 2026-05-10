/**
 * Reads a `vercel env pull` file (default `.env.vercel.dev`) and maps legacy
 * `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` into Auth.js env vars on Vercel.
 * Prefer `--environment development` when pulling: production often returns empty values.
 */
import { readFileSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const SCOPE = "savior714s-projects";
const PULL_FILE = process.argv[2] ?? ".env.vercel.dev";
/** Optional: `node scripts/sync-vercel-authjs-env.mjs .env.vercel.dev https://your-app.vercel.app` */
const PROD_URL_ARG = process.argv[3];
const CMD_TIMEOUT_MS = 120_000;

function parseDotenv(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * @param {string} name
 * @param {string} environment
 * @param {string} value
 */
function vercelEnvAdd(name, environment, value) {
  const vercelBin = join(process.cwd(), "node_modules", ".bin", "vercel");
  execFileSync(
    vercelBin,
    ["env", "add", name, environment, "--value", value, "--yes", "--force", "--scope", SCOPE],
    {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: CMD_TIMEOUT_MS,
      env: {
        ...process.env,
        CI: "1",
        VERCEL_TELEMETRY_DISABLED: "1",
      },
    }
  );
}

function main() {
  const raw = readFileSync(PULL_FILE, "utf8");
  const env = parseDotenv(raw);

  const googleId = env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
  const googleSecret = env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET;
  if (!googleId || !googleSecret) {
    console.error("Missing SUPABASE_AUTH_EXTERNAL_GOOGLE_* in pull file.");
    process.exit(1);
  }

  const authSecret = randomBytes(32).toString("base64url");
  const prodAuthUrl =
    process.env.AUTH_URL_PRODUCTION?.trim() ||
    PROD_URL_ARG?.trim() ||
    "https://todo-nine-mu-90.vercel.app";
  if (!process.env.AUTH_URL_PRODUCTION?.trim() && !PROD_URL_ARG?.trim()) {
    console.warn(
      "[vercel:sync-auth] AUTH_URL(Production) 기본값을 사용합니다. 실제 배포 도메인이 다르면 " +
        "`AUTH_URL_PRODUCTION` 환경변수 또는 세 번째 인자로 프로덕션 URL을 넘기세요."
    );
  }
  const devAuthUrl =
    env.NEXT_PUBLIC_SITE_URL?.startsWith("http") === true
      ? env.NEXT_PUBLIC_SITE_URL
      : "http://localhost:3000";

  vercelEnvAdd("AUTH_SECRET", "production", authSecret);
  vercelEnvAdd("AUTH_SECRET", "development", authSecret);
  vercelEnvAdd("AUTH_GOOGLE_ID", "production", googleId);
  vercelEnvAdd("AUTH_GOOGLE_ID", "development", googleId);
  vercelEnvAdd("AUTH_GOOGLE_SECRET", "production", googleSecret);
  vercelEnvAdd("AUTH_GOOGLE_SECRET", "development", googleSecret);
  vercelEnvAdd("AUTH_URL", "production", prodAuthUrl);
  vercelEnvAdd("AUTH_URL", "development", devAuthUrl);

  if (PULL_FILE === ".env.vercel.pull") {
    unlinkSync(PULL_FILE);
  }
  console.log("Synced AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_URL (production + development).");
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
