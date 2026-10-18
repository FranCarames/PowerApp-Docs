# BE-12 — Listado de las rutinas asignadas a un alumno (parte individual de CU-U-08) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` de los archivos propios y se propone el mensaje (Tarea 8).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. No se instala nada para verificar.
> 3. **No se levanta el server.** Ni siquiera en segundo plano. Los scripts no abren puertos ni se conectan a ninguna base.

> **Registro de ejecución (18/10):** plan aprobado sin cambios. Qué pasó respecto de lo escrito abajo:
> - **Tarea 1, rojo:** `verify-assigned-dto` 1 falla (los módulos no existían), `verify-assigned-rules` 24 y `verify-assigned-controller` 10.
> - **Verde final:** build en 0; `verify-assigned-dto` 24 ok, `verify-assigned-rules` 58, `verify-assigned-controller` 27, todos con 0 fallas. Regresión de BE-11: `verify-dto` 58, `verify-rules` 62, `verify-typeorm` 19 y `verify-controller` 30 (uno menos, por la línea que se borró), todos con 0 fallas.
> - **SQL leído a ojo (Tarea 3):** los tres sale como se esperaba, sin filtro por `Routine.active` ni por `User.active`. La única diferencia con la intuición, ya contemplada en el plan, es el alias del orden por nombre de rutina.
> - **Tarea 5:** `Db Creator`, las entidades, `routine.module.ts` y `planification/` sin diferencias; ningún `return this.routineService`; el texto reservado del 403 no aparece.
> - **Dashboard:** verificado renderizado, recargando el archivo en el panel del navegador (la copia anterior del panel estaba desactualizada): las barras suman 100 y las filas de U-08, E-19 y E-20 salen como se esperaba.
> - **Sin otros desvíos:** el código quedó como está escrito en las Tareas 2 a 4.

**Spec que manda:** [`2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md`](../specs/2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md), §2 (D6), §4 (la tabla de rutas y §4.3), §6, §7 (U-08), §9, §10 y §11. **Plan anterior (mismo bloque):** [`2026-10-18-be-11-asignar-rutina-individual-plan.md`](2026-10-18-be-11-asignar-rutina-individual-plan.md): esta tarea reutiliza su validador `@IsCalendarDay()`, su helper de scripts (`lib.js`) y su forma de armar un `DataSource` sin conectarse.
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde contradice a la spec, manda la spec (ver el hallazgo 1).

**Goal:** que el alumno (y su entrenador) puedan listar las rutinas individuales asignadas, opcionalmente entre dos fechas, cada una con su progreso (`finished` de `total` ejercicios): `GET /routine/assigned/:userId?from=&to=`.

**Architecture:** un método nuevo en `RoutineService` y un handler en `RoutineController`, más tres DTOs. **Tres consultas y la cuenta en memoria:** (1) las asignaciones del alumno con su rutina, ordenadas; (2) los ejercicios vigentes de las rutinas que aparecen; (3) los ejercicios hechos de esas asignaciones. `total` y `finished` salen de conjuntos de ids (ver la decisión n1). Autorización: `@Auth(user, coach, admin)` + `@Owner('userId')`. Sin cambios de esquema: **`Db Creator` y las entidades no se tocan**.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` · scripts de Node en el scratchpad que corren sobre `power-app/dist`.

---

## 1. Estado de partida y hallazgos al preparar el plan

**Estado de partida (verificado el 18/10):** BE-11 ya está commiteada (`17764a2`) y el árbol está limpio. Existe `@IsCalendarDay()` / `isCalendarDay` en `dtos/routine/is_calendar_day.decorator.ts`, el índice `idx_rau_user_date (user_id, date)` y `Routine_Asign_Exercise_Finished`.

1. **El roadmap y la spec difieren en el lugar y el alcance.** El roadmap (BE-12) habla de reemplazar el andamiaje `GET /planification/user/:id/active` por "el home del alumno" con "el progreso de hoy"; la spec (§4, §4.3, §9) fija `GET /routine/assigned/:userId?from=&to=` **en `routine/`**, con el rango que manda el cliente. Manda la spec. Consecuencia: **los andamiajes de `planification.controller.ts` (`/user/:id` y `/user/:id/active`) no se tocan**; son de la vía plan (BE-19 y BE-20) y siguen colgando.
2. **`total` es una unión de conjuntos, no una resta.** La spec (§4.3) lo define como "los activos de los circuitos activos de la rutina, contando cada ejercicio una vez, más los dados de baja que el alumno completó". Un circuito repetido en la rutina (A, B, A) comparte sus filas de `Routine_Exercise`, y un ejercicio completado puede ser a la vez activo. Por eso se cuenta `|activos ∪ hechos|` por **ids distintos** y no `activos + hechos`.
3. **Hay un caso borde que la spec no resuelve y queda para BE-13.** Si el coach saca un circuito de la rutina (el `Routine_Circuit` queda inactivo) *después* de que el alumno completó algo de él, el §4.4 manda mostrar ese vínculo en el detalle. Sus ejercicios *activos y sin hacer* **no cuentan** en `total` (el §4.3 dice "circuitos activos"), pero BE-13 podría mostrarlos como pendientes. La recomendación para BE-13 es mostrar, dentro de un vínculo oculto, **sólo lo completado**, así el detalle y el `total` coinciden. Se anota en el Status.
4. **`ParameterIdDto` no sirve para esta ruta.** Llama `id` a su parámetro, y `@Owner` necesita el nombre del parámetro del path, que en la spec es `userId`. Hace falta un DTO de parámetros propio (el precedente es `UserExerciseParamsDto`, que llama `idUser` al suyo).
5. **El `getMany` con un `select` parcial necesita la clave primaria.** TypeORM agrupa las filas por `id`: si la consulta de "hechos" seleccionara sólo dos columnas sin `id`, `getMany` colapsaría filas. Las dos consultas de progreso usan `getRawMany` con alias explícitos; la del listado trae `assignment.*`, que ya incluye `id`.
6. **U-08 pasa de 🔵 a 🟡, no a ✅** (spec §11): la parte del plan sigue colgando hasta BE-20. Los conteos: 🟡 8 → 9 y 🔵 3 → 2; los ✅ siguen en 59.
7. **El listado también es de E-19 y E-20** (spec §4, tabla de rutas): es el que le permite al coach "abrir la rutina" que va a quitar. Las specs de E-19 y E-20 que se reescribieron en BE-11 decían que listar quedaba fuera de alcance; se ajustan dos líneas.

## 2. Decisiones menores (se pueden vetar)

| # | Decisión | Por qué |
|---|---|---|
| n1 | **El progreso se calcula en memoria, con dos consultas auxiliares** (una de ejercicios vigentes por rutina, una de hechos por asignación) y no con un `COUNT` en SQL | `total` es una unión de conjuntos de ids; en SQL pide subconsultas correlacionadas por fila. En memoria se prueba con filas armadas (los casos borde son lo que importa) y el SQL de las tres consultas se verifica como texto. Costo: las filas son del orden de (rutinas distintas × ejercicios), decenas |
| n2 | **`total` sigue el §4.3 al pie de la letra** (hallazgo 3) | Es lo aprobado. El caso borde se resuelve con el detalle (BE-13) |
| n3 | **`from > to` se rechaza con `400` antes de buscar al usuario** | Es una validación que no depende de la base (mismo criterio que `createRoutine`). Un `from`/`to` mal formado ya lo corta el `ValidationPipe` |
| n4 | **Desempate extra por `created_at`** después de `date` y nombre de rutina | La spec ordena por `date` y nombre; dos rutinas distintas con el mismo nombre el mismo día quedarían en orden indefinido |
| n5 | **`routine` trae `{ id, name, active }`** acá (el alta y la baja de BE-11 traen `{ id, name }`) | Es lo que dice la spec; el flag `active` informa que el coach dio de baja la rutina después de asignarla |
| n6 | **Una rutina de baja se lista igual** (con `routine.active: false`), y también si la cuenta del alumno está cerrada | Spec §4.3 y §6: las asignaciones sobreviven a la baja de la rutina y al cierre de la cuenta |
| n7 | **Un usuario que existe pero no es alumno** (un coach, por ejemplo) devuelve `200` con `[]` | La spec sólo pide `404` si el usuario no existe; una lista vacía es lo coherente |
| n8 | **Archivos nuevos en `dtos/routine/`:** `assigned_routines_params.dto.ts`, `get_assigned_routines_query.dto.ts`, `routine_assigned_list_item_response.dto.ts` | Mismo patrón que `dtos/user_rm/user_exercise_params.dto.ts` y `get_routines_query.dto.ts` |
| n9 | **Se ajustan dos líneas de las specs de E-19 y E-20** (hallazgo 7) | Para que no contradigan al listado |
| n10 | **El Status deja a U-08 en 🟡** y el dashboard quita el segmento de andamiaje de la tarjeta del Usuario | Hallazgo 6 |

## 3. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/dtos/routine/assigned_routines_params.dto.ts` | **Nuevo.** Param `userId` (UUID) |
| `power-app/src/dtos/routine/get_assigned_routines_query.dto.ts` | **Nuevo.** `from` y `to` opcionales con `@IsCalendarDay()` |
| `power-app/src/dtos/routine/routine_assigned_list_item_response.dto.ts` | **Nuevo.** Forma de cada ítem (Swagger) |
| `power-app/src/routine/routine.service.ts` | Método `getAssignedRoutines` y helper `findAssignedRoutinesProgress`; un import |
| `power-app/src/routine/routine.controller.ts` | Handler `getAssignedRoutines` con `@Owner('userId')`; dos imports |
| `Status/estado-implementacion-backend.md` | Entrada nueva, conteos, cobertura por rol, detalle de U-08, E-19 y E-20, plan de trabajo |
| `Status/dashboard-estado-backend.html` | Lo mismo en el dashboard |

