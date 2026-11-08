USE staynest;

ALTER TABLE user_profiles
  ALTER COLUMN preferred_currency SET DEFAULT 'TZS';

ALTER TABLE listings
  ALTER COLUMN currency SET DEFAULT 'TZS';

ALTER TABLE listings
  ADD COLUMN transaction_type ENUM('sale','rent','stay','both') NULL,
  ADD COLUMN sale_price DECIMAL(14,2) NULL,
  ADD COLUMN plot_size DECIMAL(14,2) NULL,
  ADD COLUMN plot_size_unit ENUM('sqm','acres','hectares') NULL,
  ADD COLUMN land_use VARCHAR(120) NULL,
  ADD COLUMN title_status ENUM('unknown','title_deed','offer','customary','other') NULL,
  ADD COLUMN floor_area DECIMAL(14,2) NULL,
  ADD COLUMN commercial_use ENUM('office','retail','hospitality','warehouse','mixed_use','other') NULL;

UPDATE listings
SET transaction_type = CASE rental_mode
  WHEN 'long_term' THEN 'rent'
  WHEN 'both' THEN 'both'
  ELSE 'stay'
END
WHERE transaction_type IS NULL;

ALTER TABLE listings
  MODIFY COLUMN transaction_type ENUM('sale','rent','stay','both') NOT NULL DEFAULT 'stay',
  ADD INDEX idx_listings_journey (transaction_type, status, property_type_id, city);

ALTER TABLE listings DROP CONSTRAINT chk_listing_prices;

ALTER TABLE listings
  ADD CONSTRAINT chk_listing_prices CHECK (
    sale_price IS NOT NULL OR nightly_price IS NOT NULL OR monthly_price IS NOT NULL OR yearly_price IS NOT NULL
  );
