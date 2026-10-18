# BE-14 (+ BE-15) — Marcar, desmarcar y dejar una nota en un ejercicio (CU-U-12 y U-13) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` de los archivos propios y se propone el mensaje (Tarea 8).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. No se instala nada para verificar.
> 3. **No se levanta el server.** Ni siquiera en segundo plano. Los scripts no abren puertos ni se conectan a ninguna base.

> **Registro de ejecución (18/10):** plan aprobado sin cambios de diseño. Qué pasó respecto de lo escrito abajo:
> - **Tarea 1, rojo:** `verify-finished-dto` 1 falla (los módulos no existían), `verify-finished-rules` 34, `verify-finished-typeorm` 8 (la sección de la entidad ya pasaba, como se anticipó) y `verify-finished-controller` 11.
> - **Verde final:** build en 0; `verify-finished-dto` 21 ok, `verify-finished-rules` 102, `verify-finished-typeorm` 32, `verify-finished-controller` 41, todos con 0 fallas. Regresión de BE-11, BE-12 y BE-13: 10, 46, 16, 24, 24, 58, 27, 58, 62, 19 y 30 chequeos con 0 fallas.
> - **SQL leído a ojo (Tarea 3):** el `INSERT … RETURNING "id", "created_at", "updated_at"`; las lecturas por `user_routine_asign_id` + `routine_exercise_id`, por `id` del `Routine_Exercise` y por `routine_id` + `circuit_id` del `Routine_Circuit`; el `UPDATE … SET "user_note" = $1, "updated_at" = $2 WHERE "id" = $3` (con `NULL` para la nota vacía); y el `DELETE` de las dos columnas.
> - **Ajustes de los scripts, no del código:** el `DELETE` sale como `WHERE (… AND …)` (TypeORM envuelve el criterio en paréntesis), así que la expresión regular acepta los paréntesis; y las filas pre-cargadas del fake están en 2020, para que «`updated_at` posterior» no dependa de la hora de la máquina.
> - **Un ajuste del código al barrer:** un comentario de la constante del `403` contenía el texto reservado literal, y el `grep` del barrido lo marcó. Se reescribió sin el literal (el `dist` ya no lo tenía, porque el build quita los comentarios).
> - **Dashboard:** verificado renderizado recargando el archivo en el panel del navegador; la barra suma 100.
> - **Sin otros desvíos:** el código quedó como está escrito en las Tareas 2 a 4 (compiló a la primera, incluido el estrechamiento de tipos de `markable` y de `finished`).

**Spec que manda:** [`2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md`](../specs/2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md), §2 (D3, D5), §4 (la tabla de rutas, §4.5 y §4.6), §6, §7 (U-12, U-13), §9, §10 y §11. **Planes anteriores del bloque:** [BE-11](2026-10-18-be-11-asignar-rutina-individual-plan.md), [BE-12](2026-10-18-be-12-listado-rutinas-por-alumno-plan.md) y [BE-13](2026-10-18-be-13-detalle-de-la-asignacion-para-el-alumno-plan.md): esta tarea reutiliza el helper de errores de la base (BE-11), la forma de `finished` (BE-13) y sus scripts.
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde contradice a la spec, manda la spec (ver el hallazgo 1).

**Goal:** que el alumno pueda marcar un ejercicio de su asignación como hecho, dejar o editar su nota, y desmarcarlo: `POST /routine/assign-user/:id/finished` y `DELETE /routine/assign-user/:id/finished/:routineExerciseId`. Es **la primera tarea que escribe el "hecho"**.

**Architecture:** dos métodos nuevos en `RoutineService` y dos handlers en `RoutineController`, más tres DTOs. **Sin transacción:** cada endpoint es una sola escritura (un `INSERT`, un `UPDATE` o un `DELETE`) precedida de lecturas; la carrera de dos marcas simultáneas la cierra el único `uk_raef_asign_exercise` (se traduce con el helper `isDatabaseError` de BE-11). La nota vive en la misma fila que el hecho (D3): **U-13 es un camino incluido de U-12**, con el mismo endpoint. Autorización: `@Auth(UserRole.user)` y el dueño en el service (el path trae el id de la asignación, no el del alumno), como en BE-13. Un cambio de **tipo** en una entidad, sin cambio de esquema (ver el hallazgo 4).

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` · scripts de Node en el scratchpad que corren sobre `power-app/dist`.

---

## 1. Estado de partida y hallazgos al preparar el plan

**Estado de partida (verificado el 18/10):** BE-13 ya está commiteada en el backend (`d2f4c68`) y el árbol está limpio. En el repo de docs siguen stageados el plan y las specs de BE-13 (los commitea el usuario); este plan se suma encima. Existen `isDatabaseError` (BE-11), `RoutineAssignedFinishedDto` (BE-13), `@CurrentUser()` / `AuthUser`, y el único `uk_raef_asign_exercise` en `Routine_Asign_Exercise_Finished`.

1. **El roadmap y la spec difieren.** El roadmap parte esto en BE-14 (marcar y desmarcar) y BE-15 (nota), y pide que el ejercicio "esté activo" para marcarlo. La spec (§4.5, §9) **los fusiona** —la nota vive en la fila del hecho y se escribe por el mismo endpoint (D3)— y es más fina con lo dado de baja: sólo se rechaza marcar un ejercicio **que no estaba marcado** y que el coach sacó; si ya estaba marcado se puede editar su nota, y desmarcar siempre se puede. Manda la spec. La tarea siguiente del roadmap pasa a ser **BE-16** (el historial).
2. **El vínculo del que habla la spec es `Routine_Circuit`, y puede haber varios.** "El ejercicio o su vínculo están dados de baja" se evalúa contra los `Routine_Circuit` de **esa rutina** que apuntan al circuito del ejercicio. Un circuito repetido (A, B, A) tiene dos; basta con que **uno** esté activo para que el ejercicio siga en la rutina. Si hay vínculos pero todos están apagados, está "sacado". Si no hay ninguno, "no pertenece a la rutina".
3. **Un `Routine_Exercise` inexistente cuenta como "no pertenece".** La spec dice `400` para "no pertenece a la rutina"; no distingue el id que no existe del que es de otro circuito. Un `404` aquí mandaría al cliente a buscar un bug de ids que no está (mismo criterio que BE-11).
4. **`user_note` no se puede poner en `null` con el tipo actual.** La entidad lo declara `user_note?: string` con `@Column({ length: 100, nullable: true })`: TypeScript no deja asignarle `null`, y borrar la nota ("vacía → `null`") lo necesita. El patrón del proyecto (`Routine.coach_note`) es `string | null` con `type: 'varchar'` explícito, porque con la unión TypeScript emite `Object` y TypeORM no sabe qué columna crear. **Es un cambio en la entidad que no cambia el esquema** (`VARCHAR(100)` nullable, igual que en `ddl.py`): el script lo comprueba con la metadata y contra el `01`, así que `Db Creator` no se toca. La gemela del plan (`RoutineExerciseFinished`) queda igual hasta el bloque B.
5. **`updated_at` no se actualiza solo** (hallazgo 4 del Status: `onUpdate` es sintaxis de MySQL). Al editar la nota se setea a mano, como `editRoutine`. BE-30 lo resuelve para todas las entidades.
6. **Lo que se rompe si dos cosas pasan a la vez, y no se cubre:** (a) el coach borra la asignación (E-20, que no tenía hechos) justo cuando el alumno marca; (b) `editCircuit` decide borrar un ejercicio "sin historial" justo cuando el alumno lo marca. En ambos la base devuelve una violación de FK (`RESTRICT`) y respondería `500`. Son ventanas de milisegundos que la spec no pide cubrir; queda anotado en el Status.
7. **Las otras dos piezas que miran estas tablas ya están bien.** `editCircuit` consulta las dos tablas de hecho desde BE-10; `deleteExercise` (A-06) bloquea con `409` ante **cualquier** fila de `Routine_Exercise`, así que un ejercicio marcado nunca llega al `CASCADE`. Verificado leyendo el código: no hace falta tocar nada.
8. **U-12 y U-13 pasan a ✅** (spec §11). Y el **hallazgo 2** del Status ("nada escribe el registro de ejecución") deja de ser cierto **para la vía individual**; sigue abierto para el historial (BE-16) y para la vía del plan (bloque B). Se reescribe en vez de cerrarlo.
9. **El web espera marcar por serie** (B3). La spec ya lo resuelve: se marca **por ejercicio** (el tildado serie por serie es de la interfaz). Va como aviso en el Status.

## 2. Decisiones menores (se pueden vetar)

| # | Decisión | Por qué |
|---|---|---|
| m1 | **Los dos endpoints son sólo del rol `user`** (`@Auth(UserRole.user)`) | La tabla de rutas de la spec dice "user (dueño)"; coach y admin no ejecutan entrenamientos. Ellos reciben el `403` genérico del guard de roles |
| m2 | **El dueño se chequea en el service**, con un helper `isAssignmentOwner` y una constante para el texto del `403`, y **BE-13 pasa a usarlos** (un cambio chico y cubierto por sus 46 chequeos) | La misma regla en tres métodos no se escribe tres veces. El texto no cambia |
| m3 | **Sólo un string cuenta como "viene `user_note`"**: la cadena vacía la borra, y `null` o ausente significa "no tocar la nota". **No se recorta el texto** | La spec dice "la cadena vacía significa sin nota" y nada más. Recortar espacios sería inventar comportamiento sobre un texto del alumno. Si se prefiere recortar, es una línea |
| m4 | **Orden de las validaciones:** DTO (`400`) → asignación (`404`) → dueño (`403`) → ¿ya estaba marcado? → si no, el ejercicio (`400` "no pertenece" / `400` "sacado") → alta | Es el orden de la spec. Lo ya marcado **no** vuelve a validar la pertenencia (así se puede editar la nota de un ejercicio que el coach sacó después) |
| m5 | **Dos mensajes para los dos `400` del ejercicio:** `El ejercicio no pertenece a la rutina de esta asignación.` y `El ejercicio fue sacado de la rutina: ya no se puede marcar.` | La spec los trata como casos distintos |
| m6 | **La carrera por el único se resuelve releyendo la fila** y siguiendo por el camino de "ya estaba marcado" (aplica la nota si vino): `200`. Si la relectura no encuentra nada, se relanza el error (`500`) | Es lo que dice la spec ("se trata como ya estaba marcado: 200"); el nombre del único se mira para no tapar otros errores |
| m7 | **La nota se escribe sólo si cambia** (`UPDATE` explícito con `update()`, no `save()`) | Idempotencia real: repetir el mismo pedido no toca `updated_at`. Un `UPDATE` explícito además se puede verificar como SQL |
| m8 | **`DELETE` devuelve el id del path en minúscula** (`{ routine_exercise_id, finished: false }`) | Cuando no había nada que borrar no hay fila de donde sacarlo; se normaliza igual que el resto |
| m9 | **Archivos nuevos en `dtos/routine/`:** `mark_exercise_finished.dto.ts`, `assigned_finished_params.dto.ts`, `routine_assigned_unfinished_response.dto.ts`. La respuesta del `POST` reutiliza `RoutineAssignedFinishedDto` de BE-13 (es exactamente la misma forma) | Mismo patrón que los otros DTOs; una sola definición de la forma de `finished` |
| m10 | **El constructor del service suma dos repositorios al final** (`RoutineExercise` y `RoutineCircuit`, ya registrados en `routine.module.ts`) | No mueve los parámetros que usan los once scripts anteriores |
| m11 | **La respuesta de `finished` se arma con un helper (`buildFinishedResponse`)** que también usa el detalle de BE-13 | La misma forma en tres lugares |
| m12 | **Las carreras de FK (hallazgo 6) no se traducen** | Fuera de lo que pide la spec |
| m13 | **U-12 y U-13: se conserva el título de U-12** ("Marcar serie como realizado") en la spec, aunque ahora se marca por ejercicio | Renombrar CU toca el README y los otros documentos; queda para BE-38. La descripción aclara que el tildado por serie es de la interfaz |

## 3. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/entities/routine_asign_exercise_finished.entity.ts` | `user_note`: `string \| null` con `type: 'varchar'` (sin cambio de esquema) |
| `power-app/src/dtos/routine/mark_exercise_finished.dto.ts` | **Nuevo.** Body: `routine_exercise_id` y `user_note?` |
| `power-app/src/dtos/routine/assigned_finished_params.dto.ts` | **Nuevo.** Params del `DELETE`: `id` y `routineExerciseId` |
| `power-app/src/dtos/routine/routine_assigned_unfinished_response.dto.ts` | **Nuevo.** `{ routine_exercise_id, finished: false }` (Swagger) |
| `power-app/src/routine/routine.service.ts` | `markExerciseFinished` y `unmarkExerciseFinished`; helpers `isAssignmentOwner`, `findFinishedRow`, `checkExerciseIsMarkable`, `buildFinishedResponse`; una constante; el constructor suma 2 repositorios; BE-13 usa los helpers |
| `power-app/src/routine/routine.controller.ts` | Dos handlers; imports |
| `Status/estado-implementacion-backend.md` | Entrada nueva, conteos, cobertura por rol, detalle de U-12 y U-13, hallazgo 2 reescrito, plan de trabajo |
| `Status/dashboard-estado-backend.html` | Lo mismo en el dashboard |

