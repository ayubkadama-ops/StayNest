ALTER TABLE users ADD COLUMN username VARCHAR(120) NULL;
CREATE UNIQUE INDEX uq_users_username ON users (username);
