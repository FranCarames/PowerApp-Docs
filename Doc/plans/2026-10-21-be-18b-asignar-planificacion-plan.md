# BE-18b — Asignar una planificación a un alumno (CU-E-13) · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` y se propone el mensaje (Tarea 9).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escriben **antes** del código y se corren en rojo.
> 3. **No se levanta el server**, ni siquiera en segundo plano, y **no se instala nada**. El SQL se verifica como texto, con el `DataSource` sin conexión.

> **Registro de ejecución (21/10):** plan aprobado y ejecutado en la misma sesión, sin subagentes, **tal como está escrito**: ningún paso cambió. Los cinco scripts dieron en rojo 1, 1, 18, 37 y 4 fallas (en el de TypeORM, el `INSERT` y las fechas ya daban `ok`, como se esperaba) y en verde 86, 34, 27, 107 y 29 chequeos, sin fallas, en la primera corrida después del build. El SQL del solapamiento salió igual al previsto, y las tres zonas horarias cambiaron de verdad el offset (180, −840 y 660 minutos). Los controles del Status dieron `67`, `2`, `67` y `2`.

**Spec que manda:** [`2026-10-20-asignar-planificaciones-design.md`](../specs/2026-10-20-asignar-planificaciones-design.md), §2 (D15 a D24), §4 (las semanas del plan), §5 (convenciones y forma de una asignación), §5.1 (E-13), §7 (fila E-13), §9 (fila BE-18b) y §10.
**Modelo:** ya está en el código desde BE-18 (`8c68c46`): `User_Planification` con `end_date` NOT NULL, sin la cabecera copiada y con `coach_id` y `planification_id` NOT NULL. **Esta tarea no cambia ninguna entidad**, así que no toca `Db Creator` ni el diagrama.
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde dice que BE-18 es E-13 con transacción, `User_Routine` y cabecera copiada, manda la spec: E-13 es BE-18b, una sola escritura y sin copiar nada.

**Goal:** que `POST /planification/user/assign` deje de colgar y cree la asignación de una plantilla a un alumno, con el fin calculado de la plantilla cuando no viene y el aviso de solapamiento con confirmación.

**Architecture:** un DTO de entrada, uno de respuesta (la forma de una asignación, que BE-19 reutiliza), un archivo de funciones puras para las cuentas de semanas (§4 de la spec) y el método `assignPlanificationToUser` en `PlanificationService`, con la consulta de solapamiento en un query builder. El módulo suma `User` y `Coach` a su `forFeature`. E-13 pasa de 🔵 a ✅.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` · scripts de Node en el scratchpad, adaptados de los de BE-11 a BE-18.

---

## 1. Hallazgos al preparar el plan (lo que la spec no dice)

**Decididos con el usuario el 21/10:**

1. **Un coach con su fila de `Coach` dada de baja recibe el mismo `403`** que uno sin fila (`Tu usuario no está registrado como entrenador.`). Es alcanzable con el mismo bug de BE-27: `promote_user` sobre un ex-coach cambia el rol a `coach` **antes** de reactivar la fila (`coach.service.ts:70-77`), y si ese guardado falla queda rol `coach` con `Coach.active = false`. La FK no lo frena, así que sin el chequeo la asignación quedaría a nombre de un coach dado de baja.
2. **Si el fin por defecto cae después del 9999-12-31, `400`** `La fecha de fin calculada queda fuera del calendario: indicá la fecha de fin.`, justo después del de duración 0. Es un **tope técnico**, como `INTEGER_MAX` en `duration` (`planification_limits.ts`): el DTO acepta duraciones de hasta ~2.100 millones de semanas, y con eso (o con un inicio en el año 9999) no hay un día `YYYY-MM-DD` y la cuenta tiraría un `500`. Con un `end_date` explícito se asigna igual.

**Decisiones del plan (se pueden vetar al aprobarlo):**

3. **Los textos de error que la spec no fija**, en el estilo de E-19:
   - `400` `La fecha de fin no puede ser anterior a la de inicio.`
   - `400` `La planificación está dada de baja y no puede asignarse a un alumno.`
   - `400` `La planificación no tiene rutinas vigentes: asignale rutinas antes de asignarla a un alumno.`
   - `400` `La planificación sólo puede asignarse a un alumno.` y `La cuenta del alumno está cerrada: no se le puede asignar una planificación.` (los de E-19, con "planificación").
   - `404` `Planificación no encontrada` y `Usuario no encontrado` (los que ya existen). `500` `Error al asignar la planificación.`
4. **"Rutina vigente" es el vínculo activo** (`Routine_Asignation.active`), sin mirar si la rutina misma está de baja. Es el criterio de `routine_count` (E-08) y el de §5.4 de la spec: una rutina dada de baja (E-18) dentro de un plan se sigue viendo y ejecutando.
5. **El orden de `overlapping` en el `409` es el del listado de §5.3**: `start_date` descendente y después `created_at` descendente (de la más nueva a la más vieja). Así BE-19 reutiliza la misma consulta y el web no ve dos órdenes distintos.
6. **Con `confirm_overlap: true` la consulta de solapamiento ni se hace.** El resultado es el mismo (se crea y conviven) y se ahorra una consulta.
7. **`coach_note` vacía (`''`) es `400`**, como `Routine.coach_note` en E-16 (`@IsOptional() @IsNotEmpty()`). Para no dejar nota, se omite. La nota de la asignación no se edita (D22), así que no hace falta la cadena vacía para borrar.
8. **Las cuentas de semanas van en `power-app/src/planification/plan_weeks.ts`**: funciones puras, sin Nest. BE-20 (el home del plan, en `routine/`) va a necesitar las mismas cuentas; importar un archivo de funciones no crea una dependencia entre módulos de Nest (D27), y si al llegar ahí conviene moverlo, se mueve.

**Hallazgos técnicos:**

9. **El build no detecta que al módulo le falten `User` y `Coach`.** Sin ellos en el `forFeature`, Nest no puede inyectar los repositorios y **el server no arranca**, pero `nest build` compila igual. Como no se levanta el server, lo atrapa un script (Tarea 1, `verify-assign-plan-typeorm.js`): que cada repositorio que el service inyecta esté provisto por el módulo.
10. **El build tampoco detecta un campo NOT NULL sin cargar.** `repository.create({...})` acepta un `DeepPartial`, así que olvidarse `end_date` o `coach_id` compila y fallaría recién en la base. Lo atrapa el script de reglas, que mira lo que se guarda.
11. **Las fechas se comparan como texto.** `end_date < start_date` sobre strings `YYYY-MM-DD` es correcto porque `IsCalendarDay` exige años de 4 dígitos. Las cuentas de semanas se hacen en UTC sobre el string (spec §4), y el script las prueba en tres zonas horarias (Node toma `process.env.TZ` en caliente: verificado al escribir el plan, con offsets 180, −840 y 660).
12. **Los ids que se guardan salen de las filas leídas**, no del body: el iOS manda los UUID en mayúscula. Mismo criterio que E-19. `coach_id` es el id de la fila de `Coach`, que es el del token.
13. **El admin recibe el `403` del `RolesGuard`** (`Acceso denegado. Permisos insuficientes.`), porque la ruta pasa a `@Auth(UserRole.coach)` (D20). El `403` nuevo es sólo el del coach sin su fila.
14. **Las asignaciones que se pisan pueden ser de una plantilla dada de baja**: igual aparecen en el `409`, con su `planification.active: false`. La baja de una plantilla no saca lo ya asignado.
15. **Los porcentajes por rol del Status están desalineados desde antes:** el encabezado del informe dice `Rol Usuario (20 CU · 68%)` (la tabla dice 89%) y el dashboard tiene `Rol Usuario … 68%` y `Rol Entrenador … 88%` en los títulos de sección (las tarjetas dicen 89% y 94%). Como esta tarea mueve el porcentaje del Entrenador, el plan alinea los cuatro con las tablas (Tarea 8).

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/planification/plan_weeks.ts` | **Nuevo:** `mondayOf` y `defaultPlanEndDate` (spec §4) |
| `power-app/src/dtos/planification/assign_planification_to_user.dto.ts` | **Nuevo:** el body de E-13 |
| `power-app/src/dtos/planification/user_planification_response.dto.ts` | **Nuevo:** la forma de una asignación, su cabecera de plantilla y el cuerpo del `409` |
| `power-app/src/planification/planification.service.ts` | Tres repositorios más en el constructor, `assignPlanificationToUser`, `findOverlappingAssignments` y `buildUserPlanificationResponse` |
| `power-app/src/planification/planification.module.ts` | `User` y `Coach` en el `forFeature` |
| `power-app/src/planification/planification.controller.ts` | El handler de `/user/assign` (sólo coach, DTO real, `@CurrentUser`, Swagger) y los imports |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | Entrada del 21/10, E-13 a ✅, conteos |

`Db Creator` **no cambia**: ninguna entidad cambia y ningún generador inserta en `User_Planification` (eso es BE-21).

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**: este plan y `Use Cases/entrenador/CU-E-13-asignar-planificacion-a-alumno.md`.

**Scratchpad** (`C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/418e3405-ede5-42a7-ac2f-fdf55079a34c/scratchpad/be18b/`, fuera de los repos): `lib.js` y cinco scripts nuevos.

---

## 3. Cobertura de la spec

| Spec | Qué pide | Tarea |
|---|---|---|
| §5.1 body | `{ planification_id, user_id, start_date, end_date?, coach_note?, confirm_overlap? }`, días con `IsCalendarDay`, nota ≤ 100 | 3 |
| §5.1 validaciones | Las nueve, en orden: fechas, coach sin fila, plantilla inexistente, de baja, sin rutinas, duración 0 sin fin, usuario inexistente, no alumno o cerrado, solapamiento | 4 |
| §5.1 `409` | `{ error, overlapping: [<asignación>] }`, sólo asignaciones **activas**, rangos inclusivos, salvo `confirm_overlap: true` | 4 |
| §5.1 `201` | La asignación creada, una sola escritura, sin transacción | 4 |
| §4 | Lunes de inicio, fin por defecto = lunes + 7·duration − 1, cuentas en UTC sobre el string | 2 |
| §5 forma | `{ id, user_id, coach_id, planification_id, start_date, end_date, coach_note, active, created_at, updated_at, planification: { id, name, duration, active } }`, sin estado calculado | 3, 4 |
| §5 convenciones | ids en minúscula, `await` en el handler, `403` sin el texto de la cuenta deshabilitada, Swagger con respuesta y códigos | 4, 5 |
| D20 | Sólo el coach; `coach_id` del token | 4, 5 |
| §7 | CU-E-13 reescrito | 7 |
| §10 | build; las cuentas de semanas en un script aparte (cada día de la semana, fin por defecto, fin manual corto y largo, duración 0); el SQL del solapamiento sin base; las reglas con repositorios falsos | 1, 6 |
| §11 | Status con el porqué; el web (B7) tipa contra §5.1 | 8 |
| **No está en la spec** | El `403` con el `Coach` de baja (hallazgo 1) y el `400` del fin fuera del calendario (hallazgo 2) | 1, 2, 4 |

---

## Tarea 0 — Línea de base

**Archivos:** ninguno (lectura y copias al scratchpad).

> **Nota de shell:** el shell no conserva variables entre comandos. Cada bloque que las usa empieza definiéndolas.

