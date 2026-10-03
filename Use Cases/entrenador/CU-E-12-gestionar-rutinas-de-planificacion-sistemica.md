# CU-E-12 — Gestionar Rutinas de una Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Agrupa las operaciones con las que el entrenador define el contenido de una planificación sistémica: qué rutinas la componen, en qué orden, y cuáles se quitan. El vínculo entre una rutina y un plan es un Routine_Asignation, y todas las operaciones de este CU actúan sobre esa tabla.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- [`CU-E-12a`](CU-E-12a-asignar-rutina-a-planificacion.md) Asignar una rutina a una planificación
- [`CU-E-12b`](CU-E-12b-asignar-rutinas-en-lote-a-planificacion.md) Asignar rutinas en lote a una planificación
- [`CU-E-12c`](CU-E-12c-quitar-rutina-de-planificacion.md) Quitar o reincorporar una rutina de una planificación
- [`CU-E-12d`](CU-E-12d-quitar-rutinas-en-lote-de-planificacion.md) Quitar o reincorporar rutinas en lote
- Obtener Rutinas Sistémicas

## Alcance

**Cubre:**

- La gestión del contenido de una planificación sistémica a través de sus cuatro operaciones incluidas.

**Fuera de alcance:**

- Creación y edición de la planificación en sí (CU-E-09 y CU-E-10).
- Creación de las rutinas (CU aparte).
- Asignación de la planificación a un alumno (CU-E-13).

## Reglas comunes a las cuatro operaciones

Estas reglas valen para los cuatro CU incluidos y no se repiten en cada uno:

1. **El `order` es una etiqueta de orden, no una posición exclusiva.** Puede tener huecos —la baja se la quita al vínculo y el resto del plan no se renumera— y puede tener duplicados —el alta persiste la posición recibida sin desplazar a nadie—. A igual posición, el plan muestra primero la rutina que se asignó antes.
2. **Una rutina puede repetirse dentro de la misma planificación.** Un mismo día de entrenamiento puede aparecer más de una vez en la semana, y la posición las distingue.
3. **La baja del vínculo es siempre lógica.** Nunca se borra físicamente, porque de un Routine_Asignation cuelgan las User_Routine de los alumnos y, de ellas, su historial de entrenamiento.
4. **La planificación tiene que estar activa** para poder modificar su contenido.
5. Las operaciones en lote son **todo o nada**: si una falla, no se aplica ninguna.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La planificación existe y está activa.

## Postcondiciones

- El conjunto de rutinas vigentes de la planificación queda actualizado, y su detalle lo refleja.

## Camino principal (flujo básico)

1. El entrenador abre una planificación.
2. El sistema muestra las rutinas que la componen, en orden.
3. El entrenador ejecuta una de las cuatro operaciones incluidas.
4. El sistema aplica el cambio y devuelve la planificación actualizada.
