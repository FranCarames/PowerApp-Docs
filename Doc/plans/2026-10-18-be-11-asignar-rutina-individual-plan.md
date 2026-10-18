# BE-11 — Asignar y quitar una rutina individual (CU-E-19 y CU-E-20) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` de los archivos propios y se propone el mensaje (Tarea 8).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. No se instala nada para verificar.
> 3. **No se levanta el server.** Ni siquiera en segundo plano. Los scripts no abren puertos ni se conectan a ninguna base.

> **Registro de ejecución (18/10):** plan aprobado sin cambios. Qué pasó respecto de lo escrito abajo:
> - **Tarea 1, rojo:** `verify-dto` 1 falla (el módulo no existía), `verify-rules` 21, `verify-controller` 11. `verify-typeorm` midió el esquema de BE-10 y ya pasaba, salvo un ajuste **del script**: `getQuery()` suelto no muestra el `RETURNING` porque TypeORM lo arma recién en `InsertQueryBuilder.execute()` (setea `extraReturningColumns` desde `getInsertionReturningColumns()`). El script reproduce ese paso y el `INSERT` que sale es `... RETURNING "id", "created_at", "updated_at"`.
> - **Verde final:** build en 0; `verify-dto` 58 ok, `verify-rules` 62, `verify-typeorm` 19, `verify-controller` 31, todos con 0 fallas.
> - **Tarea 5:** `Db Creator/` y las entidades sin diferencias; ningún `return this.routineService`; el texto reservado del 403 no aparece; `GET /routine/assigned/:userId` no existe.
> - **Sin otros desvíos:** el código quedó como está escrito en las Tareas 2 a 4.

**Spec que manda:** [`2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md`](../specs/2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md), §2 (D2, D4, D6, D13), §4 (sobre todo §4.1, §4.2 y la tabla de rutas), §6, §7, §9, §10 y §12. **Diagrama:** `Doc/PowerApp - Modelo DB.svg` / `.pdf` (el modelo ya está aplicado por BE-10: este plan no toca el esquema).
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde contradice a la spec, manda la spec (ver el hallazgo 1).

**Goal:** que el entrenador (o el admin) pueda asignarle una rutina a un alumno **para un día** (`POST /routine/assign-user`) y quitarla mientras el alumno no la haya entrenado (`DELETE /routine/assign-user/:id`).

**Architecture:** dos métodos nuevos en `RoutineService` y dos handlers en `RoutineController`, más dos DTOs de respuesta/entrada y un validador de "día sin hora". **Sin transacción:** cada endpoint es una sola escritura (un `INSERT` o un `DELETE`) precedida de lecturas, y las carreras las cierra la base (el único `uk_rau_routine_user_date` y el `RESTRICT` de `Routine_Asign_Exercise_Finished`), traducidas a `409`. Sin cambios de esquema, así que **`Db Creator` no se toca**.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` · scripts de Node en el scratchpad que corren sobre `power-app/dist` con repositorios falsos.

---

## 1. Estado de partida y hallazgos al preparar el plan

**Estado de partida (verificado el 18/10):** los dos repos están **limpios**, y BE-10/BE-10b **ya están commiteadas** (backend `24cb6ad`, docs `2f9e32a`). El encargo decía "stageadas sin commitear"; no es así, y no cambia nada de lo que sigue. `Routine_Asignation_User` ya tiene `date` y el único `uk_rau_routine_user_date`, y existe `Routine_Asign_Exercise_Finished` con FK en `RESTRICT`.

1. **El roadmap y la spec difieren en el alcance.** El roadmap (BE-11) mete `GET /routine/assigned/:userId` en esta tarea; la spec (§4.3 y §9) lo mueve a **BE-12**, porque trae el progreso de cada asignación. Manda la spec: **BE-11 son dos endpoints.** Consecuencia a anotar en el Status: hasta BE-12 el entrenador puede asignar y quitar, pero no tiene cómo listar las asignaciones de un alumno.
2. **`routine.module.ts` no tiene lo que el service va a necesitar.** `RoutineAsignExerciseFinished` ya está registrada (la usa `editCircuit`), pero faltan `RoutineAsignationUser` (sólo está en `planification.module.ts`) y **`User`** (para validar el destinatario). `User` ya se registra con `forFeature` en otros cinco módulos, así que se repite el patrón en vez de importar `UsersModule` (el usuario ya rechazó acoplar módulos).
3. **El proyecto nunca tradujo un error de Postgres a un código HTTP.** No hay un solo `23505` en el código. La spec pide `409` si la base rechaza por el único, así que esta tarea inaugura el patrón: `QueryFailedError` + `driverError.code` (+ `constraint` para el único, para no tapar otros errores con un 409 engañoso).
4. **`@IsDateString()` no sirve para `date`.** Es lo que usa `user_rm`, pero acepta también fecha con hora y zona (`2026-10-20T23:30:00-03:00`), y la spec trabaja con **días sin hora**. Además `0000-01-01` pasaría la forma y Postgres lo rechazaría con "out of range" (un 500). Hace falta un validador propio, que BE-12 reutiliza para `from` y `to`.
5. **Los ids llegan en cualquier caja** (el iOS manda `uuidString` en mayúscula). Postgres compara `uuid` sin importar la caja, pero la respuesta tiene que devolver los ids **como están en la base**. Por eso el alta guarda y devuelve los ids de las filas leídas (`routine.id`, `user.id`) y no los del body.
6. **`date` tiene que volver como `'YYYY-MM-DD'`.** La entidad lo tipa `string`; `pg` entrega una `Date` en medianoche local y TypeORM la reconvierte con los getters locales. BE-10 lo razonó pero no lo comprobó contra el driver real: esta tarea lo comprueba offline (Tarea 4).
7. **Comentario viejo y falso en `planification.controller.ts:33-36`** ("cuando se retomen van a vivir en routine/"). Se actualiza, porque es sobre estos mismos CU.
8. **El 403 de "cuenta deshabilitada"** no entra acá: ninguno de los dos endpoints devuelve 403 propio (el rol lo corta `@Auth`), y el script comprueba que el texto reservado no aparece en el service.

## 2. Decisiones menores (se pueden vetar)

| # | Decisión | Por qué |
|---|---|---|
| m1 | **Se chequea el duplicado antes de insertar *y* se traduce el `23505`.** Mismo `409` y mismo mensaje en los dos caminos | El chequeo previo da el camino normal sin ruido en el log; la traducción cubre las dos altas simultáneas (spec §4.1) |
| m2 | **Dos mensajes distintos para el `400` del destinatario:** "sólo puede asignarse a un alumno" y "la cuenta del alumno está cerrada" | La spec lo trata como un solo código; el mensaje separado le ahorra al coach adivinar cuál fue |
| m3 | **El `DELETE` traduce el `23503` (FK) a `409` con el mismo mensaje de "ya entrenó".** Es el respaldo de D4 cuando el alumno marca un ejercicio entre el chequeo y el borrado | Sin esto, esa carrera daría un 500 |
| m4 | **Los scripts usan `exists()`** de TypeORM (0.3.27 lo trae) para los dos chequeos | Una consulta liviana en vez de traer filas |
| m5 | **Dos rutinas *distintas* el mismo día se permiten:** el único es `(routine, user, date)`, no `(user, date)`. Queda escrito en la spec de E-19 | Es consecuencia directa de D2; no estaba dicho en palabras |
| m6 | **El validador del día es una función aparte, exportada** (`isCalendarDay`), además del decorador | Se prueba sin armar un DTO, y BE-12 lo reutiliza |
| m7 | **Archivos de DTO nuevos en `dtos/routine/`:** `assign_routine_to_user.dto.ts`, `routine_assign_user_response.dto.ts`, `is_calendar_day.decorator.ts` | Mismo patrón que `assign_routine_to_planification.dto.ts` |
| m8 | **Los métodos se llaman `assignRoutineToUser` y `removeRoutineFromUser`** | Los verbos de la ruta (`assign-user`) y del CU (quitar) |
| m9 | **El Status pasa a corte 2026-10-18** y E-19 y E-20 a ✅ | Es la fecha de hoy; los conteos suben de 57 a 59 |

## 3. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/dtos/routine/is_calendar_day.decorator.ts` | **Nuevo.** `isCalendarDay(value)` y el decorador `@IsCalendarDay()` |
| `power-app/src/dtos/routine/assign_routine_to_user.dto.ts` | **Nuevo.** Body de `POST /routine/assign-user` |
| `power-app/src/dtos/routine/routine_assign_user_response.dto.ts` | **Nuevo.** Forma de la respuesta (Swagger) del alta y de la baja |
| `power-app/src/routine/routine.module.ts` | `forFeature` suma `RoutineAsignationUser` y `User` |
| `power-app/src/routine/routine.service.ts` | Constructor suma 3 repositorios; sección nueva con los 2 métodos; helpers `buildRoutineAssignUserResponse` e `isDatabaseError`; 2 constantes de mensaje |
| `power-app/src/routine/routine.controller.ts` | Sección nueva con los 2 handlers y su Swagger; importa `Delete` |
| `power-app/src/planification/planification.controller.ts` | Sólo el comentario de las líneas 33-36 |
| `Status/estado-implementacion-backend.md` | Entrada nueva, conteos, cobertura por rol, detalle de E-19 y E-20, plan de trabajo |
| `Status/dashboard-estado-backend.html` | Lo mismo en el dashboard |

**No se tocan:** las entidades, `Db Creator/` (no cambia ninguna estructura), `planification.service.ts`, ningún otro DTO.

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**

| Archivo | Cambio |
|---|---|
| `Use Cases/entrenador/CU-E-19-asignar-rutina-a-alumno.md` | Reescrito (spec §7) |
| `Use Cases/entrenador/CU-E-20-eliminar-rutina-a-alumno.md` | Reescrito (spec §7) |
| `Doc/plans/2026-10-18-be-11-asignar-rutina-individual-plan.md` | Este plan |

## 4. Verificación: cómo se prueba sin levantar nada

Cuatro scripts en el scratchpad, todos sobre el código **compilado** (`power-app/dist`). Se escriben **antes** del código y se corren **en rojo** (Tarea 1), después en verde.