- [ ] **Paso 1: los dos repos limpios y el build verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short && git log --oneline -1 && npm --prefix power-app run build
cd "D:/Power App/Docs/PowerApp-Docs" && git status --short
```
Esperado: el backend en `8c68c46` (BE-18) sin cambios y el build sin errores; en docs, sólo este plan (stageado al pedir la aprobación). Si aparece otra cosa, **preguntar** antes de seguir.

- [ ] **Paso 2: la carpeta de scripts y `lib.js`**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/418e3405-ede5-42a7-ac2f-fdf55079a34c/scratchpad/be18b"
OLD_18="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/7d419d17-b37f-4bfa-a013-5aa81b6951fe/scratchpad/be18"
mkdir -p "$SCRATCH" && cp "$OLD_18/lib.js" "$SCRATCH"/ && ls "$SCRATCH"
```

Si `$OLD_18` ya no existe, crear `$SCRATCH/lib.js` con este contenido:

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

---

## Tarea 1 — Scripts de verificación, en rojo

**Archivos:** sólo el scratchpad (`$SCRATCH`). Cinco scripts, todos sobre el código compilado (`power-app/dist`).

- [ ] **Paso 1: `verify-plan-weeks.js`** — las cuentas de §4, en tres zonas horarias.

```js
const { dist, check, run, finish } = require('./lib');

// Las cuentas no pueden depender de la zona del servidor: se repiten en tres zonas. Node toma el
// cambio de process.env.TZ en caliente (verificado al escribir el plan: offsets 180, -840 y 660)
const ZONES = ['America/Argentina/Buenos_Aires', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'];

(async () => {
  let W;
  await run('carga el módulo', async () => {
    W = dist('planification/plan_weeks');
    check('exporta mondayOf', typeof W.mondayOf === 'function');
    check('exporta defaultPlanEndDate', typeof W.defaultPlanEndDate === 'function');
  });
  if (!W || typeof W.mondayOf !== 'function' || typeof W.defaultPlanEndDate !== 'function') return finish();

  const eq = (name, actual, expected) => check(name, actual === expected, String(actual));
  // La semana del ejemplo de la spec (§4): del lunes 19 al domingo 25 de octubre de 2026
  const WEEK = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];

  for (const zone of ZONES) {
    process.env.TZ = zone;
    console.log(`\n== TZ ${zone} (offset ${new Date(2026, 9, 22).getTimezoneOffset()} min)`);

    console.log('-- el lunes de la semana (D16)');
    for (const day of WEEK) eq(`${day} → 2026-10-19`, W.mondayOf(day), '2026-10-19');
    eq('el lunes siguiente empieza otra semana', W.mondayOf('2026-10-26'), '2026-10-26');
    eq('cruza el año (jueves 1/1/2026 → lunes 29/12/2025)', W.mondayOf('2026-01-01'), '2025-12-29');
    eq('29 de febrero bisiesto (martes) → 2028-02-28', W.mondayOf('2028-02-29'), '2028-02-28');
    eq('domingo del cambio de hora europeo (29/3/2026) → 2026-03-23', W.mondayOf('2026-03-29'), '2026-03-23');
    eq('el primer día del calendario es lunes', W.mondayOf('0001-01-01'), '0001-01-01');

    console.log('-- el fin por defecto (D17): el domingo de la semana duration');
    for (const day of WEEK) eq(`${day}, 4 semanas → 2026-11-15 (ejemplo de la spec)`, W.defaultPlanEndDate(day, 4), '2026-11-15');
    eq('1 semana: el domingo de la misma semana', W.defaultPlanEndDate('2026-10-22', 1), '2026-10-25');
    eq('arrancando un domingo con 1 semana: ese mismo día', W.defaultPlanEndDate('2026-10-25', 1), '2026-10-25');
    eq('52 semanas, cruzando el año', W.defaultPlanEndDate('2026-10-22', 52), '2027-10-17');
    eq('cruza un 29 de febrero', W.defaultPlanEndDate('2028-02-21', 2), '2028-03-05');
    eq('inicio pasado (miércoles 8/1/2020, 4 semanas)', W.defaultPlanEndDate('2020-01-08', 4), '2020-02-02');

    console.log('-- tope técnico: después del 9999-12-31 no hay día YYYY-MM-DD');
    eq('el último domingo que entra', W.defaultPlanEndDate('9999-12-20', 1), '9999-12-26');
    eq('una semana más → null', W.defaultPlanEndDate('9999-12-20', 2), null);
    eq('arrancando el 9999-12-31 → null', W.defaultPlanEndDate('9999-12-31', 1), null);
    await run('duration = INTEGER_MAX → null, sin lanzar', async () => {
      eq('INTEGER_MAX → null', W.defaultPlanEndDate('2026-10-22', 2147483647), null);
    });
  }

  finish();
})();
```

El fin manual (corto, largo, que no es domingo) y la duración 0 no son cuentas: se guardan tal cual o dan `400`. Los prueba el script de reglas (paso 4).

- [ ] **Paso 2: `verify-assign-plan-dto.js`** — el body, con la misma configuración del `ValidationPipe` de `main.ts`.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

// La misma configuracion que main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const PLAN = '5a5a5a5a-1111-4222-8333-444444444444';
const USER = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const MIN = { planification_id: PLAN, user_id: USER, start_date: '2026-10-22' };

