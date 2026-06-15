import { describe, expect, test, mock } from "bun:test";

const ACTIVE_PROFILE_COOKIE = "active_profile_id";

describe("loadActiveProfileContext — auth 실패 시 null 반환", () => {
  test("auth() throw 시 null을 반환한다", async () => {
    // auth.js가 throw하는 에러 타입
    const AUTH_JS_ERROR = "SessionProvider must be wrapped in a Page Element";

    // next-auth를 mock — auth()가 throw하도록 설정
    await mock.module("@/auth", () => ({
      auth: async () => {
        throw new Error(AUTH_JS_ERROR);
      },
      unauthorized: () => {
        throw new Error("unauthorized");
      },
    }));

    // next/headers mock
    await mock.module("next/headers", () => ({
      cookies: async () => ({
        get: () => undefined,
      }),
    }));

    // Drizzle adapter를 mock — DB 쿼리도 try/catch로 감싸져 있어야 함
    await mock.module("@/db/client", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => [],
          }),
        }),
        transaction: async () => {},
      },
    }));

    // db/schema mock
    await mock.module("@/db/schema", () => ({
      profiles: { id: "id", familyId: "familyId", role: "role", name: "name" },
      userFamilies: { familyId: "familyId", userId: "userId" },
    }));

    // drizzle-orm mock
    await mock.module("drizzle-orm", () => ({
      and: (...args: unknown[]) => args,
      eq: () => {},
    }));

    // React cache mock — 함수를 래핑하지만 호출은 그대로 통과
    const cacheMock = <T extends (...args: never[]) => unknown>(fn: T) => fn;
    await mock.module("react", () => ({
      cache: cacheMock,
    }));

    // session.ts를 동적 import — 위 mock들이 적용됨
    const { getActiveProfileContext } = await import("@/lib/auth/session");

    const result = await getActiveProfileContext();
    expect(result).toBeNull();
  });

  test("auth()가 userId를 반환하지 않을 때 null을 반환한다", async () => {
    await mock.module("@/auth", () => ({
      auth: async () => ({ user: null }),
      unauthorized: () => {
        throw new Error("unauthorized");
      },
    }));

    await mock.module("next/headers", () => ({
      cookies: async () => ({
        get: () => undefined,
      }),
    }));

    await mock.module("@/db/client", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => [],
          }),
        }),
        transaction: async () => {},
      },
    }));

    await mock.module("@/db/schema", () => ({
      profiles: { id: "id", familyId: "familyId", role: "role", name: "name" },
      userFamilies: { familyId: "familyId", userId: "userId" },
    }));

    await mock.module("drizzle-orm", () => ({
      and: (...args: unknown[]) => args,
      eq: () => {},
    }));

    const cacheMock = <T extends (...args: never[]) => unknown>(fn: T) => fn;
    await mock.module("react", () => ({
      cache: cacheMock,
    }));

    const { getActiveProfileContext } = await import("@/lib/auth/session");

    const result = await getActiveProfileContext();
    expect(result).toBeNull();
  });

  test("DB 쿼리 실패 시 null을 반환한다", async () => {
    await mock.module("@/auth", () => ({
      auth: async () => ({ user: { id: "user-123" } }),
      unauthorized: () => {
        throw new Error("unauthorized");
      },
    }));

    await mock.module("next/headers", () => ({
      cookies: async () => ({
        get: (name: string) =>
          name === ACTIVE_PROFILE_COOKIE ? { value: "profile-1" } : undefined,
      }),
    }));

    // DB 쿼리가 throw하도록 설정
    await mock.module("@/db/client", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => {
              throw new Error("ECONNREFUSED");
            },
          }),
        }),
        transaction: async () => {},
      },
    }));

    await mock.module("@/db/schema", () => ({
      profiles: { id: "id", familyId: "familyId", role: "role", name: "name" },
      userFamilies: { familyId: "familyId", userId: "userId" },
    }));

    await mock.module("drizzle-orm", () => ({
      and: (...args: unknown[]) => args,
      eq: () => {},
    }));

    const cacheMock = <T extends (...args: never[]) => unknown>(fn: T) => fn;
    await mock.module("react", () => ({
      cache: cacheMock,
    }));

    const { getActiveProfileContext } = await import("@/lib/auth/session");

    const result = await getActiveProfileContext();
    expect(result).toBeNull();
  });

  test("정상 세션 + 프로필 존재 시 ResolvedActiveProfile을 반환한다", async () => {
    await mock.module("@/auth", () => ({
      auth: async () => ({ user: { id: "user-123" } }),
      unauthorized: () => {
        throw new Error("unauthorized");
      },
    }));

    await mock.module("next/headers", () => ({
      cookies: async () => ({
        get: (name: string) =>
          name === ACTIVE_PROFILE_COOKIE ? { value: "profile-1" } : undefined,
      }),
    }));

    await mock.module("@/db/client", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => [
              {
                id: "profile-1",
                familyId: "family-1",
                role: "admin" as const,
                name: "테스트 사용자",
              },
            ],
          }),
        }),
        transaction: async () => {},
      },
    }));

    await mock.module("@/db/schema", () => ({
      profiles: { id: "id", familyId: "familyId", role: "role", name: "name" },
      userFamilies: { familyId: "familyId", userId: "userId" },
    }));

    await mock.module("drizzle-orm", () => ({
      and: (...args: unknown[]) => args,
      eq: () => {},
    }));

    const cacheMock = <T extends (...args: never[]) => unknown>(fn: T) => fn;
    await mock.module("react", () => ({
      cache: cacheMock,
    }));

    const { getActiveProfileContext } = await import("@/lib/auth/session");

    const result = await getActiveProfileContext();
    expect(result).not.toBeNull();
    if (result) {
      expect(result.id).toBe("profile-1");
      expect(result.familyId).toBe("family-1");
      expect(result.role).toBe("admin");
      expect(result.name).toBe("테스트 사용자");
    }
  });
});
