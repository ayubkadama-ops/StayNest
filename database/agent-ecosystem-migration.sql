-- Extend existing agent records without changing legacy profile values.
ALTER TABLE agent_profiles
  ADD COLUMN specializations JSON NULL AFTER agency_name,
  ADD COLUMN service_areas JSON NULL AFTER specializations,
  ADD COLUMN business_id BIGINT UNSIGNED NULL AFTER service_areas;

CREATE INDEX idx_agent_profiles_business ON agent_profiles (business_id);

ALTER TABLE businesses
  ADD COLUMN business_type ENUM('owner','agency','developer') NOT NULL DEFAULT 'owner' AFTER id;

INSERT IGNORE INTO roles (name)
VALUES ('property_owner'), ('agency'), ('developer'), ('verification_officer');
