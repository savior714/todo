CREATE TABLE IF NOT EXISTS quick_actions (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  label TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS quick_actions_family_active_sort_idx ON quick_actions (family_id, is_active, sort_order);
