@extends('layouts.app')

@section('title', 'Crear Departamento')

@section('content')
<div class="card">
    <div class="card-header">
        <h2>Nuevo Departamento</h2>
    </div>
    <div class="card-body">
        <form action="{{ route('departments.store') }}" method="POST">
            @csrf
            <div class="mb-3">
                <label for="name" class="form-label">Nombre del Departamento</label>
                <input type="text" class="form-control @error('name') is-invalid @enderror" id="name" name="name" value="{{ old('name') }}" required>
                @error('name')
                    <div class="invalid-feedback">{{ $message }}</div>
                @enderror
            </div>
            <div class="mb-3">
                <label for="cost_center_code" class="form-label">Código de Centro de Costo</label>
                <input type="text" class="form-control @error('cost_center_code') is-invalid @enderror" id="cost_center_code" name="cost_center_code" value="{{ old('cost_center_code') }}" required>
                @error('cost_center_code')
                    <div class="invalid-feedback">{{ $message }}</div>
                @enderror
            </div>
            <div class="d-flex justify-content-between">
                <a href="{{ route('departments.index') }}" class="btn btn-secondary">
                    <i class="bi bi-arrow-left"></i> Cancelar
                </a>
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-save"></i> Guardar
                </button>
            </div>
        </form>
    </div>
</div>
@endsection
