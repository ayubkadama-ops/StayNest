USE staynest;

CREATE TABLE IF NOT EXISTS agent_badges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  badge_label VARCHAR(80) NOT NULL DEFAULT 'Featured agent',
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  assigned_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_badge_agent FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_badge_assigner FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_badge_active (agent_user_id, starts_at, expires_at)
) ENGINE=InnoDB;
