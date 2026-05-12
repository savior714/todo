-- 가족 공통 루틴 체크리스트(숙제와 별도). 일자별 완료는 routine_logs.
CREATE TABLE IF NOT EXISTS routine_items (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS routine_items_family_idx ON routine_items (family_id);
CREATE INDEX IF NOT EXISTS routine_items_family_active_sort_idx ON routine_items (family_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS routine_logs (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  routine_item_id TEXT NOT NULL REFERENCES routine_items(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  completed_by TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  completed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS routine_logs_item_date_unique_idx ON routine_logs (routine_item_id, date_key);
CREATE INDEX IF NOT EXISTS routine_logs_family_date_idx ON routine_logs (family_id, date_key);