| Script | Qué prueba |
|---|---|
| `verify-dto.js` | El body con el `ValidationPipe` real (la misma config que `main.ts`) y el validador del día |
| `verify-rules.js` | Los dos métodos del service con repositorios falsos: códigos, mensajes, **orden de las validaciones**, el 409 por duplicado y por ya entrenada, las traducciones de error de la base, la forma exacta de las respuestas |
| `verify-typeorm.js` | Sin conectarse: que el único se llama `uk_rau_routine_user_date`, que el `INSERT` devuelve `id`/`created_at`/`updated_at`, que `date` se hidrata como string, y que la FK de la tabla de hechos es `RESTRICT` |
| `verify-controller.js` | Rutas, verbos y roles de los dos handlers; que el handler hace `await` y **no** devuelve el Response; el Swagger generado (respuestas y códigos de error); que `GET /routine/assigned/:userId` **no** existe todavía |

**Lo que no se puede verificar acá:** que el SQL corra contra un Postgres real, que `RETURNING` traiga lo esperado en vivo, que `pg` entregue la `Date` que se supone. Queda para BE-35 (runtime contra Render regenerado). Va en el Status como "no verificado".

---

## Tarea 0: Preflight

**Archivos:** ninguno.

- [ ] **Paso 1: Los dos repos están limpios y en el commit esperado**

```bash
git -C "D:/Power App/Backend/PowerApp-Backend" status --short
git -C "D:/Power App/Backend/PowerApp-Backend" log --oneline -1
git -C "D:/Power App/Docs/PowerApp-Docs" status --short
```

Esperado: sin salida de `status` en ninguno; el backend en `24cb6ad`. Si hay algo sin commitear de otra sesión, **no tocarlo** y registrar qué archivos son antes de seguir.

- [ ] **Paso 2: El esquema que el plan da por hecho está en `Db Creator`**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && grep -n "uk_rau_routine_user_date\|CREATE TABLE public.\"Routine_Asign_Exercise_Finished\"\|uk_raef_asign_exercise" 01_estructura.sql && grep -n -A14 'CREATE TABLE public."Routine_Asign_Exercise_Finished"' 01_estructura.sql | grep -c "ON DELETE RESTRICT"
```

Esperado: aparecen el único `uk_rau_routine_user_date` (línea 291), la tabla `Routine_Asign_Exercise_Finished` (358) y `uk_raef_asign_exercise` (369), y el último comando imprime `2` (las dos FK en `ON DELETE RESTRICT`). Si el nombre del único no coincide, **parar**: el service lo usa para distinguir el `23505`.

- [ ] **Paso 3: El build parte en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
```

Esperado: termina sin errores (código de salida 0) y deja `power-app/dist` actualizado.

---

## Tarea 1: Los scripts de verificación, en rojo

**Archivos (todos en el scratchpad, fuera de los repos):**
`C:\Users\caram\AppData\Local\Temp\claude\D--Power-App-Backend-PowerApp-Backend\c46f262f-0358-40cb-a6d9-a0418172f7d2\scratchpad\`

- [ ] **Paso 1: Crear `lib.js`**

```js
const path = require('path');

const ROOT = 'D:/Power App/Backend/PowerApp-Backend/power-app';

exports.ROOT = ROOT;
exports.dist = (p) => require(path.join(ROOT, 'dist', p));
exports.mod = (m) => require(path.join(ROOT, 'node_modules', m));

// Los decoradores de TypeORM/Nest leen metadata: tiene que estar cargada antes que nada
require(path.join(ROOT, 'node_modules', 'reflect-metadata'));

let passed = 0;
const failures = [];

exports.check = (name, ok, detail) => {
  if (ok) {
    passed++;
    console.log('  ok    ' + name);
  } else {
    failures.push(name);
    console.log('  FALLA ' + name + (detail !== undefined ? '  -> ' + detail : ''));
  }
};

// Corre un caso: si lanza (falta el modulo, el metodo...), cuenta como una falla y sigue
exports.run = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    failures.push(name);
    console.log('  FALLA ' + name + '  -> lanzó: ' + (e && e.message));
  }
};

exports.finish = () => {
  console.log(`\n${passed} ok, ${failures.length} fallas`);
  process.exit(failures.length ? 1 : 0);
};
```

- [ ] **Paso 2: Crear `verify-dto.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

const OK = {
  routine_id: '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01',
  user_id: '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f',
  date: '2026-10-20',
};

// La misma configuracion que main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

(async () => {
  let Dto;
  let isCalendarDay;

  await run('carga el DTO y el validador', async () => {
    ({ AssignRoutineToUserDto: Dto } = dist('dtos/routine/assign_routine_to_user.dto'));
    ({ isCalendarDay } = dist('dtos/routine/is_calendar_day.decorator'));
    check('exporta AssignRoutineToUserDto', typeof Dto === 'function');
    check('exporta isCalendarDay', typeof isCalendarDay === 'function');
  });

  if (!Dto || !isCalendarDay) return finish();

  console.log('\n-- isCalendarDay');
  const days = {
    '2026-10-20': true, '2028-02-29': true, '2000-02-29': true, '0001-01-01': true,
    '0099-01-01': true, '9999-12-31': true,
    '2026-02-30': false, '2027-02-29': false, '2100-02-29': false, '2026-04-31': false,
    '2026-13-01': false, '2026-00-10': false, '2026-10-00': false, '2026-10-32': false,
    '0000-01-01': false, '2026-4-5': false, '20-10-2026': false, '2026/10/20': false,
    ' 2026-10-20': false, '2026-10-20 ': false, '2026-10-20T10:00:00Z': false, '': false,
  };
  for (const [value, expected] of Object.entries(days)) {
    check(`isCalendarDay(${JSON.stringify(value)}) = ${expected}`, isCalendarDay(value) === expected);
  }
  check('isCalendarDay(20261020) = false (no es string)', isCalendarDay(20261020) === false);
  check('isCalendarDay(null) = false', isCalendarDay(null) === false);
  check('isCalendarDay(undefined) = false', isCalendarDay(undefined) === false);

  console.log('\n-- body con el ValidationPipe real');
  const validate = (body) => pipe.transform(body, { type: 'body', metatype: Dto });

  const accepts = (name, body) => run(name, async () => {
    const out = await validate({ ...body });
    check(name, out instanceof Dto && out.date === body.date, JSON.stringify(out));
  });

  const rejects = (name, body, text) => run(name, async () => {
    try {
      await validate(body);
      check(name, false, 'no lo rechazó');
    } catch (e) {
      const status = e.getStatus ? e.getStatus() : undefined;
      const response = e.getResponse ? e.getResponse() : { message: e.message };
      const messages = [].concat(response.message).join(' | ');
      check(name, status === 400, 'estado ' + status);
      if (text) check(name + ' (mensaje)', messages.includes(text), messages);
    }
  });

  await accepts('body válido', OK);
  await accepts('ids en mayúscula', {
    ...OK, routine_id: OK.routine_id.toUpperCase(), user_id: OK.user_id.toUpperCase(),
  });
  await accepts('fecha pasada', { ...OK, date: '2020-01-01' });
  await accepts('29 de febrero bisiesto', { ...OK, date: '2028-02-29' });

  await rejects('sin date', { routine_id: OK.routine_id, user_id: OK.user_id }, 'YYYY-MM-DD');
  await rejects('sin routine_id', { user_id: OK.user_id, date: OK.date });
  await rejects('sin user_id', { routine_id: OK.routine_id, date: OK.date });
  await rejects('routine_id no es UUID', { ...OK, routine_id: 'abc' }, 'rutina');
  await rejects('user_id no es UUID', { ...OK, user_id: 'abc' }, 'usuario');
  await rejects('date con hora y zona', { ...OK, date: '2026-10-20T23:30:00-03:00' }, 'YYYY-MM-DD');
  await rejects('date con hora UTC', { ...OK, date: '2026-10-20T10:00:00Z' }, 'YYYY-MM-DD');
  await rejects('date inexistente (30 de febrero)', { ...OK, date: '2026-02-30' }, 'YYYY-MM-DD');
  await rejects('date mes 13', { ...OK, date: '2026-13-01' }, 'YYYY-MM-DD');
  await rejects('date año 0000', { ...OK, date: '0000-01-01' }, 'YYYY-MM-DD');
  await rejects('date en otro formato', { ...OK, date: '20-10-2026' }, 'YYYY-MM-DD');
  await rejects('date numérico', { ...OK, date: 20261020 }, 'YYYY-MM-DD');
  await rejects('date null', { ...OK, date: null }, 'YYYY-MM-DD');
  await rejects('date vacío', { ...OK, date: '' }, 'YYYY-MM-DD');
  await rejects('campo de más (forbidNonWhitelisted)', { ...OK, active: true });

  finish();
})();
```

- [ ] **Paso 3: Crear `verify-rules.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { RoutineService } = dist('routine/routine.service');
const { UserRole } = dist('entities/user.entity');
const { QueryFailedError } = mod('typeorm');

const NOW = new Date('2026-10-18T12:00:00Z');
const ROUTINE_ID = '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01';
const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const ASSIGN_ID = 'c1c1c1c1-aaaa-4bbb-8ccc-dddddddddddd';
const DAY = '2026-10-20';

const MSG = {
  routineNotFound: 'Rutina no encontrada',
  userNotFound: 'Usuario no encontrado',
  routineInactive: "La rutina 'Día A' está dada de baja y no puede asignarse.",
  notStudent: 'La rutina sólo puede asignarse a un alumno.',
  closedAccount: 'La cuenta del alumno está cerrada: no se le puede asignar una rutina.',
  duplicate: 'El alumno ya tiene esa rutina asignada ese día.',
  assignment404: 'Asignación no encontrada',
  trained: 'El alumno ya entrenó esta rutina: no se puede quitar.',
  assign500: 'Error al asignar la rutina.',
  remove500: 'Error al quitar la rutina del alumno.',
};

const routineOk = { id: ROUTINE_ID, name: 'Día A', active: true };
const studentOk = { id: USER_ID, role: UserRole.user, active: true };
const assignmentRow = {
  id: ASSIGN_ID, routine_id: ROUTINE_ID, user_id: USER_ID, date: DAY,
  created_at: NOW, updated_at: NOW,
  routine: { id: ROUTINE_ID, name: 'Día A', active: true, coach_note: 'no tiene que salir' },
};
const BODY = { routine_id: ROUTINE_ID, user_id: USER_ID, date: DAY };
const RESPONSE_KEYS = ['id', 'routine_id', 'user_id', 'date', 'created_at', 'updated_at', 'routine'];

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

