# BE-16 — Historial de entrenamientos de un alumno, para el entrenador (CU-E-06 y E-07) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` de los archivos propios y se propone el mensaje (Tarea 8).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. No se instala nada para verificar.
> 3. **No se levanta el server.** Ni siquiera en segundo plano. Los scripts no abren puertos ni se conectan a ninguna base.

> **Registro de ejecución (18/10):** plan aprobado sin cambios de diseño. Qué pasó respecto de lo escrito abajo:
> - **Tarea 1, rojo:** `verify-history-dto` 1 falla (el módulo no existía), `verify-history-rules` 10 y `verify-history-controller` 8.
> - **Verde final:** build en 0; `verify-history-dto` 10 ok, `verify-history-rules` 45 y `verify-history-controller` 22, todos con 0 fallas. Regresión de BE-11 a BE-14: los quince scripts anteriores dan lo mismo (21, 102, 32, 41, 10, 46, 16, 24, 24, 58, 27, 58, 62, 19 y 30).
> - **SQL leído a ojo (Tarea 3):** coincide con el prototipo previo al plan. Cinco `JOIN` (el de las series es `LEFT`), `WHERE "assignment"."user_id" = $1` (más `AND "exercise"."id" = $2` con el filtro), el `ORDER BY` con los alias del `SELECT` y ningún `active`.
> - **Cero ajustes de los scripts y del código:** a diferencia de las tareas anteriores, no hizo falta corregir ninguna expresión regular ni ningún chequeo; el código quedó como está escrito en las Tareas 2 a 4 y compiló a la primera.
> - **Dashboard:** verificado renderizado recargando el archivo en el panel del navegador; la barra suma 100 y la fase 2 figura «Cerrada 18/10».

**Spec que manda:** [`2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md`](../specs/2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md), §2 (D6, D7), §4 (la tabla de rutas y §4.7), §6, §7 (E-06, E-07), §8, §9, §10 y §11. **Planes anteriores del bloque:** [BE-11](2026-10-18-be-11-asignar-rutina-individual-plan.md), [BE-12](2026-10-18-be-12-listado-rutinas-por-alumno-plan.md), [BE-13](2026-10-18-be-13-detalle-de-la-asignacion-para-el-alumno-plan.md) y [BE-14](2026-10-18-be-14-marcar-desmarcar-y-nota-plan.md): esta tarea reutiliza el `DataSource` sin conexión de BE-12, el DTO de `:userId` y los scripts de todas.
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde contradice a la spec, manda la spec (ver el hallazgo 1).

**Goal:** que el entrenador (o el admin) pueda ver qué entrenó un alumno: las sesiones en las que marcó al menos un ejercicio, de la más nueva a la más vieja, con la prescripción, la fecha y su nota; y acotarlo a un ejercicio del catálogo: `GET /routine/history/:userId?exercise_id=`. **Cierra el bloque A.**

**Architecture:** un método nuevo en `RoutineService`, un handler en `RoutineController` y tres DTOs. **Una sola consulta** (más la del usuario): parte de `Routine_Asign_Exercise_Finished` y une la asignación, la rutina, el ejercicio de rutina, el ejercicio del catálogo y sus series; el service agrupa las filas por asignación. Sin `active` en ningún lado: **lo dado de baja aparece igual** si el alumno lo hizo. Sin cambios de esquema ni de entidades: **`Db Creator` y las entidades no se tocan**.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` · scripts de Node en el scratchpad que corren sobre `power-app/dist`.

---

## 1. Estado de partida y hallazgos al preparar el plan

**Estado de partida (verificado el 18/10):** BE-14 ya está commiteada (backend `241ff3f`, docs `bf967b6`) y los dos repos están limpios. Existen `Routine_Asign_Exercise_Finished` (que BE-14 ya escribe), `AssignedRoutinesParamsDto` (el `:userId`), y el `DataSource` sin conexión de BE-12.

1. **El roadmap y la spec difieren.** El roadmap (BE-16) habla de "las instancias del alumno que tienen ejercicios hechos, en orden cronológico"; la spec (§4.7) fija el orden **de la más nueva a la más vieja** y una forma concreta con `source`. Manda la spec.
2. **Hoy una "sesión" es una asignación individual.** El historial de la vía del plan (`source: 'plan'`) es del bloque B (spec §8). La forma ya queda **preparada**: `source: 'individual'` va en cada sesión, y las sesiones de plan se sumarán a la misma lista con campos extra (`user_planification_id`, `routine_asignation_id`, `week`). Por eso E-06 y E-07 pasan a ✅ al cerrar el bloque A (spec §11), con la misma salvedad que U-09/U-10 y U-12/U-13.
3. **`sets` es la prescripción *actual*, no una foto.** D7: el modelo no registra la carga real. Y como las series cuelgan del `Routine_Exercise`, **si el coach edita las series de un circuito después, el historial viejo muestra la prescripción nueva**. No es un error de esta tarea (el modelo no versiona), pero hay que decirlo: va al Status como limitación conocida.
4. **La consulta nueva se puede probar casi entera sin Postgres.** Probé en el scratchpad que TypeORM arma el SQL esperado y, además, que su transformador convierte filas **crudas** (con los alias del `SELECT`, como las devuelve Postgres) en el grafo de entidades: agrupa por hecho, anida asignación, rutina, ejercicio y series, deja `[]` cuando un ejercicio no tiene series, convierte `weight` a número (por el `transformer` de la columna) y `date` a `'YYYY-MM-DD'`. Es más de lo que se pudo verificar en BE-12 y BE-13. Lo que sigue sin probarse es que Postgres ejecute ese SQL.
5. **TypeORM reescribe el `ORDER BY` con los alias del `SELECT`** cuando la consulta tiene joins y `getMany()`: sale `ORDER BY "assignment_date" DESC, "routine_name" ASC, …`. En Postgres ordenar por alias es equivalente (mismo caso que BE-12). Los scripts lo comprueban así.
6. **La consulta no puede filtrar por `active` de nada.** La rutina, el circuito, el vínculo, el ejercicio y la cuenta pueden estar dados de baja y el historial tiene que mostrarlos igual (spec §4.7 y §6). La consulta no une `Circuit` ni `Routine_Circuit`, y el script comprueba que `active` no aparece en el SQL.
7. **El `exercise_id` que no existe no es un `404`.** La spec dice que, sin coincidencias, el array viene vacío; sólo el usuario inexistente da `404`.
8. **Quedan para BE-38 las precondiciones "alumno vinculado al coach" de E-03, E-04 y E-05** (spec §7). Este plan las corrige únicamente en E-06 y E-07, que son los CU que implementa.

## 2. Decisiones menores (se pueden vetar)

| # | Decisión | Por qué |
|---|---|---|
| h1 | **Una sola consulta con joins y `getMany()`**, en vez de una por tabla | El grafo se hidrata solo, el service sólo agrupa por asignación, y la hidratación se prueba offline con el transformador real. Costo: cada hecho se repite una vez por serie en el resultado (decenas de filas por sesión) |
| h2 | **Dentro de una sesión, los ejercicios van por `finished_at` ascendente** (el orden en que el alumno los marcó), con `id` de desempate | La spec no fija el orden. Es el orden cronológico real de lo que hizo; el orden de la rutina no sirve porque los vínculos apagados no conservan su posición |
| h3 | **Las sesiones van por `date` descendente y nombre de rutina** (spec), con `created_at` de la asignación como último desempate | Mismo criterio que BE-12 |
| h4 | **`:userId` reutiliza `AssignedRoutinesParamsDto`** (de BE-12) | Misma forma (un `userId` UUID); no se crea un DTO igual |
| h5 | **Un usuario que existe pero no es alumno devuelve `200` con `[]`**, y un `exercise_id` inexistente también | La spec sólo pide `404` si el usuario no existe |
| h6 | **Sólo coach y admin** (`@Auth(UserRole.coach, UserRole.admin)`) | La tabla de rutas de la spec. El alumno ve lo suyo por el detalle de cada asignación |
| h7 | **`sets` lleva exactamente los diez campos de la spec** (sin `id`), con `null` en los opcionales que vengan sin valor | El mismo formato que cada serie del detalle de rutina, menos el `id` |
| h8 | **`source` se documenta como `'individual'` o `'plan'`**, aunque hoy sólo sale `'individual'` | El web puede tipar la forma definitiva una sola vez; las sesiones de plan llegan con el bloque B |
| h9 | **Archivos nuevos en `dtos/routine/`:** `get_training_history_query.dto.ts` y `routine_history_response.dto.ts` | Mismo patrón que los otros DTOs de `routine/` |
| h10 | **El Status deja el hallazgo 2 reescrito, no cerrado**: la vía individual queda completa (BE-14 escribe, BE-13 y BE-16 leen) y sigue abierta la del plan | La spec dice "se cierra el hallazgo 2" al cerrar el bloque A; la vía del plan es del bloque B (§8), así que cerrarlo del todo sería falso |
| h11 | **La fase 2 del roadmap queda cerrada** (hito H2) en el Status, y la siguiente tarea es BE-17 | BE-09 a BE-16 están hechas |

## 3. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/dtos/routine/get_training_history_query.dto.ts` | **Nuevo.** `exercise_id` opcional (UUID) |
| `power-app/src/dtos/routine/routine_history_response.dto.ts` | **Nuevo.** La sesión, el ejercicio y la serie (Swagger) |
| `power-app/src/routine/routine.service.ts` | Método `getTrainingHistory`; un import |
| `power-app/src/routine/routine.controller.ts` | Handler `getTrainingHistory`; imports |
| `Status/estado-implementacion-backend.md` | Entrada nueva, conteos, cobertura por rol, detalle de E-06 y E-07, hallazgo 2 reescrito, plan de trabajo (fase 2 cerrada) |
| `Status/dashboard-estado-backend.html` | Lo mismo en el dashboard |

