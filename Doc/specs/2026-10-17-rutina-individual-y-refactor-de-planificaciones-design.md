# Spec — Rutina individual (bloque A) y refactor de planificaciones

> **Fecha:** 2026-10-17 · **Bloque:** A del [roadmap del 16/10](../plans/2026-10-16-roadmap-backend.md) (fase 2, BE-09) más el refactor de planificaciones · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** el diagrama `Doc/PowerApp - Modelo DB.svg` / `.pdf` del 17/10 (validado contra esta spec), la spec de asignar rutinas a planificaciones (`2026-09-04-asignar-rutinas-a-planificacion-design.md`), y las decisiones del 25/8 (el "hecho" es por ejercicio) y del 27/8 (visibilidad de los vínculos dados de baja).
> **Resuelve** las decisiones DA1 a DA6 del roadmap (§6) y, de paso, DB1 y DB3 del bloque B. Varias se resolvieron distinto de lo que recomendaba el roadmap: ver §2.

## 1. Contexto y objetivo

PowerApp ofrece **dos formas de asignarle entrenamiento a un alumno**:

| | **Planificación** (la mayoría de los casos) | **Asignación individual** (alumnos nuevos, primeras clases) |
|---|---|---|
| Qué es | Un conjunto de rutinas para un período de 15 días a 4 meses, repartidas en semanas, que acompaña la progresión del alumno | Una rutina suelta para un alumno, un día |
| Asignación | `User_Planification` → `Planification` → `Routine_Asignation` → `Routine` | `Routine_Asignation_User` → `Routine` |
| Ejecución (hecho y nota) | `Routine_Exercise_Finished` | `Routine_Asign_Exercise_Finished` |

Hoy **ninguna de las dos funciona para el alumno**. El modelo implementado tiene tres agujeros:

1. **La asignación individual no se puede crear sin inventarle una planificación:** `Routine_Asignation_User.routine_asignation_id` es NOT NULL y apunta a una rutina dentro de un plan.
2. **Aunque se creara, no se podría ejecutar:** la tabla de ejecución (`User_Routine`) sólo cuelga de `Routine_Asignation`.
3. **Nada escribe el registro de ejecución** (hallazgo 2 del Status): no hay hecho, ni notas, ni historial.

Esta spec:

- Define **el modelo de ejecución de las dos vías** y lo aplica en **una sola migración** (BE-10), antes de regenerar la base de Render (BE-23, cerca del 1/11).
- Implementa **la vía individual de punta a punta** (bloque A): asignar y quitar (CU-E-19, CU-E-20), verla (la parte individual de CU-U-08, CU-U-09 y CU-U-10), ejecutarla (CU-U-12, con CU-U-13 incluido) y el historial del entrenador (CU-E-06, CU-E-07).
- Hace un **refactor de las planificaciones** para que se armen por **semanas**: cambia el contrato de CU-E-08 a CU-E-12d.

La ejecución de las planificaciones, la asignación de una planificación a un alumno (CU-E-13, CU-E-14) y la parte del home que viene del plan siguen en el **bloque B** (§8), pero su **esquema** entra en esta migración.

## 2. Decisiones

Todas tomadas con el usuario el 17/10.

