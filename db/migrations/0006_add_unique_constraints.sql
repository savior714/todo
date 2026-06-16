-- homework_types 중복 방지: 같은 family·child_group·title 조합 차단
CREATE UNIQUE INDEX IF NOT EXISTS homework_types_family_child_title_unique_idx
  ON homework_types (family_id, child_group, title);

-- quick_actions 중복 방지: 같은 family·label 조합 차단
CREATE UNIQUE INDEX IF NOT EXISTS quick_actions_family_label_unique_idx
  ON quick_actions (family_id, label);
