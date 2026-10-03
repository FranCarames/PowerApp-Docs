# Spec — Asignar rutinas a planificaciones (CU-E-12 ampliado)

> **Fecha:** 2026-09-04 · **Bloque:** Planificaciones · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** el ABM de planificaciones (`2026-08-29-planificaciones-abm-design.md`) y la baja lógica de las asignaciones (`Doc/plans/2026-08-31-baja-logica-asignaciones-plan.md`)

## 1. Contexto y objetivo

`Routine_Asignation` es el vínculo entre una rutina sistémica y una planificación sistémica. El ABM de planificaciones ya lee ese vínculo —`routine_count`, `routines` en el detalle y en `/all-plus`— pero **no hay forma de crearlo**: hoy las tres lecturas devuelven siempre `[]`.

CU-E-12 cubría una sola operación ("asignar una rutina a una planificación"). Se **amplía a cuatro**, porque la pantalla del entrenador necesita armar el plan de a una o de a varias, y deshacer igual:

1. Asignar una rutina, con `order` opcional.
2. Asignar un listado de rutinas.
3. Activar o desactivar una asignación.
4. Activar o desactivar un listado de asignaciones.

**CU-E-12 pasa a ser un CU agrupador con cuatro operaciones anidadas** —`CU-E-12a` a `CU-E-12d`, una por endpoint—, decidido con el usuario el 4/9. El agrupador concentra las reglas comunes a las cuatro (el `order` como etiqueta, la repetición permitida, la baja siempre lógica, el todo-o-nada de los lotes) y cada anidado documenta sólo lo suyo. **El agrupador no se cuenta a sí mismo**, así que el total del proyecto pasa de 72 a **75 CU** sin que haya funcionalidad nueva.

De paso tapa el hueco detectado el 31/8: el `DELETE /planification/routine/:id` del andamiaje no correspondía a ningún CU, y ahora es `CU-E-12c`.

## 2. Cambios de modelo (prerrequisitos)

El diagrama de `Doc/` se actualizó con la nueva definición de `Routine_Asignation`. **Tres** diferencias contra lo que hay implementado:

| Tabla | Implementado hoy | Modelo | Qué implica |
|---|---|---|---|
| `Routine_Asignation` | `routine_plan_id` | **`planification_id`** | Rename de columna: entidad, `ddl.py` y `ALTER ... RENAME COLUMN` |
| `Routine_Asignation` | `order` `INTEGER NOT NULL` | **`INTEGER` nullable** | El vínculo dado de baja pierde su posición (§5.1) |
| `Routine` | `routine_plan_id` (FK a `Planification`) | **no existe** | Se elimina: `DROP COLUMN` (§2.1) |

Las dos últimas son **desincronizaciones preexistentes**, no cambios nuevos: el `order` nullable y la ausencia de `Routine.routine_plan_id` ya estaban en el `Doc/` committeado. Pasaron desapercibidas porque `Routine_Asignation` siempre estuvo vacía y porque nadie usa esa FK.

El rename **no toca el código del service**, que trabaja por la relación (`planification.routineAsignations`) y nunca por la columna cruda. Sólo cambian `routine_asignation.entity.ts` (el campo y su `@JoinColumn`) y dos líneas de `ddl.py`.

**`Routine_Asignation` está vacía**, así que el `RENAME` y el `DROP NOT NULL` entran sin backfill ni riesgo.

### 2.1 Por qué se elimina `Routine.routine_plan_id`

`Routine` tiene hoy una FK directa a `Planification` que **nunca estuvo en el diagrama** — ni en la versión anterior del modelo. Existe sólo en `routine.entity.ts` y en `ddl.py`, y `CLAUDE.md` es explícito: ante conflicto entre el código y `Doc/`, manda `Doc/`.

Es la resolución de la deuda anotada el 29/8 ("`Routine.routine_plan_id` y `Routine_Asignation` son dos formas de decir lo mismo"): **una de las dos nunca existió**. La relación rutina↔planificación va por `Routine_Asignation`, que es además la única que soporta el `order` y la repetición.

Se elimina ahora, con este bloque, por tres razones:

- **Nada la lee ni la escribe.** Las únicas referencias son su propia declaración (`routine.entity.ts:16`) y su `@JoinColumn` (línea 44). `createRoutine` y `editRoutine` nunca la setean.
- **Todas las filas la tienen en `NULL`**, así que no hay dato que perder.
- **Es el bloque que define cómo se asigna una rutina a una planificación**: dejarla viva acá es dejar una columna que invita a usarse mal. Y después del rename quedarían dos FKs a `Planification` con nombres que ni se parecen, una de ellas muerta.

## 3. Alcance

**Incluye:** los tres cambios de modelo de §2 —incluida la eliminación de `Routine.routine_plan_id`—, los cuatro endpoints, sus DTOs, la reescritura de la spec de CU-E-12 y los artefactos de Status.

**Fuera de alcance:**

- CU-E-13 y CU-E-14 (asignar y quitar planificaciones a **alumnos**): son `User_Planification` y `User_Routine`, otro nivel.
- CU-E-19 y CU-E-20: post-MVP.

## 4. Endpoints

Todos en `planification.controller.ts` / `planification.service.ts`, con `@Auth(UserRole.coach, UserRole.admin)`. Es el paquete "Administrar Planificaciones".

| Método | Ruta | Operación | Andamiaje |
|---|---|---|---|
| `POST` | `/planification/routine/assign` | Alta individual | reemplaza |
| `POST` | `/planification/routine/assign-bulk` | Alta en lote | nuevo |
| `POST` | `/planification/routine/set-active/:id` | Baja / reactivación individual | **reemplaza `DELETE /planification/routine/:id`** |
| `POST` | `/planification/routine/set-active-bulk` | Baja / reactivación en lote | nuevo |

Las cuatro cuelgan de `/planification/routine/...`, así que no compiten con `/planification/:id` ni con `/planification/user/...`.

### 4.1 Alta individual — `POST /planification/routine/assign`

`AssignRoutineToPlanificationDto`:

| Campo | Regla |
|---|---|
| `routine_id` | UUID, obligatorio |
| `planification_id` | UUID, obligatorio |
| `order` | int ≥ 1, **opcional** |

**Sin `order`:** se calcula como `max(order) + 1` sobre las asignaciones **activas** de esa planificación, o `1` si no hay ninguna. Se agrega al final.

**Con `order`:** se persiste **tal cual**, aunque la posición ya esté ocupada. No se desplaza ni se renumera nada (§5.1).

**Respuesta `201`** con el detalle de la planificación (`PlanificationDetailResponseDto`), igual que `editRoutine` devuelve la rutina entera después de reconciliar: el front acaba de modificar el plan y necesita verlo completo.

### 4.2 Alta en lote — `POST /planification/routine/assign-bulk`

`AssignRoutinesToPlanificationDto`:

| Campo | Regla |
|---|---|
| `planification_id` | UUID, obligatorio |
| `routine_ids` | array de UUID, al menos 1, máximo 50 |

No recibe `order`: las asignaciones se crean **consecutivas desde `max(order) + 1`**, en el orden del array.

Se permiten **ids repetidos dentro del array**: si el entrenador manda la misma rutina dos veces, se crean dos asignaciones (§5.2).

**Transaccional:** si alguna rutina no existe o está de baja, no se crea ninguna.

**Respuesta `201`** con el detalle de la planificación.

### 4.3 Baja y reactivación — `POST /planification/routine/set-active/:id`

`SetRoutineAsignationActiveDto`:

| Campo | Regla |
|---|---|
| `active` | boolean, obligatorio |
| `order` | int ≥ 1, **opcional — sólo válido con `active = true`** |

- **`active = false`** → `active = false` **y `order = null`**. Las demás asignaciones **no se tocan**: la secuencia queda con un hueco, a propósito (§5.1).
- **`active = true`** → si viene `order`, se usa ese; si no, `max(order) + 1`. Es la forma de devolver una asignación a su lugar en una sola llamada, ya que la baja le borró la posición.
- **`order` con `active = false`** → `400`. El campo no aplica en ese sentido y aceptarlo en silencio esconde bugs del front.