| # | Decisión | Por qué |
|---|---|---|
| D1 | **Cada vía tiene su propia tabla de ejecución.** La individual usa la tabla nueva `Routine_Asign_Exercise_Finished`, "con la misma lógica" que `Routine_Exercise_Finished` | Las dos vías son productos distintos. Reemplaza la recomendación DA1-a del roadmap (unificar todo en `User_Routine`) |
| D2 | **`Routine_Asignation_User` tiene `date`**: cada fila es una rutina para un día. Único `(routine_id, user_id, date)` | Permite asignar la misma rutina al mismo alumno en días distintos, y cada día es una sesión con su propio registro de ejecución |
| D3 | **El hecho y la nota viven en la misma fila y se escriben por el mismo endpoint.** Sólo se anota sobre un ejercicio realizado, así que **CU-U-13 pasa a ser un camino incluido de CU-U-12** | Es la lógica del 25/8: la existencia de la fila *es* el hecho. Resuelve DA3 sin cambiar el esquema |
| D4 | **CU-E-20 borra físicamente, salvo que la asignación ya se haya entrenado: en ese caso, `409`** | No se destruye historial (criterio del 22/8), y la spec de E-20 sigue siendo de borrado físico. `RESTRICT` en la base como respaldo |
| D5 | **El alumno puede marcar en cualquier momento**, sin ventana de fechas | Decisión del usuario |
| D6 | **Gimnasio compartido:** cualquier coach asigna a cualquier alumno y ve su historial (resuelve DA6) | Es lo que el código ya hace con E-01 a E-05. El "alumno vinculado al coach" no tiene soporte en el modelo |
| D7 | **El historial muestra la prescripción** (las series del coach), la fecha y la nota (resuelve DA4) | El modelo no registra la carga real; registrarla queda para después del MVP |
| D8 | **El alumno lee por asignación** (`GET /routine/assign-user/:id`), y `GET /routine/:id` queda para coach y admin (resuelve DA5) | La unidad de trabajo del alumno es la asignación del día. No se le cambia el contrato a `GET /routine/:id` ni se le agrega un chequeo de "¿la tiene asignada?" |
| D9 | **`Planification.duration` son semanas:** un entero ≥ 0, **obligatorio**. 0 es "sin duración fija". Si es mayor que 0, **limita** `week` a `1..duration` | Es la medida coherente para un plan que se reparte en semanas |
| D10 | **`Routine_Asignation` tiene `week` y `order`, los dos NOT NULL.** La baja lógica sólo apaga `active` y la rutina **conserva** su semana y su orden | Cada rutina se ubica en una semana del plan. Conservar el `order` es inocuo porque es una etiqueta con repetidos permitidos (4/9), igual que `Routine_Exercise.exercise_order` |
| D11 | **Se elimina `User_Routine`.** `Routine_Exercise_Finished` cuelga directo de `User_Planification` + `Routine_Asignation` | Sin fecha, `User_Routine` no guardaba nada propio (`user_id` sale de la asignación, y su `active` lo cubre `User_Planification.active`). Además no distinguía dos asignaciones de la misma planificación al mismo alumno. Desaparece la pregunta de cuándo nace una instancia (DA2, DB1) |
| D12 | **`User_Planification` pierde `duration` y `end_date`.** El fin de la asignación se calcula como `start_date` + `duration` semanas de la plantilla | Son datos derivables de la planificación y de sus semanas (decisión del usuario) |
| D13 | **Sin asignación individual en lote por ahora** | Si el coach quiere lunes, miércoles y viernes, son tres llamadas. Se suma después si molesta |
| D14 | **El refactor de planificaciones va en esta spec y en la misma migración** | Una sola regeneración de la base, y el web recibe el contrato nuevo completo de una vez |

## 3. Modelo (BE-10)

El diagrama de `Doc/` del 17/10 ya tiene todo esto. Se validó contra esta spec comparando las tablas campo por campo y las relaciones por coordenadas. Lo que el diagrama **no dibuja** (los únicos, las reglas de borrado de las FK y las validaciones de rango) queda definido acá.

| Tabla | Cambio |
|---|---|
| `Routine_Asignation_User` | **−** `routine_asignation_id` (y su FK a `Routine_Asignation`) · **−** `order` · **+** `date DATE NOT NULL` · **+** `CONSTRAINT uk_rau_routine_user_date UNIQUE (routine_id, user_id, date)`. Las FK a `Routine` y a `User` siguen en `CASCADE`: las dos bajas son lógicas, así que nunca se disparan |
| `Routine_Asign_Exercise_Finished` | **Nueva:** `id UUID PK DEFAULT gen_random_uuid()`, `user_routine_asign_id UUID NOT NULL` (FK a `Routine_Asignation_User`, **`ON DELETE RESTRICT`**), `routine_exercise_id UUID NOT NULL` (FK a `Routine_Exercise`, **`ON DELETE RESTRICT`**), `user_note VARCHAR(100)` (nullable), `created_at` y `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`), y **`CONSTRAINT uk_raef_asign_exercise UNIQUE (user_routine_asign_id, routine_exercise_id)`** |
| `Routine_Exercise_Finished` | **−** `user_routine_id` (con su FK y su único) · **+** `user_planification_id UUID NOT NULL` (FK a `User_Planification`, **`RESTRICT`**) · **+** `routine_asignation_id UUID NOT NULL` (FK a `Routine_Asignation`, **`RESTRICT`**) · `routine_exercise_id` sigue igual (FK `RESTRICT`) · **+** `CONSTRAINT uk_ref_plan_asignation_exercise UNIQUE (user_planification_id, routine_asignation_id, routine_exercise_id)` |
| `User_Routine` | **Se elimina** (`DROP TABLE`) |
| `Routine_Asignation` | **+** `week INTEGER NOT NULL` · `order` pasa a **`INTEGER NOT NULL`** |
| `Planification` | `duration VARCHAR(50)` → **`INTEGER NOT NULL`** |
| `User_Planification` | **−** `duration` · **−** `end_date` · `number_of_routines` pasa a **NOT NULL** (DB3 del roadmap, que el diagrama ya fija) |

