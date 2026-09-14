USE staynest;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES
  ('site_name', 'StayNest'),
  ('site_logo_url', ''),
  ('contact_email', 'cleysir54@gmail.com'),
  ('contact_phone', '0794 442 907'),
  ('timezone', 'Africa/Dar_es_Salaam'),
  ('maintenance_mode', '0'),
  ('maintenance_message', 'StayNest is being updated. Please check back shortly.'),
  ('cookie_consent_required', '1');

CREATE TABLE IF NOT EXISTS feature_flags (
  feature_key VARCHAR(80) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_feature_flags_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO feature_flags (feature_key, enabled, description) VALUES
  ('bookings', TRUE, 'Allow tenants to create booking requests'),
  ('messaging', TRUE, 'Allow users to exchange messages'),
  ('agent_marketplace', TRUE, 'Show the public agent marketplace'),
  ('new_registrations', TRUE, 'Allow new account registrations');

CREATE TABLE IF NOT EXISTS email_templates (
  template_key VARCHAR(80) PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_templates_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO email_templates (template_key, subject, body) VALUES
  ('agent_approval_pending', 'Your StayNest agent application is under review', 'Hello {{firstName}}, your Tanzania agent application is waiting for founder approval.'),
  ('agent_approved', 'Your StayNest agent account is approved', 'Hello {{firstName}}, your StayNest agent account is now active.');

CREATE TABLE IF NOT EXISTS admin_ip_rules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_type ENUM('allow','deny') NOT NULL,
  cidr VARCHAR(64) NOT NULL,
  label VARCHAR(120) NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_ip_rule (rule_type, cidr),
  CONSTRAINT fk_admin_ip_rules_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  audience ENUM('all','tenants','agents','administrators') NOT NULL DEFAULT 'all',
  status ENUM('draft','scheduled','published','cancelled') NOT NULL DEFAULT 'draft',
  scheduled_for DATETIME NULL,
  published_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_announcements_user FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_announcements_delivery (status, scheduled_for)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS security_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  ip_address VARBINARY(16) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_events_type_time (event_type, created_at)
) ENGINE=InnoDB;
