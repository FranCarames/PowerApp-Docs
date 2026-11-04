# Spec — Tipos de circuito (CU-A-24 a CU-A-27, CU-E-21 a CU-E-23)

> **Fecha:** 2026-11-04 · **Tareas:** **BE-44** (backend) y **T58** (web), del [plan del cambio](../plans/2026-11-04-be-44-tipos-de-circuito-plan.md) · **Estado:** decisiones de Fran del 31/10. En el pedido se llaman **D1 a D6**; en la numeración del repo, que sigue la de la [spec del historial](2026-11-04-historial-de-entrenamientos-design.md) (D58), son **D59 a D64**.
> **Nace de:** el hallazgo **LST-05** («Filtrar por tipo», gravedad 2 · Moderado) de la corrida del 31/10 de [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html). Fran anotó: «Hay que implementar categorías. Ya está siendo refinado en Miro», sobre la nota de la tanda anterior («Además necesita más opciones de filtrado o categorías de circuitos»). El pedido la llama «tanda 4»; en el repo es [`3-pruebas-circuitos.resultados.json`](../../Tests/Circuitos/3-pruebas-circuitos.resultados.json), exportado el 31/10 a las 13:58 UTC.
> **Modelo:** manda el de Miro (D59), exportado el 4/11 a [`PowerApp - Modelo DB.svg`](../PowerApp%20-%20Modelo%20DB.svg) y su PDF. **Dos diferencias con D1, que Fran resolvió el 4/11: vale D1 en las dos.** (1) en el diagrama la tabla se llama `CircuitType`; se usa `Circuit_Type`, como dice D1 y como se llaman todas las tablas de la base (`Muscle_Group`, `Routine_Exercise`, `User_Planification`…). (2) El diagrama muestra `Circuit.description` como `Varchar(30)`; antes era `Varchar(100)`, como el `01` y la entidad, y D1 no la menciona: parece un resto de la fila `type` que se borró, así que **no se cambia**. El export trae además `RoutineType` y `PlanificationType`, que son de otro cambio (sección 8).
> **Revierte** una decisión de alcance: «`Circuit.type` como conjunto cerrado» estaba en «Fuera de alcance» del [roadmap](../plans/2026-10-16-roadmap-backend.md) porque, según el Status del 19/8, el tipo era «string libre a propósito». Con este cambio sale de ahí.

## 1. Contexto y objetivo

Hasta hoy el tipo de un circuito es un texto libre de hasta 30 caracteres (`Circuit.type`). El editor sugiere los tipos que ya existen, pero nada impide que convivan «Core», «core» y «Core » ni que cada entrenador invente el suyo. La tarjeta muestra el tipo y el listado no lo filtra: LST-05 falla desde la tanda 2, y en la tanda 3 Fran pidió directamente **categorías**.

El objetivo es que **el tipo sea una lista cerrada que administra el Admin**: el Admin crea, edita, da de baja y reactiva los tipos; el Entrenador elige uno al armar cada circuito y filtra el listado con ellos. Son tres piezas: (1) la tabla `Circuit_Type` y su pantalla de administración, con el patrón de Tipos de membresía; (2) el circuito referencia un tipo en lugar de guardar un texto; y (3) el listado de circuitos suma una fila de chips de tipo, como el de planificaciones.

## 2. Decisiones

Todas tomadas con Fran el 31/10. El contrato exacto y los textos están en el [plan](../plans/2026-11-04-be-44-tipos-de-circuito-plan.md) (secciones 3 y 5).

