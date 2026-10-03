# Spec — Crear rutina sistémica (CU-E-16)

> **Fecha:** 2026-08-22 · **Bloque:** Rutinas (vence 28/8) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** `Doc/specs/2026-08-22-rutinas-lectura-design.md` (los tres endpoints de lectura) y del bloque de circuitos (`2026-08-19-crear-circuito-design.md`, que es el molde un nivel más abajo)

## 1. Contexto y objetivo

Con la lectura de rutinas cerrada y dos circuitos reales cargados en la base, arranca la parte de escritura. El entrenador arma una rutina **completa en una sola llamada**: la cabecera (`name`, `coach_note`) más la lista ordenada de circuitos a ensamblar. La rutina nace activa y queda disponible para asignarse.

Es el mismo patrón de CU-E-22 (crear circuito) un nivel más arriba del árbol — alta transaccional de cabecera + vínculos, con `201` en formato de detalle — pero **con dos diferencias deliberadas** que se detallan en §4.2 y §4.3: el `order` viaja en el body, y el `circuit_id` puede repetirse.

## 2. Alcance

**Incluye:**

- `POST /routine/create` — alta de `Routine` + sus `Routine_Circuit`, en una transacción.
- Validaciones de estructura, de campo y de estado de los circuitos referenciados.
- **Un cambio de modelo:** `Routine.name` pasa de `varchar(20)` a `varchar(50)` (§7).
- Extracción del armado del detalle de rutina a dos helpers, compartidos con `getRoutineById` (espejo del refactor de E-22).

**Fuera de alcance:**

- CU-E-17 (editar rutina) y CU-E-18 (baja lógica): van después, en el mismo bloque.
- CU-E-12 (vincular rutina a planificación): §4.4.
- CU-E-23 (editar circuito): sigue pausado.
- Sacar la columna obsoleta `Routine.routine_plan_id`: §9.

## 3. Endpoint

`POST /routine/create` · `@Auth(UserRole.coach, UserRole.admin)`

Vive en `routine.controller.ts` / `routine.service.ts`, como todo el resto: **los circuitos y las rutinas no tienen módulo ni controller propio**. Reemplaza andamiaje — la ruta ya está declarada con la llamada al service comentada y un `@Body() createRoutineDto: any`.

### 3.1 Body

```json
{
  "name": "Día A - Pecho y tríceps",
  "coach_note": "Cuidar el ritmo en las primeras series",
  "circuits": [
    { "circuit_id": "uuid-entrada-en-calor", "order": 1 },
    { "circuit_id": "uuid-principal",        "order": 2 },
    { "circuit_id": "uuid-entrada-en-calor", "order": 3 }
  ]
}
```

**`active` arranca siempre en `true`.** La spec del CU no da opción; para desactivar está CU-E-18.

## 4. Decisiones

### 4.1 Forma del body

Array de objetos (`circuits: [{ ... }]`) y no un array plano de UUIDs. Es el molde de E-22 (`exercises: [{ exercise_id, ... }]`) y deja lugar para sumar campos por vínculo más adelante —descanso entre circuitos, notas— sin romper el contrato.

### 4.2 El `order` viaja en el body, y el server lo normaliza

**Acá E-16 se aparta de E-22 a propósito.** En circuitos, `exercise_order` y `set_order` los deriva el server de la posición en el array. En rutinas, el `order` es un campo explícito del body: el server **ordena por ese campo** y recién después persiste.

El motivo es que el front de rutinas maneja el orden como dato propio (reordenar circuitos de una lista ya armada), y hacerlo explícito evita que el orden dependa de cómo el cliente serializó el array.

A cambio, el server se protege de lo que un `order` explícito habilita:

| Caso | Comportamiento |
|---|---|
| `order` duplicado | `400` — dos circuitos no pueden ocupar la misma posición |
| `order` con huecos o espaciado (`10, 20, 30`) | Se acepta: se ordena ASC y se persiste `1..N` |
| `order` ≤ 0 o no entero | `400` por validación de campo |

**La base nunca guarda una secuencia rara:** después de ordenar, el `order` que se persiste es la posición resultante (índice + 1), así que siempre queda `1..N` sin huecos. El `order` recibido es una *instrucción de ordenamiento*, no el valor que se almacena — y por eso la respuesta lo devuelve renumerado.

```
Entra:  [{c1, order:10}, {c2, order:30}, {c3, order:20}]
Ordena: c1(10), c3(20), c2(30)
Guarda: c1 order=1, c3 order=2, c2 order=3
```

### 4.3 Un mismo circuito **puede** repetirse

`Routine_Circuit` no tiene unique sobre (`routine_id`, `circuit_id`) — fue una decisión explícita del ajuste de modelo del 19/8 — y el alta **no valida nada al respecto**. Es el caso de uso real: la entrada en calor al principio y un bloque de movilidad del mismo circuito al final, o un circuito metabólico que se repite en la sesión. El `order` distingue las apariciones.

