# Sistema de Sincronización entre Microservicios

Este proyecto implementa un sistema de sincronización de datos entre dos microservicios (System A y System B) utilizando Redis Streams como cola de mensajes.

## Estructura del Proyecto

```
IMPLEMENTACION/
├── docker/
│   ├── system-a/           # Aplicación Laravel (System A)
│   │   ├── app/
│   │   ├── docker-entrypoint.sh
│   │   └── Dockerfile
│   └── system-b/           # Aplicación Node.js (System B)
│       ├── consumer.js
│       └── Dockerfile
├── docker-compose.yml      # Configuración de todos los servicios
└── README.md               # Este archivo
```

## Servicios

### System A (Laravel)
- **Puerto**: 8000
- **Base de datos**: MySQL (puerto 3307)
- **URL**: http://localhost:8000
- **Cron**: Ejecuta `outbox:process` cada 5s para procesar mensajes de salida

### System B (Node.js Consumer)
- **Base de datos**: MySQL (puerto 3308)
- **Consume mensajes** del stream de Redis

### Redis
- **Puerto**: 6379
- **UI**: http://localhost:8081

## Inicio Rápido

1. **Clonar el repositorio**
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd IMPLEMENTACION
   ```

2. **Iniciar los contenedores**
   ```bash
   docker-compose up -d --build
   ```

3. **Ver logs**
   ```bash
   # Ver logs de System A
   docker logs -f system-a
   
   # Ver logs de System B
   docker logs -f system-b
   ```

## Comandos Útiles

### Docker
```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Reconstruir contenedores
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Recachear config/rutas en Laravel (dentro del proyecto)
docker exec system-a php artisan config:cache
docker exec system-a php artisan route:cache

# Reiniciar system-a y Nginx tras cambios de config/tuning
docker-compose restart system-a system-a-nginx
```

### System A (Laravel)
```bash
# Acceder al contenedor
docker exec -it system-a bash

# Ejecutar migraciones
docker exec system-a php artisan migrate

# Ejecutar comando de procesamiento manual
docker exec system-a php artisan outbox:process
```

### Benchmark API (prueba de carga)
```bash
# Requiere Docker; ejecuta 1000 POST concurrentes al endpoint de test con limpieza
docker run --rm -v "${PWD}:/app" -w /app python:3-slim bash -lc \
  "pip install -q requests mysql-connector-python && \
   python docker/system-b/tests/perf_departments_api.py \
   --api http://host.docker.internal:8000/api/test/department-created-1000 \
   --count 1000 --concurrency 20 --timeout 15 \
   --prefix TEST-CC --cleanup \
   --db-a-host host.docker.internal --db-a-port 3307 \
   --db-b-host host.docker.internal --db-b-port 3308"
```

### Pruebas rápidas (funcionales)
```bash
# Crear empleado de prueba (API de test)
curl -X POST http://localhost:8000/api/test/department-created-1000 \
  -H "Content-Type: application/json" \
  -d '{"name":"Depto QA","cost_center_code":"CCQA1"}'

# Crear empleado vía interfaz web: http://localhost:8000/employees/create
# Editar/eliminar: http://localhost:8000/employees/{id}/edit
```

### Limpieza de datos de prueba
```bash
# Borrar departamentos de prueba en A y B (prefijo TEST-CC o Perf Dept)
docker exec db-a mysql -uuser -ppass -D system_a -e "DELETE FROM departments WHERE name LIKE 'Perf Dept %' OR cost_center_code LIKE 'TEST-CC%';"
docker exec db-b mysql -uuser -ppass -D system_b -e "DELETE FROM departments WHERE name LIKE 'Perf Dept %' OR cost_center_code LIKE 'TEST-CC%';"
# Vaciar tablas de eventos/outbox si es necesario
docker exec db-a mysql -uuser -ppass -D system_a -e "TRUNCATE outbox;"
docker exec db-b mysql -uuser -ppass -D system_b -e "TRUNCATE processed_events; TRUNCATE sync_logs; TRUNCATE event_errors; TRUNCATE sync_offsets;"
# Limpiar mensajes pendientes en Redis (dejar stream vacío)
docker exec redis redis-cli FLUSHALL
```

### System B (Node.js)
```bash
# Acceder al contenedor
docker exec -it system-b sh

# Instalar dependencias (si es necesario)
docker exec system-b npm install
```

### Pruebas unitarias
```bash
# System A (PHPUnit)
docker exec system-a php artisan test

# System B (Jest; sin pruebas activas actualmente, se ejecuta suite vacía)
docker exec system-b npm test

# Variables de entorno para pruebas de System B (.env.test)
# Archivo en docker/system-b/.env.test (por defecto):
# TEST_DB_HOST=db-b
# TEST_DB_PORT=3306
# TEST_DB_USER=user
# TEST_DB_PASSWORD=pass
# TEST_DB_NAME=system_b
```

## Configuración

### Variables de Entorno

#### System A (Laravel)
- `DB_HOST=db-a`
- `DB_PORT=3306`
- `DB_DATABASE=system_a`
- `DB_USERNAME=user`
- `DB_PASSWORD=pass`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`

