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
  assert.ok(SCHEMA_MIGRATIONS.includes('listing-approximate-location-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('property-verification-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('agent-ecosystem-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('agent-profile-columns-repair-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('listing-category-details-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('listing-category-details-repair-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('listing-duplicate-triage-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('monetization-plans-migration.sql'));
  assert.ok(SCHEMA_MIGRATIONS.includes('reputation-reviews-migration.sql'));
});

test('approximate listing coordinates are added independently for TiDB upgrades', async () => {
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

  await applySchemaMigrations(pool, 'database', ['listing-approximate-location-migration.sql']);

  assert.ok(statements.includes('ALTER TABLE listings ADD COLUMN approximate_latitude DECIMAL(10,7) NULL'));
  assert.ok(statements.includes('ALTER TABLE listings ADD COLUMN approximate_longitude DECIMAL(10,7) NULL'));
  assert.ok(statements.some(sql => sql.startsWith('INSERT INTO schema_migrations')));
});

test('monetization plan migration creates only an unseeded configurable catalog', async () => {
  const pool = createMigrationPool();

  await applySchemaMigrations(pool, 'database', ['monetization-plans-migration.sql']);

  assert.ok(pool.statements.some(statement => statement.includes('CREATE TABLE IF NOT EXISTS monetization_plans')));
  assert.ok(pool.statements.some(statement => statement.startsWith('INSERT INTO schema_migrations')));
  assert.equal(pool.statements.some(statement => /INSERT INTO monetization_plans/i.test(statement)), false);
});

test('reputation migration separates property review status and agent review table changes', async () => {
  const pool = createMigrationPool();

  await applySchemaMigrations(pool, 'database', ['reputation-reviews-migration.sql']);

  assert.ok(pool.statements.some(statement => /^ALTER TABLE reviews[\r\n]MODIFY COLUMN status/.test(statement)));
  assert.ok(pool.statements.some(statement => statement.startsWith('CREATE TABLE IF NOT EXISTS agent_reviews')));
  assert.ok(pool.statements.some(statement => statement.startsWith('INSERT INTO schema_migrations')));
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

test('TiDB retries the journey type change and index as separate operations', async () => {
  const statements = [];
  const pool = {
    async execute(sql) {
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      if (/MODIFY COLUMN transaction_type/i.test(sql) && /ADD INDEX idx_listings_journey/i.test(sql)) {
        const error = new Error("Unsupported operate same column 'transaction_type'");
        error.code = 'ER_NOT_SUPPORTED_YET';
        throw error;
      }
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };
  const migration = `ALTER TABLE listings
    MODIFY COLUMN transaction_type ENUM('sale','rent','stay','both') NOT NULL DEFAULT 'stay',
    ADD INDEX idx_listings_journey (transaction_type, status, property_type_id, city);`;

  await applySchemaMigrations(pool, '.', ['journey.sql'], async () => migration);

  assert.ok(statements.includes(
    "ALTER TABLE listings MODIFY COLUMN transaction_type ENUM('sale','rent','stay','both') NOT NULL DEFAULT 'stay'"
  ));
  assert.ok(statements.includes(
    'CREATE INDEX idx_listings_journey ON listings (transaction_type, status, property_type_id, city)'
  ));
});

test('TiDB agent-profile migration retries dependent column additions separately', async () => {
  const statements = [];
  const pool = {
    async execute(sql) {
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      if (/ALTER TABLE agent_profiles\s+ADD COLUMN specializations/i.test(sql)
        && /ADD COLUMN service_areas/i.test(sql)) {
        const error = new Error("Unknown column 'specializations' in 'agent_profiles'");
        error.code = 'ER_BAD_FIELD_ERROR';
        throw error;
      }
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [[], []];
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };
  const migration = `ALTER TABLE agent_profiles
    ADD COLUMN specializations JSON NULL AFTER agency_name,
    ADD COLUMN service_areas JSON NULL AFTER specializations,
    ADD COLUMN business_id BIGINT UNSIGNED NULL AFTER service_areas;`;

  await applySchemaMigrations(pool, '.', ['agent-ecosystem.sql'], async () => migration);

  assert.ok(statements.includes('ALTER TABLE agent_profiles ADD COLUMN specializations JSON NULL AFTER agency_name'));
  assert.ok(statements.includes('ALTER TABLE agent_profiles ADD COLUMN service_areas JSON NULL AFTER specializations'));
  assert.ok(statements.includes('ALTER TABLE agent_profiles ADD COLUMN business_id BIGINT UNSIGNED NULL AFTER service_areas'));
  assert.equal(statements.some(sql => /ADD COLUMN service_areas.*ADD COLUMN business_id/s.test(sql)), false);
});

test('agent-profile repair migration completes partially applied columns and reuses an existing index', async () => {
  const statements = [];
  const pool = {
    async execute(sql) {
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql, values = []) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      if (sql === 'ALTER TABLE agent_profiles ADD COLUMN specializations JSON NULL') {
        const error = new Error('Duplicate column');
        error.code = 'ER_DUP_FIELDNAME';
        throw error;
      }
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return values[1] === 'specializations' ? [[{ COLUMN_NAME: 'specializations' }], []] : [[], []];
      }
      if (sql === 'CREATE INDEX idx_agent_profiles_business ON agent_profiles (business_id)') {
        const error = new Error('Duplicate key name');
        error.code = 'ER_DUP_KEYNAME';
        throw error;
      }
      if (sql.includes('INFORMATION_SCHEMA.STATISTICS')) {
        return [[{ INDEX_NAME: 'idx_agent_profiles_business' }], []];
      }
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };

  await applySchemaMigrations(pool, 'database', ['agent-profile-columns-repair-migration.sql']);

  assert.ok(statements.includes('ALTER TABLE agent_profiles ADD COLUMN service_areas JSON NULL'));
  assert.ok(statements.includes('ALTER TABLE agent_profiles ADD COLUMN business_id BIGINT UNSIGNED NULL'));
  assert.equal(statements.some(sql => sql.includes('CREATE INDEX idx_agent_profiles_business')), false);
  assert.ok(statements.some(sql => sql.startsWith('INSERT INTO schema_migrations')));
});

test('TiDB retries category-detail columns sequentially after dependent-column failure', async () => {
  const statements = [];
  const pool = {
    async execute(sql) {
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      if (/ALTER TABLE listings\s+ADD COLUMN category_details/i.test(sql)
        && /ADD COLUMN advertising_authorization/i.test(sql)) {
        const error = new Error("Unknown column 'category_details' in 'listings'");
        error.code = 'ER_BAD_FIELD_ERROR';
        throw error;
      }
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [[], []];
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };
  const migration = `ALTER TABLE listings
    ADD COLUMN category_details JSON NULL AFTER commercial_use,
    ADD COLUMN advertising_authorization ENUM('owner','authorized_agent','agency','other') NULL AFTER category_details,
    ADD COLUMN authorization_notes VARCHAR(500) NULL AFTER advertising_authorization,
    ADD COLUMN authorization_attested_at DATETIME NULL AFTER authorization_notes;`;

  await applySchemaMigrations(pool, '.', ['listing-category-details.sql'], async () => migration);

  assert.ok(statements.includes('ALTER TABLE listings ADD COLUMN category_details JSON NULL AFTER commercial_use'));
  assert.ok(statements.includes("ALTER TABLE listings ADD COLUMN advertising_authorization ENUM('owner','authorized_agent','agency','other') NULL AFTER category_details"));
  assert.ok(statements.includes('ALTER TABLE listings ADD COLUMN authorization_notes VARCHAR(500) NULL AFTER advertising_authorization'));
  assert.ok(statements.includes('ALTER TABLE listings ADD COLUMN authorization_attested_at DATETIME NULL AFTER authorization_notes'));
});

test('category-detail repair migration safely skips columns already present in TiDB', async () => {
  const statements = [];
  const existingColumns = new Set(['category_details', 'authorization_notes']);
  const pool = {
    async execute(sql) {
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    },
    async query(sql, values = []) {
      if (sql.startsWith('SELECT checksum FROM schema_migrations')) return [[], []];
      if (/^ALTER TABLE listings ADD COLUMN/.test(sql)) {
        const [, columnName] = sql.match(/ADD COLUMN (\w+)/i);
        if (existingColumns.has(columnName)) {
          const error = new Error('Duplicate column');
          error.code = 'ER_DUP_FIELDNAME';
          throw error;
        }
      }
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return existingColumns.has(values[1]) ? [[{ COLUMN_NAME: values[1] }], []] : [[], []];
      }
      statements.push(sql);
      return [{ affectedRows: 1 }, []];
    }
  };

  await applySchemaMigrations(pool, 'database', ['listing-category-details-repair-migration.sql']);

  assert.ok(statements.includes("ALTER TABLE listings ADD COLUMN advertising_authorization ENUM('owner','authorized_agent','agency','other') NULL"));
  assert.ok(statements.includes('ALTER TABLE listings ADD COLUMN authorization_attested_at DATETIME NULL'));
  assert.ok(statements.some(sql => sql.startsWith('INSERT INTO schema_migrations')));
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
