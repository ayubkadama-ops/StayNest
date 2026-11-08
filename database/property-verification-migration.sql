CREATE TABLE IF NOT EXISTS listing_verifications (
  listing_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  verification_status ENUM('unverified','submitted','under_review','verified','rejected','expired') NOT NULL DEFAULT 'unverified',
  identity_status ENUM('not_reviewed','checked','rejected') NOT NULL DEFAULT 'not_reviewed',
  location_status ENUM('not_reviewed','checked','rejected') NOT NULL DEFAULT 'not_reviewed',
  authority_status ENUM('not_reviewed','checked','rejected') NOT NULL DEFAULT 'not_reviewed',
  documents_status ENUM('not_reviewed','checked','rejected') NOT NULL DEFAULT 'not_reviewed',
  submitted_at DATETIME NULL,
  verified_at DATETIME NULL,
  expires_at DATE NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  rejection_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_listing_verification_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_listing_verification_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX idx_listing_verification_queue (verification_status, updated_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listing_verification_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_label VARCHAR(120) NULL,
  check_name VARCHAR(32) NOT NULL,
  previous_status VARCHAR(24) NULL,
  new_status VARCHAR(24) NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_listing_verification_event_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_listing_verification_event_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  INDEX idx_listing_verification_events (listing_id, created_at)
) ENGINE=InnoDB;

INSERT IGNORE INTO listing_verifications (listing_id, verification_status)
SELECT id, 'unverified' FROM listings;
