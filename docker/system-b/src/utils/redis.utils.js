/**
 * Parsea la respuesta de XREADGROUP de Redis a un formato más manejable
 * @param {Array} redisResponse - Respuesta cruda de Redis XREADGROUP
 * @returns {Object|null} Objeto con los mensajes parseados o null si no hay datos
 */
export function parseXReadGroupResponse(redisResponse) {
    if (!redisResponse || redisResponse.length === 0) {
        return null;
    }

    const streamData = redisResponse[0];
    if (!streamData || streamData.length < 2) {
        return null;
    }

    const streamName = streamData[0];
    const messagesArray = streamData[1];

    if (!messagesArray || messagesArray.length === 0) {
        return null;
    }

    const messages = messagesArray.map(msg => {
        const id = msg[0];
        const fieldsArray = msg[1];

        const message = {};
        for (let i = 0; i < fieldsArray.length; i += 2) {
            message[fieldsArray[i]] = fieldsArray[i + 1];
        }

        return { id, message };
    });

    return {
        stream: streamName,
        messages
    };
}

export const sleep = (ms) => new Promise(res => setTimeout(res, ms));
