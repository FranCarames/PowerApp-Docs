# BE-44 y T58 — Hallazgo LST-05 de Pruebas de circuitos del 31/10: los tipos de circuito (`Circuit_Type`) · Plan

> **Numeración (leer primero).** El pedido llamaba a este cambio **BE-44** (backend) y **T55** (web). Antes de escribir el plan se revisaron el [roadmap](2026-10-16-roadmap-backend.md), `Doc/plans/` y el `PLAN.md` del web en GitHub:
> - **BE-44 está libre:** el roadmap llega a BE-43, y ni el Status ni las ramas del backend usan un número mayor.
> - **T55 no está libre:** en el `PLAN.md` de `develop` (`FranCarames/PowerApp-Web`), **T55** es «Biblioteca de ejercicios del entrenador» (PR #77), **T56** «Hallazgos de los planes de prueba de músculos y grupos» (PR #79) y **T57** «Historial de entrenamientos en pantalla propia» (PR #78), las tres mergeadas el 4/11. El siguiente número libre es **T58**.
>
> Este cambio es **BE-44** (backend) y **T58** (web). Si alguien dice «la T55» al hablar de los tipos de circuito, se refiere a la T58. Los avisos amarillos de los planes de prueba ya dicen BE-44 y T58. Si al llegar al web la T58 ya está usada, se toma el siguiente número libre y se corrige acá, en la [spec](../specs/2026-11-04-tipos-de-circuito-design.md), en la constante `BE44` de [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html) y en los avisos de MAS-01 y MAS-03 de [Pruebas del panel y la navegación](../../Tests/Panel%20y%20navegacion/Pruebas%20del%20panel%20y%20la%20navegaci%C3%B3n.html).
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** En cada repo los cambios quedan **stageados** y el usuario revisa y commitea. La copia del Status en `PowerApp-Docs/Status/` queda **sin stagear** (así lo manda el `CLAUDE.md`).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación del backend es el build más **un script descartable en el scratchpad**, escrito **antes** del código y corrido en rojo. La del web es `typecheck`, `eslint src`, `build` y `prettier --check`, más el navegador.
> 3. **No se levanta el server de producción ni se instala nada** sin pedirlo.
>
> **Este plan es de diseño:** lo escribió la sesión de docs el 4/11 con las decisiones de Fran del 31/10. Lo leen la sesión del **backend** (sección 4) y la del **web** (sección 5). **Primero el back, después el deploy (con el patch) y después la web** (sección 6). Las decisiones y su porqué están en la [spec](../specs/2026-11-04-tipos-de-circuito-design.md): son las **D1 a D6** del pedido, que en el repo se numeran **D59 a D64**.

**Fuente:** la corrida del 31/10 de [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html). El pedido la llama «tanda 4»; en el repo, el archivo es [`3-pruebas-circuitos.resultados.json`](../../Tests/Circuitos/3-pruebas-circuitos.resultados.json), exportado el 31/10 a las 13:58 UTC.
**Modelo:** **cambia.** Tabla nueva `Circuit_Type`; `Circuit` pierde `type` y gana `circuit_type_id`. Manda el de Miro (D59), exportado el 4/11 a [`Doc/PowerApp - Modelo DB.svg`](../PowerApp%20-%20Modelo%20DB.svg) y su PDF. **Dos diferencias con D1; Fran confirmó el 4/11 que vale D1 en las dos:**
1. El diagrama llama a la tabla `CircuitType` y D1 `Circuit_Type`. Se usa `Circuit_Type`, como todas las tablas de la base.
2. El diagrama muestra `Circuit.description` como `Varchar(30)`, cuando era `Varchar(100)`. Parece un resto de la fila `type` que se borró: **no se cambia**.

`RoutineType` y `PlanificationType`, que el export también trae, son de otro cambio.

**Goal:** que el tipo de un circuito deje de ser texto libre y pase a ser un catálogo que administra el Admin, que el Entrenador elija un tipo de ese catálogo al armar un circuito y que el listado de circuitos se pueda filtrar por tipo.

---

## 1. El hallazgo

| Caso del plan de pruebas | Gravedad | Lo que anotó Fran | CU | Qué se decidió |
|---|---|---|---|---|
| **LST-05** · Filtrar por tipo | 2 · Moderado | «Hay que implementar categorías. Ya está siendo refinado en Miro», sobre la nota de la tanda anterior: «La pantalla muestra el tipo en cada tarjeta, pero no tiene filtro por tipo: el buscador mira solo el nombre. […] Además necesita más opciones de filtrado o categorías de circuitos» | [CU-E-21](../../Use%20Cases/entrenador/CU-E-21-obtener-circuitos.md), paso 3 | El tipo pasa a una tabla `Circuit_Type` que administra el Admin (D59 a D61), con su contrato (D62), sus datos (D63) y, en la web, una pantalla de tipos, chips de tipo en Circuitos y un selector en el editor (D64). Casos de uso nuevos [CU-A-24](../../Use%20Cases/admin/CU-A-24-obtener-tipos-de-circuito.md) a [CU-A-27](../../Use%20Cases/admin/CU-A-27-eliminar-tipo-de-circuito.md); ajustados [CU-E-21](../../Use%20Cases/entrenador/CU-E-21-obtener-circuitos.md), [CU-E-22](../../Use%20Cases/entrenador/CU-E-22-crear-circuito.md) y [CU-E-23](../../Use%20Cases/entrenador/CU-E-23-editar-circuito.md) |

**Efecto en los planes de prueba** (ya aplicado):

- [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html): **grupo nuevo «Tipos de circuito»** (CU-A-24 a CU-A-27), primero en la página, con **TIP-01 a TIP-10** (llegar, tarjetas y orden, crear QA Principal, validaciones, nombre repetido, editar, dar de baja, el nombre de un tipo de baja sigue ocupado, reactivar y que el entrenador no tiene la pantalla). **Ajustados:** LST-02, LST-05 (mismo sentido: el `exp` pasa a los chips), CRE-01, CRE-02 y SET-01. **Nuevos:** CRE-07 (solo tipos activos), EDT-09 (un circuito con el tipo de baja), DUP-04 (la copia conserva el tipo), COA-03 (el entrenador filtra y elige, no administra), ERR-05 (la pantalla de tipos en celular, escritorio y teclado) y FIN-02 (baja de los tipos QA). «Antes de empezar» suma QA Principal y QA Temporal, los cinco tipos del seed y la lista de lo que hoy falla.
- [Pruebas del panel y la navegación](../../Tests/Panel%20y%20navegacion/Pruebas%20del%20panel%20y%20la%20navegaci%C3%B3n.html): **MAS-01** (la fila de Más) y **MAS-03** (Configuración en la barra lateral) suman Tipos de circuito.
- Los casos que todavía no pasan llevan el aviso amarillo `kt: 'Hoy falla.'` con «Lo arreglan la BE-44 (backend) y la T58 (web). Marcalo Falla mientras no estén en Render.» (la constante `BE44`). **TIP-10 y SET-01 no lo llevan:** hoy ya pasan (el entrenador que abre una ruta `/a/` vuelve a su inicio, y el tipo de SET-01 se puede escribir en el campo libre).

**Efecto en la tanda anterior:** los ids se conservan, así que los resultados cruzan. LST-05 sigue en Falla hasta que la BE-44 y la T58 estén en Render. LST-02, CRE-01 y CRE-02, que estaban en Funciona, ahora esperan otra pantalla: hay que volver a marcarlos. Los casos nuevos arrancan sin probar.

---

## 2. Qué se decidió (31/10)

Resumen. El detalle y el porqué de cada punto están en la [spec](../specs/2026-11-04-tipos-de-circuito-design.md), sección 2; lo descartado, en su sección 3.

1. **D1 / D59 · Modelo** (el de Miro): `Circuit_Type` (`id` UUID PK, `type` VARCHAR(50) NOT NULL, `description` VARCHAR(100) NULL, `active` BOOLEAN NOT NULL DEFAULT true, `created_at`, `updated_at`). `Circuit` pierde `type` y gana `circuit_type_id` UUID NOT NULL, FK ON DELETE RESTRICT, con índice. Nombre único sin distinguir mayúsculas ni espacios de los bordes, contra activos e inactivos.
2. **D2 / D60 · Quién:** los administra el Admin (Configuración › Tipos de circuito, `/a/tipos-circuito`). El Entrenador solo los lee: los elige al armar un circuito y filtra con ellos.
3. **D3 / D61 · Sin borrado físico:** baja lógica y reactivar. Un tipo de baja no se ofrece para circuitos nuevos ni para cambiar el tipo; los circuitos que ya lo tienen lo conservan, lo muestran y se siguen editando sin cambiarlo.
4. **D4 / D62 · Contrato,** en el módulo `routine` (sección 3).
5. **D5 / D63 · Datos:** el `02` siembra los cinco tipos con UUID v5; el `03` pasa a Principal, Superserie y AMRAP; un patch lleva la base viva (sección 4.3).
6. **D6 / D64 · Web:** chips de tipo en Circuitos, selector en el editor, aviso sin tipos activos y la pantalla de tipos con el patrón de Tipos de membresía (sección 5).

---

## 3. Contrato

> Este es el contrato **tal cual lo fijó Fran el 31/10** (D4 del pedido). Los textos de error van **exactos**: el web los compara. Lo que el pedido no decía y hubo que fijar para que el back y la web hagan lo mismo está aparte, en 3.9, para poder vetarlo.

### 3.1 `GET /routine/circuit-type/all?include_inactive=`

- **Roles:** entrenador y admin.
- **Query:** `include_inactive` booleano opcional, `false` por defecto, con el mismo `@Transform` que `GetCircuitsQueryDto` (`'true'` y `'false'`). Sin él, solo los activos; con `true`, activos y dados de baja. Otro parámetro: 400 (`forbidNonWhitelisted`).
- **Orden:** por `type` ascendente.
- **200:** un array de tipos. Cada uno:

```json
{
  "id": "49f793de-7681-5c05-a171-371baa69e9eb",
  "type": "Principal",
  "description": "El bloque central de la sesión",
  "active": true,
  "circuit_count": 5,
  "created_at": "2026-06-14T15:00:00.000Z",
  "updated_at": "2026-06-14T15:00:00.000Z"
}
```

- `description` es un texto o `null`.
- `circuit_count` es la cantidad de `Circuit` **activos** (`active = true`) con ese `circuit_type_id`. Los circuitos dados de baja no suman.

Esta es **la forma de un tipo** en todas las respuestas de 3.2 a 3.4.

### 3.2 `POST /routine/circuit-type/create` con `{ type, description? }`

- **Roles:** admin. Un entrenador recibe el 403 del guard.
- **Cuerpo:**
  - `type`: texto obligatorio. Se recorta (`trim`) y, ya recortado, tiene que tener de 1 a 50 caracteres.
  - `description`: texto opcional. Se recorta y puede tener hasta 100 caracteres. Vacía o con solo espacios es lo mismo que no mandarla: se guarda `NULL`.
  - Otro campo: 400.
- **Errores:**
  - cuerpo inválido: el 400 del DTO;
  - nombre en uso: **409 `{ error: 'Ya existe un tipo de circuito con ese nombre' }`**, si el `type` recortado y en minúsculas coincide con el de **cualquier** tipo, activo o dado de baja.
- **201:** el tipo creado (forma de 3.1), con `active: true` y `circuit_count: 0`.

### 3.3 `POST /routine/circuit-type/edit/:id` con `{ type, description? }`

- **Roles:** admin. `:id` es un UUID (`ParameterIdDto`): otro valor es un 400.
- **Cuerpo:** el mismo que el alta (`EditCircuitTypeDto extends CreateCircuitTypeDto`), con las mismas reglas. **Pisa los dos campos:** sin `description` (o vacía), la descripción queda en `NULL`.
- **No cambia `active`:** un tipo dado de baja se edita y sigue dado de baja.
- **Orden de los errores:**
  1. cuerpo inválido: el 400 del DTO;
  2. no existe: **404 `{ error: 'Tipo de circuito no encontrado' }`**;
  3. nombre en uso: **409** con el texto de 3.2. **Solo si el nombre cambia**, comparando recortado y en minúsculas: «principal» → «Principal» no es un conflicto. Se compara contra los **demás** tipos, activos y dados de baja.
- **200:** el tipo editado (forma de 3.1, con su `circuit_count`).

### 3.4 `POST /routine/circuit-type/set-active/:id` con `{ active }`

- **Roles:** admin.
- **Cuerpo:** `active` booleano obligatorio.
- **Errores:** no existe: **404** con el texto de 3.3.
- **No hay restricción por uso:** un tipo con circuitos se da de baja igual (D61). Mandar el valor que ya tiene responde 200 sin cambios.
- **200:** el tipo (forma de 3.1).

### 3.5 Circuitos: `POST /routine/circuit/create` y `POST /routine/circuit/edit/:id`

- **Cuerpo:** sale `type` y entra **`circuit_type_id`**, UUID obligatorio (`@IsUUID('all', { message: 'El ID del tipo de circuito debe ser un UUID válido' })`). Todo lo demás, igual. Un cuerpo que todavía trae `type` es un **400** (`forbidNonWhitelisted`).
- **Alta, orden de los errores:**
  1. cuerpo inválido: el 400 del DTO;
  2. las reglas del payload (`validateCircuitPayload`: ejercicio repetido, `amrap_time` sin AMRAP, RPE con RIR, RM con más de una serie): el 400 de hoy;
  3. el tipo no existe: **404 `{ error: 'Tipo de circuito no encontrado' }`**;
  4. el tipo está dado de baja: **400 `{ error: 'El tipo de circuito está dado de baja.' }`**;
  5. algún ejercicio no existe: el 404 de hoy, «Algunos ejercicios no fueron encontrados»;
  6. se crea el circuito con su tipo. Responde **201** con el detalle (3.7).
- **Edición, orden de los errores:**
  1. cuerpo inválido (400 del DTO);
  2. reglas del payload (400 de hoy);
  3. el circuito no existe: el 404 de hoy, «Circuito no encontrado»;
  4. el circuito está dado de baja: el 400 de hoy («El circuito "<nombre>" está dado de baja y no se puede editar. Reactivalo primero.»);
  5. **solo si `circuit_type_id` es distinto del que tiene el circuito:** el tipo nuevo no existe o está dado de baja, con el mismo 404 y el mismo 400 del alta (pasos 3 y 4). **Si es el mismo, no se controla:** conservar un tipo dado de baja está permitido (D61);
  6. algún ejercicio no existe (404 de hoy);
  7. se guarda (la cabecera pisa también `circuit_type_id`). Responde **200** con el detalle.

### 3.6 Listados: `GET /routine/circuit/all` y `GET /routine/circuit/all-plus`

- Sale el query `type` y entra **`circuit_type_id`**, UUID opcional (`@IsOptional()`, `@IsUUID` con el mensaje de 3.5). Filtra `circuit.circuit_type_id = :circuit_type_id`.
- Un UUID que no es de ningún tipo devuelve `[]` (200). Un valor que no es UUID es un 400. `?type=` pasa a ser un 400.
- Se combina con `keyword` y con `include_inactive`, como hoy.

### 3.7 Las respuestas que cambian

**Toda respuesta que hoy trae el `type` de un circuito cambia `type: string` por `circuit_type: { id, type, active }`.** Ninguna trae `circuit_type_id` suelto: el id va dentro de `circuit_type`.

| Endpoint | Dónde va el tipo |
|---|---|
| `GET /routine/circuit/all` | en cada circuito. Hoy devuelve la entidad; pasa a `{ id, name, description, circuit_type, active, exercise_count, created_at, updated_at }` |
| `GET /routine/circuit/all-plus` | en cada circuito |
| `GET /routine/circuit/:id`, `POST /routine/circuit/create`, `POST /routine/circuit/edit/:id` | en el circuito (`buildCircuitDetailResponse`) |
| `POST /routine/circuit/set-active/:id` | en el circuito. Hoy devuelve la entidad; pasa a `{ id, name, description, circuit_type, active, created_at, updated_at }` |
| `GET /routine/all-plus` | `circuits[].circuit` |
| `GET /routine/:id`, `POST /routine/create`, `POST /routine/edit/:id` | `circuits[].circuit` (`buildRoutineDetailResponse`) |
| `GET /routine/assign-user/:id` (el alumno, una rutina individual) | `routine.circuits[].circuit` |
| `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId` (el alumno, una sesión del plan) | `routine.circuits[].circuit` |

Ejemplo, el circuito «Core» del seed en el detalle:

```json
{
  "id": "…",
  "name": "Core",
  "description": "Abdomen en superserie",
  "circuit_type": { "id": "5dc3b269-cc31-5ba1-9da9-a2373d707c46", "type": "Superserie", "active": true },
  "active": true,
  "created_at": "…",
  "updated_at": "…",
  "exercises": []
}
```

El resto de las respuestas (home, historial, planificaciones, asignaciones) no trae el tipo de los circuitos y no cambia.

### 3.8 Textos exactos

| Constante (backend) | Texto | Dónde |
|---|---|---|
| `CIRCUIT_TYPE_NOT_FOUND_ERROR` | `Tipo de circuito no encontrado` | 404 de `circuit-type/edit` y `circuit-type/set-active`; 404 del tipo en `circuit/create` y `circuit/edit` |
| `CIRCUIT_TYPE_DUPLICATE_NAME_ERROR` | `Ya existe un tipo de circuito con ese nombre` | 409 de `circuit-type/create` y `circuit-type/edit` |
| `CIRCUIT_TYPE_INACTIVE_ERROR` | `El tipo de circuito está dado de baja.` | 400 del tipo en `circuit/create` y `circuit/edit` |
| (mensaje del DTO) | `El ID del tipo de circuito debe ser un UUID válido` | 400 de `circuit_type_id` en el cuerpo y en el query |

El web compara los tres primeros literales: el editor de circuitos distingue **tres 404** (el del tipo, «Circuito no encontrado» y «Algunos ejercicios no fueron encontrados»). No cambiarlos sin tocar el web.

### 3.9 Aclaraciones que el pedido no decía (vetables)

Las fijó la sesión de docs para que el back y la web hagan lo mismo. Si Fran no está de acuerdo con alguna, se cambia acá y en la [spec](../specs/2026-11-04-tipos-de-circuito-design.md).

1. **El orden de la edición de circuitos** pone los controles del circuito (existe, está activo) antes que los del tipo. D4 decía «reglas del payload → tipo → ejercicios»; en la edición, saber si el tipo cambió necesita el circuito cargado. El orden relativo de D4 se respeta.
2. **Las formas de `circuit/all` y `circuit/set-active`** (3.7) dejan de ser la entidad y se arman a mano, para no exponer `circuit_type_id` suelto ni la relación.
3. **Recortar y vaciar:** el nombre y la descripción del tipo se guardan recortados, y una descripción vacía se guarda como `NULL`. La edición pisa la descripción: no mandarla la borra (igual que la descripción de un circuito).
4. **La edición controla el nombre solo si cambia** (como `editMembership`). Editar un tipo dado de baja está permitido y no lo reactiva. La respuesta trae su `circuit_count`.
5. **`set-active` no tiene restricciones:** un tipo en uso se da de baja (D61), el mismo valor responde 200, y no hay guarda para «el último tipo activo»: si no queda ninguno, el editor lo dice (5.1.8).
6. **El orden del listado** es `ORDER BY type ASC`, con la collation de la base (igual que los circuitos por nombre). La web vuelve a ordenar donde muestra, con `localeCompare(…, 'es', { sensitivity: 'base' })`: así «Énfasis» no cae al final por la tilde.
7. **Las descripciones de los cinco tipos del seed** las propuso la sesión de docs (4.2, marcadas †).
8. **El patch** (4.3): un `type` vacío o con solo espacios (el DTO viejo lo permitía) va a **Principal**, como `normal`. Un tipo que se crea a partir del texto libre se llama como `MIN(TRIM(type))` de su grupo (determinista), queda activo y sin descripción.
9. **`circuit_type_id` que no es de ningún tipo,** en el query de los listados, devuelve `[]` (no un 404).
10. **El entrenador puede pedir `include_inactive=true`** (D4 da los dos roles). El web del entrenador no lo usa: los tipos de baja que necesita le llegan dentro de cada circuito.
11. **Duplicar un circuito cuyo tipo está dado de baja** (web, 5.1.10): la copia es un circuito nuevo y no puede llevarlo (D61), así que el diálogo de Duplicar pide el tipo de la copia entre los activos.
12. **Dónde se marca un tipo de baja** (web): solo en el selector del editor («<tipo> (dado de baja)»). En los chips, en las tarjetas y en lo que ve el alumno se muestra el nombre a secas.

---

## 4. Backend (BE-44)

**Repo:** `D:\Power App\Backend\PowerApp-Backend`. **Esfuerzo estimado:** 6 h. **Cambia el esquema:** **sí** (tabla nueva y una columna que se reemplaza; patch para la base viva).

### 4.1 Qué hace el backend

| # | Cambio | Dónde |
|---|---|---|
| 1 | **Entidad `CircuitType`** (`@Entity('Circuit_Type')`): `id` (`@PrimaryGeneratedColumn('uuid')`), `type` (`length: 50`, NOT NULL), `description` (`type: 'varchar'`, `length: 100`, `nullable: true`, `string \| null`, como la de `Circuit`), `active` (default `true`), `created_at` y `updated_at` (`@UpdateDateColumn`, como todas desde BE-30), y `@OneToMany(() => Circuit, circuit => circuit.circuitType) circuits` | `power-app/src/entities/circuit_type.entity.ts` (nuevo) |
| 2 | **`Circuit`**: sale `type`. Entra `@Column({ type: 'uuid', nullable: false }) circuit_type_id` y `@ManyToOne(() => CircuitType, circuitType => circuitType.circuits, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'circuit_type_id' }) circuitType`, con el mismo patrón que `RoutineExercise.circuit_id` | `entities/circuit.entity.ts` |
| 3 | **DTOs de tipos:** `CreateCircuitTypeDto` (`type` y `description?` con un `@Transform` que recorta y convierte la descripción vacía en `undefined`; `@IsNotEmpty`, `@IsString`, `@MaxLength(50)` y `@MaxLength(100)`), `EditCircuitTypeDto extends CreateCircuitTypeDto` (clase propia, como `EditCircuitDto`), `SetCircuitTypeActiveDto` (`active`), `GetCircuitTypesQueryDto` (`include_inactive`), `CircuitTypeResponseDto` (la forma de 3.1) y `CircuitTypeRefDto` (`{ id, type, active }`) | `power-app/src/dtos/circuit_type/` (nuevo) |
| 4 | **DTOs de circuitos:** `CreateCircuitDto` cambia `type` por `circuit_type_id` (3.5); `GetCircuitsQueryDto` cambia `type` por `circuit_type_id` (3.6); `CircuitDetailResponseDto`, `CircuitListItemResponseDto`, `CircuitListItemPlusResponseDto` y `RoutineListItemCircuitRefDto` cambian `type` por `circuit_type: CircuitTypeRefDto`; y un `CircuitResponseDto` nuevo para `set-active` (3.7) | `dtos/circuit/`, `dtos/routine/routine_list_item_plus_response.dto.ts` |
| 5 | **Service, tipos:** `getAllCircuitTypes`, `createCircuitType`, `editCircuitType` y `setCircuitTypeActive`, en una sección «TIPOS DE CIRCUITO» del service, con un `buildCircuitTypeResponse` único para las cuatro respuestas. La unicidad del nombre, **en memoria**, como `MembershipService` (`normalizeName` = `trim().toLowerCase()` e `isTypeNameTaken`). `circuit_count` en **una sola consulta** para todo el listado (por ejemplo `loadRelationCountAndMap` con la condición `circuit.active = true`, como el `exercise_count` de los circuitos), no una por tipo | `routine/routine.service.ts` |
| 6 | **Service, circuitos:** `createCircuit` y `editCircuit` controlan el tipo con el orden de 3.5, **dentro de la transacción** (`queryRunner.manager`), y guardan `circuit_type_id`. `buildCircuitsQuery` hace `leftJoinAndSelect('circuit.circuitType', 'circuitType')` y filtra por `circuit_type_id` (el comentario ya lo anticipaba: «cuando type deje de ser string libre, se toca en un solo lugar»). `getAllCircuits` y `setCircuitActive` arman su respuesta a mano (3.7). `buildCircuitDetailResponse`, `getAllCircuitsPlus` y `getAllRoutinesPlus` devuelven `circuit_type`. `findCircuitDetail` y `findRoutineDetail` suman la relación (`'circuitType'` y `'routineCircuits.circuit.circuitType'`), y con eso las dos lecturas del alumno quedan cubiertas | `routine/routine.service.ts` |
| 7 | **Controller:** las cuatro rutas de 3.1 a 3.4 en una sección «TIPOS DE CIRCUITO (CU-A-24 a CU-A-27)», con `@Auth(UserRole.coach, UserRole.admin)` en `all` y `@Auth(UserRole.admin)` en las otras tres. No compiten con `circuit/:id` ni con `/:id`: su primer segmento es `circuit-type` | `routine/routine.controller.ts` |
| 8 | **Módulo:** `CircuitType` en el `TypeOrmModule.forFeature` y su repositorio inyectado en el service | `routine/routine.module.ts` |
| 9 | **Swagger:** los `@ApiResponse` de las cuatro rutas nuevas y de `circuit/create`, `circuit/edit/:id`, `circuit/all`, `circuit/all-plus` y `circuit/set-active/:id` declaran **todos** sus códigos (200/201, 400, 403 donde aplica, 404, 409 y 500) con los textos de 3.8. La descripción de `circuit_type_id` dice: «Id de un tipo de circuito activo (`GET /routine/circuit-type/all`). Al editar, puede ser el tipo que el circuito ya tiene aunque esté dado de baja» | `routine/routine.controller.ts`, DTOs |
| 10 | **Constantes** para los tres textos de 3.8, junto a las demás del service | `routine/routine.service.ts` |
| 11 | **Status del backend:** la entrada de BE-44, las cuatro operaciones nuevas, CU-A-24 a CU-A-27 en el inventario (cuatro CU más) y E-21 a E-23; se copia a `PowerApp-Docs/Status/` **sin stagear** | `Status/` del backend |

### 4.2 `Db Creator`

**`ddl.py` → `01_estructura.sql`.** `Circuit_Type` va antes que `Circuit`:

```sql
-- Tipos de circuito (BE-44): catalogo cerrado que administra el Admin.
-- El nombre es unico sin mayusculas ni espacios de los bordes: lo controla el service
CREATE TABLE public."Circuit_Type" (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(50)  NOT NULL,
    description VARCHAR(100),
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Circuit es una pieza global reutilizable: no depende de Routine
CREATE TABLE public."Circuit" (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(100),
    circuit_type_id UUID         NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_circuit_circuit_type
        FOREIGN KEY (circuit_type_id) REFERENCES public."Circuit_Type"(id) ON DELETE RESTRICT
);

CREATE INDEX idx_circuit_active          ON public."Circuit"(active);
CREATE INDEX idx_circuit_circuit_type_id ON public."Circuit"(circuit_type_id);
```

Se va `idx_circuit_type`.

**`gen_seed.py` y `build_sql.py` → `02_datos_estaticos.sql`.** Una lista `CIRCUIT_TYPES` en `gen_seed.py`, en este orden, y un helper `circuit_type_uuid(name) = U("circuit_type:" + name)` (el `U` de `gen_seed`, namespace `11111111-2222-3333-4444-555555555555`). El `02` suma, después de `Exercised_Muscle`, el bloque «Tipos de circuito» con `(id, type, description, active, created_at, updated_at)`, `active = true`, el `TS` del `02` (`'2026-06-14 12:00:00-03'`) y `ON CONFLICT (id) DO NOTHING`. El encabezado del `02` y el docstring de `build_sql.py` suman `Circuit_Type`.

| Tipo | Id (UUID v5 de `circuit_type:<tipo>`) | Descripción † |
|---|---|---|
| Entrada en calor | `7b4c3dcb-5024-5a2c-81f0-acdb200d16a2` | Movilidad y activación antes del trabajo principal |
| Principal | `49f793de-7681-5c05-a171-371baa69e9eb` | El bloque central de la sesión |
| Superserie | `5dc3b269-cc31-5ba1-9da9-a2373d707c46` | Dos o más ejercicios seguidos, sin descanso entre ellos |
| AMRAP | `ce44ec22-1de2-5b7b-8df0-fb66b945d2bc` | Tantas repeticiones o rondas como se pueda en un tiempo dado |
| Enfriamiento | `58af9d1e-3235-5ede-9fc2-67efab8db0de` | Vuelta a la calma y estiramientos al final de la sesión |

Los ids se calcularon con el mismo algoritmo que `gen_seed.U` (se verificó con `group:Antebrazos`, que da el `7df0c585-…` del `02` actual). Si `build_sql.py` da otros, **valen los que da el script** y hay que corregir esta tabla y el patch.

**`dynamic_data.py` → `03_datos_dinamicos.sql`.** En `_CIRCUITS`, el cuarto campo pasa a ser el **nombre del tipo**: `"normal"` → `"Principal"` (Piernas - Fuerza, Piernas - Hipertrofia, Empuje, Tracción y Circuito en desuso), `"superserie"` → `"Superserie"` (Core) y `"amrap"` → `"AMRAP"` (Metabólico). `_build_training` valida que el nombre esté en `gen_seed.CIRCUIT_TYPES` (y corta la generación si no) y arma la fila con `gen_seed.circuit_type_uuid(ctype)`: `(cid, name, desc, circuit_type_id, active, t0, t0)`. Se va el `assert len(ctype) <= 30`. En `build_sql.py`, el `_insert("Circuit", …)` cambia la columna `("type", "str")` por `("circuit_type_id", "uuid")`, y el resumen imprime los tipos de circuito.

**README de `Db Creator`:** el `02` suma `Circuit_Type`, los conteos suman «5 tipos de circuito», y una línea sobre el patch de BE-44.

**Regenerar:** `python3 build_sql.py`. Los tres `.sql` cambian **solo** donde corresponde (el diff toca `Circuit_Type` y `Circuit`), y correrlo dos veces da los mismos bytes.

### 4.3 El patch para la base viva

**Archivo:** `Db Creator/patches/AAAA-MM-DD-be-44.sql`, con la fecha del día en que se escribe (como los anteriores). Encabezado con QUÉ HACE, ABORTA, «Es idempotente» y «Correrlo con: `psql -v ON_ERROR_STOP=1 -f …`», como [`2026-10-22-be-24-25.sql`](https://github.com/FranCarames/PowerApp-Backend/blob/main/Db%20Creator/patches/2026-10-22-be-24-25.sql). Todo en una transacción (`BEGIN` … `COMMIT`).

1. **Guardas,** que abortan sin cambiar nada:
   - `Circuit_Type` ya existe pero le falta alguna de las columnas `type`, `description` o `active`;
   - alguno de los cinco nombres del seed ya existe en `Circuit_Type` (recortado y en minúsculas) **con otro id** que el de la tabla de 4.2;
   - `Circuit` no tiene ni `type` ni `circuit_type_id` (un estado que ningún paso deja).
2. `CREATE TABLE IF NOT EXISTS public."Circuit_Type"`, igual que el `01`.
3. Los cinco tipos de 4.2, **con sus mismos ids, descripciones y timestamps**, con `ON CONFLICT (id) DO NOTHING`.
4. `ALTER TABLE public."Circuit" ADD COLUMN IF NOT EXISTS circuit_type_id UUID` (todavía sin `NOT NULL`).
5. **Solo si `Circuit.type` existe** (dentro de un bloque `DO $$`, con `EXECUTE` o dentro del `IF`, para que la segunda corrida, sin `type`, no falle):
   1. Crea un `Circuit_Type` por cada valor de `LOWER(TRIM(type))` que **no** sea `'normal'` ni `''` y que **no** coincida con un tipo existente (también recortado y en minúsculas). El nombre es `MIN(TRIM(type))` del grupo; activo, sin descripción, id `gen_random_uuid()`.
   2. Los circuitos con `LOWER(TRIM(type))` en `('normal', '')` y sin `circuit_type_id` pasan a **Principal** (`49f793de-…`).
   3. El resto toma el tipo con el mismo `LOWER(TRIM(type))` (los del seed y los recién creados): `principal`, `Superserie`, `amrap`, `AMRAP` o `entrada en calor` caen en el tipo del seed.
   4. `RAISE NOTICE` con cuántos tipos creó y cuántos circuitos quedaron en cada uno.
6. **Guarda:** si queda algún circuito sin `circuit_type_id`, `RAISE EXCEPTION` (se deshace todo).
7. `circuit_type_id` pasa a `NOT NULL`; `DROP CONSTRAINT IF EXISTS fk_circuit_circuit_type` y se vuelve a crear con `ON DELETE RESTRICT`; `CREATE INDEX IF NOT EXISTS idx_circuit_circuit_type_id`.
8. `DROP INDEX IF EXISTS public.idx_circuit_type` y `ALTER TABLE public."Circuit" DROP COLUMN IF EXISTS type`.

Al final, comentadas, las consultas de verificación (deberían dar todas `ok`): `Circuit` no tiene `type`; `circuit_type_id` es `NOT NULL` con su única FK a `Circuit_Type` en `RESTRICT`; los cinco ids del seed existen; y una consulta suelta con cuántos circuitos tiene cada tipo.

**Idempotente:** la segunda corrida no encuentra `type`, no mapea nada y solo vuelve a asegurar el `NOT NULL`, la FK y el índice. **Alternativa equivalente:** recrear la base con `01 → 02 → 03`.

### 4.4 Cómo se verifica (sin levantar el server)

El script descartable va en el scratchpad, **se escribe antes del código y se corre en rojo.** Corre **el service real** sobre un mundo en memoria, como los de BE-27 a BE-42. Qué tiene que probar:

| Qué | Casos |
|---|---|
| `circuit-type/all` | Sin `include_inactive`: solo los activos; con `true`: todos; orden por `type`. `circuit_count` cuenta solo los circuitos activos (un circuito de baja no suma) y es 0 para un tipo sin circuitos. `description` en `null` cuando no tiene |
| `circuit-type/create` | 201 con `active: true` y `circuit_count: 0`; nombre y descripción recortados; descripción vacía o de espacios → `null`. **409** contra un activo y contra uno **dado de baja**, con mayúsculas distintas y con espacios en los bordes. 400 del DTO: sin `type`, con solo espacios, con 51 caracteres, descripción de 101, un campo de más |
| `circuit-type/edit/:id` | 200 con su `circuit_count`; sin `description` la borra; cambiar solo las mayúsculas no da 409; un nombre de otro tipo (activo o de baja) da **409**; un tipo dado de baja se edita y sigue de baja; **404** con el texto exacto. Orden: un pedido con cuerpo inválido y un id inexistente da el 400 |
| `circuit-type/set-active/:id` | Baja y reactivar (200, forma de 3.1); un tipo con circuitos se da de baja igual; el mismo valor da 200 sin cambios; **404** |
| `circuit/create` | Con un tipo activo: 201 y el detalle con `circuit_type`. **404** con un tipo inexistente y **400** con uno dado de baja, sin crear nada (ni el circuito ni sus ejercicios). Un cuerpo con `type` da 400. **Orden** (3.5): payload inválido + tipo inexistente → el 400 del payload; tipo de baja + ejercicio inexistente → el 400 del tipo |
| `circuit/edit/:id` | Conservar un tipo **dado de baja** (mismo id): 200. Cambiarlo a uno de baja: **400**; a uno inexistente: **404**; a uno activo: 200 con el tipo nuevo. **Orden** (3.5): circuito inexistente + tipo inexistente → «Circuito no encontrado»; circuito de baja + tipo de baja → el 400 del circuito |
| Listados | `circuit_type_id` filtra en `all` y en `all-plus`; un UUID de ningún tipo → `[]`; un valor que no es UUID → 400; `?type=` → 400; se combina con `keyword` e `include_inactive` |
| Formas (3.7) | Las ocho filas de la tabla traen `circuit_type: { id, type, active }`, **ninguna** trae `type` ni `circuit_type_id` sueltos, y el alumno ve el tipo en sus dos detalles |
| Roles | Un entrenador lee `circuit-type/all` y recibe 403 en `create`, `edit` y `set-active` |
| Swagger | `verify-controllers.js` (el que lee el Swagger): las cuatro rutas nuevas con sus códigos; `CreateCircuitDto` tiene `circuit_type_id` y no `type`; `GetCircuitsQueryDto` tiene `circuit_type_id`; las respuestas de circuitos declaran `circuit_type` |
| Textos | Los de 3.8, exactos |
| `Db Creator` | Regenerado dos veces, mismos bytes; el diff de los tres `.sql` solo toca `Circuit_Type` y `Circuit`; los ids de los cinco tipos son los de 4.2; los siete circuitos del `03` quedan en Principal (5), Superserie (1) y AMRAP (1). Si se puede, los tres `.sql` aplicados en un SQLite en memoria con las claves foráneas activas, como en BE-21 |

**Regresión:**
- Los scripts de BE-12 a BE-43 sobre el `dist` nuevo, **0 fallas**. Los que miran el `type` de un circuito (o lo mandan al crear uno) se actualizan a `circuit_type` / `circuit_type_id`; el resto no se toca.
- **Build:** `npm --prefix power-app run build`, sin errores.

**El patch:** si hay un Postgres local (el del entorno Local de los planes de prueba), aplicarlo sobre una base creada con los `.sql` **anteriores** a BE-44, con circuitos de tipo `normal`, `Core`, `core `, `''`, `amrap` y `principal`, y comprobar: los tipos creados (uno solo para `Core` y `core `), cada circuito en su tipo, `type` borrado, y que la segunda corrida no cambia nada. Si no hay Postgres, el patch queda **sin verificar** y se dice así en el Status.

**Qué NO se verifica:** el runtime contra la base de Render (BE-35) y las pantallas (son de su repo).

**Qué le queda al usuario:** correr el patch en la base de Render y desplegar (sección 6). **El web empieza después de eso.**

---

## 5. Web (T58 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de la BE-44 desplegada en Render** (para `api:fetch`). **Referencia visual y de textos:** el [prototipo](../../UI%20Front/powerapp-prototype-web.html): `a-tipos-circuito`, los chips de `a-circuitos`, el selector de `circuitEditor` y las entradas de la barra lateral y de `a-mas`.

### 5.1 Qué hace el web

0. **El prototipo manda en lo visual y en los textos.** Donde esta lista y el prototipo difieren en un detalle, se dice acá cuál vale. El prototipo es una maqueta: no tiene errores del servidor, carga ni el entrenador en `/c/circuitos`; eso lo fija esta sección.
1. **Contrato:** `api:fetch` desde Render y `api:gen`. Entran los cuatro endpoints de tipos, `circuit_type_id` en el alta y la edición de circuitos y en el query de los listados, y `circuit_type` en las respuestas de 3.7. Los tipos provisionales de `pending.ts` que tengan `type` en un circuito (`CircuitDetail` y los del alumno) pasan a `circuit_type`.
2. **Hooks:** `useCircuitTypes({ includeInactive })` (`GET /routine/circuit-type/all`) en `features/catalog/hooks/`, porque lo usan el Admin y el editor de los dos roles; y `useSaveCircuitType(type?)` y `useSetCircuitTypeActive()` en `features/admin/hooks/`, como los de membresías. Crear, editar, dar de baja o reactivar un tipo **invalida** las consultas de tipos, de circuitos y de rutinas (los tres muestran el nombre del tipo).
3. **La pantalla Tipos de circuito** (`/a/tipos-circuito`, `CircuitTypesPage`, con `CircuitTypeCard` y `CircuitTypeModal`), copiada de `MembershipTypesPage`:
   - Encabezado «Configuración» / «Tipos de circuito» y, debajo, la línea de ayuda.
   - Pide `useCircuitTypes({ includeInactive: true })`. Las tarjetas van **primero las activas y después las dadas de baja, cada grupo por orden alfabético** (`localeCompare(…, 'es', { sensitivity: 'base' })`), en dos columnas desde 960 px.
   - **Cada tarjeta:** un `Tile` con el ícono `cycle`, el nombre, «N circuitos» (`circuit_count`, en singular «1 circuito»), el lápiz y el tacho (o Reactivar si está de baja), y abajo la descripción si tiene. Una dada de baja se ve apagada, con la píldora «Inactivo».
   - **Alta y edición en un modal** (hoja desde abajo en celular, centrado en escritorio) con «Nombre» (hasta 50) y «Descripción» (opcional, hasta 100). En la edición, la descripción del modal avisa que el cambio se ve en todos los circuitos.
   - **Baja con confirmación** (`ConfirmDialog` destructivo) y **reactivar sin confirmación**, con el botón ocupado mientras reactiva.
   - Estados de carga (`ListSkeleton`), error con Reintentar (`ErrorState`) y vacío (`EmptyState`), y el botón flotante para crear.
4. **Navegación** (5.2): la entrada en la barra lateral del Admin (Configuración, entre Membresías y Perfil) y una fila en Más (entre Membresías y Mi cuenta). **No** se suma al Panel. El entrenador no tiene ninguna entrada ni ruta.
5. **Circuitos** (`CircuitList`, el mismo para `/a/circuitos` y `/c/circuitos`): debajo de los chips Activos, Inactivos y Todos, **una segunda fila** (`ChipGroup` con `wrap` y `aria-label="Filtrar por tipo"`), como la de `PlanList`:
   - «Todos» y un chip por cada tipo de los circuitos que deja ver la primera fila (sin mirar la búsqueda), sin repetir, por orden alfabético, con el nombre tal cual. Sin circuitos, la fila no aparece.
   - El chip elegido va en la URL como `?tipo=<id del tipo>`, con `useSearchAndFilter('tipo')`, y se combina con `filtro` y `q`.
   - Un `tipo` que no está entre los chips cuenta como «Todos»; la URL lo conserva, así que vuelve a quedar elegido si el chip reaparece (es lo que hace `PlanList`).
   - Filtra en el cliente, por `circuit.circuit_type.id`, sobre la misma lista que ya se pide con `include_inactive`. El query `circuit_type_id` del backend existe, pero la web no lo usa.
6. **El nombre del tipo, tal cual** (sin `capitalize`): en la tarjeta del circuito («<tipo> · N ejercicios»), en el selector de circuitos de la rutina (`CircuitPickerModal`) y en lo que ve el alumno (`RoutineCircuit`). Un tipo de baja **no** se marca en ninguno de esos lugares (3.9.12).
7. **El editor** (`CircuitForm` y `circuitSchema`): el campo «Tipo» deja de ser un `Input` con `datalist` y pasa a ser un **`Select`**:
   - Opciones: los tipos **activos** (`useCircuitTypes()`), por orden alfabético. Si el circuito tiene un tipo **de baja**, se suma como opción, **elegida**, con el texto «<tipo> (dado de baja)».
   - En el alta arranca en la opción vacía «Elegí un tipo». El schema cambia `type` por `circuit_type_id` (obligatorio, «Elegí el tipo del circuito») y el cuerpo manda `circuit_type_id`, nunca `type`.
   - Se van `knownTypes`, `othersTypes` y la unificación de mayúsculas: ya no hacen falta.
   - Mientras cargan los tipos, el selector está deshabilitado y dice «Cargando tipos…». Si fallan, un aviso rojo con Reintentar: en el alta no se puede guardar; en la edición el selector muestra solo el tipo actual y se puede guardar sin cambiarlo.
8. **Sin tipos activos:**
   - **Alta:** el selector, deshabilitado, dice «No hay tipos activos», y un aviso amarillo lo explica; «Guardar circuito» queda deshabilitado. Al Admin, el aviso le ofrece el botón «Ir a Tipos de circuito» (`/a/tipos-circuito`); al Entrenador le dice que se lo pida al admin.
   - **Edición** (el circuito conserva su tipo, que está de baja): el selector muestra solo ese tipo, el aviso dice que no se le puede cambiar, y se puede guardar. Al Admin, el mismo botón.
9. **Errores al guardar** (5.4): el 404 y el 400 del tipo se distinguen por el texto del servidor y **antes** que los otros 404 de hoy. En los dos casos se vuelven a pedir los tipos y el campo «Tipo» se vacía, para que el entrenador elija otro. Los datos del formulario quedan escritos.
10. **Duplicar:**
    - Si el tipo del original está **activo**, la copia lo conserva: el cuerpo de la copia lleva el mismo `circuit_type_id`. El flujo de hoy no cambia (sin diálogo si no hay cambios sin guardar).
    - Si está **de baja**, Duplicar **siempre** abre el diálogo «Duplicar circuito» (si además hay cambios sin guardar, primero va el párrafo de hoy). El diálogo dice que la copia no puede llevar ese tipo, trae el selector «Tipo de la copia» con los tipos activos (sin ninguno elegido), y «Duplicar» se habilita al elegir uno. La copia se crea con ese tipo.
    - **Sin tipos activos,** el diálogo lo dice y solo ofrece «Cerrar».
11. **README** del web (las secciones de circuitos y del Admin), la **T58** en `PLAN.md` con referencia a este plan, y el **Status** del web (`Status/estado-implementacion-web.md` y `dashboard-estado-web.html`) con CU-A-24 a CU-A-27 y CU-E-21 a CU-E-23. La copia en `PowerApp-Docs/Status/` la hace Fran a mano.
12. **El plan de pruebas es la lista de aceptación:** en [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html), TIP-01 a TIP-10, LST-02, LST-05, CRE-01, CRE-02, CRE-07, SET-01, EDT-09, DUP-04, COA-03, ERR-05 y FIN-02; en [Pruebas del panel y la navegación](../../Tests/Panel%20y%20navegacion/Pruebas%20del%20panel%20y%20la%20navegaci%C3%B3n.html), MAS-01 y MAS-03.

### 5.2 Rutas y navegación

| Qué | Dónde | Detalle |
|---|---|---|
| Ruta | `features/admin/routes.tsx` | `{ path: 'tipos-circuito', Component: CircuitTypesPage }`. El entrenador que la abre vuelve a `/c/alumnos` y el alumno a `/u/plan` (el guard de `/a` que ya existe) |
| Barra lateral | `app/AppShell/navigation.ts` | `CIRCUIT_TYPES = { to: '/a/tipos-circuito', label: 'Tipos de circuito', icon: 'cycle' }`; el bloque «Configuración» del Admin queda `[CATALOG, ADMIN_MEMBERSHIPS, CIRCUIT_TYPES, ACCOUNT]` |
| Tab bar | `navigation.ts` | Sin cambios: en `/a/tipos-circuito` queda marcada Más (`fallback`) |
| Más | `features/admin/pages/MorePage.tsx` | Fila nueva entre Membresías y Mi cuenta: `{ to: '/a/tipos-circuito', icon: 'cycle', title: 'Tipos de circuito', subtitle: 'Para clasificar y filtrar circuitos' }` |
| Panel | `DashboardPage` | Sin cambios |
| Entrenador | `/c/…` | Sin ruta ni entrada nueva |

### 5.3 Textos

Van **exactos**; salen del [prototipo](../../UI%20Front/powerapp-prototype-web.html), salvo los marcados con †, que el prototipo no tiene (son de estados que la maqueta no simula). El [plan de pruebas](../../Tests/Circuitos/Pruebas%20de%20circuitos.html) los cita así. El prototipo da los errores con un aviso flotante; en la web salen junto a su campo o dentro del modal, como dice 5.4.

| Dónde | Texto |
|---|---|
| Tipos de circuito, encabezado | «Configuración» y el título «Tipos de circuito» |
| Tipos de circuito, ayuda | «Los entrenadores eligen uno al armar cada circuito y filtran el listado con ellos.» |
| Tarjeta | el nombre; «N circuitos» («1 circuito»); la descripción; la píldora «Inactivo» si está de baja |
| Botones de la tarjeta (nombre accesible) | «Editar <tipo>», «Eliminar <tipo>», «Reactivar <tipo>» |
| Botón flotante | «Crear tipo de circuito» |
| Vacío | título «Todavía no hay tipos de circuito», mensaje «Creá el primero: sin un tipo activo no se pueden crear circuitos.» y, en la web, el botón «Crear tipo de circuito» (como el vacío de membresías; el prototipo no lo tiene) |
| Modal, títulos | «Nuevo tipo de circuito» / «Editar tipo de circuito» |
| Modal, aviso de la edición | «El cambio se ve en todos los circuitos que lo usan.» |
| Modal, campos | «Nombre» (placeholder «Ej: Movilidad») y «Descripción» (ayuda «Opcional.», placeholder «Ej: Activación antes del bloque principal») |
| Modal, botones | «Guardar» y «Cancelar» |
| Modal, nombre vacío | «Poné un nombre al tipo de circuito» |
| Avisos al guardar | «Tipo de circuito creado» / «Tipo de circuito guardado» |
| Baja, diálogo | título «Eliminar tipo de circuito»; «¿Eliminar <b><tipo></b>? Es una baja lógica: deja de ofrecerse para circuitos nuevos, y los circuitos que ya lo tienen lo conservan. Lo podés reactivar cuando quieras.»; botones «Eliminar» y «Cancelar» |
| Avisos de baja y reactivar | «Tipo de circuito dado de baja» / «Tipo de circuito reactivado» |
| Más | «Tipos de circuito», con «Para clasificar y filtrar circuitos» |
| Circuitos, segunda fila de chips | «Todos» y un chip por tipo (`aria-label` del grupo: «Filtrar por tipo») |
| Tarjeta de un circuito | «<tipo> · N ejercicios» |
| Editor, campo | «Tipo»; opción vacía «Elegí un tipo»; un tipo de baja: «<tipo> (dado de baja)» |
| Editor, tipo sin elegir | «Elegí el tipo del circuito» |
| Editor, cargando † | «Cargando tipos…» |
| Editor, error al cargar los tipos † | «No pudimos cargar los tipos de circuito.» y «Reintentar» |
| Editor, sin tipos activos (alta) | selector: «No hay tipos activos»; aviso: «No hay tipos de circuito activos: hace falta uno para crear un circuito.»; al Admin, el botón «Ir a Tipos de circuito»; al Entrenador, a continuación: «Pedile al admin que cree uno o que reactive alguno.» |
| Editor, sin tipos activos (edición) | «No hay tipos de circuito activos: el circuito conserva el suyo, pero por ahora no se le puede cambiar.» (al Admin, con el botón «Ir a Tipos de circuito») |
| Duplicar, tipo de baja | título «Duplicar circuito»; «El tipo <b><tipo></b> está dado de baja y una copia no puede llevarlo. Elegí el tipo de la copia.»; selector «Tipo de la copia» (opción vacía «Elegí un tipo»); botones «Duplicar» (deshabilitado hasta elegir) y «Cancelar» |
| Duplicar, tipo de baja y ningún tipo activo | «El tipo <b><tipo></b> está dado de baja y no hay otro tipo activo, así que por ahora no se puede duplicar.» y el botón «Cerrar» |

### 5.4 Mensajes por cada error

La pantalla **nunca** muestra el texto del servidor tal cual: lo reconoce y muestra el suyo.

| Pantalla | Respuesta | Texto en pantalla | Qué hace |
|---|---|---|---|
| Modal de tipo (alta y edición) | 409 «Ya existe un tipo de circuito con ese nombre» | «Ya hay un tipo de circuito con ese nombre. Elegí otro o editá ese tipo.» | Aviso rojo dentro del modal, que sigue abierto con los datos |
| Modal de tipo (edición) | 404 «Tipo de circuito no encontrado» | «El tipo de circuito ya no existe. Cerrá esta ventana y volvé a intentar.» | Ídem, y vuelve a pedir los tipos |
| Modal de tipo | 400 del DTO, 500 o sin red | el genérico de `getErrorMessage` | Ídem |
| Tarjeta (baja o reactivar) | 404 | «El tipo de circuito ya no existe.» | Aviso rojo (toast); cierra el diálogo y vuelve a pedir los tipos |
| Editor de circuito | 404 «Tipo de circuito no encontrado» | «El tipo de circuito ya no existe. Elegí otro.» | Aviso rojo arriba del formulario; vuelve a pedir los tipos y vacía «Tipo» |
| Editor de circuito | 400 «El tipo de circuito está dado de baja.» | «El tipo de circuito se dio de baja mientras editabas. Elegí otro.» | Ídem |
| Editor de circuito | 404 «Circuito no encontrado» | el de hoy: «El circuito ya no existe. Volvé a la lista.» | Como hoy |
| Editor de circuito | 404 «Algunos ejercicios no fueron encontrados» | el de hoy: «Alguno de los ejercicios ya no existe en el catálogo. Quitalo e intentá de nuevo.» | Como hoy |
| Editor de circuito | 400 del circuito dado de baja | el de hoy: «El circuito está dado de baja y no se puede editar. Reactivalo primero.» | Como hoy |
| Duplicar | 404 o 400 del tipo (una carrera) | los dos del editor | Toast rojo; no se crea la copia |

### 5.5 Accesibilidad

- Las tarjetas de tipos son contenido, no botones: el foco va al lápiz, al tacho o a Reactivar, con sus nombres accesibles (5.3).
- El modal es un diálogo con foco atrapado; Escape cierra salvo mientras guarda. El error del nombre va junto a su campo (`Field`).
- La segunda fila de chips es un grupo con su `aria-label` («Filtrar por tipo»); cada chip es un botón con `aria-pressed`, como los de hoy.
- El selector «Tipo» es un `<select>` nativo con su `<label>`. El tipo dado de baja se distingue por el texto («(dado de baja)»), no solo por el color.
- El aviso de «sin tipos activos» es un `Note` con `role="status"`; el de un error al guardar, con `role="alert"`, como hoy.

### 5.6 Cómo se verifica

- `typecheck`, `eslint src`, `build` y `prettier --check` en verde.
- **Navegador (Chromium, 390 px y escritorio)** contra el doble local que imite la BE-44 con los textos exactos de 3.8 (y, cuando la BE-44 esté en Render, contra el backend real):
  - **la pantalla de tipos:** el orden, el alta, el 409 (también contra uno de baja), la edición, la baja y reactivar;
  - **la navegación:** la barra lateral, Más y la tab Más marcada;
  - **los chips:** de los dos roles, con `?tipo=` al recargar y al cambiar de chip de estado;
  - **el editor:** el selector en el alta y en la edición con un tipo de baja; el cuerpo con `circuit_type_id` y sin `type`;
  - **los errores:** el 404 y el 400 del tipo (con dos pestañas); sin tipos activos, en los dos roles;
  - **duplicar:** con un tipo activo y con uno de baja;
  - **las vistas del alumno:** el nombre del tipo.
- Los casos de 5.1.12 como lista de aceptación. **Sacar los avisos amarillos** de esos casos es de Docs (sección 6).

**Qué NO se verifica:** el runtime contra la base de Render hasta que la BE-44 esté desplegada y el patch aplicado.

---

## 6. Orden

1. **Backend (BE-44)** primero: spec de este plan → script rojo → código → build → regresión → `Db Creator` regenerado → patch → Status. Cada cosa en el repo del backend, **stageada**.
2. **El usuario corre el patch en la base de Render y despliega el backend**, uno detrás del otro y **en ese orden**:
   - Si el patch aborta, no cambió nada y el backend viejo sigue funcionando: se revisa antes de desplegar.
   - Entre el patch y el fin del deploy, el backend viejo falla en todo lo que lee un circuito (busca `type`). Son los minutos del deploy.
   - Desde el deploy del backend hasta el de la T58, **la web vieja también falla con los circuitos** (lee `type`, que ya no viene, y su editor lo manda): conviene que la T58 esté lista para salir enseguida (se puede avanzar contra el backend local con la BE-44, sección 5.6).
3. **Web (T58)** después: `api:fetch` y `api:gen` sobre el Swagger ya desplegado, y recién ahí las pantallas. No sale antes porque `circuit-type/*` y `circuit_type_id` no existen en el contrato hasta entonces.
4. **Docs:**
   - Corregir en Miro las dos diferencias con D1 (encabezado, «Modelo»): la tabla se llama `Circuit_Type` y `Circuit.description` sigue en `Varchar(100)`. Después, volver a exportar `Doc/PowerApp - Modelo DB.svg` y `.pdf` (si cambia el nombre del archivo, tocar la constante `SRC` de `Doc/modelo-db.html` y los links al PDF).
   - Con la BE-44 y la T58 en Render: sacar los avisos amarillos (la constante `BE44`, `NO_TYPES` y los `kt`/`known`) de TIP-01 a TIP-09, LST-02, LST-05, CRE-01, CRE-02, CRE-07, EDT-09, DUP-04, COA-03, ERR-05 y FIN-02 en Pruebas de circuitos, y de MAS-01 y MAS-03 en Pruebas del panel y la navegación, junto con su línea en «Antes de empezar» de los dos planes. Después, volver a correr esos casos.
   - Las copias de `Status/` (backend y web) las trae el usuario.

**Lo que se decide en el camino y no está resuelto acá:** si los tipos que el patch cree a partir del texto libre de la base de Render se conservan, se renombran o se dan de baja. Es una limpieza del Admin desde la pantalla nueva, no parte del cambio.