**Rangos:** `duration ≥ 0` y `week ≥ 1` se validan en los DTOs, igual que el resto de los rangos del proyecto. La barrera está en la aplicación y no se agregan `CHECK` en la base.

**Una consistencia que la base no garantiza:** en `Routine_Exercise_Finished`, la `Routine_Asignation` tiene que pertenecer a la misma planificación que la `User_Planification`. Con dos FK simples no se puede expresar. Lo valida el service al marcar (bloque B).

**Código:**
- Se borra `user_routine.entity.ts` y, con ella, sus registros en los `forFeature` de `planification.module.ts` y `routine.module.ts` y la relación `RoutineAsignation.userRoutines`.
- Se agrega `routine_asign_exercise_finished.entity.ts` y se actualizan las entidades de las otras cinco tablas.
- Ningún service lee ni escribe `User_Routine` hoy (verificado con grep), así que no hay lógica que migrar.

**`Db Creator`:**
- Se actualiza `ddl.py` y se regenera `01_estructura.sql`.
- **`02` y `03` no cambian:** ningún generador inserta en estas tablas, ni en `Planification` ni en `Routine_Asignation` (verificado con grep).
- La regeneración tiene que quedar byte-idéntica a lo versionado.

**Patch para la base viva** (`Db Creator/patches/`): idempotente y documentado, como los anteriores.
- **Aborta con un mensaje claro** si `User_Routine`, `Routine_Exercise_Finished` o `Routine_Asignation_User` tienen filas. Ningún endpoint las escribe, así que no debería pasar, y si pasa hay que mirarlo a mano.
- **Convierte `Planification.duration`:** toma el primer número del texto (`'12 semanas'` → 12); si no hay ninguno, deja 0.
- **Completa `Routine_Asignation`:** `week = 1` en las filas existentes, y el `order` null de las inactivas al final de su semana.
- **Aplica el resto de los cambios de la tabla.**

## 4. Contrato — vía individual (bloque A)

Todo en `routine.controller.ts` / `routine.service.ts`, como se acordó el 27/8. Las rutas de dos segmentos no compiten con `GET /routine/:id`.

**Convenciones:**
- Las fechas son **días sin hora** (`"2026-10-20"`). El servidor nunca calcula "hoy" en este bloque: las fechas siempre las manda el cliente.
- Los ids se comparan en minúscula.
- Los handlers llaman al service con `await` (BE-04).
- Cada endpoint declara en el Swagger su respuesta y sus códigos de error.

| Método | Ruta | Roles | CU |
|---|---|---|---|
| `POST` | `/routine/assign-user` | coach, admin | E-19 |
| `DELETE` | `/routine/assign-user/:id` | coach, admin | E-20 |
| `GET` | `/routine/assigned/:userId` | user (`@Owner('userId')`), coach, admin | E-19 y E-20 (listado), U-08 (parte individual) |
| `GET` | `/routine/assign-user/:id` | user (dueño), coach, admin | U-09, U-10 |
| `POST` | `/routine/assign-user/:id/finished` | user (dueño) | U-12 (con U-13) |
| `DELETE` | `/routine/assign-user/:id/finished/:routineExerciseId` | user (dueño) | U-12 |
| `GET` | `/routine/history/:userId` | coach, admin | E-06, E-07 |

**"Dueño"** significa que la asignación tiene que ser del alumno del token. El chequeo va en el service, porque el path trae el id de la asignación y no el del usuario. Si no es suya, `403`.

### 4.1 Asignar — `POST /routine/assign-user`

Body: `{ routine_id, user_id, date }`. `date` es un día válido, pasado o futuro.

Validaciones, en este orden:

| Código | Caso |
|---|---|
| `404` | La rutina no existe |
| `400` | La rutina está dada de baja (mismo criterio que crear una rutina con un circuito de baja) |
| `404` | El usuario no existe |
| `400` | El destinatario no es alumno (`role ≠ user`) o tiene la cuenta cerrada (`active = false`) |
| `409` | Ese alumno ya tiene esa rutina ese día. También se responde `409` si la base rechaza la fila por el único (dos altas simultáneas) |

**`201`** con la asignación: `{ id, routine_id, user_id, date, created_at, updated_at, routine: { id, name } }`.

### 4.2 Quitar — `DELETE /routine/assign-user/:id`

| Código | Caso |
|---|---|
| `404` | No existe |
| `409` | `El alumno ya entrenó esta rutina: no se puede quitar.` (tiene filas en `Routine_Asign_Exercise_Finished`) |

**`200`** con la asignación borrada, en la misma forma que §4.1. El borrado es físico.

### 4.3 Listar las de un alumno — `GET /routine/assigned/:userId?from=&to=`

- `from` y `to` son opcionales, inclusivos y en formato día. Si `from > to`, `400`.
- El home del alumno lo pide con el lunes y el domingo de la semana; el coach, sin filtro.
- `404` si el usuario no existe.

**`200`** con un array ordenado por `date` ascendente y después por nombre de rutina. Cada ítem:

```
{ id, routine_id, user_id, date, created_at, updated_at,
  routine: { id, name, active },
  progress: { finished, total } }
```

- **`total`** son los ejercicios que el alumno ve en el detalle (§4.4): los activos de los circuitos activos de la rutina, contando cada ejercicio una vez, más los dados de baja que el alumno completó en esta asignación.
- **`finished`** son las filas de hecho de la asignación.
- **Una rutina que el coach dio de baja después de asignarla** sigue apareciendo, con `routine.active: false`. La asignación existe y se puede ejecutar; el flag es informativo.

### 4.4 Detalle — `GET /routine/assign-user/:id`

Códigos: `404` si no existe y `403` si es de otro alumno (para el rol `user`).

**`200`**:

```
{ id, routine_id, user_id, date, created_at, updated_at,
  routine: <árbol idéntico al de GET /routine/:id>,
  finished: [ { routine_exercise_id, user_note, created_at, updated_at } ] }
```

- **El árbol se arma con los mismos builders** (`buildRoutineDetailResponse` y `buildCircuitDetailResponse`): circuitos, ejercicios con su ficha de catálogo, series ordenadas y notas del coach. Así cubre también CU-U-10 (el detalle del ejercicio en contexto de rutina). El web y el iOS reutilizan el tipo y el componente del detalle de rutina, y cruzan lo hecho por `routine_exercise_id`.
- **Visibilidad de lo dado de baja (regla del 27/8):** se ve un vínculo `Routine_Circuit` o un `Routine_Exercise` inactivo **sólo si** el alumno completó algo de él en esta asignación. Hoy el builder de la rutina no le pasa la visibilidad al del circuito: hay que propagarla.

### 4.5 Marcar, y dejar o editar la nota — `POST /routine/assign-user/:id/finished`

Body: `{ routine_exercise_id, user_note? }`. `user_note` tiene hasta 100 caracteres; la cadena vacía significa "sin nota".

Códigos: `404` si la asignación no existe y `403` si no es del alumno.

| Situación | Resultado |
|---|---|
| El ejercicio no pertenece a la rutina (no hay un `Routine_Circuit` de la rutina que contenga su circuito) | `400` |
| **No estaba marcado** y el ejercicio o su vínculo están dados de baja | `400`: no se puede marcar algo que el coach sacó |
| **No estaba marcado** | Crea la fila, con la nota si viene, y responde **`201`** |
| **Ya estaba marcado** y viene `user_note` | Actualiza la nota (vacía → `null`) y responde **`200`** |
| **Ya estaba marcado** y no viene `user_note` | No toca nada y responde **`200`** (idempotente) |
| Dos marcas simultáneas chocan contra el único | Se trata como "ya estaba marcado": **`200`** |

Respuesta: `{ routine_exercise_id, user_note, created_at, updated_at }`.

**Sin ventana de fechas (D5):** se puede marcar cualquier asignación propia, en cualquier momento.

**Un circuito repetido** (A, B, A) comparte sus filas de `Routine_Exercise`, así que marcar un ejercicio lo marca en las dos apariciones. Es una consecuencia asumida de la decisión del 25/8 (el hecho es por ejercicio), y pasa igual en la vía del plan.

