@extends('layouts.app')

@section('title', 'Departamentos')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <h1>Departamentos</h1>
    <a href="{{ route('departments.create') }}" class="btn btn-primary">
        <i class="bi bi-plus-lg"></i> Nuevo Departamento
    </a>
</div>

<div class="table-responsive">
    <table class="table table-striped">
        <thead class="table-dark">
            <tr>
                <th>Nombre</th>
                <th>Código de Centro de Costo</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse($departments as $department)
                <tr>
                    <td>{{ $department->name }}</td>
                    <td>{{ $department->cost_center_code }}</td>
                    <td>
                        <a href="{{ route('departments.show', $department->id) }}" class="btn btn-sm btn-info">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="{{ route('departments.edit', $department->id) }}" class="btn btn-sm btn-warning">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <form action="{{ route('departments.destroy', $department->id) }}" method="POST" class="d-inline" onsubmit="return confirm('¿Estás seguro de eliminar este departamento?')">
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
                    <td colspan="3" class="text-center">No hay departamentos registrados</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{ $departments->links() }}
@endsection