**Respuesta `200`** con el `Routine_Asignation` actualizado, igual que `setRoutineActive` y `setPlanificationActive` devuelven su entidad.

### 4.4 Baja y reactivación en lote — `POST /planification/routine/set-active-bulk`

`SetRoutineAsignationsActiveDto`:

| Campo | Regla |
|---|---|
| `routine_asignation_ids` | array de UUID, al menos 1, máximo 50, **sin repetidos** |
| `active` | boolean, obligatorio |

Sin `order`: al reactivar en lote, cada una toma `max(order) + 1` incremental, en el orden del array. El que necesite una posición puntual usa el endpoint individual.

**Transaccional:** si algún id no existe, no se modifica ninguna.

**Los ids pueden pertenecer a planificaciones distintas.** No se valida que sean del mismo plan: el DTO no recibe `planification_id` y agregar la restricción sería inventar un requisito.

**Respuesta `200`** con el array de `Routine_Asignation` actualizados.

## 5. Decisiones de diseño

### 5.1 `order` es una etiqueta de orden, no una secuencia

**Decidido con el usuario el 4/9.** A diferencia de `Routine_Circuit` y `Routine_Exercise` —donde E-16 y E-23 normalizan a `1..N` sin huecos ni duplicados— acá `order` puede tener las dos cosas:

- **Huecos**, porque la baja pone `order = null` y **no renumera** el resto.
- **Duplicados**, porque el alta con `order` explícito persiste el valor recibido y **no desplaza** el resto.

El motivo es no tocar N registros en cada alta y en cada baja. El precio es que `order` deja de ser una posición canónica y pasa a ser una sugerencia de ordenamiento.

**Consecuencia obligatoria: el desempate.** Con `order` duplicado, `ORDER BY "order"` no es determinístico y dos llamadas pueden devolver el mismo plan en distinto orden. Las tres lecturas del ABM pasan a ordenar por **`"order" ASC, created_at ASC`**: a igual posición, primero la que se asignó antes. Sin esto la pantalla del entrenador se reordena sola entre refrescos.

Los `null` no llegan al ORDER BY porque las tres lecturas ya filtran `active = true`. Si alguna vez existe una vista que muestre las inactivas, va a necesitar `NULLS LAST`.

### 5.2 Una rutina puede repetirse en la misma planificación

Mismo criterio que `Routine_Circuit`: un "Día A" puede aparecer dos veces en el plan de la semana. **Sin `UNIQUE` en la base.**

Esto **reemplaza el camino alternativo** que tenía el CU original ("vínculo duplicado → el sistema informa el conflicto y no duplica"), que queda sin efecto: no hay conflicto que informar, ni por rutina repetida ni por `order` ocupado.

### 5.3 La reactivación recibe el `order` por body

Como la baja borra la posición, reactivar necesita decidir una. Se eligió que el body pueda mandarla —con `max + 1` como default— en vez de forzar siempre al final, para que devolver una rutina a su lugar sea una sola llamada.

### 5.4 Qué devuelve cada endpoint

| Operación | Devuelve | Por qué |
|---|---|---|
| Las dos altas | El detalle de la planificación | El `planification_id` está en el body, así que siempre se sabe cuál es, y el front necesita el plan entero para repintar |
| Los dos set-active | La o las asignaciones actualizadas | El lote puede cruzar planificaciones, así que no hay "un" plan que devolver. Además es el precedente de todos los `set-active` del proyecto, que devuelven su entidad |

## 6. Validaciones

| Caso | Respuesta |
|---|---|
| `planification_id` inexistente | `404` |
| Planificación dada de baja | `400` — hay que reactivarla primero. Espejo de `editPlanification` |
| `routine_id` inexistente (individual o en el lote) | `404` |
| Rutina dada de baja | `400` **con el nombre de la rutina** en el mensaje. Espejo de E-16 con los circuitos inactivos |
| `order` < 1 | `400` |
| `order` con `active = false` | `400` |
| `routine_ids` vacío o con más de 50 | `400` |
| `routine_asignation_ids` con repetidos | `400` — pedir dos veces lo mismo en el mismo lote es un bug del cliente |
| `routine_asignation_id` inexistente | `404` |
| Rol `user` | `403` · sin token `401` |

