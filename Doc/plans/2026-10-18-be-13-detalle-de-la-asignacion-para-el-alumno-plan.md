# BE-13 — Detalle de la asignación individual para el alumno (CU-U-09 y U-10) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` de los archivos propios y se propone el mensaje (Tarea 8).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. No se instala nada para verificar.
> 3. **No se levanta el server.** Ni siquiera en segundo plano. Los scripts no abren puertos ni se conectan a ninguna base.

> **Registro de ejecución (18/10):** plan aprobado sin cambios de diseño. Qué pasó respecto de lo escrito abajo:
> - **La foto** se sacó antes de tocar el código y confirmó el hueco: con `Set(['c'])` el ejercicio apagado visible **no** aparecía.
> - **Tarea 1, rojo:** `verify-builders` 3 fallas (la regresión ya pasaba), `verify-detail-rules` 17, `verify-detail-sql` 3 y `verify-detail-controller` 8.
> - **Verde final:** build en 0; `verify-builders` 10 ok, `verify-detail-rules` 46, `verify-detail-sql` 16, `verify-detail-controller` 24, todos con 0 fallas. Regresión de BE-11 y BE-12: `verify-assigned-dto` 24, `verify-assigned-rules` 58, `verify-assigned-controller` 27, `verify-dto` 58, `verify-rules` 62, `verify-typeorm` 19 y `verify-controller` 30.
> - **SQL leído a ojo (Tarea 3):** los `LEFT JOIN` salen encadenados (Routine → Routine_Circuit → Circuit → Routine_Exercise → Exercise, y Exercise_Set por el ejercicio de rutina), con `WHERE r.id = $1` y `ORDER BY` del vínculo, `exercise_order` y `set_order`, en ese orden. TypeORM hashea los alias largos (más de 63 caracteres); es normal.
> - **Dos ajustes de los scripts, no del código:** `verify-detail-sql.js` guarda la llamada al método para que el rojo no se corte antes de tiempo, y `verify-detail-controller.js` acepta que Swagger emita `routine` como `{ description, allOf: [{ $ref }] }` cuando el campo lleva una descripción.
> - **Dashboard:** verificado renderizado, recargando el archivo en el panel del navegador. Las barras suman 99,99 por redondeo a dos decimales.
> - **Un cambio ajeno en el índice:** `Status/estado-implementacion-backend.md` ya estaba stageado con una actualización de otra sesión (el patch de BE-10 se ejecutó sobre la base viva y dio las 8 filas en `ok`). No se tocó: viaja en el mismo stage.
> - **Sin otros desvíos:** el código quedó como está escrito en las Tareas 2 a 4.

**Spec que manda:** [`2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md`](../specs/2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md), §2 (D6, D8), §4 (la tabla de rutas y §4.4), §6, §7 (U-09, U-10), §9, §10, §11 y §12. **Planes anteriores del bloque:** [BE-11](2026-10-18-be-11-asignar-rutina-individual-plan.md) y [BE-12](2026-10-18-be-12-listado-rutinas-por-alumno-plan.md): esta tarea reutiliza su `lib.js`, su forma de armar un `DataSource` sin conectarse y el hallazgo 3 de BE-12 (el caso borde que se resuelve acá).
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde contradice a la spec, manda la spec (ver el hallazgo 1).

**Goal:** que el alumno (y su entrenador) puedan abrir una asignación individual y ver la rutina completa de ese día con lo que el alumno ya hizo: `GET /routine/assign-user/:id`.

**Architecture:** un método nuevo en `RoutineService`, un handler en `RoutineController` y un DTO de respuesta para Swagger. **Se reutilizan los mismos builders** que arman `GET /routine/:id` (`buildRoutineDetailResponse` y `buildCircuitDetailResponse`) y la misma consulta (`findRoutineDetail`); lo único que cambia en ellos es que ahora se **propaga la visibilidad** de lo dado de baja, que hoy el builder de la rutina no le pasa al del circuito. El chequeo de dueño va en el service (el path trae el id de la asignación, no el del alumno). Sin cambios de esquema: **`Db Creator` y las entidades no se tocan**.

**Tech Stack:** NestJS + TypeORM (Postgres) · scripts de Node en el scratchpad que corren sobre `power-app/dist`.

---

## 1. Estado de partida y hallazgos al preparar el plan

**Estado de partida (verificado el 18/10):** BE-11 y BE-12 ya están commiteadas (`17764a2` y `225cba0`) y los dos repos están limpios. Existen `findRoutineDetail`, los dos builders con su parámetro `visibleInactiveIds` (hoy sin usar), `@CurrentUser()` / `AuthUser`, y `Routine_Asign_Exercise_Finished`.

1. **El roadmap y la spec difieren en cómo se lee la rutina.** El roadmap (BE-13, DA5) proponía abrirle `GET /routine/:id` al rol `user` con un chequeo de "asignación vigente"; la spec (D8, §4.4) lo descartó: **el alumno lee por asignación** y `GET /routine/:id` queda para coach y admin. Manda la spec. El comentario viejo de ese endpoint (que habla de una "cadena que todavía no existe") se reescribe.
2. **La visibilidad no se propaga hoy, y hay un caso que la spec deja abierto.** `buildRoutineDetailResponse` filtra los vínculos apagados con `visibleInactiveIds`, pero **llama a `buildCircuitDetailResponse(routineCircuit.circuit)` sin pasarle nada**: un ejercicio dado de baja que el alumno completó no aparecería. Eso es lo que la spec manda arreglar ("hay que propagarla"). Lo que no dice es **qué mostrar dentro de un circuito que el coach sacó de la rutina** después de que el alumno completó algo de él. Es el caso borde que dejó anotado BE-12 (hallazgo 3). Ver la decisión **m1**.
3. **Un mismo `Routine_Exercise` puede salir por dos vínculos.** Si la rutina tiene un circuito repetido (A, B, A) y uno de los vínculos a A se apagó, el ejercicio completado es el mismo en los dos. Un vínculo apagado se muestra si el alumno completó **algo del circuito**, no "de ese vínculo" (la base no registra por vínculo).
4. **El vínculo apagado tiene `order` en `null`** y Postgres ordena los `NULL` al final en `ASC`: los circuitos apagados que se muestran salen **después** de los vigentes, que es lo natural. No hace falta código.
5. **`GET /routine/assign-user/:id` y `DELETE /routine/assign-user/:id` comparten ruta.** Distinto verbo, sin conflicto; en el Swagger quedan en la misma entrada del path.
6. **U-09 y U-10 pasan a ✅**, siguiendo la spec §11 ("al cerrar el bloque… U-09, U-10… pasan a ✅"). Es una decisión de la spec y no de este plan, pero tiene una salvedad que va a la nota del Status: el detalle de una asignación **del plan** (`Routine_Asignation`) no tiene contrato en la spec y lo define el bloque B, igual que el marcar dentro de un plan (§8).
7. **El detalle de rutina nunca corrió en runtime** (spec §12): usa un orden anidado de tres niveles (`order` del vínculo → `exercise_order` → `set_order`) y el alumno lo va a usar desde el primer día. Este plan no puede ejecutarlo, pero **sí genera su SQL sin conectarse y lo lee** (Tarea 1, `verify-detail-sql.js`), que es más de lo que se hizo hasta ahora.

## 2. Decisiones menores (se pueden vetar)

| # | Decisión | Por qué |
|---|---|---|
| **m1** | **Dentro de un vínculo apagado que se muestra, sólo se ven los ejercicios que el alumno completó** (activos o dados de baja). No sus ejercicios activos sin hacer | El coach sacó ese circuito de la rutina: mostrarle al alumno los demás ejercicios como pendientes contradice esa decisión. Y así **el detalle coincide con el `total` de BE-12** (los ejercicios del detalle, sin repetir ids, son exactamente `activos de vínculos activos ∪ hechos`). Es la recomendación que dejó BE-12. La alternativa —mostrar todo el circuito— es más simple pero deja un `total` que no cuadra con lo que se ve |
| m2 | **Se mantiene un solo conjunto `visibleInactiveIds`** (ids de vínculos y de ejercicios apagados que se muestran: son UUID de tablas distintas, no chocan) y se suma un tercer parámetro **opcional** a cada builder (`completedIds` en el de la rutina, `onlyExerciseIds` en el del circuito) | No cambia ninguna llamada existente: `createRoutine`, `editRoutine`, `getRoutineById` y los tres de circuito siguen igual. Se prueba con una **foto del comportamiento actual** (Tarea 1) que tiene que salir idéntica |
| m3 | **Orden de las respuestas: `404` antes que `403`**, y el `403` tiene un texto propio (`No podés acceder a una rutina asignada a otro alumno.`), distinto del único que cierra la sesión en el web | Es lo que dice la spec ("404 si no existe y 403 si es de otro alumno") y la regla del proyecto |
| m4 | **`finished` va ordenado por `created_at` y después por `routine_exercise_id`** | La spec no fija el orden; el cliente cruza por `routine_exercise_id`, pero un orden estable ahorra diffs |
| m5 | **El árbol sale de la misma consulta que `GET /routine/:id`** (`findRoutineDetail`), no de una nueva | "Árbol idéntico al de GET /routine/:id" (spec §4.4) |
| m6 | **Sin DTO de entrada nuevo:** el `:id` usa `ParameterIdDto` | Es un UUID de path como los demás |
| m7 | **Archivo nuevo:** `dtos/routine/routine_assigned_detail_response.dto.ts` | Mismo patrón que los otros DTOs de respuesta de `routine/` |
| m8 | **Una rutina dada de baja después de asignarla se abre igual**, con `routine.active: false` | Spec §4.3 y §6: la asignación existe y se puede ejecutar |
| m9 | **Si la rutina no existiera (imposible con la FK) responde `404` `Rutina no encontrada`** en vez de romper con un `!` | Una línea que evita un 500 con mensaje engañoso |

