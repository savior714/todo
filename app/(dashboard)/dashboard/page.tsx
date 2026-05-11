import { Suspense } from "react";
import { redirect } from "next/navigation";
import { logoutProfile } from "@/app/actions/auth";
import DailyPinBanner from "@/app/(dashboard)/DailyPinBanner";
import DashboardDeferred from "@/app/(dashboard)/dashboard/DashboardDeferred";
import TimelineFeedSection from "@/app/(dashboard)/TimelineFeedSection";
import { getActiveProfileContext } from "@/lib/auth/session";
import { dashboardPerfNow, logDashboardPerf } from "@/lib/dashboard-perf";

function DashboardBodySkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-24 rounded-xl bg-neutral-200/80 dark:bg-neutral-800/80" />
      <div className="h-40 rounded-xl bg-neutral-200/80 dark:bg-neutral-800/80" />
    </div>
  );
}

function TimelineFeedSkeleton() {
  return (
    <section
      className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
      aria-busy
      aria-label="타임라인을 불러오는 중"
    >
      <div className="h-6 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-4 grid min-h-[12rem] grid-cols-3 gap-2">
        <div className="h-32 rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        <div className="h-32 rounded-lg bg-neutral-200/80 dark:bg-neutral-800/80" />
        <div className="h-32 rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const t0 = dashboardPerfNow();
  const profile = await getActiveProfileContext();
  logDashboardPerf("profile", t0);
  if (!profile) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">FamilySync Dashboard</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            active_profile_id 쿠키가 있는 경우에만 접근 가능합니다.
          </p>
        </div>
        <form action={logoutProfile} className="shrink-0 pt-0.5">
          <button
            type="submit"
            aria-label="로그아웃"
            title="로그아웃"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
              />
            </svg>
          </button>
        </form>
      </header>
      <Suspense fallback={null}>
        <DailyPinBanner familyId={profile.familyId} />
      </Suspense>
      <Suspense fallback={<DashboardBodySkeleton />}>
        <DashboardDeferred profile={profile} />
      </Suspense>
      <Suspense fallback={<TimelineFeedSkeleton />}>
        <TimelineFeedSection familyId={profile.familyId} />
      </Suspense>
    </main>
  );
}
