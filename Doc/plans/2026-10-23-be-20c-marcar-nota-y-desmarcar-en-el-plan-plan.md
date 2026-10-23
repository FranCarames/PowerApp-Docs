# BE-20c — Marcar, la nota y desmarcar en el plan (CU-U-12, CU-U-13) · Plan de implementación

> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Todo queda stageado y el usuario hace cada commit.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escribieron **antes** del código y se corrieron en rojo.
> 3. **No se levanta el server**, ni se instala nada. El runtime lo prueba el usuario en BE-35.
>
> **Este plan registra lo hecho:** el usuario pidió arrancar BE-20c el 23/10, el contrato ya estaba cerrado en §5.4, §5.7 y §5.8 del bloque B, y la única decisión de diseño abierta (cómo compartir código con la vía individual) se la consulté antes de escribir nada.

**Spec que manda:** [§5.4, §5.7 y §5.8 del bloque B](../specs/2026-10-20-asignar-planificaciones-design.md) (D24, D25, D29, D39). No hay una spec propia: el contrato no cambia, sólo se anotaron tres detalles que §5.7 no fijaba (nota en §5.7).
**Parte de:** BE-14 (marcar en la vía individual), BE-18 (`finished_at`) y BE-20b (`findPlanSession` y `PlanSessionParamsDto`, `289ae83` en el backend).
**Modelo:** sin cambios. **No cambia ninguna entidad**, así que no se tocan `Db Creator`, el diagrama ni `routine.module.ts` (el repositorio de `Routine_Exercise_Finished` ya estaba registrado desde BE-20).

**Goal:** que el alumno pueda marcar un ejercicio de una sesión de su planificación (con el día y la nota), corregir esos dos datos y desmarcarlo, con las validaciones de §5.4, la asignación quitada congelada (D24) y sin que cambie nada de lo que responde la vía individual.

**Architecture:**
- Dos handlers nuevos en el service, `markPlanExerciseFinished` y `unmarkPlanExerciseFinished`, que validan la sesión con `findPlanSession` (BE-20b) y escriben en `Routine_Exercise_Finished`.
- Dos helpers compartidos con la vía individual, `readMarkInput` y `diffFinishedChanges`: la lectura de la nota y del día del body, y el cálculo de qué cambió en una marca existente.
- Un DTO nuevo para los params de desmarcar y dos handlers en el controller. Los DTOs de entrada y de salida son los de la vía individual.

---

## 1. Decisiones del plan

**La que el usuario eligió (23/10):**

1. **Helpers compartidos, no un cuerpo duplicado.** `markExerciseFinished` (BE-14) pasa a usar `readMarkInput` y `diffFinishedChanges`; cada vía conserva sus consultas. **Por qué:** una regla que cambia (el largo de la nota, qué cuenta como «viene») queda en un solo lugar. **Costo:** se toca una función ya commiteada; lo cubre la regresión de la vía individual (130 chequeos de reglas, 43 del controller y la foto de BE-13, idénticas).

**Las que la spec no dice (se pueden vetar al revisar):**

2. **El orden de las bajas al crear una marca:** `finished_at` obligatorio → pertenencia del ejercicio (`400` «no pertenece») → ejercicio o vínculo sacados (`400` «sacado de la rutina») → rutina quitada del plan. Es el orden de las filas de §5.7. Con la rutina quitada **y** el ejercicio sacado, el texto es el del ejercicio.
3. **Los textos nuevos:**
   - `400`: `La rutina fue quitada de la planificación: ya no se puede marcar.`
   - `400`: `La planificación fue quitada: no se puede modificar.` (el de D24, tal cual está en §5.7).
   - `500`: `Error al marcar el ejercicio del plan.` y `Error al desmarcar el ejercicio del plan.`
   - El `400` de «no pertenece» **reutiliza el de la vía individual** (`El ejercicio no pertenece a la rutina de esta asignación.`), como pide §5.7.
