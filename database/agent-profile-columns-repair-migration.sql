-- Recover agent profile fields if the TiDB DDL migration was partially applied.
ALTER TABLE agent_profiles ADD COLUMN specializations JSON NULL;
ALTER TABLE agent_profiles ADD COLUMN service_areas JSON NULL;
ALTER TABLE agent_profiles ADD COLUMN business_id BIGINT UNSIGNED NULL;
CREATE INDEX idx_agent_profiles_business ON agent_profiles (business_id);
