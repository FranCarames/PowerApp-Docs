# T59 — Hallazgos del 09/11: los circuitos en la rutina y la búsqueda de tipos de circuito · Plan

> **Numeración.** La tarea del web es la **T59 (o el siguiente libre)**: el 09/11 la última del `PLAN.md` del web es la T58 (tipos de circuito). Si al llegar ese número ya está usado, se toma el siguiente libre y se anota acá, en la constante `T59` de los dos planes de prueba y en sus «Antes de empezar».
>
> **Este plan es de diseño:** lo escribió la sesión de docs el 09/11. Lo lee la sesión del **web** (sección 4). Las variantes las eligió Fran en un canvas de diseño; acá están descritas con sus textos exactos.

**Fuente:** dos tandas exportadas el 09/11 (todavía no están en el repo: entran con `/commit-test-results`):

- [Pruebas de rutinas](../../Tests/Rutinas/Pruebas%20de%20rutinas.html), tanda 4: **CIR-01**.
- [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html), tanda 7: **TIP-02** y **TUS-03**.

**Sin cambios de contrato ni de back.** El detalle del circuito ya trae `circuit_type` y las series de cada ejercicio; el listado de circuitos, el tipo y los ejercicios. No hay tarea BE ni cambia el modelo.

**Goal:** que cada circuito de la rutina muestre su tipo y, a pedido, sus series; que agregar circuitos a una rutina sea una pantalla completa (en celular y tablet) o un panel al costado (en escritorio), con búsqueda por nombre, chips de tipo y varios a la vez; y que Tipos de circuito tenga buscador y muestre los dados de baja solo a pedido.

---

## 1. Los hallazgos

| Caso | Gravedad | Lo que anotó Fran | CU | Qué se decidió |
|---|---|---|---|---|
| **Rutinas · CIR-01** · La tarjeta de cada circuito | 2 · Moderado | «Le falta info de las series a realizar, el resto está perfecto.» Remite a TUS-03 | [CU-E-16](../../Use%20Cases/entrenador/CU-E-16-crear-rutina-sistemica.md), [CU-E-17](../../Use%20Cases/entrenador/CU-E-17-editar-rutina-sistemica.md) | La tarjeta suma el tipo y un interruptor «Ver series» que muestra cada bloque (sección 4.1) |
| **Circuitos · TUS-03** · Buscar circuitos por tipo al armar una rutina | 3 · Leve | «No veo los tipos de circuitos; esta pantalla no debería ser un modal y debería ocupar la pantalla completa.» Remite a CIR-01 | CU-E-16, CU-E-17, [CU-E-21](../../Use%20Cases/entrenador/CU-E-21-obtener-circuitos.md) | El modal «Agregar circuito» se reemplaza por la pantalla «Agregar circuitos» en celular y tablet, y por la «Biblioteca de circuitos» al costado en escritorio. La búsqueda pasa a ser **solo por nombre** y el tipo se filtra con chips (sección 4.2) |
| **Circuitos · TIP-02** · Tarjetas y orden | 3 · Leve | «No veo ningún textfield ni un toggle para incluir o no los inactivos.» | [CU-A-24](../../Use%20Cases/admin/CU-A-24-obtener-tipos-de-circuito.md) | Tipos de circuito suma el buscador «Buscar tipo de circuito» y el chip «Incluir inactivos», apagado de entrada (sección 4.3) |

Los tres son **solo de front**.

**Fuera de este plan:** las otras fallas de esas tandas. En Rutinas, CIR-05, EDT-01, FIL-03 y QUI-01 (de la corrida del 31/10); en Circuitos, ERR-03 y ERR-05 (diferidas). ERR-05 se reescribe por la sección 4.3, pero su falla anterior no se trata acá.

### 1.1 Casos de uso (ya aplicado)

