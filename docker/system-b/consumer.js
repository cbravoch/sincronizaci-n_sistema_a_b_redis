import redis from './src/config/redis.js';
import knex from './src/config/database.js';
import { STREAM, GROUP, CONSUMER } from './src/config/constants.js';

import { 
    handleEmployeeCreated,
    handleEmployeeUpdated,
    handleEmployeeDeleted 
} from './src/handlers/employee.handlers.js';

import { 
    handleDepartmentCreated,
    handleDepartmentUpdated,
    handleDepartmentDeleted
} from './src/handlers/department.handlers.js';

import { 
    handleSkillCreated,
    handleSkillUpdated,
    handleSkillDeleted
} from './src/handlers/skill.handlers.js';

import { parseXReadGroupResponse, sleep } from './src/utils/redis.utils.js';
import { 
    saveProcessedEvent, 
    saveSyncLog, 
    updateSyncOffset, 
    saveEventError 
} from './src/utils/db.utils.js';


/**
 * Configuración principal del consumidor
 * Se conecta a Redis y a la base de datos para procesar eventos
 */

redis.on("error", err => console.error("Error de Redis:", err));

const EVENT_HANDLERS = {
    "employee.created": handleEmployeeCreated,
    "employee.updated": handleEmployeeUpdated,
    "employee.deleted": handleEmployeeDeleted,
    "department.created": handleDepartmentCreated,
    "department.updated": handleDepartmentUpdated,
    "department.deleted": handleDepartmentDeleted,
    "skill.created": handleSkillCreated,
    "skill.updated": handleSkillUpdated,
    "skill.deleted": handleSkillDeleted,
};



/**
 * Procesa un evento entrante del stream de Redis
 * @param {string} id - ID del evento en el stream
 * @param {Object} fields - Campos del evento
 * @returns {Promise<void>}
 */
async function processIncomingEvent(id, fields) {
    try {
        console.log('Procesando evento:', id, JSON.stringify(fields, null, 2));

        if (!fields.event_type) {
            console.error(`Mensaje ${id} no tiene event_type - haciendo ACK para evitar reprocesamiento`);
            await redis.xAck(STREAM, GROUP, id);
            return;
        }

        let payload;
        try {
            payload = typeof fields.payload === 'string' ? JSON.parse(fields.payload) : fields.payload;
        } catch (parseError) {
            console.error(`Error parseando payload del mensaje ${id}:`, parseError.message);
            console.error(`Payload recibido:`, fields.payload);
            await redis.xAck(STREAM, GROUP, id);
            try {
                await knex("processed_events").insert({
                    event_id: id,
                    event_type: fields.event_type || 'unknown',
                    stream_id: STREAM,
                    aggregate_id: '0',
                    aggregate_type: fields.aggregate_type || 'unknown',
                    processed_at: new Date(),
                    created_at: new Date()
                });
            } catch (err) {
            }
            return;
        }

        let aggregateId = '0';
        if (payload && typeof payload === 'object') {
            aggregateId =
                payload.id ||
                (payload.after && payload.after.id) ||
                (payload.before && payload.before.id) ||
                (payload.employee && payload.employee.id) ||
                (payload.department && payload.department.id) ||
                (payload.skill && payload.skill.id) ||
                '0';
        }

        const event = {
            event_id: id,
            event_type: fields.event_type,
            stream_id: STREAM,
            aggregate_id: aggregateId,
            aggregate_type: fields.aggregate_type,
            data: payload
        };

        const already = await knex("processed_events").where({ event_id: id }).first();
        if (already) {
            console.log(`Evento ${id} YA PROCESADO → ACK`);
            await redis.xAck(STREAM, GROUP, id);
            return;
        }

        const handler = EVENT_HANDLERS[event.event_type];
        if (!handler) {
            console.log(`Handler NO encontrado para ${event.event_type} - haciendo ACK para evitar reprocesamiento`);
            await redis.xAck(STREAM, GROUP, id);
            try {
                await knex("processed_events").insert({
                    event_id: id,
                    event_type: event.event_type,
                    stream_id: STREAM,
                    aggregate_id: event.aggregate_id,
                    aggregate_type: event.aggregate_type,
                    processed_at: new Date(),
                    created_at: new Date()
                });
            } catch (err) {
                console.log(`Evento ${id} ya estaba en processed_events`);
            }
            return;
        }

        const trx = await knex.transaction();

        try {
            const result = await handler({ ...event, data: payload }, trx);

            if (result && result.skip) {
                console.log(`Evento ${id} ignorado: ${result.reason}`);
                await trx.rollback();
                
                await redis.xAck(STREAM, GROUP, id);
                await updateSyncOffset(STREAM, id);
                
                try {
                    await knex("processed_events").insert({
                        event_id: id,
                        event_type: event.event_type,
                        stream_id: STREAM,
                        aggregate_id: event.aggregate_id,
                        aggregate_type: event.aggregate_type,
                        processed_at: new Date(),
                        created_at: new Date()
                    });
                } catch (err) {
                    console.log(`Evento ${id} ya estaba en processed_events`);
                }
                
                return;
            }

            await saveProcessedEvent(trx, {
                ...event,
                processed_at: new Date()
            });

            await trx.commit();

            await saveSyncLog(knex, {
                event_id: id,
                event_type: event.event_type,
                status: "processed",
                message: "Event processed successfully"
            });

            await redis.xAck(STREAM, GROUP, id);
            await updateSyncOffset(STREAM, id);
            console.log(`Evento ${id} procesado correctamente`);

        } catch (error) {
            if (trx && typeof trx.rollback === 'function') {
                try {
                    await trx.rollback();
                } catch (rollbackError) {
                    console.error('Error al hacer rollback:', rollbackError);
                }
            }

            console.error(`Error procesando evento ${id}:`, error);
            console.error(`Traza:`, error.stack);
            console.error(`Evento que falló:`, JSON.stringify(event, null, 2));

            try {
                await saveEventError(knex, {
                    event_id: id,
                    event_type: event.event_type,
                    stream_id: STREAM,
                    payload: event,
                    error
                });

                await saveSyncLog(knex, {
                    event_id: id,
                    event_type: event.event_type,
                    status: "error",
                    message: error.message.substring(0, 1000)
                });
            } catch (logError) {
                console.error(`Error guardando log de error:`, logError);
            }

            console.error(`Mensaje ${id} NO fue ACK'd - quedará pendiente para reintento`);
            
            throw error;
        }

    } catch (error) {
        console.error(`Error en processIncomingEvent para el mensaje ${id}:`, error);
        throw error;
    }
}