### 4.6 Desmarcar — `DELETE /routine/assign-user/:id/finished/:routineExerciseId`

- Códigos: `404` si la asignación no existe y `403` si no es del alumno.
- Borra la fila **y su nota**.
- Es **idempotente:** si no estaba marcado, también responde `200`.
- Se puede desmarcar un ejercicio que el coach sacó después de marcarlo.

**`200`**: `{ routine_exercise_id, finished: false }`.

### 4.7 Historial — `GET /routine/history/:userId?exercise_id=`

`404` si el usuario no existe. `exercise_id` es opcional; es un ejercicio del catálogo y tiene que ser un UUID válido.

**`200`** con las **sesiones que tienen al menos un ejercicio hecho**, de la más nueva a la más vieja (por `date` descendente y después por nombre de rutina). En este bloque, una sesión es una asignación individual:

```
{ source: 'individual', assignment_id, date,
  routine: { id, name },
  exercises: [ { routine_exercise_id, exercise: { id, name }, user_note, finished_at,
                 sets: [ { set_order, set_count, rep_count, weight, rm_perc, rpe, rir,
                           amrap, amrap_time, rm } ] } ] }
```

- **`finished_at`** es el `created_at` de la fila de hecho.
- **`sets`** es la **prescripción** del coach (D7): el modelo no registra la carga real.
- **Con `exercise_id` (CU-E-07):** sólo las sesiones donde se hizo ese ejercicio, y en cada una, sólo ese ejercicio. Si no hay ninguna, el array viene vacío.
- **Lo dado de baja aparece igual:** si el alumno lo hizo, está en su historial.
- **Preparado para el bloque B sin cambiar la forma:** las sesiones de plan se suman a la misma lista con `source: 'plan'`, `user_planification_id`, `routine_asignation_id` y `week`. El bloque B define su `date`; la propuesta es el día de la primera marca, porque la vía del plan no tiene fecha.
- **Sin paginación:** el historial de un alumno en un cuatrimestre es chico.

## 5. Contrato — refactor de planificaciones (CU-E-08 a CU-E-12d)

Mismos endpoints que hoy (`planification.controller.ts`, coach y admin). Cambian sus campos y sus reglas.

### 5.1 Crear y editar (E-09, E-10)

- **`duration`** es un entero ≥ 0 y **obligatorio**, tanto al crear como al editar (la edición ya es de reemplazo completo: "el opcional omitido borra"). 0 es "sin duración fija".
- **Al editar,** si la duración nueva es mayor que 0 y menor que la semana más alta usada por una asignación **activa** del plan, responde **`400`** `La planificación tiene rutinas en la semana N: la duración no puede ser menor.`.
- **Consecuencia asumida (D12):** como el fin de cada `User_Planification` se calcula con la duración de la plantilla, **editar la duración mueve el fin de todos los alumnos que la tienen asignada.**

### 5.2 Listado y detalle (E-08, `GET /planification/:id`, `/all-plus`)

- `duration` sale como número.
- Cada ítem de `routines[]` suma `week`, y la lista sale ordenada por `week`, `order` y el desempate que ya existe.
- **La lista queda plana, con la forma de hoy más un campo; el cliente agrupa por semana.**

### 5.3 Asignar una rutina (E-12a) — `POST /planification/routine/assign`

- Body: `{ planification_id, routine_id, week, order? }`.
- **`week`** es obligatoria: un entero ≥ 1 y menor o igual a `duration` si `duration` es mayor que 0. Si no cumple, `400`.
- **Sin `order`:** la rutina va al final **de esa semana**, con el `order` máximo de las asignaciones activas de esa planificación en esa semana, más 1, o 1 si no hay ninguna.
- **Con `order`:** se guarda tal cual, aunque se repita. Sigue siendo una etiqueta (4/9, §5.1).
- La respuesta no cambia: `201` con el detalle.

### 5.4 Asignar en lote (E-12b) — `POST /planification/routine/assign-bulk`

- Body: `{ planification_id, week, routine_ids[] }`. **Una semana por lote**, con las mismas reglas que §5.3.
- Las rutinas se agregan consecutivas al final de esa semana, en el orden del array.
- Sigue siendo transaccional (todo o nada), y los repetidos siguen permitidos.

