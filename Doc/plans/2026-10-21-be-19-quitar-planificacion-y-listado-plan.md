# BE-19 — Quitar o reincorporar la planificación de un alumno (CU-E-14) y sus planes · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` y se propone el mensaje (Tarea 8).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escriben **antes** del código y se corren en rojo.
> 3. **No se levanta el server**, ni siquiera en segundo plano, y **no se instala nada**. El SQL se verifica como texto, con el `DataSource` sin conexión.

> **Registro de ejecución (21/10):** plan aprobado y ejecutado en la misma sesión, sin subagentes, **tal como está escrito**: ningún paso cambió. Los tres scripts nuevos dieron en rojo 19, 22 y 19 fallas (en el del controller, 31 `ok` de los handlers y el Swagger que ya existían, como se esperaba) y en verde 24, 70 y 80 chequeos, sin fallas, en la primera corrida después del build. La regresión de BE-18b siguió en 27, 107 y 29, con el SQL del solapamiento idéntico. El `git grep` de andamiajes salió vacío y los controles del Status dieron `68`, `1`, `68`, `1` y `2`.

**Spec que manda:** [`2026-10-20-asignar-planificaciones-design.md`](../specs/2026-10-20-asignar-planificaciones-design.md), §2 (D11, D22, D23, D24), §5 (convenciones, tabla de rutas y forma de una asignación), §5.2 (E-14), §5.3 (el listado), §7 (fila E-14), §9 (fila BE-19) y §10.
**Modelo:** sin cambios. `User_Planification` quedó en BE-18 (`8c68c46`) y E-13 la escribe desde BE-18b (`57912d2`). **Esta tarea no cambia ninguna entidad**, así que no toca `Db Creator` ni el diagrama.
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde dice que E-14 "apaga la `User_Planification` y sus `User_Routine` en bloque", manda la spec: desde D11 no hay `User_Routine`, y quitar sólo apaga la asignación.

**Goal:** que `POST /planification/user/set-active/:id` quite o reincorpore la planificación de un alumno, que `GET /planification/user/:userId` liste sus asignaciones, y que no quede ninguna ruta de `planification/user/*` colgando.

**Architecture:** dos métodos nuevos en `PlanificationService` (`setUserPlanificationActive` y `getUserPlanifications`) que reutilizan la forma de una asignación de BE-18b (`buildUserPlanificationResponse` y `UserPlanificationResponseDto`). La consulta de solapamiento de E-13 se parte en dos helpers (`userPlanificationQuery`, la asignación con la cabecera de su plantilla, y `userPlanificationsOfUserQuery`, las de un alumno en el orden del listado) que comparten E-13, E-14 y el listado. Dos DTOs nuevos (el body de E-14 y el query del listado). En el controller se reemplazan los cuatro andamiajes por los dos handlers. E-14 pasa de 🔵 a ✅ y el tile de andamiaje queda en 0.

**Tech Stack:** NestJS + TypeORM (Postgres) · `class-validator` / `class-transformer` · scripts de Node en el scratchpad, adaptados de los de BE-18b.

---

## 1. Hallazgos al preparar el plan (lo que la spec no dice)

**Decidido con el usuario el 21/10:**

1. **Reincorporar sólo valida que la asignación exista y que esté quitada.** No mira si la plantilla sigue activa ni si la cuenta del alumno sigue abierta, aunque E-13 rechaza las dos cosas. Por qué: reincorporar deshace una baja, igual que D23 no vuelve a chequear el solapamiento. Una plantilla de baja no saca lo ya asignado (E-11) y cerrar la cuenta (E-03) tampoco apaga sus planes, así que la asignación reincorporada queda igual que si nunca se hubiera quitado.

**Decisiones del plan (se pueden vetar al aprobarlo):**

2. **Los textos que la spec no fija:**
   - `404` `Asignación no encontrada`: el que §5.4 ya fija para una `User_Planification` que no existe. Así el web ve un solo texto para lo mismo.
   - `404` `Usuario no encontrado` (el que ya existe).
   - `500` `Error al actualizar el estado de la planificación del alumno.` y `Error al obtener las planificaciones del alumno.`
   - Los dos `400` son los de la spec: `La planificación del alumno ya está dada de baja.` / `La planificación del alumno ya está activa.`
3. **E-14 escribe con un solo `UPDATE` de dos columnas** (`active` y `updated_at`), con `repository.update`, no con `save`. Y **`updated_at` se setea a mano**, porque el `onUpdate` de las entidades es sintaxis de MySQL y en Postgres no hace nada (hallazgo 4 del Status; lo arregla BE-30 para todas). Es el patrón de marcar en BE-14. **Sin transacción:** es una escritura. Dos bajas simultáneas de la misma asignación pasan las dos la lectura y responden `200` las dos (la segunda, en vez del `400`); se acepta, porque el estado final es el mismo.
4. **El listado usa `AssignedRoutinesParamsDto`** (el param `userId` que ya usan `GET /routine/assigned/:userId` y el historial) y **un DTO de query nuevo, sólo con `include_inactive`**, con la misma transformación que `GetPlanificationsQueryDto`. No se reutiliza ese DTO porque aceptaría `keyword` y `type` sin usarlos; con el nuevo, mandarlos da `400`. La transformación se copia: ya está repetida en los tres listados de plantillas, es el estilo del código.
5. **El body de E-14 es un DTO nuevo, `SetUserPlanificationActiveDto`**, y no `SetPlanificationActiveDto`, cuyo texto de Swagger habla de la plantilla.
6. **La consulta de solapamiento de E-13 se refactoriza** para compartir la base con E-14 y el listado (la cabecera mínima de la plantilla, el filtro por alumno y el orden). El SQL no cambia: lo prueba el script de reglas de BE-18b, que se vuelve a correr como regresión.
7. **El listado no mira el rol ni la cuenta del usuario**, sólo que exista (spec §5.3), igual que `GET /routine/assigned/:userId`. Trae también las asignaciones de una plantilla dada de baja, con su `planification.active: false`.
8. **CU-E-14 conserva su título** (*Eliminar Planificación a Alumno (Lógico)*), como E-11 y E-18, que también reactivan por el mismo endpoint. El índice `Use Cases/README.md` no cambia.

**Hallazgos técnicos:**

9. **Los cuatro handlers de `planification/user/*` son las últimas rutas que cuelgan en todo el backend.** Son los únicos con la llamada al service comentada (`git grep` del 21/10). Después de BE-19 no queda ninguna. El script del controller lo prueba para `planification/`: llama a cada handler y exige que llame al service.
10. **El build no detecta un andamiaje.** Un handler con `@Res()` que no llama al service compila igual y deja el request colgado. Lo atrapa el script del paso anterior.
11. **TypeORM manda el `false` del `UPDATE` como `0`** (su driver de Postgres persiste los booleanos como 0/1, y Postgres los acepta para `boolean`). Es lo mismo que ya pasa con cada `save` de un `active`. El script de reglas lo deja escrito.
12. **Las rutas nuevas no compiten con las viejas.** `GET /user/:userId` tiene dos segmentos y `GET /:id`, uno. `POST /user/set-active/:id` y `POST /routine/set-active/:id` tienen tres, pero el primero es distinto. No hace falta reordenar el controller.
13. **Lo "congelado" de D24 se cumple por construcción.** Hoy no existe ningún endpoint que marque, desmarque o anote en una sesión del plan, así que una asignación quitada ya no se puede modificar. El `400` lo agrega BE-20c, que es la que suma marcar en el plan. La spec del CU lo dice como postcondición.
14. **La fila de CU-U-08 del Status está mal desde BE-12:** dice que falta `GET /planification/user/:id/active`, y ese andamiaje se retira acá. La parte del plan del home es `GET /routine/assigned-plan/:userId` (spec §5.5, BE-20). Se corrige en la Tarea 7.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/dtos/planification/set_user_planification_active.dto.ts` | **Nuevo:** el body de E-14, `{ active }` |
| `power-app/src/dtos/planification/get_user_planifications_query.dto.ts` | **Nuevo:** el query del listado, `include_inactive` |
| `power-app/src/planification/planification.service.ts` | `setUserPlanificationActive`, `getUserPlanifications`, los helpers `userPlanificationQuery` y `userPlanificationsOfUserQuery`, y `findOverlappingAssignments` sobre ellos |
| `power-app/src/planification/planification.controller.ts` | Los cuatro andamiajes salen; entran los dos handlers; imports |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | Entrada del 21/10, E-14 a ✅, U-08 corregida, conteos |

`Db Creator` **no cambia**: ninguna entidad cambia. El módulo tampoco: el service no inyecta ningún repositorio nuevo (`User` y `UserPlanification` ya están desde BE-18b).

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**: este plan y `Use Cases/entrenador/CU-E-14-eliminar-planificacion-a-alumno.md`.

**Scratchpad** (`C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/fa31ea20-323e-4bd7-ad06-47ea181b224e/scratchpad/be19/`, fuera de los repos): `lib.js`, tres scripts nuevos y tres de BE-18b como regresión.

---

## 3. Cobertura de la spec

| Spec | Qué pide | Tarea |
|---|---|---|
| §5 tabla | `POST /planification/user/set-active/:id` (coach, admin) y `GET /planification/user/:userId` (user con `@Owner('userId')`, coach, admin) | 4 |
| §5 | Se retiran `GET /planification/user/:id/active`, `POST /planification/user/edit/:id` y `DELETE /planification/user/:id` | 4 |
| §5.2 body | `{ active: boolean }` | 2 |
| §5.2 | `404` si no existe; `400` si ya está en ese estado, con los dos textos; quitar sólo apaga `active` (D11); reincorporar sin chequear solapamiento (D23); `200` con la asignación | 3 |
| §5.3 | `404` si el usuario no existe; `200` de la más nueva a la más vieja (`start_date` y `created_at` descendentes); por defecto sólo las activas, con `include_inactive=true` todas, el mismo parámetro que las plantillas | 2, 3 |
| §5 forma | `{ id, user_id, coach_id, planification_id, start_date, end_date, coach_note, active, created_at, updated_at, planification: { id, name, duration, active } }` | 3 (reutiliza BE-18b) |
| §5 convenciones | ids de las filas (en minúscula), `await` en el handler, ningún `403` nuevo, Swagger con respuesta y códigos | 3, 4 |
| §7 | CU-E-14 reescrito: sin `User_Routine`, sólo apaga la asignación, el camino de reincorporar, la quitada congelada para el alumno (D24) | 6 |
| §9 | E-14 🔵 → ✅ | 7 |
| §10 | Build; el SQL nuevo sin base; las reglas con repositorios falsos | 1, 5 |
| §11 | Status con el porqué; el web (B7) tipa contra §5.2 y §5.3 | 7 |
| **No está en la spec** | Reincorporar no valida plantilla ni cuenta (hallazgo 1) | 1, 3, 6 |

---

## Tarea 0 — Línea de base

**Archivos:** ninguno (lectura y copias al scratchpad).

> **Nota de shell:** el shell no conserva variables entre comandos. Cada bloque que las usa empieza definiéndolas.

- [ ] **Paso 1: los dos repos y el build**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short && git log --oneline -1 && npm --prefix power-app run build
cd "D:/Power App/Docs/PowerApp-Docs" && git status --short && git log --oneline -1
```
Esperado: el backend en `57912d2` (BE-18b) sin cambios y el build sin errores; docs en `8763516` con sólo este plan (stageado al pedir la aprobación). Si aparece otra cosa, **preguntar** antes de seguir.