**No se tocan:** las entidades, `Db Creator/`, `routine.module.ts` (ya registra todo lo que se usa), `planification.controller.ts`.

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**

| Archivo | Cambio |
|---|---|
| `Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md` | Reescrito (spec §7) |
| `Use Cases/entrenador/CU-E-19-asignar-rutina-a-alumno.md`, `CU-E-20-eliminar-rutina-a-alumno.md` | Una línea cada una (hallazgo 7) |
| `Doc/plans/2026-10-18-be-12-listado-rutinas-por-alumno-plan.md` | Este plan |

## 4. Verificación: cómo se prueba sin levantar nada

Tres scripts nuevos en el scratchpad (más `lib.js`, que ya existe), todos sobre `power-app/dist`. Se escriben **antes** del código y se corren **en rojo** (Tarea 1), después en verde. En la Tarea 5 se vuelven a correr también los **cuatro de BE-11**, como regresión.

| Script | Qué prueba |
|---|---|
| `verify-assigned-dto.js` | Los DTOs de query y de parámetros con el `ValidationPipe` real |
| `verify-assigned-rules.js` | El método del service con un `DataSource` **real pero sin conexión**: las tres consultas se construyen de verdad (se imprime y se verifica su SQL, con sus parámetros) y se **interceptan al ejecutar**, devolviendo filas armadas. Cubre códigos, el orden de las validaciones, la cuenta del progreso y sus casos borde |
| `verify-assigned-controller.js` | Ruta, verbo y roles; `@Owner('userId')` cableado al parámetro correcto y el `OwnerGuard` real (403 / minúsculas / coach y admin); `await` sin `return`; el Swagger generado |

**Lo que no se puede verificar acá:** que el SQL corra en un Postgres real, la hidratación con el driver real y el rendimiento con datos. Queda para BE-35. Va en el Status como "no verificado".

---

## Tarea 0: Preflight

**Archivos:** ninguno.

- [ ] **Paso 1: Los dos repos están limpios y BE-11 está commiteada**

```bash
git -C "D:/Power App/Backend/PowerApp-Backend" status --short
git -C "D:/Power App/Backend/PowerApp-Backend" log --oneline -1
git -C "D:/Power App/Docs/PowerApp-Docs" status --short
```

Esperado: sin salida de `status`; el backend en `17764a2`. Si hay algo sin commitear de otra sesión, **no tocarlo** y registrar qué archivos son antes de seguir.

- [ ] **Paso 2: Lo que el plan da por hecho está en el código y en el esquema**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
grep -n "export function IsCalendarDay\|export function isCalendarDay" power-app/src/dtos/routine/is_calendar_day.decorator.ts
grep -n "idx_rau_user_date" "Db Creator/01_estructura.sql"
grep -n "assigned" power-app/src/routine/routine.controller.ts
ls "C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
```

Esperado: las dos funciones del validador; el índice en el `01`; en el controller **sólo el comentario** que dice que el listado es BE-12 (ninguna ruta); y en el scratchpad `lib.js` más los cuatro `verify-*.js` de BE-11 (`verify-dto`, `verify-rules`, `verify-typeorm`, `verify-controller`).

- [ ] **Paso 3: El build parte en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
```

Esperado: termina sin errores (código de salida 0).

---

## Tarea 1: Los scripts de verificación, en rojo

**Archivos (todos en el scratchpad, fuera de los repos):**
`C:\Users\caram\AppData\Local\Temp\claude\D--Power-App-Backend-PowerApp-Backend\c46f262f-0358-40cb-a6d9-a0418172f7d2\scratchpad\`

- [ ] **Paso 1: Crear `verify-assigned-dto.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

// La misma configuracion que main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const USER = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';

