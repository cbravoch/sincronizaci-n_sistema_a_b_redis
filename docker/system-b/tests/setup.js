import dotenv from 'dotenv';
import knex from 'knex';
import { jest } from '@jest/globals';
import knexConfig from '../knexfile.js';

dotenv.config({ path: '.env.test' });

const baseConfig = knexConfig.development ?? knexConfig;

const testDbConfig = {
  ...baseConfig,
  connection: {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: process.env.TEST_DB_PORT || 3308,
    user: process.env.TEST_DB_USER || 'user',
    password: process.env.TEST_DB_PASSWORD || 'pass',
    database: process.env.TEST_DB_NAME || 'system_b'
  }
};

global.testDb = knex(testDbConfig);

global.cleanupDatabase = async () => {
  await global.testDb('departments').del();
  await global.testDb('processed_events').del();
  await global.testDb('sync_logs').del();
  await global.testDb('event_errors').del();
  await global.testDb('sync_offsets').del();
};

global.createTestTransaction = async () => {
  return await global.testDb.transaction();
};

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

beforeAll(async () => {
  try {
    const hasDepartments = await global.testDb.schema.hasTable('departments');
    if (!hasDepartments) {
      await global.testDb.schema.createTable('departments', (table) => {
        table.integer('id').primary();
        table.string('name').notNullable();
        table.string('cost_center_code');
        table.string('version').defaultTo('1');
        table.datetime('created_at');
        table.datetime('updated_at');
      });
    }

    const hasProcessedEvents = await global.testDb.schema.hasTable('processed_events');
    if (!hasProcessedEvents) {
      await global.testDb.schema.createTable('processed_events', (table) => {
        table.increments('id').primary();
        table.string('event_id').unique();
        table.string('event_type');
        table.string('stream_id');
        table.string('aggregate_id');
        table.string('aggregate_type');
        table.datetime('processed_at');
        table.datetime('created_at');
      });
    }

    const hasSyncLogs = await global.testDb.schema.hasTable('sync_logs');
    if (!hasSyncLogs) {
      await global.testDb.schema.createTable('sync_logs', (table) => {
        table.increments('id').primary();
        table.string('event_id');
        table.text('action');
        table.datetime('created_at');
      });
    }

    const hasEventErrors = await global.testDb.schema.hasTable('event_errors');
    if (!hasEventErrors) {
      await global.testDb.schema.createTable('event_errors', (table) => {
        table.increments('id').primary();
        table.string('event_id');
        table.string('event_type');
        table.string('stream_id');
        table.text('payload');
        table.text('error_message');
        table.integer('retries');
        table.boolean('resolved');
        table.datetime('created_at');
      });
    }

    const hasSyncOffsets = await global.testDb.schema.hasTable('sync_offsets');
    if (!hasSyncOffsets) {
      await global.testDb.schema.createTable('sync_offsets', (table) => {
        table.string('stream_name').primary();
        table.string('last_id');
        table.datetime('updated_at');
      });
    }
  } catch (error) {
    console.error('Error setting up test database:', error);
  }
});

beforeEach(async () => {
  await cleanupDatabase();
});

afterEach(async () => {
  await cleanupDatabase();
});

afterAll(async () => {
  await global.testDb.destroy();
});
