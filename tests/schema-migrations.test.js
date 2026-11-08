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

test('property journey migration is part of the startup sequence', () => {
  assert.ok(SCHEMA_MIGRATIONS.includes('property-journeys-migration.sql'));
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