4. **La asignación quitada congela también las ediciones.** D24 dice «marcar, desmarcar y anotar dan `400`»: se corta antes de mirar la marca, así que tampoco se corrige la nota ni el día de una marca ya hecha. Es lo único que la vía individual no tiene, porque allí no hay baja de la asignación.
5. **La rutina quitada del plan (E-12c) admite editar y desmarcar lo hecho, pero no marcar nada nuevo.** Es la regla de visibilidad de D29 llevada a la escritura, y la misma que el ejercicio sacado de la rutina en la vía individual.
6. **Los ids que se guardan son los de las filas** (`userPlanification.id`, `routineAsignation.id`, `markable.exerciseId`), no los del path, que el iOS puede mandar en mayúscula.
7. **`PlanSessionFinishedParamsDto` extiende a `PlanSessionParamsDto`** (BE-20b) y suma `routineExerciseId`, con el mismo texto de error que la vía individual. El body es `MarkExerciseFinishedDto` y las respuestas son `RoutineAssignedFinishedDto` y `RoutineAssignedUnfinishedResponseDto`: la forma es la misma en las dos vías.
8. **Sin transacción:** es una sola escritura (INSERT o UPDATE). La carrera de dos marcas simultáneas la cierra el único `uk_ref_plan_asignation_exercise`: se relee la fila y se sigue como «ya estaba marcado» (`200`). Un `23505` de otro único, o una relectura vacía, es `500`.
9. **Dónde va cada cosa:** los dos handlers, después de `getPlanSessionDetail`; `findPlanFinishedRow`, junto a `findFinishedRow`; los dos helpers, después de `checkExerciseIsMarkable`; los dos handlers del controller, después del detalle del plan.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/dtos/routine/plan_session_finished_params.dto.ts` | **Nuevo:** los tres ids del path de desmarcar |
| `power-app/src/dtos/routine/plan_session_params.dto.ts` | Sólo el comentario de cabecera |
| `power-app/src/routine/routine.service.ts` | `markPlanExerciseFinished`, `unmarkPlanExerciseFinished`, `findPlanFinishedRow`, `readMarkInput` y `diffFinishedChanges` (nuevos); `markExerciseFinished` usa los dos helpers; las constantes `PLAN_REMOVED_ERROR` y `ROUTINE_REMOVED_FROM_PLAN_ERROR` |
| `power-app/src/routine/routine.controller.ts` | Los handlers `markPlanExerciseFinished` y `unmarkPlanExerciseFinished` y el import |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | La entrada del 23/10, las filas de U-12 y U-13, el hallazgo 2 y la fase 3 |

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**
- Este plan.
- `Use Cases/usuario/CU-U-12-marcar-serie-como-realizado.md` y `CU-U-13-dejar-una-nota-en-el-ejercicio.md`.
- Una nota en §5.7 de `Doc/specs/2026-10-20-asignar-planificaciones-design.md`.

**Scratchpad** (fuera de los repos): `…/335dcfcb-52a1-4933-a5ac-194985358fde/scratchpad/be20c/`, con los tres scripts nuevos y, copiados, los de la regresión (`lib.js`, `be18/fixtures.js`, `snapshot-be13.js` y los de BE-12, BE-18, BE-18b, BE-20, BE-20e y BE-20b).

---

## 3. Cobertura de la spec

| Spec | Qué pide | Dónde |
|---|---|---|
| §5.4 | `404` → `403` con el rol `user` → `404`, escritos una sola vez | `findPlanSession` (BE-20b), reutilizado |
| §5.7 | `400` con la asignación quitada (D24) | `markPlanExerciseFinished`, antes de mirar la marca |
| §5.7 | `finished_at` obligatorio al crear, corregible después; nota hasta 100, la vacía la borra | `readMarkInput` + `diffFinishedChanges` |
| §5.7 | `400` si el ejercicio no es de la rutina, o si el ejercicio, su vínculo o la rutina del plan están dados de baja | `checkExerciseIsMarkable` + la rutina quitada |
| §5.7 | `201` al crear, `200` si ya estaba (también sin cambios) y `200` si dos marcas chocan | el `try` del `save` y la relectura |
| §5.8 | `400` con la asignación quitada; borra la fila y su nota; idempotente; se puede desmarcar lo que el coach sacó | `unmarkPlanExerciseFinished` |
| D25 | sin ventana de fechas: ni un día de hace años ni uno futuro se rechazan | sin validación contra «hoy» |
| §6 | CU-U-12 y CU-U-13 | `Use Cases/usuario/` |

---

## 4. Verificación (hecha el 23/10, sin levantar el server)

**Antes de escribir código**, los tres scripts nuevos corrieron **en rojo** (1, 13 y 62 fallas):

| Script | Qué prueba | Chequeos |
|---|---|---:|
| `verify-plan-mark-dto.js` | Los tres ids con la configuración de `main.ts`: mayúsculas, v5 del seed, un texto por id, el campo que sobra | 22 |
| `verify-plan-mark-controller.js` | Ruta, verbo y roles (sólo `user`), sin `@Owner`, tipos del path y del body; que ningún otro handler atienda las rutas nuevas; que **ninguno de los 24 handlers cuelgue**; argumentos y `await`; el Swagger completo | 101 |
| `verify-plan-mark-rules.js` | Los helpers; los códigos y su orden con repositorios falsos con estado (único, orden, delete); la asignación quitada; el alta, el `200` idempotente, la carrera del único; desmarcar; el cruce con el detalle de BE-20b sobre el mismo estado | 185 |

**Después del código, todo en verde:**
- **Build:** sin errores.
- **La foto de BE-13** (el detalle individual en ocho escenarios y `GET /routine/:id`), sacada antes de tocar nada: **idéntica**.
- **Regresión:** BE-12 (24, 27, 58), BE-18b (86), BE-20 (92, 99, 113), BE-20e (96, 31, 80, 58), BE-20b (15, 78, 152) y BE-18 (47, 130, 48, 43). Los scripts de los controllers suman 4 chequeos cada uno porque recorren todos los handlers, y el de BE-20b pasa de 22 a 24 handlers.
- **La vía individual no cambió de comportamiento** con el refactor: sus 130 chequeos de reglas y los 43 del controller dieron igual.

**Qué NO se verificó:**
- El SQL contra un Postgres. Las escrituras son un `findOne`, un `save`, un `update` y un `delete` por columnas de la entidad, sin consultas armadas a mano.
- El runtime, con marcas reales en la base (BE-35, con el seed de BE-21).

---

## 5. Para BE-20d (el historial)

- Con esta tarea ya **hay quién escribe `Routine_Exercise_Finished`**: el hallazgo 2 queda abierto sólo en la lectura del entrenador (las sesiones `source: 'plan'` de §5.9).
- `finished_at` de cada marca del plan ya es el día que el alumno indicó (D25), que es lo que D26 toma para la fecha de la sesión.
