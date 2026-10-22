# BE-20e — El home del alumno en un solo pedido (CU-U-08) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` y se propone el mensaje (Tarea 10).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escriben **antes** del código y se corren en rojo.
> 3. **No se levanta el server**, ni siquiera en segundo plano, y **no se instala nada**. El SQL se verifica como texto, con el `DataSource` sin conexión.

**Spec que manda:** [`2026-10-21-home-del-alumno-design.md`](../specs/2026-10-21-home-del-alumno-design.md) (D31 a D36, §3 contrato, §4 respuesta, §5 implementación, §6 CU, §8 verificación, §9 impacto). Para las reglas del plan que se reutilizan: [§4, §5.4 y §5.5 del bloque B](../specs/2026-10-20-asignar-planificaciones-design.md).
**Parte de:** BE-20 (`7ea9031` en el backend), que dejó `GET /routine/assigned-plan/:userId`, `findActiveExercisesByRoutine`, `buildProgress`, `planWeekOf` y `planWeekBounds`.
**Modelo:** sin cambios. **No cambia ninguna entidad**, así que no se tocan `Db Creator`, el diagrama ni `routine.module.ts` (los repositorios de BE-20 ya están registrados).

**Goal:** que `GET /routine/home/:userId?date=&week=` devuelva exactamente `week` semanas desde el lunes de la semana de `date`, cada una con las rutinas individuales y las del plan, sin que cambien las respuestas de `assigned/:userId` ni de `assigned-plan/:userId`.

**Architecture:** los cuerpos de `getAssignedRoutines` (BE-12) y `getAssignedPlan` (BE-20) pasan a dos helpers privados que devuelven datos (`findAssignedRoutinesInRange` y `findAssignedPlanWeeks`, este con `null` si pasa el tope de 520 semanas). Los handlers conservan sus validaciones, la búsqueda del usuario y sus textos. Un método nuevo, `getRoutineHome`, calcula el rango con dos funciones nuevas de `plan_weeks.ts` (`weeksRange` y `todayIn`), busca el usuario una vez, llama a los dos helpers con el rango entero y reparte por semana con `planWeekBounds`. Dos DTOs nuevos (el query y la semana) y un handler en el controller.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` + `class-transformer` · `Intl.DateTimeFormat` · scripts de Node en el scratchpad, adaptados de los de BE-12 y BE-20.

> **El código de las Tareas 2 a 5 se probó al escribir el plan** en una copia del proyecto en el scratchpad (`be20e/proto`, con `node_modules` enlazado por una junction al del repo y compilada con `tsc`): los cuatro scripts nuevos dieron en verde (96, 31, 74 y 58 chequeos) y toda la regresión siguió sin fallas. El repo no se tocó.

---

## 1. Decisiones del plan (lo que la spec no dice; se pueden vetar al aprobarlo)

1. **`weeksRange(day, weeks)` en lugar del `addDays` que nombra la spec (§5).** Devuelve `{ start_date, end_date }` o `null` si el domingo final cae después del 9999-12-31, como `defaultPlanEndDate`. Así el rango y su tope quedan en un solo lugar, y los lunes y domingos de cada semana salen de `planWeekBounds(start_date, n)`, que ya existe: no hace falta `addDays`.
2. **`todayIn(timeZone, now = new Date())`.** `now` es un parámetro para poder probarla con una hora fija. Se arma con `formatToParts` y no con el formato de un locale (`en-CA`), que cambió entre versiones de ICU.
3. **Los textos que la spec no fija:**
   - `500`: `Error al obtener el home del alumno.`
   - El `400` del tope de 520 semanas repite el de BE-20 (`… pedí un rango más corto con from y to.`), como dice la spec (§3), aunque el home no tenga `from` ni `to`. Con 8 semanas sólo se alcanza con más de 65 planes activos que conviven.
   - Los mensajes de `week` son los de `class-validator`, como el resto de los enteros del proyecto (`create_circuit.dto.ts`).
4. **El plan se pide primero:** si pasa el tope, el home responde el `400` sin consultar lo individual.
5. **El reparto por semana filtra cada lista una vez por semana** (a lo sumo 8): las individuales por `date` dentro de `[week_start, week_end]`, los grupos del plan por `week_start`. Cada lista conserva el orden de su helper.
6. **El tope del 9999-12-31 se chequea antes de buscar el usuario**, sin base, como manda el orden de la spec: un usuario inexistente con un `date` fuera de rango recibe `400`, no `404`.
7. **Dos comentarios de BE-12 y BE-20 se actualizan:** el de `getAssignedRoutines` (ya no es el home del alumno) y el de `PLAN_WEEKS_LIMIT` (el home ya no pide una sola semana).

**Hallazgos técnicos:**

8. **El ICU de Node devuelve `America/Buenos_Aires`** como nombre canónico de `America/Argentina/Buenos_Aires`. Es la misma zona; el script acepta los dos nombres.
9. **Con `forbidNonWhitelisted`, mandar `from` o `to` al home da `400`.** Es lo esperable: el home no los acepta.
10. **Con `transform: true` (main.ts), `@Type(() => Number)` convierte `week`.** `?week=` llega como `''`, se convierte en `0` y lo rechaza `@Min(1)`.
11. **El script del controller de BE-20 sube de 91 a 93 chequeos:** recorre todos los handlers de `routine/` para confirmar que ninguno cuelga, y ahora hay uno más.
12. **`home/:userId` no compite con `GET /:id`** (tiene dos segmentos) ni con otra ruta: ningún `GET` de `routine/` empieza con `home`.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/planification/plan_weeks.ts` | `weeksRange` y `todayIn`; el comentario de cabecera |
| `power-app/src/dtos/routine/get_routine_home_query.dto.ts` | **Nuevo:** `date` y `week` |
| `power-app/src/dtos/routine/routine_home_response.dto.ts` | **Nuevo:** la semana del home para el Swagger |
| `power-app/src/routine/routine.service.ts` | `findAssignedRoutinesInRange` y `findAssignedPlanWeeks` (extraídos); los dos handlers los usan; `getRoutineHome`; `HOME_TIME_ZONE`; el comentario de `PLAN_WEEKS_LIMIT`; imports |
| `power-app/src/routine/routine.controller.ts` | El handler `getRoutineHome` y sus imports |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | Entrada del 21/10, la fila de U-08 y la fase 3 |

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**: este plan, `Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md` y tres notas en `Doc/specs/2026-10-20-asignar-planificaciones-design.md`.

**Scratchpad** (`C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/2db4f77b-f27c-4ae7-89d6-d85ad0ef3485/scratchpad/be20e/`, fuera de los repos): `lib.js`, los cuatro scripts nuevos, la regresión (tres de BE-12, uno de BE-18b, tres de BE-20 y cuatro de BE-18, estos en `be18/`), el prototipo `proto/` y `cu-u-08.md`.

---

## 3. Cobertura de la spec

| Spec | Qué pide | Tarea |
|---|---|---|
| D31, §3 | `GET /routine/home/:userId`, user con `@Owner('userId')`, coach y admin; `assigned/:userId` y `assigned-plan/:userId` no cambian | 4, 5, 6 (regresión) |
| D32 | `date` se redondea al lunes; sin `date`, hoy en `America/Argentina/Buenos_Aires` | 2, 4 |
| D33 | `week` de 1 a 8, por defecto 1; `end_date = start_date + 7·week − 1` | 2, 3, 4 |
| §3 validaciones | `403` → `400` (DTO) → `400` (9999-12-31) → `404` → `400` (520 semanas) | 3, 4, 5 |
| D34, §4 | Siempre `week` semanas en orden, aunque estén vacías; plan sin rutinas con `routines: []` | 4 |
| D36, §4.1, §4.2 | Cada individual es la de `assigned/:userId`; cada grupo, el de `assigned-plan/:userId`, con sus DTOs | 3, 4 |
| §4.3 | Estado vacío: `200` con las semanas vacías | 4 |
| §5 | Los helpers compartidos; el usuario se busca una vez; las consultas no dependen de cuántas semanas | 4 |
| §5 | `todayIn` con `Intl.DateTimeFormat`; es la única que mira el reloj | 2 |
| §6 | CU-U-08 refinado | 7 |
| §8 | Build; las cuentas; el home con repositorios falsos; el SQL sin base; la regresión de BE-12 y BE-20 | 1, 6 |
| §9 | Status sin cambio de conteos; notas en la spec del bloque B | 8, 9 |

---

## Tarea 0 — Línea de base

**Archivos:** ninguno (lectura).

> **Nota de shell:** el shell no conserva variables entre comandos. Cada bloque que las usa empieza definiéndolas.

- [ ] **Paso 1: los dos repos y el build**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short && git log --oneline -1 && npm --prefix power-app run build
cd "D:/Power App/Docs/PowerApp-Docs" && git status --short && git log --oneline -1
```
Esperado: el backend en `7ea9031` (BE-20) sin cambios y el build sin errores; docs en `a8bce05` con sólo este plan (stageado al pedir la aprobación). Si aparece otra cosa, **preguntar** antes de seguir.

- [ ] **Paso 2: la regresión en verde, antes de tocar nada** (los scripts ya están en el scratchpad, copiados de `3a1b39b7-…/scratchpad/be20/` al escribir el plan)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/2db4f77b-f27c-4ae7-89d6-d85ad0ef3485/scratchpad/be20e"
unset ROOT; cd "$SCRATCH" && for s in verify-assigned-dto verify-assigned-controller verify-assigned-rules verify-plan-weeks verify-plan-weeks-home verify-assigned-plan-controller verify-assigned-plan-rules; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
cd "$SCRATCH/be18" && for s in verify-detail-rules verify-finished-rules verify-history-rules verify-finished-controller; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado (corrido al escribir el plan): BE-12 en `24`, `27` y `58 ok`; BE-18b en `86`; BE-20 en `92`, `91` y `113`; BE-18 en `47`, `130`, `48` y `43`; todos con `0 fallas`. Los dos `lib.js` leen la raíz del proyecto de `process.env.ROOT` si está definida (para correr contra el prototipo) y, si no, usan `power-app` del repo. Al ejecutar el plan **no se define `ROOT`**.

---

## Tarea 1 — Scripts de verificación, en rojo

**Archivos:** sólo el scratchpad (`$SCRATCH`). Cuatro scripts nuevos, sobre el código compilado (`power-app/dist`). **Ya se escribieron y se corrieron en rojo al preparar el plan**; si están, se usan tal cual.

- [ ] **Paso 1: `verify-home-weeks.js`** — `weeksRange` y `todayIn` en tres zonas horarias: cada día de la semana, el domingo, cruces de año y de un 29 de febrero, `week = 8`, el tope del 9999-12-31, la franja del domingo de 21 a 24 h de Argentina y que el ICU resuelva la zona.

```js
const { dist, check, run, finish } = require('./lib');