- **CU-A-24:** el camino principal suma la búsqueda por nombre (paso 4) y el filtro de inactivos (paso 5): de entrada se ven solo los activos. Caminos alternativos nuevos: «Todos los tipos están dados de baja» y «Sin coincidencias». Regla nueva, la 3 («Qué se ve»); la 2 no cambia.
- **CU-E-16 y CU-E-17:** en el paso que lista los circuitos disponibles, cada uno se ve con su tipo y sus ejercicios, la búsqueda es por nombre y el filtro por tipo es con chips; se pueden elegir varios a la vez, que se suman al final en el orden elegido. En el que muestra la rutina, cada circuito muestra su tipo y, a pedido, sus series.
- **CU-E-21:** no cambia. No dice nada de la búsqueda (ni la del listado ni la del selector de la rutina).

### 1.2 Planes de prueba (ya aplicado)

Todos los casos nuevos o cambiados llevan el aviso amarillo **«Hoy no cumple el CU.»** con «Lo arregla la T59 de la web (o el siguiente número libre); hasta que esté en Render, marcalo Falla.» (constante `T59` de cada plan).

[Pruebas de rutinas](../../Tests/Rutinas/Pruebas%20de%20rutinas.html):

| Caso | Qué cambia |
|---|---|
| CRE-01 | Agrega los dos circuitos con la pantalla nueva (o con la biblioteca, en escritorio) |
| **CIR-01** | Conserva el id. El tipo en la tarjeta y «Ver series» apagado y prendido |
| CIR-02 | Conserva el id: es el caso de «repetir uno que ya está», con la pantalla nueva y junto a otro que no está |
| CIR-08 a CIR-13 | **Nuevos:** la pantalla y elegir varios en orden (08), desmarcar (09), buscador + chips (10), Atrás, Cancelar y el volver de arriba sin perder lo escrito (11), el tope de 50 (12) y la biblioteca en escritorio (13) |
| COA-02 | Suma la ruta del entrenador, `/c/rutinas/{id}/agregar-circuitos` |
| ERR-03 y ERR-04 | La pantalla nueva y el interruptor en celular, escritorio y teclado |

CIR-03 no usa «Agregar existente» (sube, baja y quita): no cambia. EDT-01 y EDT-06 agregan un circuito sin decir cómo: no cambian.

[Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html):

| Caso | Qué cambia |
|---|---|
| **TIP-02** | Con «Incluir inactivos» prendido, para ver el orden de activos y dados de baja |
| TIP-07, TIP-09 y TIP-16 | Dar de baja, reactivar y editar un tipo dado de baja: con el chip apagado, el tipo dado de baja sale de la lista; para verlo, reactivarlo o editarlo hay que prenderlo |
| **TIP-18** | **Nuevo**, «Buscar y ver los dados de baja»: todo lo de la sección 4.3 |
| CRE-08 | Al dar de baja todos los tipos con el chip apagado, el vacío «No hay tipos activos» |
| **TUS-03 → TUS-05** | TUS-03 cambia de sentido (el buscador ya no mira el tipo): **se retira** y lo reemplaza **TUS-05**, «El tipo al agregar circuitos a una rutina»: el tipo en las tarjetas de «Agregar circuitos» y los chips. Para el resto remite a Pruebas de rutinas |
| ERR-05 y ERR-07 | El buscador y el chip en celular, escritorio y teclado; reactivar un tipo con el servidor caído, con el chip prendido |

TIP-15 y TIP-08 no miran un tipo dado de baja en la pantalla (solo usan su nombre): no cambian. TUS-02, CRE-07, CRE-09, EDT-09, DUP-04, DUP-05 y FIN-02 necesitan el chip solo para **reactivar o renombrar al terminar**: eso lo dice una línea nueva de «Antes de empezar» y los casos no cambian, para que no queden en Falla por algo que no es lo que prueban.

**Efecto en las tandas anteriores:** CIR-01, CIR-02, TIP-02 y los demás que conservan el id siguen cruzando con su resultado. El resultado de **TUS-03** queda huérfano y no se muestra; su id no se reutiliza.

### 1.3 Prototipo (ya aplicado)

[`UI Front/powerapp-prototype-web.html`](../../UI%20Front/powerapp-prototype-web.html): la tarjeta con el tipo y el interruptor en `#/a-rutina` y `#/c-rutina` (los ejercicios de `S.circs` suman bloques de series de ejemplo y alguna nota), la pantalla `#/a-agregar-circuitos` y `#/c-agregar-circuitos` en lugar de `circPick`, la biblioteca al costado desde 960 px, y el buscador y el chip en `#/a-tipos-circuito`.

