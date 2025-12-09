<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Outbox extends Model
{
    use HasFactory;

    protected $table = 'outbox';

    protected $primaryKey = 'id';

    protected $fillable = [
        'event_id',
        'event_type',
        'aggregate_type',
        'aggregate_id',
        'version',
        'created_at',
        'payload',
        'processed_at',
        'is_processed',
    ];

    public $timestamps = false;
}
