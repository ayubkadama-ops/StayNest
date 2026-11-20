USE staynest;

INSERT IGNORE INTO property_types (name)
VALUES ('venue');

ALTER TABLE listings
  ADD COLUMN venue_type VARCHAR(40) NULL,
  ADD COLUMN seated_capacity SMALLINT UNSIGNED NULL,
  ADD COLUMN standing_capacity SMALLINT UNSIGNED NULL,
  ADD COLUMN venue_room_count SMALLINT UNSIGNED NULL,
  ADD COLUMN venue_details JSON NULL,
  ADD COLUMN venue_rules JSON NULL,
  ADD COLUMN venue_pricing JSON NULL,
  ADD COLUMN venue_availability JSON NULL;

ALTER TABLE bookings
  MODIFY COLUMN booking_kind ENUM('stay','viewing','venue') NOT NULL DEFAULT 'stay',
  ADD COLUMN start_time TIME NULL,
  ADD COLUMN end_time TIME NULL,
  ADD COLUMN event_type VARCHAR(80) NULL,
  ADD COLUMN venue_addons JSON NULL,
  ADD COLUMN venue_buffer_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0;