(async () => {
  let Query;
  let Params;

  await run('carga los DTOs', async () => {
    ({ GetAssignedRoutinesQueryDto: Query } = dist('dtos/routine/get_assigned_routines_query.dto'));
    ({ AssignedRoutinesParamsDto: Params } = dist('dtos/routine/assigned_routines_params.dto'));
    check('exporta GetAssignedRoutinesQueryDto', typeof Query === 'function');
    check('exporta AssignedRoutinesParamsDto', typeof Params === 'function');
  });

  if (!Query || !Params) return finish();

  const transform = (value, type, metatype) => pipe.transform(value, { type, metatype });

  const accepts = (name, value, type, metatype, expected) => run(name, async () => {
    const out = await transform({ ...value }, type, metatype);
    check(name, out instanceof metatype && Object.entries(expected).every(([k, v]) => out[k] === v), JSON.stringify(out));
  });

  const rejects = (name, value, type, metatype, text) => run(name, async () => {
    try {
      await transform(value, type, metatype);
      check(name, false, 'no lo rechazó');
    } catch (e) {
      const status = e.getStatus ? e.getStatus() : undefined;
      const response = e.getResponse ? e.getResponse() : { message: e.message };
      const messages = [].concat(response.message).join(' | ');
      check(name, status === 400, 'estado ' + status);
      if (text) check(name + ' (mensaje)', messages.includes(text), messages);
    }
  });

  console.log('-- query (from y to)');
  await accepts('sin filtros', {}, 'query', Query, { from: undefined, to: undefined });
  await accepts('sólo from', { from: '2026-10-19' }, 'query', Query, { from: '2026-10-19', to: undefined });
  await accepts('sólo to', { to: '2026-10-25' }, 'query', Query, { from: undefined, to: '2026-10-25' });
  await accepts('from y to', { from: '2026-10-19', to: '2026-10-25' }, 'query', Query, { from: '2026-10-19', to: '2026-10-25' });
  await accepts('from igual a to', { from: '2026-10-20', to: '2026-10-20' }, 'query', Query, { from: '2026-10-20', to: '2026-10-20' });
  await accepts('29 de febrero bisiesto', { from: '2028-02-29' }, 'query', Query, { from: '2028-02-29' });

  await rejects('from con hora', { from: '2026-10-19T00:00:00Z' }, 'query', Query, 'YYYY-MM-DD');
  await rejects('from inexistente (30 de febrero)', { from: '2026-02-30' }, 'query', Query, 'YYYY-MM-DD');
  await rejects('from en otro formato', { from: '19-10-2026' }, 'query', Query, 'YYYY-MM-DD');
  await rejects('to inválido', { to: 'mañana' }, 'query', Query, 'YYYY-MM-DD');
  await rejects('from vacío (?from=)', { from: '' }, 'query', Query, 'YYYY-MM-DD');
  await rejects('parámetro de más (forbidNonWhitelisted)', { desde: '2026-10-19' }, 'query', Query);

  console.log('\n-- params (userId)');
  await accepts('UUID válido', { userId: USER }, 'param', Params, { userId: USER });
  await accepts('UUID en mayúscula (iOS)', { userId: USER.toUpperCase() }, 'param', Params, { userId: USER.toUpperCase() });
  await rejects('userId no es UUID', { userId: 'abc' }, 'param', Params, 'usuario');
  await rejects('sin userId', {}, 'param', Params);

  finish();
})();
```

- [ ] **Paso 2: Crear `verify-assigned-rules.js`**

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, SelectQueryBuilder, getMetadataArgsStorage } = mod('typeorm');
const { RoutineService } = dist('routine/routine.service');

const NOW = new Date('2026-10-18T12:00:00Z');
const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const R1 = '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01';
const R2 = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const A1 = 'a1a1a1a1-aaaa-4bbb-8ccc-111111111111';
const A2 = 'a2a2a2a2-aaaa-4bbb-8ccc-222222222222';
const A3 = 'a3a3a3a3-aaaa-4bbb-8ccc-333333333333';
const E1 = 'e1e1e1e1-eeee-4eee-8eee-111111111111';
const E2 = 'e2e2e2e2-eeee-4eee-8eee-222222222222';
const E3 = 'e3e3e3e3-eeee-4eee-8eee-333333333333';
const E9 = 'e9e9e9e9-eeee-4eee-8eee-999999999999';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ITEM_KEYS = ['id', 'routine_id', 'user_id', 'date', 'created_at', 'updated_at', 'routine', 'progress'];

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

const assignment = (id, routine_id, date, routine) => ({
  id, routine_id, user_id: USER_ID, date, created_at: NOW, updated_at: NOW, routine,
});
const routineRow = (id, name, active = true) => ({ id, name, active });

(async () => {
  // DataSource REAL pero sin conectarse: las consultas se construyen de verdad
  const dir = path.join(ROOT, 'dist/entities');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) require(path.join(dir, file));
  const entities = getMetadataArgsStorage().tables.map(t => t.target).filter(t => typeof t === 'function');
  const ds = new DataSource({ type: 'postgres', entities });
  await ds.buildMetadatas();

  const { RoutineAsignationUser } = dist('entities/routine_asignation_user.entity');
  const { RoutineAsignExerciseFinished } = dist('entities/routine_asign_exercise_finished.entity');

  // Se intercepta la EJECUCION de los query builders: se guarda el SQL con sus parametros y se
  // devuelven las filas que arma cada caso. La construccion de la consulta es la del service
  let canned = {};
  let executed = [];
  SelectQueryBuilder.prototype.getMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    executed.push({ kind: 'assignments', sql, params });
    if (canned.fail) throw new Error('se cayó la base');
    return canned.assignments || [];
  };
  SelectQueryBuilder.prototype.getRawMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    const kind = sql.includes('"Routine_Circuit"') ? 'active' : 'finished';
    executed.push({ kind, sql, params });
    return (kind === 'active' ? canned.active : canned.finished) || [];
  };

  function build(userFound = true) {
    const userRepository = { findOne: async (o) => { executed.push({ kind: 'user', arg: o.where }); return userFound ? { id: USER_ID } : null; } };
    return new RoutineService({}, {}, ds, userRepository, ds.getRepository(RoutineAsignationUser), ds.getRepository(RoutineAsignExerciseFinished));
  }

  async function list(cfg, query = {}, { userFound = true, userId = USER_ID } = {}) {
    canned = cfg; executed = [];
    const res = makeRes();
    await build(userFound).getAssignedRoutines(userId, query, res);
    return { res, kinds: executed.map(e => e.kind), q: (kind) => executed.find(e => e.kind === kind) };
  }

  async function silencing(fn) {
    const original = console.error;
    let count = 0;
    console.error = () => { count++; };
    try { await fn(); } finally { console.error = original; }
    return count;
  }

  console.log('-- códigos y orden');

  await run('el método existe', async () => {
    check('getAssignedRoutines es función', typeof build().getAssignedRoutines === 'function');
  });

  await run('from posterior a to → 400, sin consultar nada', async () => {
    const r = await list({}, { from: '2026-10-25', to: '2026-10-19' });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje en español con { error }', typeof (r.res.body && r.res.body.error) === 'string' && r.res.body.error.includes('from'), JSON.stringify(r.res.body));
    check('no tocó la base (ni siquiera el usuario)', r.kinds.length === 0, r.kinds.join(','));
  });

  await run('from igual a to → válido', async () => {
    const r = await list({ assignments: [] }, { from: '2026-10-20', to: '2026-10-20' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
  });

  await run('usuario inexistente → 404 sin consultar asignaciones', async () => {
    const r = await list({}, {}, { userFound: false });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: 'Usuario no encontrado' }), JSON.stringify(r.res.body));
    check('sólo buscó al usuario', same(r.kinds, ['user']), r.kinds.join(','));
  });

  await run('sin asignaciones → 200 con [] y sin las consultas de progreso', async () => {
    const r = await list({ assignments: [] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('cuerpo []', same(r.res.body, []), JSON.stringify(r.res.body));
    check('sólo usuario y listado', same(r.kinds, ['user', 'assignments']), r.kinds.join(','));
  });

  await run('error de la base → 500', async () => {
    let r;
    const logged = await silencing(async () => { r = await list({ fail: true }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: 'Error al obtener las rutinas asignadas.' }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  await run('el id del usuario en mayúscula se consulta tal cual y el listado usa el id de la fila', async () => {
    const r = await list({ assignments: [] }, {}, { userId: USER_ID.toUpperCase() });
    check('buscó al usuario con lo que llegó', r.q('user').arg.id === USER_ID.toUpperCase());
    check('filtró por el id de la fila (minúscula)', r.q('assignments').params[0] === USER_ID, JSON.stringify(r.q('assignments').params));
  });

  console.log('\n-- SQL del listado');

  await run('sin filtros', async () => {
    const r = await list({ assignments: [] });
    const { sql, params } = r.q('assignments');
    console.log('        ' + sql.replace(/\s+/g, ' '));
    check('desde Routine_Asignation_User', /FROM "Routine_Asignation_User" "assignment"/.test(sql));
    check('INNER JOIN con la rutina', /INNER JOIN "Routine" "routine" ON "routine"\."id"\s*=\s*"assignment"\."routine_id"/.test(sql));
    check('trae id, name y active de la rutina', ['id', 'name', 'active'].every(c => sql.includes(`"routine"."${c}"`)));
    check('no trae coach_note de la rutina', !sql.includes('"routine"."coach_note"'));
    check('filtra por el alumno', /WHERE "assignment"\."user_id" = \$1/.test(sql));
    check('sin condiciones de fecha', !/"assignment"\."date" [<>]=/.test(sql));
    // TypeORM reescribe el orden por una columna de la rutina unida como su alias del SELECT
    // ("routine"."name" AS "routine_name"); en Postgres ordenar por el alias es equivalente
    check('el nombre de la rutina sale con su alias', sql.includes('"routine"."name" AS "routine_name"'));
    check('orden: día, nombre de rutina y alta', /ORDER BY "assignment"\."date" ASC, "routine_name" ASC, "assignment"\."created_at" ASC/.test(sql));
    check('un solo parámetro', same(params, [USER_ID]), JSON.stringify(params));
  });

  await run('con from y to (inclusivos)', async () => {
    const r = await list({ assignments: [] }, { from: '2026-10-19', to: '2026-10-25' });
    const { sql, params } = r.q('assignments');
    check('date >= from', /"assignment"\."date" >= \$2/.test(sql));
    check('date <= to', /"assignment"\."date" <= \$3/.test(sql));
    check('parámetros en orden', same(params, [USER_ID, '2026-10-19', '2026-10-25']), JSON.stringify(params));
  });

  await run('sólo from / sólo to', async () => {
    const onlyFrom = (await list({ assignments: [] }, { from: '2026-10-19' })).q('assignments');
    check('sólo from: >= y no <=', /"assignment"\."date" >= \$2/.test(onlyFrom.sql) && !/"assignment"\."date" <= /.test(onlyFrom.sql));
    const onlyTo = (await list({ assignments: [] }, { to: '2026-10-25' })).q('assignments');
    check('sólo to: <= y no >=', /"assignment"\."date" <= \$2/.test(onlyTo.sql) && !/"assignment"\."date" >= /.test(onlyTo.sql));
  });

  console.log('\n-- SQL del progreso');

  await run('ejercicios vigentes: sólo las rutinas que aparecen, activos con vínculo activo, sin repetir', async () => {
    const asg = [
      assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A')),
      assignment(A2, R1, '2026-10-22', routineRow(R1, 'Día A')),
      assignment(A3, R2, '2026-10-23', routineRow(R2, 'Día B')),
    ];
    const r = await list({ assignments: asg, active: [], finished: [] });
    const active = r.q('active');
    console.log('        ' + active.sql.replace(/\s+/g, ' '));
    check('DISTINCT', /SELECT DISTINCT/.test(active.sql));
    check('Routine_Circuit unido a Routine_Exercise por el circuito',
      /FROM "Routine_Circuit" "routineCircuit" INNER JOIN "Routine_Exercise" "routineExercise" ON "routineExercise"\."circuit_id"\s*=\s*"routineCircuit"\."circuit_id"/.test(active.sql));
    check('vínculo activo', /"routineCircuit"\."active" = true/.test(active.sql));
    check('ejercicio activo', /"routineExercise"\."active" = true/.test(active.sql));
    check('sólo las rutinas que aparecen, una vez cada una', same(active.params, [R1, R2]), JSON.stringify(active.params));
    check('alias de salida', active.sql.includes('AS "routine_id"') && active.sql.includes('AS "routine_exercise_id"'));
  });

  await run('hechos: sólo las asignaciones del listado', async () => {
    const asg = [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A')), assignment(A2, R2, '2026-10-21', routineRow(R2, 'Día B'))];
    const r = await list({ assignments: asg, active: [], finished: [] });
    const finished = r.q('finished');
    console.log('        ' + finished.sql.replace(/\s+/g, ' '));
    check('desde Routine_Asign_Exercise_Finished', /FROM "Routine_Asign_Exercise_Finished" "finished"/.test(finished.sql));
    check('filtra por las asignaciones del listado', same(finished.params, [A1, A2]), JSON.stringify(finished.params));
    check('alias de salida', finished.sql.includes('AS "assignment_id"') && finished.sql.includes('AS "routine_exercise_id"'));
  });

  console.log('\n-- la cuenta del progreso');

  const active = (routine, ...exercises) => exercises.map(e => ({ routine_id: routine, routine_exercise_id: e }));
  const done = (assignmentId, ...exercises) => exercises.map(e => ({ assignment_id: assignmentId, routine_exercise_id: e }));

  await run('forma exacta de la respuesta', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', { ...routineRow(R1, 'Día A'), coach_note: 'no sale' })], active: active(R1, E1), finished: [] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    const item = r.res.body[0];
    check('claves del ítem', same(Object.keys(item), ITEM_KEYS), Object.keys(item).join(','));
    check('routine trae id, name y active', same(Object.keys(item.routine), ['id', 'name', 'active']), Object.keys(item.routine).join(','));
    check('progress trae finished y total', same(Object.keys(item.progress), ['finished', 'total']), Object.keys(item.progress).join(','));
    check('date es el string del día', item.date === '2026-10-20');
  });

  await run('nada hecho: 0 de 2', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A'))], active: active(R1, E1, E2), finished: [] });
    check('{ finished: 0, total: 2 }', same(r.res.body[0].progress, { finished: 0, total: 2 }), JSON.stringify(r.res.body[0].progress));
  });

  await run('uno hecho: 1 de 2', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A'))], active: active(R1, E1, E2), finished: done(A1, E1) });
    check('{ finished: 1, total: 2 }', same(r.res.body[0].progress, { finished: 1, total: 2 }), JSON.stringify(r.res.body[0].progress));
  });

  await run('un ejercicio dado de baja que el alumno completó SUMA al total', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A'))], active: active(R1, E1, E2), finished: done(A1, E1, E9) });
    check('{ finished: 2, total: 3 }', same(r.res.body[0].progress, { finished: 2, total: 3 }), JSON.stringify(r.res.body[0].progress));
  });

  await run('un ejercicio dado de baja que el alumno NO completó no cuenta (no llega en la consulta de activos)', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A'))], active: active(R1, E1), finished: [] });
    check('{ finished: 0, total: 1 }', same(r.res.body[0].progress, { finished: 0, total: 1 }), JSON.stringify(r.res.body[0].progress));
  });

  await run('un ejercicio activo que además se completó se cuenta UNA vez', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A'))], active: active(R1, E1, E2), finished: done(A1, E1, E2) });
    check('{ finished: 2, total: 2 }', same(r.res.body[0].progress, { finished: 2, total: 2 }), JSON.stringify(r.res.body[0].progress));
  });

  await run('un circuito repetido (filas duplicadas) cuenta cada ejercicio una vez', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A'))], active: [...active(R1, E1, E2), ...active(R1, E1, E2)], finished: [] });
    check('{ finished: 0, total: 2 }', same(r.res.body[0].progress, { finished: 0, total: 2 }), JSON.stringify(r.res.body[0].progress));
  });

  await run('rutina sin ejercicios → 0 de 0', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A'))], active: [], finished: [] });
    check('{ finished: 0, total: 0 }', same(r.res.body[0].progress, { finished: 0, total: 0 }), JSON.stringify(r.res.body[0].progress));
  });

  await run('la misma rutina en dos días: comparten los ejercicios, no lo hecho', async () => {
    const r = await list({
      assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A')), assignment(A2, R1, '2026-10-22', routineRow(R1, 'Día A'))],
      active: active(R1, E1, E2, E3), finished: done(A1, E1, E2),
    });
    check('lunes: 2 de 3', same(r.res.body[0].progress, { finished: 2, total: 3 }), JSON.stringify(r.res.body[0].progress));
    check('miércoles: 0 de 3', same(r.res.body[1].progress, { finished: 0, total: 3 }), JSON.stringify(r.res.body[1].progress));
  });

  await run('lo hecho en una asignación no se mezcla con otra rutina', async () => {
    const r = await list({
      assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A')), assignment(A3, R2, '2026-10-20', routineRow(R2, 'Día B'))],
      active: [...active(R1, E1, E2), ...active(R2, E3)], finished: [...done(A1, E1), ...done(A3, E3, E9)],
    });
    check('Día A: 1 de 2', same(r.res.body[0].progress, { finished: 1, total: 2 }), JSON.stringify(r.res.body[0].progress));
    check('Día B: 2 de 2 (E3 activo + E9 de baja, los dos hechos)', same(r.res.body[1].progress, { finished: 2, total: 2 }), JSON.stringify(r.res.body[1].progress));
  });

  await run('rutina dada de baja después de asignarla → se lista con routine.active = false', async () => {
    const r = await list({ assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A', false))], active: active(R1, E1), finished: [] });
    check('aparece', r.res.body.length === 1);
    check('routine.active = false', r.res.body[0].routine.active === false);
  });

  await run('respeta el orden que devuelve la consulta', async () => {
    const r = await list({
      assignments: [assignment(A1, R1, '2026-10-20', routineRow(R1, 'Día A')), assignment(A3, R2, '2026-10-20', routineRow(R2, 'Día B')), assignment(A2, R1, '2026-10-22', routineRow(R1, 'Día A'))],
      active: [], finished: [],
    });
    check('mismo orden de ids', same(r.res.body.map(i => i.id), [A1, A3, A2]), r.res.body.map(i => i.id).join(','));
  });

  finish();
})();
```

