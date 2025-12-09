/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    const exists = await knex.schema.hasTable("employees");

    if (exists) return;

    return knex.schema.createTable("employees", function (table) {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').unique().notNullable();
        table.string('position');
        table.date('hire_date');
        table
            .integer('departments_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('departments')
            .onDelete('SET NULL')
            .onUpdate('CASCADE');
        table.boolean('is_active').defaultTo(true).notNullable();
        table.integer('version').notNullable().defaultTo(1);
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    const exists = await knex.schema.hasTable("employees");
    if (!exists) return;

    return knex.schema.dropTable("employees");
}
