import type { Meta, StoryObj } from "@storybook/nextjs";
import QuickActionsAdminModal, { type QuickActionAdminRow } from "@/app/(dashboard)/QuickActionsAdminModal";
import { KID7, KID4, FAMILY } from "@/lib/children";

const mockRows: QuickActionAdminRow[] = [
  { id: "qa-1", label: "저녁 식사", actionType: "meal", target: FAMILY, sortOrder: 0, isActive: true },
  { id: "qa-2", label: "약 먹기", actionType: "medication", target: KID4, sortOrder: 1, isActive: true },
  { id: "qa-3", label: "등원 확인", actionType: "school_dropoff", target: KID7, sortOrder: 2, isActive: false },
  { id: "qa-4", label: "하원 확인", actionType: "school_pickup", target: KID4, sortOrder: 3, isActive: true },
];

function QuickActionsModalPreview() {
  return (
    <div style={{ background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <QuickActionsAdminModal open={true} onClose={() => {}} rows={mockRows} />
    </div>
  );
}

const meta = {
  title: "Admin/QuickActionsModal",
  component: QuickActionsModalPreview,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof QuickActionsModalPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
