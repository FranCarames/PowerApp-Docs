# BE-20 — El plan en el home del alumno (CU-U-08) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` y se propone el mensaje (Tarea 9).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escriben **antes** del código y se corren en rojo.
> 3. **No se levanta el server**, ni siquiera en segundo plano, y **no se instala nada**. El SQL se verifica como texto, con el `DataSource` sin conexión.

> **Registro de ejecución (21/10):** plan aprobado y ejecutado en la misma sesión, sin subagentes, sin cambiar ningún paso. **Una diferencia de forma:** las Tareas 2 a 5 se aplicaron copiando los cinco archivos del prototipo, en vez de editarlos a mano, después de confirmar con `diff -rq` que la copia difería del repo sólo en ellos; repo y prototipo quedaron idénticos. Los tres scripts nuevos dieron en rojo 2, 13 y 44 fallas (en el del controller, 47 `ok` de lo que ya existía) y en verde 92, 91 y 113 chequeos, sin fallas, en la primera corrida después del build. La regresión siguió en 24, 27, 58, 86, 47, 130, 48 y 43. Los controles dieron `0` (CU-U-08) y `69`, `7`, `69` y `7` (Status). La junction del prototipo se sacó con `rmdir` y el `node_modules` del repo quedó intacto.

**Spec que manda:** [`2026-10-20-asignar-planificaciones-design.md`](../specs/2026-10-20-asignar-planificaciones-design.md), §2 (D15, D16, D27, D28, D29), §4 (las semanas), §5 (convenciones y tabla de rutas), §5.4 (la visibilidad), §5.5 (el contrato), §7 (fila U-08), §9 (fila BE-20), §10 y §12.
**Modelo:** sin cambios. **Esta tarea no cambia ninguna entidad**, así que no toca `Db Creator` ni el diagrama. Lee `User_Planification`, `Planification`, `Routine_Asignation`, `Routine` y `Routine_Exercise_Finished` tal como quedaron en BE-18 (`8c68c46`).
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde dice que BE-20 reemplaza `GET /planification/user/:id/active`, manda la spec: ese andamiaje se retiró en BE-19 y el plan del home vive en `routine/` (D27), en un endpoint aparte (D28).

**Goal:** que `GET /routine/assigned-plan/:userId?from=&to=` devuelva, de cada asignación activa del alumno, las semanas del plan que se pisan con `[from, to]`, cada una con las rutinas que el alumno ve y su progreso, y que U-08 pase de 🟡 a ✅.

**Architecture:** un método nuevo en `RoutineService` (`getAssignedPlan`) con cuatro consultas chicas (las asignaciones activas con la cabecera de su plantilla, las rutinas del plan de las semanas pedidas, lo hecho en esas sesiones y los ejercicios vigentes de sus rutinas) y el armado de las semanas en memoria, con dos funciones nuevas de `planification/plan_weeks.ts` (`planWeekOf` y `planWeekBounds`, en UTC como las de BE-18b). El progreso de BE-12 se parte en dos helpers que comparten las dos vías (`findActiveExercisesByRoutine`, la consulta de vigentes sin cambios, y `buildProgress`, la unión). Un DTO de respuesta nuevo para el Swagger, que reutiliza los de BE-12 y la cabecera de BE-18b. El query y el param son los de `GET /routine/assigned/:userId`. El service inyecta tres repositorios más y `RoutineModule` los registra. U-08 pasa de 🟡 a ✅.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` · scripts de Node en el scratchpad, adaptados de los de BE-12, BE-18b y BE-19.

> **El código de las Tareas 2 a 5 se probó al escribir el plan** en una copia del proyecto en el scratchpad (`be20/proto`, con `node_modules` enlazado por una junction al del repo y compilada con `tsc`): los tres scripts nuevos dieron en verde (92, 91 y 113 chequeos) y toda la regresión siguió en verde. El repo no se tocó.

---

## 1. Hallazgos al preparar el plan (lo que la spec no dice)

**Decidido con el usuario el 21/10:**

1. **Tope de 520 semanas por pedido.** Si las semanas a devolver (sumando todas las asignaciones) superan 520 (10 años), `400`: `Hay más de 520 semanas de plan para mostrar: pedí un rango más corto con from y to.` Por qué: E-13 acepta cualquier fin hasta el 9999-12-31, así que un tipeo (9999 por 2026) hace que el pedido del coach sin filtro arme unas 416.000 semanas (~150 MB de JSON) y, en el free tier de Render (512 MB), tire el proceso para todos. El home pide una sola semana, así que nunca lo toca. Es el mismo criterio que el tope técnico de BE-18b (un fin calculado después del 9999-12-31 da `400`). Se descartaron: sin tope (riesgo anotado) y acotar el fin en E-13 (reabre BE-18b y no cubre lo ya cargado).

**Decisiones del plan (se pueden vetar al aprobarlo):**

2. **Los textos que la spec no fija:**
   - `400` de `from > to`: el de la vía individual, `La fecha inicial (from) no puede ser posterior a la final (to).`, porque la spec dice "igual que `GET /routine/assigned/:userId`".
   - `404` `Usuario no encontrado` (el que ya existe).
   - `400` del tope: el de la decisión 1.
   - `500` `Error al obtener el plan del alumno.`
3. **El query y el param son los de BE-12:** `GetAssignedRoutinesQueryDto` (`from` y `to` con `@IsCalendarDay()`) y `AssignedRoutinesParamsDto` (`userId`, que necesita `@Owner`). Por qué: la spec pide el mismo filtro que la vía individual, y el home manda el mismo par en los dos pedidos. No hace falta un script de DTO nuevo: el de BE-12 los cubre y corre como regresión.
4. **Coach y admin ven lo mismo que el alumno.** Las rutinas son "las visibles para el alumno" (§5.5), así que una rutina quitada del plan sin nada hecho tampoco le aparece al coach. Es lo que ya hace el detalle de BE-13. Para ver la plantilla entera, el coach tiene `GET /planification/:id`.
5. **Una semana se pisa con `[from, to]` entera, de lunes a domingo** (§4), aunque el plan arranque o termine a mitad de ella. Con un rango que no es una semana completa, la semana del plan aparece si alguno de sus siete días cae en el rango, aunque ese día sea anterior al inicio o posterior al fin (por ejemplo, un plan que arranca el jueves aparece con `from` y `to` en el lunes y el martes de esa semana). El home siempre manda lunes y domingo, así que en la práctica no cambia nada.
6. **Las asignaciones activas del alumno se traen todas, sin filtro de fechas, y el recorte por semanas se hace en memoria** con `plan_weeks`. Por qué: son pocas por alumno; las cuentas de semanas quedan en un solo lugar y en UTC; y no hay que traducir las semanas a fechas en SQL (que, además, con `to = 9999-12-31` pediría el domingo del año 10000).
7. **Las rutinas del plan se piden en una sola consulta:** por las plantillas de esas asignaciones y por un rango de semanas que las cubre a todas (de la menor primera a la mayor última). Cada semana toma después las suyas. Trae también las quitadas del plan (`active = false`): se ven si el alumno hizo algo (D29).
8. **El orden de los grupos se arma en dos partes:** la consulta ordena las asignaciones por nombre de la planificación y alta, y en memoria se ordena por `week_start` con un sort estable. Así el orden por nombre es el de Postgres (su collation, y un nombre nulo al final), como el nombre de rutina en BE-12. Los días `YYYY-MM-DD` se comparan como texto.
9. **El progreso de BE-12 se generaliza** (§12 de la spec): la consulta de ejercicios vigentes sale a `findActiveExercisesByRoutine` **sin cambiar su SQL**, y la unión a `buildProgress`. `findAssignedRoutinesProgress` (BE-12) los usa y queda igual por fuera; lo prueba la regresión de BE-12. En una rutina quitada del plan no se piden vigentes: `progress` es `{ finished: n, total: n }`, porque sólo se ve lo completado.
10. **Cada consulta se saltea si su lista está vacía** (Postgres rechaza `IN ()`): sin semanas pedidas no se piden rutinas, sin rutinas no se pide lo hecho y sin rutinas activas no se piden vigentes.
11. **El domingo de la última semana se recorta al 9999-12-31.** Sólo pasa con un plan que termina en la semana del 9999-12-31 (un viernes), cuyo domingo cae en el año 10000 y no entra en `YYYY-MM-DD`. Es el mismo tope técnico de `defaultPlanEndDate`.
12. **El Swagger tiene tres clases nuevas** en `dtos/routine/routine_assigned_plan_response.dto.ts` (el grupo, la asignación y la rutina) y reutiliza `RoutineAssignedRoutineDto` y `RoutineAssignedProgressDto` (BE-12) y `UserPlanificationPlanificationDto` (BE-18b).
13. **Los tres repositorios nuevos** (`UserPlanification`, `RoutineAsignation`, `RoutineExerciseFinished`) **se inyectan al final del constructor**, para no correr los argumentos posicionales de los scripts de regresión; `RoutineModule` registra los dos que le faltan (`RoutineExerciseFinished` ya estaba).

**Hallazgos técnicos:**

14. **El build no detecta un repositorio que falta en el `forFeature`:** compila, y el server no arranca porque Nest no resuelve la dependencia de `RoutineService`. El script del controller cruza lo que inyecta el service con lo que registra el módulo.
15. **TypeORM reescribe el `ORDER BY` por la columna de la plantilla unida como su alias** (`ORDER BY "planification_name" ASC`), igual que el nombre de rutina en BE-12. En Postgres es equivalente.
16. **Una marca inconsistente** (una `Routine_Exercise_Finished` cuya `Routine_Asignation` no es de la plantilla de su asignación, la regla que la base no garantiza) **no cae en ninguna sesión**, así que no cuenta. Validarla al marcar es de BE-20c.
17. **Una rutina del plan en una semana posterior al fin no aparece nunca en el home** (spec §12): las semanas llegan hasta la que contiene `end_date`.
18. **El progreso del plan no se puede probar de punta a punta todavía:** nada escribe `Routine_Exercise_Finished` hasta BE-20c (hallazgo 2 del Status). Se prueba con filas armadas.
19. **El tope cuenta semanas, no filas:** una semana sin rutinas cuenta igual, porque igual viaja en la respuesta.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/planification/plan_weeks.ts` | `planWeekOf` y `planWeekBounds`; `WEEK_MS`; el comentario de cabecera |
| `power-app/src/dtos/routine/routine_assigned_plan_response.dto.ts` | **Nuevo:** las tres clases de la respuesta para el Swagger |
| `power-app/src/routine/routine.service.ts` | `getAssignedPlan`; el tope; tres repositorios en el constructor; `findActiveExercisesByRoutine` y `buildProgress`, que usa `findAssignedRoutinesProgress`; imports |
| `power-app/src/routine/routine.controller.ts` | El handler `getAssignedPlan` y su import |
| `power-app/src/routine/routine.module.ts` | `UserPlanification` y `RoutineAsignation` en el `forFeature` |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | Entrada del 21/10, U-08 a ✅, conteos |

`Db Creator` **no cambia**: ninguna entidad cambia.

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**: este plan y `Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md`.

**Scratchpad** (`C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/3a1b39b7-ff8c-4255-8098-707f46ee20c7/scratchpad/be20/`, fuera de los repos): `lib.js`, tres scripts nuevos, la regresión (tres de BE-12, uno de BE-18b y cuatro de BE-18, estos en `be18/`) y el prototipo `proto/`.

---

## 3. Cobertura de la spec

| Spec | Qué pide | Tarea |
|---|---|---|
| §5 tabla | `GET /routine/assigned-plan/:userId`, user con `@Owner('userId')`, coach y admin | 5 |
| §5.5 | `from` y `to` opcionales, inclusivos, en formato día; `from > to` → `400`; `404` si el usuario no existe | 4, 5 (reutiliza BE-12) |
| §5.5 | De cada asignación **activa**, las semanas (de la 1 a la que contiene `end_date`) que se pisan con `[from, to]`; sin filtro, todas; una semana sin rutinas visibles con `routines: []` | 2, 4 |
| §5.5 forma | `{ user_planification: { id, start_date, end_date, coach_note, planification: { id, name, duration, active } }, week, week_start, week_end, routines: [ { routine_asignation_id, order, active, routine: { id, name, active }, progress: { finished, total } } ] }` | 3, 4 |
| §5.5 orden | Grupos por `week_start`, nombre de la planificación y alta de la asignación; rutinas por `order` y alta | 4 |
| §5.5 progreso | El de §4.3 del bloque A sobre `Routine_Exercise_Finished` de la sesión; en una rutina quitada del plan, `finished = total` | 4 |
| §5.5 semanas | `week_start` y `week_end`: el lunes y el domingo de esa semana del plan, aunque arranque o termine a mitad | 2, 4 |
| §4, D15, D16 | Semanas lineales; la 1 es la de lunes a domingo que contiene `start_date`; la última, la que contiene `end_date`; cuentas en UTC | 2 |
| §5.4, D29 | Una `Routine_Asignation` dada de baja se ve sólo si el alumno completó algo en ella en esta asignación, y sólo eso | 4 |
| §5.4 | Una plantilla (E-11) o una rutina (E-18) dadas de baja se siguen viendo, con su `active: false` | 4 |
| D27, D28 | En `routine/`, en un endpoint aparte; las rutinas del plan no tienen día | 4, 5 |
| §5 convenciones | ids de las filas, `await` en el handler, ningún `403` nuevo, Swagger con respuesta y códigos | 3, 4, 5 |
| §7 | CU-U-08 reescrito: la parte del plan, sin día, con su progreso; lo individual sigue por día | 7 |
| §9 | U-08 🟡 → ✅ | 8 |
| §10 | Build; las cuentas de semanas con un script; el SQL nuevo sin base; las reglas con repositorios falsos | 1, 6 |
| §12 | Los helpers de progreso se generalizan para las dos vías; no hay service nuevo | 4 |
| **No está en la spec** | El tope de 520 semanas (decisión 1) | 1, 4, 5 |

---

## Tarea 0 — Línea de base

**Archivos:** ninguno (lectura y copias al scratchpad).

> **Nota de shell:** el shell no conserva variables entre comandos. Cada bloque que las usa empieza definiéndolas.

