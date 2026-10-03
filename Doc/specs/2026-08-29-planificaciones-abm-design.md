# Spec — Planificaciones sistémicas: ABM y lecturas (CU-E-08 → CU-E-11)

> **Fecha:** 2026-08-29 · **Bloque:** Planificaciones (vence 4/9) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** la baja lógica en `Planification` (`Doc/plans/2026-08-22-baja-logica-rutinas-planificaciones-plan.md`, ya aplicada) y de las convenciones de rutinas (`2026-08-22-rutinas-lectura-design.md`, `2026-08-22-crear-rutina-design.md`, `2026-08-27-editar-rutina-y-baja-logica-design.md`)

## 1. Contexto y objetivo

Cerrado el núcleo de rutinas, arranca el bloque de planificaciones por su parte más barata: el ABM de la **cabecera** de la planificación sistémica. Es el espejo de lo que ya se hizo con `Circuit` y `Routine`, un nivel más arriba del árbol:

```
Planification → Routine_Asignation → Routine → Routine_Circuit → Circuit → …
```

Las cuatro specs de este bloque (E-08 a E-11) hablan **sólo de la cabecera**: enganchar rutinas al plan es CU-E-12 y asignárselo a un alumno es CU-E-13, los dos fuera de alcance acá y explícitos como tales en sus propias specs.

Esto lo vuelve el bloque de **menor impacto** de todo lo que queda pendiente: no cambia el esquema, no toca `Db Creator`, no depende de ningún CU sin implementar, y cierra 4 andamiajes de un saque.

## 2. Alcance

**Incluye:**

- `GET /planification/all` — listado con filtros (CU-E-08).
- `GET /planification/all-plus` — el mismo listado, con las rutinas de cada plan.
- `GET /planification/:id` — detalle.
- `POST /planification/create` (CU-E-09).
- `POST /planification/edit/:id` (CU-E-10).
- `POST /planification/set-active/:id` — baja lógica y reactivación (CU-E-11).

**Fuera de alcance:**

- CU-E-12 (asignar rutina a planificación), CU-E-13 (asignar planificación a alumno) y CU-E-14 (quitársela): siguen en el mismo bloque pero después de esto. Su andamiaje en el controller **no se toca**.
- CU-U-08 (`GET /planification/user/:id/active`): depende de E-13. Andamiaje intacto.
- **Cambios de esquema: ninguno.** `Db Creator` intacto y la base no se migra. El único cambio en `planification.entity.ts` es de tipos de TypeScript y no mueve el DDL (§4.4).

## 3. Endpoints

Todos en `planification.controller.ts` / `planification.service.ts`, con `@Auth(UserRole.coach, UserRole.admin)`.

| Método | Ruta | CU | Qué devuelve | Andamiaje |
|---|---|---|---|---|
| `GET` | `/planification/all` | E-08 | Cabeceras + `routine_count` | reemplaza |
| `GET` | `/planification/all-plus` | — | Lo anterior + las rutinas de cada plan | nuevo |
| `GET` | `/planification/:id` | — | Cabecera + rutinas del plan | reemplaza |
| `POST` | `/planification/create` | E-09 | `201` con el detalle | reemplaza |
| `POST` | `/planification/edit/:id` | E-10 | `200` con el detalle | reemplaza |
| `POST` | `/planification/set-active/:id` | E-11 | `200` con la planificación | **reemplaza `DELETE /:id`** |

**Orden de declaración:** `/planification/all` y `/planification/all-plus` son de **un solo segmento**, así que van declarados **antes** de `/planification/:id`; si no, la request cae en el `:id` y devuelve `400` por UUID inválido. Mismo caso que `circuit/all-plus` y `routine/all-plus`. El `/all` del andamiaje ya está bien ubicado.

El resto del andamiaje del controller (`/routine/assign`, `DELETE /routine/:id`, `/user/assign`, `/user/:id`, `/user/:id/active`, `/user/edit/:id`, `DELETE /user/:id`) queda como está: es E-12, E-13, E-14 y U-08.

### 3.1 Listado — `GET /planification/all`

`GetPlanificationsQueryDto`, espejo de `GetCircuitsQueryDto` — a diferencia de `Routine`, `Planification` **sí** tiene `type`, así que el filtro va:

