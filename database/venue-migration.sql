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

INSERT INTO listings (
  owner_user_id,agent_user_id,property_type_id,structure_type,title,slug,description,status,
  booking_mode,rental_mode,transaction_type,currency,nightly_price,cleaning_fee,
  bedrooms,beds,bathrooms,max_guests,address_line1,city,country_code,
  venue_type,seated_capacity,standing_capacity,venue_room_count,
  venue_details,venue_rules,venue_pricing,venue_availability,ownership_proof_status
)
SELECT u.id,u.id,pt.id,'venue','Garden Celebration Venue','garden-celebration-venue',
       'A flexible outdoor and indoor venue for weddings, celebrations, conferences, and private events.',
       'published','request','short_term','stay','TZS',50000,10000,
       0,0,2,300,'Masaki waterfront area','Dar es Salaam','TZ',
       'event_ground',300,500,3,
       JSON_OBJECT('type','event_ground','rooms',3),
       JSON_OBJECT('minimumHours',2,'bufferMinutes',60,'allowedEventTypes','Weddings, conferences, parties','noiseCutoff','22:00'),
       JSON_OBJECT('model','hourly','basePrice',50000,'addons',JSON_ARRAY()),
       JSON_OBJECT('mon',JSON_OBJECT('open','08:00','close','22:00'),'tue',JSON_OBJECT('open','08:00','close','22:00'),'wed',JSON_OBJECT('open','08:00','close','22:00'),'thu',JSON_OBJECT('open','08:00','close','22:00'),'fri',JSON_OBJECT('open','08:00','close','22:00'),'sat',JSON_OBJECT('open','08:00','close','23:00'),'sun',JSON_OBJECT('open','08:00','close','22:00')),
       'approved'
FROM users u
JOIN user_roles ur ON ur.user_id=u.id
JOIN roles r ON r.id=ur.role_id
JOIN property_types pt ON pt.name='venue'
WHERE r.name='agent' AND u.status='active'
  AND NOT EXISTS (SELECT 1 FROM listings demo WHERE demo.structure_type='venue')
LIMIT 1;
