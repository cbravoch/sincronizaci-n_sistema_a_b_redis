/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("skills");

  if (exists) return;

  return knex.schema.createTable('skills', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('description').notNullable();
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
  const exists = await knex.schema.hasTable("skills");

  if (!exists) return;

  return knex.schema.dropTable('skills');
};