**No se tocan:** las entidades, `Db Creator/`, `routine.module.ts` (ya registra `RoutineAsignExerciseFinished`), `planification/`, `exercise/`, el DTO de `:userId`.

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**

| Archivo | Cambio |
|---|---|
| `Use Cases/entrenador/CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md`, `CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md` | Reescritos (spec §7) |
| `Doc/plans/2026-10-18-be-16-historial-del-entrenador-plan.md` | Este plan |

## 4. Verificación: cómo se prueba sin levantar nada

Todo sobre `power-app/dist`, con el `lib.js` que ya existe. Se escriben **antes** del código y se corren **en rojo** (Tarea 1).

| Script | Qué prueba |
|---|---|
| `verify-history-dto.js` | El query con el `ValidationPipe` real: `exercise_id` ausente, válido, en mayúscula, inválido, vacío, y parámetros de más |
| `verify-history-rules.js` | El método con un `DataSource` **real sin conexión** donde se intercepta la ejecución y se devuelven **filas crudas** que el **transformador real de TypeORM** convierte en entidades: así se prueban juntos el SQL (que se imprime y se verifica con sus parámetros), la hidratación y el armado de la respuesta. Cubre `404`, el vacío, el agrupado por asignación, la forma exacta de cada nivel, el orden, el filtro por ejercicio y que **no aparece ningún `active`** |
| `verify-history-controller.js` | Ruta, verbo y roles (sólo coach y admin); sin `@Owner`; que el handler pasa al service el id y el query; `await` sin `return`; el Swagger generado |

Además, en la Tarea 5, los **quince scripts de BE-11 a BE-14** como regresión.

**Lo que no se puede verificar acá:** que Postgres ejecute el SQL, el `ORDER BY` por alias en vivo, y el rendimiento con meses de historial. Queda para BE-35. Va en el Status como "no verificado".

---

## Tarea 0: Preflight

**Archivos:** ninguno.

- [ ] **Paso 1: Los dos repos están limpios y BE-14 está commiteada**

```bash
git -C "D:/Power App/Backend/PowerApp-Backend" status --short
git -C "D:/Power App/Backend/PowerApp-Backend" log --oneline -1
git -C "D:/Power App/Docs/PowerApp-Docs" status --short
```

Esperado: sin salida de `status` en el backend (en `241ff3f`); en docs, sólo este plan sin trackear. Cualquier otra cosa de otra sesión **no se toca**: se registra qué archivos son antes de seguir.

- [ ] **Paso 2: Lo que el plan da por hecho está en el código**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
grep -n "AssignedRoutinesParamsDto" power-app/src/dtos/routine/assigned_routines_params.dto.ts
grep -n "routineAsignationUser\|routineExercise" power-app/src/entities/routine_asign_exercise_finished.entity.ts
grep -n "exerciseSets\|exercise!" power-app/src/entities/routine_exercise.entity.ts
grep -n "routine!" power-app/src/entities/routine_asignation_user.entity.ts
grep -n "history" power-app/src/routine/routine.controller.ts
```

Esperado: el DTO del `:userId`; las dos relaciones de la tabla de hecho; `exercise` y `exerciseSets` en `Routine_Exercise`; `routine` en la asignación; y en el controller **ninguna** ruta `history`.

- [ ] **Paso 3: El build parte en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
```

Esperado: termina sin errores (código de salida 0).

---

## Tarea 1: Los scripts de verificación, en rojo

**Archivos (todos en el scratchpad, fuera de los repos):**
`C:\Users\caram\AppData\Local\Temp\claude\D--Power-App-Backend-PowerApp-Backend\c46f262f-0358-40cb-a6d9-a0418172f7d2\scratchpad\`

- [ ] **Paso 1: Crear `verify-history-dto.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

// La misma configuracion que main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const EX = '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01';

