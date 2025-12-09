@extends('layouts.app')

@section('title', 'Detalles de la Habilidad')

@section('content')
<div class="card">
    <div class="card-header">
        <h2>Detalles de la Habilidad</h2>
    </div>
    <div class="card-body">
        <div class="row">
            <div class="col-md-6">
                <h4>Información Básica</h4>
                <table class="table table-bordered">
                    <tr>
                        <th>Nombre:</th>
                        <td>{{ $skill->name }}</td>
                    </tr>
                    <tr>
                        <th>Descripción:</th>
                        <td>{{ $skill->description ?? 'N/A' }}</td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h4>Empleados con esta habilidad</h4>
                @if($skill->employees && $skill->employees->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Nivel</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($skill->employees as $employee)
                                    <tr>
                                        <td>
                                            <a href="{{ route('employees.show', $employee->id) }}">
                                                {{ $employee->name }}
                                            </a>
                                        </td>
                                        <td>{{ $employee->email }}</td>
                                        <td>{{ $employee->pivot->level ?? 'N/A' }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <div class="alert alert-info">
                        Ningún empleado tiene asignada esta habilidad.
                    </div>
                @endif
            </div>
        </div>

        <div class="d-flex justify-content-between mt-4">
            <a href="{{ route('skills.index') }}" class="btn btn-secondary">
                <i class="bi bi-arrow-left"></i> Volver
            </a>
            <div>
                <a href="{{ route('skills.edit', $skill->id) }}" class="btn btn-warning">
                    <i class="bi bi-pencil"></i> Editar
                </a>
                <form action="{{ route('skills.destroy', $skill->id) }}" method="POST" class="d-inline" onsubmit="return confirm('¿Estás seguro de eliminar esta habilidad?')">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection