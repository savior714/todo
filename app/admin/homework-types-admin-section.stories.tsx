import type { Meta, StoryObj } from "@storybook/nextjs";
import { HomeworkTypesAdminSection, type HomeworkTypeAdminRow } from "@/app/admin/homework-types-admin-section";

const noopForm = async () => {
  await Promise.resolve();
};

const sampleRows: HomeworkTypeAdminRow[] = [
  { id: "hw-1", title: "한글 읽기", childGroup: "kid7", isActive: true },
  { id: "hw-2", title: "수학 문제집", childGroup: "kid4", isActive: true },
  { id: "hw-3", title: "옛 유형", childGroup: "kid7", isActive: false },
];

const meta = {
  title: "Admin/숙제 유형 관리",
  component: HomeworkTypesAdminSection,
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
            대시보드 「숙제 유형 관리」는{" "}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
              /admin#homework-types-admin
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
} satisfies Meta<typeof HomeworkTypesAdminSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AnchorBlock: Story = {
  name: "앵커 블록",
  args: {
    rows: sampleRows,
    submitHomeworkType: noopForm,
    submitDeactivateHomeworkType: noopForm,
  },
};