- [ ] **Paso 3: Crear `verify-assigned-controller.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { Reflector } = mod('@nestjs/core');
const { ForbiddenException } = mod('@nestjs/common');
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
const USER = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const OTHER = '11111111-2222-4333-8444-555555555555';

(async () => {
  const state = { done: false };
  const stub = {
    getAssignedRoutines: async () => { await new Promise(r => setTimeout(r, 20)); state.done = true; return 'RESPONSE'; },
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
  const handler = proto.getAssignedRoutines;

  console.log('-- ruta, verbo y roles');
  await run('getAssignedRoutines: ruta, verbo, roles y dueño', async () => {
    check('existe', typeof handler === 'function');
    check('ruta assigned/:userId', Reflect.getMetadata('path', handler) === 'assigned/:userId', Reflect.getMetadata('path', handler));
    check('verbo GET', Reflect.getMetadata('method', handler) === GET, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('user, coach y admin', Array.isArray(roles) && roles.length === 3
      && [UserRole.user, UserRole.coach, UserRole.admin].every(r => roles.includes(r)), JSON.stringify(roles));
    check('@Owner apunta al parámetro userId', Reflect.getMetadata(OWNER_PARAM_KEY, handler) === 'userId', Reflect.getMetadata(OWNER_PARAM_KEY, handler));
  });

  console.log('\n-- el OwnerGuard real con este handler');
  const guard = new OwnerGuard(new Reflector());
  const ctx = (role, id, userIdParam) => ({
    getHandler: () => handler,
    getClass: () => RoutineController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role, id }, params: { userId: userIdParam } }) }),
  });
  const forbids = (name, fn) => run(name, async () => {
    try {
      fn();
      check(name, false, 'no lanzó');
    } catch (e) {
      check(name, e instanceof ForbiddenException, e && e.message);
      check(name + ' (el texto no cierra la sesión del web)', e.message !== 'La cuenta está deshabilitada.', e.message);
    }
  });
  await run('un alumno pide su propio listado', async () => {
    check('con su id', guard.canActivate(ctx(UserRole.user, USER, USER)) === true);
    check('con su id en mayúscula (iOS)', guard.canActivate(ctx(UserRole.user, USER, USER.toUpperCase())) === true);
  });
  await forbids('un alumno pide el listado de otro → 403', () => guard.canActivate(ctx(UserRole.user, USER, OTHER)));
  await run('coach y admin piden el de cualquiera', async () => {
    check('coach', guard.canActivate(ctx(UserRole.coach, OTHER, USER)) === true);
    check('admin', guard.canActivate(ctx(UserRole.admin, OTHER, USER)) === true);
  });

  console.log('\n-- await sin return');
  await run('espera al service y no devuelve el Response', async () => {
    const ret = await controller.getAssignedRoutines({ userId: USER }, {}, {});
    check('esperó al service', state.done === true);
    check('devuelve undefined', ret === undefined, String(ret));
  });

  console.log('\n-- Swagger');
  await run('el documento generado declara respuesta, errores y parámetros', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const get = doc.paths['/routine/assigned/{userId}'] && doc.paths['/routine/assigned/{userId}'].get;

    check('GET /routine/assigned/{userId} está en el documento', !!get);
    if (get) {
      for (const code of ['200', '400', '403', '404']) check(`declara ${code}`, !!get.responses[code], Object.keys(get.responses).join(','));
      const schema = get.responses['200'].content['application/json'].schema;
      check('el 200 es un array de RoutineAssignedListItemResponseDto',
        schema.type === 'array' && (schema.items.$ref || '').endsWith('/RoutineAssignedListItemResponseDto'), JSON.stringify(schema));
      const params = get.parameters.map(p => `${p.in}:${p.name}`);
      check('parámetro de path userId', params.includes('path:userId'), params.join(','));
      check('query from (opcional)', params.includes('query:from') && get.parameters.find(p => p.name === 'from').required === false, params.join(','));
      check('query to (opcional)', params.includes('query:to') && get.parameters.find(p => p.name === 'to').required === false, params.join(','));
      check('pide token', Array.isArray(get.security) && get.security.some(s => 'bearer' in s));
    }

    const item = doc.components.schemas.RoutineAssignedListItemResponseDto;
    const keys = item ? Object.keys(item.properties) : [];
    check('el ítem documenta sus 8 campos',
      ['id', 'routine_id', 'user_id', 'date', 'created_at', 'updated_at', 'routine', 'progress'].every(k => keys.includes(k)), keys.join(','));
    const routine = doc.components.schemas.RoutineAssignedRoutineDto;
    check('routine documenta id, name y active', routine && ['id', 'name', 'active'].every(k => k in routine.properties));
    const progress = doc.components.schemas.RoutineAssignedProgressDto;
    check('progress documenta finished y total', progress && ['finished', 'total'].every(k => k in progress.properties));

    check('el alta y la baja de BE-11 siguen en el documento',
      !!doc.paths['/routine/assign-user'] && !!doc.paths['/routine/assign-user/{id}']);
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 4: Actualizar el chequeo viejo de `verify-controller.js` (BE-11)**

Ese script comprueba que `GET /routine/assigned/{userId}` **no** existe; con BE-12 eso deja de ser cierto y se volvería rojo por la razón equivocada. En `verify-controller.js`, **borrar** la línea:

```js
    check('GET /routine/assigned/{userId} NO existe todavía (es BE-12)', !doc.paths['/routine/assigned/{userId}']);
