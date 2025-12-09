/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("event_errors");

  if (exists) return;

  return knex.schema.createTable('event_errors', function(table) {
    table.increments('id').primary();
    table.string('event_id').notNullable();
    table.json('payload').notNullable();
    table.string('error_message').notNullable();
    table.integer('retries').notNullable();
    table.timestamp('created_at').notNullable();
    table.boolean('resolved').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const exists = await knex.schema.hasTable("event_errors");

  if (!exists) return;

  return knex.schema.dropTable('event_errors');
};
