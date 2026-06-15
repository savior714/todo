import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyPins } from "@/db/schema";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard/perf";
import DailyPinContent from "@/app/(dashboard)/DailyPinContent";

type DailyPinBannerProps = Readonly<{
  familyId: string;
}>;

const TRUNCATE_THRESHOLD = 200;

export default async function DailyPinBanner({ familyId }: DailyPinBannerProps) {
  const t0 = dashboardPerfNow();
  let pin: { content: string } | undefined;
  try {
    const [result] = await db
      .select({ content: dailyPins.content })
      .from(dailyPins)
      .where(and(eq(dailyPins.familyId, familyId), eq(dailyPins.isActive, true)))
      .orderBy(desc(dailyPins.createdAt))
      .limit(1);
    pin = result;
  } catch (err) {
    console.error("[DailyPinBanner] DB query failed:", err);
  }

  logDashboardPerf("daily_pin", t0);

  if (!pin) {
    return null;
  }

  const shouldTruncate = pin.content.length > TRUNCATE_THRESHOLD;

  return (
    <DailyPinContent pin={pin} shouldTruncate={shouldTruncate} />
  );
}
