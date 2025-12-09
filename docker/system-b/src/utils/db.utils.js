import db from '../config/database.js';

/**
 * Guarda un evento como procesado en la base de datos
 * @param {Object} trx - Transacción de Knex
 * @param {Object} params - Parámetros del evento
 * @param {string} params.event_id - ID único del evento
 * @param {string} params.event_type - Tipo de evento
 * @param {string} params.stream_id - ID del stream
 * @param {string} params.aggregate_id - ID del agregado
 * @param {string} params.aggregate_type - Tipo de agregado
 */
export async function saveProcessedEvent(trx, { event_id, event_type, stream_id, aggregate_id, aggregate_type }) {
    await trx("processed_events").insert({
        event_id,
        event_type,
        stream_id,
        aggregate_id,
        aggregate_type,
        processed_at: new Date(),
        created_at: new Date()
    });
}

/**
 * Guarda un registro de sincronización en la base de datos
 * @param {Object} trxOrKnex - Transacción de Knex o instancia de Knex
 * @param {Object} params - Parámetros del log
 * @param {string} params.event_id - ID del evento
 * @param {string} params.event_type - Tipo de evento
 * @param {string} params.status - Estado del procesamiento
 * @param {string} params.message - Mensaje descriptivo
 */
export async function saveSyncLog(trxOrKnex, { event_id, event_type, status, message }) {
    const action = `${event_type || 'unknown'}|${status || 'unknown'}|${(message || '').substring(0, 150)}`;
    const logData = {
        event_id,
        created_at: new Date(),
        action,
    };

    try {
        if (trxOrKnex?.isTransaction) {
            await trxOrKnex("sync_logs").insert(logData);
        } else {
            const dbInstance = trxOrKnex || db;
            await dbInstance("sync_logs").insert(logData);
        }
    } catch (err) {
        console.error("ERROR guardando log en sync_logs:", err);
    }
}

/**
 * Actualiza el offset de un stream en la base de datos
 * @param {string} stream - Nombre del stream
 * @param {string} id - ID del último mensaje procesado
 * @returns {Promise<void>}
 */
export async function updateSyncOffset(stream, id) {
    await db("sync_offsets")
        .insert({
            stream_name: stream,
            last_id: id,
            updated_at: new Date(),
        })
        .onConflict("stream_name")
        .merge({
            last_id: id,
            updated_at: new Date(),
        });
}

/**
 * Guarda los errores de los eventos en la base datos
 * @param {*} trxOrKnex 
 * @param {*} param1 
 */
export async function saveEventError(trxOrKnex, { event_id, event_type, stream_id, payload, error }) {
    const errorData = {
        event_id,
        payload: JSON.stringify(payload || {}),
        error_message: error?.message || String(error),
        retries: 0,
        created_at: new Date(),
        resolved: false,
    };

    try {
        if (trxOrKnex && trxOrKnex.isTransaction) {
            await trxOrKnex("event_errors").insert(errorData);
        } else {
            const dbInstance = trxOrKnex || db;
            await dbInstance("event_errors").insert(errorData);
        }
    } catch (err) {
        console.error("ERROR guardando error en event_errors:", err);
    }
}
