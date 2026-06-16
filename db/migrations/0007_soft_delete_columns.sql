-- homework_logs soft-delete: is_reverted 컬럼 추가
ALTER TABLE homework_logs ADD COLUMN is_reverted INTEGER NOT NULL DEFAULT 0;

-- routine_logs soft-delete: is_reverted 컬럼 추가
ALTER TABLE routine_logs ADD COLUMN is_reverted INTEGER NOT NULL DEFAULT 0;

-- profiles soft-delete: is_deleted 컬럼 추가
ALTER TABLE profiles ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