## 3. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/dtos/routine/routine_assigned_detail_response.dto.ts` | **Nuevo.** `RoutineAssignedFinishedDto` y `RoutineAssignedDetailResponseDto` (Swagger) |
| `power-app/src/routine/routine.service.ts` | Método `getAssignedRoutineById` y helper `buildAssignmentVisibility`; los dos builders reciben el parámetro opcional nuevo y propagan la visibilidad; comentarios al día; dos imports |
| `power-app/src/routine/routine.controller.ts` | Handler `getAssignedRoutineById` con `@CurrentUser()`; comentario de `GET /:id` reescrito; dos imports |
| `Status/estado-implementacion-backend.md` | Entrada nueva, conteos, cobertura por rol, detalle de U-09 y U-10, hallazgo 2 al día, plan de trabajo |
| `Status/dashboard-estado-backend.html` | Lo mismo en el dashboard |

**No se tocan:** las entidades, `Db Creator/`, `routine.module.ts` (ya registra todo), `planification/`, ningún otro DTO.

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**

| Archivo | Cambio |
|---|---|
| `Use Cases/usuario/CU-U-09-ver-detalle-de-rutina.md`, `CU-U-10-ver-detalle-de-un-ejercicio.md` | Reescritos (spec §7) |
| `Doc/plans/2026-10-18-be-13-detalle-de-la-asignacion-para-el-alumno-plan.md` | Este plan |

## 4. Verificación: cómo se prueba sin levantar nada

Todo sobre `power-app/dist`, con el `lib.js` que ya existe. Se escriben **antes** del código y se corren **en rojo** (Tarea 1).

| Script | Qué prueba |
|---|---|
| `capture-builders.js` + `verify-builders.js` | **Regresión de los builders.** El primero guarda, **antes de tocar el código**, la salida actual de los dos builders sobre un árbol armado a mano (sin visibilidad y con el conjunto de visibilidad de un solo parámetro). El segundo, **después**, exige que sea *idéntica* sin el parámetro nuevo, y prueba el comportamiento nuevo con él |
| `verify-detail-rules.js` | El método del service con repositorios falsos: `404` antes que `403`, dueño por rol (con ids en mayúscula), la forma exacta de la respuesta, **el árbol idéntico al de `GET /routine/:id`**, `finished`, y **siete escenarios de visibilidad** cruzados con la fórmula `activos ∪ hechos` de BE-12 (el detalle y el `total` tienen que coincidir) |
| `verify-detail-sql.js` | Sin conectarse: arma con un `DataSource` real las tres consultas (la asignación, lo hecho, **el detalle de rutina con su orden anidado**) a partir de las opciones que el service realmente pasa, y **las imprime** para leerlas |
| `verify-detail-controller.js` | Ruta, verbo y roles; sin `@Owner` (el dueño va en el service); que el handler le pasa al service el `id` y el usuario del token; `await` sin `return`; el Swagger generado |

Además, en la Tarea 5, los **siete scripts de BE-11 y BE-12** como regresión.

**Lo que no se puede verificar acá:** que el SQL corra en un Postgres real —en particular el orden anidado de tres niveles, que sigue siendo lo primero a probar en BE-35—, la hidratación con el driver real y el rendimiento. Va en el Status como "no verificado".

---

## Tarea 0: Preflight

**Archivos:** ninguno.

- [ ] **Paso 1: Los dos repos están limpios y BE-12 está commiteada**

```bash
git -C "D:/Power App/Backend/PowerApp-Backend" status --short
git -C "D:/Power App/Backend/PowerApp-Backend" log --oneline -1
git -C "D:/Power App/Docs/PowerApp-Docs" status --short
```

Esperado: sin salida de `status`; el backend en `225cba0`. Si hay algo sin commitear de otra sesión, **no tocarlo** y registrar qué archivos son antes de seguir.

- [ ] **Paso 2: Lo que el plan da por hecho está en el código**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/power-app/src"
grep -n "private buildRoutineDetailResponse\|private buildCircuitDetailResponse\|private async findRoutineDetail" routine/routine.service.ts
grep -n "buildCircuitDetailResponse(routineCircuit.circuit)" routine/routine.service.ts
grep -n "export const CurrentUser" authentication/decorators/current-user.decorator.ts
grep -n "assign-user/:id" routine/routine.controller.ts
```

Esperado: los tres métodos; **la llamada sin propagar** `buildCircuitDetailResponse(routineCircuit.circuit)` (es el hueco que este plan cierra); `CurrentUser`; y en el controller sólo el `DELETE` de `assign-user/:id`.

- [ ] **Paso 3: El build parte en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
```

Esperado: termina sin errores (código de salida 0). **Es el `dist` del que se saca la foto de la Tarea 1: no se toca el código hasta tenerla.**

---

## Tarea 1: Los scripts de verificación y la foto, en rojo

**Archivos (todos en el scratchpad, fuera de los repos):**
`C:\Users\caram\AppData\Local\Temp\claude\D--Power-App-Backend-PowerApp-Backend\c46f262f-0358-40cb-a6d9-a0418172f7d2\scratchpad\`

- [ ] **Paso 1: Crear `fixtures.js`** (el árbol de rutina armado a mano, con la forma que devuelve `findRoutineDetail`)

```js
const NOW = new Date('2026-10-18T12:00:00Z');

exports.NOW = NOW;
exports.ROUTINE_ID = '0b0c2a64-1f3e-4f5b-9a5e-2b1c7d9e8f01';

const exercise = (id, circuitId, { active = true, order = 1 } = {}) => ({
  id, circuit_id: circuitId, exercise_id: 'x-' + id, exercise_order: order, coach_note: 'nota ' + id, active,
  created_at: NOW, updated_at: NOW,
  exercise: {
    id: 'x-' + id, name: 'Ejercicio ' + id, description: 'desc', safety_tips: 's', activation_tips: 'a',
    video_url: 'v', preview_image: 'p', bg_image: 'b',
  },
  exerciseSets: [
    { id: 's1-' + id, set_order: 1, set_count: 3, rep_count: 10, weight: 20, rpe: 7, rir: 2, rm_perc: 70, amrap: false, amrap_time: null, rm: false },
    { id: 's2-' + id, set_order: 2, set_count: 1, rep_count: 5, weight: null, rpe: null, rir: null, rm_perc: null, amrap: true, amrap_time: 60, rm: false },
  ],
});

const circuit = (id, exercises) => ({
  id, name: 'Circuito ' + id, description: 'circuito ' + id, type: 'normal', active: true,
  created_at: NOW, updated_at: NOW, routineExercises: exercises,
});

const link = (id, circuitObj, { active = true, order = null } = {}) => ({
  id, routine_id: exports.ROUTINE_ID, circuit_id: circuitObj.id, order: active ? order : null, active, circuit: circuitObj,
});

// Circuitos: C1 = a, b (activos) y c (dado de baja) · C2 = d, e (activos) y f (dado de baja) · C3 = g (activo)
// Vinculos: L1 → C1 activo (orden 1) · L2 → C2 APAGADO · L3 → C3 APAGADO · L4 → C1 APAGADO (C1 repetido)
exports.tree = (overrides = {}) => {
  const C1 = circuit('C1', [exercise('a', 'C1', { order: 1 }), exercise('b', 'C1', { order: 2 }), exercise('c', 'C1', { active: false, order: 3 })]);
  const C2 = circuit('C2', [exercise('d', 'C2', { order: 1 }), exercise('e', 'C2', { order: 2 }), exercise('f', 'C2', { active: false, order: 3 })]);
  const C3 = circuit('C3', [exercise('g', 'C3', { order: 1 })]);

  return {
    id: exports.ROUTINE_ID, name: 'Día A', coach_note: 'nota de la rutina', active: true,
    created_at: NOW, updated_at: NOW,
    routineCircuits: [
      link('L1', C1, { order: 1 }),
      link('L2', C2, { active: false }),
      link('L3', C3, { active: false }),
      link('L4', C1, { active: false }),
    ],
    ...overrides,
  };
};

// Lo que el detalle muestra: [[idDelVinculo, [idsDeEjercicio...]], ...] en el orden de la respuesta
exports.shown = (routineBody) => routineBody.circuits.map(c => [c.id, c.circuit.exercises.map(e => e.id)]);
```

- [ ] **Paso 2: Crear `capture-builders.js` y sacar la foto del comportamiento ACTUAL**

```js
const fs = require('fs');
const path = require('path');
const { dist } = require('./lib');
const { tree } = require('./fixtures');

const { RoutineService } = dist('routine/routine.service');
const service = new RoutineService({}, {}, {}, {}, {}, {});

const t = tree();
const snapshot = {
  // Lo que usan hoy createRoutine, editRoutine y getRoutineById
  routine_no_visibility: service.buildRoutineDetailResponse(t),
  // Con el conjunto de un solo parametro (el contrato viejo): un vinculo apagado y un ejercicio apagado
  routine_visible_link_L2: service.buildRoutineDetailResponse(t, new Set(['L2'])),
  routine_visible_exercise_c: service.buildRoutineDetailResponse(t, new Set(['c'])),
  // Lo que usan hoy los tres de circuito
  circuit_no_visibility: service.buildCircuitDetailResponse(t.routineCircuits[0].circuit),
  circuit_visible_exercise_c: service.buildCircuitDetailResponse(t.routineCircuits[0].circuit, new Set(['c'])),
};

const file = path.join(__dirname, 'baseline-builders.json');
fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
console.log('foto guardada en ' + file);
for (const [k, v] of Object.entries(snapshot)) console.log('  ' + k + ': ' + JSON.stringify(v).length + ' bytes');
```

Correr **ahora, con el `dist` actual**:

```bash
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/capture-builders.js"
```

Esperado: `foto guardada…` y cinco entradas con tamaño. **Si falla acá, el árbol de `fixtures.js` no tiene la forma que esperan los builders: se corrige el fixture, no el código.** Esa foto no se vuelve a sacar.

- [ ] **Paso 3: Crear `verify-builders.js`**

```js
const fs = require('fs');
const path = require('path');
const { dist, check, run, finish } = require('./lib');
const { tree, shown } = require('./fixtures');

