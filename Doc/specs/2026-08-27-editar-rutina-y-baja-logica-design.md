# Spec — Editar rutina sistémica y baja lógica (CU-E-17, CU-E-18)

> **Fecha:** 2026-08-27 · **Bloque:** Rutinas (cierra los dos CU que quedan del MVP) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** `Doc/specs/2026-08-22-crear-rutina-design.md` (el alta es el molde de la edición) y `Doc/specs/2026-08-25-editar-circuito-design.md` (mismo problema un nivel más abajo; acá se resuelve distinto y §5.3 explica por qué)

## 1. Contexto y objetivo

Del bloque de Rutinas quedan cuatro CU abiertos: E-17 (editar), E-18 (baja lógica), E-19 (asignar a alumno) y E-20 (quitar a un alumno). Los dos últimos dependen de `Routine_Asignation_User`, que **el usuario declaró post-MVP el 27/8** — la tabla arrastra dos columnas de más respecto del diagrama (`routine_asignation_id` NOT NULL y `order`) y esa FK obligatoria contradice el CU: E-19 dice explícitamente "sin planificación", pero `Routine_Asignation` exige un `routine_plan_id`. Nada de eso se toca ahora (§9.2).

Esta spec cierra **E-17 y E-18**, que son los que efectivamente completan el ciclo de vida de una rutina: crear (E-16, hecho) → leer (E-15, hecho) → editar → dar de baja.

El punto interesante es E-17. El 22/8, al implementar el alta, quedó anotado que la reconciliación de rutinas **no puede** usar el patrón de E-23: en un circuito el `exercise_id` es clave natural (no se repite), pero en una rutina **un mismo circuito puede aparecer dos veces a propósito** —entrada en calor al principio, movilidad del mismo bloque al final—, así que `circuit_id` no identifica nada. La identidad del vínculo es el `Routine_Circuit.id`, que es justo el que `/routine/all-plus` y `/routine/:id` ya devuelven.

## 2. Alcance

**Incluye:**

- Cambio de modelo: `Routine_Circuit` gana `active` y su `order` pasa a nullable.
- `POST /routine/edit/:id` — cabecera + lista completa de circuitos, reconciliación transaccional por `Routine_Circuit.id`.
- `POST /routine/set-active/:id` — baja y alta lógica de la rutina; reemplaza el andamiaje `DELETE /routine/:id`.
- Filtrado de vínculos inactivos en las tres lecturas de rutina, con el helper preparado para la vista del alumno.
- Limpieza de los dos andamios de E-19/E-20 que hoy viven en `planification.controller.ts`.

**Fuera de alcance:**

- **CU-E-19 y CU-E-20** — post-MVP por decisión del 27/8. §9.2 deja fijado el contrato acordado para cuando se retomen.
- **`Routine_Asignation_User`** — no se toca ni una columna.
- Edición del contenido de cada circuito: eso es CU-E-23, ya implementado.
- Versionado o snapshot de la rutina. Editar una rutina sigue siendo retroactivo, igual que editar un circuito (§11).

## 3. Cambio de modelo

### 3.1 `Routine_Circuit` gana `active` y pierde el `order` obligatorio

| Campo | Antes | Ahora |
|---|---|---|
| `active` | — | boolean, NOT NULL, default `true` |
| `order` | integer NOT NULL | integer **nullable** |

**Por qué baja lógica y no borrado físico.** Ninguna FK apunta a `Routine_Circuit` (verificado en `ddl.py`: el historial cuelga de `User_Routine` y de `Routine_Exercise`, nunca del vínculo), así que un `DELETE` acá sería seguro. La baja lógica **no** está para proteger el historial: está para conservar la traza de qué circuitos integraron la rutina y hasta cuándo. La rutina es lo que el alumno efectivamente ejecutó, y esa fila apagada es el único registro de que ese circuito estuvo adentro.

**Por qué `order = null` en los apagados.** El `order` de esta tabla se **normaliza a `1..N` en cada escritura** (decisión de E-16: el valor que llega es una instrucción de ordenamiento, no lo que se guarda). Si un vínculo apagado conservara su número viejo, la columna pasaría a significar dos cosas a la vez y habría filas repitiendo posiciones que ya ocupa otro circuito. `null` dice exactamente lo que pasó: **este vínculo no ocupa ninguna posición porque ya no está en la rutina**.

