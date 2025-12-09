<?php

namespace App\Models;

use App\Models\Employees;
use Illuminate\Database\Eloquent\Model;

class Departments extends Model
{
    protected $table = 'departments';

    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'name',
        'cost_center_code',
        'created_at',
        'updated_at',
        'version',
    ];

    public $timestamps = false;

    public function employees()
    {
        return $this->hasMany(Employees::class);
    }
}
