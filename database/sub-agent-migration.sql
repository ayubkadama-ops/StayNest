USE staynest;

CREATE TABLE IF NOT EXISTS agent_subaccounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  main_agent_user_id BIGINT UNSIGNED NOT NULL,
  subagent_user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  status ENUM('active','suspended','revoked') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_subaccount_main FOREIGN KEY (main_agent_user_id) REFERENCES users(id),
  CONSTRAINT fk_subaccount_user FOREIGN KEY (subagent_user_id) REFERENCES users(id),
  INDEX idx_subaccount_main (main_agent_user_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agent_subaccount_permissions (
  subaccount_id BIGINT UNSIGNED NOT NULL,
  permission_key VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subaccount_id, permission_key),
  CONSTRAINT fk_subpermission_account FOREIGN KEY (subaccount_id) REFERENCES agent_subaccounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