// Las dos cuentas nuevas de BE-20e: el rango de semanas enteras del home (D32, D33) y el dia de hoy
// en una zona (D32). Igual que las de BE-18b y BE-20, no pueden depender de la zona del servidor:
// se repiten en tres zonas
const ZONES = ['America/Argentina/Buenos_Aires', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'];
const AR = 'America/Argentina/Buenos_Aires';

(async () => {
  let W;
  await run('carga el módulo', async () => {
    W = dist('planification/plan_weeks');
    check('exporta weeksRange', typeof W.weeksRange === 'function');
    check('exporta todayIn', typeof W.todayIn === 'function');
  });
  if (!W || typeof W.weeksRange !== 'function' || typeof W.todayIn !== 'function') return finish();

  const eq = (name, actual, expected) => check(name, actual === expected, String(actual));
  const range = (name, actual, start, end) => check(name, !!actual && actual.start_date === start && actual.end_date === end
    && Object.keys(actual).join(',') === 'start_date,end_date', JSON.stringify(actual));

  // La semana del ejemplo de la spec: del lunes 19 al domingo 25 de octubre de 2026
  const WEEK = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];

  console.log('-- el ICU de Node resuelve la zona de Argentina');
  // Sin el ICU completo, una zona desconocida lanza RangeError. ICU puede devolver el alias canonico
  // (America/Buenos_Aires): es la misma zona
  await run('Intl conoce America/Argentina/Buenos_Aires', async () => {
    const resolved = new Intl.DateTimeFormat('en-US', { timeZone: AR }).resolvedOptions().timeZone;
    check('resolvedOptions().timeZone es la de Buenos Aires', ['America/Argentina/Buenos_Aires', 'America/Buenos_Aires'].includes(resolved), resolved);
  });

  for (const zone of ZONES) {
    process.env.TZ = zone;
    console.log(`\n== TZ ${zone} (offset ${new Date(2026, 9, 22).getTimezoneOffset()} min)`);

    console.log('-- weeksRange: del lunes de la semana de date, week semanas enteras (D32, D33)');
    for (const day of WEEK) range(`${day}, 1 semana → 19/10 al 25/10`, W.weeksRange(day, 1), '2026-10-19', '2026-10-25');
    range('jueves 22/10, 2 semanas → 19/10 al 1/11 (ejemplo de la spec)', W.weeksRange('2026-10-22', 2), '2026-10-19', '2026-11-01');
    range('jueves 22/10, 4 semanas → 19/10 al 15/11', W.weeksRange('2026-10-22', 4), '2026-10-19', '2026-11-15');
    range('jueves 22/10, 8 semanas (el tope) → 19/10 al 13/12', W.weeksRange('2026-10-22', 8), '2026-10-19', '2026-12-13');
    range('el domingo es el último día de su semana, no el primero de la siguiente', W.weeksRange('2026-10-25', 1), '2026-10-19', '2026-10-25');
    range('el lunes siguiente empieza otra semana', W.weeksRange('2026-10-26', 1), '2026-10-26', '2026-11-01');
    range('cruza el año (jueves 31/12/2026, 2 semanas)', W.weeksRange('2026-12-31', 2), '2026-12-28', '2027-01-10');
    range('29 de febrero bisiesto (martes)', W.weeksRange('2028-02-29', 1), '2028-02-28', '2028-03-05');
    range('domingo del cambio de hora europeo (29/3/2026)', W.weeksRange('2026-03-29', 1), '2026-03-23', '2026-03-29');
    range('un día pasado', W.weeksRange('2020-01-08', 1), '2020-01-06', '2020-01-12');
    range('el primer día del calendario es lunes', W.weeksRange('0001-01-03', 1), '0001-01-01', '0001-01-07');

    console.log('-- tope técnico: el rango no puede terminar después del 9999-12-31');
    range('la última semana que entra entera', W.weeksRange('9999-12-20', 1), '9999-12-20', '9999-12-26');
    range('dos semanas que terminan el 26/12/9999', W.weeksRange('9999-12-13', 2), '9999-12-13', '9999-12-26');
    eq('tres semanas desde el 13/12/9999 → null', W.weeksRange('9999-12-13', 3), null);
    eq('la semana del 9999-12-31 (viernes) termina en el año 10000 → null', W.weeksRange('9999-12-31', 1), null);
    eq('8 semanas desde el 1/12/9999 → null', W.weeksRange('9999-12-01', 8), null);

    console.log('-- todayIn: el día de hoy en una zona, con la hora que se le pasa (D32)');
    // Domingo 25/10 a las 22:30 en Argentina: en UTC ya es lunes 26/10. Es el caso que motiva D32
    const SUNDAY_NIGHT = new Date('2026-10-26T01:30:00Z');
    eq('domingo 22:30 en Argentina → 2026-10-25', W.todayIn(AR, SUNDAY_NIGHT), '2026-10-25');
    eq('el mismo instante en UTC → 2026-10-26', W.todayIn('UTC', SUNDAY_NIGHT), '2026-10-26');
    range('y el home de ese instante es la semana del 19/10, no la del 26/10', W.weeksRange(W.todayIn(AR, SUNDAY_NIGHT), 1), '2026-10-19', '2026-10-25');
    eq('domingo 23:59:59 en Argentina → 2026-10-25', W.todayIn(AR, new Date('2026-10-26T02:59:59Z')), '2026-10-25');
    eq('lunes 00:00 en Argentina → 2026-10-26', W.todayIn(AR, new Date('2026-10-26T03:00:00Z')), '2026-10-26');
    eq('fin de año: 31/12 a las 23:00 en Argentina', W.todayIn(AR, new Date('2027-01-01T02:00:00Z')), '2026-12-31');
    eq('29 de febrero en Argentina', W.todayIn(AR, new Date('2028-02-29T12:00:00Z')), '2028-02-29');
    eq('sin hora: el formato es YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(W.todayIn(AR)), true);
    eq('sin hora: coincide con la hora actual', W.todayIn(AR), W.todayIn(AR, new Date()));
  }

  finish();
})();
```

- [ ] **Paso 2: `verify-home-dto.js`** — el query con la configuración de `main.ts`: los dos opcionales, `week` convertido a número, los límites 1 y 8, los inválidos y que `from`/`to` den `400`.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

// La misma configuracion que main.ts: con transform, @Type convierte week de string a numero
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

(async () => {
  let Query;

  await run('carga el DTO', async () => {
    ({ GetRoutineHomeQueryDto: Query } = dist('dtos/routine/get_routine_home_query.dto'));
    check('exporta GetRoutineHomeQueryDto', typeof Query === 'function');
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

  console.log('-- date y week, los dos opcionales (D32, D33)');
  await accepts('sin parámetros', {}, { date: undefined, week: undefined });
  await accepts('sólo date', { date: '2026-10-22' }, { date: '2026-10-22', week: undefined });
  await accepts('sólo week: llega como texto y sale como número', { week: '2' }, { date: undefined, week: 2 });
  await accepts('date y week', { date: '2026-10-22', week: '4' }, { date: '2026-10-22', week: 4 });
  await accepts('week = 1, el mínimo', { week: '1' }, { week: 1 });
  await accepts('week = 8, el tope', { week: '8' }, { week: 8 });
  await accepts('29 de febrero bisiesto', { date: '2028-02-29' }, { date: '2028-02-29' });
  await accepts('un domingo', { date: '2026-10-25' }, { date: '2026-10-25' });

  console.log('\n-- lo que da 400');
  await rejects('week = 0', { week: '0' }, 'week');
  await rejects('week = 9 (pasa el tope de 8)', { week: '9' }, 'week');
  await rejects('week negativo', { week: '-1' }, 'week');
  await rejects('week con decimales', { week: '2.5' }, 'week');
  await rejects('week no numérico', { week: 'dos' }, 'week');
  await rejects('week vacío (?week=)', { week: '' }, 'week');
  await rejects('date con hora', { date: '2026-10-22T00:00:00Z' }, 'YYYY-MM-DD');
  await rejects('date inexistente (30 de febrero)', { date: '2026-02-30' }, 'YYYY-MM-DD');
  await rejects('date en otro formato', { date: '22-10-2026' }, 'YYYY-MM-DD');
  await rejects('date vacío (?date=)', { date: '' }, 'YYYY-MM-DD');
  await rejects('from no es un parámetro del home (forbidNonWhitelisted)', { from: '2026-10-19' });
  await rejects('to tampoco', { to: '2026-10-25' });

  finish();
})();
```

- [ ] **Paso 3: `verify-home-controller.js`** — ruta, verbo, roles, `@Owner('userId')` con el `OwnerGuard` real, tipos de los parámetros, `await` sin devolver el `Response`, que **ningún handler de `routine/` cuelgue** y el Swagger (la semana, `week` con mínimo, máximo y valor por defecto, y las dos rutas de antes), sin levantar nada.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { Reflector } = mod('@nestjs/core');
const { ForbiddenException, RequestMethod } = mod('@nestjs/common');
const { SwaggerModule, DocumentBuilder } = mod('@nestjs/swagger');
const { RoutineController } = dist('routine/routine.controller');
const { RoutineService } = dist('routine/routine.service');
const { JwtAuthGuard } = dist('authentication/guards/jwt-auth.guard');
const { RolesGuard } = dist('authentication/guards/roles.guard');
const { OwnerGuard } = dist('authentication/guards/owner.guard');
const { OWNER_PARAM_KEY } = dist('authentication/decorators/owner.decorator');
const { UserRole } = dist('entities/user.entity');
const { AssignedRoutinesParamsDto } = dist('dtos/routine/assigned_routines_params.dto');

const allow = { canActivate: () => true };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const USER = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const OTHER = '11111111-2222-4333-8444-555555555555';
const proto = RoutineController.prototype;
const handler = proto.getRoutineHome;

(async () => {
  let Query;
  await run('carga el DTO del query', async () => {
    ({ GetRoutineHomeQueryDto: Query } = dist('dtos/routine/get_routine_home_query.dto'));
    check('exporta GetRoutineHomeQueryDto', typeof Query === 'function');
  });

  console.log('-- ruta, verbo, roles, dueño y tipos (spec §3)');
  await run('getRoutineHome', async () => {
    check('existe', typeof handler === 'function');
    check('ruta home/:userId', Reflect.getMetadata('path', handler) === 'home/:userId', Reflect.getMetadata('path', handler));
    check('GET', Reflect.getMetadata('method', handler) === RequestMethod.GET, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('user, coach y admin', same(roles, [UserRole.user, UserRole.coach, UserRole.admin]), JSON.stringify(roles));
    check("@Owner('userId')", Reflect.getMetadata(OWNER_PARAM_KEY, handler) === 'userId', Reflect.getMetadata(OWNER_PARAM_KEY, handler));
    const types = Reflect.getMetadata('design:paramtypes', proto, 'getRoutineHome') || [];
    check('el path con AssignedRoutinesParamsDto (el de los otros listados por alumno)', types[0] === AssignedRoutinesParamsDto, types[0] && types[0].name);
    check('el query con GetRoutineHomeQueryDto (date y week)', !!Query && types[1] === Query, types[1] && types[1].name);
  });

  console.log('\n-- el OwnerGuard real con este handler');
  const guard = new OwnerGuard(new Reflector());
  const ctx = (role, id, userIdParam) => ({
    getHandler: () => handler,
    getClass: () => RoutineController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role, id }, params: { userId: userIdParam } }) }),
  });
  await run('un alumno pide su propio home', async () => {
    check('con su id', guard.canActivate(ctx(UserRole.user, USER, USER)) === true);
    check('con su id en mayúscula (iOS)', guard.canActivate(ctx(UserRole.user, USER, USER.toUpperCase())) === true);
  });
  await run('un alumno pide el home de otro → 403', async () => {
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

  const state = {};
  const stub = {
    getRoutineHome: async (...args) => { await new Promise(r => setTimeout(r, 20)); state.args = args; return 'RESPONSE'; },
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
    const query = { date: '2026-10-22', week: 2 };
    const res = {};
    const ret = await controller.getRoutineHome({ userId: USER }, query, res);
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
    const get = (doc.paths['/routine/home/{userId}'] || {}).get;

    check('GET /routine/home/{userId} está en el documento', !!get);
    if (get) {
      for (const code of ['200', '400', '403', '404']) check(`declara ${code}`, !!get.responses[code], Object.keys(get.responses).join(','));
      const schema = get.responses['200'].content['application/json'].schema;
      check('el 200 es un array de RoutineHomeWeekResponseDto',
        schema.type === 'array' && ref(schema.items).endsWith('/RoutineHomeWeekResponseDto'), JSON.stringify(schema));
      const params = (get.parameters || []).map(p => `${p.in}:${p.name}`);
      check('parámetros: userId en el path, date y week en el query', same(params.sort(), ['path:userId', 'query:date', 'query:week']), params.join(','));
      const query = (get.parameters || []).filter(p => p.in === 'query');
      check('date y week opcionales', query.length === 2 && query.every(p => p.required === false), JSON.stringify(query));
      const week = query.find(p => p.name === 'week');
      const weekSchema = (week && week.schema) || {};
      check('week documenta mínimo 1, máximo 8 y 1 por defecto', weekSchema.minimum === 1 && weekSchema.maximum === 8 && weekSchema.default === 1, JSON.stringify(weekSchema));
      check('pide token', Array.isArray(get.security) && get.security.some(s => 'bearer' in s));
    }

    const week = schemas.RoutineHomeWeekResponseDto;
    check('la semana documenta week_start, week_end, individual y plan', !!week && same(Object.keys(week.properties), ['week_start', 'week_end', 'individual', 'plan']),
      week && Object.keys(week.properties).join(','));
    if (week) {
      check('week_start y week_end son string', week.properties.week_start.type === 'string' && week.properties.week_end.type === 'string');
      check('individual es un array de RoutineAssignedListItemResponseDto (el de BE-12, D36)',
        week.properties.individual.type === 'array' && ref(week.properties.individual.items).endsWith('/RoutineAssignedListItemResponseDto'), JSON.stringify(week.properties.individual));
      check('plan es un array de RoutineAssignedPlanWeekResponseDto (el de BE-20, D36)',
        week.properties.plan.type === 'array' && ref(week.properties.plan.items).endsWith('/RoutineAssignedPlanWeekResponseDto'), JSON.stringify(week.properties.plan));
    }

    check('las dos rutas de antes siguen en el documento (D31)',
      ['/routine/assigned/{userId}', '/routine/assigned-plan/{userId}'].every(p => !!doc.paths[p]));
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 4: `verify-home-rules.js`** — las reglas de §3 y §4 con repositorios falsos y **las consultas reales**: el query builder del service sobre un `DataSource` sin conexión. Intercepta `getMany` (las filas crudas pasan por el transformador real de TypeORM, así que se prueba también la hidratación) y `getRawMany`, y filtra como lo haría la base. Cubre los códigos y su orden, el tope de 520 con 65 y 66 planes, el rango y los valores por defecto, el reparto por semana y que cada individual y cada grupo sean **idénticos** a los de `assigned/:userId` y `assigned-plan/:userId` para el mismo rango.

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, SelectQueryBuilder, getMetadataArgsStorage } = mod('typeorm');
const { RawSqlResultsToEntityTransformer } = require(path.join(ROOT, 'node_modules/typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer'));
const { RoutineService } = dist('routine/routine.service');
const W = dist('planification/plan_weeks');

const AR = 'America/Argentina/Buenos_Aires';
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
// Las rutinas del plan (Routine_Asignation)
const RA_A1 = 'a1000000-aaaa-4bbb-8ccc-000000000001';
const RA_B1 = 'b1000000-aaaa-4bbb-8ccc-000000000001';
const RA_A2 = 'a2000000-aaaa-4bbb-8ccc-000000000002';
const RA_X2 = 'c2000000-aaaa-4bbb-8ccc-000000000002';
const RA_B3 = 'b3000000-aaaa-4bbb-8ccc-000000000003';
const RA_Q1 = 'd1000000-aaaa-4bbb-8ccc-000000000001';
const RA_Q2 = 'd2000000-aaaa-4bbb-8ccc-000000000002';
// Las asignaciones individuales (Routine_Asignation_User)
const AU1 = 'f1000000-aaaa-4bbb-8ccc-000000000001';
const AU2 = 'f2000000-aaaa-4bbb-8ccc-000000000002';
const AU3 = 'f3000000-aaaa-4bbb-8ccc-000000000003';
const AU4 = 'f4000000-aaaa-4bbb-8ccc-000000000004';

const CREATED = new Date('2026-10-20T12:00:00Z');
const LATER = new Date('2026-10-21T12:00:00Z');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const MSG = {
  range: 'El rango pedido termina después del 9999-12-31.',
  userNotFound: 'Usuario no encontrado',
  limit: 'Hay más de 520 semanas de plan para mostrar: pedí un rango más corto con from y to.',
  error: 'Error al obtener el home del alumno.',
};
const WEEK_KEYS = ['week_start', 'week_end', 'individual', 'plan'];

const FUERZA = { id: P1, name: 'Fuerza', duration: 4, active: true };
const HIPER = { id: P2, name: 'Hipertrofia', duration: 4, active: true };

// Filas CRUDAS como las devolveria Postgres, con los alias del SELECT. Los DATE llegan como Date en
// medianoche local (lo que entrega pg) y TypeORM los hidrata como 'YYYY-MM-DD'. __day no es una
// columna: el transformador lo ignora y los falsos lo usan para filtrar por fecha como la base
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

function rauRow(id, date, routine = [R1, 'Día A', true], created = CREATED) {
  return {
    assignment_id: id, assignment_routine_id: routine[0], assignment_user_id: USER_ID, assignment_date: day(date),
    assignment_created_at: created, assignment_updated_at: created,
    routine_id: routine[0], routine_name: routine[1], routine_active: routine[2],
    __day: date,
  };
}

const DIA_A = [R1, 'Día A', true];
const DIA_B = [R2, 'Día B', true];
const DIA_C = [R3, 'Día C', true];

// La plantilla "Fuerza" (P1), la misma de BE-20: semana 1 con A y B, semana 2 con A y una C quitada
// del plan (E-12c), semana 3 con B, semana 4 vacia
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
const doneIndividual = (assignment, ...exercises) => exercises.map(e => ({ assignment_id: assignment, routine_exercise_id: e }));

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
  const { RoutineAsignationUser } = dist('entities/routine_asignation_user.entity');
  const { RoutineAsignExerciseFinished } = dist('entities/routine_asign_exercise_finished.entity');
  const { UserPlanification } = dist('entities/user_planification.entity');
  const { RoutineAsignation } = dist('entities/routine_asignation.entity');
  const { RoutineExerciseFinished } = dist('entities/routine_exercise_finished.entity');

  let state = null;

  // getMany: se guarda el SQL y las filas CRUDAS del caso pasan por el transformador REAL de TypeORM.
  // Las individuales y las rutinas del plan se filtran como lo haria la base, con los parametros con
  // nombre de la consulta: asi cada caso puede pasar todas sus filas
  SelectQueryBuilder.prototype.getMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    const alias = this.expressionMap.mainAlias.name;
    const kind = alias === 'userPlanification' ? 'ups' : alias === 'routineAsignation' ? 'ras' : alias === 'assignment' ? 'individual' : alias;
    state.ops.push(kind);
    state.queries.push({ kind, sql, params, named: this.getParameters() });
    if (state.cfg.fail === kind) throw new Error('se cayó la base');
    const p = this.getParameters();
    let raw = [];
    if (kind === 'ups') raw = state.cfg.ups || [];
    if (kind === 'ras') {
      raw = (state.cfg.ras || []).filter(r => (p.planificationIds || []).includes(r.routineAsignation_planification_id)
        && r.routineAsignation_week >= p.firstWeek && r.routineAsignation_week <= p.lastWeek);
    }
    if (kind === 'individual') {
      raw = (state.cfg.individual || []).filter(r => (p.from === undefined || r.__day >= p.from) && (p.to === undefined || r.__day <= p.to));
    }
    const transformer = new RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, [], [], undefined);
    return transformer.transform(raw, this.expressionMap.mainAlias);
  };

  // getRawMany: lo hecho en las dos vias y los ejercicios vigentes, filtrados como lo haria la base
  SelectQueryBuilder.prototype.getRawMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    const kind = /FROM "Routine_Circuit"/.test(sql) ? 'active'
      : /FROM "Routine_Exercise_Finished"/.test(sql) ? 'finished'
        : /FROM "Routine_Asign_Exercise_Finished"/.test(sql) ? 'finishedIndividual' : 'otra';
    state.ops.push(kind);
    state.queries.push({ kind, sql, params, named: this.getParameters() });
    const p = this.getParameters();
    if (kind === 'active') return (state.cfg.active || []).filter(r => (p.routineIds || []).includes(r.routine_id));
    if (kind === 'finished') {
      return (state.cfg.finished || []).filter(r => (p.userPlanificationIds || []).includes(r.user_planification_id)
        && (p.routineAsignationIds || []).includes(r.routine_asignation_id));
    }
    if (kind === 'finishedIndividual') return (state.cfg.finishedIndividual || []).filter(r => (p.assignmentIds || []).includes(r.assignment_id));
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
    return new RoutineService(forbidden('circuit'), forbidden('routine'), ds, userRepository, ds.getRepository(RoutineAsignationUser),
      ds.getRepository(RoutineAsignExerciseFinished), forbidden('routineExercise'), forbidden('routineCircuit'),
      ds.getRepository(UserPlanification), ds.getRepository(RoutineAsignation), ds.getRepository(RoutineExerciseFinished));
  }

  async function call(method, cfg, query = {}, userId = USER_ID) {
    const service = build(cfg);
    const res = makeRes();
    await service[method](userId, query, res);
    const q = (kind) => state.queries.find(e => e.kind === kind);
    return { res, body: res.body, ops: [...state.ops], q, st: state };
  }
  const home = (cfg, query, userId) => call('getRoutineHome', cfg, query, userId);

  // [week_start, week_end] de cada semana, para comparar de un vistazo
  const weeksOf = (body) => (Array.isArray(body) ? body.map(w => [w.week_start, w.week_end]) : body);
  const individualIds = (week) => (week && Array.isArray(week.individual) ? week.individual.map(i => i.id) : null);
  // [id de la asignacion, semana del plan, rutinas] de cada grupo del plan de una semana
  const planOf = (week) => (week && Array.isArray(week.plan)
    ? week.plan.map(g => [g.user_planification.id, g.week, g.routines.map(r => r.routine_asignation_id)]) : null);

  // ===================== CODIGOS =====================

  console.log('-- códigos y orden de las validaciones (spec §3)');

  await run('el método existe', async () => {
    check('getRoutineHome es función', typeof build().getRoutineHome === 'function');
  });

  await run('el rango termina después del 9999-12-31 → 400, sin consultar nada', async () => {
    const r = await home({}, { date: '9999-12-31' });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.range }), JSON.stringify(r.body));
    check('no tocó la base (ni siquiera el usuario)', r.ops.length === 0, r.ops.join(','));
    const eight = await home({}, { date: '9999-12-01', week: 8 });
    check('8 semanas desde el 1/12/9999 → 400', eight.res.statusCode === 400, eight.res.statusCode);
  });

  await run('la última semana que entra → 200', async () => {
    const r = await home({ ups: [] }, { date: '9999-12-20' });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('la semana del 20 al 26/12/9999', same(weeksOf(r.body), [['9999-12-20', '9999-12-26']]), JSON.stringify(weeksOf(r.body)));
  });

  await run('usuario inexistente → 404, sin buscar asignaciones', async () => {
    const r = await home({ user: null }, { date: '2026-10-22' });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.userNotFound }), JSON.stringify(r.body));
    check('sólo buscó al usuario', same(r.ops, ['user']), r.ops.join(','));
    check('lo buscó por el id del path, trayendo sólo el id', r.st.args.user && r.st.args.user.where.id === USER_ID && same(r.st.args.user.select, { id: true }),
      JSON.stringify(r.st.args.user));
  });

  await run('error de la base → 500 y se loguea (en el plan y en lo individual)', async () => {
    for (const fail of ['ras', 'individual']) {
      let r;
      const logged = await silencing(async () => { r = await home({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE, fail }, { date: '2026-10-22' }); });
      check(`falla ${fail}: estado 500`, r.res.statusCode === 500, r.res.statusCode);
      check(`falla ${fail}: mensaje`, same(r.body, { error: MSG.error }), JSON.stringify(r.body));
      check(`falla ${fail}: console.error una vez`, logged === 1, logged);
    }
  });

  await run('el id del alumno en mayúscula: se busca tal cual y se filtra por el id de la fila', async () => {
    const r = await home({ ups: [] }, { date: '2026-10-22' }, USER_ID.toUpperCase());
    check('buscó al usuario con lo que llegó', r.st.args.user && r.st.args.user.where.id === USER_ID.toUpperCase());
    check('las asignaciones del plan, por el id de la fila', !!r.q('ups') && same(r.q('ups').params, [USER_ID]), r.q('ups') && JSON.stringify(r.q('ups').params));
    check('las individuales, por el id de la fila', !!r.q('individual') && r.q('individual').params[0] === USER_ID, r.q('individual') && JSON.stringify(r.q('individual').params));
  });

  // ===================== EL TOPE DE 520 SEMANAS =====================

  console.log('\n-- el tope de 520 semanas de BE-20, que viene con el helper compartido');

  const upId = (i) => `3d000000-1111-4222-8333-${String(i).padStart(12, '0')}`;
  const manyPlans = (n) => Array.from({ length: n }, (_, i) => upRow({ id: upId(i), start: '2026-10-19', end: '2027-10-17' }));

  await run('65 planes que conviven, 8 semanas → 520: 200', async () => {
    const r = await home({ ups: manyPlans(65), ras: [] }, { date: '2026-10-19', week: 8 });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('8 semanas con 65 grupos cada una', Array.isArray(r.body) && r.body.length === 8 && r.body.every(w => w.plan.length === 65),
      Array.isArray(r.body) ? r.body.map(w => w.plan.length).join(',') : JSON.stringify(r.body));
  });

  await run('66 planes, 8 semanas → 528: 400 con el texto de BE-20, sin pedir lo individual', async () => {
    const r = await home({ ups: manyPlans(66), ras: [] }, { date: '2026-10-19', week: 8 });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.body, { error: MSG.limit }), JSON.stringify(r.body));
    check('sólo usuario y asignaciones del plan', same(r.ops, ['user', 'ups']), r.ops.join(','));
  });

  // ===================== EL RANGO =====================

  console.log('\n-- el rango: el lunes de date y week semanas enteras (D32, D33)');

  await run('jueves 22/10 con 2 semanas: del 19/10 al 1/11', async () => {
    const r = await home({ ups: [] }, { date: '2026-10-22', week: 2 });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('2 semanas, de lunes a domingo', same(weeksOf(r.body), [['2026-10-19', '2026-10-25'], ['2026-10-26', '2026-11-01']]), JSON.stringify(weeksOf(r.body)));
    const q = r.q('individual');
    check('las individuales se piden con el rango entero', !!q && q.named.from === '2026-10-19' && q.named.to === '2026-11-01', q && JSON.stringify(q.named));
  });

  await run('sólo date: 1 semana', async () => {
    const r = await home({ ups: [] }, { date: '2026-10-25' });
    check('la semana del 19 al 25/10 (el domingo es el último día de su semana)', same(weeksOf(r.body), [['2026-10-19', '2026-10-25']]), JSON.stringify(weeksOf(r.body)));
  });

  await run('sin date: la semana de hoy en Argentina', async () => {
    const monday = W.mondayOf(W.todayIn(AR));
    const r = await home({ ups: [] }, {});
    check('una semana, la que arranca el lunes de hoy en Argentina', Array.isArray(r.body) && r.body.length === 1 && r.body[0].week_start === monday,
      JSON.stringify(weeksOf(r.body)) + ' esperado ' + monday);
    const q = r.q('individual');
    check('las individuales desde ese lunes', !!q && q.named.from === monday, q && JSON.stringify(q.named));
  });

  await run('sólo week: desde el lunes de hoy en Argentina', async () => {
    const range = W.weeksRange(W.todayIn(AR), 3);
    const r = await home({ ups: [] }, { week: 3 });
    check('3 semanas, desde el lunes de hoy', Array.isArray(r.body) && r.body.length === 3 && r.body[0].week_start === range.start_date && r.body[2].week_end === range.end_date,
      JSON.stringify(weeksOf(r.body)));
  });

  await run('nada asignado → 200 con las semanas vacías (D34)', async () => {
    const r = await home({ ups: [], individual: [] }, { date: '2026-10-22', week: 4 });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('4 semanas', Array.isArray(r.body) && r.body.length === 4, JSON.stringify(r.body));
    check('cada una con sus 4 claves, en orden', Array.isArray(r.body) && r.body.every(w => same(Object.keys(w), WEEK_KEYS)),
      Array.isArray(r.body) && JSON.stringify(r.body.map(w => Object.keys(w))));
    check('todas con individual [] y plan []', Array.isArray(r.body) && r.body.every(w => same(w.individual, []) && same(w.plan, [])), JSON.stringify(r.body));
    check('consultas: usuario, asignaciones del plan e individuales, nada más', same(r.ops, ['user', 'ups', 'individual']), r.ops.join(','));
  });

  // ===================== EL REPARTO POR SEMANA =====================

  console.log('\n-- el reparto por semana (spec §4)');

  // Las individuales, en el orden en que las devuelve la base (dia, nombre de rutina y alta)
  const INDIVIDUAL = [
    rauRow(AU1, '2026-10-22', DIA_A),
    rauRow(AU2, '2026-10-26', DIA_B),
    rauRow(AU3, '2026-11-01', DIA_A),
    rauRow(AU4, '2026-11-02', DIA_C),
  ];

  await run('cada individual cae en la semana de su día, también el domingo', async () => {
    const r = await home({ ups: [], individual: INDIVIDUAL, active: ACTIVE }, { date: '2026-10-22', week: 2 });
    check('semana 1: la del jueves 22/10', same(individualIds(r.body && r.body[0]), [AU1]), JSON.stringify(individualIds(r.body && r.body[0])));
    check('semana 2: la del lunes 26/10 y la del domingo 1/11, en ese orden', same(individualIds(r.body && r.body[1]), [AU2, AU3]), JSON.stringify(individualIds(r.body && r.body[1])));
    check('la del 2/11 queda afuera del rango', Array.isArray(r.body) && !r.body.some(w => w.individual.some(i => i.id === AU4)));
  });

  await run('cada grupo del plan cae en su semana; la rutina quitada sin nada hecho no aparece (D29)', async () => {
    const r = await home({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { date: '2026-10-22', week: 2 });
    check('semana 1: la semana 1 del plan con el Día A y el Día B', same(planOf(r.body && r.body[0]), [[UP1, 1, [RA_A1, RA_B1]]]), JSON.stringify(planOf(r.body && r.body[0])));
    check('semana 2: la semana 2 del plan, sólo con el Día A', same(planOf(r.body && r.body[1]), [[UP1, 2, [RA_A2]]]), JSON.stringify(planOf(r.body && r.body[1])));
  });

  await run('un plan vigente sin rutinas esa semana → routines [] (D34)', async () => {
    const r = await home({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { date: '2026-11-09' });
    check('la semana 4 del plan, vacía', same(planOf(r.body && r.body[0]), [[UP1, 4, []]]), JSON.stringify(planOf(r.body && r.body[0])));
  });

  await run('un plan que termina a mitad del rango: las semanas siguientes con plan []', async () => {
    const r = await home({ ups: [upRow()], ras: TEMPLATE_P1, active: ACTIVE }, { date: '2026-11-02', week: 4 });
    check('4 semanas', same(weeksOf(r.body), [['2026-11-02', '2026-11-08'], ['2026-11-09', '2026-11-15'], ['2026-11-16', '2026-11-22'], ['2026-11-23', '2026-11-29']]),
      JSON.stringify(weeksOf(r.body)));
    check('semanas 3 y 4 del plan en las dos primeras', same(planOf(r.body && r.body[0]), [[UP1, 3, [RA_B3]]]) && same(planOf(r.body && r.body[1]), [[UP1, 4, []]]),
      JSON.stringify(Array.isArray(r.body) && r.body.map(planOf)));
    check('las dos últimas sin plan', Array.isArray(r.body) && same(r.body[2].plan, []) && same(r.body[3].plan, []));
  });

  await run('un plan que arranca en la segunda semana del rango; en la misma semana, por nombre', async () => {
    const ups = [upRow({ start: '2026-10-19' }), upRow({ id: UP3, plan: HIPER, start: '2026-10-26', end: '2026-11-22' })];
    const r = await home({ ups, ras: [...TEMPLATE_P1, ...TEMPLATE_P2], active: ACTIVE }, { date: '2026-10-19', week: 2 });
    check('semana 1: sólo Fuerza', same(planOf(r.body && r.body[0]), [[UP1, 1, [RA_A1, RA_B1]]]), JSON.stringify(planOf(r.body && r.body[0])));
    check('semana 2: Fuerza (su semana 2) antes que Hipertrofia (su semana 1)', same(planOf(r.body && r.body[1]), [[UP1, 2, [RA_A2]], [UP3, 1, [RA_Q1]]]),
      JSON.stringify(planOf(r.body && r.body[1])));
  });

  await run('dos asignaciones de la misma plantilla: las dos, cada una con su progreso', async () => {
    const ups = [upRow(), upRow({ id: UP2, created: LATER })];
    const r = await home({ ups, ras: TEMPLATE_P1, active: ACTIVE, finished: done(UP2, RA_A1, E1) }, { date: '2026-10-22' });
    check('dos grupos, primero la más vieja', same(planOf(r.body && r.body[0]), [[UP1, 1, [RA_A1, RA_B1]], [UP2, 1, [RA_A1, RA_B1]]]), JSON.stringify(planOf(r.body && r.body[0])));
    const progress = (i) => r.body[0].plan[i].routines[0].progress;
    check('UP1: 0 de 2; UP2: 1 de 2', Array.isArray(r.body) && same(progress(0), { finished: 0, total: 2 }) && same(progress(1), { finished: 1, total: 2 }),
      Array.isArray(r.body) && JSON.stringify([progress(0), progress(1)]));
  });

  await run('las dos fuentes en la misma semana', async () => {
    const r = await home({ ups: [upRow()], ras: TEMPLATE_P1, individual: INDIVIDUAL, active: ACTIVE, finishedIndividual: doneIndividual(AU1, E1) }, { date: '2026-10-22' });
    const w = Array.isArray(r.body) ? r.body[0] : {};
    check('individual: la del 22/10, 1 de 2', same(individualIds(w), [AU1]) && same(w.individual[0].progress, { finished: 1, total: 2 }), JSON.stringify(w.individual));
    check('plan: la semana 1 de Fuerza', same(planOf(w), [[UP1, 1, [RA_A1, RA_B1]]]), JSON.stringify(planOf(w)));
    check('consultas: usuario, el plan (asignaciones, rutinas, hecho, vigentes) y lo individual (lista, vigentes, hecho)',
      same(r.ops, ['user', 'ups', 'ras', 'finished', 'active', 'individual', 'active', 'finishedIndividual']), r.ops.join(','));
    check('el usuario se buscó una sola vez', r.ops.filter(o => o === 'user').length === 1);
  });

  // ===================== IGUALES A LAS OTRAS DOS RUTAS (D36) =====================

  console.log('\n-- cada elemento es idéntico al de assigned/:userId o al de assigned-plan/:userId (D36)');

  await run('mismo rango, mismas filas: las individuales y los grupos coinciden', async () => {
    const cfg = {
      ups: [upRow(), upRow({ id: UP3, plan: HIPER, start: '2026-10-26', end: '2026-11-22', note: 'Volver de la lesión' })],
      ras: [...TEMPLATE_P1, ...TEMPLATE_P2], individual: INDIVIDUAL, active: ACTIVE,
      finished: [...done(UP1, RA_X2, E4), ...done(UP3, RA_Q1, E1)], finishedIndividual: doneIndividual(AU2, E3),
    };
    const h = await home(cfg, { date: '2026-10-22', week: 3 });
    const individual = await call('getAssignedRoutines', cfg, { from: '2026-10-19', to: '2026-11-08' });
    const plan = await call('getAssignedPlan', cfg, { from: '2026-10-19', to: '2026-11-08' });
    check('las tres responden 200', h.res.statusCode === 200 && individual.res.statusCode === 200 && plan.res.statusCode === 200,
      [h.res.statusCode, individual.res.statusCode, plan.res.statusCode].join(','));
    const flatIndividual = Array.isArray(h.body) ? h.body.flatMap(w => w.individual) : null;
    const flatPlan = Array.isArray(h.body) ? h.body.flatMap(w => w.plan) : null;
    check('las individuales del home, una tras otra, son las de assigned/:userId', same(flatIndividual, individual.body),
      JSON.stringify(flatIndividual) + ' vs ' + JSON.stringify(individual.body));
    check('los grupos del home, uno tras otro, son los de assigned-plan/:userId', same(flatPlan, plan.body),
      JSON.stringify(flatPlan) + ' vs ' + JSON.stringify(plan.body));
    check('hay de las dos fuentes (el caso no es trivial): 4 individuales y 5 grupos', !!flatIndividual && flatIndividual.length === 4 && !!flatPlan && flatPlan.length === 5,
      `${flatIndividual && flatIndividual.length} individuales, ${flatPlan && flatPlan.length} grupos`);
  });

  finish();
})();
```

- [ ] **Paso 5: correrlos en rojo**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/2db4f77b-f27c-4ae7-89d6-d85ad0ef3485/scratchpad/be20e"
unset ROOT; cd "$SCRATCH" && for s in verify-home-weeks verify-home-dto verify-home-controller verify-home-rules; do echo "== $s"; node $s.js 2>&1 | tail -1; done
```
Esperado (corrido al escribir el plan): `0 ok, 2 fallas`, `0 ok, 1 fallas`, `42 ok, 9 fallas` (los 42 son de lo que ya existe: los otros handlers y el guard) y `0 ok, 21 fallas`.

