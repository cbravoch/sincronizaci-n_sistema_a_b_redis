@extends('layouts.app')

@section('title', 'Detalles del Empleado')

@section('content')
<div class="card">
    <div class="card-header">
        <h2>Detalles del Empleado</h2>
    </div>
    <div class="card-body">
        <div class="row">
            <div class="col-md-6">
                <h4>Información Personal</h4>
                <table class="table table-bordered">
                    <tr>
                        <th>Nombre:</th>
                        <td>{{ $employee->name }}</td>
                    </tr>
                    <tr>
                        <th>Email:</th>
                        <td>{{ $employee->email }}</td>
                    </tr>
                    <tr>
                        <th>Departamento:</th>
                        <td>{{ $employee->department->name ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Posición:</th>
                        <td>{{ $employee->position }}</td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h4>Habilidades</h4>
                @if($employee->skills->count() > 0)
                    <ul class="list-group">
                        @foreach($employee->skills as $skill)
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                {{ $skill->name }}
                                @if($skill->pivot->level)
                                    <span class="badge bg-primary rounded-pill">Nivel {{ $skill->pivot->level }}</span>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                @else
                    <div class="alert alert-info">
                        Este empleado no tiene habilidades asignadas.
                    </div>
                @endif
            </div>
        </div>

        <div class="d-flex justify-content-between mt-4">
            <a href="{{ route('employees.index') }}" class="btn btn-secondary">
                <i class="bi bi-arrow-left"></i> Volver
            </a>
            <div>
                <a href="{{ route('employees.edit', $employee->id) }}" class="btn btn-warning">
                    <i class="bi bi-pencil"></i> Editar
                </a>
                <form action="{{ route('employees.destroy', $employee->id) }}" method="POST" class="d-inline" onsubmit="return confirm('¿Estás seguro de eliminar este empleado?')">
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