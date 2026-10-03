# CU-E-11 — Eliminar Planificación Sistémica (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Da de baja lógica una planificación sistémica (active = false). Nunca se borra físicamente, para preservar las asignaciones y el historial de entrenamiento de los alumnos.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado de la Planification como active = false (borrado lógico).

**Fuera de alcance:**

- Borrado físico del registro.
- Baja de las planificaciones ya asignadas a alumnos (User_Planification).
- Baja de las rutinas que la componen (son reutilizables).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La Planification existe y está activa.

## Postcondiciones

- La Planification queda con active = false y deja de ofrecerse como plantilla para nuevas asignaciones.
- Las asignaciones existentes mantienen su integridad; el historial de entrenamiento de los alumnos se conserva.

## Camino principal (flujo básico)

1. El entrenador selecciona una planificación y solicita eliminarla.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca la Planification como active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 1 — Planificación en uso

1. La planificación está asignada a alumnos.
2. El sistema informa que la baja no la quita de las asignaciones vigentes y permite continuar.