| Param | Tipo | Comportamiento |
|---|---|---|
| `keyword` | string ≤100 | Coincidencia parcial case-insensitive sobre `name` **o** `description` |
| `type` | string ≤30 | Coincidencia exacta case-insensitive |
| `include_inactive` | boolean | `false` por defecto → sólo `active = true`, que es lo que pide CU-E-08. Mismo `@Transform` que el resto |

**Respuesta `200`:** array ordenado por `name` ASC **`NULLS LAST`**. La columna es nullable (§4.2) y sin el `NULLS LAST` los planes sin nombre encabezarían la lista.

Cada fila (`PlanificationListItemResponseDto`): `id`, `name`, `description`, `number_of_routines`, `type`, `duration`, `active`, `routine_count`, `created_at`, `updated_at`.

`routine_count` se resuelve con `loadRelationCountAndMap` sobre `routineAsignations`, igual que `circuit_count` en rutinas.

### 3.2 Listado con rutinas — `GET /planification/all-plus`

Mismos filtros (reutiliza `GetPlanificationsQueryDto` tal cual). Suma:

```
routines: [ { id, order, routine: { id, name, coach_note, active } } ]   // ordenadas por order ASC
```

`id` es el del **`Routine_Asignation`**, no el de la `Routine` — es el que va a necesitar E-12 para desasignar.

**Se incluye el `active` de la rutina a propósito:** un plan puede referenciar una rutina dada de baja, y el entrenador necesita verlo. De cada rutina van sólo `id`, `name`, `coach_note` y `active`; sin circuitos ni ejercicios.

`routine_count` sale del `.length` del array ya cargado, sin la query extra del listado normal.

### 3.3 Detalle — `GET /planification/:id`

**Responde también para planificaciones inactivas** (espejo del detalle de rutina y de circuito). `404` si el id no existe.

```
{ id, name, description, number_of_routines, type, duration, active, routine_count, created_at, updated_at,
  routines: [ { id, order, routine: { id, name, coach_note, active } } ] }
```

**Un ítem de `/all-plus` y el detalle son exactamente la misma forma**, porque el árbol de una planificación termina en las rutinas — a diferencia de rutinas, donde `/:id` baja hasta las series y el `plus` se queda en los circuitos. Por eso **no hay un `planification_list_item_plus_response.dto.ts`**: `/all-plus` mapea cada fila con el mismo `buildPlanificationDetailResponse` y reutiliza `PlanificationDetailResponseDto`, así las dos salidas quedan idénticas por construcción. Si en algún momento el detalle tiene que bajar a los circuitos de cada rutina, ahí se separan.

**Hoy `routines` viene siempre `[]`**: no existe ningún endpoint que cargue `Routine_Asignation` hasta E-12. Es la misma situación en la que se construyó `/routine/:id` antes de que existiera E-16.

### 3.4 Alta — `POST /planification/create` (CU-E-09)

`CreatePlanificationDto`:

| Campo | Regla |
|---|---|
| `name` | **obligatorio**, string ≤50 (§4.2) |
| `number_of_routines` | **obligatorio**, int ≥1 (§4.1) |
| `description` | opcional, string ≤1000 (§4.3) |
| `type` | opcional, string ≤30 |
| `duration` | opcional, string ≤50 |

`active` no viaja en el body: se crea siempre en `true` y se cambia sólo por `set-active`.

**Sin transacción:** a diferencia de E-16, acá se inserta **una sola fila**. No hay vínculos que ensamblar — eso es E-12.

**Respuesta `201` con el detalle completo**, el mismo formato que `GET /:id` (con `routines: []` y `routine_count: 0`), siguiendo la convención de E-16: después de crear, el front navega a la pantalla del plan.

**Errores:** `400` (validaciones de campo), `401`/`403` (guards), `500` (inesperado). No hay `404` posible en el alta.

### 3.5 Edición — `POST /planification/edit/:id` (CU-E-10)

`EditPlanificationDto` tiene los mismos campos y las mismas reglas que el alta. **El body es el estado completo de la cabecera**, así que un campo opcional omitido **borra** el valor que hubiera — mismo contrato que `EditRoutineDto` con `coach_note`, y el motivo del cambio de tipos de §4.4.

| Caso | Respuesta |
|---|---|
| Planificación inexistente | `404` |
| Planificación inactiva | `400` — precondición del CU; alcanza con reactivarla por `set-active`. Espejo del `400` de `editRoutine` y `editCircuit` |
| Validaciones de campo | `400` |