```

(La presencia del endpoint nuevo la comprueba `verify-assigned-controller.js`.)

- [ ] **Paso 5: Correr los tres scripts nuevos en rojo**

```bash
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-assigned-dto verify-assigned-rules verify-assigned-controller; do echo "=== $f"; node "$S/$f.js" 2>&1 | grep -v "^  ok" | tail -12; done
```

Esperado: **los tres fallan**: `verify-assigned-dto` por `Cannot find module` (los DTOs no existen), `verify-assigned-rules` por `getAssignedRoutines is not a function` (y los chequeos que dependen de él), `verify-assigned-controller` por el handler inexistente. Anotar cuántas fallas dio cada uno (van al Status como "antes en rojo").

> Las tres consultas ya se probaron en el scratchpad, armadas contra el `DataSource` sin conexión, antes de escribir este plan: el SQL sale con la forma que esperan las expresiones regulares (la única sorpresa, el alias del orden por nombre de rutina, ya está contemplada arriba).

> Si un script falla por una causa del **entorno de la prueba** (por ejemplo, `buildMetadatas` que se queja de una entidad no cargada, o un guard que pide una dependencia que el `overrideGuard` no cubre), se corrige **el script** en este paso hasta que dé la falla que corresponde. No se sigue con un script que falla por una razón equivocada.

---

## Tarea 2: Los DTOs

**Archivos:**
- Crear: `power-app/src/dtos/routine/assigned_routines_params.dto.ts`
- Crear: `power-app/src/dtos/routine/get_assigned_routines_query.dto.ts`
- Crear: `power-app/src/dtos/routine/routine_assigned_list_item_response.dto.ts`

- [ ] **Paso 1: Crear `assigned_routines_params.dto.ts`**

```ts
import { IsUUID, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Params de GET /routine/assigned/:userId. `ParameterIdDto` llama `id` a su parametro y
 * @Owner necesita el nombre del parametro del path, que aca es `userId`.
 */
export class AssignedRoutinesParamsDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id del alumno dueño de las asignaciones' })
    @Type(() => String)
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de usuario debe ser un UUID válido en formato PostgreSQL' })
    userId!: string;
}
```

- [ ] **Paso 2: Crear `get_assigned_routines_query.dto.ts`**

```ts
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsCalendarDay } from './is_calendar_day.decorator';

export class GetAssignedRoutinesQueryDto {

    @ApiPropertyOptional({ example: '2026-10-19', description: 'Primer día a incluir (inclusive), en formato YYYY-MM-DD. El home del alumno manda el lunes de la semana; el entrenador, nada' })
    @IsOptional()
    @IsCalendarDay()
    from?: string;

    @ApiPropertyOptional({ example: '2026-10-25', description: 'Último día a incluir (inclusive), en formato YYYY-MM-DD. El home del alumno manda el domingo de la semana. No puede ser anterior a from (400)' })
    @IsOptional()
    @IsCalendarDay()
    to?: string;
}
```

- [ ] **Paso 3: Crear `routine_assigned_list_item_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class RoutineAssignedRoutineDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 'Dia A - Piernas' })
    name!: string;

    @ApiProperty({ example: true, description: 'false si el entrenador dio de baja la rutina después de asignarla: la asignación existe y se puede ejecutar, el flag es informativo' })
    active!: boolean;
}

export class RoutineAssignedProgressDto {

    @ApiProperty({ example: 2, description: 'Ejercicios que el alumno ya marcó como hechos en esta asignación' })
    finished!: number;

    @ApiProperty({ example: 5, description: 'Ejercicios que el alumno ve en el detalle: los activos de los circuitos activos de la rutina (cada uno una vez) más los dados de baja que completó en esta asignación' })
    total!: number;
}

export class RoutineAssignedListItemResponseDto {

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

    @ApiProperty({ type: RoutineAssignedRoutineDto })
    routine!: RoutineAssignedRoutineDto;

    @ApiProperty({ type: RoutineAssignedProgressDto })
    progress!: RoutineAssignedProgressDto;
}
```

- [ ] **Paso 4: Compilar y correr `verify-assigned-dto.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-assigned-dto.js"
```

Esperado: build en verde; `verify-assigned-dto.js` termina con `N ok, 0 fallas` (N ≈ 30).

---

## Tarea 3: El service

**Archivos:**
- Modificar: `power-app/src/routine/routine.service.ts`

- [ ] **Paso 1: Import del DTO de query**

Junto a `import { AssignRoutineToUserDto } ...`:

```ts
import { GetAssignedRoutinesQueryDto } from '../dtos/routine/get_assigned_routines_query.dto';
```

- [ ] **Paso 2: El método, después de `removeRoutineFromUser` y antes de `// ===== HELPERS DE ASIGNACION INDIVIDUAL =====`**

```ts
    // El alumno lo usa para el home de la semana (from = lunes, to = domingo) y el entrenador sin
    // filtro, para ver todo lo que le asigno. Las asignaciones sobreviven a la baja de la rutina y
    // al cierre de la cuenta (spec §6): por eso no se filtra por ninguno de los dos "active"
    async getAssignedRoutines(
        userId: string,
        query: GetAssignedRoutinesQueryDto,
        res: Response
    ) {
        // Validacion que no depende de la base, antes de consultar. Los dias son 'YYYY-MM-DD' de
        // ancho fijo (IsCalendarDay), asi que comparar los strings es comparar fechas
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

            // De la rutina sale solo lo que muestra el listado. Orden de la spec §4.3: dia y
            // nombre de rutina; el alta desempata dos rutinas homonimas el mismo dia
            const assignmentsQuery = this.routineAsignationUserRepository
                .createQueryBuilder('assignment')
                .innerJoin('assignment.routine', 'routine')
                .addSelect(['routine.id', 'routine.name', 'routine.active'])
                .where('assignment.user_id = :userId', { userId: user.id })
                .orderBy('assignment.date', 'ASC')
                .addOrderBy('routine.name', 'ASC')
                .addOrderBy('assignment.created_at', 'ASC');

            // Los dos extremos son inclusivos y opcionales
            if (query.from) {
                assignmentsQuery.andWhere('assignment.date >= :from', { from: query.from });
            }

            if (query.to) {
                assignmentsQuery.andWhere('assignment.date <= :to', { to: query.to });
            }

            const assignments = await assignmentsQuery.getMany();

            if (assignments.length === 0) {
                return res.status(200).send([]);
            }

            const progressByAssignment = await this.findAssignedRoutinesProgress(assignments);

            return res.status(200).send(assignments.map(assignment => ({
                id: assignment.id,
                routine_id: assignment.routine_id,
                user_id: assignment.user_id,
                date: assignment.date,
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
                routine: {
                    id: assignment.routine.id,
                    name: assignment.routine.name,
                    active: assignment.routine.active,
                },
                progress: progressByAssignment.get(assignment.id)!,
            })));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener las rutinas asignadas.' });
        }
    }
```

- [ ] **Paso 3: El helper, dentro de `// ===== HELPERS DE ASIGNACION INDIVIDUAL =====`, después de `buildRoutineAssignUserResponse`**