Es una diferencia deliberada con `Routine_Exercise`, donde los inactivos conservan su `exercise_order` viejo. Ahí es inocuo porque `exercise_id` es único en el circuito y el orden se recalcula sobre los activos; acá, con repeticiones permitidas, el número stale sí confunde. La consecuencia está en §11.

### 3.2 Índices

Sin cambios. `idx_routine_circuit_routine_id (routine_id, "order")` sigue sirviendo — Postgres indexa los `NULL` y las consultas filtran por `routine_id` primero. No se agrega un índice sobre `active`: `Routine_Exercise` tampoco lo tiene y la cardinalidad por rutina es de decenas de filas.

## 4. Endpoints

### 4.1 `POST /routine/edit/:id` — CU-E-17

`@Auth(coach, admin)` · `200` con `RoutineDetailResponseDto`, el mismo formato del detalle y del `201` del alta, para que el front no tenga que volver a pedir la rutina después de guardar.

Body `EditRoutineDto`:

| Campo | Tipo | Reglas |
|---|---|---|
| `name` | string | requerido, ≤ 50 |
| `coach_note` | string \| null | opcional, ≤ 100 |
| `circuits[]` | array | 1 a 50 ítems |
| `circuits[].id` | uuid | **opcional** — el `Routine_Circuit.id` del vínculo que sobrevive. Ausente = vínculo nuevo |
| `circuits[].circuit_id` | uuid | requerido |
| `circuits[].order` | int ≥ 1 | requerido |

**El `id` opcional es la diferencia con `CreateRoutineDto`**, y es lo que hace posible la reconciliación. El front manda la lista completa tal como quedó en pantalla: los ítems que arrastró desde el GET conservan su `id`, los que agregó no lo tienen. Todo lo que el server tenía y no vuelve en la lista, sale.

`order` sigue funcionando como en el alta: se ordena por él y se persiste la posición resultante (`1..N`), así que se aceptan valores espaciados pero no repetidos.

### 4.2 `POST /routine/set-active/:id` — CU-E-18

`@Auth(coach, admin)` · `200` con la entidad `Routine`. Body `SetRoutineActiveDto { active: boolean }`.

Espejo exacto de `POST /routine/circuit/set-active/:id`, hasta en el hecho de que el mismo endpoint da de baja y reactiva. Se elige `POST` con body sobre `DELETE` porque no es un borrado y porque reactivar necesita el mismo camino.

**Reemplaza el andamiaje `DELETE /routine/:id`**, que quedó obsoleto cuando el 22/8 `Routine` pasó a baja lógica: no hay ningún caso en que la rutina se borre físicamente.

La baja **no cascadea nada**: los circuitos son piezas reutilizables y las planificaciones que la referencian mantienen su integridad. Es la regla que ya fijó E-24 para circuitos — la pieza sale de circulación para ensamblados y asignaciones **nuevos**, lo ya asignado sigue funcionando. El camino alternativo "rutina en uso" del CU es informativo: el front avisa, el back no bloquea.

## 5. Reconciliación (CU-E-17)

Todo dentro de una transacción (`QueryRunner`), mismo patrón que `createRoutine` y `editCircuit`.

### 5.1 Algoritmo

1. **Validaciones sin base**, antes de abrir la transacción: `order` repetido → `400`; el mismo `id` de vínculo dos veces en la lista → `400`.
2. Cargar la rutina con **todos** sus `Routine_Circuit`, activos e inactivos.
3. `404` si no existe · `400` si `active = false`.
4. **Validar los `id` recibidos** contra los vínculos de esta rutina: un `id` que no pertenece a la rutina → `400`; un `id` cuyo `circuit_id` no coincide con el del body → `400`.
5. Cargar los `Circuit` por el set de `circuit_id` **únicos** → `404` si falta alguno.
6. **Circuitos inactivos** (§5.2) → `400` si se está agregando uno.
7. Ordenar los ítems por `order`; la posición resultante es el `order` que se persiste.
8. **Salen:** los vínculos activos cuyo `id` no está en la lista → `active = false`, `order = null`.
9. **Entran / sobreviven:** por cada ítem, en orden —
   - con `id` → `active = true`, `order = posición`, save;
   - sin `id` → insert de un `Routine_Circuit` nuevo con `active = true`.
