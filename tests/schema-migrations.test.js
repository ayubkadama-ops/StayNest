import assert from 'node:assert/strict';
import test from 'node:test';
import { applySchemaMigrations, SCHEMA_MIGRATIONS } from '../server/schema-migrations.js';

function createMigrationPool({ failOn } = {}) {
  const statements = [];
  const applied = new Map();
  return {
    statements,
    applied,
    async execute(sql, values = []) {
      if (sql.startsWith('INSERT INTO schema_migrations')) {
        applied.set(values[0], values[1]);
      }
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql, values = []) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) {
        const checksum = applied.get(values[0]);
        return [checksum ? [{ checksum }] : [], []];
      }
      if (sql === failOn) {
        const error = new Error('Migration failed');
        error.code = 'ER_PARSE_ERROR';
        throw error;
      }
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };
}

test('property marketplace migrations are part of the startup sequence', () => {
  assert.ok(SCHEMA_MIGRATIONS.includes('property-journeys-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('property-search-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('property-verification-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('agent-ecosystem-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('listing-category-details-migration.sql'));
});

test('username column migration keeps its unique index separate for TiDB compatibility', async () => {
  const statements = [];
  const pool = {
    async execute(sql) {
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };

  await applySchemaMigrations(pool, 'database', ['admin-username-migration.sql']);
  assert.ok(statements.includes('ALTER TABLE users ADD COLUMN username VARCHAR(120) NULL'));
  assert.ok(statements.includes('CREATE UNIQUE INDEX uq_users_username ON users (username)'));
  assert.ok(statements.every(sql => !/ADD COLUMN username[^;]*UNIQUE/i.test(sql)));
});

test('schema migrations apply once and skip unchanged applied files', async () => {
  const pool = createMigrationPool();
  const load = async () => 'CREATE TABLE sample (id INT);\nALTER TABLE sample ADD COLUMN title VARCHAR(20);\n';

  await applySchemaMigrations(pool, '.', ['001.sql'], load);
  await applySchemaMigrations(pool, '.', ['001.sql'], load);

  assert.equal(pool.applied.size, 1);
  assert.equal(pool.statements.filter(sql => sql.startsWith('CREATE TABLE sample')).length, 1);
  assert.equal(pool.statements.filter(sql => sql.startsWith('ALTER TABLE sample')).length, 1);
});

test('schema migrations reject a changed applied migration', async () => {
  const pool = createMigrationPool();
  await applySchemaMigrations(pool, '.', ['001.sql'], async () => 'CREATE TABLE sample (id INT);');

  await assert.rejects(
    applySchemaMigrations(pool, '.', ['001.sql'], async () => 'CREATE TABLE sample (id BIGINT);'),
    /Applied database migration was modified: 001\.sql/
  );
});

test('failed schema migrations are not recorded as applied', async () => {
  const statement = 'ALTER TABLE sample ADD COLUMN title VARCHAR(20)';
  const pool = createMigrationPool({ failOn: statement });

  await assert.rejects(
    applySchemaMigrations(pool, '.', ['001.sql'], async () => `${statement};`),
    /Migration failed/
  );
  assert.equal(pool.applied.size, 0);
});

test('duplicate columns are skipped only when every requested column exists', async () => {
  const statements = [];
  const pool = {
    statements,
    async execute(sql, values = []) {
      statements.push(sql);
      if (sql.startsWith('INSERT INTO schema_migrations')) return [{ affectedRows: 1 }, []];
      return [{ affectedRows: 1 }, []];
    },
    async query(sql, values = []) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return values[1] === 'district' ? [[{ COLUMN_NAME: 'district' }], []] : [[], []];
      }
      if (sql.startsWith('ALTER TABLE listings')) {
        const error = new Error('Duplicate column');
        error.code = 'ER_DUP_FIELDNAME';
        throw error;
      }
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };

  await assert.rejects(
    applySchemaMigrations(
      pool,
      '.',
      ['partial.sql'],
      async () => 'ALTER TABLE listings ADD COLUMN district VARCHAR(100), ADD COLUMN ward VARCHAR(100);'
    ),
    /partially applied/
  );
  assert.equal(statements.some(sql => sql.startsWith('INSERT INTO schema_migrations')), false);
});

test('an already-existing single column is confirmed through schema metadata', async () => {
  const pool = {
    applied: new Map(),
    async execute(sql, values = []) {
      if (sql.startsWith('INSERT INTO schema_migrations')) this.applied.set(values[0], values[1]);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql, values = []) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      if (sql.startsWith('ALTER TABLE listings')) {
        const error = new Error('Duplicate column');
        error.code = 'ER_DUP_FIELDNAME';
        throw error;
      }
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [[{ COLUMN_NAME: values[1] }], []];
      return [{ affectedRows: 1 }, []];
    }
  };

  await applySchemaMigrations(pool, '.', ['existing.sql'], async () => (
    'ALTER TABLE listings ADD COLUMN district VARCHAR(100);'
  ));
  assert.equal(pool.applied.size, 1);
});
