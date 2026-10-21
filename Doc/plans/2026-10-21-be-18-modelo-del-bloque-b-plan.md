# BE-18 — Modelo del bloque B y el día de cada marca · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` y se propone el mensaje (Tarea 12).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escriben (o se adaptan) **antes** del código y se corren en rojo.
> 3. **No se levanta el server**, ni siquiera en segundo plano. **Tampoco se instala nada** (el usuario no quiso PGlite en BE-10): el SQL se verifica como texto, igual que en BE-10.

> **Registro de ejecución (21/10):** plan aprobado y ejecutado en la misma sesión, sin subagentes. Qué cambió respecto de lo escrito abajo:
> - **Tarea 3, paso 4:** el conteo del bloque de `User_Planification` dio `1` y no `0`: el único "match" es el comentario nuevo que explica que `number_of_routines` ya no está. Sin comentarios da `0`. El chequeo era demasiado literal; el `01` está bien.
> - **Tarea 9a, paso 1:** la línea de base con el `dist` copiado al scratchpad no encontraba `typeorm`; se corrió con `NODE_PATH` apuntando a `power-app/node_modules`. Resultado: las mismas 19 diferencias previas antes y después, y 12 diferencias (los cambios de BE-18) al enfrentar las entidades viejas con el `01` nuevo.
> - **Tarea 9b** se corrió antes de lo previsto, apenas se escribió el patch: `TODO OK (estatico)`.
> - **Tarea 9c:** bloqueada, porque al llegar el diagrama de `Doc/` seguía siendo el del 17/10. Se le pidió al usuario que lo exporte; las Tareas 10 y 11 se hicieron mientras tanto, y **no se stageó nada** hasta correr la 9c. La primera exportación traía `Routine_Exercise_Finished.finished_at` como `Datetime` (1 diferencia nueva); el usuario lo corrigió a `Date` y reexportó (SVG sha256 `6a3ebd5c…630f`). Resultado final: 6 diferencias contra el `01` de HEAD y **0** contra el regenerado, más las 3 previas de `User`.
> - **Tarea 10:** en U-12 se corrigió además el punto 3 de "El entrenador sacó el ejercicio de la rutina" ("sólo puede editarse su nota" → "su nota y el día en que se hizo"), que el plan no listaba y quedaba en contradicción.

**Spec que manda:** [`2026-10-20-asignar-planificaciones-design.md`](../specs/2026-10-20-asignar-planificaciones-design.md), §2 (D17, D18, D19, D25), §3, §5.7, §5.9, §6, §7, §9 (fila BE-18), §10 y §12.
**Diagrama:** el que el usuario exporte desde Miro a `Doc/PowerApp - Modelo DB.svg` / `.pdf`. **Al escribir este plan (21/10) sigue el del 17/10** (sha256 `135ca4b6…7ede`). El plan puede avanzar sin él hasta la Tarea 9c, pero **no se stagea sin el diagrama exportado** (§3b).
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde contradice a la spec (BE-18 = sólo E-13), manda la spec: BE-18 es el modelo, y E-13 pasa a BE-18b.

**Goal:** dejar el esquema, las entidades y la vía individual en el modelo del bloque B: `User_Planification` con `end_date` guardado y sin la cabecera copiada, sus dos FK obligatorias, y el día en que el alumno hizo cada ejercicio (`finished_at`) en las dos tablas de ejecución.

**Architecture:** una sola entrega, como BE-10: entidades TypeORM, `Db Creator` (`ddl.py` → `01`, más un patch idempotente) y la adaptación de la vía individual (marcar, el detalle y el historial) a `finished_at`, que tiene que ir junta porque con la columna NOT NULL el marcar de BE-14 fallaría en la base. Ningún CU cambia de estado.

**Tech Stack:** NestJS + TypeORM (Postgres) · Python 3 (`py`, sin librerías) para `Db Creator` y los controles estáticos · scripts de Node en el scratchpad, reutilizados de BE-10 a BE-16.

---

## 1. Hallazgos al preparar el plan (lo que la spec no dice)

1. **El build no detecta que falta `finished_at` al marcar.** `repository.create({...})` acepta un `DeepPartial`, así que `markExerciseFinished` (`routine.service.ts:1097-1103`) **compila** sin el campo y fallaría recién en la base (`NOT NULL violation` → 500). Lo atrapan los scripts de reglas (Tarea 8), no el build.
2. **El patch tiene que ser idempotente con tablas que se van a llenar.** Después de BE-18b y BE-20c, `User_Planification` y `Routine_Exercise_Finished` van a tener filas. Una guarda ingenua ("abortar si tiene filas") abortaría al re-correrlo. Como en BE-10, cada guarda mira la **forma vieja**: `User_Planification` todavía con `number_of_routines`, `Routine_Exercise_Finished` todavía sin `finished_at`.
3. **`Routine_Asign_Exercise_Finished` puede tener filas** de las pruebas de BE-14 contra la base viva. El patch la completa con el día de `created_at` en hora de Argentina (spec §3), en tres pasos: columna nullable, `UPDATE`, `SET NOT NULL`.
4. **Las FK de `User_Planification` se recrean.** `SET NULL` es incompatible con NOT NULL, así que el patch hace `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` con `RESTRICT`, con los mismos nombres del `01` (`fk_user_planification_coach`, `fk_user_planification_planification`). Si la base viva tuviera otros nombres, quedarían dos FK: la verificación del patch lo detecta (cuenta las FK de la tabla).
5. **`start_date` pasa a tiparse `string`** (la columna no cambia). TypeORM hidrata `date` como `'YYYY-MM-DD'` (verificado en BE-05 y BE-10 con `User_RM` y `Routine_Asignation_User`), y BE-18b va a hacer cuentas con ese string (spec §4). `end_date` nace `string`. *Decisión del plan: se puede vetar.*
6. **El `finished_at` del historial cambia de tipo** (de instante a día) y su **orden**: los ejercicios de una sesión pasan a ordenarse por `finished_at` y después por `created_at` (spec §5.9). El `finished[]` del detalle (BE-13) **conserva** su orden por `created_at`: la spec no lo cambia y es el orden en que el alumno marcó.
7. **El script de BE-13 (`verify-detail-rules.js`) va a fallar** después del cambio, porque exige las claves exactas de `finished[]`. No es una regresión: se actualiza la expectativa (Tarea 1, paso 4) y se corre en rojo antes.
8. **El diagrama tiene que mostrar `finished_at` también en `Routine_Asign_Exercise_Finished`.** La captura del 20/10 sólo mostraba `Routine_Exercise_Finished`; D25 va en las dos tablas. Va en la lista de §3b para que el usuario lo revise antes de exportar.
9. **Ningún generador de datos inserta en las tres tablas** (`grep` del 20/10 en `gen_seed.py`, `static_extra.py`, `catalogo_ejercicios.py` y `dynamic_data.py`): el `02` y el `03` no cambian.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/entities/user_planification.entity.ts` | − `description`, − `type`, − `number_of_routines`, + `end_date`, `coach_id` y `planification_id` NOT NULL con `RESTRICT`, `start_date` tipado `string` |
| `power-app/src/entities/routine_exercise_finished.entity.ts` | + `finished_at`; `user_note` a `string \| null` |
| `power-app/src/entities/routine_asign_exercise_finished.entity.ts` | + `finished_at` |
| `power-app/src/dtos/routine/mark_exercise_finished.dto.ts` | + `finished_at` opcional (día) |
| `power-app/src/dtos/routine/routine_assigned_detail_response.dto.ts` | `RoutineAssignedFinishedDto` + `finished_at` |
| `power-app/src/dtos/routine/routine_history_response.dto.ts` | `finished_at` pasa a día; descripción del orden |
| `power-app/src/routine/routine.service.ts` | `markExerciseFinished`, `buildFinishedResponse`, `getTrainingHistory`, una constante |
| `power-app/src/routine/routine.controller.ts` | Descripciones del `200` y del `400` de marcar |
| `Db Creator/ddl.py` y `Db Creator/01_estructura.sql` (regenerado) | Las tres tablas |
| `Db Creator/patches/2026-10-21-be-18.sql` | **Nuevo:** patch idempotente |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | Entrada del 21/10 y notas |

`Db Creator/02_datos_estaticos.sql` y `03_datos_dinamicos.sql` **no cambian** (se comprueba con hashes).

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**: este plan y las specs `Use Cases/usuario/CU-U-12`, `CU-U-13`, `Use Cases/entrenador/CU-E-06` y `CU-E-07`.

**Scratchpad** (`…\7d419d17-…\scratchpad\be18\`, fuera de los repos): los scripts de BE-10 a BE-16, copiados y adaptados, más `patch-static-be18.py`.

---

## 3. Cobertura de la spec

| Spec | Qué pide | Tarea |
|---|---|---|
| §3 `User_Planification` | − 3 columnas, + `end_date`, 2 FK NOT NULL + `RESTRICT` | 2, 3, 4 |
| §3 `Routine_Exercise_Finished` | + `finished_at DATE NOT NULL` | 2, 3, 4 |
| §3 `Routine_Asign_Exercise_Finished` | + `finished_at DATE NOT NULL`, completar las filas existentes | 2, 3, 4 |
| §3 código | `user_note` de `RoutineExerciseFinished` a `string \| null`; sin comentarios de D12 | 2, 3 |
| §3 `Db Creator` | `ddl.py`, `01`, `02`/`03` sin cambios, byte-idéntico, patch | 3, 4, 9 |
| §5.7 vía individual | `finished_at` obligatorio al crear, corregible, en la respuesta y en `finished[]` | 5, 6, 8 |
| §5.9 historial | `finished_at` = el día; orden por `finished_at` y `created_at` | 5, 6, 8 |
| §7 specs de CU | U-12, U-13 (vía individual), E-06, E-07 | 10 |
| §10 verificación | build · regeneración · `01` contra entidades y diagrama · reglas · SQL | 7, 8, 9 |
| §11 Status | entrada del 21/10, notas de D12 y DB3, avisos al web | 11 |
| **No está en la spec** | `start_date` tipado `string` (hallazgo 5) | 2 |

---

## 3b. Sincronía con el modelo de `Doc/`

**Lo que el diagrama exportado tiene que mostrar** (revisarlo en Miro antes de exportar):

| Tabla | Columnas |
|---|---|
| `User_Planification` | `id`, `user_id`, `coach_id`, `planification_id`, `coach_note` Varchar(100), `active` NOT NULL, `start_date` Date NOT NULL, **`end_date` Date NOT NULL**, `created_at` NOT NULL, `updated_at` NOT NULL. **Sin** `description`, `number_of_routines` ni `type` (la captura 3 del 20/10 ya está así) |
| `Routine_Exercise_Finished` | `id`, `user_planification_id`, `routine_asignation_id`, `routine_exercise_id`, `user_note` Varchar(100), **`finished_at` Date NOT NULL** (la captura dice `Datetime`: va `Date`), **`created_at`** Datetime NOT NULL (la captura dice `updated_atld`), `updated_at` Datetime NOT NULL |
| `Routine_Asign_Exercise_Finished` | Las de hoy **más `finished_at` Date NOT NULL** (no estaba en las capturas) |

**El comparador** (`svg_vs_ddl.py`, Tarea 9c) lee el texto del `.svg` y lo compara con el `01`: columnas, tipos y `NOT NULL` (en las FK el dibujo no marca nulabilidad, así que el NOT NULL de `coach_id` y `planification_id` no se compara). Con el diagrama exportado, el resultado esperado es:

| Contra | Diferencias nuevas | Cuáles |
|---|---:|---|
| El `01` de HEAD | **6** | `User_Planification.description`, `.type` y `.number_of_routines` (sólo en el DDL) · `User_Planification.end_date`, `Routine_Exercise_Finished.finished_at` y `Routine_Asign_Exercise_Finished.finished_at` (sólo en el diagrama) |
| El `01` regenerado | **0** | — |

En los dos casos, más las **3 desalineaciones previas** de siempre (`User.role`, `User.profile_picture`, `User.email`), que no se tocan.

---

## Tarea 0 — Línea de base

**Archivos:** ninguno (lectura y copias al scratchpad).

> **Nota de shell:** el shell no conserva variables entre comandos. Cada bloque que las usa empieza definiéndolas:
> ```bash
> SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
> OLD_A="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
> OLD_10="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c6699336-c851-47d6-8ce5-57d1232610c2/scratchpad"
> ```

- [ ] **Paso 1: árbol limpio y build verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short && npm --prefix power-app run build
```
Esperado: `git status` sin salida (salvo lo que el usuario tenga sin commitear de BE-16: si aparece, **preguntar** antes de seguir) y el build sin errores.

