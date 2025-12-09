<?php

namespace App\Http\Controllers;

use App\Models\Skills;
use App\Models\Outbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Helpers\OutboxHelper;
/**
 * Controlador responsable de gestionar el CRUD de habilidades
 * y sus relaciones con empleados, registrando los eventos en outbox.
 */
class SkillsController extends Controller
{
    /**
     * Listado paginado de habilidades.
     *
     * @return \Illuminate\View\View
     */
    public function index()
    {
        $skills = Skills::with('employees')->paginate(10);
        return view('skills.index', compact('skills'));
    }

    /**
     * Muestra el formulario de creación de una habilidad.
     *
     * @return \Illuminate\View\View
     */
    public function create()
    {
        return view('skills.create');
    }

    /**
     * Guarda una nueva habilidad y registra el evento en outbox.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:skills,name',
            'description' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            $skill = Skills::create([
                'name' => $request->name,
                'description' => $request->description,
                'version' => 1,
            ]);

            OutboxHelper::createOutboxEvent(
                'skill.created',
                $skill->id,
                'skill',
                $skill->version,
                $skill
            );

            DB::commit();

            return redirect()->route('skills.index')
                ->with('success', 'Habilidad creada exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear habilidad: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Error al crear la habilidad.');
        }
    }

    /**
     * Muestra el detalle de una habilidad y los empleados asociados.
     *
     * @param  int  $id  Identificador de la habilidad
     * @return \Illuminate\View\View
     */
    public function show($id)
    {
        $skill = Skills::with('employees')->findOrFail($id);
        return view('skills.show', compact('skill'));
    }

    /**
     * Muestra el formulario de edición de una habilidad.
     *
     * @param  int  $id  Identificador de la habilidad
     * @return \Illuminate\View\View
     */
    public function edit($id)
    {
        $skill = Skills::findOrFail($id);
        return view('skills.edit', compact('skill'));
    }

    /**
     * Actualiza una habilidad existente y registra el evento en outbox.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id  Identificador de la habilidad
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, $id)
    {
        $skill = Skills::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255|unique:skills,name,' . $id,
            'description' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {            
            $skill->name = $request->name;
            $skill->description = $request->description;
            $skill->version = $skill->version + 1;
            $skill->save();

            OutboxHelper::createOutboxEvent(
                'skill.updated',
                $skill->id,
                'skill',
                $skill->version,
                $skill
            );    

            DB::commit();

            return redirect()->route('skills.show', $skill->id)
                ->with('success', 'Habilidad actualizada exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar habilidad: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Error al actualizar la habilidad.');
        }
    }

    /**
     * Elimina una habilidad, desasocia empleados y registra el evento en outbox.
     *
     * @param  int  $id  Identificador de la habilidad
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $skill = Skills::findOrFail($id);
        
        DB::beginTransaction();

        try {

            $skill->employees()->detach();
            $skill->delete();
            
            OutboxHelper::createOutboxEvent(
                'skill.deleted',
                $skill->id,
                'skill',
                $skill->version,
                $skill
            );

            DB::commit();

            return redirect()->route('skills.index')
                ->with('success', 'Habilidad eliminada exitosamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al eliminar habilidad: ' . $e->getMessage());
            return back()->with('error', 'Error al eliminar la habilidad.');
        }
    }
}