-- duplicate event 방지: 같은 family·action·target·날짜 조합 중복 삽입 차단
ALTER TABLE events ADD COLUMN created_date TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS events_family_action_target_date_unique_idx
  ON events (family_id, action_type, target, created_date);
