/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("departments");

  if (exists) return;

  return knex.schema.createTable('departments', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('cost_center_code').notNullable();
    table.string('created_at').notNullable();
    table.string('updated_at').notNullable();
    table.string('version').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const exists = await knex.schema.hasTable("departments");

  if (!exists) return;

  return knex.schema.dropTable('departments');
};