**Respuesta `200`** con el detalle, mismo formato que el alta.

**La edición es retroactiva:** no hay snapshot de la cabecera sistémica, así que cambiarle el nombre o la duración al plan se lo cambia también a lo que ya esté asignado. Es la postcondición del CU, no un efecto no querido. `User_Planification` **sí** tiene sus propias copias de `description`, `number_of_routines`, `type` y `duration`, pero llenarlas es problema de E-13.

### 3.6 Baja lógica — `POST /planification/set-active/:id` (CU-E-11)

Espejo exacto de `POST /routine/set-active/:id`, hasta en el hecho de que el mismo endpoint da de baja y reactiva. Se elige `POST` con body sobre `DELETE` porque no es un borrado y porque reactivar necesita el mismo camino.

`SetPlanificationActiveDto { active: boolean }` (obligatorio). `404` si no existe. Idempotente: mandar `false` sobre una ya inactiva es un `200` sin efecto.

**Respuesta `200` con la planificación** (la entidad, no el detalle) — igual que `setRoutineActive`.

**No cascadea nada.** Ni las `Routine_Asignation` ni las `User_Planification` se tocan: el plan sale de circulación como plantilla para **nuevas** asignaciones y lo ya asignado mantiene su integridad y sigue visible para el alumno. Está explícito en el "Fuera de alcance" del CU y es la misma regla que E-18 y E-24.

## 4. Decisiones de diseño

### 4.1 `number_of_routines` es declarativo, y el count real va aparte

`Planification.number_of_routines` es `NOT NULL`, pero las rutinas se enganchan después vía `Routine_Asignation` (E-12). Se resolvió que el campo es **la intención del plan** —cuántas rutinas va a tener, que es lo que el entrenador sabe al crearlo— y que los listados y el detalle devuelven además un **`routine_count` derivado** del count real de `Routine_Asignation`.

Los dos números conviven a propósito: uno es la meta y el otro el estado. La alternativa —hacerlo derivado puro, sacarlo del DTO e inicializarlo en 0— obligaba a que E-12 y E-14 lo recalcularan en cada asignación, con el riesgo de desincronizarse si una operación falla a mitad, y contradecía el modelo de `Doc/`, donde el campo es obligatorio.

**Consecuencia:** un plan puede quedar con `number_of_routines = 4` y `routine_count = 2`. Si eso llega a molestar, la salida es una validación en E-12 (no dejar asignar más rutinas que las declaradas), **no** unificar los dos campos.

### 4.2 `name` es obligatorio en el DTO, no en la columna

En el modelo de `Doc/`, `Planification.name` es `VARCHAR(50)` **nullable**. Un ABM que acepte planificaciones sin nombre es inusable, así que la exigencia vive en la validación (`@IsNotEmpty`) y **la columna no se toca**: `Doc/` es la fuente de verdad del modelo y esto no amerita moverlo.

**Consecuencias:** el DTO de respuesta declara `name` como opcional (puede haber filas cargadas a mano con `null`), y el orden del listado usa `NULLS LAST`.

### 4.3 Tope de 1000 para `description`

La columna es `TEXT`, sin límite. El `@MaxLength(1000)` del DTO es sanidad de input, no una restricción del modelo: evita que entre un payload absurdo sin cerrarle la puerta a una descripción larga de verdad. Es el único campo del bloque donde el DTO inventa un límite que la base no tiene.

### 4.4 `description`, `type` y `duration` pasan a `string | null`

Para que "omitir el campo lo borra" (§3.5) funcione, el service tiene que poder persistir `null` — y TypeORM **ignora las propiedades `undefined`**. Hoy los tres están declarados como `string`, así que hay que abrirlos a la unión, con el `type` explícito en el decorador que TypeORM necesita cuando el tipo es una unión (TS emite `design:type = Object` y sin el tipo declarado no sabe qué columna crear). Es el problema ya documentado en `routine.entity.ts:24-28`:

```typescript
    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'varchar', length: 30, nullable: true })
    type?: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    duration?: string | null;
```

**El DDL no cambia:** `TEXT`, `VARCHAR(30)` y `VARCHAR(50)` nullable es exactamente lo que ya genera `ddl.py`. Es un cambio de tipos de TypeScript, no de esquema — pero como toca una entidad, el plan incluye regenerar y confirmar con `git status` que `Db Creator` quedó limpio.