(async () => {
  let Body;

  await run('carga el DTO', async () => {
    ({ AssignPlanificationToUserDto: Body } = dist('dtos/planification/assign_planification_to_user.dto'));
    check('exporta AssignPlanificationToUserDto', typeof Body === 'function');
  });

  if (!Body) return finish();

  const transform = (value) => pipe.transform(value, { type: 'body', metatype: Body });

  const accepts = (name, value, expected) => run(name, async () => {
    const out = await transform({ ...value });
    check(name, out instanceof Body && Object.entries(expected).every(([k, v]) => out[k] === v), JSON.stringify(out));
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

  console.log('-- acepta');
  await accepts('lo mínimo: plantilla, alumno e inicio', MIN, { ...MIN, end_date: undefined, coach_note: undefined, confirm_overlap: undefined });
  await accepts('con todo', { ...MIN, end_date: '2026-11-15', coach_note: 'Foco en técnica', confirm_overlap: true },
    { end_date: '2026-11-15', coach_note: 'Foco en técnica', confirm_overlap: true });
  await accepts('ids en mayúscula (iOS)', { ...MIN, planification_id: PLAN.toUpperCase(), user_id: USER.toUpperCase() },
    { planification_id: PLAN.toUpperCase(), user_id: USER.toUpperCase() });
  await accepts('end_date null (equivale a no mandarlo)', { ...MIN, end_date: null }, { end_date: null });
  await accepts('end_date igual al inicio', { ...MIN, end_date: '2026-10-22' }, { end_date: '2026-10-22' });
  await accepts('end_date anterior al inicio: el DTO lo deja pasar (el 400 es del service, con su texto)', { ...MIN, end_date: '2026-10-01' }, { end_date: '2026-10-01' });
  await accepts('coach_note de exactamente 100', { ...MIN, coach_note: 'x'.repeat(100) }, { coach_note: 'x'.repeat(100) });
  await accepts('confirm_overlap false', { ...MIN, confirm_overlap: false }, { confirm_overlap: false });
  await accepts('inicio en un 29 de febrero bisiesto', { ...MIN, start_date: '2028-02-29' }, { start_date: '2028-02-29' });

  console.log('\n-- rechaza');
  await rejects('sin planification_id', { user_id: USER, start_date: '2026-10-22' });
  await rejects('sin user_id', { planification_id: PLAN, start_date: '2026-10-22' });
  await rejects('sin start_date', { planification_id: PLAN, user_id: USER });
  await rejects('planification_id no es UUID', { ...MIN, planification_id: 'abc' }, 'planificación');
  await rejects('user_id no es UUID', { ...MIN, user_id: 'abc' }, 'usuario');
  await rejects('start_date con hora', { ...MIN, start_date: '2026-10-22T10:00:00Z' }, 'YYYY-MM-DD');
  await rejects('start_date como dd-mm-yyyy', { ...MIN, start_date: '22-10-2026' }, 'YYYY-MM-DD');
  await rejects('start_date que no existe (30 de febrero)', { ...MIN, start_date: '2026-02-30' }, 'YYYY-MM-DD');
  await rejects('end_date con hora', { ...MIN, end_date: '2026-11-15T00:00:00Z' }, 'YYYY-MM-DD');
  await rejects('end_date que no es texto', { ...MIN, end_date: 20261115 }, 'YYYY-MM-DD');
  await rejects('coach_note de 101', { ...MIN, coach_note: 'x'.repeat(101) }, '100');
  await rejects('coach_note vacía (para no dejar nota, se omite)', { ...MIN, coach_note: '' });
  await rejects('coach_note que no es texto', { ...MIN, coach_note: 5 });
  await rejects('confirm_overlap como texto', { ...MIN, confirm_overlap: 'true' });
  await rejects('campo de más: description (la cabecera sale de la plantilla, D18)', { ...MIN, description: 'x' });
  await rejects('campo de más: coach_id (sale del token, D20)', { ...MIN, coach_id: USER });

  finish();
})();
```

- [ ] **Paso 3: `verify-assign-plan-controller.js`** — ruta, rol, argumentos, `await` y Swagger, sin levantar nada.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { SwaggerModule, DocumentBuilder } = mod('@nestjs/swagger');
const { PlanificationController } = dist('planification/planification.controller');
const { PlanificationService } = dist('planification/planification.service');
const { JwtAuthGuard } = dist('authentication/guards/jwt-auth.guard');
const { RolesGuard } = dist('authentication/guards/roles.guard');
const { OwnerGuard } = dist('authentication/guards/owner.guard');
const { OWNER_PARAM_KEY } = dist('authentication/decorators/owner.decorator');
const { UserRole } = dist('entities/user.entity');

const POST = 1;
const allow = { canActivate: () => true };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const seen = { assign: null };
  const stub = {
    assignPlanificationToUser: async (...args) => { await new Promise(r => setTimeout(r, 20)); seen.assign = args; return 'RESPONSE'; },
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [PlanificationController],
    providers: [{ provide: PlanificationService, useValue: stub }],
  })
    .overrideGuard(JwtAuthGuard).useValue(allow)
    .overrideGuard(RolesGuard).useValue(allow)
    .overrideGuard(OwnerGuard).useValue(allow)
    .compile();

  const controller = moduleRef.get(PlanificationController);
  const handler = PlanificationController.prototype.assignPlanificationToUser;

  console.log('-- ruta, verbo y rol');
  await run('assignPlanificationToUser: ruta, verbo y rol', async () => {
    check('existe', typeof handler === 'function');
    check('ruta /user/assign', Reflect.getMetadata('path', handler) === '/user/assign', Reflect.getMetadata('path', handler));
    check('POST', Reflect.getMetadata('method', handler) === POST, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('sólo el coach (D20)', Array.isArray(roles) && roles.length === 1 && roles[0] === UserRole.coach, JSON.stringify(roles));
    check('sin @Owner', Reflect.getMetadata(OWNER_PARAM_KEY, handler) === undefined);
  });

  console.log('\n-- argumentos y await');
  await run('pasa el body, el usuario del token y el response; espera sin devolver el Response', async () => {
    const body = { planification_id: 'p1', user_id: 'u1', start_date: '2026-10-22' };
    const tokenUser = { id: 'c1', role: UserRole.coach, active: true };
    const res = {};
    const ret = await controller.assignPlanificationToUser(body, tokenUser, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('esperó al service', seen.assign !== null);
    check('body', seen.assign && seen.assign[0] === body);
    check('usuario del token', seen.assign && seen.assign[1] === tokenUser);
    check('response', seen.assign && seen.assign[2] === res);
  });

  console.log('\n-- Swagger');
  await run('el documento declara el body, el 201 y los errores', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const post = (doc.paths['/planification/user/assign'] || {}).post;
    const refOf = (r) => (r && r.content && r.content['application/json'].schema.$ref) || '';

    check('POST /planification/user/assign está en el documento', !!post);
    if (post) {
      for (const code of ['201', '400', '403', '404', '409']) check(`declara ${code}`, !!post.responses[code], Object.keys(post.responses).join(','));
      check('el 201 es UserPlanificationResponseDto', refOf(post.responses['201']).endsWith('/UserPlanificationResponseDto'), refOf(post.responses['201']));
      check('el 409 es AssignPlanificationOverlapResponseDto', refOf(post.responses['409']).endsWith('/AssignPlanificationOverlapResponseDto'), refOf(post.responses['409']));
      check('el body es AssignPlanificationToUserDto', ((post.requestBody && post.requestBody.content['application/json'].schema.$ref) || '').endsWith('/AssignPlanificationToUserDto'));
      check('pide token', Array.isArray(post.security) && post.security.some(s => 'bearer' in s));
    }

    const S = doc.components.schemas;
    const body = S.AssignPlanificationToUserDto;
    check('el body exige plantilla, alumno e inicio',
      body && ['planification_id', 'user_id', 'start_date'].every(k => (body.required || []).includes(k)), JSON.stringify(body && body.required));
    check('el body deja opcionales end_date, coach_note y confirm_overlap',
      body && ['end_date', 'coach_note', 'confirm_overlap'].every(k => k in body.properties && !(body.required || []).includes(k)));
    check('coach_note documenta su máximo de 100', body && body.properties.coach_note && body.properties.coach_note.maxLength === 100);

    const KEYS = ['id', 'user_id', 'coach_id', 'planification_id', 'start_date', 'end_date', 'coach_note', 'active', 'created_at', 'updated_at', 'planification'];
    const resp = S.UserPlanificationResponseDto;
    check('la respuesta documenta la forma de una asignación', resp && same(Object.keys(resp.properties), KEYS), resp && Object.keys(resp.properties).join(','));
    const sub = S.UserPlanificationPlanificationDto;
    check('la cabecera de la plantilla: id, name, duration y active', sub && same(Object.keys(sub.properties), ['id', 'name', 'duration', 'active']), sub && Object.keys(sub.properties).join(','));
    const overlap = S.AssignPlanificationOverlapResponseDto;
    check('el 409 documenta error y overlapping (array de asignaciones)',
      overlap && 'error' in overlap.properties && overlap.properties.overlapping && overlap.properties.overlapping.type === 'array'
      && (overlap.properties.overlapping.items.$ref || '').endsWith('/UserPlanificationResponseDto'), JSON.stringify(overlap && overlap.properties.overlapping));

    check('lo de E-08 a E-12d sigue en el documento',
      ['/planification/all', '/planification/create', '/planification/routine/assign', '/planification/routine/set-active-bulk'].every(p => !!doc.paths[p]));
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 4: `verify-assign-plan-rules.js`** — las reglas de §5.1, con repositorios falsos y la consulta de solapamiento real (el query builder del service sobre un `DataSource` sin conexión, como en BE-16).

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, SelectQueryBuilder, QueryFailedError, getMetadataArgsStorage } = mod('typeorm');
const { RawSqlResultsToEntityTransformer } = require(path.join(ROOT, 'node_modules/typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer'));
const { PlanificationService } = dist('planification/planification.service');
const { UserRole } = dist('entities/user.entity');

const COACH_ID = 'c0c0c0c0-1111-4222-8333-444444444444';
const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const PLAN_ID = '5a5a5a5a-1111-4222-8333-444444444444';
const NEW_ID = '9e9e9e9e-1111-4222-8333-444444444444';
const INTEGER_MAX = 2147483647;
const NOW = new Date('2026-10-21T15:00:00Z');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Para comparar objetos sin depender del orden de las claves (ni de las que valen undefined)
const sorted = (o) => Object.keys(o).sort().reduce((acc, k) => (o[k] === undefined ? acc : { ...acc, [k]: o[k] }), {});

const MSG = {
  endBeforeStart: 'La fecha de fin no puede ser anterior a la de inicio.',
  notCoach: 'Tu usuario no está registrado como entrenador.',
  planNotFound: 'Planificación no encontrada',
  planInactive: 'La planificación está dada de baja y no puede asignarse a un alumno.',
  noRoutines: 'La planificación no tiene rutinas vigentes: asignale rutinas antes de asignarla a un alumno.',
  endRequired: 'La planificación no tiene duración fija: indicá la fecha de fin.',
  endOutOfRange: 'La fecha de fin calculada queda fuera del calendario: indicá la fecha de fin.',
  userNotFound: 'Usuario no encontrado',
  notStudent: 'La planificación sólo puede asignarse a un alumno.',
  closedAccount: 'La cuenta del alumno está cerrada: no se le puede asignar una planificación.',
  overlap: 'El alumno ya tiene una planificación en esas fechas. Reenviá con confirm_overlap: true para asignarla igual.',
  assign500: 'Error al asignar la planificación.',
  disabled: 'La cuenta está deshabilitada.',
};
const KEYS = ['id', 'user_id', 'coach_id', 'planification_id', 'start_date', 'end_date', 'coach_note', 'active', 'created_at', 'updated_at', 'planification'];

const coachUser = { id: COACH_ID, role: UserRole.coach, active: true };
const BODY = { planification_id: PLAN_ID, user_id: USER_ID, start_date: '2026-10-22' };
const planRow = (over = {}) => ({ id: PLAN_ID, name: 'Fuerza 4 semanas', duration: 4, active: true, ...over });
const studentRow = (over = {}) => ({ id: USER_ID, role: UserRole.user, active: true, ...over });

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

// Una fila CRUDA de la consulta de solapamiento, como la devolveria Postgres (los alias son los del
// SELECT). Los DATE llegan como Date en medianoche local, que es lo que entrega pg, y TypeORM los
// hidrata como 'YYYY-MM-DD'
function rawOverlap({ id, start, end, note = null, plan = { id: 'p-otra', name: 'Hipertrofia', duration: 6, active: false } }) {
  const day = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  return {
    userPlanification_id: id, userPlanification_user_id: USER_ID, userPlanification_coach_id: 'c-otro',
    userPlanification_planification_id: plan.id, userPlanification_coach_note: note,
    userPlanification_start_date: day(start), userPlanification_end_date: day(end), userPlanification_active: true,
    userPlanification_created_at: NOW, userPlanification_updated_at: NOW,
    planification_id: plan.id, planification_name: plan.name, planification_duration: plan.duration, planification_active: plan.active,
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
  // DataSource REAL pero sin conectarse: la consulta de solapamiento la arma el service con el
  // query builder de verdad, y aca se intercepta su ejecucion
  const dir = path.join(ROOT, 'dist/entities');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) require(path.join(dir, file));
  const entities = getMetadataArgsStorage().tables.map(t => t.target).filter(t => typeof t === 'function');
  const ds = new DataSource({ type: 'postgres', entities });
  await ds.buildMetadatas();
  const { UserPlanification } = dist('entities/user_planification.entity');
  const realRepository = ds.getRepository(UserPlanification);

  let state = null;

  // Se guarda el SQL con sus parametros y las filas CRUDAS del caso pasan por el transformador REAL
  // de TypeORM (el mismo que usa getMany): asi se prueba tambien la hidratacion
  SelectQueryBuilder.prototype.getMany = async function () {
    const [sql, params] = this.getQueryAndParameters();
    state.ops.push('overlap.getMany');
    state.queries.push({ sql, params });
    if (state.cfg.overlapError) throw state.cfg.overlapError;
    const transformer = new RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, [], [], undefined);
    return transformer.transform(state.cfg.overlap || [], this.expressionMap.mainAlias);
  };

  function build(cfg = {}) {
    state = { cfg, ops: [], queries: [], args: {}, saved: [] };

    const planificationRepository = {
      findOne: async (o) => { state.ops.push('planification.findOne'); state.args.planification = o; return 'plan' in cfg ? cfg.plan : planRow(); },
    };
    const routineAsignationRepository = {
      exists: async (o) => { state.ops.push('routineAsignation.exists'); state.args.routines = o; return 'hasRoutines' in cfg ? cfg.hasRoutines : true; },
    };
    // Es una sola escritura: si el service abriera una transaccion, se veria aca
    const dataSource = { createQueryRunner: () => { state.ops.push('queryRunner'); throw new Error('no debería abrir una transacción'); } };
    const userPlanificationRepository = {
      createQueryBuilder: (alias) => realRepository.createQueryBuilder(alias),
      create: (d) => ({ ...d }),
      save: async (e) => {
        state.ops.push('userPlanification.save');
        state.saved.push({ ...e });
        if (cfg.saveError) throw cfg.saveError;
        // Lo que completa el RETURNING de Postgres: el id, el active por defecto y las marcas de tiempo
        return { ...e, id: NEW_ID, active: true, created_at: NOW, updated_at: NOW };
      },
    };
    const userRepository = {
      findOne: async (o) => { state.ops.push('user.findOne'); state.args.user = o; return 'user' in cfg ? cfg.user : studentRow(); },
    };
    const coachRepository = {
      findOne: async (o) => { state.ops.push('coach.findOne'); state.args.coach = o; return 'coach' in cfg ? cfg.coach : { id: COACH_ID, active: true }; },
    };

    // Mismo orden que el constructor: los 4 de antes (planification, routine, routineAsignation,
    // dataSource) y los 3 de BE-18b (userPlanification, user, coach)
    return new PlanificationService(planificationRepository, {}, routineAsignationRepository, dataSource, userPlanificationRepository, userRepository, coachRepository);
  }

  async function assign(cfg = {}, body = {}, user = coachUser) {
    const service = build(cfg);
    const res = makeRes();
    await service.assignPlanificationToUser({ ...BODY, ...body }, user, res);
    return { res, ops: [...state.ops], st: state };
  }

  console.log('-- E-13 · el orden de las validaciones (spec §5.1)');

  await run('el método existe', async () => {
    check('assignPlanificationToUser es función', typeof build().assignPlanificationToUser === 'function');
  });

  await run('end_date anterior a start_date → 400 sin tocar la base', async () => {
    const r = await assign({}, { end_date: '2026-10-21' });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.endBeforeStart }), JSON.stringify(r.res.body));
    check('ninguna consulta', r.ops.length === 0, r.ops.join(','));
  });

  await run('orden: end_date anterior y coach sin fila → gana el 400 de las fechas', async () => {
    const r = await assign({ coach: null }, { end_date: '2026-10-21' });
    check('mensaje de las fechas', r.res.body && r.res.body.error === MSG.endBeforeStart, JSON.stringify(r.res.body));
  });

  await run('coach sin fila en Coach → 403, sin seguir', async () => {
    const r = await assign({ coach: null });
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.notCoach }), JSON.stringify(r.res.body));
    check('no es el texto de la cuenta deshabilitada', !!r.res.body && r.res.body.error !== MSG.disabled);
    check('sólo buscó al coach', same(r.ops, ['coach.findOne']), r.ops.join(','));
    check('lo buscó por el id del token', r.st.args.coach && r.st.args.coach.where.id === COACH_ID, JSON.stringify(r.st.args.coach));
  });

  await run('coach con la fila dada de baja → el mismo 403 (decisión del 21/10)', async () => {
    const r = await assign({ coach: { id: COACH_ID, active: false } });
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.notCoach }), JSON.stringify(r.res.body));
    check('sólo buscó al coach', same(r.ops, ['coach.findOne']), r.ops.join(','));
  });

  await run('orden: coach sin fila y plantilla inexistente → gana el 403', async () => {
    const r = await assign({ coach: null, plan: null });
    check('estado 403', r.res.statusCode === 403, r.res.statusCode);
  });

  await run('plantilla inexistente → 404', async () => {
    const r = await assign({ plan: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.planNotFound }), JSON.stringify(r.res.body));
    check('coach y plantilla, nada más', same(r.ops, ['coach.findOne', 'planification.findOne']), r.ops.join(','));
    check('la buscó por el id del body', r.st.args.planification && r.st.args.planification.where.id === PLAN_ID);
    check('con la cabecera mínima', r.st.args.planification && same(Object.keys(r.st.args.planification.select || {}).sort(), ['active', 'duration', 'id', 'name']),
      JSON.stringify(r.st.args.planification && r.st.args.planification.select));
  });

  await run('plantilla dada de baja → 400 sin mirar sus rutinas', async () => {
    const r = await assign({ plan: planRow({ active: false }), hasRoutines: false });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje (gana al de "sin rutinas")', same(r.res.body, { error: MSG.planInactive }), JSON.stringify(r.res.body));
    check('no miró las rutinas', !r.ops.includes('routineAsignation.exists'), r.ops.join(','));
  });

  await run('plantilla sin rutinas vigentes → 400 sin buscar al alumno', async () => {
    const r = await assign({ hasRoutines: false });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.noRoutines }), JSON.stringify(r.res.body));
    check('vigente = vínculo activo de esa plantilla', r.st.args.routines && same(r.st.args.routines.where, { planification_id: PLAN_ID, active: true }),
      JSON.stringify(r.st.args.routines && r.st.args.routines.where));
    check('no buscó al alumno', !r.ops.includes('user.findOne'), r.ops.join(','));
  });

  await run('duración 0 sin end_date → 400 con el texto de la spec', async () => {
    const r = await assign({ plan: planRow({ duration: 0 }), user: null });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje (gana al 404 del alumno)', same(r.res.body, { error: MSG.endRequired }), JSON.stringify(r.res.body));
    check('no buscó al alumno', !r.ops.includes('user.findOne'), r.ops.join(','));
  });

  await run('duración 0 con end_date null → 400 (null es no mandarlo)', async () => {
    const r = await assign({ plan: planRow({ duration: 0 }) }, { end_date: null });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.endRequired }), JSON.stringify(r.res.body));
  });

  await run('fin por defecto después del 9999-12-31 → 400 sin buscar al alumno (decisión del 21/10)', async () => {
    const r = await assign({ plan: planRow({ duration: INTEGER_MAX }) });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.endOutOfRange }), JSON.stringify(r.res.body));
    check('no buscó al alumno', !r.ops.includes('user.findOne'), r.ops.join(','));
  });

  await run('alumno inexistente → 404', async () => {
    const r = await assign({ user: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.userNotFound }), JSON.stringify(r.res.body));
    check('ops', same(r.ops, ['coach.findOne', 'planification.findOne', 'routineAsignation.exists', 'user.findOne']), r.ops.join(','));
    check('lo buscó por el id del body', r.st.args.user && r.st.args.user.where.id === USER_ID);
  });

  for (const role of [UserRole.coach, UserRole.admin]) {
    await run(`destinatario con rol ${role} → 400 sin consultar el solapamiento`, async () => {
      const r = await assign({ user: studentRow({ role }) });
      check('estado 400', r.res.statusCode === 400, r.res.statusCode);
      check('mensaje', same(r.res.body, { error: MSG.notStudent }), JSON.stringify(r.res.body));
      check('no consultó ni guardó', !r.ops.includes('overlap.getMany') && !r.ops.includes('userPlanification.save'), r.ops.join(','));
    });
  }

  await run('alumno con la cuenta cerrada → 400', async () => {
    const r = await assign({ user: studentRow({ active: false }) });
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.closedAccount }), JSON.stringify(r.res.body));
    check('no guardó', !r.ops.includes('userPlanification.save'), r.ops.join(','));
  });

  console.log('\n-- E-13 · el fin (spec §4 y D17)');

  await run('sin end_date: el domingo de la semana duration (jueves 22/10, 4 semanas → 15/11)', async () => {
    const r = await assign();
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('guardó 2026-11-15', r.st.saved[0] && r.st.saved[0].end_date === '2026-11-15', JSON.stringify(r.st.saved[0]));
    check('lo devuelve', r.res.body && r.res.body.end_date === '2026-11-15');
    check('el inicio queda el día real, no el lunes', r.st.saved[0] && r.st.saved[0].start_date === '2026-10-22');
  });

  await run('arrancando un lunes con 1 semana → el domingo de esa semana', async () => {
    const r = await assign({ plan: planRow({ duration: 1 }) }, { start_date: '2026-10-19' });
    check('fin 2026-10-25', r.st.saved[0] && r.st.saved[0].end_date === '2026-10-25', JSON.stringify(r.st.saved[0]));
  });

  await run('inicio pasado: se acepta (el servidor no calcula "hoy")', async () => {
    const r = await assign({}, { start_date: '2020-01-08' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('fin 2020-02-02', r.st.saved[0] && r.st.saved[0].end_date === '2020-02-02', JSON.stringify(r.st.saved[0]));
  });

  for (const [name, end] of [['más corto que la duración', '2026-10-28'], ['más largo que la duración', '2027-03-31'], ['que no es domingo', '2026-11-11'], ['igual al inicio', '2026-10-22']]) {
    await run(`fin manual ${name}: se guarda tal cual`, async () => {
      const r = await assign({}, { end_date: end });
      check('estado 201', r.res.statusCode === 201, r.res.statusCode);
      check(`guardó ${end}`, r.st.saved[0] && r.st.saved[0].end_date === end, JSON.stringify(r.st.saved[0]));
    });
  }

  await run('duración 0 con end_date → 201 con ese fin', async () => {
    const r = await assign({ plan: planRow({ duration: 0 }) }, { end_date: '2026-12-31' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('guardó 2026-12-31', r.st.saved[0] && r.st.saved[0].end_date === '2026-12-31', JSON.stringify(r.st.saved[0]));
    check('la cabecera trae duration 0', r.res.body && r.res.body.planification && r.res.body.planification.duration === 0);
  });

  await run('fin manual con una duración que lo dejaría fuera del calendario → 201', async () => {
    const r = await assign({ plan: planRow({ duration: INTEGER_MAX }) }, { end_date: '2026-12-31' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
  });

  console.log('\n-- E-13 · solapamiento (D21)');

  await run('se pisa con una activa → 409 con la que se pisa, sin guardar', async () => {
    const r = await assign({ overlap: [rawOverlap({ id: 'up-1', start: '2026-10-05', end: '2026-10-25', note: 'Volver de la lesión' })] });
    check('estado 409', r.res.statusCode === 409, r.res.statusCode);
    const b = r.res.body || {};
    check('error', b.error === MSG.overlap, b.error);
    check('claves del cuerpo', same(Object.keys(b), ['error', 'overlapping']), Object.keys(b).join(','));
    check('una que se pisa', Array.isArray(b.overlapping) && b.overlapping.length === 1, JSON.stringify(b.overlapping));
    const o = (b.overlapping || [])[0] || {};
    check('la forma de una asignación', same(Object.keys(o), KEYS), Object.keys(o).join(','));
    check('fechas como día (hidratadas por TypeORM)', o.start_date === '2026-10-05' && o.end_date === '2026-10-25', `${o.start_date} ${o.end_date}`);
    check('sus datos', o.id === 'up-1' && o.user_id === USER_ID && o.coach_id === 'c-otro' && o.coach_note === 'Volver de la lesión' && o.active === true, JSON.stringify(o));
    check('la cabecera de su plantilla (de baja, igual se muestra)', same(o.planification, { id: 'p-otra', name: 'Hipertrofia', duration: 6, active: false }), JSON.stringify(o.planification));
    check('no guardó', !r.ops.includes('userPlanification.save'), r.ops.join(','));
  });

  await run('dos que se pisan: vienen las dos, en el orden de la consulta', async () => {
    const r = await assign({ overlap: [rawOverlap({ id: 'up-2', start: '2026-11-01', end: '2026-12-31' }), rawOverlap({ id: 'up-1', start: '2026-10-05', end: '2026-10-25' })] });
    check('estado 409', r.res.statusCode === 409, r.res.statusCode);
    check('las dos, en orden', same(((r.res.body || {}).overlapping || []).map(o => o.id), ['up-2', 'up-1']), JSON.stringify(r.res.body));
  });

  await run('confirm_overlap: true → 201 sin consultar el solapamiento', async () => {
    const r = await assign({ overlap: [rawOverlap({ id: 'up-1', start: '2026-10-05', end: '2026-10-25' })] }, { confirm_overlap: true });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('no consultó', !r.ops.includes('overlap.getMany'), r.ops.join(','));
    check('guardó una vez', r.ops.filter(o => o === 'userPlanification.save').length === 1, r.ops.join(','));
  });

  await run('confirm_overlap: false → igual que no mandarlo (409)', async () => {
    const r = await assign({ overlap: [rawOverlap({ id: 'up-1', start: '2026-10-05', end: '2026-10-25' })] }, { confirm_overlap: false });
    check('estado 409', r.res.statusCode === 409, r.res.statusCode);
  });

  await run('sin solapamiento → 201, una sola escritura y sin transacción', async () => {
    const r = await assign({ overlap: [] });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('ops', same(r.ops, ['coach.findOne', 'planification.findOne', 'routineAsignation.exists', 'user.findOne', 'overlap.getMany', 'userPlanification.save']), r.ops.join(','));
  });

  console.log('\n-- E-13 · la consulta de solapamiento (SQL sin base)');

  await run('el alumno, sólo activas, rangos inclusivos, la cabecera mínima y el orden del listado', async () => {
    const r = await assign({}, { user_id: USER_ID.toUpperCase() });
    const q = r.st.queries[0];
    check('se consultó', !!q);
    if (!q) return;
    console.log('        ' + q.sql);
    console.log('        ' + JSON.stringify(q.params));
    check('FROM User_Planification', /FROM "User_Planification" "userPlanification"/.test(q.sql), q.sql);
    check('INNER JOIN a la plantilla', /INNER JOIN "Planification" "planification" ON "planification"\."id"\s*=\s*"userPlanification"\."planification_id"/.test(q.sql));
    check('de la plantilla, sólo id, name, duration y active',
      ['id', 'name', 'duration', 'active'].every(c => q.sql.includes(`"planification"."${c}" AS "planification_${c}"`))
      && !q.sql.includes('"planification"."description"') && !q.sql.includes('"planification"."number_of_routines"'));
    check('filtra por el alumno', /"userPlanification"\."user_id" = \$\d/.test(q.sql));
    check('sólo las activas', /"userPlanification"\."active" = true/.test(q.sql));
    check('empieza antes o el mismo día en que termina la nueva (inclusivo)', /"userPlanification"\."start_date" <= \$\d/.test(q.sql));
    check('termina después o el mismo día en que empieza la nueva (inclusivo)', /"userPlanification"\."end_date" >= \$\d/.test(q.sql));
    check('orden: inicio y alta, de la más nueva a la más vieja',
      /ORDER BY "userPlanification"\."start_date" DESC, "userPlanification"\."created_at" DESC/.test(q.sql), q.sql.slice(q.sql.indexOf('ORDER BY')));
    check('parámetros: el id de la fila del alumno (en minúscula), el fin y el inicio', same(q.params, [USER_ID, '2026-11-15', '2026-10-22']), JSON.stringify(q.params));
  });

  console.log('\n-- E-13 · lo que se guarda y la respuesta (201)');

  await run('guarda lo propio de la asignación, con los ids de las filas y el coach del token', async () => {
    const r = await assign({}, { planification_id: PLAN_ID.toUpperCase(), user_id: USER_ID.toUpperCase(), coach_note: 'Foco en técnica' });
    check('estado 201', r.res.statusCode === 201, r.res.statusCode);
    check('lo guardado', same(sorted(r.st.saved[0] || {}), sorted({ user_id: USER_ID, coach_id: COACH_ID, planification_id: PLAN_ID, start_date: '2026-10-22', end_date: '2026-11-15', coach_note: 'Foco en técnica' })),
      JSON.stringify(r.st.saved[0]));
  });

  await run('sin la cabecera copiada (D18)', async () => {
    const r = await assign();
    const s = r.st.saved[0] || {};
    check('sin description, type ni number_of_routines', !('description' in s) && !('type' in s) && !('number_of_routines' in s), JSON.stringify(s));
  });

  await run('la respuesta: la forma de una asignación (spec §5)', async () => {
    const r = await assign();
    const b = r.res.body || {};
    check('claves', same(Object.keys(b), KEYS), Object.keys(b).join(','));
    check('ids, fechas y estado', b.id === NEW_ID && b.user_id === USER_ID && b.coach_id === COACH_ID && b.planification_id === PLAN_ID
      && b.start_date === '2026-10-22' && b.end_date === '2026-11-15' && b.active === true, JSON.stringify(b));
    check('marcas de tiempo del RETURNING', b.created_at === NOW && b.updated_at === NOW);
    check('coach_note null si no vino', b.coach_note === null, String(b.coach_note));
    check('cabecera de la plantilla', same(b.planification, { id: PLAN_ID, name: 'Fuerza 4 semanas', duration: 4, active: true }), JSON.stringify(b.planification));
  });

  await run('plantilla sin nombre → name null', async () => {
    const r = await assign({ plan: planRow({ name: undefined }) });
    check('name null', r.res.body && r.res.body.planification && r.res.body.planification.name === null, JSON.stringify(r.res.body && r.res.body.planification));
  });

  console.log('\n-- E-13 · errores de la base');

  await run('falla el guardado → 500 y se loguea', async () => {
    let r;
    const logged = await silencing(async () => { r = await assign({ saveError: new QueryFailedError('SQL', [], new Error('se cayó la base')) }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.assign500 }), JSON.stringify(r.res.body));
    check('console.error', logged === 1, logged);
  });

  await run('falla la consulta de solapamiento → 500', async () => {
    let r;
    await silencing(async () => { r = await assign({ overlapError: new Error('se cayó la base') }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.assign500 }), JSON.stringify(r.res.body));
  });

  finish();
})();
```

- [ ] **Paso 5: `verify-assign-plan-typeorm.js`** — el `INSERT`, las fechas como día y que el módulo provea lo que el service inyecta (hallazgo 9).

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, getMetadataArgsStorage } = mod('typeorm');
const { getRepositoryToken } = mod('@nestjs/typeorm');

(async () => {
  // Registrar las entidades compiladas y armar el DataSource SIN conectarse
  const dir = path.join(ROOT, 'dist/entities');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) require(path.join(dir, file));
  const entities = getMetadataArgsStorage().tables.map(t => t.target).filter(t => typeof t === 'function');
  const ds = new DataSource({ type: 'postgres', entities });
  await ds.buildMetadatas();

  const { UserPlanification } = dist('entities/user_planification.entity');
  const { User } = dist('entities/user.entity');
  const { Coach } = dist('entities/coach.entity');
  const { RoutineAsignation } = dist('entities/routine_asignation.entity');
  const meta = ds.getMetadata(UserPlanification);

  await run('el INSERT de la asignación carga lo propio y devuelve id, active, created_at y updated_at', async () => {
    // getQuery() suelto no trae RETURNING: InsertQueryBuilder.execute() lo arma con
    // getInsertionReturningColumns() justo antes. Se reproduce ese paso para ver lo que mandaria save()
    const qb = ds.createQueryBuilder().insert().into(UserPlanification)
      .values({ user_id: 'u', coach_id: 'c', planification_id: 'p', start_date: '2026-10-22', end_date: '2026-11-15', coach_note: 'nota' });
    qb.expressionMap.extraReturningColumns = meta.getInsertionReturningColumns();
    const sql = qb.getQuery();
    console.log('        ' + sql);
    check('INSERT en User_Planification', sql.includes('INSERT INTO "User_Planification"'));
    for (const c of ['user_id', 'coach_id', 'planification_id', 'start_date', 'end_date', 'coach_note']) {
      check(`inserta "${c}"`, new RegExp(`\\(.*"${c}".*\\) VALUES`).test(sql));
    }
    for (const c of ['id', 'active', 'created_at', 'updated_at']) {
      check(`RETURNING incluye "${c}"`, new RegExp('RETURNING[^;]*"' + c + '"').test(sql));
    }
  });

  await run('start_date y end_date se hidratan y se persisten como día', async () => {
    // Lo que entrega pg para un DATE: una Date en medianoche LOCAL
    const parsed = mod('pg').types.getTypeParser(1082)('2026-11-15');
    for (const name of ['start_date', 'end_date']) {
      const col = meta.findColumnWithPropertyName(name);
      check(`${name} es date`, col && col.type === 'date', col && col.type);
      check(`${name} se hidrata como "2026-11-15"`, ds.driver.prepareHydratedValue(parsed, col) === '2026-11-15', String(ds.driver.prepareHydratedValue(parsed, col)));
      check(`${name} se persiste igual`, ds.driver.preparePersistentValue('2026-11-15', col) === '2026-11-15');
    }
  });

  await run('el repositorio de rutinas del plan tiene exists()', async () => {
    check('exists es función', typeof ds.getRepository(RoutineAsignation).exists === 'function');
  });

  await run('el módulo provee todo lo que el service inyecta (sin esto, el server no arranca)', async () => {
    const { PlanificationModule } = dist('planification/planification.module');
    const { PlanificationService } = dist('planification/planification.service');
    const imports = Reflect.getMetadata('imports', PlanificationModule) || [];
    const provided = new Set(imports.flatMap(i => (i && i.providers) || []).map(p => p.provide));
    for (const entity of [UserPlanification, User, Coach]) {
      check(`forFeature incluye ${entity.name}`, provided.has(getRepositoryToken(entity)), [...provided].join(','));
    }
    const injected = (Reflect.getMetadata('self:paramtypes', PlanificationService) || [])
      .map(p => p.param).filter(token => typeof token === 'string' && token.endsWith('Repository'));
    check('el service inyecta 6 repositorios', injected.length === 6, injected.join(','));
    for (const token of injected) check(`el módulo provee ${token}`, provided.has(token));
    check('el constructor tiene 7 parámetros (los 4 de antes y los 3 de BE-18b)', (Reflect.getMetadata('design:paramtypes', PlanificationService) || []).length === 7);
  });

  finish();
})();
```

- [ ] **Paso 6: correr todo en rojo** (el código todavía no cambió)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/418e3405-ede5-42a7-ac2f-fdf55079a34c/scratchpad/be18b"
cd "$SCRATCH" && for s in verify-plan-weeks verify-assign-plan-dto verify-assign-plan-controller verify-assign-plan-rules verify-assign-plan-typeorm; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: **fallas en los cinco.** Las cuentas y el DTO, porque los archivos no existen; el controller, por el rol (`coach` y `admin`), el `await` (el andamiaje no llama al service) y el Swagger; las reglas, porque el método no existe; el de TypeORM, por el `forFeature` sin `User` ni `Coach` y el constructor de 4 parámetros. **En el de TypeORM, el `INSERT` y las fechas ya dan `ok`**: las columnas son de BE-18, y esas pruebas confirman que la entidad sigue sirviendo, no el código nuevo. Si alguna otra da `ok`, revisar que la prueba no sea trivial.

---

## Tarea 2 — Las cuentas de semanas (spec §4)

**Archivos:** crear `power-app/src/planification/plan_weeks.ts`.

- [ ] **Paso 1: el archivo**

```ts
// Las cuentas de las semanas del plan (spec del bloque B, §4), sobre dias 'YYYY-MM-DD'. Se hacen
// interpretando el dia en UTC ('2026-10-22T00:00:00Z') y nunca con new Date() local, para que la
// zona horaria del servidor no corra un dia. Funciones puras, sin Nest: el home del plan (BE-20)
// va a necesitar las mismas cuentas

