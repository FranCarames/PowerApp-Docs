# CU-E-12 — Gestionar Rutinas de una Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Agrupa las operaciones con las que el entrenador define el contenido de una planificación sistémica: qué rutinas la componen, en qué semana y en qué orden, cuáles se quitan y cómo se repiten de una semana a otra. El vínculo entre una rutina y un plan es un Routine_Asignation, y todas las operaciones de este CU actúan sobre esa tabla.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- [`CU-E-12a`](CU-E-12a-asignar-rutina-a-planificacion.md) Asignar una rutina a una planificación
- [`CU-E-12b`](CU-E-12b-asignar-rutinas-en-lote-a-planificacion.md) Asignar rutinas en lote a una planificación
- [`CU-E-12c`](CU-E-12c-quitar-rutina-de-planificacion.md) Quitar o reincorporar una rutina de una planificación
- [`CU-E-12d`](CU-E-12d-quitar-rutinas-en-lote-de-planificacion.md) Quitar o reincorporar rutinas en lote
- [`CU-E-12e`](CU-E-12e-reordenar-rutinas-de-una-semana.md) Reordenar las rutinas de una semana
- [`CU-E-12f`](CU-E-12f-repetir-una-semana-en-otras-semanas.md) Repetir una semana en otras semanas
- Obtener Rutinas Sistémicas

## Alcance

**Cubre:**

- La gestión del contenido de una planificación sistémica a través de sus seis operaciones incluidas.
- Mostrar el plan por semanas: todas las de su duración, con sus rutinas y sus huecos.

**Fuera de alcance:**

- Creación y edición de la planificación en sí (CU-E-09 y CU-E-10). Al crearla, el entrenador puede dejar armadas las semanas: se guardan junto con la planificación (CU-E-09).
- Creación de las rutinas (CU aparte).
- Asignación de la planificación a un alumno (CU-E-13).

## Reglas comunes a las seis operaciones

Estas reglas valen para los seis CU incluidos y no se repiten en cada uno:

1. **El plan se arma por semanas.** Cada rutina va en una `week` (entera, ≥ 1). La semana no puede superar la duración de la planificación (con duración 0 el backend no pone tope, pero ese caso está fuera de alcance desde el 31/10/2026: ver CU-E-09). Dentro de la semana, el `order` es una **etiqueta de orden**, no una posición exclusiva: puede tener huecos y puede tener duplicados —el alta de una rutina (CU-E-12a) persiste la posición recibida sin desplazar a nadie—. A igual posición, el plan muestra primero la rutina que se asignó antes. La lista que devuelve el sistema es plana, ordenada por semana y por orden; agrupar por semana es del cliente. **Reordenar una semana (CU-E-12e) renumera sus rutinas vigentes de 1 a n** y deja de haber huecos y duplicados en ella.
2. **Una rutina puede repetirse dentro de la misma planificación.** Un mismo día de entrenamiento puede aparecer más de una vez en la semana, y la posición las distingue. También puede repetirse en semanas distintas. Repetir una semana en otras (CU-E-12f) crea vínculos nuevos: no copia el historial de nadie.
3. **La baja del vínculo es siempre lógica y conserva su lugar.** Nunca se borra físicamente, porque del Routine_Asignation cuelga el historial de entrenamiento de los alumnos (Routine_Exercise_Finished). La baja sólo apaga el vínculo: la rutina conserva su semana y su orden, y reincorporarla la devuelve a su lugar. Reordenar y repetir sólo miran las rutinas **vigentes**; las quitadas no se mueven ni se copian.
4. **La planificación tiene que estar activa** para poder modificar su contenido.
5. Las operaciones sobre varias rutinas a la vez (lote, reordenar una semana, repetir una semana) son **todo o nada**: si algo falla, no se aplica nada.
6. **«Rutinas por semana» define los huecos, no es un tope.** Es el dato `number_of_routines` de la planificación (CU-E-09, regla 1). Cualquier operación puede dejar una semana con más rutinas que las indicadas.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La planificación existe y está activa.

## Postcondiciones

- El conjunto de rutinas vigentes de la planificación queda actualizado, y su detalle lo refleja.

## Camino principal (flujo básico)

1. El entrenador abre una planificación.
2. El sistema muestra el plan por semanas: **todas las semanas de la duración, vacías incluidas**. Cada una lista sus rutinas en orden y muestra los huecos que le faltan para llegar a las «rutinas por semana» («X de K»); si ya las llenó o las superó, ofrece «Agregar otra rutina» en lugar de huecos. (Armar las semanas y los huecos es del cliente: el sistema devuelve la lista plana de rutinas vigentes. Con duración 0, fuera de alcance, no hay semanas que armar de antemano.)
3. El entrenador ejecuta una de las seis operaciones incluidas.
4. El sistema aplica el cambio y devuelve la planificación actualizada.
