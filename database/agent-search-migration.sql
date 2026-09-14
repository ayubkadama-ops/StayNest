USE staynest;

SET @agency_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'agent_profiles'
    AND column_name = 'agency_name'
);
SET @agency_column_sql := IF(
  @agency_column_exists = 0,
  'ALTER TABLE agent_profiles ADD COLUMN agency_name VARCHAR(160) NULL AFTER bio',
  'SELECT 1'
);
PREPARE agency_column_stmt FROM @agency_column_sql;
EXECUTE agency_column_stmt;
DEALLOCATE PREPARE agency_column_stmt;

SET @agency_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'agent_profiles'
    AND index_name = 'idx_agent_profiles_agency_name'
);
SET @agency_index_sql := IF(
  @agency_index_exists = 0,
  'CREATE INDEX idx_agent_profiles_agency_name ON agent_profiles (agency_name)',
  'SELECT 1'
);
PREPARE agency_index_stmt FROM @agency_index_sql;
EXECUTE agency_index_stmt;
DEALLOCATE PREPARE agency_index_stmt;
