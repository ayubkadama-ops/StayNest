-- Additive fields for the listing creation wizard.
-- Existing listings remain valid because both fields are nullable.
ALTER TABLE listings
  ADD COLUMN structure_type VARCHAR(40) NULL AFTER property_type_id,
  ADD COLUMN privacy_type VARCHAR(30) NULL AFTER structure_type;

ALTER TABLE listings
  MODIFY COLUMN nightly_price DECIMAL(12,2) NULL,
  MODIFY COLUMN monthly_price DECIMAL(12,2) NULL,
  MODIFY COLUMN yearly_price DECIMAL(12,2) NULL;