10. Cabecera: `name`, `coach_note` y `updated_at` a mano (§11).
11. Commit, recarga del detalle y respuesta.

### 5.2 Circuitos dados de baja

| Caso | Resultado |
|---|---|
| El circuito está **activo** | Se acepta, venga o no con `id` |
| El circuito está **inactivo** y el ítem trae `id` (ya estaba en la rutina) | Se acepta |
| El circuito está **inactivo** y el ítem **no** trae `id` (se está agregando) | `400` con el nombre del circuito |

E-16 rechaza cualquier circuito inactivo al crear, y esa regla se mantiene para lo que se agrega. Pero aplicarla también a lo que ya estaba **trabaría la edición de todas las rutinas que contienen un circuito dado de baja**: el entrenador que sólo quiere corregirle el nombre a la rutina se encontraría con un `400` y tendría que reactivar el circuito o sacarlo, que es exactamente lo que no quería hacer. La distinción es "conservar sí, agregar no", y sale gratis porque la presencia del `id` ya dice cuál de los dos casos es.

### 5.3 Por qué acá no se reactiva por circuito (y en E-23 sí)

En `editCircuit`, un ejercicio que vuelve a la lista **reactiva su fila vieja** en vez de crear otra, porque `exercise_id` es clave natural del circuito y hace falta que siga habiendo una sola fila por par.

Acá es al revés: `circuit_id` **no** identifica al vínculo, así que "el circuito volvió" no es una pregunta que se pueda responder. Si el entrenador saca un circuito y después vuelve a agregarlo, entra como **vínculo nuevo** y la fila vieja queda apagada. No hay unicidad que preservar y las dos filas cuentan cosas distintas: una, que ese circuito estuvo en la rutina hasta tal fecha; la otra, que volvió a entrar después.

Un `id` que apunte a un vínculo **inactivo** igual se reactiva (paso 9). No debería llegar nunca —las lecturas no devuelven los apagados—, pero si llega, reactivar es lo correcto y deja la operación idempotente.

### 5.4 Por qué no hay baja física, a diferencia de E-23

E-23 usa dos caminos (físico si nadie completó el ejercicio, lógico si hay historial) porque un circuito se retoca decenas de veces mientras se arma y la baja lógica siempre habría dejado una fila muerta por cada tanteo.

Acá se eligió **baja lógica única**. El argumento del tanteo aplica menos —una rutina son 3 a 6 circuitos, no 40 series— y no hay un `Routine_Exercise_Finished` que consultar para decidir el camino, así que el doble camino compraría poco y costaría una query y una rama. El costo asumido es que armar una rutina a los tumbos deja vínculos apagados; se acepta.

## 6. Visibilidad de los inactivos

### 6.1 Helper parametrizado

`buildRoutineDetailResponse(routine, visibleInactiveIds?: Set<string>)` incluye el vínculo si `routineCircuit.active || visibleInactiveIds?.has(routineCircuit.id)`.

Es el mismo mecanismo que `buildCircuitDetailResponse` un nivel más abajo, y por la misma razón: el filtro se define en un solo lugar y la vista del alumno lo va a usar con otro criterio.

### 6.2 Quién ve qué

- **Lecturas del entrenador** (las tres que existen hoy, todas `@Auth(coach, admin)`): no pasan el set → sólo vínculos activos. Es lo correcto para armar y editar: un circuito que sacaste no reaparece en la pantalla de edición.
- **Lecturas del alumno** (U-08/U-09 y el historial E-06/E-07, cuando se implementen): **el alumno tiene que ver un circuito apagado si completó algún ejercicio suyo en esa instancia de rutina**. El agujero es real y es el mismo que E-23 resolvió a nivel ejercicio: si el entrenador saca un circuito entero después de que el alumno lo hizo, los ejercicios que el alumno tildó desaparecen de su historial aunque sus filas de `Routine_Exercise_Finished` sigan ahí.
  El set se arma yendo de `Routine_Exercise_Finished` → `routine_exercise_id` → `circuit_id` → el vínculo inactivo de esa rutina para ese circuito. **Esta spec deja el parámetro y el contrato, no la consulta**: se escribe con U-08/U-09, que son las que la necesitan.

