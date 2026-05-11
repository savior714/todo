/**
 * `FAMILYSYNC_DASHBOARD_PERF=1`일 때만 서버 로그로 구간 ms를 남깁니다.
 * 로컬에서 `/dashboard` 병목 구간을 잡을 때 사용합니다.
 */
export function isDashboardPerfEnabled(): boolean {
  return process.env.FAMILYSYNC_DASHBOARD_PERF === "1";
}

export function dashboardPerfNow(): number {
  return performance.now();
}

export function logDashboardPerf(phase: string, startedAt: number): void {
  if (!isDashboardPerfEnabled()) {
    return;
  }
  const ms = Math.round(performance.now() - startedAt);
  console.info("[dashboard-perf]", phase, `${ms}ms`);
}
