@extends('layouts.app')

@section('title', 'Habilidades')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <h1>Habilidades</h1>
    <a href="{{ route('skills.create') }}" class="btn btn-primary">
        <i class="bi bi-plus-lg"></i> Nueva Habilidad
    </a>
</div>

<div class="table-responsive">
    <table class="table table-striped">
        <thead class="table-dark">
            <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse($skills as $skill)
                <tr>
                    <td>{{ $skill->name }}</td>
                    <td>{{ Str::limit($skill->description, 50) }}</td>
                    <td>
                        <a href="{{ route('skills.show', $skill->id) }}" class="btn btn-sm btn-info">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="{{ route('skills.edit', $skill->id) }}" class="btn btn-sm btn-warning">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <form action="{{ route('skills.destroy', $skill->id) }}" method="POST" class="d-inline" onsubmit="return confirm('¿Estás seguro de eliminar esta habilidad?')">
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
                    <td colspan="3" class="text-center">No hay habilidades registradas</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{ $skills->links() }}
@endsection