```ts
    // finished y total de cada asignacion (spec §4.3). total son los ejercicios que el alumno ve
    // en el detalle: los activos de los circuitos activos de la rutina MAS los dados de baja que
    // completo en esa asignacion, cada uno una vez. Es una union de conjuntos de ids y no una
    // suma: un circuito repetido en la rutina (A, B, A) comparte sus Routine_Exercise, y un
    // ejercicio completado puede ser a la vez activo. Por eso la cuenta se hace en memoria, con
    // dos consultas chicas, y no con un COUNT en SQL
    private async findAssignedRoutinesProgress(
        assignments: RoutineAsignationUser[]
    ): Promise<Map<string, { finished: number; total: number }>> {
        const routineIds = [...new Set(assignments.map(assignment => assignment.routine_id))];
        const assignmentIds = assignments.map(assignment => assignment.id);

        // Los ejercicios vigentes de cada rutina que aparece: activos y en un vinculo activo.
        // Raw y con alias porque no hay una entidad que los represente
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

        // Lo hecho en cada asignacion. getRawMany y no getMany: un select parcial sin la clave
        // primaria hace que TypeORM agrupe las filas por id y colapse el resultado
        const finishedRows = await this.routineAsignExerciseFinishedRepository
            .createQueryBuilder('finished')
            .select('finished.user_routine_asign_id', 'assignment_id')
            .addSelect('finished.routine_exercise_id', 'routine_exercise_id')
            .where('finished.user_routine_asign_id IN (:...assignmentIds)', { assignmentIds })
            .getRawMany<{ assignment_id: string; routine_exercise_id: string }>();

        const activeByRoutine = new Map<string, Set<string>>();

        for (const row of activeRows) {
            if (!activeByRoutine.has(row.routine_id)) {
                activeByRoutine.set(row.routine_id, new Set());
            }
            activeByRoutine.get(row.routine_id)!.add(row.routine_exercise_id);
        }

        const finishedByAssignment = new Map<string, Set<string>>();

        for (const row of finishedRows) {
            if (!finishedByAssignment.has(row.assignment_id)) {
                finishedByAssignment.set(row.assignment_id, new Set());
            }
            finishedByAssignment.get(row.assignment_id)!.add(row.routine_exercise_id);
        }

        const progressByAssignment = new Map<string, { finished: number; total: number }>();

        for (const assignment of assignments) {
            const finished = finishedByAssignment.get(assignment.id) ?? new Set<string>();
            const visible = new Set([...(activeByRoutine.get(assignment.routine_id) ?? []), ...finished]);

            progressByAssignment.set(assignment.id, { finished: finished.size, total: visible.size });
        }

        return progressByAssignment;
    }
```

- [ ] **Paso 4: Compilar y correr `verify-assigned-rules.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-assigned-rules.js"
```

Esperado: build en verde; `verify-assigned-rules.js` con `N ok, 0 fallas` (N ≈ 80) y los tres SQL impresos (el listado, los ejercicios vigentes y los hechos). **Leer los tres SQL a ojo** antes de seguir: es la única verificación de qué consulta sale. Si falla un chequeo del SQL por una diferencia de comillas o espacios entre lo que arma TypeORM y la expresión regular del script, se ajusta la regex *después* de leer el SQL y confirmar que dice lo mismo; si la diferencia es de fondo (una condición o un orden que falta), se corrige el service.

---

## Tarea 4: El controller y su Swagger

**Archivos:**
- Modificar: `power-app/src/routine/routine.controller.ts`

- [ ] **Paso 1: Imports**

Junto a los otros imports de DTOs y de decoradores:

```ts
import { Owner } from '../authentication/decorators/owner.decorator';
import { AssignedRoutinesParamsDto } from '../dtos/routine/assigned_routines_params.dto';
import { GetAssignedRoutinesQueryDto } from '../dtos/routine/get_assigned_routines_query.dto';
import { RoutineAssignedListItemResponseDto } from '../dtos/routine/routine_assigned_list_item_response.dto';
```

- [ ] **Paso 2: El handler, en la sección `ASIGNACION INDIVIDUAL A UN ALUMNO`, después de `removeRoutineFromUser`**

Y de paso se **reemplaza el comentario** de esa sección que decía "El listado de las asignaciones de un alumno (GET /routine/assigned/:userId) es la tarea siguiente (BE-12)" por:

```ts
    // Rutinas de dos segmentos: no compiten con 'GET /:id'
```

El handler:

```ts
    // Con el rol user, @Owner exige que :userId sea el propio id (403); coach y admin ven el de
    // cualquier alumno (gimnasio compartido, D6). El home del alumno manda from = lunes y
    // to = domingo; el entrenador, sin filtro
    @Get('assigned/:userId')
    @Auth(UserRole.user, UserRole.coach, UserRole.admin)
    @Owner('userId')
    @ApiResponse({ status: 200, type: [RoutineAssignedListItemResponseDto], description: 'Ordenado por día y nombre de rutina. Sin asignaciones, un array vacío' })
    @ApiResponse({ status: 400, description: 'Id o fecha inválidos, o from posterior a to' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async getAssignedRoutines(
        @Param() params: AssignedRoutinesParamsDto,
        @Query() query: GetAssignedRoutinesQueryDto,
        @Res() res: Response,
    ) {
        await this.routineService.getAssignedRoutines(params.userId, query, res);
    }
```

(`@Owner` ya declara el `403` en el Swagger.)

- [ ] **Paso 3: Compilar y correr `verify-assigned-controller.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-assigned-controller.js"
```

Esperado: build en verde; `0 fallas`. Si falla el chequeo de `await`, el handler tiene un `return`: **sacarlo** (regla de BE-04).

---

## Tarea 5: Barrido final del código

**Archivos:** ninguno nuevo.

- [ ] **Paso 1: Build limpio y los siete scripts seguidos** (los tres nuevos y los cuatro de BE-11, como regresión)

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build >/dev/null 2>&1; echo "build exit=$?"
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-assigned-dto verify-assigned-rules verify-assigned-controller verify-dto verify-rules verify-typeorm verify-controller; do echo "=== $f: $(node "$S/$f.js" 2>&1 | tail -1)"; done
```

Esperado: `build exit=0` y siete `N ok, 0 fallas`. Los de BE-11 dan lo mismo que antes (58, 62, 19) y `verify-controller` baja de 31 a 30 chequeos por la línea que se borró en la Tarea 1. Anotar los conteos para el Status.

- [ ] **Paso 2: Nada se escapó de lo acordado**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git status --short
git diff --stat -- "Db Creator" power-app/src/entities power-app/src/routine/routine.module.ts power-app/src/planification
grep -n "return this.routineService" power-app/src/routine/routine.controller.ts
grep -rn "La cuenta está deshabilitada" power-app/src/routine power-app/src/dtos/routine
```

Esperado:
- `git status`: sólo los 3 DTOs nuevos, `routine.service.ts` y `routine.controller.ts` (los Status todavía no).
- `git diff --stat` de `Db Creator`, las entidades, `routine.module.ts` y `planification/`: **vacío**.
- `return this.routineService` y `La cuenta está deshabilitada`: **sin resultados**.

---

## Tarea 6: Status (informe y dashboard)

**Archivos:**
- Modificar: `Status/estado-implementacion-backend.md`
- Modificar: `Status/dashboard-estado-backend.html`

Los números: ✅ 59 (sin cambio), 🟡 8 → **9**, 🔵 3 → **2**, ⬜ 4, sin backend 1. Porcentajes: 🟡 9/75 = **12%**, 🔵 2/75 = **3%** (suman 79 + 12 + 3 + 5 + 1 = 100). Sobre los CU con backend siguen siendo 59/74 = 80%. Usuario: 🟡 3 → **4**, 🔵 1 → **0**, ✅ 13 (68%, sin cambio). Pendientes: 15 (9 parciales, 2 andamiaje, 4 sin implementar). **El corte queda en 2026-10-18** (misma fecha que BE-11).

- [ ] **Paso 1: Informe — resumen y cobertura**

En `estado-implementacion-backend.md`:
1. Tabla de resumen: `| 🟡 Parcial | 8 | 11% |` → `| 🟡 Parcial | 9 | 12% |`; `| 🔵 Andamiaje | 3 | 4% |` → `| 🔵 Andamiaje | 2 | 3% |`.
2. Línea de «Faltan 15»: `Faltan 15: 8 parciales, 3 en andamiaje y 4 sin implementar.` → `Faltan 15: 9 parciales, 2 en andamiaje y 4 sin implementar.`
3. Cobertura por rol: `| Usuario | 20 | 13 | 3 | 1 | 2 | 1 | 68% |` → `| Usuario | 20 | 13 | 4 | 0 | 2 | 1 | 68% |`; `| **Total** | **75** | **59** | **8** | **3** | **4** | **1** | **80%** |` → `| **Total** | **75** | **59** | **9** | **2** | **4** | **1** | **80%** |`.

- [ ] **Paso 2: Informe — entrada nueva en "Cambios recientes"**, justo arriba de la de BE-11 (`## Cambios recientes (2026-10-18 · rutina individual: asignar y quitar)`)