const { RoutineService } = dist('routine/routine.service');
const service = new RoutineService({}, {}, {}, {}, {}, {});
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline-builders.json'), 'utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const roundTrip = (v) => JSON.parse(JSON.stringify(v)); // la foto guarda las fechas como texto

(async () => {
  console.log('-- regresión: sin el parámetro nuevo, idéntico a antes de tocar nada');

  await run('los builders aceptan lo de siempre', async () => {
    const t = tree();
    check('rutina sin visibilidad (createRoutine, editRoutine, getRoutineById)', same(roundTrip(service.buildRoutineDetailResponse(t)), baseline.routine_no_visibility));
    check('rutina con un vínculo apagado visible', same(roundTrip(service.buildRoutineDetailResponse(t, new Set(['L2']))), baseline.routine_visible_link_L2));
    check('circuito sin visibilidad (los tres de circuito)', same(roundTrip(service.buildCircuitDetailResponse(t.routineCircuits[0].circuit)), baseline.circuit_no_visibility));
    check('circuito con un ejercicio apagado visible', same(roundTrip(service.buildCircuitDetailResponse(t.routineCircuits[0].circuit, new Set(['c']))), baseline.circuit_visible_exercise_c));
  });

  console.log('\n-- lo nuevo: la visibilidad se propaga al circuito');

  await run('un ejercicio apagado visible aparece dentro de un vínculo activo (hoy no se propaga)', async () => {
    check('la foto vieja muestra el hueco: L1 sin c', same(shown(baseline.routine_visible_exercise_c), [['L1', ['a', 'b']]]), JSON.stringify(shown(baseline.routine_visible_exercise_c)));

    const out = service.buildRoutineDetailResponse(tree(), new Set(['c']));
    check('L1 muestra a, b y c', same(shown(out)[0], ['L1', ['a', 'b', 'c']]), JSON.stringify(shown(out)));

    // Es el ÚNICO cambio intencional: sacando c, el resultado es idéntico a la foto
    const withoutC = roundTrip(out);
    withoutC.circuits[0].circuit.exercises = withoutC.circuits[0].circuit.exercises.filter(e => e.id !== 'c');
    check('sacando c, idéntico a la foto', same(withoutC, baseline.routine_visible_exercise_c));
  });

  await run('con completedIds, un vínculo apagado visible muestra SÓLO lo completado', async () => {
    const out = service.buildRoutineDetailResponse(tree(), new Set(['L2']), new Set(['e']));
    check('L1 completo y L2 sólo con e', same(shown(out), [['L1', ['a', 'b']], ['L2', ['e']]]), JSON.stringify(shown(out)));
  });

  await run('completedIds no recorta los vínculos activos', async () => {
    const out = service.buildRoutineDetailResponse(tree(), new Set(), new Set(['a']));
    check('L1 sigue con a y b', same(shown(out), [['L1', ['a', 'b']]]), JSON.stringify(shown(out)));
  });

  await run('el builder del circuito con onlyExerciseIds muestra sólo esos', async () => {
    const out = service.buildCircuitDetailResponse(tree().routineCircuits[0].circuit, undefined, new Set(['b', 'c']));
    check('b y c (c aunque esté apagado)', same(out.exercises.map(e => e.id), ['b', 'c']), JSON.stringify(out.exercises.map(e => e.id)));
  });

  finish();
})();
```

- [ ] **Paso 4: Crear `verify-detail-rules.js`**

```js
const { dist, check, run, finish } = require('./lib');
const { NOW, ROUTINE_ID, tree, shown } = require('./fixtures');

const { RoutineService } = dist('routine/routine.service');
const { UserRole } = dist('entities/user.entity');

const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const OTHER_ID = '11111111-2222-4333-8444-555555555555';
const ASSIGN_ID = 'c1c1c1c1-aaaa-4bbb-8ccc-dddddddddddd';
const DAY = '2026-10-20';

const assignmentRow = {
  id: ASSIGN_ID, routine_id: ROUTINE_ID, user_id: USER_ID, date: DAY, created_at: NOW, updated_at: NOW,
};
const done = (...ids) => ids.map((id, i) => ({
  user_routine_asign_id: ASSIGN_ID, routine_exercise_id: id, user_note: null,
  created_at: new Date(NOW.getTime() + i * 1000), updated_at: new Date(NOW.getTime() + i * 1000),
}));
const user = (role, id = USER_ID) => ({ id, role, active: true });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const BODY_KEYS = ['id', 'routine_id', 'user_id', 'date', 'created_at', 'updated_at', 'routine', 'finished'];

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

function build(cfg = {}) {
  const calls = [];
  const routineRepository = {
    findOne: async (o) => { calls.push({ op: 'routine.findOne', arg: o }); return cfg.routine === undefined ? tree() : cfg.routine; },
  };
  const assignmentRepository = {
    findOne: async (o) => { calls.push({ op: 'assignment.findOne', arg: o.where }); return cfg.assignment === undefined ? null : cfg.assignment; },
  };
  const finishedRepository = {
    find: async (o) => { calls.push({ op: 'finished.find', arg: o }); if (cfg.findError) throw new Error('se cayó la base'); return cfg.finished || []; },
  };
  // Mismo orden que el constructor: circuit, routine, dataSource, user, assignment, finished
  return { service: new RoutineService({}, routineRepository, {}, {}, assignmentRepository, finishedRepository), calls };
}

async function open(cfg, currentUser = user(UserRole.user), id = ASSIGN_ID) {
  const { service, calls } = build(cfg);
  const res = makeRes();
  await service.getAssignedRoutineById(id, currentUser, res);
  return { res, calls, ops: calls.map(c => c.op) };
}

async function silencing(fn) {
  const original = console.error;
  let count = 0;
  console.error = () => { count++; };
  try { await fn(); } finally { console.error = original; }
  return count;
}