- [ ] **Paso 1: los dos repos y el build**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short && git log --oneline -1 && npm --prefix power-app run build
cd "D:/Power App/Docs/PowerApp-Docs" && git status --short && git log --oneline -1
```
Esperado: el backend en `5ec4430` (la revisión de E-14) sin cambios y el build sin errores; docs en `21cd0a5` con sólo este plan (stageado al pedir la aprobación). Si aparece otra cosa, **preguntar** antes de seguir.

- [ ] **Paso 2: la carpeta de scripts, `lib.js` y la regresión** (hecho al escribir el plan)

```bash
B="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend"
SCRATCH="$B/3a1b39b7-ff8c-4255-8098-707f46ee20c7/scratchpad/be20"
mkdir -p "$SCRATCH/be18"
cp "$B/fa31ea20-323e-4bd7-ad06-47ea181b224e/scratchpad/be19/lib.js" "$SCRATCH/"
cp "$B/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad/"verify-assigned-{dto,controller,rules}.js "$SCRATCH/"
cp "$B/418e3405-ede5-42a7-ac2f-fdf55079a34c/scratchpad/be18b/verify-plan-weeks.js" "$SCRATCH/"
O="$B/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cp "$O/lib.js" "$O/fixtures.js" "$O/verify-detail-rules.js" "$O/verify-finished-rules.js" "$O/verify-history-rules.js" "$O/verify-finished-controller.js" "$SCRATCH/be18/"
```
Los dos `lib.js` leen la raíz del proyecto de `process.env.ROOT` si está definida (para correr contra el prototipo) y, si no, usan `power-app` del repo. Al ejecutar el plan **no se define `ROOT`**.

- [ ] **Paso 3: la regresión en verde, antes de tocar nada**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/3a1b39b7-ff8c-4255-8098-707f46ee20c7/scratchpad/be20"
unset ROOT; cd "$SCRATCH" && for s in verify-assigned-dto verify-assigned-controller verify-assigned-rules verify-plan-weeks; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
cd "$SCRATCH/be18" && for s in verify-detail-rules verify-finished-rules verify-history-rules verify-finished-controller; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado (corrido al escribir el plan): BE-12 en `24`, `27` y `58 ok`; las semanas de BE-18b en `86 ok`; BE-18 en `47`, `130`, `48` y `43 ok`; todos con `0 fallas`. Es la línea de base: el refactor del progreso toca el código de BE-12, y el constructor del service suma parámetros que usan los scripts de BE-18.

---

## Tarea 1 — Scripts de verificación, en rojo

**Archivos:** sólo el scratchpad (`$SCRATCH`). Tres scripts nuevos, sobre el código compilado (`power-app/dist`). **Ya se escribieron y se corrieron en rojo al preparar el plan**; si están, se usan tal cual.

- [ ] **Paso 1: `verify-plan-weeks-home.js`** — las dos cuentas nuevas en tres zonas horarias: en qué semana del plan cae un día y el lunes y el domingo de una semana, con el ejemplo de la spec, inicios en domingo y en lunes, cruces de año y de un 29 de febrero, el límite de las 520 semanas y el tope del 9999-12-31.

```js
const { dist, check, run, finish } = require('./lib');