---

> **Atajo para las Tareas 2 a 5:** si `diff -rq "D:/Power App/Backend/PowerApp-Backend/power-app/src" "$SCRATCH/proto/src"` lista **exactamente** los cinco archivos del mapa (dos "Only in" del prototipo y tres "differ"), se pueden copiar del prototipo en lugar de editarlos a mano: el código de abajo es el mismo. Si lista otra cosa, el repo cambió desde que se escribió el plan: se edita a mano siguiendo cada tarea.

## Tarea 2 — Las cuentas del rango (spec D32, D33 y §5)

**Archivos:** `power-app/src/planification/plan_weeks.ts`

- [ ] **Paso 1: el comentario de cabecera.** Reemplazar las dos últimas líneas:

```ts
// zona horaria del servidor no corra un dia. Funciones puras, sin Nest: las usan E-13 (el fin por
// defecto) y el home del plan (BE-20, desde routine/)
```
por:
```ts
// zona horaria del servidor no corra un dia. Funciones puras, sin Nest: las usan E-13 (el fin por
// defecto), el plan del home (BE-20, desde routine/) y el home en un solo pedido (BE-20e). La unica
// que mira el reloj es todayIn
```

- [ ] **Paso 2: las dos funciones nuevas, al final del archivo** (después de `planWeekBounds`):

