<?php

namespace App\Helpers;

use App\Models\Outbox;
use Illuminate\Support\Facades\Log;

class OutboxHelper
{
    /**
     * Crea un nuevo registro en la tabla outbox
     * 
     * @param string $eventType Tipo de evento (ej: 'department.created')
     * @param mixed $aggregateId ID del agregado
     * @param string $aggregateType Tipo de agregado (ej: 'department')
     * @param int $version Versión del evento
     * @param mixed $payload Datos del evento
     * @return \App\Models\Outbox|null
     */
    public static function createOutboxEvent(
        string $eventType,
        $aggregateId,
        string $aggregateType,
        int $version,
        $payload
    ): ?Outbox {
        try {
            return Outbox::create([
                'event_id' => (string) \Illuminate\Support\Str::uuid(),
                'event_type' => $eventType,
                'aggregate_id' => (string) $aggregateId,
                'aggregate_type' => $aggregateType,
                'version' => $version,
                'payload' => is_string($payload) ? $payload : json_encode($payload),
                'is_processed' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear evento en outbox: ' . $e->getMessage(), [
                'event_type' => $eventType,
                'aggregate_id' => $aggregateId,
                'aggregate_type' => $aggregateType,
            ]);
            return null;
        }
    }
}