- [ ] **Paso 2: guardar la línea de base** (el `dist` y el `01` de HEAD)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
mkdir -p "$SCRATCH" && cd "D:/Power App/Backend/PowerApp-Backend"
rm -rf "$SCRATCH/baseline-dist" && cp -r power-app/dist "$SCRATCH/baseline-dist"
git show HEAD:"Db Creator/01_estructura.sql" > "$SCRATCH/baseline-01.sql"
cd "Db Creator" && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql | tee "$SCRATCH/baseline-hashes.txt"
```

- [ ] **Paso 3: HEAD regenera byte-idéntico**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && py build_sql.py > /dev/null && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql | diff - "$SCRATCH/baseline-hashes.txt" && echo "BASELINE OK" ; git status --short
```
Esperado: `BASELINE OK` y `git status` sin salida. Si difiere, **parar y avisar**.

- [ ] **Paso 4: ¿el diagrama ya se exportó?**

```bash
cd "D:/Power App/Docs/PowerApp-Docs/Doc" && sha256sum "PowerApp - Modelo DB.svg" | grep -q 135ca4b6fb646a72dad03516627afa76d9ef07b6d017694ece564e7089cc7ede && echo "SIGUE EL DEL 17/10" || (echo "EXPORTADO"; sha256sum "PowerApp - Modelo DB.svg" "PowerApp - Modelo DB.pdf")
```
- `EXPORTADO`: anotar los dos hashes para el Status y seguir.
- `SIGUE EL DEL 17/10`: seguir con las Tareas 1 a 9b. **Antes de la Tarea 9c, pedirle al usuario que exporte** el SVG y el PDF con lo de §3b. Sin eso no se stagea.

---

## Tarea 1 — Scripts de verificación, en rojo

**Archivos:** sólo el scratchpad. Se copian los scripts que verificaron BE-10 a BE-16 y se les agregan las expectativas de BE-18. Si alguna carpeta de origen ya no existe, el código de cada script está en el plan de su tarea (`Doc/plans/2026-10-18-be-14-…`, `…-be-16-…`, `…-be-13-…` y `2026-10-17-be-10-…`).

- [ ] **Paso 1: copiar**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
OLD_A="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c46f262f-0358-40cb-a6d9-a0418172f7d2/scratchpad"
OLD_10="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c6699336-c851-47d6-8ce5-57d1232610c2/scratchpad"
cd "$OLD_A" && cp lib.js fixtures.js verify-finished-dto.js verify-finished-rules.js verify-finished-controller.js verify-history-rules.js verify-detail-rules.js "$SCRATCH"/
cp "$OLD_10/be10/compare-ddl.js" "$OLD_10/svg_vs_ddl.py" "$SCRATCH"/
ls "$SCRATCH"
```

- [ ] **Paso 2: correrlos tal cual contra el `dist` de HEAD** (confirma que siguen midiendo lo que mide el código de hoy)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "$SCRATCH" && for s in verify-finished-dto verify-finished-rules verify-finished-controller verify-history-rules verify-detail-rules; do echo "== $s"; node $s.js | tail -1; done
```
Esperado: las cinco terminan en `N ok, 0 fallas`. Si alguna falla, el código cambió desde BE-16: **parar y mirar** antes de adaptar nada.

- [ ] **Paso 3: `verify-finished-dto.js`** — agregar los casos de `finished_at`.

Después de `await accepts('ejercicio en mayúscula (iOS)', …);` insertar:

```js
  await accepts('con finished_at', { routine_exercise_id: EX, finished_at: '2026-10-20' }, 'body', Body, { finished_at: '2026-10-20' });
  await accepts('finished_at null (equivale a no mandarlo)', { routine_exercise_id: EX, finished_at: null }, 'body', Body, { finished_at: null });
  await accepts('finished_at en un 29 de febrero bisiesto', { routine_exercise_id: EX, finished_at: '2028-02-29' }, 'body', Body, { finished_at: '2028-02-29' });
```

Después de `await rejects('campo de más (forbidNonWhitelisted)', …);` insertar:

```js
  await rejects('finished_at con hora', { routine_exercise_id: EX, finished_at: '2026-10-20T10:00:00Z' }, 'body', Body, 'YYYY-MM-DD');
  await rejects('finished_at como dd-mm-yyyy', { routine_exercise_id: EX, finished_at: '20-10-2026' }, 'body', Body, 'YYYY-MM-DD');
  await rejects('finished_at que no existe (30 de febrero)', { routine_exercise_id: EX, finished_at: '2026-02-30' }, 'body', Body, 'YYYY-MM-DD');
  await rejects('finished_at que no es texto', { routine_exercise_id: EX, finished_at: 20261020 }, 'body', Body, 'YYYY-MM-DD');
```

- [ ] **Paso 4: `verify-detail-rules.js`** (BE-13) — la forma nueva de `finished[]`.

Reemplazar la función `done`:

```js
const done = (...ids) => ids.map((id, i) => ({
  user_routine_asign_id: ASSIGN_ID, routine_exercise_id: id, user_note: null, finished_at: '2026-10-19',
  created_at: new Date(NOW.getTime() + i * 1000), updated_at: new Date(NOW.getTime() + i * 1000),
}));
```

Y en el caso `'finished: sólo los cuatro campos, con la nota o null'`, cambiar el nombre a `'finished: los cinco campos, con la nota o null'` y la expectativa de claves:

```js
    check('claves del ítem', same(Object.keys(r.res.body.finished[0]), ['routine_exercise_id', 'user_note', 'finished_at', 'created_at', 'updated_at']), Object.keys(r.res.body.finished[0]).join(','));
    check('finished_at es el día de la fila', r.res.body.finished[0].finished_at === '2026-10-19', r.res.body.finished[0].finished_at);
```

- [ ] **Paso 5: `verify-finished-rules.js`** (BE-14) — el día al marcar.

**5a.** Debajo de `const DAY = '2026-10-20';`:

```js
const OTHER_DAY = '2026-10-15';
```

**5b.** En `MSG`, agregar la entrada:

```js
  dayRequired: 'Indicá el día en que hiciste el ejercicio (finished_at).',
```

**5c.** Reemplazar `FINISHED_KEYS`:

```js
const FINISHED_KEYS = ['routine_exercise_id', 'user_note', 'finished_at', 'created_at', 'updated_at'];
```

