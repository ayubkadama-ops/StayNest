USE staynest;

INSERT IGNORE INTO property_types (name)
VALUES ('land'), ('hotel'), ('commercial');

UPDATE app_settings
SET setting_value='Makazi Go'
WHERE setting_key='site_name' AND setting_value='StayNest';

UPDATE app_settings
SET setting_value='Makazi Go is being updated. Please check back shortly.'
WHERE setting_key='maintenance_message' AND setting_value='StayNest is being updated. Please check back shortly.';
