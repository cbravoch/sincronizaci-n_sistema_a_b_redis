/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("processed_events");

  if (exists) return;

  return knex.schema.createTable('processed_events', function(table) {
    table.string('event_id').primary();
    table.string('event_type').notNullable();
    table.string('stream_id').notNullable();
    table.string('aggregate_id').notNullable();
    table.string('aggregate_type').notNullable();
    table.timestamp('processed_at').notNullable();
    table.timestamp('created_at').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const exists = await knex.schema.hasTable("processed_events");

  if (!exists) return;

  return knex.schema.dropTable('processed_events');
};
