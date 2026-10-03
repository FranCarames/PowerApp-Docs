# Spec — Marcar set como realizado por usuario (`Routine_Exercise_Set_Finished`)

> **Fecha:** 2026-08-10 · **CU:** CU-U-12 (Marcar serie como realizado) · **Estado:** diseño aprobado, pendiente de plan

## 1. Contexto y objetivo

Un usuario, durante su entrenamiento, marca cada **set** (serie) como realizado. El estado "hecho" es **por usuario y por instancia de rutina** (`User_Routine`), no un atributo de la plantilla genérica.

Hoy el modelo mete estado per-usuario en clases **genéricas/compartidas**:
- `Routine_Exercise.finished` (boolean) — "¿hecho por quién?" → rompe la genericidad del circuito.
- `Routine_Exercise.user_note` — nota per-usuario en la clase genérica.

**Objetivo:** resolver "marcar set como hecho por usuario" sin romper la clase genérica de los circuitos, mediante una tabla junction cuya **existencia** representa el "hecho".

## 2. Alcance

**Incluye (pieza A):**
- Nueva entidad `Routine_Exercise_Set_Finished`.
- Quitar `finished` de `Routine_Exercise`.
- Mover `user_note` de `Routine_Exercise` a la junction.
- Endpoints de marcar / desmarcar / listar (CU-U-12) en el módulo `Routine`.

**Fuera de alcance (follow-ups):**
- **Pieza B** — Circuito genérico: migrar `Circuit.routine_id` (1:N) → `Routine_Circuit` (M:N) + `type` + `active`. *Tras esta pieza, el código de `Circuit` queda 1:N, "atrasado" respecto del modelo en `Doc/`.*
- **Pieza C** — Creación de circuito (E-22) / módulo Circuit.
- Validación profunda de que el `exercise_set` pertenezca realmente a la rutina de ese `user_routine` (solo se valida dueño del `user_routine` + existencia del set).
- Que haya *datos* para marcar depende de que `Routine`/`Planification` dejen de ser andamiaje.

## 3. Modelo de datos

### 3.1 Nueva entidad `Routine_Exercise_Set_Finished`

Tabla junction. **La existencia de la fila = ese set está hecho** para esa instancia de rutina del usuario.

| Campo | Tipo | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `user_routine_id` | uuid | FK → `User_Routine.id`, `onDelete CASCADE`, NOT NULL |
| `exercise_set_id` | uuid | FK → `Exercise_Set.id`, `onDelete CASCADE`, NOT NULL |
| `user_note` | varchar(100) | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now, on update |

- **UNIQUE `(user_routine_id, exercise_set_id)`** — no se marca dos veces el mismo set en la misma instancia.
- **Nombre del FK:** se usa `exercise_set_id` (referencia a `Exercise_Set.id`). En el Miro figura como `routine_exercise_set_id`; se renombra por claridad. *(A confirmar en revisión.)*

### 3.2 Cambios en entidades existentes

- **`Routine_Exercise`:** quitar la columna `finished`. Quitar la columna `user_note` (se mueve a la junction). **`coach_note` se mantiene** (es genérico, lo define el coach para la plantilla).
- **`Exercise_Set`:** sin cambios (no lleva `finished`).

## 4. Comportamiento y endpoints (CU-U-12)

Todo en `RoutineController` (`@Controller('routine')`). El `RoutineService` gana métodos **reales** para esta parte (deja de ser andamiaje solo acá).

**Seguridad (todos):** `@Auth(UserRole.user)` + **check de dueño**: el `user_routine_id` debe pertenecer al usuario del token (`user_routine.user_id === request.user.id`), si no → `403`. Patrón espejo del check de dueño de `User RM`.

| Método | Ruta | Body | Semántica | Respuesta |
|---|---|---|---|---|
| `POST` | `/routine/exercise/set-finished` | `{ user_routine_id, exercise_set_id, user_note? }` | Marca (upsert): crea la fila; si ya existe, actualiza `user_note` | `201` creada / `200` actualizada |
| `DELETE` | `/routine/exercise/set-finished` | `{ user_routine_id, exercise_set_id }` | Desmarca: borra la fila | `200` |
| `GET` | `/routine/exercise/set-finished/user-routine/:id` | — | Lista los sets hechos de esa instancia | `200` (array) |

Validaciones adicionales del `POST`/`DELETE`: existencia del `user_routine` (404 si no) y del `exercise_set` (404 si no).

DTOs (pipe global con `whitelist`/`forbidNonWhitelisted`):
- `MarkSetFinishedDto`: `user_routine_id` (uuid), `exercise_set_id` (uuid), `user_note?` (string, ≤100).
- `UnmarkSetFinishedDto`: `user_routine_id` (uuid), `exercise_set_id` (uuid).

**Wiring:** `RoutineModule` → `TypeOrmModule.forFeature([... , RoutineExerciseSetFinished, UserRoutine])`. `AuthModule` ya está importado.

## 5. Impacto (regla de mantenimiento del proyecto)

Cambia la estructura de entidades → hay que actualizar en el mismo cambio:

1. **`Db Creator`:**
   - `ddl.py` + `01_estructura.sql`: crear tabla `Routine_Exercise_Set_Finished` (FKs + UNIQUE + índices) y **quitar** `finished` y `user_note` de `Routine_Exercise`.
   - Si algún generador de datos inserta `Routine_Exercise` listando `finished`/`user_note`, actualizarlo + su `.sql`. La tabla nueva: sin seed (o mínimo).
2. **Regenerar la DB** (cambia el schema; DB free-tier).
3. **Status:** `estado-implementacion-CU.md` + `dashboard-estado-CU.html` → CU-U-12 pasa de ⬜ a ✅; ajustar conteos y el hallazgo sobre `finished`.

## 6. Verificación

- **Compilación:** `npm --prefix power-app run build` (verde).
- **Runtime** (tras regenerar la DB): matriz de guards (401/403/200), check de dueño (403 al usar un `user_routine` ajeno), marcar → `GET` lo lista → desmarcar → deja de listarlo, y upsert de `user_note`.

## 7. Riesgos / notas

- `user_note` acoplado al "hecho": solo existe nota si el set está marcado (decisión aceptada).
- Grep previo a implementar: confirmar que ningún código lea/escriba `routine_exercise.finished` / `routine_exercise.user_note` (Routine es andamiaje, se espera que no).
