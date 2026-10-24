# BE-20d — Las sesiones del plan en el historial del entrenador (CU-E-06, CU-E-07) · Plan de implementación

> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Los cambios de esta tarea quedan **sin stagear** mientras BE-20c siga stageada sin commitear: así cada commit lleva una sola tarea.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escribieron **antes** del código y se corrieron en rojo.
> 3. **No se levanta el server**, ni se instala nada. El SQL se verifica como texto, con el `DataSource` sin conexión.
>
> **Este plan registra lo hecho:** el usuario pidió seguir con BE-20d el 23/10, el contrato ya estaba cerrado en §5.9 del bloque B, y la única decisión abierta (cómo documentar en el Swagger dos tipos de sesión) se la consulté antes de escribir nada.

**Spec que manda:** [§5.9 del bloque B](../specs/2026-10-20-asignar-planificaciones-design.md) (D26, D29). No hay una spec propia: el contrato no cambia, sólo se anotaron tres detalles que §5.9 no fijaba (nota en §5.9).
**Parte de:** BE-16 (el historial individual), BE-18 (`finished_at` como día) y BE-20c (que ya escribe `Routine_Exercise_Finished`).
**Modelo:** sin cambios. **No cambia ninguna entidad**, así que no se tocan `Db Creator`, el diagrama ni `routine.module.ts`.

**Goal:** que `GET /routine/history/:userId` (con y sin `exercise_id`) devuelva, además de las sesiones individuales de siempre, las del plan, en la misma lista y ordenadas juntas, sin que cambie la forma de las individuales.

**Architecture:**
- Una segunda consulta, `findPlanHistoryEntries`, que parte de `Routine_Exercise_Finished` y se parece a la individual; agrupa por el par (asignación, rutina del plan) y calcula la fecha de cada sesión.
- Un helper compartido, `buildHistoryExercise`, que arma cada ejercicio hecho igual en las dos vías.
- Una función `mergeHistoryEntries` que intercala las dos listas.
- Dos DTOs de sesión en el Swagger, documentados como una unión discriminada por `source`.

---

## 1. Decisiones del plan

**La que el usuario eligió (23/10):**

1. **Renombrar el DTO de la sesión individual.** `RoutineHistorySessionDto` pasa a `RoutineHistoryIndividualSessionDto` (misma forma; `source` sólo `'individual'`) y se suma `RoutineHistoryPlanSessionDto`, con nombres simétricos. **Costo:** el web tiene que re-generar el tipo y cambiar el import; lo asumí con el usuario porque de todos modos tiene que tipar la unión.

**Las que la spec no dice (se pueden vetar al revisar):**