function dbError(code, constraint) {
  return new QueryFailedError('SQL', [], Object.assign(new Error('db'), { code, constraint }));
}

function build(cfg = {}) {
  const calls = [];
  const routineRepository = {
    findOne: async (o) => {
      calls.push({ op: 'routine.findOne', arg: o.where });
      if (cfg.routineError) throw cfg.routineError;
      return cfg.routine ?? null;
    },
  };
  const userRepository = {
    findOne: async (o) => { calls.push({ op: 'user.findOne', arg: o.where }); return cfg.user ?? null; },
  };
  const assignmentRepository = {
    exists: async (o) => { calls.push({ op: 'assignment.exists', arg: o.where }); return !!cfg.duplicate; },
    create: (d) => ({ ...d }),
    save: async (e) => {
      calls.push({ op: 'assignment.save', arg: { ...e } });
      if (cfg.saveError) throw cfg.saveError;
      return { id: ASSIGN_ID, ...e, created_at: NOW, updated_at: NOW };
    },
    findOne: async (o) => { calls.push({ op: 'assignment.findOne', arg: o.where }); return cfg.assignment ?? null; },
    delete: async (c) => { calls.push({ op: 'assignment.delete', arg: c }); if (cfg.deleteError) throw cfg.deleteError; },
  };
  const finishedRepository = {
    exists: async (o) => { calls.push({ op: 'finished.exists', arg: o.where }); return !!cfg.trained; },
  };
  // Mismo orden que el constructor: los 3 de antes y despues los 3 nuevos
  const service = new RoutineService({}, routineRepository, {}, userRepository, assignmentRepository, finishedRepository);
  return { service, calls };
}

async function silencing(fn) {
  const original = console.error;
  let count = 0;
  console.error = () => { count++; };
  try { await fn(); } finally { console.error = original; }
  return count;
}

async function assign(cfg, body = BODY) {
  const { service, calls } = build(cfg);
  const res = makeRes();
  await service.assignRoutineToUser(body, res);
  return { res, calls, ops: calls.map(c => c.op) };
}

async function remove(cfg, id = ASSIGN_ID) {
  const { service, calls } = build(cfg);
  const res = makeRes();
  await service.removeRoutineFromUser(id, res);
  return { res, calls, ops: calls.map(c => c.op) };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  console.log('-- E-19 · asignar');

  await run('rutina inexistente → 404 y no mira al usuario', async () => {
    const r = await assign({ routine: null, user: studentOk });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.routineNotFound }), JSON.stringify(r.res.body));
    check('sólo consultó la rutina', same(r.ops, ['routine.findOne']), r.ops.join(','));
  });

  await run('rutina de baja → 400 con el nombre, sin consultar al usuario', async () => {
    const r = await assign({ routine: { ...routineOk, active: false }, user: studentOk });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.routineInactive }), JSON.stringify(r.res.body));
    check('no consultó al usuario ni guardó', same(r.ops, ['routine.findOne']), r.ops.join(','));
  });

  await run('orden: rutina y usuario inexistentes → gana el 404 de la rutina', async () => {
    const r = await assign({ routine: null, user: null });
    check('mensaje de la rutina', r.res.body && r.res.body.error === MSG.routineNotFound, JSON.stringify(r.res.body));
  });

  await run('orden: rutina de baja y usuario inexistente → gana el 400 de la rutina', async () => {
    const r = await assign({ routine: { ...routineOk, active: false }, user: null });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
  });

  await run('usuario inexistente → 404 sin chequear duplicado ni guardar', async () => {
    const r = await assign({ routine: routineOk, user: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.userNotFound }), JSON.stringify(r.res.body));
    check('ops', same(r.ops, ['routine.findOne', 'user.findOne']), r.ops.join(','));
  });

  for (const role of [UserRole.coach, UserRole.admin]) {
    await run(`destinatario con rol ${role} → 400`, async () => {
      const r = await assign({ routine: routineOk, user: { ...studentOk, role } });
      check('estado 400', r.res.statusCode === 400, r.res.statusCode);
      check('mensaje', same(r.res.body, { error: MSG.notStudent }), JSON.stringify(r.res.body));
      check('no chequeó duplicado ni guardó', !r.ops.includes('assignment.exists') && !r.ops.includes('assignment.save'));
    });
  }

  await run('alumno con la cuenta cerrada → 400', async () => {
    const r = await assign({ routine: routineOk, user: { ...studentOk, active: false } });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.closedAccount }), JSON.stringify(r.res.body));
    check('no guardó', !r.ops.includes('assignment.save'));
  });

  await run('ya tiene esa rutina ese día → 409 y no guarda', async () => {
    const r = await assign({ routine: routineOk, user: studentOk, duplicate: true });
    check('estado 409', r.res.statusCode === 409, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.duplicate }), JSON.stringify(r.res.body));
    check('no guardó', !r.ops.includes('assignment.save'));
    const exists = r.calls.find(c => c.op === 'assignment.exists');
    check('el duplicado se busca por rutina + alumno + día',
      exists && exists.arg.routine_id === ROUTINE_ID && exists.arg.user_id === USER_ID && exists.arg.date === DAY,
      JSON.stringify(exists && exists.arg));
  });

  await run('alta correcta → 201 con la forma exacta', async () => {
    const r = await assign({ routine: routineOk, user: studentOk });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('orden de las consultas',
      same(r.ops, ['routine.findOne', 'user.findOne', 'assignment.exists', 'assignment.save']), r.ops.join(','));
    check('claves del cuerpo', same(Object.keys(r.res.body), RESPONSE_KEYS), Object.keys(r.res.body).join(','));
    check('routine sólo trae id y name', same(Object.keys(r.res.body.routine), ['id', 'name']),
      Object.keys(r.res.body.routine).join(','));
    check('valores', r.res.body.id === ASSIGN_ID && r.res.body.date === DAY && r.res.body.routine.name === 'Día A');
    check('date sigue siendo el string del día', typeof r.res.body.date === 'string');
    const saved = r.calls.find(c => c.op === 'assignment.save').arg;
    check('guardó rutina, alumno y día', saved.routine_id === ROUTINE_ID && saved.user_id === USER_ID && saved.date === DAY,
      JSON.stringify(saved));
  });

  await run('ids en mayúscula en el body → guarda y devuelve los de las filas (minúscula)', async () => {
    const upper = { ...BODY, routine_id: ROUTINE_ID.toUpperCase(), user_id: USER_ID.toUpperCase() };
    const r = await assign({ routine: routineOk, user: studentOk }, upper);
    const saved = r.calls.find(c => c.op === 'assignment.save').arg;
    check('guardó los ids de las filas', saved.routine_id === ROUTINE_ID && saved.user_id === USER_ID, JSON.stringify(saved));
    check('respondió los ids de las filas', r.res.body.routine_id === ROUTINE_ID && r.res.body.user_id === USER_ID);
  });

  await run('el único salta en el INSERT (dos altas simultáneas) → 409 con el mismo mensaje', async () => {
    const r = await assign({ routine: routineOk, user: studentOk, saveError: dbError('23505', 'uk_rau_routine_user_date') });
    check('estado 409', r.res.statusCode === 409, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.duplicate }), JSON.stringify(r.res.body));
  });

  await run('un 23505 de OTRO único no se disfraza de duplicado → 500', async () => {
    let r;
    const logged = await silencing(async () => {
      r = await assign({ routine: routineOk, user: studentOk, saveError: dbError('23505', 'otro_unico') });
    });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('loguea el error', logged === 1, logged);
  });

  await run('error inesperado al guardar → 500 con mensaje genérico', async () => {
    let r;
    const logged = await silencing(async () => {
      r = await assign({ routine: routineOk, user: studentOk, saveError: new Error('se cayó') });
    });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.assign500 }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  await run('error al buscar la rutina → 500', async () => {
    let r;
    await silencing(async () => {
      r = await assign({ routineError: new Error('sin conexión') });
    });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
  });

  console.log('\n-- E-20 · quitar');

  await run('asignación inexistente → 404 sin mirar la ejecución ni borrar', async () => {
    const r = await remove({ assignment: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.assignment404 }), JSON.stringify(r.res.body));
    check('ops', same(r.ops, ['assignment.findOne']), r.ops.join(','));
  });

  await run('ya entrenada → 409 con el texto de la spec y no borra', async () => {
    const r = await remove({ assignment: assignmentRow, trained: true });
    check('estado 409', r.res.statusCode === 409, r.res.statusCode);
    check('mensaje exacto', same(r.res.body, { error: MSG.trained }), JSON.stringify(r.res.body));
    check('no borró', !r.ops.includes('assignment.delete'));
    const exists = r.calls.find(c => c.op === 'finished.exists');
    check('busca la ejecución por la asignación', exists && exists.arg.user_routine_asign_id === ASSIGN_ID,
      JSON.stringify(exists && exists.arg));
  });

  await run('sin ejecución → borra y responde 200 con la asignación borrada', async () => {
    const r = await remove({ assignment: assignmentRow, trained: false });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('orden', same(r.ops, ['assignment.findOne', 'finished.exists', 'assignment.delete']), r.ops.join(','));
    check('claves del cuerpo (misma forma que el alta)', same(Object.keys(r.res.body), RESPONSE_KEYS), Object.keys(r.res.body).join(','));
    check('routine sólo trae id y name', same(Object.keys(r.res.body.routine), ['id', 'name']),
      Object.keys(r.res.body.routine).join(','));
    check('valores', r.res.body.id === ASSIGN_ID && r.res.body.date === DAY && r.res.body.user_id === USER_ID);
    const del = r.calls.find(c => c.op === 'assignment.delete').arg;
    check('borra por id', del && del.id === ASSIGN_ID, JSON.stringify(del));
  });

  await run('el alumno marcó entre el chequeo y el borrado (FK RESTRICT) → 409 con el mismo texto', async () => {
    const r = await remove({ assignment: assignmentRow, trained: false, deleteError: dbError('23503') });
    check('estado 409', r.res.statusCode === 409, r.res.statusCode);
    check('mensaje exacto', same(r.res.body, { error: MSG.trained }), JSON.stringify(r.res.body));
  });

  await run('error inesperado al borrar → 500 con mensaje genérico', async () => {
    let r;
    const logged = await silencing(async () => {
      r = await remove({ assignment: assignmentRow, trained: false, deleteError: new Error('se cayó') });
    });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.remove500 }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  await run('id en mayúscula → se pasa tal cual a la base y la respuesta trae el de la fila', async () => {
    const r = await remove({ assignment: assignmentRow, trained: false }, ASSIGN_ID.toUpperCase());
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('la respuesta trae el id de la fila', r.res.body.id === ASSIGN_ID);
  });

  console.log('\n-- reglas transversales');

  await run('el service no usa el texto reservado del 403 que cierra la sesión', async () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(path.join(require('./lib').ROOT, 'dist/routine/routine.service.js'), 'utf8');
    check('no aparece "La cuenta está deshabilitada."', !source.includes('La cuenta está deshabilitada.'));
  });

  finish();
})();
```

- [ ] **Paso 4: Crear `verify-typeorm.js`**

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, getMetadataArgsStorage } = mod('typeorm');

(async () => {
  // Registrar las entidades compiladas y armar el DataSource SIN conectarse
  const dir = path.join(ROOT, 'dist/entities');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    require(path.join(dir, file));
  }
  const entities = getMetadataArgsStorage().tables.map(t => t.target).filter(t => typeof t === 'function');
  const ds = new DataSource({ type: 'postgres', entities });
  await ds.buildMetadatas();

  const { RoutineAsignationUser } = dist('entities/routine_asignation_user.entity');
  const { RoutineAsignExerciseFinished } = dist('entities/routine_asign_exercise_finished.entity');
  const meta = ds.getMetadata(RoutineAsignationUser);

  await run('el único se llama uk_rau_routine_user_date y cubre rutina + alumno + día', async () => {
    const unique = meta.uniques.find(u => u.name === 'uk_rau_routine_user_date');
    check('existe', !!unique);
    const cols = unique ? unique.columns.map(c => c.propertyName).sort().join(',') : '';
    check('columnas', cols === 'date,routine_id,user_id', cols);
  });

  await run('el INSERT devuelve id, created_at y updated_at', async () => {
    const returning = meta.getInsertionReturningColumns
      ? meta.getInsertionReturningColumns()
      : meta.columns.filter(c => c.isGenerated || c.default !== undefined);
    const names = returning.map(c => c.propertyName);
    for (const name of ['id', 'created_at', 'updated_at']) check(`devuelve ${name}`, names.includes(name), names.join(','));

    const sql = ds.createQueryBuilder().insert().into(RoutineAsignationUser)
      .values({ routine_id: 'r', user_id: 'u', date: '2026-10-20' }).getQuery();
    console.log('        ' + sql);
    check('INSERT en la tabla correcta', sql.includes('INSERT INTO "Routine_Asignation_User"'));
    check('tiene RETURNING', sql.includes('RETURNING'));
  });

  await run('date se hidrata y se persiste como string de día', async () => {
    const col = meta.findColumnWithPropertyName('date');
    check('la columna es de tipo date', col && col.type === 'date', col && col.type);

    // Lo que entrega pg para un DATE: una Date en medianoche LOCAL
    const pg = mod('pg');
    const parsed = pg.types.getTypeParser(1082)('2026-10-20');
    check('pg entrega una Date en medianoche local',
      parsed instanceof Date && parsed.getFullYear() === 2026 && parsed.getMonth() === 9 && parsed.getDate() === 20 && parsed.getHours() === 0);
    check('TypeORM la hidrata como "2026-10-20"', ds.driver.prepareHydratedValue(parsed, col) === '2026-10-20',
      String(ds.driver.prepareHydratedValue(parsed, col)));
    check('si llega ya como string, queda igual', ds.driver.prepareHydratedValue('2026-10-20', col) === '2026-10-20');
    check('el string del día se persiste igual', ds.driver.preparePersistentValue('2026-10-20', col) === '2026-10-20',
      String(ds.driver.preparePersistentValue('2026-10-20', col)));
  });

  await run('el repositorio tiene exists()', async () => {
    check('exists es función', typeof ds.getRepository(RoutineAsignationUser).exists === 'function');
  });

  await run('la FK de la tabla de hechos hacia la asignación es RESTRICT', async () => {
    const fk = ds.getMetadata(RoutineAsignExerciseFinished).foreignKeys
      .find(f => f.columnNames.includes('user_routine_asign_id'));
    check('existe la FK', !!fk);
    check('onDelete = RESTRICT', fk && fk.onDelete === 'RESTRICT', fk && fk.onDelete);
  });

  finish();
})();
```

