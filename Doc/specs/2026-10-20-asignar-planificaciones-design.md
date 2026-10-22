# Spec — Asignar planificaciones (bloque B)

> **Fecha:** 2026-10-20 · **Bloque:** B del [roadmap del 16/10](../plans/2026-10-16-roadmap-backend.md) (fase 3, BE-17) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** la [spec del bloque A](2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md) (17/10), que dejó el esquema de ejecución de las dos vías y el refactor de planificaciones por semanas, y del diagrama de `Doc/` con los cambios de esta spec (§3), que el usuario actualizó en Miro el 20/10 y **todavía hay que exportar** a `Doc/PowerApp - Modelo DB.svg` / `.pdf`.
> **Resuelve** DB2 del roadmap. DB1 había desaparecido con D11, DB4 quedó decidida en la spec de U-08 (BE-12) y **DB3 se revierte** (D18). Revierte también **D12** del bloque A (D17).

## 1. Contexto y objetivo

El bloque A dejó completa la **asignación individual**: el coach asigna una rutina para un día, el alumno la ve, la marca y anota, y el coach ve el historial. La **planificación**, que es la vía de la mayoría de los alumnos, tiene el ABM de plantillas (E-08 a E-12d, refactorizado por semanas en BE-10b) y el esquema de ejecución (BE-10), pero **nada del lado del alumno**:

- No se puede asignar una planificación a un alumno (E-13) ni quitársela (E-14): sus rutas cuelgan.
- El alumno con plan no ve sus rutinas en el home (la parte del plan de U-08), no puede abrirlas (U-09, U-10) ni marcarlas (U-12, U-13).
- El historial del coach (E-06, E-07) sólo trae sesiones individuales (hallazgo 2).

Esta spec cierra esa vía de punta a punta, con la misma lógica que la individual: **asignar → ver → marcar → nota → historial**. De paso ajusta el modelo de `User_Planification` y agrega a las dos tablas de ejecución el día en que el alumno hizo el ejercicio.

## 2. Decisiones

Todas tomadas con el usuario entre el 18/10 y el 20/10. La numeración sigue la del bloque A.

