USE staynest;

ALTER TABLE listings ADD COLUMN district VARCHAR(100) NULL;
ALTER TABLE listings ADD COLUMN ward VARCHAR(100) NULL;
ALTER TABLE listings ADD COLUMN property_size DECIMAL(14,2) NULL;
ALTER TABLE listings ADD COLUMN furnished ENUM('furnished','unfurnished','partially_furnished') NULL;

ALTER TABLE listings ADD INDEX idx_listings_location_search (status, region, district, ward);
ALTER TABLE listings ADD INDEX idx_listings_beds_search (status, bedrooms, bathrooms);
ALTER TABLE listings ADD INDEX idx_listings_furnishing_search (status, furnished);
ALTER TABLE listings ADD INDEX idx_listings_size_search (status, property_size);