- [ ] **Paso 5: Crear `verify-controller.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { SwaggerModule, DocumentBuilder } = mod('@nestjs/swagger');
const { RoutineController } = dist('routine/routine.controller');
const { RoutineService } = dist('routine/routine.service');
const { JwtAuthGuard } = dist('authentication/guards/jwt-auth.guard');
const { RolesGuard } = dist('authentication/guards/roles.guard');
const { OwnerGuard } = dist('authentication/guards/owner.guard');
const { UserRole } = dist('entities/user.entity');

// RequestMethod de Nest: POST = 1, DELETE = 3
const POST = 1;
const DELETE = 3;
const allow = { canActivate: () => true };

(async () => {
  // Si el handler hiciera `return this.service...`, devolveria lo que devuelve el service
  // (el Response) y el serializer tira el proceso: tiene que esperar y NO devolver nada
  const state = { assignDone: false, removeDone: false };
  const stub = {
    assignRoutineToUser: async () => { await new Promise(r => setTimeout(r, 20)); state.assignDone = true; return 'RESPONSE'; },
    removeRoutineFromUser: async () => { await new Promise(r => setTimeout(r, 20)); state.removeDone = true; return 'RESPONSE'; },
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
  const proto = RoutineController.prototype;

  console.log('-- rutas, verbos y roles');
  const handlers = [
    ['assignRoutineToUser', POST, 'assign-user'],
    ['removeRoutineFromUser', DELETE, 'assign-user/:id'],
  ];
  for (const [name, method, route] of handlers) {
    await run(`${name}: ruta, verbo y roles`, async () => {
      check(`${name} existe`, typeof proto[name] === 'function');
      check(`${name} → ${route}`, Reflect.getMetadata('path', proto[name]) === route, Reflect.getMetadata('path', proto[name]));
      check(`${name} → verbo`, Reflect.getMetadata('method', proto[name]) === method, Reflect.getMetadata('method', proto[name]));
      const roles = Reflect.getMetadata('roles', proto[name]);
      check(`${name} → sólo coach y admin`,
        Array.isArray(roles) && roles.length === 2 && roles.includes(UserRole.coach) && roles.includes(UserRole.admin),
        JSON.stringify(roles));
    });
  }

  console.log('\n-- await sin return');
  await run('assignRoutineToUser espera al service y no devuelve el Response', async () => {
    const ret = await controller.assignRoutineToUser({}, {});
    check('esperó al service', state.assignDone === true);
    check('devuelve undefined', ret === undefined, String(ret));
  });
  await run('removeRoutineFromUser espera al service y no devuelve el Response', async () => {
    const ret = await controller.removeRoutineFromUser({ id: 'x' }, {});
    check('esperó al service', state.removeDone === true);
    check('devuelve undefined', ret === undefined, String(ret));
  });

  console.log('\n-- Swagger');
  await run('el documento generado declara respuesta y errores', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const post = doc.paths['/routine/assign-user'] && doc.paths['/routine/assign-user'].post;
    const del = doc.paths['/routine/assign-user/{id}'] && doc.paths['/routine/assign-user/{id}'].delete;

    check('POST /routine/assign-user está en el documento', !!post);
    check('DELETE /routine/assign-user/{id} está en el documento', !!del);

    if (post) {
      for (const code of ['201', '400', '404', '409']) check(`POST declara ${code}`, !!post.responses[code], Object.keys(post.responses).join(','));
      const ref = post.requestBody && post.requestBody.content['application/json'].schema.$ref;
      check('el body es AssignRoutineToUserDto', ref && ref.endsWith('/AssignRoutineToUserDto'), ref);
      check('el 201 es RoutineAssignUserResponseDto',
        (post.responses['201'].content['application/json'].schema.$ref || '').endsWith('/RoutineAssignUserResponseDto'));
      check('POST pide token', Array.isArray(post.security) && post.security.some(s => 'bearer' in s));
    }
    if (del) {
      for (const code of ['200', '400', '404', '409']) check(`DELETE declara ${code}`, !!del.responses[code], Object.keys(del.responses).join(','));
      check('el 200 es RoutineAssignUserResponseDto',
        (del.responses['200'].content['application/json'].schema.$ref || '').endsWith('/RoutineAssignUserResponseDto'));
      check('DELETE pide token', Array.isArray(del.security) && del.security.some(s => 'bearer' in s));
    }

    const body = doc.components.schemas.AssignRoutineToUserDto;
    check('el body exige routine_id, user_id y date',
      body && ['routine_id', 'user_id', 'date'].every(k => (body.required || []).includes(k)), JSON.stringify(body && body.required));

    const response = doc.components.schemas.RoutineAssignUserResponseDto;
    const keys = response ? Object.keys(response.properties) : [];
    check('la respuesta documenta sus 7 campos',
      ['id', 'routine_id', 'user_id', 'date', 'created_at', 'updated_at', 'routine'].every(k => keys.includes(k)), keys.join(','));
    const nested = doc.components.schemas.RoutineAssignUserRoutineDto;
    check('routine documenta id y name', nested && ['id', 'name'].every(k => k in nested.properties));

    check('GET /routine/assigned/{userId} NO existe todavía (es BE-12)', !doc.paths['/routine/assigned/{userId}']);
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 6: Correr los cuatro scripts en rojo**

```bash
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-dto verify-rules verify-typeorm verify-controller; do echo "=== $f"; node "$S/$f.js" 2>&1 | tail -25; done
```

Esperado: **todos fallan**. `verify-dto` y `verify-rules` por `Cannot find module`/`is not a function` (los DTOs y los métodos no existen); `verify-controller` por lo mismo; `verify-typeorm` **puede pasar casi entero** (las entidades ya están), salvo que algo del entorno falle: si pasa, es esperado, porque mide el esquema de BE-10 y no el código nuevo. Registrar cuántas fallas dio cada uno (se anotan en el Status como "antes en rojo").

> Si `verify-typeorm.js` o `verify-controller.js` fallan por una causa del **entorno de la prueba** (por ejemplo, `buildMetadatas` que se queja de una entidad no cargada, o un guard que pide una dependencia que el `overrideGuard` no cubre), se corrige **el script** en este paso hasta que dé la falla que corresponde (o pase, en el caso de `verify-typeorm`). No se sigue con un script que falla por una razón equivocada.

---

## Tarea 2: El validador del día y los DTOs

**Archivos:**
- Crear: `power-app/src/dtos/routine/is_calendar_day.decorator.ts`
- Crear: `power-app/src/dtos/routine/assign_routine_to_user.dto.ts`
- Crear: `power-app/src/dtos/routine/routine_assign_user_response.dto.ts`

- [ ] **Paso 1: Crear `is_calendar_day.decorator.ts`**

```ts
import { registerDecorator, ValidationOptions } from 'class-validator';

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Un dia sin hora ("2026-10-20"), que ademas exista en el calendario. @IsDateString() no
// alcanza: acepta tambien fecha con hora y zona ("2026-10-20T23:30:00-03:00"), y las fechas
// de la rutina individual son dias, no instantes. El ano 0000 se rechaza porque Postgres lo
// declara fuera de rango y saldria un 500
export function isCalendarDay(value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    const match = DAY_PATTERN.exec(value);

    if (!match) {
        return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (year < 1) {
        return false;
    }

    // setUTCFullYear y no Date.UTC: el constructor trata los anos 0..99 como 1900..1999.
    // Se arma el dia y se compara: si el calendario lo corrio (30 de febrero → 2 de marzo),
    // el dia no existe
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);

    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

export function IsCalendarDay(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'isCalendarDay',
            target: object.constructor,
            propertyName,
            options: {
                message: 'La fecha debe ser un día válido en formato YYYY-MM-DD (por ejemplo, 2026-10-20)',
                ...validationOptions,
            },
            validator: {
                validate: (value: unknown) => isCalendarDay(value),
            },
        });
    };
}
```

- [ ] **Paso 2: Crear `assign_routine_to_user.dto.ts`**

```ts
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCalendarDay } from './is_calendar_day.decorator';

