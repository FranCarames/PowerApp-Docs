# BE-45 y T60 — Hallazgo QUI-07 de Pruebas de planificaciones: las rutinas quitadas del plan · Plan

> **Numeración (leer primero).** El 09/11 la última tarea del [roadmap del backend](2026-10-16-roadmap-backend.md) es la BE-44, así que este cambio es la **BE-45**. La del web es la **T60 (o el siguiente número libre)**: ese día la última del `PLAN.md` del web es la T59b. Si al llegar el número ya está usado, se toma el siguiente libre y se anota acá, en los avisos amarillos (`known`) del [plan de pruebas](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html) y en su «Antes de empezar».
>
> **Cómo se entrega.** Cada sesión sigue el flujo de su repo, como lo dice su `CLAUDE.md`. Este plan no lo cambia. No hay tests automáticos (decisión del 16/10). El backend se verifica con el build y con el Swagger (4.2). El web, con `typecheck`, `eslint src`, `build` y `prettier --check`, más el navegador (5.4). No se levanta el server de producción ni se instala nada sin pedirlo.
>
> **Este plan es de diseño.** Lo escribió la sesión de docs el 09/11 con el contrato que fijó Fran. Lo leen la sesión del **backend** (sección 4) y la del **web** (sección 5). **Primero el back, después la web** (sección 6). Los textos entre «» van **exactos**.

**Fuente:** la tanda 6 de [Pruebas de planificaciones](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html) ([`6-pruebas-planificaciones.resultados.json`](../../Tests/Planificaciones/6-pruebas-planificaciones.resultados.json), exportada el 07/11), caso **QUI-07**.
**Modelo:** sin cambios. No cambia ninguna entidad ni el DDL, y no se toca `Db Creator`.

**Goal:** que las rutinas quitadas de un plan se sigan viendo, aparte de las vigentes, cada vez que se abre el plan, y que se puedan reincorporar en cualquier momento, no solo antes de salir del editor.

---

## 1. El hallazgo

| Caso | Gravedad | Lo que anotó Fran | CU | Qué se decidió |
|---|---|---|---|---|
| **QUI-07** · Reincorporar después de salir | 3 · Leve | «“Quitadas del plan” se pierde al salir: el detalle del plan (GET /planification/{id}) trae solo las rutinas vigentes y ningún endpoint lista las quitadas. La única salida es agregarla de nuevo, que crea otro vínculo. Hace falta un include_inactive en el backend y mostrarlas en el front.» | [CU-E-12c](../../Use%20Cases/entrenador/CU-E-12c-quitar-rutina-de-planificacion.md), [CU-E-12d](../../Use%20Cases/entrenador/CU-E-12d-quitar-rutinas-en-lote-de-planificacion.md) | `GET /planification/{id}` suma `include_inactive`, y cada rutina del detalle suma `active` (sección 3). La web pide siempre las quitadas y las muestra debajo de las semanas, detrás de un interruptor «Mostrar quitadas (N)» (sección 5) |

**La causa.** `buildPlanificationDetailResponse` (`planification.service.ts`) descarta los vínculos con `active = false`. Su comentario dice que el builder es «el único lugar que decide qué se ve». La web guarda las quitadas en un estado local (`removed`, en `PlanRoutines.tsx`) que se pierde al desmontar la pantalla.

**Probablemente relacionados.** En esa misma tanda, QUI-02 dice «no veo la seccion de reincorporar rutinas» y QUI-03 está en Falla (2 · Moderado) con «Ver falla de QUI-02». Las dos notas son del 31/10. Puede ser lo mismo: la sección solo existía mientras no se salía de la pantalla. Con la T60, la sección sale de la respuesta. Las dos se vuelven a correr (sección 6).

**Efecto en el plan de pruebas** (ya aplicado, ver [`Tests/Planificaciones/`](../../Tests/Planificaciones/)):

- **Cambian, con el mismo sentido y el mismo id:**
  - QUI-07 (se reincorpora después de salir);
  - QUI-01 (los textos nuevos de la confirmación y el interruptor);
  - QUI-02 a QUI-06 (el paso de prender el interruptor).
- **Nuevos:**
  - **QUI-09** (el interruptor);
  - **QUI-10** (reincorporar una rutina dada de baja como rutina);
  - **ASG-13** (asignar no muestra las quitadas).
- **Aviso amarillo:** todos llevan `kt` «Hoy no cumple el CU.» y un `known` que dice que los arreglan la BE-45 y la T60.

---

