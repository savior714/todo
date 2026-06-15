import type { Meta, StoryObj } from "@storybook/nextjs";
import HomeworkTypesAdminModal, { type HomeworkTypeAdminRow } from "@/app/(dashboard)/HomeworkTypesAdminModal";

const mockRows: HomeworkTypeAdminRow[] = [
  { id: "hw-1", title: "한글 읽기", childGroup: "kid7", isActive: true },
  { id: "hw-2", title: "수학 문제집", childGroup: "kid4", isActive: true },
  { id: "hw-3", title: "그림 일기", childGroup: "kid7", isActive: false },
  { id: "hw-4", title: "영어 단어장", childGroup: "kid4", isActive: true },
];

function HomeworkTypesModalPreview() {
  return (
    <div style={{ background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <HomeworkTypesAdminModal open={true} onClose={() => {}} rows={mockRows} />
    </div>
  );
}

const meta = {
  title: "Admin/HomeworkTypesModal",
  component: HomeworkTypesModalPreview,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof HomeworkTypesModalPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
