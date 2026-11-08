ALTER TABLE listings ADD COLUMN category_details JSON NULL;
ALTER TABLE listings ADD COLUMN advertising_authorization ENUM('owner','authorized_agent','agency','other') NULL;
ALTER TABLE listings ADD COLUMN authorization_notes VARCHAR(500) NULL;
ALTER TABLE listings ADD COLUMN authorization_attested_at DATETIME NULL;
