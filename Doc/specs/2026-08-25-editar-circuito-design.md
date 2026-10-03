# Spec — Editar circuito (CU-E-23)

> **Fecha:** 2026-08-25 · **Bloque:** Circuitos (cierra el último pendiente) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** `Doc/specs/2026-08-19-crear-circuito-design.md` (el alta es el molde de la edición) y `Doc/specs/2026-08-10-routine-exercise-set-finished-design.md` (**queda superado en su parte de modelo**, ver §3.2)

## 1. Contexto y objetivo

CU-E-23 es el único CU que quedó abierto del bloque de circuitos. Se pausó el 21/8 por una razón concreta: editar un circuito significa reconciliar su lista de ejercicios (mantener / crear / eliminar), y eliminar chocaba contra el historial de los alumnos — borrar un ejercicio arrastraba por cascada las filas que registran que alguien ya lo hizo.

El modelo nuevo de `Doc/` resuelve el choque con dos cambios: el ejercicio del circuito gana **baja lógica** (`Routine_Exercise.active`) y el registro de "hecho" **se repunta al ejercicio** en vez de a la serie. Con eso, la eliminación tiene dos caminos según haya historial o no, y esta spec los define.

## 2. Alcance

**Incluye:**

- Cambio de modelo: `Routine_Exercise.active` y `Routine_Exercise_Set_Finished` → `Routine_Exercise_Finished` apuntando a `Routine_Exercise`.
- `POST /routine/circuit/edit/:id` — cabecera + lista completa de ejercicios, reconciliación transaccional.
- Filtrado de ejercicios inactivos en las lecturas existentes, con el helper preparado para la vista del alumno.
- Portar a `createCircuit` la guarda de rollback que ya tiene `createRoutine`.

**Fuera de alcance:**

- **CU-U-12** (marcar ejercicio como realizado): esta spec cambia el modelo que lo soporta, no implementa sus endpoints. Sigue ⬜.
- **Vista del alumno** (U-08, U-09, U-10) e **historial** (E-06, E-07): esta spec deja definido el contrato de visibilidad que van a usar (§6.2) y el helper parametrizado, pero no crea endpoints con rol `user`.
- Versionado o snapshot del circuito. Editar un circuito sigue afectando retroactivamente a todas las rutinas que lo usan: es la postcondición explícita del CU, no un efecto no querido.

## 3. Cambio de modelo

### 3.1 `Routine_Exercise` gana `active`

| Campo | Tipo | Constraints |
|---|---|---|
| `active` | boolean | NOT NULL, default `true` |

Es el mismo patrón de baja lógica que ya tienen `Circuit`, `Routine` y `Planification`.

### 3.2 `Routine_Exercise_Set_Finished` → `Routine_Exercise_Finished`

Se renombra la tabla, el archivo y la clase, y **la FK sube un nivel**: deja de apuntar a `Exercise_Set` y apunta a `Routine_Exercise`.

| Campo | Tipo | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `user_routine_id` | uuid | FK → `User_Routine.id`, `ON DELETE CASCADE`, NOT NULL |
| `routine_exercise_id` | uuid | FK → `Routine_Exercise.id`, **`ON DELETE RESTRICT`**, NOT NULL |
| `user_note` | varchar(100) | nullable |
| `created_at` / `updated_at` | timestamptz | default now |

- UNIQUE `(user_routine_id, routine_exercise_id)` → `uk_ref_user_routine_exercise`.
- Índices `idx_ref_user_routine_id` e `idx_ref_routine_exercise_id`.

**Por qué sube de nivel.** La spec del 10/8 dejó el "hecho" a nivel `Exercise_Set` — el alumno marcaba cada bloque de series. Ahora el registro se crea **recién cuando completa el ejercicio entero**; el tildado serie por serie queda como maquillaje del front y no toca la base. La consecuencia buena es que `Exercise_Set` **queda libre**: no necesita `active` y sus filas se pueden reemplazar enteras en cada edición sin tocar el historial.

**Por qué `RESTRICT` y no `CASCADE`.** Es la única FK del esquema que no es `CASCADE`, y es a propósito: con el algoritmo de §5 el borrado físico sólo ocurre cuando no hay historial, así que la cascada nunca debería dispararse. Si algún día se dispara es porque hay un bug en la reconciliación, y `RESTRICT` lo convierte en un error de la base en vez de en un borrado silencioso de historial. La FK a `User_Routine` se mantiene `CASCADE`: si se borra la instancia de rutina, sus marcas no tienen sentido.

### 3.3 `Exercise_Set`

Sin cambios. No lleva `active`.

## 4. Endpoint

`POST /routine/circuit/edit/:id` · `@Auth(coach, admin)` · `200` con `CircuitDetailResponseDto`.

