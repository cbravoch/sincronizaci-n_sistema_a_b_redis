<?php

namespace App\Services;

use App\Models\Outbox;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class OutboxPublisher
{
    public function publish(int $chunkSize = 100): bool
    {
        try {
            $processedCount = 0;
            $startTime = microtime(true);

            Outbox::where('is_processed', false)
                ->orderBy('id')
                ->chunkById($chunkSize, function ($events) use (&$processedCount) {
                    if (!app()->environment('testing')) {
                        DB::beginTransaction();
                    }
                    
                    try {
                        foreach ($events as $event) {
                            $this->processEvent($event);
                            $processedCount++;
                        }
                        
                        if (!app()->environment('testing')) {
                            DB::commit();
                        }
                    } catch (\Exception $e) {
                        if (!app()->environment('testing')) {
                            DB::rollBack();
                        }
                        Log::error('Error en lote de eventos', [
                            'error' => $e->getMessage(),
                            'traza' => $e->getTraceAsString()
                        ]);
                        throw $e;
                    }
                });

            $executionTime = round(microtime(true) - $startTime, 2);
            
            Log::info('Proceso de publicación completado', [
                'procesados' => $processedCount,
                'tiempo_ejecucion' => $executionTime . 's'
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Error crítico en OutboxPublisher: ' . $e->getMessage(), [
                'excepcion' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    protected function processEvent(Outbox $event): void
    {
        try {
            Log::debug('Procesando evento', [
                'event_id' => $event->event_id,
                'tipo' => $event->event_type
            ]);

            $result = Redis::xadd(
                'system_a_streams',
                '*',
                [
                    'event_id' => $event->event_id,
                    'event_type' => $event->event_type,
                    'aggregate_type' => $event->aggregate_type,
                    'aggregate_id' => $event->aggregate_id,
                    'version' => $event->version,
                    'payload' => $event->payload,
                    'created_at' => now()->toDateTimeString()
                ]
            );

            if (!$result) {
                throw new \RuntimeException("Error al publicar en Redis");
            }

            DB::table('outbox')
                ->where('id', $event->id)
                ->update([
                    'is_processed' => true,
                    'processed_at' => now()
                ]);

            Log::debug('Evento procesado exitosamente', [
                'event_id' => $event->event_id,
                'redis_id' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('Error procesando evento', [
                'event_id' => $event->id,
                'error' => $e->getMessage(),
                'payload' => $event->payload
            ]);
            throw $e;
        }
    }
}
