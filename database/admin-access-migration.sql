CREATE TABLE IF NOT EXISTS admin_access_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  managed_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_access_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_access_profile_manager FOREIGN KEY (managed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_access_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission_key VARCHAR(40) NOT NULL,
  assigned_by BIGINT UNSIGNED NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_key),
  CONSTRAINT fk_admin_access_permission_user FOREIGN KEY (user_id) REFERENCES admin_access_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_access_permission_assigner FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_admin_access_permission_key (permission_key)
) ENGINE=InnoDB;