El body es el mismo del alta: `EditCircuitDto extends CreateCircuitDto` (`name`, `description?`, `type`, `exercises[]`, cada uno con `exercise_id`, `coach_note?` y `sets[]`). Se define como clase propia y no como alias para que Swagger muestre un schema con nombre distinto y para dejar lugar a que diverjan.

**No viajan ids de `Routine_Exercise` ni de `Exercise_Set`.** La clave natural del ejercicio dentro del circuito es `exercise_id` — decisión tomada en CU-E-22, donde se validó que no puede repetirse — y las series no se reconcilian, se reemplazan. El front manda la lista completa tal como quedó en pantalla; el server hace el diff.

La respuesta repite el formato del detalle, igual que el `201` del alta, para que el front no tenga que llamar de nuevo después de guardar.

## 5. Reconciliación

Todo dentro de una transacción (`QueryRunner`), mismo patrón que `createCircuit`.

1. Cargar el circuito con **todos** sus `Routine_Exercise`, activos e inactivos.
2. Una sola query para saber quién tiene historial: los `routine_exercise_id` presentes en `Routine_Exercise_Finished` para los candidatos a salir (`IN (...)`), no una query por ejercicio.
3. Diff por `exercise_id`:

| Caso | Acción |
|---|---|
| Viene y estaba **activo** | Update de `coach_note` y `exercise_order`. Se borran todas sus series y se insertan las nuevas |
| Viene y estaba **inactivo** | `active = true` y lo mismo de arriba |
| Viene y **no existía** | Insert del `Routine_Exercise` + sus series |
| **No viene** y estaba activo, **sin** filas en `Routine_Exercise_Finished` | Delete físico (las series se van por cascade) |
| **No viene** y estaba activo, **con** filas en `Routine_Exercise_Finished` | `active = false` |

4. Update de la cabecera (`name`, `description`, `type`) y de `updated_at` (§11).
5. Commit, recarga del detalle y respuesta.

**Reactivar en vez de crear de nuevo.** El diff busca el `exercise_id` entre todas las filas del circuito, no sólo entre las activas. Así queda **una sola fila por (circuito, ejercicio)**, `exercise_id` sigue siendo clave natural de verdad, y el historial viejo vuelve a colgar del ejercicio que efectivamente es. La alternativa (dejar la vieja inactiva y crear una nueva) degradaba la unicidad a "sólo entre los activos" y sumaba una fila por cada ciclo sacar/agregar.

**Las series se reemplazan enteras**, también en los ejercicios que sobreviven. Después de repuntar el registro de "hecho" a `Routine_Exercise`, nada referencia a `Exercise_Set`, así que no hay nada que preservar y no hace falta reconciliar serie por serie ni conservar sus ids. `set_order` sale de la posición en el array, igual que en el alta.

**`exercise_order` de los inactivos.** Los que quedan dados de baja conservan su orden viejo, que puede repetirse con el de los activos. Como todas las lecturas los filtran o los ordenan junto al resto, es inocuo; no se normaliza.

## 6. Visibilidad de los inactivos

### 6.1 Helper parametrizado

`buildCircuitDetailResponse(circuit, visibleInactiveIds?: Set<string>)` incluye el ejercicio si `routineExercise.active || visibleInactiveIds?.has(routineExercise.id)`.

Es el helper que comparten el detalle de circuito, el detalle de rutina y las respuestas de los dos altas, así que el filtro se define una sola vez.

### 6.2 Quién ve qué

- **Lecturas del entrenador** (las únicas que existen hoy, todas `@Auth(coach, admin)`): no pasan el set → sólo activos. Es lo correcto para armar y editar: un ejercicio que sacaste no reaparece en la pantalla de edición.
- **Lecturas del alumno** (U-08/U-09/U-10 y el historial E-06/E-07, cuando se implementen): pasan el set de `routine_exercise_id` que ese `user_routine` tiene en `Routine_Exercise_Finished`. **Regla: el alumno ve un ejercicio inactivo si y sólo si lo completó en esa instancia de rutina.** Uno inactivo que nunca hizo queda oculto — lo sacó el entrenador y no forma parte de su entrenamiento.

Así no se le desaparece nada tildado a mitad de sesión ni del historial, y tampoco le aparece trabajo dado de baja que nunca hizo.

### 6.3 Lecturas a tocar ahora

| Lectura | Cambio |
|---|---|
| `buildCircuitDetailResponse` | Filtro parametrizado (cubre detalle de circuito, detalle de rutina y los dos altas) |
| `getAllCircuitsPlus` | Filtro en el `map`, y `exercise_count` sobre lo filtrado |
| `getAllCircuits` | Condición sobre `active` en el `loadRelationCountAndMap`, que cuenta en SQL |

## 7. Validaciones y errores