(async () => {
  console.log('-- códigos y dueño');

  await run('el método existe', async () => {
    check('getAssignedRoutineById es función', typeof build().service.getAssignedRoutineById === 'function');
  });

  await run('asignación inexistente → 404, sin cargar nada más (ni para el alumno)', async () => {
    const r = await open({ assignment: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: 'Asignación no encontrada' }), JSON.stringify(r.res.body));
    check('sólo buscó la asignación', same(r.ops, ['assignment.findOne']), r.ops.join(','));
  });

  await run('un alumno pide la asignación de otro → 403 antes de cargar la rutina', async () => {
    const r = await open({ assignment: assignmentRow }, user(UserRole.user, OTHER_ID));
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
    check('mensaje propio', same(r.res.body, { error: 'No podés acceder a una rutina asignada a otro alumno.' }), JSON.stringify(r.res.body));
    check('no es el texto que cierra la sesión del web', r.res.body.error !== 'La cuenta está deshabilitada.');
    check('no cargó ni la rutina ni lo hecho', same(r.ops, ['assignment.findOne']), r.ops.join(','));
  });

  await run('el alumno dueño → 200, también con el id del token en mayúscula', async () => {
    const r1 = await open({ assignment: assignmentRow }, user(UserRole.user, USER_ID));
    check('con su id', r1.res.statusCode === 200, r1.res.statusCode);
    const r2 = await open({ assignment: assignmentRow }, user(UserRole.user, USER_ID.toUpperCase()));
    check('con su id en mayúscula', r2.res.statusCode === 200, r2.res.statusCode);
  });

  await run('coach y admin abren la de cualquier alumno', async () => {
    const coach = await open({ assignment: assignmentRow }, user(UserRole.coach, OTHER_ID));
    check('coach → 200', coach.res.statusCode === 200, coach.res.statusCode);
    const admin = await open({ assignment: assignmentRow }, user(UserRole.admin, OTHER_ID));
    check('admin → 200', admin.res.statusCode === 200, admin.res.statusCode);
  });

  await run('la rutina no existe (imposible con la FK) → 404 en vez de romper', async () => {
    const r = await open({ assignment: assignmentRow, routine: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: 'Rutina no encontrada' }), JSON.stringify(r.res.body));
  });

  await run('error de la base → 500', async () => {
    let r;
    const logged = await silencing(async () => { r = await open({ assignment: assignmentRow, findError: true }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: 'Error al obtener la rutina asignada.' }), JSON.stringify(r.res.body));
    check('loguea el error', logged === 1, logged);
  });

  console.log('\n-- la forma de la respuesta');

  await run('claves, consultas y árbol idéntico al de GET /routine/:id', async () => {
    const r = await open({ assignment: assignmentRow, finished: [] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('claves del cuerpo', same(Object.keys(r.res.body), BODY_KEYS), Object.keys(r.res.body).join(','));
    check('valores de la asignación', r.res.body.id === ASSIGN_ID && r.res.body.routine_id === ROUTINE_ID && r.res.body.user_id === USER_ID && r.res.body.date === DAY);
    check('date es el string del día', typeof r.res.body.date === 'string');
    check('orden de las consultas', same(r.ops, ['assignment.findOne', 'finished.find', 'routine.findOne']), r.ops.join(','));

    // El mismo árbol que devuelve GET /routine/:id, sin nada hecho
    const { service } = build();
    const res = makeRes();
    await service.getRoutineById(ROUTINE_ID, res);
    check('routine es idéntico a GET /routine/:id', same(r.res.body.routine, res.body), 'difieren');

    const finishedCall = r.calls.find(c => c.op === 'finished.find').arg;
    check('busca lo hecho por la asignación', finishedCall.where.user_routine_asign_id === ASSIGN_ID, JSON.stringify(finishedCall.where));
    check('ordenado por alta y por ejercicio', same(Object.entries(finishedCall.order), [['created_at', 'ASC'], ['routine_exercise_id', 'ASC']]), JSON.stringify(finishedCall.order));
  });

  await run('finished: sólo los cuatro campos, con la nota o null', async () => {
    const rows = done('a', 'b');
    rows[1].user_note = 'Me costó la última serie';
    const r = await open({ assignment: assignmentRow, finished: rows });
    check('dos ítems', r.res.body.finished.length === 2);
    check('claves del ítem', same(Object.keys(r.res.body.finished[0]), ['routine_exercise_id', 'user_note', 'created_at', 'updated_at']), Object.keys(r.res.body.finished[0]).join(','));
    check('sin nota → null', r.res.body.finished[0].user_note === null);
    check('con nota', r.res.body.finished[1].user_note === 'Me costó la última serie');
    check('mismo orden que las filas', same(r.res.body.finished.map(f => f.routine_exercise_id), ['a', 'b']));
  });

  await run('una rutina dada de baja se abre igual, con routine.active = false', async () => {
    const r = await open({ assignment: assignmentRow, routine: tree({ active: false }) });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('routine.active = false', r.res.body.routine.active === false);
  });

  console.log('\n-- visibilidad de lo dado de baja (spec §4.4)');
  // Fórmula de BE-12: total = |ejercicios activos de vínculos activos ∪ ejercicios hechos|.
  // Lo que el detalle muestra, sin repetir ids, tiene que ser exactamente ese conjunto
  const scenarios = [
    ['nada hecho: sólo el vínculo activo, sin el ejercicio apagado', [], [['L1', ['a', 'b']]]],
    ['hecho un ejercicio apagado de un vínculo activo (c): aparece; el vínculo apagado de C1 aparece con sólo c', ['c'], [['L1', ['a', 'b', 'c']], ['L4', ['c']]]],
    ['hecho un ejercicio activo de C1 (a): el vínculo apagado L4 aparece con sólo a', ['a'], [['L1', ['a', 'b']], ['L4', ['a']]]],
    ['hecho un ejercicio activo de un circuito sacado (e): L2 aparece con sólo e, sin d ni f', ['e'], [['L1', ['a', 'b']], ['L2', ['e']]]],
    ['hechos d y f (activo y apagado) de un circuito sacado: L2 con d y f', ['d', 'f'], [['L1', ['a', 'b']], ['L2', ['d', 'f']]]],
    ['hecho g: L3 aparece con sólo g', ['g'], [['L1', ['a', 'b']], ['L3', ['g']]]],
    ['hechos en tres circuitos distintos', ['a', 'e', 'g'], [['L1', ['a', 'b']], ['L2', ['e']], ['L3', ['g']], ['L4', ['a']]]],
  ];

  for (const [name, doneIds, expected] of scenarios) {
    await run(name, async () => {
      const r = await open({ assignment: assignmentRow, finished: done(...doneIds) });
      const got = shown(r.res.body.routine);
      check('qué se muestra', same(got, expected), JSON.stringify(got));

      const t = tree();
      const activeInActive = new Set();
      for (const l of t.routineCircuits) if (l.active) for (const e of l.circuit.routineExercises) if (e.active) activeInActive.add(e.id);
      const total = new Set([...activeInActive, ...doneIds]);
      const visible = new Set(got.flatMap(([, ids]) => ids));
      check('el detalle coincide con el total de BE-12 (activos ∪ hechos)', same([...visible].sort(), [...total].sort()), `${[...visible].sort()} vs ${[...total].sort()}`);
    });
  }

  finish();
})();
```

- [ ] **Paso 5: Crear `verify-detail-sql.js`**

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');
const { ROUTINE_ID, NOW, tree } = require('./fixtures');

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

  const { Routine } = dist('entities/routine.entity');
  const { RoutineAsignationUser } = dist('entities/routine_asignation_user.entity');
  const { RoutineAsignExerciseFinished } = dist('entities/routine_asign_exercise_finished.entity');

  // Se corre el service con repositorios que GRABAN las opciones que de verdad recibe...
  const recorded = {};
  const assignmentRow = { id: 'A', routine_id: ROUTINE_ID, user_id: 'U', date: '2026-10-20', created_at: NOW, updated_at: NOW };
  const service = new RoutineService(
    {},
    { findOne: async (o) => { recorded.routine = o; return tree(); } },
    {}, {},
    { findOne: async (o) => { recorded.assignment = o; return assignmentRow; } },
    { find: async (o) => { recorded.finished = o; return []; } },
  );
  const res = { status() { return this; }, send() { return this; } };
  await service.getAssignedRoutineById('A', { id: 'U', role: UserRole.user, active: true }, res);

  // ... y se arma el SQL de esas mismas opciones con el repositorio real
  const sqlOf = (entity, alias, options) => {
    const [sql, params] = ds.getRepository(entity).createQueryBuilder(alias).setFindOptions(options).getQueryAndParameters();
    return { sql: sql.replace(/\s+/g, ' '), params };
  };

  await run('las tres consultas se grabaron', async () => {
    check('asignación', !!recorded.assignment);
    check('hechos', !!recorded.finished);
    check('detalle de rutina', !!recorded.routine);
  });

  if (!recorded.assignment || !recorded.finished || !recorded.routine) return finish();

  await run('la asignación', async () => {
    const { sql, params } = sqlOf(RoutineAsignationUser, 'a', recorded.assignment);
    console.log('        ' + sql);
    check('FROM Routine_Asignation_User', sql.includes('FROM "Routine_Asignation_User"'));
    check('por id', /"id" = \$1/.test(sql) && params[0] === 'A', JSON.stringify(params));
  });

  await run('lo hecho', async () => {
    const { sql, params } = sqlOf(RoutineAsignExerciseFinished, 'f', recorded.finished);
    console.log('        ' + sql);
    check('FROM Routine_Asign_Exercise_Finished', sql.includes('FROM "Routine_Asign_Exercise_Finished"'));
    check('por la asignación', /"user_routine_asign_id" = \$1/.test(sql) && params[0] === 'A', JSON.stringify(params));
    check('ORDER BY created_at, routine_exercise_id', /ORDER BY [^ ]*"created_at" ASC, [^ ]*"routine_exercise_id" ASC/.test(sql));
  });

  await run('el detalle de rutina (el orden anidado de tres niveles que nunca corrió)', async () => {
    const { sql } = sqlOf(Routine, 'r', recorded.routine);
    console.log('        ' + sql);
    for (const table of ['Routine_Circuit', 'Circuit', 'Routine_Exercise', 'Exercise', 'Exercise_Set']) {
      check(`une ${table}`, new RegExp(`LEFT JOIN "${table}"`).test(sql), table);
    }
    const order = sql.slice(sql.indexOf('ORDER BY'));
    const iLink = order.search(/"order" ASC/);
    const iEx = order.search(/"exercise_order" ASC/);
    const iSet = order.search(/"set_order" ASC/);
    check('ordena por el orden del vínculo', iLink >= 0, order);
    check('después por exercise_order', iEx > iLink, order);
    check('después por set_order', iSet > iEx, order);
  });

  finish();
})();
```