```markdown
## Cambios recientes (2026-10-18 · rutina individual: listado por alumno)

- **Duodécima tarea del roadmap (BE-12): la parte individual de U-08.** `GET /routine/assigned/:userId?from=&to=` (spec del 17/10, §4.3), en `routine.controller.ts` y `routine.service.ts`. Plan: `Doc/plans/2026-10-18-be-12-listado-rutinas-por-alumno-plan.md` (repo PowerApp-Docs). **U-08 pasa de 🔵 a 🟡** (no a ✅): la parte del plan sigue colgando hasta BE-20. Conteos: 🟡 8 → **9** y 🔵 3 → **2**; los ✅ siguen en 59. También es el listado que necesitan E-19 y E-20: el coach lo usa para abrir la asignación que va a quitar.
- **Va en `routine/` y no reemplaza al andamiaje de `planification/`.** El roadmap hablaba de reemplazar `GET /planification/user/:id/active` por el home; la spec fijó el endpoint en `routine/`, y los dos andamiajes de `planification.controller.ts` (`/user/:id` y `/user/:id/active`) **siguen colgando** porque son de la vía plan (BE-19 y BE-20).
- **El contrato.** Roles: user (con `@Owner('userId')`: sólo el propio id, `403` si no), coach y admin (cualquier alumno, gimnasio compartido). `from` y `to` son opcionales, inclusivos y en formato día (reusan `@IsCalendarDay()` de BE-11); `from > to` es `400`; usuario inexistente es `404`. `200` con un array ordenado por día y nombre de rutina, vacío si no hay asignaciones. Cada ítem: `{ id, routine_id, user_id, date, created_at, updated_at, routine: { id, name, active }, progress: { finished, total } }`.
- **Qué es `progress`.** `finished` son las filas de hecho de la asignación. `total` son los ejercicios que el alumno ve en el detalle: **los activos de los vínculos activos de la rutina, más los dados de baja que completó en esa asignación, cada uno una vez**. **Por qué una unión y no una suma:** un circuito repetido en la rutina (A, B, A) comparte sus `Routine_Exercise`, y un ejercicio completado puede ser a la vez activo; se cuentan ids distintos. Una asignación 2 de 3 en un lunes no dice nada de otro día de la misma rutina: comparten los ejercicios, no lo hecho.
- **La cuenta se hace en memoria, con tres consultas.** (1) Las asignaciones del alumno con su rutina (`id`, `name`, `active`), (2) los ejercicios vigentes de las rutinas que aparecen y (3) los hechos de esas asignaciones; las dos últimas con `getRawMany`, porque un `getMany` con select parcial sin la clave primaria hace que TypeORM colapse las filas. **Por qué no un `COUNT` en SQL:** `total` es una unión de conjuntos de ids y pediría subconsultas correlacionadas por fila; en memoria se prueba con los casos borde, y el SQL de las tres consultas se verificó como texto.
- **Una rutina dada de baja después de asignarla se sigue listando**, con `routine.active: false` (informativo: la asignación existe y se puede ejecutar), y también se lista si la cuenta del alumno está cerrada (spec §6). Un usuario que existe pero no es alumno devuelve `200` con `[]`.
- **Decisión menor que se puede vetar:** dos rutinas con el mismo nombre el mismo día se desempatan por fecha de alta; la spec ordena sólo por día y nombre.
- **Caso borde que queda para BE-13.** Si el coach saca un circuito de la rutina *después* de que el alumno completó algo de él, el detalle (§4.4) tiene que mostrar ese vínculo apagado. Sus ejercicios activos y sin hacer **no cuentan en `total`** (la spec dice "circuitos activos"). **Recomendación para BE-13:** dentro de un vínculo apagado mostrar sólo lo completado, así el detalle y el `total` coinciden.
- **Sin cambios de esquema:** `Db Creator/`, las entidades y `routine.module.ts` no se tocaron. Specs de CU reescritas en `Use Cases/` (repo PowerApp-Docs): **U-08** (el home combina las rutinas individuales de la semana con el plan vigente; la parte del plan sigue siendo del bloque B) y una línea en cada una de **E-19 y E-20** para que no contradigan al listado.
- **Para el web.** B1 (rutinas de la semana) ya puede tipar la parte individual contra el Swagger; la parte del plan llega con BE-20.
- **Verificación, sin levantar el server.** Hecho:
  - Build en verde.
  - {N_ADTO} chequeos de los DTOs de query y de parámetros con el `ValidationPipe` real, {N_ARULES} del service con un `DataSource` real **sin conexión** (las tres consultas se construyen de verdad, se verifica su SQL y sus parámetros y se interceptan al ejecutar con filas armadas: códigos, orden de las validaciones, el filtro de fechas y la cuenta del progreso con sus casos borde) y {N_ACTRL} del controller (ruta, roles, `@Owner` cableado a `userId`, el `OwnerGuard` real, `await` sin `return` y el Swagger generado).
  - Los tres scripts se corrieron antes **en rojo** ({RED_ADTO}, {RED_ARULES} y {RED_ACTRL} fallas) y después en verde, y los cuatro de BE-11 siguen en verde como regresión.
- **Lo que NO se verificó.**
  - Nada corrió contra un Postgres ni contra el server: las tres consultas se revisaron como texto, no se ejecutaron. Queda para BE-35.
  - El rendimiento con datos reales (el listado sin filtro de un alumno con meses de historial) no se midió. El índice `idx_rau_user_date` cubre el filtro por alumno y fecha.
  - **El progreso con ejercicios realmente completados no se puede probar de punta a punta todavía**: nada escribe `Routine_Asign_Exercise_Finished` hasta BE-14 (hallazgo 2). Se probó con filas armadas.
- **Cambios de estado:** **U-08 pasa de 🔵 a 🟡.** La fase 2 avanza: **BE-10, BE-10b, BE-11 y BE-12 hechas, sigue BE-13** (el detalle para el alumno, con la visibilidad propagada a los ejercicios).
```

Reemplazar `{N_*}` y `{RED_*}` por los conteos reales de las Tareas 1 y 5 (no dejar llaves en el texto final).

- [ ] **Paso 3: Informe — detalle de U-08, E-19, E-20 y plan de trabajo**

1. Fila de U-08 (la que empieza `| CU-U-08 | Obtener mi planificación | 🔵 Andamiaje |`) por:

```markdown
| CU-U-08 | Obtener mi planificación | 🟡 Parcial | `GET /routine/assigned/:userId?from=&to=` · la parte **individual** del home, con su progreso (18/10) · **falta la parte del plan**: `GET /planification/user/:id/active` sigue colgando · BE-20 |
```

2. Encabezado `## Detalle — Rol Usuario (20 CU · 68%)`: sin cambio (68% = 13 de 19).
3. En las filas de E-19 y E-20, cambiar `· el listado es BE-12 (18/10)` por `· el listado es `GET /routine/assigned/:userId` (BE-12, 18/10)` en E-19; en E-20 agregar al final de la nota `· lo abre desde el listado (BE-12)`.
4. Tabla "Plan de trabajo", fila de la fase 2, columna Estado: `en curso: BE-10 y BE-10b hechas el 17/10, BE-11 el 18/10; sigue BE-12` → `en curso: BE-10 y BE-10b hechas el 17/10, BE-11 y BE-12 el 18/10; sigue BE-13`.

- [ ] **Paso 4: Dashboard**

En `dashboard-estado-backend.html`:
1. Tarjetas de arriba: la de **Parcial** `<div class="n">8</div>` → `9` y `11% · un camino sin cumplir` → `12% · un camino sin cumplir`; la de **Andamiaje** `<div class="n">3</div>` → `2` y `4% · ruta que cuelga` → `3% · ruta que cuelga`.
2. `aria-label` de la barra: `8 parciales, 3 andamiaje` → `9 parciales, 2 andamiaje`.
3. Barra: `s-partial` `width:10.67%` → `12.00%`; `s-stub` `width:4.00%` → `2.67%` (los otros tres no cambian: 78.67 + 5.33 + 1.33).
4. Leyenda de la barra: `<b>15</b> pendientes (8 parciales, 3 andamiaje, 4 sin endpoint)` → `(9 parciales, 2 andamiaje, 4 sin endpoint)`.
5. Tarjeta del **Usuario**: `role-sub` queda igual; en la `mini-bar`, `s-partial` `width:15%` → `20%` y **se quita** el segmento del andamiaje (`width:5%;background:var(--stub)`); en la leyenda, `<b>3</b> parc.` → `<b>4</b> parc.` y **se quita** `<b>1</b> andam.`.
6. Fila de **U-08** (Usuario): el chip pasa de `class="chip stub"` / `Andamiaje` a `class="chip partial"` / `Parcial`, y la celda del endpoint a:

```html
<td class="endpoint"><span class="verb">GET</span> /routine/assigned/:userId <span class="muted">· la parte individual del home, con su progreso (18/10) · falta la parte del plan: </span><span class="verb">GET</span> /planification/user/:id/active <span class="muted">sigue colgando · BE-20</span></td>
```

7. Filas de **E-19** y **E-20**: en E-19, `el listado es BE-12 (18/10)` → `el listado es GET /routine/assigned/:userId (BE-12, 18/10)`; en E-20, agregar `· lo abre desde el listado (BE-12)` al final de la nota.
8. Chip de la fase 2 en el "Plan de trabajo": `En curso · BE-10, BE-10b y BE-11 hechas` → `En curso · BE-10, BE-10b, BE-11 y BE-12 hechas`.
9. Pie: `59 impl · 8 parc · 3 andam · 4 falta · 1 sin backend — de 75 · corte 2026-10-18` → `59 impl · 9 parc · 2 andam · 4 falta · 1 sin backend — de 75 · corte 2026-10-18`.

