CREATE TABLE IF NOT EXISTS listing_duplicate_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_low_id BIGINT UNSIGNED NOT NULL,
  listing_high_id BIGINT UNSIGNED NOT NULL,
  decision ENUM('confirmed_duplicate','not_duplicate') NOT NULL,
  resolution_note VARCHAR(1000) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_duplicate_review_low FOREIGN KEY (listing_low_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_duplicate_review_high FOREIGN KEY (listing_high_id) REFERENCES listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_duplicate_review_actor FOREIGN KEY (reviewed_by) REFERENCES users(id),
  CONSTRAINT uq_listing_duplicate_pair UNIQUE (listing_low_id, listing_high_id),
  INDEX idx_duplicate_review_decision (decision, reviewed_at)
) ENGINE=InnoDB;
