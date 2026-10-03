# CU-E-18 — Eliminar Rutina Sistémica (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Da de baja lógica una rutina sistémica (active = false). Nunca se borra físicamente, para preservar el historial de entrenamiento de los alumnos que la realizaron.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado de la Routine como active = false (borrado lógico).

**Fuera de alcance:**

- Borrado físico del registro.
- Baja de los circuitos que la componen (son reutilizables).
- Baja de las planificaciones que la referencian.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La rutina existe y está activa.

## Postcondiciones

- La Routine queda con active = false y deja de ofrecerse para nuevas planificaciones y asignaciones.
- Las planificaciones y asignaciones existentes mantienen su integridad; el historial de entrenamiento de los alumnos se conserva.

## Camino principal (flujo básico)

1. El entrenador selecciona una rutina y solicita eliminarla.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca la Routine como active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 1 — Rutina en uso

1. La rutina forma parte de planificaciones o está asignada a alumnos.
2. El sistema informa que la baja no la quita de las asignaciones vigentes y permite continuar.