(async () => {
  let Query;

  await run('carga el DTO', async () => {
    ({ GetTrainingHistoryQueryDto: Query } = dist('dtos/routine/get_training_history_query.dto'));
    check('exporta GetTrainingHistoryQueryDto', typeof Query === 'function');
  });

  if (!Query) return finish();

  const transform = (value) => pipe.transform(value, { type: 'query', metatype: Query });

  const accepts = (name, value, expected) => run(name, async () => {
    const out = await transform({ ...value });
    check(name, out instanceof Query && Object.entries(expected).every(([k, v]) => out[k] === v), JSON.stringify(out));
  });

  const rejects = (name, value, text) => run(name, async () => {
    try {
      await transform(value);
      check(name, false, 'no lo rechazó');
    } catch (e) {
      const status = e.getStatus ? e.getStatus() : undefined;
      const response = e.getResponse ? e.getResponse() : { message: e.message };
      const messages = [].concat(response.message).join(' | ');
      check(name, status === 400, 'estado ' + status);
      if (text) check(name + ' (mensaje)', messages.includes(text), messages);
    }
  });

  await accepts('sin filtro (E-06)', {}, { exercise_id: undefined });
  await accepts('con un ejercicio (E-07)', { exercise_id: EX }, { exercise_id: EX });
  await accepts('ejercicio en mayúscula (iOS)', { exercise_id: EX.toUpperCase() }, { exercise_id: EX.toUpperCase() });

  await rejects('exercise_id que no es UUID', { exercise_id: 'abc' }, 'ejercicio');
  await rejects('exercise_id vacío (?exercise_id=)', { exercise_id: '' }, 'ejercicio');
  await rejects('parámetro de más (forbidNonWhitelisted)', { exerciseId: EX });
  await rejects('otro filtro que no existe', { from: '2026-10-01' });

  finish();
})();
```

- [ ] **Paso 2: Crear `verify-history-rules.js`**

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, SelectQueryBuilder, getMetadataArgsStorage } = mod('typeorm');
const { RawSqlResultsToEntityTransformer } = require(path.join(ROOT, 'node_modules/typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer'));
const { RoutineService } = dist('routine/routine.service');

const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const EX_ID = '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const t0 = new Date('2026-10-18T10:00:00Z');

const SESSION_KEYS = ['source', 'assignment_id', 'date', 'routine', 'exercises'];
const EXERCISE_KEYS = ['routine_exercise_id', 'exercise', 'user_note', 'finished_at', 'sets'];
const SET_KEYS = ['set_order', 'set_count', 'rep_count', 'weight', 'rm_perc', 'rpe', 'rir', 'amrap', 'amrap_time', 'rm'];

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

// Una fila CRUDA como la devolveria Postgres: los alias son los del SELECT
const A1 = { id: 'A1', y: 2026, m: 9, d: 22, routine: { id: 'R2', name: 'Día B' } };
const A2 = { id: 'A2', y: 2026, m: 9, d: 20, routine: { id: 'R1', name: 'Día A' } };
const F1 = { id: 'F1', re: 'RE1', ex: { id: 'X1', name: 'Sentadilla' }, note: 'me costó', at: new Date('2026-10-22T10:00:00Z') };
const F2 = { id: 'F2', re: 'RE2', ex: { id: 'X2', name: 'Press banca' }, note: null, at: new Date('2026-10-22T10:05:00Z') };
const F3 = { id: 'F3', re: 'RE3', ex: { id: 'X1', name: 'Sentadilla' }, note: null, at: new Date('2026-10-20T09:00:00Z') };
const set = (id, order, over = {}) => ({ id, order, count: 3, reps: 8, weight: '80.50', rmPerc: null, rpe: 7, rir: null, amrap: false, amrapTime: null, rm: false, ...over });

function raw(finished, assignment, s) {
  return {
    finished_id: finished.id, finished_routine_exercise_id: finished.re, finished_user_note: finished.note, finished_created_at: finished.at,
    assignment_id: assignment.id, assignment_date: new Date(assignment.y, assignment.m, assignment.d), assignment_created_at: t0,
    routine_id: assignment.routine.id, routine_name: assignment.routine.name,
    routineExercise_id: finished.re, exercise_id: finished.ex.id, exercise_name: finished.ex.name,
    exerciseSet_id: s ? s.id : null, exerciseSet_set_order: s ? s.order : null, exerciseSet_set_count: s ? s.count : null,
    exerciseSet_rep_count: s ? s.reps : null, exerciseSet_weight: s ? s.weight : null, exerciseSet_rpe: s ? s.rpe : null,
    exerciseSet_rir: s ? s.rir : null, exerciseSet_rm_perc: s ? s.rmPerc : null, exerciseSet_amrap: s ? s.amrap : null,
    exerciseSet_amrap_time: s ? s.amrapTime : null, exerciseSet_rm: s ? s.rm : null,
  };
}

(async () => {
  // DataSource REAL pero sin conectarse
  const dir = path.join(ROOT, 'dist/entities');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) require(path.join(dir, file));
  const entities = getMetadataArgsStorage().tables.map(t => t.target).filter(t => typeof t === 'function');
  const ds = new DataSource({ type: 'postgres', entities });
  await ds.buildMetadatas();
  const { RoutineAsignExerciseFinished } = dist('entities/routine_asign_exercise_finished.entity');

  // Se intercepta la EJECUCION: se guarda el SQL con sus parametros y las filas CRUDAS del caso se
  // convierten en entidades con el transformador REAL de TypeORM (el mismo que usa getMany)
  let canned = {};
  let executed = [];
  SelectQueryBuilder.prototype.getMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    executed.push({ kind: 'history', sql, params });
    if (canned.fail) throw new Error('se cayó la base');
    const transformer = new RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, [], [], undefined);
    return transformer.transform(canned.raw || [], this.expressionMap.mainAlias);
  };

  function build(userFound = true) {
    const userRepository = { findOne: async (o) => { executed.push({ kind: 'user', arg: o.where }); return userFound ? { id: USER_ID } : null; } };
    return new RoutineService({}, {}, ds, userRepository, {}, ds.getRepository(RoutineAsignExerciseFinished));
  }

  async function history(cfg, query = {}, { userFound = true, userId = USER_ID } = {}) {
    canned = cfg; executed = [];
    const res = makeRes();
    await build(userFound).getTrainingHistory(userId, query, res);
    return { res, kinds: executed.map(e => e.kind), q: (kind) => executed.find(e => e.kind === kind) };
  }

  async function silencing(fn) {
    const original = console.error;
    let count = 0;
    console.error = () => { count++; };
    try { await fn(); } finally { console.error = original; }
    return count;
  }

  console.log('-- códigos');

  await run('el método existe', async () => {
    check('getTrainingHistory es función', typeof build().getTrainingHistory === 'function');
  });

  await run('usuario inexistente → 404 sin consultar el historial', async () => {
    const r = await history({}, {}, { userFound: false });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: 'Usuario no encontrado' }), JSON.stringify(r.res.body));
    check('sólo buscó al usuario', same(r.kinds, ['user']), r.kinds.join(','));
  });

  await run('sin nada hecho → 200 con []', async () => {
    const r = await history({ raw: [] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('cuerpo []', same(r.res.body, []), JSON.stringify(r.res.body));
    check('usuario y una sola consulta', same(r.kinds, ['user', 'history']), r.kinds.join(','));
  });

  await run('error de la base → 500', async () => {
    let r;
    const logged = await silencing(async () => { r = await history({ fail: true }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: 'Error al obtener el historial de entrenamientos.' }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  await run('el id del usuario en mayúscula se consulta tal cual y el historial filtra por el id de la fila', async () => {
    const r = await history({ raw: [] }, {}, { userId: USER_ID.toUpperCase() });
    check('buscó al usuario con lo que llegó', r.q('user').arg.id === USER_ID.toUpperCase());
    check('filtró por el id de la fila (minúscula)', r.q('history').params[0] === USER_ID, JSON.stringify(r.q('history').params));
  });

  console.log('\n-- SQL');

  await run('sin filtro (E-06)', async () => {
    const r = await history({ raw: [] });
    const { sql, params } = r.q('history');
    console.log('        ' + sql.replace(/\s+/g, ' '));
    check('desde Routine_Asign_Exercise_Finished', /FROM "Routine_Asign_Exercise_Finished" "finished"/.test(sql));
    check('une la asignación, la rutina, el ejercicio de rutina y el del catálogo',
      ['Routine_Asignation_User', 'Routine', 'Routine_Exercise', 'Exercise'].every(t => new RegExp(`INNER JOIN "${t}"`).test(sql)));
    check('trae las series con LEFT JOIN (un ejercicio puede no tener)', /LEFT JOIN "Exercise_Set" "exerciseSet"/.test(sql));
    check('filtra sólo por el alumno', /WHERE "assignment"\."user_id" = \$1/.test(sql) && !/\$2/.test(sql), sql);
    check('un solo parámetro', same(params, [USER_ID]), JSON.stringify(params));
    check('orden: día ↓, rutina, alta, marca, id y serie',
      /ORDER BY "assignment_date" DESC, "routine_name" ASC, "assignment_created_at" ASC, "finished_created_at" ASC, "finished_id" ASC, "exerciseSet_set_order" ASC/.test(sql), sql.slice(sql.indexOf('ORDER BY')));
    check('no filtra por NINGÚN active (lo dado de baja aparece igual)', !/active/.test(sql), sql);
    check('no une Circuit ni Routine_Circuit', !/"Circuit"|"Routine_Circuit"/.test(sql));
    check('no trae columnas de más (coach_note, description, video_url)', !/coach_note|"description"|video_url/.test(sql));
  });

  await run('con exercise_id (E-07)', async () => {
    const r = await history({ raw: [] }, { exercise_id: EX_ID });
    const { sql, params } = r.q('history');
    check('filtra además por el ejercicio del catálogo', /WHERE "assignment"\."user_id" = \$1 AND "exercise"\."id" = \$2/.test(sql), sql);
    check('parámetros en orden', same(params, [USER_ID, EX_ID]), JSON.stringify(params));
  });

  console.log('\n-- la respuesta (filas crudas → entidades → JSON)');

  await run('agrupa por asignación, en el orden de las filas, con la forma exacta', async () => {
    const r = await history({ raw: [
      raw(F1, A1, set('S1', 1)), raw(F1, A1, set('S2', 2, { rmPerc: 75, rir: 2, amrap: true, amrapTime: 60, rm: true, weight: null })),
      raw(F2, A1, null),
      raw(F3, A2, set('S3', 1)),
    ] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    const body = r.res.body;
    check('dos sesiones', Array.isArray(body) && body.length === 2, JSON.stringify(body && body.length));
    if (!body || body.length !== 2) return;

    const [s1, s2] = body;
    check('claves de la sesión', same(Object.keys(s1), SESSION_KEYS), Object.keys(s1).join(','));
    check('source es individual', s1.source === 'individual' && s2.source === 'individual');
    check('assignment_id y date (string de día)', s1.assignment_id === 'A1' && s1.date === '2026-10-22' && typeof s1.date === 'string', `${s1.assignment_id} ${s1.date}`);
    check('routine sólo id y name', same(s1.routine, { id: 'R2', name: 'Día B' }), JSON.stringify(s1.routine));
    check('orden de las sesiones = el de las filas', same(body.map(s => s.assignment_id), ['A1', 'A2']));

    check('la sesión A1 tiene dos ejercicios, en el orden de las filas', same(s1.exercises.map(e => e.routine_exercise_id), ['RE1', 'RE2']), JSON.stringify(s1.exercises.map(e => e.routine_exercise_id)));
    const e1 = s1.exercises[0];
    check('claves del ejercicio', same(Object.keys(e1), EXERCISE_KEYS), Object.keys(e1).join(','));
    check('exercise sólo id y name', same(e1.exercise, { id: 'X1', name: 'Sentadilla' }), JSON.stringify(e1.exercise));
    check('user_note', e1.user_note === 'me costó' && s1.exercises[1].user_note === null);
    check('finished_at es la fecha de la marca', e1.finished_at instanceof Date && +e1.finished_at === +F1.at);

    check('las series, ordenadas, con la forma exacta', e1.sets.length === 2 && same(Object.keys(e1.sets[0]), SET_KEYS), Object.keys(e1.sets[0] || {}).join(','));
    check('weight es número', e1.sets[0].weight === 80.5 && typeof e1.sets[0].weight === 'number', String(e1.sets[0].weight));
    check('los opcionales vacíos salen null', e1.sets[0].rm_perc === null && e1.sets[0].rir === null && e1.sets[0].amrap_time === null, JSON.stringify(e1.sets[0]));
    check('una serie AMRAP y RM con sus valores', e1.sets[1].amrap === true && e1.sets[1].amrap_time === 60 && e1.sets[1].rm === true && e1.sets[1].rm_perc === 75 && e1.sets[1].rir === 2 && e1.sets[1].weight === null, JSON.stringify(e1.sets[1]));
    check('un ejercicio sin series → []', same(s1.exercises[1].sets, []), JSON.stringify(s1.exercises[1].sets));

    check('la sesión A2 trae su ejercicio', s2.exercises.length === 1 && s2.exercises[0].routine_exercise_id === 'RE3' && s2.date === '2026-10-20');
  });

  await run('la misma rutina en dos días son dos sesiones; dos rutinas el mismo día también', async () => {
    const B = { id: 'A3', y: 2026, m: 9, d: 22, routine: { id: 'R1', name: 'Día A' } };
    const F4 = { id: 'F4', re: 'RE4', ex: { id: 'X3', name: 'Remo' }, note: null, at: new Date('2026-10-22T18:00:00Z') };
    const r = await history({ raw: [raw(F1, A1, null), raw(F4, B, null), raw(F3, A2, null)] });
    check('tres sesiones', r.res.body.length === 3, JSON.stringify(r.res.body.map(s => s.assignment_id)));
    check('el mismo día 22: dos rutinas distintas', r.res.body[0].date === '2026-10-22' && r.res.body[1].date === '2026-10-22' && r.res.body[0].routine.id !== r.res.body[1].routine.id);
  });

  await run('con filtro, la sesión trae sólo ese ejercicio (lo decide el SQL; acá llegan sólo esas filas)', async () => {
    const r = await history({ raw: [raw(F1, A1, set('S1', 1)), raw(F3, A2, set('S3', 1))] }, { exercise_id: 'X1' });
    check('dos sesiones', r.res.body.length === 2);
    check('un ejercicio por sesión, el pedido', r.res.body.every(s => s.exercises.length === 1 && s.exercises[0].exercise.id === 'X1'));
  });

  finish();
})();
```