export class AssignRoutineToUserDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Rutina a asignar. Tiene que estar activa' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de rutina debe ser un UUID válido' })
    routine_id!: string;

    @ApiProperty({ example: 'uuid-1234', description: 'Alumno destinatario. Tiene que ser un usuario con rol user y la cuenta abierta' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de usuario debe ser un UUID válido' })
    user_id!: string;

    @ApiProperty({ example: '2026-10-20', description: 'Día en que el alumno hace la rutina, en formato YYYY-MM-DD (sin hora). Puede ser pasado o futuro: el servidor no calcula "hoy". Un alumno no puede tener la misma rutina dos veces el mismo día (409)' })
    @IsNotEmpty()
    @IsCalendarDay()
    date!: string;
}
```

- [ ] **Paso 3: Crear `routine_assign_user_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class RoutineAssignUserRoutineDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 'Dia A - Piernas' })
    name!: string;
}

// Lo que devuelven POST /routine/assign-user (la asignacion creada) y
// DELETE /routine/assign-user/:id (la asignacion borrada): misma forma en los dos
export class RoutineAssignUserResponseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la Routine_Asignation_User' })
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    routine_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    user_id!: string;

    @ApiProperty({ example: '2026-10-20', description: 'Día en que el alumno hace la rutina (YYYY-MM-DD, sin hora)' })
    date!: string;

    @ApiProperty()
    created_at!: Date;

    @ApiProperty()
    updated_at!: Date;

    @ApiProperty({ type: RoutineAssignUserRoutineDto })
    routine!: RoutineAssignUserRoutineDto;
}
```

- [ ] **Paso 4: Compilar y correr `verify-dto.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-dto.js"
```

Esperado: build en verde; `verify-dto.js` termina con `N ok, 0 fallas` (N ≈ 60). Si un caso de `isCalendarDay` falla, corregir el validador (no el caso): los valores esperados están razonados en el script.

---

## Tarea 3: El módulo y el service

**Archivos:**
- Modificar: `power-app/src/routine/routine.module.ts`
- Modificar: `power-app/src/routine/routine.service.ts`

- [ ] **Paso 1: Registrar las entidades en `routine.module.ts`**

Imports nuevos (junto a los otros de entidades):

```ts
import { RoutineAsignationUser } from '../entities/routine_asignation_user.entity';
import { User } from '../entities/user.entity';
```

Y el `forFeature` queda:

```ts
  imports: [TypeOrmModule.forFeature([
    Routine,
    Circuit,
    RoutineCircuit,
    RoutineExercise,
    ExerciseSet,
    RoutineExerciseFinished,
    RoutineAsignExerciseFinished,
    RoutineAsignationUser,
    User,
  ]), AuthModule],
```

- [ ] **Paso 2: Imports, constantes y constructor del service**

En `routine.service.ts`, imports. `Repository, DataSource, In, SelectQueryBuilder` pasan a incluir `QueryFailedError`:

```ts
import { Repository, DataSource, In, SelectQueryBuilder, QueryFailedError } from 'typeorm';
```

y se suman, junto a los otros imports de entidades y DTOs:

```ts
import { RoutineAsignationUser } from '../entities/routine_asignation_user.entity';
import { User, UserRole } from '../entities/user.entity';
import { AssignRoutineToUserDto } from '../dtos/routine/assign_routine_to_user.dto';
```

Entre el último `import` y `@Injectable()`, las dos constantes de mensaje (el patrón de `exercise.service.ts`):

```ts
// Los dos 409 de la rutina individual. El de "ya entreno" sale por dos caminos (el chequeo
// previo y la FK RESTRICT de la base), y el de duplicado tambien (chequeo previo y unico)
const ASSIGN_DUPLICATE_ERROR = 'El alumno ya tiene esa rutina asignada ese día.';
const REMOVE_TRAINED_ERROR = 'El alumno ya entrenó esta rutina: no se puede quitar.';
```

El constructor suma los tres repositorios **al final**, para no mover los parámetros de siempre:

```ts
    constructor(
        @InjectRepository(Circuit)
        private circuitRepository: Repository<Circuit>,
        @InjectRepository(Routine)
        private routineRepository: Repository<Routine>,
        @InjectDataSource()
        private dataSource: DataSource,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(RoutineAsignationUser)
        private routineAsignationUserRepository: Repository<RoutineAsignationUser>,
        @InjectRepository(RoutineAsignExerciseFinished)
        private routineAsignExerciseFinishedRepository: Repository<RoutineAsignExerciseFinished>,
    ) {
    }
```

- [ ] **Paso 3: Los dos métodos, entre `setCircuitActive` y `// ===== HELPERS DE RUTINA =====`**

```ts
    // ===================== ASIGNACION INDIVIDUAL A UN ALUMNO (CU-E-19, CU-E-20) =====================

    async assignRoutineToUser(
        assignRoutineToUserDto: AssignRoutineToUserDto,
        res: Response
    ) {
        try {
            // El orden de las validaciones es parte del contrato (spec §4.1): primero la
            // rutina, despues el destinatario, al final el duplicado. Es una sola escritura,
            // asi que no hace falta transaccion: las carreras las cierra el unico de la base
            const routine = await this.routineRepository.findOne({
                where: { id: assignRoutineToUserDto.routine_id },
                select: { id: true, name: true, active: true },
            });

            if (!routine) {
                return res.status(404).send({ error: 'Rutina no encontrada' });
            }

            // Una rutina de baja no puede asignarse de nuevo (mismo criterio que armar una
            // rutina con un circuito de baja). Lo ya asignado antes sigue vigente
            if (!routine.active) {
                return res.status(400).send({
                    error: `La rutina '${routine.name}' está dada de baja y no puede asignarse.`
                });
            }

            const user = await this.userRepository.findOne({
                where: { id: assignRoutineToUserDto.user_id },
                select: { id: true, role: true, active: true },
            });

            if (!user) {
                return res.status(404).send({ error: 'Usuario no encontrado' });
            }

            if (user.role !== UserRole.user) {
                return res.status(400).send({ error: 'La rutina sólo puede asignarse a un alumno.' });
            }

            if (!user.active) {
                return res.status(400).send({
                    error: 'La cuenta del alumno está cerrada: no se le puede asignar una rutina.'
                });
            }

            // Los ids de la consulta salen de las filas leidas y no del body: el iOS manda
            // los UUID en mayuscula, y la respuesta tiene que devolverlos como estan en la base
            const alreadyAssigned = await this.routineAsignationUserRepository.exists({
                where: { routine_id: routine.id, user_id: user.id, date: assignRoutineToUserDto.date },
            });

            if (alreadyAssigned) {
                return res.status(409).send({ error: ASSIGN_DUPLICATE_ERROR });
            }

            const assignment = await this.routineAsignationUserRepository.save(
                this.routineAsignationUserRepository.create({
                    routine_id: routine.id,
                    user_id: user.id,
                    date: assignRoutineToUserDto.date,
                })
            );

            return res.status(201).send(this.buildRoutineAssignUserResponse(assignment, routine));
        } catch (error) {
            // Dos altas simultaneas pasan las dos el chequeo previo y la segunda choca con el
            // unico. Se mira el nombre del unico para no disfrazar de duplicado otro error
            if (this.isDatabaseError(error, '23505', 'uk_rau_routine_user_date')) {
                return res.status(409).send({ error: ASSIGN_DUPLICATE_ERROR });
            }

            console.error(error);
            res.status(500).send({ error: 'Error al asignar la rutina.' });
        }
    }

    async removeRoutineFromUser(
        idAssignment: string,
        res: Response
    ) {
        try {
            const assignment = await this.routineAsignationUserRepository.findOne({
                where: { id: idAssignment },
                relations: { routine: true },
            });

            if (!assignment) {
                return res.status(404).send({ error: 'Asignación no encontrada' });
            }

            // D4: una asignacion ya entrenada no se borra, para no destruir el historial del
            // alumno. Entrenada = tiene al menos un ejercicio marcado como hecho
            const trained = await this.routineAsignExerciseFinishedRepository.exists({
                where: { user_routine_asign_id: assignment.id },
            });

            if (trained) {
                return res.status(409).send({ error: REMOVE_TRAINED_ERROR });
            }

            // Borrado fisico (spec de E-20). delete() no toca la entidad, asi que la respuesta
            // se arma con lo leido
            await this.routineAsignationUserRepository.delete({ id: assignment.id });

            return res.status(200).send(this.buildRoutineAssignUserResponse(assignment, assignment.routine));
        } catch (error) {
            // Si el alumno marco un ejercicio entre el chequeo y el borrado, el RESTRICT de la
            // base frena el DELETE (23503): es el mismo caso de "ya entreno"
            if (this.isDatabaseError(error, '23503')) {
                return res.status(409).send({ error: REMOVE_TRAINED_ERROR });
            }

            console.error(error);
            res.status(500).send({ error: 'Error al quitar la rutina del alumno.' });
        }
    }
```