## 2. Qué se decidió

1. **El detalle trae las quitadas a pedido.** `GET /planification/{id}?include_inactive=true` devuelve también los vínculos dados de baja, mezclados con los vigentes y en el mismo orden de hoy.
2. **Cada rutina del detalle dice si está vigente** (`active`, el del vínculo). El campo va en **todas** las respuestas con la forma del detalle, para que el cliente siempre pueda separar.
3. **Sin el parámetro, nada cambia.** `routine_count` sigue contando solo las vigentes.
4. **La web siempre pide las quitadas** y las separa en cada pantalla. El editor las muestra debajo de las semanas, detrás de un interruptor apagado de entrada. La pantalla de asignar no las muestra.
5. **Reincorporar no revisa si la rutina sigue activa.** Una rutina dada de baja como rutina (CU-E-18) se puede reincorporar al plan igual. No se bloquea ni se avisa. Hoy ya es así en el backend y no cambia.

---

## 3. Contrato

### 3.1 `GET /planification/{id}` suma el query `include_inactive`

- `include_inactive`: `true` o `false`; `false` por defecto. Es el mismo parámetro, con la misma transformación, que el de `GET /planification/all` y `GET /planification/user/{userId}`.
- Un valor que no es `true` ni `false` da **400** con el mismo texto que esos endpoints. Lo genera class-validator: no hay constante propia.

```json
{ "message": ["include_inactive must be a boolean value"], "error": "Bad Request", "statusCode": 400 }
```

- **Con `true`,** `routines` trae también los vínculos dados de baja, en el mismo orden de hoy: `week`, `order` y `created_at`, ascendentes. Vigentes y quitadas van **mezcladas en una sola lista**; el cliente separa por `active`.
- **Sin el parámetro (o con `false`),** todo responde igual que hoy: solo los vínculos vigentes.
- Los demás códigos no cambian: el 400 del id que no es UUID («El ID debe ser un UUID válido en formato PostgreSQL») y el 404 «Planificación no encontrada». El detalle responde también por un plan dado de baja, como hoy.

### 3.2 Cada elemento de `routines` suma `active` (boolean)

- Es el estado **del vínculo** (`Routine_Asignation.active`), **no el de la rutina**. El de la rutina sigue en `routine.active`, como hoy.
- **Va siempre:** también sin el parámetro y en todas las demás respuestas que tienen la forma del detalle. Ahí vale siempre `true`. Esas respuestas son:
  - `POST /planification/create` y `POST /planification/edit/{id}`;
  - `GET /planification/all-plus`;
  - `POST /planification/routine/assign`, `assign-bulk`, `repeat-week` y `reorder`.
- Solo puede venir `false` en `GET /planification/{id}?include_inactive=true`.

### 3.3 `routine_count` sigue contando solo las vigentes

Con o sin el parámetro. Lo usan la píldora del editor, la tarjeta del listado y la pantalla de asignar.

### 3.4 Ejemplo

QA Plan B con QA Rutina P1 quitada de la semana 2:

```json
GET /planification/<id>?include_inactive=true  →  200
{
  "id": "<id>", "name": "QA Plan B", "description": null, "number_of_routines": 2,
  "type": "movilidad", "duration": 2, "active": true, "routine_count": 0,
  "created_at": "…", "updated_at": "…",
  "routines": [
    {
      "id": "<vínculo>", "week": 2, "order": 1, "active": false,
      "routine": { "id": "<P1>", "name": "QA Rutina P1", "coach_note": null, "active": true }
    }
  ]
}
```

Sin el parámetro, la misma planificación responde `"routine_count": 0` y `"routines": []`.

### 3.5 Aclaraciones que el pedido no decía (vetables)

Las fijó la sesión de docs para que el back y la web hagan lo mismo. Si Fran no está de acuerdo con alguna, se cambia acá.

1. **Otros parámetros en el query del detalle dan 400.** El `ValidationPipe` global tiene `forbidNonWhitelisted`. Con un DTO de query en la ruta, `?foo=1` pasa a responder 400 «property foo should not exist», igual que en `/all` y en `/user/{userId}`. Hoy la ruta no tiene DTO de query y los ignora. La web no manda ninguno.
2. **Solo el detalle tiene el parámetro.** `GET /planification/all-plus` no lo suma: su join sigue filtrando `active = true`, y en sus filas `active` vale siempre `true`.
3. **Las respuestas de `routine/set-active` y `set-active-bulk` no cambian:** siguen devolviendo los vínculos, no el plan.
4. **Reincorporar no mira `routine.active`.** Hoy ni `setRoutineAsignationActive` ni `setRoutineAsignationsActive` lo miran, y la BE-45 no agrega ese chequeo. Agregar una rutina dada de baja sigue siendo un 400 (CU-E-12a y CU-E-12b): eso no cambia.