- [ ] **Paso 3: Crear `verify-history-controller.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { SwaggerModule, DocumentBuilder } = mod('@nestjs/swagger');
const { RoutineController } = dist('routine/routine.controller');
const { RoutineService } = dist('routine/routine.service');
const { JwtAuthGuard } = dist('authentication/guards/jwt-auth.guard');
const { RolesGuard } = dist('authentication/guards/roles.guard');
const { OwnerGuard } = dist('authentication/guards/owner.guard');
const { OWNER_PARAM_KEY } = dist('authentication/decorators/owner.decorator');
const { UserRole } = dist('entities/user.entity');

const GET = 0; // RequestMethod.GET
const allow = { canActivate: () => true };

(async () => {
  const seen = { args: null };
  const stub = {
    getTrainingHistory: async (...args) => { await new Promise(r => setTimeout(r, 20)); seen.args = args; return 'RESPONSE'; },
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
  const handler = RoutineController.prototype.getTrainingHistory;

  console.log('-- ruta, verbo y roles');
  await run('getTrainingHistory: ruta, verbo y roles', async () => {
    check('existe', typeof handler === 'function');
    check('ruta history/:userId', Reflect.getMetadata('path', handler) === 'history/:userId', Reflect.getMetadata('path', handler));
    check('verbo GET', Reflect.getMetadata('method', handler) === GET, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('sólo coach y admin (el alumno NO)', Array.isArray(roles) && roles.length === 2 && roles.includes(UserRole.coach) && roles.includes(UserRole.admin) && !roles.includes(UserRole.user), JSON.stringify(roles));
    check('sin @Owner', Reflect.getMetadata(OWNER_PARAM_KEY, handler) === undefined);
  });

  console.log('\n-- argumentos y await');
  await run('pasa el userId y el query; espera sin devolver el Response', async () => {
    const query = { exercise_id: 'e1' };
    const res = {};
    const ret = await controller.getTrainingHistory({ userId: 'u1' }, query, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('userId', seen.args && seen.args[0] === 'u1');
    check('query', seen.args && seen.args[1] === query);
    check('response', seen.args && seen.args[2] === res);
  });

  console.log('\n-- Swagger');
  await run('el documento generado declara respuesta, errores y parámetros', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const get = doc.paths['/routine/history/{userId}'] && doc.paths['/routine/history/{userId}'].get;

    check('GET /routine/history/{userId} está en el documento', !!get);
    if (get) {
      for (const code of ['200', '400', '404']) check(`declara ${code}`, !!get.responses[code], Object.keys(get.responses).join(','));
      const schema = get.responses['200'].content['application/json'].schema;
      check('el 200 es un array de RoutineHistorySessionDto', schema.type === 'array' && (schema.items.$ref || '').endsWith('/RoutineHistorySessionDto'), JSON.stringify(schema));
      const params = get.parameters.map(p => `${p.in}:${p.name}`);
      check('parámetro de path userId', params.includes('path:userId'), params.join(','));
      const exerciseParam = get.parameters.find(p => p.name === 'exercise_id');
      check('query exercise_id opcional', !!exerciseParam && exerciseParam.required === false, JSON.stringify(exerciseParam));
      check('pide token', Array.isArray(get.security) && get.security.some(s => 'bearer' in s));
    }

    const schemas = doc.components.schemas;
    const props = (name) => (schemas[name] ? Object.keys(schemas[name].properties) : []);
    check('la sesión documenta sus 5 campos', ['source', 'assignment_id', 'date', 'routine', 'exercises'].every(k => props('RoutineHistorySessionDto').includes(k)), props('RoutineHistorySessionDto').join(','));
    check('source documenta individual y plan', schemas.RoutineHistorySessionDto && JSON.stringify(schemas.RoutineHistorySessionDto.properties.source.enum) === JSON.stringify(['individual', 'plan']), JSON.stringify(schemas.RoutineHistorySessionDto && schemas.RoutineHistorySessionDto.properties.source));
    check('el ejercicio documenta sus 5 campos', ['routine_exercise_id', 'exercise', 'user_note', 'finished_at', 'sets'].every(k => props('RoutineHistoryExerciseDto').includes(k)), props('RoutineHistoryExerciseDto').join(','));
    check('la serie documenta sus 10 campos', ['set_order', 'set_count', 'rep_count', 'weight', 'rm_perc', 'rpe', 'rir', 'amrap', 'amrap_time', 'rm'].every(k => props('RoutineHistorySetDto').includes(k)), props('RoutineHistorySetDto').join(','));

    check('lo de BE-11 a BE-14 sigue en el documento',
      !!doc.paths['/routine/assign-user'] && !!(doc.paths['/routine/assign-user/{id}'] || {}).get && !!doc.paths['/routine/assign-user/{id}/finished'] && !!doc.paths['/routine/assigned/{userId}']);
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 4: Correr los tres scripts en rojo**

```bash
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-history-dto verify-history-rules verify-history-controller; do echo "=== $f"; node "$S/$f.js" 2>&1 | grep -v "^  ok" | cut -c1-190 | tail -8; done
```

Esperado: los tres fallan. `verify-history-dto` por `Cannot find module` (el DTO no existe), `verify-history-rules` por `getTrainingHistory is not a function`, `verify-history-controller` por el handler inexistente. Anotar cuántas fallas dio cada uno (van al Status como "antes en rojo").

> Si un script falla por una causa del **entorno de la prueba** (por ejemplo, el transformador que pide algo que la fila cruda no trae, o un guard que pide una dependencia que el `overrideGuard` no cubre), se corrige **el script** en este paso hasta que dé la falla que corresponde. No se sigue con un script que falla por una razón equivocada.

---

## Tarea 2: Los DTOs

**Archivos:**
- Crear: `power-app/src/dtos/routine/get_training_history_query.dto.ts`
- Crear: `power-app/src/dtos/routine/routine_history_response.dto.ts`

- [ ] **Paso 1: Crear `get_training_history_query.dto.ts`**

```ts
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetTrainingHistoryQueryDto {

    @ApiPropertyOptional({ example: 'uuid-1234', description: 'Id de un ejercicio del catálogo (Exercise.id, no el Routine_Exercise). Con él, sólo vuelven las sesiones donde el alumno hizo ese ejercicio y, en cada una, únicamente ese ejercicio (CU-E-07). Si no coincide ninguna, el array viene vacío' })
    @IsOptional()
    @IsUUID('all', { message: 'El ID de ejercicio debe ser un UUID válido' })
    exercise_id?: string;
}
```

- [ ] **Paso 2: Crear `routine_history_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class RoutineHistoryRoutineDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 'Dia A - Piernas' })
    name!: string;
}

export class RoutineHistoryCatalogExerciseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Exercise.id, el del catálogo: es el que se manda en exercise_id para filtrar' })
    id!: string;

    @ApiProperty({ example: 'Sentadilla' })
    name!: string;
}

// La prescripcion del coach (D7): el modelo no registra la carga real del alumno. Cuelga del
// ejercicio de la rutina, asi que si el coach edita las series despues, el historial viejo
// muestra la prescripcion nueva
export class RoutineHistorySetDto {

    @ApiProperty({ example: 1 })
    set_order!: number;

    @ApiProperty({ example: 3 })
    set_count!: number;

    @ApiProperty({ example: 8 })
    rep_count!: number;

    @ApiProperty({ example: 80.5, nullable: true, type: Number })
    weight!: number | null;

    @ApiProperty({ example: 75, nullable: true, type: Number })
    rm_perc!: number | null;

    @ApiProperty({ example: 7, nullable: true, type: Number })
    rpe!: number | null;

    @ApiProperty({ example: 2, nullable: true, type: Number })
    rir!: number | null;

    @ApiProperty({ example: false })
    amrap!: boolean;

    @ApiProperty({ example: 60, nullable: true, type: Number })
    amrap_time!: number | null;

    @ApiProperty({ example: false })
    rm!: boolean;
}

export class RoutineHistoryExerciseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id del Routine_Exercise que el alumno marcó como hecho' })
    routine_exercise_id!: string;

    @ApiProperty({ type: RoutineHistoryCatalogExerciseDto })
    exercise!: RoutineHistoryCatalogExerciseDto;

    @ApiProperty({ example: 'Me costó la última serie', nullable: true, type: String, description: 'Nota del alumno; null si no dejó ninguna' })
    user_note!: string | null;

    @ApiProperty({ description: 'Cuándo lo marcó el alumno' })
    finished_at!: Date;

    @ApiProperty({ type: [RoutineHistorySetDto], description: 'La prescripción del coach, ordenada por set_order. Vacía si el ejercicio no tiene series' })
    sets!: RoutineHistorySetDto[];
}

export class RoutineHistorySessionDto {

