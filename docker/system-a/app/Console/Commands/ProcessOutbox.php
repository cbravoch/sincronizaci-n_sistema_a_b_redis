<?php

namespace App\Console\Commands;

use App\Services\OutboxPublisher;
use Illuminate\Console\Command;

class ProcessOutbox extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'outbox:process {--chunk=100 : Tamaño del lote}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Publica eventos del outbox en Redis Streams';

    private $publisher;

    public function __construct(OutboxPublisher $publisher)
    {
        parent::__construct();
        $this->publisher = $publisher;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $chunkSize = $this->option('chunk') ?: 100;
    
        $publisher = app(OutboxPublisher::class);
        $result = $publisher->publish($chunkSize);
        
        if ($result) {
            $this->info('Outbox processed successfully');
            return Command::SUCCESS;
        } else {
            $this->error('Failed to process outbox');
            return Command::FAILURE;
        }
    }
}
