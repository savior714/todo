/**
 * NextAuth는 `AUTH_URL`/`NEXTAUTH_URL`이 있으면 요청 Origin 대신 이 값으로 OAuth
 * redirect_uri·콜백 URL을 고정합니다. Preview가 Production env를 상속하거나, 로컬에서
 * `AUTH_URL`만 다른 배포 주소로 남아 있으면 구글 로그인 후 다른 프로젝트로 넘어갑니다.
 * @see node_modules/next-auth/src/lib/env.ts — reqWithEnvURL
 */
export function register(): void {
  if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview") {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    return;
  }

  if (process.env.VERCEL) {
    return;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const authBase = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  if (!authBase) {
    return;
  }

  const local =
    site.includes("localhost") ||
    site.includes("127.0.0.1") ||
    site === "";
  if (!local) {
    return;
  }

  try {
    const authHost = new URL(authBase).hostname;
    const siteHost = site ? new URL(site).hostname : "localhost";
    if (authHost !== siteHost) {
      delete process.env.AUTH_URL;
      delete process.env.NEXTAUTH_URL;
    }
  } catch {
    // ignore invalid URL
  }
}
