/**
 * Maneja el evento de creación de empleado
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleEmployeeCreated(event, trx) {
    const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

    const {
        id,
        name,
        email,
        position,
        departments_id,
        version,
        is_active
    } = payload;

    const hireDate = payload.hire_date ? String(payload.hire_date).split('T')[0] : null;
    const isActive = is_active !== undefined ? Boolean(Number(is_active)) : true;

    if (departments_id) {
        const departmentExists = await trx("departments")
            .where({ id: departments_id })
            .first();

        if (!departmentExists) {
            console.warn(`El departamento con ID ${departments_id} no existe`);
            departments_id = null;
        }
    }

    const existing = await trx("employees").where({ id }).first();

    if (existing) {
        if (version <= existing.version) {
            return { skip: true, reason: "version outdated" };
        }

        await trx("employees").where({ id }).update({
            name,
            email,
            hire_date: hireDate,
            position,
            departments_id, 
            updated_at: new Date(),
            version,
            is_active: isActive
        });
    } else {
        await trx("employees").insert({
            id,
            name,
            email,
            hire_date: hireDate,
            position,
            departments_id, 
            updated_at: new Date(),
            version,
            is_active: isActive,
            deleted_at: null
        });
    }

    const skillsArray = Array.isArray(payload.skills) ? payload.skills : [];
    const skillIds = skillsArray
        .map(s => (s && s.id ? s.id : null))
        .filter(skillId => skillId !== null);

    await trx('employee_skills').where({ employee_id: id }).delete();

    if (skillIds.length > 0) {
        const rows = skillIds.map(skillId => ({
            employee_id: id,
            skill_id: skillId,
            version: String(version || 1),
        }));

        await trx('employee_skills').insert(rows);
    }

    return { ok: true };
}

/**
 * Maneja el evento de actualización de empleado
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleEmployeeUpdated(event, trx) {
    try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (!payload || !payload.id) {
            return { skip: true, reason: 'employee id missing in payload' };
        }

        const id = payload.id;
        const version = payload.version;
        const hireDate = payload.hire_date ? String(payload.hire_date).split('T')[0] : null;
        const isActive = payload.is_active !== undefined ? Boolean(Number(payload.is_active)) : undefined;

        let departments_id = payload.departments_id ?? null;
        if (departments_id !== null && departments_id !== undefined) {
            const parsed = parseInt(departments_id, 10);
            departments_id = Number.isNaN(parsed) ? null : parsed;
        }

        if (departments_id) {
            const dept = await trx('departments').where({ id: departments_id }).first();
            if (!dept) {
                departments_id = null;
            }
        }

        const existing = await trx('employees').where({ id }).first();

        if (existing) {
            if (version <= existing.version) {
                return { skip: true, reason: 'version outdated' };
            }

            await trx('employees').where({ id }).update({
                name: payload.name,
                email: payload.email,
                hire_date: hireDate,
                position: payload.position || null,
                departments_id,
                is_active: isActive !== undefined ? isActive : existing.is_active,
                deleted_at: payload.deleted_at || existing.deleted_at,
                updated_at: new Date(),
                version,
            });
        } else {
            await trx('employees').insert({
                id,
                name: payload.name,
                email: payload.email,
                hire_date: hireDate,
                position: payload.position || null,
                departments_id,
                is_active: isActive !== undefined ? isActive : true,
                version,
                updated_at: new Date(),
                deleted_at: payload.deleted_at || null,
            });
        }

        const skillsArray = Array.isArray(payload.skills) ? payload.skills : [];
        const skillIds = skillsArray
            .map(s => (s && s.id ? s.id : null))
            .filter(idVal => idVal !== null);

        await trx('employee_skills').where({ employee_id: id }).delete();

        if (skillIds.length > 0) {
            const rows = skillIds.map(skillId => ({
                employee_id: id,
                skill_id: skillId,
                version: String(version || 1),
            }));

            await trx('employee_skills').insert(rows);
        }

        return { ok: true };
    } catch (error) {
        console.error('Error en handleEmployeeUpdated:', error);
        throw error;
    }
}

/**
 * Maneja el evento de eliminación de empleado
 * @param {Object} event - Datos del evento
 * @param {Object} trx - Transacción de Knex
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function handleEmployeeDeleted(event, trx) {
    try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const employee = raw && raw.employee ? raw.employee : raw;

        if (!employee || !employee.id) {
            return { skip: true, reason: 'employee id not found in payload' };
        }

        const id = employee.id;
        const version = Number(employee.version);

        const existing = await trx('employees').where({ id }).first();
        if (!existing) {
            return { ok: true };
        }

        const existingVersion = Number(existing.version);
        if (Number.isNaN(version)) {
            return { skip: true, reason: 'invalid version' };
        }

        if (!Number.isNaN(existingVersion) && version < existingVersion) {
            return { skip: true, reason: 'version outdated' };
        }

        await trx('employees').where({ id }).delete();

        return { ok: true };
    } catch (error) {
        console.error('Error en handleEmployeeDeleted:', error);
        throw error;
    }
}
