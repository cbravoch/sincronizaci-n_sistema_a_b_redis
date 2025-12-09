<?php

namespace App\Models;

use App\Models\EmployeeSkills;
use App\Models\Employees;
use Illuminate\Database\Eloquent\Model;

class Skills extends Model
{
    protected $table = 'skills';

    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'name',
        'description',
        'created_at',
        'updated_at',
        'version',
    ];

    public $timestamps = false;

    public function employeeSkills()
    {
        // Relación auxiliar hacia el modelo pivot si se requiere acceder directamente
        return $this->hasMany(EmployeeSkills::class, 'skill_id');
    }

    public function employees()
    {
        // Relación muchos a muchos usando la tabla pivote real employee_skills
        // skill_id    -> referencia a skills.id (lado local)
        // employee_id -> referencia a employees.id (lado relacionado)
        return $this->belongsToMany(Employees::class, 'employee_skills', 'skill_id', 'employee_id');
    }
}