```ts
// El rango del home (spec del home, D32 y D33): `weeks` semanas enteras, del lunes de la semana que
// contiene el dia al domingo de la ultima. Devuelve null si ese domingo cae despues del 9999-12-31,
// el mismo tope tecnico que el del fin por defecto
export function weeksRange(day: string, weeks: number): { start_date: string; end_date: string } | null {
    const startMs = toUtcMs(mondayOf(day));
    const endMs = startMs + (7 * weeks - 1) * DAY_MS;

    return endMs <= LAST_DAY_MS ? { start_date: fromUtcMs(startMs), end_date: fromUtcMs(endMs) } : null;
}

// El dia de hoy en una zona horaria (D32: el home sin date usa hoy en Argentina, no el reloj UTC del
// servidor, que los domingos de 21 a 24 h ya va por el lunes). Se arma con formatToParts y no con el
// formato de un locale, que cambia entre versiones de ICU. now es un parametro para poder probarla
export function todayIn(timeZone: string, now: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)!.value;

    return `${part('year')}-${part('month')}-${part('day')}`;
}
```

---

## Tarea 3 — Los DTOs (spec §3 y §4)

**Archivos:** dos nuevos en `power-app/src/dtos/routine/`.

- [ ] **Paso 1: `get_routine_home_query.dto.ts`**