- [ ] **Paso 4: Los dos helpers, antes de `// ===== HELPERS DE RUTINA =====`** (en una sección propia)

```ts
    // ===================== HELPERS DE ASIGNACION INDIVIDUAL =====================

    // La misma forma para el alta (la asignacion creada) y la baja (la asignacion borrada).
    // De la rutina sale solo id y name: el listado (BE-12) es el que suma active
    private buildRoutineAssignUserResponse(
        assignment: RoutineAsignationUser,
        routine: Pick<Routine, 'id' | 'name'>
    ) {
        return {
            id: assignment.id,
            routine_id: assignment.routine_id,
            user_id: assignment.user_id,
            date: assignment.date,
            created_at: assignment.created_at,
            updated_at: assignment.updated_at,
            routine: { id: routine.id, name: routine.name },
        };
    }

    // Reconoce un error de Postgres por su codigo (23505 = unico, 23503 = clave foranea).
    // constraint es opcional: sirve para no confundir el unico que importa con cualquier otro
    private isDatabaseError(error: unknown, code: string, constraint?: string): boolean {
        if (!(error instanceof QueryFailedError)) {
            return false;
        }

        const driverError: { code?: string; constraint?: string } | undefined = error.driverError;

        return driverError?.code === code && (!constraint || driverError.constraint === constraint);
    }
```

- [ ] **Paso 5: Compilar y correr `verify-rules.js` y `verify-typeorm.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-rules.js" && node "$S/verify-typeorm.js"
```

Esperado: build en verde; `verify-rules.js` con `N ok, 0 fallas` (N ≈ 75); `verify-typeorm.js` con `0 fallas` (y la línea del `INSERT ... RETURNING` impresa, que se copia al Status). Si `verify-rules.js` falla en el **orden** de las consultas o en un mensaje, se corrige el service: el script es la spec §4.1/§4.2 hecha ejecutable.

---

## Tarea 4: El controller y su Swagger

**Archivos:**
- Modificar: `power-app/src/routine/routine.controller.ts`
- Modificar: `power-app/src/planification/planification.controller.ts:33-36` (sólo el comentario)

- [ ] **Paso 1: Imports del controller**

`Delete` se suma al import de `@nestjs/common`:

```ts
import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    Res,
} from '@nestjs/common';
```

y, junto a los otros imports de DTOs:

```ts
import { AssignRoutineToUserDto } from '../dtos/routine/assign_routine_to_user.dto';
import { RoutineAssignUserResponseDto } from '../dtos/routine/routine_assign_user_response.dto';
```

- [ ] **Paso 2: Los dos handlers, al final de la clase (después de `setCircuitActive`)**

```ts

    // ===================== ASIGNACION INDIVIDUAL A UN ALUMNO (CU-E-19, CU-E-20) =====================

    // Rutas de dos segmentos: no compiten con 'GET /:id'. El listado de las asignaciones de un
    // alumno (GET /routine/assigned/:userId) es la tarea siguiente (BE-12)
    @Post('assign-user')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 201, type: RoutineAssignUserResponseDto })
    @ApiResponse({ status: 400, description: 'Datos inválidos, rutina dada de baja, o el destinatario no es un alumno o tiene la cuenta cerrada' })
    @ApiResponse({ status: 404, description: 'Rutina o usuario no encontrado' })
    @ApiResponse({ status: 409, description: 'El alumno ya tiene esa rutina asignada ese día' })
    async assignRoutineToUser(
        @Body() assignRoutineToUserDto: AssignRoutineToUserDto,
        @Res() res: Response,
    ) {
        await this.routineService.assignRoutineToUser(assignRoutineToUserDto, res);
    }

    @Delete('assign-user/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: RoutineAssignUserResponseDto, description: 'La asignación que se borró (borrado físico)' })
    @ApiResponse({ status: 400, description: 'El id no es un UUID válido' })
    @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
    @ApiResponse({ status: 409, description: 'El alumno ya entrenó esta rutina: no se puede quitar' })
    async removeRoutineFromUser(
        @Param() idAssignment: ParameterIdDto,
        @Res() res: Response,
    ) {
        await this.routineService.removeRoutineFromUser(idAssignment.id, res);
    }
```

- [ ] **Paso 3: Actualizar el comentario viejo de `planification.controller.ts`**

Reemplazar las líneas 33-36:

```ts
// CU-E-19 y CU-E-20 (asignar/quitar rutina puntual a un alumno) salieron de aca el 27/8:
// son del paquete "Administrar Rutinas", dependen de Routine_Asignation_User —declarada
// post-MVP— y cuando se retomen van a vivir en routine/ (POST /routine/assign-user,
// DELETE /routine/assign-user/:id, GET /routine/assigned/:userId)
```

por:

```ts
// CU-E-19 y CU-E-20 (asignar/quitar rutina individual a un alumno) salieron de aca el 27/8:
// son del paquete "Administrar Rutinas" y viven en routine/ (POST /routine/assign-user y
// DELETE /routine/assign-user/:id, desde BE-11). El listado GET /routine/assigned/:userId
// es BE-12
```

- [ ] **Paso 4: Compilar y correr `verify-controller.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-controller.js"
```

Esperado: build en verde; `0 fallas`. Si falla el chequeo de `await`, el handler tiene un `return`: **sacarlo** (regla de BE-04).

---

## Tarea 5: Barrido final del código

**Archivos:** ninguno nuevo.

- [ ] **Paso 1: Build limpio y los cuatro scripts seguidos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-dto verify-rules verify-typeorm verify-controller; do echo "=== $f"; node "$S/$f.js" 2>&1 | tail -3; done
```

Esperado: cuatro `N ok, 0 fallas`. Anotar los cuatro conteos para el Status.

- [ ] **Paso 2: Nada se escapó de lo acordado**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git status --short
git diff --stat -- "Db Creator" power-app/src/entities
grep -rn "return this.routineService" power-app/src/routine/routine.controller.ts
grep -rn "La cuenta está deshabilitada" power-app/src/routine power-app/src/dtos/routine
grep -n "assigned" power-app/src/routine/routine.controller.ts
```

Esperado:
- `git status`: sólo los 9 archivos del mapa (3 DTOs nuevos, módulo, service, 2 controllers) — los Status todavía no.
- `git diff --stat` de `Db Creator` y de las entidades: **vacío**.
- `return this.routineService`: **sin resultados**.
- `La cuenta está deshabilitada`: **sin resultados**.
- `assigned`: sólo el comentario que dice que el listado es BE-12, **ninguna ruta**.

---

## Tarea 6: Status (informe y dashboard)

**Archivos:**
- Modificar: `Status/estado-implementacion-backend.md`
- Modificar: `Status/dashboard-estado-backend.html`

Los números: ✅ 57 → **59**, ⬜ 6 → **4**, total 75 y los demás sin cambio. Porcentajes: ✅ 59/75 = **79%**, ⬜ 4/75 = **5%** (suman 79 + 11 + 4 + 5 + 1 = 100). Sobre los CU con backend: 59/74 = **80%**. Entrenador: 28/32 = **88%**; sus ⬜ pasan de 4 a 2 (E-06 y E-07).

- [ ] **Paso 1: Informe — cabecera, resumen y cobertura**

En `estado-implementacion-backend.md`:
1. Línea 3: `**Corte:** 2026-10-17` → `**Corte:** 2026-10-18`.
2. Tabla de resumen: `✅ Implementado | 57 | 76%` → `59 | 79%`; `⬜ No implementado | 6 | 8%` → `4 | 5%`.
3. Línea 17: `**57 de los 74 CU con backend están completos (77%).** Faltan 17: 8 parciales, 3 en andamiaje y 6 sin implementar.` → `**59 de los 74 CU con backend están completos (80%).** Faltan 15: 8 parciales, 3 en andamiaje y 4 sin implementar.`
4. Tabla de cobertura por rol: fila **Entrenador** `| Entrenador | 32 | 26 | 0 | 2 | 4 | 0 | 81% |` → `| Entrenador | 32 | 28 | 0 | 2 | 2 | 0 | 88% |`; fila **Total** `| **Total** | **75** | **57** | **8** | **3** | **6** | **1** | **77%** |` → `| **Total** | **75** | **59** | **8** | **3** | **4** | **1** | **80%** |`.

- [ ] **Paso 2: Informe — entrada nueva en "Cambios recientes"**, justo arriba de la del 17/10 (`## Cambios recientes (2026-10-17 · modelo de ejecución y planificaciones por semanas)`)