> **Ojo, es al revés que en circuitos.** En E-22, `exercise_id` **sí** es único dentro del circuito. **No copiar esa validación acá.**

**Consecuencia para CU-E-17:** como `circuit_id` no es clave natural de la rutina, la reconciliación de la edición **no puede** usar el patrón de `editExercise` (comparar por el id de la entidad referenciada). Va por el **`Routine_Circuit.id`**, que es exactamente el que `/routine/all-plus` y `/routine/:id` ya exponen — la spec de lectura lo anotó para esto. E-17 recibe la lista completa con los ids de los vínculos que sobreviven, y los que no vengan se borran.

### 4.4 Sin vínculo a planificación

El alta **no acepta ningún campo de planificación**; `routine_plan_id` queda en `null`. El alcance de E-16 es "alta de Routine y de sus vínculos Routine_Circuit", nada más, y vincular una rutina a una planificación es exclusivamente **CU-E-12**.

Además, `Routine.routine_plan_id` es un **campo obsoleto** (decisión del usuario, 22/8): el vínculo rutina ↔ planificación lo modela `Routine_Asignation` (`routine_id` + `routine_plan_id` + `order`), que es lo que la spec de E-12 nombra explícitamente. La FK directa de `Routine` es un segundo camino que ningún CU usa. Se deja nullable por ahora; sacarla es un cambio propio (§9).

## 5. Validaciones

### 5.1 Estructura

| Regla | Respuesta si falla |
|---|---|
| `circuits` con al menos 1 ítem | `400` — es el camino alternativo *"sin circuitos seleccionados"* de la spec |
| `order` sin duplicados dentro de la rutina | `400` |
| Todos los `circuit_id` existen | `404` — mismo patrón que E-22 con los ejercicios |
| Todos los circuitos están **activos** | `400` (§5.3) |

### 5.2 Por campo

| Campo | Obligatorio | Regla |
|---|---|---|
| `name` | sí | string, 1–50 (§7) |
| `coach_note` | no | string, ≤100 |
| `circuits` | sí | array, 1–50 ítems |
| `circuits[].circuit_id` | sí | uuid — `@IsUUID('all')`, **no `'4'`** (el seed genera v5) |
| `circuits[].order` | sí | entero ≥ 1 |

El tope de 50 ítems no es una regla de dominio: es la misma red contra el error de tipeo que E-22 puso en `set_count` y `rep_count`. Una rutina de más de 50 circuitos es un bug del cliente, no una prescripción.

### 5.3 Circuito dado de baja

**Un circuito con `active = false` no puede ensamblarse en una rutina nueva.** Es la precondición de E-16 (*"existen circuitos activos para ensamblar"*) y la postcondición de E-24 (*la baja lo saca de circulación para nuevos ensamblados, pero lo ya asignado mantiene integridad*).

Se distinguen dos errores porque son dos problemas distintos:

- **`404`** — el `circuit_id` no está en la base. Mismo criterio que E-22 con los ejercicios.
- **`400`** — el circuito existe pero está de baja, **con el nombre en el mensaje**: `El circuito 'Cardio HIIT' está dado de baja y no puede usarse en una rutina nueva.` Un `404` acá sería mentira y mandaría al front a buscar un bug de ids inexistente; con el nombre, el entrenador entiende que le alcanza con reactivarlo por `POST /routine/circuit/set-active/:id`.

Nótese que esto **no** contradice que los listados devuelvan el `active` de cada circuito: eso es para que el entrenador vea las rutinas *viejas* que referencian una pieza dada de baja. La restricción aplica sólo al alta.

## 6. Transacción y respuesta

El alta toca dos tablas en cascada (`Routine` → `Routine_Circuit`). Se envuelve en una transacción con `QueryRunner`, igual que `createCircuit`: o entra todo o no entra nada. Sin esto, una falla intermedia deja una rutina vacía que la propia regla de E-17 (*no se puede dejar una rutina sin circuitos*) no permitiría reparar.

**`201` con el detalle completo**, el mismo formato que `GET /routine/:id`. Después de crear, el front navega a la pantalla de la rutina —que necesita exactamente ese árbol—, así que la segunda llamada se ahorra de verdad. Y devuelve el `order` **ya renumerado**, que con §4.2 es información que el cliente no tenía.

Eso obliga a extraer el armado de esa respuesta —hoy inline en `getRoutineById`— a dos helpers privados (`findRoutineDetail` + `buildRoutineDetailResponse`), espejo exacto del refactor que E-22 hizo con `getCircuitById`. `buildRoutineDetailResponse` sigue delegando cada circuito a `buildCircuitDetailResponse`, que no se toca.

**Errores:** `400` (validaciones de campo, `order` duplicado, circuito inactivo), `404` (algún `circuit_id` inexistente), `401`/`403` (guards), `500` (inesperado).

## 7. Cambio de modelo — `Routine.name` a `varchar(50)`