```ts
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsCalendarDay } from './is_calendar_day.decorator';

// Query de GET /routine/home/:userId (spec del home, D32 y D33). No acepta from ni to: el rango son
// semanas enteras, del lunes de la semana de date en adelante
export class GetRoutineHomeQueryDto {

    @ApiPropertyOptional({ example: '2026-10-22', description: 'Día alrededor del cual se arma el home (YYYY-MM-DD), generalmente hoy. Se redondea al lunes de su semana. Si se omite, es hoy en hora de Argentina' })
    @IsOptional()
    @IsCalendarDay()
    date?: string;

    @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 8, default: 1, description: 'Cantidad de semanas enteras que se devuelven, contando la de date' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(8)
    week?: number;
}
```

- [ ] **Paso 2: `routine_home_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { RoutineAssignedListItemResponseDto } from './routine_assigned_list_item_response.dto';
import { RoutineAssignedPlanWeekResponseDto } from './routine_assigned_plan_response.dto';

// Una semana del home (GET /routine/home/:userId). Cada elemento de individual es el de
// GET /routine/assigned/:userId y cada uno de plan, el de GET /routine/assigned-plan/:userId (D36)
export class RoutineHomeWeekResponseDto {

    @ApiProperty({ example: '2026-10-19', description: 'Lunes de la semana (YYYY-MM-DD)' })
    week_start!: string;

    @ApiProperty({ example: '2026-10-25', description: 'Domingo de la semana (YYYY-MM-DD)' })
    week_end!: string;

    @ApiProperty({ type: [RoutineAssignedListItemResponseDto], description: 'Las rutinas individuales con día en esta semana, por día, nombre de rutina y alta. Iguales a las de GET /routine/assigned/:userId' })
    individual!: RoutineAssignedListItemResponseDto[];

    @ApiProperty({ type: [RoutineAssignedPlanWeekResponseDto], description: 'La semana del plan de cada asignación activa que cae en esta semana, por nombre de la planificación y alta. Iguales a los grupos de GET /routine/assigned-plan/:userId: repiten week_start y week_end' })
    plan!: RoutineAssignedPlanWeekResponseDto[];
}
```

---