---

## 2. La regla

1. **Un circuito de la rutina se lee sin salir de la rutina:** su tipo siempre, y sus series cuando se las pide. Ver las series no cambia la rutina.
2. **Agregar es elegir de una biblioteca:** solo circuitos activos, buscados **por nombre** (sin tildes ni mayúsculas, como el listado de Circuitos) y filtrados por tipo con chips. Se pueden elegir varios a la vez y van **al final**, en el orden en que se eligieron. Un circuito puede ir más de una vez.
3. **Nada se guarda hasta «Guardar rutina».** Ni la pantalla de agregar ni la biblioteca mandan requests de escritura.
4. **Tope de 50 circuitos por rutina** (`ROUTINE_CIRCUITS_MAX`, el mismo `ArrayMaxSize(50)` del backend): no se puede elegir más que los lugares libres.
5. **Los tipos dados de baja se ven a pedido.** En Tipos de circuito, el chip «Incluir inactivos» arranca apagado, como «Incluir inactivas» en Rutinas.

---

## 3. Backend y contrato: sin cambios

| Endpoint | Para qué | Qué ya trae |
|---|---|---|
| `GET /routine/{id}` | La rutina con sus circuitos | Cada circuito completo: `circuit_type` y, por ejercicio, `coach_note` y `sets` |
| `GET /routine/circuit/{id}` | Un circuito recién agregado (la tarjeta lo pide para tener sus series) | `circuit_type`, y por ejercicio `coach_note` y `sets` (`CircuitDetailResponseDto`) |
| `GET /routine/circuit/all-plus?include_inactive=true` | La pantalla de agregar, la biblioteca y la ficha de la tarjeta mientras llega el detalle | `circuit_type`, `exercise_count` y los nombres de los ejercicios en orden |
| `GET /routine/circuit-type/all?include_inactive=true` | Tipos de circuito | Todos los tipos con `active` y `circuit_count` |
| `POST /routine/create` y `POST /routine/edit/{id}` | Guardar la rutina | Sin cambios: la lista completa de circuitos con su `order` |

No se pide ningún endpoint nuevo: la búsqueda, los chips y el filtro de inactivos se hacen en el front sobre esas listas, como ya pasa en Rutinas y Circuitos.

---

## 4. Web (T59 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de:** nada. **Estado: pendiente.**

Todo vale igual para el Admin (`/a/…`) y el Entrenador (`/c/…`): el editor de rutina es el mismo `RoutineForm`.

### 4.1 La tarjeta de cada circuito en el editor de rutina (CIR-01)

**Archivos:** `features/catalog/components/RoutineCircuitCard.tsx` (y su CSS) y un componente nuevo `Switch` en `shared/ui`.

**Encabezado.** Como hoy (ícono, nombre, la píldora «Dado de baja» si corresponde y los botones Subir, Bajar, Editar y Quitar), con un cambio en la línea de debajo del nombre:

- **«<Tipo> · N ejercicios»**, con el tipo tal como lo escribió el Admin, igual que en la tarjeta de Circuitos (`circuitTypeName`; en singular, «1 ejercicio»). Por ejemplo: «Principal · 3 ejercicios».
- Si otra rutina vigente lo usa, suma **« · se usa en N rutinas»**, como hoy (N cuenta esta rutina).
- El tipo sale del detalle del circuito (`circuit.circuit_type.type`) o, mientras llega, de su ficha del listado (`listed.circuit_type.type`). Sin ninguno de los dos: «Cargando…», como hoy.

**Fila «Ver series».** Al pie del encabezado, una fila con el texto **«Ver series»** a la izquierda y un interruptor tipo iOS a la derecha:

