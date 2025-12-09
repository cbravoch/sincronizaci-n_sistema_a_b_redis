<?php

use App\Http\Controllers\DepartmentsController;
use App\Http\Controllers\EmployeesController;
use App\Http\Controllers\SkillsController;
use Illuminate\Support\Facades\Route;

// Ruta de inicio
Route::get('/', function () {
    return view('welcome');
});

// Rutas de Departamentos
Route::resource('departments', DepartmentsController::class);

// Rutas de Empleados
Route::resource('employees', EmployeesController::class);

// Rutas de Habilidades
Route::resource('skills', SkillsController::class);