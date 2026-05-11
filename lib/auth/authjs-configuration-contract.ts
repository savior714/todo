/**
 * Auth.js 기본 `/api/auth/error?error=Configuration` HTML은 `@auth/core`의
 * `lib/pages/error.js`에서 **HTTP 500**을 의도적으로 사용한다.
 * DevTools의 "Failed to load resource: 500"은 Next 핸들러 붕괴가 아니라 위 동작일 수 있다.
 * 실제 원인은 README「Vercel에서 Auth.js Server error」절과 `GET /api/health`의 `checks`·`db`·`tables`로 좁힌다.
 *
 * @see https://github.com/nextauthjs/next-auth — 패키지 업그레이드 시 `tests/unit/auth-configuration-diagnostics.test.ts`가 깨지면 이 상수·upstream 정의를 재검증할 것.
 */
export const AUTH_JS_CONFIGURATION_ERROR_QUERY = "Configuration" as const;

/** @auth/core 기본 Configuration 에러 카드가 내려주는 HTTP 상태 코드 */
export const AUTH_JS_CONFIGURATION_ERROR_PAGE_STATUS = 500 as const;
