import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const isNextBuild =
  process.env.npm_lifecycle_event === "build" ||
  (Boolean(process.argv[1]?.includes("next")) && process.argv.includes("build"));

const url =
  process.env.TURSO_DATABASE_URL ??
  (isNextBuild ? "file:.next-build-turso.sqlite" : undefined);

if (!url) {
  throw new Error("Missing TURSO_DATABASE_URL.");
}

const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { schema };
