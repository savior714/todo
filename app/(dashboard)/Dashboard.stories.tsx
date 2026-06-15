import type { Meta, StoryObj } from "@storybook/nextjs";
import QuickActionPanel from "@/app/(dashboard)/QuickActionPanel";
import TimelineFeed, { type TimelineItem } from "@/app/(dashboard)/TimelineFeed";
import type { CreateEventAction } from "@/app/(dashboard)/RecordEventModal";
import { addDays, formatDateKey, startOfLocalDay } from "@/lib/timeline/date";

const now = new Date();
const storyTodayKey = formatDateKey(startOfLocalDay(now));
const storyYesterdayKey = formatDateKey(addDays(startOfLocalDay(now), -1));
const storyTomorrowKey = formatDateKey(addDays(startOfLocalDay(now), 1));

const createIso = (dayOffset: number, hour: number, minute: number) => {
  const date = new Date(now);
  date.setDate(now.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const quickActions = [
  { id: "qa-meal", label: "식사", actionType: "meal", target: "family" },
  { id: "qa-medication", label: "투약", actionType: "medication", target: "kid4" },
  { id: "qa-dropoff", label: "등원", actionType: "school_dropoff", target: "kid7" },
  { id: "qa-pickup", label: "하원", actionType: "school_pickup", target: "kid4" },
];

const homeworkShortcuts = [
  { id: "hw-reading", title: "한글 읽기", childGroup: "kid7" as const, completedToday: false },
  { id: "hw-math", title: "수학 문제집", childGroup: "kid4" as const, completedToday: true },
];

const timelineEvents: TimelineItem[] = [
  {
    id: "event-meal",
    action_type: "meal",
    target: "family",
    created_at: createIso(0, 8, 10),
    is_reverted: false,
    metadata: JSON.stringify({ meal: { note: "아침 식사 완료" } }),
  },
  {
    id: "event-medication",
    action_type: "medication",
    target: "kid4",
    created_at: createIso(0, 9, 20),
    is_reverted: false,
    metadata: JSON.stringify({
      medication: {
        subject: "kid4",
        items: [{ name: "해열제", amount: 5, unit: "ml" }],
        note: "식후 30분",
      },
    }),
  },
  {
    id: "event-dropoff",
    action_type: "school_dropoff",
    target: "kid7",
    created_at: createIso(-1, 8, 50),
    is_reverted: false,
    metadata: JSON.stringify({ schoolRun: { child: "kid7", place: "유치원" } }),
  },
];

const mockCreateEvent: CreateEventAction = async () => ({ success: true, eventId: "storybook-event" });
const mockAction = async () => undefined;

function DashboardPreview() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-5 text-neutral-950 dark:text-neutral-50 sm:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">FamilySync Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Storybook에서 대시보드 UI만 빠르게 확인하는 미리보기입니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="로그아웃"
          title="로그아웃"
          className="inline-flex size-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
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
      </header>

      <QuickActionPanel
        actions={quickActions}
        homeworkShortcuts={homeworkShortcuts}
        showAdminSettingsLink
        completeHomeworkAction={mockAction}
        createEventAction={mockCreateEvent}
      />
      <TimelineFeed
        initialTodayKey={storyTodayKey}
        initialYesterdayKey={storyYesterdayKey}
        initialTomorrowKey={storyTomorrowKey}
        initialEvents={timelineEvents}
        undoEventAction={mockAction}
        homeworkTypes={[
          { id: "hw-reading", title: "한글 읽기", childGroup: "kid7" },
          { id: "hw-math", title: "수학 문제집", childGroup: "kid4" },
        ]}
        homeworkLoggedKeys={[`${new Date().toISOString().slice(0, 10)}|hw-math`]}
        completeHomeworkAction={mockAction}
        routineTypes={[{ id: "rt-1", title: "물통 채우기", target: "family" }]}
        routineLoggedKeys={[]}
        completeRoutineAction={mockAction}
      />
    </main>
  );
}

const meta = {
  title: "Dashboard/Preview",
  component: DashboardPreview,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof DashboardPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