### 6.3 Lecturas a tocar ahora

| Lectura | Cambio |
|---|---|
| `buildRoutineDetailResponse` | Filtro parametrizado (cubre `GET /routine/:id`, el `201` del alta y el `200` de la edición) |
| `getAllRoutinesPlus` | Condición `routineCircuit.active = true` en el `leftJoinAndSelect`, y `circuit_count` sobre lo filtrado |
| `getAllRoutines` | Condición sobre `active` en el `loadRelationCountAndMap`, que cuenta en SQL |

## 7. Validaciones y errores

### `POST /routine/edit/:id`

| Situación | Código |
|---|---|
| Rutina inexistente | `404` |
| Rutina inactiva | `400` — precondición del CU; alcanza con reactivarla por `set-active`. Espejo del `400` de `editCircuit` |
| Lista de circuitos vacía | `400` — lo da `@ArrayNotEmpty`, y es el camino alternativo explícito del CU |
| `order` repetido en el body | `400` — misma regla que el alta |
| El mismo `id` de vínculo dos veces | `400` |
| `id` que no es un vínculo de esta rutina | `400` |
| `id` cuyo `circuit_id` no coincide con el del vínculo | `400` |
| Algún `circuit_id` no existe | `404` |
| Circuito inactivo **agregado** (ítem sin `id`) | `400` con el nombre del circuito |

Los tres errores de `id` son bugs del front, no del entrenador, pero devuelven `400` con un mensaje que dice cuál es el problema en vez de fallar contra la FK.

### `POST /routine/set-active/:id`

| Situación | Código |
|---|---|
| Rutina inexistente | `404` |
| `active` ausente o no booleano | `400` (validador) |

No hay chequeo de "en uso": la spec reescrita el 22/8 lo sacó a propósito.

## 8. Archivos

**Entidades**

- `entities/routine_circuit.entity.ts` — `+ active`; `order` pasa a `number | null`.
- `entities/routine.entity.ts` — `coach_note` acepta `null` explícito (mismo motivo que `Circuit.description` en E-23: TypeORM ignora las propiedades `undefined`, así que sin esto el entrenador no puede **borrar** una nota que ya no aplica).

**Módulo Routine**

- `dtos/routine/edit_routine.dto.ts` — nuevo: `EditRoutineCircuitDto` (con `id?`) + `EditRoutineDto`.
- `dtos/routine/set_routine_active.dto.ts` — nuevo, espejo de `SetCircuitActiveDto`.
- `dtos/routine/routine_detail_response.dto.ts` y `routine_list_item_plus_response.dto.ts` — el `order` documentado pasa a reflejar que sólo salen los activos.
- `routine/routine.controller.ts` — se conecta `POST /edit/:id`, se reemplaza `DELETE /:id` por `POST /set-active/:id`.
- `routine/routine.service.ts` — `editRoutine`, `setRoutineActive`, filtros de §6.3.

**Módulo Planification**

- `planification/planification.controller.ts` — se sacan los andamios `POST /routine/assign-user` y `GET /user/:id/routines` (E-19/E-20 se mudan a `routine/` cuando se retomen, §9.2). El resto del andamiaje de planificaciones (E-08 a E-14) queda intacto.

**Db Creator**

- `ddl.py` — `active` y `order` nullable en `Routine_Circuit`.
- Regenerar con `python build_sql.py` → cambia `01_estructura.sql`. **`02` y `03` no se tocan:** ningún generador de datos inserta en `Routine_Circuit` (verificado con grep sobre los cuatro `.py`).
- `patches/2026-08-27-cu-e-17.sql` — delta idempotente para llevar una base ya creada al esquema nuevo sin recrearla, igual que el de E-23.

## 9. Impacto en `Status/`

### 9.1 Estados