| # | Decisión | Por qué |
|---|---|---|
| D15 | **Las semanas son explícitas y lineales.** La semana N del plan es la N-ésima semana desde el inicio; una semana sin rutinas cargadas se muestra vacía. **No hay repetición cíclica** | El único de `Routine_Exercise_Finished` (asignación, rutina del plan, ejercicio) permite **una** ejecución por rutina de cada semana. Repetir semanas obligaba a sumar la semana ejecutada al único. Para cargar rápido está `assign-bulk` por semana; un "copiar semana" sería del web |
| D16 | **La semana 1 es la semana de lunes a domingo que contiene `start_date`**, sea el día que sea | El home pide de lunes a domingo: así cada semana del calendario es exactamente una semana del plan. El inicio guarda el día real |
| D17 | **`User_Planification` vuelve a tener `end_date`** (`DATE NOT NULL`). En E-13 es **opcional**: si no viene, es el domingo de la semana `duration`; si la plantilla tiene duración 0, es **obligatorio**. Queda guardado: **editar la duración de la plantilla ya no mueve el fin de nadie** | Revierte D12. Con el fin guardado, el solapamiento se calcula sobre una fecha fija. Como es NOT NULL, **no existe un plan sin fin**: la duración 0 de la plantilla pasa a significar "el fin lo fija cada asignación" |
| D18 | **`User_Planification` pierde `description`, `type` y `number_of_routines`.** La cabecera del plan (nombre, descripción, tipo, duración) se lee siempre de la plantilla | Copiarlas al asignar mezclaba una foto con datos en vivo (las rutinas y el nombre se leen de la plantilla). Revierte DB3 (que había dejado `number_of_routines` NOT NULL en BE-10) |
| D19 | **`planification_id` y `coach_id` pasan a NOT NULL, con `ON DELETE RESTRICT`** (hoy nullable con `SET NULL`) | Sin plantilla no hay rutinas ni nombre. `coach_id` siempre tiene valor (D20). Las bajas de plantilla y de coach son lógicas, así que el `RESTRICT` nunca se dispara: respalda desde la base |
| D20 | **Sólo el coach asigna una planificación (E-13).** `coach_id` sale del token. Quitarla (E-14), listarlas y la rutina individual (E-19, E-20) siguen abiertos a coach y admin | `Coach.id` es el id del usuario y el admin no tiene fila en `Coach`: con el admin, la FK fallaría. E-13 es el único lugar que guarda quién asignó |
| D21 | **Solapamiento: `409` con los planes que se pisan; reenviando `confirm_overlap: true`, se crea y los dos conviven** (el home muestra los dos). Para reemplazar, el coach quita el viejo (E-14) | Es el "advierte y solicita confirmación" del CU, sin estado en el servidor. Resuelve DB2 |
| D22 | **Una asignación no se edita.** Para cambiar sus fechas, el coach la quita y asigna de nuevo | Ningún CU lo pide. Se retira el andamiaje `POST /planification/user/edit/:id` |
| D23 | **E-14 es `set-active` en los dos sentidos**, como el resto de las bajas lógicas. Pedir el estado que ya tiene da `400`. Reactivar no vuelve a chequear solapamiento | Mismo patrón que E-11, E-12c, E-18 y E-24. El `400` cumple el "informa que no hay nada que quitar" del CU. Al reactivar, el peor caso es convivir, que D21 ya admite |
| D24 | **Una asignación dada de baja queda congelada:** el alumno puede leer el detalle, pero marcar, desmarcar y anotar dan `400`. Sale del home y sigue en el historial | La baja retira el plan; lo hecho es historia y no se reescribe |
| D25 | **Las dos tablas de ejecución suman `finished_at` (`DATE NOT NULL`): el día en que el alumno hizo el ejercicio.** Lo manda el cliente al marcar (obligatorio al crear la marca) y se puede corregir. En el historial, el `finished_at` de cada ejercicio pasa a ser ese día | Permite marcar en diferido: lo que se hizo el lunes y se marcó el miércoles queda el lunes. Va en las dos vías por la "misma lógica" de D1, y así el campo del historial tiene un solo significado. El servidor nunca calcula "hoy" |
| D26 | **La fecha de una sesión del plan en el historial es el `finished_at` más viejo de sus ejercicios** | La vía del plan no tiene un día asignado. La individual sigue usando el día de la asignación |
| D27 | **`planification/` tiene la gestión del coach (E-13, E-14, el listado); `routine/` tiene lo que el alumno ve y ejecuta (el home del plan, el detalle, marcar y desmarcar) y el historial** | En `routine/` están los builders del árbol y los helpers de la vía individual. Así no hay dependencias entre módulos |
| D28 | **La parte del plan del home es un endpoint aparte**, agrupado por asignación y semana. **Las rutinas del plan no tienen día**, sólo semana y orden | `GET /routine/assigned/:userId` no cambia de forma. El "ordenadas por día" de U-08 queda para las individuales. **Complementada el 21/10** ([spec del home](2026-10-21-home-del-alumno-design.md), D31): el home junta las dos fuentes en `GET /routine/home/:userId`, y esta ruta y `assigned/:userId` siguen como están |
| D29 | **La regla de visibilidad del 27/8 se extiende a la rutina del plan:** una `Routine_Asignation` dada de baja se le muestra al alumno sólo si hizo algo en ella, y sólo lo que hizo | Es la regla del circuito sacado de la rutina, un nivel más arriba |
| D30 | **El bloque B se parte en siete tareas** (§9): el modelo, E-13, E-14, el home, el detalle, marcar y el historial | Cada una con su commit, como en el bloque A |

**Convención de fechas (sin cambios):** todas son días sin hora y viajan en la API como `"yyyy-mm-dd"` (las valida `IsCalendarDay`). La base las guarda como `DATE`, sin formato; mostrarlas como `dd-mm-yyyy` es del cliente.

## 3. Modelo (BE-18)

