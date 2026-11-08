import crypto from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export const SCHEMA_MIGRATIONS = Object.freeze([
  'admin-access-migration.sql',
  'admin-username-migration.sql',
  'admin-control-migration.sql',
  'email-verification-migration.sql',
  'footer-social-migration.sql',
  'agent-migration.sql',
  'agent-search-migration.sql',
  'founder-approval-migration.sql',
  'google-oauth-migration.sql',
  'listing-beds-migration.sql',
  'listing-wizard-migration.sql',
  'password-recovery-migration.sql',
  'posts-badges-migration.sql',
  'posts-migration.sql',
  'property-categories-migration.sql',
  'security-hardening-migration.sql',
  'sub-agent-migration.sql',
  'tenant-experience-migration.sql',
  'private-document-access-migration.sql',
  'property-journeys-migration.sql'
]);

async function applyLegacyStatement(pool, statement) {
  try {
    await pool.query(statement);
  } catch (error) {
    if (/ALTER TABLE listings\s+ADD COLUMN structure_type/i.test(statement)) {
      for (const column of [
        'ALTER TABLE listings ADD COLUMN structure_type VARCHAR(40) NULL',
        'ALTER TABLE listings ADD COLUMN privacy_type VARCHAR(30) NULL'
      ]) {
        try { await pool.query(column); } catch (columnError) {
          if (columnError.code !== 'ER_DUP_FIELDNAME') throw columnError;
        }
      }
      return;
    }
    if (/ALTER TABLE listings\s+ADD COLUMN beds/i.test(statement)) {
      try { await pool.query('ALTER TABLE listings ADD COLUMN beds TINYINT UNSIGNED NULL'); } catch (columnError) {
        if (columnError.code !== 'ER_DUP_FIELDNAME') throw columnError;
      }
      return;
    }
    if (/ALTER TABLE bookings\s+ADD COLUMN booking_kind/i.test(statement)) {
      for (const column of [
        'ALTER TABLE bookings ADD COLUMN booking_kind ENUM(\'stay\',\'viewing\') NOT NULL DEFAULT \'stay\'',
        'ALTER TABLE bookings ADD COLUMN appointment_at DATETIME NULL'
      ]) {
        try { await pool.query(column); } catch (columnError) {
          if (columnError.code !== 'ER_DUP_FIELDNAME') throw columnError;
        }
      }
      return;
    }
    if (/ALTER TABLE users\s+ADD COLUMN google_id/i.test(statement) && /unsupported add column|unique key/i.test(error.message || '')) {
      try { await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL'); } catch (columnError) {
        if (columnError.code !== 'ER_DUP_FIELDNAME') throw columnError;
      }
      try { await pool.query('CREATE UNIQUE INDEX uq_users_google_id_runtime ON users (google_id)'); } catch (indexError) {
        if (!['ER_DUP_KEYNAME', 'ER_DUP_ENTRY'].includes(indexError.code)) throw indexError;
      }
      return;
    }
    if (!['ER_TABLE_EXISTS_ERROR', 'ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(error.code)) throw error;
  }
}

export async function applySchemaMigrations(
  pool,
  databaseDirectory = path.resolve(process.cwd(), 'database'),
  migrationFiles = SCHEMA_MIGRATIONS,
  loadMigration = file => readFile(path.resolve(databaseDirectory, file), 'utf8')
) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name VARCHAR(160) NOT NULL PRIMARY KEY,
    checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    applied_at DATETIME NOT NULL
  ) ENGINE=InnoDB`);

  for (const file of migrationFiles) {
    const source = await loadMigration(file);
    const checksum = crypto.createHash('sha256').update(source).digest('hex');
    const [[applied]] = await pool.query(
      'SELECT checksum FROM schema_migrations WHERE migration_name=?',
      [file]
    );
    if (applied) {
      if (applied.checksum !== checksum) throw new Error(`Applied database migration was modified: ${file}`);
      continue;
    }

    const statements = source
      .split(/;\s*(?:\r?\n|$)/)
      .map(statement => statement.replace(/^(?:--.*\r?\n|\s)+/gm, '').trim())
      .filter(Boolean);
    for (const statement of statements) await applyLegacyStatement(pool, statement);
    await pool.execute(
      'INSERT INTO schema_migrations (migration_name, checksum, applied_at) VALUES (?, ?, UTC_TIMESTAMP())',
      [file, checksum]
    );
  }

  await pool.query("INSERT IGNORE INTO property_types (name) VALUES ('apartment'), ('house'), ('room'), ('commercial'), ('short_stay'), ('land'), ('hotel')");
}
