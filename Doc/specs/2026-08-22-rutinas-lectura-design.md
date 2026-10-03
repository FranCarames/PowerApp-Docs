# Spec — Rutinas: listado, listado con circuitos y detalle (CU-E-15)

> **Fecha:** 2026-08-22 · **Bloque:** Rutinas (vence 28/8) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** el bloque de circuitos (`2026-08-19-circuitos-listado-y-baja-design.md`, `2026-08-19-crear-circuito-design.md`) y de la baja lógica en `Routine` (`Doc/plans/2026-08-22-baja-logica-rutinas-planificaciones-plan.md`)

## 1. Contexto y objetivo

Con los circuitos funcionando y `Routine_Circuit` en la base, arranca el bloque de rutinas por su parte de lectura. Son los tres endpoints espejo de los de circuitos, un nivel más arriba en el árbol:

```
Routine → Routine_Circuit → Circuit → Routine_Exercise → Exercise / Exercise_Set
```

Cada endpoint es "cuánto de ese árbol devuelvo".

## 2. Alcance

**Incluye:**

- `GET /routine/all` — listado con filtros (CU-E-15).
- `GET /routine/all-plus` — el mismo listado, con los circuitos de cada rutina (livianos).
- `GET /routine/:id` — el árbol completo hasta las series.

**Fuera de alcance:**

- CU-E-16 / E-17 (crear y editar rutina) y CU-E-18 (baja lógica): van después, en el mismo bloque.
- CU-E-19 / E-20 (asignar y desasignar rutina a alumno): dependen de `Routine_Asignation_User`, que el usuario decidió no tocar y podría quedar post-MVP.
- Cambios de entidades: **no se toca ninguna**; `Db Creator` intacto y la base no se migra.

## 3. Endpoints

Los tres en `routine.controller.ts` / `routine.service.ts`, con `@Auth(UserRole.coach, UserRole.admin)`.

| Método | Ruta | Qué devuelve |
|---|---|---|
| `GET` | `/routine/all` | Cabeceras + `circuit_count` |
| `GET` | `/routine/all-plus` | Lo anterior + los circuitos de cada rutina |
| `GET` | `/routine/:id` | El árbol completo hasta las series |

Los tres reemplazan andamiaje: `/all` y `/:id` ya están declarados con la llamada al service comentada.

**Orden de declaración:** `/routine/all-plus` es de **un solo segmento**, así que va declarado **antes** de `/routine/:id`; si no, la request cae en el `:id` y devuelve `400` por UUID inválido. Mismo caso que `circuit/all-plus`.

### 3.1 Listado — `GET /routine/all`

`GetRoutinesQueryDto`, dos filtros opcionales:

| Param | Tipo | Comportamiento |
|---|---|---|
| `keyword` | string ≤100 | Coincidencia parcial case-insensitive sobre `name` **o** `coach_note` |
| `include_inactive` | boolean | `false` por defecto → sólo `active = true`, que es lo que pide CU-E-15. Mismo `@Transform` que el resto |

No hay filtro por `type`: a diferencia de `Circuit`, `Routine` no tiene ese campo.

**Respuesta `200`:** array ordenado por `name` ASC. Cada fila: `id`, `name`, `coach_note`, `active`, `circuit_count`, `created_at`, `updated_at`.

`circuit_count` se resuelve con `loadRelationCountAndMap` sobre `routineCircuits`.

### 3.2 Listado con circuitos — `GET /routine/all-plus`

Mismos filtros (reutiliza `GetRoutinesQueryDto` tal cual). Suma:

```
circuits: [ { id, order, circuit: { id, name, type, active } } ]   // ordenados por order ASC
```

`id` es el del `Routine_Circuit`, no el del `Circuit` — es el que va a necesitar la reconciliación de E-17.

**Se incluye el `active` del circuito a propósito:** una rutina puede referenciar un circuito dado de baja, y el entrenador necesita verlo. De cada circuito van sólo `id`, `name`, `type` y `active`; sin ejercicios ni series.

`circuit_count` sale del `.length` del array ya cargado, sin la query extra del listado normal.

