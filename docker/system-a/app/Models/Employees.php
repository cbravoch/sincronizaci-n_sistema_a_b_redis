<?php

namespace App\Models;

use App\Models\Departments;
use App\Models\Skills;
use Illuminate\Database\Eloquent\Model;

class Employees extends Model
{
    protected $table = 'employees';

    protected $primaryKey = 'id';

    protected $fillable = [
        'name',
        'email',
        'hire_date',
        'departments_id',
        'updated_at',
        'deleted_at',
        'position',
        'version',
        'is_active'
    ];

    public $timestamps = false;

    public function departments()
    {
        // Relación original hacia Departments usando la FK definida en el modelo
        return $this->belongsTo(Departments::class, 'departments_id');
    }

    public function department()
    {
        // Alias para que los controladores/vistas puedan usar $employee->department
        return $this->belongsTo(Departments::class, 'departments_id');
    }

    public function skills()
    {
        return $this->belongsToMany(Skills::class, 'employee_skills', 'employee_id', 'skill_id');
    }
}
