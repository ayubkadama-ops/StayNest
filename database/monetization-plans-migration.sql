USE staynest;

CREATE TABLE IF NOT EXISTS monetization_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_key VARCHAR(60) NOT NULL,
  name VARCHAR(100) NOT NULL,
  audience ENUM('agents','agencies','developers','owners') NOT NULL,
  description VARCHAR(1000) NOT NULL,
  price_amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'TZS',
  billing_interval ENUM('monthly','yearly','one_time') NOT NULL DEFAULT 'monthly',
  features_json JSON NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_monetization_plan_key (plan_key),
  INDEX idx_monetization_plan_audience (audience,is_enabled),
  CONSTRAINT fk_monetization_plan_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;