### 3.3 Detalle — `GET /routine/:id`

**Responde también para rutinas inactivas** (espejo del detalle de circuito). `404` si el id no existe.

```
{ id, name, coach_note, active, created_at, updated_at,
  circuits: [ { id, order,
                circuit: { …exactamente lo que devuelve GET /routine/circuit/:id } } ] }
```

El circuito anidado se arma con **`buildCircuitDetailResponse`, el helper que ya existe**: es el pago del refactor de CU-E-22. No se duplica el formato, y un cambio en el detalle del circuito se refleja en los dos lados a la vez.

## 4. Reutilización y helpers

- **`buildRoutinesQuery`** — nuevo, espejo de `buildCircuitsQuery`: arma el `QueryBuilder` con los filtros compartidos por `/all` y `/all-plus`.
- **`buildCircuitDetailResponse`** — existente, se reutiliza sin cambios para cada circuito del detalle.
- **`findRoutineDetail`** — nuevo: carga la rutina con toda la cadena de relaciones y el orden anidado.

## 5. Por qué esto no cierra CU-U-09

CU-U-09 ("ver detalle de rutina") pide exactamente esta estructura, pero con una precondición: *"la rutina pertenece a una asignación vigente del usuario"*, y su camino alternativo dice que si no, **se deniega el acceso**.

Ese chequeo necesita la cadena de asignaciones (`User_Routine` / `Routine_Asignation_User`), que todavía no existe ni tiene datos. Por eso `/routine/:id` queda en **coach + admin**, aunque el andamiaje declaraba `@Auth(user, coach, admin)`: habilitar el rol `user` sin el check de dueño sería un agujero — cualquier alumno podría leer cualquier rutina.

**CU-U-09 sigue 🔵.** Se cierra sumando el check cuando existan las asignaciones; el endpoint ya va a estar hecho.

## 6. Archivos

**Crear:**

- `power-app/src/dtos/routine/get_routines_query.dto.ts`
- `power-app/src/dtos/routine/routine_list_item_response.dto.ts`
- `power-app/src/dtos/routine/routine_list_item_plus_response.dto.ts`
- `power-app/src/dtos/routine/routine_detail_response.dto.ts`

**Modificar:** `routine.controller.ts` (tres endpoints, dos reemplazando andamiaje) y `routine.service.ts` (tres métodos + dos helpers).

`RoutineModule` **no cambia**: `Routine`, `RoutineCircuit` y `Circuit` ya están en su `forFeature`.

## 7. Verificación

- **Compilación:** `npm --prefix power-app run build`.
- **Rutas registradas** en el bundle, y `all-plus` declarado antes de `:id`.
- **Runtime:** la base está al día, pero **no hay ninguna rutina cargada** — E-16 todavía no existe. Para probar de punta a punta hay que insertar a mano una `Routine` y sus `Routine_Circuit` apuntando a los circuitos que ya existen. Sin eso, los listados devuelven `[]` (que igual valida que el mapeo de la entidad coincide con la base).

## 8. Impacto en `Status/`

- **CU-E-15** 🔵 → ✅. Totales: ✅ 50 → **51**, 🔵 14 → **13**. Rol Entrenador: 13 → **14** de 29 (45% → **48%**).
- `/routine/all-plus` y `/routine/:id` no son CU propios, como pasó con los equivalentes de circuitos.

## 9. Riesgos y notas

- **El detalle ordena en tres niveles anidados** (`order` → `exercise_order` → `set_order`) con las find options de TypeORM. El de circuitos ya usa dos niveles, pero **eso nunca se verificó contra la base**. Si el orden anidado falla, el plan B es ordenar en el mapper, que es determinista.
- **Tamaño de la respuesta:** `/routine/:id` puede traer un árbol grande (rutina → N circuitos → M ejercicios → K series). Sin paginación, es el endpoint más pesado de la API.
- **`Routine.name` es varchar(20)**, corto para nombres reales ("Día A - Pecho y tríceps" son 24 caracteres). No bloquea la lectura, pero va a molestar en E-16.