- `role="switch"`, `aria-checked`, `aria-label` **«Ver series de <circuito>»**. Se prende y se apaga con clic, Enter o Espacio. Foco visible como el resto.
- **Arranca apagado en todas las tarjetas** y cada tarjeta tiene el suyo.
- **No se recuerda:** es estado de la tarjeta. No va a la URL ni al borrador de la rutina, así que al recargar, y también al volver de un circuito o de «Agregar circuitos», vuelve a estar apagado.
- **Funciona en una rutina dada de baja,** aunque sus campos estén apagados: ver las series no la cambia. Tiene que quedar fuera del `fieldset` deshabilitado (o no heredar su `disabled`).
- Un circuito sin ejercicios no tiene la fila: muestra «Este circuito no tiene ejercicios.», como hoy.

**Apagado:** como hoy. Cada ejercicio en una línea con su nombre, **«N series»** (la suma de `set_count` de sus bloques) y la píldora de su tipo: «Normal», «AMRAP», «RM» o «AMRAP + RM» (`kindsLabel`).

**Prendido:** cada ejercicio con su nombre y la misma píldora de tipo (sin «N series»), y debajo **una línea por bloque**, en orden (`set_order`), con `formatSetBlock` de `shared/lib/sets.ts`, el mismo resumen del encabezado de cada bloque en el editor de circuitos. Por ejemplo:

- «1×5 · 70% RM»
- «3×8 · 80 kg · RPE 8»
- «1×AMRAP · 60 s»

Si el ejercicio tiene nota del coach (`coach_note`), va debajo de sus bloques, **entre comillas tipográficas**: «“Bajar lento en 3 segundos”».

Si el interruptor está prendido y el detalle del circuito todavía no llegó, se ven los nombres de los ejercicios (de la ficha del listado) y las líneas aparecen cuando llega. Si el detalle no llega (error), queda como hoy: los nombres, sin series.

### 4.2 Agregar circuitos a la rutina (TUS-03)

El modal `CircuitPickerModal` **se elimina**. En su lugar hay dos formas, según el ancho:

| Ancho | Cómo se agrega |
|---|---|
| **Menos de 960 px** (celular y tablet) | «Agregar existente» lleva a la pantalla **«Agregar circuitos»** (4.2.1) |
| **960 px o más** (escritorio) | No hay pantalla aparte: el editor se arma en dos columnas, con la **«Biblioteca de circuitos»** a la derecha (4.2.2) |

960 px es el mismo corte que la barra lateral (`AppShell`).

#### 4.2.1 La pantalla «Agregar circuitos» (menos de 960 px)

**Rutas nuevas:** `/a/rutinas/:id/agregar-circuitos` y `/c/rutinas/:id/agregar-circuitos`, donde `:id` es el id de la rutina o `nuevo`. Cada una con el guard de su zona, como el editor. La tab Rutinas (y en la barra lateral, Rutinas) queda marcada.

**Cómo se llega y cómo se vuelve:** con el mismo mecanismo que «Nuevo circuito» (`features/catalog/routineDraft.ts`):

- **«Agregar existente»** guarda lo escrito con `stashRoutineDraft(routineKey, getValues())` y navega a `<basePath>/<routineKey>/agregar-circuitos`.
- **«Agregar N circuitos»** deja pendiente un `queueRoutineOp(routineKey, { type: 'append', circuitId })` por cada circuito elegido, **en el orden en que se eligieron**, y vuelve al editor con `RESTORE_DRAFT_STATE`. La rutina se abre con lo escrito y los elegidos al final, **todavía sin guardar** (falta «Guardar rutina»). Sin toast.
- **«Cancelar»**, el volver de arriba y **Atrás del navegador** vuelven a la rutina **sin cambios**: lo escrito intacto y nada agregado.
- Sugerencia: para que Atrás desde la rutina no vuelva a abrir «Agregar circuitos», volver con `navigate(-1)` cuando se llegó desde el editor (y si se abrió la dirección directa, `navigate(<editor>, { replace: true, state: RESTORE_DRAFT_STATE })`).
- **Si se recarga** esta pantalla, el borrador en memoria se pierde (como en CIR-07): la pantalla toma la rutina guardada (o una nueva vacía) para el nombre y las marcas «En la rutina», y al agregar vuelve al editor con lo guardado más los elegidos.

**Encabezado** (`PageHeader`):