| # | En el pedido | Decisión | Por qué |
|---|---|---|---|
| D59 | D1 | **Modelo (el de Miro):** tabla nueva `Circuit_Type` (`id` UUID PK, `type` VARCHAR(50) NOT NULL, `description` VARCHAR(100) NULL, `active` BOOLEAN NOT NULL DEFAULT true, `created_at`, `updated_at`). `Circuit` **pierde `type`** y gana **`circuit_type_id` UUID NOT NULL**, FK a `Circuit_Type` con **ON DELETE RESTRICT** y con índice. El nombre del tipo es **único sin distinguir mayúsculas ni los espacios de los bordes, contra activos e inactivos**, como los nombres de membresía | Una tabla es lo único que garantiza que dos circuitos «del mismo tipo» lo sean de verdad: el filtro deja de depender de cómo escribió cada uno. `NOT NULL` porque un circuito sin tipo no se puede filtrar ni mostrar, y el tipo ya era obligatorio. `RESTRICT` porque un tipo nunca se borra (D61), y si alguien lo intentara a mano la base lo frena en lugar de dejar circuitos huérfanos. El índice, porque el listado filtra por esa columna. La unicidad es la de membresías ([`CU-A-21`](../../Use%20Cases/admin/CU-A-21-crear-membresia.md)), contra los inactivos también, para que reactivar uno nunca deje dos con el mismo nombre. Va en el service, en memoria, y no como `UNIQUE` en la base, por la decisión del 12/10 (roadmap, §8) |
| D60 | D2 | **Los tipos los administra el Admin**, en **Configuración › Tipos de circuito** (`/a/tipos-circuito`). **El Entrenador sólo los lee:** los elige al armar un circuito y filtra con ellos | Es un catálogo, como los músculos o los tipos de membresía, y el catálogo es del Admin. Si cada entrenador pudiera crear tipos, volvería el problema del texto libre con más pasos. El Entrenador no pierde nada de lo que hace hoy: elegir y filtrar |
| D61 | D3 | **Sin borrado físico: baja lógica y reactivar.** Un tipo dado de baja **no se ofrece** para circuitos nuevos **ni para cambiarle el tipo** a uno existente. Los circuitos que ya lo tienen **lo conservan, lo muestran y se siguen editando sin cambiarlo** | Es el patrón de toda la app (circuitos, rutinas, planificaciones, membresías). Un borrado físico dejaría circuitos sin tipo o obligaría a migrarlos. Que los circuitos lo conserven evita que una decisión de catálogo del Admin rompa o cambie el trabajo de un entrenador: el circuito sigue igual hasta que alguien decida cambiarle el tipo |
| D62 | D4 | **Contrato en el módulo `routine`:** `GET /routine/circuit-type/all?include_inactive=` (entrenador y admin), `POST /routine/circuit-type/create`, `POST /routine/circuit-type/edit/:id` y `POST /routine/circuit-type/set-active/:id` (admin). Los circuitos reciben `circuit_type_id` en lugar de `type` (con un 404 si el tipo no existe y un 400 si está de baja; en la edición, sólo si cambia), los listados filtran por `circuit_type_id`, y **toda respuesta que hoy trae el `type` de un circuito pasa a traer `circuit_type: { id, type, active }`** | El tipo es parte del circuito, así que vive donde viven los circuitos (`/routine/circuit/…`) y comparte sus roles y su forma (`create`, `edit/:id`, `set-active/:id`, `all?include_inactive=`). Traer el objeto y no sólo el id ahorra a cada cliente una segunda lectura para mostrar el nombre, y `active` es lo que necesita el editor para marcar un tipo dado de baja. El orden de los errores (las reglas del cuerpo, después el tipo, después los ejercicios) es el mismo que ya seguía el alta: primero lo que no depende de la base |
| D63 | D5 | **Datos:** el `02` siembra **Entrada en calor, Principal, Superserie, AMRAP y Enfriamiento**, con UUID v5 deterministas. Los circuitos del `03` pasan de `normal`/`superserie`/`amrap` a **Principal**/**Superserie**/**AMRAP**. Un **patch** lleva la base viva al esquema nuevo: crea la tabla, siembra los mismos cinco tipos (con los mismos ids), **mapea `normal` → Principal**, crea un tipo por cada otro valor (sin distinguir mayúsculas), completa `circuit_type_id`, lo pone NOT NULL y borra `type`. Idempotente y con guardas, como el de BE-24/25 | Los cinco son los momentos clásicos de una sesión y cubren los tres valores que ya usa el seed. Van en el `02` (datos estáticos) porque sin un tipo activo no se puede crear ningún circuito: la app los necesita siempre, como el catálogo de músculos. Deterministas, para que regenerar dé los mismos bytes y para que el patch y el seed coincidan. `normal` no es un tipo con sentido para un entrenador («normal» respecto de qué): lo que el seed llamaba así es el bloque principal. Crear un tipo por cada otro valor conserva lo que escribieron los entrenadores en la base viva sin adivinar a qué tipo del seed correspondía |
| D64 | D6 | **Web:** Circuitos suma **una fila de chips de tipo** (Todos y uno por cada tipo de los circuitos visibles, por orden alfabético, `?tipo=<id>`), como el listado de planificaciones. El editor cambia el campo libre por **un selector de los tipos activos**, más el actual si está de baja, marcado. **Si no hay tipos activos, lo dice** (al Admin, con un acceso a Tipos de circuito). La pantalla de tipos **copia el patrón de Tipos de membresía:** tarjetas con «N circuitos», alta y edición en un modal, baja con confirmación y reactivar | Resuelve LST-05 con un patrón que la app ya tiene y que el plan de pruebas de planificaciones ya prueba: no hay nada nuevo que aprender. Los chips salen de los circuitos que se ven (no del catálogo) para no ofrecer filtros que devuelven una lista vacía, y para que un tipo de baja que algún circuito conserva siga siendo filtrable. El selector reemplaza al texto libre porque es la única forma de que el valor sea uno del catálogo. La pantalla de tipos copia a la de membresías porque es el mismo problema (un catálogo chico con baja lógica) y el Admin ya la conoce |