    @ApiProperty({ enum: ['individual', 'plan'], example: 'individual', description: 'De dónde viene la sesión. Hoy sólo sale individual (una asignación individual); las sesiones de una planificación llegan con el bloque B, con campos extra, sin cambiar esta forma' })
    source!: 'individual' | 'plan';

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la Routine_Asignation_User' })
    assignment_id!: string;

    @ApiProperty({ example: '2026-10-20', description: 'Día de la asignación (YYYY-MM-DD, sin hora)' })
    date!: string;

    @ApiProperty({ type: RoutineHistoryRoutineDto })
    routine!: RoutineHistoryRoutineDto;

    @ApiProperty({ type: [RoutineHistoryExerciseDto], description: 'Los ejercicios que el alumno hizo en la sesión, en el orden en que los marcó. Incluye los que el coach dio de baja después' })
    exercises!: RoutineHistoryExerciseDto[];
}
```

- [ ] **Paso 3: Compilar y correr `verify-history-dto.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-history-dto.js"
```

Esperado: build en verde; `verify-history-dto.js` con `N ok, 0 fallas` (N ≈ 11).

---

## Tarea 3: El service

**Archivos:**
- Modificar: `power-app/src/routine/routine.service.ts`

- [ ] **Paso 1: Import del DTO de query**

Junto a los otros imports de DTOs:

```ts
import { GetTrainingHistoryQueryDto } from '../dtos/routine/get_training_history_query.dto';
```

- [ ] **Paso 2: El método, después de `unmarkExerciseFinished` y antes de `// ===== HELPERS DE ASIGNACION INDIVIDUAL =====`**

```ts
    // CU-E-06 y E-07: lo que un alumno entreno. Una "sesion" es una asignacion individual con al
    // menos un ejercicio hecho (la vía del plan se suma en el bloque B, con source 'plan'). Gimnasio
    // compartido (D6): cualquier coach o admin ve el historial de cualquier alumno
    async getTrainingHistory(
        userId: string,
        query: GetTrainingHistoryQueryDto,
        res: Response
    ) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                select: { id: true },
            });

            if (!user) {
                return res.status(404).send({ error: 'Usuario no encontrado' });
            }

            // Una sola consulta que parte del "hecho" y baja hasta las series. Todo INNER salvo
            // las series (un ejercicio puede no tenerlas). Sin ningun "active": lo dado de baja
            // aparece igual si el alumno lo hizo (spec §4.7 y §6) — por eso tampoco une Circuit ni
            // Routine_Circuit. Orden de la spec: dia descendente y nombre de rutina; el resto desempata
            const historyQuery = this.routineAsignExerciseFinishedRepository
                .createQueryBuilder('finished')
                .select(['finished.id', 'finished.routine_exercise_id', 'finished.user_note', 'finished.created_at'])
                .innerJoin('finished.routineAsignationUser', 'assignment')
                .addSelect(['assignment.id', 'assignment.date', 'assignment.created_at'])
                .innerJoin('assignment.routine', 'routine')
                .addSelect(['routine.id', 'routine.name'])
                .innerJoin('finished.routineExercise', 'routineExercise')
                .addSelect(['routineExercise.id'])
                .innerJoin('routineExercise.exercise', 'exercise')
                .addSelect(['exercise.id', 'exercise.name'])
                .leftJoin('routineExercise.exerciseSets', 'exerciseSet')
                .addSelect([
                    'exerciseSet.id', 'exerciseSet.set_order', 'exerciseSet.set_count', 'exerciseSet.rep_count',
                    'exerciseSet.weight', 'exerciseSet.rm_perc', 'exerciseSet.rpe', 'exerciseSet.rir',
                    'exerciseSet.amrap', 'exerciseSet.amrap_time', 'exerciseSet.rm',
                ])
                .where('assignment.user_id = :userId', { userId: user.id })
                .orderBy('assignment.date', 'DESC')
                .addOrderBy('routine.name', 'ASC')
                .addOrderBy('assignment.created_at', 'ASC')
                .addOrderBy('finished.created_at', 'ASC')
                .addOrderBy('finished.id', 'ASC')
                .addOrderBy('exerciseSet.set_order', 'ASC');

            // E-07: el ejercicio del CATALOGO (Exercise.id). Si no hay coincidencias, el array
            // viene vacio: solo el usuario inexistente es 404
            if (query.exercise_id) {
                historyQuery.andWhere('exercise.id = :exerciseId', { exerciseId: query.exercise_id });
            }

            const finishedRows = await historyQuery.getMany();

            // Las filas ya vienen en el orden final: se agrupa por asignacion respetandolo. Los
            // ejercicios de cada sesion quedan en el orden en que el alumno los marco
            const sessions = new Map<string, {
                source: 'individual';
                assignment_id: string;
                date: string;
                routine: { id: string; name: string };
                exercises: unknown[];
            }>();

            for (const finished of finishedRows) {
                const assignment = finished.routineAsignationUser;

                if (!sessions.has(assignment.id)) {
                    sessions.set(assignment.id, {
                        source: 'individual',
                        assignment_id: assignment.id,
                        date: assignment.date,
                        routine: { id: assignment.routine.id, name: assignment.routine.name },
                        exercises: [],
                    });
                }

                // sets es la PRESCRIPCION del coach (D7): el modelo no registra la carga real
                sessions.get(assignment.id)!.exercises.push({
                    routine_exercise_id: finished.routine_exercise_id,
                    exercise: {
                        id: finished.routineExercise.exercise.id,
                        name: finished.routineExercise.exercise.name,
                    },
                    user_note: finished.user_note ?? null,
                    finished_at: finished.created_at,
                    sets: finished.routineExercise.exerciseSets.map(exerciseSet => ({
                        set_order: exerciseSet.set_order,
                        set_count: exerciseSet.set_count,
                        rep_count: exerciseSet.rep_count,
                        weight: exerciseSet.weight ?? null,
                        rm_perc: exerciseSet.rm_perc ?? null,
                        rpe: exerciseSet.rpe ?? null,
                        rir: exerciseSet.rir ?? null,
                        amrap: exerciseSet.amrap,
                        amrap_time: exerciseSet.amrap_time ?? null,
                        rm: exerciseSet.rm,
                    })),
                });
            }

            return res.status(200).send([...sessions.values()]);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener el historial de entrenamientos.' });
        }
    }
```

- [ ] **Paso 3: Compilar y correr `verify-history-rules.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-history-rules.js"
```

Esperado: build en verde; `verify-history-rules.js` con `N ok, 0 fallas` (N ≈ 45) y **el SQL impreso**. **Leer el SQL a ojo antes de seguir**: los cinco `JOIN`, el `LEFT JOIN` de las series, el `WHERE` (con y sin ejercicio) y el `ORDER BY`. Si un chequeo del SQL falla por una diferencia de comillas, de espacios o de alias entre lo que arma TypeORM y la expresión regular, se ajusta la regex *después* de leer el SQL y confirmar que dice lo mismo; si la diferencia es de fondo (una condición que falta, un `active` que se coló, un orden invertido), se corrige el service.

---

## Tarea 4: El controller y su Swagger

**Archivos:**
- Modificar: `power-app/src/routine/routine.controller.ts`

- [ ] **Paso 1: Imports**

Junto a los otros imports de DTOs:

```ts
import { GetTrainingHistoryQueryDto } from '../dtos/routine/get_training_history_query.dto';
import { RoutineHistorySessionDto } from '../dtos/routine/routine_history_response.dto';
```

(`AssignedRoutinesParamsDto` ya está importado desde BE-12.)

- [ ] **Paso 2: El handler, al final de la sección `ASIGNACION INDIVIDUAL A UN ALUMNO`, después de `getAssignedRoutines`**

```ts
    // Historial de entrenamientos del alumno (E-06) y su filtro por ejercicio (E-07). Solo coach y
    // admin: gimnasio compartido (D6), cualquiera ve el de cualquier alumno. Las dos rutas de dos
    // segmentos no compiten con 'GET /:id'
    @Get('history/:userId')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: [RoutineHistorySessionDto], description: 'Las sesiones con al menos un ejercicio hecho, de la más nueva a la más vieja (día descendente y nombre de rutina). Sin historial, un array vacío' })
    @ApiResponse({ status: 400, description: 'El id del alumno o el exercise_id no son UUID válidos' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async getTrainingHistory(
        @Param() params: AssignedRoutinesParamsDto,
        @Query() query: GetTrainingHistoryQueryDto,
        @Res() res: Response,
    ) {
        await this.routineService.getTrainingHistory(params.userId, query, res);
    }
```

- [ ] **Paso 3: Compilar y correr `verify-history-controller.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-history-controller.js"
```

Esperado: build en verde; `0 fallas`. Si falla el chequeo de `await`, el handler tiene un `return`: **sacarlo** (regla de BE-04).

---

## Tarea 5: Barrido final del código

**Archivos:** ninguno nuevo.