- [ ] **Paso 2: la carpeta de scripts, `lib.js` y la regresión de BE-18b**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/fa31ea20-323e-4bd7-ad06-47ea181b224e/scratchpad/be19"
OLD_18B="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/418e3405-ede5-42a7-ac2f-fdf55079a34c/scratchpad/be18b"
mkdir -p "$SCRATCH" && cp "$OLD_18B/lib.js" "$OLD_18B/verify-assign-plan-rules.js" "$OLD_18B/verify-assign-plan-controller.js" "$OLD_18B/verify-assign-plan-typeorm.js" "$SCRATCH"/ && ls "$SCRATCH"
cd "$SCRATCH" && for s in verify-assign-plan-controller verify-assign-plan-rules verify-assign-plan-typeorm; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: los tres de BE-18b en verde (`27 ok`, `107 ok` y `29 ok`, `0 fallas`): es la línea de base de la regresión. (Hecho al escribir el plan, con esos números.)

Si `$OLD_18B` ya no existe, crear `$SCRATCH/lib.js` con el contenido de la Tarea 0 del plan de BE-18b (es el mismo archivo) y seguir **sin la regresión**: la refactorización de `findOverlappingAssignments` queda cubierta sólo por el build y por el orden que prueba el script de reglas nuevo. Decirlo en el Status.

---

## Tarea 1 — Scripts de verificación, en rojo

**Archivos:** sólo el scratchpad (`$SCRATCH`). Tres scripts nuevos, sobre el código compilado (`power-app/dist`). **Ya se escribieron y se corrieron en rojo al preparar el plan**; si están, se usan tal cual.

- [ ] **Paso 1: `verify-user-plan-dto.js`** — el body de E-14 y el query del listado, con la misma configuración del `ValidationPipe` de `main.ts`.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { ValidationPipe } = mod('@nestjs/common');

// La misma configuracion que main.ts
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

(async () => {
  let Body, Query;

  await run('carga el body de E-14', async () => {
    ({ SetUserPlanificationActiveDto: Body } = dist('dtos/planification/set_user_planification_active.dto'));
    check('exporta SetUserPlanificationActiveDto', typeof Body === 'function');
  });

  await run('carga el query del listado', async () => {
    ({ GetUserPlanificationsQueryDto: Query } = dist('dtos/planification/get_user_planifications_query.dto'));
    check('exporta GetUserPlanificationsQueryDto', typeof Query === 'function');
  });

  // Si el DTO no existe, metatype es undefined y el instanceof lanza: run lo cuenta como falla
  const accepts = (name, metatype, type, value, expected) => run(name, async () => {
    const out = await pipe.transform({ ...value }, { type, metatype });
    check(name, out instanceof metatype && Object.entries(expected).every(([k, v]) => out[k] === v), JSON.stringify(out));
  });

  const rejects = (name, metatype, type, value, text) => run(name, async () => {
    if (typeof metatype !== 'function') throw new Error('no existe el DTO');
    try {
      await pipe.transform(value, { type, metatype });
      check(name, false, 'no lo rechazó');
    } catch (e) {
      const status = e.getStatus ? e.getStatus() : undefined;
      const response = e.getResponse ? e.getResponse() : { message: e.message };
      const messages = [].concat(response.message).join(' | ');
      check(name, status === 400, 'estado ' + status);
      if (text) check(name + ' (mensaje)', messages.includes(text), messages);
    }
  });

  console.log('-- E-14 · el body { active }');
  await accepts('active false (quitar)', Body, 'body', { active: false }, { active: false });
  await accepts('active true (reincorporar)', Body, 'body', { active: true }, { active: true });
  await rejects('sin active', Body, 'body', {});
  await rejects('active null', Body, 'body', { active: null });
  await rejects('active como texto', Body, 'body', { active: 'false' }, 'boolean');
  await rejects('active como número', Body, 'body', { active: 0 }, 'boolean');
  await rejects('campo de más: week (no es E-12c)', Body, 'body', { active: true, week: 2 });
  await rejects('campo de más: end_date (una asignación no se edita, D22)', Body, 'body', { active: true, end_date: '2026-12-31' });

  console.log('\n-- Listado · el query (el mismo parámetro que los listados de plantillas)');
  await accepts('sin parámetros → include_inactive false', Query, 'query', {}, { include_inactive: false });
  await accepts("include_inactive 'true' → true", Query, 'query', { include_inactive: 'true' }, { include_inactive: true });
  await accepts("include_inactive 'false' → false", Query, 'query', { include_inactive: 'false' }, { include_inactive: false });
  await accepts('include_inactive true (booleano) → true', Query, 'query', { include_inactive: true }, { include_inactive: true });
  await rejects("include_inactive 'yes'", Query, 'query', { include_inactive: 'yes' }, 'boolean');
  await rejects("include_inactive '1'", Query, 'query', { include_inactive: '1' }, 'boolean');
  await rejects("include_inactive vacío ('include_inactive=')", Query, 'query', { include_inactive: '' }, 'boolean');
  await rejects('keyword: el listado no filtra por nombre', Query, 'query', { keyword: 'fuerza' });
  await rejects('type: tampoco por tipo', Query, 'query', { type: 'fuerza' });

  finish();
})();
```

- [ ] **Paso 2: `verify-user-plan-controller.js`** — rutas, roles, tipos, `await`, que ningún handler cuelgue y el Swagger, sin levantar nada.

```js
const { dist, mod, check, run, finish } = require('./lib');

const { Test } = mod('@nestjs/testing');
const { SwaggerModule, DocumentBuilder } = mod('@nestjs/swagger');
const { RequestMethod } = mod('@nestjs/common');
const { PlanificationController } = dist('planification/planification.controller');
const { PlanificationService } = dist('planification/planification.service');
const { JwtAuthGuard } = dist('authentication/guards/jwt-auth.guard');
const { RolesGuard } = dist('authentication/guards/roles.guard');
const { OwnerGuard } = dist('authentication/guards/owner.guard');
const { OWNER_PARAM_KEY } = dist('authentication/decorators/owner.decorator');
const { UserRole } = dist('entities/user.entity');
const { ParameterIdDto } = dist('dtos/parameter_id.dto');
const { AssignedRoutinesParamsDto } = dist('dtos/routine/assigned_routines_params.dto');

const allow = { canActivate: () => true };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const proto = PlanificationController.prototype;
const paramTypes = (name) => Reflect.getMetadata('design:paramtypes', proto, name) || [];