const DAY_MS = 24 * 60 * 60 * 1000;

// El ultimo dia que entra en el formato YYYY-MM-DD (y en IsCalendarDay)
const LAST_DAY_MS = Date.UTC(9999, 11, 31);

function toUtcMs(day: string): number {
    return Date.parse(`${day}T00:00:00Z`);
}

function fromUtcMs(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
}

// El lunes de la semana (de lunes a domingo) que contiene el dia. La semana 1 del plan es la que
// contiene start_date, sea el dia que sea (D16)
export function mondayOf(day: string): string {
    const ms = toUtcMs(day);
    // getUTCDay: 0 = domingo, 1 = lunes ... 6 = sabado. Dias desde el lunes: lunes 0 ... domingo 6
    const daysSinceMonday = (new Date(ms).getUTCDay() + 6) % 7;

    return fromUtcMs(ms - daysSinceMonday * DAY_MS);
}

// El fin por defecto de una asignacion: el domingo de la semana `duration` (D17), o sea el lunes de
// inicio + 7 * duration - 1. Solo para duration >= 1: con 0 la plantilla no tiene duracion fija y el
// fin lo indica el coach. Devuelve null si cae despues del 9999-12-31: es un tope tecnico, como
// INTEGER_MAX en la duracion, para que una duracion absurda no termine en un 500
export function defaultPlanEndDate(startDate: string, duration: number): string | null {
    const endMs = toUtcMs(mondayOf(startDate)) + (7 * duration - 1) * DAY_MS;

    return endMs <= LAST_DAY_MS ? fromUtcMs(endMs) : null;
}
```

---

## Tarea 3 — DTOs (spec §5 y §5.1)

**Archivos:** crear dos en `power-app/src/dtos/planification/`.

- [ ] **Paso 1: `assign_planification_to_user.dto.ts`**

```ts
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCalendarDay } from '../routine/is_calendar_day.decorator';

