<?php

namespace App\Http\Controllers;

use App\Models\Departments;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Helpers\OutboxHelper;
/**
 * Controlador responsable de gestionar el CRUD de departamentos
 * y publicar eventos en la tabla de outbox.
 */
class DepartmentsController extends Controller
{
    /**
     * Listado paginado de departamentos.
     *
     * @return \Illuminate\View\View
     */
    public function index()
    {
        $departments = Departments::paginate(10);
        return view('departments.index', compact('departments'));
    }

    /**
     * Muestra el formulario de creación de un departamento.
     *
     * @return \Illuminate\View\View
     */
    public function create()
    {
        return view('departments.create');
    }

    /**
     * Crea un departamento vía API para pruebas de carga.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function apiTestCreate(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'cost_center_code' => 'required|string|max:50|unique:departments,cost_center_code',
        ]);

        DB::beginTransaction();

        try {
            $department = Departments::create([
                'name' => $request->name,
                'cost_center_code' => $request->cost_center_code,
                'version' => 1,
            ]);

            OutboxHelper::createOutboxEvent(
                'department.created',
                $department->id,
                'department',
                $department->version,
                $department
            );

            DB::commit();

            return response()->json([
                'status' => 'ok',
                'department' => $department,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear departamento via API test: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Error al crear el departamento.',
            ], 500);
        }
    }

    /**
     * Guarda un nuevo departamento y registra el evento en outbox.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'cost_center_code' => 'required|string|max:50|unique:departments,cost_center_code',
        ]);

        DB::beginTransaction();

        try {
            $department = Departments::create([
                'name' => $request->name,
                'cost_center_code' => $request->cost_center_code,
                'version' => 1,
            ]);

             OutboxHelper::createOutboxEvent(
                'department.created',
                $department->id,
                'department',
                $department->version,
                $department
            );  

            DB::commit();

            return redirect()->route('departments.index')
                ->with('success', 'Departamento creado exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear departamento: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Error al crear el departamento.');
        }
    }

    /**
     * Muestra el detalle de un departamento específico.
     *
     * @param  int  $id  Identificador del departamento
     * @return \Illuminate\View\View
     */
    public function show($id)
    {
        $department = Departments::with('employees')->findOrFail($id);
        return view('departments.show', compact('department'));
    }

    /**
     * Muestra el formulario de edición de un departamento.
     *
     * @param  int  $id  Identificador del departamento
     * @return \Illuminate\View\View
     */
    public function edit($id)
    {
        $department = Departments::findOrFail($id);
        return view('departments.edit', compact('department'));
    }

    /**
     * Actualiza un departamento existente y registra el evento en outbox.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id  Identificador del departamento
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, $id)
    {
        $department = Departments::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'cost_center_code' => 'required|string|max:50|unique:departments,cost_center_code,' . $id,
        ]);

        DB::beginTransaction();

        try {            
            $department->update([
                'name' => $request->name,
                'cost_center_code' => $request->cost_center_code,
                'version' => $department->version + 1,
            ]);

            OutboxHelper::createOutboxEvent(
                'department.updated',
                $department->id,
                'department',
                $department->version,
                $department
            );

            DB::commit();

            return redirect()->route('departments.show', $department->id)
                ->with('success', 'Departamento actualizado exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar departamento: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Error al actualizar el departamento.');
        }
    }

    /**
     * Elimina un departamento y registra el evento en outbox.
     *
     * @param  int  $id  Identificador del departamento
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $department = Departments::findOrFail($id);
        
        DB::beginTransaction();

        try {
            
            OutboxHelper::createOutboxEvent(
                'department.deleted',
                $department->id,
                'department',
                $department->version,
                $department
            );

            $department->delete();

            DB::commit();

            return redirect()->route('departments.index')
                ->with('success', 'Departamento eliminado exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al eliminar departamento: ' . $e->getMessage());
            return back()->with('error', 'Error al eliminar el departamento.');
        }
    }
}