(async () => {
  console.log('-- E-14 · ruta, verbo, roles y tipos');
  await run('setUserPlanificationActive', async () => {
    const handler = proto.setUserPlanificationActive;
    check('existe', typeof handler === 'function');
    check('ruta /user/set-active/:id', Reflect.getMetadata('path', handler) === '/user/set-active/:id', Reflect.getMetadata('path', handler));
    check('POST', Reflect.getMetadata('method', handler) === RequestMethod.POST, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('coach y admin (D20: sólo asignar es del coach)', same(roles, [UserRole.coach, UserRole.admin]), JSON.stringify(roles));
    check('sin @Owner', Reflect.getMetadata(OWNER_PARAM_KEY, handler) === undefined);
    const types = paramTypes('setUserPlanificationActive');
    check('el id con ParameterIdDto', types[0] === ParameterIdDto, types[0] && types[0].name);
    check('el body con SetUserPlanificationActiveDto', types[1] && types[1].name === 'SetUserPlanificationActiveDto', types[1] && types[1].name);
  });

  console.log('\n-- Listado · ruta, verbo, roles y tipos');
  await run('getUserPlanifications', async () => {
    const handler = proto.getUserPlanifications;
    check('existe', typeof handler === 'function');
    check('ruta /user/:userId (el andamiaje usaba :id)', Reflect.getMetadata('path', handler) === '/user/:userId', Reflect.getMetadata('path', handler));
    check('GET', Reflect.getMetadata('method', handler) === RequestMethod.GET, Reflect.getMetadata('method', handler));
    const roles = Reflect.getMetadata('roles', handler);
    check('user, coach y admin', same(roles, [UserRole.user, UserRole.coach, UserRole.admin]), JSON.stringify(roles));
    check("@Owner('userId')", Reflect.getMetadata(OWNER_PARAM_KEY, handler) === 'userId', Reflect.getMetadata(OWNER_PARAM_KEY, handler));
    const types = paramTypes('getUserPlanifications');
    check('el path con AssignedRoutinesParamsDto (el de los otros listados por alumno)', types[0] === AssignedRoutinesParamsDto, types[0] && types[0].name);
    check('el query con GetUserPlanificationsQueryDto', types[1] && types[1].name === 'GetUserPlanificationsQueryDto', types[1] && types[1].name);
  });

  console.log('\n-- los tres andamiajes ya no están');
  for (const name of ['getActiveUserPlanification', 'editUserPlanification', 'deleteUserPlanification']) {
    check(`${name} no existe`, proto[name] === undefined);
  }

  // Un handler que no llama al service es un andamiaje: con @Res() y sin respuesta, el request
  // cuelga. Se llama a cada handler con argumentos vacios y un service que anota lo que le piden
  console.log('\n-- ningún handler del controller cuelga: cada uno llama al service');
  const handlers = Object.getOwnPropertyNames(proto).filter(n => n !== 'constructor' && typeof proto[n] === 'function');
  for (const name of handlers) {
    await run(name, async () => {
      const calls = [];
      // 'then' tiene que dar undefined: si no, el proxy pareceria una promesa
      const service = new Proxy({}, { get: (_, prop) => (prop === 'then' ? undefined : async () => { calls.push(String(prop)); }) });
      const controller = new PlanificationController(service);
      const ret = await controller[name]({}, {}, {}, {});
      check(`${name} llama al service una vez`, calls.length === 1, calls.join(',') || 'no llamó a nada');
      check(`${name} no devuelve nada (await, no return)`, ret === undefined, String(ret));
    });
  }

  const seen = {};
  const delayed = (key) => async (...args) => { await new Promise(r => setTimeout(r, 20)); seen[key] = args; return 'RESPONSE'; };
  const stub = {
    setUserPlanificationActive: delayed('setActive'),
    getUserPlanifications: delayed('list'),
    assignPlanificationToUser: delayed('assign'),
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

  console.log('\n-- argumentos y await');
  await run('E-14 pasa el id, el body y el response; espera sin devolver el Response', async () => {
    const body = { active: false };
    const res = {};
    const ret = await controller.setUserPlanificationActive({ id: 'up1' }, body, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('esperó al service', !!seen.setActive);
    check('argumentos: id, body y response', seen.setActive && seen.setActive[0] === 'up1' && seen.setActive[1] === body && seen.setActive[2] === res,
      JSON.stringify(seen.setActive));
  });

  await run('el listado pasa el userId, el query y el response; espera sin devolver el Response', async () => {
    const query = { include_inactive: true };
    const res = {};
    const ret = await controller.getUserPlanifications({ userId: 'u1' }, query, res);
    check('devuelve undefined', ret === undefined, String(ret));
    check('esperó al service', !!seen.list);
    check('argumentos: userId, query y response', seen.list && seen.list[0] === 'u1' && seen.list[1] === query && seen.list[2] === res,
      JSON.stringify(seen.list));
  });

  console.log('\n-- Swagger');
  await run('el documento declara los dos endpoints y ya no tiene los andamiajes', async () => {
    const app = moduleRef.createNestApplication();
    await app.init(); // no escucha en ningun puerto
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    const json = (r) => (r && r.content && r.content['application/json'].schema) || {};

    const setActive = (doc.paths['/planification/user/set-active/{id}'] || {}).post;
    check('POST /planification/user/set-active/{id} está en el documento', !!setActive);
    if (setActive) {
      for (const code of ['200', '400', '404']) check(`set-active declara ${code}`, !!setActive.responses[code], Object.keys(setActive.responses).join(','));
      check('el 200 es UserPlanificationResponseDto', (json(setActive.responses['200']).$ref || '').endsWith('/UserPlanificationResponseDto'), JSON.stringify(json(setActive.responses['200'])));
      check('el body es SetUserPlanificationActiveDto', (json(setActive.requestBody).$ref || '').endsWith('/SetUserPlanificationActiveDto'));
      check('pide token', Array.isArray(setActive.security) && setActive.security.some(s => 'bearer' in s));
    }
    const body = doc.components.schemas.SetUserPlanificationActiveDto;
    check('el body exige active, booleano', body && same(body.required, ['active']) && body.properties.active.type === 'boolean', JSON.stringify(body));

    const list = (doc.paths['/planification/user/{userId}'] || {}).get;
    check('GET /planification/user/{userId} está en el documento', !!list);
    if (list) {
      for (const code of ['200', '400', '403', '404']) check(`el listado declara ${code}`, !!list.responses[code], Object.keys(list.responses).join(','));
      const schema = json(list.responses['200']);
      check('el 200 es un array de UserPlanificationResponseDto', schema.type === 'array' && ((schema.items || {}).$ref || '').endsWith('/UserPlanificationResponseDto'), JSON.stringify(schema));
      const params = (list.parameters || []).map(p => `${p.in}:${p.name}`);
      check('parámetros: userId en el path e include_inactive en el query', same(params.sort(), ['path:userId', 'query:include_inactive']), params.join(','));
      const include = (list.parameters || []).find(p => p.name === 'include_inactive') || {};
      check('include_inactive es booleano y opcional', include.schema && include.schema.type === 'boolean' && include.required === false, JSON.stringify(include));
      check('pide token', Array.isArray(list.security) && list.security.some(s => 'bearer' in s));
    }

    for (const p of ['/planification/user/{id}', '/planification/user/{id}/active', '/planification/user/edit/{id}']) {
      check(`${p} ya no está`, !doc.paths[p], Object.keys(doc.paths[p] || {}).join(','));
    }
    check('E-13 y lo de E-08 a E-12d siguen en el documento',
      ['/planification/user/assign', '/planification/all', '/planification/{id}', '/planification/set-active/{id}', '/planification/routine/set-active/{id}', '/planification/routine/set-active-bulk']
        .every(p => !!doc.paths[p]));
    await app.close();
  });

  finish();
})();
```

- [ ] **Paso 3: `verify-user-plan-rules.js`** — las reglas de §5.2 y §5.3, con repositorios falsos y las consultas reales (el query builder del service sobre un `DataSource` sin conexión, como en BE-18b). Intercepta `getOne` y `getMany`: las dos pasan por `getRawAndEntities` (TypeORM 0.3.27), así que reemplazarlas en el prototipo de `SelectQueryBuilder` alcanza.

```js
const fs = require('fs');
const path = require('path');
const { ROOT, dist, mod, check, run, finish } = require('./lib');

const { DataSource, SelectQueryBuilder, QueryFailedError, getMetadataArgsStorage } = mod('typeorm');
const { RawSqlResultsToEntityTransformer } = require(path.join(ROOT, 'node_modules/typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer'));
const { PlanificationService } = dist('planification/planification.service');

const USER_ID = '7d5e1a22-3c4b-4d6f-8e9a-0a1b2c3d4e5f';
const UP_ID = '3b3b3b3b-1111-4222-8333-444444444444';
const PLAN_ID = '5a5a5a5a-1111-4222-8333-444444444444';
const COACH_ID = 'c0c0c0c0-1111-4222-8333-444444444444';
const CREATED = new Date('2026-10-20T12:00:00Z');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const MSG = {
  notFound: 'Asignación no encontrada',
  alreadyInactive: 'La planificación del alumno ya está dada de baja.',
  alreadyActive: 'La planificación del alumno ya está activa.',
  setActive500: 'Error al actualizar el estado de la planificación del alumno.',
  userNotFound: 'Usuario no encontrado',
  list500: 'Error al obtener las planificaciones del alumno.',
};
const KEYS = ['id', 'user_id', 'coach_id', 'planification_id', 'start_date', 'end_date', 'coach_note', 'active', 'created_at', 'updated_at', 'planification'];
const PLAN = { id: PLAN_ID, name: 'Fuerza 4 semanas', duration: 4, active: true };

function makeRes() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

// Una fila CRUDA de la consulta de asignaciones, como la devolveria Postgres (los alias son los del
// SELECT). Los DATE llegan como Date en medianoche local, que es lo que entrega pg, y TypeORM los
// hidrata como 'YYYY-MM-DD'
function rawRow({ id = UP_ID, active = true, start = '2026-10-22', end = '2026-11-15', note = null, plan = PLAN } = {}) {
  const day = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  return {
    userPlanification_id: id, userPlanification_user_id: USER_ID, userPlanification_coach_id: COACH_ID,
    userPlanification_planification_id: plan.id, userPlanification_coach_note: note,
    userPlanification_start_date: day(start), userPlanification_end_date: day(end), userPlanification_active: active,
    userPlanification_created_at: CREATED, userPlanification_updated_at: CREATED,
    planification_id: plan.id, planification_name: plan.name, planification_duration: plan.duration, planification_active: plan.active,
  };
}

// Lo que viene despues del WHERE (el SELECT tambien nombra user_id y active, como columnas)
const afterWhere = (sql) => (sql.indexOf('WHERE') >= 0 ? sql.slice(sql.indexOf('WHERE')) : '');

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
  const realRepository = ds.getRepository(UserPlanification);

  let state = null;

  // Se guarda el SQL con sus parametros y las filas CRUDAS del caso pasan por el transformador REAL
  // de TypeORM (el mismo que usan getOne y getMany): asi se prueba tambien la hidratacion
  const intercept = (kind) => async function () {
    const [sql, params] = this.getQueryAndParameters();
    state.ops.push(`userPlanification.${kind}`);
    state.queries.push({ kind, sql, params });
    if (state.cfg.queryError) throw state.cfg.queryError;
    const transformer = new RawSqlResultsToEntityTransformer(this.expressionMap, this.connection.driver, [], [], undefined);
    const hydrated = transformer.transform(state.cfg.rows || [], this.expressionMap.mainAlias);
    return kind === 'getOne' ? (hydrated[0] ?? null) : hydrated;
  };
  SelectQueryBuilder.prototype.getOne = intercept('getOne');
  SelectQueryBuilder.prototype.getMany = intercept('getMany');

  // Un repositorio que el caso no deberia usar: cualquier llamada queda anotada y lanza
  const forbidden = (name) => new Proxy({}, {
    get: (_, prop) => (prop === 'then' ? undefined : () => { state.ops.push(`${name}.${String(prop)}`); throw new Error(`no debería usar ${name}`); }),
  });

  function build(cfg = {}) {
    state = { cfg, ops: [], queries: [], updates: [], args: {} };

    const userPlanificationRepository = {
      createQueryBuilder: (alias) => realRepository.createQueryBuilder(alias),
      update: async (criteria, partial) => {
        state.ops.push('userPlanification.update');
        state.updates.push({ criteria, partial });
        if (cfg.updateError) throw cfg.updateError;
        return { affected: 1 };
      },
      save: async () => { state.ops.push('userPlanification.save'); throw new Error('no debería usar save'); },
    };
    const userRepository = {
      findOne: async (o) => { state.ops.push('user.findOne'); state.args.user = o; return 'user' in cfg ? cfg.user : { id: USER_ID }; },
    };
    // Ni E-14 ni el listado abren una transaccion
    const dataSource = { createQueryRunner: () => { state.ops.push('queryRunner'); throw new Error('no debería abrir una transacción'); } };

    // Mismo orden que el constructor: planification, routine, routineAsignation, dataSource,
    // userPlanification, user, coach
    return new PlanificationService(forbidden('planification'), forbidden('routine'), forbidden('routineAsignation'), dataSource,
      userPlanificationRepository, userRepository, forbidden('coach'));
  }

  async function setActive(cfg, active, id = UP_ID) {
    const service = build(cfg);
    const res = makeRes();
    await service.setUserPlanificationActive(id, { active }, res);
    return { res, ops: [...state.ops], st: state };
  }

  async function list(cfg, query = { include_inactive: false }, userId = USER_ID) {
    const service = build(cfg);
    const res = makeRes();
    await service.getUserPlanifications(userId, query, res);
    return { res, ops: [...state.ops], st: state };
  }

  // ===================== E-14 =====================

  console.log('-- E-14 · quitar y reincorporar (spec §5.2)');

  await run('el método existe', async () => {
    check('setUserPlanificationActive es función', typeof build().setUserPlanificationActive === 'function');
  });

  await run('no existe → 404, sin escribir', async () => {
    const r = await setActive({ rows: [] }, false);
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje (el de §5.4 para una User_Planification que no existe)', same(r.res.body, { error: MSG.notFound }), JSON.stringify(r.res.body));
    check('sólo la lectura', same(r.ops, ['userPlanification.getOne']), r.ops.join(','));
  });

  await run('quitar una activa → 200: sólo apaga active, en un UPDATE', async () => {
    const before = Date.now();
    const r = await setActive({ rows: [rawRow({ active: true, note: 'Volver de la lesión' })] }, false);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('leer y un UPDATE, nada más (sin cascada, D11; sin transacción)', same(r.ops, ['userPlanification.getOne', 'userPlanification.update']), r.ops.join(','));
    const u = r.st.updates[0] || {};
    check('el UPDATE es por el id de la fila', same(u.criteria, { id: UP_ID }), JSON.stringify(u.criteria));
    check('cambia sólo active y updated_at', same(Object.keys(u.partial || {}).sort(), ['active', 'updated_at']), JSON.stringify(u.partial));
    check('active false', u.partial && u.partial.active === false);
    check('updated_at es el momento del cambio (a mano: hallazgo 4)', u.partial && u.partial.updated_at instanceof Date && u.partial.updated_at.getTime() >= before,
      u.partial && String(u.partial.updated_at));
    const b = r.res.body || {};
    check('la forma de una asignación', same(Object.keys(b), KEYS), Object.keys(b).join(','));
    check('active false en la respuesta', b.active === false, String(b.active));
    check('updated_at de la respuesta = el del UPDATE', !!u.partial && b.updated_at === u.partial.updated_at, String(b.updated_at));
    check('created_at no cambia', b.created_at instanceof Date && b.created_at.getTime() === CREATED.getTime(), String(b.created_at));
    check('fechas como día (hidratadas por TypeORM)', b.start_date === '2026-10-22' && b.end_date === '2026-11-15', `${b.start_date} ${b.end_date}`);
    check('sus datos', b.id === UP_ID && b.user_id === USER_ID && b.coach_id === COACH_ID && b.planification_id === PLAN_ID && b.coach_note === 'Volver de la lesión',
      JSON.stringify(b));
    check('la cabecera de la plantilla, del join', same(b.planification, PLAN), JSON.stringify(b.planification));
  });

  await run('quitar una ya quitada → 400, sin escribir', async () => {
    const r = await setActive({ rows: [rawRow({ active: false })] }, false);
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.alreadyInactive }), JSON.stringify(r.res.body));
    check('no escribió', same(r.ops, ['userPlanification.getOne']), r.ops.join(','));
  });

  await run('reincorporar una quitada → 200, sin volver a chequear el solapamiento (D23)', async () => {
    const r = await setActive({ rows: [rawRow({ active: false })] }, true);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('leer y un UPDATE: ninguna consulta de solapamiento', same(r.ops, ['userPlanification.getOne', 'userPlanification.update']), r.ops.join(','));
    const u = r.st.updates[0] || {};
    check('active true', u.partial && u.partial.active === true, JSON.stringify(u.partial));
    check('active true en la respuesta', r.res.body && r.res.body.active === true);
    check('vuelve con sus mismas fechas', r.res.body && r.res.body.start_date === '2026-10-22' && r.res.body.end_date === '2026-11-15');
  });

  await run('reincorporar una activa → 400, sin escribir', async () => {
    const r = await setActive({ rows: [rawRow({ active: true })] }, true);
    check('estado 400', r.res.statusCode === 400, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.alreadyActive }), JSON.stringify(r.res.body));
    check('no escribió', same(r.ops, ['userPlanification.getOne']), r.ops.join(','));
  });

  await run('reincorporar con la plantilla dada de baja → 200 (decisión del 21/10)', async () => {
    const r = await setActive({ rows: [rawRow({ active: false, plan: { ...PLAN, active: false } })] }, true);
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('no miró la plantilla aparte', same(r.ops, ['userPlanification.getOne', 'userPlanification.update']), r.ops.join(','));
    check('la cabecera trae active false', r.res.body && r.res.body.planification && r.res.body.planification.active === false);
  });

  await run('la consulta: por id, con la cabecera mínima y sin filtrar por estado ni por alumno', async () => {
    const r = await setActive({ rows: [rawRow()] }, false, UP_ID.toUpperCase());
    const q = r.st.queries[0];
    check('se consultó con getOne', !!q && q.kind === 'getOne');
    if (!q) return;
    console.log('        ' + q.sql);
    console.log('        ' + JSON.stringify(q.params));
    check('FROM User_Planification', /FROM "User_Planification" "userPlanification"/.test(q.sql), q.sql);
    check('INNER JOIN a la plantilla', /INNER JOIN "Planification" "planification" ON "planification"\."id"\s*=\s*"userPlanification"\."planification_id"/.test(q.sql));
    check('de la plantilla, sólo id, name, duration y active',
      ['id', 'name', 'duration', 'active'].every(c => q.sql.includes(`"planification"."${c}" AS "planification_${c}"`))
      && !q.sql.includes('"planification"."description"') && !q.sql.includes('"planification"."number_of_routines"') && !q.sql.includes('"planification"."type"'));
    check('filtra por el id', /^WHERE "userPlanification"\."id" = \$1$/.test(afterWhere(q.sql).trim()), afterWhere(q.sql));
    check('parámetros: el id tal como vino (Postgres compara los uuid sin mirar mayúsculas)', same(q.params, [UP_ID.toUpperCase()]), JSON.stringify(q.params));
    check('el UPDATE usa el id de la fila, en minúscula', same((r.st.updates[0] || {}).criteria, { id: UP_ID }), JSON.stringify((r.st.updates[0] || {}).criteria));
    check('la respuesta devuelve el id de la fila', r.res.body && r.res.body.id === UP_ID);
  });

  await run('el UPDATE que arma TypeORM con esos argumentos', async () => {
    const r = await setActive({ rows: [rawRow()] }, false);
    const u = r.st.updates[0];
    check('hubo UPDATE', !!u);
    if (!u) return;
    // Lo mismo que hace Repository.update(criteria, partial): EntityManager.update arma
    // createQueryBuilder().update(target).set(partial).where(criteria)
    const [sql, params] = ds.createQueryBuilder().update(UserPlanification).set(u.partial).where(u.criteria).getQueryAndParameters();
    console.log('        ' + sql);
    check('SET active y updated_at, nada más (sin onUpdate implícito)', /^UPDATE "User_Planification" SET "active" = \$1, "updated_at" = \$2 WHERE/.test(sql), sql);
    check('WHERE por id', /WHERE "id" = \$3$/.test(sql), sql);
    // El driver de Postgres de TypeORM persiste los booleanos como 0/1, que Postgres acepta para boolean
    check('parámetros: 0 (false), la fecha y el id', params.length === 3 && params[0] === 0 && params[1] === u.partial.updated_at && params[2] === UP_ID, JSON.stringify(params));
  });

  await run('nota null → coach_note null; plantilla sin nombre → name null', async () => {
    const r = await setActive({ rows: [rawRow({ note: null, plan: { ...PLAN, name: null } })] }, false);
    check('coach_note null', r.res.body && r.res.body.coach_note === null, JSON.stringify(r.res.body));
    check('name null', r.res.body && r.res.body.planification && r.res.body.planification.name === null);
  });

  console.log('\n-- E-14 · errores de la base');

  await run('falla el UPDATE → 500 y se loguea', async () => {
    let r;
    const logged = await silencing(async () => { r = await setActive({ rows: [rawRow()], updateError: new QueryFailedError('SQL', [], new Error('se cayó la base')) }, false); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.setActive500 }), JSON.stringify(r.res.body));
    check('console.error', logged === 1, logged);
  });

  await run('falla la lectura → 500', async () => {
    let r;
    await silencing(async () => { r = await setActive({ queryError: new Error('se cayó la base') }, false); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.setActive500 }), JSON.stringify(r.res.body));
  });

  // ===================== LISTADO =====================

  console.log('\n-- Listado · planes de un alumno (spec §5.3)');

  await run('el método existe', async () => {
    check('getUserPlanifications es función', typeof build().getUserPlanifications === 'function');
  });

  await run('usuario inexistente → 404, sin listar', async () => {
    const r = await list({ user: null });
    check('estado 404', r.res.statusCode === 404, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.userNotFound }), JSON.stringify(r.res.body));
    check('sólo buscó al usuario', same(r.ops, ['user.findOne']), r.ops.join(','));
    check('lo buscó por el id del path, trayendo sólo el id', r.st.args.user && r.st.args.user.where.id === USER_ID && same(r.st.args.user.select, { id: true }),
      JSON.stringify(r.st.args.user));
  });

  await run('por defecto: sólo las activas del alumno, de la más nueva a la más vieja', async () => {
    const rows = [rawRow({ id: 'up-2', start: '2026-11-16', end: '2026-12-13' }), rawRow({ id: 'up-1' })];
    const r = await list({ rows }, { include_inactive: false }, USER_ID.toUpperCase());
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('el usuario y una consulta', same(r.ops, ['user.findOne', 'userPlanification.getMany']), r.ops.join(','));
    const q = r.st.queries[0];
    if (!q) return;
    console.log('        ' + q.sql);
    console.log('        ' + JSON.stringify(q.params));
    check('FROM User_Planification', /FROM "User_Planification" "userPlanification"/.test(q.sql), q.sql);
    check('INNER JOIN a la plantilla', /INNER JOIN "Planification" "planification" ON "planification"\."id"\s*=\s*"userPlanification"\."planification_id"/.test(q.sql));
    check('de la plantilla, sólo id, name, duration y active',
      ['id', 'name', 'duration', 'active'].every(c => q.sql.includes(`"planification"."${c}" AS "planification_${c}"`))
      && !q.sql.includes('"planification"."description"') && !q.sql.includes('"planification"."number_of_routines"'));
    check('filtra por el alumno', /"userPlanification"\."user_id" = \$1/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('sólo las activas', /"userPlanification"\."active" = true/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('sin filtro de fechas', !/start_date|end_date/.test(afterWhere(q.sql).split('ORDER BY')[0]), afterWhere(q.sql));
    check('orden: inicio y alta, de la más nueva a la más vieja (el del overlapping de E-13)',
      /ORDER BY "userPlanification"\."start_date" DESC, "userPlanification"\."created_at" DESC$/.test(q.sql), q.sql.slice(q.sql.indexOf('ORDER BY')));
    check('parámetros: el id de la fila del alumno, en minúscula', same(q.params, [USER_ID]), JSON.stringify(q.params));
    const b = r.res.body;
    check('un array, en el orden de la consulta', Array.isArray(b) && same(b.map(o => o.id), ['up-2', 'up-1']), JSON.stringify(b));
    check('cada una con la forma de una asignación', Array.isArray(b) && b.every(o => same(Object.keys(o), KEYS)), Array.isArray(b) && b[0] && Object.keys(b[0]).join(','));
    check('fechas como día', Array.isArray(b) && b[0] && b[0].start_date === '2026-11-16' && b[0].end_date === '2026-12-13');
    check('la cabecera de la plantilla', Array.isArray(b) && b[1] && same(b[1].planification, PLAN), Array.isArray(b) && b[1] && JSON.stringify(b[1].planification));
  });

  await run('include_inactive: true → todas, también las quitadas', async () => {
    const rows = [rawRow({ id: 'up-2', active: false }), rawRow({ id: 'up-1', active: true })];
    const r = await list({ rows }, { include_inactive: true });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    const q = r.st.queries[0];
    if (!q) return;
    check('no filtra por active', !/"userPlanification"\."active"/.test(afterWhere(q.sql)), afterWhere(q.sql));
    check('sigue filtrando por el alumno', /"userPlanification"\."user_id" = \$1/.test(afterWhere(q.sql)));
    check('mismo orden', /ORDER BY "userPlanification"\."start_date" DESC, "userPlanification"\."created_at" DESC$/.test(q.sql));
    check('la quitada viene con active false', Array.isArray(r.res.body) && r.res.body[0] && r.res.body[0].active === false, JSON.stringify(r.res.body));
  });

  await run('sin include_inactive en el query → como false', async () => {
    const r = await list({ rows: [] }, {});
    const q = r.st.queries[0];
    check('filtra las activas', !!q && /"userPlanification"\."active" = true/.test(afterWhere(q.sql)), q && afterWhere(q.sql));
  });

  await run('sin asignaciones → 200 con []', async () => {
    const r = await list({ rows: [] });
    check('estado 200', r.res.statusCode === 200, r.res.statusCode);
    check('array vacío', same(r.res.body, []), JSON.stringify(r.res.body));
  });

  await run('falla la consulta → 500 y se loguea', async () => {
    let r;
    const logged = await silencing(async () => { r = await list({ queryError: new Error('se cayó la base') }); });
    check('estado 500', r.res.statusCode === 500, r.res.statusCode);
    check('mensaje', same(r.res.body, { error: MSG.list500 }), JSON.stringify(r.res.body));
    check('console.error', logged === 1, logged);
  });

  finish();
})();
```

- [ ] **Paso 4: correr los tres en rojo** (el código todavía no cambió)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/fa31ea20-323e-4bd7-ad06-47ea181b224e/scratchpad/be19"
cd "$SCRATCH" && for s in verify-user-plan-dto verify-user-plan-controller verify-user-plan-rules; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado (corrido al escribir el plan): **`0 ok, 19 fallas`**, **`31 ok, 22 fallas`** y **`0 ok, 19 fallas`**. El DTO y las reglas fallan enteros porque los archivos y los métodos no existen. En el del controller, las 31 que ya dan `ok` son los handlers de E-08 a E-13 que sí llaman al service y lo que el Swagger ya tiene (E-13 y las plantillas); fallan las rutas nuevas, los tres andamiajes, los cuatro handlers que no llaman a nada y el Swagger de los dos endpoints. Si alguna otra da `ok`, revisar que la prueba no sea trivial.

---

## Tarea 2 — DTOs (spec §5.2 y §5.3)

**Archivos:** crear dos en `power-app/src/dtos/planification/`.

- [ ] **Paso 1: `set_user_planification_active.dto.ts`**

```ts
import { IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetUserPlanificationActiveDto {

    @ApiProperty({ example: false, description: 'false para quitarle la planificación al alumno (baja lógica), true para reincorporarla con sus mismas fechas. Pedir el estado que ya tiene da 400' })
    @IsNotEmpty()
    @IsBoolean()
    active!: boolean;
}
```

- [ ] **Paso 2: `get_user_planifications_query.dto.ts`**

```ts
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// El mismo parametro y la misma transformacion que los listados de plantillas
// (GetPlanificationsQueryDto), sin keyword ni type: el listado del alumno no los usa
export class GetUserPlanificationsQueryDto {

    @ApiPropertyOptional({ example: false, default: false, description: 'true para incluir también las asignaciones quitadas (E-14)' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    include_inactive?: boolean = false;
}
```

---

## Tarea 3 — Service (spec §5.2 y §5.3)

**Archivos:** `power-app/src/planification/planification.service.ts`.

- [ ] **Paso 1: imports.** Debajo de `import { AssignPlanificationToUserDto } from '../dtos/planification/assign_planification_to_user.dto';` agregar:

```ts
import { SetUserPlanificationActiveDto } from '../dtos/planification/set_user_planification_active.dto';
import { GetUserPlanificationsQueryDto } from '../dtos/planification/get_user_planifications_query.dto';
```

- [ ] **Paso 2: el título de la sección.** Reemplazar

```ts
    // ===================== ASIGNACIONES A ALUMNOS (CU-E-13) =====================
```

por

```ts
    // ===================== ASIGNACIONES A ALUMNOS (CU-E-13, CU-E-14 y el listado) =====================
```

- [ ] **Paso 3: los dos métodos.** Entre el cierre de `assignPlanificationToUser` y `// ===================== HELPERS =====================`:

```ts
    // Quitar y reincorporar (CU-E-14, D23): el mismo endpoint en los dos sentidos, como el resto de
    // las bajas logicas. Quitar solo apaga el flag, porque no hay nada que cascadear (D11): el plan
    // sale del home y lo que el alumno hizo sigue en el historial. Reincorporar no vuelve a chequear
    // el solapamiento (D23) ni la plantilla o la cuenta del alumno (decision del 21/10): deshace la
    // baja y deja la asignacion como estaba
    async setUserPlanificationActive(
        idUserPlanification: string,
        setUserPlanificationActiveDto: SetUserPlanificationActiveDto,
        res: Response
    ) {
        const active = setUserPlanificationActiveDto.active;

        try {
            // Sin filtrar por estado: para reincorporarla hay que encontrar la quitada
            const userPlanification = await this.userPlanificationQuery()
                .where('userPlanification.id = :idUserPlanification', { idUserPlanification })
                .getOne();

            if (!userPlanification) {
                return res.status(404).send({ error: 'Asignación no encontrada' });
            }

            // Pedir el estado que ya tiene es 400: es el "informa que no hay nada que quitar" del CU
            if (userPlanification.active === active) {
                return res.status(400).send({
                    error: active
                        ? 'La planificación del alumno ya está activa.'
                        : 'La planificación del alumno ya está dada de baja.'
                });
            }

            // Un solo UPDATE de las dos columnas, por el id de la fila (el del path puede venir en
            // mayuscula). updated_at se setea a mano: el onUpdate de las entidades es sintaxis de
            // MySQL y en Postgres no hace nada (hallazgo 4)
            const updatedAt = new Date();

            await this.userPlanificationRepository.update(
                { id: userPlanification.id },
                { active, updated_at: updatedAt },
            );

            userPlanification.active = active;
            userPlanification.updated_at = updatedAt;

            res.status(200).send(
                this.buildUserPlanificationResponse(userPlanification, userPlanification.planification)
            );
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al actualizar el estado de la planificación del alumno.' });
        }
    }

    // Los planes de un alumno (spec §5.3): el paso 1 de CU-E-14, y el alumno ve los suyos. Por
    // defecto solo los activos; con include_inactive, tambien los quitados
    async getUserPlanifications(
        userId: string,
        query: GetUserPlanificationsQueryDto,
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

            // El id de la fila y no el del path: el iOS manda los UUID en mayuscula
            const userPlanificationsQuery = this.userPlanificationsOfUserQuery(user.id);

            if (!query.include_inactive) {
                userPlanificationsQuery.andWhere('userPlanification.active = true');
            }

            const userPlanifications = await userPlanificationsQuery.getMany();

            res.status(200).send(userPlanifications.map(
                userPlanification => this.buildUserPlanificationResponse(userPlanification, userPlanification.planification)
            ));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener las planificaciones del alumno.' });
        }
    }

```

- [ ] **Paso 4: los helpers.** Reemplazar `findOverlappingAssignments` entero (su comentario y el método) y el comentario de `buildUserPlanificationResponse` por esto (el cuerpo de `buildUserPlanificationResponse` no cambia):

```ts
    // La base de las lecturas de asignaciones: cada una con la cabecera de su plantilla, solo lo que
    // lleva la forma de una asignacion (spec §5). Inner join: planification_id es NOT NULL con
    // RESTRICT (D19), asi que la plantilla siempre esta
    private userPlanificationQuery(): SelectQueryBuilder<UserPlanification> {
        return this.userPlanificationRepository
            .createQueryBuilder('userPlanification')
            .innerJoin('userPlanification.planification', 'planification')
            .addSelect(['planification.id', 'planification.name', 'planification.duration', 'planification.active']);
    }

    // Las asignaciones de un alumno, de la mas nueva a la mas vieja: inicio y despues alta,
    // descendentes (spec §5.3). La comparten el listado y el overlapping del 409 de E-13, para que
    // el web no vea dos ordenes distintos
    private userPlanificationsOfUserQuery(userId: string): SelectQueryBuilder<UserPlanification> {
        return this.userPlanificationQuery()
            .where('userPlanification.user_id = :userId', { userId })
            .orderBy('userPlanification.start_date', 'DESC')
            .addOrderBy('userPlanification.created_at', 'DESC');
    }

    // Las asignaciones ACTIVAS del alumno cuyo rango se pisa con [startDate, endDate], con los dos
    // extremos inclusivos: empiezan antes o el mismo dia en que termina la nueva, y terminan despues
    // o el mismo dia en que empieza. Las quitadas (E-14) no cuentan
    private findOverlappingAssignments(
        userId: string,
        startDate: string,
        endDate: string
    ): Promise<UserPlanification[]> {
        return this.userPlanificationsOfUserQuery(userId)
            .andWhere('userPlanification.active = true')
            .andWhere('userPlanification.start_date <= :endDate', { endDate })
            .andWhere('userPlanification.end_date >= :startDate', { startDate })
            .getMany();
    }

    // La forma de una asignacion (spec del bloque B, §5): la usan E-13 (la creada y las que se
    // pisan), E-14 y el listado del alumno. La cabecera del plan se lee de la plantilla (D18)
```

El SQL del solapamiento queda igual: los `WHERE` en el mismo orden (alumno, activa, inicio, fin), así que los parámetros siguen siendo `[alumno, fin, inicio]`, y el `ORDER BY` es el mismo. Lo confirma la regresión de BE-18b (Tarea 5).

---

## Tarea 4 — Controller (spec §5 y §5.2–§5.3)

**Archivos:** `power-app/src/planification/planification.controller.ts`.

- [ ] **Paso 1: imports.** En el import de `@nestjs/common`, sacar `Delete,` (lo usaba sólo el andamiaje). Sacar la línea `import { UserPlanification } from '../entities/user_planification.entity';` (la usaban sólo los andamiajes). Reemplazar

```ts
import { AuthUser } from '../authentication/auth-user.interface';
// Los andamiajes de E-14 que quedan abajo (GET /user/:id/active, POST /user/edit/:id y
// DELETE /user/:id) los retira BE-19: una asignacion no se edita (D22) y quitarla es set-active (D23)
```

por

```ts
import { AuthUser } from '../authentication/auth-user.interface';
import { Owner } from '../authentication/decorators/owner.decorator';
import { SetUserPlanificationActiveDto } from '../dtos/planification/set_user_planification_active.dto';
import { GetUserPlanificationsQueryDto } from '../dtos/planification/get_user_planifications_query.dto';
import { AssignedRoutinesParamsDto } from '../dtos/routine/assigned_routines_params.dto';
```

(El comentario de E-19 y E-20 que sigue queda como está.)

- [ ] **Paso 2: la sección.** Reemplazar `// ===================== ASIGNACIONES A ALUMNOS (CU-E-13, E-14, U-08) =====================` por `// ===================== ASIGNACIONES A ALUMNOS (CU-E-13 y CU-E-14) =====================` (la parte del plan de U-08 es BE-20 y vive en `routine/`, D27).

- [ ] **Paso 3: los handlers.** Reemplazar los cuatro andamiajes enteros (`@Get('/user/:id')`, `@Get('/user/:id/active')`, `@Post('/user/edit/:id')` y `@Delete('/user/:id')`, con sus decoradores y métodos), que están entre el cierre de `assignPlanificationToUser` y el cierre de la clase, por:

```ts
    // Quitar o reincorporar (D23). Coach y admin: a diferencia de E-13 no se guarda quien lo hizo, y
    // el gimnasio es compartido (D6). Reemplaza al DELETE /user/:id del andamiaje
    @Post('/user/set-active/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: UserPlanificationResponseDto, description: 'La asignación con su nuevo estado. Quitar sólo apaga active; reincorporar no vuelve a chequear el solapamiento' })
    @ApiResponse({ status: 400, description: 'Datos inválidos, o la asignación ya está en ese estado (La planificación del alumno ya está dada de baja. / ya está activa.)' })
    @ApiResponse({ status: 404, description: 'Asignación no encontrada' })
    async setUserPlanificationActive(
        @Param() idUserPlanification: ParameterIdDto,
        @Body() setUserPlanificationActiveDto: SetUserPlanificationActiveDto,
        @Res() res: Response,
    ) {
        await this.planificationService.setUserPlanificationActive(idUserPlanification.id, setUserPlanificationActiveDto, res);
    }

    // Con el rol user, @Owner exige que :userId sea el propio id (403); coach y admin ven los de
    // cualquier alumno (D6). Reemplaza al GET /user/:id del andamiaje, que tomaba el param id
    @Get('/user/:userId')
    @Auth(UserRole.user, UserRole.coach, UserRole.admin)
    @Owner('userId')
    @ApiResponse({ status: 200, type: [UserPlanificationResponseDto], description: 'Las asignaciones del alumno, de la más nueva a la más vieja (inicio y alta, descendentes). Por defecto sólo las activas. Sin asignaciones, un array vacío' })
    @ApiResponse({ status: 400, description: 'El id del alumno no es un UUID válido, o include_inactive no es true ni false' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async getUserPlanifications(
        @Param() params: AssignedRoutinesParamsDto,
        @Query() query: GetUserPlanificationsQueryDto,
        @Res() res: Response,
    ) {
        await this.planificationService.getUserPlanifications(params.userId, query, res);
    }

```

---

## Tarea 5 — Compilar y verificar

- [ ] **Paso 1: build.** `cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build`. Esperado: sin errores. Si falla por un import que quedó sin uso o por el tipo del `update`, corregir sin `as`.

- [ ] **Paso 2: los tres scripts nuevos, en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/fa31ea20-323e-4bd7-ad06-47ea181b224e/scratchpad/be19"
cd "$SCRATCH" && for s in verify-user-plan-dto verify-user-plan-controller verify-user-plan-rules; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: cada uno termina en `N ok, 0 fallas`, sin líneas `FALLA`. Si una regex del SQL falla por comillas o alias, **leer el SQL impreso primero** (`node verify-user-plan-rules.js | grep -B1 -A3 "la consulta"`) y ajustar el script, no el código. Si el falso no soporta algo que el service llama, ampliar el falso, no el service.

- [ ] **Paso 3: la regresión de BE-18b, en verde**

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/fa31ea20-323e-4bd7-ad06-47ea181b224e/scratchpad/be19"
cd "$SCRATCH" && for s in verify-assign-plan-controller verify-assign-plan-rules verify-assign-plan-typeorm; do echo "== $s"; node $s.js | grep -E "FALLA|fallas$"; done
```
Esperado: los mismos `27`, `107` y `29 ok, 0 fallas` de la Tarea 0. El de reglas imprime el SQL del solapamiento y exige el mismo `WHERE`, los mismos parámetros y el mismo `ORDER BY`: es lo que prueba que la refactorización no lo cambió.

- [ ] **Paso 4: no queda ningún andamiaje en el backend, y nadie más cambió**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git grep -nE "^\s*// (return )?(await )?this\.\w+Service\." -- power-app/src ; git grep -n "user/:id/active\|user/edit/:id\|editUserPlanificationDto" -- power-app/src ; git status --short
```
Esperado: los dos `git grep` sin resultados, y en `git status` sólo los cuatro archivos de código del mapa: dos modificados (service y controller) y dos nuevos (los DTOs).

---

## Tarea 6 — Spec de CU-E-14 (repo PowerApp-Docs)

**Archivos:** `Use Cases/entrenador/CU-E-14-eliminar-planificacion-a-alumno.md` (reemplazo completo). Sigue el formato de CU-E-12c y CU-E-13.

- [ ] **Paso 1: el archivo**

```markdown
# CU-E-14 — Eliminar Planificación a Alumno (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Quita la planificación asignada a un alumno dando de baja lógica su User_Planification (active = false), o la vuelve a incorporar. Nunca se borra físicamente, para preservar el historial de entrenamiento del alumno. Quitarla sólo apaga la asignación: las rutinas del plan se leen siempre de la planificación, así que no hay nada más que dar de baja.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- La consulta de las planificaciones asignadas al alumno, para elegir cuál quitar o reincorporar.
- Baja lógica de una User_Planification.
- Reincorporación de esa misma User_Planification, con sus mismas fechas.

**Fuera de alcance:**

- Borrado físico de la asignación.
- Baja de la planificación sistémica (plantilla, CU-E-11).
- Editar una asignación: para cambiar sus fechas, el entrenador la quita y la asigna de nuevo (CU-E-13).
- Baja de lo que el alumno entrenó: su historial se conserva intacto.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La asignación existe.
- El gimnasio es compartido: cualquier entrenador puede quitar o reincorporar la planificación de cualquier alumno, la haya asignado él o no.

## Postcondiciones

- **Al quitar:** la User_Planification queda con active = false. El plan sale del home del alumno y deja de contar para el aviso de solapamiento al asignarle otra planificación (CU-E-13). Lo que el alumno entrenó sigue en su historial (CU-E-06).
- **La asignación quitada queda congelada para el alumno:** puede seguir abriendo sus rutinas y viendo lo que hizo, pero ya no puede marcar, desmarcar ni anotar ejercicios en ella.
- **Al reincorporar:** la User_Planification vuelve a active = true, con sus mismas fechas, y el plan reaparece en el home del alumno.

## Camino principal (flujo básico)

1. El entrenador abre las planificaciones asignadas al alumno. Por defecto ve las vigentes; puede pedir también las quitadas.
2. Elige una y solicita quitarla.
3. El sistema pide confirmación, advirtiendo que es un borrado lógico.
4. El sistema marca la User_Planification con active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — El alumno no existe

1. El sistema informa el error.

### En el paso 3 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 4 — La planificación ya estaba dada de baja

1. La planificación del alumno ya está inactiva (por ejemplo, otro entrenador la quitó mientras tanto).
2. El sistema informa que ya está dada de baja: no hay nada que quitar.

### En el paso 4 — La asignación no existe

1. La asignación seleccionada ya no existe.
2. El sistema informa el error y no modifica nada.

### Reincorporar la planificación

1. En el paso 1, el entrenador pide también las quitadas, elige una y solicita reincorporarla.
2. El sistema la marca con active = true y confirma. Vuelve con sus mismas fechas.
3. El sistema **no vuelve a verificar el solapamiento**: si el alumno tiene otra planificación vigente en esas fechas, las dos conviven, como cuando se confirma el aviso en CU-E-13.
4. Tampoco verifica que la planificación siga activa ni que la cuenta del alumno siga abierta: reincorporar deshace la baja y deja la asignación como estaba antes de quitarla.

### Reincorporar una planificación que ya está activa

1. La planificación del alumno ya está activa (por ejemplo, otro entrenador la reincorporó mientras tanto).
2. El sistema informa que ya está activa y no modifica nada.
```

- [ ] **Paso 2: control**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && grep -c "User_Routine" "Use Cases/entrenador/CU-E-14-eliminar-planificacion-a-alumno.md"
```
Esperado: `0`.

---

## Tarea 7 — Status (informe y dashboard)

**Archivos:** `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html`. **Los cambios fechados anteriores no se tocan.**

**Conteos nuevos:** ✅ 67 · 🟡 7 · 🔵 0 · ⬜ 0 · sin backend 1 (de 75). Entrenador: 32 ✅. Porcentajes: ✅ **89%** de 75 (67/75 = 89,33), 🔵 0%; **91%** de los 74 con backend (67/74 = 90,54); Entrenador **100%** (32/32).

- [ ] **Paso 1: entrada nueva arriba de la de BE-18b**: `## Cambios recientes (2026-10-21 · bloque B: quitar o reincorporar la planificación de un alumno, y sus planes)`, **con el porqué de cada punto**. Puntos obligatorios:
  - **Vigésima tarea del roadmap (BE-19): CU-E-14 y el listado del alumno.** Plan: `Doc/plans/2026-10-21-be-19-quitar-planificacion-y-listado-plan.md` (repo PowerApp-Docs).
  - **E-14, el contrato** (§5.2): `POST /planification/user/set-active/:id`, coach y admin, body `{ active }`. `404` `Asignación no encontrada` → `400` si ya está en ese estado (los dos textos) → `200` con la forma de una asignación. Quitar sólo apaga `active` (por qué: D11 eliminó `User_Routine` y la cabecera se lee de la plantilla, así que no hay nada que cascadear; el roadmap todavía hablaba de cascada). Reincorporar no vuelve a chequear el solapamiento (D23: el peor caso es convivir, que D21 admite).
  - **El listado** (§5.3): `GET /planification/user/:userId?include_inactive=`, user con `@Owner('userId')`, coach y admin. `404` si el usuario no existe; `200` de la más nueva a la más vieja (el mismo orden que el `overlapping` de E-13, por qué: el web no ve dos órdenes); por defecto sólo las activas. Reemplaza al andamiaje `GET /user/:id`, que colgaba y usaba el param `id`.
  - **Se retiran** `GET /planification/user/:id/active`, `POST /planification/user/edit/:id` (D22: una asignación no se edita) y `DELETE /planification/user/:id` (la baja es lógica, D23). **Eran las últimas rutas que colgaban en todo el backend**: el tile de andamiaje queda en 0.
  - **Decisión del 21/10 con el usuario:** reincorporar no valida la plantilla ni la cuenta del alumno, y por qué (hallazgo 1 del plan).
  - **Decisiones del plan:** los textos; el `UPDATE` de dos columnas con `updated_at` a mano (hallazgo 4) y la carrera de dos bajas simultáneas aceptada; el query nuevo sólo con `include_inactive` (y por qué no `GetPlanificationsQueryDto`); el listado no mira el rol ni la cuenta; la consulta de solapamiento comparte la base con E-14 y el listado, con el mismo SQL.
  - **Lo congelado (D24)** se cumple por construcción: todavía no hay forma de marcar en una sesión del plan; el `400` lo suma BE-20c.
  - **Verificación:** build; los tres scripts nuevos (DTO, controller y Swagger con el chequeo de que ningún handler de `planification/` cuelga, reglas con el SQL e hidratación sin base y el `UPDATE` que arma TypeORM), con sus números en rojo y en verde; la regresión de BE-18b en verde con el mismo SQL del solapamiento; el `git grep` sin andamiajes. **Qué no se verificó:** el SQL contra un Postgres y el runtime (BE-35).
  - **E-14 pasa de 🔵 a ✅ (67 ✅ · 7 🟡 · 0 🔵): el Entrenador queda completo (32 de 32).** Spec de CU reescrita: **E-14** (sin `User_Routine`, sólo apaga la asignación, el camino de reincorporar y lo congelado). **De paso:** la fila de U-08 nombraba como faltante un andamiaje que se retira acá; ahora nombra `GET /routine/assigned-plan/:userId` (BE-20). **Para el web:** B7 tipa contra §5.2 y §5.3. **Sigue BE-20** (el plan en el home).

- [ ] **Paso 2: secciones vivas del informe**
  - Tabla de resumen: `| ✅ Implementado | 67 | 89% |…` y `| 🔵 Andamiaje | 0 | 0% |…`.
  - La línea de abajo: `**67 de los 74 CU con backend están completos (91%).** Faltan 7, todos parciales: ya no queda ninguno sin endpoint ni en andamiaje. Dos de los ✅ tienen un defecto abierto (⚠): CU-E-29 y CU-A-04.`
  - Cobertura por rol: `| Entrenador | 32 | 32 | 0 | 0 | 0 | 0 | 100% |` y `| **Total** | **75** | **67** | **7** | **0** | **0** | **1** | **91%** |`.
  - Encabezado: `## Detalle — Rol Entrenador (32 CU · 100%)`.
  - Fila de **CU-U-08**: reemplazar `**falta la parte del plan**: \`GET /planification/user/:id/active\` sigue colgando · BE-20` por `**falta la parte del plan**: \`GET /routine/assigned-plan/:userId\` (spec del bloque B, §5.5) · BE-20`.
  - Fila de **CU-E-14**: `| CU-E-14 | Eliminar planificación a alumno | ✅ Implementado | \`POST /planification/user/set-active/:id\` · quitar y reincorporar (\`{ active }\`), coach y admin · \`400\` si ya está en ese estado · quitar sólo apaga la asignación (sin cascada); reincorporar no vuelve a chequear el solapamiento · 404 → 400 · el paso 1 es \`GET /planification/user/:userId?include_inactive=\` (BE-19, 21/10) |`
  - "Plan de trabajo", fila de la fase 3: `en curso: BE-17, BE-18, BE-18b y BE-19 hechas (20 y 21/10)`.

- [ ] **Paso 3: dashboard**
  - Tile de implementados: `<div class="n">67</div>` y `89% · cumple su spec`. Tile de andamiaje: `<div class="n">0</div>` y `0% · ruta que cuelga`.
  - La barra: `aria-label="67 implementados, 7 parciales, 0 andamiaje, 0 no implementados y 1 sin backend, de 75"`, `s-done` a `width:89.33%`, y **se saca** el `<span class="s-stub" …>` (como el de no implementados, que no está).
  - El pie de la barra: `<b>67 de los 74</b> CU con backend completos (91%)` y `<b>7</b> pendientes (7 parciales) · ninguno sin endpoint ni en andamiaje · 1 sin backend (U-14)`.
  - Tarjeta del Entrenador: `100%`, `32 de 32 · circuitos, rutinas, planificaciones, la asignación individual, el historial y asignar y quitar planificaciones cerrados`, la mini barra con un solo `<span style="width:100%;background:var(--done)"></span>`, y en la leyenda sólo `<b>32</b> impl.` (sale `andam.`).
  - Título de sección: `Rol Entrenador` → `32 CU · 100% implementado`.
  - Fila de CU-U-08: `· falta la parte del plan: </span><span class="verb">GET</span> /routine/assigned-plan/:userId <span class="muted">(spec del bloque B, §5.5) · BE-20</span>`.
  - Fila de CU-E-14: `<span class="chip done"><span class="cd"></span>Implementado</span>` y `<span class="verb">POST</span> /planification/user/set-active/:id <span class="muted">· quitar y reincorporar, coach y admin · 400 si ya está en ese estado · sin cascada y sin volver a chequear el solapamiento · el paso 1: </span><span class="verb">GET</span> /planification/user/:userId <span class="muted">(BE-19, 21/10)</span>`.
  - Fila de la fase 3: `<span class="muted">BE-17, BE-18, BE-18b y BE-19 (20 y 21/10)</span>`.
  - El pie de página: `67 impl · 7 parc · 0 andam · 0 falta · 1 sin backend — de 75 · corte 2026-10-21`.

- [ ] **Paso 4: control de los conteos**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Status" && grep -c "✅ Implementado |" estado-implementacion-backend.md && grep -c "🔵 Andamiaje |" estado-implementacion-backend.md && grep -c 'chip done"><span class="cd"></span>Implementado' dashboard-estado-backend.html && grep -c 'chip stub"><span class="cd"></span>Andamiaje' dashboard-estado-backend.html && grep -c "planification/user/:id/active" estado-implementacion-backend.md
```
Esperado: `68`, `1`, `68`, `1` y `2`. Cada patrón de estado aparece una vez más que el conteo: en el informe, por la fila de la tabla de resumen; en el dashboard, por la leyenda del pie. Antes del cambio dan `67`, `2`, `67`, `2` y `2` (verificado al escribir el plan: la entrada del 18/10 y la fila viva de U-08). Después, las 2 menciones de `planification/user/:id/active` son la entrada del 18/10 y la nueva, que lo nombra **una sola vez**, en el punto de lo que se retira (el punto de U-08 no repite la ruta). Si da otro número, buscar y revisar que ninguna sea de una sección viva.

---

## Tarea 8 — Stage y mensajes de commit

- [ ] **Paso 1: backend**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/dtos/planification/set_user_planification_active.dto.ts power-app/src/dtos/planification/get_user_planifications_query.dto.ts power-app/src/planification/planification.service.ts power-app/src/planification/planification.controller.ts Status/estado-implementacion-backend.md Status/dashboard-estado-backend.html && git status --short && git diff --cached --stat
```
Esperado: sólo esos seis archivos en el stage y nada fuera de él.

- [ ] **Paso 2: docs**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && git add "Doc/plans/2026-10-21-be-19-quitar-planificacion-y-listado-plan.md" "Use Cases/entrenador/CU-E-14-eliminar-planificacion-a-alumno.md" && git status --short
```

- [ ] **Paso 3: proponer un mensaje por repo, sin commitear ni pushear.**
  - Backend: `BE-19: quitar o reincorporar la planificacion de un alumno (E-14) y sus planes, POST /planification/user/set-active/:id y GET /planification/user/:userId` y, como cuerpo: `Quitar solo apaga la asignacion, sin cascada; reincorporar la prende sin volver a chequear el solapamiento, la plantilla ni la cuenta del alumno, y pedir el estado que ya tiene da 400. El listado trae las asignaciones del alumno de la mas nueva a la mas vieja, por defecto solo las activas. Se retiran los andamiajes GET /user/:id/active, POST /user/edit/:id y DELETE /user/:id: ya no queda ninguna ruta que cuelgue. Status: E-14 pasa a implementado (67 de 74) y el Entrenador queda completo.`
  - Docs: `Plan de BE-19 y spec de E-14 reescrita: quitar solo apaga la asignacion, se puede reincorporar y lo quitado queda congelado para el alumno`.

---

## Tarea 9 — Memoria del proyecto

- [ ] **Paso 1:** actualizar `project_cu_status.md` (BE-19 hecha y stageada, E-14 ✅, 67 de 74, el Entrenador completo, ninguna ruta colgando; la decisión del 21/10 sobre reincorporar; sigue BE-20) y su línea en `MEMORY.md`.

---

## 4. Qué NO verifica este plan

- **El SQL contra un Postgres de verdad:** las dos lecturas y el `UPDATE` se verifican como texto y con filas armadas a mano.
- **Que los guards hagan lo suyo en esta ruta:** se prueba la metadata (`roles`, `@Owner('userId')`), no el `OwnerGuard` corriendo; el guard se probó en BE-02.
- **El runtime** de E-14 y del listado (BE-35, contra Render regenerado y con el seed de BE-21, que todavía no trae asignaciones de plan).

## 5. Autoevaluación contra la spec

- **§5.2:** el body (Tarea 2, paso 1), el `404`, los dos `400`, el `UPDATE` sin cascada y la reincorporación sin solapamiento (Tarea 3, paso 3). Los prueba la Tarea 1, paso 3.
- **§5.3:** el `404`, el orden, el filtro por defecto e `include_inactive` (Tarea 2, paso 2, y Tarea 3, pasos 3 y 4). Los prueban la Tarea 1, pasos 1 y 3.
- **§5 tabla y retiro:** las dos rutas con sus roles y `@Owner`, y los tres andamiajes fuera (Tarea 4), probados en la Tarea 1, paso 2, y con el `git grep` de la Tarea 5.
- **§5 forma y convenciones:** `buildUserPlanificationResponse` sin cambios; ids de las filas; `await` en los handlers; ningún `403` nuevo (el del listado es el del `OwnerGuard`); Swagger con respuesta y códigos.
- **D11, D22, D23, D24:** sin cascada, sin edición, `set-active` en los dos sentidos sin solapamiento, lo congelado en la spec del CU.
- **§7:** CU-E-14 (Tarea 6). **§10:** build, los tres scripts y la regresión (Tarea 5). **§11:** Status (Tarea 7).

## 6. Después de esto

**BE-20** (el plan en el home, §5.5): `GET /routine/assigned-plan/:userId?from=&to=` en `routine/`, con las cuentas de semanas de `planification/plan_weeks.ts`. Cierra U-08 (🟡 → ✅).