### 5.5 Quitar o reincorporar (E-12c) — `POST /planification/routine/set-active/:id`

- **Quitar** (`active: false`) sólo apaga `active`: **la rutina conserva su `week` y su `order`** (D10). Mandar `week` u `order` junto con `active: false` responde `400`; es la regla que ya existe para `order`, extendida a `week`.
- **Reincorporar** (`active: true`) acepta `week` y `order` opcionales:
  - Sin ninguno, la rutina vuelve a su lugar.
  - Con `week` y sin `order`, va al final de esa semana.
  - Con `order`, se guarda tal cual.
  - Si la semana resultante (la que se manda o la que tenía) queda fuera de la duración actual del plan, `400`, pidiendo una semana válida. Pasa si la duración se achicó mientras la rutina estaba de baja.

### 5.6 Quitar o reincorporar en lote (E-12d) — `POST /planification/routine/set-active-bulk`

- Quitar conserva el lugar, y reincorporar devuelve cada rutina a su lugar.
- Si alguna queda fuera de la duración actual, `400` y no se aplica ninguna: es transaccional, como hoy.

### 5.7 Qué cambia respecto de la spec del 4/9

- **Ya no aplica** que el vínculo dado de baja pierde su `order` (null), ni el cálculo de un `order` nuevo al reactivar.
- **Sigue vigente:** el `order` como etiqueta con repetidos, la repetición de rutinas en un plan, la baja siempre lógica y el todo o nada de los lotes.

## 6. Reglas transversales

- **Lo dado de baja que el alumno completó se sigue viendo** (27/8): en el detalle (§4.4), en el progreso (§4.3) y en el historial (§4.7).
- **Las asignaciones de un alumno sobreviven al cierre de su cuenta** (baja lógica) y a la baja de la rutina (lógica). No se borra historial en ningún camino.
- **Las transacciones** abren la conexión adentro del `try` (BE-04). Las escrituras de varias filas (las altas en lote) son transaccionales.
- **Los 403 nuevos** usan textos distintos de `La cuenta está deshabilitada.`, que es el único que hace cerrar la sesión en el web.

## 7. Specs de CU a reescribir

Cada tarea reescribe en `Use Cases/` las specs de los CU que implementa, en el mismo movimiento que el código. Lo que no tenga tarea se hace en BE-38.

| CU | Qué cambia |
|---|---|
| E-19 | Asigna una rutina **para un día**, sin planificación. Caminos alternativos: rutina de baja, destinatario que no es alumno, duplicado (`409`) |
| E-20 | Camino alternativo nuevo: **ya entrenada → no se puede quitar** (`409`) |
| U-08 | El home combina las asignaciones individuales de la semana con el plan vigente (DB4 del bloque B: se muestran las dos). En el bloque A, sólo la parte individual |
| U-09, U-10 | Se leen **desde la asignación del día**. U-10 se resuelve dentro del mismo detalle |
| U-12 | El hecho es **por ejercicio**, no por serie: el tildado serie por serie es de la interfaz (25/8). Va en la tabla de ejecución de su vía, sin `finished` en `Exercise_Set` |
| U-13 | Pasa a ser **un camino incluido de U-12**: dejar o editar la nota de un ejercicio realizado, con el mismo endpoint. Sigue contando como CU |
| E-06, E-07 | El historial muestra la prescripción, la fecha y la nota del alumno (D7) |
| E-03 a E-07 | La precondición "alumno vinculado al coach" pasa a "gimnasio compartido" (D6). Además, en E-03 se borra la nota vieja de "no hay guards" |
| E-09, E-10 | `duration` en semanas, obligatoria; la regla del 400 al achicarla |
| E-12a a E-12d | La semana en el alta y en el lote; la baja conserva el lugar |
| E-13, E-14 | Bloque B: sin `User_Routine`, con el fin derivado (D11, D12) |

## 8. Fuera de alcance (bloque B y después)

- **CU-E-13 y CU-E-14:** asignar y quitar una planificación a un alumno. E-13 sólo crea la `User_Planification`, sin derivar instancias. E-14 apaga la `User_Planification`. Sigue pendiente DB2 (el solapamiento con un plan vigente, calculado con el fin derivado).
- **La parte del plan en U-08 y la combinación con lo individual** (DB4).
- **Marcar dentro de una planificación:** son endpoints análogos a §4.5 y §4.6 sobre `Routine_Exercise_Finished`, con la validación de que la `Routine_Asignation` sea del mismo plan.
- **Las sesiones de plan en el historial** (`source: 'plan'`).
- **La asignación individual en lote** (D13), **registrar la carga real** (D7) y **la paginación del historial.**

