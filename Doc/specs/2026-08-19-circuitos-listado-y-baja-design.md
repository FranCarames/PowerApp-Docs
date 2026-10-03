# Spec — Circuitos: listado, detalle y baja lógica (CU-E-21, CU-E-24)

> **Fecha:** 2026-08-19 · **Bloque:** Circuitos (vence 21/8) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** `Doc/specs/2026-08-19-ajuste-modelo-circuitos-design.md` (modelo ya implementado)

## 1. Contexto y objetivo

Con el modelo alineado (`Circuit` como pieza global reutilizable + `Routine_Circuit`), se implementan los dos CU del bloque de circuitos que no requieren refinamiento adicional: **CU-E-21 (obtener circuitos)** y **CU-E-24 (eliminar circuito, lógico)**.

**CU-E-22 (crear) y CU-E-23 (editar) quedan explícitamente para el final**, por decisión del usuario: el contrato de alta/edición —que recibe la lista completa de ejercicios con sus series y reconcilia— necesita refinarse antes de codificarse.

## 2. Alcance

**Incluye:**

- `GET /routine/circuit/all` — listado con filtros opcionales (CU-E-21).
- `GET /routine/circuit/all-plus` — el mismo listado, con los ejercicios de cada circuito (sólo `id` y `name`). Agregado el 2026-08-22; ver 4.4.
- `GET /routine/circuit/:id` — detalle con ejercicios y series anidados. No es un CU propio: es el «include» que CU-E-23 necesita para "abrir un circuito con sus ejercicios actuales", y le sirve al front para previsualizar antes de ensamblar.
- `POST /routine/circuit/set-active/:id` — baja lógica y reactivación (CU-E-24).

**Fuera de alcance:**

- CU-E-22 y CU-E-23 (crear / editar circuito) — pendientes de refinamiento.
- Ensamblado de rutinas (CU-E-15 → CU-E-18).
- Cambios de entidades: **no se toca ninguna**, por lo tanto `Db Creator` queda intacto y no hay que regenerar la base.

## 3. Ubicación

Todo vive en el **módulo de rutinas ya existente**, sin archivos de controller/service nuevos (decisión del usuario: menos piezas que seguir, y circuitos y rutinas dependen entre sí):

- Endpoints en `power-app/src/routine/routine.controller.ts` (`@Controller('routine')`), bajo el sub-path `circuit/`.
- Lógica en `power-app/src/routine/routine.service.ts`, que hoy está vacío y gana sus primeros métodos reales.

No hay conflicto de rutas con el andamiaje existente: `@Get('/:id')` matchea un solo segmento, y las rutas de circuito tienen dos (`circuit/all`, `circuit/:id`).

## 4. Endpoints

Todos con `@Auth(UserRole.coach, UserRole.admin)`, mismo criterio que E-26→E-28.

| Método | Ruta | CU |
|---|---|---|
| `GET` | `/routine/circuit/all` | E-21 |
| `GET` | `/routine/circuit/all-plus` | E-21 (variante con ejercicios) |
| `GET` | `/routine/circuit/:id` | «include» de E-23 |
| `POST` | `/routine/circuit/set-active/:id` | E-24 |

### 4.1 Listado — `GET /routine/circuit/all`

`GetCircuitsQueryDto`, los tres filtros opcionales:

| Param | Tipo | Comportamiento |
|---|---|---|
| `keyword` | string ≤100 | Coincidencia parcial **case-insensitive** sobre `name` **o** `description` (`ILIKE %kw%`) |
| `type` | string ≤30 | Coincidencia **exacta pero case-insensitive** (`LOWER(type) = LOWER(:type)`). Al ser string libre, que `Cardio` y `cardio` traigan lo mismo evita sorpresas |
| `include_inactive` | boolean | `false` por defecto → solo `active = true` (lo que pide E-21). En `true` devuelve activos e inactivos juntos |

`include_inactive` llega como string en la query, así que usa el mismo `@Transform` que `GetUsersQueryDto.active` para convertir `'true'`/`'false'`.

**Respuesta `200`:** array plano ordenado por `name` ASC. Cada fila: `id`, `name`, `description`, `type`, `active`, `exercise_count`, `created_at`, `updated_at`.

`exercise_count` se resuelve con `loadRelationCountAndMap` sobre `routineExercises` (sin query extra): elegir un circuito de una lista sin saber cuántos ejercicios tiene es incómodo.

Sin resultados → `200` con `[]`. El estado vacío del CU lo resuelve el front.

### 4.2 Detalle — `GET /routine/circuit/:id`

**Responde también para circuitos inactivos**: si el listado permite verlos con `include_inactive`, tiene que poder abrirlos. `404` si el id no existe.

**Respuesta `200`:**

```
{ id, name, description, type, active, created_at, updated_at,
  exercises: [                              // ordenados por exercise_order ASC
    { id, exercise_order, coach_note,
      exercise: { id, name, description, safety_tips, activation_tips,
                  video_url, preview_image, bg_image },
      sets: [ { id, set_order, set_count, rep_count, weight,
                rpe, rir, rm_perc, amrap, amrap_time, rm } ] } ] }   // ordenados por set_order ASC
```

Se arma aplanando las relaciones antes de responder, igual que hace `exercise.service.ts` con `exercisedMuscles`. `exercises` sale de `Routine_Exercise` (el `id` de cada item es el del `Routine_Exercise`, no el del `Exercise`, porque es lo que E-23 va a necesitar para reconciliar).