## 7. Archivos

**Crear** en `power-app/src/dtos/planification/`:

- `assign_routine_to_planification.dto.ts`
- `assign_routines_to_planification.dto.ts`
- `set_routine_asignation_active.dto.ts`
- `set_routine_asignations_active.dto.ts`

**Modificar:**

- `power-app/src/entities/routine_asignation.entity.ts` — rename de `routine_plan_id` a `planification_id` (campo y `@JoinColumn`) y `order` nullable.
- `power-app/src/entities/routine.entity.ts` — se elimina `routine_plan_id`, su `@ManyToOne`/`@JoinColumn` a `Planification` y el import (§2.1).
- `power-app/src/entities/planification.entity.ts` — se elimina el `@OneToMany` `routines`, que era el otro extremo de esa relación.
- `Db Creator/ddl.py` — las dos líneas de `Routine_Asignation`, la columna y el `ALTER` de la FK de `Routine`, más la regeneración de `01_estructura.sql`.
- `planification.controller.ts` — 4 endpoints, 2 reemplazando andamiaje.
- `planification.service.ts` — 4 métodos + el desempate de §5.1 en las tres lecturas.

- `power-app/src/planification/planification.module.ts` — sumar `Routine` al `forFeature`: el service necesita su repositorio para validar que las rutinas existan y estén activas. `RoutineAsignation` ya estaba.

## 8. Verificación

- **Compilación:** `npm --prefix power-app run build`.
- **Migración**, las tres en una transacción:

```sql
ALTER TABLE public."Routine_Asignation" RENAME COLUMN routine_plan_id TO planification_id;
ALTER TABLE public."Routine_Asignation" ALTER COLUMN "order" DROP NOT NULL;
ALTER TABLE public."Routine"            DROP COLUMN routine_plan_id;
```

  Las dos primeras son sobre una tabla vacía. La tercera borra una columna que está en `NULL` en todas las filas; el `DROP COLUMN` se lleva su FK sola.

- **Antes del `DROP`, confirmar que no hay dato:** `SELECT count(*) FROM public."Routine" WHERE routine_plan_id IS NOT NULL;` tiene que dar `0`.
- **Runtime:** es el **primer bloque que puede probar el `routines` del ABM con datos**. La prueba que importa: asignar dos rutinas, ver que aparecen en `GET /planification/:id` y en `/all-plus` con `routine_count: 2`, desactivar una y ver que baja a 1 sin desaparecer de la base.
- **El desempate:** asignar dos rutinas con el mismo `order` explícito y pedir el detalle varias veces — tienen que volver siempre en el mismo orden.

## 9. Impacto en `Status/`

- **CU-E-12** deja de contarse (pasa a agrupador) y entran **`CU-E-12a` a `CU-E-12d`**, los cuatro ✅. Total del proyecto: 72 → **75**.
- Totales: ✅ 59 → **63**, 🔵 5 → **4**. Global 82% → **84%**.
- Rol Entrenador: 22 de 29 → **26 de 32** (76% → **81%**).
- Cada endpoint tiene su CU: `assign` → E-12a, `assign-bulk` → E-12b, `set-active/:id` → E-12c, `set-active-bulk` → E-12d.

## 10. Riesgos y notas

- **La deuda del 29/8 se cierra acá** (§2.1): `Routine.routine_plan_id` se elimina y la relación rutina↔planificación queda con **un solo camino**, `Routine_Asignation`. Es un `DROP COLUMN`, o sea irreversible en la base viva, pero la columna está en `NULL` en todas las filas y no la lee nadie; el paso de verificación lo confirma antes de ejecutarlo. Si alguna vez hiciera falta una FK directa de `Routine` a `Planification`, habría que sumarla al diagrama primero.
- **`order` con duplicados es una decisión consciente**, no un descuido. Si en la práctica el entrenador termina con planes llenos de posiciones repetidas y el desempate por `created_at` no alcanza, la salida es un endpoint de reordenamiento masivo que renumere el plan entero de una — no cambiar la semántica del alta.
- **El lote está topeado en 50** por consistencia con los `ArrayMaxSize(50)` de rutinas y circuitos.