- [ ] **Paso 1: Build limpio y todos los scripts seguidos** (los tres nuevos y los quince de BE-11 a BE-14, como regresión)

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build >/dev/null 2>&1; echo "build exit=$?"
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-history-dto verify-history-rules verify-history-controller verify-finished-dto verify-finished-rules verify-finished-typeorm verify-finished-controller verify-builders verify-detail-rules verify-detail-sql verify-detail-controller verify-assigned-dto verify-assigned-rules verify-assigned-controller verify-dto verify-rules verify-typeorm verify-controller; do echo "=== $f: $(node "$S/$f.js" 2>&1 | tail -1)"; done
```

Esperado: `build exit=0` y dieciocho `N ok, 0 fallas`. Los quince de antes dan lo mismo (21, 102, 32, 41, 10, 46, 16, 24, 24, 58, 27, 58, 62, 19, 30). Anotar los conteos para el Status.

- [ ] **Paso 2: Nada se escapó de lo acordado**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git status --short
git diff --stat -- "Db Creator" power-app/src/entities power-app/src/routine/routine.module.ts power-app/src/planification power-app/src/exercise
grep -n "return this.routineService" power-app/src/routine/routine.controller.ts
grep -rn "La cuenta está deshabilitada" power-app/src/routine power-app/src/dtos/routine
```

Esperado:
- `git status`: sólo los 2 DTOs nuevos, `routine.service.ts` y `routine.controller.ts` (los Status todavía no).
- `git diff --stat` de `Db Creator`, las entidades, `routine.module.ts`, `planification/` y `exercise/`: **vacío**.
- `return this.routineService` y `La cuenta está deshabilitada`: **sin resultados**.

---

## Tarea 6: Status (informe y dashboard)

**Archivos:**
- Modificar: `Status/estado-implementacion-backend.md`
- Modificar: `Status/dashboard-estado-backend.html`

Los números: ✅ 63 → **65**, ⬜ 2 → **0**, 🟡 7, 🔵 2, sin backend 1. Porcentajes: ✅ 65/75 = **87%**, 🟡 **9%**, 🔵 **3%**, ⬜ **0%**, sin backend **1%** (suman 100). Sobre los CU con backend: 65/74 = **88%**. Entrenador: ✅ 28 → **30**, ⬜ 2 → **0**, 🔵 2 (30/32 = **94%**). Pendientes: 9 (7 parciales, 2 andamiaje, 0 sin implementar). **El corte queda en 2026-10-18.** Con esto **no queda ningún CU sin endpoint** en el backend.

- [ ] **Paso 1: Informe: resumen y cobertura**

En `estado-implementacion-backend.md`:
1. Tabla de resumen: `| ✅ Implementado | 63 | 84% |` → `| ✅ Implementado | 65 | 87% |`; `| ⬜ No implementado | 2 | 3% |` → `| ⬜ No implementado | 0 | 0% |`.
2. Línea de «63 de los 74»: `**63 de los 74 CU con backend están completos (85%).** Faltan 11: 7 parciales, 2 en andamiaje y 2 sin implementar.` → `**65 de los 74 CU con backend están completos (88%).** Faltan 9: 7 parciales y 2 en andamiaje; ya no queda ninguno sin endpoint.`
3. Cobertura por rol: `| Entrenador | 32 | 28 | 0 | 2 | 2 | 0 | 88% |` → `| Entrenador | 32 | 30 | 0 | 2 | 0 | 0 | 94% |`; `| **Total** | **75** | **63** | **7** | **2** | **2** | **1** | **85%** |` → `| **Total** | **75** | **65** | **7** | **2** | **0** | **1** | **88%** |`.

- [ ] **Paso 2: Informe: entrada nueva en "Cambios recientes"**, justo arriba de la de BE-14 (`## Cambios recientes (2026-10-18 · rutina individual: marcar, desmarcar y nota)`)

```markdown
## Cambios recientes (2026-10-18 · rutina individual: historial del entrenador · cierra el bloque A)

- **Decimosexta tarea del roadmap (BE-16): E-06 y E-07 pasan a ✅, y se cierra el bloque A (hito H2).** `GET /routine/history/:userId?exercise_id=` (spec del 17/10, §4.7), en `routine.controller.ts` y `routine.service.ts`. Plan: `Doc/plans/2026-10-18-be-16-historial-del-entrenador-plan.md` (repo PowerApp-Docs). Conteos: ✅ 63 → **65** y ⬜ 2 → **0**: **ya no queda ningún CU sin endpoint**. El Entrenador sube de 88% a 94%. Salvedad: como en U-09/U-10 y U-12/U-13, el historial de la **vía del plan** es del bloque B (spec §8); E-06 y E-07 pasan a ✅ porque así lo fija la spec (§11) para el cierre del bloque A.
- **El contrato.** Sólo coach y admin (gimnasio compartido, D6: cualquiera ve el historial de cualquier alumno). `404` si el usuario no existe. `200` con un array de **sesiones**, de la más nueva a la más vieja (día descendente y nombre de rutina), cada una `{ source: 'individual', assignment_id, date, routine: { id, name }, exercises: [{ routine_exercise_id, exercise: { id, name }, user_note, finished_at, sets: [...] }] }`. Hoy una sesión es **una asignación individual con al menos un ejercicio hecho**. `sets` son los diez campos de la prescripción, sin `id`. Con `exercise_id` (E-07) sólo vuelven las sesiones donde el alumno hizo ese ejercicio y, en cada una, únicamente ese; sin coincidencias, `[]`. Un `exercise_id` que no existe también da `[]`, no `404`.
- **La forma ya está preparada para el bloque B.** `source` se documenta como `'individual'` o `'plan'`: las sesiones de plan se sumarán a la misma lista, con campos extra, sin cambiar la forma. El web puede tipar el contrato definitivo una sola vez.
- **Lo dado de baja aparece igual.** La consulta no filtra por **ningún** `active` (rutina, circuito, vínculo, ejercicio ni cuenta del alumno) y ni siquiera une `Circuit` ni `Routine_Circuit`: si el alumno hizo un ejercicio, está en su historial aunque el coach lo haya sacado después (regla del 27/8, spec §6).
- **Una sola consulta con joins**, que parte del "hecho" y baja hasta las series (todo `INNER` salvo las series, porque un ejercicio puede no tenerlas); el service agrupa las filas por asignación. **Por qué:** el grafo se hidrata solo y la consulta se puede probar entera sin base (ver abajo). Dentro de una sesión los ejercicios van **en el orden en que el alumno los marcó** (la spec no lo fijaba; el orden de la rutina no sirve porque los vínculos apagados no conservan su posición).
- **Limitación conocida: `sets` es la prescripción *actual*, no una foto** (D7: el modelo no registra la carga real). Como las series cuelgan del ejercicio de la rutina, **si el coach edita las series de un circuito después, el historial viejo muestra la prescripción nueva**. No es un error de esta tarea —el modelo no versiona—, pero un entrenador que lea el historial de hace un mes tiene que saberlo. Si algún día importa, hace falta guardar la carga hecha (post-MVP, D7).
- **Sin cambios de esquema:** `Db Creator/`, las entidades y `routine.module.ts` no se tocaron. Specs de CU reescritas en `Use Cases/` (repo PowerApp-Docs): **E-06 y E-07**, con la precondición «gimnasio compartido». Las de **E-03, E-04 y E-05** (misma precondición vieja) siguen para BE-38.
- **Hallazgo 2 reescrito, no cerrado.** La vía individual queda completa (BE-14 escribe, BE-13 y BE-16 leen). Sigue abierta **sólo la vía del plan** (bloque B).
- **Fase 2 cerrada.** BE-09 a BE-16 están hechas: el flujo puntual de punta a punta (asignar → ver → marcar → nota → historial) tiene código. La siguiente tarea del roadmap es **BE-17** (la spec y el plan del bloque B: asignar planificaciones), que necesita decisiones tuyas (DB1 a DB4) antes de escribir código.
- **Para el web.** B6 (historial del alumno) ya puede tipar contra el Swagger de este endpoint.
- **Verificación, sin levantar el server.** Hecho:
  - Build en verde.
  - {N_HDTO} chequeos del query con el `ValidationPipe` real.
  - {N_HRULES} chequeos de la consulta completa, con un `DataSource` real **sin conexión**: se intercepta la ejecución y se devuelven **filas crudas** (con los alias del `SELECT`, como las devuelve Postgres) que el **transformador real de TypeORM** convierte en entidades. Así se probaron juntos **el SQL** (impreso, leído y verificado con sus parámetros), **la hidratación** del grafo (agrupa por hecho, anida asignación, rutina, ejercicio y series, `[]` cuando no hay series, `weight` como número, `date` como `'YYYY-MM-DD'`) y **el armado de la respuesta** (la forma exacta de cada nivel, el orden, el filtro por ejercicio y que **no aparece ningún `active`**). Es más de lo que se pudo verificar en BE-12 y BE-13.
  - {N_HCTRL} chequeos del controller: ruta, sólo coach y admin (el alumno no), sin `@Owner`, que le pasa al service el id y el query, `await` sin `return` y el Swagger generado.
  - Los tres scripts se corrieron antes **en rojo** ({RED_HDTO}, {RED_HRULES} y {RED_HCTRL} fallas) y después en verde; los quince de BE-11 a BE-14 siguen en verde como regresión.
- **Lo que NO se verificó.**
  - **Nada corrió contra un Postgres ni contra el server.** El SQL se generó y se leyó, no se ejecutó: queda para BE-35, junto con el `ORDER BY` por alias (TypeORM lo reescribe como `"assignment_date" DESC, "routine_name" ASC, …`, que en Postgres es equivalente).
  - El rendimiento del historial con meses de datos no se midió (cada hecho se repite una vez por serie en el resultado). Sin paginación, por spec: el historial de un alumno en un cuatrimestre es chico.
  - El camino completo con datos reales (asignar → marcar → ver el historial) queda para BE-35 con el seed de BE-21.
- **Cambios de estado:** **E-06 y E-07 pasan de ⬜ a ✅.** La fase 2 queda **cerrada**: BE-09 a BE-16 hechas.
```

