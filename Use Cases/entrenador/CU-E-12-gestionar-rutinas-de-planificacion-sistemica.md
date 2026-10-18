# CU-E-12 — Gestionar Rutinas de una Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Agrupa las operaciones con las que el entrenador define el contenido de una planificación sistémica: qué rutinas la componen, en qué semana y en qué orden, y cuáles se quitan. El vínculo entre una rutina y un plan es un Routine_Asignation, y todas las operaciones de este CU actúan sobre esa tabla.

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

1. **El plan se arma por semanas.** Cada rutina va en una `week` (entera, ≥ 1). Si la planificación tiene duración mayor que 0, la semana no puede superarla; con duración 0 no hay tope. Dentro de la semana, el `order` es una **etiqueta de orden**, no una posición exclusiva: puede tener huecos y puede tener duplicados —el alta persiste la posición recibida sin desplazar a nadie—. A igual posición, el plan muestra primero la rutina que se asignó antes. La lista que devuelve el sistema es plana, ordenada por semana y por orden; agrupar por semana es del cliente.
2. **Una rutina puede repetirse dentro de la misma planificación.** Un mismo día de entrenamiento puede aparecer más de una vez en la semana, y la posición las distingue. También puede repetirse en semanas distintas.
3. **La baja del vínculo es siempre lógica y conserva su lugar.** Nunca se borra físicamente, porque del Routine_Asignation cuelga el historial de entrenamiento de los alumnos (Routine_Exercise_Finished). La baja sólo apaga el vínculo: la rutina conserva su semana y su orden, y reincorporarla la devuelve a su lugar.
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
