# BE-20b — El detalle de una sesión del plan (CU-U-09, CU-U-10) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` y se propone el mensaje (Tarea 10).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escriben **antes** del código y se corren en rojo.
> 3. **No se levanta el server**, ni siquiera en segundo plano, y **no se instala nada**. El SQL se verifica como texto, con el `DataSource` sin conexión.

**Spec que manda:** [`2026-10-22-detalle-de-una-sesion-del-plan-design.md`](../specs/2026-10-22-detalle-de-una-sesion-del-plan-design.md) (D37 a D39, §3 contrato, §4 lo que sigue igual, §5 implementación, §6 CU, §8 verificación, §9 impacto). Para las reglas comunes de una sesión del plan: [§4, §5.4 y §5.6 del bloque B](../specs/2026-10-20-asignar-planificaciones-design.md).
**Parte de:** BE-13 (`GET /routine/assign-user/:id`, `findRoutineDetail`, `buildAssignmentVisibility` y los builders del árbol), BE-20 (`findAssignedPlanWeeks`, el bloque `user_planification` y `planWeekBounds`) y BE-20e (`ac88f88` en el backend).
**Modelo:** sin cambios. **No cambia ninguna entidad**, así que no se tocan `Db Creator`, el diagrama ni `routine.module.ts` (los repositorios de `User_Planification`, `Routine_Asignation` y `Routine_Exercise_Finished` ya están registrados desde BE-20).

**Goal:** que `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId` devuelva la rutina de una sesión del plan con lo que el alumno ya hizo, con las validaciones de §5.4, la forma de D37 y el `404` de D38, sin que cambie lo que responden el detalle individual, `GET /routine/:id` ni el home del plan.

**Architecture:** un handler nuevo en el service, `getPlanSessionDetail`, que valida la sesión con un helper que va a compartir con BE-20c (`findPlanSession`: `404` → `403` con el rol `user` → `404`), lee las marcas de la sesión, aplica D38 y arma el árbol con los builders de BE-13. `buildRoutineDetailResponse` suma un parámetro opcional, `onlyCompleted`, para la rutina quitada del plan. El bloque `user_planification` sale de un builder nuevo que usa también el home del plan, y `planWeekBounds` recorta el lunes al 9999-12-31. Dos DTOs nuevos (los params y la respuesta) y un handler en el controller.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` + `class-transformer` · `@nestjs/swagger` · scripts de Node en el scratchpad, adaptados de los de BE-13 y BE-20.

> **El código de las Tareas 2 a 5 se probó al escribir el plan** en una copia de `HEAD` (`ac88f88`) en el scratchpad (`be20b/proto`, sacada con `git archive`, con `node_modules` enlazado por una junction al del repo y compilada con `tsc`). Los resultados:
> - **Los scripts nuevos**, en verde a la primera: 15, 74 y 152 chequeos. La foto de BE-13 dio idéntica (19).
> - **La regresión**, sin fallas.
> - **Las ediciones de este plan, aplicadas sobre `HEAD`, dan exactamente el prototipo** (`check-edits.js`).
> - **Aplicadas sobre el árbol de trabajo con BE-24 a BE-26 stageadas**, compilan y pasan los mismos scripts.
>
> El repo no se tocó.

---

## 1. Decisiones del plan (lo que la spec no dice; se pueden vetar al aprobarlo)

1. **El bloque `user_planification` sale de un builder nuevo, `buildPlanUserPlanificationResponse`, que usa también el home del plan (BE-20).** D37 pide "el bloque del home más `active`". Con un solo builder son iguales por construcción, como D36 en el home. Toca `findAssignedPlanWeeks`: doce líneas pasan a ser una llamada, sin cambiar lo que responde. Lo prueban la regresión de BE-20 y BE-20e y un chequeo nuevo que compara el bloque del detalle con el del home para la misma asignación.
2. **`active` va al final del bloque:** `{ id, start_date, end_date, coach_note, planification, active }`. Es el orden del DTO, que hereda de `RoutineAssignedPlanUserPlanificationDto` y le suma `active`. La spec quedó escrita en ese orden.
3. **`planWeekBounds` recorta también el lunes al 9999-12-31.**
   - **Por qué:** una plantilla sin duración fija (0) acepta semanas hasta la INTEGER_MAX, y el detalle abre cualquier semana por su ruta (D5). Sin el recorte:
     - Desde la semana ~416.000, que arranca después del 9999-12-31, el lunes saldría mal formado (`+011609-…`).
     - Desde la ~14 millones, `toISOString` tiraría un `RangeError` (un `500`).
   - **Con el recorte,** `week_start` y `week_end` valen `9999-12-31`. Es el mismo tope técnico que ya tenía el domingo.
   - **El home no cambia:** nunca pide semanas posteriores al fin de la asignación, que no pasa del 9999-12-31.
   - **Se descartaron:**
     - Un `400`: la sesión existe y se puede leer.
     - Devolver `null`: cambiaría el tipo de dos campos por un caso absurdo.
4. **Los textos que la spec no fija:**
   - `500`: `Error al obtener la rutina del plan.`
   - Los del DTO: `El ID de la asignación debe ser un UUID válido en formato PostgreSQL` y `El ID de la rutina del plan debe ser un UUID válido en formato PostgreSQL`.
   - La rutina inexistente (imposible con la FK): `Rutina no encontrada`, como en BE-13.
5. **Los tipos se abren con uniones de las dos entidades** (`RoutineAsignExerciseFinished | RoutineExerciseFinished` y `RoutineAsignationUser | UserPlanification`), no con tipos estructurales. Así la firma dice cuáles son las dos vías.
6. **Las consultas:**
   - **La asignación,** con un query builder y la misma selección de la plantilla que el home del plan: sólo `id`, `name`, `duration` y `active`.
   - **La rutina del plan,** con `findOne` por `id` y por `planification_id`.
   - **Las marcas,** con `find`, en el mismo orden que la vía individual: `created_at` y después `routine_exercise_id`.
7. **Dónde va cada cosa:**
   - **El handler del service,** después de `findAssignedPlanWeeks`, en la sección del plan del alumno.
   - **`findPlanSession` y `buildPlanUserPlanificationResponse`,** en una sección nueva, `HELPERS DEL PLAN DEL ALUMNO`, antes de `HELPERS DE RUTINA`.
   - **El handler del controller,** antes del historial.
8. **`PlanSessionParamsDto` es nuevo** y no generaliza `AssignedFinishedParamsDto`, que es de la vía individual. BE-20c le suma `routineExerciseId` para desmarcar, con un DTO que lo extienda.
9. **CU-U-10 suma un camino que §6 de la spec no nombra:** con la planificación quitada, el detalle del ejercicio sólo ofrece ver los RMs. Es la consecuencia de D24 en la pantalla del ejercicio.

**Hallazgos técnicos:**

10. **Otra sesión dejó stageadas BE-24 a BE-26 en el backend el 22/10.** Tocan `routine.service.ts` (sacan `isDatabaseError` a `common/database_error.ts`) y `Status/`.
    - **No se cruzan con BE-20b:** cada anclaje de este plan aparece una sola vez en `HEAD` y en el árbol con esos cambios. Aplicadas sobre ese árbol, las ediciones compilan y pasan los scripts nuevos.
    - **El prototipo se armó desde `HEAD`,** para no arrastrar esos cambios.
    - **BE-20b se implementa con el árbol limpio** (Tarea 0).
11. **Los scripts de los controllers de BE-20 y BE-20e suben de 93 a 95 y de 74 a 76 chequeos:** recorren todos los handlers de `routine/`, y ahora hay uno más.
12. **La herencia del DTO no le pasa `active` al bloque del home:** `@nestjs/swagger` guarda la lista de propiedades en el prototipo de cada clase. El script del controller lo comprueba en el documento de Swagger.
13. **El SQL**, generado sin base:
    - La asignación: `… INNER JOIN "Planification" "planification" ON … WHERE "userPlanification"."id" = $1`.
    - La rutina del plan: `… WHERE (("RoutineAsignation"."id" = $1) AND ("RoutineAsignation"."planification_id" = $2)) LIMIT 1`.
    - Las marcas: `… ORDER BY "RoutineExerciseFinished"."created_at" ASC, "RoutineExerciseFinished"."routine_exercise_id" ASC`.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/planification/plan_weeks.ts` | `planWeekBounds` recorta también el lunes; el comentario de cabecera |
| `power-app/src/dtos/routine/plan_session_params.dto.ts` | **Nuevo:** los dos ids del path |
| `power-app/src/dtos/routine/routine_plan_session_detail_response.dto.ts` | **Nuevo:** la respuesta y el bloque con `active` |
| `power-app/src/routine/routine.service.ts` | `getPlanSessionDetail`, `findPlanSession` y `buildPlanUserPlanificationResponse` (nuevos); `findAssignedPlanWeeks` usa el builder; `onlyCompleted` en `buildRoutineDetailResponse`; los tipos de `buildAssignmentVisibility`, `isAssignmentOwner` y `buildFinishedResponse` |
| `power-app/src/routine/routine.controller.ts` | El handler `getPlanSessionDetail` y sus imports |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | La entrada del 22/10, las filas de U-09 y U-10 y la fase 3 |

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**:
- Este plan y la spec del detalle.
- `Use Cases/usuario/CU-U-09-ver-detalle-de-rutina.md` y `CU-U-10-ver-detalle-de-un-ejercicio.md`.
- Una nota en §5.6 de `Doc/specs/2026-10-20-asignar-planificaciones-design.md`.

**Scratchpad** (`C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/61fe7dcf-18ce-4438-ac72-cd186d350cfb/scratchpad/be20b/`, fuera de los repos):
- `lib.js` y los cuatro scripts nuevos.
- `edits.js` y `check-edits.js`.
- La regresión: once scripts de BE-12, BE-18b, BE-20 y BE-20e, y cuatro de BE-18 en `be18/`, con `be18/fixtures.js`.
- La copia de `HEAD` (`head/`) y el prototipo (`proto/`).
- `cu-u-09.md` y `cu-u-10.md`.

> **Ojo con `head/`, `proto/` y `wt/`:** su `node_modules` es una junction al del repo. Si alguna vez se borran, primero `cmd //c rmdir <dir>/node_modules` y recién después el resto. **Nunca `rm -rf` con la junction adentro:** borraría el `node_modules` real.

---

## 3. Cobertura de la spec

| Spec | Qué pide | Tarea |
|---|---|---|
| D37, §3 | El bloque `user_planification` del home más `active`; `week_start` y `week_end` | 3, 4 |
| D38, §3 | `404` propio para la rutina quitada sin nada hecho, con los tres roles | 4 |
| D39, §5 | `findPlanSession`, con el `403` cuando el rol es `user` | 4 |
| §3 validaciones | `400` (DTO) → `404` → `403` → `404` → `404` | 3, 4, 5 |
| §3 `routine` | Los mismos builders; en una rutina quitada, sólo lo completado; los ejercicios del árbol son el `total` del home | 4 |
| §3 `finished` | La forma de la vía individual, por `created_at` y `routine_exercise_id` | 4 |
| §4 | Se lee con la asignación quitada (D24); las bajas son informativas; sin ventana de fechas (D5) | 2, 4 |
| §5 | Los DTOs; no cambian las entidades, el módulo ni `Db Creator`; los tipos abiertos | 3, 4 |
| §6 | CU-U-09 y CU-U-10 | 7 |
| §8 | Build; los params; el controller; las reglas; la regresión, con la foto de BE-13 | 0, 1, 6 |
| §9 | Status sin cambio de conteos; la nota en §5.6 | 8, 9 |

---

## Tarea 0 — Línea de base

**Archivos:** ninguno (lectura), salvo la foto de BE-13 en el scratchpad.

> **Nota de shell:** el shell no conserva variables entre comandos. Cada bloque que las usa empieza definiéndolas.

- [ ] **Paso 1: los dos repos, el build y los conteos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short && git log --oneline -1 && npm --prefix power-app run build
cd "D:/Power App/Docs/PowerApp-Docs" && git status --short && git log --oneline -1
grep "| ✅ Implementado |" "D:/Power App/Backend/PowerApp-Backend/Status/estado-implementacion-backend.md"
```
**Esperado:**
- **Backend:** sin cambios pendientes, y el build sin errores. Puede estar en `ac88f88` (BE-20e) o en el commit de BE-24 a BE-26, que otra sesión dejó stageado el 22/10. **Si hay cambios sin commitear de otra tarea, preguntar** y esperar a que el usuario los commitee: este plan no los stagea ni los toca.
- **Docs:** este plan y la spec del detalle, stageados o ya commiteados.
- **Conteos:** anotar la fila de ✅ del resumen. La Tarea 9 comprueba que no cambie.

- [ ] **Paso 2: la regresión en verde, antes de tocar nada**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/61fe7dcf-18ce-4438-ac72-cd186d350cfb/scratchpad/be20b"
unset ROOT; cd "$SCRATCH" && for s in verify-assigned-dto verify-assigned-controller verify-assigned-rules verify-plan-weeks verify-plan-weeks-home verify-assigned-plan-controller verify-assigned-plan-rules verify-home-weeks verify-home-dto verify-home-controller verify-home-rules; do echo "== $s"; node $s.js 2>&1 | grep -E "FALLA|fallas$"; done
cd "$SCRATCH/be18" && for s in verify-detail-rules verify-finished-rules verify-history-rules verify-finished-controller; do echo "== $s"; node $s.js 2>&1 | grep -E "FALLA|fallas$"; done
```
**Esperado,** todos con `0 fallas` (son los números de la corrida al escribir el plan):
- BE-12: `24`, `27` y `58 ok`.
- BE-18b: `86`.
- BE-20: `92`, `93` y `113`.
- BE-20e: `96`, `31`, `74` y `58`.
- BE-18: `47`, `130`, `48` y `43`.

Los `lib.js` leen la raíz del proyecto de `process.env.ROOT` si está definida (para correr contra el prototipo) y, si no, usan `power-app` del repo. Al ejecutar el plan **no se define `ROOT`**.

