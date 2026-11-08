ALTER TABLE listings
  ADD COLUMN category_details JSON NULL AFTER commercial_use,
  ADD COLUMN advertising_authorization ENUM('owner','authorized_agent','agency','other') NULL AFTER category_details,
  ADD COLUMN authorization_notes VARCHAR(500) NULL AFTER advertising_authorization,
  ADD COLUMN authorization_attested_at DATETIME NULL AFTER authorization_notes;