2. **El orden: se intercala, no se reordena todo.** Las individuales ya vienen ordenadas por la base y se conservan tal cual; las del plan se ordenan en el servidor (su día sale de los ejercicios y no se puede poner en un `ORDER BY` simple). Las dos listas se intercalan con un merge. **Por qué:** si se reordenara todo en JavaScript, el orden de las individuales dependería de cómo compare los nombres JavaScript y no de la collation de la base, y una respuesta que hoy no cambia de contenido podría cambiar de orden. Con el merge, una respuesta sin sesiones del plan es **idéntica** a la de BE-16.
3. **El desempate entre las dos fuentes:** día descendente, después nombre de rutina con `localeCompare('es')`, después el alta (de la asignación individual, o de la `User_Planification` y después de la `Routine_Asignation`) y, por último, una clave fija para que el orden sea estable. **Limitación conocida:** el cruce entre una individual y una del plan con nombres que la collation de la base y `localeCompare` ordenan distinto (mayúsculas, tildes, símbolos) puede salir en el otro orden. Sólo afecta al orden relativo entre las dos fuentes en un mismo día.
4. **La fecha de la sesión del plan (D26)** es el `finished_at` más viejo de los ejercicios que se devuelven. Con `exercise_id`, como la consulta sólo trae ese ejercicio, es el día en que lo hizo.
5. **La sesión del plan es el par `(User_Planification, Routine_Asignation)`:** la misma rutina del plan en dos asignaciones de una plantilla son dos sesiones, y dos rutinas de la misma asignación también.
6. **El alumno de una sesión del plan es el de la asignación** (`userPlanification.user_id`). La consulta no mira ningún `active`: la asignación quitada (E-14), la plantilla dada de baja (E-11) y la rutina quitada del plan (E-12c) aparecen igual, como pide §5.9.
7. **`planification.name` puede ser `null`** (la columna es opcional): se declara así en el Swagger y se devuelve `null`, como en el home del plan.
8. **Las consultas corren una después de la otra**, no en paralelo: son dos lecturas chicas y así un error de cualquiera de las dos es un solo `500` con un solo log.
9. **Dónde va cada cosa:** `HistoryEntry`, `compareHistoryEntries` y `mergeHistoryEntries` arriba de la clase, junto a las constantes; `buildHistoryExercise` y `findPlanHistoryEntries` en una sección nueva, `HELPERS DEL HISTORIAL`, antes de `HELPERS DE RUTINA`.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/dtos/routine/routine_history_response.dto.ts` | `RoutineHistorySessionDto` → `RoutineHistoryIndividualSessionDto`; nuevos `RoutineHistoryPlanificationDto` y `RoutineHistoryPlanSessionDto` |
| `power-app/src/routine/routine.service.ts` | `getTrainingHistory` usa las entradas ordenables y suma las del plan; `buildHistoryExercise` y `findPlanHistoryEntries` (nuevos); `HistoryEntry`, `compareHistoryEntries` y `mergeHistoryEntries` |
| `power-app/src/routine/routine.controller.ts` | El Swagger del historial: `@ApiExtraModels` y el 200 como `oneOf` discriminado por `source` |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | La entrada del 23/10, las filas de E-06 y E-07, el hallazgo 2 (se cierra) y la fase 3 |

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**
- Este plan.
- `Use Cases/entrenador/CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md` y `CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md`.
- Una nota en §5.9 de `Doc/specs/2026-10-20-asignar-planificaciones-design.md`.

**Scratchpad** (fuera de los repos): `…/335dcfcb-52a1-4933-a5ac-194985358fde/scratchpad/be20c/`, con los dos scripts nuevos (`verify-history-plan-controller.js` y `verify-history-plan-rules.js`), el de BE-16 adaptado (`be18/verify-history-rules.js`) y la regresión.

---

## 3. Cobertura de la spec (§5.9)

| Spec | Qué pide | Dónde |
|---|---|---|
| §5.9 | Sumar las sesiones del plan con al menos un ejercicio hecho, en la misma lista y ordenadas con las individuales | `findPlanHistoryEntries` + `mergeHistoryEntries` |
| §5.9 | Orden: `date` descendente, nombre de rutina y alta (de la asignación, o de la `User_Planification` y la `Routine_Asignation`) | `compareHistoryEntries` |
| §5.9 | Forma de la sesión del plan, **sin `assignment_id`** | `RoutineHistoryPlanSessionDto` y el literal del service |
| §5.9, D26 | `date` = el `finished_at` más viejo de los ejercicios que se devuelven; con `exercise_id`, el día de ese ejercicio | `findPlanHistoryEntries` |
| §5.9 | `exercises` con la misma forma y el mismo orden en las dos | `buildHistoryExercise` |
| §5.9 | Lo dado de baja aparece igual, incluidas las asignaciones y las rutinas quitadas | la consulta no mira ningún `active` |
| §5.9, D7 | `sets` sigue siendo la prescripción actual | sin cambios |
| §6 | CU-E-06 y CU-E-07 | `Use Cases/entrenador/` |

---

## 4. Verificación (hecha el 23/10, sin levantar el server)

**Antes de escribir código**, los scripts nuevos corrieron **en rojo** (7 y 22 fallas) y el de BE-16, adaptado, falló sólo donde esperaba la segunda consulta:

| Script | Qué prueba | Chequeos |
|---|---|---:|
| `verify-history-plan-controller.js` | Ruta, verbo y roles sin cambios; argumentos y `await`; el Swagger: la unión discriminada, las claves de las dos sesiones en orden, `source`, que la del plan no tenga `assignment_id`, el nombre viejo ya no está | 33 |
| `verify-history-plan-rules.js` | Los códigos (`404`, `200` con `[]`, `500` de cada consulta); el SQL del plan sin y con `exercise_id`, sin ningún `active`; la sesión del plan con su forma exacta; la fecha más vieja; el nombre `null`; el par como sesión; el orden con las dos fuentes (día, nombre, alta); que el orden de las individuales sea el de la base; que sin plan la respuesta sea la de BE-16 | 64 |

**Después del código, todo en verde:**
- **Build:** sin errores.
- **El script de BE-16** (`be18/verify-history-rules.js`), adaptado sólo para que el servicio reciba el repositorio del plan y la consulta del plan devuelva vacío: **48 chequeos, iguales**. Sin sesiones del plan, la respuesta individual no cambió.
- **La foto de BE-13:** idéntica.
- **Regresión completa:** BE-12 (24, 27, 58), BE-18b (86), BE-20 (92, 99, 113), BE-20e (96, 31, 80, 58), BE-20b (15, 78, 152), BE-20c (22, 101, 185) y BE-18 (47, 130, 48, 43).

**El SQL de la consulta del plan,** generado sin base: `FROM "Routine_Exercise_Finished" "finished" INNER JOIN "User_Planification" … INNER JOIN "Planification" … INNER JOIN "Routine_Asignation" … INNER JOIN "Routine" … INNER JOIN "Routine_Exercise" … INNER JOIN "Exercise" … LEFT JOIN "Exercise_Set" … WHERE "userPlanification"."user_id" = $1 ORDER BY "finished_finished_at" ASC, "finished_created_at" ASC, "finished_id" ASC, "exerciseSet_set_order" ASC`.

**Qué NO se verificó:**
- El SQL contra un Postgres. Es la misma forma que la consulta individual, con los joins del plan.
- El runtime, con marcas reales del plan en la base (BE-35, con el seed de BE-21).
- El cruce de orden entre las dos fuentes con la collation real de Render (ver la decisión 3).

---

## 5. Lo que cierra

- **Hallazgo 2 del Status:** con las sesiones `source: 'plan'` en el historial, la vía del plan queda completa de punta a punta: asignar (E-13) → ver (U-08, U-09, U-10) → marcar y anotar (U-12, U-13) → historial (E-06, E-07). El hallazgo sale de la lista de abiertos.
- **Lo que sigue de la fase 3:** BE-21 (el seed de la cadena de entrenamiento), la opcional BE-22 y BE-23 (regenerar la base de Render antes del ~2/11).