```markdown
## Cambios recientes (2026-10-18 · rutina individual: asignar y quitar)

- **Undécima tarea del roadmap (BE-11): E-19 y E-20 pasan a ✅.** Son los primeros endpoints de la vía individual (spec del 17/10, §4.1 y §4.2), en `routine.controller.ts` y `routine.service.ts` como se acordó el 27/8. Plan: `Doc/plans/2026-10-18-be-11-asignar-rutina-individual-plan.md` (repo PowerApp-Docs). Conteos: 57 → **59** ✅ de 75 (80% de los 74 con backend); el Entrenador sube de 81% a 88%.
- **Son dos endpoints y no tres.** El roadmap metía `GET /routine/assigned/:userId` en esta tarea; la spec del 17/10 lo movió a **BE-12** (§4.3 y §9) porque trae el progreso de cada asignación. Manda la spec. **Consecuencia:** hasta BE-12 el entrenador puede asignar y quitar, pero **no tiene cómo listar las asignaciones de un alumno**, y E-20 arranca justamente de abrir una asignación. Queda diferido, no olvidado.
- **`POST /routine/assign-user`** (coach, admin). Body `{ routine_id, user_id, date }`; `201` con `{ id, routine_id, user_id, date, created_at, updated_at, routine: { id, name } }`. Las validaciones van en un orden que es parte del contrato: `404` rutina inexistente → `400` rutina de baja → `404` usuario inexistente → `400` destinatario que no es alumno o con la cuenta cerrada → `409` si ya tiene esa rutina ese día. **Por qué ese orden:** el cliente corrige de a un error por vez, y la rutina es lo primero que eligió el coach.
- **`DELETE /routine/assign-user/:id`** (coach, admin). `404` si no existe; `409` `El alumno ya entrenó esta rutina: no se puede quitar.` si tiene filas en `Routine_Asign_Exercise_Finished`; si no, **borrado físico** y `200` con la asignación borrada, con la misma forma que el alta. **Por qué físico y con 409:** es lo que dice la spec de E-20, y no se destruye el historial del alumno (D4, criterio del 22/8). El `RESTRICT` de la base es el respaldo.
- **El `409` sale por dos caminos en cada endpoint.** El alta chequea el duplicado antes de insertar *y* traduce el `23505` del único `uk_rau_routine_user_date` (dos altas simultáneas pasan las dos el chequeo). La baja chequea la ejecución antes de borrar *y* traduce el `23503` de la FK `RESTRICT` (el alumno marca un ejercicio entre el chequeo y el borrado). Es la **primera vez que el proyecto traduce un error de Postgres a un código HTTP**: se mira `QueryFailedError` y `driverError.code`, y en el alta también el nombre del único, para no disfrazar de duplicado cualquier otro `23505`.
- **Sin transacción, a propósito.** Cada endpoint es una sola escritura precedida de lecturas; las carreras las cierra la base. Por eso no aplica la regla de `connect()` y `startTransaction()` dentro del `try`.
- **`date` es un día sin hora, validado a mano.** `@IsDateString()` (el que usa `user_rm`) acepta fecha con hora y zona y la dejaría pasar a un `date` de Postgres; el año `0000` pasaría la forma y daría un 500. El body usa un validador propio (`@IsCalendarDay()`: forma `YYYY-MM-DD`, día que exista en el calendario, año ≥ 1) que BE-12 reutiliza para `from` y `to`. El servidor sigue sin calcular "hoy": la fecha es siempre del cliente, pasada o futura.
- **Dos rutinas distintas el mismo día se permiten.** El único es `(rutina, alumno, día)`; lo que se rechaza es repetir la **misma** rutina el mismo día. Es consecuencia de D2 y queda escrito en la spec de E-19.
- **Los ids de la respuesta son los de la base.** El iOS manda los UUID en mayúscula; el alta guarda y devuelve los ids de las filas leídas y no los del body.
- **Registros del módulo.** `routine.module.ts` suma `RoutineAsignationUser` (sólo estaba en `planification.module.ts`) y `User`, con `forFeature` y no importando `UsersModule` (el usuario ya rechazó acoplar módulos). Se actualizó el comentario de `planification.controller.ts` que decía que E-19 y E-20 "se retomarán".
- **Sin cambios de esquema:** `Db Creator/` y las entidades no se tocaron. Specs de CU reescritas en `Use Cases/` (repo PowerApp-Docs): **E-19 y E-20**. Las precondiciones de E-03 a E-07 ("gimnasio compartido", D6) siguen para BE-38.
- **Para el web.** B5 (rutina puntual) ya puede tipar el alta y la baja contra el Swagger de estos dos endpoints. Falta el listado (BE-12) para completar la pantalla.
- **Verificación, sin levantar el server.** Hecho:
  - Build en verde.
  - {N_DTO} chequeos del body con el `ValidationPipe` real y el validador del día, {N_RULES} de las reglas de los dos métodos con repositorios falsos (códigos, mensajes, **orden de las validaciones**, los dos 409 de cada endpoint, ids en mayúscula, qué se guardó y qué no, la forma exacta de las respuestas), {N_CTRL} del controller (rutas, verbos, roles, `await` sin `return`, y el Swagger generado con `@nestjs/testing` sin abrir ningún puerto) y {N_TYPEORM} sin conectarse a la base (nombre del único, `INSERT ... RETURNING id, created_at, updated_at`, `date` hidratado como `'YYYY-MM-DD'`, FK `RESTRICT`).
  - Los scripts se corrieron antes **en rojo** ({RED_DTO}, {RED_RULES} y {RED_CTRL} fallas contra HEAD) y después en verde.
- **Lo que NO se verificó.**
  - Nada corrió contra un Postgres ni contra el server. El `INSERT ... RETURNING` y la hidratación de `date` se revisaron contra la metadata de TypeORM y el parser de `pg`, no en vivo: queda para BE-35.
  - La carrera real (dos altas simultáneas, o una marca en medio de un borrado) no se reprodujo: se probó que el código traduce el error si la base lo devuelve, no que la base lo devuelva.
  - **La baja de una asignación entrenada no se puede probar de punta a punta todavía**: nada escribe `Routine_Asign_Exercise_Finished` hasta BE-14 (hallazgo 2). Se probó con un repositorio falso.
- **Cambios de estado:** **E-19 y E-20 pasan de ⬜ a ✅.** La fase 2 avanza: **BE-10, BE-10b y BE-11 hechas, sigue BE-12** (el listado por alumno, que es la parte individual de U-08).
```

Reemplazar `{N_*}` y `{RED_*}` por los conteos reales que imprimieron los scripts en las Tareas 1 y 5 (no dejar llaves en el texto final).

- [ ] **Paso 3: Informe — detalle del Entrenador y plan de trabajo**

1. Encabezado `## Detalle — Rol Entrenador (32 CU · 81%)` → `(32 CU · 88%)`.
2. Fila de E-19 (línea ~501) por:

```markdown
| CU-E-19 | Asignar rutina a alumno | ✅ Implementado | `POST /routine/assign-user` · para un día (`date`), 404 → 400 → 404 → 400 → 409 · sin planificación · el listado es BE-12 (18/10) |
```

3. Fila de E-20 (línea ~502) por:

```markdown
| CU-E-20 | Eliminar rutina a alumno | ✅ Implementado | `DELETE /routine/assign-user/:id` · borrado físico; 409 si el alumno ya la entrenó (18/10) |
```

4. Tabla "Plan de trabajo", fila de la fase 2, columna Estado: `en curso: BE-10 y BE-10b hechas el 17/10, sigue BE-11` → `en curso: BE-10 y BE-10b hechas el 17/10, BE-11 el 18/10; sigue BE-12`.

- [ ] **Paso 4: Dashboard**

En `dashboard-estado-backend.html`:

1. Línea 208: `Corte: <b>2026-10-17</b>` → `2026-10-18`.
2. Línea 217: `57` → `59` y `76% · cumple su spec` → `79% · cumple su spec`.
3. Línea 226: `6` → `4` y `8% · sin endpoint` → `5% · sin endpoint`.
4. Línea 231: `aria-label="57 implementados, 8 parciales, 3 andamiaje, 6 no implementados y 1 sin backend, de 75"` → `"59 implementados, 8 parciales, 3 andamiaje, 4 no implementados y 1 sin backend, de 75"`.
5. Barra (líneas 232-236): `s-done` `width:76.00%` → `78.67%`; `s-missing` `width:8.00%` → `5.33%` (los otros tres no cambian: 10.67 + 4.00 + 1.33).
6. Línea 239: `<b>57 de los 74</b> CU con backend completos (77%)` → `<b>59 de los 74</b> CU con backend completos (80%)`.
7. Línea 240: `<b>17</b> pendientes (8 parciales, 3 andamiaje, 6 sin endpoint)` → `<b>15</b> pendientes (8 parciales, 3 andamiaje, 4 sin endpoint)`.
8. Tarjeta del Entrenador (líneas 271-283):
   - `role-pct` `81%` → `88%`.
   - `role-sub` → `28 de 32 · circuitos, rutinas, planificaciones y la asignación individual cerrados; faltan las asignaciones de planificaciones (E-13, E-14) y el historial (E-06, E-07)`.
   - `mini-bar`: `width:81.25%` → `87.50%`; el `stub` queda en `6.25%`; el `missing-line` `12.50%` → `6.25%`.
   - leyenda: `<b>26</b> impl.` → `<b>28</b>`; `<b>4</b> falta` → `<b>2</b>`.
9. Línea 392: `32 CU · 81% implementado` → `32 CU · 88% implementado`.
10. Filas de E-19 y E-20 (líneas 426-427): el chip pasa de `class="chip missing"` / `No implementado` a `class="chip done"` / `Implementado`, y la celda del endpoint a:

```html
<td class="endpoint"><span class="verb">POST</span> /routine/assign-user <span class="muted">· para un día (<code>date</code>); 404 → 400 → 404 → 400 → 409 · el listado es BE-12 (18/10)</span></td>
```
```html
<td class="endpoint"><span class="verb">DELETE</span> /routine/assign-user/:id <span class="muted">· borrado físico; 409 si el alumno ya la entrenó (18/10)</span></td>
```

11. Pie (línea ~507): `57 impl · 8 parc · 3 andam · 6 falta · 1 sin backend — de 75 · corte 2026-10-17` → `59 impl · 8 parc · 3 andam · 4 falta · 1 sin backend — de 75 · corte 2026-10-18`.

