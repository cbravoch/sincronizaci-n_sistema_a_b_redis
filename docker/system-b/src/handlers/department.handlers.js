/**
 * Maneja el evento de creación de departamento
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleDepartmentCreated(event, trx) {
    try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const {
            id,
            name,
            cost_center_code,
            version
        } = payload;

        const existing = await trx("departments").where({ id }).first();

        if (existing) {
            if (version <= existing.version) {
                return { skip: true, reason: "version outdated" };
            }

            await trx("departments").where({ id }).update({
                name,
                cost_center_code,
                updated_at: new Date().toISOString(),
                version: String(version)
            });
        } else {
            await trx("departments").insert({
                id,
                name,
                cost_center_code,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: String(version || 1)
            });
        }

        return { ok: true };
    } catch (error) {
        console.error('Error en handleDepartmentCreated:', error);
        throw error;
    }
}

/**
 * Maneja el evento de actualización de departamento
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleDepartmentUpdated(event, trx) {
    try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const {
            id,
            name,
            cost_center_code,
            created_at,
            updated_at,
            version
        } = payload;

        const existing = await trx("departments").where({ id }).first();

        if (existing) {
            if (version <= existing.version) {
                return { skip: true, reason: "version outdated" };
            }

            await trx("departments").where({ id }).update({
                name,
                cost_center_code,
                updated_at: new Date(),
                version: String(version)
            });
        } else {
            await trx("departments").insert({
                id,
                name,
                cost_center_code,
                created_at: new Date(created_at),
                updated_at: new Date(updated_at),
                version: String(version)
            });
        }

        return { ok: true };
    } catch (error) {
        console.error('Error en handleDepartmentUpdated:', error);
        throw error;
    }
}

/**
 * Maneja el evento de eliminación de departamento
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleDepartmentDeleted(event, trx) {
    try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (!payload || !payload.id) {
            return { skip: true, reason: 'department id not found in payload' };
        }

        const { id, version } = payload;

        const existing = await trx('departments').where({ id }).first();
        if (!existing) {
            return { ok: true };
        }

        if (Number(version) < Number(existing.version)) {
            return { skip: true, reason: 'version outdated' };
        }

        await trx('departments').where({ id }).delete();

        return { ok: true };
    } catch (error) {
        console.error('Error en handleDepartmentDeleted:', error);
        throw error;
    }
}