## 3. Lo descartado

- **Filtrar el texto libre.** Era lo que pedía LST-05 en la tanda 2: chips con los valores distintos de `Circuit.type`, agrupados sin mayúsculas, como hoy hace el listado de planificaciones con su `type`. Se descartó porque no resuelve el problema de fondo: «Core», «Abdominales» y «Zona media» serían tres chips para lo mismo, cada entrenador seguiría inventando el suyo y no habría dónde corregir un nombre mal escrito sin editar circuito por circuito. Fran pidió categorías (tanda 3): un catálogo.
- **Una tabla genérica de categorías** (por ejemplo `Category` con una columna `scope` que diga si es de circuitos, de rutinas o de planificaciones). Se descartó porque hoy sólo los circuitos la necesitan, y una tabla genérica obliga a filtrar por `scope` en cada consulta, a validar en cada FK que la categoría sea del ámbito correcto (la base no lo puede garantizar con una FK simple) y a una pantalla de administración con un selector de ámbito. Si mañana las rutinas o las planificaciones necesitan tipos cerrados, se hace su tabla con este mismo patrón.
- **Un `UNIQUE` en la base** sobre `LOWER(TRIM(type))`. Se descartó por la decisión del 12/10: la unicidad de nombres va en el service (roadmap, §8). Hay un puñado de tipos y el Admin es uno solo, así que la carrera de dos altas simultáneas con el mismo nombre no es un riesgo real.
- **Un tipo opcional** (`circuit_type_id` NULL). Se descartó: el tipo ya era obligatorio, y un circuito sin tipo no aparecería en ningún chip.
- **Que el Entrenador pueda crear tipos desde el editor** («+ Nuevo tipo» dentro del selector). Se descartó por D60: volvería el texto libre por otra puerta.
- **Borrar un tipo sin uso.** Se descartó por D61: una sola regla (baja lógica) para todos los tipos, usados o no, y el nombre de uno dado de baja sigue reservado.

## 4. Modelo

