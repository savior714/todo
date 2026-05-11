import type { Meta, StoryObj } from "@storybook/nextjs";
import { QuickActionsAdminSection, type QuickActionAdminRow } from "@/app/admin/quick-actions-admin-section";

const noopForm = async () => {
  await Promise.resolve();
};

const sampleRows: QuickActionAdminRow[] = [
  { id: "qa-1", label: "식사 기록", actionType: "meal", target: "family", sortOrder: 0, isActive: true },
  { id: "qa-2", label: "투약 기록", actionType: "medication", target: "kid4", sortOrder: 1, isActive: true },
  { id: "qa-3", label: "옛 양치", actionType: "brushing", target: "kid7", sortOrder: 2, isActive: false },
];

const meta = {
  title: "Admin/퀵 액션 편집",
  component: QuickActionsAdminSection,
  argTypes: {
    quickActionError: {
      control: "text",
      description: "비우면 오류 박스 없음. 실제 앱에서는 잘못된 커스텀 타입 등으로 `/admin?quickActionError=…`에 붙습니다.",
    },
    rows: { table: { disable: true } },
    submitQuickAction: { table: { disable: true } },
    submitDeactivateQuickAction: { table: { disable: true } },
  },
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-[520px] bg-neutral-200/90 p-6 dark:bg-neutral-950">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-neutral-300 bg-white shadow-2xl dark:border-neutral-600 dark:bg-neutral-900">
          <header className="border-b border-neutral-200 px-4 py-3 text-sm leading-relaxed text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
            대시보드 우측 상단 「퀵 액션 편집」은{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
              /admin#quick-actions-admin
            </code>
            로 이동합니다. 아래 UI는 그 앵커 블록과 동일합니다. (스토리북에서는 제출이 서버로 가지 않습니다.)
          </header>
          <div className="p-4">
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof QuickActionsAdminSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 한 화면: Controls의 `quickActionError`에 문자를 넣으면 빨간 박스가 뜨고, 비우면 사라집니다. */
export const Default: Story = {
  name: "앵커 블록",
  args: {
    rows: sampleRows,
    quickActionError: "",
    submitQuickAction: noopForm,
    submitDeactivateQuickAction: noopForm,
  },
};
