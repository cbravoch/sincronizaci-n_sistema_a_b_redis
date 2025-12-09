<?php

namespace App\Http\Controllers;

use App\Models\Departments;
use App\Models\Employees;
use App\Models\Skills;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Helpers\OutboxHelper;

/**
 * Controlador responsable de gestionar el CRUD de empleados,
 * sus relaciones con departamentos y habilidades, y registrar
 * los eventos en la tabla de outbox.
 */
class EmployeesController extends Controller
{
    /**
     * Listado paginado de empleados con sus relaciones.
     *
     * @return \Illuminate\View\View
     */
    public function index()
    {
        $employees = Employees::with('department', 'skills')->paginate(10);
        return view('employees.index', compact('employees'));
    }

    /**
     * Muestra el formulario de creación de un empleado.
     *
     * @return \Illuminate\View\View
     */
    public function create()
    {
        $departments = Departments::all();
        $skills = Skills::all();
        return view('employees.create', compact('departments', 'skills'));
    }

    /**
     * Guarda un nuevo empleado y registra el evento en outbox.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:employees,email',
            'departments_id' => 'required|exists:departments,id',
            'position' => 'required|string|max:255',
            'hire_date' => 'nullable|date',
            'skills' => 'array',
            'skills.*' => 'exists:skills,id'
        ]);

        Log::info('EmployeesController@store - Datos recibidos', [
            'name' => $request->name,
            'email' => $request->email,
            'departments_id' => $request->departments_id,
            'position' => $request->position,
            'skills' => $request->input('skills'),
        ]);

        DB::beginTransaction();

        try {
            $employee = Employees::create([
                'name' => $request->name,
                'email' => $request->email,
                'departments_id' => $request->departments_id,
                'position' => $request->position,
                'hire_date' => $request->hire_date,
                'version' => 1,
            ]);

            if ($request->has('skills')) {
                Log::info('EmployeesController@store - Sincronizando habilidades', [
                    'employee_id' => $employee->id,
                    'skills' => $request->input('skills'),
                ]);
                $employee->skills()->syncWithPivotValues($request->skills, ['level' => 1]);
            } else {
                Log::info('EmployeesController@store - Sin habilidades en el request');
            }

            OutboxHelper::createOutboxEvent(
                'employee.created',
                $employee->id,
                'employee',
                $employee->version,
                $employee->load('skills')
            );

            DB::commit();

            return redirect()->route('employees.index')
                ->with('success', 'Empleado creado exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear empleado: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Error al crear el empleado.');
        }
    }

    /**
     * Muestra el detalle de un empleado con su departamento y habilidades.
     *
     * @param  int  $id  Identificador del empleado
     * @return \Illuminate\View\View
     */
    public function show($id)
    {
        $employee = Employees::with(['department', 'skills'])->findOrFail($id);
        return view('employees.show', compact('employee'));
    }

    /**
     * Muestra el formulario de edición de un empleado.
     *
     * @param  int  $id  Identificador del empleado
     * @return \Illuminate\View\View
     */
    public function edit($id)
    {
        $employee = Employees::with('skills')->findOrFail($id);
        $departments = Departments::all();
        $skills = Skills::all();
        $employeeSkills = $employee->skills->pluck('id')->toArray();

        return view('employees.edit', compact('employee', 'departments', 'skills', 'employeeSkills'));
    }

    /**
     * Actualiza un empleado existente y registra el evento en outbox.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id  Identificador del empleado
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, $id)
    {
        $employee = Employees::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:employees,email,' . $id,
            'departments_id' => 'required|exists:departments,id',
            'position' => 'required|string|max:255',
            'hire_date' => 'nullable|date',
            'skills' => 'array',
            'skills.*' => 'exists:skills,id'
        ]);

        DB::beginTransaction();

        try {

            $employee->update([
                'name' => $request->name,
                'email' => $request->email,
                'departments_id' => $request->departments_id,
                'position' => $request->position,
                'hire_date' => $request->hire_date,
                'version' => $employee->version + 1,
            ]);

            if ($request->has('skills')) {
                Log::info('EmployeesController@update - Sincronizando habilidades', [
                    'employee_id' => $employee->id,
                    'skills' => $request->input('skills'),
                ]);
                $employee->skills()->syncWithPivotValues($request->skills, ['level' => 1]);
            } else {
                Log::info('EmployeesController@update - Sin habilidades en el request, se desasocian todas');
                $employee->skills()->detach();
            }

            OutboxHelper::createOutboxEvent(
                'employee.updated',
                $employee->id,
                'employee',
                $employee->version,
                $employee->load('skills')
            );


            DB::commit();

            return redirect()->route('employees.show', $employee->id)
                ->with('success', 'Empleado actualizado exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar empleado: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Error al actualizar el empleado.');
        }
    }

    /**
     * Elimina un empleado, desasocia sus habilidades y registra el evento en outbox.
     *
     * @param  int  $id  Identificador del empleado
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $employee = Employees::findOrFail($id);

        DB::beginTransaction();

        try {

            $employee->skills()->detach();
            $employee->delete();

            OutboxHelper::createOutboxEvent(
                'employee.deleted',
                $employee->id,
                'employee',
                $employee->version,
                $employee->load('skills')
            );

            DB::commit();

            return redirect()->route('employees.index')
                ->with('success', 'Empleado eliminado exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al eliminar empleado: ' . $e->getMessage());
            return back()->with('error', 'Error al eliminar el empleado.');
        }
    }
}
