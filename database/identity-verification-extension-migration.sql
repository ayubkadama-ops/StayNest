USE staynest;

ALTER TABLE identity_verifications
  MODIFY COLUMN status ENUM('pending','approved','rejected','needs_resubmission','expired') NOT NULL DEFAULT 'pending',
  ADD COLUMN id_number_encrypted VARBINARY(512) NULL,
  ADD COLUMN full_name VARCHAR(160) NULL,
  ADD COLUMN date_of_birth DATE NULL,
  ADD COLUMN back_document_file_key VARCHAR(512) NULL,
  ADD COLUMN selfie_file_key VARCHAR(512) NULL,
  ADD COLUMN consent_at DATETIME NULL,
  ADD COLUMN resubmission_reason VARCHAR(500) NULL;