| Tabla | Cambio |
|---|---|
| `Circuit_Type` (nueva) | `id` UUID PK (`gen_random_uuid()`), `type` VARCHAR(50) NOT NULL, `description` VARCHAR(100) NULL, `active` BOOLEAN NOT NULL DEFAULT true, `created_at` y `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW() (con `@UpdateDateColumn`, como todas desde BE-30) |
| `Circuit` | Se borran la columna `type` y su índice `idx_circuit_type`. Se suma `circuit_type_id` UUID NOT NULL, con la FK `fk_circuit_circuit_type` a `Circuit_Type(id)` ON DELETE RESTRICT y el índice `idx_circuit_circuit_type_id` |

**Lo que el modelo no dice y queda escrito acá:**

- El nombre y la descripción se guardan **sin los espacios de los bordes**, y una descripción vacía se guarda como `NULL`.
- La unicidad del nombre (D59) la controla el service. La base no la garantiza.
- No hay borrado físico (D61): ningún endpoint borra un `Circuit_Type`, y la FK `RESTRICT` frena un `DELETE` hecho a mano si algún circuito lo usa.

## 5. Contrato

El contrato completo (cuerpos, validaciones, orden de los errores, textos exactos y formas de respuesta) está en el [plan, sección 3](../plans/2026-11-04-be-44-tipos-de-circuito-plan.md). Resumen:

| Endpoint | Roles | Qué hace | Éxito |
|---|---|---|---|
| `GET /routine/circuit-type/all?include_inactive=` | entrenador, admin | Los tipos (sin `include_inactive`, sólo los activos), por `type` ascendente, con `circuit_count` | 200 |
| `POST /routine/circuit-type/create` `{ type, description? }` | admin | Alta; 409 si el nombre ya existe | 201 |
| `POST /routine/circuit-type/edit/:id` `{ type, description? }` | admin | Edición; 404 y 409 | 200 |
| `POST /routine/circuit-type/set-active/:id` `{ active }` | admin | Baja lógica o reactivar; 404 | 200 |
| `POST /routine/circuit/create` y `edit/:id` | entrenador, admin | `circuit_type_id` en lugar de `type`; 404 si no existe, 400 si está de baja (en la edición, sólo si cambia) | 201 / 200 |
| `GET /routine/circuit/all` y `all-plus` | entrenador, admin | Filtran por `circuit_type_id` en lugar de `type` | 200 |

**Por qué `set-active` y no `DELETE`:** es el mismo endpoint para dar de baja y para reactivar, como `circuit/set-active/:id`, `routine/set-active/:id` y `membership/set-active/:id`.

## 6. Pantallas

El [prototipo](../../UI%20Front/powerapp-prototype-web.html) (`a-tipos-circuito`, los chips de `a-circuitos` y el selector de `circuitEditor`) es la referencia visual y **fija los textos**. El plan los repite, con los mensajes de cada error, en sus secciones 5.3 y 5.4.

- **Tipos de circuito** (`/a/tipos-circuito`, sólo el Admin): «Configuración» y el título «Tipos de circuito», tarjetas con el nombre, la descripción y «N circuitos» (los circuitos activos que lo usan), primero los activos y después los dados de baja. El botón flotante abre el alta en un modal; el lápiz, la edición; el tacho, la confirmación de la baja; un tipo dado de baja se ve apagado, con «Inactivo» y el botón Reactivar. Entra por la barra lateral (Configuración, entre Membresías y Perfil) y por Más (entre Membresías y Mi cuenta).
- **Circuitos** (`/a/circuitos` y `/c/circuitos`): debajo de Activos, Inactivos y Todos, una segunda fila de chips con Todos y un chip por tipo, sacados de los circuitos que deja ver la primera fila. La tarjeta dice «<tipo> · N ejercicios» con el nombre del tipo tal como lo escribió el Admin.
- **Editor de circuito:** «Tipo» pasa a ser un selector con los tipos activos por orden alfabético. Si el circuito tiene un tipo de baja, el selector lo muestra elegido como «<tipo> (dado de baja)». Sin tipos activos, un aviso lo dice (y al Admin le ofrece «Ir a Tipos de circuito»).

## 7. Casos de uso

| CU | Cambio |
|---|---|
| [CU-A-24](../../Use%20Cases/admin/CU-A-24-obtener-tipos-de-circuito.md) (nuevo) | Obtener Tipos de Circuito: activos y dados de baja, con los circuitos activos de cada uno |
| [CU-A-25](../../Use%20Cases/admin/CU-A-25-crear-tipo-de-circuito.md) (nuevo) | Crear Tipo de Circuito: nombre único sin mayúsculas ni espacios de los bordes, contra activos e inactivos |
| [CU-A-26](../../Use%20Cases/admin/CU-A-26-editar-tipo-de-circuito.md) (nuevo) | Editar Tipo de Circuito: el nombre nuevo se ve en todos sus circuitos; uno dado de baja se edita y sigue de baja |
| [CU-A-27](../../Use%20Cases/admin/CU-A-27-eliminar-tipo-de-circuito.md) (nuevo) | Eliminar Tipo de Circuito (lógico): baja y reactivar, con lo que conservan los circuitos (D61) |
| [CU-E-21](../../Use%20Cases/entrenador/CU-E-21-obtener-circuitos.md) | Alcance y paso 3 con `Circuit_Type`: cada circuito con su tipo, y el filtro por tipo |
| [CU-E-22](../../Use%20Cases/entrenador/CU-E-22-crear-circuito.md) | Paso 1: elige un tipo activo. Caminos alternativos: sin tipos activos, y tipo de baja o inexistente al guardar |
| [CU-E-23](../../Use%20Cases/entrenador/CU-E-23-editar-circuito.md) | Puede cambiar el tipo: conservar uno de baja sí, elegir otro de baja no |

Los CU pasan de **78 a 82**, en un paquete nuevo del Admin: «Administrar Tipos de Circuito».

## 8. Fuera de alcance

- **Tipos para rutinas o planificaciones.** El modelo exportado el 4/11 ya muestra `RoutineType` y `PlanificationType` (con `routine_type_id` en `Routine` y `planification_type_id` en `Planification`), con este mismo patrón y no una tabla genérica (sección 3). Son otro cambio: este no los toca, y `Planification.type` sigue siendo texto libre hasta entonces.
- **Más de un tipo por circuito,** o etiquetas libres además del tipo.
- **Cambiarles el tipo en lote** a los circuitos de un tipo dado de baja. Se hace circuito por circuito (CU-E-23).
- **Ordenar los tipos a mano** (una columna de orden). Van por orden alfabético.
- **Un acceso en el Panel del Admin** (la fila Gestión). La pantalla entra por Configuración y por Más.
- **Borrar un tipo** (D61).

## 9. Riesgos

- **Cambia la forma de las respuestas de circuitos y rutinas** (D62): `type` desaparece y aparece `circuit_type`. El web tiene que salir **después** del backend (la T58 empieza con el contrato desplegado), y hasta que salga, la web vieja falla con los circuitos: lee `type`, que ya no viene, y su editor lo manda, y el backend lo rechaza con un 400 (`forbidNonWhitelisted`). La ventana entre el deploy del backend y el de la T58 tiene que ser corta. La app iOS no lee el tipo de los circuitos (no figura en `Doc/app-ios/`).
- **El patch y el deploy van juntos.** El backend nuevo lee `circuit_type_id` y el viejo lee `type`: entre el deploy y el patch, los circuitos fallan. El plan fija el orden (sección 6).
- **Los tipos que el patch crea a partir del texto libre** pueden ser basura («asd», «prueba»). Quedan activos y el Admin los limpia: los da de baja o los renombra desde la pantalla nueva. Los circuitos QA del plan de pruebas (con `principal`) caen en el Principal del seed.
- **El diagrama todavía difiere de D1 en dos detalles** (ver el encabezado): el nombre de la tabla y el largo de `Circuit.description`. Fran confirmó D1 el 4/11. Hasta que se corrija el diagrama en Miro, quien lo lea puede confundirse: ante la duda, valen esta spec y el plan.
