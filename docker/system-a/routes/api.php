<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DepartmentsController;

Route::post('test/department-created-1000', [DepartmentsController::class, 'apiTestCreate']);