export class AssignPlanificationToUserDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Planificación (plantilla) a asignar. Tiene que estar activa y tener al menos una rutina vigente' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de planificación debe ser un UUID válido' })
    planification_id!: string;

    @ApiProperty({ example: 'uuid-1234', description: 'Alumno destinatario. Tiene que ser un usuario con rol user y la cuenta abierta' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de usuario debe ser un UUID válido' })
    user_id!: string;

    @ApiProperty({ example: '2026-10-22', description: 'Día de inicio, en formato YYYY-MM-DD (sin hora). Puede ser pasado o futuro: el servidor no calcula "hoy". La semana 1 del plan es la de lunes a domingo que lo contiene' })
    @IsNotEmpty()
    @IsCalendarDay()
    start_date!: string;

    @ApiPropertyOptional({ example: '2026-11-15', description: 'Día de fin, inclusive (YYYY-MM-DD). Si se omite, es el domingo de la semana duration de la plantilla (en el ejemplo, 4 semanas desde el lunes 19/10). Obligatorio si la plantilla tiene duración 0. No puede ser anterior a start_date (400). Puede ser más corto o más largo que la duración, y no hace falta que sea domingo' })
    @IsOptional()
    @IsCalendarDay()
    end_date?: string;

    @ApiPropertyOptional({ example: 'Foco en técnica', maxLength: 100, description: 'Nota del entrenador para el alumno. Para no dejar nota, se omite: la cadena vacía da 400' })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    coach_note?: string;

    @ApiPropertyOptional({ example: true, default: false, description: 'true para asignarla aunque se pise con otra planificación activa del alumno: las dos conviven. Sin esto, el solapamiento da 409 con las que se pisan' })
    @IsOptional()
    @IsBoolean()
    confirm_overlap?: boolean;
}
```

- [ ] **Paso 2: `user_planification_response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

// La cabecera de la plantilla dentro de una asignacion: se lee siempre en vivo de Planification (D18)
export class UserPlanificationPlanificationDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 'Fuerza 4 semanas', nullable: true, type: String })
    name!: string | null;

    @ApiProperty({ example: 4, description: 'Duración de la plantilla en semanas (0 = sin duración fija). Es la de hoy: editarla no mueve el fin de la asignación' })
    duration!: number;

    @ApiProperty({ example: true, description: 'Si la plantilla sigue activa. Darla de baja no saca las asignaciones que ya tenía' })
    active!: boolean;
}

