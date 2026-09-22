-- Additive Posts records. Existing listings and their media remain unchanged.
CREATE TABLE posts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id BIGINT UNSIGNED NOT NULL,
  post_type ENUM('new_listing','price_drop','fresh_photos','now_available') NOT NULL,
  caption TEXT NOT NULL,
  amenity_tags JSON NULL,
  status ENUM('draft','pending_review','published') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_post_listing FOREIGN KEY (listing_id) REFERENCES listings(id),
  INDEX idx_posts_feed (status, created_at),
  INDEX idx_posts_listing (listing_id, status)
) ENGINE=InnoDB;