- [ ] **Paso 3: los anclajes del plan y la foto de BE-13**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/61fe7dcf-18ce-4438-ac72-cd186d350cfb/scratchpad/be20b"
cd "$SCRATCH" && node check-edits.js | grep -E "FALLA|fallas$"; node check-edits.js repo | grep -E "FALLA|fallas$"
unset ROOT; node snapshot-be13.js take
```
**Esperado:**
- **El primer chequeo, `0 fallas`.** Las ediciones dan el prototipo sobre `HEAD` (`ac88f88`), y cada anclaje está una sola vez en el árbol de trabajo.
- **El segundo, exactamente `5 fallas`:** las tres de "HEAD del repo + ediciones = el archivo del repo" y las dos de "igual al prototipo". Es el rojo esperado: el repo todavía no tiene el cambio. **Ninguna falla tiene que decir "el anclaje está una sola vez".**
- **La foto,** `foto guardada: 17 respuestas`. Sale del build del repo, antes de tocar el código.

---

## Tarea 1 — Scripts de verificación, en rojo

**Archivos:** sólo el scratchpad (`$SCRATCH`). Son cuatro scripts nuevos, sobre el código compilado (`power-app/dist`), y las dos herramientas de las ediciones. **Ya se escribieron y se corrieron en rojo al preparar el plan**; si están, se usan tal cual.

- [ ] **Paso 1: `snapshot-be13.js`.** Es la foto de lo que hoy responden las lecturas que comparten builders con el detalle nuevo:
  - el detalle individual, en ocho escenarios de visibilidad, con la rutina dada de baja, con los tres roles, con el id en mayúscula y en sus tres errores;
  - y `GET /routine/:id`.

  Con `take` la guarda; sin argumentos, exige que lo de ahora sea idéntico. Usa `be18/fixtures.js`, el árbol de BE-13.

```js
const fs = require('fs');
const path = require('path');
const { dist, check, run, finish } = require('./lib');
const { NOW, ROUTINE_ID, tree } = require('./be18/fixtures');

// La foto de lo que hoy responden las lecturas que comparten builders con el detalle de una sesion
// del plan (BE-20b toca buildRoutineDetailResponse y los tipos de buildAssignmentVisibility,
// buildFinishedResponse e isAssignmentOwner): el detalle individual (BE-13) en cada escenario de
// visibilidad y con cada rol, y GET /routine/:id. Con 'take' la guarda; sin argumentos, exige que
// lo de ahora sea identico a la foto
const { RoutineService } = dist('routine/routine.service');
const { UserRole } = dist('entities/user.entity');

const FILE = path.join(__dirname, 'snapshot-be13.json');
const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const OTHER_ID = '11111111-2222-4333-8444-555555555555';
const ASSIGN_ID = 'c1c1c1c1-aaaa-4bbb-8ccc-dddddddddddd';

const assignmentRow = { id: ASSIGN_ID, routine_id: ROUTINE_ID, user_id: USER_ID, date: '2026-10-20', created_at: NOW, updated_at: NOW };
const done = (...ids) => ids.map((id, i) => ({
  user_routine_asign_id: ASSIGN_ID, routine_exercise_id: id, user_note: i % 2 ? 'nota ' + id : null, finished_at: '2026-10-19',
  created_at: new Date(NOW.getTime() + i * 1000), updated_at: new Date(NOW.getTime() + i * 1000),
}));

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

function build(cfg = {}) {
  const routineRepository = { findOne: async () => (cfg.routine === undefined ? tree() : cfg.routine) };
  const assignmentRepository = { findOne: async () => (cfg.assignment === undefined ? null : cfg.assignment) };
  const finishedRepository = { find: async () => cfg.finished || [] };
  return new RoutineService({}, routineRepository, {}, {}, assignmentRepository, finishedRepository);
}

async function detail(cfg, role = UserRole.user, id = USER_ID) {
  const res = makeRes();
  await build(cfg).getAssignedRoutineById(ASSIGN_ID, { id, role, active: true }, res);
  return { status: res.statusCode, body: res.body };
}

(async () => {
  const photo = {};
  const sets = [[], ['c'], ['a'], ['e'], ['d', 'f'], ['g'], ['a', 'e', 'g'], ['a', 'b', 'c', 'd', 'e', 'f', 'g']];

  await run('arma la foto', async () => {
    for (const ids of sets) {
      photo[`detalle, hecho [${ids}]`] = await detail({ assignment: assignmentRow, finished: done(...ids) });
    }
    photo['detalle, rutina dada de baja'] = await detail({ assignment: assignmentRow, routine: tree({ active: false }), finished: done('a') });
    photo['detalle, coach'] = await detail({ assignment: assignmentRow, finished: done('e') }, UserRole.coach, OTHER_ID);
    photo['detalle, admin'] = await detail({ assignment: assignmentRow, finished: done('e') }, UserRole.admin, OTHER_ID);
    photo['detalle, alumno con el id en mayúscula'] = await detail({ assignment: assignmentRow }, UserRole.user, USER_ID.toUpperCase());
    photo['detalle, otro alumno'] = await detail({ assignment: assignmentRow }, UserRole.user, OTHER_ID);
    photo['detalle, no existe'] = await detail({ assignment: null });
    photo['detalle, sin rutina'] = await detail({ assignment: assignmentRow, routine: null });

    for (const [name, routine] of [['GET /routine/:id', tree()], ['GET /routine/:id, dada de baja', tree({ active: false })]]) {
      const res = makeRes();
      await build({ routine }).getRoutineById(ROUTINE_ID, res);
      photo[name] = { status: res.statusCode, body: res.body };
    }
  });

  const json = JSON.stringify(photo, null, 2);

  if (process.argv[2] === 'take') {
    fs.writeFileSync(FILE, json);
    console.log(`foto guardada: ${Object.keys(photo).length} respuestas en ${FILE}`);
    return;
  }

  console.log('-- lo de ahora contra la foto de antes de tocar el código');
  await run('compara', async () => {
    check('la foto existe (se saca con "take" antes de tocar nada)', fs.existsSync(FILE));
    const before = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const now = JSON.parse(json);
    check('las mismas respuestas', JSON.stringify(Object.keys(before)) === JSON.stringify(Object.keys(now)), Object.keys(now).join(' | '));
    for (const key of Object.keys(before)) {
      check(key, JSON.stringify(before[key]) === JSON.stringify(now[key]), 'difiere');
    }
  });

  finish();
})();
```

- [ ] **Paso 2: `verify-session-dto.js`.** Los params, con la configuración de `main.ts`:
  - los dos UUID, en mayúscula y en v5 (los del seed);
  - un texto de error por cada id.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

// La misma configuracion que main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const UP = '3a3a3a3a-1111-4222-8333-444444444444';
const RA = 'a1000000-aaaa-4bbb-8ccc-000000000001';
// Un v5, como los del seed (gen_seed.py): con IsUUID('4') se rechazaria
const V5 = 'c8f8a0e4-6b3d-5a1e-9f2c-3d4e5f6a7b8c';
const MSG_UP = 'El ID de la asignación debe ser un UUID válido en formato PostgreSQL';
const MSG_RA = 'El ID de la rutina del plan debe ser un UUID válido en formato PostgreSQL';

(async () => {
  let Params;

  await run('carga el DTO', async () => {
    ({ PlanSessionParamsDto: Params } = dist('dtos/routine/plan_session_params.dto'));
    check('exporta PlanSessionParamsDto', typeof Params === 'function');
  });

  if (!Params) return finish();

  const transform = (value) => pipe.transform(value, { type: 'param', metatype: Params });

  const accepts = (name, value) => run(name, async () => {
    const out = await transform({ ...value });
    check(name, out instanceof Params && out.userPlanificationId === value.userPlanificationId && out.routineAsignationId === value.routineAsignationId,
      JSON.stringify(out));
  });

  const rejects = (name, value, texts = []) => run(name, async () => {
    try {
      await transform(value);
      check(name, false, 'no lo rechazó');
    } catch (e) {
      const status = e.getStatus ? e.getStatus() : undefined;
      const response = e.getResponse ? e.getResponse() : { message: e.message };
      const messages = [].concat(response.message).join(' | ');
      check(name, status === 400, 'estado ' + status);
      for (const text of texts) check(`${name} (dice "${text.slice(0, 30)}…")`, messages.includes(text), messages);
    }
  });

  console.log('-- los dos ids del path');
  await accepts('dos UUID', { userPlanificationId: UP, routineAsignationId: RA });
  await accepts('en mayúscula, como los manda el iOS', { userPlanificationId: UP.toUpperCase(), routineAsignationId: RA.toUpperCase() });
  await accepts('un v5 del seed', { userPlanificationId: V5, routineAsignationId: V5 });

  console.log('\n-- lo que da 400, con un texto por cada id');
  await rejects('la asignación no es un UUID', { userPlanificationId: 'abc', routineAsignationId: RA }, [MSG_UP]);
  await rejects('la rutina del plan no es un UUID', { userPlanificationId: UP, routineAsignationId: '123' }, [MSG_RA]);
  await rejects('ninguno de los dos', { userPlanificationId: 'x', routineAsignationId: 'y' }, [MSG_UP, MSG_RA]);
  await rejects('UUID con un carácter de más', { userPlanificationId: UP + 'a', routineAsignationId: RA }, [MSG_UP]);
  await rejects('falta la rutina del plan', { userPlanificationId: UP }, [MSG_RA]);

  finish();
})();
```

- [ ] **Paso 3: `verify-session-controller.js`.** Lo que se prueba, sin levantar nada:
  - la ruta, el verbo y los roles;
  - que no tenga `@Owner` y el tipo de los params;
  - que ningún otro `GET` atienda `assign-plan/x/y`;
  - que **ningún handler de `routine/` cuelgue** (son 22);
  - los argumentos y el `await` sin devolver el `Response`;
  - el Swagger: la respuesta con sus nueve claves, el bloque con `active` al final y que el bloque del home no lo herede.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { RequestMethod } = mod('@nestjs/common');
const { SwaggerModule, DocumentBuilder } = mod('@nestjs/swagger');
const { RoutineController } = dist('routine/routine.controller');
const { RoutineService } = dist('routine/routine.service');
const { JwtAuthGuard } = dist('authentication/guards/jwt-auth.guard');
const { RolesGuard } = dist('authentication/guards/roles.guard');
const { OwnerGuard } = dist('authentication/guards/owner.guard');
const { OWNER_PARAM_KEY } = dist('authentication/decorators/owner.decorator');
const { UserRole } = dist('entities/user.entity');

const allow = { canActivate: () => true };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const UP = '3a3a3a3a-1111-4222-8333-444444444444';
const RA = 'a1000000-aaaa-4bbb-8ccc-000000000001';
const proto = RoutineController.prototype;
const handler = proto.getPlanSessionDetail;
const ROUTE = 'assign-plan/:userPlanificationId/:routineAsignationId';

