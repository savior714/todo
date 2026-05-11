import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyPins } from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard-perf";

type DailyPinBannerProps = Readonly<{
  familyId: string;
}>;

export default async function DailyPinBanner({ familyId }: DailyPinBannerProps) {
  const t0 = dashboardPerfNow();
  const [pin] = await db
    .select({ content: dailyPins.content })
    .from(dailyPins)
    .where(and(eq(dailyPins.familyId, familyId), eq(dailyPins.isActive, true)))
    .orderBy(desc(dailyPins.createdAt))
    .limit(1);

  logDashboardPerf("daily_pin", t0);

  if (!pin) {
    return null;
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
      <p className="text-sm font-semibold leading-none tracking-tight">오늘의 지시사항</p>
      <p className="mt-2 text-base leading-relaxed">{pin.content}</p>
    </section>
  );
}