`Routine.name` es `varchar(20)`, y no entra un nombre real: *"Día A - Pecho y tríceps"* son 23 caracteres. Pasa a **`varchar(50)`**, alineado con `Planification.name`, que es el nivel de arriba del árbol.

**Se hace ahora y no después** por el mismo argumento que se usó para meter `active`: la tabla `Routine` está vacía, así que el `ALTER` es instantáneo y sin backfill. Más adelante ya no lo sería.

Por la regla de mantenimiento del proyecto, el cambio de entidad arrastra:

| Artefacto | Cambio |
|---|---|
| `power-app/src/entities/routine.entity.ts` | `@Column({ length: 20 })` → `50` y el `maxLength` del `@ApiProperty` |
| `Db Creator/ddl.py` | `name VARCHAR(20)` → `VARCHAR(50)` en `CREATE TABLE public."Routine"` |
| `Db Creator/01_estructura.sql` | Regenerado con `python build_sql.py` |
| `02_datos_estaticos.sql` / `03_datos_dinamicos.sql` | **Sin cambios** — no hay ningún INSERT a `Routine` en el seed (verificado) |
| Base viva | `ALTER TABLE public."Routine" ALTER COLUMN name TYPE VARCHAR(50);` — lo aplica el usuario |
| Diagrama de `Doc/` | Miro → SVG/PDF, lo actualiza el usuario |

## 8. Archivos

**Crear:**

- `power-app/src/dtos/routine/create_routine.dto.ts` — con las dos clases anidadas (`CreateRoutineCircuitDto`, `CreateRoutineDto`), validadas en cascada con `@ValidateNested({ each: true })` + `@Type(...)`.

**Modificar:**

- `power-app/src/entities/routine.entity.ts` — el largo de `name`.
- `power-app/src/routine/routine.controller.ts` — el endpoint de andamiaje pasa a real.
- `power-app/src/routine/routine.service.ts` — `createRoutine` + refactor de `getRoutineById` en dos helpers.
- `Db Creator/ddl.py` + `01_estructura.sql`.

`RoutineModule` **no cambia**: `Routine`, `RoutineCircuit` y `Circuit` ya están en su `forFeature`. La validación de existencia de los circuitos se hace con `queryRunner.manager`, que alcanza cualquier entidad del `DataSource`.

Se reutiliza `RoutineDetailResponseDto` (ya existe) para el `@ApiResponse` del `201`.

## 9. Impacto en `Status/`

- **CU-E-16** 🔵 → ✅. Totales: ✅ 51 → **52**, 🔵 13 → **12**. Rol Entrenador: 14 → **15** de 29 (48% → **52%**).
- El cambio de `Routine.name` **no mueve ningún conteo**: es sólo modelo.
- **Hallazgo nuevo a registrar:** `Routine.routine_plan_id` es una columna obsoleta, superada por `Routine_Asignation`. Ningún CU la usa. Sacarla implica `ALTER`, `ddl.py`, `01_estructura.sql` y el diagrama, y conviene hacerlo junto al bloque de planificaciones (donde se implementa E-12), no acá.

## 10. Verificación

- **Compilación:** `npm --prefix power-app run build` en verde.
- **Runtime:** la base está al día y hay **dos circuitos reales cargados**, así que E-16 se prueba de punta a punta. Casos mínimos:

| Caso | Esperado |
|---|---|
| Alta con los 2 circuitos, `order` 1 y 2 | `201` + el árbol completo |
| Alta con `order` `10` y `20` | `201`, persistido como `1` y `2` |
| Alta con el mismo circuito dos veces | `201` — repetición permitida |
| `circuits: []` | `400` "al menos un circuito" |
| Dos ítems con el mismo `order` | `400` |
| `circuit_id` inexistente | `404` |
| `circuit_id` de un circuito dado de baja | `400` con el nombre del circuito |
| `name` de 51 caracteres | `400` |
| Después del alta, `GET /routine/all` | La rutina nueva con `circuit_count` correcto |
| Después del alta, `GET /routine/:id` | El árbol de tres niveles — **valida por fin el orden anidado** que quedó sin probar en la lectura |

## 11. Riesgos y notas

- **El orden anidado de tres niveles nunca se verificó contra la base.** La spec de lectura lo dejó anotado porque no había rutinas. El alta feliz de E-16 es lo que lo destraba: si las find options de TypeORM fallan en el tercer nivel, el plan B es ordenar en el mapper, que es determinista.
- **`Routine_Circuit.id` queda como clave de reconciliación de E-17** (§4.3). Es la consecuencia de permitir repetición, y conviene tenerlo presente al escribir esa spec — E-23 tiene el problema inverso y por eso quedó pausado.
- **El `201` es pesado** (rutina → N circuitos → M ejercicios → K series con la ficha completa de cada ejercicio). Es el mismo árbol que `/routine/:id`, que ya estaba anotado como el endpoint más grande de la API. Si en la práctica molesta, la salida es un `?include=` en el detalle, no una respuesta distinta en el alta.