**5d.** En `world()`, dentro del `map` de `opts.finished`, agregar el día a cada fila (debajo de `user_note: r.note ?? null,`):

```js
      finished_at: r.day ?? DAY,
```

**5e.** Reemplazar el helper `mark`:

```js
async function mark(w, body, user = student(), id = ASSIGN_ID) {
  w.state.ops = [];
  const res = makeRes();
  // finished_at es obligatorio al crear la marca (BE-18): por defecto va el dia de la asignacion,
  // que es el mismo que traen las filas ya marcadas. Para probar su ausencia se pasa la clave
  // explicita con undefined o null
  const full = 'finished_at' in body ? body : { ...body, finished_at: DAY };
  await w.service.markExerciseFinished(id, full, user, res);
  return { res, ops: [...w.state.ops] };
}
```

**5f.** Insertar este bloque justo antes de `console.log('\n-- desmarcar');`:

```js
  console.log('\n-- marcar · el día en que lo hizo (finished_at, BE-18)');

  await run('no estaba marcado y no vino finished_at → 400 sin validar el ejercicio ni escribir', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: undefined });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.dayRequired }), JSON.stringify(r.res.body));
    check('sólo buscó la asignación y la marca', same(r.ops, ['assignment.findOne', 'finished.findOne']), r.ops.join(','));
    check('no se escribió nada', w.state.finished.length === 0);
  });

  await run('finished_at null en el alta cuenta como ausente → 400', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: null });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.dayRequired }), JSON.stringify(r.res.body));
  });

  await run('el alta guarda el día indicado y lo devuelve (marcar en diferido)', async () => {
    const w = world();
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: OTHER_DAY });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('finished_at en la respuesta', r.res.body.finished_at === OTHER_DAY, r.res.body.finished_at);
    check('finished_at en la fila', rowOf(w, 'a').finished_at === OTHER_DAY);
  });

  await run('ya marcado y sin finished_at → 200 sin tocar el día', async () => {
    const w = world({ finished: [{ id: 'a', day: OTHER_DAY }] });
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: undefined });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('el día queda', r.res.body.finished_at === OTHER_DAY && rowOf(w, 'a').finished_at === OTHER_DAY);
    check('no escribió', !r.ops.includes('finished.update'), r.ops.join(','));
  });

  await run('ya marcado con otro día → 200 y lo corrige (updated_at cambia, created_at no)', async () => {
    const w = world({ finished: [{ id: 'a', day: OTHER_DAY }] });
    const before = { ...rowOf(w, 'a') };
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: DAY });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('día nuevo en la respuesta y en la fila', r.res.body.finished_at === DAY && rowOf(w, 'a').finished_at === DAY);
    check('created_at igual', +rowOf(w, 'a').created_at === +before.created_at);
    check('updated_at posterior', +rowOf(w, 'a').updated_at > +before.updated_at);
    check('la nota no se tocó', rowOf(w, 'a').user_note === before.user_note);
  });

  await run('ya marcado con otro día y otra nota → un solo UPDATE con los dos', async () => {
    const w = world({ finished: [{ id: 'a', note: 'vieja', day: OTHER_DAY }] });
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: DAY, user_note: 'nueva' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('un solo UPDATE', r.ops.filter(o => o === 'finished.update').length === 1, r.ops.join(','));
    check('los dos cambios en la fila', rowOf(w, 'a').finished_at === DAY && rowOf(w, 'a').user_note === 'nueva');
  });

  await run('ya marcado con el mismo día → 200 sin escribir', async () => {
    const w = world({ finished: [{ id: 'a', day: DAY }] });
    const before = +rowOf(w, 'a').updated_at;
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: DAY });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('no escribió', !r.ops.includes('finished.update'), r.ops.join(','));
    check('updated_at igual', +rowOf(w, 'a').updated_at === before);
  });

  await run('un ejercicio que el coach sacó DESPUÉS de marcarlo: se puede corregir el día', async () => {
    const w = world({ finished: [{ id: 'd', day: OTHER_DAY }] });
    const r = await mark(w, { routine_exercise_id: 'd', finished_at: DAY });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('el día quedó', rowOf(w, 'd').finished_at === DAY);
  });

  await run('la carrera por el único con otro día: se trata como ya marcado y aplica el día', async () => {
    const w = world({ finished: [{ id: 'a', day: OTHER_DAY }], hideNextLookup: true });
    const r = await mark(w, { routine_exercise_id: 'a', finished_at: DAY });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('el día quedó', rowOf(w, 'a').finished_at === DAY);
    check('sigue habiendo una sola fila', w.state.finished.length === 1);
  });
```

- [ ] **Paso 6: `verify-history-rules.js`** (BE-16) — el día como `finished_at`.

**6a.** Reemplazar las tres constantes `F1`, `F2` y `F3` (el día va como `Date` local, igual que `assignment_date`, porque así lo entrega el driver y TypeORM lo convierte a `'YYYY-MM-DD'`):

```js
const F1 = { id: 'F1', re: 'RE1', ex: { id: 'X1', name: 'Sentadilla' }, note: 'me costó', at: new Date('2026-10-22T10:00:00Z'), day: new Date(2026, 9, 22) };
const F2 = { id: 'F2', re: 'RE2', ex: { id: 'X2', name: 'Press banca' }, note: null, at: new Date('2026-10-22T10:05:00Z'), day: new Date(2026, 9, 22) };
const F3 = { id: 'F3', re: 'RE3', ex: { id: 'X1', name: 'Sentadilla' }, note: null, at: new Date('2026-10-20T09:00:00Z'), day: new Date(2026, 9, 20) };
```

**6b.** En la función `raw`, agregar la columna después de `finished_created_at: finished.at,`:

```js
    finished_finished_at: finished.day,
```

**6c.** En el caso `'la misma rutina en dos días son dos sesiones; dos rutinas el mismo día también'`, reemplazar la línea de `F4`:

```js
    const F4 = { id: 'F4', re: 'RE4', ex: { id: 'X3', name: 'Remo' }, note: null, at: new Date('2026-10-22T18:00:00Z'), day: new Date(2026, 9, 22) };
```

**6d.** En el caso `'sin filtro (E-06)'`, reemplazar el `check` del orden y agregar el de la columna:

```js
    check('selecciona el día en que lo hizo', /"finished"\."finished_at" AS "finished_finished_at"/.test(sql), sql);
    check('orden: día ↓, rutina, alta, día de la marca, marca, id y serie',
      /ORDER BY "assignment_date" DESC, "routine_name" ASC, "assignment_created_at" ASC, "finished_finished_at" ASC, "finished_created_at" ASC, "finished_id" ASC, "exerciseSet_set_order" ASC/.test(sql), sql.slice(sql.indexOf('ORDER BY')));
```

**6e.** En el caso `'agrupa por asignación, …'`, reemplazar el `check` de `finished_at`:

```js
    check('finished_at es el día en que lo hizo (string de día)', e1.finished_at === '2026-10-22' && typeof e1.finished_at === 'string', String(e1.finished_at));
```

**6f.** Agregar un caso antes de `finish();`:

```js
  await run('marcado en diferido: finished_at es el día que indicó, no el de la marca', async () => {
    const F5 = { id: 'F5', re: 'RE5', ex: { id: 'X4', name: 'Dominadas' }, note: null, at: new Date('2026-10-25T09:00:00Z'), day: new Date(2026, 9, 20) };
    const r = await history({ raw: [raw(F5, A2, null)] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('finished_at = 2026-10-20', r.res.body[0].exercises[0].finished_at === '2026-10-20', String(r.res.body[0].exercises[0].finished_at));
  });
```

- [ ] **Paso 7: `verify-finished-controller.js`** (BE-14) — el Swagger nuevo. Dentro del caso `'el documento generado declara éxitos y errores'`, antes de `await app.close();`, agregar:

```js
    check('el body documenta finished_at como opcional', body && 'finished_at' in body.properties && !(body.required || []).includes('finished_at'), JSON.stringify(body && body.properties.finished_at));
    const finishedDto = doc.components.schemas.RoutineAssignedFinishedDto;
    check('la marca devuelve finished_at', finishedDto && 'finished_at' in finishedDto.properties && (finishedDto.required || []).includes('finished_at'), JSON.stringify(finishedDto && finishedDto.required));
```

- [ ] **Paso 8: `compare-ddl.js`** — el alcance de BE-18. Reemplazar las líneas de `SCOPE`:

```js
const SCOPE = new Set(['User_Planification', 'Routine_Exercise_Finished', 'Routine_Asign_Exercise_Finished']);
```
y en el `console.log` final, `'las 6 tablas tocadas'` por `'las 3 tablas tocadas'`.

- [ ] **Paso 9: `patch-static-be18.py`** (nuevo). Controles **estáticos** del patch, sin ejecutar SQL: que todo lo que el `01` cambió entre HEAD y el regenerado esté cubierto por el patch con el mismo texto, y el orden de las guardas.

