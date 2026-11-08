ALTER TABLE identity_verifications
  ADD COLUMN encryption_version TINYINT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS identity_document_download_tokens (
  token_hash BINARY(32) PRIMARY KEY,
  verification_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  CONSTRAINT fk_identity_document_token_verification FOREIGN KEY (verification_id) REFERENCES identity_verifications(id) ON DELETE CASCADE,
  INDEX idx_identity_document_token_expiry (expires_at)
) ENGINE=InnoDB;