---

## 4. Backend (BE-45)

**Repo:** `D:\Power App\Backend\PowerApp-Backend`. **Esfuerzo estimado:** 1 h. **Cambia el esquema:** no.

### 4.1 Qué hace el backend

| # | Cambio | Dónde |
|---|---|---|
| 1 | **Query DTO nuevo** `GetPlanificationDetailQueryDto`, con solo `include_inactive?: boolean = false`. Lleva el mismo `@IsOptional`, `@Transform` (`'true'`/`true` → `true`, `'false'`/`false` → `false`, cualquier otro valor pasa tal cual) e `@IsBoolean` que `GetPlanificationsQueryDto` y `GetUserPlanificationsQueryDto`. Su `@ApiPropertyOptional`: `{ example: false, default: false, description: 'true para incluir también las rutinas quitadas del plan (vínculos con active = false, CU-E-12c)' }` | `power-app/src/dtos/planification/get_planification_detail_query.dto.ts` (nuevo) |
| 2 | **La ruta** `getPlanificationById` suma `@Query() query: GetPlanificationDetailQueryDto` y se lo pasa al service. Suma `@ApiResponse({ status: 400, description: 'El id no es un UUID válido («El ID debe ser un UUID válido en formato PostgreSQL»), o include_inactive no es true ni false («include_inactive must be a boolean value»)' })`. La descripción del 200 dice: «Sin include_inactive, sólo las rutinas vigentes; con true, también las quitadas (active: false), en el mismo orden. routine_count cuenta sólo las vigentes». El 404 y el 500 tampoco están declarados hoy: sumarlos es de la BE-34 y no hace falta para esta tarea | `planification.controller.ts` |
| 3 | **El service:** `getPlanificationById(id, query, res)` le pasa el flag al builder. `findPlanificationDetail` no cambia: ya carga todos los vínculos, ordenados por `week`, `order` y `created_at` | `planification.service.ts` |
| 4 | **El builder:** `buildPlanificationDetailResponse(planification, includeInactive = false)` sigue siendo «el único lugar que decide qué se ve». `routine_count` cuenta siempre las vigentes. `routines` lleva todos los vínculos con el flag y solo los vigentes sin él. Cada elemento suma `active: routineAsignation.active`. **Solo el detalle pasa el flag:** los demás llamadores (create, edit, assign, assign-bulk, repeat-week, reorder y `/all-plus`) no cambian. Se actualiza el comentario del builder | `planification.service.ts` |
| 5 | **El DTO de respuesta:** `PlanificationAsignationResponseDto` suma, entre `order` y `routine`, `@ApiProperty({ example: true, description: 'Estado del vínculo (Routine_Asignation.active), no el de la rutina (ese es routine.active). false = quitada del plan (CU-E-12c): sólo viene en GET /planification/{id}?include_inactive=true. En las demás respuestas vale siempre true' }) active!: boolean;`. La descripción de `PlanificationDetailResponseDto.routines` pasa a: «Rutinas del plan, ordenadas por week, order y fecha de asignación. Por defecto sólo las vigentes; con include_inactive=true en GET /planification/{id}, también las quitadas (active: false). La lista es plana: el cliente agrupa por semana. Vacía si no tiene ninguna» | `dtos/planification/planification_detail_response.dto.ts` |
| 6 | **Status del backend:** la entrada del día, con CU-E-12c y CU-E-12d. Se copia a `PowerApp-Docs/Status/` **sin stagear**, como siempre | `Status/` del backend |

**Sin cambios de esquema.** `Db Creator` no se regenera. `set-active` y `set-active-bulk` no se tocan (3.5.4).

### 4.2 Cómo se verifica

- **Build:** `npm --prefix power-app run build`, sin errores.
- **Swagger:** el documento que genera Nest, igual que en las verificaciones de BE-42 y BE-44. Tiene que mostrar:
  - en `GET /planification/{id}`, el query `include_inactive` (boolean, opcional, por defecto `false`) y la respuesta 400 con su descripción;
  - en `PlanificationAsignationResponseDto`, `active` como boolean **requerido**, con su descripción;
  - en `routines`, la descripción nueva;
  - en `GET /planification/all` y `GET /planification/user/{userId}`, nada distinto.

