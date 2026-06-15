import type { Meta, StoryObj } from "@storybook/nextjs";
import RoutineItemsAdminModal, { type RoutineItemAdminRow } from "@/app/(dashboard)/RoutineItemsAdminModal";

const mockRows: RoutineItemAdminRow[] = [
  { id: "ri-1", title: "물통 채우기", target: "kid7", isActive: true },
  { id: "ri-2", title: "준비물 가방 확인", target: "kid4", isActive: true },
  { id: "ri-3", title: "치약 바르기", target: "family", isActive: false },
  { id: "ri-4", title: "손 씻기", target: "kid7", isActive: true },
];

function RoutineItemsModalPreview() {
  return (
    <div style={{ background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <RoutineItemsAdminModal open={true} onClose={() => {}} rows={mockRows} />
    </div>
  );
}

const meta = {
  title: "Admin/RoutineItemsModal",
  component: RoutineItemsModalPreview,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof RoutineItemsModalPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
