# Spec — El detalle de una sesión del plan (U-09, U-10)

> **Fecha:** 2026-10-22 · **Tarea:** **BE-20b** de la [spec del bloque B](2026-10-20-asignar-planificaciones-design.md) (§9) · **Estado:** diseño aprobado el 22/10 · [plan](../plans/2026-10-22-be-20b-detalle-de-una-sesion-del-plan-plan.md)
> **Depende de:** BE-13 (`GET /routine/assign-user/:id`, sus builders y la visibilidad del 27/8), **BE-20** (el bloque `user_planification` del home, `plan_weeks.ts` y D29) y BE-20e (no cambia nada: el home ya entrega el par de ids).
> **Complementa** a §5.4 y §5.6 del bloque B: cierra dos huecos de la respuesta y fija lo que §5.6 dejaba abierto. No revierte nada.

## 1. Contexto y objetivo

Una **sesión del plan** es el par (`User_Planification`, `Routine_Asignation`): una rutina de una semana del plan, para ese alumno (§5.4 del bloque B). El home (BE-20e) la lista con su progreso, y el alumno la abre para ver la rutina y lo que ya hizo, que es U-09 con U-10 incluido. Es el equivalente de `GET /routine/assign-user/:id` (BE-13) en la vía de la planificación.

§5.6 ya fija la ruta, los roles, las validaciones de §5.4 y el árbol con los mismos builders. Al revisarla con el usuario (22/10) aparecieron dos huecos y un punto abierto:

- **La respuesta no dice si la asignación está quitada** (D24). El cliente se enteraría recién con el `400` de marcar.
- **La respuesta no trae el `active` de la plantilla**, que §5.4 promete como dato informativo. El de la rutina sí viene, dentro del árbol.
- **El `404` de la rutina quitada sin nada hecho** no tiene texto ni dice si vale para todos los roles.

## 2. Decisiones

Tomadas con el usuario el 22/10. La numeración sigue la de la [spec del home](2026-10-21-home-del-alumno-design.md).

| # | Decisión | Por qué |
|---|---|---|
| D37 | **La respuesta trae el bloque `user_planification` del home más su `active`, y la semana con `week_start` y `week_end`**, en lugar de sólo `user_planification_id` | Cumple §5.4 (la plantilla dada de baja se ve con `planification.active: false`) y D24 (el cliente deshabilita marcar sin esperar el `400`). La pantalla se arma sola, sin depender de dónde vino el cliente: el home, un link directo, el coach desde el historial (BE-20d) o una pantalla vieja. El front reutiliza el tipo del bloque que ya tipa para el home. Cuesta un join con `Planification` en la consulta de la asignación |
| D38 | **Una rutina quitada del plan (E-12c) en la que el alumno no hizo nada da `404` para todos los roles**, con su propio texto: `La rutina fue quitada de la planificación.` | Es el "para el alumno no existe" de D29. El coach y el admin ven lo mismo que el alumno, como en el detalle individual, donde lo dado de baja se arma con lo que hizo el alumno, pida quien pida. El texto propio le permite al cliente explicar qué pasó (típicamente, un home viejo) en lugar de mostrar un error genérico. Reusar el de "no pertenece" engañaría: la rutina sí es del plan |
| D39 | **Las validaciones de §5.4 se implementan una sola vez**, en un helper que comparten el detalle (BE-20b) y marcar y desmarcar (BE-20c). El `403` sale cuando el rol es `user` y la asignación es de otro alumno | Son las mismas tres validaciones en las tres operaciones: así no se copian tres veces. Para el detalle es exactamente §5.4 (coach y admin abren la de cualquiera, D6). Para marcar y desmarcar, que sólo admiten el rol `user`, equivale a "dueño". Es el patrón de `checkExerciseIsMarkable`: devuelve el resultado o `{ status, error }` |

## 3. Contrato — `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId` (U-09, U-10)

| Rol | Qué puede pedir |
|---|---|
| `user` | Sólo las sesiones de sus asignaciones: el dueño se chequea en el service, porque el path no trae el id del alumno y no alcanza con `@Owner` |
| `coach`, `admin` | Las de cualquier alumno (gimnasio compartido, D6) |

**Validaciones**, en este orden (§5.4 más D38):

| Código | Caso | Texto |
|---|---|---|
| `400` | Alguno de los ids no es un UUID (DTO) | El del validador |
| `404` | La `User_Planification` no existe | `Asignación no encontrada` |
| `403` | Con el rol `user`, la asignación es de otro alumno | `No podés acceder a una rutina asignada a otro alumno.` (el del bloque A) |
| `404` | La `Routine_Asignation` no existe o no es de la planificación de esa asignación | `La rutina no pertenece a esta planificación.` |
| `404` | La `Routine_Asignation` está dada de baja y el alumno no completó nada en ella en esta asignación, con cualquier rol (D38) | `La rutina fue quitada de la planificación.` |

- El `403` va antes del segundo `404`: un alumno no puede averiguar qué hay en los planes de otro.
- Como el resto de las lecturas del alumno, no mira el rol ni la cuenta del dueño, sólo que la asignación exista.