| Tabla | Cambio |
|---|---|
| `User_Planification` | **−** `description` · **−** `type` · **−** `number_of_routines` · **+** `end_date DATE NOT NULL` · `planification_id` pasa a **NOT NULL** con FK **`ON DELETE RESTRICT`** · `coach_id` pasa a **NOT NULL** con FK **`ON DELETE RESTRICT`** |
| `Routine_Exercise_Finished` | **+** `finished_at DATE NOT NULL`. `created_at` se queda: es cuándo se registró la marca |
| `Routine_Asign_Exercise_Finished` | **+** `finished_at DATE NOT NULL` |

**Lo que no cambia:** los únicos (`uk_ref_plan_asignation_exercise`, `uk_raef_asign_exercise`) y las FK de las tablas de ejecución. Ninguna tabla nueva referencia `Routine_Exercise`, así que `editCircuit` y el invariante de A-06 no se tocan.

**Regla que la base no garantiza** (ya estaba en el bloque A): en `Routine_Exercise_Finished`, la `Routine_Asignation` tiene que ser de la misma planificación que la `User_Planification`. La valida el service en cada operación sobre una sesión del plan (§5.4).

**Código:**
- `UserPlanification`, `RoutineExerciseFinished` y `RoutineAsignExerciseFinished` cambian. `user_note` de `RoutineExerciseFinished` pasa a `string | null` con `type: 'varchar'`, como su gemela de la vía individual (BE-14).
- Se borran los comentarios de D12 en las entidades.
- **La vía individual se adapta en la misma tarea** (§5.7): con `finished_at` NOT NULL, marcar sin mandarlo fallaría en la base.

**`Db Creator`:**
- `ddl.py` y `01_estructura.sql` regenerados.
- `02` y `03` no cambian: ningún generador inserta en estas tablas (verificado con grep el 20/10).
- La regeneración tiene que quedar byte-idéntica en dos corridas, y el `01` coincidir con las entidades y con el diagrama exportado.

**Patch para la base viva** (`Db Creator/patches/`), idempotente y documentado, como el de BE-10:
- **Aborta** si `User_Planification` o `Routine_Exercise_Finished` tienen filas: ningún endpoint las escribe todavía.
- **Completa `Routine_Asign_Exercise_Finished`**, que sí puede tener filas de las pruebas de BE-14: `finished_at` = el día de `created_at` en hora de Argentina (`(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`). Es la mejor aproximación del día en que se hizo.
- **Aplica el resto** de los cambios de las tres tablas.

## 4. Las semanas del plan

Con D15 y D16, todo se calcula a partir de `start_date`, sin que el servidor sepa qué día es hoy:

- **Lunes de inicio** = el lunes de la semana que contiene `start_date`.
- **Semana N** = de `lunes de inicio + 7·(N−1)` a ese día `+ 6` (domingo).
- **Fin por defecto** = `lunes de inicio + 7·duration − 1`, el domingo de la semana `duration`.
- **Última semana** = la que contiene `end_date`.

**Ejemplo:** una plantilla de 4 semanas asignada con `start_date = 2026-10-22` (jueves) arranca el lunes 19/10. Semana 1: 19 al 25/10; semana 2: 26/10 al 1/11; semana 3: 2 al 8/11; semana 4: 9 al 15/11. Sin `end_date` en el body, el fin es el **2026-11-15**. Dura tres semanas y media, porque arrancó un jueves.

- Si el coach manda un `end_date` que no es domingo, la última semana se corta ahí.
- Si manda un fin **más corto** que la duración, las semanas posteriores no aparecen en el home. Si lo manda **más largo**, las semanas sin rutinas vienen vacías.
- **Una `Routine_Asignation` pertenece a una semana del plan** por su `week`. Si el coach la reincorpora en otra semana (E-12c), lo que el alumno hizo se muda con ella, porque cuelga de la `Routine_Asignation`.

**Implementación:** las cuentas se hacen sobre los strings `yyyy-mm-dd` interpretados en UTC (`'2026-10-22T00:00:00Z'`), nunca con `new Date()` local, para que la zona horaria del servidor no corra un día.

## 5. Contrato

