USE staynest;

ALTER TABLE users
  ADD COLUMN failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN failed_login_round TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN login_locked_until DATETIME NULL,
  ADD COLUMN last_failed_login_at DATETIME NULL,
  ADD COLUMN require_password_change BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  identifier_hash BINARY(32) NOT NULL,
  ip_address VARBINARY(16) NULL,
  successful BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_login_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_login_attempt_user (user_id, attempted_at),
  INDEX idx_login_attempt_ip (ip_address, attempted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  status ENUM('pending','approved','completed','rejected','expired') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_by BIGINT UNSIGNED NULL,
  handled_at DATETIME NULL,
  note VARCHAR(1000) NULL,
  requested_ip VARBINARY(16) NULL,
  CONSTRAINT fk_password_reset_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_password_reset_request_handler FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_password_reset_request_status (status, requested_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS temporary_passwords (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  issued_by BIGINT UNSIGNED NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_temporary_password_request FOREIGN KEY (request_id) REFERENCES password_reset_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_temporary_password_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_temporary_password_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_temporary_password_user (user_id, expires_at)
) ENGINE=InnoDB;
