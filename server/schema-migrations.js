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
  'property-journeys-migration.sql',
  'property-search-migration.sql',
  'property-verification-migration.sql'
]);

async function columnExists(pool, tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function indexExists(pool, tableName, indexName) {
  const [rows] = await pool.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function tableExists(pool, tableName) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?`,
    [tableName]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(pool, tableName, columnName, statement) {
  try {
    await pool.query(statement);
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME' || !(await columnExists(pool, tableName, columnName))) throw error;
  }
}

async function applyLegacyStatement(pool, statement) {
  try {
    await pool.query(statement);
  } catch (error) {
    if (/ALTER TABLE listings\s+ADD COLUMN structure_type/i.test(statement)) {
      for (const column of [
        'ALTER TABLE listings ADD COLUMN structure_type VARCHAR(40) NULL',
        'ALTER TABLE listings ADD COLUMN privacy_type VARCHAR(30) NULL'
      ]) {
        const [, tableName, columnName] = column.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+)/i) || [];
        await addColumnIfMissing(pool, tableName, columnName, column);
      }
      return;
    }
    if (/ALTER TABLE listings\s+ADD COLUMN beds/i.test(statement)) {
      await addColumnIfMissing(pool, 'listings', 'beds', 'ALTER TABLE listings ADD COLUMN beds TINYINT UNSIGNED NULL');
      return;
    }
    if (/ALTER TABLE bookings\s+ADD COLUMN booking_kind/i.test(statement)) {
      for (const column of [
        'ALTER TABLE bookings ADD COLUMN booking_kind ENUM(\'stay\',\'viewing\') NOT NULL DEFAULT \'stay\'',
        'ALTER TABLE bookings ADD COLUMN appointment_at DATETIME NULL'
      ]) {
        const [, tableName, columnName] = column.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+)/i) || [];
        await addColumnIfMissing(pool, tableName, columnName, column);
      }
      return;
    }
    if (/ALTER TABLE users\s+ADD COLUMN google_id/i.test(statement) && /unsupported add column|unique key/i.test(error.message || '')) {
      await addColumnIfMissing(pool, 'users', 'google_id', 'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL');
      try {
        await pool.query('CREATE UNIQUE INDEX uq_users_google_id_runtime ON users (google_id)');
      } catch (indexError) {
        if (indexError.code !== 'ER_DUP_KEYNAME' || !(await indexExists(pool, 'users', 'uq_users_google_id_runtime'))) {
          throw indexError;
        }
      }
      return;
    }
    if (error.code === 'ER_DUP_FIELDNAME') {
      const [, tableName] = statement.match(/^ALTER TABLE (\w+)/i) || [];
      const columnNames = [...statement.matchAll(/\bADD COLUMN\s+`?(\w+)`?/gi)].map(match => match[1]);
      if (!tableName || !columnNames.length) throw error;
      const existing = await Promise.all(columnNames.map(columnName => columnExists(pool, tableName, columnName)));
      if (existing.every(Boolean)) return;
      throw new Error(`Migration statement partially applied; existing columns: ${columnNames.filter((_, index) => existing[index]).join(', ') || 'none'}`, { cause: error });
    }
    if (error.code === 'ER_DUP_KEYNAME') {
      const match = statement.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+`?\w+`?\s+ON\s+(\w+)|^ALTER TABLE (\w+)/i);
      const tableName = match?.[1] || match?.[2];
      const [, indexName] = statement.match(/(?:CREATE\s+(?:UNIQUE\s+)?INDEX|ADD\s+(?:UNIQUE\s+)?(?:INDEX|KEY))\s+`?(\w+)`?/i) || [];
      if (!tableName || !indexName || !(await indexExists(pool, tableName, indexName))) throw error;
      return;
    }
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      const [, tableName] = statement.match(/^CREATE TABLE(?: IF NOT EXISTS)?\s+`?(\w+)`?/i) || [];
      if (!tableName || !(await tableExists(pool, tableName))) throw error;
      return;
    }
    throw error;
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
