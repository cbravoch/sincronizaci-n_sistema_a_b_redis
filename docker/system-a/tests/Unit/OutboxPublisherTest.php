<?php

namespace Tests\Unit;

use App\Models\Outbox;
use App\Services\OutboxPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class OutboxPublisherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock Redis para todas las pruebas
        Redis::shouldReceive('flushall')->andReturn(true);
    }

    /** @test */
    public function it_publishes_events_successfully()
    {
        // Crear eventos de prueba directamente en la base de datos
        $events = [];
        for ($i = 0; $i < 5; $i++) {
            $events[] = Outbox::create([
                'event_id' => 'test-event-' . $i,
                'event_type' => 'test.event',
                'aggregate_id' => $i,
                'aggregate_type' => 'test',
                'version' => 1,
                'payload' => json_encode(['test' => $i]),
                'is_processed' => false,
                'created_at' => now(),
            ]);
        }

        // Mock de Redis
        Redis::shouldReceive('xadd')
            ->times(5)
            ->andReturn('1234567890-0');

        // Mock de Log para permitir cualquier llamada
        Log::shouldReceive('debug')->andReturn(true);
        Log::shouldReceive('info')->andReturn(true);

        $publisher = new OutboxPublisher();
        $result = $publisher->publish(10);

        // Verificaciones
        $this->assertTrue($result);
        
        // Verificar que los eventos fueron marcados como procesados en la base de datos
        foreach ($events as $event) {
            $updated = \DB::table('outbox')
                ->where('id', $event->id)
                ->first();
            
            $this->assertTrue((bool) $updated->is_processed);
            $this->assertNotNull($updated->processed_at);
        }
    }

    /** @test */
    public function it_processes_events_in_chunks()
    {
        // Crear 15 eventos
        $events = [];
        for ($i = 0; $i < 15; $i++) {
            $events[] = Outbox::create([
                'event_id' => 'test-event-' . $i,
                'event_type' => 'test.event',
                'aggregate_id' => $i,
                'aggregate_type' => 'test',
                'version' => 1,
                'payload' => json_encode(['test' => $i]),
                'is_processed' => false,
                'created_at' => now(),
            ]);
        }

        // Mock de Redis
        Redis::shouldReceive('xadd')
            ->times(15)
            ->andReturn('1234567890-0');

        // Mock de Log para permitir cualquier llamada
        Log::shouldReceive('debug')->andReturn(true);
        Log::shouldReceive('info')->andReturn(true);

        $publisher = new OutboxPublisher();
        $result = $publisher->publish(5); // Procesar en chunks de 5

        $this->assertTrue($result);
        
        // Verificar que todos los eventos fueron procesados
        $this->assertEquals(0, Outbox::where('is_processed', false)->count());
        $this->assertEquals(15, Outbox::where('is_processed', true)->count());
    }

    /** @test */
    public function it_handles_empty_outbox_gracefully()
    {
        // No crear eventos
        Redis::shouldReceive('xadd')->never();

        $publisher = new OutboxPublisher();
        $result = $publisher->publish(100);

        $this->assertTrue($result);
    }

    /** @test */
    public function it_handles_redis_connection_error()
    {
        // Crear eventos de prueba
        $events = [];
        for ($i = 0; $i < 3; $i++) {
            $events[] = Outbox::create([
                'event_id' => 'test-error-' . $i,
                'event_type' => 'test.event',
                'aggregate_id' => $i,
                'aggregate_type' => 'test',
                'version' => 1,
                'payload' => json_encode(['test' => $i]),
                'is_processed' => false,
                'created_at' => now(),
            ]);
        }

        // Mock de Redis para que lance una excepción en el primer intento
        Redis::shouldReceive('xadd')
            ->once()
            ->andThrow(new \Exception('Redis connection error'));

        // Mock de Log para capturar el error
        Log::shouldReceive('debug')->andReturn(true);
        Log::shouldReceive('error')
            ->once()
            ->withArgs(function ($message, $context) {
                return str_contains($message, 'Error procesando evento');
            });
        Log::shouldReceive('error')
            ->once()
            ->withArgs(function ($message, $context) {
                return str_contains($message, 'Error crítico en OutboxPublisher');
            });

        $publisher = new OutboxPublisher();
        $result = $publisher->publish(10);

        $this->assertFalse($result);
        
        // Verificar que los eventos no fueron marcados como procesados en la base de datos
        foreach ($events as $event) {
            $updated = \DB::table('outbox')
                ->where('id', $event->id)
                ->first();
            
            $this->assertFalse((bool) $updated->is_processed);
            $this->assertNull($updated->processed_at);
        }
    }

    /** @test */
    public function it_uses_correct_redis_stream_format()
    {
        $event = Outbox::create([
            'event_id' => 'test-format',
            'is_processed' => false,
            'event_type' => 'test.event',
            'aggregate_id' => '123',
            'aggregate_type' => 'test',
            'version' => 1,
            'payload' => json_encode(['test' => 'data']),
            'created_at' => now(),
        ]);

        // Mock de Redis para verificar los argumentos
        Redis::shouldReceive('xadd')
            ->once()
            ->with(
                'system_a_streams',
                '*',
                [
                    'event_id' => $event->event_id,
                    'event_type' => 'test.event',
                    'aggregate_type' => 'test',
                    'aggregate_id' => '123',
                    'version' => 1,
                    'payload' => json_encode(['test' => 'data']),
                    'created_at' => \Carbon\Carbon::now()->toDateTimeString()
                ]
            )
            ->andReturn('1234567890-0');

        // Mock de Log para permitir cualquier llamada
        Log::shouldReceive('debug')->andReturn(true);
        Log::shouldReceive('info')->andReturn(true);

        $publisher = new OutboxPublisher();
        $result = $publisher->publish(10);

        $this->assertTrue($result);
    }

    /** @test */
    public function it_logs_processing_metrics()
    {
        // Crear eventos
        $events = [];
        for ($i = 0; $i < 10; $i++) {
            $events[] = Outbox::create([
                'event_id' => 'test-metric-' . $i,
                'event_type' => 'test.event',
                'aggregate_id' => $i,
                'aggregate_type' => 'test',
                'version' => 1,
                'payload' => json_encode(['test' => $i]),
                'is_processed' => false,
                'created_at' => now(),
            ]);
        }

        // Mock de Redis
        Redis::shouldReceive('xadd')
            ->times(10)
            ->andReturn('1234567890-0');

        // Mock de Log para verificar las métricas
        Log::shouldReceive('debug')->andReturn(true);
        Log::shouldReceive('info')
            ->once()
            ->withArgs(function ($message, $context) {
                return $message === 'Proceso de publicación completado' &&
                       isset($context['processed']) &&
                       isset($context['execution_time']);
            });

        $publisher = new OutboxPublisher();
        $result = $publisher->publish(100);

        $this->assertTrue($result);
    }
}
