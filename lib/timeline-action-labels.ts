const ACTION_LABEL: Record<string, string> = {
  meal: "식사",
  medication: "투약",
  school_run: "등·하원",
  school_dropoff: "등원",
  school_pickup: "하원",
  brushing: "양치",
  cleaning: "청소",
  homework: "숙제",
  routine_check: "루틴",
};

export function timelineActionLabel(actionType: string): string {
  return ACTION_LABEL[actionType] ?? actionType;
}