**Convenciones** (las del bloque A): los ids se comparan en minúscula, los handlers llaman al service con `await`, las transacciones abren la conexión dentro del `try`, los `403` nuevos no usan el texto `La cuenta está deshabilitada.`, y cada endpoint declara en el Swagger su respuesta y sus códigos.

| Método | Ruta | Roles | CU |
|---|---|---|---|
| `POST` | `/planification/user/assign` | coach | E-13 |
| `POST` | `/planification/user/set-active/:id` | coach, admin | E-14 |
| `GET` | `/planification/user/:userId` | user (`@Owner('userId')`), coach, admin | E-14 (paso 1) |
| `GET` | `/routine/assigned-plan/:userId` | user (`@Owner('userId')`), coach, admin | U-08 (parte del plan) |
| `GET` | `/routine/assign-plan/:userPlanificationId/:routineAsignationId` | user (dueño), coach, admin | U-09, U-10 |
| `POST` | `/routine/assign-plan/:userPlanificationId/:routineAsignationId/finished` | user (dueño) | U-12, U-13 |
| `DELETE` | `/routine/assign-plan/:userPlanificationId/:routineAsignationId/finished/:routineExerciseId` | user (dueño) | U-12 |
| `GET` | `/routine/history/:userId` | coach, admin | E-06, E-07 (suma las sesiones del plan) |

**Se retiran** los andamiajes `GET /planification/user/:id/active`, `POST /planification/user/edit/:id` y `DELETE /planification/user/:id`.

**"Dueño"** es lo mismo que en el bloque A: la `User_Planification` tiene que ser del alumno del token. El chequeo va en el service y, si falla, `403`.

**Forma de una asignación** (la usan E-13, E-14 y el listado):

```
{ id, user_id, coach_id, planification_id, start_date, end_date, coach_note, active,
  created_at, updated_at,
  planification: { id, name, duration, active } }
```

Nunca trae un estado calculado ("vigente", "vencida"): el cliente lo deduce de las fechas.

### 5.1 Asignar — `POST /planification/user/assign` (E-13)

Body: `{ planification_id, user_id, start_date, end_date?, coach_note?, confirm_overlap? }`. `coach_note` tiene hasta 100 caracteres.

Validaciones, en este orden:

| Código | Caso |
|---|---|
| `400` | `end_date` anterior a `start_date` |
| `403` | El coach del token no tiene fila en `Coach` (la inconsistencia que arregla BE-27): `Tu usuario no está registrado como entrenador.` |
| `404` | La planificación no existe |
| `400` | La planificación está dada de baja |
| `400` | La planificación no tiene rutinas vigentes (precondición del CU) |
| `400` | La planificación tiene duración 0 y no vino `end_date`: `La planificación no tiene duración fija: indicá la fecha de fin.` |
| `404` | El usuario no existe |
| `400` | El destinatario no es alumno o tiene la cuenta cerrada (mismo criterio que E-19) |
| `409` | El alumno tiene otra asignación **activa** cuyo rango se pisa con el nuevo (los dos extremos inclusivos), y no vino `confirm_overlap: true` |

- **El `409`** trae `{ error: 'El alumno ya tiene una planificación en esas fechas. Reenviá con confirm_overlap: true para asignarla igual.', overlapping: [ <asignación>, … ] }`, así el web puede mostrar cuáles se pisan y ofrecer quitarlas.
- **`start_date` puede ser pasada o futura**, igual que en E-19.
- **`201`** con la asignación creada.
- **Una sola escritura**, así que no hay transacción. Dos altas simultáneas del mismo alumno pueden saltearse el aviso y quedar conviviendo: se acepta, porque D21 ya admite convivir.

### 5.2 Quitar o reincorporar — `POST /planification/user/set-active/:id` (E-14)

Body: `{ active: boolean }`.

| Código | Caso |
|---|---|
| `404` | No existe |
| `400` | Ya está en ese estado: `La planificación del alumno ya está dada de baja.` / `La planificación del alumno ya está activa.` |

- **Quitar** apaga `active`. No hay nada que cascadear (D11). El plan sale del home, y lo que el alumno hizo sigue en el historial.
- **Reincorporar** prende `active` sin volver a chequear solapamiento (D23).
- **`200`** con la asignación.