Reemplazar `{N_*}` y `{RED_*}` por los conteos reales de las Tareas 1 y 5 (no dejar llaves en el texto final).

- [ ] **Paso 3: Informe: detalle de E-06 y E-07, hallazgo 2 y plan de trabajo**

1. Fila de E-06 por:

```markdown
| CU-E-06 | Historial de entrenamientos de alumno | ✅ Implementado | `GET /routine/history/:userId` · las sesiones con al menos un ejercicio hecho, de la más nueva a la más vieja, con la prescripción, la fecha y la nota del alumno · sólo coach y admin · lo dado de baja aparece igual (18/10) · el historial de la vía del plan es del bloque B |
```

2. Fila de E-07 por:

```markdown
| CU-E-07 | Historial entrenamientos — filtro ejercicio | ✅ Implementado | `GET /routine/history/:userId?exercise_id=` · sólo las sesiones donde se hizo ese ejercicio (del catálogo) y, en cada una, sólo ese · `[]` si no hay coincidencias (18/10) |
```

3. **Hallazgo 2**: reemplazar el párrafo completo (empieza con `- **2 · El registro de ejecución: la vía individual ya se escribe`) por:

```markdown
- **2 · El registro de ejecución de la vía del plan: ningún endpoint lo escribe** *(25/8; actualizado 18/10)*. Las dos tablas de ejecución existen desde el 17/10 (BE-10): `Routine_Exercise_Finished` para las planificaciones y `Routine_Asign_Exercise_Finished` para las asignaciones individuales. **La vía individual quedó completa el 18/10:** el alumno marca, desmarca y anota (**U-12** y **U-13**, BE-14), lo lee en el detalle de su asignación (**U-09** y **U-10**, BE-13) y el entrenador lo ve en el historial (**E-06** y **E-07**, BE-16). **Sigue abierta la vía del plan:** ningún endpoint inserta en `Routine_Exercise_Finished`, así que un alumno con una planificación asignada no puede marcar nada ni tiene historial. Es del bloque B (marcar dentro de una planificación, con la validación de que la `Routine_Asignation` sea del mismo plan, y las sesiones `source: 'plan'` del historial). **Consecuencia que sigue vigente:** la rama de baja lógica de CU-E-23 nunca se verificó en runtime; el "hecho" individual existe, pero falta correrlo contra una base con una asignación y datos que el seed no genera (BE-21 y BE-35).
```

4. Tabla "Plan de trabajo", fila de la fase 2: la columna Estado `en curso: BE-10 y BE-10b hechas el 17/10, BE-11, BE-12, BE-13 y BE-14 (con BE-15) el 18/10; sigue BE-16` → `✅ cerrada el 18/10 (BE-10 y BE-10b el 17/10; BE-11 a BE-16 el 18/10)`.

- [ ] **Paso 4: Dashboard**

En `dashboard-estado-backend.html`:
1. Tarjetas de arriba: **Implementado** `<div class="n">63</div>` → `65` y `84% · cumple su spec` → `87% · cumple su spec`; **No implementado** `<div class="n">2</div>` → `0` y `3% · sin endpoint` → `0% · sin endpoint`.
2. `aria-label` de la barra: `63 implementados, 7 parciales, 2 andamiaje, 2 no implementados` → `65 implementados, 7 parciales, 2 andamiaje, 0 no implementados`.
3. Barra: `s-done` `width:84.00%` → `86.67%`, y **se quita** el segmento `s-missing` (`width:2.67%`); los otros tres no cambian (9.33 + 2.67 + 1.33 → suma 100).
4. Leyenda de la barra: `<b>63 de los 74</b> CU con backend completos (85%)` → `<b>65 de los 74</b> CU con backend completos (88%)`; `<b>11</b> pendientes (7 parciales, 2 andamiaje, 2 sin endpoint)` → `<b>9</b> pendientes (7 parciales, 2 andamiaje) · ninguno sin endpoint`.
5. Tarjeta del **Entrenador**: `role-pct` `88%` → `94%`; `role-sub`: `28 de 32 · circuitos, rutinas, planificaciones y la asignación individual cerrados; faltan las asignaciones de planificaciones (E-13, E-14) y el historial (E-06, E-07)` → `30 de 32 · circuitos, rutinas, planificaciones, la asignación individual y el historial cerrados; faltan las asignaciones de planificaciones (E-13, E-14)`; `mini-bar`: `width:87.50%` → `93.75%` y **se quita** el segmento del faltante (`width:6.25%;background:var(--missing-line)`); leyenda: `<b>28</b> impl.` → `<b>30</b> impl.` y **se quita** `<b>2</b> falta`.
6. Filas de **E-06** y **E-07**: el chip pasa de `class="chip missing"` / `No implementado` a `class="chip done"` / `Implementado`, y las celdas de endpoint a:

```html
<td class="endpoint"><span class="verb">GET</span> /routine/history/:userId <span class="muted">· las sesiones con al menos un ejercicio hecho, de la más nueva a la más vieja, con la prescripción, la fecha y la nota · sólo coach y admin · lo dado de baja aparece igual · la vía del plan es del bloque B (18/10)</span></td>
```
```html
<td class="endpoint"><span class="verb">GET</span> /routine/history/:userId?exercise_id= <span class="muted">· sólo las sesiones donde se hizo ese ejercicio y, en cada una, sólo ese; <code>[]</code> si no hay (18/10)</span></td>
```

7. Fila de la fase 2 en el "Plan de trabajo": el chip `<span class="chip partial"><span class="cd"></span>En curso · BE-10, BE-10b, BE-11, BE-12, BE-13 y BE-14 hechas</span>` → `<span class="chip done"><span class="cd"></span>Cerrada 18/10</span>`.
8. Hallazgo 2: el título `25/8, actualizado 18/10 — el registro de ejecución: la vía individual ya se escribe` → `25/8, actualizado 18/10 — el registro de ejecución de la vía del plan: ningún endpoint lo escribe`, y el párrafo siguiente (`<p>Las dos tablas de ejecución existen desde el 17/10 (BE-10): …`) por:

```html
<p>Las dos tablas de ejecución existen desde el 17/10 (BE-10): <code>Routine_Exercise_Finished</code> para las planificaciones y <code>Routine_Asign_Exercise_Finished</code> para las asignaciones individuales. <b>La vía individual quedó completa el 18/10:</b> el alumno marca, desmarca y anota (<b>U-12</b> y <b>U-13</b>, BE-14), lo lee en el detalle de su asignación (<b>U-09</b> y <b>U-10</b>, BE-13) y el entrenador lo ve en el historial (<b>E-06</b> y <b>E-07</b>, BE-16). <b>Sigue abierta la vía del plan:</b> ningún endpoint inserta en <code>Routine_Exercise_Finished</code>, así que un alumno con una planificación asignada no puede marcar nada ni tiene historial. Es del bloque B. Sigue vigente que la baja lógica de CU-E-23 nunca se probó en runtime: el "hecho" individual existe, pero falta correrlo contra una base con una asignación y datos que el seed no genera (BE-21, BE-35).</p>
```

9. Pie: `63 impl · 7 parc · 2 andam · 2 falta · 1 sin backend` → `65 impl · 7 parc · 2 andam · 0 falta · 1 sin backend`.

