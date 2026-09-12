-- Run as a privileged MySQL administrator.
-- Replace the placeholder with a new application-only password.
-- Do not use the root password in the application environment.

CREATE USER IF NOT EXISTS 'staynest_app'@'localhost'
  IDENTIFIED BY 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';

ALTER USER 'staynest_app'@'localhost'
  IDENTIFIED BY 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE
  ON staynest.* TO 'staynest_app'@'localhost';

FLUSH PRIVILEGES;

-- After creating the first administrator through the application, assign the
-- administrator role with a privileged migration:
--
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT :user_id, id FROM roles WHERE name = 'administrator'
-- ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);