## 9. Tareas (reacomodo del roadmap)

| Tarea | Contenido | Esfuerzo |
|---|---|---:|
| **BE-10** (ampliada) | El modelo de §3: entidades, `ddl.py`, `01`, el patch, el Status | 4 h |
| **BE-10b** (nueva) | El refactor de E-08 a E-12d (§5): DTOs, service, Swagger y specs de CU. **Destraba las pantallas de planificaciones del web** | 4 h |
| BE-11 | E-19 y E-20 (§4.1, §4.2) | 2,5 h |
| BE-12 | El listado de un alumno (§4.3): la parte individual de U-08 | 2 h |
| BE-13 | El detalle para el alumno (§4.4), con la visibilidad propagada a los ejercicios | 3,5 h |
| BE-14 (se fusiona con BE-15) | Marcar, desmarcar y la nota (§4.5, §4.6) | 3 h |
| BE-16 | El historial (§4.7) | 3,5 h |

Son unas **22,5 h**, contra las 21 h del bloque A original: el refactor suma y la fusión de BE-14 con BE-15 resta.

**En el bloque B** desaparece DB1, DB3 queda resuelto, y E-13 y E-14 se simplifican; quedan DB2 y DB4.

**El seed de BE-21** tiene que traer asignaciones individuales con fecha (con y sin ejecuciones) y una planificación con semanas, para que BE-35 pueda probar todo en runtime.

## 10. Verificación

- **El build** (`npm --prefix power-app run build`) en cada tarea.
- **`Db Creator`:** regenerar dos veces seguidas da byte-idéntico, y el `01` coincide con las entidades columna por columna.
- **El SQL de las consultas nuevas** (el listado con su progreso, el detalle con su visibilidad, el historial con su filtro) se genera sin conectarse a la base, armando el `DataSource` con las entidades compiladas, como en BE-05.
- **Las reglas de cada endpoint** (códigos, idempotencia, dueño) se prueban con scripts sobre el código compilado y repositorios falsos.
- **El runtime** lo prueba el usuario en BE-35, contra Render regenerado y con el seed de BE-21.

## 11. Impacto en el Status, en el web y en el iOS

- **Status:** cada tarea actualiza el informe y el dashboard. Al cerrar el bloque, E-19, E-20, U-09, U-10, U-12, U-13, E-06 y E-07 pasan a ✅. U-08 pasa de 🔵 a 🟡, y llega a ✅ con la parte del plan (bloque B). Se cierra el hallazgo 2.
- **Web:**
  - Las pantallas de **rutinas** (E-15 a E-18) no cambian.
  - Las de **planificaciones** (E-08 a E-12d) esperan a BE-10b.
  - Para B2 a B6, el contrato es esta spec y el Swagger de cada tarea. **B3 se marca por ejercicio, no por serie:** el web adapta lo que esperaba.
- **iOS:** su Parte 3 (inicio, detalle de rutina, marcar y notas) se apoya en §4.3 a §4.6.

## 12. Riesgos y notas

- **El detalle de rutina nunca se ejecutó en runtime.** Usa un orden anidado de tres niveles en las opciones de búsqueda (22/8) y el alumno lo va a usar desde el primer día. Es lo primero a probar en BE-35.
- **El patch exige que las tablas de ejecución estén vacías.** Si no lo están, aborta: alguien las llenó a mano y hay que decidir qué hacer con esos datos.
- **El fin de una `User_Planification` se calcula en vivo** con la duración de la plantilla (§5.1): editar la duración lo mueve para todos. Además, `User_Planification.planification_id` es nullable con `ON DELETE SET NULL`. Como la baja de una planificación es lógica, nunca queda en null en la práctica. El bloque B puede evaluar pasarla a NOT NULL, porque sin plantilla el fin no se puede calcular.
- **Las cabezas de las relaciones del diagrama** están al revés de la notación estándar (la "pata de gallo" del lado de la PK) en todas las relaciones. Es preexistente y consistente, así que no confunde dentro del diagrama, pero conviene tenerlo presente si lo revisa la cátedra.