// Un patron de ruta de Nest como regex, para ver que pedido atiende cada handler
const matches = (pattern, url) => new RegExp('^' + pattern.replace(/^\//, '').replace(/:[^/]+/g, '[^/]+') + '$').test(url);

(async () => {
  let Params;
  await run('carga el DTO de los params', async () => {
    ({ PlanSessionParamsDto: Params } = dist('dtos/routine/plan_session_params.dto'));
    check('exporta PlanSessionParamsDto', typeof Params === 'function');
  });

  console.log('-- ruta, verbo, roles y tipos (spec §3)');
  await run('getPlanSessionDetail', async () => {
    check('existe', typeof handler === 'function');
    check(`ruta ${ROUTE}`, Reflect.getMetadata('path', handler) === ROUTE, Reflect.getMetadata('path', handler));
    check('GET', Reflect.getMetadata('method', handler) === RequestMethod.GET, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('user, coach y admin', same(roles, [UserRole.user, UserRole.coach, UserRole.admin]), JSON.stringify(roles));
    check('sin @Owner: el path no trae el id del alumno y el dueño se chequea en el service',
      Reflect.getMetadata(OWNER_PARAM_KEY, handler) === undefined, Reflect.getMetadata(OWNER_PARAM_KEY, handler));
    const types = Reflect.getMetadata('design:paramtypes', proto, 'getPlanSessionDetail') || [];
    check('el path con PlanSessionParamsDto', !!Params && types[0] === Params, types[0] && types[0].name);
  });

  await run('ningún otro GET de routine/ atiende assign-plan/x/y', async () => {
    const gets = Object.getOwnPropertyNames(proto)
      .filter(n => n !== 'constructor' && Reflect.getMetadata('method', proto[n]) === RequestMethod.GET)
      .filter(n => matches(Reflect.getMetadata('path', proto[n]), `assign-plan/${UP}/${RA}`));
    check('sólo getPlanSessionDetail', same(gets, ['getPlanSessionDetail']), gets.join(','));
  });

  // Un handler que no llama al service es un andamiaje: con @Res() y sin respuesta, el request
  // cuelga. Se llama a cada handler con argumentos vacios y un service que anota lo que le piden
  console.log('\n-- ningún handler de routine/ cuelga: cada uno llama al service');
  const handlers = Object.getOwnPropertyNames(proto).filter(n => n !== 'constructor' && typeof proto[n] === 'function');
  check('el controller suma un handler: 22 en total (21 antes de BE-20b)', handlers.length === 22, handlers.length);
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

  const state = {};
  const stub = {
    getPlanSessionDetail: async (...args) => { await new Promise(r => setTimeout(r, 20)); state.args = args; return 'RESPONSE'; },
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
  await run('pasa los dos ids, el usuario del token y el response; espera sin devolver el Response', async () => {
    const user = { id: 'u', role: UserRole.user };
    const res = {};
    const ret = await controller.getPlanSessionDetail({ userPlanificationId: UP, routineAsignationId: RA }, user, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('esperó al service', !!state.args);
    check('argumentos: los dos ids, el usuario y el response',
      !!state.args && state.args[0] === UP && state.args[1] === RA && state.args[2] === user && state.args[3] === res, JSON.stringify(state.args));
  });

  console.log('\n-- Swagger');
  await run('el documento declara la respuesta, los errores y los parámetros', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const schemas = doc.components.schemas;
    const ref = (s) => ((s && (s.$ref || (s.allOf && s.allOf[0] && s.allOf[0].$ref))) || '');
    const get = (doc.paths['/routine/assign-plan/{userPlanificationId}/{routineAsignationId}'] || {}).get;

    check('GET /routine/assign-plan/{userPlanificationId}/{routineAsignationId} está en el documento', !!get);
    if (get) {
      for (const code of ['200', '400', '403', '404']) check(`declara ${code}`, !!get.responses[code], Object.keys(get.responses).join(','));
      const schema = get.responses['200'].content['application/json'].schema;
      check('el 200 es RoutinePlanSessionDetailResponseDto', ref(schema).endsWith('/RoutinePlanSessionDetailResponseDto'), JSON.stringify(schema));
      const params = (get.parameters || []).map(p => `${p.in}:${p.name}`);
      check('parámetros: los dos ids en el path, sin query', same(params.sort(), ['path:routineAsignationId', 'path:userPlanificationId']), params.join(','));
      check('pide token', Array.isArray(get.security) && get.security.some(s => 'bearer' in s));
    }

    const body = schemas.RoutinePlanSessionDetailResponseDto;
    check('la respuesta documenta sus nueve claves, en orden',
      !!body && same(Object.keys(body.properties), ['user_planification', 'routine_asignation_id', 'week', 'week_start', 'week_end', 'order', 'active', 'routine', 'finished']),
      body && Object.keys(body.properties).join(','));
    if (body) {
      const p = body.properties;
      check('user_planification es RoutinePlanSessionUserPlanificationDto', ref(p.user_planification).endsWith('/RoutinePlanSessionUserPlanificationDto'), JSON.stringify(p.user_planification));
      check('week, order: números; week_start, week_end: string; active: boolean',
        p.week.type === 'number' && p.order.type === 'number' && p.week_start.type === 'string' && p.week_end.type === 'string' && p.active.type === 'boolean');
      check('routine es el árbol de GET /routine/:id (RoutineDetailResponseDto)', ref(p.routine).endsWith('/RoutineDetailResponseDto'), JSON.stringify(p.routine));
      check('finished es un array de RoutineAssignedFinishedDto (el de la vía individual)',
        p.finished.type === 'array' && ref(p.finished.items).endsWith('/RoutineAssignedFinishedDto'), JSON.stringify(p.finished));
    }

    const block = schemas.RoutinePlanSessionUserPlanificationDto;
    check('el bloque es el del home más active, al final (D37)',
      !!block && same(Object.keys(block.properties), ['id', 'start_date', 'end_date', 'coach_note', 'planification', 'active']),
      block && Object.keys(block.properties).join(','));
    if (block) {
      check('active es boolean', block.properties.active.type === 'boolean');
      check('planification es UserPlanificationPlanificationDto', ref(block.properties.planification).endsWith('/UserPlanificationPlanificationDto'));
    }

    const home = schemas.RoutineAssignedPlanUserPlanificationDto;
    check('el bloque del home no hereda el active (sigue con sus cinco claves)',
      !!home && same(Object.keys(home.properties), ['id', 'start_date', 'end_date', 'coach_note', 'planification']), home && Object.keys(home.properties).join(','));

    check('la ruta individual sigue en el documento', !!doc.paths['/routine/assign-user/{id}']);
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 4: `verify-session-rules.js`.** Las reglas de §3 y §4 con repositorios falsos y **las consultas reales**: el query builder del service sobre un `DataSource` sin conexión.
  - **Cómo:** intercepta `getOne` y `getMany`. Las filas crudas pasan por el transformador real de TypeORM, así que se prueba también la hidratación. Las filtra como lo haría la base. Intercepta además `getRawMany`, para correr el home del plan con el mismo estado.
  - **Qué cubre:**
    - Los códigos y su orden, con los tres roles.
    - El SQL de las tres consultas.
    - La forma, y el bloque idéntico al del home.
    - La asignación quitada, la plantilla y la rutina dadas de baja.
    - Una semana después del fin, y dos semanas absurdas.
    - El orden y el filtro de `finished`.
    - Doce escenarios de visibilidad, siete con la rutina del plan activa y cinco con la rutina quitada. En cada uno, que los ejercicios del árbol sean **el `total` del home** para la misma sesión.

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');
const { ROUTINE_ID, tree, shown } = require('./be18/fixtures');

const { DataSource, SelectQueryBuilder, getMetadataArgsStorage } = mod('typeorm');
const { RawSqlResultsToEntityTransformer } = require(path.join(ROOT, 'node_modules/typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer'));
const { RoutineService } = dist('routine/routine.service');
const { UserRole } = dist('entities/user.entity');

const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const OTHER_ID = '11111111-2222-4333-8444-555555555555';
const COACH_ID = 'c0c0c0c0-1111-4222-8333-444444444444';
const P1 = '5a5a5a5a-1111-4222-8333-444444444444';
const P2 = '5b5b5b5b-1111-4222-8333-444444444444';
const P0 = '5c5c5c5c-1111-4222-8333-444444444444';
const UP1 = '3a3a3a3a-1111-4222-8333-444444444444';
const UP2 = '3b3b3b3b-1111-4222-8333-444444444444';
const UP0 = '3c3c3c3c-1111-4222-8333-444444444444';
const UP_NONE = '39393939-1111-4222-8333-444444444444';
const RA_A1 = 'a1000000-aaaa-4bbb-8ccc-000000000001';
const RA_A2 = 'a2000000-aaaa-4bbb-8ccc-000000000002';
const RA_X2 = 'c2000000-aaaa-4bbb-8ccc-000000000002';
const RA_Q1 = 'd1000000-aaaa-4bbb-8ccc-000000000001';
const RA_L9 = 'e9000000-aaaa-4bbb-8ccc-000000000009';
const RA_LMAX = 'efff0000-aaaa-4bbb-8ccc-00000000ffff';
const RA_L500K = 'e5000000-aaaa-4bbb-8ccc-000000500000';
const RA_NONE = '99999999-aaaa-4bbb-8ccc-000000000009';
const R4 = '2d2d2d2d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const INTEGER_MAX = 2147483647;

const CREATED = new Date('2026-10-20T12:00:00Z');
const LATER = new Date('2026-10-21T12:00:00Z');

const FUERZA = { id: P1, name: 'Fuerza', duration: 4, active: true };
const LIBRE = { id: P0, name: 'Libre', duration: 0, active: true };

const MSG = {
  notFound: 'Asignación no encontrada',
  other: 'No podés acceder a una rutina asignada a otro alumno.',
  notInPlan: 'La rutina no pertenece a esta planificación.',
  removed: 'La rutina fue quitada de la planificación.',
  noRoutine: 'Rutina no encontrada',
  error: 'Error al obtener la rutina del plan.',
};
const BODY_KEYS = ['user_planification', 'routine_asignation_id', 'week', 'week_start', 'week_end', 'order', 'active', 'routine', 'finished'];
const UP_KEYS = ['id', 'start_date', 'end_date', 'coach_note', 'planification', 'active'];
const FINISHED_KEYS = ['routine_exercise_id', 'user_note', 'finished_at', 'created_at', 'updated_at'];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lower = (s) => String(s).toLowerCase();
// Los DATE llegan de pg como Date en medianoche local, y TypeORM los hidrata como 'YYYY-MM-DD'
const day = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const raw = (alias, obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${alias}_${k}`, v]));

// Las asignaciones. UP1: del alumno, con Fuerza, del jueves 22/10 al 15/11 (semanas 1 a 4; la 1 arranca
// el lunes 19/10). UP2: la misma plantilla, otra vez, para el mismo alumno. UP0: una plantilla sin
// duracion fija, con el mismo rango
const up = (id, { plan = FUERZA, user = USER_ID, start = '2026-10-22', end = '2026-11-15', active = true, note = 'Foco en técnica', created = CREATED } = {}) =>
  ({ id, plan, user, start, end, active, note, created });
const UPS = [up(UP1), up(UP2, { note: null, created: LATER }), up(UP0, { plan: LIBRE })];

// Las rutinas del plan. Todas son la rutina del arbol de fixtures (ROUTINE_ID), salvo la de Hipertrofia
const ra = (id, { plan = P1, routine = ROUTINE_ID, week = 1, order = 1, active = true, created = CREATED } = {}) =>
  ({ id, plan, routine, week, order, active, created });
const RAS = [
  ra(RA_A1, { week: 1, order: 1 }),
  ra(RA_A2, { week: 2, order: 1 }),
  ra(RA_X2, { week: 2, order: 2, active: false }), // quitada del plan (E-12c)
  ra(RA_Q1, { plan: P2, routine: R4 }), // de otra plantilla
  ra(RA_L9, { plan: P0, week: 9 }), // despues del end_date
  ra(RA_LMAX, { plan: P0, week: INTEGER_MAX }), // una semana absurda: duracion 0, sin tope
  ra(RA_L500K, { plan: P0, week: 500000 }), // arranca en el año ~11600: sin recorte, un dia mal formado
];

// Una marca: (asignacion, rutina del plan, ejercicio del arbol de fixtures)
const mark = (upId, raId, ex, { note = null, on = '2026-10-27', at = 0 } = {}) =>
  ({ up: upId, ra: raId, ex, note, on, created: new Date(CREATED.getTime() + at * 1000) });

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

  const upRaw = (u) => ({
    ...raw('userPlanification', {
      id: u.id, user_id: u.user, coach_id: COACH_ID, planification_id: u.plan.id, coach_note: u.note,
      start_date: day(u.start), end_date: day(u.end), active: u.active, created_at: u.created, updated_at: u.created,
    }),
    ...raw('planification', { id: u.plan.id, name: u.plan.name, duration: u.plan.duration, active: u.plan.active }),
  });
  const raRaw = (r, alias) => raw(alias, {
    id: r.id, routine_id: r.routine, planification_id: r.plan, order: r.order, week: r.week, active: r.active,
    created_at: r.created, updated_at: r.created,
  });
  const finishedRaw = (m) => raw('RoutineExerciseFinished', {
    id: `${m.up}|${m.ra}|${m.ex}`, user_planification_id: m.up, routine_asignation_id: m.ra, routine_exercise_id: m.ex,
    user_note: m.note, finished_at: day(m.on), created_at: m.created, updated_at: m.created,
  });

  // Lo que devolveria la base para cada consulta, filtrado como ella (un uuid se compara sin importar
  // mayusculas). Devuelve filas CRUDAS, con los alias del SELECT
  function rowsFor(qb) {
    const alias = qb.expressionMap.mainAlias.name;
    const p = qb.getParameters();
    const where = (qb.findOptions && qb.findOptions.where) || {};
    const ups = state.cfg.ups || UPS;
    const ras = state.cfg.ras || RAS;
    const marks = state.cfg.marks || [];

    if (alias === 'userPlanification' && p.userPlanificationId !== undefined) {
      return { kind: 'up', rows: ups.filter(u => lower(u.id) === lower(p.userPlanificationId)).map(upRaw) };
    }
    if (alias === 'userPlanification') {
      // El home del plan (BE-20): las activas del alumno, por nombre de la plantilla y alta
      const list = ups.filter(u => lower(u.user) === lower(p.userId) && u.active)
        .sort((a, b) => a.plan.name.localeCompare(b.plan.name) || a.created - b.created);
      return { kind: 'home-ups', rows: list.map(upRaw) };
    }
    if (alias === 'RoutineAsignation') {
      const list = ras.filter(r => lower(r.id) === lower(where.id) && lower(r.plan) === lower(where.planification_id));
      return { kind: 'ra', rows: list.map(r => raRaw(r, 'RoutineAsignation')) };
    }
    if (alias === 'routineAsignation') {
      const list = ras.filter(r => (p.planificationIds || []).includes(r.plan) && r.week >= p.firstWeek && r.week <= p.lastWeek)
        .sort((a, b) => a.week - b.week || a.order - b.order || a.created - b.created);
      return { kind: 'home-ras', rows: list.map(r => ({ ...raRaw(r, 'routineAsignation'), ...raw('routine', { id: r.routine, name: 'Día A', active: true }) })) };
    }
    if (alias === 'RoutineExerciseFinished') {
      const list = marks.filter(m => lower(m.up) === lower(where.user_planification_id) && lower(m.ra) === lower(where.routine_asignation_id))
        .sort((a, b) => a.created - b.created || (a.ex < b.ex ? -1 : a.ex > b.ex ? 1 : 0));
      return { kind: 'finished', rows: list.map(finishedRaw) };
    }
    return { kind: 'otra:' + alias, rows: [] };
  }

  // getOne y getMany: se guarda el SQL y las filas crudas pasan por el transformador REAL de TypeORM
  async function entitiesOf(qb) {
    const [sql, params] = qb.getQueryAndParameters();
    const { kind, rows } = rowsFor(qb);
    state.ops.push(kind);
    state.queries.push({ kind, sql, params });
    if (state.cfg.fail === kind) throw new Error('se cayó la base');
    const transformer = new RawSqlResultsToEntityTransformer(qb.expressionMap, qb.connection.driver, [], [], undefined);
    return transformer.transform(rows, qb.expressionMap.mainAlias);
  }

  SelectQueryBuilder.prototype.getOne = async function () { return (await entitiesOf(this))[0] || null; };
  SelectQueryBuilder.prototype.getMany = async function () { return entitiesOf(this); };

  // getRawMany: lo que pide el home del plan (los ejercicios vigentes y lo hecho), para cruzar el
  // detalle con su progreso
  SelectQueryBuilder.prototype.getRawMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    const kind = /FROM "Routine_Circuit"/.test(sql) ? 'home-active' : /FROM "Routine_Exercise_Finished"/.test(sql) ? 'home-finished' : 'otra';
    state.ops.push(kind);
    state.queries.push({ kind, sql, params });
    const p = this.getParameters();
    if (kind === 'home-active') {
      // Los vigentes de la rutina del arbol: activos y en un vinculo activo
      const rows = [];
      for (const link of tree().routineCircuits) {
        if (!link.active) continue;
        for (const e of link.circuit.routineExercises) if (e.active) rows.push({ routine_id: ROUTINE_ID, routine_exercise_id: e.id });
      }
      return rows.filter(r => (p.routineIds || []).includes(r.routine_id));
    }
    if (kind === 'home-finished') {
      return (state.cfg.marks || [])
        .filter(m => (p.userPlanificationIds || []).includes(m.up) && (p.routineAsignationIds || []).includes(m.ra))
        .map(m => ({ user_planification_id: m.up, routine_asignation_id: m.ra, routine_exercise_id: m.ex }));
    }
    return [];
  };

  // Un repositorio que el caso no deberia usar: cualquier llamada queda anotada y lanza
  const forbidden = (name) => new Proxy({}, {
    get: (_, prop) => (prop === 'then' ? undefined : () => { state.ops.push(`${name}.${String(prop)}`); throw new Error(`no debería usar ${name}`); }),
  });

  function build(cfg = {}) {
    state = { cfg, ops: [], queries: [] };
    const routineRepository = {
      findOne: async (o) => { state.ops.push('routine'); state.routineArg = o; return cfg.routine === undefined ? tree() : cfg.routine; },
    };
    const userRepository = { findOne: async () => { state.ops.push('user'); return { id: USER_ID }; } };
    // Mismo orden que el constructor: circuit, routine, dataSource, user, routineAsignationUser,
    // routineAsignExerciseFinished, routineExercise, routineCircuit y los tres de BE-20
    return new RoutineService(forbidden('circuit'), routineRepository, ds, userRepository, forbidden('routineAsignationUser'),
      forbidden('routineAsignExerciseFinished'), forbidden('routineExercise'), forbidden('routineCircuit'),
      ds.getRepository(UserPlanification), ds.getRepository(RoutineAsignation), ds.getRepository(RoutineExerciseFinished));
  }

  const user = (role, id = USER_ID) => ({ id, role, active: true });
  const OWNER = user(UserRole.user);

  async function open(cfg = {}, currentUser = OWNER, upId = UP1, raId = RA_A1) {
    const service = build(cfg);
    const res = makeRes();
    await service.getPlanSessionDetail(upId, raId, currentUser, res);
    const q = (kind) => state.queries.find(e => e.kind === kind);
    return { res, body: res.body, ops: [...state.ops], q, st: state };
  }

  // La sesion en el home del plan (assigned-plan sin filtro), con el mismo estado
  async function homeOf(cfg, upId, raId, week) {
    const service = build(cfg);
    const res = makeRes();
    await service.getAssignedPlan(USER_ID, {}, res);
    const group = (res.body || []).find(g => g.user_planification.id === upId && g.week === week);
    return { group, routine: group && group.routines.find(r => r.routine_asignation_id === raId) };
  }

  const visibleIds = (body) => [...new Set(shown(body.routine).flatMap(([, ids]) => ids))].sort();

  // ===================== CODIGOS =====================

  console.log('-- códigos y orden de las validaciones (spec §3, D38, D39)');

  await run('el método existe', async () => {
    check('getPlanSessionDetail es función', typeof build().getPlanSessionDetail === 'function');
  });

  await run('la asignación no existe → 404, sin buscar nada más', async () => {
    const r = await open({}, OWNER, UP_NONE);
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.notFound }), JSON.stringify(r.body));
    check('sólo buscó la asignación', same(r.ops, ['up']), r.ops.join(','));
  });

  await run('un alumno abre una sesión de otro → 403, antes de buscar la rutina del plan', async () => {
    const r = await open({}, user(UserRole.user, OTHER_ID));
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
    check('el texto del bloque A', same(r.body, { error: MSG.other }), JSON.stringify(r.body));
    check('no es el texto que cierra la sesión del web', r.body && r.body.error !== 'La cuenta está deshabilitada.');
    check('sólo buscó la asignación', same(r.ops, ['up']), r.ops.join(','));
  });

  await run('el 403 va antes que el 404 de la rutina: un alumno no averigua qué hay en los planes de otro', async () => {
    const r = await open({}, user(UserRole.user, OTHER_ID), UP1, RA_Q1);
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
  });

  await run('el alumno dueño → 200, también con el id del token en mayúscula', async () => {
    const r1 = await open();
    check('con su id', r1.res.statusCode === 200, r1.res.statusCode + ' ' + JSON.stringify(r1.body).slice(0, 200));
    const r2 = await open({}, user(UserRole.user, USER_ID.toUpperCase()));
    check('con su id en mayúscula', r2.res.statusCode === 200, r2.res.statusCode);
  });

  await run('coach y admin abren la de cualquier alumno (D6)', async () => {
    const coach = await open({}, user(UserRole.coach, OTHER_ID));
    check('coach → 200', coach.res.statusCode === 200, coach.res.statusCode);
    const admin = await open({}, user(UserRole.admin, OTHER_ID));
    check('admin → 200', admin.res.statusCode === 200, admin.res.statusCode);
  });

  await run('la rutina del plan no existe → 404', async () => {
    const r = await open({}, OWNER, UP1, RA_NONE);
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.notInPlan }), JSON.stringify(r.body));
    check('no buscó ni las marcas ni el árbol', same(r.ops, ['up', 'ra']), r.ops.join(','));
  });

  await run('la rutina es de otra plantilla → el mismo 404', async () => {
    const r = await open({}, OWNER, UP1, RA_Q1);
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.notInPlan }), JSON.stringify(r.body));
  });

  await run('la misma rutina del plan se abre desde las dos asignaciones de la plantilla', async () => {
    const r = await open({}, OWNER, UP2, RA_A1);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('con la asignación pedida', r.body && r.body.user_planification.id === UP2);
  });

  await run('rutina quitada del plan sin nada hecho → 404 propio con los tres roles, sin cargar el árbol (D38)', async () => {
    for (const [name, who] of [['alumno', OWNER], ['coach', user(UserRole.coach, OTHER_ID)], ['admin', user(UserRole.admin, OTHER_ID)]]) {
      const r = await open({}, who, UP1, RA_X2);
      check(`${name}: estado 404`, r.res.statusCode === 404, r.res.statusCode);
      check(`${name}: mensaje propio`, same(r.body, { error: MSG.removed }), JSON.stringify(r.body));
      check(`${name}: no cargó el árbol`, same(r.ops, ['up', 'ra', 'finished']), r.ops.join(','));
    }
  });

  await run('lo hecho en la otra asignación de la misma plantilla no cuenta: sigue el 404', async () => {
    const r = await open({ marks: [mark(UP2, RA_X2, 'a')] }, OWNER, UP1, RA_X2);
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.removed }), JSON.stringify(r.body));
  });

  await run('rutina quitada con algo hecho en esta asignación → 200, con active = false', async () => {
    const r = await open({ marks: [mark(UP1, RA_X2, 'a')] }, OWNER, UP1, RA_X2);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('active = false', r.body && r.body.active === false);
  });

  await run('la rutina no existe (imposible con la FK) → 404 en vez de romper', async () => {
    const r = await open({ routine: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.noRoutine }), JSON.stringify(r.body));
  });

  await run('error de la base → 500 y se loguea', async () => {
    let r;
    const logged = await silencing(async () => { r = await open({ fail: 'finished' }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.error }), JSON.stringify(r.body));
    check('console.error', logged === 1, logged);
  });

  // ===================== CONSULTAS =====================

  console.log('\n-- las consultas');

  await run('cuatro consultas, en orden, y nada de la vía individual ni del usuario', async () => {
    const r = await open();
    check('asignación, rutina del plan, marcas y árbol', same(r.ops, ['up', 'ra', 'finished', 'routine']), r.ops.join(','));
    check('el árbol de la rutina de la Routine_Asignation', r.st.routineArg && r.st.routineArg.where.id === ROUTINE_ID, JSON.stringify(r.st.routineArg && r.st.routineArg.where));
    // Con SHOW_SQL=1, el SQL de las tres consultas, para leerlo
    if (process.env.SHOW_SQL) for (const q of r.st.queries) console.log(`\n[${q.kind}] ${q.sql}\n  ${JSON.stringify(q.params)}`);
  });

  await run('la asignación: con la cabecera mínima de la plantilla y por el id del path, tal cual llega', async () => {
    const r = await open({}, OWNER, UP1.toUpperCase(), RA_A1.toUpperCase());
    const q = r.q('up');
    check('se consultó', !!q);
    if (q) {
      check('User_Planification con INNER JOIN a Planification', /FROM "User_Planification" "userPlanification" INNER JOIN "Planification" "planification"/.test(q.sql), q.sql);
      check('de la plantilla, sólo id, name, duration y active (como el home)',
        ['id', 'name', 'duration', 'active'].every(c => q.sql.includes(`"planification"."${c}"`)) && !q.sql.includes('"planification"."description"'), q.sql);
      check('por el id del path', /WHERE "userPlanification"."id" = \$1/.test(q.sql) && same(q.params, [UP1.toUpperCase()]), `${q.sql} ${JSON.stringify(q.params)}`);
    }
  });

  await run('la rutina del plan: por su id Y por la plantilla de la asignación (la regla que la base no garantiza)', async () => {
    const r = await open({}, OWNER, UP1.toUpperCase(), RA_A1.toUpperCase());
    const q = r.q('ra');
    check('se consultó', !!q);
    if (q) {
      check('FROM Routine_Asignation', /FROM "Routine_Asignation" "RoutineAsignation"/.test(q.sql), q.sql);
      check('filtra por id y por planification_id',
        /"RoutineAsignation"\."id" = \$\d/.test(q.sql) && /"RoutineAsignation"\."planification_id" = \$\d/.test(q.sql), q.sql);
      check('con el id del path y la plantilla de la fila', same([...q.params].sort(), [RA_A1.toUpperCase(), P1].sort()), JSON.stringify(q.params));
      check('una sola fila', /LIMIT 1/.test(q.sql), q.sql);
    }
  });

  await run('las marcas: por los ids de las filas (minúscula), ordenadas por alta y ejercicio', async () => {
    const r = await open({}, OWNER, UP1.toUpperCase(), RA_A1.toUpperCase());
    const q = r.q('finished');
    check('se consultó', !!q);
    if (q) {
      check('FROM Routine_Exercise_Finished', /FROM "Routine_Exercise_Finished" "RoutineExerciseFinished"/.test(q.sql), q.sql);
      check('filtra por la asignación y la rutina del plan',
        /"RoutineExerciseFinished"\."user_planification_id" = \$\d/.test(q.sql) && /"RoutineExerciseFinished"\."routine_asignation_id" = \$\d/.test(q.sql), q.sql);
      check('con los ids de las filas, en minúscula', same([...q.params].sort(), [UP1, RA_A1].sort()), JSON.stringify(q.params));
      check('ORDER BY created_at y routine_exercise_id',
        /ORDER BY "RoutineExerciseFinished"\."created_at" ASC, "RoutineExerciseFinished"\."routine_exercise_id" ASC/.test(q.sql), q.sql);
    }
  });

  // ===================== FORMA =====================

  console.log('\n-- la forma de la respuesta (D37)');

  await run('claves, valores y el árbol idéntico al de GET /routine/:id', async () => {
    const r = await open({}, OWNER, UP1, RA_A2);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    if (!r.body || r.res.statusCode !== 200) return;
    check('claves del cuerpo', same(Object.keys(r.body), BODY_KEYS), Object.keys(r.body).join(','));
    const b = r.body.user_planification;
    check('claves del bloque: el del home más active, al final', same(Object.keys(b), UP_KEYS), Object.keys(b).join(','));
    check('la asignación', b.id === UP1 && b.start_date === '2026-10-22' && b.end_date === '2026-11-15' && b.coach_note === 'Foco en técnica' && b.active === true,
      JSON.stringify(b));
    check('las fechas son los strings del día (hidratados)', typeof b.start_date === 'string' && typeof b.end_date === 'string');
    check('la plantilla: id, name, duration y active', same(b.planification, { id: P1, name: 'Fuerza', duration: 4, active: true }), JSON.stringify(b.planification));
    check('la rutina del plan', r.body.routine_asignation_id === RA_A2 && r.body.week === 2 && r.body.order === 1 && r.body.active === true,
      JSON.stringify({ ...r.body, routine: undefined }));
    check('la semana 2: del lunes 26/10 al domingo 1/11', r.body.week_start === '2026-10-26' && r.body.week_end === '2026-11-01', `${r.body.week_start} ${r.body.week_end}`);
    check('sin nada hecho, finished = []', same(r.body.finished, []));

    const service = build({});
    const res = makeRes();
    await service.getRoutineById(ROUTINE_ID, res);
    check('routine es idéntico a GET /routine/:id', same(r.body.routine, res.body), 'difieren');
  });

  await run('el bloque es el del home para la misma asignación, más active; la semana y la rutina también coinciden', async () => {
    const r = await open({}, OWNER, UP1, RA_A2);
    const home = await homeOf({}, UP1, RA_A2, 2);
    check('el home trae la sesión', !!home.routine);
    if (!r.body || !home.routine) return;
    const { active, ...block } = r.body.user_planification;
    check('el bloque sin active es idéntico al del home', same(block, home.group.user_planification), `${JSON.stringify(block)} vs ${JSON.stringify(home.group.user_planification)}`);
    check('week, week_start y week_end como el grupo del home',
      r.body.week === home.group.week && r.body.week_start === home.group.week_start && r.body.week_end === home.group.week_end);
    check('order y active como la rutina del home', r.body.order === home.routine.order && r.body.active === home.routine.active);
  });

  await run('sin nota del coach → coach_note null', async () => {
    const r = await open({}, OWNER, UP2, RA_A1);
    check('coach_note null', r.body && r.body.user_planification.coach_note === null, JSON.stringify(r.body && r.body.user_planification));
  });

  await run('asignación quitada (E-14): se lee igual, con user_planification.active = false (D24)', async () => {
    const ups = [up(UP1, { active: false })];
    for (const [name, who] of [['alumno', OWNER], ['coach', user(UserRole.coach, OTHER_ID)]]) {
      const r = await open({ ups }, who);
      check(`${name}: estado 200`, r.res.statusCode === 200, r.res.statusCode);
      check(`${name}: active = false`, r.body && r.body.user_planification.active === false);
    }
  });

  await run('plantilla dada de baja (E-11): se ve, con planification.active = false', async () => {
    const r = await open({ ups: [up(UP1, { plan: { ...FUERZA, active: false } })] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('planification.active = false', r.body && r.body.user_planification.planification.active === false);
  });

  await run('rutina dada de baja (E-18): se ve, con routine.active = false', async () => {
    const r = await open({ routine: tree({ active: false }) });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('routine.active = false', r.body && r.body.routine.active === false);
  });

  await run('una semana después del end_date se abre igual (D5), con su lunes y su domingo', async () => {
    const r = await open({}, OWNER, UP0, RA_L9);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('semana 9: del lunes 14/12 al domingo 20/12', r.body && r.body.week === 9 && r.body.week_start === '2026-12-14' && r.body.week_end === '2026-12-20',
      r.body && `${r.body.week} ${r.body.week_start} ${r.body.week_end}`);
  });

  await run('una semana absurda (INTEGER_MAX, plantilla sin duración fija) no rompe: el lunes y el domingo se recortan al 9999-12-31', async () => {
    let r;
    const logged = await silencing(async () => { r = await open({}, OWNER, UP0, RA_LMAX); });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode + ' ' + JSON.stringify(r.body));
    check('sin errores en el log', logged === 0, logged);
    check('week_start y week_end = 9999-12-31', r.body && r.body.week === INTEGER_MAX && r.body.week_start === '9999-12-31' && r.body.week_end === '9999-12-31',
      r.body && `${r.body.week_start} ${r.body.week_end}`);
  });

  await run('una semana que arranca después del 9999 sin llegar a romper toISOString (500.000): también se recorta, no sale un día mal formado', async () => {
    const r = await open({}, OWNER, UP0, RA_L500K);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('week_start y week_end = 9999-12-31', r.body && r.body.week_start === '9999-12-31' && r.body.week_end === '9999-12-31',
      r.body && `${r.body.week_start} ${r.body.week_end}`);
  });

  await run('ids del path en mayúscula: la respuesta trae los de las filas', async () => {
    const r = await open({}, OWNER, UP1.toUpperCase(), RA_A1.toUpperCase());
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('en minúscula', r.body && r.body.user_planification.id === UP1 && r.body.routine_asignation_id === RA_A1);
  });

  await run('finished: sólo las marcas de esta sesión, con sus cinco campos, por alta y ejercicio', async () => {
    const marks = [
      mark(UP1, RA_A1, 'b', { at: 5, note: 'Me costó la última serie', on: '2026-10-21' }),
      mark(UP1, RA_A1, 'a', { at: 5 }), // la misma alta que b: desempata el ejercicio
      mark(UP1, RA_A1, 'c', { at: 1 }),
      mark(UP2, RA_A1, 'd'), // otra asignación de la misma plantilla
      mark(UP1, RA_A2, 'e'), // otra rutina del plan
    ];
    const r = await open({ marks });
    const f = (r.body && r.body.finished) || [];
    check('las tres de la sesión, en orden', same(f.map(x => x.routine_exercise_id), ['c', 'a', 'b']), f.map(x => x.routine_exercise_id).join(','));
    check('claves del ítem (las de la vía individual)', f[0] && same(Object.keys(f[0]), FINISHED_KEYS), f[0] && Object.keys(f[0]).join(','));
    check('finished_at es el día (hidratado)', f[0] && f[0].finished_at === '2026-10-27', f[0] && f[0].finished_at);
    check('con nota y su día', f[2] && f[2].user_note === 'Me costó la última serie' && f[2].finished_at === '2026-10-21', JSON.stringify(f[2]));
    check('sin nota → null', f[1] && f[1].user_note === null);
  });

  // ===================== VISIBILIDAD =====================

  console.log('\n-- visibilidad (D29) y el total del home');
  // Fixtures: C1 = a, b (activos) y c (apagado) · C2 = d, e y f (apagado) · C3 = g. Vinculos: L1 → C1
  // activo · L2 → C2 apagado · L3 → C3 apagado · L4 → C1 apagado (C1 repetido)
  const activeScenarios = [
    ['nada hecho: sólo el vínculo activo, sin el ejercicio apagado', [], [['L1', ['a', 'b']]]],
    ['hecho c (apagado, de un vínculo activo): aparece, y L4 con sólo c', ['c'], [['L1', ['a', 'b', 'c']], ['L4', ['c']]]],
    ['hecho a: L4 aparece con sólo a', ['a'], [['L1', ['a', 'b']], ['L4', ['a']]]],
    ['hecho e, de un circuito sacado: L2 con sólo e', ['e'], [['L1', ['a', 'b']], ['L2', ['e']]]],
    ['hechos d y f: L2 con d y f', ['d', 'f'], [['L1', ['a', 'b']], ['L2', ['d', 'f']]]],
    ['hecho g: L3 con sólo g', ['g'], [['L1', ['a', 'b']], ['L3', ['g']]]],
    ['hechos en tres circuitos', ['a', 'e', 'g'], [['L1', ['a', 'b']], ['L2', ['e']], ['L3', ['g']], ['L4', ['a']]]],
  ];
  const removedScenarios = [
    ['hecho a: L1 y L4, los dos con sólo a (no aparece b como pendiente)', ['a'], [['L1', ['a']], ['L4', ['a']]]],
    ['hecho c (un ejercicio apagado)', ['c'], [['L1', ['c']], ['L4', ['c']]]],
    ['hechos a y b', ['a', 'b'], [['L1', ['a', 'b']], ['L4', ['a', 'b']]]],
    ['hecho e, de un circuito sacado: sólo L2', ['e'], [['L2', ['e']]]],
    ['hechos a, e y g', ['a', 'e', 'g'], [['L1', ['a']], ['L2', ['e']], ['L3', ['g']], ['L4', ['a']]]],
  ];

  for (const [label, scenarios, raId, week] of [['rutina del plan activa', activeScenarios, RA_A2, 2], ['rutina quitada del plan', removedScenarios, RA_X2, 2]]) {
    for (const [name, ids, expected] of scenarios) {
      await run(`${label} · ${name}`, async () => {
        const cfg = { marks: ids.map((e, i) => mark(UP1, raId, e, { at: i })) };
        const r = await open(cfg, OWNER, UP1, raId);
        check('estado 200', r.res.statusCode === 200, r.res.statusCode + ' ' + JSON.stringify(r.body));
        if (r.res.statusCode !== 200) return;
        const got = shown(r.body.routine);
        check('qué se muestra', same(got, expected), JSON.stringify(got));

        const home = await homeOf(cfg, UP1, raId, week);
        check('el home trae la sesión', !!home.routine);
        if (!home.routine) return;
        check('los ejercicios del árbol son el total del home', visibleIds(r.body).length === home.routine.progress.total,
          `${visibleIds(r.body).length} vs ${home.routine.progress.total}`);
        check('finished tiene lo hecho que cuenta el home', r.body.finished.length === home.routine.progress.finished,
          `${r.body.finished.length} vs ${home.routine.progress.finished}`);
      });
    }
  }

  await run('el coach ve lo mismo que el alumno en una rutina quitada (D38)', async () => {
    const cfg = { marks: [mark(UP1, RA_X2, 'a'), mark(UP1, RA_X2, 'e', { at: 1 })] };
    const owner = await open(cfg, OWNER, UP1, RA_X2);
    const coach = await open(cfg, user(UserRole.coach, OTHER_ID), UP1, RA_X2);
    check('el mismo cuerpo', same(owner.body, coach.body), 'difieren');
  });

  finish();
})();
```

- [ ] **Paso 5: `edits.js` y `check-edits.js`.** Las ediciones de las Tareas 2, 4 y 5 como datos, y la herramienta que las compara con el prototipo. `edits.js` define cada edición como una región entre dos marcadores: el texto viejo sale de `head/` (la copia de `ac88f88`) y el nuevo, de `proto/`.

```js
// Las ediciones del plan de BE-20b como datos. Cada una es una region que existe en HEAD y en el
// prototipo: old = el texto de HEAD entre start (o startOld) y end; new = el del prototipo entre start
// (o startNew) y end. check-edits.js las aplica sobre HEAD y exige el prototipo, y build-plan.js las
// imprime en el plan tal cual
module.exports = [
  {
    key: 'weeksHeader', file: 'planification/plan_weeks.ts',
    start: '// defecto), el plan del home (BE-20', end: '\n\nconst DAY_MS',
  },
  {
    key: 'weeksBounds', file: 'planification/plan_weeks.ts',
    start: '// El lunes y el domingo de la semana `week` del plan', end: '        week_end: fromUtcMs(Math.min(weekStartMs + 6 * DAY_MS',
  },
  {
    key: 'homeBlock', file: 'routine/routine.service.ts',
    start: '            return {\n                user_planification: ', end: '                week,\n                week_start,\n                week_end,\n                routines:',
  },
  {
    key: 'detailHandler', file: 'routine/routine.service.ts',
    start: '        return groups;\n    }\n', end: '    // ===================== EL HOME DEL ALUMNO (BE-20e) =====================',
  },
  {
    key: 'visibility', file: 'routine/routine.service.ts',
    start: '    // Que parte de lo dado de baja se le muestra al alumno', end: '        const completedIds = new Set(finishedRows',
  },
  {
    key: 'owner', file: 'routine/routine.service.ts',
    start: '    // "Dueño" = la asignacion es del alumno del token, comparado en minuscula', end: '        return assignment.user_id.toLowerCase()',
  },
  {
    key: 'finishedResponse', file: 'routine/routine.service.ts',
    start: '    // Lo que el cliente cruza con el arbol de la rutina por routine_exercise_id', end: '        return {\n            routine_exercise_id: row.routine_exercise_id,',
  },
  {
    key: 'planHelpers', file: 'routine/routine.service.ts',
    startOld: '    // ===================== HELPERS DE RUTINA =====================',
    startNew: '    // ===================== HELPERS DEL PLAN DEL ALUMNO =====================',
    end: '\n\n    // Filtros compartidos por el listado y el listado con circuitos',
  },
  {
    key: 'detailBuilder', file: 'routine/routine.service.ts',
    start: '    // ejercicios que el entrenador saco). Ojo: el vinculo apagado tiene order null', end: '    // ===================== HELPERS DE CIRCUITO',
  },
  {
    key: 'controllerImports', file: 'routine/routine.controller.ts',
    start: 'import { RoutineHomeWeekResponseDto }', end: '\n\n@ApiTags(\'Routine\')',
  },
  {
    key: 'controllerHandler', file: 'routine/routine.controller.ts',
    start: '        await this.routineService.getRoutineHome(params.userId, query, res);', end: '    // Historial de entrenamientos del alumno (E-06)',
  },
];

// Los archivos nuevos (se copian enteros)
module.exports.newFiles = [
  'dtos/routine/plan_session_params.dto.ts',
  'dtos/routine/routine_plan_session_detail_response.dto.ts',
];
```

```js
// Comprueba que las ediciones del plan (edits.js) son exactamente el cambio probado en el prototipo:
// cada old aparece una sola vez en HEAD y en el arbol de trabajo del repo (que puede tener cambios de
// otra tarea), y aplicadas sobre HEAD dan el prototipo. Con 'apply <dir>' las aplica sobre la copia
// <dir>/src y le suma los archivos nuevos. Con 'repo', despues de implementar: el HEAD del repo en
// ese momento mas las ediciones tiene que dar el arbol de trabajo, y los archivos nuevos, el prototipo
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const edits = require('./edits');

const S = __dirname;
const REPO = 'D:/Power App/Backend/PowerApp-Backend/power-app/src';
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const count = (text, s) => text.split(s).length - 1;

function cut(text, start, end) {
  const i = text.indexOf(start);
  const j = i < 0 ? -1 : text.indexOf(end, i);
  if (i < 0 || j < 0) throw new Error(`marcador no encontrado: ${JSON.stringify(start.slice(0, 60))} … ${JSON.stringify(end.slice(0, 60))}`);
  return text.slice(i, j);
}

function region(edit) {
  const head = read(path.join(S, 'head/src', edit.file));
  const proto = read(path.join(S, 'proto/src', edit.file));
  return {
    old: cut(head, edit.startOld || edit.start, edit.end),
    new: cut(proto, edit.startNew || edit.start, edit.end),
  };
}
module.exports.region = region;

if (require.main === module) {
  const [mode, dir] = process.argv.slice(2);
  let fails = 0;
  const ok = (name, cond, detail) => { console.log(`  ${cond ? 'ok   ' : 'FALLA'} ${name}${cond || detail === undefined ? '' : '  -> ' + detail}`); if (!cond) fails++; };

  if (mode === 'repo') {
    const show = (file) => execFileSync('git', ['-C', path.dirname(REPO), 'show', `HEAD:power-app/src/${file}`], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n');
    for (const file of [...new Set(edits.map(e => e.file))]) {
      let text = show(file);
      for (const edit of edits.filter(e => e.file === file)) {
        const r = region(edit);
        ok(`${edit.key}: el anclaje está una sola vez en el HEAD del repo`, count(text, r.old) === 1, count(text, r.old));
        text = text.replace(r.old, () => r.new);
      }
      ok(`${file}: HEAD del repo + ediciones = el archivo del repo`, text === read(path.join(REPO, file)));
    }
    for (const file of edits.newFiles) {
      ok(`${file}: igual al prototipo`, fs.existsSync(path.join(REPO, file)) && read(path.join(REPO, file)) === read(path.join(S, 'proto/src', file)));
    }
  } else if (mode === 'apply') {
    for (const file of [...new Set(edits.map(e => e.file))]) {
      const target = path.join(dir, 'src', file);
      let text = read(target);
      for (const edit of edits.filter(e => e.file === file)) {
        const r = region(edit);
        ok(`${edit.key}: el anclaje está una sola vez en ${dir}`, count(text, r.old) === 1, count(text, r.old));
        text = text.replace(r.old, () => r.new);
      }
      fs.writeFileSync(target, text);
    }
    for (const file of edits.newFiles) {
      ok(`${file} no existía`, !fs.existsSync(path.join(dir, 'src', file)));
      fs.copyFileSync(path.join(S, 'proto/src', file), path.join(dir, 'src', file));
    }
  } else {
    for (const file of [...new Set(edits.map(e => e.file))]) {
      let head = read(path.join(S, 'head/src', file));
      const repo = read(path.join(REPO, file));
      for (const edit of edits.filter(e => e.file === file)) {
        const r = region(edit);
        ok(`${edit.key}: old una sola vez en HEAD`, count(head, r.old) === 1, count(head, r.old));
        ok(`${edit.key}: old una sola vez en el árbol de trabajo del repo`, count(repo, r.old) === 1, count(repo, r.old));
        ok(`${edit.key}: cambia algo`, r.old !== r.new);
        head = head.replace(r.old, () => r.new);
      }
      ok(`${file}: HEAD + ediciones = prototipo`, head === read(path.join(S, 'proto/src', file)));
    }
    // Ningun otro archivo del prototipo difiere de HEAD, salvo los nuevos
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const protoFiles = walk(path.join(S, 'proto/src')).map(f => path.relative(path.join(S, 'proto/src'), f).replace(/\\/g, '/'));
    const changed = protoFiles.filter(f => !fs.existsSync(path.join(S, 'head/src', f)) || read(path.join(S, 'head/src', f)) !== read(path.join(S, 'proto/src', f)));
    const expected = [...new Set([...edits.map(e => e.file), ...edits.newFiles])].sort();
    ok('el prototipo sólo cambia los archivos del plan', JSON.stringify(changed.sort()) === JSON.stringify(expected), changed.join(', '));
  }
  console.log(`\n${fails} fallas`);
  process.exit(fails ? 1 : 0);
}
```

- [ ] **Paso 6: correrlos en rojo**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/61fe7dcf-18ce-4438-ac72-cd186d350cfb/scratchpad/be20b"
unset ROOT; cd "$SCRATCH" && for s in verify-session-dto verify-session-controller verify-session-rules; do echo "== $s"; node $s.js 2>&1 | grep -E "fallas$"; done
```
**Esperado** (es lo que dio contra `HEAD`, en la copia `head/`):
- `0 ok, 1 fallas`: no existe el DTO.
- `44 ok, 9 fallas`: no existen el handler, el DTO ni la ruta en el Swagger.
- `0 ok, 42 fallas`: no existe el método.

---

## Tarea 2 — El lunes de una semana absurda (decisión 3)

**Archivos:** `power-app/src/planification/plan_weeks.ts`

- [ ] **Paso 1: el comentario de cabecera.** Reemplazar:

```ts
// defecto), el plan del home (BE-20, desde routine/) y el home en un solo pedido (BE-20e). La unica
// que mira el reloj es todayIn
```
por:
```ts
// defecto), el plan del home (BE-20, desde routine/), el home en un solo pedido (BE-20e) y el detalle
// de una sesion del plan (BE-20b). La unica que mira el reloj es todayIn
```

- [ ] **Paso 2: `planWeekBounds` recorta también el lunes.** Reemplazar:

```ts
// El lunes y el domingo de la semana `week` del plan (spec §4), aunque el plan arranque o termine a
// mitad de semana. El domingo se recorta al 9999-12-31: solo lo toca la semana que contiene ese dia
// (un viernes), cuyo domingo ya no entra en el formato YYYY-MM-DD. Es el mismo tope tecnico que el
// del fin por defecto
export function planWeekBounds(startDate: string, week: number): { week_start: string; week_end: string } {
    const weekStartMs = toUtcMs(mondayOf(startDate)) + (week - 1) * WEEK_MS;

    return {
        week_start: fromUtcMs(weekStartMs),
```
por:
```ts
// El lunes y el domingo de la semana `week` del plan (spec §4), aunque el plan arranque o termine a
// mitad de semana. Los dos se recortan al 9999-12-31, el mismo tope tecnico que el del fin por
// defecto. El domingo, en la semana que contiene ese dia (un viernes), cuyo domingo ya no entra en el
// formato YYYY-MM-DD. El lunes, en una semana que empieza despues: el home nunca la pide (no pasa del
// fin de la asignacion), pero el detalle de una sesion del plan (BE-20b) abre cualquier semana, y una
// plantilla sin duracion fija acepta hasta la INTEGER_MAX. Sin el recorte, el dia saldria mal formado
// o toISOString tiraria un RangeError
export function planWeekBounds(startDate: string, week: number): { week_start: string; week_end: string } {
    const weekStartMs = toUtcMs(mondayOf(startDate)) + (week - 1) * WEEK_MS;

    return {
        week_start: fromUtcMs(Math.min(weekStartMs, LAST_DAY_MS)),
```

---

## Tarea 3 — Los DTOs (spec §3 y §5)

**Archivos:** dos nuevos en `power-app/src/dtos/routine/`.

- [ ] **Paso 1: `plan_session_params.dto.ts`**

```ts
import { IsUUID, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Params de una sesión del plan: el par (User_Planification, Routine_Asignation), que es lo que el
 * alumno abre y marca (spec del bloque B, §5.4). Los usan el detalle (BE-20b) y, desde BE-20c,
 * marcar y desmarcar.
 */
export class PlanSessionParamsDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la asignación de la planificación al alumno (User_Planification)' })
    @Type(() => String)
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de la asignación debe ser un UUID válido en formato PostgreSQL' })
    userPlanificationId!: string;

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la rutina del plan (Routine_Asignation)' })
    @Type(() => String)
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de la rutina del plan debe ser un UUID válido en formato PostgreSQL' })
    routineAsignationId!: string;
}
```

- [ ] **Paso 2: `routine_plan_session_detail_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { RoutineDetailResponseDto } from './routine_detail_response.dto';
import { RoutineAssignedFinishedDto } from './routine_assigned_detail_response.dto';
import { RoutineAssignedPlanUserPlanificationDto } from './routine_assigned_plan_response.dto';

// El bloque de los grupos del home del plan, mas active (D37): el detalle tambien se abre con la
// asignacion quitada (D24), y el cliente tiene que saberlo para no ofrecer marcar
export class RoutinePlanSessionUserPlanificationDto extends RoutineAssignedPlanUserPlanificationDto {

    @ApiProperty({ example: true, description: 'false si el entrenador quitó la planificación al alumno (E-14): la sesión se puede leer, pero marcar, desmarcar y anotar dan 400' })
    active!: boolean;
}

// El detalle de una sesion del plan (spec del detalle de una sesion del plan, §3): la rutina de una
// semana del plan para ese alumno, con lo que ya hizo. El equivalente de RoutineAssignedDetailResponseDto
// en la via de la planificacion
export class RoutinePlanSessionDetailResponseDto {

    @ApiProperty({ type: RoutinePlanSessionUserPlanificationDto })
    user_planification!: RoutinePlanSessionUserPlanificationDto;

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la Routine_Asignation. Con el id de la asignación identifica la sesión del plan' })
    routine_asignation_id!: string;

    @ApiProperty({ example: 2, minimum: 1, description: 'Semana del plan: la 1 es la de lunes a domingo que contiene start_date' })
    week!: number;

    @ApiProperty({ example: '2026-10-26', description: 'Lunes de esa semana del plan (YYYY-MM-DD), aunque el plan arranque a mitad de semana o la semana caiga después del fin' })
    week_start!: string;

    @ApiProperty({ example: '2026-11-01', description: 'Domingo de esa semana del plan (YYYY-MM-DD)' })
    week_end!: string;

    @ApiProperty({ example: 1, description: 'Posición dentro de la semana. Etiqueta de orden: puede repetirse' })
    order!: number;

    @ApiProperty({ example: true, description: 'false si el entrenador quitó la rutina del plan (E-12c): sólo se ve lo que el alumno completó' })
    active!: boolean;

    @ApiProperty({ type: RoutineDetailResponseDto, description: 'El mismo árbol que GET /routine/:id. Lo dado de baja aparece sólo si el alumno completó algo de ello en esta sesión; en una rutina quitada del plan se ve únicamente lo completado' })
    routine!: RoutineDetailResponseDto;

    @ApiProperty({ type: [RoutineAssignedFinishedDto], description: 'Los ejercicios que el alumno ya marcó como hechos en esta sesión, con su nota y el día en que los hizo' })
    finished!: RoutineAssignedFinishedDto[];
}
```

---

## Tarea 4 — Service (spec D37 a D39, §3 y §5)

**Archivos:** `power-app/src/routine/routine.service.ts`. No hacen falta imports nuevos: `UserPlanification`, `RoutineAsignation`, `RoutineExerciseFinished`, `UserRole`, `AuthUser` y `planWeekBounds` ya están importados.

- [ ] **Paso 1: el home del plan usa el builder del bloque (decisión 1).** En `findAssignedPlanWeeks`, reemplazar:

```ts
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
```
por:
```ts
            return {
                user_planification: this.buildPlanUserPlanificationResponse(userPlanification),
```

- [ ] **Paso 2: el detalle, después de `findAssignedPlanWeeks`.** Reemplazar el final de `findAssignedPlanWeeks`, que va hasta el título de la sección del home:

```ts
        return groups;
    }
```
por:
```ts
        return groups;
    }

    // Lo que el alumno abre desde el home en la via del plan (CU-U-09 y U-10, spec del detalle de una
    // sesion del plan): la rutina de una sesion del plan, con lo que ya hizo. El equivalente de
    // GET /routine/assign-user/:id, con los mismos builders. Se lee aunque la asignacion este quitada
    // (D24): user_planification.active le avisa al cliente que no se puede marcar (D37)
    async getPlanSessionDetail(
        userPlanificationId: string,
        routineAsignationId: string,
        currentUser: AuthUser,
        res: Response
    ) {
        try {
            const session = await this.findPlanSession(userPlanificationId, routineAsignationId, currentUser);

            if ('error' in session) {
                return res.status(session.status).send({ error: session.error });
            }

            const { userPlanification, routineAsignation } = session;

            // Por los ids de las filas y no por los del path, que pueden venir en mayuscula
            const finishedRows = await this.routineExerciseFinishedRepository.find({
                where: {
                    user_planification_id: userPlanification.id,
                    routine_asignation_id: routineAsignation.id,
                },
                order: { created_at: 'ASC', routine_exercise_id: 'ASC' },
            });

            // D29 y D38: una rutina quitada del plan en la que el alumno no hizo nada no existe para
            // el, y el coach y el admin ven lo mismo que el alumno
            if (!routineAsignation.active && finishedRows.length === 0) {
                return res.status(404).send({ error: 'La rutina fue quitada de la planificación.' });
            }

            // La misma consulta y los mismos builders que GET /routine/:id y el detalle individual
            const routine = await this.findRoutineDetail(routineAsignation.routine_id);

            if (!routine) {
                return res.status(404).send({ error: 'Rutina no encontrada' });
            }

            const { visibleInactiveIds, completedIds } = this.buildAssignmentVisibility(routine, finishedRows);
            const { week_start, week_end } = planWeekBounds(userPlanification.start_date, routineAsignation.week);

            return res.status(200).send({
                user_planification: {
                    ...this.buildPlanUserPlanificationResponse(userPlanification),
                    active: userPlanification.active,
                },
                routine_asignation_id: routineAsignation.id,
                week: routineAsignation.week,
                week_start,
                week_end,
                order: routineAsignation.order,
                active: routineAsignation.active,
                // En una rutina quitada del plan, como si todos sus vinculos estuvieran dados de baja:
                // solo lo completado, que es el total del home (finished = total)
                routine: this.buildRoutineDetailResponse(routine, visibleInactiveIds, completedIds, !routineAsignation.active),
                finished: finishedRows.map(row => this.buildFinishedResponse(row)),
            });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener la rutina del plan.' });
        }
    }
```

- [ ] **Paso 3: `buildAssignmentVisibility` acepta las marcas de las dos vías.** Reemplazar:

```ts
    // Que parte de lo dado de baja se le muestra al alumno en el detalle de una asignacion (spec
    // §4.4): un Routine_Exercise apagado, si lo completo; un Routine_Circuit apagado, si completo
    // algo de ese circuito. Se mira el CIRCUITO y no el vinculo porque la base no registra el
    // hecho por vinculo: con un circuito repetido (A, B, A) el ejercicio completado es el mismo en
    // los dos. Con esto, los ejercicios del detalle (sin repetir ids) son exactamente los de
    // BE-12: los activos de los vinculos activos mas los completados
    private buildAssignmentVisibility(
        routine: Routine,
        finishedRows: RoutineAsignExerciseFinished[]
    ): { visibleInactiveIds: Set<string>; completedIds: Set<string> } {
```
por:
```ts
    // Que parte de lo dado de baja se le muestra al alumno en el detalle de una asignacion o de una
    // sesion del plan (spec §4.4; las dos vias): un Routine_Exercise apagado, si lo completo; un
    // Routine_Circuit apagado, si completo algo de ese circuito. Se mira el CIRCUITO y no el vinculo
    // porque la base no registra el hecho por vinculo: con un circuito repetido (A, B, A) el ejercicio
    // completado es el mismo en los dos. Con esto, los ejercicios del detalle (sin repetir ids) son
    // exactamente los de BE-12: los activos de los vinculos activos mas los completados
    private buildAssignmentVisibility(
        routine: Routine,
        finishedRows: (RoutineAsignExerciseFinished | RoutineExerciseFinished)[]
    ): { visibleInactiveIds: Set<string>; completedIds: Set<string> } {
```

- [ ] **Paso 4: `isAssignmentOwner`, lo mismo.** Reemplazar:

```ts
    // "Dueño" = la asignacion es del alumno del token, comparado en minuscula (el iOS manda los
    // UUID en mayuscula). Lo usan el detalle, marcar y desmarcar: el path trae el id de la
    // asignacion y no el del alumno, asi que no alcanza con @Owner
    private isAssignmentOwner(assignment: RoutineAsignationUser, currentUser: AuthUser): boolean {
```
por:
```ts
    // "Dueño" = la asignacion es del alumno del token, comparado en minuscula (el iOS manda los
    // UUID en mayuscula). Lo usan el detalle, marcar y desmarcar de las dos vias (la individual y la
    // del plan): el path trae el id de la asignacion y no el del alumno, asi que no alcanza con @Owner
    private isAssignmentOwner(assignment: RoutineAsignationUser | UserPlanification, currentUser: AuthUser): boolean {
```

- [ ] **Paso 5: `buildFinishedResponse`, lo mismo.** Reemplazar:

```ts
    // Lo que el cliente cruza con el arbol de la rutina por routine_exercise_id. La misma forma en
    // el detalle (finished) y en la respuesta de marcar. finished_at es el dia en que lo hizo y
    // created_at, cuando se registro la marca
    private buildFinishedResponse(row: RoutineAsignExerciseFinished) {
```
por:
```ts
    // Lo que el cliente cruza con el arbol de la rutina por routine_exercise_id. La misma forma en
    // el detalle (finished) y en la respuesta de marcar, en las dos vias. finished_at es el dia en
    // que lo hizo y created_at, cuando se registro la marca
    private buildFinishedResponse(row: RoutineAsignExerciseFinished | RoutineExerciseFinished) {
```

- [ ] **Paso 6: la sección nueva de helpers, antes de `HELPERS DE RUTINA` (D39 y decisión 1).** Reemplazar la línea del título:

```ts
    // ===================== HELPERS DE RUTINA =====================
```
por:
```ts
    // ===================== HELPERS DEL PLAN DEL ALUMNO =====================

    // La asignacion de la que sale cada grupo del home del plan (BE-20) y el detalle de una sesion
    // del plan (BE-20b, que le suma active): lo propio de la User_Planification y la cabecera de la
    // plantilla, que se lee en vivo (D18). Un solo builder, para que las dos sean iguales por
    // construccion. La User_Planification tiene que venir con su planification
    private buildPlanUserPlanificationResponse(userPlanification: UserPlanification) {
        return {
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
        };
    }

    // Las validaciones de una sesion del plan, el par (User_Planification, Routine_Asignation), en el
    // orden de §5.4 del bloque B (D39). Las comparten el detalle (BE-20b) y marcar y desmarcar
    // (BE-20c). Devuelve la sesion o el error que responde el handler, como checkExerciseIsMarkable.
    // El 403 va antes del segundo 404: un alumno no averigua que hay en los planes de otro
    private async findPlanSession(
        userPlanificationId: string,
        routineAsignationId: string,
        currentUser: AuthUser
    ): Promise<{ userPlanification: UserPlanification; routineAsignation: RoutineAsignation } | { status: number; error: string }> {
        // Con la cabecera de la plantilla que devuelve el detalle (D37): la misma seleccion que el
        // home del plan. El inner join es seguro: planification_id es NOT NULL con FK (D19)
        const userPlanification = await this.userPlanificationRepository
            .createQueryBuilder('userPlanification')
            .innerJoin('userPlanification.planification', 'planification')
            .addSelect(['planification.id', 'planification.name', 'planification.duration', 'planification.active'])
            .where('userPlanification.id = :userPlanificationId', { userPlanificationId })
            .getOne();

        if (!userPlanification) {
            return { status: 404, error: 'Asignación no encontrada' };
        }

        // Coach y admin abren la de cualquier alumno (gimnasio compartido, D6). Marcar y desmarcar son
        // solo del rol user: para ellos, esto es el chequeo del dueño. El texto no puede ser el de la
        // cuenta deshabilitada: es el unico que hace cerrar la sesion en el web
        if (currentUser.role === UserRole.user && !this.isAssignmentOwner(userPlanification, currentUser)) {
            return { status: 403, error: OTHER_STUDENT_ASSIGNMENT_ERROR };
        }

        // Por id Y por la plantilla de la asignacion: la regla que la base no garantiza (§3 del bloque
        // B). Que no exista y que sea de otra plantilla dan lo mismo
        const routineAsignation = await this.routineAsignationRepository.findOne({
            where: { id: routineAsignationId, planification_id: userPlanification.planification_id },
        });

        if (!routineAsignation) {
            return { status: 404, error: 'La rutina no pertenece a esta planificación.' };
        }

        return { userPlanification, routineAsignation };
    }

    // ===================== HELPERS DE RUTINA =====================
```

- [ ] **Paso 7: `buildRoutineDetailResponse` con `onlyCompleted`.** Reemplazar desde la última línea de su comentario hasta el título de los helpers de circuito:

```ts
    // ejercicios que el entrenador saco). Ojo: el vinculo apagado tiene order null, asi que no
    // conserva su posicion y Postgres lo manda al final
    private buildRoutineDetailResponse(
        routine: Routine,
        visibleInactiveIds?: Set<string>,
        completedIds?: Set<string>
    ) {
        return {
            id: routine.id,
            name: routine.name,
            coach_note: routine.coach_note,
            active: routine.active,
            created_at: routine.created_at,
            updated_at: routine.updated_at,
            circuits: routine.routineCircuits
                .filter(routineCircuit => routineCircuit.active || visibleInactiveIds?.has(routineCircuit.id))
                .map(routineCircuit => ({
                    id: routineCircuit.id,
                    order: routineCircuit.order,
                    // Mismo formato que GET /routine/circuit/:id
                    circuit: this.buildCircuitDetailResponse(
                        routineCircuit.circuit,
                        visibleInactiveIds,
                        routineCircuit.active ? undefined : completedIds,
                    ),
                })),
        };
    }
```
por:
```ts
    // ejercicios que el entrenador saco). Ojo: el vinculo apagado tiene order null, asi que no
    // conserva su posicion y Postgres lo manda al final.
    // onlyCompleted: la rutina entera cuenta como sacada, asi que se arma como si todos sus vinculos
    // estuvieran apagados: cada uno aparece solo si su circuito tiene algo completado, y de el solo
    // lo completado. Lo usa el detalle de una sesion del plan cuya rutina el coach quito del plan
    // (BE-20b, D29): asi coincide con el total del home, que ahi es finished = total
    private buildRoutineDetailResponse(
        routine: Routine,
        visibleInactiveIds?: Set<string>,
        completedIds?: Set<string>,
        onlyCompleted = false
    ) {
        return {
            id: routine.id,
            name: routine.name,
            coach_note: routine.coach_note,
            active: routine.active,
            created_at: routine.created_at,
            updated_at: routine.updated_at,
            circuits: routine.routineCircuits
                .filter(routineCircuit => onlyCompleted
                    ? routineCircuit.circuit.routineExercises.some(routineExercise => completedIds?.has(routineExercise.id))
                    : routineCircuit.active || visibleInactiveIds?.has(routineCircuit.id))
                .map(routineCircuit => ({
                    id: routineCircuit.id,
                    order: routineCircuit.order,
                    // Mismo formato que GET /routine/circuit/:id
                    circuit: this.buildCircuitDetailResponse(
                        routineCircuit.circuit,
                        visibleInactiveIds,
                        routineCircuit.active && !onlyCompleted ? undefined : completedIds,
                    ),
                })),
        };
    }
```

---

## Tarea 5 — Controller (spec §3)

**Archivos:** `power-app/src/routine/routine.controller.ts`

- [ ] **Paso 1: imports.** Reemplazar:

```ts
import { RoutineHomeWeekResponseDto } from '../dtos/routine/routine_home_response.dto';
```
por:
```ts
import { RoutineHomeWeekResponseDto } from '../dtos/routine/routine_home_response.dto';
import { PlanSessionParamsDto } from '../dtos/routine/plan_session_params.dto';
import { RoutinePlanSessionDetailResponseDto } from '../dtos/routine/routine_plan_session_detail_response.dto';
```

- [ ] **Paso 2: el handler, entre `getRoutineHome` y el historial.** Reemplazar:

```ts
        await this.routineService.getRoutineHome(params.userId, query, res);
    }
```
por:
```ts
        await this.routineService.getRoutineHome(params.userId, query, res);
    }

    // El detalle de una sesion del plan (U-09 y U-10 por la via de la planificacion): el par que da
    // cada rutina de un grupo del home. Como en assign-user/:id, el dueño se chequea en el service y
    // no con @Owner, porque el path no trae el id del alumno: con el rol user, 403 si la asignacion
    // es de otro; coach y admin abren la de cualquiera. Tres segmentos: no compite con otra ruta
    @Get('assign-plan/:userPlanificationId/:routineAsignationId')
    @Auth(UserRole.user, UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: RoutinePlanSessionDetailResponseDto, description: 'También con la asignación quitada (user_planification.active = false): se lee, pero no se puede modificar' })
    @ApiResponse({ status: 400, description: 'Alguno de los ids no es un UUID válido' })
    @ApiResponse({ status: 403, description: 'La asignación es de otro alumno' })
    @ApiResponse({ status: 404, description: 'Asignación no encontrada, la rutina no pertenece a esta planificación, o el entrenador la quitó del plan y el alumno no hizo nada en ella' })
    async getPlanSessionDetail(
        @Param() params: PlanSessionParamsDto,
        @CurrentUser() user: AuthUser,
        @Res() res: Response,
    ) {
        await this.routineService.getPlanSessionDetail(params.userPlanificationId, params.routineAsignationId, user, res);
    }
```

---

## Tarea 6 — Compilar y verificar

- [ ] **Paso 1: build**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
```
Esperado: sin errores.

- [ ] **Paso 2: los scripts nuevos y la foto, en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/61fe7dcf-18ce-4438-ac72-cd186d350cfb/scratchpad/be20b"
unset ROOT; cd "$SCRATCH" && for s in verify-session-dto verify-session-controller verify-session-rules snapshot-be13; do echo "== $s"; node $s.js 2>&1 | grep -E "FALLA|fallas$"; done
```
**Esperado** (lo que dio en el prototipo), todos con `0 fallas`: `15`, `74`, `152` y `19 ok`. Que la foto dé idéntica prueba que el detalle individual y `GET /routine/:id` responden igual que antes.

- [ ] **Paso 3: la regresión.** Es el mismo bloque del Paso 2 de la Tarea 0.

  **Esperado:** los mismos números, salvo dos controllers que recorren todos los handlers de `routine/` y ahora tienen uno más (hallazgo 11): el de BE-20 pasa de `93` a `95`, y el de BE-20e, de `74` a `76`. Que BE-20 y BE-20e sigan en verde prueba que el home del plan responde igual con el builder nuevo.

- [ ] **Paso 4: el repo tiene exactamente el cambio probado**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/61fe7dcf-18ce-4438-ac72-cd186d350cfb/scratchpad/be20b"
cd "$SCRATCH" && node check-edits.js repo | grep -E "FALLA|fallas$"
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short
```
**Esperado:**
- **`0 fallas`:** el `HEAD` del repo más las ediciones da cada archivo tocado, y los dos DTOs son los del prototipo. Si falla, mirar el diff antes de seguir.
- **`git status`,** sólo los cinco archivos de BE-20b.

---

## Tarea 7 — Specs de CU-U-09 y CU-U-10 (repo PowerApp-Docs)

**Archivos:** `D:\Power App\Docs\PowerApp-Docs\Use Cases\usuario\CU-U-09-ver-detalle-de-rutina.md` y `CU-U-10-ver-detalle-de-un-ejercicio.md`. Están también en el scratchpad, como `cu-u-09.md` y `cu-u-10.md`.

- [ ] **Paso 1: reemplazar CU-U-09 entero por:**

````markdown
# CU-U-09 — Ver detalle de Rutina

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra los circuitos y ejercicios que componen la rutina de una asignación del usuario, junto con lo que ya hizo en ella, como punto de partida para ejecutarla. La rutina se abre **desde la asignación** y no directamente por la rutina. La asignación puede ser de dos tipos:

- **Individual:** una rutina para un día.
- **Una sesión del plan:** una rutina de una semana de la planificación que el entrenador le asignó al usuario.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Ver detalle de un ejercicio

## Alcance

**Cubre:**

- Listado ordenado de circuitos de la rutina y, dentro de cada uno, sus ejercicios con sus series.
- Los ejercicios que el alumno ya marcó como realizados en esa asignación, con su nota y el día en que los hizo.
- En una sesión del plan, la planificación y la semana a la que pertenece la rutina.
- Acceso al detalle de cada ejercicio.

**Fuera de alcance:**

- Edición de la rutina (es competencia del Entrenador).
- Marcar ejercicios como realizados (CU «Marcar como realizado»).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La asignación pertenece al usuario.

## Postcondiciones

- Operación de solo lectura sobre la estructura de la rutina y el registro de ejecución.

## Camino principal (flujo básico)

1. El usuario selecciona una rutina desde su home (CU «Obtener mi planificación»): una asignación individual o una rutina de una semana de su plan.
2. El sistema verifica que la asignación sea del usuario y, en una sesión del plan, que la rutina sea de esa planificación.
3. El sistema recupera los circuitos de la rutina (Routine_Circuit) en su orden.
4. Para cada circuito, recupera sus ejercicios (Routine_Exercise) con series.
5. El sistema recupera los ejercicios que el usuario ya marcó como realizados en esa asignación, con su nota.
6. El sistema presenta la estructura completa, señala lo realizado y permite abrir el detalle de cada ejercicio (<<include>> Ver detalle de un ejercicio). En una sesión del plan, presenta también la planificación y la semana.

## Caminos alternativos / excepciones

### En el paso 2 — La asignación no existe

1. El sistema informa que no se encontró la asignación.

### En el paso 2 — Asignación de otro alumno

1. La asignación pertenece a otro usuario.
2. El sistema deniega el acceso.

### En el paso 2 — La rutina no es de la planificación

1. En una sesión del plan, la rutina no existe o no pertenece a la planificación de esa asignación.
2. El sistema informa que la rutina no pertenece a la planificación.

### En el paso 2 — El entrenador quitó la planificación al usuario

1. El entrenador quitó la planificación al usuario (CU «Eliminar Planificación a Alumno»).
2. El sistema muestra la rutina igual, indicando que la planificación fue quitada: el usuario puede ver lo que hizo, pero ya no puede marcar, desmarcar ni anotar ejercicios en ella.

### En el paso 3 — El entrenador quitó la rutina del plan

1. El entrenador quitó la rutina de la planificación (CU «Quitar o Reincorporar una Rutina de una Planificación Sistémica») después de que el usuario completó algo de ella en esa asignación.
2. El sistema la muestra indicando que fue quitada, con únicamente los ejercicios que el usuario completó: los demás no aparecen como pendientes.
3. Si el usuario no completó nada de ella, para él la rutina no existe: el sistema informa que la rutina fue quitada de la planificación.

### En el paso 3 — La rutina o la planificación fueron dadas de baja después de asignarlas

1. El entrenador dio de baja la rutina, o la planificación de la que sale la sesión, después de asignarla.
2. El sistema la muestra igual, indicando que está dada de baja: la asignación existe y el usuario puede ejecutarla.

### En el paso 4 — Un ejercicio o un circuito fue dado de baja

1. El entrenador sacó un ejercicio de un circuito, o un circuito de la rutina, después de que el usuario completó algo de él en esa asignación.
2. El sistema lo sigue mostrando: lo dado de baja que el usuario completó no desaparece de su pantalla.
3. De un circuito que el entrenador sacó de la rutina se muestran únicamente los ejercicios que el usuario completó; los demás no aparecen como pendientes.
4. Lo dado de baja que el usuario **no** completó no se muestra.
````

- [ ] **Paso 2: reemplazar CU-U-10 entero por:**

````markdown
# CU-U-10 — Ver detalle de un ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra el detalle de un ejercicio dentro de la rutina de una asignación (series, reps, notas, video/tips) y habilita las acciones de ejecución asociadas. La asignación puede ser individual o una sesión del plan. Los datos llegan **dentro del detalle de la rutina** (CU «Ver detalle de Rutina»), así que abrirlo no requiere una consulta aparte.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Ver mis RMs de un ejercicio
- Marcar serie como realizado
- Dejar una nota en el ejercicio

## Alcance

**Cubre:**

- Presentación del Exercise y sus Exercise_Set (orden, reps, peso, RPE/RIR, AMRAP/RM) tal como están en la rutina.
- Acceso a RMs propios del ejercicio, marcado de series y nota personal.

**Fuera de alcance:**

- Edición de la definición del ejercicio (Admin).
- La ficha del catálogo fuera de una rutina (CU «Consultar wiki de ejercicios»).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El ejercicio forma parte de la rutina de una asignación del usuario: individual o una sesión de su plan.

## Postcondiciones

- Operación de solo lectura sobre el detalle; las acciones incluidas pueden modificar estado por separado.

## Camino principal (flujo básico)

1. Desde el detalle de la rutina, el usuario abre un ejercicio.
2. El sistema ya tiene el Exercise y sus Exercise_Set ordenadas, recuperados junto con el detalle de la rutina.
3. El sistema presenta reps, peso, tipo de serie (normal / AMRAP / RM) y notas: la del entrenador (coach_note) y la propia del usuario (user_note), si dejó una en esa asignación.
4. El sistema ofrece las acciones incluidas: ver RMs, marcar serie y dejar nota.

## Caminos alternativos / excepciones

### En el paso 2 — Ejercicio sin series cargadas

1. El ejercicio no tiene Exercise_Set.
2. El sistema muestra el detalle informativo sin series ejecutables.

### En el paso 3 — Ejercicio dado de baja que el usuario completó

1. El entrenador sacó el ejercicio de la rutina, o la rutina del plan, después de que el usuario lo completó en esa asignación.
2. El sistema lo sigue mostrando, con su nota, porque forma parte de lo que hizo.

### En el paso 4 — El entrenador quitó la planificación al usuario

1. En una sesión del plan, el entrenador quitó la planificación al usuario (CU «Eliminar Planificación a Alumno»).
2. El sistema muestra el detalle, pero sólo ofrece ver los RMs: ya no se puede marcar ni dejar nota.
````

- [ ] **Paso 3: control**

```bash
cd "D:/Power App/Docs/PowerApp-Docs/Use Cases/usuario" && grep -c "sesión del plan" CU-U-09-ver-detalle-de-rutina.md CU-U-10-ver-detalle-de-un-ejercicio.md
grep -n "La rutina no es de la planificación\|quitó la planificación\|quitó la rutina del plan" CU-U-09-ver-detalle-de-rutina.md
```
**Esperado:**
- Un conteo mayor que 0 en los dos.
- Los tres caminos nuevos de U-09 encontrados.

---

## Tarea 8 — Nota en la spec del bloque B (repo PowerApp-Docs)

**Archivos:** `D:\Power App\Docs\PowerApp-Docs\Doc\specs\2026-10-20-asignar-planificaciones-design.md`. No se reescribe nada: se suma una nota.

- [ ] **Paso 1: §5.6.** Debajo del título `### 5.6 Detalle — …`, sumar (con una línea en blanco antes y después):

```
> **22/10:** revisado con el usuario en la [spec del detalle de una sesión del plan](2026-10-22-detalle-de-una-sesion-del-plan-design.md) (BE-20b). La respuesta trae el bloque `user_planification` del home con su `active`, y la semana con `week_start` y `week_end` (D37). La rutina quitada sin nada hecho da `404` con texto propio para todos los roles (D38). Las validaciones de §5.4 se escriben una sola vez, para el detalle y para marcar y desmarcar (D39).
```

- [ ] **Paso 2: control**

```bash
grep -c "2026-10-22-detalle-de-una-sesion-del-plan-design.md" "D:/Power App/Docs/PowerApp-Docs/Doc/specs/2026-10-20-asignar-planificaciones-design.md"
```
Esperado: `1`.

---

## Tarea 9 — Status (informe y dashboard)

**Archivos:** `Status/estado-implementacion-backend.md` y `Status/dashboard-estado-backend.html`.
- **Los conteos no cambian:** U-09 y U-10 ya están ✅ desde BE-13.
- **Si algún número de la verificación salió distinto del esperado,** se corrige en el texto antes de guardarlo.

- [ ] **Paso 1: la entrada del changelog.** En el informe, insertarla arriba de la **primera** sección `## Cambios recientes`, que al escribir el plan era la de BE-24 a BE-26:

```markdown
## Cambios recientes (2026-10-22 · bloque B: el detalle de una sesión del plan)

- **BE-20b: el detalle de una sesión del plan** (U-09 y U-10 por la vía de la planificación). Spec: `Doc/specs/2026-10-22-detalle-de-una-sesion-del-plan-design.md`; plan: `Doc/plans/2026-10-22-be-20b-detalle-de-una-sesion-del-plan-plan.md` (repo PowerApp-Docs). Una sesión del plan es el par (`User_Planification`, `Routine_Asignation`): una rutina de una semana del plan, para ese alumno. Es lo que abre cada rutina de un grupo del home, y el equivalente de `GET /routine/assign-user/:id` (BE-13) en la vía de la planificación.
- **El contrato** (§5.4 y §5.6 de la spec del bloque B, revisados en la spec del detalle): `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId`. Roles: user (el dueño, chequeado en el service, porque el path no trae el id del alumno), coach y admin. Validaciones, en este orden:
  1. `400` del DTO, si algún id no es un UUID.
  2. `404` `Asignación no encontrada`.
  3. `403` si, con el rol `user`, la asignación es de otro alumno. Va antes del segundo `404`, así un alumno no averigua qué hay en los planes de otro.
  4. `404` `La rutina no pertenece a esta planificación.` si no existe o es de otra plantilla.
  5. `404` `La rutina fue quitada de la planificación.` si el coach la quitó del plan y el alumno no hizo nada en ella en esta asignación.
- **La respuesta (`200`):** `{ user_planification: { id, start_date, end_date, coach_note, planification: { id, name, duration, active }, active }, routine_asignation_id, week, week_start, week_end, order, active, routine, finished }`.
  - `routine` es el árbol de `GET /routine/:id`, armado con los mismos builders.
  - `finished` tiene la forma de la vía individual.
  - Se lee también con la asignación quitada (D24).
  - Una plantilla o una rutina dadas de baja se ven con su `active: false`.
  - Una semana posterior al fin se abre igual (D5).
- **Decisiones del 22/10, con el usuario (D37 a D39 de la spec del detalle):**
  - **D37: la respuesta trae el bloque `user_planification` del home más su `active`, y la semana con `week_start` y `week_end`.** §5.6 traía sólo el id, y le faltaban dos cosas:
    - **Si la asignación estaba quitada** (D24): el cliente se enteraba recién con el `400` de marcar.
    - **El `active` de la plantilla,** que §5.4 promete como dato informativo.

    Así la pantalla se arma sola, venga de donde venga el cliente (el home, un link o el historial del coach), y el front reutiliza el tipo del bloque del home.
  - **D38: una rutina quitada del plan sin nada hecho da `404` para todos los roles, con su propio texto.** Es el "para el alumno no existe" de D29. El coach y el admin ven lo mismo que el alumno, como en el detalle individual. Reusar el texto de "no pertenece" engañaría: la rutina sí es del plan.
  - **D39: las validaciones de §5.4 se escriben una sola vez** (`findPlanSession`), para el detalle y para marcar y desmarcar (BE-20c). El `403` sale cuando el rol es `user`. Para el detalle es exactamente §5.4, y marcar y desmarcar sólo admiten ese rol.
- **Cómo se hizo:**
  - **`getPlanSessionDetail`** valida con `findPlanSession`, lee las marcas de la sesión (por los ids de las filas, no por los del path), aplica D38 y arma el árbol con `findRoutineDetail`, `buildAssignmentVisibility` y `buildRoutineDetailResponse`, los de BE-13.
  - **`buildRoutineDetailResponse` suma `onlyCompleted`,** para la rutina quitada del plan. La arma como si todos sus vínculos estuvieran dados de baja, así coincide con el `total` del home (`finished = total`).
  - **Los tipos de `buildAssignmentVisibility`, `buildFinishedResponse` e `isAssignmentOwner` se abrieron a las dos vías,** con uniones de las entidades.
  - **El detalle individual y `GET /routine/:id` responden igual que antes:** lo prueba una foto de sus respuestas, sacada antes de tocar el código.
- **Decisiones del plan** (el usuario las aprobó con él):
  - **El bloque `user_planification` sale de un builder nuevo, `buildPlanUserPlanificationResponse`,** que usa también el home del plan. Así son iguales por construcción, como D36.
  - **`active` va al final del bloque,** porque el DTO hereda del bloque del home y lo suma.
  - **`planWeekBounds` recorta también el lunes al 9999-12-31.** Una plantilla sin duración fija acepta semanas hasta la INTEGER_MAX, y el detalle abre cualquier semana por su ruta. Sin el recorte, desde la semana ~416.000 el lunes salía mal formado, y desde la ~14 millones, un `500`. Al home no le cambia nada.
  - **Textos:** el `500` dice `Error al obtener la rutina del plan.`, y cada id tiene su mensaje en el DTO.
  - **U-10 suma un camino:** con la planificación quitada, sólo se ofrece ver los RMs.
- **Verificación, sin levantar el server.** Hecho:
  - Build en verde.
  - **El código se probó antes de aprobar el plan** en una copia de `HEAD` en el scratchpad, compilada con `tsc` y con `node_modules` enlazado, y se aplicó tal cual. Un script comprueba que el repo tiene exactamente el cambio probado: el `HEAD` más las ediciones del plan da cada archivo.
  - **Tres scripts nuevos sobre el código compilado,** escritos antes del código, corridos **en rojo** (1, 9 y 42 fallas) y después en verde:
    - **los params** (15 chequeos);
    - **el controller y su Swagger** (74);
    - **las reglas** (152). Usan las consultas reales sin base y cubren:
      - los códigos y su orden, con los tres roles;
      - el SQL de las tres consultas y la hidratación;
      - la forma, y el bloque idéntico al del home;
      - la asignación quitada y las bajas;
      - las semanas fuera del plan;
      - y doce escenarios de visibilidad en los que el árbol coincide con el `total` del home.
  - **La foto del detalle individual y de `GET /routine/:id`** dio idéntica (19 respuestas).
  - **Regresión en verde:** BE-12 (24, 27 y 58), BE-18b (86), BE-20 (92, 95 y 113), BE-20e (96, 31, 76 y 58) y BE-18 (47, 130, 48 y 43). Los dos controllers suman dos chequeos porque recorren todos los handlers.
  - **Qué NO se verificó:**
    - el SQL contra un Postgres;
    - el detalle con marcas reales del plan: nada escribe `Routine_Exercise_Finished` hasta BE-20c;
    - el runtime (BE-35, con el seed de BE-21).
- **Sin cambios de estado: U-09 y U-10 ya estaban ✅ desde BE-13.**
  - **Specs de CU reescritas** en `Use Cases/` (repo PowerApp-Docs):
    - **U-09:** la asignación puede ser una sesión del plan. Caminos nuevos: la rutina no es de la planificación, el coach quitó la rutina del plan, el coach quitó la planificación, y la planificación dada de baja.
    - **U-10:** el ejercicio puede ser de una sesión del plan. Con la planificación quitada, sólo se ven los RMs.
  - **Nota en la spec del bloque B** (§5.6).
  - **Para el web y el iOS:** la pantalla de la rutina del plan reutiliza el árbol y el cruce por `routine_exercise_id` de la vía individual. La cabecera sale de `user_planification` y de la semana. Con `user_planification.active: false`, no se ofrece marcar ni anotar.
  - **Sigue BE-20c** (marcar, la nota y desmarcar en el plan), que arranca con `findPlanSession` y los params hechos.

```

- [ ] **Paso 2: la fila de U-09 del informe.** Reemplazar el final de la celda del endpoint:

```
· mismo árbol que `GET /routine/:id`, con lo dado de baja que completó y lo hecho en `finished` (18/10) · el detalle de una asignación del plan es del bloque B |
```
por:
```
· mismo árbol que `GET /routine/:id`, con lo dado de baja que completó y lo hecho en `finished` (18/10) · `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId` · el detalle de una **sesión del plan**: el mismo árbol, con la asignación, su plantilla y la semana; se lee aunque la planificación esté quitada, y de una rutina quitada del plan se ve sólo lo completado (BE-20b, 22/10) |
```

- [ ] **Paso 3: la fila de U-10 del informe.** Reemplazar:

```
Se resuelve dentro del detalle de la asignación (`GET /routine/assign-user/:id`): ficha
```
por:
```
Se resuelve dentro del detalle de la asignación (`GET /routine/assign-user/:id`) o de la sesión del plan (`GET /routine/assign-plan/:userPlanificationId/:routineAsignationId`, BE-20b): ficha
```

- [ ] **Paso 4: la fila de U-09 del dashboard.** Reemplazar:

```html
<td class="endpoint"><span class="verb">GET</span> /routine/assign-user/:id <span class="muted">· el alumno lee la rutina por su asignación (403 si es de otro) · mismo árbol que GET /routine/:id, con lo dado de baja que completó y lo hecho en <code>finished</code> (18/10)</span></td></tr>
```
por:
```html
<td class="endpoint"><span class="verb">GET</span> /routine/assign-user/:id <span class="muted">· el alumno lee la rutina por su asignación (403 si es de otro) · mismo árbol que GET /routine/:id, con lo dado de baja que completó y lo hecho en <code>finished</code> (18/10) · </span><span class="verb">GET</span> /routine/assign-plan/:userPlanificationId/:routineAsignationId <span class="muted">· el detalle de una sesión del plan: el mismo árbol, con la asignación y la semana; se lee aunque esté quitada (BE-20b, 22/10)</span></td></tr>
```

- [ ] **Paso 5: la fila de U-10 del dashboard.** Reemplazar:

```html
<span class="muted">dentro del detalle de la asignación: ficha, series, nota del coach y, en <code>finished</code>, la nota del alumno (18/10) · </span>
```
por:
```html
<span class="muted">dentro del detalle de la asignación o de la sesión del plan (BE-20b, 22/10): ficha, series, nota del coach y, en <code>finished</code>, la nota del alumno (18/10) · </span>
```

- [ ] **Paso 6: la fase 3 del dashboard.** Reemplazar `BE-17, BE-18, BE-18b, BE-19, BE-20 y BE-20e (20 y 21/10)` por `BE-17, BE-18, BE-18b, BE-19, BE-20, BE-20e y BE-20b (20 a 22/10)`. Si la línea cambió desde que se escribió el plan, sumar `BE-20b` a la lista que haya.

- [ ] **Paso 7: el corte.** Si el informe o el dashboard no dicen `2026-10-22` (o el día en que se ejecuta), actualizar la fecha del corte en los dos.

- [ ] **Paso 8: control**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status" && grep -c "BE-20b" estado-implementacion-backend.md dashboard-estado-backend.html && grep -c "assign-plan/:userPlanificationId" estado-implementacion-backend.md dashboard-estado-backend.html && grep "| ✅ Implementado |" estado-implementacion-backend.md
```
**Esperado:**
- `BE-20b` en los dos archivos.
- La ruta, al menos dos veces en el informe y una en el dashboard.
- **La fila de ✅, idéntica a la que se anotó en la Tarea 0.**

---

## Tarea 10 — Stage y mensajes de commit

- [ ] **Paso 1: stage en los dos repos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/planification/plan_weeks.ts power-app/src/dtos/routine/plan_session_params.dto.ts power-app/src/dtos/routine/routine_plan_session_detail_response.dto.ts power-app/src/routine/routine.service.ts power-app/src/routine/routine.controller.ts Status/estado-implementacion-backend.md Status/dashboard-estado-backend.html && git status --short
cd "D:/Power App/Docs/PowerApp-Docs" && git add "Use Cases/usuario/CU-U-09-ver-detalle-de-rutina.md" "Use Cases/usuario/CU-U-10-ver-detalle-de-un-ejercicio.md" Doc/specs/2026-10-20-asignar-planificaciones-design.md && git status --short
```
**Esperado:**
- **Backend:** siete archivos, todos stageados y nada sin stagear.
- **Docs:** tres archivos, más este plan y la spec del detalle si todavía no se commitearon.

- [ ] **Paso 2: proponer los mensajes** (el usuario commitea con su estilo):
  - Backend: `BE-20b: el detalle de una sesion del plan (U-09, U-10), GET /routine/assign-plan/:userPlanificationId/:routineAsignationId`
  - Docs: `CU-U-09 y CU-U-10: la rutina puede ser de una sesion del plan (BE-20b)`

---

## Tarea 11 — Memoria del proyecto

- [ ] **Paso 1: `project_cu_status.md`.** Sumar que BE-20b quedó hecha, con estos datos:
  - la ruta, `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId`;
  - las decisiones D37 a D39;
  - que `findPlanSession` y `PlanSessionParamsDto` quedan para BE-20c;
  - que no hubo cambio de conteos.

  Actualizar también la línea del índice en `MEMORY.md`. En `project_data_model_reconciliation.md` no hay nada que tocar: no cambió el modelo.

---

## 4. Qué NO verifica este plan

- **El SQL contra un Postgres:** se genera sin base y se compara como texto.
- **El detalle con marcas reales del plan:** nada escribe `Routine_Exercise_Finished` hasta BE-20c. Las marcas de los scripts son filas armadas a mano que pasan por el transformador de TypeORM.
- **Que el server arranque:** no cambian ni el módulo ni el constructor, así que la inyección es la de BE-20.
- **El runtime:** lo prueba el usuario en BE-35, con la base regenerada y el seed de BE-21.

## 5. Autoevaluación contra la spec

- **Cobertura:** cada sección de la spec tiene su tarea (§3 de este plan).
  - D37 y D38 los prueban las reglas.
  - D39 lo prueban el orden de los códigos y que el coach y el admin pasen.
  - Que no cambie lo que ya respondía lo prueban la foto de BE-13 y la regresión de BE-20 y BE-20e.
- **Sin marcadores pendientes:** el código de las Tareas 2 a 5 y los scripts de la Tarea 1 están completos y son los que se probaron en el prototipo. `check-edits.js` lo comprueba antes y después de implementar.
- **Consistencia de nombres:** estos nombres se usan igual en el código, en los scripts y en el Status:
  - `getPlanSessionDetail`, `findPlanSession`, `buildPlanUserPlanificationResponse` y `onlyCompleted`;
  - `PlanSessionParamsDto`, `RoutinePlanSessionDetailResponseDto` y `RoutinePlanSessionUserPlanificationDto`.
- **Desvío de la spec, declarado:** `planWeekBounds` se toca (decisión 3), aunque §5 de la spec no lo lista entre los archivos.

## 6. Después de esto

**Sigue BE-20c:** marcar, la nota y desmarcar en el plan (§5.7 y §5.8 de la spec del bloque B).
- Arranca con `findPlanSession`, que ya hace las validaciones de §5.4 (decisión D39), y con `PlanSessionParamsDto`, al que el desmarcar le suma `routineExerciseId`.
- Le suma el `400` de la asignación quitada (D24), que el detalle no tiene porque sólo lee.