- **CU-E-17** 🔵 → ✅ · **CU-E-18** 🔵 → ✅.
- **CU-E-19** 🔵 → ⬜: se le saca el andamiaje, así que deja de tener ruta declarada.
- **CU-E-20** sigue ⬜.
- Conteos: ✅ 53 → **55** · 🟡 1 · 🔵 12 → **9** · ⬜ 6 → **7**. Entrenador pasa de 55% a **62%**.
- Cronograma: la fila del 28/8 (Rutinas) queda cerrada **con la excepción explícita** de E-19/E-20.

### 9.2 Contrato acordado para E-19/E-20 (post-MVP)

Queda anotado para no volver a discutirlo:

- Los endpoints van en **`routine/`**, no en `planification/`: `POST /routine/assign-user`, `DELETE /routine/assign-user/:id` y `GET /routine/assigned/:userId` (el GET es de dónde el entrenador saca el id del vínculo para E-20; U-08 resuelve el home del alumno, que es otro bloque).
- Antes hay que **limpiar `Routine_Asignation_User`**: borrar `routine_asignation_id` y `order` para que quede igual al diagrama de `Doc/`, y agregar `UNIQUE (routine_id, user_id)` que cubre en la base el camino alternativo de E-19 ("ya asignada → no duplica").
- Sin esa limpieza E-19 es **imposible**, no difícil: `routine_asignation_id` es NOT NULL y apunta a `Routine_Asignation`, que exige un `routine_plan_id`; o sea que hoy no se puede asignar una rutina a un alumno sin inventarle una planificación, que es justo lo contrario de lo que el CU pide.

## 10. Verificación

- **Compilación:** `npm --prefix power-app run build` en verde.
- **Runtime** (usuario, aplicando el patch o regenerando con los tres scripts):
  1. Editar una rutina sacando un circuito → la fila queda `active = false` con `order = null` y no aparece en ninguna de las tres lecturas.
  2. Reordenar sin agregar ni sacar → los `order` quedan `1..N` y no se apaga nada.
  3. Agregar un circuito nuevo (ítem sin `id`) → fila nueva, y las viejas conservan su `id`.
  4. **Circuito repetido:** meter el mismo `circuit_id` dos veces con `id` distinto y sacar sólo uno → se apaga exactamente ese vínculo y el otro sigue.
  5. Dar de baja un circuito que está en una rutina y después editar esa rutina conservándolo → `200`; agregarlo a otra rutina → `400` con el nombre.
  6. `set-active` con `false` y con `true` → la rutina desaparece y reaparece en `GET /routine/all`, y sigue saliendo con `include_inactive=true`.
  7. Editar una rutina inactiva → `400`.
  8. Casos de error de §7 y la matriz de guards (401/403).

## 11. Riesgos y notas

- **El vínculo apagado pierde su posición.** Es la contracara de `order = null`: si mañana la vista del alumno (§6.2) muestra un circuito inactivo que el alumno completó, no hay dato para saber en qué lugar de la rutina estaba, así que va a ir al final. Se aceptó a cambio de que `order` signifique una sola cosa. Si esa posición llega a importar, la salida es una columna aparte (`last_order`) y no reciclar `order`.
- **La traza de los apagados todavía no la consume nadie.** Es el motivo principal de la baja lógica (§3.1) y hoy ninguna lectura la devuelve; se vuelve útil recién con U-08/U-09. Es deuda deliberada, no un olvido.
- **La edición es retroactiva**, igual que en circuitos: no hay snapshot, así que sacar un circuito de una rutina se lo saca también a los alumnos que ya la tienen asignada. Es la postcondición del CU, no un efecto no querido.
- **`updated_at` sigue sin actualizarse solo.** El `onUpdate: 'CURRENT_TIMESTAMP'` de las entidades es sintaxis de MySQL y en Postgres no hace nada. `editRoutine` lo setea a mano, igual que `editCircuit`. Generalizarlo (trigger en el DDL o `@UpdateDateColumn`) sigue pendiente y fuera de esta spec — ya son dos endpoints parcheándolo a mano, así que conviene resolverlo antes de que sean cinco.
- **Rutina de baja:** no se puede editar (`400`), pero sí reactivar con `set-active` y editar después. No hace falta un camino especial.