`name` no entra en esto: es obligatorio en los dos DTOs, así que nunca se persiste `null`.

## 5. Reutilización y helpers

- **`buildPlanificationsQuery`** — nuevo, espejo de `buildCircuitsQuery` y `buildRoutinesQuery`: arma el `QueryBuilder` con los filtros compartidos por `/all` y `/all-plus`.
- **`findPlanificationDetail`** — nuevo: carga la planificación con sus `Routine_Asignation` → `Routine` y el orden anidado. Lo usan `/:id`, `create` y `edit`.
- **`buildPlanificationDetailResponse`** — nuevo: arma la respuesta de detalle a partir de la entidad cargada. Lo usan `/:id`, `create`, `edit` **y cada fila de `/all-plus`** (§3.3).

Los dos últimos siguen el mismo refactor que E-22 hizo con `getCircuitById` y E-16 con `getRoutineById`, pero acá nacen ya extraídos: el detalle y el alta se escriben juntos.

## 6. Archivos

**Crear** en `power-app/src/dtos/planification/`:

- `get_planifications_query.dto.ts`
- `create_planification.dto.ts`
- `edit_planification.dto.ts`
- `set_planification_active.dto.ts`
- `planification_list_item_response.dto.ts`
- `planification_detail_response.dto.ts`

**Modificar:**

- `planification.controller.ts` — 6 endpoints, 5 reemplazando andamiaje y uno (`all-plus`) nuevo; se borra el `DELETE /:id`.
- `planification.service.ts` — hoy son 4 líneas vacías: 6 métodos + 3 helpers.
- `planification.entity.ts` — los tres tipos de §4.4.

**Sin cambios:** `PlanificationModule` (ya tiene `Planification`, `RoutineAsignation`, `UserPlanification`, `RoutineAsignationUser` y `UserRoutine` en su `forFeature`, y `AuthModule` importado) y **todo `Db Creator/`**.

## 7. Verificación

- **Compilación:** `npm --prefix power-app run build`.
- **Rutas registradas** en el bundle, con `all` y `all-plus` declaradas antes de `:id`.
- **`Db Creator` limpio:** regenerar con `python build_sql.py` y confirmar que `git status "Db Creator"` no devuelve nada.
- **Runtime:** la base está al día —el chequeo del 22/8 confirma `Planification.active` en verde— y la tabla está **vacía**, así que a diferencia del bloque de rutinas este se prueba de punta a punta sin insertar nada a mano: `POST /create` carga la primera planificación y de ahí salen el listado, el detalle, la edición y la baja. Lo único que no se puede probar con datos es `routines` / `routine_count`, que quedan en `[]` y `0` hasta E-12.

## 8. Impacto en `Status/`

- **CU-E-08, CU-E-09, CU-E-10 y CU-E-11** 🔵 → ✅.
- Totales: ✅ 55 → **59**, 🔵 9 → **5**. Global **82%** (59 de 72).
- Rol Entrenador: 18 → **22** de 29 (62% → **76%**). Quedan 🔵 E-12, E-13 y E-14.
- `/planification/all-plus` y `/planification/:id` no son CU propios, como pasó con los equivalentes de circuitos y rutinas.

## 9. Riesgos y notas

- **`number_of_routines` vs `routine_count` pueden divergir.** Es deliberado (§4.1), pero es el punto del bloque que más fácil se malinterpreta desde el front. Los nombres de los campos y la descripción de Swagger tienen que dejarlo claro.
- **Un plan puede quedar apuntando a rutinas dadas de baja.** El detalle y `/all-plus` las muestran con su `active` para que el entrenador las vea; la baja de una rutina (E-18) no las saca de las planificaciones que la referencian.
- **`Routine.routine_plan_id` sigue sin uso.** `Routine` tiene una FK directa a `Planification` **además** de la tabla de vínculo `Routine_Asignation`, y son dos formas de decir lo mismo. Este bloque no la toca ni la necesita, y E-12 tiene mandato explícito de la spec de usar `Routine_Asignation`. **Queda anotado como deuda del modelo a resolver en E-12**, no acá.
- **El `201` y el `200` de este bloque son livianos** — cabecera más una lista de rutinas sin sus circuitos. Es lo contrario del alta de rutina, que devuelve el árbol entero.
