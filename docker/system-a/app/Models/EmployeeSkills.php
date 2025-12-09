<?php

namespace App\Models;

use App\Models\Employees;
use App\Models\Skills;
use Illuminate\Database\Eloquent\Model;

class EmployeeSkills extends Model
{
    protected $table = "employee_skills";

    protected $fillable = [
        'employee_id',
        'skill_id',
        'version',
    ];

    public $timestamps = false;

    public function employee()
    {
        return $this->belongsTo(Employees::class);
    }

    public function skill()
    {
        return $this->belongsTo(Skills::class);
    }
}