- [ ] **Paso 5: Barrido para no dejar números viejos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status"
grep -n "8 parc\|3 andam\|8 parciales\|3 andamiaje\|3 en andamiaje\|sigue BE-12\|BE-10, BE-10b y BE-11\|{N_\|{RED_" dashboard-estado-backend.html estado-implementacion-backend.md | cut -c1-220
```

Cada coincidencia que quede tiene que ser una entrada **histórica** de "Cambios recientes" (no se reescriben) o una referencia a otro tema; cualquier otra se corrige. En el informe no puede quedar ningún `{N_` ni `{RED_`. Después, abrir el dashboard en el panel del navegador y leer con `javascript_tool` las tarjetas, la barra y las filas de U-08, E-19 y E-20, como se hizo en BE-11.

---

## Tarea 7: Specs de CU (repo PowerApp-Docs)

**Archivos:**
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\usuario\CU-U-08-obtener-mi-planificacion.md`
- Modificar: `Use Cases/entrenador/CU-E-19-asignar-rutina-a-alumno.md`, `CU-E-20-eliminar-rutina-a-alumno.md`

Spec §7: U-08 "el home combina las asignaciones individuales de la semana con el plan vigente (DB4 del bloque B: se muestran las dos). En el bloque A, sólo la parte individual". El CU describe el comportamiento completo; qué parte está implementada lo dice el Status. Se saca la mención a `User_Routine` (eliminada, D11).

- [ ] **Paso 1: Reescribir `CU-U-08-obtener-mi-planificacion.md`**

```markdown
# CU-U-08 — Obtener mi Planificación

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Pantalla principal (home) del alumno: muestra las rutinas de su semana, las que vienen de una planificación asignada (~90%) y las individuales que el entrenador le asignó para un día concreto (~10%). Cada rutina individual muestra su progreso: los ejercicios que ya hizo sobre el total.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Las rutinas individuales de la semana (Routine_Asignation_User), cada una con su día y su progreso.
- El plan vigente del alumno y las rutinas de su semana (User_Planification → Routine_Asignation).
- Mostrar juntas las dos fuentes cuando el alumno tiene ambas.

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
3. El sistema busca el plan vigente del alumno (la fecha actual está dentro de su período) y las rutinas de la semana que corresponde.
4. El sistema presenta juntas las rutinas individuales y las del plan, ordenadas por día.

## Caminos alternativos / excepciones

### En el paso 3 — Sin plan vigente pero con rutinas individuales

1. El alumno no tiene un plan vigente.
2. El sistema muestra sólo sus rutinas individuales de la semana.

### En el paso 3 — Con plan vigente y con rutinas individuales

1. El alumno tiene las dos cosas.
2. El sistema muestra las dos: una rutina individual asignada a propósito no queda oculta mientras dure el plan.

### En el paso 2 — La rutina individual fue dada de baja después de asignarla

1. El entrenador dio de baja la rutina después de asignarla.
2. El sistema la sigue mostrando, indicando que está dada de baja: la asignación existe y el alumno puede ejecutarla.

### En el paso 2 — Un ejercicio fue dado de baja

1. El entrenador sacó un ejercicio de la rutina después de que el alumno lo hizo.
2. El sistema lo cuenta en el progreso de esa asignación: se ve lo dado de baja que el alumno completó, y sólo eso.

### En el paso 4 — Sin asignaciones

1. El alumno no tiene plan vigente ni rutinas individuales esa semana.
2. El sistema muestra un estado vacío indicando que aún no tiene entrenamiento asignado.
```

- [ ] **Paso 2: Ajustar una línea en E-19 y en E-20**

En `CU-E-19-asignar-rutina-a-alumno.md`, en **Fuera de alcance**, reemplazar:

```markdown
- Listar las rutinas asignadas a un alumno.
```

por:

```markdown
- Consultar las rutinas asignadas a un alumno (el entrenador las ve en el listado del alumno, que usa también el home de CU-U-08).
```

En `CU-E-20-eliminar-rutina-a-alumno.md`, en el camino principal, reemplazar:

```markdown
1. El entrenador abre la asignación del alumno y solicita quitarla.
```

por:

```markdown
1. El entrenador consulta las rutinas asignadas al alumno, abre la que quiere quitar y solicita quitarla.
```

---

## Tarea 8: Dejar todo stageado, memoria y cierre

**Archivos:** ninguno nuevo. **No se commitea ni se pushea.**

- [ ] **Paso 1: Stagear sólo los archivos propios, en cada repo**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git add power-app/src/dtos/routine/assigned_routines_params.dto.ts \
        power-app/src/dtos/routine/get_assigned_routines_query.dto.ts \
        power-app/src/dtos/routine/routine_assigned_list_item_response.dto.ts \
        power-app/src/routine/routine.service.ts \
        power-app/src/routine/routine.controller.ts \
        Status/estado-implementacion-backend.md \
        Status/dashboard-estado-backend.html
git status --short

cd "D:/Power App/Docs/PowerApp-Docs"
git add "Doc/plans/2026-10-18-be-12-listado-rutinas-por-alumno-plan.md" \
        "Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md" \
        "Use Cases/entrenador/CU-E-19-asignar-rutina-a-alumno.md" \
        "Use Cases/entrenador/CU-E-20-eliminar-rutina-a-alumno.md"
git status --short
```

Esperado: el backend con 7 archivos (`A` los 3 DTOs, `M` el resto) y el de docs con 4 (`A` el plan, `M` las tres specs). Si `git status` muestra algo más que no sea propio, no se stagea.

- [ ] **Paso 2: Actualizar la memoria del proyecto**

En `C:\Users\caram\.claude\projects\D--Power-App-Backend-PowerApp-Backend\memory\`: actualizar `project_cu_status.md` y su línea del `MEMORY.md` para que digan que BE-12 está hecha (U-08 en 🟡, 59 ✅ · 9 🟡 · 2 🔵 · 4 ⬜) y que **sigue BE-13**.

- [ ] **Paso 3: Proponer los mensajes de commit (uno por repo) y cerrar**

Backend:

```
BE-12: listado de las rutinas asignadas a un alumno con su progreso (parte individual de U-08), GET /routine/assigned/:userId

Con from y to opcionales, solo el propio id para el alumno, y total como la union de los ejercicios vigentes y los completados. Status: U-08 pasa de andamiaje a parcial.
```

PowerApp-Docs:

```
Plan de BE-12 y spec de U-08 reescrita para el home con rutinas individuales y plan
```

Reportar al usuario: qué quedó, qué se verificó (los siete scripts y el build, con sus conteos), qué **no** (nada corrió contra Postgres; el progreso con ejercicios realmente completados hasta BE-14; el rendimiento con datos), y la tarea siguiente: **BE-13**, el detalle de la asignación para el alumno (`GET /routine/assign-user/:id`, spec §4.4), que resuelve el caso borde del hallazgo 3.

---

## Autorrevisión del plan contra la spec

**Cobertura de la spec:**
- §4 tabla de rutas: `GET /routine/assigned/:userId` con user (`@Owner('userId')`), coach y admin → Tarea 4, `verify-assigned-controller` (roles, `@Owner`, `OwnerGuard` real).
- §4.3: `from` y `to` opcionales, inclusivos, formato día; `from > to` → 400; `404` si el usuario no existe; `200` ordenado por `date` y nombre; forma exacta del ítem; `total` y `finished`; rutina de baja que se sigue listando → Tareas 2 y 3, `verify-assigned-dto` y `verify-assigned-rules` (códigos, SQL con sus parámetros, la cuenta del progreso y sus casos borde).
- §6: las asignaciones sobreviven a la baja de la rutina y al cierre de la cuenta → ninguna condición filtra por `Routine.active` ni por `User.active` (se comprueba en el SQL impreso y en el caso de la rutina de baja).
- §7 (U-08, y de paso E-19 y E-20) → Tarea 7.
- §9/§10/§11: Status por tarea (U-08 de 🔵 a 🟡, conteos), SQL de la consulta nueva generado sin conectarse, verificación sin levantar el server → Tareas 5 y 6.
- Encargos transversales: `await` sin `return` (`verify-assigned-controller`), mensajes en español con `{ error }`, ningún 403 nuevo con el texto reservado (el único 403 es el de `@Owner`, ya existente y verificado), `@Auth` por endpoint.
- §4.4 (detalle) y el resto del bloque: **fuera de alcance** (BE-13 en adelante).

**Placeholders:** el único texto con llaves son los conteos `{N_*}` y `{RED_*}` del Status, que el paso 2 de la Tarea 6 manda reemplazar con la salida real de los scripts y el paso 5 verifica que no queden.

**Consistencia de nombres:** `getAssignedRoutines` (service, controller y scripts), `findAssignedRoutinesProgress`, `GetAssignedRoutinesQueryDto`, `AssignedRoutinesParamsDto`, `RoutineAssignedListItemResponseDto` / `RoutineAssignedRoutineDto` / `RoutineAssignedProgressDto`. Alias de las consultas crudas: `routine_id` y `routine_exercise_id` (vigentes) y `assignment_id` y `routine_exercise_id` (hechos), iguales en el service y en los scripts. El constructor del service **no cambia**, así que `build()` de BE-11 y el de BE-12 lo arman igual.