**`200`**:

```
{ user_planification: { id, start_date, end_date, coach_note,
                        planification: { id, name, duration, active },
                        active },
  routine_asignation_id, week, week_start, week_end, order, active,
  routine: <árbol idéntico al de GET /routine/:id>,
  finished: [ { routine_exercise_id, user_note, finished_at, created_at, updated_at } ] }
```

- **`user_planification`** es el bloque de los grupos del home (`assigned-plan/:userId` y `home/:userId`) **más `active`**, que es `false` si el coach quitó la asignación (E-14). Entonces la sesión está congelada (D24): se lee, pero marcar, desmarcar y anotar dan `400` (BE-20c).
- **`active`**, en la raíz, es el de la `Routine_Asignation`: `false` si el coach la quitó del plan (E-12c).
- **`week`** es el de la `Routine_Asignation`. **`week_start` y `week_end`** son el lunes y el domingo de esa semana del plan (las cuentas de `plan_weeks.ts`), aunque el plan arranque o termine a mitad de semana, o la semana caiga después del `end_date`.
- **`routine`** se arma con los mismos builders que el detalle individual:
  - **Con la `Routine_Asignation` activa:** los circuitos y ejercicios activos, más los dados de baja que el alumno completó en esta sesión. De un circuito que el coach sacó de la rutina se ven sólo los ejercicios completados (la visibilidad del 27/8).
  - **Con la `Routine_Asignation` quitada del plan** (y algo hecho): como si todos sus vínculos estuvieran dados de baja. Cada circuito aparece sólo si tiene algo completado, y de él sólo lo completado.
  - En los dos casos, **los ejercicios del árbol, sin repetir ids, son el `total` que el home da para esa sesión**.
- **`finished`** son las filas de `Routine_Exercise_Finished` de la sesión, por `created_at` y después por `routine_exercise_id`, con la misma forma que en la vía individual. El cliente las cruza con el árbol por `routine_exercise_id`.

**Desplegado, de afuera hacia adentro, cada `active` dice:**

| Campo | De qué es | `false` significa |
|---|---|---|
| `user_planification.active` | La asignación | El coach la quitó (E-14): la sesión está congelada (D24) |
| `user_planification.planification.active` | La plantilla | La dio de baja (E-11). Informativo: se sigue ejecutando |
| `active` | La `Routine_Asignation` | La quitó del plan (E-12c): sólo se ve lo completado |
| `routine.active` | La rutina | La dio de baja (E-18). Informativo: se sigue ejecutando |

## 4. Lo que sigue igual que en §5.4 y §5.6

- La ruta, los roles y las tres validaciones de §5.4, en su orden.
- **Se lee también si la asignación está quitada** (D24).
- **Una plantilla o una rutina dadas de baja** se siguen viendo, con su `active: false` como dato informativo.
- **Sin ventana de fechas** (D5): una sesión de una semana pasada, futura o posterior al `end_date` se abre igual (§12 del bloque B).
- **El árbol** es el de `GET /routine/:id`, con los mismos builders que la vía individual.
- **El home no cambia:** el par `user_planification.id` + `routine_asignation_id` de cada rutina de un grupo abre esta ruta (§4.4 de la spec del home).

## 5. Implementación

**Dónde:** `routine/` (D27), en `routine.controller.ts` y `routine.service.ts`, más dos DTOs en `dtos/routine/`. No cambian las entidades, `routine.module.ts` (los repositorios de `User_Planification`, `Routine_Asignation` y `Routine_Exercise_Finished` ya están registrados desde BE-20) ni `Db Creator`.

**DTOs:**
- **Los params**, con `userPlanificationId` y `routineAsignationId` (`IsUUID('all')`, como `AssignedFinishedParamsDto`). BE-20c los reutiliza, y el desmarcar les suma `routineExerciseId`.
- **La respuesta:** el bloque extiende `RoutineAssignedPlanUserPlanificationDto` (BE-20) con `active`, y reutiliza `RoutineDetailResponseDto` y `RoutineAssignedFinishedDto`.

**`findPlanSession(userPlanificationId, routineAsignationId, currentUser)`** (D39), privado:
1. La `User_Planification` con su plantilla: `404` si no existe.
2. Con el rol `user`, el dueño comparado en minúscula: `403`.
3. La `Routine_Asignation` buscada por id **y** por el `planification_id` de la asignación: `404` si no aparece.
4. Devuelve `{ userPlanification, routineAsignation }`, o `{ status, error }` para que el handler responda.

**`getPlanSessionDetail`** (el handler del service):
1. `findPlanSession`.
2. Las marcas de la sesión, filtradas por los ids de las filas (no por los del path, que pueden venir en mayúscula).
3. D38: la `Routine_Asignation` dada de baja y sin marcas → `404`.
4. El árbol con `findRoutineDetail`, la visibilidad con `buildAssignmentVisibility` y la respuesta con `buildRoutineDetailResponse` y `buildFinishedResponse`.

Son cuatro consultas: la asignación con la plantilla, la `Routine_Asignation`, las marcas y el árbol.

