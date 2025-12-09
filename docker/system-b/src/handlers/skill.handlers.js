/**
 * Maneja el evento de creación de habilidad
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleSkillCreated(event, trx) {
    try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const {
            id,
            name,
            description,
            created_at,
            updated_at,
            version
        } = payload;

        if (!id) {
            return { skip: true, reason: 'skill id missing in payload' };
        }

        const existing = await trx("skills").where({ id }).first();

        if (existing) {
            if (version <= existing.version) {
                return { skip: true, reason: "version outdated" };
            }
            await trx("skills").where({ id }).update({
                name,
                description: description ?? '', 
                updated_at: updated_at || new Date().toISOString(),
                version: String(version)
            });
            return { ok: true };
        }

        
        await trx("skills").insert({
            id,
            name,
            description: description ?? '', 
            created_at: created_at || new Date().toISOString(),
            updated_at: updated_at || new Date().toISOString(),
            version: String(version)
        });

        return { ok: true };
    } catch (error) {
        console.error('Error en handleSkillCreated:', error);
        console.error('Payload recibido:', JSON.stringify(event.data, null, 2));
        throw error;
    }
}

/**
 * Maneja el evento de actualización de habilidad
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleSkillUpdated(event, trx) {
    try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const {
            id,
            name,
            description,
            created_at,
            updated_at,
            version
        } = payload;

        if (!id) {
            throw new Error('skill.updated payload without id');
        }

        const existing = await trx("skills").where({ id }).first();

        if (existing) {
            if (version <= existing.version) {
                return { skip: true, reason: "version outdated" };
            }
            await trx("skills").where({ id }).update({
                name,
                description: description ?? '', 
                updated_at: updated_at || new Date().toISOString(),
                version: String(version)
            });
        }
        else {
            await trx("skills").insert({
                id,
                name,
                description: description ?? '', 
                created_at: created_at || new Date().toISOString(),
                updated_at: updated_at || new Date().toISOString(),
                version: String(version)
            });
        }
        return { ok: true };
    } catch (error) {
        console.error('Error en handleSkillUpdated:', error);
        throw error;
    }
}

/**
 * Maneja el evento de eliminación de habilidad
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleSkillDeleted(event, trx) {
    try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const skill = raw && raw.skill ? raw.skill : raw;

        if (!skill || !skill.id) {
            return { skip: true, reason: 'skill id not found in payload' };
        }

        const id = skill.id;
        const version = skill.version;

        const existing = await trx("skills").where({ id }).first();

        if (existing) {
            const existingVersion = existing.version;
            const incomingVersion = String(version);

            if (incomingVersion <= String(existingVersion)) {
                return { skip: true, reason: "version outdated" };
            }

            await trx("skills").where({ id }).delete();
        }

        return { ok: true };
    } catch (error) {
        console.error('Error en handleSkillDeleted:', error);
        throw error;
    }
}