**Qué NO se verifica:** el runtime contra una base (BE-35) ni las pantallas, que son de su repo.

**Qué le queda al usuario:** desplegar en Render. **El web empieza después de eso** (sección 6).

---

## 5. Web (T60 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de la BE-45 desplegada en Render** (para `api:fetch`).

**El prototipo** ([`UI Front/powerapp-prototype-web.html`](../../UI%20Front/powerapp-prototype-web.html)) no tiene «Quitadas del plan»: para esto vale este plan.

### 5.1 Qué hace el web

1. **Contrato:** `api:fetch` desde Render y `api:gen`. Entran el query `include_inactive` del detalle y `active` en cada rutina.
2. **`usePlanification` pide siempre `include_inactive: true`.**
   - La query key (`queryKeys.planifications.detail(id)`) no cambia: el detalle tiene una sola variante, así que el editor y la pantalla de asignar comparten el caché.
   - Se actualizan los comentarios que dicen que las quitadas no vienen: el de `usePlanification` («Las rutinas quitadas del plan no vienen») y el de `queryKeys.planifications.detail` («con sus rutinas vigentes»).
3. **Cada pantalla que lo usa separa los vínculos por `active`.** Ninguna usa `plan.routines` sin separar. Conviene una sola función que lo haga (por ejemplo en `features/catalog/planRoutines.ts`).
   - **El editor del plan** (`PlanEditor`, con `PlanForm` y `PlanRoutines`). Todo esto usa **solo las vigentes**:
     - las semanas (`savedWeeks`), los huecos y el «X de K» de cada una;
     - «Elegir varias para quitar», que se ofrece con más de una vigente, y su selección;
     - quitar;
     - reordenar: la lista de `reorder` tiene que ser exactamente las vigentes de la semana. Si llevara una quitada, el back responde 400 «La lista no coincide…»;
     - el panel de repetir y sus conteos;
     - el aviso de achicar la duración en `PlanForm` (`maxWeekOf`). Mira las vigentes, igual que el back: una quitada en la semana 4 no impide bajar a 3 (QUI-06). La píldora sigue saliendo de `routine_count`.
   - **`AssignPlanPage`** muestra **solo las vigentes**. Hoy usa solo `routine_count` (la fila de la planificación dice «N rutinas») y no lista rutinas, así que con `include_inactive=true` se ve igual. El bloqueo «Esta planificación no tiene rutinas vigentes. Agregale alguna desde su editor para poder asignarla.» sigue saliendo de `routine_count`: un plan que solo tiene quitadas no se puede asignar.
4. **«Quitadas del plan» sale de la respuesta y no del estado local.** Se borra el estado `removed` de `PlanRoutines`. Las quitadas son los elementos con `active: false`, en el orden de la respuesta.
   - **Dónde:** debajo de las semanas, como hoy.
   - **El interruptor:**
     - es el `Switch` de `shared/ui` (el de «Ver series»), con el texto «Mostrar quitadas (N)» al lado. N es la cantidad de quitadas;
     - **arranca apagado**;
     - si no hay ninguna quitada, **no se muestra**;
     - su estado vive en el componente: no va a la dirección ni al storage. Al salir y volver a abrir el plan, arranca apagado (**no se recuerda**).
   - **Prendido muestra:**
     - el encabezado «Quitadas del plan», como hoy, con el número al costado;
     - la ayuda «Volvés a ponerlas desde acá, a su lugar o a otro.»;
     - una fila por vínculo: el nombre de la rutina, «Semana N · Posición M» y «Reincorporar» (que se anuncia «Reincorporar <rutina>», como hoy);
     - «Reincorporar todas a su lugar», si hay más de una.

     Ese botón, su confirmación «Reincorporar rutinas» y el modal de reincorporar (`PlanReincorporateModal`) **no cambian**. La fila de una rutina dada de baja como rutina no lleva marca ni aviso.
   - **Quitar o reincorporar refresca el detalle.** Las mutaciones ya invalidan `queryKeys.planifications.all`, así que el detalle se vuelve a pedir y las dos listas salen de ahí. No se suma ni se saca nada a mano.
     - Con el interruptor apagado, solo cambia el N.
     - Prendido, cambia también la lista.
     - Si N llega a 0, el interruptor desaparece. La próxima vez que aparece, arranca apagado (vetable).
   - **Con el plan dado de baja,** el interruptor anda (es solo ver), pero «Reincorporar» y «Reincorporar todas a su lugar» quedan apagados, como hoy.
