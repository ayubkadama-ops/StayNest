ALTER TABLE reviews
  MODIFY COLUMN status ENUM('pending_review','published','hidden','reported')
  NOT NULL DEFAULT 'pending_review';

CREATE TABLE IF NOT EXISTS agent_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  author_user_id BIGINT UNSIGNED NOT NULL,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  status ENUM('pending_review','published','hidden','reported') NOT NULL DEFAULT 'pending_review',
  agent_reply TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_review_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_agent_review_author FOREIGN KEY (author_user_id) REFERENCES users(id),
  CONSTRAINT fk_agent_review_agent FOREIGN KEY (agent_user_id) REFERENCES users(id),
  CONSTRAINT uq_agent_review_booking_author UNIQUE (booking_id, author_user_id),
  CONSTRAINT chk_agent_review_rating CHECK (rating BETWEEN 1 AND 5),
  INDEX idx_agent_reviews_agent_status (agent_user_id, status, created_at)
) ENGINE=InnoDB;