- [ ] **Paso 5: Barrido para no dejar números viejos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status"
grep -n "57 \|57<\|76%\|77%\|81%\|2026-10-17\|sigue BE-11\|BE-10 y BE-11\|· BE-11" dashboard-estado-backend.html estado-implementacion-backend.md
```

Cada coincidencia que quede tiene que ser una de estas: una entrada **histórica** de "Cambios recientes" (no se reescriben), la nota del 17/10 sobre el cambio de criterio, o una referencia a otro tema. Cualquier otra se corrige. Y comprobar que en el informe no queda ningún `{N_` ni `{RED_`:

```bash
grep -n "{N_\|{RED_" estado-implementacion-backend.md
```

Esperado: sin resultados.

---

## Tarea 7: Specs de CU (repo PowerApp-Docs)

**Archivos:**
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\entrenador\CU-E-19-asignar-rutina-a-alumno.md`
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\entrenador\CU-E-20-eliminar-rutina-a-alumno.md`

Spec §7: E-19 asigna **para un día**, sin planificación, con rutina de baja, destinatario que no es alumno y duplicado como caminos alternativos; E-20 suma el camino "ya entrenada". Se conserva el formato de los demás CU (el de E-12a). El README (`Use Cases/README.md`) lista los CU por nombre y no cambia.

- [ ] **Paso 1: Reescribir `CU-E-19-asignar-rutina-a-alumno.md`**

```markdown
# CU-E-19 — Asignar Rutina a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Vía individual de asignación (alumnos nuevos, primeras clases): asigna una rutina a un alumno **para un día**, sin pasar por una planificación, creando un Routine_Asignation_User. Cada asignación es una sesión con su propio registro de ejecución, así que la misma rutina puede asignarse al mismo alumno en días distintos.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Routine_Asignation_User que liga una rutina a un alumno para un día.

**Fuera de alcance:**

- Asignación vía planificación (CU-E-13).
- Asignar la rutina a varios días de una vez: son tantas asignaciones como días.
- Listar las rutinas asignadas a un alumno.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La rutina existe y está activa.
- El alumno existe y su cuenta está abierta.
- El gimnasio es compartido: cualquier entrenador puede asignarle una rutina a cualquier alumno.

## Postcondiciones

- Existe un Routine_Asignation_User con la rutina, el alumno y el día elegidos, sin hora.
- El alumno ve la rutina ese día.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno, una rutina y el día en que el alumno la hace.
2. El sistema verifica que la rutina esté activa y que el destinatario sea un alumno con la cuenta abierta.
3. El sistema crea el Routine_Asignation_User.
4. El sistema confirma la asignación con su día y el nombre de la rutina.

## Caminos alternativos / excepciones

### En el paso 1 — El día es pasado o futuro

1. El entrenador elige un día que ya pasó o que todavía no llegó.
2. El sistema lo acepta: la fecha la define siempre el entrenador y el sistema no calcula «hoy».

### En el paso 1 — El alumno ya tiene otra rutina ese día

1. El alumno tiene asignada una rutina **distinta** ese día.
2. El sistema crea la asignación igual: lo que no se admite es repetir la misma rutina el mismo día.

### En el paso 2 — La rutina o el alumno no existen

1. El sistema informa cuál de los dos no se encontró y no crea la asignación.

### En el paso 2 — La rutina está dada de baja

1. La rutina existe pero está inactiva.
2. El sistema informa cuál es y no crea la asignación. Las asignaciones que ya tenía siguen vigentes.

### En el paso 2 — El destinatario no es un alumno o su cuenta está cerrada

1. El usuario elegido es un entrenador o un administrador, o es un alumno con la cuenta cerrada.
2. El sistema informa el motivo y no crea la asignación.

### En el paso 3 — Rutina ya asignada ese día

1. El alumno ya tiene esa rutina asignada ese mismo día (también si otro entrenador la asignó en ese instante).
2. El sistema informa y no duplica la asignación.
```

- [ ] **Paso 2: Reescribir `CU-E-20-eliminar-rutina-a-alumno.md`**

```markdown
# CU-E-20 — Eliminar Rutina a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Quita una rutina asignada a un alumno para un día, eliminando el Routine_Asignation_User correspondiente. Sólo se puede mientras el alumno no la haya entrenado: una asignación con ejercicios ya realizados no se borra, para no destruir su historial.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja física del vínculo Routine_Asignation_User entre la rutina y el alumno, para ese día.

**Fuera de alcance:**

- Baja de la rutina sistémica (CU-E-18).
- Quitar una planificación asignada a un alumno (CU-E-14).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- Existe la asignación individual que se quiere quitar.
- El gimnasio es compartido: cualquier entrenador puede quitar la asignación de cualquier alumno.

## Postcondiciones

- La asignación deja de existir; el alumno deja de ver esa rutina ese día.

## Camino principal (flujo básico)

1. El entrenador abre la asignación del alumno y solicita quitarla.
2. El sistema pide confirmación.
3. El sistema elimina el Routine_Asignation_User y confirma, mostrando la asignación que se quitó.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 3 — La asignación ya no existe

1. La asignación fue quitada por otro entrenador entre que se abrió y se confirmó.
2. El sistema informa que no se encontró y no realiza cambios.

### En el paso 3 — El alumno ya entrenó la rutina

1. El alumno ya marcó como realizado al menos un ejercicio de esa asignación.
2. El sistema informa que no se puede quitar porque el alumno ya la entrenó y no realiza cambios: el historial del alumno se conserva.
```

---

## Tarea 8: Dejar todo stageado, memoria y cierre

**Archivos:** ninguno nuevo. **No se commitea ni se pushea.**

- [ ] **Paso 1: Stagear sólo los archivos propios, en cada repo**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git add power-app/src/dtos/routine/is_calendar_day.decorator.ts \
        power-app/src/dtos/routine/assign_routine_to_user.dto.ts \
        power-app/src/dtos/routine/routine_assign_user_response.dto.ts \
        power-app/src/routine/routine.module.ts \
        power-app/src/routine/routine.service.ts \
        power-app/src/routine/routine.controller.ts \
        power-app/src/planification/planification.controller.ts \
        Status/estado-implementacion-backend.md \
        Status/dashboard-estado-backend.html
git status --short

cd "D:/Power App/Docs/PowerApp-Docs"
git add "Doc/plans/2026-10-18-be-11-asignar-rutina-individual-plan.md" \
        "Use Cases/entrenador/CU-E-19-asignar-rutina-a-alumno.md" \
        "Use Cases/entrenador/CU-E-20-eliminar-rutina-a-alumno.md"
git status --short
```

Esperado: el backend con 9 archivos (`A` los 3 DTOs, `M` el resto) y el de docs con 3 (`M` las dos specs, `A` el plan). Si `git status` muestra algo más que no sea propio, no se stagea.

- [ ] **Paso 2: Actualizar la memoria del proyecto**

En `C:\Users\caram\.claude\projects\D--Power-App-Backend-PowerApp-Backend\memory\`: actualizar `project_cu_status.md` y su línea del `MEMORY.md` para que digan que BE-11 está hecha (E-19 y E-20 ✅, 59 de 74) y que **sigue BE-12**. Agregar la regla nueva que deja la tarea: *un error de la base se traduce con `QueryFailedError` + `driverError.code` (23505 único, 23503 FK), mirando el nombre del constraint en los únicos*.

- [ ] **Paso 3: Proponer los mensajes de commit (uno por repo) y cerrar**

Backend:

```
BE-11: asignar y quitar una rutina individual (E-19 y E-20), POST y DELETE /routine/assign-user

Para un día, con las validaciones en el orden de la spec y el 409 por duplicado y por ya entrenada, también cuando lo dispara la base. Status: E-19 y E-20 pasan a ✅ (59 de 74).
```

PowerApp-Docs:

```
Plan de BE-11 y specs de E-19 y E-20 reescritas para la rutina individual de un día
```

Reportar al usuario: qué quedó, qué se verificó (los cuatro scripts y el build, con sus conteos), qué **no** (nada corrió contra Postgres; la carrera real y la baja de una asignación entrenada de punta a punta; todo para BE-35), y la tarea siguiente: **BE-12**, el listado por alumno (`GET /routine/assigned/:userId?from=&to=`, spec §4.3), que además cierra el hueco de que el coach todavía no puede listar lo que asignó.

---

## Autorrevisión del plan contra la spec

**Cobertura de la spec:**
- §4.1 asignar: orden de las validaciones, los 5 códigos, el 201 con la forma exacta, el `409` por la base → Tareas 3 y 4, `verify-rules` (alta) y `verify-typeorm` (nombre del único).
- §4.2 quitar: 404, 409 con el texto exacto, borrado físico, 200 con la misma forma → Tarea 3, `verify-rules` (baja).
- Tabla de rutas y roles (coach, admin) → Tarea 4, `verify-controller`.
- §4 convenciones: fechas sin hora y nunca "hoy" (`isCalendarDay`, y ninguna llamada a `new Date()` para el día), ids en minúscula (hallazgo 5), `await` en los handlers (`verify-controller`), Swagger con respuesta y errores (`verify-controller`).
- §6: las asignaciones sobreviven al cierre de la cuenta y a la baja de la rutina → no hay lógica que las borre; el alta rechaza *nuevas* asignaciones a cuentas cerradas y a rutinas de baja, que es lo que dice §4.1. Los 403 no usan el texto reservado (`verify-rules`).
- §7: specs de E-19 y E-20 → Tarea 7. (E-03 a E-07 quedan para BE-38.)
- §9/§10: Status por tarea y verificación sin levantar el server → Tareas 5 y 6.
- §4.3 (listado): **fuera de alcance, es BE-12**; `verify-controller` comprueba que no se coló.
- Encargo: `RoutineAsignationUser` en el `forFeature` de `routine.module.ts` → Tarea 3, paso 1.

**Placeholders:** el único texto con llaves son los conteos `{N_*}` y `{RED_*}` del Status, que el paso 2 de la Tarea 6 manda reemplazar con la salida real de los scripts y el paso 5 verifica que no queden.

**Consistencia de nombres:** `assignRoutineToUser` / `removeRoutineFromUser` (service, controller y scripts), `AssignRoutineToUserDto`, `RoutineAssignUserResponseDto` y `RoutineAssignUserRoutineDto`, `isCalendarDay` / `IsCalendarDay`, `ASSIGN_DUPLICATE_ERROR` / `REMOVE_TRAINED_ERROR`, `buildRoutineAssignUserResponse`, `isDatabaseError`. El orden de los parámetros del constructor (`circuit`, `routine`, `dataSource`, `user`, `assignment`, `finished`) es el mismo en el service y en `build()` de `verify-rules.js`.