### 5.3 Planes de un alumno — `GET /planification/user/:userId?include_inactive=`

- `404` si el usuario no existe.
- **`200`** con las asignaciones del alumno, de la más nueva a la más vieja (`start_date` descendente y después `created_at`).
- Por defecto, sólo las activas; con `include_inactive=true`, todas. Es el mismo parámetro que los listados de plantillas.

### 5.4 Reglas comunes a una sesión del plan

Una **sesión del plan** es el par (`User_Planification`, `Routine_Asignation`): una rutina de una semana del plan, para ese alumno. Es la unidad que el alumno abre y marca, el equivalente de la asignación individual.

Validaciones de las tres operaciones (§5.6 a §5.8), en este orden:

| Código | Caso |
|---|---|
| `404` | La `User_Planification` no existe: `Asignación no encontrada` |
| `403` | Con el rol `user`, la asignación es de otro alumno (el mismo texto del bloque A: `No podés acceder a una rutina asignada a otro alumno.`) |
| `404` | La `Routine_Asignation` no existe o no es de la planificación de esa asignación: `La rutina no pertenece a esta planificación.` |

**Visibilidad (D29):** una `Routine_Asignation` activa se ve entera. Una **dada de baja** se ve sólo si el alumno completó algo en ella en esta asignación, y sólo lo que completó, como un circuito que el coach sacó de la rutina. Si no completó nada, para el alumno no existe.

**Lo que sigue igual que en la vía individual:** una plantilla dada de baja (E-11) o una rutina dada de baja (E-18) se siguen viendo y ejecutando, con su `active: false` como dato informativo. Y no hay ventana de fechas (D5): se puede marcar una semana pasada, futura o de un plan que ya terminó.

### 5.5 El plan en el home — `GET /routine/assigned-plan/:userId?from=&to=` (U-08)

> **21/10:** el home del alumno pide las dos fuentes juntas en `GET /routine/home/:userId?date=&week=` ([spec del home](2026-10-21-home-del-alumno-design.md), BE-20e). Esta ruta sigue igual: el coach la usa sin filtro para ver el plan entero, y el home reutiliza su helper.

- `from` y `to` son opcionales, inclusivos y en formato día. Si `from > to`, `400`. `404` si el usuario no existe.
- El home lo pide con el lunes y el domingo de la semana, igual que `GET /routine/assigned/:userId`. El cliente hace los dos pedidos y muestra las dos fuentes juntas.

**Qué devuelve:** de cada asignación **activa** del alumno, las semanas del plan (de la 1 a la que contiene `end_date`) que se pisan con `[from, to]`. Sin filtro, todas las semanas de todas sus asignaciones activas: le sirve al alumno para volver a una semana pasada y al coach para ver el plan entero. Una semana sin rutinas visibles viene con `routines: []`.

**`200`** con un array de grupos, ordenado por `week_start`, nombre de la planificación y alta de la asignación:

```
{ user_planification: { id, start_date, end_date, coach_note,
                        planification: { id, name, duration, active } },
  week, week_start, week_end,
  routines: [ { routine_asignation_id, order, active,
                routine: { id, name, active },
                progress: { finished, total } } ] }
```

- **`routines`** son las `Routine_Asignation` de esa semana visibles para el alumno (§5.4), ordenadas por `order` y alta (el desempate que ya existe).
- **`progress`** es el de §4.3 del bloque A, sobre `Routine_Exercise_Finished` de esa sesión. `total` son los ejercicios que el alumno ve en el detalle: los activos de los circuitos activos, más los dados de baja que completó. En una rutina quitada del plan sólo se ve lo completado, así que `finished = total`.
- **`week_start` y `week_end`** son el lunes y el domingo de esa semana del plan, aunque el plan arranque o termine a mitad de semana.

### 5.6 Detalle — `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId` (U-09, U-10)

- Las validaciones de §5.4, más `404` si la `Routine_Asignation` está dada de baja y el alumno no completó nada en ella.
- Se lee también si la asignación está dada de baja (D24).