```python
# py patch-static-be18.py <01 de HEAD> <01 regenerado> <patch>
# Controles ESTATICOS (no ejecuta SQL): cada columna que el 01 agrega, quita o pasa a NOT NULL,
# y cada constraint que agrega o cambia, tiene su sentencia en el patch con el mismo texto.
import re, sys
base, new, patch = (open(p, encoding='utf-8').read().replace('\r', '') for p in sys.argv[1:4])

def strip(s):  # sin comentarios, espacios colapsados
    return re.sub(r'\s+', ' ', re.sub(r'--[^\n]*', '', s)).strip()

fails = 0
def ok(c, m):
    global fails
    print(('OK    ' if c else 'FALLA ') + m); fails += 0 if c else 1

def tables(sql):
    out = {}
    for m in re.finditer(r'CREATE TABLE public\."(\w+)" \((.*?)\n\);', sql, re.S):
        cols, cons = {}, {}
        body = '\n'.join(l.split('--')[0] for l in m.group(2).splitlines())
        parts, depth, cur = [], 0, ''
        for ch in body:
            depth += (ch == '(') - (ch == ')')
            if ch == ',' and depth == 0: parts.append(cur); cur = ''
            else: cur += ch
        parts.append(cur)
        for p in parts:
            s = re.sub(r'\s+', ' ', p).strip()
            if not s: continue
            mc = re.match(r'^CONSTRAINT (\w+) (.*)$', s)
            if mc: cons[mc.group(1)] = mc.group(2); continue
            mm = re.match(r'^("?\w+"?) ([\w."]+(?:\(\d+(?:, ?\d+)?\))?)(.*)$', s)
            if mm: cols[mm.group(1).strip('"')] = (mm.group(2).upper(), 'NOT NULL' in mm.group(3) or 'PRIMARY KEY' in mm.group(3))
        out[m.group(1)] = (cols, cons)
    return out

tb, tn, pt = tables(base), tables(new), strip(patch)
ok(set(tb) == set(tn), f'mismas tablas en los dos 01 ({len(tn)})')

for t in sorted(tn):
    (cb, kb), (cn, kn) = tb[t], tn[t]
    T = f'ALTER TABLE public."{t}"'
    for c in sorted(set(cb) - set(cn)):
        ok(f'{T} DROP COLUMN IF EXISTS {c};' in pt, f'{t}.{c}: el patch la borra')
    for c in sorted(set(cn) - set(cb)):
        ty, nn = cn[c]
        add = re.search(rf'{re.escape(T)} ADD COLUMN IF NOT EXISTS {c} {re.escape(ty)}( NOT NULL)?;', pt)
        ok(bool(add), f'{t}.{c}: el patch la agrega como {ty}')
        if nn:
            ok(bool(add and add.group(1)) or f'{T} ALTER COLUMN {c} SET NOT NULL;' in pt, f'{t}.{c}: queda NOT NULL')
    for c in sorted(set(cb) & set(cn)):
        if cb[c][0] != cn[c][0]: ok(False, f'{t}.{c}: cambia de tipo ({cb[c][0]} -> {cn[c][0]}) y el patch no lo contempla')
        if not cb[c][1] and cn[c][1]:
            ok(f'{T} ALTER COLUMN {c} SET NOT NULL;' in pt, f'{t}.{c}: el patch la pasa a NOT NULL')
    for k in sorted(set(kn)):
        if kb.get(k) == kn[k]: continue
        if k in kb: ok(f'{T} DROP CONSTRAINT IF EXISTS {k};' in pt, f'{t}.{k}: el patch suelta la definicion vieja')
        ok(f'{T} ADD CONSTRAINT {k} {kn[k]};' in pt, f'{t}.{k}: el patch la agrega con el mismo texto que el 01')
    for k in sorted(set(kb) - set(kn)):
        ok(f'{T} DROP CONSTRAINT IF EXISTS {k};' in pt, f'{t}.{k}: el patch la borra')

def idx(sql): return set(re.findall(r'CREATE INDEX \w+ ON [^;]+;', strip(sql)))
ok(idx(base) == idx(new), 'los indices no cambian')

first = min(pt.index(x) for x in ['DROP COLUMN', 'ADD COLUMN', 'ALTER COLUMN', 'DROP CONSTRAINT'] if x in pt)
ok(pt.index('RAISE EXCEPTION') < first, 'las guardas van antes del primer cambio')
ok("column_name = 'number_of_routines'" in pt, 'la guarda de User_Planification mira la forma vieja (number_of_routines)')
ok(re.search(r"NOT EXISTS \(SELECT 1 FROM information_schema\.columns WHERE table_schema = 'public' AND table_name = 'Routine_Exercise_Finished' AND column_name = 'finished_at'\)", pt) is not None,
   'la guarda de Routine_Exercise_Finished mira la forma vieja (sin finished_at)')
raef = 'ALTER TABLE public."Routine_Asign_Exercise_Finished"'
ok(pt.index(f'{raef} ADD COLUMN IF NOT EXISTS finished_at DATE;') < pt.index('UPDATE public."Routine_Asign_Exercise_Finished"') < pt.index(f'{raef} ALTER COLUMN finished_at SET NOT NULL;'),
   'Routine_Asign_Exercise_Finished: columna nullable, UPDATE y recien despues NOT NULL')
ok("AT TIME ZONE 'America/Argentina/Buenos_Aires'" in pt, 'las filas existentes toman el dia en hora de Argentina')
ok(len(re.findall(r'\bDO \$\$', pt)) == len(re.findall(r'END \$\$;', pt)), 'DO/END balanceados')
ok(pt.startswith('BEGIN;') and pt.endswith('COMMIT;'), 'BEGIN al principio y COMMIT al final (la verificacion de abajo es todo comentario)')
print(f'\n{fails} FALLAS' if fails else '\nTODO OK (estatico)'); sys.exit(1 if fails else 0)
```

- [ ] **Paso 10: correr todo en rojo** (el código todavía no cambió)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "$SCRATCH" && for s in verify-finished-dto verify-finished-rules verify-finished-controller verify-history-rules verify-detail-rules; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: **fallas en los cinco**. Las del DTO (`finished_at` rechazado por `forbidNonWhitelisted`, o sin el mensaje `YYYY-MM-DD`), las de reglas (el alta no pide ni guarda el día), las del Swagger, la columna y el orden del historial, y las claves de `finished[]` del detalle. Si alguna nueva da `ok` por casualidad, revisar que la prueba no sea trivial.

---

## Tarea 2 — Entidades (spec §3)

**Archivos:** las tres entidades. Estilo del repo: comentarios sin tildes, `@ApiProperty` en cada columna.

- [ ] **Paso 1: `user_planification.entity.ts`** (reemplazo completo)

```ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';
import { Coach } from './coach.entity';
import { Planification } from './planification.entity';

// Una planificacion asignada a un alumno. La cabecera del plan (nombre, descripcion, tipo,
// duracion) y sus rutinas se leen siempre de la plantilla: aca va solo lo propio de la
// asignacion (D18, 20/10)
@Entity('User_Planification')
export class UserPlanification {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    user_id!: string;

    // El coach que asigno: sale del token, y solo un coach asigna (D20). NOT NULL desde el
    // 20/10 (D19)
    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    coach_id!: string;

    // NOT NULL desde el 20/10 (D19): sin plantilla no hay rutinas ni nombre
    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    planification_id!: string;

    @ApiPropertyOptional({ example: 'Foco en técnica', maxLength: 100 })
    @Column({ length: 100, nullable: true })
    coach_note?: string;

    // Dias sin hora. Las columnas son date y TypeORM las hidrata como 'YYYY-MM-DD' (string), no
    // como Date: se tipan string para que el tipo diga lo que de verdad llega. La semana 1 del
    // plan es la de lunes a domingo que contiene start_date (D16)
    @ApiProperty({ example: '2026-10-22', description: 'Día de inicio (YYYY-MM-DD, sin hora)' })
    @Column({ type: 'date', nullable: false })
    start_date!: string;

    // Guardado desde el 20/10 (D17; antes se calculaba en vivo): en E-13 es opcional y por defecto
    // es el domingo de la semana Planification.duration. Editar la duracion de la plantilla NO lo mueve
    @ApiProperty({ example: '2026-11-15', description: 'Día de fin, inclusive (YYYY-MM-DD, sin hora)' })
    @Column({ type: 'date', nullable: false })
    end_date!: string;

    @ApiProperty({ example: true })
    @Column({ nullable: false, default: true })
    active!: boolean;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    // JOIN RELATIONSHIPS
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    // RESTRICT en las dos (D19): las bajas de coach (A-19) y de plantilla (E-11) son logicas,
    // asi que nunca se dispara. Respalda desde la base que la asignacion tenga coach y plantilla
    @ManyToOne(() => Coach, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'coach_id' })
    coach!: Coach;

    @ManyToOne(() => Planification, planification => planification.userPlanifications, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'planification_id' })
    planification!: Planification;
}
```

- [ ] **Paso 2: `routine_exercise_finished.entity.ts`** — reemplazar el bloque de `user_note` por:

```ts
    // Acepta null explicito: dejar la nota vacia la borra (U-13), y TypeORM ignora las propiedades
    // undefined. El type: 'varchar' es OBLIGATORIO con la union: TS emite design:type = Object para
    // string | null, y sin el tipo declarado TypeORM no sabe que columna crear. La columna no cambia:
    // sigue siendo VARCHAR(100) nullable, igual que en ddl.py. Mismo caso que la gemela individual
    @ApiPropertyOptional({ example: 'Me costó la última serie', maxLength: 100, nullable: true })
    @Column({ type: 'varchar', length: 100, nullable: true })
    user_note?: string | null;

    // El dia en que el alumno hizo el ejercicio (D25, 20/10), sin hora. Lo manda el cliente al
    // marcar (el servidor no calcula "hoy") y se puede corregir: permite marcar en diferido.
    // created_at sigue siendo cuando se registro la marca. TypeORM hidrata date como 'YYYY-MM-DD'
    @ApiProperty({ example: '2026-10-20', description: 'Día en que el alumno hizo el ejercicio (YYYY-MM-DD, sin hora)' })
    @Column({ type: 'date', nullable: false })
    finished_at!: string;
```