| Situación | Código |
|---|---|
| Circuito inexistente | `404` |
| Circuito inactivo | `400` — precondición del CU ("el Circuit existe y está activo"), espejo del `400` de E-16 al ensamblar un circuito de baja |
| Lista de ejercicios vacía | `400` — lo da `@ArrayNotEmpty`, y es el camino alternativo explícito del CU |
| `exercise_id` repetido en el body | `400` |
| Reglas de series (`amrap_time` sin `amrap`, `rpe` con `rir`, `rm` con `set_count ≠ 1`) | `400` |
| Algún `exercise_id` no existe en el catálogo | `404` |

Las dos últimas reusan lo que ya existe. El chequeo de `exercise_id` duplicado hoy está inline en `createCircuit`: se mueve adentro de `validateCircuitSetRules`, que pasa a llamarse `validateCircuitPayload` y queda como la única puerta de validación de payload para el alta y la edición. Como `EditCircuitDto extends CreateCircuitDto`, la firma del helper no cambia.

## 8. Archivos

**Entidades**

- `entities/routine_exercise.entity.ts` — `+ active`.
- `entities/routine_exercise_set_finished.entity.ts` → `entities/routine_exercise_finished.entity.ts` — renombre de clase y tabla, FK a `Routine_Exercise`, unique nuevo.
- `routine/routine.module.ts` — actualizar el import y el `forFeature`.

**Módulo Routine**

- `dtos/circuit/edit_circuit.dto.ts` — nuevo, `EditCircuitDto extends CreateCircuitDto`.
- `routine/routine.controller.ts` — `POST circuit/edit/:id`, declarado junto a `circuit/create`.
- `routine/routine.service.ts` — `editCircuit`, `validateCircuitPayload` (renombre + chequeo de duplicados), filtros de §6.3, guarda de rollback en `createCircuit`.

**Db Creator**

- `ddl.py` — `active` en `Routine_Exercise`; renombre de tabla, columna, FK, unique e índices de `Routine_Exercise_Finished`.
- Regenerar con `python build_sql.py` → cambia `01_estructura.sql`. **`02` y `03` no se tocan:** ningún generador de datos inserta en `Routine_Exercise`, `Exercise_Set` ni en la tabla de "hecho" (verificado).

## 9. Impacto en `Status/`

- **CU-E-23** ⬜ → ✅, con endpoint y notas. Cierra el bloque de circuitos completo.
- **CU-U-12** sigue ⬜ pero **cambia de semántica**: pasa de "marcar el bloque de series" a "marcar el ejercicio completo". Hay que corregir la nota de CU-E-22 que fijaba la semántica anterior y la fila de la tabla, que hoy dice "sin endpoint (Exercise_Set)".
- **Hallazgo 3** ("Circuitos: cerrado salvo E-23") pasa a cerrado sin excepciones.
- **Hallazgo del rollback** en `createCircuit`: resuelto, sale de pendientes.
- Cronograma: la fila del 21/8 deja de tener el ⏸️ de E-23.
- Sección "Cambios recientes" y conteos por rol.
- Mismo tratamiento en `dashboard-estado-CU.html`.

## 10. Verificación

- **Compilación:** `npm --prefix power-app run build` en verde.
- **Runtime** (cuando haya base viva, regenerándola con los tres scripts): editar un circuito sin historial y ver el delete físico; marcar un ejercicio a mano en `Routine_Exercise_Finished`, sacarlo de la lista y ver `active = false` con la fila de historial intacta; sacarlo y volver a agregarlo y ver que se reactiva la misma fila (mismo `id`) en vez de crear otra; confirmar que los inactivos no salen en `circuit/:id`, `circuit/all-plus`, el `exercise_count` de `circuit/all` ni en el detalle de rutina; y la matriz de guards (401/403).

## 11. Riesgos y notas

- **Hallazgo — `updated_at` no se actualiza solo.** Las entidades usan `@Column({ onUpdate: 'CURRENT_TIMESTAMP' })`, que es sintaxis de MySQL y en Postgres no hace nada; tampoco hay triggers en el DDL. O sea que hoy `updated_at` queda congelado en la fecha de creación en todas las tablas. En `editCircuit` se setea explícitamente, porque un endpoint de edición que deja la fecha vieja es directamente un dato incorrecto. Generalizarlo al resto (trigger en el DDL o `@UpdateDateColumn`) queda como pendiente aparte, fuera de esta spec.
- **La edición sigue siendo retroactiva.** No hay snapshot: si el entrenador le cambia las series a un ejercicio que el alumno ya completó, el alumno ve las series nuevas con la marca de hecho puesta. Es la consecuencia asumida de que el circuito sea una pieza compartida, y es lo que habilita que `Exercise_Set` se reemplace libremente.
- **Circuito de baja.** No se puede editar (`400`), pero sí se puede reactivar con `set-active` y editarlo después. No hace falta un camino especial.
- **Typo en el diagrama de `Doc/`:** `Routine_Exercise` figura con `updated_at` dos veces; el primero debería ser `created_at`. No afecta al código (la entidad y el DDL están bien), pero conviene corregir el `.svg`/`.pdf`.
