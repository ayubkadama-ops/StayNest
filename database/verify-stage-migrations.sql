SELECT 'required_columns' AS check_name, COUNT(*) AS present_count
FROM information_schema.columns
WHERE table_schema=DATABASE()
  AND (
    (table_name='identity_verifications' AND column_name='encryption_version')
    OR (table_name='listings' AND column_name IN (
      'transaction_type', 'sale_price', 'plot_size', 'plot_size_unit',
      'land_use', 'title_status', 'floor_area', 'commercial_use',
      'district', 'ward', 'property_size', 'furnished', 'category_details',
      'advertising_authorization', 'authorization_notes', 'authorization_attested_at'
    ))
    OR (table_name='agent_profiles' AND column_name IN ('specializations','service_areas','business_id'))
    OR (table_name='businesses' AND column_name='business_type')
  );

SELECT 'required_indexes' AS check_name, COUNT(DISTINCT index_name) AS present_count
FROM information_schema.statistics
WHERE table_schema=DATABASE()
  AND table_name='listings'
  AND index_name IN (
    'idx_listings_journey',
    'idx_listings_location_search',
    'idx_listings_beds_search',
    'idx_listings_furnishing_search',
    'idx_listings_size_search'
  );

SELECT 'private_document_tokens_table' AS check_name, COUNT(*) AS present_count
FROM information_schema.tables
WHERE table_schema=DATABASE()
  AND table_name='identity_document_download_tokens';

SELECT 'property_verification_tables' AS check_name, COUNT(*) AS present_count
FROM information_schema.tables
WHERE table_schema=DATABASE()
  AND table_name IN ('listing_verifications', 'listing_verification_events');

SELECT 'agent_ecosystem' AS check_name, COUNT(*) AS present_count
FROM information_schema.columns
WHERE table_schema=DATABASE()
  AND ((table_name='agent_profiles' AND column_name IN ('specializations','service_areas','business_id'))
    OR (table_name='businesses' AND column_name='business_type'));

SELECT 'structured_listing_details' AS check_name, COUNT(*) AS present_count
FROM information_schema.columns
WHERE table_schema=DATABASE()
  AND table_name='listings'
  AND column_name IN ('category_details','advertising_authorization','authorization_notes','authorization_attested_at');

SELECT 'property_verification_actor_label' AS check_name, COUNT(*) AS present_count
FROM information_schema.columns
WHERE table_schema=DATABASE()
  AND table_name='listing_verification_events'
  AND column_name='actor_label';

SELECT transaction_type, COUNT(*) AS listing_count
FROM listings
GROUP BY transaction_type
ORDER BY transaction_type;

SELECT currency, COUNT(*) AS listing_count
FROM listings
GROUP BY currency
ORDER BY currency;

SELECT migration_name, checksum, applied_at
FROM schema_migrations
WHERE migration_name IN (
  'private-document-access-migration.sql',
  'property-journeys-migration.sql',
  'property-search-migration.sql',
  'property-verification-migration.sql'
  ,'listing-category-details-migration.sql'
)
ORDER BY migration_name;

SHOW CREATE TABLE listings;
SHOW CREATE TABLE identity_verifications;
SHOW CREATE TABLE identity_document_download_tokens;
SHOW CREATE TABLE listing_verifications;
SHOW CREATE TABLE listing_verification_events;