- [ ] **Paso 3: `routine_asign_exercise_finished.entity.ts`** — agregar, justo después del bloque de `user_note`:

```ts
    // El dia en que el alumno hizo el ejercicio (D25, 20/10), sin hora. Lo manda el cliente al
    // marcar (el servidor no calcula "hoy") y se puede corregir: permite marcar en diferido.
    // created_at sigue siendo cuando se registro la marca. TypeORM hidrata date como 'YYYY-MM-DD'
    @ApiProperty({ example: '2026-10-20', description: 'Día en que el alumno hizo el ejercicio (YYYY-MM-DD, sin hora)' })
    @Column({ type: 'date', nullable: false })
    finished_at!: string;
```

- [ ] **Paso 4: nadie más usa la entidad** (el build de la Tarea 7 detecta cualquier uso de una columna borrada; acá se confirma que no hay usos escondidos fuera de los andamiajes)

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && grep -rn "UserPlanification" --include=*.ts power-app/src | grep -v "/entities/"
```
Esperado: sólo `planification/planification.controller.ts` (el import y los `type: UserPlanification` de los `@ApiResponse` de los andamiajes, que retira BE-19) y `planification/planification.module.ts` (el `forFeature`). Las referencias a `number_of_routines` que quedan en el código son de `Planification`, la plantilla, que no cambia.

---

## Tarea 3 — `Db Creator/ddl.py` y `01_estructura.sql`

**Archivos:** `Db Creator/ddl.py`. Leer el archivo antes de cada `Edit` y copiar el texto exacto (tiene alineaciones con espacios).

- [ ] **Paso 1: `User_Planification`** (reemplaza el `CREATE TABLE` entero, líneas 216-237 de hoy)

```sql
CREATE TABLE public."User_Planification" (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL,
    coach_id           UUID         NOT NULL,
    planification_id   UUID         NOT NULL,
    -- Sin description, type ni number_of_routines (D18): la cabecera se lee de la plantilla
    coach_note         VARCHAR(100),
    start_date         DATE         NOT NULL,
    -- Guardado (D17): por defecto, el domingo de la semana Planification.duration
    end_date           DATE         NOT NULL,
    active             BOOLEAN      NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_planification_user
        FOREIGN KEY (user_id)          REFERENCES public."User"(id)          ON DELETE CASCADE,
    -- RESTRICT (D19): las bajas de coach y de plantilla son logicas, nunca se dispara
    CONSTRAINT fk_user_planification_coach
        FOREIGN KEY (coach_id)         REFERENCES public."Coach"(id)         ON DELETE RESTRICT,
    CONSTRAINT fk_user_planification_planification
        FOREIGN KEY (planification_id) REFERENCES public."Planification"(id) ON DELETE RESTRICT
);
```

- [ ] **Paso 2: `Routine_Exercise_Finished`** — agregar la columna entre `user_note` y `created_at`:

```sql
    user_note             VARCHAR(100),
    -- El dia en que el alumno hizo el ejercicio (D25): lo manda el cliente, permite marcar en diferido
    finished_at           DATE        NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

- [ ] **Paso 3: `Routine_Asign_Exercise_Finished`** — lo mismo:

```sql
    user_note             VARCHAR(100),
    -- El dia en que el alumno hizo el ejercicio (D25): lo manda el cliente, permite marcar en diferido
    finished_at           DATE        NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

- [ ] **Paso 4: regenerar dos veces; determinismo; `02`/`03` sin cambios; sin rastros de lo borrado**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator"
py build_sql.py > /dev/null && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql > "$SCRATCH/run1.txt"
py build_sql.py > /dev/null && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql > "$SCRATCH/run2.txt"
diff "$SCRATCH/run1.txt" "$SCRATCH/run2.txt" && echo "DOS CORRIDAS IDENTICAS"
diff <(grep -v 01_ "$SCRATCH/run2.txt") <(grep -v 01_ "$SCRATCH/baseline-hashes.txt") && echo "02 Y 03 SIN CAMBIOS"
awk '/CREATE TABLE public."User_Planification"/,/^\);/' 01_estructura.sql | grep -c "SET NULL\|D12\|number_of_routines"
grep -c "finished_at" 01_estructura.sql
```
Esperado: `DOS CORRIDAS IDENTICAS`, `02 Y 03 SIN CAMBIOS`, `0` en el primer conteo (en el bloque de `User_Planification` no queda ni un `SET NULL`, ni el comentario de D12, ni `number_of_routines`) y `2` en el de `finished_at`.

---

## Tarea 4 — El patch `Db Creator/patches/2026-10-21-be-18.sql`

Convenciones de los patches anteriores: `BEGIN`/`COMMIT`, cabecera con "QUE HACE", guardas que miran la forma vieja y la verificación comentada al final.

- [ ] **Paso 1: crear el archivo**

```sql
-- =============================================================
--  Patch 2026-10-21 - BE-18 (modelo del bloque B: asignar planificaciones)
--
--  Lleva una base YA CREADA al esquema nuevo, sin recrearla desde cero.
--  Equivale a los cambios que ddl.py metio en 01_estructura.sql.
--  Spec: Doc/specs/2026-10-20-asignar-planificaciones-design.md (repo PowerApp-Docs), §3.
--
--  QUE HACE
--    1. User_Planification: borra description, type y number_of_routines (D18); suma end_date
--       DATE NOT NULL (D17); coach_id y planification_id pasan a NOT NULL, y sus FK a
--       ON DELETE RESTRICT (D19).
--    2. Routine_Exercise_Finished: suma finished_at DATE NOT NULL (D25).
--    3. Routine_Asign_Exercise_Finished: suma finished_at DATE NOT NULL (D25). Las filas que ya
--       existan (pruebas de BE-14) toman el dia de su created_at en hora de Argentina.
--
--  ABORTA, sin tocar nada, si:
--    - User_Planification tiene filas y todavia tiene la forma vieja (con number_of_routines).
--      Ningun endpoint la escribe antes de BE-18b: si tiene filas, alguien la lleno a mano.
--    - Routine_Exercise_Finished tiene filas y todavia no tiene finished_at. Idem (BE-20c).
--
--  Es idempotente: las guardas solo miran la forma vieja (despues del patch, E-13 y el marcar
--  del plan llenan esas tablas, y re-correrlo no debe abortar).
--  Correrlo con:  psql -v ON_ERROR_STOP=1 -f 2026-10-21-be-18.sql
--  Alternativa equivalente: recrear la base con 01 -> 02 -> 03.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 0. Guardas: abortan antes de cambiar nada
-- -------------------------------------------------------------
DO $$
DECLARE
    n bigint;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'User_Planification'
                  AND column_name = 'number_of_routines') THEN
        EXECUTE 'SELECT COUNT(*) FROM public."User_Planification"' INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION 'Patch BE-18 abortado: User_Planification tiene % fila(s) con el esquema viejo. Ningun endpoint la escribe todavia; revisar a mano antes de borrar columnas.', n;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'Routine_Exercise_Finished'
                      AND column_name = 'finished_at') THEN
        EXECUTE 'SELECT COUNT(*) FROM public."Routine_Exercise_Finished"' INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION 'Patch BE-18 abortado: Routine_Exercise_Finished tiene % fila(s) sin finished_at. Ningun endpoint la escribe todavia; revisar a mano.', n;
        END IF;
    END IF;
END $$;

-- -------------------------------------------------------------
-- 1. User_Planification: lo propio de la asignacion, con fin guardado
-- -------------------------------------------------------------
ALTER TABLE public."User_Planification" DROP COLUMN IF EXISTS description;
ALTER TABLE public."User_Planification" DROP COLUMN IF EXISTS type;
ALTER TABLE public."User_Planification" DROP COLUMN IF EXISTS number_of_routines;
-- La primera vez la tabla esta vacia (la guarda lo asegura), asi que NOT NULL sin default entra;
-- en una re-corrida la columna ya existe y no se toca
ALTER TABLE public."User_Planification" ADD COLUMN IF NOT EXISTS end_date DATE NOT NULL;
ALTER TABLE public."User_Planification" ALTER COLUMN coach_id SET NOT NULL;
ALTER TABLE public."User_Planification" ALTER COLUMN planification_id SET NOT NULL;

-- Las FK se recrean con RESTRICT: SET NULL es incompatible con NOT NULL
ALTER TABLE public."User_Planification" DROP CONSTRAINT IF EXISTS fk_user_planification_coach;
ALTER TABLE public."User_Planification" ADD CONSTRAINT fk_user_planification_coach FOREIGN KEY (coach_id) REFERENCES public."Coach"(id) ON DELETE RESTRICT;
ALTER TABLE public."User_Planification" DROP CONSTRAINT IF EXISTS fk_user_planification_planification;
ALTER TABLE public."User_Planification" ADD CONSTRAINT fk_user_planification_planification FOREIGN KEY (planification_id) REFERENCES public."Planification"(id) ON DELETE RESTRICT;

-- -------------------------------------------------------------
-- 2. Routine_Exercise_Finished: el dia en que se hizo
-- -------------------------------------------------------------
-- Vacia la primera vez (la guarda lo asegura)
ALTER TABLE public."Routine_Exercise_Finished" ADD COLUMN IF NOT EXISTS finished_at DATE NOT NULL;

-- -------------------------------------------------------------
-- 3. Routine_Asign_Exercise_Finished: el dia en que se hizo
-- -------------------------------------------------------------
-- Puede tener filas de las pruebas de BE-14: la columna entra nullable, se completa con el dia
-- de la marca en hora de Argentina (la mejor aproximacion del dia en que se hizo) y recien
-- despues pasa a NOT NULL
ALTER TABLE public."Routine_Asign_Exercise_Finished" ADD COLUMN IF NOT EXISTS finished_at DATE;
UPDATE public."Routine_Asign_Exercise_Finished"
   SET finished_at = (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
 WHERE finished_at IS NULL;
ALTER TABLE public."Routine_Asign_Exercise_Finished" ALTER COLUMN finished_at SET NOT NULL;

COMMIT;

-- =============================================================
--  VERIFICACION (correr despues, deberia devolver 6 filas con 'ok')
-- =============================================================
-- SELECT 'User_Planification sin description, type ni number_of_routines' AS chequeo,
--        CASE WHEN (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='User_Planification'
--                      AND column_name IN ('description','type','number_of_routines')) = 0 THEN 'ok' ELSE 'MAL' END AS resultado
-- UNION ALL
-- SELECT 'User_Planification.end_date es date NOT NULL',
--        CASE WHEN (SELECT data_type || '/' || is_nullable FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='User_Planification'
--                      AND column_name='end_date') = 'date/NO' THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'User_Planification.coach_id y planification_id NOT NULL',
--        CASE WHEN (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='User_Planification'
--                      AND column_name IN ('coach_id','planification_id') AND is_nullable='NO') = 2 THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'User_Planification: 3 FK, 2 de ellas RESTRICT (coach y plantilla)',
--        CASE WHEN (SELECT COUNT(*) FROM pg_constraint WHERE conrelid='public."User_Planification"'::regclass AND contype='f') = 3
--              AND (SELECT COUNT(*) FROM pg_constraint WHERE conrelid='public."User_Planification"'::regclass AND contype='f' AND confdeltype='r') = 2
--             THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'Routine_Exercise_Finished.finished_at es date NOT NULL',
--        CASE WHEN (SELECT data_type || '/' || is_nullable FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Routine_Exercise_Finished'
--                      AND column_name='finished_at') = 'date/NO' THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'Routine_Asign_Exercise_Finished.finished_at es date NOT NULL',
--        CASE WHEN (SELECT data_type || '/' || is_nullable FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Routine_Asign_Exercise_Finished'
--                      AND column_name='finished_at') = 'date/NO' THEN 'ok' ELSE 'MAL' END;
```