**`200`**:

```
{ user_planification_id, routine_asignation_id, week, order, active,
  routine: <árbol idéntico al de GET /routine/:id>,
  finished: [ { routine_exercise_id, user_note, finished_at, created_at, updated_at } ] }
```

- `active` es el de la `Routine_Asignation`.
- **El árbol se arma con los mismos builders** que la vía individual, con la visibilidad del 27/8. En una rutina quitada del plan se arma como si todos sus vínculos estuvieran dados de baja, así sólo aparece lo completado.

### 5.7 Marcar, y dejar o editar la nota — `POST /routine/assign-plan/:userPlanificationId/:routineAsignationId/finished` (U-12, U-13)

Body: `{ routine_exercise_id, finished_at?, user_note? }`. `finished_at` es un día; `user_note`, hasta 100 caracteres, y la cadena vacía la borra.

Las validaciones de §5.4, y después:

| Situación | Resultado |
|---|---|
| La asignación está dada de baja (D24) | `400`: `La planificación fue quitada: no se puede modificar.` |
| **No estaba marcado** y no vino `finished_at` | `400`: `Indicá el día en que hiciste el ejercicio (finished_at).` |
| El ejercicio no pertenece a la rutina | `400` (mismo texto que en el bloque A) |
| **No estaba marcado** y el ejercicio, su vínculo o la `Routine_Asignation` están dados de baja | `400`: no se puede marcar algo que el coach sacó |
| **No estaba marcado** | Crea la fila con `finished_at` y la nota si viene: **`201`** |
| **Ya estaba marcado** | Actualiza `finished_at` y la nota sólo si vienen y cambian (la nota vacía → `null`): **`200`**. Sin cambios también es `200` (idempotente) |
| Dos marcas simultáneas chocan contra `uk_ref_plan_asignation_exercise` | Se relee la fila y se sigue como "ya estaba marcado": **`200`** |

Respuesta: `{ routine_exercise_id, user_note, finished_at, created_at, updated_at }`.

**La vía individual se adapta igual** (BE-18): `POST /routine/assign-user/:id/finished` acepta `finished_at` con las mismas reglas (obligatorio al crear, corregible después), y su respuesta y el `finished[]` de su detalle suman `finished_at`. **Es un cambio de contrato:** un cliente que ya marque sin mandar `finished_at` recibe `400`.

`finished_at` no se valida contra ninguna fecha: el servidor no sabe qué día es hoy, y no hay ventana (D5).

### 5.8 Desmarcar — `DELETE /routine/assign-plan/:userPlanificationId/:routineAsignationId/finished/:routineExerciseId` (U-12)

- Las validaciones de §5.4, y `400` si la asignación está dada de baja (D24).
- Borra la fila y su nota. Es idempotente: si no estaba marcado, también `200`.
- Se puede desmarcar algo que el coach sacó después (el ejercicio, el vínculo o la rutina del plan).

**`200`**: `{ routine_exercise_id, finished: false }`.

### 5.9 Historial — `GET /routine/history/:userId?exercise_id=` (E-06, E-07)

El endpoint de BE-16 suma las **sesiones del plan con al menos un ejercicio hecho**, en la misma lista y ordenadas con las individuales: por `date` descendente, después por nombre de rutina y después por alta (de la asignación individual, o de la `User_Planification` y la `Routine_Asignation`).

Cada sesión es de uno de dos tipos, según `source`:

```
{ source: 'individual', assignment_id, date,
  routine: { id, name }, exercises: [ … ] }

{ source: 'plan', user_planification_id, routine_asignation_id, week, date,
  planification: { id, name }, routine: { id, name }, exercises: [ … ] }
```