- [ ] **Paso 5: Barrido para no dejar números viejos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status"
grep -n "63 impl\|63 de los\|11 pendientes\|2 sin endpoint\|2 falta\|sigue BE-16\|BE-14 hechas\|{N_\|{RED_" dashboard-estado-backend.html estado-implementacion-backend.md | cut -c1-200
```

Cada coincidencia que quede tiene que ser una entrada **histórica** de "Cambios recientes" (no se reescriben) o una referencia a otro tema; cualquier otra se corrige. En el informe no puede quedar ningún `{N_` ni `{RED_`. Después, **recargar el dashboard desde el archivo** en el panel del navegador (`navigate` a `file:///…`; el panel puede tener una copia vieja) y leer con `javascript_tool` las tarjetas, la barra (que sume 100), la tarjeta del Entrenador, la fase 2 y las filas de E-06 y E-07.

---

## Tarea 7: Specs de CU (repo PowerApp-Docs)

**Archivos:**
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\entrenador\CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md`
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\entrenador\CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md`

Spec §7: "E-06, E-07: el historial muestra la **prescripción**, la fecha y la nota del alumno (D7)" y "E-03 a E-07: la precondición «alumno vinculado al coach» pasa a «gimnasio compartido» (D6)". Se saca la mención a `User_Routine` (eliminada, D11) y al flag `finished` de la serie (no existe: el hecho es por ejercicio).

- [ ] **Paso 1: Reescribir `CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md`**

```markdown
# CU-E-06 — Consultar historial de entrenamientos de alumno

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Muestra el historial de entrenamientos de un alumno: las sesiones en las que marcó al menos un ejercicio como realizado, de la más reciente a la más antigua, con los ejercicios que hizo, la prescripción del entrenador, la fecha y la nota que el alumno dejó. El sistema no registra la carga real que usó el alumno: lo que muestra de cada serie es lo prescrito.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de las sesiones del alumno con al menos un ejercicio realizado, y de esos ejercicios con sus series prescritas y la nota del alumno.

**Fuera de alcance:**

- Edición de la ejecución del alumno.
- Registrar o mostrar la carga real (peso y repeticiones efectivamente realizados).
- Filtrar por ejercicio (CU «Consultar historial de entrenamientos — Filtro por ejercicio»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe.
- El gimnasio es compartido: cualquier entrenador puede consultar el historial de cualquier alumno.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre el historial de entrenamientos del alumno.
2. El sistema recupera las sesiones del alumno con al menos un ejercicio realizado y, de cada una, los ejercicios realizados con su prescripción y la nota del alumno.
3. El sistema presenta el historial ordenado de la sesión más reciente a la más antigua.

## Caminos alternativos / excepciones

### En el paso 2 — El alumno no existe

1. El sistema informa que no se encontró el alumno.

### En el paso 2 — Sin historial

1. El alumno no registra entrenamientos.
2. El sistema muestra un estado vacío.

### En el paso 2 — Lo dado de baja que el alumno hizo

1. El entrenador dio de baja la rutina, sacó un circuito o sacó un ejercicio después de que el alumno lo hizo.
2. El sistema lo muestra igual: si el alumno lo realizó, forma parte de su historial.

### En el paso 3 — Dos sesiones el mismo día

1. El alumno tuvo más de una rutina asignada el mismo día.
2. El sistema las presenta como sesiones separadas, ordenadas por el nombre de la rutina.
```

- [ ] **Paso 2: Reescribir `CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md`**

```markdown
# CU-E-07 — Consultar historial de entrenamientos — Filtro por ejercicio

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Variante de «Consultar historial de entrenamientos de alumno» que acota el historial a un ejercicio puntual del catálogo: sólo las sesiones donde el alumno lo hizo y, en cada una, únicamente ese ejercicio, con su prescripción, la fecha y la nota del alumno.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Filtrado del historial de entrenamientos del alumno por un ejercicio específico del catálogo.

**Fuera de alcance:**

- Otros filtros del historial.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe.
- El gimnasio es compartido: cualquier entrenador puede consultar el historial de cualquier alumno.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador selecciona un ejercicio para filtrar el historial.
2. El sistema recupera las sesiones del alumno donde realizó ese ejercicio y, de cada una, únicamente ese ejercicio.
3. El sistema presenta el historial filtrado, de la sesión más reciente a la más antigua, con la fecha, la prescripción (series, repeticiones, peso) y la nota del alumno.

## Caminos alternativos / excepciones

### En el paso 2 — El alumno no existe

1. El sistema informa que no se encontró el alumno.

### En el paso 2 — Sin registros para el ejercicio

1. El alumno no entrenó ese ejercicio.
2. El sistema muestra un estado vacío.

### En el paso 2 — El ejercicio aparece más de una vez en una sesión

1. La rutina incluye el mismo ejercicio del catálogo en más de un lugar y el alumno lo realizó en varios.
2. El sistema los muestra todos dentro de esa sesión, en el orden en que el alumno los marcó.
```

---

## Tarea 8: Dejar todo stageado, memoria y cierre

**Archivos:** ninguno nuevo. **No se commitea ni se pushea.**

- [ ] **Paso 1: Stagear sólo los archivos propios, en cada repo**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git add power-app/src/dtos/routine/get_training_history_query.dto.ts \
        power-app/src/dtos/routine/routine_history_response.dto.ts \
        power-app/src/routine/routine.service.ts \
        power-app/src/routine/routine.controller.ts \
        Status/estado-implementacion-backend.md \
        Status/dashboard-estado-backend.html
git status --short

cd "D:/Power App/Docs/PowerApp-Docs"
git add "Doc/plans/2026-10-18-be-16-historial-del-entrenador-plan.md" \
        "Use Cases/entrenador/CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md" \
        "Use Cases/entrenador/CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md"
git status --short
```

Esperado: el backend con 6 archivos (`A` los 2 DTOs, `M` el resto); el de docs con los 3 de BE-16. Si `git status` muestra algo más que no sea propio, no se stagea.

- [ ] **Paso 2: Actualizar la memoria del proyecto**

En `C:\Users\caram\.claude\projects\D--Power-App-Backend-PowerApp-Backend\memory\` (**leer primero**: otra sesión puede haberla tocado): actualizar `project_cu_status.md` y su línea del `MEMORY.md` para que digan que **el bloque A está cerrado** (BE-16 hecha: E-06 y E-07 en ✅; 65 ✅ · 7 🟡 · 2 🔵 · 0 ⬜), que `sets` del historial es la prescripción *actual* (limitación conocida), y que **sigue BE-17** (spec y plan del bloque B, que necesita las decisiones DB1 a DB4 del usuario). Agregar la técnica de verificación nueva: *una consulta de TypeORM se puede probar entera sin base interceptando `SelectQueryBuilder.prototype.getMany` y pasándole filas crudas al `RawSqlResultsToEntityTransformer`* (prueba SQL, hidratación y armado de la respuesta).

- [ ] **Paso 3: Proponer los mensajes de commit (uno por repo) y cerrar**

Backend:

```
BE-16: historial de entrenamientos del alumno para el entrenador (E-06 y E-07), GET /routine/history/:userId

Las sesiones con al menos un ejercicio hecho, de la mas nueva a la mas vieja, con la prescripcion, la fecha y la nota; con exercise_id solo ese ejercicio. Lo dado de baja aparece igual. Cierra el bloque A. Status: E-06 y E-07 pasan a implementado (65 de 74) y no queda ningun CU sin endpoint.
```

PowerApp-Docs:

```
Plan de BE-16 y specs de E-06 y E-07 reescritas para el historial por sesiones, con la prescripcion y la nota del alumno
```

Reportar al usuario: qué quedó, qué se verificó (los dieciocho scripts y el build, con sus conteos), qué **no** (nada corrió contra Postgres; el `ORDER BY` por alias en vivo; el rendimiento), la limitación conocida de `sets`, y la tarea siguiente: **BE-17**, la spec y el plan del bloque B (asignar planificaciones), que necesita las decisiones DB1 a DB4 del usuario antes de escribir código.

---

## Autorrevisión del plan contra la spec

**Cobertura de la spec:**
- §4 tabla de rutas: `GET /routine/history/:userId`, coach y admin → Tarea 4, `verify-history-controller` (roles, sin `@Owner`, argumentos).
- §4.7: `404` si el usuario no existe; `exercise_id` opcional y UUID válido (`400` si no); sesiones con al menos un ejercicio hecho, de la más nueva a la más vieja (día descendente y nombre de rutina); la forma exacta `{ source, assignment_id, date, routine, exercises: [{ routine_exercise_id, exercise, user_note, finished_at, sets }] }`; `finished_at` = `created_at` de la fila; `sets` = prescripción con sus diez campos; con `exercise_id` sólo ese ejercicio y `[]` si no hay; lo dado de baja aparece igual; forma preparada para el bloque B (`source`); sin paginación → Tareas 2 y 3, `verify-history-dto` y `verify-history-rules` (SQL, hidratación y respuesta).
- §6: lo dado de baja que el alumno completó se sigue viendo; las asignaciones sobreviven a la baja de la rutina y al cierre de la cuenta → ningún `active` en el SQL (comprobado).
- §7 (E-06, E-07 con la prescripción, la fecha y la nota; precondición «gimnasio compartido») → Tarea 7. E-03 a E-05: BE-38 (declarado).
- §9/§10/§11: Status por tarea (E-06 y E-07 a ✅, conteos, hallazgo 2, cierre de la fase 2), SQL de la consulta nueva generado sin conectarse (y leído), verificación sin levantar el server → Tareas 1 a 6.
- Encargos transversales: `await` sin `return` (`verify-history-controller`), mensajes en español con `{ error }`, `@Auth` por endpoint, `Db Creator` y entidades sin cambios (comprobado en la Tarea 5).
- §8 (historial de las sesiones de plan) y todo el bloque B: **fuera de alcance**.

**Placeholders:** el único texto con llaves son los conteos `{N_*}` y `{RED_*}` del Status, que el paso 2 de la Tarea 6 manda reemplazar con la salida real de los scripts y el paso 5 verifica que no queden.

**Consistencia de nombres:** `getTrainingHistory` (service, controller y scripts), `GetTrainingHistoryQueryDto`, `RoutineHistorySessionDto` / `RoutineHistoryExerciseDto` / `RoutineHistorySetDto` / `RoutineHistoryCatalogExerciseDto` / `RoutineHistoryRoutineDto`, `AssignedRoutinesParamsDto` (de BE-12). Los alias de la consulta (`finished`, `assignment`, `routine`, `routineExercise`, `exercise`, `exerciseSet`) son los mismos en el service y en las filas crudas de `verify-history-rules.js`. El constructor del service **no cambia**: el script lo arma con los mismos seis argumentos que los anteriores (`circuit`, `routine`, `dataSource`, `user`, `assignment`, `finished`).