**No se tocan:** `Db Creator/` (el esquema no cambia: se comprueba), `routine.module.ts`, `planification/`, `exercise/`, ningún otro DTO ni entidad.

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**

| Archivo | Cambio |
|---|---|
| `Use Cases/usuario/CU-U-12-marcar-serie-como-realizado.md`, `CU-U-13-dejar-una-nota-en-el-ejercicio.md` | Reescritos (spec §7) |
| `Doc/plans/2026-10-18-be-14-marcar-desmarcar-y-nota-plan.md` | Este plan |

## 4. Verificación: cómo se prueba sin levantar nada

Todo sobre `power-app/dist`, con el `lib.js` y los `fixtures.js` que ya existen. Se escriben **antes** del código y se corren **en rojo** (Tarea 1).

| Script | Qué prueba |
|---|---|
| `verify-finished-dto.js` | El body y los parámetros con el `ValidationPipe` real: nota de hasta 100 caracteres, vacía válida, `null`, tipos, ids |
| `verify-finished-rules.js` | Los dos métodos con **repositorios falsos con estado** (se comportan como la base: único, orden, `delete`). Cubre códigos, el orden de las validaciones, los seis caminos de la tabla §4.5, la carrera por el único, la idempotencia, el dueño y —lo nuevo— **un cruce con el detalle de BE-13 sobre el mismo estado**: marcar aparece en `finished` y desmarcar desaparece |
| `verify-finished-typeorm.js` | Sin conectarse: que `user_note` sigue siendo `varchar(100)` nullable (y coincide con el `01`), el `INSERT … RETURNING`, y el SQL de las lecturas, del `UPDATE` y del `DELETE`, armados a partir de lo que el service realmente pasa |
| `verify-finished-controller.js` | Rutas, verbos y roles (sólo `user`); sin `@Owner`; que el handler pasa al service el id, el body y el usuario del token; `await` sin `return`; el Swagger (los dos éxitos del `POST` y los errores) |

Además, en la Tarea 5, los **once scripts de BE-11, BE-12 y BE-13** como regresión.

**Lo que no se puede verificar acá:** que el SQL corra en un Postgres real, la carrera real (se simula en un fake), y la integración con el detalle en vivo. Queda para BE-35. Va en el Status como "no verificado".

---

## Tarea 0: Preflight

**Archivos:** ninguno.

- [ ] **Paso 1: Los dos repos están como se espera**

```bash
git -C "D:/Power App/Backend/PowerApp-Backend" status --short
git -C "D:/Power App/Backend/PowerApp-Backend" log --oneline -1
git -C "D:/Power App/Docs/PowerApp-Docs" status --short
```

Esperado: backend sin salida de `status`, en `d2f4c68`; docs con sólo los archivos de BE-13 stageados (el plan y las specs de U-09 y U-10) o limpio si el usuario ya los commiteó. Cualquier otra cosa de otra sesión **no se toca**: se registra qué archivos son antes de seguir.

- [ ] **Paso 2: Lo que el plan da por hecho está en el código y en el esquema**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
grep -n "private isDatabaseError\|private buildAssignmentVisibility" power-app/src/routine/routine.service.ts
grep -n "uk_raef_asign_exercise" "Db Creator/01_estructura.sql" power-app/src/entities/routine_asign_exercise_finished.entity.ts
grep -n "user_note" "Db Creator/01_estructura.sql" power-app/src/entities/routine_asign_exercise_finished.entity.ts
grep -n "RoutineExercise,\|RoutineCircuit," power-app/src/routine/routine.module.ts
grep -n "finished\|assign-user" power-app/src/routine/routine.controller.ts | head
```

Esperado: `isDatabaseError` y `buildAssignmentVisibility`; el único en el `01` y en la entidad; `user_note VARCHAR(100)` en el `01` (dos tablas, la individual es la de la línea 369) y `user_note?: string` en la entidad; los dos repositorios ya en el `forFeature`; y en el controller **ninguna** ruta `finished`. Si el nombre del único no coincide, **parar**: el service lo usa para la carrera.

- [ ] **Paso 3: El build parte en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
```

Esperado: termina sin errores (código de salida 0).

---

## Tarea 1: Los scripts de verificación, en rojo

**Archivos (todos en el scratchpad, fuera de los repos):**
`C:\Users\caram\AppData\Local\Temp\claude\D--Power-App-Backend-PowerApp-Backend\c46f262f-0358-40cb-a6d9-a0418172f7d2\scratchpad\`

- [ ] **Paso 1: Crear `verify-finished-dto.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

// La misma configuracion que main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const EX = '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01';
const ASSIGN = 'c1c1c1c1-aaaa-4bbb-8ccc-dddddddddddd';

(async () => {
  let Body;
  let Params;

  await run('carga los DTOs', async () => {
    ({ MarkExerciseFinishedDto: Body } = dist('dtos/routine/mark_exercise_finished.dto'));
    ({ AssignedFinishedParamsDto: Params } = dist('dtos/routine/assigned_finished_params.dto'));
    check('exporta MarkExerciseFinishedDto', typeof Body === 'function');
    check('exporta AssignedFinishedParamsDto', typeof Params === 'function');
  });

  if (!Body || !Params) return finish();

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

  console.log('-- body');
  await accepts('sólo el ejercicio', { routine_exercise_id: EX }, 'body', Body, { routine_exercise_id: EX, user_note: undefined });
  await accepts('con nota', { routine_exercise_id: EX, user_note: 'Me costó la última serie' }, 'body', Body, { user_note: 'Me costó la última serie' });
  await accepts('nota vacía (la borra)', { routine_exercise_id: EX, user_note: '' }, 'body', Body, { user_note: '' });
  await accepts('nota de exactamente 100 caracteres', { routine_exercise_id: EX, user_note: 'x'.repeat(100) }, 'body', Body, { user_note: 'x'.repeat(100) });
  await accepts('nota null (equivale a no mandarla)', { routine_exercise_id: EX, user_note: null }, 'body', Body, { user_note: null });
  await accepts('ejercicio en mayúscula (iOS)', { routine_exercise_id: EX.toUpperCase() }, 'body', Body, { routine_exercise_id: EX.toUpperCase() });

  await rejects('nota de 101 caracteres', { routine_exercise_id: EX, user_note: 'x'.repeat(101) }, 'body', Body, '100');
  await rejects('nota que no es texto', { routine_exercise_id: EX, user_note: 123 }, 'body', Body);
  await rejects('sin routine_exercise_id', { user_note: 'hola' }, 'body', Body);
  await rejects('routine_exercise_id no es UUID', { routine_exercise_id: 'abc' }, 'body', Body, 'ejercicio');
  await rejects('campo de más (forbidNonWhitelisted)', { routine_exercise_id: EX, finished: true }, 'body', Body);

  console.log('\n-- params del DELETE');
  await accepts('dos UUID válidos', { id: ASSIGN, routineExerciseId: EX }, 'param', Params, { id: ASSIGN, routineExerciseId: EX });
  await accepts('en mayúscula (iOS)', { id: ASSIGN.toUpperCase(), routineExerciseId: EX.toUpperCase() }, 'param', Params, { routineExerciseId: EX.toUpperCase() });
  await rejects('id de la asignación inválido', { id: 'abc', routineExerciseId: EX }, 'param', Params);
  await rejects('routineExerciseId inválido', { id: ASSIGN, routineExerciseId: 'abc' }, 'param', Params, 'ejercicio');
  await rejects('sin routineExerciseId', { id: ASSIGN }, 'param', Params);

  finish();
})();
```

- [ ] **Paso 2: Crear `verify-finished-rules.js`**

```js
const { dist, mod, check, run, finish } = require('./lib');
const { NOW, ROUTINE_ID, tree } = require('./fixtures');

const { RoutineService } = dist('routine/routine.service');
const { UserRole } = dist('entities/user.entity');
const { QueryFailedError } = mod('typeorm');