## Tarea 4 — Service (spec §3, §4 y §5)

**Archivos:** `power-app/src/routine/routine.service.ts`

- [ ] **Paso 1: imports.** Debajo del import de `GetAssignedRoutinesQueryDto`, sumar:

```ts
import { GetRoutineHomeQueryDto } from '../dtos/routine/get_routine_home_query.dto';
```
y reemplazar el import de `plan_weeks` por:
```ts
import { planWeekOf, planWeekBounds, weeksRange, todayIn } from '../planification/plan_weeks';
```

- [ ] **Paso 2: el comentario de `PLAN_WEEKS_LIMIT` y la zona del home.** Reemplazar:

```ts
// 2026) pedido sin filtro armaria cientos de miles de semanas y tiraria el proceso; el home pide una
// sola semana, asi que nunca lo toca. 520 semanas son 10 años
```
por:
```ts
// 2026) pedido sin filtro armaria cientos de miles de semanas y tiraria el proceso. El home pide a lo
// sumo 8 semanas (BE-20e), asi que solo lo toca con mas de 65 planes que conviven. 520 semanas son 10 años
```
y, debajo de la línea de `PLAN_WEEKS_LIMIT_ERROR`, sumar:
```ts

// La zona del "hoy" del home cuando no llega date (D32). El servidor corre en UTC: los domingos de 21
// a 24 h de Argentina ya es lunes, y con su reloj el home saltaria a la semana siguiente
const HOME_TIME_ZONE = 'America/Argentina/Buenos_Aires';
```

- [ ] **Paso 3: `getAssignedRoutines` delega en el helper.** Reemplazar el método entero (desde su comentario, `// El alumno lo usa para el home de la semana…`, hasta su `}` de cierre) por:

```ts
    // El entrenador lo usa sin filtro, para ver todo lo que le asigno, y el home en un solo pedido
    // (BE-20e) arma su parte individual con el mismo helper. Las asignaciones sobreviven a la baja
    // de la rutina y al cierre de la cuenta (spec §6): por eso no se filtra por ninguno de los dos
    // "active"
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

            return res.status(200).send(await this.findAssignedRoutinesInRange(user.id, query.from, query.to));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener las rutinas asignadas.' });
        }
    }
```

- [ ] **Paso 4: el helper de las individuales.** Sumarlo en `HELPERS DE ASIGNACION INDIVIDUAL`, entre `buildRoutineAssignUserResponse` y `findAssignedRoutinesProgress`. Es la consulta y el armado que salieron del handler, con `userId`, `from` y `to` como parámetros:

```ts
    // Las asignaciones individuales del alumno con su dia en [from, to] (los dos inclusivos y
    // opcionales), cada una con su progreso. userId es el de la fila del usuario, ya validado
    private async findAssignedRoutinesInRange(userId: string, from?: string, to?: string) {
        // De la rutina sale solo lo que muestra el listado. Orden de la spec §4.3: dia y
        // nombre de rutina; el alta desempata dos rutinas homonimas el mismo dia
        const assignmentsQuery = this.routineAsignationUserRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.routine', 'routine')
            .addSelect(['routine.id', 'routine.name', 'routine.active'])
            .where('assignment.user_id = :userId', { userId })
            .orderBy('assignment.date', 'ASC')
            .addOrderBy('routine.name', 'ASC')
            .addOrderBy('assignment.created_at', 'ASC');

        if (from) {
            assignmentsQuery.andWhere('assignment.date >= :from', { from });
        }

        if (to) {
            assignmentsQuery.andWhere('assignment.date <= :to', { to });
        }

        const assignments = await assignmentsQuery.getMany();

        if (assignments.length === 0) {
            return [];
        }

        const progressByAssignment = await this.findAssignedRoutinesProgress(assignments);

        return assignments.map(assignment => ({
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
        }));
    }
```

- [ ] **Paso 5: `getAssignedPlan` delega en el helper, y el home.** Reemplazar todo desde el comentario de `getAssignedPlan` (`// La parte del plan del home (CU-U-08, spec del bloque B §5.5).`) hasta la línea anterior a `// ===================== HELPERS DE ASIGNACION INDIVIDUAL =====================` por el bloque de abajo. **El cuerpo de `findAssignedPlanWeeks` es el del `try` de `getAssignedPlan` sin cambios de lógica**: cuatro espacios menos de sangría y seis reemplazos (`{ userId: user.id }` → `{ userId }`; `query.from` → `from` y `query.to` → `to` en el recorte de semanas; el `400` del tope → `return null`; el `200` con `[]` → `return []`; el `200` con los grupos → `return groups`).

```ts
    // La parte del plan del home (CU-U-08, spec del bloque B §5.5). Un endpoint aparte del de la via
    // individual (D28): con from y to, o sin filtro para ver el plan entero. El home en un solo pedido
    // (BE-20e) arma su parte del plan con el mismo helper. Coach y admin ven lo mismo que el alumno
    // (gimnasio compartido, D6)
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

            const groups = await this.findAssignedPlanWeeks(user.id, query.from, query.to);

            if (groups === null) {
                return res.status(400).send({ error: PLAN_WEEKS_LIMIT_ERROR });
            }

            return res.status(200).send(groups);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener el plan del alumno.' });
        }
    }

    // De cada asignacion ACTIVA del alumno, las semanas del plan que se pisan con [from, to] (los dos
    // opcionales), cada una con las rutinas que el alumno ve y su progreso. Las rutinas del plan no
    // tienen dia, solo semana y orden. Devuelve null si pasan del tope de semanas: cada handler
    // responde el 400. userId es el de la fila del usuario, ya validado
    private async findAssignedPlanWeeks(userId: string, from?: string, to?: string) {
        // Las asignaciones activas del alumno: las quitadas (E-14) salen del home, y una plantilla
        // dada de baja (E-11) no saca lo ya asignado. Sin filtro de fechas: son pocas por alumno y
        // el recorte por semanas se hace abajo, con las cuentas de plan_weeks. El orden (nombre de
        // la planificacion y alta) desempata los grupos de una misma semana
        const userPlanifications = await this.userPlanificationRepository
            .createQueryBuilder('userPlanification')
            .innerJoin('userPlanification.planification', 'planification')
            .addSelect(['planification.id', 'planification.name', 'planification.duration', 'planification.active'])
            .where('userPlanification.user_id = :userId', { userId })
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
                    first: from ? Math.max(1, planWeekOf(userPlanification.start_date, from)) : 1,
                    last: to ? Math.min(lastWeek, planWeekOf(userPlanification.start_date, to)) : lastWeek,
                };
            })
            .filter(range => range.first <= range.last);

        // El tope se cuenta antes de consultar nada mas
        const weekCount = weekRanges.reduce((count, range) => count + range.last - range.first + 1, 0);

        if (weekCount > PLAN_WEEKS_LIMIT) {
            return null;
        }

        if (weekRanges.length === 0) {
            return [];
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

        return groups;
    }

    // ===================== EL HOME DEL ALUMNO (BE-20e) =====================

    // El home (CU-U-08, spec del home) en un solo pedido: week semanas enteras desde el lunes de la
    // semana de date, cada una con las rutinas individuales y las del plan. Cada elemento es el de
    // assigned/:userId o el de assigned-plan/:userId (D36), porque sale de los mismos helpers
    async getRoutineHome(
        userId: string,
        query: GetRoutineHomeQueryDto,
        res: Response
    ) {
        // D32 y D33, antes de consultar: sin date es hoy en Argentina, no el reloj del servidor
        const weekCount = query.week ?? 1;
        const range = weeksRange(query.date ?? todayIn(HOME_TIME_ZONE), weekCount);

        if (!range) {
            return res.status(400).send({ error: 'El rango pedido termina después del 9999-12-31.' });
        }

        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                select: { id: true },
            });

            if (!user) {
                return res.status(404).send({ error: 'Usuario no encontrado' });
            }

            // El plan primero: si pasa del tope de semanas de BE-20, no hace falta lo individual
            const plan = await this.findAssignedPlanWeeks(user.id, range.start_date, range.end_date);

            if (plan === null) {
                return res.status(400).send({ error: PLAN_WEEKS_LIMIT_ERROR });
            }

            const individual = await this.findAssignedRoutinesInRange(user.id, range.start_date, range.end_date);

            // Siempre weekCount semanas, aunque esten vacias (D34). Como el rango son semanas enteras,
            // cada grupo del plan arranca en uno de estos lunes. Los dias 'YYYY-MM-DD' se comparan
            // como texto, y el orden de cada lista es el de su helper
            const weeks = Array.from({ length: weekCount }, (_, index) => {
                const { week_start, week_end } = planWeekBounds(range.start_date, index + 1);

                return {
                    week_start,
                    week_end,
                    individual: individual.filter(item => item.date >= week_start && item.date <= week_end),
                    plan: plan.filter(group => group.week_start === week_start),
                };
            });

            return res.status(200).send(weeks);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener el home del alumno.' });
        }
    }
```

---

## Tarea 5 — Controller (spec §3)

**Archivos:** `power-app/src/routine/routine.controller.ts`

- [ ] **Paso 1: imports.** Debajo del de `RoutineAssignedPlanWeekResponseDto`:

```ts
import { GetRoutineHomeQueryDto } from '../dtos/routine/get_routine_home_query.dto';
import { RoutineHomeWeekResponseDto } from '../dtos/routine/routine_home_response.dto';
```

- [ ] **Paso 2: el handler, entre `getAssignedPlan` y el del historial** (antes del comentario `// Historial de entrenamientos del alumno (E-06)…`):

```ts
    // El home del alumno (U-08) en un solo pedido: las dos fuentes por semana, desde el lunes de la
    // semana de date (spec del home, D31). Mismos roles y mismo @Owner que assigned/:userId y
    // assigned-plan/:userId, que siguen para el coach. Dos segmentos: no compite con 'GET /:id'
    @Get('home/:userId')
    @Auth(UserRole.user, UserRole.coach, UserRole.admin)
    @Owner('userId')
    @ApiResponse({ status: 200, type: [RoutineHomeWeekResponseDto], description: 'Exactamente week semanas, de lunes a domingo, aunque estén vacías. En cada una, las rutinas individuales (las de assigned/:userId) y la semana de cada plan activo (los grupos de assigned-plan/:userId)' })
    @ApiResponse({ status: 400, description: 'Id o fecha inválidos, week fuera de 1 a 8, el rango termina después del 9999-12-31 o más de 520 semanas de plan para devolver' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async getRoutineHome(
        @Param() params: AssignedRoutinesParamsDto,
        @Query() query: GetRoutineHomeQueryDto,
        @Res() res: Response,
    ) {
        await this.routineService.getRoutineHome(params.userId, query, res);
    }
```

---

## Tarea 6 — Compilar y verificar