- [ ] **Paso 6: Crear `verify-detail-controller.js`**

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
  const seen = { done: false, args: null };
  const stub = {
    getAssignedRoutineById: async (...args) => { await new Promise(r => setTimeout(r, 20)); seen.done = true; seen.args = args; return 'RESPONSE'; },
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
  const handler = RoutineController.prototype.getAssignedRoutineById;

  console.log('-- ruta, verbo y roles');
  await run('getAssignedRoutineById: ruta, verbo y roles', async () => {
    check('existe', typeof handler === 'function');
    check('ruta assign-user/:id', Reflect.getMetadata('path', handler) === 'assign-user/:id', Reflect.getMetadata('path', handler));
    check('verbo GET', Reflect.getMetadata('method', handler) === GET, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('user, coach y admin', Array.isArray(roles) && roles.length === 3
      && [UserRole.user, UserRole.coach, UserRole.admin].every(r => roles.includes(r)), JSON.stringify(roles));
    check('SIN @Owner: el dueño se chequea en el service', Reflect.getMetadata(OWNER_PARAM_KEY, handler) === undefined);
  });

  console.log('\n-- le pasa al service el id y el usuario del token, y espera sin devolver el Response');
  await run('argumentos y await', async () => {
    const tokenUser = { id: 'u1', role: UserRole.user, active: true };
    const res = {};
    const ret = await controller.getAssignedRoutineById({ id: 'a1' }, tokenUser, res);
    check('esperó al service', seen.done === true);
    check('devuelve undefined', ret === undefined, String(ret));
    check('id de la asignación', seen.args && seen.args[0] === 'a1', JSON.stringify(seen.args && seen.args[0]));
    check('usuario del token', seen.args && seen.args[1] === tokenUser);
    check('response', seen.args && seen.args[2] === res);
  });

  console.log('\n-- Swagger');
  await run('el documento generado declara respuesta y errores', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const entry = doc.paths['/routine/assign-user/{id}'];
    const get = entry && entry.get;

    check('GET /routine/assign-user/{id} está en el documento', !!get);
    check('el DELETE de BE-11 sigue en la misma entrada', !!(entry && entry.delete));
    if (get) {
      for (const code of ['200', '400', '403', '404']) check(`declara ${code}`, !!get.responses[code], Object.keys(get.responses).join(','));
      check('el 200 es RoutineAssignedDetailResponseDto',
        (get.responses['200'].content['application/json'].schema.$ref || '').endsWith('/RoutineAssignedDetailResponseDto'));
      check('parámetro de path id', get.parameters.some(p => p.in === 'path' && p.name === 'id'));
      check('pide token', Array.isArray(get.security) && get.security.some(s => 'bearer' in s));
    }

    const detail = doc.components.schemas.RoutineAssignedDetailResponseDto;
    const keys = detail ? Object.keys(detail.properties) : [];
    check('documenta sus 8 campos',
      ['id', 'routine_id', 'user_id', 'date', 'created_at', 'updated_at', 'routine', 'finished'].every(k => keys.includes(k)), keys.join(','));
    check('routine es RoutineDetailResponseDto (el mismo del detalle de rutina)',
      detail && ((detail.properties.routine.$ref || '').endsWith('/RoutineDetailResponseDto')), JSON.stringify(detail && detail.properties.routine));
    check('finished es un array de RoutineAssignedFinishedDto',
      detail && detail.properties.finished.type === 'array' && (detail.properties.finished.items.$ref || '').endsWith('/RoutineAssignedFinishedDto'), JSON.stringify(detail && detail.properties.finished));
    const finished = doc.components.schemas.RoutineAssignedFinishedDto;
    check('finished documenta sus 4 campos',
      finished && ['routine_exercise_id', 'user_note', 'created_at', 'updated_at'].every(k => k in finished.properties));

    check('el alta, la baja y el listado siguen en el documento',
      !!doc.paths['/routine/assign-user'] && !!(doc.paths['/routine/assign-user/{id}'] || {}).delete && !!doc.paths['/routine/assigned/{userId}']);
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 7: Correr los cuatro scripts nuevos en rojo**

```bash
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-builders verify-detail-rules verify-detail-sql verify-detail-controller; do echo "=== $f"; node "$S/$f.js" 2>&1 | grep -v "^  ok" | cut -c1-200 | tail -12; done
```

Esperado:
- `verify-builders`: la sección de **regresión pasa** (los builders todavía no cambiaron) y la de **lo nuevo falla**: la propagación no existe (`completedIds` se ignora, el ejercicio apagado visible no aparece).
- `verify-detail-rules`, `verify-detail-sql` y `verify-detail-controller` fallan por `getAssignedRoutineById is not a function` / no grabaron nada / handler inexistente.

Anotar cuántas fallas dio cada uno (van al Status como "antes en rojo").

> Si un script falla por una causa del **entorno de la prueba** (por ejemplo, un fixture con la forma equivocada o un guard que pide una dependencia que el `overrideGuard` no cubre), se corrige **el script** en este paso hasta que dé la falla que corresponde. No se sigue con un script que falla por una razón equivocada.

---

## Tarea 2: Los builders propagan la visibilidad

**Archivos:**
- Modificar: `power-app/src/routine/routine.service.ts` (`buildRoutineDetailResponse` y `buildCircuitDetailResponse`)

- [ ] **Paso 1: `buildRoutineDetailResponse`**: reemplazar el comentario y el método (hoy en `routine.service.ts:1131-1157`) por:

```ts
    // Compartido por el detalle y por las respuestas del alta y la edicion, para que el
    // formato no se duplique.
    // visibleInactiveIds: ids de Routine_Circuit (y de Routine_Exercise, que bajan al builder del
    // circuito) dados de baja que SI hay que mostrar. Las lecturas del entrenador no pasan nada,
    // asi que ven solo los activos: un circuito que sacaste de la rutina no reaparece en la
    // pantalla de edicion. La del alumno (GET /routine/assign-user/:id) pasa lo apagado de lo que
    // esa asignacion tenga algun ejercicio hecho: se ve lo dado de baja que uno completo.
    // completedIds: los ejercicios que el alumno completo en esa asignacion. Un vinculo apagado
    // que se muestra es porque completo algo de ese circuito, pero el circuito ya no integra la
    // rutina: de el se ve lo completado y nada mas (si no, el detalle mostraria como pendientes
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

- [ ] **Paso 2: `buildCircuitDetailResponse`**: reemplazar el comentario y la cabecera hasta el `.filter(...)` (hoy en `:1231-1246`) por:

```ts
    // visibleInactiveIds: ids de Routine_Exercise dados de baja que SI hay que mostrar.
    // Las lecturas del entrenador no pasan nada, asi que ven solo los activos. La del
    // alumno (GET /routine/assign-user/:id) pasa los que esa asignacion tenga hechos
    // (Routine_Exercise_Finished o Routine_Asign_Exercise_Finished): un ejercicio que completo
    // no tiene que desaparecerle de la pantalla porque el entrenador lo saco del circuito.
    // onlyExerciseIds: si viene, de este circuito se muestran SOLO esos ejercicios. Lo usa el
    // builder de la rutina para un vinculo apagado: el circuito ya no es parte de la rutina
    private buildCircuitDetailResponse(
        circuit: Circuit,
        visibleInactiveIds?: Set<string>,
        onlyExerciseIds?: Set<string>
    ) {
        return {
            id: circuit.id,
            name: circuit.name,
            description: circuit.description,
            type: circuit.type,
            active: circuit.active,
            created_at: circuit.created_at,
            updated_at: circuit.updated_at,
            exercises: circuit.routineExercises
                .filter(routineExercise => onlyExerciseIds
                    ? onlyExerciseIds.has(routineExercise.id)
                    : routineExercise.active || visibleInactiveIds?.has(routineExercise.id))
```

(El `.map(...)` de abajo no cambia.)

- [ ] **Paso 3: Compilar y correr `verify-builders.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-builders.js"
```

Esperado: build en verde; `verify-builders.js` con `N ok, 0 fallas` (N = 10): la regresión **sigue idéntica a la foto** y lo nuevo funciona. La única diferencia con la foto es la intencional: con `Set(['c'])` el ejercicio `c` ahora aparece (la foto guarda el hueco); sacando `c`, la salida es idéntica. Si la regresión se rompe en otra cosa, el cambio tocó algo que no debía: se corrige el código, **no la foto**.

---

## Tarea 3: El service y el DTO de respuesta

**Archivos:**
- Crear: `power-app/src/dtos/routine/routine_assigned_detail_response.dto.ts`
- Modificar: `power-app/src/routine/routine.service.ts`

- [ ] **Paso 1: Crear `routine_assigned_detail_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { RoutineDetailResponseDto } from './routine_detail_response.dto';

export class RoutineAssignedFinishedDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id del Routine_Exercise que el alumno marcó como hecho. El cliente cruza el árbol de la rutina por este id (en el árbol es el campo id de cada ejercicio)' })
    routine_exercise_id!: string;

    @ApiProperty({ example: 'Me costó la última serie', nullable: true, type: String, description: 'Nota del alumno sobre ese ejercicio (hasta 100 caracteres); null si no dejó ninguna' })
    user_note!: string | null;

    @ApiProperty({ description: 'Cuándo lo marcó' })
    created_at!: Date;

    @ApiProperty()
    updated_at!: Date;
}

export class RoutineAssignedDetailResponseDto {

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

    @ApiProperty({ type: RoutineDetailResponseDto, description: 'El mismo árbol que GET /routine/:id. Los circuitos y ejercicios dados de baja sólo aparecen si el alumno completó algo de ellos en esta asignación; de un circuito que el entrenador sacó de la rutina se ven únicamente los ejercicios completados' })
    routine!: RoutineDetailResponseDto;

    @ApiProperty({ type: [RoutineAssignedFinishedDto], description: 'Los ejercicios que el alumno ya marcó como hechos en esta asignación, con su nota' })
    finished!: RoutineAssignedFinishedDto[];
}
```

- [ ] **Paso 2: Imports del service**

Junto a los otros imports:

```ts
import { AuthUser } from '../authentication/auth-user.interface';
```

- [ ] **Paso 3: El método, después de `getAssignedRoutines` y antes de `// ===== HELPERS DE ASIGNACION INDIVIDUAL =====`**

```ts
    // Lo que el alumno abre desde su home (U-09, U-10): la rutina de UNA asignacion, con lo que ya
    // hizo. Se lee por la asignacion y no por la rutina (D8): la unidad de trabajo del alumno es la
    // asignacion del dia, y GET /routine/:id queda para coach y admin
    async getAssignedRoutineById(
        idAssignment: string,
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

            // "Dueño" = la asignacion es del alumno del token. El path trae el id de la asignacion
            // y no el del usuario, asi que no alcanza con @Owner: el chequeo va aca, en minuscula
            // (el iOS manda los UUID en mayuscula). Coach y admin abren la de cualquier alumno
            // (gimnasio compartido, D6). El texto no puede ser el de la cuenta deshabilitada: es
            // el unico que hace cerrar la sesion en el web
            if (currentUser.role === UserRole.user
                && assignment.user_id.toLowerCase() !== currentUser.id.toLowerCase()) {
                return res.status(403).send({
                    error: 'No podés acceder a una rutina asignada a otro alumno.'
                });
            }

            const finishedRows = await this.routineAsignExerciseFinishedRepository.find({
                where: { user_routine_asign_id: assignment.id },
                order: { created_at: 'ASC', routine_exercise_id: 'ASC' },
            });

            // La misma consulta y los mismos builders que GET /routine/:id (spec §4.4)
            const routine = await this.findRoutineDetail(assignment.routine_id);

            if (!routine) {
                return res.status(404).send({ error: 'Rutina no encontrada' });
            }

            const { visibleInactiveIds, completedIds } = this.buildAssignmentVisibility(routine, finishedRows);

            return res.status(200).send({
                id: assignment.id,
                routine_id: assignment.routine_id,
                user_id: assignment.user_id,
                date: assignment.date,
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
                routine: this.buildRoutineDetailResponse(routine, visibleInactiveIds, completedIds),
                finished: finishedRows.map(row => ({
                    routine_exercise_id: row.routine_exercise_id,
                    user_note: row.user_note ?? null,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                })),
            });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener la rutina asignada.' });
        }
    }
```

- [ ] **Paso 4: El helper, dentro de `// ===== HELPERS DE ASIGNACION INDIVIDUAL =====`, después de `findAssignedRoutinesProgress`**

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
        const completedIds = new Set(finishedRows.map(row => row.routine_exercise_id));
        const circuitsWithCompleted = new Set<string>();
        const visibleInactiveIds = new Set<string>();

        for (const routineCircuit of routine.routineCircuits) {
            for (const routineExercise of routineCircuit.circuit.routineExercises) {
                if (!completedIds.has(routineExercise.id)) {
                    continue;
                }

                circuitsWithCompleted.add(routineCircuit.circuit_id);

                if (!routineExercise.active) {
                    visibleInactiveIds.add(routineExercise.id);
                }
            }
        }

        for (const routineCircuit of routine.routineCircuits) {
            if (!routineCircuit.active && circuitsWithCompleted.has(routineCircuit.circuit_id)) {
                visibleInactiveIds.add(routineCircuit.id);
            }
        }

        return { visibleInactiveIds, completedIds };
    }
```

- [ ] **Paso 5: Compilar y correr `verify-detail-rules.js` y `verify-detail-sql.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-detail-rules.js" && node "$S/verify-detail-sql.js"
```

Esperado: build en verde; `verify-detail-rules.js` con `N ok, 0 fallas` (N ≈ 60) y `verify-detail-sql.js` con `0 fallas` y **los tres SQL impresos**. **Leer los tres SQL a ojo antes de seguir**, sobre todo el del detalle de rutina: es la primera vez que su `ORDER BY` anidado se ve generado. Si un chequeo del SQL falla por una diferencia de comillas o de alias entre lo que arma TypeORM y la expresión regular, se ajusta la regex *después* de leer el SQL y confirmar que dice lo mismo; si la diferencia es de fondo (un orden que falta o está invertido), se corrige el service.

---

## Tarea 4: El controller y su Swagger

**Archivos:**
- Modificar: `power-app/src/routine/routine.controller.ts`

- [ ] **Paso 1: Imports**

Junto a los otros imports:

```ts
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { AuthUser } from '../authentication/auth-user.interface';
import { RoutineAssignedDetailResponseDto } from '../dtos/routine/routine_assigned_detail_response.dto';
```

- [ ] **Paso 2: Reescribir el comentario de `GET /:id`**

Reemplazar (hoy en `routine.controller.ts:61-62`):

```ts
    // Sin el rol user: CU-U-09 exige que la rutina pertenezca a una asignacion vigente
    // del alumno, y esa cadena todavia no existe. Habilitarlo sin el check seria un agujero
```

por:

```ts
    // Sin el rol user, a proposito (D8, 17/10): el alumno lee la rutina POR SU ASIGNACION,
    // GET /routine/assign-user/:id, que es la unidad de trabajo del dia. Habilitarlo aca
    // obligaria a chequear "la tiene asignada" y cambiaria el contrato de este endpoint
```

- [ ] **Paso 3: El handler, en la sección `ASIGNACION INDIVIDUAL A UN ALUMNO`, después de `removeRoutineFromUser` y antes de `getAssignedRoutines`**

```ts
    // El dueño se chequea en el service y no con @Owner: el path trae el id de la asignacion y no
    // el del alumno. Con el rol user, 403 si la asignacion es de otro; coach y admin abren la de
    // cualquiera. Cubre U-09 y U-10: el detalle de cada ejercicio (series y notas) viene en el arbol
    @Get('assign-user/:id')
    @Auth(UserRole.user, UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: RoutineAssignedDetailResponseDto })
    @ApiResponse({ status: 400, description: 'El id no es un UUID válido' })
    @ApiResponse({ status: 403, description: 'La asignación es de otro alumno' })
    @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
    async getAssignedRoutineById(
        @Param() idAssignment: ParameterIdDto,
        @CurrentUser() user: AuthUser,
        @Res() res: Response,
    ) {
        await this.routineService.getAssignedRoutineById(idAssignment.id, user, res);
    }
```

- [ ] **Paso 4: Compilar y correr `verify-detail-controller.js` en verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
node "$S/verify-detail-controller.js"
```

Esperado: build en verde; `0 fallas`. Si falla el chequeo de `await`, el handler tiene un `return`: **sacarlo** (regla de BE-04).

---

## Tarea 5: Barrido final del código

**Archivos:** ninguno nuevo.

- [ ] **Paso 1: Build limpio y todos los scripts seguidos** (los cuatro nuevos y los siete de BE-11 y BE-12, como regresión)

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build >/dev/null 2>&1; echo "build exit=$?"
S="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
for f in verify-builders verify-detail-rules verify-detail-sql verify-detail-controller verify-assigned-dto verify-assigned-rules verify-assigned-controller verify-dto verify-rules verify-typeorm verify-controller; do echo "=== $f: $(node "$S/$f.js" 2>&1 | tail -1)"; done
```

Esperado: `build exit=0` y once `N ok, 0 fallas`. Los siete de BE-11 y BE-12 dan lo mismo que antes (24, 58, 27, 58, 62, 19, 30). Anotar los conteos para el Status.

- [ ] **Paso 2: Nada se escapó de lo acordado**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git status --short
git diff --stat -- "Db Creator" power-app/src/entities power-app/src/routine/routine.module.ts power-app/src/planification
grep -n "return this.routineService" power-app/src/routine/routine.controller.ts
grep -rn "La cuenta está deshabilitada" power-app/src/routine power-app/src/dtos/routine
grep -n "buildCircuitDetailResponse(routineCircuit.circuit)" power-app/src/routine/routine.service.ts
```

Esperado:
- `git status`: sólo el DTO nuevo, `routine.service.ts` y `routine.controller.ts` (los Status todavía no).
- `git diff --stat` de `Db Creator`, las entidades, `routine.module.ts` y `planification/`: **vacío**.
- `return this.routineService`, `La cuenta está deshabilitada` y la llamada vieja `buildCircuitDetailResponse(routineCircuit.circuit)`: **sin resultados** (esta última es la que cerraba el hueco).

---

## Tarea 6: Status (informe y dashboard)

**Archivos:**
- Modificar: `Status/estado-implementacion-backend.md`
- Modificar: `Status/dashboard-estado-backend.html`

Los números: ✅ 59 → **61**, 🟡 9 → **7**, 🔵 2, ⬜ 4, sin backend 1. Porcentajes: ✅ 61/75 = **81%**, 🟡 7/75 = **9%**, 🔵 **3%**, ⬜ **5%**, sin backend **1%** (suman 99 por redondeo; las barras del dashboard usan los anchos exactos y suman 100). Sobre los CU con backend: 61/74 = **82%**. Usuario: ✅ 13 → **15**, 🟡 4 → **2**, 🔵 0, ⬜ 2, sin backend 1 (15/19 = **79%**). Pendientes: 13 (7 parciales, 2 andamiaje, 4 sin implementar). **El corte queda en 2026-10-18.**

- [ ] **Paso 1: Informe — resumen y cobertura**

En `estado-implementacion-backend.md`:
1. Tabla de resumen: `| ✅ Implementado | 59 | 79% |` → `| ✅ Implementado | 61 | 81% |`; `| 🟡 Parcial | 9 | 12% |` → `| 🟡 Parcial | 7 | 9% |`.
2. Línea de «59 de los 74»: `**59 de los 74 CU con backend están completos (80%).** Faltan 15: 9 parciales, 2 en andamiaje y 4 sin implementar.` → `**61 de los 74 CU con backend están completos (82%).** Faltan 13: 7 parciales, 2 en andamiaje y 4 sin implementar.`
3. Cobertura por rol: `| Usuario | 20 | 13 | 4 | 0 | 2 | 1 | 68% |` → `| Usuario | 20 | 15 | 2 | 0 | 2 | 1 | 79% |`; `| **Total** | **75** | **59** | **9** | **2** | **4** | **1** | **80%** |` → `| **Total** | **75** | **61** | **7** | **2** | **4** | **1** | **82%** |`.

- [ ] **Paso 2: Informe — entrada nueva en "Cambios recientes"**, justo arriba de la de BE-12 (`## Cambios recientes (2026-10-18 · rutina individual: listado por alumno)`)

```markdown
## Cambios recientes (2026-10-18 · rutina individual: detalle para el alumno)

- **Decimotercera tarea del roadmap (BE-13): U-09 y U-10 pasan a ✅.** `GET /routine/assign-user/:id` (spec del 17/10, §4.4), en `routine.controller.ts` y `routine.service.ts`. Plan: `Doc/plans/2026-10-18-be-13-detalle-de-la-asignacion-para-el-alumno-plan.md` (repo PowerApp-Docs). Conteos: ✅ 59 → **61** y 🟡 9 → **7**; el Usuario sube de 68% a 79%. **Salvedad:** el detalle de una asignación **del plan** (`Routine_Asignation`) no tiene contrato en la spec y lo define el bloque B, igual que el marcar dentro de un plan (§8); U-09 y U-10 pasan a ✅ porque así lo fija la spec (§11) para el cierre del bloque A.
- **El alumno lee por asignación, no por rutina.** El roadmap proponía abrirle `GET /routine/:id` al rol `user` con un chequeo de "asignación vigente" (DA5); la spec lo descartó (D8) y **ese endpoint sigue siendo sólo de coach y admin**. **Por qué:** la unidad de trabajo del alumno es la asignación del día, y así no se le cambia el contrato a `GET /routine/:id`. Se reescribió su comentario, que hablaba de una "cadena que todavía no existe".
- **El contrato.** Roles: user, coach y admin. `404` si la asignación no existe; `403` (`No podés acceder a una rutina asignada a otro alumno.`) si es de otro alumno y quien pide tiene rol `user`; coach y admin abren la de cualquier alumno (gimnasio compartido). El `404` va **antes** que el `403`, como dice la spec. El dueño se chequea en el service y no con `@Owner`, porque el path trae el id de la asignación y no el del alumno; se compara en minúscula (el iOS manda los UUID en mayúscula). `200` con `{ id, routine_id, user_id, date, created_at, updated_at, routine, finished }`, donde `routine` es **el mismo árbol de `GET /routine/:id`** (misma consulta, mismos builders) y `finished` son los `{ routine_exercise_id, user_note, created_at, updated_at }` de lo que el alumno ya marcó. U-10 se resuelve dentro del mismo árbol: cada ejercicio trae su ficha de catálogo, sus series ordenadas y la nota del coach, y la nota del alumno sale de `finished`.
- **Se propagó la visibilidad de lo dado de baja.** El builder de la rutina filtraba los vínculos apagados con `visibleInactiveIds` pero **llamaba al del circuito sin pasarle nada**: un ejercicio dado de baja que el alumno completó no habría aparecido. Ahora se propaga. Regla (27/8): un `Routine_Exercise` apagado se ve si el alumno lo completó en esa asignación; un `Routine_Circuit` apagado se ve si completó algo de **ese circuito** (se mira el circuito y no el vínculo porque la base no registra el hecho por vínculo: con un circuito repetido, A, B, A, el ejercicio completado es el mismo en los dos).
- **Decisión de diseño: dentro de un circuito que el coach sacó de la rutina se ve sólo lo que el alumno completó.** La spec no lo definía (era el caso borde que dejó anotado BE-12). **Por qué:** mostrarle al alumno los demás ejercicios de ese circuito como pendientes contradice la decisión del coach de sacarlo; y así **el detalle coincide con el `total` del listado**: los ejercicios que se ven, sin repetir ids, son exactamente los activos de los vínculos activos más los completados. Se implementó con un tercer parámetro **opcional** en cada builder, de modo que `createRoutine`, `editRoutine`, `getRoutineById` y los tres de circuito **no cambian**.
- **Orden de lo apagado.** El vínculo apagado tiene `order` en `null` y Postgres manda los `NULL` al final en `ASC`: los circuitos apagados que se muestran salen después de los vigentes.
- **Una rutina dada de baja después de asignarla se abre igual**, con `routine.active: false`.
- **Sin cambios de esquema:** `Db Creator/`, las entidades y `routine.module.ts` no se tocaron. Specs de CU reescritas en `Use Cases/` (repo PowerApp-Docs): **U-09 y U-10**.
- **Para el web.** B2 (detalle de rutina y de ejercicio) ya puede tipar contra el Swagger de este endpoint: reutiliza el tipo y el componente del detalle de rutina y cruza lo hecho por `routine_exercise_id`.
- **Verificación, sin levantar el server.** Hecho:
  - Build en verde.
  - **Regresión de los builders con una foto:** antes de tocar el código se guardó la salida de los dos builders sobre un árbol armado a mano (sin visibilidad y con el conjunto de visibilidad de un solo parámetro); después del cambio es **idéntica**, así que lo que usan el alta, la edición y la lectura de rutinas y circuitos no cambió. {N_BLD} chequeos.
  - {N_DRULES} chequeos del service con repositorios falsos: `404` antes que `403`, dueño por rol con ids en mayúscula, la forma exacta de la respuesta, **el `routine` idéntico al de `GET /routine/:id`**, `finished`, y siete escenarios de visibilidad cruzados con la fórmula del `total` de BE-12 (activos ∪ hechos).
  - {N_DSQL} chequeos sobre el SQL de las tres consultas, armadas con un `DataSource` real **sin conexión** a partir de las opciones que el service realmente pasa, y **leídas**: incluye por primera vez el SQL del detalle de rutina con su `ORDER BY` anidado de tres niveles (vínculo → `exercise_order` → `set_order`).
  - {N_DCTRL} chequeos del controller: ruta, roles, sin `@Owner`, que le pasa al service el id y el usuario del token, `await` sin `return` y el Swagger generado.
  - Los cuatro scripts se corrieron antes **en rojo** ({RED_BLD}, {RED_DRULES}, {RED_DSQL} y {RED_DCTRL} fallas) y después en verde; los siete de BE-11 y BE-12 siguen en verde como regresión.
- **Lo que NO se verificó.**
  - **Nada corrió contra un Postgres ni contra el server.** El SQL del detalle de rutina se generó y se leyó, no se ejecutó: el orden anidado de tres niveles sigue siendo **lo primero a probar en BE-35** (spec §12).
  - El rendimiento del detalle con datos reales no se midió.
  - **El detalle con ejercicios realmente completados no se puede probar de punta a punta todavía**: nada escribe `Routine_Asign_Exercise_Finished` hasta BE-14 (hallazgo 2). Se probó con repositorios falsos y un árbol armado a mano.
- **Cambios de estado:** **U-09 y U-10 pasan de 🟡 a ✅.** La fase 2 avanza: **BE-10, BE-10b, BE-11, BE-12 y BE-13 hechas, sigue BE-14** (marcar, desmarcar y la nota, fusionado con BE-15).
```

Reemplazar `{N_*}` y `{RED_*}` por los conteos reales de las Tareas 1 y 5 (no dejar llaves en el texto final).

- [ ] **Paso 3: Informe — detalle de U-09, U-10, hallazgo 2 y plan de trabajo**

1. Fila de U-09 por:

```markdown
| CU-U-09 | Ver detalle de rutina | ✅ Implementado | `GET /routine/assign-user/:id` · el alumno lee la rutina **por su asignación** (`403` si es de otro; coach y admin, la de cualquiera) · mismo árbol que `GET /routine/:id`, con lo dado de baja que completó y lo hecho en `finished` (18/10) · el detalle de una asignación del plan es del bloque B |
```

2. Fila de U-10 por:

```markdown
| CU-U-10 | Ver detalle de un ejercicio | ✅ Implementado | Se resuelve dentro del detalle de la asignación (`GET /routine/assign-user/:id`): ficha del ejercicio, series ordenadas, nota del coach y, en `finished`, la nota del alumno · `GET /exercise/:id` sigue siendo la ficha de catálogo (18/10) |
```

3. En el **hallazgo 2**, reemplazar la frase `También falta el detalle en contexto de rutina de **U-09/U-10**.` por `El detalle en contexto de rutina de **U-09/U-10** ya existe desde el 18/10 (BE-13): lee lo hecho, pero no hay nada que lo escriba.`
4. Tabla "Plan de trabajo", fila de la fase 2, columna Estado: `en curso: BE-10 y BE-10b hechas el 17/10, BE-11 y BE-12 el 18/10; sigue BE-13` → `en curso: BE-10 y BE-10b hechas el 17/10, BE-11, BE-12 y BE-13 el 18/10; sigue BE-14`.

- [ ] **Paso 4: Dashboard**

En `dashboard-estado-backend.html`:
1. Tarjetas de arriba: **Implementado** `<div class="n">59</div>` → `61` y `79% · cumple su spec` → `81% · cumple su spec`; **Parcial** `<div class="n">9</div>` → `7` y `12% · un camino sin cumplir` → `9% · un camino sin cumplir`.
2. `aria-label` de la barra: `59 implementados, 9 parciales` → `61 implementados, 7 parciales`.
3. Barra: `s-done` `width:78.67%` → `81.33%`; `s-partial` `width:12.00%` → `9.33%` (los otros tres no cambian: 2.67 + 5.33 + 1.33 → suma 100).
4. Leyenda de la barra: `<b>59 de los 74</b> CU con backend completos (80%)` → `<b>61 de los 74</b> CU con backend completos (82%)`; `<b>15</b> pendientes (9 parciales, 2 andamiaje, 4 sin endpoint)` → `<b>13</b> pendientes (7 parciales, 2 andamiaje, 4 sin endpoint)`.
5. Tarjeta del **Usuario**: `role-pct` `68%` → `79%`; `role-sub`: `13 de 19 con backend · Mi cuenta y RMs cerrados (salvo el mail de U-04); falta ejecutar el entrenamiento` → `15 de 19 con backend · Mi cuenta, RMs y el detalle de la rutina cerrados (salvo el mail de U-04); falta ejecutar el entrenamiento`; `mini-bar`: `width:65%` → `75%` y `width:20%` → `10%` (los otros dos no cambian: 10 + 5); leyenda: `<b>13</b> impl.` → `<b>15</b> impl.` y `<b>4</b> parc.` → `<b>2</b> parc.`.
6. Filas de **U-09** y **U-10** (Usuario): el chip pasa de `class="chip partial"` / `Parcial` a `class="chip done"` / `Implementado`, y las celdas de endpoint a:

```html
<td class="endpoint"><span class="verb">GET</span> /routine/assign-user/:id <span class="muted">· el alumno lee la rutina por su asignación (403 si es de otro) · mismo árbol que GET /routine/:id, con lo dado de baja que completó y lo hecho en <code>finished</code> (18/10)</span></td>
```
```html
<td class="endpoint"><span class="muted">dentro del detalle de la asignación: ficha, series, nota del coach y, en <code>finished</code>, la nota del alumno (18/10) · </span><span class="verb">GET</span> /exercise/:id <span class="muted">sigue siendo el catálogo</span></td>
```

7. Chip de la fase 2 en el "Plan de trabajo": `En curso · BE-10, BE-10b, BE-11 y BE-12 hechas` → `En curso · BE-10, BE-10b, BE-11, BE-12 y BE-13 hechas`.
8. Hallazgo 2 (párrafo del hallazgo): `y el detalle en contexto de rutina de <b>U-09 / U-10</b>` → `y, del otro lado, el detalle en contexto de rutina de <b>U-09 / U-10</b>, que ya lee lo hecho (18/10) pero no hay nada que lo escriba`. Si la frase del HTML no coincide palabra por palabra, leerla y adaptar el reemplazo al texto real.
9. Pie: `59 impl · 9 parc · 2 andam · 4 falta · 1 sin backend` → `61 impl · 7 parc · 2 andam · 4 falta · 1 sin backend`.

- [ ] **Paso 5: Barrido para no dejar números viejos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status"
grep -n "9 parc\|9 parciales\|59 impl\|59 de los\|sigue BE-13\|BE-12 hechas\|{N_\|{RED_" dashboard-estado-backend.html estado-implementacion-backend.md | cut -c1-200
```

Cada coincidencia que quede tiene que ser una entrada **histórica** de "Cambios recientes" (no se reescriben) o una referencia a otro tema; cualquier otra se corrige. En el informe no puede quedar ningún `{N_` ni `{RED_`. Después, **recargar el dashboard desde el archivo** en el panel del navegador (`navigate` a `file:///…`; el panel puede tener una copia vieja) y leer con `javascript_tool` las tarjetas, la barra (que sume 100), la tarjeta del Usuario y las filas de U-09 y U-10, como se hizo en BE-11 y BE-12.

---

## Tarea 7: Specs de CU (repo PowerApp-Docs)

**Archivos:**
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\usuario\CU-U-09-ver-detalle-de-rutina.md`
- Reescribir: `D:\Power App\Docs\PowerApp-Docs\Use Cases\usuario\CU-U-10-ver-detalle-de-un-ejercicio.md`

Spec §7: "U-09, U-10: se leen **desde la asignación del día**. U-10 se resuelve dentro del mismo detalle". Se saca la mención a `User_Routine` (eliminada, D11).

- [ ] **Paso 1: Reescribir `CU-U-09-ver-detalle-de-rutina.md`**

```markdown
# CU-U-09 — Ver detalle de Rutina

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra los circuitos y ejercicios que componen la rutina de una asignación del usuario, junto con lo que ya hizo en ella, como punto de partida para ejecutarla. La rutina se abre **desde la asignación del día** y no directamente por la rutina.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Ver detalle de un ejercicio

## Alcance

**Cubre:**

- Listado ordenado de circuitos de la rutina y, dentro de cada uno, sus ejercicios con sus series.
- Los ejercicios que el alumno ya marcó como realizados en esa asignación, con su nota.
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

1. El usuario selecciona una asignación desde su home (CU «Obtener mi planificación»).
2. El sistema verifica que la asignación sea del usuario.
3. El sistema recupera los circuitos de la rutina (Routine_Circuit) en su orden.
4. Para cada circuito, recupera sus ejercicios (Routine_Exercise) con series.
5. El sistema recupera los ejercicios que el usuario ya marcó como realizados en esa asignación, con su nota.
6. El sistema presenta la estructura completa, señala lo realizado y permite abrir el detalle de cada ejercicio (<<include>> Ver detalle de un ejercicio).

## Caminos alternativos / excepciones

### En el paso 2 — La asignación no existe

1. El sistema informa que no se encontró la asignación.

### En el paso 2 — Asignación de otro alumno

1. La asignación pertenece a otro usuario.
2. El sistema deniega el acceso.

### En el paso 3 — La rutina fue dada de baja después de asignarla

1. El entrenador dio de baja la rutina después de asignarla.
2. El sistema la muestra igual, indicando que está dada de baja: la asignación existe y el usuario puede ejecutarla.

### En el paso 4 — Un ejercicio o un circuito fue dado de baja

1. El entrenador sacó un ejercicio de un circuito, o un circuito de la rutina, después de que el usuario completó algo de él en esa asignación.
2. El sistema lo sigue mostrando: lo dado de baja que el usuario completó no desaparece de su pantalla.
3. De un circuito que el entrenador sacó de la rutina se muestran únicamente los ejercicios que el usuario completó; los demás no aparecen como pendientes.
4. Lo dado de baja que el usuario **no** completó no se muestra.
```

- [ ] **Paso 2: Reescribir `CU-U-10-ver-detalle-de-un-ejercicio.md`**

```markdown
# CU-U-10 — Ver detalle de un ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra el detalle de un ejercicio dentro de la rutina de una asignación (series, reps, notas, video/tips) y habilita las acciones de ejecución asociadas. Los datos llegan **dentro del detalle de la rutina** (CU «Ver detalle de Rutina»), así que abrirlo no requiere una consulta aparte.

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
- El ejercicio forma parte de la rutina de una asignación del usuario.

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

1. El entrenador sacó el ejercicio de la rutina después de que el usuario lo completó en esa asignación.
2. El sistema lo sigue mostrando, con su nota, porque forma parte de lo que hizo.
```

---

## Tarea 8: Dejar todo stageado, memoria y cierre

**Archivos:** ninguno nuevo. **No se commitea ni se pushea.**

- [ ] **Paso 1: Stagear sólo los archivos propios, en cada repo**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git add power-app/src/dtos/routine/routine_assigned_detail_response.dto.ts \
        power-app/src/routine/routine.service.ts \
        power-app/src/routine/routine.controller.ts \
        Status/estado-implementacion-backend.md \
        Status/dashboard-estado-backend.html
git status --short

cd "D:/Power App/Docs/PowerApp-Docs"
git add "Doc/plans/2026-10-18-be-13-detalle-de-la-asignacion-para-el-alumno-plan.md" \
        "Use Cases/usuario/CU-U-09-ver-detalle-de-rutina.md" \
        "Use Cases/usuario/CU-U-10-ver-detalle-de-un-ejercicio.md"
git status --short
```

Esperado: el backend con 5 archivos (`A` el DTO, `M` el resto) y el de docs con 3 (`A` el plan, `M` las dos specs). Si `git status` muestra algo más que no sea propio, no se stagea.

- [ ] **Paso 2: Actualizar la memoria del proyecto**

En `C:\Users\caram\.claude\projects\D--Power-App-Backend-PowerApp-Backend\memory\`: actualizar `project_cu_status.md` y su línea del `MEMORY.md` para que digan que BE-13 está hecha (U-09 y U-10 en ✅; 61 ✅ · 7 🟡 · 2 🔵 · 4 ⬜) y que **sigue BE-14**. Agregar la regla que deja la tarea: *dentro de un vínculo apagado que se muestra, sólo se ve lo que el alumno completó (así el detalle coincide con el `total` del listado)*.

- [ ] **Paso 3: Proponer los mensajes de commit (uno por repo) y cerrar**

Backend:

```
BE-13: detalle de la asignacion individual para el alumno (U-09 y U-10), GET /routine/assign-user/:id

El alumno lee por asignacion y el duenio se chequea en el service. Los builders propagan la visibilidad de lo dado de baja: de un circuito que el coach saco se ve solo lo que el alumno completo. Status: U-09 y U-10 pasan a implementado (61 de 74).
```

PowerApp-Docs:

```
Plan de BE-13 y specs de U-09 y U-10 reescritas para leer la rutina desde la asignacion del dia
```

Reportar al usuario: qué quedó, qué se verificó (los once scripts y el build, con sus conteos), qué **no** (nada corrió contra Postgres; el orden anidado del detalle se leyó pero no se ejecutó; el detalle con ejercicios realmente completados hasta BE-14), y la tarea siguiente: **BE-14**, marcar, desmarcar y la nota (`POST /routine/assign-user/:id/finished` y `DELETE …/finished/:routineExerciseId`, spec §4.5 y §4.6), que reutiliza el helper de errores de la base.

---

## Autorrevisión del plan contra la spec

**Cobertura de la spec:**
- §4 tabla de rutas: `GET /routine/assign-user/:id` con user (dueño), coach y admin → Tarea 4, `verify-detail-controller` (roles, sin `@Owner`, usuario del token).
- §4.4: `404` si no existe y `403` si es de otro alumno (para el rol `user`) → Tarea 3, `verify-detail-rules` (códigos, orden 404 → 403, ids en mayúscula). `200` con la forma `{ id, routine_id, user_id, date, created_at, updated_at, routine, finished }` y el `routine` idéntico al de `GET /routine/:id` → `verify-detail-rules` (compara contra `getRoutineById`).
- §4.4, "se arma con los mismos builders… cubre también CU-U-10" → Tarea 2 y 3; los builders no se duplican, se propaga la visibilidad.
- §4.4, "visibilidad de lo dado de baja (27/8)… hoy el builder de la rutina no le pasa la visibilidad al del circuito: hay que propagarla" → Tarea 2 (`verify-builders`: regresión idéntica a la foto, y lo nuevo) y Tarea 3 (`verify-detail-rules`: siete escenarios cruzados con la fórmula del `total` de BE-12). El caso borde que la spec no resuelve se decide en **m1** y se somete a veto.
- §6: las asignaciones sobreviven a la baja de la rutina → la rutina de baja se abre igual (`verify-detail-rules`).
- §7 (U-09, U-10) → Tarea 7.
- §9/§10/§11/§12: Status por tarea (U-09 y U-10 a ✅, conteos), SQL de la consulta generado sin conectarse (y leído), verificación sin levantar el server, y el riesgo del orden anidado de tres niveles → Tareas 1, 3, 5 y 6.
- Encargos transversales: `await` sin `return` (`verify-detail-controller`), mensajes en español con `{ error }`, el único 403 nuevo con un texto distinto del reservado (`verify-detail-rules`), `@Auth` por endpoint.
- §4.5 y siguientes (marcar, desmarcar, historial): **fuera de alcance** (BE-14 en adelante).

**Placeholders:** el único texto con llaves son los conteos `{N_*}` y `{RED_*}` del Status, que el paso 2 de la Tarea 6 manda reemplazar con la salida real de los scripts y el paso 5 verifica que no queden.

**Consistencia de nombres:** `getAssignedRoutineById` (service, controller y scripts), `buildAssignmentVisibility`, `RoutineAssignedDetailResponseDto` / `RoutineAssignedFinishedDto`, parámetros nuevos `completedIds` (builder de la rutina) y `onlyExerciseIds` (builder del circuito). El constructor del service **no cambia**: el orden de los parámetros que usan los scripts (`circuit`, `routine`, `dataSource`, `user`, `assignment`, `finished`) es el de BE-11 y BE-12.