// La forma de una asignacion (spec del bloque B, §5). La devuelven E-13 (la creada, y en el 409 las
// que se pisan) y, desde BE-19, E-14 y el listado del alumno. Nunca trae un estado calculado
// ("vigente", "vencida"): el cliente lo deduce de las fechas
export class UserPlanificationResponseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la User_Planification' })
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    user_id!: string;

    @ApiProperty({ example: 'uuid-1234', description: 'El coach que la asignó' })
    coach_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    planification_id!: string;

    @ApiProperty({ example: '2026-10-22', description: 'Día de inicio (YYYY-MM-DD, sin hora). La semana 1 del plan es la de lunes a domingo que lo contiene' })
    start_date!: string;

    @ApiProperty({ example: '2026-11-15', description: 'Día de fin, inclusive (YYYY-MM-DD, sin hora). Queda guardado: editar la duración de la plantilla no lo mueve' })
    end_date!: string;

    @ApiProperty({ example: 'Foco en técnica', nullable: true, type: String })
    coach_note!: string | null;

    @ApiProperty({ example: true, description: 'false si el coach la quitó (E-14)' })
    active!: boolean;

    @ApiProperty()
    created_at!: Date;

    @ApiProperty()
    updated_at!: Date;

    @ApiProperty({ type: UserPlanificationPlanificationDto })
    planification!: UserPlanificationPlanificationDto;
}

// El 409 de E-13: las asignaciones activas del alumno que se pisan con la nueva (D21)
export class AssignPlanificationOverlapResponseDto {

    @ApiProperty({ example: 'El alumno ya tiene una planificación en esas fechas. Reenviá con confirm_overlap: true para asignarla igual.' })
    error!: string;

    @ApiProperty({ type: [UserPlanificationResponseDto], description: 'Las asignaciones activas del alumno cuyo rango se pisa con el nuevo (los dos extremos inclusivos), de la más nueva a la más vieja' })
    overlapping!: UserPlanificationResponseDto[];
}
```

---

## Tarea 4 — Service y módulo (spec §5.1)

**Archivos:** `power-app/src/planification/planification.service.ts`, `power-app/src/planification/planification.module.ts`.

- [ ] **Paso 1: imports del service.** Debajo de `import { SetRoutineAsignationsActiveDto } from '../dtos/planification/set_routine_asignations_active.dto';` agregar:

```ts
import { AssignPlanificationToUserDto } from '../dtos/planification/assign_planification_to_user.dto';
import { UserPlanification } from '../entities/user_planification.entity';
import { User, UserRole } from '../entities/user.entity';
import { Coach } from '../entities/coach.entity';
import { AuthUser } from '../authentication/auth-user.interface';
import { defaultPlanEndDate } from './plan_weeks';
```

- [ ] **Paso 2: el constructor.** Después de `private dataSource: DataSource,` (los tres al final, para no correr la posición de los de antes):

```ts
        @InjectRepository(UserPlanification)
        private userPlanificationRepository: Repository<UserPlanification>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Coach)
        private coachRepository: Repository<Coach>,
```

- [ ] **Paso 3: el método.** Entre el cierre de `setRoutineAsignationsActive` y `// ===================== HELPERS =====================`:

```ts
    // ===================== ASIGNACIONES A ALUMNOS (CU-E-13) =====================

    // Solo el coach asigna (D20): coach_id sale del token. El orden de las validaciones es parte
    // del contrato (spec del bloque B, §5.1). Es una sola escritura, asi que no hay transaccion: dos
    // altas simultaneas del mismo alumno pueden saltearse el aviso de solapamiento y quedar
    // conviviendo, que D21 ya admite
    async assignPlanificationToUser(
        assignPlanificationToUserDto: AssignPlanificationToUserDto,
        currentUser: AuthUser,
        res: Response
    ) {
        const startDate = assignPlanificationToUserDto.start_date;

        // Solo un string cuenta como "vino el fin": null o ausente es calcularlo de la plantilla. El
        // DTO ya garantizo que los dos son dias YYYY-MM-DD, que se comparan bien como texto
        const sentEndDate = typeof assignPlanificationToUserDto.end_date === 'string'
            ? assignPlanificationToUserDto.end_date
            : undefined;

        // Antes de leer nada: no depende de la base
        if (sentEndDate !== undefined && sentEndDate < startDate) {
            return res.status(400).send({ error: 'La fecha de fin no puede ser anterior a la de inicio.' });
        }

        try {
            // Rol coach sin su fila en Coach, o con la fila dada de baja: la inconsistencia que arregla
            // BE-27. Sin fila, la FK de coach_id daria un 500; con la fila de baja, la asignacion
            // quedaria a nombre de un coach dado de baja (decision del 21/10). No es el texto de la
            // cuenta deshabilitada: ese es el unico que hace cerrar la sesion en el web
            const coach = await this.coachRepository.findOne({
                where: { id: currentUser.id },
                select: { id: true, active: true },
            });

            if (!coach || !coach.active) {
                return res.status(403).send({ error: 'Tu usuario no está registrado como entrenador.' });
            }

            const planification = await this.planificationRepository.findOne({
                where: { id: assignPlanificationToUserDto.planification_id },
                select: { id: true, name: true, duration: true, active: true },
            });

            if (!planification) {
                return res.status(404).send({ error: 'Planificación no encontrada' });
            }

            // Una plantilla de baja no se asigna de nuevo. Lo ya asignado sigue: E-11 no cascadea
            if (!planification.active) {
                return res.status(400).send({
                    error: 'La planificación está dada de baja y no puede asignarse a un alumno.'
                });
            }

            // Precondicion del CU. Vigente = el vinculo activo, el mismo criterio que routine_count:
            // una rutina dada de baja (E-18) dentro del plan se sigue viendo y ejecutando
            const hasRoutines = await this.routineAsignationRepository.exists({
                where: { planification_id: planification.id, active: true },
            });

            if (!hasRoutines) {
                return res.status(400).send({
                    error: 'La planificación no tiene rutinas vigentes: asignale rutinas antes de asignarla a un alumno.'
                });
            }

            // Sin fin en el body, sale de la plantilla: el domingo de la semana duration (D17, spec
            // §4). Con duracion 0 no hay de donde sacarlo, y no existe un plan sin fin (NOT NULL)
            let endDate = sentEndDate;

            if (endDate === undefined) {
                if (planification.duration === 0) {
                    return res.status(400).send({
                        error: 'La planificación no tiene duración fija: indicá la fecha de fin.'
                    });
                }

                const defaultEndDate = defaultPlanEndDate(startDate, planification.duration);

                // Tope tecnico (decision del 21/10): con una duracion absurda no hay dia YYYY-MM-DD
                if (defaultEndDate === null) {
                    return res.status(400).send({
                        error: 'La fecha de fin calculada queda fuera del calendario: indicá la fecha de fin.'
                    });
                }

                endDate = defaultEndDate;
            }

            const user = await this.userRepository.findOne({
                where: { id: assignPlanificationToUserDto.user_id },
                select: { id: true, role: true, active: true },
            });

            if (!user) {
                return res.status(404).send({ error: 'Usuario no encontrado' });
            }

            // Mismo criterio que E-19
            if (user.role !== UserRole.user) {
                return res.status(400).send({ error: 'La planificación sólo puede asignarse a un alumno.' });
            }

            if (!user.active) {
                return res.status(400).send({
                    error: 'La cuenta del alumno está cerrada: no se le puede asignar una planificación.'
                });
            }

            // D21: si se pisa con otra activa, se avisa con las que se pisan. Reenviando
            // confirm_overlap: true se crea igual y conviven, asi que con la confirmacion ni se consulta
            if (assignPlanificationToUserDto.confirm_overlap !== true) {
                const overlapping = await this.findOverlappingAssignments(user.id, startDate, endDate);

                if (overlapping.length > 0) {
                    return res.status(409).send({
                        error: 'El alumno ya tiene una planificación en esas fechas. Reenviá con confirm_overlap: true para asignarla igual.',
                        overlapping: overlapping.map(
                            userPlanification => this.buildUserPlanificationResponse(userPlanification, userPlanification.planification)
                        ),
                    });
                }
            }

            // Los ids salen de las filas leidas y no del body: el iOS manda los UUID en mayuscula, y la
            // respuesta tiene que devolverlos como estan en la base. La cabecera no se copia (D18)
            const userPlanification = await this.userPlanificationRepository.save(
                this.userPlanificationRepository.create({
                    user_id: user.id,
                    coach_id: coach.id,
                    planification_id: planification.id,
                    start_date: startDate,
                    end_date: endDate,
                    coach_note: assignPlanificationToUserDto.coach_note,
                })
            );

            return res.status(201).send(this.buildUserPlanificationResponse(userPlanification, planification));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al asignar la planificación.' });
        }
    }

```

- [ ] **Paso 4: los dos helpers.** En la sección `// ===================== HELPERS =====================`, después de `buildPlanificationDetailResponse` (antes del cierre de la clase):

