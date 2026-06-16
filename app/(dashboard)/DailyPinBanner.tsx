import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyPins } from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard/perf";
import { safeDbQuery } from "@/lib/dashboard/error";
import DailyPinContent from "@/app/(dashboard)/DailyPinContent";

type DailyPinBannerProps = Readonly<{
  familyId: string;
}>;

const TRUNCATE_THRESHOLD = 200;

export default async function DailyPinBanner({ familyId }: DailyPinBannerProps) {
  const t0 = dashboardPerfNow();

  const { rows: pinRows, failed: dailyPinFailed } = await safeDbQuery(
    () =>
      db
        .select({ content: dailyPins.content })
        .from(dailyPins)
        .where(and(eq(dailyPins.familyId, familyId), eq(dailyPins.isActive, true)))
        .orderBy(desc(dailyPins.createdAt))
        .limit(1),
    "daily_pin",
    { familyId }
  );

  logDashboardPerf("daily_pin", t0);

  if (dailyPinFailed) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      >
        오늘의 핀 데이터를 불러오지 못했습니다.
      </p>
    );
  }

  const pin = pinRows[0];
  if (!pin) {
    return null;
  }

  const shouldTruncate = pin.content.length > TRUNCATE_THRESHOLD;

  return (
    <DailyPinContent pin={pin} shouldTruncate={shouldTruncate} />
  );
}
