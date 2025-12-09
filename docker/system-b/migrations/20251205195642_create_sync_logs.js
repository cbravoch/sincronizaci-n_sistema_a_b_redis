/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("sync_logs");

  if (exists) return;

  return knex.schema.createTable('sync_logs', function(table) {
    table.increments('id').primary();
    table.string('event_id').notNullable();
    table.timestamp('created_at').notNullable();
    table.string('action').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const exists = await knex.schema.hasTable("sync_logs");

  if (!exists) return;

  return knex.schema.dropTable('sync_logs');
};