const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const OTHER_ID = '11111111-2222-4333-8444-555555555555';
const ASSIGN_ID = 'c1c1c1c1-aaaa-4bbb-8ccc-dddddddddddd';
const DAY = '2026-10-20';
const lc = (v) => (typeof v === 'string' ? v.toLowerCase() : v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const MSG = {
  assignment404: 'Asignación no encontrada',
  forbidden: 'No podés acceder a una rutina asignada a otro alumno.',
  notInRoutine: 'El ejercicio no pertenece a la rutina de esta asignación.',
  removed: 'El ejercicio fue sacado de la rutina: ya no se puede marcar.',
  mark500: 'Error al marcar el ejercicio.',
  unmark500: 'Error al desmarcar el ejercicio.',
};
const FINISHED_KEYS = ['routine_exercise_id', 'user_note', 'created_at', 'updated_at'];
const student = (id = USER_ID) => ({ id, role: UserRole.user, active: true });

const dbError = (code, constraint) => new QueryFailedError('SQL', [], Object.assign(new Error('db'), { code, constraint }));

// Un "mundo" en memoria: los repositorios falsos se comportan como la base (unico, orden, delete)
// y comparten el estado, asi que lo que marca un metodo lo ve el otro
function world(opts = {}) {
  const t = tree();
  const state = {
    ops: [],
    clock: 0,
    finished: (opts.finished || []).map((r, i) => ({
      id: 'f' + i, user_routine_asign_id: ASSIGN_ID, routine_exercise_id: r.id, user_note: r.note ?? null,
      created_at: new Date(NOW.getTime() + i), updated_at: new Date(NOW.getTime() + i),
    })),
    hideNextLookup: !!opts.hideNextLookup, // simula la carrera: el primer findOne no ve la fila que ya existe
    saveError: opts.saveError || null,
    failOn: opts.failOn || null,
    assignment: opts.assignment === undefined
      ? { id: ASSIGN_ID, routine_id: ROUTINE_ID, user_id: USER_ID, date: DAY, created_at: NOW, updated_at: NOW }
      : opts.assignment,
  };

  const exercises = new Map();
  for (const l of t.routineCircuits) for (const e of l.circuit.routineExercises) exercises.set(e.id, { id: e.id, circuit_id: e.circuit_id, active: e.active });
  exercises.set('z', { id: 'z', circuit_id: 'C9', active: true }); // un ejercicio de un circuito que esta rutina nunca tuvo
  const links = t.routineCircuits.map(l => ({ id: l.id, routine_id: l.routine_id, circuit_id: l.circuit_id, active: l.active }));
  const tick = () => new Date(NOW.getTime() + 60000 + (state.clock++) * 1000);

  const match = (row, where) => Object.entries(where).every(([k, v]) => lc(row[k]) === lc(v));

  const assignmentRepository = {
    findOne: async (o) => { state.ops.push('assignment.findOne'); return state.assignment && lc(state.assignment.id) === lc(o.where.id) ? state.assignment : null; },
  };
  const finishedRepository = {
    findOne: async (o) => {
      state.ops.push('finished.findOne');
      if (state.hideNextLookup) { state.hideNextLookup = false; return null; }
      const row = state.finished.find(r => match(r, o.where));
      return row ? { ...row } : null;
    },
    find: async (o) => {
      state.ops.push('finished.find');
      return state.finished.filter(r => match(r, o.where)).map(r => ({ ...r }))
        .sort((a, b) => a.created_at - b.created_at || (a.routine_exercise_id < b.routine_exercise_id ? -1 : 1));
    },
    create: (d) => ({ ...d }),
    save: async (e) => {
      state.ops.push('finished.save');
      if (state.saveError) throw state.saveError;
      if (state.finished.some(r => lc(r.user_routine_asign_id) === lc(e.user_routine_asign_id) && lc(r.routine_exercise_id) === lc(e.routine_exercise_id))) {
        throw dbError('23505', 'uk_raef_asign_exercise');
      }
      const row = { id: 'f' + state.finished.length + 'n', user_note: null, ...e, created_at: tick(), updated_at: tick() };
      state.finished.push(row);
      return { ...row };
    },
    update: async (criteria, partial) => {
      state.ops.push('finished.update');
      const row = state.finished.find(r => match(r, criteria));
      if (row) Object.assign(row, partial);
    },
    delete: async (criteria) => {
      state.ops.push('finished.delete');
      if (state.failOn === 'delete') throw new Error('se cayó la base');
      state.finished = state.finished.filter(r => !match(r, criteria));
    },
  };
  const routineExerciseRepository = {
    findOne: async (o) => { state.ops.push('exercise.findOne'); const e = exercises.get(lc(o.where.id)); return e ? { ...e } : null; },
  };
  const routineCircuitRepository = {
    find: async (o) => { state.ops.push('links.find'); return links.filter(l => match(l, o.where)).map(l => ({ id: l.id, active: l.active })); },
  };
  const routineRepository = { findOne: async () => tree() };

  // Mismo orden que el constructor: circuit, routine, dataSource, user, assignment, finished, routineExercise, routineCircuit
  const service = new RoutineService({}, routineRepository, {}, {}, assignmentRepository, finishedRepository, routineExerciseRepository, routineCircuitRepository);
  return { service, state };
}

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

async function mark(w, body, user = student(), id = ASSIGN_ID) {
  w.state.ops = [];
  const res = makeRes();
  await w.service.markExerciseFinished(id, body, user, res);
  return { res, ops: [...w.state.ops] };
}
async function unmark(w, exerciseId, user = student(), id = ASSIGN_ID) {
  w.state.ops = [];
  const res = makeRes();
  await w.service.unmarkExerciseFinished(id, exerciseId, user, res);
  return { res, ops: [...w.state.ops] };
}
async function silencing(fn) {
  const original = console.error;
  let count = 0;
  console.error = () => { count++; };
  try { await fn(); } finally { console.error = original; }
  return count;
}
const rowOf = (w, id) => w.state.finished.find(r => lc(r.routine_exercise_id) === lc(id));

(async () => {
  console.log('-- marcar · códigos, dueño y orden');

  await run('los métodos existen', async () => {
    const { service } = world();
    check('markExerciseFinished', typeof service.markExerciseFinished === 'function');
    check('unmarkExerciseFinished', typeof service.unmarkExerciseFinished === 'function');
  });

  await run('asignación inexistente → 404, sin tocar nada más', async () => {
    const w = world({ assignment: null });
    const r = await mark(w, { routine_exercise_id: 'a' });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.assignment404 }), JSON.stringify(r.res.body));
    check('sólo buscó la asignación', same(r.ops, ['assignment.findOne']), r.ops.join(','));
  });

  await run('un alumno marca en la asignación de otro → 403 sin escribir', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'a' }, student(OTHER_ID));
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
    check('mensaje propio', same(r.res.body, { error: MSG.forbidden }), JSON.stringify(r.res.body));
    check('no es el texto que cierra la sesión del web', r.res.body.error !== 'La cuenta está deshabilitada.');
    check('sólo buscó la asignación', same(r.ops, ['assignment.findOne']), r.ops.join(','));
    check('no se escribió nada', w.state.finished.length === 0);
  });

  await run('el dueño con su id del token en mayúscula', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'a' }, student(USER_ID.toUpperCase()));
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
  });

  console.log('\n-- marcar · alta (201)');

  await run('ejercicio vigente sin nota → 201, nota null, orden de las consultas', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'a' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('claves', same(Object.keys(r.res.body), FINISHED_KEYS), Object.keys(r.res.body).join(','));
    check('routine_exercise_id', r.res.body.routine_exercise_id === 'a');
    check('user_note null', r.res.body.user_note === null);
    check('quedó una fila', w.state.finished.length === 1 && w.state.finished[0].user_routine_asign_id === ASSIGN_ID);
    check('orden de las consultas', same(r.ops, ['assignment.findOne', 'finished.findOne', 'exercise.findOne', 'links.find', 'finished.save']), r.ops.join(','));
  });

  await run('con nota → 201 y la nota queda en la misma fila', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'b', user_note: 'Me costó la última serie' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('user_note en la respuesta', r.res.body.user_note === 'Me costó la última serie');
    check('user_note en la fila', rowOf(w, 'b').user_note === 'Me costó la última serie');
  });

  await run('con nota vacía en el alta → 201 y la nota es null', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'a', user_note: '' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('user_note null', r.res.body.user_note === null && rowOf(w, 'a').user_note === null);
  });

  await run('el id en mayúscula marca el ejercicio y se guarda el de la fila', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'A' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('se guardó el id de la fila (minúscula)', rowOf(w, 'a').routine_exercise_id === 'a', JSON.stringify(w.state.finished));
  });

  await run('un circuito repetido con UN vínculo activo se puede marcar', async () => {
    // C1 tiene L1 (activo) y L4 (apagado): sigue en la rutina
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'b' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
  });

  console.log('\n-- marcar · lo que no se puede marcar (400)');

  const rejected = [
    ['un ejercicio dado de baja en un vínculo activo (c)', 'c', MSG.removed],
    ['un ejercicio activo cuyo único vínculo está apagado (d)', 'd', MSG.removed],
    ['un ejercicio activo de otro circuito apagado (g)', 'g', MSG.removed],
    ['un ejercicio que no existe', 'zzz', MSG.notInRoutine],
    ['un ejercicio de un circuito que la rutina nunca tuvo (z)', 'z', MSG.notInRoutine],
  ];
  for (const [name, exerciseId, message] of rejected) {
    await run(name, async () => {
      const w = world();
      const r = await mark(w, { routine_exercise_id: exerciseId });
      check('estado 400', r.res.statusCode === 400, r.res.statusCode);
      check('mensaje', same(r.res.body, { error: message }), JSON.stringify(r.res.body));
      check('no se escribió nada', w.state.finished.length === 0 && !r.ops.includes('finished.save'));
    });
  }

  console.log('\n-- marcar · ya estaba marcado (200, idempotente)');

  await run('marcar de nuevo sin nota → 200 y no toca nada', async () => {
    const w = world({ finished: [{ id: 'a', note: 'mi nota' }] });
    const before = JSON.stringify(rowOf(w, 'a'));
    const r = await mark(w, { routine_exercise_id: 'a' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('misma nota', r.res.body.user_note === 'mi nota');
    check('no validó la pertenencia', !r.ops.includes('exercise.findOne') && !r.ops.includes('links.find'), r.ops.join(','));
    check('no escribió', !r.ops.includes('finished.save') && !r.ops.includes('finished.update'), r.ops.join(','));
    check('la fila es la misma', JSON.stringify(rowOf(w, 'a')) === before);
    check('sigue habiendo una sola fila', w.state.finished.length === 1);
  });

  await run('marcar de nuevo con otra nota → 200 y la actualiza (updated_at cambia, created_at no)', async () => {
    const w = world({ finished: [{ id: 'a', note: 'vieja' }] });
    const before = rowOf(w, 'a');
    const r = await mark(w, { routine_exercise_id: 'a', user_note: 'nueva' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('nota nueva en la respuesta', r.res.body.user_note === 'nueva');
    check('nota nueva en la fila', rowOf(w, 'a').user_note === 'nueva');
    check('created_at igual', +rowOf(w, 'a').created_at === +before.created_at);
    check('updated_at posterior', +rowOf(w, 'a').updated_at > +before.created_at);
    check('un solo UPDATE y ningún INSERT', r.ops.filter(o => o === 'finished.update').length === 1 && !r.ops.includes('finished.save'), r.ops.join(','));
  });

  await run('marcar de nuevo con nota vacía → 200 y la borra (null)', async () => {
    const w = world({ finished: [{ id: 'a', note: 'vieja' }] });
    const r = await mark(w, { routine_exercise_id: 'a', user_note: '' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('user_note null', r.res.body.user_note === null && rowOf(w, 'a').user_note === null);
  });

  await run('la misma nota otra vez → 200 sin escribir (updated_at no se mueve)', async () => {
    const w = world({ finished: [{ id: 'a', note: 'igual' }] });
    const before = +rowOf(w, 'a').updated_at;
    const r = await mark(w, { routine_exercise_id: 'a', user_note: 'igual' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('no escribió', !r.ops.includes('finished.update'), r.ops.join(','));
    check('updated_at igual', +rowOf(w, 'a').updated_at === before);
  });

  await run('nota null en el body equivale a no mandarla', async () => {
    const w = world({ finished: [{ id: 'a', note: 'queda' }] });
    const r = await mark(w, { routine_exercise_id: 'a', user_note: null });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('la nota queda', rowOf(w, 'a').user_note === 'queda');
  });

  await run('un ejercicio que el coach sacó DESPUÉS de marcarlo: se puede editar la nota', async () => {
    // d tiene su único vínculo apagado: no se podría marcar, pero ya estaba marcado
    const w = world({ finished: [{ id: 'd', note: null }] });
    const sinNota = await mark(w, { routine_exercise_id: 'd' });
    check('sin nota → 200', sinNota.res.statusCode === 200, sinNota.res.statusCode);
    const conNota = await mark(w, { routine_exercise_id: 'd', user_note: 'anoté igual' });
    check('con nota → 200', conNota.res.statusCode === 200, conNota.res.statusCode);
    check('la nota quedó', rowOf(w, 'd').user_note === 'anoté igual');
  });

  console.log('\n-- marcar · la carrera por el único');

  await run('dos marcas simultáneas: el INSERT choca con el único → se trata como ya marcado (200)', async () => {
    const w = world({ finished: [{ id: 'a', note: null }], hideNextLookup: true });
    const r = await mark(w, { routine_exercise_id: 'a' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('orden: lookup ciego, validación, INSERT que choca, relectura',
      same(r.ops, ['assignment.findOne', 'finished.findOne', 'exercise.findOne', 'links.find', 'finished.save', 'finished.findOne']), r.ops.join(','));
    check('sigue habiendo una sola fila', w.state.finished.length === 1);
  });

  await run('la misma carrera con nota: la aplica', async () => {
    const w = world({ finished: [{ id: 'a', note: null }], hideNextLookup: true });
    const r = await mark(w, { routine_exercise_id: 'a', user_note: 'gané la carrera' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('la nota quedó', rowOf(w, 'a').user_note === 'gané la carrera');
  });

  await run('un 23505 de OTRO único no se disfraza → 500', async () => {
    const w = world({ saveError: dbError('23505', 'otro_unico') });
    let r;
    const logged = await silencing(async () => { r = await mark(w, { routine_exercise_id: 'a' }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.mark500 }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  await run('el único choca pero la relectura no encuentra la fila → 500', async () => {
    const w = world({ saveError: dbError('23505', 'uk_raef_asign_exercise') });
    let r;
    await silencing(async () => { r = await mark(w, { routine_exercise_id: 'a' }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
  });

  await run('error inesperado al guardar → 500', async () => {
    const w = world({ saveError: new Error('se cayó la base') });
    let r;
    const logged = await silencing(async () => { r = await mark(w, { routine_exercise_id: 'a' }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.mark500 }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  console.log('\n-- desmarcar');

  await run('asignación inexistente → 404', async () => {
    const w = world({ assignment: null });
    const r = await unmark(w, 'a');
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.assignment404 }), JSON.stringify(r.res.body));
    check('no borró', !r.ops.includes('finished.delete'));
  });

  await run('asignación de otro alumno → 403 sin borrar', async () => {
    const w = world({ finished: [{ id: 'a' }] });
    const r = await unmark(w, 'a', student(OTHER_ID));
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
    check('mensaje propio', same(r.res.body, { error: MSG.forbidden }), JSON.stringify(r.res.body));
    check('la marca sigue', w.state.finished.length === 1);
    check('no borró', !r.ops.includes('finished.delete'));
  });

  await run('desmarcar lo marcado → 200 { routine_exercise_id, finished: false } y borra la fila con su nota', async () => {
    const w = world({ finished: [{ id: 'a', note: 'mi nota' }, { id: 'b' }] });
    const r = await unmark(w, 'a');
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('cuerpo', same(r.res.body, { routine_exercise_id: 'a', finished: false }), JSON.stringify(r.res.body));
    check('la fila se fue (y con ella la nota)', !rowOf(w, 'a') && !!rowOf(w, 'b') && w.state.finished.length === 1);
    check('consultas', same(r.ops, ['assignment.findOne', 'finished.delete']), r.ops.join(','));
  });

  await run('desmarcar lo que no estaba marcado → 200 igual (idempotente)', async () => {
    const w = world();
    const r = await unmark(w, 'a');
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('cuerpo', same(r.res.body, { routine_exercise_id: 'a', finished: false }), JSON.stringify(r.res.body));
  });

  await run('se puede desmarcar un ejercicio que el coach sacó después de marcarlo', async () => {
    const w = world({ finished: [{ id: 'd' }] });
    const r = await unmark(w, 'd');
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('la fila se fue', w.state.finished.length === 0);
    check('no validó la pertenencia', !r.ops.includes('exercise.findOne'));
  });

  await run('el id del path en mayúscula: se borra y la respuesta lo trae en minúscula', async () => {
    const w = world({ finished: [{ id: 'a' }] });
    const r = await unmark(w, 'A');
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('id en minúscula', r.res.body.routine_exercise_id === 'a', JSON.stringify(r.res.body));
    check('la fila se fue', w.state.finished.length === 0);
  });

  await run('error de la base al borrar → 500', async () => {
    const w = world({ failOn: 'delete' });
    let r;
    const logged = await silencing(async () => { r = await unmark(w, 'a'); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.unmark500 }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  console.log('\n-- cruce con el detalle de BE-13 sobre el mismo estado');

  await run('marcar aparece en finished (y deja ver el vínculo apagado de ese circuito); desmarcar lo saca', async () => {
    const w = world();
    const open = async () => {
      const res = makeRes();
      await w.service.getAssignedRoutineById(ASSIGN_ID, student(), res);
      return res.body;
    };
    const shown = (b) => b.routine.circuits.map(c => [c.id, c.circuit.exercises.map(e => e.id)]);

    const antes = await open();
    check('al principio nada hecho', antes.finished.length === 0 && same(shown(antes), [['L1', ['a', 'b']]]), JSON.stringify(shown(antes)));

    await mark(w, { routine_exercise_id: 'a', user_note: 'listo' });
    await mark(w, { routine_exercise_id: 'b' });
    const marcado = await open();
    check('finished tiene a y b', same(marcado.finished.map(f => f.routine_exercise_id), ['a', 'b']), JSON.stringify(marcado.finished));
    check('con la nota de a', marcado.finished[0].user_note === 'listo' && marcado.finished[1].user_note === null);
    check('claves de finished (la misma forma que devuelve el POST)', same(Object.keys(marcado.finished[0]), FINISHED_KEYS));
    check('el vínculo apagado L4 de C1 se muestra, con sólo lo completado', same(shown(marcado), [['L1', ['a', 'b']], ['L4', ['a', 'b']]]), JSON.stringify(shown(marcado)));

    await unmark(w, 'a');
    await unmark(w, 'b');
    const desmarcado = await open();
    check('desmarcado: finished vacío y L4 vuelve a ocultarse', desmarcado.finished.length === 0 && same(shown(desmarcado), [['L1', ['a', 'b']]]), JSON.stringify(shown(desmarcado)));
  });

  finish();
})();
```

- [ ] **Paso 3: Crear `verify-finished-typeorm.js`**

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');
const { NOW, ROUTINE_ID, tree } = require('./fixtures');

const { DataSource, getMetadataArgsStorage } = mod('typeorm');
const { RoutineService } = dist('routine/routine.service');
const { UserRole } = dist('entities/user.entity');

(async () => {
  // DataSource REAL pero sin conectarse
  const dir = path.join(ROOT, 'dist/entities');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) require(path.join(dir, file));
  const entities = getMetadataArgsStorage().tables.map(t => t.target).filter(t => typeof t === 'function');
  const ds = new DataSource({ type: 'postgres', entities });
  await ds.buildMetadatas();

  const { RoutineAsignExerciseFinished } = dist('entities/routine_asign_exercise_finished.entity');
  const { RoutineExercise } = dist('entities/routine_exercise.entity');
  const { RoutineCircuit } = dist('entities/routine_circuit.entity');
  const meta = ds.getMetadata(RoutineAsignExerciseFinished);

  console.log('-- la entidad: el tipo cambia, el esquema no');
  await run('user_note sigue siendo varchar(100) nullable y coincide con el 01', async () => {
    const col = meta.findColumnWithPropertyName('user_note');
    check('existe', !!col);
    check('tipo varchar', col && col.type === 'varchar', col && String(col.type));
    check('largo 100', col && String(col.length) === '100', col && String(col.length));
    check('nullable', col && col.isNullable === true);

    const sql = fs.readFileSync(path.join(ROOT, '..', 'Db Creator', '01_estructura.sql'), 'utf8');
    const block = sql.slice(sql.indexOf('CREATE TABLE public."Routine_Asign_Exercise_Finished"'));
    const table = block.slice(0, block.indexOf(');'));
    check('el 01 declara user_note VARCHAR(100) nullable', /user_note\s+VARCHAR\(100\),/.test(table), table.split('\n').find(l => l.includes('user_note')));
  });

  await run('el único y el INSERT', async () => {
    check('uk_raef_asign_exercise cubre asignación + ejercicio',
      meta.uniques.some(u => u.name === 'uk_raef_asign_exercise'
        && u.columns.map(c => c.propertyName).sort().join(',') === 'routine_exercise_id,user_routine_asign_id'));

    const qb = ds.createQueryBuilder().insert().into(RoutineAsignExerciseFinished)
      .values({ user_routine_asign_id: 'A', routine_exercise_id: 'E', user_note: null });
    qb.expressionMap.extraReturningColumns = meta.getInsertionReturningColumns();
    const sql = qb.getQuery();
    console.log('        ' + sql);
    check('INSERT en la tabla correcta', sql.includes('INSERT INTO "Routine_Asign_Exercise_Finished"'));
    for (const name of ['id', 'created_at', 'updated_at']) check(`RETURNING incluye "${name}"`, new RegExp('RETURNING[^;]*"' + name + '"').test(sql));
  });

  // Se corre el service con repositorios que GRABAN lo que de verdad reciben...
  const rec = {};
  const exercise = { id: 'a', circuit_id: 'C1', active: true };
  const row = { id: 'F', user_routine_asign_id: 'A', routine_exercise_id: 'a', user_note: 'vieja', created_at: NOW, updated_at: NOW };
  const make = (finishedRow) => new RoutineService(
    {}, { findOne: async () => tree() }, {}, {},
    { findOne: async () => ({ id: 'A', routine_id: ROUTINE_ID, user_id: 'U', date: '2026-10-20', created_at: NOW, updated_at: NOW }) },
    {
      findOne: async (o) => { rec.finishedLookup = o; return finishedRow; },
      create: (d) => ({ ...d }),
      save: async (e) => { rec.saved = e; return { id: 'N', created_at: NOW, updated_at: NOW, ...e }; },
      update: async (c, p) => { rec.updateCriteria = c; rec.updatePartial = p; },
      delete: async (c) => { rec.deleteCriteria = c; },
    },
    { findOne: async (o) => { rec.exerciseLookup = o; return exercise; } },
    { find: async (o) => { rec.linksLookup = o; return [{ id: 'L1', active: true }]; } },
  );
  const res = { status() { return this; }, send() { return this; } };
  const user = { id: 'U', role: UserRole.user, active: true };

  if (typeof make(null).markExerciseFinished === 'function') {
    await make(null).markExerciseFinished('A', { routine_exercise_id: 'a', user_note: 'hola' }, user, res); // alta
    await make(row).markExerciseFinished('A', { routine_exercise_id: 'a', user_note: '' }, user, res);      // nota vacia → UPDATE a null
    await make(null).unmarkExerciseFinished('A', 'a', user, res);                                          // desmarcar
  }

  // ... y se arma el SQL de esas mismas opciones con el repositorio y el DataSource reales
  const sqlOf = (entity, alias, options) => {
    const [sql, params] = ds.getRepository(entity).createQueryBuilder(alias).setFindOptions(options).getQueryAndParameters();
    return { sql: sql.replace(/\s+/g, ' '), params };
  };

  await run('las consultas se grabaron', async () => {
    for (const k of ['finishedLookup', 'exerciseLookup', 'linksLookup', 'saved', 'updateCriteria', 'updatePartial', 'deleteCriteria']) check(k, !!rec[k]);
  });
  if (!rec.finishedLookup || !rec.deleteCriteria || !rec.updatePartial) return finish();

  await run('la fila de hecho por asignación + ejercicio', async () => {
    const { sql, params } = sqlOf(RoutineAsignExerciseFinished, 'f', rec.finishedLookup);
    console.log('        ' + sql);
    check('por las dos columnas', /"user_routine_asign_id" = \$1/.test(sql) && /"routine_exercise_id" = \$2/.test(sql), sql);
    check('parámetros', params[0] === 'A' && params[1] === 'a', JSON.stringify(params));
  });

  await run('el ejercicio y sus vínculos', async () => {
    const e = sqlOf(RoutineExercise, 'e', rec.exerciseLookup);
    console.log('        ' + e.sql);
    check('Routine_Exercise por id', e.sql.includes('FROM "Routine_Exercise"') && /"id" = \$1/.test(e.sql));
    check('sólo id, circuit_id y active', ['id', 'circuit_id', 'active'].every(c => e.sql.includes(`"e"."${c}"`)) && !e.sql.includes('"e"."coach_note"'), e.sql);

    const l = sqlOf(RoutineCircuit, 'l', rec.linksLookup);
    console.log('        ' + l.sql);
    check('Routine_Circuit de ESA rutina y de ESE circuito', l.sql.includes('FROM "Routine_Circuit"') && /"routine_id" = \$1/.test(l.sql) && /"circuit_id" = \$2/.test(l.sql), l.sql);
    check('parámetros', l.params[0] === ROUTINE_ID && l.params[1] === 'C1', JSON.stringify(l.params));
    check('sólo id y active', ['id', 'active'].every(c => l.sql.includes(`"l"."${c}"`)) && !l.sql.includes('"l"."order"'), l.sql);
  });

  await run('el UPDATE de la nota y el DELETE', async () => {
    check('el alta guarda asignación, ejercicio de la fila y nota', rec.saved.user_routine_asign_id === 'A' && rec.saved.routine_exercise_id === 'a' && rec.saved.user_note === 'hola', JSON.stringify(rec.saved));
    check('el UPDATE va por id', rec.updateCriteria.id === 'F', JSON.stringify(rec.updateCriteria));
    check('pone user_note = null y updated_at a mano', rec.updatePartial.user_note === null && rec.updatePartial.updated_at instanceof Date, JSON.stringify(rec.updatePartial));

    const [updateSql, updateParams] = ds.createQueryBuilder().update(RoutineAsignExerciseFinished).set(rec.updatePartial).where(rec.updateCriteria).getQueryAndParameters();
    console.log('        ' + updateSql);
    check('UPDATE de user_note y updated_at', /UPDATE "Routine_Asign_Exercise_Finished" SET "user_note" = \$1, "updated_at" = \$2 WHERE "id" = \$3/.test(updateSql.replace(/\s+/g, ' ')), updateSql);
    check('user_note va como NULL', updateParams[0] === null, JSON.stringify(updateParams));

    check('el DELETE va por asignación + ejercicio (el id tal como llega: Postgres compara uuid sin importar la caja)',
      rec.deleteCriteria.user_routine_asign_id === 'A' && rec.deleteCriteria.routine_exercise_id === 'a', JSON.stringify(rec.deleteCriteria));
    const [deleteSql, deleteParams] = ds.createQueryBuilder().delete().from(RoutineAsignExerciseFinished).where(rec.deleteCriteria).getQueryAndParameters();
    console.log('        ' + deleteSql);
    check('DELETE de las dos columnas', /DELETE FROM "Routine_Asign_Exercise_Finished" WHERE "user_routine_asign_id" = \$1 AND "routine_exercise_id" = \$2/.test(deleteSql.replace(/\s+/g, ' ')), deleteSql);
    check('parámetros', deleteParams[0] === 'A' && deleteParams[1] === 'a', JSON.stringify(deleteParams));
  });

  finish();
})();
```

- [ ] **Paso 4: Crear `verify-finished-controller.js`**

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

const POST = 1;
const DELETE = 3;
const allow = { canActivate: () => true };

(async () => {
  const seen = { mark: null, unmark: null };
  const stub = {
    markExerciseFinished: async (...args) => { await new Promise(r => setTimeout(r, 20)); seen.mark = args; return 'RESPONSE'; },
    unmarkExerciseFinished: async (...args) => { await new Promise(r => setTimeout(r, 20)); seen.unmark = args; return 'RESPONSE'; },
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
    ['markExerciseFinished', POST, 'assign-user/:id/finished'],
    ['unmarkExerciseFinished', DELETE, 'assign-user/:id/finished/:routineExerciseId'],
  ];
  for (const [name, method, route] of handlers) {
    await run(`${name}: ruta, verbo y roles`, async () => {
      check(`${name} existe`, typeof proto[name] === 'function');
      check(`${name} → ${route}`, Reflect.getMetadata('path', proto[name]) === route, Reflect.getMetadata('path', proto[name]));
      check(`${name} → verbo`, Reflect.getMetadata('method', proto[name]) === method, Reflect.getMetadata('method', proto[name]));
      const roles = Reflect.getMetadata('roles', proto[name]);
      check(`${name} → sólo el alumno`, Array.isArray(roles) && roles.length === 1 && roles[0] === UserRole.user, JSON.stringify(roles));
      check(`${name} → sin @Owner (el dueño va en el service)`, Reflect.getMetadata(OWNER_PARAM_KEY, proto[name]) === undefined);
    });
  }

  console.log('\n-- argumentos y await');
  const tokenUser = { id: 'u1', role: UserRole.user, active: true };
  await run('marcar: pasa el id, el body y el usuario; espera sin devolver el Response', async () => {
    const body = { routine_exercise_id: 'e1', user_note: 'hola' };
    const res = {};
    const ret = await controller.markExerciseFinished({ id: 'a1' }, body, tokenUser, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('id de la asignación', seen.mark && seen.mark[0] === 'a1');
    check('body', seen.mark && seen.mark[1] === body);
    check('usuario del token', seen.mark && seen.mark[2] === tokenUser);
    check('response', seen.mark && seen.mark[3] === res);
  });
  await run('desmarcar: pasa los dos ids y el usuario; espera sin devolver el Response', async () => {
    const res = {};
    const ret = await controller.unmarkExerciseFinished({ id: 'a1', routineExerciseId: 'e1' }, tokenUser, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('id de la asignación', seen.unmark && seen.unmark[0] === 'a1');
    check('id del ejercicio', seen.unmark && seen.unmark[1] === 'e1');
    check('usuario del token', seen.unmark && seen.unmark[2] === tokenUser);
    check('response', seen.unmark && seen.unmark[3] === res);
  });

  console.log('\n-- Swagger');
  await run('el documento generado declara éxitos y errores', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const post = doc.paths['/routine/assign-user/{id}/finished'] && doc.paths['/routine/assign-user/{id}/finished'].post;
    const del = doc.paths['/routine/assign-user/{id}/finished/{routineExerciseId}'] && doc.paths['/routine/assign-user/{id}/finished/{routineExerciseId}'].delete;
    const refOf = (r) => (r && r.content && r.content['application/json'].schema.$ref) || '';

    check('POST está en el documento', !!post);
    check('DELETE está en el documento', !!del);
    if (post) {
      for (const code of ['200', '201', '400', '403', '404']) check(`POST declara ${code}`, !!post.responses[code], Object.keys(post.responses).join(','));
      check('el 201 y el 200 son RoutineAssignedFinishedDto', refOf(post.responses['201']).endsWith('/RoutineAssignedFinishedDto') && refOf(post.responses['200']).endsWith('/RoutineAssignedFinishedDto'));
      check('el body es MarkExerciseFinishedDto', (post.requestBody.content['application/json'].schema.$ref || '').endsWith('/MarkExerciseFinishedDto'));
      check('POST pide token', Array.isArray(post.security) && post.security.some(s => 'bearer' in s));
    }
    if (del) {
      for (const code of ['200', '400', '403', '404']) check(`DELETE declara ${code}`, !!del.responses[code], Object.keys(del.responses).join(','));
      check('el 200 es RoutineAssignedUnfinishedResponseDto', refOf(del.responses['200']).endsWith('/RoutineAssignedUnfinishedResponseDto'));
      check('DELETE pide token', Array.isArray(del.security) && del.security.some(s => 'bearer' in s));
      const params = del.parameters.map(p => `${p.in}:${p.name}`);
      check('parámetros de path id y routineExerciseId', params.includes('path:id') && params.includes('path:routineExerciseId'), params.join(','));
    }

    const body = doc.components.schemas.MarkExerciseFinishedDto;
    check('el body exige routine_exercise_id y deja user_note opcional',
      body && (body.required || []).includes('routine_exercise_id') && !(body.required || []).includes('user_note'), JSON.stringify(body && body.required));
    check('user_note documenta su máximo de 100', body && body.properties.user_note.maxLength === 100, JSON.stringify(body && body.properties.user_note));
    const unfinished = doc.components.schemas.RoutineAssignedUnfinishedResponseDto;
    check('la respuesta del DELETE documenta routine_exercise_id y finished', unfinished && ['routine_exercise_id', 'finished'].every(k => k in unfinished.properties));

    check('lo de BE-11, BE-12 y BE-13 sigue en el documento',
      !!doc.paths['/routine/assign-user'] && !!(doc.paths['/routine/assign-user/{id}'] || {}).get && !!(doc.paths['/routine/assign-user/{id}'] || {}).delete && !!doc.paths['/routine/assigned/{userId}']);
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 5: Correr los cuatro scripts en rojo**

```bash
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-finished-dto verify-finished-rules verify-finished-typeorm verify-finished-controller; do echo "=== $f"; node "$S/$f.js" 2>&1 | grep -v "^  ok" | cut -c1-190 | tail -9; done
```

Esperado:
- `verify-finished-dto`: `Cannot find module` (los DTOs no existen).
- `verify-finished-rules`: fallan por `markExerciseFinished is not a function`.
- `verify-finished-typeorm`: **casi todo pasa o falla muy poco**: la sección de la entidad pasa (el tipo `varchar(100)` ya es el actual) y las consultas no se graban porque los métodos no existen.
- `verify-finished-controller`: handlers inexistentes.

Anotar cuántas fallas dio cada uno (van al Status como "antes en rojo").

> Si un script falla por una causa del **entorno de la prueba** (por ejemplo, un fixture con la forma equivocada o un guard que pide una dependencia que el `overrideGuard` no cubre), se corrige **el script** en este paso hasta que dé la falla que corresponde. No se sigue con un script que falla por una razón equivocada.

---

## Tarea 2: La entidad y los DTOs

**Archivos:**
- Modificar: `power-app/src/entities/routine_asign_exercise_finished.entity.ts`
- Crear: `power-app/src/dtos/routine/mark_exercise_finished.dto.ts`
- Crear: `power-app/src/dtos/routine/assigned_finished_params.dto.ts`
- Crear: `power-app/src/dtos/routine/routine_assigned_unfinished_response.dto.ts`

- [ ] **Paso 1: `user_note` admite `null` en la entidad (sin cambiar la columna)**

En `routine_asign_exercise_finished.entity.ts`, reemplazar:

```ts
    @ApiPropertyOptional({ example: 'Me costó la última serie', maxLength: 100 })
    @Column({ length: 100, nullable: true })
    user_note?: string;
```

por:

```ts
    // Acepta null explicito: dejar la nota vacia la borra (U-13), y TypeORM ignora las propiedades
    // undefined. El type: 'varchar' es OBLIGATORIO con la union: TS emite design:type = Object para
    // string | null, y sin el tipo declarado TypeORM no sabe que columna crear. La columna no cambia:
    // sigue siendo VARCHAR(100) nullable, igual que en ddl.py
    @ApiPropertyOptional({ example: 'Me costó la última serie', maxLength: 100, nullable: true })
    @Column({ type: 'varchar', length: 100, nullable: true })
    user_note?: string | null;
```

- [ ] **Paso 2: Crear `mark_exercise_finished.dto.ts`**

```ts
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarkExerciseFinishedDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id del Routine_Exercise que el alumno hizo (en el árbol del detalle es el campo id de cada ejercicio). El hecho es por ejercicio, no por serie: el tildado serie por serie es de la interfaz' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de ejercicio debe ser un UUID válido' })
    routine_exercise_id!: string;

    @ApiPropertyOptional({ example: 'Me costó la última serie', maxLength: 100, description: 'Nota del alumno sobre el ejercicio. Si se omite, no se toca la nota (en un ejercicio nuevo queda sin nota). La cadena vacía la borra' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    user_note?: string;
}
```

- [ ] **Paso 3: Crear `assigned_finished_params.dto.ts`**

```ts
import { IsUUID, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Params de DELETE /routine/assign-user/:id/finished/:routineExerciseId.
 * `ParameterIdDto` sólo contempla un id, y acá el path lleva dos.
 */
export class AssignedFinishedParamsDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la asignación individual' })
    @Type(() => String)
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de asignación debe ser un UUID válido en formato PostgreSQL' })
    id!: string;

    @ApiProperty({ example: 'uuid-1234', description: 'Id del Routine_Exercise que se desmarca' })
    @Type(() => String)
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de ejercicio debe ser un UUID válido en formato PostgreSQL' })
    routineExerciseId!: string;
}
```

- [ ] **Paso 4: Crear `routine_assigned_unfinished_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class RoutineAssignedUnfinishedResponseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'El ejercicio que se desmarcó (el id del path, en minúscula)' })
    routine_exercise_id!: string;

    @ApiProperty({ example: false, description: 'Siempre false. Desmarcar es idempotente: también responde 200 si el ejercicio no estaba marcado' })
    finished!: boolean;
}
```

- [ ] **Paso 5: Compilar y correr `verify-finished-dto.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-finished-dto.js"
```

Esperado: build en verde (el cambio de la entidad **compila** con el resto: BE-13 ya hacía `row.user_note ?? null`); `verify-finished-dto.js` con `N ok, 0 fallas` (N ≈ 25).

---

## Tarea 3: El service

**Archivos:**
- Modificar: `power-app/src/routine/routine.service.ts`

- [ ] **Paso 1: Imports, constante y constructor**

Junto a los otros imports de DTOs:

```ts
import { MarkExerciseFinishedDto } from '../dtos/routine/mark_exercise_finished.dto';
```

Junto a las otras dos constantes (después de `REMOVE_TRAINED_ERROR`):

```ts
// El 403 de las operaciones sobre una asignacion de otro alumno (detalle, marcar, desmarcar).
// No puede ser 'La cuenta está deshabilitada.': es el unico texto que hace cerrar la sesion en el web
const OTHER_STUDENT_ASSIGNMENT_ERROR = 'No podés acceder a una rutina asignada a otro alumno.';
```

El constructor suma dos repositorios **al final** (ya están en el `forFeature`; `RoutineExercise` y `RoutineCircuit` ya están importados en el archivo):

```ts
        @InjectRepository(RoutineAsignExerciseFinished)
        private routineAsignExerciseFinishedRepository: Repository<RoutineAsignExerciseFinished>,
        @InjectRepository(RoutineExercise)
        private routineExerciseRepository: Repository<RoutineExercise>,
        @InjectRepository(RoutineCircuit)
        private routineCircuitRepository: Repository<RoutineCircuit>,
    ) {
```

- [ ] **Paso 2: Los dos métodos, después de `getAssignedRoutineById` y antes de `// ===== HELPERS DE ASIGNACION INDIVIDUAL =====`**

```ts
    // CU-U-12, con U-13 incluido (D3): marcar un ejercicio como hecho y, en la misma fila, dejar o
    // editar la nota. El hecho es por ejercicio, no por serie: el tildado serie por serie es de la
    // interfaz. Es una sola escritura (INSERT o UPDATE), asi que no hay transaccion: la carrera de
    // dos marcas simultaneas la cierra el unico de la base. Sin ventana de fechas (D5)
    async markExerciseFinished(
        idAssignment: string,
        markExerciseFinishedDto: MarkExerciseFinishedDto,
        currentUser: AuthUser,
        res: Response
    ) {
        try {
            const assignment = await this.routineAsignationUserRepository.findOne({
                where: { id: idAssignment },
            });

            if (!assignment) {
                return res.status(404).send({ error: 'Asignación no encontrada' });
            }

            if (!this.isAssignmentOwner(assignment, currentUser)) {
                return res.status(403).send({ error: OTHER_STUDENT_ASSIGNMENT_ERROR });
            }

            // Solo un string cuenta como "viene la nota": '' la borra (spec §4.5) y null o ausente
            // significa no tocarla
            const sentNote = typeof markExerciseFinishedDto.user_note === 'string'
                ? (markExerciseFinishedDto.user_note === '' ? null : markExerciseFinishedDto.user_note)
                : undefined;

            let finished = await this.findFinishedRow(assignment.id, markExerciseFinishedDto.routine_exercise_id);

            if (!finished) {
                // No estaba marcado: el ejercicio tiene que ser de la rutina y seguir en ella
                const markable = await this.checkExerciseIsMarkable(
                    assignment.routine_id,
                    markExerciseFinishedDto.routine_exercise_id,
                );

                if ('error' in markable) {
                    return res.status(400).send({ error: markable.error });
                }

                try {
                    const created = await this.routineAsignExerciseFinishedRepository.save(
                        this.routineAsignExerciseFinishedRepository.create({
                            user_routine_asign_id: assignment.id,
                            routine_exercise_id: markable.exerciseId,
                            user_note: sentNote ?? null,
                        })
                    );

                    return res.status(201).send(this.buildFinishedResponse(created));
                } catch (error) {
                    // Dos marcas simultaneas pasan las dos la lectura y la segunda choca con el
                    // unico: se trata como "ya estaba marcado" (spec §4.5). Se mira el nombre del
                    // unico para no disfrazar otro error, y si la fila no aparece se relanza
                    if (!this.isDatabaseError(error, '23505', 'uk_raef_asign_exercise')) {
                        throw error;
                    }

                    finished = await this.findFinishedRow(assignment.id, markExerciseFinishedDto.routine_exercise_id);

                    if (!finished) {
                        throw error;
                    }
                }
            }

            // Ya estaba marcado: idempotente. Sin nota no se toca nada, y con nota solo se escribe
            // si cambia. updated_at se setea a mano: el onUpdate de las entidades es sintaxis de
            // MySQL y en Postgres no hace nada
            if (sentNote !== undefined && sentNote !== (finished.user_note ?? null)) {
                const updatedAt = new Date();

                await this.routineAsignExerciseFinishedRepository.update(
                    { id: finished.id },
                    { user_note: sentNote, updated_at: updatedAt },
                );

                finished.user_note = sentNote;
                finished.updated_at = updatedAt;
            }

            return res.status(200).send(this.buildFinishedResponse(finished));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al marcar el ejercicio.' });
        }
    }

    // Borra la fila y, con ella, la nota. Idempotente: si no estaba marcado tambien responde 200.
    // No mira si el ejercicio sigue en la rutina: se puede desmarcar lo que el coach saco despues
    async unmarkExerciseFinished(
        idAssignment: string,
        routineExerciseId: string,
        currentUser: AuthUser,
        res: Response
    ) {
        try {
            const assignment = await this.routineAsignationUserRepository.findOne({
                where: { id: idAssignment },
            });

            if (!assignment) {
                return res.status(404).send({ error: 'Asignación no encontrada' });
            }

            if (!this.isAssignmentOwner(assignment, currentUser)) {
                return res.status(403).send({ error: OTHER_STUDENT_ASSIGNMENT_ERROR });
            }

            await this.routineAsignExerciseFinishedRepository.delete({
                user_routine_asign_id: assignment.id,
                routine_exercise_id: routineExerciseId,
            });

            // Si no habia nada que borrar no hay fila de donde sacar el id: se devuelve el del path
            // normalizado, en minuscula como el resto
            return res.status(200).send({
                routine_exercise_id: routineExerciseId.toLowerCase(),
                finished: false,
            });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al desmarcar el ejercicio.' });
        }
    }
```

- [ ] **Paso 3: Los helpers, dentro de `// ===== HELPERS DE ASIGNACION INDIVIDUAL =====`, después de `buildAssignmentVisibility` y antes de `isDatabaseError`**

```ts
    // "Dueño" = la asignacion es del alumno del token, comparado en minuscula (el iOS manda los
    // UUID en mayuscula). Lo usan el detalle, marcar y desmarcar: el path trae el id de la
    // asignacion y no el del alumno, asi que no alcanza con @Owner
    private isAssignmentOwner(assignment: RoutineAsignationUser, currentUser: AuthUser): boolean {
        return assignment.user_id.toLowerCase() === currentUser.id.toLowerCase();
    }

    private async findFinishedRow(
        assignmentId: string,
        routineExerciseId: string
    ): Promise<RoutineAsignExerciseFinished | null> {
        return this.routineAsignExerciseFinishedRepository.findOne({
            where: { user_routine_asign_id: assignmentId, routine_exercise_id: routineExerciseId },
        });
    }

    // Si un ejercicio que todavia no estaba marcado se puede marcar (spec §4.5). Tiene que ser de
    // la rutina: algun Routine_Circuit de ESA rutina contiene su circuito, activo o no. Y tiene que
    // seguir en ella: el ejercicio activo y al menos un vinculo activo (con un circuito repetido,
    // A, B, A, basta con uno). Un id que no existe cuenta como "no pertenece": un 404 mandaria al
    // cliente a buscar un bug de ids que no esta
    private async checkExerciseIsMarkable(
        routineId: string,
        routineExerciseId: string
    ): Promise<{ exerciseId: string } | { error: string }> {
        const exercise = await this.routineExerciseRepository.findOne({
            where: { id: routineExerciseId },
            select: { id: true, circuit_id: true, active: true },
        });

        const links = exercise
            ? await this.routineCircuitRepository.find({
                where: { routine_id: routineId, circuit_id: exercise.circuit_id },
                select: { id: true, active: true },
            })
            : [];

        if (!exercise || links.length === 0) {
            return { error: 'El ejercicio no pertenece a la rutina de esta asignación.' };
        }

        if (!exercise.active || !links.some(link => link.active)) {
            return { error: 'El ejercicio fue sacado de la rutina: ya no se puede marcar.' };
        }

        // El id de la fila y no el del body: puede venir en mayuscula
        return { exerciseId: exercise.id };
    }

    // Lo que el cliente cruza con el arbol de la rutina por routine_exercise_id. La misma forma en
    // el detalle (finished) y en la respuesta de marcar
    private buildFinishedResponse(row: RoutineAsignExerciseFinished) {
        return {
            routine_exercise_id: row.routine_exercise_id,
            user_note: row.user_note ?? null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
```

- [ ] **Paso 4: BE-13 usa los helpers (sin cambiar lo que devuelve)**

En `getAssignedRoutineById`, reemplazar el chequeo de dueño:

```ts
            if (currentUser.role === UserRole.user
                && assignment.user_id.toLowerCase() !== currentUser.id.toLowerCase()) {
                return res.status(403).send({
                    error: 'No podés acceder a una rutina asignada a otro alumno.'
                });
            }
```

por (los comentarios que lo acompañan se conservan):

```ts
            if (currentUser.role === UserRole.user && !this.isAssignmentOwner(assignment, currentUser)) {
                return res.status(403).send({ error: OTHER_STUDENT_ASSIGNMENT_ERROR });
            }
```

y el mapeo de `finished`:

```ts
                finished: finishedRows.map(row => ({
                    routine_exercise_id: row.routine_exercise_id,
                    user_note: row.user_note ?? null,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                })),
```

por:

```ts
                finished: finishedRows.map(row => this.buildFinishedResponse(row)),
```

- [ ] **Paso 5: Compilar y correr `verify-finished-rules.js`, `verify-finished-typeorm.js` y `verify-detail-rules.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-finished-rules.js" && node "$S/verify-finished-typeorm.js" && node "$S/verify-detail-rules.js" | tail -2
```

Esperado: build en verde; `verify-finished-rules.js` con `N ok, 0 fallas` (N ≈ 130); `verify-finished-typeorm.js` con `0 fallas` y **los SQL impresos**; `verify-detail-rules.js` sigue en `46 ok, 0 fallas` (el refactor de BE-13 no cambió nada). **Leer los SQL a ojo antes de seguir**: la lectura de la fila, la del ejercicio y la de sus vínculos, el `UPDATE` y el `DELETE`. Si un chequeo del SQL falla por una diferencia de comillas o de espacios entre lo que arma TypeORM y la expresión regular, se ajusta la regex *después* de leer el SQL y confirmar que dice lo mismo; si la diferencia es de fondo (una condición que falta), se corrige el service.

---

## Tarea 4: El controller y su Swagger

**Archivos:**
- Modificar: `power-app/src/routine/routine.controller.ts`

- [ ] **Paso 1: Imports**

Junto a los otros imports de DTOs:

```ts
import { MarkExerciseFinishedDto } from '../dtos/routine/mark_exercise_finished.dto';
import { AssignedFinishedParamsDto } from '../dtos/routine/assigned_finished_params.dto';
import { RoutineAssignedUnfinishedResponseDto } from '../dtos/routine/routine_assigned_unfinished_response.dto';
import { RoutineAssignedFinishedDto } from '../dtos/routine/routine_assigned_detail_response.dto';
```

- [ ] **Paso 2: Los dos handlers, en la sección `ASIGNACION INDIVIDUAL A UN ALUMNO`, después de `getAssignedRoutineById` y antes de `getAssignedRoutines`**

```ts
    // Marcar, dejar o editar la nota (U-12, con U-13 incluido). Solo el alumno dueño: el dueño se
    // chequea en el service porque el path trae el id de la asignacion y no el del alumno. El
    // hecho es POR EJERCICIO, no por serie: el tildado serie por serie es de la interfaz
    @Post('assign-user/:id/finished')
    @Auth(UserRole.user)
    @ApiResponse({ status: 201, type: RoutineAssignedFinishedDto, description: 'El ejercicio no estaba marcado: se creó la marca (con la nota, si vino)' })
    @ApiResponse({ status: 200, type: RoutineAssignedFinishedDto, description: 'Ya estaba marcado (también si dos marcas chocaron): idempotente. Si vino user_note se actualizó; la cadena vacía la borra' })
    @ApiResponse({ status: 400, description: 'Datos inválidos, el ejercicio no pertenece a la rutina de la asignación, o el coach lo sacó de la rutina y todavía no estaba marcado' })
    @ApiResponse({ status: 403, description: 'La asignación es de otro alumno' })
    @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
    async markExerciseFinished(
        @Param() idAssignment: ParameterIdDto,
        @Body() markExerciseFinishedDto: MarkExerciseFinishedDto,
        @CurrentUser() user: AuthUser,
        @Res() res: Response,
    ) {
        await this.routineService.markExerciseFinished(idAssignment.id, markExerciseFinishedDto, user, res);
    }

    // Borra la marca y su nota. Idempotente: 200 también si el ejercicio no estaba marcado. Se
    // puede desmarcar un ejercicio que el coach sacó de la rutina después
    @Delete('assign-user/:id/finished/:routineExerciseId')
    @Auth(UserRole.user)
    @ApiResponse({ status: 200, type: RoutineAssignedUnfinishedResponseDto })
    @ApiResponse({ status: 400, description: 'Alguno de los ids no es un UUID válido' })
    @ApiResponse({ status: 403, description: 'La asignación es de otro alumno' })
    @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
    async unmarkExerciseFinished(
        @Param() params: AssignedFinishedParamsDto,
        @CurrentUser() user: AuthUser,
        @Res() res: Response,
    ) {
        await this.routineService.unmarkExerciseFinished(params.id, params.routineExerciseId, user, res);
    }
```

- [ ] **Paso 3: Compilar y correr `verify-finished-controller.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-finished-controller.js"
```

Esperado: build en verde; `0 fallas`. Si falla el chequeo de `await`, el handler tiene un `return`: **sacarlo** (regla de BE-04).

---

## Tarea 5: Barrido final del código

**Archivos:** ninguno nuevo.

- [ ] **Paso 1: Build limpio y todos los scripts seguidos** (los cuatro nuevos y los once de BE-11, BE-12 y BE-13, como regresión)

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build >/dev/null 2>&1; echo "build exit=$?"
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-finished-dto verify-finished-rules verify-finished-typeorm verify-finished-controller verify-builders verify-detail-rules verify-detail-sql verify-detail-controller verify-assigned-dto verify-assigned-rules verify-assigned-controller verify-dto verify-rules verify-typeorm verify-controller; do echo "=== $f: $(node "$S/$f.js" 2>&1 | tail -1)"; done
```

Esperado: `build exit=0` y quince `N ok, 0 fallas`. Los once de antes dan lo mismo (10, 46, 16, 24, 24, 58, 27, 58, 62, 19, 30). Anotar los conteos para el Status.

- [ ] **Paso 2: Nada se escapó de lo acordado**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git status --short
git diff --stat -- "Db Creator" power-app/src/routine/routine.module.ts power-app/src/planification power-app/src/exercise
git diff -- power-app/src/entities | grep "^[-+]" | grep -v "^+++\|^---"
grep -n "return this.routineService" power-app/src/routine/routine.controller.ts
grep -rn "La cuenta está deshabilitada" power-app/src/routine power-app/src/dtos/routine
```

Esperado:
- `git status`: sólo la entidad, los 3 DTOs nuevos, `routine.service.ts` y `routine.controller.ts` (los Status todavía no).
- `git diff --stat` de `Db Creator`, `routine.module.ts`, `planification/` y `exercise/`: **vacío**.
- El `diff` de las entidades: **sólo** las líneas del comentario y de `user_note` en `routine_asign_exercise_finished.entity.ts`.
- `return this.routineService` y `La cuenta está deshabilitada`: **sin resultados**.

---

## Tarea 6: Status (informe y dashboard)

**Archivos:**
- Modificar: `Status/estado-implementacion-backend.md`
- Modificar: `Status/dashboard-estado-backend.html`

Los números: ✅ 61 → **63**, ⬜ 4 → **2**, 🟡 7, 🔵 2, sin backend 1. Porcentajes: ✅ 63/75 = **84%**, 🟡 **9%**, 🔵 **3%**, ⬜ 2/75 = **3%**, sin backend **1%** (suman 100). Sobre los CU con backend: 63/74 = **85%**. Usuario: ✅ 15 → **17**, ⬜ 2 → **0**, 🟡 2, 🔵 0, sin backend 1 (17/19 = **89%**). Pendientes: 11 (7 parciales, 2 andamiaje, 2 sin implementar). **El corte queda en 2026-10-18.**

- [ ] **Paso 1: Informe: resumen y cobertura**

En `estado-implementacion-backend.md`:
1. Tabla de resumen: `| ✅ Implementado | 61 | 81% |` → `| ✅ Implementado | 63 | 84% |`; `| ⬜ No implementado | 4 | 5% |` → `| ⬜ No implementado | 2 | 3% |`.
2. Línea de «61 de los 74»: `**61 de los 74 CU con backend están completos (82%).** Faltan 13: 7 parciales, 2 en andamiaje y 4 sin implementar.` → `**63 de los 74 CU con backend están completos (85%).** Faltan 11: 7 parciales, 2 en andamiaje y 2 sin implementar.`
3. Cobertura por rol: `| Usuario | 20 | 15 | 2 | 0 | 2 | 1 | 79% |` → `| Usuario | 20 | 17 | 2 | 0 | 0 | 1 | 89% |`; `| **Total** | **75** | **61** | **7** | **2** | **4** | **1** | **82%** |` → `| **Total** | **75** | **63** | **7** | **2** | **2** | **1** | **85%** |`.

- [ ] **Paso 2: Informe: entrada nueva en "Cambios recientes"**, justo arriba de la de BE-13 (`## Cambios recientes (2026-10-18 · rutina individual: detalle para el alumno)`)

```markdown
## Cambios recientes (2026-10-18 · rutina individual: marcar, desmarcar y nota)

- **Decimocuarta y decimoquinta tarea del roadmap (BE-14 y BE-15, fusionadas): U-12 y U-13 pasan a ✅.** `POST /routine/assign-user/:id/finished` y `DELETE /routine/assign-user/:id/finished/:routineExerciseId` (spec del 17/10, §4.5 y §4.6), en `routine.controller.ts` y `routine.service.ts`. Plan: `Doc/plans/2026-10-18-be-14-marcar-desmarcar-y-nota-plan.md` (repo PowerApp-Docs). Conteos: ✅ 61 → **63** y ⬜ 4 → **2**; el Usuario sube de 79% a 89%. **Es la primera tarea que escribe el "hecho".** Salvedad: igual que el detalle, marcar dentro de una planificación (la vía `Routine_Exercise_Finished`) es del bloque B; U-12 y U-13 pasan a ✅ porque así lo fija la spec (§11) para el cierre del bloque A.
- **Se fusionaron BE-14 y BE-15 (D3).** El roadmap los separaba (marcar y desmarcar, por un lado; la nota, por otro). La spec los une: la nota vive en la **misma fila** que el hecho y se escribe por el mismo endpoint, así que **U-13 es un camino incluido de U-12** (sigue contando como CU). La tarea siguiente del roadmap es **BE-16** (el historial).
- **Marcar: `POST …/finished`** con `{ routine_exercise_id, user_note? }` (sólo el rol `user`). `404` si la asignación no existe, `403` si es de otro alumno (el dueño se chequea en el service, como en el detalle). Después, en este orden: si **ya estaba marcado** → `200`, idempotente (con `user_note` la actualiza, y la cadena vacía la borra; sin `user_note` no toca nada). Si **no estaba marcado**, el ejercicio tiene que ser de la rutina de la asignación (`400` si no) y seguir en ella (`400` si el coach lo sacó) → se crea la fila y responde `201`. Respuesta: `{ routine_exercise_id, user_note, created_at, updated_at }`, la misma forma que `finished` en el detalle. **Sin ventana de fechas** (D5): se puede marcar en cualquier momento.
- **Qué significa "sacado de la rutina".** Se mira contra los `Routine_Circuit` **de esa rutina** que apuntan al circuito del ejercicio: está sacado si el ejercicio está dado de baja **o** si todos esos vínculos están apagados. Con un circuito repetido (A, B, A) basta con un vínculo activo. Un ejercicio que no existe cuenta como "no pertenece" (`400`, no `404`): un `404` mandaría al cliente a buscar un bug de ids que no está. **Lo ya marcado no vuelve a validarse**: así se puede editar la nota de un ejercicio que el coach sacó después de que el alumno lo hizo.
- **Desmarcar: `DELETE …/finished/:routineExerciseId`** (sólo `user`). Mismos `404` y `403`. Borra la fila **y su nota**. **Idempotente:** `200` `{ routine_exercise_id, finished: false }` también si no estaba marcado, y se puede desmarcar lo que el coach sacó de la rutina después.
- **La carrera de dos marcas simultáneas se resuelve con el único** `uk_raef_asign_exercise`: las dos pasan la lectura, la segunda choca en el `INSERT`, y el service **relee la fila y sigue como "ya estaba marcado"** (aplica la nota si vino) → `200`. Se mira el nombre del único para no disfrazar otro error (mismo helper que BE-11). Sin transacción: cada endpoint es una sola escritura.
- **Se marca por ejercicio, no por serie (aviso al web).** El web espera marcar por serie (B3). La spec ya lo resolvió el 25/8: el hecho es **por ejercicio** y el tildado serie por serie es de la interfaz. B3 tiene que adaptar lo que esperaba.
- **Cambio en una entidad que no cambia el esquema.** `RoutineAsignExerciseFinished.user_note` pasa de `string` a `string | null` con `type: 'varchar'` explícito (el patrón de `Routine.coach_note`), porque borrar la nota la pone en `null` y TypeScript no lo dejaba. **La columna es la misma:** `VARCHAR(100)` nullable, igual que en `ddl.py` y en el `01`; se comprobó con la metadata y contra el `01`, así que `Db Creator` no se tocó. La gemela de la vía del plan (`RoutineExerciseFinished`) queda como está hasta el bloque B.
- **`updated_at` se setea a mano al editar la nota** (el `onUpdate` de las entidades es sintaxis de MySQL; hallazgo 4, lo resuelve BE-30), y la nota sólo se escribe si cambia: repetir el mismo pedido no mueve `updated_at`.
- **BE-13 pasó a usar los mismos helpers** (el chequeo de dueño y el armado de `finished`), sin cambiar lo que devuelve: sus 46 chequeos siguen en verde.
- **Revisado y sin cambios:** `editCircuit` ya consulta las dos tablas de hecho desde BE-10, y `deleteExercise` (A-06) bloquea con `409` ante **cualquier** fila de `Routine_Exercise`, así que un ejercicio marcado nunca llega al `CASCADE`.
- **Hallazgo 2 reescrito, no cerrado.** Ya no es cierto que "nada escribe" el registro: desde hoy la **vía individual** se escribe. Siguen abiertos el historial del entrenador (E-06 y E-07, BE-16) y **toda la vía del plan**.
- **Para el web.** B3 (marcar) y B4 (nota) ya pueden tipar contra el Swagger de estos dos endpoints. Cruzar lo hecho por `routine_exercise_id`, que es el campo `id` de cada ejercicio del árbol.
- **Verificación, sin levantar el server.** Hecho:
  - Build en verde.
  - {N_FDTO} chequeos del body y de los parámetros con el `ValidationPipe` real.
  - {N_FRULES} chequeos de las reglas con **repositorios falsos con estado** (se comportan como la base: único, orden, `delete`): códigos y orden de las validaciones, los seis caminos de la tabla del §4.5, el dueño con ids en mayúscula, la idempotencia, la carrera por el único (y los casos en que no se disfraza), desmarcar, y un **cruce con el detalle de BE-13 sobre el mismo estado**: marcar aparece en `finished` y deja ver el vínculo apagado de ese circuito, y desmarcar lo saca.
  - {N_FTYPEORM} chequeos sin conectarse a la base: `user_note` sigue siendo `varchar(100)` nullable y coincide con el `01`, el `INSERT … RETURNING`, y el SQL de las lecturas, del `UPDATE` y del `DELETE`, armados a partir de lo que el service realmente pasa y **leídos**.
  - {N_FCTRL} chequeos del controller: rutas, sólo el rol `user`, sin `@Owner`, que le pasa al service el id, el body y el usuario del token, `await` sin `return` y el Swagger generado.
  - Los cuatro scripts se corrieron antes **en rojo** ({RED_FDTO}, {RED_FRULES}, {RED_FTYPEORM} y {RED_FCTRL} fallas) y después en verde; los once de BE-11, BE-12 y BE-13 siguen en verde como regresión.
- **Lo que NO se verificó.**
  - **Nada corrió contra un Postgres ni contra el server.** La carrera por el único se simuló en un fake: se probó que el código reacciona si la base devuelve el error, no que la base lo devuelva. Queda para BE-35.
  - **Dos carreras que no se cubren** (la spec no las pide): que el coach borre la asignación (E-20, mientras no tenía hechos), o que `editCircuit` borre un ejercicio "sin historial", justo cuando el alumno lo marca. En ambos la base devuelve una violación de FK (`RESTRICT`) y la respuesta sería `500`. Son ventanas de milisegundos.
  - El camino completo con datos reales (asignar → marcar → ver el detalle → quitar la asignación, que ahora responde `409`) queda para BE-35 con el seed de BE-21.
- **Cambios de estado:** **U-12 y U-13 pasan de ⬜ a ✅.** La fase 2 avanza: **BE-10, BE-10b, BE-11, BE-12, BE-13 y BE-14 (con BE-15) hechas, sigue BE-16** (el historial del entrenador, E-06 y E-07).
```

Reemplazar `{N_*}` y `{RED_*}` por los conteos reales de las Tareas 1 y 5 (no dejar llaves en el texto final).

- [ ] **Paso 3: Informe: detalle de U-12 y U-13, hallazgo 2 y plan de trabajo**

1. Fila de U-12 por:

```markdown
| CU-U-12 | Marcar serie como realizado | ✅ Implementado | `POST /routine/assign-user/:id/finished` y `DELETE …/finished/:routineExerciseId` · el hecho es **por ejercicio** (el tildado por serie es de la interfaz) · idempotentes · sólo el alumno dueño (`403` si es de otro) · marcar un ejercicio que el coach sacó es `400`, pero se puede desmarcar y editar su nota (18/10) · la vía del plan es del bloque B |
```

2. Fila de U-13 por:

```markdown
| CU-U-13 | Dejar una nota en el ejercicio | ✅ Implementado | Es un camino incluido de U-12 (D3): `user_note` va en el mismo `POST …/finished`, hasta 100 caracteres, y la cadena vacía la borra · la nota vive en la fila del hecho, así que sólo se anota un ejercicio realizado (o se marca y anota en una sola llamada) (18/10) |
```

3. **Hallazgo 2**: reemplazar el párrafo completo (empieza con `- **2 · Nada escribe el registro de ejecución de entrenamientos**`) por:

```markdown
- **2 · El registro de ejecución: la vía individual ya se escribe, falta el historial y la vía del plan** *(25/8; actualizado 18/10)*. Las dos tablas de ejecución existen desde el 17/10 (BE-10): `Routine_Exercise_Finished` para las planificaciones y `Routine_Asign_Exercise_Finished` para las asignaciones individuales. **Desde el 18/10 (BE-14) la vía individual se escribe:** el alumno marca y desmarca un ejercicio y deja o edita su nota (**U-12** y **U-13**), y el detalle de la asignación (BE-13) lo lee. **Siguen abiertos dos pedazos:** el historial de entrenamientos del entrenador (**E-06**) con su filtro por ejercicio (**E-07**), que lo resuelve BE-16, y **toda la vía del plan**, donde ningún endpoint inserta en `Routine_Exercise_Finished` (el marcar dentro de una planificación es del bloque B, con la validación de que la `Routine_Asignation` sea del mismo plan). **Consecuencia que sigue vigente:** la rama de baja lógica de CU-E-23 nunca se verificó en runtime; ahora el "hecho" individual existe, pero falta correrlo contra una base con una asignación y datos que el seed no genera (BE-21 y BE-35).
```

4. Tabla "Plan de trabajo", fila de la fase 2, columna Estado: `BE-11, BE-12 y BE-13 el 18/10; sigue BE-14 |` → `BE-11, BE-12, BE-13 y BE-14 (con BE-15) el 18/10; sigue BE-16 |`.

- [ ] **Paso 4: Dashboard**

En `dashboard-estado-backend.html`:
1. Tarjetas de arriba: **Implementado** `<div class="n">61</div>` → `63` y `81% · cumple su spec` → `84% · cumple su spec`; **No implementado** `<div class="n">4</div>` → `2` y `5% · sin endpoint` → `3% · sin endpoint`.
2. `aria-label` de la barra: `61 implementados, 7 parciales, 2 andamiaje, 4 no implementados` → `63 implementados, 7 parciales, 2 andamiaje, 2 no implementados`.
3. Barra: `s-done` `width:81.33%` → `84.00%`; `s-missing` `width:5.33%` → `2.67%` (los otros tres no cambian: 9.33 + 2.67 + 1.33 → suma 100).
4. Leyenda de la barra: `<b>61 de los 74</b> CU con backend completos (82%)` → `<b>63 de los 74</b> CU con backend completos (85%)`; `<b>13</b> pendientes (7 parciales, 2 andamiaje, 4 sin endpoint)` → `<b>11</b> pendientes (7 parciales, 2 andamiaje, 2 sin endpoint)`.
5. Tarjeta del **Usuario**: `role-pct` `79%` → `89%`; `role-sub`: `15 de 19 con backend · Mi cuenta, RMs y el detalle de la rutina cerrados (salvo el mail de U-04); falta ejecutar el entrenamiento` → `17 de 19 con backend · Mi cuenta, RMs, el detalle de la rutina y el marcado de ejercicios cerrados (salvo el mail de U-04 y la parte del plan de U-08)`; `mini-bar`: `width:75%` → `85%` y **se quita** el segmento del faltante (`width:10%;background:var(--missing-line)`); el de parciales (`width:10%`) y el de cliente (`width:5%`) no cambian; leyenda: `<b>15</b> impl.` → `<b>17</b> impl.` y **se quita** `<b>2</b> falta`.
6. Filas de **U-12** y **U-13** (Usuario): el chip pasa de `class="chip missing"` / `No implementado` a `class="chip done"` / `Implementado`, y las celdas de endpoint a:

```html
<td class="endpoint"><span class="verb">POST</span> /routine/assign-user/:id/finished <span class="muted">y </span><span class="verb">DELETE</span> …/finished/:routineExerciseId <span class="muted">· el hecho es por ejercicio (el tildado por serie es de la interfaz) · idempotentes · sólo el alumno dueño (403 si es de otro) · la vía del plan es del bloque B (18/10)</span></td>
```
```html
<td class="endpoint"><span class="muted">camino incluido de U-12: <code>user_note</code> va en el mismo </span><span class="verb">POST</span> …/finished <span class="muted">· hasta 100 caracteres; la cadena vacía la borra (18/10)</span></td>
```

7. Chip de la fase 2 en el "Plan de trabajo": `En curso · BE-10, BE-10b, BE-11, BE-12 y BE-13 hechas` → `En curso · BE-10, BE-10b, BE-11, BE-12, BE-13 y BE-14 hechas`.
8. Hallazgo 2: el título `25/8, actualizado 17/10 — nada escribe el registro de ejecución de entrenamientos` → `25/8, actualizado 18/10 — el registro de ejecución: la vía individual ya se escribe`, y el párrafo siguiente (`<p>Las dos tablas de ejecución existen desde el 17/10 (BE-10): …`) por:

```html
<p>Las dos tablas de ejecución existen desde el 17/10 (BE-10): <code>Routine_Exercise_Finished</code> para las planificaciones y <code>Routine_Asign_Exercise_Finished</code> para las asignaciones individuales. <b>Desde el 18/10 (BE-14) la vía individual se escribe:</b> el alumno marca y desmarca un ejercicio y deja o edita su nota (<b>U-12</b> y <b>U-13</b>), y el detalle de la asignación (BE-13) lo lee. <b>Siguen abiertos dos pedazos:</b> el historial de entrenamientos del entrenador (<b>E-06</b>) con su filtro (<b>E-07</b>), que lo resuelve BE-16, y <b>toda la vía del plan</b>, donde ningún endpoint inserta en <code>Routine_Exercise_Finished</code> (el marcar dentro de una planificación es del bloque B). Sigue vigente que la baja lógica de CU-E-23 nunca se probó en runtime: el "hecho" individual ya existe, pero falta correrlo contra una base con una asignación y datos que el seed no genera (BE-21, BE-35).</p>
```

9. Pie: `61 impl · 7 parc · 2 andam · 4 falta · 1 sin backend` → `63 impl · 7 parc · 2 andam · 2 falta · 1 sin backend`.

- [ ] **Paso 5: Barrido para no dejar números viejos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status"
grep -n "61 impl\|61 de los\|13 pendientes\|4 sin endpoint\|4 falta\|sigue BE-14\|BE-13 hechas\|{N_\|{RED_" dashboard-estado-backend.html estado-implementacion-backend.md | cut -c1-200
```

Cada coincidencia que quede tiene que ser una entrada **histórica** de "Cambios recientes" (no se reescriben) o una referencia a otro tema; cualquier otra se corrige. En el informe no puede quedar ningún `{N_` ni `{RED_`. Después, **recargar el dashboard desde el archivo** en el panel del navegador (`navigate` a `file:///…`; el panel puede tener una copia vieja) y leer con `javascript_tool` las tarjetas, la barra (que sume 100), la tarjeta del Usuario y las filas de U-12 y U-13.

---

## Tarea 7: Specs de CU (repo PowerApp-Docs)

**Archivos:**
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\usuario\CU-U-12-marcar-serie-como-realizado.md`
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\usuario\CU-U-13-dejar-una-nota-en-el-ejercicio.md`

Spec §7: U-12 "el hecho es **por ejercicio**, no por serie: el tildado serie por serie es de la interfaz (25/8). Va en la tabla de ejecución de su vía, sin `finished` en `Exercise_Set`". U-13 "pasa a ser **un camino incluido de U-12**: dejar o editar la nota de un ejercicio realizado, con el mismo endpoint. Sigue contando como CU". Se conserva el título de U-12 (decisión m13). El formato de «incluido por» es el de CU-E-12a.

- [ ] **Paso 1: Reescribir `CU-U-12-marcar-serie-como-realizado.md`**

```markdown
# CU-U-12 — Marcar serie como realizado

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Registra que el usuario realizó un ejercicio de la rutina de su asignación, y permite deshacerlo. El registro es **por ejercicio y no por serie**: el tildado serie por serie es de la interfaz, y el sistema guarda el ejercicio completo cuando el usuario lo termina. La existencia del registro es el «hecho».

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Dejar una nota en el ejercicio

## Alcance

**Cubre:**

- Registrar un ejercicio como realizado en una asignación del usuario, y deshacerlo.
- Dejar o editar la nota del usuario sobre ese ejercicio en la misma operación (CU «Dejar una nota en el ejercicio»).

**Fuera de alcance:**

- Marcar cada serie por separado: el sistema no guarda el avance serie por serie.
- Edición de reps/peso de la serie.
- El registro de ejecución de una planificación (se resuelve en su propio bloque).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La asignación pertenece al usuario.
- El ejercicio forma parte de la rutina de esa asignación.

## Postcondiciones

- El ejercicio queda registrado como realizado en esa asignación (o se elimina el registro si se desmarca), junto con su nota si la hay.

## Camino principal (flujo básico)

1. Durante la ejecución, el usuario termina un ejercicio y lo marca como realizado.
2. El sistema verifica que la asignación sea del usuario y que el ejercicio forme parte de su rutina.
3. El sistema registra el ejercicio como realizado en esa asignación.
4. El sistema confirma el registro.

## Caminos alternativos / excepciones

### En el paso 1 — Marcar fuera de fecha

1. El usuario marca un ejercicio de una asignación de cualquier día, pasado o futuro.
2. El sistema lo acepta: no hay una ventana de fechas.

### En el paso 1 — Desmarcar el ejercicio

1. El usuario desmarca un ejercicio ya realizado.
2. El sistema elimina el registro y, con él, la nota que el usuario hubiera dejado.
3. Si el ejercicio no estaba marcado, el sistema responde igual: deshacer es idempotente.
4. El usuario puede desmarcar también un ejercicio que el entrenador sacó de la rutina después de que lo realizó.

### En el paso 1 — Dejar o editar la nota

1. El usuario marca el ejercicio indicando una nota, o vuelve a marcar uno ya realizado con una nota nueva.
2. El sistema guarda la nota en el mismo registro (CU «Dejar una nota en el ejercicio»).

### En el paso 2 — La asignación no existe

1. El sistema informa que no se encontró la asignación.

### En el paso 2 — Asignación de otro alumno

1. La asignación pertenece a otro usuario.
2. El sistema deniega el acceso.

### En el paso 2 — El ejercicio no pertenece a la rutina

1. El ejercicio no forma parte de la rutina de esa asignación.
2. El sistema informa el error y no registra nada.

### En el paso 2 — El entrenador sacó el ejercicio de la rutina

1. El ejercicio todavía no estaba marcado y el entrenador lo dio de baja, o sacó de la rutina el circuito que lo contiene.
2. El sistema informa que ya no se puede marcar y no registra nada.
3. Si el ejercicio ya estaba marcado, el sistema lo acepta igual y no cambia el registro: sólo puede editarse su nota.

### En el paso 3 — Marcado repetido

1. El usuario marca un ejercicio que ya estaba realizado (también si lo marcó desde dos lugares a la vez).
2. El sistema no duplica el registro y responde igual: marcar es idempotente.

### En el paso 3 — Error de persistencia

1. Falla al guardar.
2. El sistema revierte la marca visual e informa el error.
```

- [ ] **Paso 2: Reescribir `CU-U-13-dejar-una-nota-en-el-ejercicio.md`**

```markdown
# CU-U-13 — Dejar una nota en el ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento
**Incluido por:** [`CU-U-12`](CU-U-12-marcar-serie-como-realizado.md) Marcar serie como realizado

## Descripción breve

Permite al usuario dejar o editar una nota personal (user_note) sobre un ejercicio que realizó en una asignación. La nota vive en el mismo registro que el «hecho» y se guarda con la misma operación que marcar el ejercicio, así que sólo se anota un ejercicio realizado.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta, edición y borrado del user_note (hasta 100 caracteres) del registro de un ejercicio realizado.

**Fuera de alcance:**

- La nota del coach (coach_note), que es de solo lectura para el usuario.
- Anotar un ejercicio que no se realizó.

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La asignación pertenece al usuario.
- El ejercicio está realizado en esa asignación, o se marca en la misma operación.

## Postcondiciones

- El registro del ejercicio queda con el user_note actualizado.

## Camino principal (flujo básico)

1. Desde el detalle del ejercicio, el usuario escribe o edita su nota.
2. El sistema persiste el texto en el registro del ejercicio realizado.
3. El sistema confirma el guardado.

## Caminos alternativos / excepciones

### En el paso 1 — Nota vacía

1. El usuario borra el contenido y guarda.
2. El sistema limpia user_note, y el ejercicio sigue marcado como realizado.

### En el paso 1 — Ejercicio todavía sin marcar

1. El usuario escribe una nota en un ejercicio que aún no marcó.
2. El sistema marca el ejercicio y guarda la nota en la misma operación.

### En el paso 1 — Sin cambios en la nota

1. El usuario guarda la misma nota que ya tenía.
2. El sistema no cambia nada y responde igual.

### En el paso 1 — Nota demasiado larga

1. El texto supera los 100 caracteres.
2. El sistema informa el error y no guarda.

### En el paso 1 — El entrenador sacó el ejercicio de la rutina

1. El ejercicio ya estaba realizado y el entrenador lo sacó de la rutina después.
2. El sistema permite editar la nota igual: forma parte de lo que el usuario hizo.

### En el paso 2 — Desmarcar el ejercicio

1. El usuario desmarca el ejercicio (CU «Marcar serie como realizado»).
2. El sistema elimina el registro y la nota con él.
```

---

## Tarea 8: Dejar todo stageado, memoria y cierre

**Archivos:** ninguno nuevo. **No se commitea ni se pushea.**

- [ ] **Paso 1: Stagear sólo los archivos propios, en cada repo**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git add power-app/src/entities/routine_asign_exercise_finished.entity.ts \
        power-app/src/dtos/routine/mark_exercise_finished.dto.ts \
        power-app/src/dtos/routine/assigned_finished_params.dto.ts \
        power-app/src/dtos/routine/routine_assigned_unfinished_response.dto.ts \
        power-app/src/routine/routine.service.ts \
        power-app/src/routine/routine.controller.ts \
        Status/estado-implementacion-backend.md \
        Status/dashboard-estado-backend.html
git status --short

cd "D:/Power App/Docs/PowerApp-Docs"
git add "Doc/plans/2026-10-18-be-14-marcar-desmarcar-y-nota-plan.md" \
        "Use Cases/usuario/CU-U-12-marcar-serie-como-realizado.md" \
        "Use Cases/usuario/CU-U-13-dejar-una-nota-en-el-ejercicio.md"
git status --short
```

Esperado: el backend con 8 archivos (`A` los 3 DTOs, `M` el resto); el de docs con los 3 de BE-14 (y los de BE-13 si el usuario todavía no los commiteó). Si `git status` muestra algo más que no sea propio, no se stagea.

- [ ] **Paso 2: Actualizar la memoria del proyecto**

En `C:\Users\caram\.claude\projects\D--Power-App-Backend-PowerApp-Backend\memory\` (**leer primero**: otra sesión puede haberla tocado): actualizar `project_cu_status.md` y su línea del `MEMORY.md` para que digan que BE-14 (con BE-15) está hecha (U-12 y U-13 en ✅; 63 ✅ · 7 🟡 · 2 🔵 · 2 ⬜) y que **sigue BE-16**. En `project_db_error_translation.md`, anotar que BE-14 ya reutiliza `isDatabaseError` para la carrera del único `uk_raef_asign_exercise` y que el patrón es: *releer la fila y seguir por el camino de "ya estaba"*.

- [ ] **Paso 3: Proponer los mensajes de commit (uno por repo) y cerrar**

Backend:

```
BE-14 y BE-15: marcar, desmarcar y dejar una nota en un ejercicio (U-12 y U-13), POST y DELETE /routine/assign-user/:id/finished

El hecho es por ejercicio y la nota vive en la misma fila. Marcar es idempotente, tambien cuando dos marcas chocan contra el unico; lo que el coach saco de la rutina no se puede marcar, pero si desmarcar y editar su nota. Status: U-12 y U-13 pasan a implementado (63 de 74).
```

PowerApp-Docs:

```
Plan de BE-14 y specs de U-12 y U-13 reescritas: el hecho por ejercicio y la nota como camino incluido
```

Reportar al usuario: qué quedó, qué se verificó (los quince scripts y el build, con sus conteos), qué **no** (nada corrió contra Postgres; la carrera real; las dos carreras de FK que no se cubren), y la tarea siguiente: **BE-16**, el historial del entrenador (`GET /routine/history/:userId?exercise_id=`, spec §4.7), que ya tiene datos que leer.

---

## Autorrevisión del plan contra la spec

**Cobertura de la spec:**
- §4 tabla de rutas: `POST …/finished` y `DELETE …/finished/:routineExerciseId`, sólo `user` (dueño) → Tarea 4, `verify-finished-controller` (roles, sin `@Owner`, argumentos).
- §4.5: `404` y `403`; los seis caminos de la tabla (no pertenece → `400`; no estaba marcado y sacado → `400`; no estaba marcado → `201` con la nota si vino; ya marcado con nota → `200` actualiza, vacía → `null`; ya marcado sin nota → `200` sin tocar; carrera contra el único → `200`); la respuesta `{ routine_exercise_id, user_note, created_at, updated_at }`; sin ventana de fechas → Tarea 3, `verify-finished-rules` (un caso por fila de la tabla).
- §4.6: `404` y `403`; borra la fila y su nota; idempotente; se puede desmarcar lo que el coach sacó; `200` `{ routine_exercise_id, finished: false }` → Tarea 3, `verify-finished-rules`.
- §6: las transacciones no aplican (una sola escritura); los 403 con texto distinto del reservado → `verify-finished-rules` y `verify-finished-controller`.
- §7 (U-12, U-13) → Tarea 7. §9: BE-14 fusionada con BE-15. §10: SQL generado sin conectarse (y leído), reglas con repositorios falsos, build → Tareas 1 a 5. §11: U-12 y U-13 a ✅, hallazgo 2 → Tarea 6.
- Encargos transversales: `await` sin `return` (`verify-finished-controller`), mensajes en español con `{ error }`, `@Auth` por endpoint, `Db Creator` y Status en el mismo movimiento si se toca una entidad (la entidad cambia de tipo y no de esquema: se comprueba contra el `01`).
- §4.7 (historial) y el bloque B: **fuera de alcance** (BE-16 en adelante).

**Placeholders:** el único texto con llaves son los conteos `{N_*}` y `{RED_*}` del Status, que el paso 2 de la Tarea 6 manda reemplazar con la salida real de los scripts y el paso 5 verifica que no queden.

**Consistencia de nombres:** `markExerciseFinished` y `unmarkExerciseFinished` (service, controller y scripts), `isAssignmentOwner`, `findFinishedRow`, `checkExerciseIsMarkable`, `buildFinishedResponse`, `OTHER_STUDENT_ASSIGNMENT_ERROR`, `MarkExerciseFinishedDto`, `AssignedFinishedParamsDto`, `RoutineAssignedUnfinishedResponseDto`, y `RoutineAssignedFinishedDto` (de BE-13). Mensajes iguales en el service y en `MSG` de `verify-finished-rules.js`. El constructor suma `routineExerciseRepository` y `routineCircuitRepository` **al final**: el orden que usan los scripts (`circuit`, `routine`, `dataSource`, `user`, `assignment`, `finished`, `routineExercise`, `routineCircuit`) es el del service, y los once scripts anteriores (que pasan seis argumentos) siguen funcionando.