- Volver (`backLabel`): **el nombre de la rutina**. Es el que está escrito en el formulario aunque no esté guardado; si está vacío, el guardado; en una rutina nueva sin nombre, **«Rutina nueva»**.
- Eyebrow: ese mismo nombre.
- Título: **«Agregar circuitos»**.
- Debajo: **«Elegí los que quieras. Se suman al final de la rutina en el orden en que los tocaste.»**

**Buscador y chips:**

- `SearchInput` **«Buscar circuito»**: busca **solo por nombre**, sin tildes ni mayúsculas (`matchesSearch` sobre `circuit.name`), igual que el listado de Circuitos (LST-07). Ya no mira el tipo.
- Debajo, `ChipGroup` de tipo: **«Todos»** (elegido de entrada) y un chip por cada tipo de los **circuitos activos**, sin repetir y por orden alfabético (`compareTypeNames`), como LST-08. Un tipo dado de baja que algún circuito activo conserva también tiene chip. Se elige uno por vez.
- El buscador y el chip **se combinan**.
- Ninguno de los dos va a la URL: arrancan vacíos («Todos») cada vez que se abre la pantalla, como el modal de hoy.

**Las tarjetas:** solo los circuitos **activos**, en el orden del listado. Cada una es un botón (`aria-pressed`) con:

- El nombre.
- **«<Tipo> · N ejercicios»** (`circuitSubtitle`).
- Los nombres de sus ejercicios en orden, separados por coma, como la tarjeta de Circuitos (LST-02).
- Si ya está en la rutina (en lo que está escrito, no en lo guardado): la píldora **«En la rutina»** o **«En la rutina ×N»**.

**Elegir:**

- Tocar una tarjeta la marca con su **número de orden** (1, 2, 3…), que se lee también con lector de pantalla (por ejemplo, «elegido en el lugar 2»).
- Tocarla de nuevo la **desmarca** y los números de las que siguen **se reacomodan** (si se desmarca la 2, la 3 pasa a ser la 2).
- Un circuito que **ya está en la rutina** se puede volver a elegir.
- **Lo marcado no se pierde al buscar o cambiar de chip:** el botón cuenta todos los elegidos, se vean o no, y al volver a verse mantienen su número.

**Barra fija abajo,** encima de la tab bar (la lista deja lugar para que la última tarjeta no quede tapada):

- **«Cancelar»** (ghost) y el botón principal.
- El botón principal dice **«Elegí uno o más»** y está apagado sin selección; con selección, **«Agregar 1 circuito»** o **«Agregar N circuitos»**.

**El tope de 50** (`ROUTINE_CIRCUITS_MAX`). Lugares libres = 50 − los circuitos que ya tiene la rutina (lo escrito):

- No se pueden marcar más que los lugares libres. Al llegar, las tarjetas sin marcar se ven apagadas (`aria-disabled="true"`) y tocarlas no hace nada; las marcadas se siguen pudiendo desmarcar.
- Aviso, en la barra fija, encima de los botones (`role="status"`):
  - Con la selección llena: **«Con estos, la rutina llega al máximo de 50 circuitos. Para elegir otro, desmarcá alguno.»**
  - Si la rutina ya tiene 50 (sin lugares libres; solo se llega por la dirección, porque «Agregar existente» está apagado): **«Llegaste al máximo de 50 circuitos por rutina.»**

**Vacíos, carga y error:**

- Sin coincidencias: `EmptyState` con el título **«Sin coincidencias»** y **«No hay circuitos con ese filtro.»** (los mismos textos del listado de Circuitos).
- Sin ningún circuito activo: el texto de hoy, **«No hay circuitos activos. Creá uno con “Nuevo circuito”.»**, sin buscador ni chips.
- Cargando: `ListSkeleton`. Error: `ErrorState` con Reintentar, como hoy.

#### 4.2.2 La «Biblioteca de circuitos» (960 px o más)

