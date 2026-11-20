USE staynest;

ALTER TABLE listings
  ADD COLUMN managing_agent_id BIGINT UNSIGNED NULL,
  ADD COLUMN ownership_proof_key VARCHAR(512) NULL,
  ADD COLUMN ownership_proof_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS listing_agent_invitations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id BIGINT UNSIGNED NOT NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','accepted','declined','revoked') NOT NULL DEFAULT 'pending',
  invited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  CONSTRAINT fk_listing_agent_invitation_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_listing_agent_invitation_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
  CONSTRAINT fk_listing_agent_invitation_agent FOREIGN KEY (agent_user_id) REFERENCES users(id),
  UNIQUE KEY uq_listing_agent_invitation (listing_id, agent_user_id),
  INDEX idx_listing_agent_invitation_agent (agent_user_id,status)
) ENGINE=InnoDB;
