-- 타임라인 목록: family_id + 비-revert + created_at 범위 스캔 보조 (부분 인덱스)
CREATE INDEX IF NOT EXISTS events_family_active_created_idx ON events (family_id, created_at DESC) WHERE is_reverted = 0;