- El editor de rutina se arma en **dos columnas:** a la izquierda el formulario y los circuitos (lo de hoy); a la derecha un panel fijo (`position: sticky`, con su propio scroll si no entra en la altura) titulado **«Biblioteca de circuitos»**, con el texto **«Sumá circuitos al final de la rutina. Uno puede ir más de una vez.»**
- El panel tiene **el mismo buscador y los mismos chips** que la pantalla de 4.2.1, con la misma lógica (sin URL), y los mismos vacíos, carga y error.
- Cada circuito activo lleva: el nombre, **«<Tipo> · N ejercicios»**, la marca **«En la rutina»** o **«En la rutina ×N»** si ya está, y un botón **«Agregar»** con `aria-label` **«Agregar <circuito>»**.
- **«Agregar»** suma el circuito **al final al instante** (`circuits.append(newRoutineCircuit(id))`), sin salir de la pantalla y sin guardar. El foco queda en el botón, la marca se actualiza y un lector de pantalla oye **«<circuito> agregado al final de la rutina»** (región `aria-live`, sin texto visible).
- Con la rutina en 50, los «Agregar» quedan apagados y el panel dice **«Llegaste al máximo de 50 circuitos por rutina.»** (además del aviso de hoy debajo de los botones).
- En una rutina dada de baja, los «Agregar» quedan apagados, como el resto del formulario.
- **«Agregar existente» no se muestra; «Nuevo circuito» sí** (ocupa el ancho de la columna).
- Al achicar la ventana por debajo de 960 px el panel desaparece y vuelve «Agregar existente», sin perder lo escrito. La pantalla de 4.2.1 no redirige si se abre en escritorio: funciona igual.

**Componentes sugeridos:** un hook o componente común para la lista filtrable (`useCircuitLibrary` o `CircuitLibraryList`: buscador, chips y la lista de activos con sus marcas), usado por `RoutineAddCircuitsPage` (4.2.1) y `RoutineCircuitLibrary` (4.2.2). El cambio de ancho se puede resolver con CSS (`@media (min-width: 960px)`) o con un `useMediaQuery`; lo importante es que en celular no quede el panel montado escondido con un buscador duplicado en el árbol de accesibilidad.

### 4.3 Tipos de circuito (TIP-02)

**Archivo:** `features/admin/pages/CircuitTypesPage.tsx`.

- **Buscador** `SearchInput` **«Buscar tipo de circuito»**, debajo del texto de introducción: por **nombre** (no por descripción), sin tildes ni mayúsculas (`matchesSearch`). Queda en la URL como `?q=…`, como en los otros listados.
- Debajo, el chip **«Incluir inactivos»** (`ChipGroup` con `aria-label` «Filtrar tipos de circuito»), **apagado de entrada**. Queda en la URL como **`?filtro=inactivos`**, igual que «Incluir inactivas» en Rutinas (`?filtro=inactivas`) y que Circuitos (`?filtro=inactivos`). Con `useSearchAndFilter('filtro', ['inactivos'])` alcanza para los dos.
- **Apagado:** solo los activos, por orden alfabético. **Prendido:** los activos y después los dados de baja, cada grupo por orden alfabético (`byAvailabilityAndName`, como hoy). Los dados de baja se ven como hoy: apagados, con «Inactivo» y el botón Reactivar.
- **Vacíos,** con el mismo criterio que Rutinas (`RoutineList`):
  - Sin ningún tipo: el vacío de hoy, «Todavía no hay tipos de circuito», «Creá el primero: sin un tipo activo no se pueden crear circuitos.» y «Crear tipo de circuito».
  - Hay tipos, todos dados de baja, el chip apagado y sin búsqueda: título **«No hay tipos activos»** y **«Todos están dados de baja. Activá “Incluir inactivos” para verlos.»**
  - La búsqueda no encuentra nada: título **«Sin coincidencias»** y, si algún tipo dado de baja coincide y el chip está apagado, **«No encontramos tipos activos con esa búsqueda. Activá “Incluir inactivos” para ver también los dados de baja.»**; si no, **«No hay tipos de circuito con esa búsqueda.»**
- **Dar de baja** un tipo con el chip apagado **lo saca de la lista**. El toast de hoy alcanza («Tipo de circuito dado de baja»). Con el chip prendido, pasa a los dados de baja, como hoy. Reactivar, con el chip prendido, lo devuelve a los activos.

### 4.4 Aclaraciones que el pedido no decía (vetables)