// Las cuentas nuevas de BE-20: en que semana del plan cae un dia y el lunes y el domingo de una
// semana. Igual que en BE-18b, no pueden depender de la zona del servidor: se repiten en tres zonas
const ZONES = ['America/Argentina/Buenos_Aires', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'];

(async () => {
  let W;
  await run('carga el módulo', async () => {
    W = dist('planification/plan_weeks');
    check('exporta planWeekOf', typeof W.planWeekOf === 'function');
    check('exporta planWeekBounds', typeof W.planWeekBounds === 'function');
  });
  if (!W || typeof W.planWeekOf !== 'function' || typeof W.planWeekBounds !== 'function') return finish();

  const eq = (name, actual, expected) => check(name, actual === expected, String(actual));
  const bounds = (name, actual, start, end) => check(name, !!actual && actual.week_start === start && actual.week_end === end
    && Object.keys(actual).join(',') === 'week_start,week_end', JSON.stringify(actual));

  // El ejemplo de la spec (§4): asignada el jueves 22/10/2026, arranca el lunes 19/10
  const START = '2026-10-22';

  for (const zone of ZONES) {
    process.env.TZ = zone;
    console.log(`\n== TZ ${zone} (offset ${new Date(2026, 9, 22).getTimezoneOffset()} min)`);

    console.log('-- planWeekOf: la semana del plan que contiene el día (D16)');
    for (const day of ['2026-10-19', '2026-10-22', '2026-10-25']) eq(`${day} → semana 1`, W.planWeekOf(START, day), 1);
    eq('2026-10-26 (lunes) → semana 2', W.planWeekOf(START, '2026-10-26'), 2);
    eq('2026-11-01 (domingo) → semana 2', W.planWeekOf(START, '2026-11-01'), 2);
    eq('2026-11-15, el fin por defecto → semana 4', W.planWeekOf(START, '2026-11-15'), 4);
    eq('2026-11-16 → semana 5 (después del fin: el que la usa recorta)', W.planWeekOf(START, '2026-11-16'), 5);
    eq('2026-10-18, el domingo anterior → 0', W.planWeekOf(START, '2026-10-18'), 0);
    eq('2026-10-12, una semana antes → 0', W.planWeekOf(START, '2026-10-12'), 0);
    eq('2026-10-11 → -1', W.planWeekOf(START, '2026-10-11'), -1);
    eq('arrancando un domingo, ese día es la semana 1', W.planWeekOf('2026-10-25', '2026-10-25'), 1);
    eq('arrancando un domingo, el lunes siguiente es la semana 2', W.planWeekOf('2026-10-25', '2026-10-26'), 2);
    eq('arrancando un lunes, el domingo es la semana 1', W.planWeekOf('2026-10-19', '2026-10-25'), 1);
    eq('cruza el año (inicio 2026-12-30, día 2027-01-04 → 2)', W.planWeekOf('2026-12-30', '2027-01-04'), 2);
    eq('cruza un 29 de febrero (inicio 2028-02-21, día 2028-03-06 → 3)', W.planWeekOf('2028-02-21', '2028-03-06'), 3);
    eq('domingo del cambio de hora europeo (inicio 2026-03-23, día 2026-03-29 → 1)', W.planWeekOf('2026-03-23', '2026-03-29'), 1);
    eq('520 semanas: el domingo de la 520 (inicio 2026-10-19, día 2036-10-05)', W.planWeekOf('2026-10-19', '2036-10-05'), 520);
    eq('y el lunes siguiente es la 521', W.planWeekOf('2026-10-19', '2036-10-06'), 521);
    eq('un fin absurdo (9999-12-31) no rompe la cuenta', W.planWeekOf(START, '9999-12-31'), 416022);

    console.log('-- planWeekBounds: el lunes y el domingo de la semana N (spec §4)');
    bounds('semana 1 del ejemplo: 19 al 25/10', W.planWeekBounds(START, 1), '2026-10-19', '2026-10-25');
    bounds('semana 2: 26/10 al 1/11', W.planWeekBounds(START, 2), '2026-10-26', '2026-11-01');
    bounds('semana 3: 2 al 8/11', W.planWeekBounds(START, 3), '2026-11-02', '2026-11-08');
    bounds('semana 4: 9 al 15/11', W.planWeekBounds(START, 4), '2026-11-09', '2026-11-15');
    bounds('arrancando un domingo: la semana 1 es la que lo contiene', W.planWeekBounds('2026-10-25', 1), '2026-10-19', '2026-10-25');
    bounds('cruza el año', W.planWeekBounds('2026-12-30', 1), '2026-12-28', '2027-01-03');
    bounds('cruza un 29 de febrero', W.planWeekBounds('2028-02-21', 2), '2028-02-28', '2028-03-05');
    bounds('el primer día del calendario es lunes', W.planWeekBounds('0001-01-01', 1), '0001-01-01', '0001-01-07');

    console.log('-- tope técnico: el domingo de la semana del 9999-12-31 cae en el año 10000');
    bounds('la última semana que entra entera', W.planWeekBounds('9999-12-20', 1), '9999-12-20', '9999-12-26');
    bounds('la del 9999-12-31 (viernes) se corta ese día', W.planWeekBounds('9999-12-31', 1), '9999-12-27', '9999-12-31');
    bounds('la última semana de un plan del 2026 al 9999-12-31', W.planWeekBounds(START, 416022), '9999-12-27', '9999-12-31');
  }

  finish();
})();
```

- [ ] **Paso 2: `verify-assigned-plan-controller.js`** — ruta, verbo, roles, `@Owner('userId')`, tipos de los parámetros, el `OwnerGuard` real, `await` sin devolver el `Response`, que **ningún handler de `routine/` cuelgue**, que **`RoutineModule` registre cada repositorio que inyecta `RoutineService`** (hallazgo 14) y el Swagger, sin levantar nada.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { Reflector } = mod('@nestjs/core');
const { ForbiddenException, RequestMethod } = mod('@nestjs/common');
const { SwaggerModule, DocumentBuilder } = mod('@nestjs/swagger');
const { getRepositoryToken } = mod('@nestjs/typeorm');
const { RoutineController } = dist('routine/routine.controller');
const { RoutineService } = dist('routine/routine.service');
const { RoutineModule } = dist('routine/routine.module');
const { JwtAuthGuard } = dist('authentication/guards/jwt-auth.guard');
const { RolesGuard } = dist('authentication/guards/roles.guard');
const { OwnerGuard } = dist('authentication/guards/owner.guard');
const { OWNER_PARAM_KEY } = dist('authentication/decorators/owner.decorator');
const { UserRole } = dist('entities/user.entity');
const { UserPlanification } = dist('entities/user_planification.entity');
const { RoutineAsignation } = dist('entities/routine_asignation.entity');
const { RoutineExerciseFinished } = dist('entities/routine_exercise_finished.entity');
const { AssignedRoutinesParamsDto } = dist('dtos/routine/assigned_routines_params.dto');
const { GetAssignedRoutinesQueryDto } = dist('dtos/routine/get_assigned_routines_query.dto');

const allow = { canActivate: () => true };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const USER = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const OTHER = '11111111-2222-4333-8444-555555555555';
const proto = RoutineController.prototype;
const handler = proto.getAssignedPlan;

(async () => {
  console.log('-- ruta, verbo, roles, dueño y tipos');
  await run('getAssignedPlan', async () => {
    check('existe', typeof handler === 'function');
    check('ruta assigned-plan/:userId', Reflect.getMetadata('path', handler) === 'assigned-plan/:userId', Reflect.getMetadata('path', handler));
    check('GET', Reflect.getMetadata('method', handler) === RequestMethod.GET, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('user, coach y admin', same(roles, [UserRole.user, UserRole.coach, UserRole.admin]), JSON.stringify(roles));
    check("@Owner('userId')", Reflect.getMetadata(OWNER_PARAM_KEY, handler) === 'userId', Reflect.getMetadata(OWNER_PARAM_KEY, handler));
    const types = Reflect.getMetadata('design:paramtypes', proto, 'getAssignedPlan') || [];
    check('el path con AssignedRoutinesParamsDto (el de los otros listados por alumno)', types[0] === AssignedRoutinesParamsDto, types[0] && types[0].name);
    check('el query con GetAssignedRoutinesQueryDto (el mismo from/to del home individual)', types[1] === GetAssignedRoutinesQueryDto, types[1] && types[1].name);
  });

  console.log('\n-- el OwnerGuard real con este handler');
  const guard = new OwnerGuard(new Reflector());
  const ctx = (role, id, userIdParam) => ({
    getHandler: () => handler,
    getClass: () => RoutineController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role, id }, params: { userId: userIdParam } }) }),
  });
  await run('un alumno pide su propio plan', async () => {
    check('con su id', guard.canActivate(ctx(UserRole.user, USER, USER)) === true);
    check('con su id en mayúscula (iOS)', guard.canActivate(ctx(UserRole.user, USER, USER.toUpperCase())) === true);
  });
  await run('un alumno pide el plan de otro → 403', async () => {
    try {
      guard.canActivate(ctx(UserRole.user, USER, OTHER));
      check('lanzó', false, 'no lanzó');
    } catch (e) {
      check('ForbiddenException', e instanceof ForbiddenException, e && e.message);
      check('el texto no cierra la sesión del web', e.message !== 'La cuenta está deshabilitada.', e.message);
    }
  });
  await run('coach y admin piden el de cualquiera', async () => {
    check('coach', guard.canActivate(ctx(UserRole.coach, OTHER, USER)) === true);
    check('admin', guard.canActivate(ctx(UserRole.admin, OTHER, USER)) === true);
  });

  // Un handler que no llama al service es un andamiaje: con @Res() y sin respuesta, el request
  // cuelga. Se llama a cada handler con argumentos vacios y un service que anota lo que le piden
  console.log('\n-- ningún handler de routine/ cuelga: cada uno llama al service');
  const handlers = Object.getOwnPropertyNames(proto).filter(n => n !== 'constructor' && typeof proto[n] === 'function');
  for (const name of handlers) {
    await run(name, async () => {
      const calls = [];
      // 'then' tiene que dar undefined: si no, el proxy pareceria una promesa
      const service = new Proxy({}, { get: (_, prop) => (prop === 'then' ? undefined : async () => { calls.push(String(prop)); }) });
      const controller = new RoutineController(service);
      const ret = await controller[name]({}, {}, {}, {});
      check(`${name} llama al service una vez`, calls.length === 1, calls.join(',') || 'no llamó a nada');
      check(`${name} no devuelve nada (await, no return)`, ret === undefined, String(ret));
    });
  }

  // El build no detecta un repositorio que falta en el forFeature del modulo: compila, y el server
  // no arranca (Nest no resuelve la dependencia). Se cruza lo que inyecta el service con lo que
  // registra el modulo
  console.log('\n-- RoutineModule registra cada repositorio que inyecta RoutineService');
  await run('forFeature', async () => {
    const injected = (Reflect.getMetadata('self:paramtypes', RoutineService) || [])
      .map(p => p.param)
      .filter(token => typeof token === 'string' && token.endsWith('Repository'));
    const provided = new Set((Reflect.getMetadata('imports', RoutineModule) || [])
      .flatMap(m => (m && m.providers) || [])
      .map(p => p.provide));
    for (const entity of [UserPlanification, RoutineAsignation, RoutineExerciseFinished]) {
      const token = getRepositoryToken(entity);
      check(`el service inyecta ${token}`, injected.includes(token), injected.join(','));
    }
    for (const token of injected) check(`el módulo registra ${token}`, provided.has(token));
  });

  const state = {};
  const stub = {
    getAssignedPlan: async (...args) => { await new Promise(r => setTimeout(r, 20)); state.args = args; return 'RESPONSE'; },
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [RoutineController],
    providers: [{ provide: RoutineService, useValue: stub }],
  })
    .overrideGuard(JwtAuthGuard).useValue(allow)
    .overrideGuard(RolesGuard).useValue(allow)
    .overrideGuard(OwnerGuard).useValue(allow)
    .compile();

  const controller = moduleRef.get(RoutineController);

  console.log('\n-- argumentos y await');
  await run('pasa el userId, el query y el response; espera sin devolver el Response', async () => {
    const query = { from: '2026-10-19', to: '2026-10-25' };
    const res = {};
    const ret = await controller.getAssignedPlan({ userId: USER }, query, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('esperó al service', !!state.args);
    check('argumentos: userId, query y response', !!state.args && state.args[0] === USER && state.args[1] === query && state.args[2] === res,
      JSON.stringify(state.args));
  });

  console.log('\n-- Swagger');
  await run('el documento declara la respuesta, los errores y los parámetros', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const schemas = doc.components.schemas;
    const ref = (s) => ((s && (s.$ref || (s.allOf && s.allOf[0] && s.allOf[0].$ref))) || '');
    const get = (doc.paths['/routine/assigned-plan/{userId}'] || {}).get;

    check('GET /routine/assigned-plan/{userId} está en el documento', !!get);
    if (get) {
      for (const code of ['200', '400', '403', '404']) check(`declara ${code}`, !!get.responses[code], Object.keys(get.responses).join(','));
      check('el 400 nombra el tope de 520 semanas', (get.responses['400'] && get.responses['400'].description || '').includes('520'), get.responses['400'] && get.responses['400'].description);
      const schema = get.responses['200'].content['application/json'].schema;
      check('el 200 es un array de RoutineAssignedPlanWeekResponseDto',
        schema.type === 'array' && ref(schema.items).endsWith('/RoutineAssignedPlanWeekResponseDto'), JSON.stringify(schema));
      const params = (get.parameters || []).map(p => `${p.in}:${p.name}`);
      check('parámetros: userId en el path, from y to en el query', same(params.sort(), ['path:userId', 'query:from', 'query:to']), params.join(','));
      check('from y to opcionales', (get.parameters || []).filter(p => p.in === 'query').every(p => p.required === false));
      check('pide token', Array.isArray(get.security) && get.security.some(s => 'bearer' in s));
    }

    const week = schemas.RoutineAssignedPlanWeekResponseDto;
    check('el grupo documenta sus 5 campos', !!week && same(Object.keys(week.properties), ['user_planification', 'week', 'week_start', 'week_end', 'routines']),
      week && Object.keys(week.properties).join(','));
    if (week) {
      check('user_planification es RoutineAssignedPlanUserPlanificationDto', ref(week.properties.user_planification).endsWith('/RoutineAssignedPlanUserPlanificationDto'), JSON.stringify(week.properties.user_planification));
      check('routines es un array de RoutineAssignedPlanRoutineDto', week.properties.routines.type === 'array' && ref(week.properties.routines.items).endsWith('/RoutineAssignedPlanRoutineDto'), JSON.stringify(week.properties.routines));
      check('week_start y week_end son string', week.properties.week_start.type === 'string' && week.properties.week_end.type === 'string');
      check('week es número', ['number', 'integer'].includes(week.properties.week.type), week.properties.week.type);
    }

    const up = schemas.RoutineAssignedPlanUserPlanificationDto;
    check('la asignación documenta id, start_date, end_date, coach_note y planification',
      !!up && same(Object.keys(up.properties), ['id', 'start_date', 'end_date', 'coach_note', 'planification']), up && Object.keys(up.properties).join(','));
    if (up) {
      check('planification es la cabecera de BE-18b (UserPlanificationPlanificationDto)', ref(up.properties.planification).endsWith('/UserPlanificationPlanificationDto'), JSON.stringify(up.properties.planification));
      check('coach_note nullable', up.properties.coach_note.nullable === true, JSON.stringify(up.properties.coach_note));
    }

    const routine = schemas.RoutineAssignedPlanRoutineDto;
    check('la rutina documenta routine_asignation_id, order, active, routine y progress',
      !!routine && same(Object.keys(routine.properties), ['routine_asignation_id', 'order', 'active', 'routine', 'progress']), routine && Object.keys(routine.properties).join(','));
    if (routine) {
      check('routine es la de BE-12 (RoutineAssignedRoutineDto)', ref(routine.properties.routine).endsWith('/RoutineAssignedRoutineDto'), JSON.stringify(routine.properties.routine));
      check('progress es el de BE-12 (RoutineAssignedProgressDto)', ref(routine.properties.progress).endsWith('/RoutineAssignedProgressDto'), JSON.stringify(routine.properties.progress));
    }

    check('el home individual, el detalle y el historial siguen en el documento',
      ['/routine/assigned/{userId}', '/routine/assign-user/{id}', '/routine/history/{userId}'].every(p => !!doc.paths[p]));
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 3: `verify-assigned-plan-rules.js`** — las reglas de §4, §5.4 y §5.5 con repositorios falsos y **las consultas reales**: el query builder del service sobre un `DataSource` sin conexión. Intercepta `getMany` (las filas crudas pasan por el transformador real de TypeORM, así que se prueba también la hidratación: las fechas salen como `'YYYY-MM-DD'`) y `getRawMany`. Los falsos filtran las rutinas del plan, lo hecho y lo vigente **como lo haría la base**, con los parámetros con nombre de cada consulta, así cada caso pasa la plantilla entera.

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, SelectQueryBuilder, getMetadataArgsStorage } = mod('typeorm');
const { RawSqlResultsToEntityTransformer } = require(path.join(ROOT, 'node_modules/typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer'));
const { RoutineService } = dist('routine/routine.service');

const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const COACH_ID = 'c0c0c0c0-1111-4222-8333-444444444444';
const P1 = '5a5a5a5a-1111-4222-8333-444444444444';
const P2 = '5b5b5b5b-1111-4222-8333-444444444444';
const UP1 = '3a3a3a3a-1111-4222-8333-444444444444';
const UP2 = '3b3b3b3b-1111-4222-8333-444444444444';
const UP3 = '3c3c3c3c-1111-4222-8333-444444444444';
const R1 = '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01';
const R2 = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const R3 = '1c1c1c1c-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const R4 = '2d2d2d2d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const E1 = 'e1e1e1e1-eeee-4eee-8eee-111111111111';
const E2 = 'e2e2e2e2-eeee-4eee-8eee-222222222222';
const E3 = 'e3e3e3e3-eeee-4eee-8eee-333333333333';
const E4 = 'e4e4e4e4-eeee-4eee-8eee-444444444444';
const E5 = 'e5e5e5e5-eeee-4eee-8eee-555555555555';
const E9 = 'e9e9e9e9-eeee-4eee-8eee-999999999999';
// Las rutinas del plan (Routine_Asignation)
const RA_A1 = 'a1000000-aaaa-4bbb-8ccc-000000000001';
const RA_B1 = 'b1000000-aaaa-4bbb-8ccc-000000000001';
const RA_A2 = 'a2000000-aaaa-4bbb-8ccc-000000000002';
const RA_X2 = 'c2000000-aaaa-4bbb-8ccc-000000000002';
const RA_B3 = 'b3000000-aaaa-4bbb-8ccc-000000000003';
const RA_Q1 = 'd1000000-aaaa-4bbb-8ccc-000000000001';
const RA_Q2 = 'd2000000-aaaa-4bbb-8ccc-000000000002';

const CREATED = new Date('2026-10-20T12:00:00Z');
const LATER = new Date('2026-10-21T12:00:00Z');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const MSG = {
  range: 'La fecha inicial (from) no puede ser posterior a la final (to).',
  userNotFound: 'Usuario no encontrado',
  limit: 'Hay más de 520 semanas de plan para mostrar: pedí un rango más corto con from y to.',
  error: 'Error al obtener el plan del alumno.',
};
const GROUP_KEYS = ['user_planification', 'week', 'week_start', 'week_end', 'routines'];
const UP_KEYS = ['id', 'start_date', 'end_date', 'coach_note', 'planification'];
const ROUTINE_KEYS = ['routine_asignation_id', 'order', 'active', 'routine', 'progress'];

const FUERZA = { id: P1, name: 'Fuerza', duration: 4, active: true };
const HIPER = { id: P2, name: 'Hipertrofia', duration: 4, active: true };

// Filas CRUDAS como las devolveria Postgres, con los alias del SELECT. Los DATE llegan como Date en
// medianoche local (lo que entrega pg) y TypeORM los hidrata como 'YYYY-MM-DD'
const day = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

function upRow({ id = UP1, plan = FUERZA, start = '2026-10-22', end = '2026-11-15', note = null, created = CREATED } = {}) {
  return {
    userPlanification_id: id, userPlanification_user_id: USER_ID, userPlanification_coach_id: COACH_ID,
    userPlanification_planification_id: plan.id, userPlanification_coach_note: note,
    userPlanification_start_date: day(start), userPlanification_end_date: day(end), userPlanification_active: true,
    userPlanification_created_at: created, userPlanification_updated_at: created,
    planification_id: plan.id, planification_name: plan.name, planification_duration: plan.duration, planification_active: plan.active,
  };
}

function raRow(id, { plan = P1, routine = [R1, 'Día A', true], week = 1, order = 1, active = true, created = CREATED } = {}) {
  return {
    routineAsignation_id: id, routineAsignation_routine_id: routine[0], routineAsignation_planification_id: plan,
    routineAsignation_order: order, routineAsignation_week: week, routineAsignation_active: active,
    routineAsignation_created_at: created, routineAsignation_updated_at: created,
    routine_id: routine[0], routine_name: routine[1], routine_active: routine[2],
  };
}

const DIA_A = [R1, 'Día A', true];
const DIA_B = [R2, 'Día B', true];
const DIA_C = [R3, 'Día C', true];

// La plantilla "Fuerza" (P1): semana 1 con A y B, semana 2 con A y una C quitada del plan (E-12c),
// semana 3 con B, semana 4 vacia
const TEMPLATE_P1 = [
  raRow(RA_A1, { week: 1, order: 1, routine: DIA_A }),
  raRow(RA_B1, { week: 1, order: 2, routine: DIA_B }),
  raRow(RA_A2, { week: 2, order: 1, routine: DIA_A }),
  raRow(RA_X2, { week: 2, order: 2, routine: DIA_C, active: false }),
  raRow(RA_B3, { week: 3, order: 1, routine: DIA_B }),
];
// La plantilla "Hipertrofia" (P2)
const TEMPLATE_P2 = [
  raRow(RA_Q1, { plan: P2, week: 1, order: 1, routine: [R4, 'Empuje', true] }),
  raRow(RA_Q2, { plan: P2, week: 2, order: 1, routine: [R4, 'Empuje', true] }),
];

const ACTIVE = [
  ...[E1, E2].map(e => ({ routine_id: R1, routine_exercise_id: e })),
  { routine_id: R2, routine_exercise_id: E3 },
  ...[E4, E5].map(e => ({ routine_id: R3, routine_exercise_id: e })),
  { routine_id: R4, routine_exercise_id: E1 },
];
const done = (up, ra, ...exercises) => exercises.map(e => ({ user_planification_id: up, routine_asignation_id: ra, routine_exercise_id: e }));

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

async function silencing(fn) {
  const original = console.error;
  let count = 0;
  console.error = () => { count++; };
  try { await fn(); } finally { console.error = original; }
  return count;
}

const afterWhere = (sql) => (sql.indexOf('WHERE') >= 0 ? sql.slice(sql.indexOf('WHERE')) : '');

(async () => {
  // DataSource REAL pero sin conectarse: las consultas las arma el service con el query builder de
  // verdad, y aca se intercepta su ejecucion
  const dir = path.join(ROOT, 'dist/entities');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) require(path.join(dir, file));
  const entities = getMetadataArgsStorage().tables.map(t => t.target).filter(t => typeof t === 'function');
  const ds = new DataSource({ type: 'postgres', entities });
  await ds.buildMetadatas();
  const { UserPlanification } = dist('entities/user_planification.entity');
  const { RoutineAsignation } = dist('entities/routine_asignation.entity');
  const { RoutineExerciseFinished } = dist('entities/routine_exercise_finished.entity');

  let state = null;

  // getMany: se guarda el SQL y las filas CRUDAS del caso pasan por el transformador REAL de TypeORM.
  // Las rutinas del plan se filtran como lo haria la base, con los parametros con nombre de la
  // consulta: asi cada caso puede pasar la plantilla entera
  SelectQueryBuilder.prototype.getMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    const alias = this.expressionMap.mainAlias.name;
    const kind = alias === 'userPlanification' ? 'ups' : alias === 'routineAsignation' ? 'ras' : alias;
    state.ops.push(kind);
    state.queries.push({ kind, sql, params, named: this.getParameters() });
    if (state.cfg.fail === kind) throw new Error('se cayó la base');
    let raw = kind === 'ups' ? (state.cfg.ups || []) : kind === 'ras' ? (state.cfg.ras || []) : [];
    if (kind === 'ras') {
      const p = this.getParameters();
      raw = raw.filter(r => (p.planificationIds || []).includes(r.routineAsignation_planification_id)
        && r.routineAsignation_week >= p.firstWeek && r.routineAsignation_week <= p.lastWeek);
    }
    const transformer = new RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, [], [], undefined);
    return transformer.transform(raw, this.expressionMap.mainAlias);
  };

  // getRawMany: lo hecho y los ejercicios vigentes, filtrados como lo haria la base
  SelectQueryBuilder.prototype.getRawMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    const kind = /FROM "Routine_Circuit"/.test(sql) ? 'active' : /FROM "Routine_Exercise_Finished"/.test(sql) ? 'finished' : 'otra';
    state.ops.push(kind);
    state.queries.push({ kind, sql, params, named: this.getParameters() });
    const p = this.getParameters();
    if (kind === 'active') return (state.cfg.active || []).filter(r => (p.routineIds || []).includes(r.routine_id));
    if (kind === 'finished') {
      return (state.cfg.finished || []).filter(r => (p.userPlanificationIds || []).includes(r.user_planification_id)
        && (p.routineAsignationIds || []).includes(r.routine_asignation_id));
    }
    return [];
  };

  // Un repositorio que el caso no deberia usar: cualquier llamada queda anotada y lanza
  const forbidden = (name) => new Proxy({}, {
    get: (_, prop) => (prop === 'then' ? undefined : () => { state.ops.push(`${name}.${String(prop)}`); throw new Error(`no debería usar ${name}`); }),
  });

  function build(cfg = {}) {
    state = { cfg, ops: [], queries: [], args: {} };
    const userRepository = {
      findOne: async (o) => { state.ops.push('user'); state.args.user = o; return 'user' in cfg ? cfg.user : { id: USER_ID }; },
    };
    // Mismo orden que el constructor: circuit, routine, dataSource, user, routineAsignationUser,
    // routineAsignExerciseFinished, routineExercise, routineCircuit y los tres de BE-20
    return new RoutineService(forbidden('circuit'), forbidden('routine'), ds, userRepository, forbidden('routineAsignationUser'),
      forbidden('routineAsignExerciseFinished'), forbidden('routineExercise'), forbidden('routineCircuit'),
      ds.getRepository(UserPlanification), ds.getRepository(RoutineAsignation), ds.getRepository(RoutineExerciseFinished));
  }

  async function plan(cfg, query = {}, userId = USER_ID) {
    const service = build(cfg);
    const res = makeRes();
    await service.getAssignedPlan(userId, query, res);
    const q = (kind) => state.queries.find(e => e.kind === kind);
    return { res, body: res.body, ops: [...state.ops], q, st: state };
  }

  // [week, week_start, week_end, id de la asignacion] de cada grupo, para comparar de un vistazo
  const weeksOf = (body) => (Array.isArray(body) ? body.map(g => [g.week, g.week_start, g.week_end, g.user_planification && g.user_planification.id]) : body);
  const routineIds = (group) => (group && Array.isArray(group.routines) ? group.routines.map(r => r.routine_asignation_id) : null);
  const progressOf = (body, up, week, ra) => {
    const group = (body || []).find(g => g.user_planification.id === up && g.week === week);
    const routine = group && group.routines.find(r => r.routine_asignation_id === ra);
    return routine ? routine.progress : 'no está';
  };

  // ===================== CODIGOS =====================

  console.log('-- códigos y orden de las validaciones (spec §5.5)');

  await run('el método existe', async () => {
    check('getAssignedPlan es función', typeof build().getAssignedPlan === 'function');
  });

  await run('from posterior a to → 400, sin consultar nada', async () => {
    const r = await plan({}, { from: '2026-10-25', to: '2026-10-19' });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('el mismo mensaje que la vía individual', same(r.body, { error: MSG.range }), JSON.stringify(r.body));
    check('no tocó la base (ni siquiera el usuario)', r.ops.length === 0, r.ops.join(','));
  });

  await run('from igual a to → válido', async () => {
    const r = await plan({ ups: [] }, { from: '2026-10-20', to: '2026-10-20' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
  });

  await run('usuario inexistente → 404, sin buscar planes', async () => {
    const r = await plan({ user: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.userNotFound }), JSON.stringify(r.body));
    check('sólo buscó al usuario', same(r.ops, ['user']), r.ops.join(','));
    check('lo buscó por el id del path, trayendo sólo el id', r.st.args.user && r.st.args.user.where.id === USER_ID && same(r.st.args.user.select, { id: true }),
      JSON.stringify(r.st.args.user));
  });

  await run('sin planes activos → 200 con [], sin más consultas', async () => {
    const r = await plan({ ups: [] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('cuerpo []', same(r.body, []), JSON.stringify(r.body));
    check('sólo el usuario y las asignaciones', same(r.ops, ['user', 'ups']), r.ops.join(','));
  });

  await run('error de la base → 500 y se loguea', async () => {
    let r;
    const logged = await silencing(async () => { r = await plan({ ups: [upRow()], fail: 'ras' }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.error }), JSON.stringify(r.body));
    check('console.error', logged === 1, logged);
  });

  await run('el id del alumno en mayúscula: se busca tal cual y se filtra por el id de la fila', async () => {
    const r = await plan({ ups: [] }, {}, USER_ID.toUpperCase());
    check('buscó al usuario con lo que llegó', r.st.args.user && r.st.args.user.where.id === USER_ID.toUpperCase());
    check('filtró las asignaciones por el id de la fila (minúscula)', !!r.q('ups') && same(r.q('ups').params, [USER_ID]), r.q('ups') && JSON.stringify(r.q('ups').params));
  });

  // ===================== SQL DE LAS ASIGNACIONES =====================

  console.log('\n-- SQL de las asignaciones del alumno');

  await run('las activas del alumno, con la cabecera mínima de la plantilla, sin filtro de fechas', async () => {
    const r = await plan({ ups: [] }, { from: '2026-10-19', to: '2026-10-25' });
    const q = r.q('ups');
    check('se consultó', !!q);
    if (!q) return;
    console.log('        ' + q.sql);
    check('FROM User_Planification', /FROM "User_Planification" "userPlanification"/.test(q.sql), q.sql);
    check('INNER JOIN a la plantilla', /INNER JOIN "Planification" "planification" ON "planification"\."id"\s*=\s*"userPlanification"\."planification_id"/.test(q.sql));
    check('de la plantilla, sólo id, name, duration y active',
      ['id', 'name', 'duration', 'active'].every(c => q.sql.includes(`"planification"."${c}" AS "planification_${c}"`))
      && !/"planification"\."(description|type|number_of_routines)"/.test(q.sql));
    check('filtra por el alumno', /"userPlanification"\."user_id" = \$1/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('sólo las activas (las quitadas salen del home, E-14)', /"userPlanification"\."active" = true/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('sin condiciones de fecha (el recorte por semanas es en memoria)', !/start_date|end_date/.test(afterWhere(q.sql).split('ORDER BY')[0]), afterWhere(q.sql));
    check('orden: nombre de la planificación y alta (el desempate de los grupos de una semana)',
      /ORDER BY "planification_name" ASC, "userPlanification"\."created_at" ASC$/.test(q.sql), q.sql.slice(q.sql.indexOf('ORDER BY')));
    check('un solo parámetro: el alumno', same(q.params, [USER_ID]), JSON.stringify(q.params));
  });

  // ===================== SEMANAS =====================

  console.log('\n-- las semanas del plan (§4 y §5.5)');

  await run('sin filtro: de la 1 a la que contiene end_date (el ejemplo de la spec)', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('las 4 semanas, de lunes a domingo', same(weeksOf(r.body), [
      [1, '2026-10-19', '2026-10-25', UP1], [2, '2026-10-26', '2026-11-01', UP1],
      [3, '2026-11-02', '2026-11-08', UP1], [4, '2026-11-09', '2026-11-15', UP1],
    ]), JSON.stringify(weeksOf(r.body)));
    check('la semana 4 no tiene rutinas: routines []', Array.isArray(r.body) && same(r.body[3].routines, []), Array.isArray(r.body) && JSON.stringify(r.body[3]));
    check('consultas: usuario, asignaciones, rutinas, hecho y vigentes', same(r.ops, ['user', 'ups', 'ras', 'finished', 'active']), r.ops.join(','));
  });

  await run('el home de la semana 2 (lunes 26/10 a domingo 1/11)', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-26', to: '2026-11-01' });
    check('sólo la semana 2', same(weeksOf(r.body), [[2, '2026-10-26', '2026-11-01', UP1]]), JSON.stringify(weeksOf(r.body)));
    check('sólo el Día A: el Día C fue quitado del plan y no tiene nada hecho (D29)', same(routineIds(r.body && r.body[0]), [RA_A2]), JSON.stringify(routineIds(r.body && r.body[0])));
  });

  await run('una semana antes del inicio → [], sin consultar las rutinas', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1 }, { from: '2026-10-12', to: '2026-10-18' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('cuerpo []', same(r.body, []), JSON.stringify(r.body));
    check('sólo usuario y asignaciones', same(r.ops, ['user', 'ups']), r.ops.join(','));
  });

  await run('una semana después del fin → []', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1 }, { from: '2026-11-16', to: '2026-11-22' });
    check('cuerpo []', same(r.body, []), JSON.stringify(r.body));
  });

  await run('un rango dentro de la semana 1 pero antes del jueves de inicio: la semana se pisa entera', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-19', to: '2026-10-20' });
    check('la semana 1', same(weeksOf(r.body), [[1, '2026-10-19', '2026-10-25', UP1]]), JSON.stringify(weeksOf(r.body)));
  });

  await run('sólo from / sólo to', async () => {
    const onlyFrom = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-11-02' });
    check('sólo from 2/11: semanas 3 y 4', same(weeksOf(onlyFrom.body).map(w => w[0]), [3, 4]), JSON.stringify(weeksOf(onlyFrom.body)));
    const onlyTo = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { to: '2026-10-26' });
    check('sólo to 26/10: semanas 1 y 2', same(weeksOf(onlyTo.body).map(w => w[0]), [1, 2]), JSON.stringify(weeksOf(onlyTo.body)));
  });

  await run('fin manual un miércoles: la última semana es la que lo contiene, y termina el domingo', async () => {
    const r = await plan({ ups: [upRow({ end: '2026-11-11' })], ras: TEMPLATE_P1, active: ACTIVE });
    check('4 semanas, la última del 9 al 15/11', same(weeksOf(r.body).map(w => w[0]), [1, 2, 3, 4]) && same(weeksOf(r.body)[3], [4, '2026-11-09', '2026-11-15', UP1]),
      JSON.stringify(weeksOf(r.body)));
  });

  await run('fin más corto que la duración: las semanas posteriores no aparecen', async () => {
    const r = await plan({ ups: [upRow({ end: '2026-11-01' })], ras: TEMPLATE_P1, active: ACTIVE });
    check('semanas 1 y 2', same(weeksOf(r.body).map(w => w[0]), [1, 2]), JSON.stringify(weeksOf(r.body)));
    const q = r.q('ras');
    check('las rutinas se piden sólo de esas semanas', !!q && q.named.firstWeek === 1 && q.named.lastWeek === 2, q && JSON.stringify(q.named));
  });

  await run('fin más largo que la duración: las semanas sin rutinas vienen vacías', async () => {
    const r = await plan({ ups: [upRow({ end: '2026-11-29' })], ras: TEMPLATE_P1, active: ACTIVE });
    check('semanas 1 a 6', same(weeksOf(r.body).map(w => w[0]), [1, 2, 3, 4, 5, 6]), JSON.stringify(weeksOf(r.body)));
    check('la 5 y la 6 con routines []', Array.isArray(r.body) && same(r.body[4].routines, []) && same(r.body[5].routines, []));
  });

  await run('un plan que arranca y termina el mismo domingo: una semana, la que lo contiene', async () => {
    const r = await plan({ ups: [upRow({ start: '2026-10-25', end: '2026-10-25' })], ras: TEMPLATE_P1, active: ACTIVE });
    check('la semana 1, del 19 al 25/10', same(weeksOf(r.body), [[1, '2026-10-19', '2026-10-25', UP1]]), JSON.stringify(weeksOf(r.body)));
  });

  // ===================== FORMA =====================

  console.log('\n-- la forma de la respuesta');

  await run('claves y valores de un grupo', async () => {
    const r = await plan({ ups: [upRow({ note: 'Volver de la lesión' })], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-19', to: '2026-10-25' });
    const g = Array.isArray(r.body) ? r.body[0] : {};
    check('grupo: user_planification, week, week_start, week_end, routines', same(Object.keys(g), GROUP_KEYS), Object.keys(g).join(','));
    check('la asignación: id, start_date, end_date, coach_note, planification', !!g.user_planification && same(Object.keys(g.user_planification), UP_KEYS),
      g.user_planification && Object.keys(g.user_planification).join(','));
    check('sus valores, con las fechas como día', !!g.user_planification && g.user_planification.id === UP1 && g.user_planification.start_date === '2026-10-22'
      && g.user_planification.end_date === '2026-11-15' && g.user_planification.coach_note === 'Volver de la lesión', JSON.stringify(g.user_planification));
    check('la cabecera de la plantilla', !!g.user_planification && same(g.user_planification.planification, FUERZA), g.user_planification && JSON.stringify(g.user_planification.planification));
    const item = g.routines && g.routines[0];
    check('rutina: routine_asignation_id, order, active, routine, progress', !!item && same(Object.keys(item), ROUTINE_KEYS), item && Object.keys(item).join(','));
    check('sus valores', !!item && item.routine_asignation_id === RA_A1 && item.order === 1 && item.active === true && same(item.routine, { id: R1, name: 'Día A', active: true }),
      JSON.stringify(item));
    check('progress: finished y total', !!item && same(item.progress, { finished: 0, total: 2 }), item && JSON.stringify(item.progress));
    check('las rutinas de la semana 1, en el orden de la consulta (order y alta)', same(routineIds(g), [RA_A1, RA_B1]), JSON.stringify(routineIds(g)));
  });

  await run('nota null → coach_note null; plantilla dada de baja (E-11) → sigue, con active false', async () => {
    const r = await plan({ ups: [upRow({ plan: { ...FUERZA, active: false } })], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-19', to: '2026-10-25' });
    const up = Array.isArray(r.body) && r.body[0] ? r.body[0].user_planification : {};
    check('coach_note null', up.coach_note === null, JSON.stringify(up));
    check('planification.active false', !!up.planification && up.planification.active === false);
  });

  await run('una rutina dada de baja (E-18) en una rutina activa del plan: se ve, con routine.active false', async () => {
    const ras = [raRow(RA_A1, { week: 1, routine: [R1, 'Día A', false] })];
    const r = await plan({ ups: [upRow()], ras, active: ACTIVE }, { from: '2026-10-19', to: '2026-10-25' });
    const item = Array.isArray(r.body) && r.body[0] && r.body[0].routines[0];
    check('aparece', !!item, JSON.stringify(r.body));
    check('routine.active false y su progreso normal', !!item && item.routine.active === false && same(item.progress, { finished: 0, total: 2 }), JSON.stringify(item));
  });

  // ===================== SQL DE LAS RUTINAS =====================

  console.log('\n-- SQL de las rutinas del plan');

  await run('las de la plantilla, activas o no, sólo de las semanas pedidas', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-26', to: '2026-11-01' });
    const q = r.q('ras');
    check('se consultó', !!q);
    if (!q) return;
    console.log('        ' + q.sql);
    check('FROM Routine_Asignation', /FROM "Routine_Asignation" "routineAsignation"/.test(q.sql), q.sql);
    check('INNER JOIN a la rutina', /INNER JOIN "Routine" "routine" ON "routine"\."id"\s*=\s*"routineAsignation"\."routine_id"/.test(q.sql));
    check('de la rutina, sólo id, name y active', ['id', 'name', 'active'].every(c => q.sql.includes(`"routine"."${c}" AS "routine_${c}"`)) && !q.sql.includes('"routine"."coach_note"'));
    check('filtra por las plantillas', /"routineAsignation"\."planification_id" IN \(\$1\)/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('y por las semanas', /"routineAsignation"\."week" >= \$2/.test(afterWhere(q.sql)) && /"routineAsignation"\."week" <= \$3/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('sin filtrar por active (las quitadas se ven si hizo algo, D29)', !/"routineAsignation"\."active"/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('orden: semana, order y alta', /ORDER BY "routineAsignation"\."week" ASC, "routineAsignation"\."order" ASC, "routineAsignation"\."created_at" ASC$/.test(q.sql),
      q.sql.slice(q.sql.indexOf('ORDER BY')));
    check('parámetros: la plantilla y la semana 2', same(q.params, [P1, 2, 2]), JSON.stringify(q.params));
  });

  await run('dos asignaciones de la misma plantilla: la plantilla se pide una vez', async () => {
    const r = await plan({ ups: [upRow(), upRow({ id: UP2, created: LATER })], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-19', to: '2026-10-25' });
    const q = r.q('ras');
    check('planificationIds sin repetir', !!q && same(q.named.planificationIds, [P1]), q && JSON.stringify(q.named));
  });

  await run('dos plantillas con semanas distintas: el rango de semanas las cubre a las dos', async () => {
    // Hipertrofia arranca el lunes 26/10: en la semana del 26/10 va por su semana 1 y Fuerza por la 2
    const ups = [upRow(), upRow({ id: UP3, plan: HIPER, start: '2026-10-26', end: '2026-11-22' })];
    const r = await plan({ ups, ras: [...TEMPLATE_P1, ...TEMPLATE_P2], active: ACTIVE }, { from: '2026-10-26', to: '2026-11-01' });
    const q = r.q('ras');
    check('las dos plantillas, semanas 1 a 2', !!q && same(q.params, [P1, P2, 1, 2]), q && JSON.stringify(q.params));
    check('cada grupo con sólo las rutinas de su semana', same(weeksOf(r.body), [[2, '2026-10-26', '2026-11-01', UP1], [1, '2026-10-26', '2026-11-01', UP3]])
      && same(routineIds(r.body[0]), [RA_A2]) && same(routineIds(r.body[1]), [RA_Q1]), JSON.stringify(r.body && r.body.map(routineIds)));
  });

  // ===================== VISIBILIDAD =====================

  console.log('\n-- visibilidad de una rutina quitada del plan (D29)');

  await run('quitada y con algo hecho: se ve, con active false y finished = total', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE, finished: done(UP1, RA_X2, E4) }, { from: '2026-10-26', to: '2026-11-01' });
    const g = Array.isArray(r.body) ? r.body[0] : null;
    check('aparece después del Día A', same(routineIds(g), [RA_A2, RA_X2]), JSON.stringify(routineIds(g)));
    const item = g && g.routines[1];
    check('active false', !!item && item.active === false, JSON.stringify(item));
    check('progress 1 de 1: sólo se ve lo completado', !!item && same(item.progress, { finished: 1, total: 1 }), item && JSON.stringify(item.progress));
    const q = r.q('active');
    check('su rutina no entra en la consulta de vigentes', !!q && same(q.named.routineIds, [R1]), q && JSON.stringify(q.named));
  });

  await run('quitada, hecha en otra asignación de la misma plantilla: sólo se ve en esa', async () => {
    const ups = [upRow(), upRow({ id: UP2, created: LATER })];
    const r = await plan({ ups, ras: TEMPLATE_P1, active: ACTIVE, finished: done(UP2, RA_X2, E4, E5) }, { from: '2026-10-26', to: '2026-11-01' });
    check('dos grupos de la semana 2, primero la asignación más vieja', same(weeksOf(r.body), [[2, '2026-10-26', '2026-11-01', UP1], [2, '2026-10-26', '2026-11-01', UP2]]),
      JSON.stringify(weeksOf(r.body)));
    check('en UP1 no está', Array.isArray(r.body) && same(routineIds(r.body[0]), [RA_A2]), Array.isArray(r.body) && JSON.stringify(routineIds(r.body[0])));
    check('en UP2 sí, 2 de 2', Array.isArray(r.body) && same(routineIds(r.body[1]), [RA_A2, RA_X2]) && same(progressOf(r.body, UP2, 2, RA_X2), { finished: 2, total: 2 }),
      Array.isArray(r.body) && JSON.stringify(r.body[1]));
  });

  await run('sólo hay rutinas quitadas con algo hecho: no se consulta lo vigente', async () => {
    const ras = [raRow(RA_X2, { week: 2, routine: DIA_C, active: false })];
    const r = await plan({ ups: [upRow()], ras, active: ACTIVE, finished: done(UP1, RA_X2, E4) }, { from: '2026-10-26', to: '2026-11-01' });
    check('se ve', same(routineIds(r.body && r.body[0]), [RA_X2]), JSON.stringify(r.body));
    check('consultas: usuario, asignaciones, rutinas y hecho', same(r.ops, ['user', 'ups', 'ras', 'finished']), r.ops.join(','));
  });

  // ===================== SQL DE LO HECHO Y DE LO VIGENTE =====================

  console.log('\n-- SQL de lo hecho y de los ejercicios vigentes');

  await run('lo hecho: sólo las sesiones de las semanas pedidas', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-26', to: '2026-11-01' });
    const q = r.q('finished');
    check('se consultó', !!q);
    if (!q) return;
    console.log('        ' + q.sql);
    check('FROM Routine_Exercise_Finished (la vía del plan)', /FROM "Routine_Exercise_Finished" "finished"/.test(q.sql), q.sql);
    check('alias de salida', ['user_planification_id', 'routine_asignation_id', 'routine_exercise_id'].every(c => q.sql.includes(`"finished"."${c}" AS "${c}"`)), q.sql);
    check('filtra por las asignaciones y las rutinas del plan', /"finished"\."user_planification_id" IN \(\$1\) AND "finished"\."routine_asignation_id" IN \(\$2, \$3\)$/.test(q.sql), afterWhere(q.sql));
    check('parámetros: la asignación y las dos rutinas de la semana 2 (también la quitada)', same(q.params, [UP1, RA_A2, RA_X2]), JSON.stringify(q.params));
  });

  await run('lo vigente: la misma consulta de la vía individual, con las rutinas visibles y activas una vez', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE });
    const q = r.q('active');
    check('se consultó', !!q);
    if (!q) return;
    console.log('        ' + q.sql);
    check('DISTINCT', /SELECT DISTINCT/.test(q.sql));
    check('Routine_Circuit unido a Routine_Exercise por el circuito',
      /FROM "Routine_Circuit" "routineCircuit" INNER JOIN "Routine_Exercise" "routineExercise" ON "routineExercise"\."circuit_id"\s*=\s*"routineCircuit"\."circuit_id"/.test(q.sql));
    check('vínculo y ejercicio activos', /"routineCircuit"\."active" = true/.test(q.sql) && /"routineExercise"\."active" = true/.test(q.sql));
    check('las rutinas del Día A y el Día B, una vez cada una (el Día C quitado no)', same(q.params, [R1, R2]), JSON.stringify(q.params));
  });

  await run('semanas sin rutinas: ni lo hecho ni lo vigente', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-11-09', to: '2026-11-15' });
    check('la semana 4, vacía', same(weeksOf(r.body), [[4, '2026-11-09', '2026-11-15', UP1]]) && same(r.body[0].routines, []), JSON.stringify(r.body));
    check('consultas: usuario, asignaciones y rutinas', same(r.ops, ['user', 'ups', 'ras']), r.ops.join(','));
  });

  // ===================== PROGRESO =====================

  console.log('\n-- el progreso (§4.3 del bloque A, sobre lo hecho en esa sesión)');

  const week1 = { from: '2026-10-19', to: '2026-10-25' };

  await run('nada hecho: 0 de 2; uno hecho: 1 de 2', async () => {
    const zero = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, week1);
    check('{ finished: 0, total: 2 }', same(progressOf(zero.body, UP1, 1, RA_A1), { finished: 0, total: 2 }), JSON.stringify(progressOf(zero.body, UP1, 1, RA_A1)));
    const one = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE, finished: done(UP1, RA_A1, E1) }, week1);
    check('{ finished: 1, total: 2 }', same(progressOf(one.body, UP1, 1, RA_A1), { finished: 1, total: 2 }), JSON.stringify(progressOf(one.body, UP1, 1, RA_A1)));
  });

  await run('un ejercicio dado de baja que completó SUMA al total; activo y hecho cuenta una vez', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE, finished: done(UP1, RA_A1, E1, E9) }, week1);
    check('{ finished: 2, total: 3 }', same(progressOf(r.body, UP1, 1, RA_A1), { finished: 2, total: 3 }), JSON.stringify(progressOf(r.body, UP1, 1, RA_A1)));
  });

  await run('un circuito repetido (filas duplicadas) cuenta cada ejercicio una vez', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: [...ACTIVE, ...ACTIVE] }, week1);
    check('{ finished: 0, total: 2 }', same(progressOf(r.body, UP1, 1, RA_A1), { finished: 0, total: 2 }), JSON.stringify(progressOf(r.body, UP1, 1, RA_A1)));
  });

  await run('rutina sin ejercicios → 0 de 0', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: [] }, week1);
    check('{ finished: 0, total: 0 }', same(progressOf(r.body, UP1, 1, RA_A1), { finished: 0, total: 0 }), JSON.stringify(progressOf(r.body, UP1, 1, RA_A1)));
  });

  await run('la misma rutina en dos semanas: comparten los ejercicios, no lo hecho', async () => {
    const r = await plan({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE, finished: done(UP1, RA_A1, E1, E2) });
    check('semana 1: 2 de 2', same(progressOf(r.body, UP1, 1, RA_A1), { finished: 2, total: 2 }), JSON.stringify(progressOf(r.body, UP1, 1, RA_A1)));
    check('semana 2: 0 de 2', same(progressOf(r.body, UP1, 2, RA_A2), { finished: 0, total: 2 }), JSON.stringify(progressOf(r.body, UP1, 2, RA_A2)));
  });

  await run('lo hecho en una asignación no se mezcla con otra de la misma plantilla', async () => {
    const r = await plan({ ups: [upRow(), upRow({ id: UP2, created: LATER })], ras: TEMPLATE_P1, active: ACTIVE, finished: done(UP2, RA_A1, E1) }, week1);
    check('UP1: 0 de 2', same(progressOf(r.body, UP1, 1, RA_A1), { finished: 0, total: 2 }), JSON.stringify(progressOf(r.body, UP1, 1, RA_A1)));
    check('UP2: 1 de 2', same(progressOf(r.body, UP2, 1, RA_A1), { finished: 1, total: 2 }), JSON.stringify(progressOf(r.body, UP2, 1, RA_A1)));
  });

  await run('una marca inconsistente (la rutina es de otra plantilla) no cuenta en ninguna sesión', async () => {
    const ups = [upRow(), upRow({ id: UP3, plan: HIPER, start: '2026-10-19', end: '2026-11-15' })];
    const r = await plan({ ups, ras: [...TEMPLATE_P1, ...TEMPLATE_P2], active: ACTIVE, finished: done(UP1, RA_Q1, E1) }, week1);
    check('Fuerza, Día A: 0 de 2', same(progressOf(r.body, UP1, 1, RA_A1), { finished: 0, total: 2 }), JSON.stringify(progressOf(r.body, UP1, 1, RA_A1)));
    check('Hipertrofia, Empuje: 0 de 1', same(progressOf(r.body, UP3, 1, RA_Q1), { finished: 0, total: 1 }), JSON.stringify(progressOf(r.body, UP3, 1, RA_Q1)));
  });

  // ===================== ORDEN DE LOS GRUPOS =====================

  console.log('\n-- orden de los grupos: week_start, nombre de la planificación y alta');

  await run('dos planes que arrancan en semanas distintas', async () => {
    // La consulta los trae por nombre: Fuerza (arranca 22/10) y despues Hipertrofia (arranca 12/10)
    const ups = [upRow(), upRow({ id: UP3, plan: HIPER, start: '2026-10-12', end: '2026-11-08' })];
    const r = await plan({ ups, ras: [...TEMPLATE_P1, ...TEMPLATE_P2], active: ACTIVE });
    check('por lunes y, en la misma semana, Fuerza antes que Hipertrofia', same(weeksOf(r.body).map(w => [w[1], w[3]]), [
      ['2026-10-12', UP3], ['2026-10-19', UP1], ['2026-10-19', UP3], ['2026-10-26', UP1], ['2026-10-26', UP3],
      ['2026-11-02', UP1], ['2026-11-02', UP3], ['2026-11-09', UP1],
    ]), JSON.stringify(weeksOf(r.body)));
  });

  // ===================== TOPE =====================

  console.log('\n-- el tope de 520 semanas (decisión del 21/10)');

  await run('exactamente 520 semanas → 200', async () => {
    const r = await plan({ ups: [upRow({ start: '2026-10-19', end: '2036-10-05' })], ras: [] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('520 grupos, de la 1 a la 520', Array.isArray(r.body) && r.body.length === 520 && r.body[0].week === 1 && r.body[519].week === 520
      && r.body[519].week_end === '2036-10-05', Array.isArray(r.body) ? r.body.length : JSON.stringify(r.body));
  });

  await run('521 semanas → 400, sin consultar las rutinas', async () => {
    const r = await plan({ ups: [upRow({ start: '2026-10-19', end: '2036-10-12' })], ras: [] });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.limit }), JSON.stringify(r.body));
    check('sólo usuario y asignaciones', same(r.ops, ['user', 'ups']), r.ops.join(','));
  });

  await run('el tope es por pedido: dos planes de 300 semanas → 400', async () => {
    const ups = [upRow({ start: '2026-10-19', end: '2032-07-18' }), upRow({ id: UP2, start: '2026-10-19', end: '2032-07-18', created: LATER })];
    const r = await plan({ ups, ras: [] });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
  });

  await run('un fin absurdo (9999-12-31) con el filtro del home → 200, una semana', async () => {
    const r = await plan({ ups: [upRow({ end: '9999-12-31' })], ras: TEMPLATE_P1, active: ACTIVE }, { from: '2026-10-26', to: '2026-11-01' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('la semana 2', same(weeksOf(r.body), [[2, '2026-10-26', '2026-11-01', UP1]]), JSON.stringify(weeksOf(r.body)));
  });

  await run('un fin absurdo sin filtro → 400', async () => {
    const r = await plan({ ups: [upRow({ end: '9999-12-31' })], ras: TEMPLATE_P1 });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
  });

  await run('la última semana de un plan que termina el 9999-12-31: el domingo se corta ese día', async () => {
    const r = await plan({ ups: [upRow({ end: '9999-12-31' })], ras: [] }, { from: '9999-12-27' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('la semana 416022, del 27 al 31/12/9999', same(weeksOf(r.body), [[416022, '9999-12-27', '9999-12-31', UP1]]), JSON.stringify(weeksOf(r.body)));
  });

  finish();
})();
```

- [ ] **Paso 4: correr los tres en rojo** (el código todavía no cambió)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/3a1b39b7-ff8c-4255-8098-707f46ee20c7/scratchpad/be20"
unset ROOT; cd "$SCRATCH" && for s in verify-plan-weeks-home verify-assigned-plan-controller verify-assigned-plan-rules; do echo "== $s"; node $s.js | grep -E "fallas$"; done
```
Esperado (corrido al escribir el plan): **`0 ok, 2 fallas`**, **`47 ok, 13 fallas`** y **`0 ok, 44 fallas`**. Las semanas y las reglas fallan enteras porque las funciones y el método no existen. En el del controller, las 47 que ya dan `ok` son los 19 handlers que ya llaman al service (dos chequeos cada uno), los siete repositorios que el módulo ya registra, el texto del `403` (no hay handler y el guard no aplica) y que el home individual, el detalle y el historial siguen en el Swagger. Si alguna otra da `ok`, revisar que la prueba no sea trivial.

---

## Tarea 2 — Las cuentas de semanas (spec §4)

**Archivos:** `power-app/src/planification/plan_weeks.ts`.

- [ ] **Paso 1: la cabecera y la constante.** Reemplazar

```ts
// zona horaria del servidor no corra un dia. Funciones puras, sin Nest: el home del plan (BE-20)
// va a necesitar las mismas cuentas

const DAY_MS = 24 * 60 * 60 * 1000;
```

por

```ts
// zona horaria del servidor no corra un dia. Funciones puras, sin Nest: las usan E-13 (el fin por
// defecto) y el home del plan (BE-20, desde routine/)

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
```

- [ ] **Paso 2: las dos funciones.** Al final del archivo, después de `defaultPlanEndDate`:

```ts

// La semana del plan que contiene el dia: la 1 es la que contiene start_date (D16), y van de lunes a
// domingo. Un dia anterior al lunes de inicio da 0 o menos: el que la usa recorta. El home del plan
// la usa para saber que semanas se pisan con [from, to] y cual es la ultima (la que contiene end_date)
export function planWeekOf(startDate: string, day: string): number {
    return Math.floor((toUtcMs(day) - toUtcMs(mondayOf(startDate))) / WEEK_MS) + 1;
}

// El lunes y el domingo de la semana `week` del plan (spec §4), aunque el plan arranque o termine a
// mitad de semana. El domingo se recorta al 9999-12-31: solo lo toca la semana que contiene ese dia
// (un viernes), cuyo domingo ya no entra en el formato YYYY-MM-DD. Es el mismo tope tecnico que el
// del fin por defecto
export function planWeekBounds(startDate: string, week: number): { week_start: string; week_end: string } {
    const weekStartMs = toUtcMs(mondayOf(startDate)) + (week - 1) * WEEK_MS;

    return {
        week_start: fromUtcMs(weekStartMs),
        week_end: fromUtcMs(Math.min(weekStartMs + 6 * DAY_MS, LAST_DAY_MS)),
    };
}
```

---

## Tarea 3 — La respuesta para el Swagger (spec §5.5)

**Archivos:** crear `power-app/src/dtos/routine/routine_assigned_plan_response.dto.ts`.

- [ ] **Paso 1: el archivo**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { UserPlanificationPlanificationDto } from '../planification/user_planification_response.dto';
import { RoutineAssignedRoutineDto, RoutineAssignedProgressDto } from './routine_assigned_list_item_response.dto';

// La asignacion de la que sale cada grupo del home del plan: lo propio de la User_Planification y la
// cabecera de la plantilla, que se lee en vivo (D18)
export class RoutineAssignedPlanUserPlanificationDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la User_Planification' })
    id!: string;

    @ApiProperty({ example: '2026-10-22', description: 'Día de inicio (YYYY-MM-DD, sin hora). La semana 1 del plan es la de lunes a domingo que lo contiene' })
    start_date!: string;

    @ApiProperty({ example: '2026-11-15', description: 'Día de fin, inclusive (YYYY-MM-DD, sin hora). La última semana del plan es la que lo contiene' })
    end_date!: string;

    @ApiProperty({ example: 'Foco en técnica', nullable: true, type: String })
    coach_note!: string | null;

    @ApiProperty({ type: UserPlanificationPlanificationDto })
    planification!: UserPlanificationPlanificationDto;
}

// Una rutina de la semana del plan para ese alumno: una sesion del plan (la asignacion y la
// Routine_Asignation), que es lo que el alumno abre y marca
export class RoutineAssignedPlanRoutineDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la Routine_Asignation. Con el id de la asignación identifica la sesión del plan' })
    routine_asignation_id!: string;

    @ApiProperty({ example: 1, description: 'Posición dentro de la semana. Etiqueta de orden: puede repetirse, y desempata el alta' })
    order!: number;

    @ApiProperty({ example: true, description: 'false si el entrenador la quitó del plan (E-12c): sólo aparece si el alumno hizo algo en ella, y sólo con lo que hizo' })
    active!: boolean;

    @ApiProperty({ type: RoutineAssignedRoutineDto })
    routine!: RoutineAssignedRoutineDto;

    @ApiProperty({ type: RoutineAssignedProgressDto, description: 'Sobre lo hecho en esta sesión. En una rutina quitada del plan sólo se ve lo completado: finished = total' })
    progress!: RoutineAssignedProgressDto;
}

// Una semana del plan de una asignacion (spec del bloque B, §5.5). Las rutinas del plan no tienen
// dia: solo semana y orden (D28)
export class RoutineAssignedPlanWeekResponseDto {

    @ApiProperty({ type: RoutineAssignedPlanUserPlanificationDto })
    user_planification!: RoutineAssignedPlanUserPlanificationDto;

    @ApiProperty({ example: 2, minimum: 1, description: 'Semana del plan: la 1 es la de lunes a domingo que contiene start_date' })
    week!: number;

    @ApiProperty({ example: '2026-10-26', description: 'Lunes de esa semana del plan (YYYY-MM-DD), aunque el plan arranque a mitad de semana' })
    week_start!: string;

    @ApiProperty({ example: '2026-11-01', description: 'Domingo de esa semana del plan (YYYY-MM-DD), aunque el plan termine a mitad de semana' })
    week_end!: string;

    @ApiProperty({ type: [RoutineAssignedPlanRoutineDto], description: 'Las rutinas de la semana que el alumno ve, por order y alta. Vacío si la semana no tiene ninguna' })
    routines!: RoutineAssignedPlanRoutineDto[];
}
```

---

## Tarea 4 — Service (spec §4, §5.4 y §5.5)

**Archivos:** `power-app/src/routine/routine.service.ts`.

- [ ] **Paso 1: imports.** Debajo de `import { RoutineAsignationUser } from '../entities/routine_asignation_user.entity';` agregar:

```ts
import { UserPlanification } from '../entities/user_planification.entity';
import { RoutineAsignation } from '../entities/routine_asignation.entity';
```

y debajo de `import { AuthUser } from '../authentication/auth-user.interface';`:

```ts
import { planWeekOf, planWeekBounds } from '../planification/plan_weeks';
```

- [ ] **Paso 2: el tope.** Debajo de `const FINISHED_DAY_REQUIRED_ERROR = …;` agregar:

```ts

// El tope de semanas del plan en el home (decision del 21/10). Un fin absurdo (un 9999 tipeado por
// 2026) pedido sin filtro armaria cientos de miles de semanas y tiraria el proceso; el home pide una
// sola semana, asi que nunca lo toca. 520 semanas son 10 años
const PLAN_WEEKS_LIMIT = 520;
const PLAN_WEEKS_LIMIT_ERROR = `Hay más de ${PLAN_WEEKS_LIMIT} semanas de plan para mostrar: pedí un rango más corto con from y to.`;
```

- [ ] **Paso 3: el constructor.** Después de `private routineCircuitRepository: Repository<RoutineCircuit>,` agregar (al final, para no correr los argumentos de los scripts viejos):

```ts
        @InjectRepository(UserPlanification)
        private userPlanificationRepository: Repository<UserPlanification>,
        @InjectRepository(RoutineAsignation)
        private routineAsignationRepository: Repository<RoutineAsignation>,
        @InjectRepository(RoutineExerciseFinished)
        private routineExerciseFinishedRepository: Repository<RoutineExerciseFinished>,
```

- [ ] **Paso 4: el método.** Entre el cierre de `getTrainingHistory` y `// ===================== HELPERS DE ASIGNACION INDIVIDUAL =====================`:

```ts
    // ===================== EL PLAN DEL ALUMNO (bloque B) =====================

    // La parte del plan del home (CU-U-08, spec del bloque B §5.5). Un endpoint aparte del de la via
    // individual (D28): el cliente hace los dos pedidos y muestra las dos fuentes juntas. De cada
    // asignacion ACTIVA del alumno, las semanas del plan que se pisan con [from, to], cada una con las
    // rutinas que el alumno ve y su progreso. Las rutinas del plan no tienen dia, solo semana y orden.
    // Coach y admin ven lo mismo que el alumno (gimnasio compartido, D6)
    async getAssignedPlan(
        userId: string,
        query: GetAssignedRoutinesQueryDto,
        res: Response
    ) {
        // La misma validacion que la via individual, antes de consultar
        if (query.from && query.to && query.from > query.to) {
            return res.status(400).send({
                error: 'La fecha inicial (from) no puede ser posterior a la final (to).'
            });
        }

        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                select: { id: true },
            });

            if (!user) {
                return res.status(404).send({ error: 'Usuario no encontrado' });
            }

            // Las asignaciones activas del alumno: las quitadas (E-14) salen del home, y una plantilla
            // dada de baja (E-11) no saca lo ya asignado. Sin filtro de fechas: son pocas por alumno y
            // el recorte por semanas se hace abajo, con las cuentas de plan_weeks. El orden (nombre de
            // la planificacion y alta) desempata los grupos de una misma semana
            const userPlanifications = await this.userPlanificationRepository
                .createQueryBuilder('userPlanification')
                .innerJoin('userPlanification.planification', 'planification')
                .addSelect(['planification.id', 'planification.name', 'planification.duration', 'planification.active'])
                .where('userPlanification.user_id = :userId', { userId: user.id })
                .andWhere('userPlanification.active = true')
                .orderBy('planification.name', 'ASC')
                .addOrderBy('userPlanification.created_at', 'ASC')
                .getMany();

            // De cada asignacion, las semanas que se pisan con [from, to]: de la 1 a la que contiene
            // end_date (spec §4), recortadas por las que contienen from y to. La semana va de lunes a
            // domingo, asi que se pisa aunque el plan arranque o termine a mitad de ella
            const weekRanges = userPlanifications
                .map(userPlanification => {
                    const lastWeek = planWeekOf(userPlanification.start_date, userPlanification.end_date);

                    return {
                        userPlanification,
                        first: query.from ? Math.max(1, planWeekOf(userPlanification.start_date, query.from)) : 1,
                        last: query.to ? Math.min(lastWeek, planWeekOf(userPlanification.start_date, query.to)) : lastWeek,
                    };
                })
                .filter(range => range.first <= range.last);

            // El tope se cuenta antes de consultar nada mas
            const weekCount = weekRanges.reduce((count, range) => count + range.last - range.first + 1, 0);

            if (weekCount > PLAN_WEEKS_LIMIT) {
                return res.status(400).send({ error: PLAN_WEEKS_LIMIT_ERROR });
            }

            if (weekRanges.length === 0) {
                return res.status(200).send([]);
            }

            // Las rutinas de las plantillas, activas o no (una quitada del plan se ve si el alumno hizo
            // algo, D29), de las semanas pedidas: el rango cubre las de todas las asignaciones y cada
            // semana toma despues las suyas. Orden de la spec: semana, order y alta
            const routineAsignations = await this.routineAsignationRepository
                .createQueryBuilder('routineAsignation')
                .innerJoin('routineAsignation.routine', 'routine')
                .addSelect(['routine.id', 'routine.name', 'routine.active'])
                .where('routineAsignation.planification_id IN (:...planificationIds)', {
                    planificationIds: [...new Set(weekRanges.map(range => range.userPlanification.planification_id))],
                })
                .andWhere('routineAsignation.week >= :firstWeek', { firstWeek: Math.min(...weekRanges.map(range => range.first)) })
                .andWhere('routineAsignation.week <= :lastWeek', { lastWeek: Math.max(...weekRanges.map(range => range.last)) })
                .orderBy('routineAsignation.week', 'ASC')
                .addOrderBy('routineAsignation.order', 'ASC')
                .addOrderBy('routineAsignation.created_at', 'ASC')
                .getMany();

            const routineAsignationsByWeek = new Map<string, RoutineAsignation[]>();

            for (const routineAsignation of routineAsignations) {
                const key = `${routineAsignation.planification_id}|${routineAsignation.week}`;

                if (!routineAsignationsByWeek.has(key)) {
                    routineAsignationsByWeek.set(key, []);
                }
                routineAsignationsByWeek.get(key)!.push(routineAsignation);
            }

            // Cada semana pedida de cada asignacion, con las rutinas de su plantilla para esa semana
            const weeks = weekRanges.flatMap(({ userPlanification, first, last }) =>
                Array.from({ length: last - first + 1 }, (_, index) => ({
                    userPlanification,
                    week: first + index,
                    routineAsignations: routineAsignationsByWeek.get(`${userPlanification.planification_id}|${first + index}`) ?? [],
                }))
            );

            // Las sesiones del plan: el par (asignacion, rutina del plan)
            const sessions = weeks.flatMap(({ userPlanification, routineAsignations }) =>
                routineAsignations.map(routineAsignation => ({ userPlanification, routineAsignation }))
            );
            const sessionKey = (userPlanificationId: string, routineAsignationId: string) =>
                `${userPlanificationId}|${routineAsignationId}`;

            // Lo hecho en cada sesion. Una marca cuya rutina no es de la plantilla de su asignacion (la
            // regla que la base no garantiza) no cae en ninguna sesion, asi que no cuenta
            const finishedBySession = new Map<string, Set<string>>();

            if (sessions.length > 0) {
                const finishedRows = await this.routineExerciseFinishedRepository
                    .createQueryBuilder('finished')
                    .select('finished.user_planification_id', 'user_planification_id')
                    .addSelect('finished.routine_asignation_id', 'routine_asignation_id')
                    .addSelect('finished.routine_exercise_id', 'routine_exercise_id')
                    .where('finished.user_planification_id IN (:...userPlanificationIds)', {
                        userPlanificationIds: [...new Set(sessions.map(session => session.userPlanification.id))],
                    })
                    .andWhere('finished.routine_asignation_id IN (:...routineAsignationIds)', {
                        routineAsignationIds: [...new Set(sessions.map(session => session.routineAsignation.id))],
                    })
                    .getRawMany<{ user_planification_id: string; routine_asignation_id: string; routine_exercise_id: string }>();

                for (const row of finishedRows) {
                    const key = sessionKey(row.user_planification_id, row.routine_asignation_id);

                    if (!finishedBySession.has(key)) {
                        finishedBySession.set(key, new Set());
                    }
                    finishedBySession.get(key)!.add(row.routine_exercise_id);
                }
            }

            // D29: una rutina quitada del plan se ve solo si el alumno hizo algo en ella en esta
            // asignacion (como un circuito sacado de la rutina, un nivel mas arriba)
            const isVisible = (userPlanification: UserPlanification, routineAsignation: RoutineAsignation) =>
                routineAsignation.active || finishedBySession.has(sessionKey(userPlanification.id, routineAsignation.id));

            // Los ejercicios vigentes solo hacen falta para las rutinas activas del plan: de una quitada
            // se ve solo lo completado
            const routineIds = [...new Set(sessions
                .filter(session => session.routineAsignation.active)
                .map(session => session.routineAsignation.routine_id))];
            const activeByRoutine = routineIds.length > 0
                ? await this.findActiveExercisesByRoutine(routineIds)
                : new Map<string, Set<string>>();

            const groups = weeks.map(({ userPlanification, week, routineAsignations }) => {
                const { week_start, week_end } = planWeekBounds(userPlanification.start_date, week);

                return {
                    user_planification: {
                        id: userPlanification.id,
                        start_date: userPlanification.start_date,
                        end_date: userPlanification.end_date,
                        coach_note: userPlanification.coach_note ?? null,
                        planification: {
                            id: userPlanification.planification.id,
                            name: userPlanification.planification.name ?? null,
                            duration: userPlanification.planification.duration,
                            active: userPlanification.planification.active,
                        },
                    },
                    week,
                    week_start,
                    week_end,
                    routines: routineAsignations
                        .filter(routineAsignation => isVisible(userPlanification, routineAsignation))
                        .map(routineAsignation => ({
                            routine_asignation_id: routineAsignation.id,
                            order: routineAsignation.order,
                            active: routineAsignation.active,
                            routine: {
                                id: routineAsignation.routine.id,
                                name: routineAsignation.routine.name,
                                active: routineAsignation.routine.active,
                            },
                            // En una rutina quitada del plan se ve solo lo completado, como si todos sus
                            // vinculos estuvieran dados de baja: finished = total
                            progress: this.buildProgress(
                                routineAsignation.active ? activeByRoutine.get(routineAsignation.routine_id) : undefined,
                                finishedBySession.get(sessionKey(userPlanification.id, routineAsignation.id)) ?? new Set<string>(),
                            ),
                        })),
                };
            });

            // Orden de la spec: week_start y, en la misma semana, el de la consulta (nombre de la
            // planificacion y alta). El sort de JS es estable, y los dias 'YYYY-MM-DD' se comparan como
            // texto
            groups.sort((a, b) => (a.week_start < b.week_start ? -1 : a.week_start > b.week_start ? 1 : 0));

            return res.status(200).send(groups);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener el plan del alumno.' });
        }
    }
```

- [ ] **Paso 5: los helpers de progreso.** Reemplazar `findAssignedRoutinesProgress` entero (su comentario y el método) por:

```ts
    // finished y total de cada asignacion individual (spec §4.3), con los dos helpers de progreso
    // que comparte con la via del plan
    private async findAssignedRoutinesProgress(
        assignments: RoutineAsignationUser[]
    ): Promise<Map<string, { finished: number; total: number }>> {
        const routineIds = [...new Set(assignments.map(assignment => assignment.routine_id))];
        const assignmentIds = assignments.map(assignment => assignment.id);

        const activeByRoutine = await this.findActiveExercisesByRoutine(routineIds);

        // Lo hecho en cada asignacion. getRawMany y no getMany: un select parcial sin la clave
        // primaria hace que TypeORM agrupe las filas por id y colapse el resultado
        const finishedRows = await this.routineAsignExerciseFinishedRepository
            .createQueryBuilder('finished')
            .select('finished.user_routine_asign_id', 'assignment_id')
            .addSelect('finished.routine_exercise_id', 'routine_exercise_id')
            .where('finished.user_routine_asign_id IN (:...assignmentIds)', { assignmentIds })
            .getRawMany<{ assignment_id: string; routine_exercise_id: string }>();

        const finishedByAssignment = new Map<string, Set<string>>();

        for (const row of finishedRows) {
            if (!finishedByAssignment.has(row.assignment_id)) {
                finishedByAssignment.set(row.assignment_id, new Set());
            }
            finishedByAssignment.get(row.assignment_id)!.add(row.routine_exercise_id);
        }

        const progressByAssignment = new Map<string, { finished: number; total: number }>();

        for (const assignment of assignments) {
            progressByAssignment.set(assignment.id, this.buildProgress(
                activeByRoutine.get(assignment.routine_id),
                finishedByAssignment.get(assignment.id) ?? new Set<string>(),
            ));
        }

        return progressByAssignment;
    }

    // Los ejercicios vigentes de cada rutina: activos y en un vinculo activo. Raw y con alias porque
    // no hay una entidad que los represente. Lo usan las dos vias (el home individual y el del plan)
    private async findActiveExercisesByRoutine(routineIds: string[]): Promise<Map<string, Set<string>>> {
        const activeRows = await this.dataSource
            .createQueryBuilder()
            .select('routineCircuit.routine_id', 'routine_id')
            .addSelect('routineExercise.id', 'routine_exercise_id')
            .distinct(true)
            .from(RoutineCircuit, 'routineCircuit')
            .innerJoin(RoutineExercise, 'routineExercise', 'routineExercise.circuit_id = routineCircuit.circuit_id')
            .where('routineCircuit.routine_id IN (:...routineIds)', { routineIds })
            .andWhere('routineCircuit.active = true')
            .andWhere('routineExercise.active = true')
            .getRawMany<{ routine_id: string; routine_exercise_id: string }>();

        const activeByRoutine = new Map<string, Set<string>>();

        for (const row of activeRows) {
            if (!activeByRoutine.has(row.routine_id)) {
                activeByRoutine.set(row.routine_id, new Set());
            }
            activeByRoutine.get(row.routine_id)!.add(row.routine_exercise_id);
        }

        return activeByRoutine;
    }

    // finished y total de una sesion (spec del bloque A, §4.3; las dos vias). total son los ejercicios
    // que el alumno ve en el detalle: los activos de los circuitos activos de la rutina MAS los dados
    // de baja que completo, cada uno una vez. Es una union de conjuntos de ids y no una suma: un
    // circuito repetido en la rutina (A, B, A) comparte sus Routine_Exercise, y un ejercicio completado
    // puede ser a la vez activo. Por eso la cuenta se hace en memoria y no con un COUNT en SQL. Sin
    // activos (una rutina quitada del plan), total = finished: se ve solo lo completado
    private buildProgress(
        activeIds: Set<string> | undefined,
        finishedIds: Set<string>
    ): { finished: number; total: number } {
        const visible = new Set([...(activeIds ?? []), ...finishedIds]);

        return { finished: finishedIds.size, total: visible.size };
    }
```

El SQL de las dos consultas de BE-12 queda igual y en el mismo orden (vigentes y después lo hecho): lo confirma la regresión de BE-12 (Tarea 6).

---

## Tarea 5 — Controller y módulo (spec §5 y §5.5)

**Archivos:** `power-app/src/routine/routine.controller.ts`, `power-app/src/routine/routine.module.ts`.

- [ ] **Paso 1: el import del controller.** Debajo de `import { RoutineHistorySessionDto } from '../dtos/routine/routine_history_response.dto';`:

```ts
import { RoutineAssignedPlanWeekResponseDto } from '../dtos/routine/routine_assigned_plan_response.dto';
```

- [ ] **Paso 2: el handler.** Entre el cierre de `getAssignedRoutines` y el comentario del historial (`// Historial de entrenamientos del alumno (E-06) …`):

```ts
    // La parte del plan del home (U-08). Un endpoint aparte de assigned/:userId (D28): el cliente
    // hace los dos pedidos, con el mismo from/to, y muestra las dos fuentes juntas. Mismos roles y
    // mismo @Owner que la via individual. No compite con 'assigned/:userId' ni con 'GET /:id': el
    // primer segmento es otro
    @Get('assigned-plan/:userId')
    @Auth(UserRole.user, UserRole.coach, UserRole.admin)
    @Owner('userId')
    @ApiResponse({ status: 200, type: [RoutineAssignedPlanWeekResponseDto], description: 'Una entrada por semana de cada plan activo del alumno que se pisa con [from, to], por week_start, nombre de la planificación y alta de la asignación. Sin filtro, todas las semanas. Sin planes, un array vacío' })
    @ApiResponse({ status: 400, description: 'Id o fecha inválidos, from posterior a to, o más de 520 semanas de plan para devolver (pedí un rango más corto con from y to)' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async getAssignedPlan(
        @Param() params: AssignedRoutinesParamsDto,
        @Query() query: GetAssignedRoutinesQueryDto,
        @Res() res: Response,
    ) {
        await this.routineService.getAssignedPlan(params.userId, query, res);
    }
```

- [ ] **Paso 3: el módulo.** En `routine.module.ts`, debajo de `import { RoutineAsignationUser } from '../entities/routine_asignation_user.entity';`:

```ts
import { UserPlanification } from '../entities/user_planification.entity';
import { RoutineAsignation } from '../entities/routine_asignation.entity';
```

y en el `forFeature`, después de `RoutineAsignationUser,`:

```ts
    UserPlanification,
    RoutineAsignation,
```

---

## Tarea 6 — Compilar y verificar

- [ ] **Paso 1: build.** `cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build`. Esperado: sin errores. Si falla por un tipo, corregir sin `as`.

- [ ] **Paso 2: los tres scripts nuevos, en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/3a1b39b7-ff8c-4255-8098-707f46ee20c7/scratchpad/be20"
unset ROOT; cd "$SCRATCH" && for s in verify-plan-weeks-home verify-assigned-plan-controller verify-assigned-plan-rules; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: **`92`**, **`91`** y **`113 ok, 0 fallas`** (los del prototipo), sin líneas `FALLA`. Si una regex del SQL falla por comillas o alias, **leer el SQL impreso primero** (`node verify-assigned-plan-rules.js | grep -A2 "SQL de"`) y ajustar el script, no el código. Si el falso no soporta algo que el service llama, ampliar el falso, no el service.

- [ ] **Paso 3: la regresión, en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/3a1b39b7-ff8c-4255-8098-707f46ee20c7/scratchpad/be20"
unset ROOT; cd "$SCRATCH" && for s in verify-assigned-dto verify-assigned-controller verify-assigned-rules verify-plan-weeks; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
cd "$SCRATCH/be18" && for s in verify-detail-rules verify-finished-rules verify-history-rules verify-finished-controller; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: los mismos números de la Tarea 0 (`24`, `27`, `58`, `86`, `47`, `130`, `48` y `43 ok, 0 fallas`). El de reglas de BE-12 exige el mismo SQL de las dos consultas del progreso, con los mismos parámetros: es lo que prueba que el refactor no lo cambió.

- [ ] **Paso 4: nadie más cambió, y el prototipo se desarma**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short
cmd //c rmdir "C:\Users\caram\AppData\Local\Temp\claude\D--Power-App-Backend-PowerApp-Backend\3a1b39b7-ff8c-4255-8098-707f46ee20c7\scratchpad\be20\proto\node_modules"
```
Esperado: en `git status` sólo los cinco archivos de código del mapa (cuatro modificados y el DTO nuevo). **La junction se saca con `rmdir`, nunca con `rm -rf`:** `rmdir` borra el enlace y deja intacto el `node_modules` del repo.

---

## Tarea 7 — Spec de CU-U-08 (repo PowerApp-Docs)

**Archivos:** `Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md` (reemplazo completo). Sigue el formato de la versión de BE-12.

- [ ] **Paso 1: el archivo**

```markdown
# CU-U-08 — Obtener mi Planificación

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Pantalla principal (home) del alumno: muestra las rutinas de su semana, las que vienen de una planificación asignada (~90%) y las individuales que el entrenador le asignó para un día concreto (~10%). Las rutinas del plan van por semana del plan, sin día, en el orden que les dio el entrenador; las individuales, por día. Cada rutina muestra su progreso: los ejercicios que ya hizo sobre el total.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Las rutinas individuales de la semana (Routine_Asignation_User), cada una con su día y su progreso.
- Las rutinas de la semana de cada planificación activa del alumno (User_Planification → Planification → Routine_Asignation), cada una con su orden dentro de la semana y su progreso.
- Mostrar juntas las dos fuentes cuando el alumno tiene ambas.
- Moverse a otra semana, anterior o posterior.

**Fuera de alcance:**

- Detalle de cada rutina (ver CU "Ver detalle de Rutina").
- Marcar ejercicios como realizados (CU «Marcar como realizado»).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- Operación de solo lectura; no cambia el estado del sistema.

## Camino principal (flujo básico)

1. El usuario abre el home.
2. El sistema busca las rutinas individuales asignadas al alumno para los días de la semana (de lunes a domingo, según las fechas que manda la aplicación) y calcula el progreso de cada una.
3. El sistema busca las planificaciones activas del alumno y, de cada una, la semana del plan que cae en esa semana del calendario. La semana 1 del plan es la de lunes a domingo que contiene su fecha de inicio, y la última es la que contiene su fecha de fin. Trae las rutinas de esa semana del plan, en el orden que les dio el entrenador, y calcula el progreso de cada una.
4. El sistema presenta juntas las rutinas individuales, ordenadas por día, y las del plan, agrupadas por planificación, con el nombre del plan y el número de semana.

## Caminos alternativos / excepciones

### En el paso 3 — Sin plan esa semana pero con rutinas individuales

1. El alumno no tiene ninguna planificación activa con una semana que caiga en la semana pedida (no tiene ninguna, todavía no empezó o ya terminó).
2. El sistema muestra sólo sus rutinas individuales de la semana.

### En el paso 3 — Con plan y con rutinas individuales

1. El alumno tiene las dos cosas.
2. El sistema muestra las dos: una rutina individual asignada a propósito no queda oculta mientras dure el plan.

### En el paso 3 — Dos planificaciones en la misma semana

1. El alumno tiene dos planificaciones activas cuyas fechas se pisan (el entrenador confirmó el aviso de solapamiento de CU-E-13).
2. El sistema muestra las dos, cada una con sus rutinas de esa semana.

### En el paso 3 — El plan arranca o termina a mitad de semana

1. La fecha de inicio o la de fin del plan cae a mitad de la semana.
2. El sistema muestra igual esa semana del plan completa: sus rutinas no tienen día, así que el alumno las hace en los días que le quedan.

### En el paso 3 — Una semana del plan sin rutinas

1. La planificación no tiene rutinas para esa semana (por ejemplo, el entrenador le fijó al alumno un fin más largo que la duración de la planificación).
2. El sistema muestra la semana del plan, vacía.

### En el paso 3 — El entrenador quitó una rutina del plan

1. El entrenador quitó una rutina de esa semana de la planificación (CU-E-12c).
2. Si el alumno ya había hecho algo en ella, el sistema la sigue mostrando, indicando que fue quitada, y sólo con lo que hizo. Si no había hecho nada, no la muestra.

### En el paso 3 — Planificación quitada al alumno

1. El entrenador le quitó la planificación al alumno (CU-E-14).
2. El sistema no la muestra en el home. Lo que el alumno hizo en ella sigue en su historial.

### En los pasos 2 y 3 — La planificación o la rutina fueron dadas de baja después de asignarlas

1. El entrenador dio de baja la planificación (CU-E-11) o la rutina (CU-E-18) después de asignarla.
2. El sistema la sigue mostrando, indicando que está dada de baja: la asignación existe y el alumno puede ejecutarla.

### En los pasos 2 y 3 — Un ejercicio fue dado de baja

1. El entrenador sacó un ejercicio de la rutina después de que el alumno lo hizo.
2. El sistema lo cuenta en el progreso de esa rutina: se ve lo dado de baja que el alumno completó, y sólo eso.

### En el paso 4 — El alumno se mueve a otra semana

1. El alumno pide la semana anterior o la siguiente.
2. El sistema repite los pasos 2 a 4 para esa semana, también si ya pasó: lo que hizo se sigue viendo en el progreso.

### En el paso 4 — Sin asignaciones

1. El alumno no tiene rutinas del plan ni rutinas individuales esa semana.
2. El sistema muestra un estado vacío indicando que aún no tiene entrenamiento asignado.
```

- [ ] **Paso 2: control**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && grep -c "vigente" "Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md"
```
Esperado: `0`. La API no calcula ningún estado "vigente" (spec §5): devuelve las asignaciones **activas** cuyas semanas caen en el rango, igual que se corrigió en E-14.

---

## Tarea 8 — Status (informe y dashboard)

**Archivos:** `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html`. **Los cambios fechados anteriores no se tocan.**

**Conteos nuevos:** ✅ 68 · 🟡 6 · 🔵 0 · ⬜ 0 · sin backend 1 (de 75). Usuario: 18 ✅ y 1 🟡. Porcentajes: ✅ **91%** de 75 (68/75 = 90,67), 🟡 **8%** (6/75); **92%** de los 74 con backend (68/74 = 91,89); Usuario **95%** (18/19 = 94,74).

- [ ] **Paso 1: entrada nueva arriba de la de BE-19**: `## Cambios recientes (2026-10-21 · bloque B: el plan en el home del alumno)`, **con el porqué de cada punto**. Puntos obligatorios:
  - **Vigésima primera tarea del roadmap (BE-20): la parte del plan de U-08.** Plan: `Doc/plans/2026-10-21-be-20-el-plan-en-el-home-plan.md` (repo PowerApp-Docs).
  - **El contrato** (§5.5): `GET /routine/assigned-plan/:userId?from=&to=`, user con `@Owner('userId')`, coach y admin. Va en `routine/` (D27) y es un endpoint aparte del de la vía individual (D28): el cliente hace los dos pedidos con el mismo `from`/`to` y muestra las dos fuentes juntas. Validaciones: `400` si `from > to` (el mismo texto de la vía individual) → `404` si el usuario no existe → `400` si hay más de 520 semanas → `200`.
  - **Qué devuelve:** un grupo por semana de cada asignación **activa** (las quitadas en E-14 salen del home) que se pisa con `[from, to]`, de la 1 a la que contiene `end_date`, con `week_start` y `week_end` (lunes y domingo aunque el plan arranque o termine a mitad), ordenados por `week_start`, nombre de la planificación y alta. Sin filtro, todas las semanas. Las rutinas, por `order` y alta, **sin día** (D28), cada una con su progreso. Una semana sin rutinas viene con `routines: []`.
  - **Las semanas** (D15, D16): lineales, la 1 es la de lunes a domingo que contiene `start_date`. Las cuentas son dos funciones nuevas de `plan_weeks.ts`, en UTC como las de BE-18b, para que la zona del servidor no corra un día.
  - **La visibilidad** (D29): una rutina quitada del plan (E-12c) se ve sólo si el alumno hizo algo en ella **en esa asignación**, y su progreso es `finished = total` (sólo se ve lo completado). Una plantilla (E-11) o una rutina (E-18) dadas de baja se siguen viendo, con su `active: false`.
  - **Decisión del 21/10 con el usuario: el tope de 520 semanas**, y por qué (hallazgo 1 del plan: un fin absurdo pedido sin filtro tiraría el proceso en el free tier; el home nunca lo toca; el mismo criterio que el tope de BE-18b).
  - **Decisiones del plan:** los textos; el query y el param de BE-12; coach y admin ven lo mismo que el alumno; la semana se pisa entera; las asignaciones se traen sin filtro de fechas y el recorte es en memoria; una sola consulta de rutinas por plantillas y rango de semanas; el orden en dos partes (nombre en SQL, `week_start` en memoria); el domingo de la semana del 9999-12-31 se recorta a ese día.
  - **El progreso se generalizó para las dos vías** (§12 de la spec): `findActiveExercisesByRoutine` (la consulta de vigentes de BE-12, sin cambios) y `buildProgress` (la unión). El home individual quedó igual: lo confirmó su regresión.
  - **Hallazgo técnico:** el build no detecta un repositorio que falta en el `forFeature` del módulo (el server no arrancaría); el script del controller lo cruza.
  - **Verificación:** build; los tres scripts nuevos (las cuentas de semanas en tres zonas, el controller con su Swagger y el `forFeature`, las reglas con el SQL e hidratación sin base), con sus números en rojo y en verde; la regresión de BE-12, BE-18b y BE-18 en verde. **Qué no se verificó:** el SQL contra un Postgres, el `OwnerGuard` corriendo en el server y el runtime (BE-35); el progreso del plan con marcas reales, porque nada escribe `Routine_Exercise_Finished` hasta BE-20c.
  - **U-08 pasa de 🟡 a ✅ (68 ✅ · 6 🟡 · 0 🔵).** Spec de CU reescrita: **U-08** (la parte del plan por semana, sin día y con su progreso; lo individual sigue por día). **Para el web:** B1 tipa la parte del plan contra §5.5. **Sigue BE-20b** (el detalle de una sesión del plan).

- [ ] **Paso 2: secciones vivas del informe**
  - Tabla de resumen: `| ✅ Implementado | 68 | 91% |…` y `| 🟡 Parcial | 6 | 8% |…`.
  - La línea de abajo: `**68 de los 74 CU con backend están completos (92%).** Faltan 6, todos parciales: ya no queda ninguno sin endpoint ni en andamiaje. Dos de los ✅ tienen un defecto abierto (⚠): CU-E-29 y CU-A-04.`
  - Cobertura por rol: `| Usuario | 20 | 18 | 1 | 0 | 0 | 1 | 95% |` y `| **Total** | **75** | **68** | **6** | **0** | **0** | **1** | **92%** |`.
  - Encabezado: `## Detalle — Rol Usuario (20 CU · 95%)`.
  - Fila de **CU-U-08**: `| CU-U-08 | Obtener mi planificación | ✅ Implementado | \`GET /routine/assigned/:userId?from=&to=\` · la parte **individual** del home, por día y con su progreso (18/10) · \`GET /routine/assigned-plan/:userId?from=&to=\` · la parte **del plan**: las semanas de cada asignación activa que caen en el rango, sus rutinas sin día y con su progreso; una rutina quitada del plan sólo si el alumno hizo algo · tope de 520 semanas (BE-20, 21/10) |`
  - "Plan de trabajo", fila de la fase 3: `en curso: BE-17, BE-18, BE-18b, BE-19 y BE-20 hechas (20 y 21/10)`.

- [ ] **Paso 3: dashboard**
  - Tile de implementados: `<div class="n">68</div>` y `91% · cumple su spec`. Tile de parciales: `<div class="n">6</div>` y `8% · un camino sin cumplir`.
  - La barra: `aria-label="68 implementados, 6 parciales, 0 andamiaje, 0 no implementados y 1 sin backend, de 75"`, `s-done` a `width:90.67%` y `s-partial` a `width:8%`.
  - El pie de la barra: `<b>68 de los 74</b> CU con backend completos (92%)` y `<b>6</b> pendientes (6 parciales)`.
  - Tarjeta del Usuario: `95%`, `18 de 19 con backend · Mi cuenta, RMs, el home, el detalle de la rutina y el marcado de ejercicios cerrados (salvo el mail de U-04)`, la mini barra con `width:90%` (implementados) y `width:5%` (parciales), y en la leyenda `<b>18</b> impl.` y `<b>1</b> parc.`
  - Título de sección: `Rol Usuario` → `20 CU · 95% implementado (sobre 19 con backend)`.
  - Fila de CU-U-08: `<span class="chip done"><span class="cd"></span>Implementado</span>` y `<span class="verb">GET</span> /routine/assigned/:userId <span class="muted">· la parte individual, por día y con su progreso (18/10) · </span><span class="verb">GET</span> /routine/assigned-plan/:userId <span class="muted">· la parte del plan: las semanas de cada plan activo, sus rutinas sin día y con su progreso · tope de 520 semanas (BE-20, 21/10)</span>`.
  - Fila de la fase 3: `<span class="muted">BE-17, BE-18, BE-18b, BE-19 y BE-20 (20 y 21/10)</span>`.
  - El pie de página: `68 impl · 6 parc · 0 andam · 0 falta · 1 sin backend — de 75 · corte 2026-10-21`.

- [ ] **Paso 4: control de los conteos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status" && grep -c "✅ Implementado |" estado-implementacion-backend.md && grep -c "🟡 Parcial |" estado-implementacion-backend.md && grep -c 'chip done"><span class="cd"></span>Implementado' dashboard-estado-backend.html && grep -c 'chip partial"><span class="cd"></span>Parcial' dashboard-estado-backend.html
```
Esperado: `69`, `7`, `69` y `7`. Cada patrón de estado aparece una vez más que el conteo: en el informe, por la fila de la tabla de resumen; en el dashboard, por la leyenda del pie. Antes del cambio dan `68`, `8`, `68` y `8` (verificado al escribir el plan). Si da otro número, buscar la diferencia antes de seguir.

---

## Tarea 9 — Stage y mensajes de commit

- [ ] **Paso 1: backend**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/planification/plan_weeks.ts power-app/src/dtos/routine/routine_assigned_plan_response.dto.ts power-app/src/routine/routine.service.ts power-app/src/routine/routine.controller.ts power-app/src/routine/routine.module.ts Status/estado-implementacion-backend.md Status/dashboard-estado-backend.html && git status --short && git diff --cached --stat
```
Esperado: sólo esos siete archivos en el stage y nada fuera de él.

- [ ] **Paso 2: docs**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && git add "Doc/plans/2026-10-21-be-20-el-plan-en-el-home-plan.md" "Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md" && git status --short
```

- [ ] **Paso 3: proponer un mensaje por repo, sin commitear ni pushear.**
  - Backend: `BE-20: el plan en el home del alumno (U-08), GET /routine/assigned-plan/:userId` y, como cuerpo: `De cada asignacion activa, las semanas del plan que se pisan con from/to (la 1 es la de lunes a domingo que contiene el inicio, la ultima la que contiene el fin), cada una con sus rutinas sin dia y su progreso. Una rutina quitada del plan se ve solo si el alumno hizo algo en ella. Tope de 520 semanas por pedido. Las cuentas de semanas suman planWeekOf y planWeekBounds, y el progreso de BE-12 se parte en dos helpers que comparten las dos vias. Status: U-08 pasa a implementado (68 de 74).`
  - Docs: `Plan de BE-20 y spec de U-08 reescrita: el home suma las semanas del plan, sin dia y con su progreso`.

---

## Tarea 10 — Memoria del proyecto

- [ ] **Paso 1:** actualizar `project_cu_status.md` (BE-20 hecha y stageada, U-08 ✅, 68 de 74; la decisión del 21/10 del tope de 520 semanas; sigue BE-20b) y su línea en `MEMORY.md`. En `project_offline_query_verification.md`, sumar la técnica nueva: cruzar los repositorios que inyecta un service con el `forFeature` de su módulo (`self:paramtypes` contra los `providers` de los `imports`), y el prototipo en una copia del proyecto con `node_modules` enlazado para probar el código de un plan antes de aprobarlo.

---

## 4. Qué NO verifica este plan

- **El SQL contra un Postgres de verdad:** las cuatro consultas se verifican como texto y con filas armadas a mano.
- **Que los guards hagan lo suyo en el server:** se prueba la metadata y el `OwnerGuard` real con un contexto armado, no el pipeline de Nest corriendo.
- **Que el server arranque:** se prueba que el módulo registre los repositorios que el service inyecta, no la inyección en sí.
- **El progreso del plan con marcas reales:** nada escribe `Routine_Exercise_Finished` hasta BE-20c.
- **El runtime** (BE-35, contra Render regenerado y con el seed de BE-21, que todavía no trae asignaciones de plan).

## 5. Autoevaluación contra la spec

- **§5.5:** el filtro y sus códigos (Tarea 4, reutilizando BE-12), las semanas de cada asignación activa y su recorte (Tareas 2 y 4), la forma (Tareas 3 y 4), el orden (Tarea 4), el progreso y `routines: []` (Tarea 4). Los prueban la Tarea 1, pasos 1 y 3.
- **§4, D15, D16:** `planWeekOf` y `planWeekBounds` en UTC (Tarea 2), probadas en tres zonas (Tarea 1, paso 1).
- **§5.4, D29:** la rutina quitada del plan visible sólo con algo hecho en esa asignación, con `finished = total`; la plantilla y la rutina de baja se siguen viendo (Tarea 4, probado en la Tarea 1, paso 3).
- **§5 tabla, D27, D28:** la ruta en `routine/`, aparte de la individual, con sus roles y `@Owner` (Tarea 5), probada en la Tarea 1, paso 2.
- **§5 convenciones:** ids de las filas (el alumno se filtra por el id de la fila); `await` en el handler; ningún `403` nuevo (el único es el del `OwnerGuard`); Swagger con respuesta y códigos.
- **§12:** los helpers de progreso generalizados, sin service nuevo (Tarea 4), con la regresión de BE-12 (Tarea 6).
- **§7:** CU-U-08 (Tarea 7). **§9:** U-08 a ✅ (Tarea 8). **§10:** build, los tres scripts y la regresión (Tarea 6). **§11:** Status (Tarea 8).

## 6. Después de esto

**BE-20b** (el detalle de una sesión del plan, §5.6): `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId`, con las validaciones de §5.4 y el árbol de los builders de la vía individual. El home del plan ya devuelve los dos ids que lo abren (`user_planification.id` y `routine_asignation_id`). No mueve conteos.