```ts

    // Las asignaciones ACTIVAS del alumno cuyo rango se pisa con [startDate, endDate], con los dos
    // extremos inclusivos: empiezan antes o el mismo dia en que termina la nueva, y terminan despues
    // o el mismo dia en que empieza. Las quitadas (E-14) no cuentan. De la plantilla trae solo la
    // cabecera de la forma de una asignacion, y el orden es el del listado del alumno (spec §5.3):
    // de la mas nueva a la mas vieja
    private findOverlappingAssignments(
        userId: string,
        startDate: string,
        endDate: string
    ): Promise<UserPlanification[]> {
        return this.userPlanificationRepository
            .createQueryBuilder('userPlanification')
            .innerJoin('userPlanification.planification', 'planification')
            .addSelect(['planification.id', 'planification.name', 'planification.duration', 'planification.active'])
            .where('userPlanification.user_id = :userId', { userId })
            .andWhere('userPlanification.active = true')
            .andWhere('userPlanification.start_date <= :endDate', { endDate })
            .andWhere('userPlanification.end_date >= :startDate', { startDate })
            .orderBy('userPlanification.start_date', 'DESC')
            .addOrderBy('userPlanification.created_at', 'DESC')
            .getMany();
    }

    // La forma de una asignacion (spec del bloque B, §5): la usan la creada y las que se pisan en
    // E-13 y, desde BE-19, E-14 y el listado. La cabecera del plan se lee de la plantilla (D18)
    private buildUserPlanificationResponse(userPlanification: UserPlanification, planification: Planification) {
        return {
            id: userPlanification.id,
            user_id: userPlanification.user_id,
            coach_id: userPlanification.coach_id,
            planification_id: userPlanification.planification_id,
            start_date: userPlanification.start_date,
            end_date: userPlanification.end_date,
            coach_note: userPlanification.coach_note ?? null,
            active: userPlanification.active,
            created_at: userPlanification.created_at,
            updated_at: userPlanification.updated_at,
            planification: {
                id: planification.id,
                name: planification.name ?? null,
                duration: planification.duration,
                active: planification.active,
            },
        };
    }
```

- [ ] **Paso 5: `planification.module.ts`** (reemplazo completo)

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanificationController } from './planification.controller';
import { PlanificationService } from './planification.service';
import { Planification } from '../entities/planification.entity';
import { Routine } from '../entities/routine.entity';
import { RoutineAsignation } from '../entities/routine_asignation.entity';
import { UserPlanification } from '../entities/user_planification.entity';
import { RoutineAsignationUser } from '../entities/routine_asignation_user.entity';
import { User } from '../entities/user.entity';
import { Coach } from '../entities/coach.entity';
import { AuthModule } from '../authentication/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([
    Planification,
    Routine,
    RoutineAsignation,
    UserPlanification,
    RoutineAsignationUser,
    // E-13 valida al destinatario y al coach del token
    User,
    Coach,
  ]), AuthModule],
  controllers: [PlanificationController],
  providers: [PlanificationService]
})
export class PlanificationModule {}
```

---

## Tarea 5 — Controller (spec §5.1 y D20)

**Archivos:** `power-app/src/planification/planification.controller.ts`.

- [ ] **Paso 1: imports.** Reemplazar estas tres líneas:

```ts
// TODO: crear los siguientes DTOs en src/dtos/planification/ (CU-E-13 y E-14)
// import { AssignPlanificationToUserDto } from '../dtos/planification/assign_planification_to_user.dto';
// import { EditUserPlanificationDto } from '../dtos/planification/edit_user_planification.dto';
```

por:

```ts
import { AssignPlanificationToUserDto } from '../dtos/planification/assign_planification_to_user.dto';
import { UserPlanificationResponseDto, AssignPlanificationOverlapResponseDto } from '../dtos/planification/user_planification_response.dto';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { AuthUser } from '../authentication/auth-user.interface';
// Los andamiajes de E-14 que quedan abajo (GET /user/:id/active, POST /user/edit/:id y
// DELETE /user/:id) los retira BE-19: una asignacion no se edita (D22) y quitarla es set-active (D23)
```

- [ ] **Paso 2: el handler.** Reemplazar el andamiaje de `@Post('/user/assign')` entero (decoradores y método) por:

```ts
    // Solo el coach (D20): coach_id sale del token, y el admin no tiene fila en Coach
    @Post('/user/assign')
    @Auth(UserRole.coach)
    @ApiResponse({ status: 201, type: UserPlanificationResponseDto, description: 'La asignación creada. Sin end_date en el body, el fin es el domingo de la semana duration de la plantilla' })
    @ApiResponse({ status: 400, description: 'Datos inválidos, end_date anterior a start_date, planificación dada de baja o sin rutinas vigentes, planificación de duración 0 sin end_date, fin calculado fuera del calendario, o el destinatario no es un alumno o tiene la cuenta cerrada' })
    @ApiResponse({ status: 403, description: 'El usuario no es coach, o no tiene una fila activa en Coach (Tu usuario no está registrado como entrenador.)' })
    @ApiResponse({ status: 404, description: 'Planificación o usuario no encontrado' })
    @ApiResponse({ status: 409, type: AssignPlanificationOverlapResponseDto, description: 'El alumno tiene otra planificación activa que se pisa con esas fechas (los dos extremos inclusivos). Reenviando con confirm_overlap: true se crea igual' })
    async assignPlanificationToUser(
        @Body() assignPlanificationToUserDto: AssignPlanificationToUserDto,
        @CurrentUser() user: AuthUser,
        @Res() res: Response,
    ) {
        await this.planificationService.assignPlanificationToUser(assignPlanificationToUserDto, user, res);
    }
```

---

## Tarea 6 — Compilar y verificar

- [ ] **Paso 1: build.** `cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build`. Esperado: sin errores. Si falla por el tipo de `endDate` o de `coach_note`, corregir en el service, sin `as`.

- [ ] **Paso 2: los cinco scripts, en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/418e3405-ede5-42a7-ac2f-fdf55079a34c/scratchpad/be18b"
cd "$SCRATCH" && for s in verify-plan-weeks verify-assign-plan-dto verify-assign-plan-controller verify-assign-plan-rules verify-assign-plan-typeorm; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: cada uno termina en `N ok, 0 fallas` y no aparece ninguna línea `FALLA`. Si una regex del SQL falla por comillas o alias, **leer el SQL impreso primero** (`node verify-assign-plan-rules.js | grep -A2 "SQL sin base"`) y ajustar el script, no el código. Si el falso no soporta algo que el service llama, ampliar el falso, no el service.

- [ ] **Paso 3: el andamiaje de E-13 ya no está y nadie más cambió**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git grep -n "assignPlanificationToUserDto: any\|TODO: crear los siguientes DTOs" -- power-app/src ; git status --short
```
Esperado: el `git grep` sin resultados, y en `git status` sólo los seis archivos de código del mapa: tres modificados (service, módulo y controller) y tres nuevos (`plan_weeks.ts` y los dos DTOs).

---

## Tarea 7 — Spec de CU-E-13 (repo PowerApp-Docs)

**Archivos:** `Use Cases/entrenador/CU-E-13-asignar-planificacion-a-alumno.md` (reemplazo completo). Sigue el formato de CU-E-19.

- [ ] **Paso 1: el archivo**

```markdown
# CU-E-13 — Asignar Planificación a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Vía principal de asignación (~90% de los casos): asigna una planificación entera a un alumno, desde un día de inicio hasta un día de fin, creando una User_Planification. Las rutinas del plan, sus semanas y su cabecera (nombre, descripción, tipo, duración) se leen siempre de la planificación: la asignación guarda sólo lo propio (el alumno, el entrenador que la asignó, las fechas y una nota).

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de una User_Planification con el día de inicio, el día de fin y una nota opcional del entrenador (coach_note).
- El cálculo del fin a partir de la duración de la planificación, cuando el entrenador no lo indica.
- El aviso de solapamiento con otra planificación vigente del alumno, y la confirmación para asignarla igual.

**Fuera de alcance:**

- Asignación de una rutina puntual sin planificación (CU-E-19).
- Quitar o reincorporar la planificación del alumno (CU-E-14).
- Editar una asignación: para cambiar sus fechas, el entrenador la quita y la asigna de nuevo.
- Reemplazar un plan por otro en una sola operación: el entrenador quita el viejo (CU-E-14) y asigna el nuevo.

## Precondiciones

- Existe una sesión activa con rol Entrenador, registrado como entrenador activo.
- La planificación existe, está activa y tiene al menos una rutina vigente.
- El alumno existe y su cuenta está abierta.
- El gimnasio es compartido: cualquier entrenador puede asignarle una planificación a cualquier alumno.

## Postcondiciones

- Existe una User_Planification con el alumno, la planificación, el entrenador que la asignó, el inicio, el fin y la nota.
- El alumno ve las rutinas del plan en su home, semana por semana. La semana 1 es la de lunes a domingo que contiene el inicio.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno y una planificación.
2. Define el día de inicio y, opcionalmente, el día de fin y una nota (coach_note).
3. El sistema verifica que el entrenador esté registrado como entrenador, que la planificación esté activa y tenga rutinas vigentes, y que el destinatario sea un alumno con la cuenta abierta.
4. Si el entrenador no indicó el fin, el sistema lo calcula: el domingo de la última semana de la planificación, contando como semana 1 la de lunes a domingo que contiene el inicio.
5. El sistema verifica que el alumno no tenga otra planificación vigente en esas fechas.
6. El sistema crea la User_Planification.
7. El sistema confirma la asignación con sus fechas y el nombre de la planificación.

## Caminos alternativos / excepciones

### En el paso 2 — El inicio es pasado o futuro

1. El entrenador elige un inicio que ya pasó o que todavía no llegó.
2. El sistema lo acepta: la fecha la define siempre el entrenador y el sistema no calcula «hoy».

### En el paso 2 — El fin es anterior al inicio

1. El sistema informa el error y no crea la asignación.

### En el paso 2 — El fin no coincide con la duración

1. El entrenador indica un fin más corto o más largo que la duración de la planificación, o uno que no cae en domingo.
2. El sistema lo acepta tal cual: si es más corto, la última semana se corta ahí; si es más largo, las semanas sin rutinas se ven vacías.

### En el paso 3 — El entrenador no está registrado como entrenador

1. El usuario tiene el rol de entrenador, pero no figura como entrenador activo.
2. El sistema informa el error y no crea la asignación.

### En el paso 3 — La planificación o el alumno no existen

1. El sistema informa cuál de los dos no se encontró y no crea la asignación.

### En el paso 3 — La planificación está dada de baja o no tiene rutinas

1. La planificación existe pero está inactiva, o no tiene ninguna rutina vigente.
2. El sistema informa el motivo y no crea la asignación. Las asignaciones que ya tenía siguen vigentes.

### En el paso 3 — El destinatario no es un alumno o su cuenta está cerrada

1. El usuario elegido es un entrenador o un administrador, o es un alumno con la cuenta cerrada.
2. El sistema informa el motivo y no crea la asignación.

### En el paso 4 — La planificación no tiene duración fija

1. La planificación tiene duración 0 y el entrenador no indicó el fin.
2. El sistema le pide que indique el fin y no crea la asignación.

### En el paso 5 — Solapamiento con un plan vigente

1. El alumno ya tiene una planificación vigente cuyas fechas se pisan con las nuevas, contando los dos extremos.
2. El sistema advierte el solapamiento, muestra cuáles se pisan y no crea la asignación.
3. El entrenador puede ajustar las fechas, quitar la planificación vieja (CU-E-14) o confirmar.
4. Si confirma, el sistema crea la asignación y las dos conviven: el alumno ve las dos en su home.
5. Si dos entrenadores le asignan planificaciones al mismo alumno en el mismo instante, el aviso puede no salir y las dos quedan conviviendo, igual que si se hubiera confirmado.

### En el paso 6 — Error al guardar

1. Falla la creación de la User_Planification.
2. El sistema informa el error. Como es una sola operación, no queda ninguna asignación a medias.
```

