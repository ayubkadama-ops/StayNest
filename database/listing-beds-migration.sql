-- Additive beds field for the lean listing wizard.
ALTER TABLE listings
  ADD COLUMN beds TINYINT UNSIGNED NULL AFTER bedrooms;