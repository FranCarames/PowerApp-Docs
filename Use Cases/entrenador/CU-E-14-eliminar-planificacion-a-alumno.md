# CU-E-14 — Eliminar Planificación a Alumno (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Da de baja lógica la planificación asignada a un alumno (active = false) y, con ella, todas las User_Routine que derivaban de ese plan. Nunca se borra físicamente, para preservar el historial de entrenamiento del alumno.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado de la User_Planification como active = false.
- Marcado en bloque de las User_Routine derivadas como active = false.

**Fuera de alcance:**

- Borrado físico de los registros.
- Baja de la planificación sistémica (plantilla).
- Baja de los Routine_Exercise_Finished del alumno: el historial de lo que entrenó se conserva intacto.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno tiene la planificación asignada y activa.

## Postcondiciones

- La User_Planification queda con active = false y desaparece del home del alumno.
- Todas sus User_Routine quedan con active = false.
- El historial de entrenamiento (Routine_Exercise_Finished) se conserva y sigue siendo consultable desde CU-E-06.

## Camino principal (flujo básico)

1. El entrenador abre la asignación del alumno y solicita quitarla.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca la User_Planification y sus User_Routine como active = false, y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 1 — Planificación ya dada de baja

1. La planificación del alumno ya está inactiva.
2. El sistema informa que no hay nada que quitar.