#### System B (Node.js)
- `DB_HOST=db-b`
- `DB_PORT=3306`
- `DB_NAME=system_b`
- `DB_USER=user`
- `DB_PASSWORD=pass`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`

## Pruebas

1. **Verificar conexión a Redis**
   - Abre http://localhost:8081 para acceder a la interfaz web de Redis

## Monitoreo de Mensajes en Redis

### Comandos Básicos de Redis CLI

Para conectarte a la consola de Redis:
```bash
docker exec -it redis redis-cli
```

#### Ver streams disponibles
```bash
XINFO STREAMS
```

#### Ver información de un stream específico
```bash
# Reemplaza 'laravel-database-system_a_streams' con el nombre de tu stream
XINFO STREAM laravel-database-system_a_streams
```

#### Leer mensajes de un stream
```bash
# Leer todos los mensajes nuevos
XREAD STREAMS laravel-database-system_a_streams $

# Leer los últimos 10 mensajes
XREVRANGE laravel-database-system_a_streams + - COUNT 10

# Leer mensajes pendientes para un grupo
XREADGROUP GROUP sync_workers worker1 COUNT 10 STREAMS laravel-database-system_a_streams >
```

#### Ver grupos de consumidores
```bash
XINFO GROUPS laravel-database-system_a_streams
```

#### Ver consumidores de un grupo
```bash
XINFO CONSUMERS laravel-database-system_a_streams sync_workers
```

#### Ver mensajes pendientes
```bash
XPENDING laravel-database-system_a_streams sync_workers
```

### Monitoreo en Tiempo Real

Para ver los mensajes a medida que llegan:
```bash
docker exec -it redis redis-cli \
  --csv \
  XREAD BLOCK 0 STREAMS laravel-database-system_a_streams $
```

### Limpiar un Stream

**CUIDADO**: Esto eliminará todos los mensajes del stream
```bash
XTRIM laravel-database-system_a_streams MAXLEN 0
```

### Interfaz Web de Redis

Puedes usar la interfaz web en http://localhost:8081 para:
- Ver streams y mensajes
- Monitorear el rendimiento
- Ver estadísticas en tiempo real

2. **Verificar System A**
   - Accede a http://localhost:8000
   - Verifica que la aplicación Laravel esté funcionando

3. **Verificar System B**
   - Verifica los logs para confirmar que está consumiendo mensajes
   ```bash
   docker logs -f system-b
   ```

## Flujo de Datos

1. **Publicación de Eventos**:
   - System A publica eventos en Redis Streams
   - El comando `outbox:process` se ejecuta cada segundo para procesar la bandeja de salida

2. **Consumo de Eventos**:
   - System B está continuamente escuchando nuevos eventos en el stream
   - Procesa los eventos y actualiza su base de datos local

## Solución de Problemas

### Problemas de Conexión
- Verifica que todos los contenedores estén en ejecución: `docker ps`
- Verifica los logs: `docker-compose logs`

### Problemas con el Procesamiento
- Verifica los logs de System A: `docker logs system-a`
- Verifica los logs de System B: `docker logs system-b`
- Verifica los mensajes en Redis usando la interfaz web: http://localhost:8081

## Controladores de Laravel (System A)

En la aplicación Laravel (System A) se exponen vistas CRUD para gestionar departamentos, empleados y habilidades. Estos controladores también se encargan de escribir en la tabla **Outbox** para propagar cambios hacia System B mediante Redis Streams.

### DepartmentsController

- Administra el ciclo de vida de los departamentos.
- Acciones principales:
  - `index`: lista paginada de departamentos.
  - `create` / `store`: formulario y creación de un nuevo departamento.
  - `show`: detalle de un departamento y sus empleados asociados.
  - `edit` / `update`: edición de un departamento existente.
  - `destroy`: eliminación de un departamento.
- Cada operación de creación, actualización o eliminación registra un evento en la tabla **outbox** con `event_type` como `department.created`, `department.updated` o `department.deleted`.

### EmployeesController

- Administra empleados y sus relaciones con departamentos y habilidades.
- Acciones principales:
  - `index`: lista paginada de empleados, incluyendo departamento y habilidades.
  - `create` / `store`: formulario y creación de un nuevo empleado.
  - `show`: detalle de un empleado con su departamento y habilidades.
  - `edit` / `update`: edición de datos del empleado y sus habilidades.
  - `destroy`: eliminación del empleado y desasociación de sus habilidades.
- Publica eventos en **outbox** para reflejar cambios, usando tipos como `employee.created`, `employee.updated` y `employee.deleted`.

### SkillsController

- Administra el catálogo de habilidades que pueden asociarse a empleados.
- Acciones principales:
  - `index`: lista paginada de habilidades.
  - `create` / `store`: formulario y creación de una nueva habilidad.
  - `show`: detalle de la habilidad y empleados que la poseen.
  - `edit` / `update`: modificación de una habilidad existente.
  - `destroy`: eliminación de la habilidad y desasociación de los empleados.
- También escribe en **outbox** para propagar eventos `skill.created`, `skill.updated` y `skill.deleted` hacia el stream de Redis.

Estas operaciones, combinadas con el comando `outbox:process` que corre periódicamente en System A, garantizan que los cambios realizados vía interfaz web se envíen de forma confiable a System B.

## Notas Adicionales

- El sistema está configurado para alta disponibilidad y procesamiento en tiempo real
- Los mensajes se persisten en Redis para garantizar la entrega
- Se recomienda monitorear el uso de recursos del contenedor en producción

## Desarrollado por

**Cristóbal Ignacio Bravo Chávez**  
Ingeniero Civil en Informática  