/**
 * Inicia el consumidor de eventos
 * Se conecta a Redis, crea el grupo de consumidores si no existe
 * y comienza a procesar eventos en un bucle infinito
 * @returns {Promise<void>}
 */
async function start() {
    try {
        await redis.connect();
        console.log('Conectado a Redis');

        let groupExists = false;
        try {
            await redis.xGroupCreate(STREAM, GROUP, '0', { MKSTREAM: true });
            console.log(`Stream '${STREAM}' y grupo '${GROUP}' creados exitosamente`);
        } catch (error) {
            if (error.message.includes('BUSYGROUP')) {
                groupExists = true;
                console.log(`El grupo '${GROUP}' ya existe en el stream '${STREAM}'`);

                try {
                    const streamInfo = await redis.xInfoStream(STREAM);
                    const streamLength = streamInfo?.length || 0;

                    if (streamLength > 0) {
                        const pendingInfo = await redis.xPending(STREAM, GROUP);
                        const pendingCount = pendingInfo?.[0] || 0;

                        console.log(`Información del stream: ${streamLength} mensajes totales, ${pendingCount} pendientes`);

                        if (pendingCount === 0 && streamLength > 0) {
                            console.log(`Hay ${streamLength} mensajes en el stream pero el grupo no tiene acceso a ellos.`);
                            
                            try {
                                const lastOffset = await knex('sync_offsets')
                                    .where('stream_name', STREAM)
                                    .orderBy('updated_at', 'desc')
                                    .first();
                                
                                const startId = lastOffset ? lastOffset.last_id : '0';
                                console.log(`Último offset procesado: ${startId}`);
                                
                                console.log('Eliminando y recreando el grupo para acceder desde el último offset...');
                                
                                try {
                                    await redis.xGroupDestroy(STREAM, GROUP);
                                    console.log('Grupo eliminado exitosamente');
                                    await redis.xGroupCreate(STREAM, GROUP, startId);
                                    console.log(`Grupo recreado desde el offset: ${startId}`);
                                    groupExists = false;
                                    console.log(`groupExists ahora es: ${groupExists}`);
                                } catch (recreateError) {
                                    console.error('Error al recrear el grupo:', recreateError.message);
                                    console.error('Traza:', recreateError.stack);
                                }
                            } catch (dbError) {
                                console.error('Error obteniendo último offset de la base de datos:', dbError.message);
                                const lastMessage = await redis.xRevRange(STREAM, '+', '-', { COUNT: 1 });
                                const fallbackId = lastMessage.length > 0 ? lastMessage[0][0] : '0';
                                console.log(`Usando fallback ID: ${fallbackId}`);
                                
                                await redis.xGroupDestroy(STREAM, GROUP);
                                await redis.xGroupCreate(STREAM, GROUP, fallbackId);
                                groupExists = false;
                            }
                        } else if (pendingCount > 0) {
                            console.log(`Hay ${pendingCount} mensajes pendientes en el grupo - se procesarán primero`);
                        } else if (streamLength === 0) {
                            console.log(`El stream está vacío`);
                        }
                    }
                } catch (infoError) {
                    console.log('No se pudo verificar información del stream:', infoError.message);
                }
            } else if (error.message.includes('no such key')) {
                console.error(`El stream '${STREAM}' no existe. Asegúrate de que el productor esté funcionando.`);
                process.exit(1);
            } else {
                console.error('Error al crear el grupo de consumidores:', error);
                process.exit(1);
            }
        }

        console.log(`Worker ${CONSUMER} activo y escuchando en ${STREAM}/${GROUP}`);

        let readHistorical = !groupExists;
        let startId = null;

        if (readHistorical) {
            try {
                const streamInfo = await redis.xInfoStream(STREAM);
                if (streamInfo && streamInfo['first-entry']) {
                    startId = streamInfo['first-entry'][0];
                    console.log(`Grupo nuevo detectado. Primer mensaje del stream: ${startId}`);
                } else {
                    console.log('Stream vacío, no hay mensajes históricos');
                    readHistorical = false;
                }
            } catch (error) {
                console.log(`Error obteniendo información del stream: ${error.message}`);
                readHistorical = false;
            }
        }

        console.log(`Estado inicial - groupExists: ${groupExists}, readHistorical: ${readHistorical}, startId: ${startId}`);

        while (true) {
            try {
                let response = null;

                if (readHistorical && startId) {
                    console.log(`Leyendo mensajes históricos desde ID: ${startId}...`);
                    try {
                        response = await redis.sendCommand([
                            'XREADGROUP', 'GROUP', GROUP, CONSUMER,
                            'COUNT', '10',
                            'STREAMS', STREAM, startId
                        ]);

                        const parsedResponse = parseXReadGroupResponse(response);
                        console.log(`Respuesta parseada:`, JSON.stringify(parsedResponse, null, 2));

                        if (parsedResponse && parsedResponse.messages && parsedResponse.messages.length > 0) {
                            console.log(`Encontrados ${parsedResponse.messages.length} mensajes históricos`);
                            const lastMessage = parsedResponse.messages[parsedResponse.messages.length - 1];
                            startId = lastMessage.id;
                            console.log(`Continuando desde ID: ${startId}`);
                            response = parsedResponse;
                        } else {
                            console.log('No hay más mensajes históricos, cambiando a mensajes nuevos...');
                            readHistorical = false;
                            startId = null;
                            response = null;
                        }
                    } catch (error) {
                        console.error(`Error leyendo mensajes históricos: ${error.message}`);
                        console.error(`Traza: ${error.stack}`);
                        readHistorical = false;
                        startId = null;
                        response = null;
                    }
                } else if (readHistorical && !startId) {
                    console.log('No hay mensajes históricos (stream vacío), cambiando a mensajes nuevos...');
                    readHistorical = false;
                }

                if (!response && !readHistorical) {
                    console.log('Buscando mensajes pendientes del consumidor...');
                    try {
                        response = await redis.sendCommand([
                            'XREADGROUP', 'GROUP', GROUP, CONSUMER,
                            'COUNT', '10',
                            'STREAMS', STREAM, '0'
                        ]);

                        const parsedResponse = parseXReadGroupResponse(response);
                        console.log(`Respuesta parseada (pendientes):`, JSON.stringify(parsedResponse, null, 2));

                        if (parsedResponse && parsedResponse.messages && parsedResponse.messages.length > 0) {
                            console.log(`Encontrados ${parsedResponse.messages.length} mensajes pendientes`);
                            response = parsedResponse;
                        } else {
                            console.log('No hay mensajes pendientes del consumidor');
                            response = null;
                        }
                    } catch (error) {
                        console.error(`Error leyendo mensajes pendientes: ${error.message}`);
                        response = null;
                    }
                }

                if (!response) {
                    console.log('Buscando mensajes nuevos en el stream...');
                    response = await redis.sendCommand([
                        'XREADGROUP', 'GROUP', GROUP, CONSUMER,
                        'COUNT', '1',
                        'BLOCK', '5000',
                        'STREAMS', STREAM, '>'
                    ]);
                }

                if (response && !response.messages && Array.isArray(response)) {
                    response = parseXReadGroupResponse(response);
                }

                if (!response || !response.messages || response.messages.length === 0) {
                    if (!readHistorical) {
                        console.log('No hay mensajes nuevos, esperando...');
                    }
                    continue;
                }

                const messages = response.messages;
                console.log(`Mensajes recibidos:`, messages.length);

                for (const message of messages) {
                    const { id, message: msg } = message;
                    console.log(`Procesando mensaje ${id}`, JSON.stringify(msg, null, 2));

                    try {
                        await processIncomingEvent(id, msg);
                    } catch (error) {
                        console.error(`Error procesando mensaje ${id}:`, error);
                        await sleep(1000);
                    }
                }
            } catch (error) {
                console.error('Error en el bucle principal:', error);
                await sleep(1000);
            }
        }
    } catch (error) {
        console.error('Error fatal en el consumidor:', error);
        process.exit(1);
    }
}

start();
