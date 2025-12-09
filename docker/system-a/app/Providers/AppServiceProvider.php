<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\OutboxPublisher;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(OutboxPublisher::class, function () {
            return new OutboxPublisher();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
