@extends('layouts.app')

@section('title', 'Detalles del Departamento')

@section('content')
<div class="card">
    <div class="card-header">
        <h2>Detalles del Departamento</h2>
    </div>
    <div class="card-body">
        <div class="row mb-4">
            <div class="col-md-6">
                <h4>Información Básica</h4>
                <table class="table table-bordered">
                    <tr>
                        <th>Nombre:</th>
                        <td>{{ $department->name }}</td>
                    </tr>
                    <tr>
                        <th>Código de Centro de Costo:</th>
                        <td>{{ $department->cost_center_code }}</td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="d-flex justify-content-between">
            <a href="{{ route('departments.index') }}" class="btn btn-secondary">
                <i class="bi bi-arrow-left"></i> Volver
            </a>
            <div>
                <a href="{{ route('departments.edit', $department->id) }}" class="btn btn-warning">
                    <i class="bi bi-pencil"></i> Editar
                </a>
                <form action="{{ route('departments.destroy', $department->id) }}" method="POST" class="d-inline" onsubmit="return confirm('¿Estás seguro de eliminar este departamento?')">
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

<div class="card mt-4">
    <div class="card-header">
        <h4>Empleados en este departamento</h4>
    </div>
    <div class="card-body">
        @if($department->employees->count() > 0)
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Posición</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($department->employees as $employee)
                            <tr>
                                <td>{{ $employee->name }}</td>
                                <td>{{ $employee->email }}</td>
                                <td>{{ $employee->position }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @else
            <div class="alert alert-info">
                No hay empleados asignados a este departamento.
            </div>
        @endif
    </div>
</div>
@endsection
