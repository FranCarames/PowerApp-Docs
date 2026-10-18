# CU-E-10 — Editar Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Modifica los datos de una planificación sistémica existente.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los datos de la Planification sistémica, incluida su duración en semanas (obligatoria, como al crearla).

**Fuera de alcance:**

- Reasignación de rutinas (CU «Asignar Rutina a Planificación»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La Planification existe.

## Postcondiciones

- La Planification queda actualizada.

## Camino principal (flujo básico)

1. El entrenador abre una planificación y modifica sus datos.
2. El sistema valida los datos.
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Planificación inexistente

1. La planificación ya no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Datos inválidos.
2. El sistema marca el error y no persiste.

### En el paso 2 — Duración menor que la semana más alta en uso

1. La nueva duración es mayor que 0 y menor que la semana más alta ocupada por una rutina **vigente** del plan.
2. El sistema informa en qué semana hay rutinas, no permite achicar la duración hasta ahí y no persiste. Con duración 0 (sin duración fija) no hay límite.

### Consecuencia en las asignaciones a alumnos

1. La duración de la plantilla fija el fin de cada asignación a un alumno (inicio más las semanas de la duración).
2. Editarla mueve el fin de **todos** los alumnos que tienen el plan asignado: es una consecuencia asumida.