1. **«En la rutina» en la biblioteca:** el pedido dice «En la rutina ×N». Se usa lo mismo que en la pantalla de agregar: «En la rutina» con uno y «En la rutina ×N» desde dos.
2. **El aviso del tope** (4.2.1): los dos textos son nuevos, en la línea de «Llegaste al máximo de 50 circuitos por rutina.».
3. **El interruptor vuelve a apagarse** al volver de otra pantalla, no solo al recargar: es estado de la tarjeta.
4. **El buscador y el chip de «Agregar circuitos» no van a la URL:** la pantalla es de paso, como el modal de hoy.
5. **El anuncio para lector de pantalla** al agregar desde la biblioteca («<circuito> agregado al final de la rutina»): sin él, quien no ve no se entera de que la rutina cambió.
6. **La URL del chip de Tipos de circuito** es `?filtro=inactivos` (el «inactivos» del pedido es el valor de `filtro`, como en Rutinas y Circuitos).

Si Fran prefiere otra cosa, se cambia acá y en los planes de prueba.

### 4.5 Cómo se verifica

- Los chequeos de siempre del web: `npm run typecheck`, `npx eslint src`, `npm run build` y `npx prettier --check src`.
- **En el navegador, con DevTools › Network abierto** (filtrado por `routine`), en celular (390 px), en tablet (768 px) y en escritorio (1280 px), como admin y como entrenador:
  - [Pruebas de rutinas](../../Tests/Rutinas/Pruebas%20de%20rutinas.html): CRE-01, CIR-01, CIR-02, CIR-08 a CIR-13, COA-02, ERR-03 y ERR-04. Y, para ver que no se rompió nada: CIR-03 a CIR-07, EDT-01, EDT-03 y EDT-06.
  - [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html): TIP-02, TIP-07, TIP-09, TIP-16, TIP-18, CRE-08 (local), TUS-05, ERR-05 y ERR-07 (local). Y LST-07 y LST-08, que fijan el criterio del buscador y los chips.
- Puntos que conviene mirar a mano:
  - Que agregar (pantalla o biblioteca) **no mande ningún POST**: solo `GET /routine/circuit/{id}` de cada circuito nuevo, para sus series. El `POST /routine/edit/{id}` sale al guardar, con los nuevos sin `id` y con `order` según su lugar.
  - Que con lector de pantalla el interruptor se anuncie como interruptor, con su nombre y su estado, y las tarjetas de «Agregar circuitos» como botones presionados o no, con su número.
  - Que la barra fija no tape la última tarjeta ni el toast, y que no haya scroll horizontal a 390 px con «Ver series» prendido en un circuito de nombres largos.
- Sin tests automáticos nuevos en el repo.

### 4.6 Qué no hacer

- **No tocar el backend** ni pedir un endpoint nuevo: la sección 3 alcanza.
- **No guardar la rutina** al agregar circuitos: ni la pantalla ni la biblioteca escriben.
- **No volver a buscar por tipo** en el buscador: el tipo se elige con los chips.
- **No mantener el modal** como alternativa en ningún ancho.

### 4.7 Después

- En el `PLAN.md` del web, la T59 (o el número que tome) con referencia a este plan.
- Actualizar el Status del web (`Status/estado-implementacion-web.md` y `dashboard-estado-web.html`): CU-A-24, CU-E-16 y CU-E-17 con la T59. La copia en `PowerApp-Docs/Status/` la hace Fran.

---

## 5. Los datos

- **No se migra nada.** Las series y los tipos ya están en la base: el front solo los muestra.

---

## 6. Orden

1. **Docs: hecho** el 09/11 (CU-A-24, CU-E-16, CU-E-17, los dos planes de prueba, el prototipo y este plan).
2. **Web (T59): pendiente,** sin dependencias. Tiene que llegar a Render para cerrar los tres hallazgos.
3. **Docs:** con la T59 en Render, sacar los avisos amarillos (la constante `T59` y los `kt` y `known` que la usan) de los dos planes de prueba, y su línea en «Antes de empezar»; corregir el número si tomó otro; y volver a correr esos casos. La copia de `Status/` del web la trae Fran.