5. **Los textos que dicen que se pierden al salir** pasan a ser los de 5.2: las dos confirmaciones de quitar y la ayuda de la sección.
6. **Reincorporar no revisa si la rutina sigue activa.** Ni la fila, ni el modal, ni «Reincorporar todas» miran `routine.active`: no se bloquea ni se avisa. Al volver al plan, la fila de su semana muestra «Rutina inactiva», como cualquier rutina dada de baja (ADD-07).
7. **El plan de pruebas** ([`Tests/Planificaciones/`](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html)) es la lista de aceptación: QUI-01 a QUI-07, QUI-09, QUI-10 y ASG-13.

### 5.2 Textos

| Dónde | Texto |
|---|---|
| Interruptor (texto que se ve y nombre accesible) | «Mostrar quitadas (N)» |
| Sección, título | «Quitadas del plan» (como hoy) |
| Sección, ayuda | «Volvés a ponerlas desde acá, a su lugar o a otro.» (pierde «Cuando salgas de esta pantalla ya no las vas a ver: para sumarlas de nuevo vas a tener que agregarlas.») |
| Fila | «Semana N · Posición M» y «Reincorporar» (como hoy) |
| Botón de la sección (con más de una) | «Reincorporar todas a su lugar» (como hoy) |
| Confirmación, quitar una | «Quitar rutina del plan»: «<rutina> sale de la semana N del plan. Es una baja lógica: conserva su lugar y los alumnos que ya la entrenaron conservan su historial. La podés reincorporar desde “Quitadas del plan”.» |
| Confirmación, quitar varias | «Quitar N rutinas del plan»: «Las rutinas elegidas salen del plan. Es una baja lógica: cada una conserva su lugar y los alumnos que ya las entrenaron conservan su historial. Las podés reincorporar desde “Quitadas del plan”.» |

Los demás textos (los avisos «Rutina quitada del plan», «N rutinas quitadas del plan», «Rutina reincorporada al plan», el modal de reincorporar y la confirmación de reincorporar todas) no cambian.

### 5.3 Accesibilidad

- El interruptor es el `Switch`: un botón con `role="switch"` y `aria-checked`, que Enter y Espacio prenden y apagan.
- Su `label` es «Mostrar quitadas (N)». El texto que se ve al lado va con `aria-hidden`, como en «Ver series».
- Prendido, apunta a la sección con `aria-controls`.
- La sección sigue siendo una región con `aria-label` «Quitadas del plan».

### 5.4 Cómo se verifica

- `typecheck`, `eslint src`, `build` y `prettier --check` en verde.
- **Navegador (Chromium, 390 px y escritorio)**, contra el doble local que imite la BE-45 y, cuando esté en Render, contra el backend real. Hay que ver:
  - que el detalle siempre salga con `include_inactive=true`;
  - las semanas sin las quitadas;
  - que el interruptor no esté sin quitadas y que arranque apagado con el N;
  - quitar con el interruptor apagado (solo cambia el N) y prendido (cambia la lista);
  - salir, volver y reincorporar a su lugar y a otro lugar;
  - reincorporar todas;
  - el interruptor que desaparece al quedar en 0;
  - achicar la duración con una quitada en la última semana;
  - reincorporar una rutina dada de baja como rutina;
  - la pantalla de asignar con un plan que tiene quitadas;
  - el plan dado de baja.
- Los casos de 5.1.7 como lista de aceptación. **Sacar los avisos amarillos** de esos casos es de Docs (sección 6).

**Qué NO se verifica:** el runtime contra la base de Render hasta que la BE-45 esté desplegada.

---

## 6. Orden

1. **Backend (BE-45) primero:** el código, el build, el Swagger y el Status, con el flujo de su repo.
2. **El usuario despliega** el backend en Render.
3. **Web (T60) después:** `api:fetch` y `api:gen` sobre el Swagger ya desplegado, y recién ahí las pantallas. No empieza antes porque `active` y el query no están en el contrato hasta entonces.
4. **Docs:** al cerrar las dos, sacar los avisos amarillos (`kt` y `known`) de QUI-01 a QUI-07, QUI-09, QUI-10 y ASG-13 del plan de pruebas, con su línea en «Antes de empezar», y volver a correr esos casos. QUI-02 y QUI-03 cierran también sus notas de la tanda 6 (sección 1). Las copias de `Status/` (backend y web) las trae el usuario.