---

## Tarea 5 — DTOs (spec §5.7 y §5.9)

**Archivos:** `power-app/src/dtos/routine/`.

- [ ] **Paso 1: `mark_exercise_finished.dto.ts`** (reemplazo completo). Lo va a reutilizar el marcar del plan (BE-20c).

```ts
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCalendarDay } from './is_calendar_day.decorator';

export class MarkExerciseFinishedDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id del Routine_Exercise que el alumno hizo (en el árbol del detalle es el campo id de cada ejercicio). El hecho es por ejercicio, no por serie: el tildado serie por serie es de la interfaz' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de ejercicio debe ser un UUID válido' })
    routine_exercise_id!: string;

    @ApiPropertyOptional({ example: '2026-10-20', description: 'Día en que el alumno hizo el ejercicio, en formato YYYY-MM-DD (sin hora). Obligatorio al marcar un ejercicio que todavía no estaba marcado (400 si falta). En uno ya marcado, si viene y cambia, lo corrige; si se omite, no se toca. Permite marcar en diferido. No se valida contra ninguna fecha: el servidor no calcula "hoy"' })
    @IsOptional()
    @IsCalendarDay()
    finished_at?: string;

    @ApiPropertyOptional({ example: 'Me costó la última serie', maxLength: 100, description: 'Nota del alumno sobre el ejercicio. Si se omite, no se toca la nota (en un ejercicio nuevo queda sin nota). La cadena vacía la borra' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    user_note?: string;
}
```

- [ ] **Paso 2: `routine_assigned_detail_response.dto.ts`** — en `RoutineAssignedFinishedDto`, reemplazar el bloque de `created_at` por:

```ts
    @ApiProperty({ example: '2026-10-20', description: 'Día en que el alumno hizo el ejercicio (YYYY-MM-DD, sin hora). Lo indica al marcar y lo puede corregir' })
    finished_at!: string;

    @ApiProperty({ description: 'Cuándo se registró la marca' })
    created_at!: Date;
```

- [ ] **Paso 3: `routine_history_response.dto.ts`** — en `RoutineHistoryExerciseDto`, reemplazar el bloque de `finished_at`:

```ts
    @ApiProperty({ example: '2026-10-20', description: 'Día en que el alumno hizo el ejercicio (YYYY-MM-DD, sin hora): el que indicó al marcar, no el momento en que marcó. Desde el 21/10 (BE-18); antes era el instante de la marca' })
    finished_at!: string;
```

Y en `RoutineHistorySessionDto`, la descripción de `exercises`:

```ts
    @ApiProperty({ type: [RoutineHistoryExerciseDto], description: 'Los ejercicios que el alumno hizo en la sesión, por el día en que los hizo y, dentro del mismo día, en el orden en que los marcó. Incluye los que el coach dio de baja después' })
    exercises!: RoutineHistoryExerciseDto[];
```

---

## Tarea 6 — Service y controller (spec §5.7 y §5.9)

**Archivos:** `power-app/src/routine/routine.service.ts`, `power-app/src/routine/routine.controller.ts`.

- [ ] **Paso 1: la constante del 400.** Debajo de `const OTHER_STUDENT_ASSIGNMENT_ERROR = …;` (línea 37 de hoy):

```ts

// El 400 de marcar un ejercicio que no estaba marcado sin decir que dia se hizo (D25). Lo van a
// compartir las dos vias: la del plan llega en BE-20c
const FINISHED_DAY_REQUIRED_ERROR = 'Indicá el día en que hiciste el ejercicio (finished_at).';
```

- [ ] **Paso 2: `markExerciseFinished`** (reemplaza el método entero, con su comentario de encabezado)

```ts
    // CU-U-12, con U-13 incluido (D3): marcar un ejercicio como hecho y, en la misma fila, dejar o
    // editar la nota y el dia en que se hizo (finished_at, D25). El hecho es por ejercicio, no por
    // serie: el tildado serie por serie es de la interfaz. Es una sola escritura (INSERT o UPDATE),
    // asi que no hay transaccion: la carrera de dos marcas simultaneas la cierra el unico de la
    // base. Sin ventana de fechas (D5): finished_at no se valida contra ningun dia
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

            // Lo mismo con el dia: obligatorio para crear la marca, y opcional para corregirla
            // (null o ausente = no tocarlo). El DTO ya garantizo que es un dia valido
            const sentDay = typeof markExerciseFinishedDto.finished_at === 'string'
                ? markExerciseFinishedDto.finished_at
                : undefined;

            let finished = await this.findFinishedRow(assignment.id, markExerciseFinishedDto.routine_exercise_id);

            if (!finished) {
                // Antes que la pertenencia: sin el dia no hay nada que crear (spec del bloque B, §5.7)
                if (sentDay === undefined) {
                    return res.status(400).send({ error: FINISHED_DAY_REQUIRED_ERROR });
                }

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
                            finished_at: sentDay,
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

            // Ya estaba marcado: idempotente. Se escribe solo lo que vino y cambio (la nota y el
            // dia), en un solo UPDATE. updated_at se setea a mano: el onUpdate de las entidades es
            // sintaxis de MySQL y en Postgres no hace nada
            const changes: { user_note?: string | null; finished_at?: string } = {};

            if (sentNote !== undefined && sentNote !== (finished.user_note ?? null)) {
                changes.user_note = sentNote;
            }

            if (sentDay !== undefined && sentDay !== finished.finished_at) {
                changes.finished_at = sentDay;
            }

            if (Object.keys(changes).length > 0) {
                const updatedAt = new Date();

                await this.routineAsignExerciseFinishedRepository.update(
                    { id: finished.id },
                    { ...changes, updated_at: updatedAt },
                );

                Object.assign(finished, changes, { updated_at: updatedAt });
            }

            return res.status(200).send(this.buildFinishedResponse(finished));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al marcar el ejercicio.' });
        }
    }
```

- [ ] **Paso 3: `buildFinishedResponse`** (reemplaza el método y su comentario)

```ts
    // Lo que el cliente cruza con el arbol de la rutina por routine_exercise_id. La misma forma en
    // el detalle (finished) y en la respuesta de marcar. finished_at es el dia en que lo hizo y
    // created_at, cuando se registro la marca
    private buildFinishedResponse(row: RoutineAsignExerciseFinished) {
        return {
            routine_exercise_id: row.routine_exercise_id,
            user_note: row.user_note ?? null,
            finished_at: row.finished_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
```

- [ ] **Paso 4: `getTrainingHistory`** — tres cambios.

**4a.** El `select` de la fila de hecho (primera línea de `historyQuery`):

```ts
                .select(['finished.id', 'finished.routine_exercise_id', 'finished.user_note', 'finished.finished_at', 'finished.created_at'])
```

**4b.** El orden: reemplazar `.addOrderBy('finished.created_at', 'ASC')` por:

```ts
                .addOrderBy('finished.finished_at', 'ASC')
                .addOrderBy('finished.created_at', 'ASC')
```

y en el comentario de arriba de la consulta, `Orden de la spec: dia descendente y nombre de rutina; el resto desempata` sigue igual. En el comentario de la agrupación, reemplazar `Los ejercicios de cada sesion quedan en el orden en que el alumno los marco` por:

```ts
            // Las filas ya vienen en el orden final: se agrupa por asignacion respetandolo. Los
            // ejercicios de cada sesion quedan por el dia en que el alumno los hizo y, dentro del
            // mismo dia, en el orden en que los marco
```

**4c.** En el `push` de cada ejercicio, `finished_at: finished.created_at,` pasa a:

```ts
                    // El dia en que lo hizo (D25), no el momento en que lo marco
                    finished_at: finished.finished_at,
```

- [ ] **Paso 5: `routine.controller.ts`** — en `markExerciseFinished`, reemplazar los `@ApiResponse` del `200` y del `400`:

```ts
    @ApiResponse({ status: 200, type: RoutineAssignedFinishedDto, description: 'Ya estaba marcado (también si dos marcas chocaron): idempotente. Si vinieron user_note o finished_at y cambiaron, se actualizaron; la cadena vacía borra la nota' })
    @ApiResponse({ status: 400, description: 'Datos inválidos, falta finished_at al marcar un ejercicio que no estaba marcado, el ejercicio no pertenece a la rutina de la asignación, o el coach lo sacó de la rutina y todavía no estaba marcado' })
```

---

## Tarea 7 — Compilar

- [ ] **Paso 1:** `cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build`. Esperado: sin errores. Si falla por `start_date` (ahora `string`) o por `user_note` (ahora `string | null`), corregir ahí, sin parches.
- [ ] **Paso 2:** `git -C "D:/Power App/Backend/PowerApp-Backend" grep -n "D12\|DB3" -- power-app/src "Db Creator/ddl.py"`. Esperado: sin resultados. Hoy hay tres (`ddl.py:225` y `user_planification.entity.ts:29` y `:42`); los tres se van con los reemplazos de las Tareas 2 y 3.

---

## Tarea 8 — Verificar las reglas (spec §5.7, §5.9 y §10)

- [ ] **Paso 1: los cinco scripts, ahora en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "$SCRATCH" && for s in verify-finished-dto verify-finished-rules verify-finished-controller verify-history-rules verify-detail-rules; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: cada uno termina en `N ok, 0 fallas` y no aparece ninguna línea `FALLA`. Si el falso no soporta algo que el service llama, **ampliar el falso, no el service**. Cuando una regex del SQL falle por comillas o alias, leer el SQL impreso primero y ajustar el script, no el código.

- [ ] **Paso 2: el `INSERT` de la marca lleva `finished_at`** (sin base: el `DataSource` real sin conectarse, como en BE-14)

```bash
cd "D:/Power App/Backend/PowerApp-Backend/power-app" && node -e "
require('reflect-metadata');
const fs=require('fs'),path=require('path');const {DataSource,getMetadataArgsStorage}=require('typeorm');
(async()=>{
  const dir='dist/entities';for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.js')))require(path.resolve(dir,f));
  const ds=new DataSource({type:'postgres',entities:getMetadataArgsStorage().tables.map(t=>t.target).filter(t=>typeof t==='function')});
  await ds.buildMetadatas();
  const {RoutineAsignExerciseFinished}=require(path.resolve('dist/entities/routine_asign_exercise_finished.entity'));
  const qb=ds.createQueryBuilder().insert().into(RoutineAsignExerciseFinished).values({user_routine_asign_id:'A',routine_exercise_id:'E',finished_at:'2026-10-20',user_note:null});
  const [sql,params]=qb.getQueryAndParameters();console.log(sql);console.log(JSON.stringify(params));
  const ok=sql.includes('\"finished_at\"')&&params.includes('2026-10-20');console.log(ok?'INSERT OK':'INSERT MAL');process.exit(ok?0:1);
})();"
```
Esperado: el SQL nombra `"finished_at"`, los parámetros traen `"2026-10-20"` y la última línea es `INSERT OK`.

---

## Tarea 9 — Verificar el esquema

### 9a. `01` regenerado contra las entidades

- [ ] **Paso 1: línea de base** (HEAD contra HEAD, todo el modelo, para separar las diferencias previas):

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "$SCRATCH" && node compare-ddl.js "$SCRATCH/baseline-dist" "$SCRATCH/baseline-01.sql" --all | tee baseline-diffs.txt
```
Esperado: la lista de diferencias preexistentes (en BE-10 fue la de `Coach.cuil`, único en el DDL y no en la entidad). No se corrigen acá.

- [ ] **Paso 2: después del cambio**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "$SCRATCH"
node compare-ddl.js "D:/Power App/Backend/PowerApp-Backend/power-app/dist" "D:/Power App/Backend/PowerApp-Backend/Db Creator/01_estructura.sql"
node compare-ddl.js "D:/Power App/Backend/PowerApp-Backend/power-app/dist" "D:/Power App/Backend/PowerApp-Backend/Db Creator/01_estructura.sql" --all > after-diffs.txt; diff <(grep -v "^(tablas" baseline-diffs.txt) <(grep -v "^(tablas" after-diffs.txt) && echo "MISMAS DIFERENCIAS PREVIAS"
```
Esperado: la primera, `SIN DIFERENCIAS` en las tres tablas (columnas, tipos, nulabilidad, únicos y reglas de borrado de las FK); la segunda, `MISMAS DIFERENCIAS PREVIAS`.

### 9b. El patch, por control estático

- [ ] **Paso 3:**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && py "$SCRATCH/patch-static-be18.py" "$SCRATCH/baseline-01.sql" 01_estructura.sql patches/2026-10-21-be-18.sql
```
Esperado: todas las líneas `OK` y `TODO OK (estatico)`. Tiene que listar las tres columnas borradas de `User_Planification`, las tres `finished_at`/`end_date` agregadas, los dos NOT NULL y las dos FK recreadas. Cualquier `FALLA` se corrige en el patch (o en `ddl.py`, si es del `01`).

### 9c. El `01` regenerado contra el diagrama exportado

> **Bloqueo:** si en la Tarea 0 el diagrama seguía siendo el del 17/10, **pedirle ahora al usuario** que lo exporte con lo de §3b, y volver a correr el paso 4 de la Tarea 0.

- [ ] **Paso 4:**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
cd "D:/Power App/Backend/PowerApp-Backend"
py "$SCRATCH/svg_vs_ddl.py" "$SCRATCH/baseline-01.sql"      # contra HEAD: 6 DIFF + 3 PREVIA
py "$SCRATCH/svg_vs_ddl.py" "Db Creator/01_estructura.sql"   # contra el regenerado: sólo las 3 PREVIA
```
Esperado: la primera termina en `diferencias nuevas: 6` (las de §3b: confirma que el diagrama exportado tiene los cambios); la segunda, en `diferencias nuevas: 0`. Si el diagrama dice `Datetime` en algún `finished_at`, o le falta `finished_at` a `Routine_Asign_Exercise_Finished`, aparece como `DIFF`: **se corrige el dibujo, no el `01`** (lo acordado es `DATE` en las dos), y se vuelve a exportar.

---

## Tarea 10 — Specs de CU (repo PowerApp-Docs)

**Archivos:** `Use Cases/usuario/CU-U-12-marcar-serie-como-realizado.md`, `CU-U-13-dejar-una-nota-en-el-ejercicio.md`, `Use Cases/entrenador/CU-E-06-…`, `CU-E-07-…`. Leer cada uno antes de editar.

- [ ] **Paso 1: CU-U-12**
  - En la descripción breve, después de "La existencia del registro es el «hecho».", agregar: `Junto con el ejercicio se registra el día en que el usuario lo hizo, que él mismo indica: puede marcar en diferido.`
  - En "Cubre", agregar el ítem `- Indicar el día en que se realizó el ejercicio, y corregirlo.`
  - Postcondición: `- El ejercicio queda registrado como realizado en esa asignación, con el día en que se hizo y su nota si la hay (o se elimina el registro si se desmarca).`
  - Paso 1 del camino principal: `1. Durante la ejecución, el usuario termina un ejercicio y lo marca como realizado, indicando el día en que lo hizo (la aplicación propone el día actual).`
  - Paso 3: `3. El sistema registra el ejercicio como realizado en esa asignación, con el día indicado.`
  - Caminos alternativos nuevos, después de "En el paso 1 — Marcar fuera de fecha":

```markdown
### En el paso 1 — Marcar en diferido

1. El usuario marca un ejercicio que hizo otro día e indica ese día.
2. El sistema registra el día indicado, no el del momento en que marca.

### En el paso 1 — Corregir el día

1. El usuario vuelve a marcar un ejercicio ya realizado indicando otro día.
2. El sistema corrige el día en el mismo registro, sin duplicarlo.
```

  - Y después de "En el paso 2 — La asignación no existe":

```markdown
### En el paso 2 — Sin el día

1. El usuario marca un ejercicio que todavía no estaba realizado sin indicar el día.
2. El sistema informa el error y no registra nada.
```

- [ ] **Paso 2: CU-U-13** — en "En el paso 1 — Ejercicio todavía sin marcar", el punto 2 pasa a: `2. El sistema marca el ejercicio con el día indicado y guarda la nota en la misma operación.`

