@extends('layouts.app')

@section('title', 'Empleados')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <h1>Empleados</h1>
    <a href="{{ route('employees.create') }}" class="btn btn-primary">
        <i class="bi bi-plus-lg"></i> Nuevo Empleado
    </a>
</div>

<div class="table-responsive">
    <table class="table table-striped">
        <thead class="table-dark">
            <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Departamento</th>
                <th>Posición</th>
                <th>Fecha de contratación</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse($employees as $employee)
                <tr>
                    <td>{{ $employee->name }}</td>
                    <td>{{ $employee->email }}</td>
                    <td>{{ $employee->department->name ?? 'N/A' }}</td>
                    <td>{{ $employee->position }}</td>
                    <td>{{ optional($employee->hire_date)->format('Y-m-d') ?? 'N/A' }}</td>
                    <td>
                        <a href="{{ route('employees.show', $employee->id) }}" class="btn btn-sm btn-info">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="{{ route('employees.edit', $employee->id) }}" class="btn btn-sm btn-warning">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <form action="{{ route('employees.destroy', $employee->id) }}" method="POST" class="d-inline" onsubmit="return confirm('¿Estás seguro de eliminar este empleado?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn btn-sm btn-danger">
                                <i class="bi bi-trash"></i>
                            </button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="text-center">No hay empleados registrados</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{ $employees->links() }}
@endsection