- [ ] **Paso 1: build**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build
```
Esperado: sin errores.

- [ ] **Paso 2: los cuatro scripts nuevos, en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/2db4f77b-f27c-4ae7-89d6-d85ad0ef3485/scratchpad/be20e"
unset ROOT; cd "$SCRATCH" && for s in verify-home-weeks verify-home-dto verify-home-controller verify-home-rules; do echo "== $s"; node $s.js 2>&1 | grep -E "FALLA|fallas$"; done
```
Esperado (en el prototipo): `96`, `31`, `74` y `58 ok`, con `0 fallas`.

- [ ] **Paso 3: la regresión, igual que en la Tarea 0** (el mismo bloque del Paso 2 de la Tarea 0). Esperado: los mismos números, salvo el controller de BE-20, que pasa de `91` a `93` (hallazgo 11). Que BE-12 y BE-20 sigan en verde prueba que las dos rutas responden igual y con el mismo SQL.

- [ ] **Paso 4: el repo coincide con el prototipo**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/2db4f77b-f27c-4ae7-89d6-d85ad0ef3485/scratchpad/be20e"
diff -rq "D:/Power App/Backend/PowerApp-Backend/power-app/src" "$SCRATCH/proto/src" && echo IGUALES
```
Esperado: `IGUALES`. Si difiere, mirar el diff antes de seguir.

---

## Tarea 7 — Spec de CU-U-08 (repo PowerApp-Docs)

**Archivos:** `D:\Power App\Docs\PowerApp-Docs\Use Cases\usuario\CU-U-08-obtener-mi-planificacion.md` (también en el scratchpad, `cu-u-08.md`).

- [ ] **Paso 1: reemplazar el archivo entero por:**

````markdown
# CU-U-08 — Obtener mi Planificación

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Pantalla principal (home) del alumno: muestra las rutinas de una o más semanas, empezando por la semana del día que manda la aplicación (generalmente hoy). Llegan juntas las que vienen de una planificación asignada (~90%) y las individuales que el entrenador le asignó para un día concreto (~10%). Las rutinas del plan van por semana del plan, sin día, en el orden que les dio el entrenador; las individuales, por día. Cada rutina muestra su progreso: los ejercicios que ya hizo sobre el total.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Las semanas pedidas, de lunes a domingo: desde la que contiene el día que manda la aplicación, hasta 8 semanas seguidas.
- Las rutinas individuales de cada semana (Routine_Asignation_User), cada una con su día y su progreso.
- Las rutinas de cada semana de cada planificación activa del alumno (User_Planification → Planification → Routine_Asignation), cada una con su orden dentro de la semana y su progreso.
- Mostrar juntas las dos fuentes, semana por semana, cuando el alumno tiene ambas.
- Moverse a otras semanas, anteriores o posteriores.

**Fuera de alcance:**

- Detalle de cada rutina (ver CU "Ver detalle de Rutina").
- Marcar ejercicios como realizados (CU «Marcar como realizado»).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- Operación de solo lectura; no cambia el estado del sistema.

## Camino principal (flujo básico)

1. El usuario abre el home.
2. La aplicación manda un día, generalmente el de hoy, y la cantidad de semanas que quiere mostrar, de 1 a 8. El sistema toma el lunes de la semana de ese día y arma las semanas pedidas, de lunes a domingo.
3. Para cada semana, el sistema busca las rutinas individuales asignadas al alumno para esos días y calcula el progreso de cada una.
4. Para cada semana, el sistema busca las planificaciones activas del alumno que tienen una semana del plan en esa semana del calendario. La semana 1 del plan es la de lunes a domingo que contiene su fecha de inicio, y la última es la que contiene su fecha de fin. Trae las rutinas de esa semana del plan, en el orden que les dio el entrenador, y calcula el progreso de cada una.
5. El sistema presenta las semanas en orden, todas, aunque alguna esté vacía. En cada una van las rutinas individuales, ordenadas por día, y las del plan, agrupadas por planificación, con el nombre del plan y el número de semana.

## Caminos alternativos / excepciones

### En el paso 2 — La aplicación no manda el día

1. La aplicación pide el home sin indicar el día.
2. El sistema usa el día de hoy en la hora de Argentina para armar las semanas.

### En el paso 2 — La aplicación no manda la cantidad de semanas

1. La aplicación pide el home sin indicar cuántas semanas.
2. El sistema arma una sola semana.

### En el paso 2 — Datos inválidos

1. El día no es una fecha válida, o la cantidad de semanas es menor que 1 o mayor que 8.
2. El sistema informa el error y no muestra nada.

### En el paso 4 — Sin plan esa semana pero con rutinas individuales

1. El alumno no tiene ninguna planificación activa con una semana que caiga en esa semana (no tiene ninguna, todavía no empezó o ya terminó).
2. El sistema muestra en esa semana sólo sus rutinas individuales.

### En el paso 4 — Con plan y con rutinas individuales

1. El alumno tiene las dos cosas.
2. El sistema muestra las dos: una rutina individual asignada a propósito no queda oculta mientras dure el plan.

### En el paso 4 — Dos planificaciones en la misma semana

1. El alumno tiene dos planificaciones activas cuyas fechas se pisan (el entrenador confirmó el aviso de solapamiento de CU-E-13).
2. El sistema muestra las dos, cada una con sus rutinas de esa semana.

### En el paso 4 — El plan arranca o termina a mitad de semana

1. La fecha de inicio o la de fin del plan cae a mitad de la semana.
2. El sistema muestra igual esa semana del plan completa: sus rutinas no tienen día, así que el alumno las hace en los días que le quedan.

### En el paso 4 — Una semana del plan sin rutinas

1. La planificación no tiene rutinas para esa semana (por ejemplo, el entrenador le fijó al alumno un fin más largo que la duración de la planificación).
2. El sistema muestra la semana del plan, vacía.

### En el paso 4 — El entrenador quitó una rutina del plan

1. El entrenador quitó una rutina de esa semana de la planificación (CU-E-12c).
2. Si el alumno ya había hecho algo en ella, el sistema la sigue mostrando, indicando que fue quitada, y sólo con lo que hizo. Si no había hecho nada, no la muestra.

### En el paso 4 — Planificación quitada al alumno

1. El entrenador le quitó la planificación al alumno (CU-E-14).
2. El sistema no la muestra en el home. Lo que el alumno hizo en ella sigue en su historial.

### En los pasos 3 y 4 — La planificación o la rutina fueron dadas de baja después de asignarlas

1. El entrenador dio de baja la planificación (CU-E-11) o la rutina (CU-E-18) después de asignarla.
2. El sistema la sigue mostrando, indicando que está dada de baja: la asignación existe y el alumno puede ejecutarla.

### En los pasos 3 y 4 — Un ejercicio fue dado de baja

1. El entrenador sacó un ejercicio de la rutina después de que el alumno lo hizo.
2. El sistema lo cuenta en el progreso de esa rutina: se ve lo dado de baja que el alumno completó, y sólo eso.

### En el paso 5 — Una semana sin nada

1. Una de las semanas pedidas no tiene rutinas individuales ni del plan.
2. El sistema la muestra vacía, en su lugar entre las demás.

### En el paso 5 — El alumno se mueve a otras semanas

1. El alumno pide semanas anteriores o posteriores.
2. La aplicación manda otro día y el sistema repite los pasos 2 a 5, también si esas semanas ya pasaron: lo que hizo se sigue viendo en el progreso.

### En el paso 5 — Sin asignaciones

1. El alumno no tiene rutinas del plan ni rutinas individuales en ninguna de las semanas pedidas.
2. El sistema muestra un estado vacío indicando que aún no tiene entrenamiento asignado.
````

- [ ] **Paso 2: control**

```bash
grep -c "semanas" "D:/Power App/Docs/PowerApp-Docs/Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md"
grep -n "Argentina\|de 1 a 8\|Una semana sin nada" "D:/Power App/Docs/PowerApp-Docs/Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md"
```
Esperado: un conteo mayor que 0 y las tres frases encontradas.

---

## Tarea 8 — Notas en la spec del bloque B (repo PowerApp-Docs)

**Archivos:** `D:\Power App\Docs\PowerApp-Docs\Doc\specs\2026-10-20-asignar-planificaciones-design.md`. No se reescribe nada: se suman tres notas (spec del home, §9).

- [ ] **Paso 1: D28.** En la fila de D28, reemplazar la celda del porqué:

```
| `GET /routine/assigned/:userId` no cambia de forma. El "ordenadas por día" de U-08 queda para las individuales |
```
por:
```
| `GET /routine/assigned/:userId` no cambia de forma. El "ordenadas por día" de U-08 queda para las individuales. **Complementada el 21/10** ([spec del home](2026-10-21-home-del-alumno-design.md), D31): el home junta las dos fuentes en `GET /routine/home/:userId`, y esta ruta y `assigned/:userId` siguen como están |
```

- [ ] **Paso 2: §5.5.** Debajo del título `### 5.5 El plan en el home — …`, sumar (con una línea en blanco antes y después):

```
> **21/10:** el home del alumno pide las dos fuentes juntas en `GET /routine/home/:userId?date=&week=` ([spec del home](2026-10-21-home-del-alumno-design.md), BE-20e). Esta ruta sigue igual: el coach la usa sin filtro para ver el plan entero, y el home reutiliza su helper.
```

- [ ] **Paso 3: §9.** Debajo de la fila de BE-20d, sumar:

```
| **BE-20e** (nueva, 21/10) | El home en un solo pedido ([spec del home](2026-10-21-home-del-alumno-design.md)) | — (U-08 ya ✅) | 2 h |
```

- [ ] **Paso 4: control**

```bash
grep -c "2026-10-21-home-del-alumno-design.md" "D:/Power App/Docs/PowerApp-Docs/Doc/specs/2026-10-20-asignar-planificaciones-design.md"
```
Esperado: `3`.

---

## Tarea 9 — Status (informe y dashboard)

**Archivos:** `Status/estado-implementacion-backend.md` y `Status/dashboard-estado-backend.html`. **Los conteos no cambian** (U-08 ya estaba ✅ desde BE-20). Si algún número de la verificación salió distinto del esperado, se corrige en el texto antes de guardarlo.

- [ ] **Paso 1: la entrada del changelog.** En el informe, insertar arriba de `## Cambios recientes (2026-10-21 · bloque B: el plan en el home del alumno)`:

```markdown
## Cambios recientes (2026-10-21 · bloque B: el home del alumno en un solo pedido)

- **Tarea nueva sobre BE-20 (BE-20e): el home de U-08 en un solo pedido.** Spec: `Doc/specs/2026-10-21-home-del-alumno-design.md`; plan: `Doc/plans/2026-10-21-be-20e-home-en-un-pedido-plan.md` (repo PowerApp-Docs). La pidió el usuario el 21/10, con BE-20 ya construida: el front manda un día y una cantidad de semanas, y el back devuelve sólo esas semanas, con las dos fuentes juntas.
- **El contrato:** `GET /routine/home/:userId?date=&week=`, user con `@Owner('userId')`, coach y admin, en `routine/` (D27). `date` (un día `YYYY-MM-DD`) se redondea al lunes de su semana; `week` es la cantidad de semanas enteras, de 1 a 8, contando la de `date`. Devuelve **siempre `week` semanas**, aunque estén vacías: `[ { week_start, week_end, individual: [ … ], plan: [ … ] } ]`. Validaciones, en este orden: `403` del `@Owner` → `400` del DTO (`date` inválido, `week` fuera de 1 a 8, o `from`/`to`, que el home no acepta) → `400` si el rango termina después del 9999-12-31 → `404` `Usuario no encontrado` → `400` del tope de 520 semanas de BE-20 → `200`.
- **Decisiones del 21/10, con el usuario (D31 a D36 de la spec del home):**
  - **D31: el home es una ruta propia y las dos de antes se quedan.** `assigned/:userId` lo usa el coach para sacar el id en E-19 y E-20, y `assigned-plan/:userId` sin filtro es la vista del plan entero, que el home no da con su tope de 8 semanas. Complementa D28: no revierte nada de lo construido.
  - **D32: sin `date`, es hoy en hora de Argentina** (`America/Argentina/Buenos_Aires`), no el reloj del servidor. Por qué: Render corre en UTC y los domingos de 21 a 24 h de Argentina ya es lunes, así que el home saltaría a la semana siguiente. Es una excepción acotada a "el servidor nunca calcula hoy" (D25): sólo es el valor por defecto de un filtro de lectura, y lo recomendado para el front es mandar siempre `date`.
  - **D33: `week` va de 1 a 8, por defecto 1**, y el rango termina en `lunes + 7·week − 1`, siempre un domingo (la misma cuenta que el fin por defecto del plan). El tope evita volver a traer todo, que es justamente lo que el filtro quiere evitar.
  - **D34: siempre `week` semanas, en orden**, y un plan vigente sin rutinas esa semana viene con `routines: []`. El índice del array es el desplazamiento desde la semana de `date`, y el front no rellena huecos.
  - **D35: se refina U-08**, no se abre un CU nuevo.
  - **D36: cada elemento de `individual` es idéntico a uno de `assigned/:userId`, y cada uno de `plan`, a un grupo de `assigned-plan/:userId`**, con sus mismos DTOs; por eso los grupos repiten `week_start` y `week_end`. Así el front tipa una sola forma por fuente y lo verificado en BE-12 y BE-20 sigue valiendo.
- **Cómo se hizo:** los cuerpos de `getAssignedRoutines` y `getAssignedPlan` pasaron a dos helpers privados (`findAssignedRoutinesInRange` y `findAssignedPlanWeeks`, que devuelve `null` si pasa el tope), y los handlers conservan sus validaciones, la búsqueda del usuario y sus textos: **las dos rutas responden igual que antes**, y lo confirmó su regresión, que también exige el mismo SQL. `getRoutineHome` busca el usuario una sola vez, pide el plan primero (si pasa el tope, no consulta lo individual) y reparte por semana con `planWeekBounds`. `plan_weeks.ts` suma `weeksRange` (el rango y el tope del 9999-12-31, en UTC como el resto) y `todayIn` (el día en una zona, con `Intl.formatToParts`; es la única función que mira el reloj).
- **Decisiones del plan** (el usuario las aprobó con él): `weeksRange` en lugar del `addDays` que nombraba la spec (el rango y su tope en un solo lugar; los lunes de cada semana salen de `planWeekBounds`); el `500` dice `Error al obtener el home del alumno.`; el `400` del tope de 520 semanas repite el texto de BE-20, aunque nombre `from` y `to` (con 8 semanas sólo se alcanza con más de 65 planes que conviven); los mensajes de `week` son los de `class-validator`, como el resto de los enteros.
- **Hallazgo técnico:** el ICU de Node devuelve `America/Buenos_Aires` como nombre canónico de la zona de Argentina. Es la misma zona.
- **Verificación, sin levantar el server.** Hecho:
  - Build en verde.
  - **El código se probó antes de aprobar el plan** en una copia del proyecto en el scratchpad, compilada con `tsc` y con `node_modules` enlazado, y se aplicó tal cual: repo y copia quedaron idénticos.
  - Cuatro scripts nuevos sobre el código compilado, escritos antes del código y corridos **en rojo** (2, 1, 9 y 21 fallas) y después en verde: **las cuentas** (96 chequeos, en tres zonas horarias, con la franja del domingo a la noche), **el DTO** (31), **el controller y su Swagger** (74) y **las reglas** (58), con las consultas reales sin base: los códigos y su orden, el tope de 520 con 65 y 66 planes, el rango y los valores por defecto, el reparto por semana, las semanas vacías y que las individuales y los grupos sean idénticos a los de las otras dos rutas.
  - **Regresión en verde:** BE-12 (24, 27 y 58), BE-18b (86), BE-20 (92, 93 —dos chequeos más porque recorre todos los handlers— y 113) y BE-18 (47, 130, 48 y 43).
  - **Qué NO se verificó:** el SQL contra un Postgres y el runtime (BE-35, con el seed de BE-21).
- **Sin cambios de estado: U-08 ya estaba ✅ desde BE-20** (68 ✅ · 6 🟡 · 0 🔵). Spec de CU reescrita en `Use Cases/` (repo PowerApp-Docs): **U-08** (la app manda un día y una cantidad de semanas; sin día, hoy en Argentina; datos inválidos; la semana vacía; moverse a otras semanas mandando otro día). Notas en la spec del bloque B (D28, §5.5 y §9). **Para el web:** B1 tipa el home contra `GET /routine/home/:userId`, un pedido en lugar de dos. **Sigue BE-20b** (el detalle de una sesión del plan).

```

- [ ] **Paso 2: la fila de U-08 del informe.** Reemplazar el comienzo de la celda del endpoint:

```
| CU-U-08 | Obtener mi planificación | ✅ Implementado | `GET /routine/assigned/:userId?from=&to=` · la parte **individual** del home
```
por:
```
| CU-U-08 | Obtener mi planificación | ✅ Implementado | `GET /routine/home/:userId?date=&week=` · **el home en un solo pedido**: `week` semanas enteras (1 a 8) desde el lunes de la semana de `date` (hoy en Argentina si no viene), cada una con las dos fuentes (BE-20e, 21/10) · `GET /routine/assigned/:userId?from=&to=` · la parte **individual** del home
```

- [ ] **Paso 3: la fila de U-08 del dashboard.** Reemplazar:

```html
<td class="endpoint"><span class="verb">GET</span> /routine/assigned/:userId <span class="muted">· la parte individual, por día y con su progreso (18/10) · </span>
```
por:
```html
<td class="endpoint"><span class="verb">GET</span> /routine/home/:userId <span class="muted">· el home en un solo pedido: week semanas desde el lunes de date, con las dos fuentes (BE-20e, 21/10) · </span><span class="verb">GET</span> /routine/assigned/:userId <span class="muted">· la parte individual, por día y con su progreso (18/10) · </span>
```

- [ ] **Paso 4: la fase 3 del dashboard.** Reemplazar `BE-17, BE-18, BE-18b, BE-19 y BE-20 (20 y 21/10)` por `BE-17, BE-18, BE-18b, BE-19, BE-20 y BE-20e (20 y 21/10)`.

- [ ] **Paso 5: control**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status" && grep -c "BE-20e" estado-implementacion-backend.md dashboard-estado-backend.html && grep -c "| ✅ Implementado | 68 |" estado-implementacion-backend.md
```
Esperado: al menos `2` en el informe y `2` en el dashboard, y `1` (los conteos siguen en 68).

---

## Tarea 10 — Stage y mensajes de commit

- [ ] **Paso 1: stage en los dos repos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/planification/plan_weeks.ts power-app/src/dtos/routine/get_routine_home_query.dto.ts power-app/src/dtos/routine/routine_home_response.dto.ts power-app/src/routine/routine.service.ts power-app/src/routine/routine.controller.ts Status/estado-implementacion-backend.md Status/dashboard-estado-backend.html && git status --short
cd "D:/Power App/Docs/PowerApp-Docs" && git add Doc/plans/2026-10-21-be-20e-home-en-un-pedido-plan.md "Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md" Doc/specs/2026-10-20-asignar-planificaciones-design.md && git status --short
```
Esperado: siete archivos en el backend y tres en docs, todos stageados y nada sin stagear.

- [ ] **Paso 2: proponer los mensajes** (el usuario commitea con su estilo):
  - Backend: `BE-20e: el home del alumno en un solo pedido (U-08), GET /routine/home/:userId?date=&week=`
  - Docs: `Plan de BE-20e y CU-U-08 refinado: el home pide un dia y una cantidad de semanas`

---

## Tarea 11 — Memoria del proyecto

- [ ] **Paso 1:** en `project_cu_status.md`, sumar que BE-20e quedó hecha (el home en un solo pedido, `GET /routine/home/:userId?date=&week=`, sin cambio de conteos: 68 ✅ · 6 🟡) y actualizar la línea del índice en `MEMORY.md`. En `project_data_model_reconciliation.md` no hay nada que tocar: no cambió el modelo.

---

## 4. Qué NO verifica este plan

- **El SQL contra un Postgres:** se genera sin base y se compara como texto. Las consultas son las de BE-12 y BE-20, que tampoco se probaron contra una base.
- **Que el server arranque:** no cambian ni el módulo ni el constructor, así que la inyección es la de BE-20.
- **El runtime:** lo prueba el usuario en BE-35, con la base regenerada y el seed de BE-21.
- **El reloj real del servidor en Render:** `todayIn` se prueba con horas fijas y en tres zonas, no en Render.

## 5. Autoevaluación contra la spec

- **Cobertura:** cada sección de la spec tiene su tarea (§3 de este plan). D31 se cumple sin tocar las dos rutas de antes, y lo prueba la regresión.
- **Sin marcadores pendientes:** el código de las Tareas 2 a 5 y los scripts de la Tarea 1 están completos y son los que se probaron en el prototipo.
- **Consistencia de nombres:** `weeksRange`, `todayIn`, `findAssignedRoutinesInRange`, `findAssignedPlanWeeks`, `getRoutineHome`, `GetRoutineHomeQueryDto`, `RoutineHomeWeekResponseDto` y `HOME_TIME_ZONE` se usan igual en el código, en los scripts y en el Status.
- **Desvío de la spec, declarado:** `weeksRange` en lugar de `addDays` (decisión 1).

## 6. Después de esto

**Sigue BE-20b** (el detalle de una sesión del plan, §5.6 de la spec del bloque B). BE-20e no la cambia: el home ya trae el par `user_planification.id` + `routine_asignation_id` que BE-20b usa para abrir cada rutina.
