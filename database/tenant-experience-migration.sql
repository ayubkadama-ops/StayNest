ALTER TABLE bookings
  ADD COLUMN booking_kind ENUM('stay','viewing') NOT NULL DEFAULT 'stay',
  ADD COLUMN appointment_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  saved_searches BOOLEAN NOT NULL DEFAULT TRUE,
  price_drops BOOLEAN NOT NULL DEFAULT TRUE,
  booking_updates BOOLEAN NOT NULL DEFAULT TRUE,
  messages BOOLEAN NOT NULL DEFAULT TRUE,
  followed_agents BOOLEAN NOT NULL DEFAULT TRUE,
  marketing BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deletion_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_deletion_request_user (user_id)
) ENGINE=InnoDB;
