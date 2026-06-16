/**
 * DB 로딩 오류 처리 통합 utility.
 * `safeDbQuery`는 try/catch 래퍼로서 실패 시 `{ rows: T[], failed: true }`를 반환하고,
 * `logDbLoadError`는 구조화된 에러 로깅을 담당한다.
 */

/**
 * Error 객체에서 Turso/DB error code를 추출한다.
 * string 또는 number 타입만 허용하고, 그 외는 undefined를 반환한다.
 */
export function extractErrorCode(err: unknown): string | number | undefined {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  ) {
    return (err as { code: string }).code;
  }
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "number"
  ) {
    return (err as { code: number }).code;
  }
  return undefined;
}

/**
 * DB 로딩 오류를 구조화된 형태로 로깅한다.
 * 전체 Error 객체를 전달하지 않아 시크릿 노출 위험을 방지한다.
 */
export function logDbLoadError(
  label: string,
  context: Record<string, unknown>
): void {
  console.error(`[dashboard] ${label} load failed`, context);
}

/**
 * DB 쿼리를 try/catch로 래핑한다.
 * 성공 시 `{ rows: T[], failed: false }`를, 실패 시 `{ rows: [], failed: true }`를 반환한다.
 * 실패 시 `logDbLoadError`로 구조화된 로그를 남긴다.
 */
export async function safeDbQuery<T>(
  fn: () => Promise<T[]>,
  label: string,
  context: Record<string, unknown> = {}
): Promise<{ rows: T[]; failed: boolean }> {
  try {
    const rows = await fn();
    return { rows, failed: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = extractErrorCode(err);
    logDbLoadError(label, {
      familyId: context.familyId,
      message,
      ...(code !== undefined ? { code } : {}),
      ...(context.todayKey ? { todayKey: context.todayKey } : {}),
    });
    return { rows: [], failed: true };
  }
}
