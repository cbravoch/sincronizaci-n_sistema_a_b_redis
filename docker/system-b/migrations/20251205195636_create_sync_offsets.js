/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("sync_offsets");

  if (exists) return;

  return knex.schema.createTable('sync_offsets', function(table) {
    table.string('stream_name').notNullable();
    table.timestamp('updated_at').notNullable();
    table.string('last_id').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const exists = await knex.schema.hasTable("sync_offsets");

  if (!exists) return;

  return knex.schema.dropTable('sync_offsets');
};