---

## Tarea 8 — Status (informe y dashboard)

**Archivos:** `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html`. **Los cambios fechados anteriores no se tocan.**

**Conteos nuevos:** ✅ 66 · 🟡 7 · 🔵 1 · ⬜ 0 · sin backend 1 (de 75). Entrenador: 31 ✅ · 1 🔵. Porcentajes: ✅ 88% de 75 (66/75 = 88,00), 🔵 1% (1,33); **89%** de los 74 con backend (66/74 = 89,19); Entrenador **97%** (31/32 = 96,88).

- [ ] **Paso 1: entrada nueva arriba de la del 21/10 de BE-18**: `## Cambios recientes (2026-10-21 · bloque B: asignar una planificación a un alumno)`, **con el porqué de cada punto**. Puntos obligatorios:
  - **Decimonovena tarea del roadmap (BE-18b): CU-E-13.** Plan: `Doc/plans/2026-10-21-be-18b-asignar-planificacion-plan.md` (repo PowerApp-Docs). `POST /planification/user/assign` deja de colgar. **Sólo el coach** (D20): `coach_id` sale del token, y el admin recibe el `403` del guard de roles.
  - **El contrato:** el body, las nueve validaciones en su orden, el `201` con la forma de una asignación (que BE-19 reutiliza) y el `409` con `overlapping`. Una sola escritura, sin transacción; la carrera de dos altas simultáneas se acepta porque D21 ya admite convivir.
  - **El fin:** opcional; por defecto, el domingo de la semana `duration` (lunes de la semana del inicio + 7·duration − 1), con el ejemplo de la spec (jueves 22/10 con 4 semanas → 15/11). Duración 0 sin fin → `400`. Las cuentas en UTC sobre el string, en `planification/plan_weeks.ts`, que BE-20 va a reutilizar.
  - **Decisiones del 21/10 con el usuario:** el `Coach` dado de baja da el mismo `403` (por qué: el bug de BE-27 lo deja alcanzable y la FK no lo frena) y el fin calculado fuera del calendario da `400` (por qué: tope técnico como `INTEGER_MAX`, para no terminar en un `500`).
  - **Decisiones del plan:** "rutina vigente" es el vínculo activo (el criterio de `routine_count`); `overlapping` en el orden del listado de §5.3; con `confirm_overlap: true` no se consulta; `coach_note` vacía es `400` (como en E-16); los textos de error.
  - **Verificación:** build; los cinco scripts (cuentas en tres zonas horarias, DTO, controller y Swagger, reglas con el SQL del solapamiento e hidratación sin base, `INSERT` y el módulo), con sus números de chequeos y de fallas en rojo. **Qué no se verificó:** el SQL contra un Postgres, que Nest arranque con el módulo nuevo (se probó el `forFeature` contra lo que el service inyecta, no el arranque) y el runtime (BE-35).
  - **E-13 pasa de 🔵 a ✅** (66 ✅ · 7 🟡 · 1 🔵). Spec de CU reescrita: **E-13** (sin `User_Routine`, el fin calculado, sólo el coach, los caminos alternativos nuevos). **Para el web:** B7 tipa contra §5.1 de la spec. **Sigue BE-19** (E-14, el listado y el retiro de los andamiajes).

- [ ] **Paso 2: secciones vivas del informe**
  - Tabla de resumen: `✅ Implementado | 66 | 88%` y `🔵 Andamiaje | 1 | 1%`.
  - La línea de abajo: `**66 de los 74 CU con backend están completos (89%).** Faltan 8: 7 parciales y 1 en andamiaje; ya no queda ninguno sin endpoint. Dos de los ✅ tienen un defecto abierto (⚠): CU-E-29 y CU-A-04.`
  - Cobertura por rol: `| Entrenador | 32 | 31 | 0 | 1 | 0 | 0 | 97% |` y `| **Total** | **75** | **66** | **7** | **1** | **0** | **1** | **89%** |`.
  - Encabezados: `## Detalle — Rol Usuario (20 CU · 89%)` (hallazgo 15) y `## Detalle — Rol Entrenador (32 CU · 97%)`.
  - Fila de **CU-E-13**: `| CU-E-13 | Asignar planificación a alumno | ✅ Implementado | `POST /planification/user/assign` · sólo coach (`coach_id` del token; `403` si no tiene su fila activa en `Coach`) · el fin por defecto es el domingo de la semana `duration` (obligatorio con duración 0) · `409` con las asignaciones activas que se pisan, salvo `confirm_overlap: true` · 400 → 403 → 404 → 400 → 400 → 400 → 404 → 400 → 409 (BE-18b, 21/10) |`
  - "Plan de trabajo", fila de la fase 3: `en curso: BE-17, BE-18 y BE-18b hechas (20 y 21/10)`.

- [ ] **Paso 3: dashboard**
  - Tile de implementados: `<div class="n">66</div>` y `88% · cumple su spec`. Tile de andamiaje: `<div class="n">1</div>` y `1% · ruta que cuelga`.
  - La barra: `aria-label="66 implementados, 7 parciales, 1 andamiaje, 0 no implementados y 1 sin backend, de 75"`, `s-done` a `width:88%` y `s-stub` a `width:1.33%`.
  - El pie de la barra: `<b>66 de los 74</b> CU con backend completos (89%)` y `<b>8</b> pendientes (7 parciales, 1 andamiaje)`.
  - Tarjeta del Entrenador: `97%`, `31 de 32 · circuitos, rutinas, planificaciones, la asignación individual, el historial y asignar planificaciones cerrados; falta quitarlas (E-14)`, la mini barra con `width:96.875%` (done) y `width:3.125%` (stub), y la leyenda `<b>31</b> impl.` y `<b>1</b> andam.`.
  - Títulos de sección (hallazgo 15): `Rol Usuario` → `20 CU · 89% implementado (sobre 19 con backend)`; `Rol Entrenador` → `32 CU · 97% implementado`.
  - Fila de CU-E-13: `<span class="chip done"><span class="cd"></span>Implementado</span>` y `<span class="verb">POST</span> /planification/user/assign <span class="muted">· sólo coach (403 sin su fila activa en Coach) · el fin por defecto es el domingo de la semana duration; obligatorio con duración 0 · 409 con las que se pisan, salvo confirm_overlap: true (BE-18b, 21/10)</span>`.
  - Fila de la fase 3: `<span class="muted">BE-17, BE-18 y BE-18b (20 y 21/10)</span>`.
  - El pie de página: `66 impl · 7 parc · 1 andam · 0 falta · 1 sin backend — de 75 · corte 2026-10-21`.

- [ ] **Paso 4: control de los conteos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status" && grep -c "✅ Implementado |" estado-implementacion-backend.md && grep -c "🔵 Andamiaje |" estado-implementacion-backend.md && grep -c 'chip done"><span class="cd"></span>Implementado' dashboard-estado-backend.html && grep -c 'chip stub"><span class="cd"></span>Andamiaje' dashboard-estado-backend.html
```
Esperado: `67`, `2`, `67` y `2`. En los dos archivos cada patrón aparece una vez más que el conteo: en el informe, por la fila de la tabla de resumen (`| ✅ Implementado | 66 |` y `| 🔵 Andamiaje | 1 |`); en el dashboard, por la leyenda de estados del pie. Antes del cambio dan `66`, `3`, `66` y `3` (verificado al escribir el plan). Si no da, contar a mano antes de seguir.

---

## Tarea 9 — Stage y mensajes de commit

- [ ] **Paso 1: backend**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/planification/plan_weeks.ts power-app/src/planification/planification.service.ts power-app/src/planification/planification.module.ts power-app/src/planification/planification.controller.ts power-app/src/dtos/planification/assign_planification_to_user.dto.ts power-app/src/dtos/planification/user_planification_response.dto.ts Status/estado-implementacion-backend.md Status/dashboard-estado-backend.html && git status --short && git diff --cached --stat
```
Esperado: sólo esos ocho archivos en el stage y nada fuera de él.

- [ ] **Paso 2: docs**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && git add "Doc/plans/2026-10-21-be-18b-asignar-planificacion-plan.md" "Use Cases/entrenador/CU-E-13-asignar-planificacion-a-alumno.md" && git status --short
```

- [ ] **Paso 3: proponer un mensaje por repo, sin commitear ni pushear.**
  - Backend: `BE-18b: asignar una planificacion a un alumno (E-13), POST /planification/user/assign` y, como cuerpo: `Solo el coach, con coach_id del token y 403 si no tiene su fila activa en Coach. El fin es opcional: por defecto, el domingo de la semana duration de la plantilla, contando como semana 1 la que contiene el inicio; con duracion 0 es obligatorio. Si se pisa con otra asignacion activa del alumno, 409 con las que se pisan, salvo confirm_overlap: true. Status: E-13 pasa a implementado (66 de 74).`
  - Docs: `Plan de BE-18b y spec de E-13 reescrita: la asignacion guarda solo lo propio, el fin sale de la plantilla y el solapamiento se confirma`.

---

## Tarea 10 — Memoria del proyecto

- [ ] **Paso 1:** actualizar `project_cu_status.md` (BE-18b hecha y stageada, E-13 ✅, 66 de 74; sigue BE-19) y su línea en `MEMORY.md`.

---

## 4. Qué NO verifica este plan

- **El SQL contra un Postgres de verdad**: el solapamiento se verifica como texto y con filas armadas a mano.
- **Que Nest arranque** con el módulo nuevo: se prueba que el `forFeature` provea cada repositorio que el service inyecta, no el arranque.
- **El runtime** de E-13 (BE-35, contra Render regenerado y con el seed de BE-21, que todavía no trae planificaciones con semanas).

## 5. Autoevaluación contra la spec

- **§5.1:** el body (Tarea 3, paso 1), las nueve validaciones en orden más las dos decididas el 21/10 (Tarea 4, paso 3), el `409` sólo con activas e inclusivo (paso 4) y el `201` (pasos 3 y 4). Las prueba la Tarea 1, paso 4.
- **§4:** el lunes y el fin por defecto (Tarea 2), probados en tres zonas (Tarea 1, paso 1); el fin manual corto y largo y la duración 0, en las reglas.
- **§5 forma y convenciones:** `buildUserPlanificationResponse` y el DTO de respuesta; ids de las filas; `await` en el handler; el `403` con su propio texto; Swagger con `201`, `400`, `403`, `404` y `409`.
- **D18, D20, D21:** sin cabecera copiada, sólo el coach, convivir con confirmación.
- **§7:** CU-E-13 (Tarea 7). **§10:** build y los cinco scripts (Tarea 6). **§11:** Status (Tarea 8).

## 6. Después de esto

**BE-19** (E-14, el listado de §5.3 y el retiro de los tres andamiajes): reutiliza `UserPlanificationResponseDto`, `buildUserPlanificationResponse` y el orden de `findOverlappingAssignments`.
