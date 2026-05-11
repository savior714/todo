import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUTH_JS_CONFIGURATION_ERROR_PAGE_STATUS,
  AUTH_JS_CONFIGURATION_ERROR_QUERY,
} from "@/lib/auth/authjs-configuration-contract";

const readRepo = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

describe("Auth.js `error=Configuration` / 500 혼동 방지 계약", () => {
  test("레포 SSOT 상수는 @auth/core 기본 에러 페이지의 Configuration 상태 코드와 일치한다", () => {
    expect(AUTH_JS_CONFIGURATION_ERROR_PAGE_STATUS).toBe(500);
    expect(AUTH_JS_CONFIGURATION_ERROR_QUERY).toBe("Configuration");

    const upstream = join(process.cwd(), "node_modules/@auth/core/lib/pages/error.js");
    expect(existsSync(upstream)).toBe(true);
    const src = readFileSync(upstream, "utf8");
    expect(src).toMatch(/Configuration:\s*\{[^}]*status:\s*500/s);
  });

  test("/api/health는 비정상 시 503으로 구분해 브라우저 문서 500과 혼동을 줄인다", () => {
    const health = readRepo("app/api/health/route.ts");
    expect(health).toMatch(/status:\s*ok\s*\?\s*200\s*:\s*503/);
    expect(health).toMatch(/REQUIRED_TABLES/);
  });

  test("README는 Configuration 원인 점검 경로(/api/health·tables)를 유지한다", () => {
    const readme = readRepo("README.md");
    expect(readme).toContain("error=Configuration");
    expect(readme).toContain("/api/health");
    expect(readme).toContain("`tables`");
    expect(readme).toContain("lib/auth/authjs-configuration-contract.ts");
    expect(readme).toContain("tests/unit/auth-configuration-diagnostics.test.ts");
  });
});