- **Las sesiones del plan no traen `assignment_id`.** Las individuales no cambian.
- **`date`:** en una individual, el día de la asignación (como hoy). En una del plan, el `finished_at` más viejo de los ejercicios que se devuelven (D26). Con `exercise_id`, es el día en que hizo ese ejercicio.
- **`exercises`** tiene la misma forma en las dos, salvo que **`finished_at` pasa a ser el día en que el alumno hizo el ejercicio** (`"yyyy-mm-dd"`), en lugar del momento en que lo marcó. Cambia el tipo de un campo de BE-16; lo hace BE-18, junto con la columna. Los ejercicios de una sesión se ordenan por `finished_at` y después por `created_at`.
- **Lo dado de baja aparece igual**, incluidas las asignaciones quitadas (E-14) y las rutinas quitadas del plan (E-12c).
- `sets` sigue siendo la prescripción actual (D7).

## 6. Qué cambia respecto del bloque A

- **D12 se revierte:** el fin se guarda (D17). Ya no aplica la consecuencia de §5.1 del bloque A ("editar la duración mueve el fin de todos los alumnos que la tienen asignada"). La regla del `400` al achicar la duración por debajo de una semana en uso sigue vigente.
- **DB3 se revierte:** `number_of_routines` sale de `User_Planification` (D18).
- **El "hecho" tiene día** (D25), y el `finished_at` del historial cambia de significado y de tipo.
- **Marcar en la vía individual pide `finished_at`** al crear la marca.
- **Siguen vigentes:** las dos vías de ejecución separadas (D1), el hecho por ejercicio con la nota en la misma fila (D3), la ausencia de ventana de fechas (D5), el gimnasio compartido (D6), la prescripción en el historial (D7) y la eliminación de `User_Routine` (D11).

## 7. Specs de CU a reescribir

Cada tarea reescribe en `Use Cases/` las de los CU que toca.

| CU | Qué cambia | Tarea |
|---|---|---|
| E-13 | Sin `User_Routine`: crea sólo la asignación. El fin es opcional y se calcula de la plantilla; con duración 0 es obligatorio. Sólo el coach. Caminos alternativos: plantilla de baja o sin rutinas, destinatario que no es alumno, solapamiento con confirmación | BE-18b |
| E-14 | Sin `User_Routine`: sólo apaga la asignación. Camino alternativo nuevo: reincorporar. La asignación quitada queda congelada para el alumno | BE-19 |
| U-08 | La parte del plan: las rutinas de la semana del plan, sin día, con su progreso. Lo individual sigue ordenado por día | BE-20 |
| U-09, U-10 | La asignación puede ser una sesión del plan. Visibilidad de la rutina quitada del plan | BE-20b |
| U-12, U-13 | El día en que se hizo (`finished_at`), obligatorio al marcar y corregible. En el plan, la asignación quitada no se puede modificar | BE-18 (vía individual) y BE-20c (plan) |
| E-06, E-07 | Las sesiones del plan y su fecha. `finished_at` es el día en que se hizo | BE-18 y BE-20d |

## 8. Fuera de alcance

- **Editar una asignación** (D22) y **reemplazar** un plan en una sola operación (D21).
- **La repetición cíclica de semanas** (D15) y un **"copiar semana"** en el backend.
- **Registrar la carga real** (D7) y **la paginación del historial**.
- **El seed:** BE-21 tiene que traer una planificación con semanas, asignaciones de plan (vigente, futura y quitada) y ejecuciones con `finished_at`, además de las individuales.

## 9. Tareas (reacomodo del roadmap)

| Tarea | Contenido | Estado de CU | Esfuerzo |
|---|---|---|---:|
| **BE-18** (ampliada) | El modelo de §3: entidades, `ddl.py`, `01`, el patch. **La vía individual con `finished_at`** (§5.7 y §5.9): marcar, detalle e historial | — | 3,5 h |
| **BE-18b** (nueva) | E-13 (§5.1) | E-13 🔵 → ✅ | 3 h |
| BE-19 | E-14 (§5.2), el listado (§5.3) y el retiro de los tres andamiajes | E-14 🔵 → ✅ | 2,5 h |
| BE-20 | El plan en el home (§5.5) | U-08 🟡 → ✅ | 3 h |
| **BE-20b** (nueva) | El detalle de una sesión del plan (§5.6) | — | 2 h |
| **BE-20c** (nueva) | Marcar, la nota y desmarcar en el plan (§5.7, §5.8). **Cierra la escritura del hallazgo 2** | — | 2 h |
| **BE-20d** (nueva) | Las sesiones del plan en el historial (§5.9). **Cierra el hallazgo 2** | — | 2 h |
| **BE-20e** (nueva, 21/10) | El home en un solo pedido ([spec del home](2026-10-21-home-del-alumno-design.md)) | — (U-08 ya ✅) | 2 h |