### 4.3 Listado con ejercicios — `GET /routine/circuit/all-plus` *(agregado 2026-08-22)*

Mismo listado que 4.1 — **reutiliza `GetCircuitsQueryDto` tal cual**, con los mismos tres filtros — pero cada circuito trae además la lista de sus ejercicios.

Se resolvió como **endpoint aparte y no como un cuarto parámetro** del listado (decisión del usuario): un `include_exercises` habría hecho que un mismo endpoint devolviera dos formas distintas según el query string.

**Respuesta `200`:** array con los campos del listado normal más `exercises`:

```
{ id, name, description, type, active, exercise_count, created_at, updated_at,
  exercises: [ { id, exercise_order, exercise: { id, name } } ] }   // ordenados por exercise_order ASC
```

De cada ejercicio van **sólo `id` y `name`**: sin series, sin `coach_note` y sin el resto de la ficha del catálogo — para eso está el detalle (4.2). El `id` de cada item es el del `Routine_Exercise`. Circuito sin ejercicios → `exercises: []`.

`exercise_count` se mantiene y acá sale del `.length` del array ya cargado, **sin la query extra** que hace el listado normal con `loadRelationCountAndMap`.

**Orden de declaración en el controller:** va **antes** de `circuit/:id`. Al ser un solo segmento, `all-plus` también matchea ese patrón; declarado después, la request caería ahí y devolvería `400` por UUID inválido.

**Nota de escala:** es un join de tres tablas sin paginación. Con una biblioteca de circuitos grande, es el primer endpoint donde va a hacer falta paginar.

### 4.4 Baja lógica — `POST /routine/circuit/set-active/:id`

Body `SetCircuitActiveDto`: `{ active: boolean }` (requerido). Calcado de `/membership/set-active/:id` y `/users/set-active/:id`: un solo endpoint sirve para dar de baja y para reactivar, y encaja con `include_inactive`.

- `404` si el circuito no existe.
- `200` con el circuito actualizado.
- **No toca `Routine_Circuit`**: las rutinas que lo referencian quedan intactas — es la postcondición explícita de CU-E-24.
- La confirmación del paso 2 del CU ("el sistema pide confirmación") es responsabilidad del front.

## 5. Archivos

**Crear:**

- `power-app/src/dtos/circuit/get_circuits_query.dto.ts`
- `power-app/src/dtos/circuit/set_circuit_active.dto.ts`
- `power-app/src/dtos/circuit/circuit_list_item_response.dto.ts` — forma de cada fila del listado (Swagger).
- `power-app/src/dtos/circuit/circuit_detail_response.dto.ts` — forma anidada del detalle (Swagger).
- `power-app/src/dtos/circuit/circuit_list_item_plus_response.dto.ts` — forma del listado con ejercicios (Swagger). Agregado el 2026-08-22.

**Modificar:**

- `power-app/src/routine/routine.controller.ts` — tres endpoints nuevos (más `all-plus`, agregado el 2026-08-22).
- `power-app/src/routine/routine.service.ts` — tres métodos nuevos (hoy el archivo está vacío). Con `all-plus` se sumó `getAllCircuitsPlus` y los filtros compartidos se extrajeron al helper privado `buildCircuitsQuery`.

`RoutineModule` **no cambia**: `Circuit`, `RoutineExercise` y `ExerciseSet` ya están en su `forFeature` desde el ajuste de modelo.

## 6. Manejo de errores

Mismo patrón que el resto del proyecto: los métodos del service reciben `res: Response` y responden ellos. `try/catch` con `console.error(error)` y `500` con mensaje en castellano. Validación de body/query por el pipe global (`whitelist` + `forbidNonWhitelisted`), y `ParameterIdDto` para los `:id` (valida que sea UUID → `400` si no).

## 7. Verificación

- **Compilación:** `npm --prefix power-app run build` en verde.
- **Rutas registradas:** confirmar que las tres aparecen en el árbol de rutas de Nest.
- **Sin runtime:** la base sigue vencida y además falta regenerarla con el schema del ajuste de modelo; hasta entonces estos endpoints no se pueden probar de verdad.

## 8. Impacto en `Status/`

Esta vez **sí se mueven los conteos**:

- **CU-E-21** ⬜ → ✅ y **CU-E-24** ⬜ → ✅.
- Totales: ✅ 47 → **49**; ⬜ 10 → **8**.
- Rol Entrenador: 10/29 → **12/29** (34% → **41%**).
- CU-E-22 y CU-E-23 se anotan como pendientes **por refinar el contrato de alta/edición**, no por falta de tiempo.

## 9. Riesgos y notas

- **No se puede probar en runtime** hasta regenerar la base. El riesgo concreto: `exercise_count` y el orden anidado del detalle son las dos partes que sólo se validan de verdad ejecutando queries contra Postgres.
- **`type` es string libre**, así que el filtro por tipo depende de que los datos se carguen con consistencia. Cuando se cierre el conjunto de valores (ver spec del modelo), el filtro pasa a ser sobre un enum validado.
- **El detalle no es un CU**: si en la revisión del proyecto se pide trazabilidad 1:1 entre endpoints y CU, hay que dejar documentado que `GET /routine/circuit/:id` es el «include» de E-23.
