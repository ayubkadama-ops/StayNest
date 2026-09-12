USE staynest;

CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  phone VARCHAR(32) NULL,
  bio TEXT NULL,
  profile_image_url VARCHAR(2048) NULL,
  followers_count INT UNSIGNED NOT NULL DEFAULT 0,
  following_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_agent_profile_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agent_follows (
  follower_user_id BIGINT UNSIGNED NOT NULL,
  agent_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_user_id, agent_user_id),
  CONSTRAINT fk_follow_follower FOREIGN KEY (follower_user_id) REFERENCES users(id),
  CONSTRAINT fk_follow_agent FOREIGN KEY (agent_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listing_likes (
  user_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, listing_id),
  CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_like_listing FOREIGN KEY (listing_id) REFERENCES listings(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listing_views (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id BIGINT UNSIGNED NOT NULL,
  viewer_user_id BIGINT UNSIGNED NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_view_listing FOREIGN KEY (listing_id) REFERENCES listings(id),
  CONSTRAINT fk_view_user FOREIGN KEY (viewer_user_id) REFERENCES users(id),
  INDEX idx_views_listing (listing_id, viewed_at)
) ENGINE=InnoDB;

INSERT IGNORE INTO agent_profiles (user_id)
SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.name='agent';