- Son **18 h**, contra las 11,5 h que el roadmap le daba a BE-18, BE-19 y BE-20. La diferencia son las tres piezas de ejecución del plan, que el roadmap no tenía, y la adaptación de la vía individual.
- **U-09, U-10, U-12, U-13, E-06 y E-07 ya están ✅** (lo fijó la spec del bloque A para su cierre), así que BE-20b a BE-20d no mueven conteos. Al terminar el bloque: **68 ✅, 6 🟡, 0 🔵**, y H3 cumplido.
- **BE-18 va antes de regenerar la base (BE-23, ~1/11)**, y necesita el diagrama exportado.

## 10. Verificación

- **Build** (`npm --prefix power-app run build`) en cada tarea.
- **`Db Creator`:** regenerar dos veces da byte-idéntico, y el `01` coincide columna por columna con las entidades y con el diagrama exportado.
- **Las cuentas de semanas** (§4) se prueban con un script aparte: inicio en cada día de la semana, fin por defecto, fin manual corto y largo, duración 0.
- **El SQL de las consultas nuevas** (el solapamiento, el home con su progreso, el historial con las dos fuentes) se genera sin base, con el `DataSource` armado sobre las entidades compiladas, como en el bloque A.
- **Las reglas de cada endpoint** (códigos, dueño, congelado, idempotencia, la carrera de marcar) se prueban con repositorios falsos sobre el código compilado.
- **El runtime** lo prueba el usuario en BE-35, contra Render regenerado y con el seed de BE-21.

## 11. Impacto en el Status, en el web y en el iOS

- **Status:** cada tarea actualiza el informe y el dashboard, con el porqué de cada decisión. BE-18 corrige las notas de D12 y de DB3 que dejó BE-10. BE-20d cierra el hallazgo 2.
- **Web:**
  - **B7** (asignar y quitar planificaciones) tipa contra §5.1 a §5.3. **B1** (el plan en el home) contra §5.5. Las pantallas de rutina del alumno reutilizan el árbol y el cruce por `routine_exercise_id` de la vía individual.
  - **Dos cambios de contrato en lo ya publicado** (BE-18): marcar pide `finished_at` al crear la marca (B3), y el `finished_at` del historial pasa a ser un día (B6). Conviene avisar antes del deploy.
- **iOS:** su Parte 3 (inicio, detalle, marcar y notas) suma la vía del plan con los mismos componentes, y tiene que mandar `finished_at` al marcar.

## 12. Riesgos y notas

- **El diagrama exportado manda.** El de `Doc/` es del 17/10. Sin el SVG y el PDF nuevos, BE-18 no puede verificar el `01` contra el modelo.
- **En el borrador de Miro del 20/10**, la tercera marca de tiempo de `Routine_Exercise_Finished` dice `updated_atld` y `finished_at` figura como `Datetime`. Esta spec toma `created_at` y `DATE`, como se acordó; conviene corregir el dibujo antes de exportar.
- **El cambio de contrato de marcar** rompe a cualquier cliente que ya marque en la vía individual. Ningún cliente lo usaba al 10/10 (Status web), pero hay que confirmarlo antes del deploy de BE-18.
- **Las asignaciones que conviven** (D21) se muestran todas en el home. Si se acumulan planes viejos sin quitar, el alumno ve todos los que se pisan con la semana: la limpieza es E-14.
- **Una rutina del plan en una semana posterior al fin** (fin manual más corto que la duración) no aparece nunca en el home, pero se puede abrir y marcar por su ruta (D5). Es un caso de borde que no merece una regla propia.
- **`routine.service.ts` crece** de ~1.700 a ~2.300 líneas. Los helpers de progreso y de visibilidad se generalizan para las dos vías; no se agrega un service nuevo.
