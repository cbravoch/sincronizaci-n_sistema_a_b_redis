/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("employee_skills");

  if (exists) return;

  return knex.schema.createTable('employee_skills', function(table) {
    table.increments('id').primary();
    table.string('version').notNullable();
    table.integer('level').nullable();

    table
    .integer('employee_id')
    .unsigned()
    .nullable()
    .references('id')
    .inTable('employees')
    .onDelete('SET NULL')
    .onUpdate('SET NULL');

    table
    .integer('skill_id')
    .unsigned()
    .nullable()
    .references('id')
    .inTable('skills')
    .onDelete('SET NULL')
    .onUpdate('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const exists = await knex.schema.hasTable("employee_skills");

  if (!exists) return;

  return knex.schema.dropTable('employee_skills');
};