- [ ] **Paso 3: CU-E-06**
  - Descripción breve: reemplazar `con los ejercicios que hizo, la prescripción del entrenador, la fecha y la nota que el alumno dejó` por `con los ejercicios que hizo y el día en que hizo cada uno, la prescripción del entrenador, la fecha de la sesión y la nota que el alumno dejó`.
  - Paso 2: `2. El sistema recupera las sesiones del alumno con al menos un ejercicio realizado y, de cada una, los ejercicios realizados con el día en que los hizo, su prescripción y la nota del alumno.`
  - Paso 3: `3. El sistema presenta el historial ordenado de la sesión más reciente a la más antigua y, dentro de cada sesión, los ejercicios por el día en que se hicieron.`

- [ ] **Paso 4: CU-E-07**
  - Paso 3: `3. El sistema presenta el historial filtrado, de la sesión más reciente a la más antigua, con el día en que hizo el ejercicio, la prescripción (series, repeticiones, peso) y la nota del alumno.`
  - En "El ejercicio aparece más de una vez en una sesión", el punto 2 pasa a: `2. El sistema los muestra todos dentro de esa sesión, por el día en que los hizo y, dentro del mismo día, en el orden en que los marcó.`

La vía del plan de U-12 y U-13 (asignación quitada, `finished_at` en el plan) la reescribe BE-20c; las sesiones del plan de E-06 y E-07, BE-20d.

---

## Tarea 11 — Status (informe y dashboard)

**Archivos:** `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html`. **Los cambios fechados anteriores no se tocan** (son historia: la nota del 17/10 sobre D12 y DB3 queda como estaba, y la corrige la entrada nueva).

- [ ] **Paso 1: entrada nueva arriba de "Cambios recientes"**: `## Cambios recientes (2026-10-21 · bloque B: la spec y el modelo, con el día de cada marca)`, **con el porqué de cada cambio**. Puntos obligatorios:
  - **BE-17 (20/10):** la spec del bloque B (link a `Doc/specs/2026-10-20-asignar-planificaciones-design.md`), las decisiones D15 a D30 en una línea cada una de las que cambian algo ya implementado (D17, D18, D19, D25) y el reparto en siete tareas (BE-18, BE-18b, BE-19, BE-20, BE-20b, BE-20c, BE-20d), con los conteos al cierre del bloque (68 ✅ · 6 🟡 · 0 🔵).
  - **BE-18 — `end_date` vuelve (D17, revierte D12):** por qué (el solapamiento sobre una fecha fija; editar la plantilla ya no mueve el fin de nadie; no existe plan sin fin, y la duración 0 pasa a significar "el fin lo fija cada asignación").
  - **`description`, `type` y `number_of_routines` salen de `User_Planification` (D18, revierte DB3):** la cabecera se lee en vivo de la plantilla; copiarla mezclaba una foto con datos en vivo.
  - **`coach_id` y `planification_id` NOT NULL con `RESTRICT` (D19)**, y por qué el `RESTRICT` no se dispara nunca (bajas lógicas).
  - **`finished_at` en las dos tablas de ejecución (D25):** el día en que el alumno hizo el ejercicio, lo manda el cliente, permite marcar en diferido; va en las dos vías para que el campo del historial tenga un solo significado.
  - **La vía individual cambia de contrato:** marcar pide `finished_at` al crear la marca (`400` si falta), se puede corregir, y vuelve en la respuesta y en `finished[]`; en el historial, `finished_at` pasa a ser un día y ordena los ejercicios de la sesión. **Para el web y el iOS:** B3 y B6 cambian; avisar antes del deploy.
  - **El patch** `Db Creator/patches/2026-10-21-be-18.sql`: guardas por forma vieja (y por qué), las filas de prueba de `Routine_Asign_Exercise_Finished` con el día de `created_at` en hora de Argentina, las FK recreadas. **No se ejecutó**: lo corre el usuario, con su verificación de 6 filas.
  - **`start_date` tipado `string`** (hallazgo 5 del plan).
  - **Verificación:** build; `Db Creator` byte-idéntico en dos corridas y `02`/`03` sin cambios; `01` contra entidades sin diferencias; el patch por control estático; el `01` contra el diagrama exportado (con su hash); los scripts de DTO, reglas, Swagger, historial y detalle. **Qué no se verificó:** el patch contra un Postgres, el runtime (BE-35).
  - **Sin cambios de estado en ningún CU.** Specs reescritas: U-12, U-13, E-06 y E-07. **Sigue BE-18b** (E-13).

- [ ] **Paso 2: secciones vivas del informe**
  - Encabezado: `**Corte:** 2026-10-21`.
  - Fila de **CU-U-12**: agregar `· el alumno indica el día en que lo hizo (finished_at, obligatorio al marcar y corregible) (21/10)`.
  - Fila de **CU-U-13**: agregar `· en la misma operación puede ir el día en que lo hizo (21/10)`.
  - Filas de **CU-E-06** y **CU-E-07**: agregar `· cada ejercicio trae el día en que se hizo (finished_at) (21/10)`.
  - Fila de **CU-E-13**: `· BE-18` pasa a `· BE-18b (BE-18 dejó el modelo, 21/10)`.
  - "Plan de trabajo", fila de la fase 3: en la columna de estado, `en curso: BE-17 y BE-18 hechas (20 y 21/10)`.

- [ ] **Paso 3: dashboard** (las mismas notas)
  - `Corte: <b>2026-10-21</b>` y el pie (`corte 2026-10-21`).
  - Filas de CU-U-12, CU-U-13, CU-E-06 y CU-E-07: la misma nota corta dentro del `<span class="muted">`.
  - Fila de la fase 3 en "Plan de trabajo": `<span class="chip partial"><span class="cd"></span>En curso</span>` en la última celda.
  - Conteos y porcentajes **sin cambios**.

---

## Tarea 12 — Stage y mensajes de commit

- [ ] **Paso 1: backend**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/entities/user_planification.entity.ts power-app/src/entities/routine_exercise_finished.entity.ts power-app/src/entities/routine_asign_exercise_finished.entity.ts power-app/src/dtos/routine/mark_exercise_finished.dto.ts power-app/src/dtos/routine/routine_assigned_detail_response.dto.ts power-app/src/dtos/routine/routine_history_response.dto.ts power-app/src/routine/routine.service.ts power-app/src/routine/routine.controller.ts "Db Creator/ddl.py" "Db Creator/01_estructura.sql" "Db Creator/patches/2026-10-21-be-18.sql" Status/estado-implementacion-backend.md Status/dashboard-estado-backend.html && git status --short && git diff --cached --stat
```
Esperado: sólo esos archivos en el stage y nada fuera de él.

- [ ] **Paso 2: docs**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && git add "Doc/plans/2026-10-21-be-18-modelo-del-bloque-b-plan.md" "Use Cases/usuario/CU-U-12-marcar-serie-como-realizado.md" "Use Cases/usuario/CU-U-13-dejar-una-nota-en-el-ejercicio.md" "Use Cases/entrenador/CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md" "Use Cases/entrenador/CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md" && git status --short
```
Esperado: además de esos, la spec del bloque B que ya estaba stageada desde el 20/10, y el diagrama exportado si el usuario lo dejó en `Doc/` (ese lo stagea él o se pregunta).

- [ ] **Paso 3: proponer un mensaje por repo, sin commitear ni pushear.** Backend, por ejemplo: `BE-18: modelo del bloque B (User_Planification con end_date guardado, sin la cabecera copiada y con coach y plantilla obligatorios) y el dia en que se hizo cada ejercicio (finished_at) en las dos vias; la via individual lo pide al marcar y el historial lo muestra`. Docs: `Spec del bloque B (BE-17), plan de BE-18 y specs de U-12, U-13, E-06 y E-07 con el dia en que se hizo cada ejercicio`.

---

## Tarea 13 — Memoria del proyecto

- [ ] **Paso 1:** actualizar `project_cu_status.md` (BE-18 hecha y stageada, sigue BE-18b) y el bullet del bloque B de `project_data_model_reconciliation.md` (el esquema ya está en entidades y `Db Creator`; si el patch se corrió o no). El índice `MEMORY.md`, en una línea.

---

## 4. Qué NO verifica este plan

- **El patch contra un Postgres de verdad** (sin PGlite): sólo el control estático de la Tarea 9b. La primera ejecución es la del usuario, con la consulta de verificación del propio patch.
- **El `01` aplicado desde cero**: recién en BE-23.
- **El runtime** de marcar e historial con `finished_at`: BE-35.
- **Que el web y el iOS manden `finished_at`**: es un cambio de contrato que se avisa, no se prueba acá.

## 5. Autoevaluación contra la spec

- **§3:** las tres tablas (Tareas 2 a 4), el `user_note` de `RoutineExerciseFinished` (Tarea 2, paso 2) y los comentarios de D12 (Tareas 2, 3 y 7).
- **§5.7 (vía individual):** obligatorio al crear y corregible (Tarea 6, paso 2), en la respuesta y en `finished[]` (paso 3), el `400` con su texto (paso 1) y el Swagger (paso 5 y Tarea 5).
- **§5.9:** `finished_at` como día y el orden nuevo (Tarea 6, paso 4); las sesiones del plan son de BE-20d.
- **§7:** U-12, U-13, E-06 y E-07 en su parte de BE-18 (Tarea 10).
- **§10:** build (7), `Db Creator` (3), `01` contra entidades y diagrama (9a, 9c), reglas y SQL (8).
- **§12:** el diagrama exportado como bloqueo (Tarea 0, paso 4; Tarea 9c) y el cambio de contrato avisado (Tarea 11).

## 6. Después de esto

**BE-18b** (E-13): su propio plan, con la cuenta de semanas de §4 de la spec, el solapamiento y el `403` del coach sin fila en `Coach`. Va antes de regenerar la base (BE-23, ~1/11).
