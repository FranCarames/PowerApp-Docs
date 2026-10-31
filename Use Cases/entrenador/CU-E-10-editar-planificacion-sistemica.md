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

- Edición de los datos de la Planification sistémica, incluida su duración en semanas y sus rutinas por semana (obligatorias, como al crearla).

**Fuera de alcance:**

- Asignar, quitar, reordenar o repetir las rutinas del plan (CU-E-12). Se hacen en la misma pantalla pero no pasan por «Guardar planificación»: se aplican al instante.

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

1. Datos inválidos, incluida una duración que no es un entero de 1 en adelante (la misma regla que al crearla, CU-E-09).
2. El sistema marca el error y no persiste.

### En el paso 2 — Duración menor que la semana más alta en uso

1. La nueva duración es mayor que 0 y menor que la semana más alta ocupada por una rutina **vigente** del plan.
2. El sistema informa en qué semana hay rutinas, no permite achicar la duración hasta ahí y no persiste.

> **Alcance de esta etapa (decisión del 31/10/2026).** La duración 0 (sin duración fija) queda fuera de alcance: ver CU-E-09, «Duración inválida». El backend la sigue aceptando y, con ella, no pone límite.

### En el paso 1 — Cambiar las rutinas por semana

1. El entrenador cambia las «rutinas por semana» (`number_of_routines`), que define cuántos huecos muestra cada semana (CU-E-09, regla 1).
2. Es sólo eso: no quita ni mueve rutinas ya cargadas, aunque una semana tenga más que las nuevas indicadas. Los huecos de cada semana siguen el número escrito en el momento; el dato se guarda con «Guardar planificación».

### Consecuencia en las asignaciones a alumnos

1. La duración de la plantilla fija el fin de cada asignación a un alumno (inicio más las semanas de la duración).
2. Editarla mueve el fin de **todos** los alumnos que tienen el plan asignado: es una consecuencia asumida.