**Lo que se toca de lo compartido, sin cambiar lo que hoy responde la vía individual:**
- **`buildRoutineDetailResponse` suma un parámetro opcional "sólo lo completado"**, para la rutina quitada del plan. Sin él, se comporta como hoy.
- **Se abren los tipos** de `buildAssignmentVisibility` (filas con `routine_exercise_id`), `buildFinishedResponse` (los cinco campos que lee) e `isAssignmentOwner` (algo con `user_id`), para que acepten las filas y las asignaciones de las dos vías. La lógica no cambia.

## 6. Specs de CU a reescribir

Las dos en `Use Cases/usuario/` (§7 del bloque B: "la asignación puede ser una sesión del plan; visibilidad de la rutina quitada del plan"):

- **U-09:**
  - La asignación que se abre puede ser **individual** (una rutina para un día) o **una sesión del plan** (una rutina de una semana del plan).
  - En el plan, el sistema verifica también que la rutina sea de esa planificación, y presenta la planificación y la semana.
  - **Caminos alternativos nuevos:**
    - La rutina no es de la planificación.
    - El entrenador quitó la rutina del plan: se ve sólo lo completado, y si no completó nada, no existe.
    - El entrenador quitó la planificación al alumno: se puede ver, pero no modificar.
    - La planificación fue dada de baja después de asignarla: se ve igual.
- **U-10:** el ejercicio forma parte de la rutina de una asignación **o de una sesión del plan** del usuario. El camino "ejercicio dado de baja que el usuario completó" vale para las dos vías.

## 7. Fuera de alcance

- **Marcar, la nota y desmarcar en el plan** (BE-20c), que reutilizan `findPlanSession` y los params.
- **Las sesiones del plan en el historial** (BE-20d).
- **Cambiar el detalle individual** (`GET /routine/assign-user/:id`) o su forma.
- **Que el alumno liste las sesiones de una asignación quitada.** El home sólo muestra las activas, así que el alumno llega a una sesión congelada sólo con un id que ya tenía (una pantalla vieja). El coach llega desde el historial (BE-20d).

## 8. Verificación

- **Build** (`npm --prefix power-app run build`).
- **Los params**, con la configuración de `main.ts`: los dos UUID, en mayúscula también, y los inválidos.
- **El controller:** ruta, verbo, roles, sin `@Owner`, tipos de los parámetros, `await` sin devolver el `Response`, que ningún handler de `routine/` cuelgue, y el Swagger, sin levantar nada.
- **Las reglas, con repositorios falsos** sobre el código compilado y las consultas reales (el `DataSource` sin conexión):
  - Los códigos y su orden, con los tres roles. Ids en mayúscula.
  - Una asignación quitada: se lee, con `user_planification.active: false`.
  - Una plantilla y una rutina dadas de baja: se ven, con su `active: false`.
  - Una rutina quitada del plan, con y sin algo hecho.
  - Una semana posterior al `end_date`, con su `week_start` y `week_end`.
  - Que los ejercicios del árbol coincidan con el `total` que da `findAssignedPlanWeeks` para la misma sesión.
  - Que una marca de otra asignación o de otra rutina del plan no aparezca.
- **Regresión:**
  - Una foto de la salida de `GET /routine/assign-user/:id` (BE-13), sacada antes de tocar el código, que tiene que quedar idéntica.
  - Los scripts de BE-13, BE-14, BE-20 y BE-20e en verde.
- **El runtime** lo prueba el usuario en BE-35, contra Render regenerado y con el seed de BE-21.

## 9. Impacto

- **Status:**
  - U-09 y U-10 siguen ✅ y los conteos no se mueven.
  - Sus filas suman `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId`.
  - El changelog lleva el porqué de D37 a D39.
- **Spec del bloque B:** una nota en §5.6 que apunta a esta spec. No se reescribe nada.
- **Web y iOS:**
  - La pantalla de la rutina del plan reutiliza el árbol y el cruce por `routine_exercise_id` de la vía individual.
  - La cabecera (planificación y semana) sale de `user_planification` y de `week_start`/`week_end`.
  - Con `user_planification.active: false`, la pantalla deshabilita marcar y anotar.
- **BE-20c** arranca con `findPlanSession` y los params hechos. Esfuerzo estimado de BE-20b: 2 h (el de §9 del bloque B).

## 10. Riesgos y notas

- **Se toca un builder compartido** (`buildRoutineDetailResponse`) y los tipos de tres helpers de la vía individual. Por eso la foto de BE-13 y su regresión son parte de la tarea, no un extra.
- **Un circuito repetido en una rutina quitada del plan** (A, B, A): cada vínculo con algo hecho aparece con los mismos ejercicios completados. Es lo mismo que pasa hoy con dos vínculos apagados en la vía individual, porque la base registra el hecho por ejercicio y no por vínculo.
- **En una rutina quitada del plan, los vínculos que siguen activos conservan su `order`**, y los apagados vienen con `order` nulo y al final (la nota de `buildRoutineDetailResponse`).
- **El `403` según el rol (D39)** supone que marcar y desmarcar siguen siendo sólo del rol `user`. Si algún día un coach marcara por el alumno, habría que revisar el chequeo del dueño.
