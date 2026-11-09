# BE-46 — Hallazgos del 09/11 de Pruebas de rutinas y de circuitos: guardar un circuito o un ejercicio nuevo da 500 · Plan

> **Numeración (leer primero).** El pedido llamaba a este cambio **BE-45**, pero la BE-45 ya está tomada: es [«Las rutinas quitadas del plan»](2026-11-09-be-45-rutinas-quitadas-del-plan-plan.md), que figura en la tabla maestra del [roadmap del backend](2026-10-16-roadmap-backend.md). El siguiente número libre es la **BE-46**: el roadmap llega a la BE-45 y ni `Doc/plans/` ni el `Status/` del backend usan uno mayor. Este cambio es la **BE-46**. Si alguien dice «la BE-45» al hablar de guardar circuitos o ejercicios nuevos, se refiere a la BE-46. Los avisos amarillos de los planes de prueba ya dicen BE-46. Si al llegar al backend el número ya está usado, se toma el siguiente libre y se corrige acá, en la fila y la sección del roadmap y en los avisos de [Pruebas de rutinas](../../Tests/Rutinas/Pruebas%20de%20rutinas.html) (constantes `BE46_RUTINA`, `BE46_ARREGLO` y `BE46`, y el aviso de CIR-08) y de [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html) (EDT-02).
>
> **Cómo se entrega.** El backend sigue el flujo de su repo, como dice su `CLAUDE.md`: build, Status y commit del usuario. No hay tests automáticos (decisión del 16/10). **Acá el build no alcanza:** el error es de runtime y solo aparece contra una base real, así que se verifica contra la base local (4.2). No se levanta el server de producción ni se instala nada sin pedirlo.
>
> **Este plan es de diseño.** Lo escribió la sesión de docs el 09/11. Lo lee la sesión del **backend** (sección 4). **Es solo del back: el web no cambia** (sección 5). Los textos entre «» van **exactos**.

**Fuente:**

- [Pruebas de rutinas](../../Tests/Rutinas/Pruebas%20de%20rutinas.html), tanda 5 (09/11): **EDT-01, CIR-03, CIR-05, CIR-06 y CIR-08**.
- [Pruebas de circuitos](../../Tests/Circuitos/Pruebas%20de%20circuitos.html), corrida del 09/11: **EDT-02**.

Las dos tandas nuevas todavía no están en el repo (entran con `/commit-test-results`). Lo que se cita de tandas anteriores sale de [`3-`](../../Tests/Rutinas/3-pruebas-rutinas.resultados.json) y [`4-pruebas-rutinas.resultados.json`](../../Tests/Rutinas/4-pruebas-rutinas.resultados.json).

**Modelo:** sin cambios. No cambia ninguna entidad ni el DDL, y no se toca `Db Creator`.
**Contrato:** sin cambios (sección 3). Los casos de uso tampoco: [CU-E-17](../../Use%20Cases/entrenador/CU-E-17-editar-rutina-sistemica.md) y [CU-E-23](../../Use%20Cases/entrenador/CU-E-23-editar-circuito.md) ya piden lo correcto («crea los nuevos», en el paso 4 de los dos). El desvío es del código del backend.

**Goal:** que guardar una rutina con un circuito que no estaba, o un circuito con un ejercicio que no estaba, responda **200** como dice la spec y no **500**, sin cambiar nada de lo que hoy anda.

---

## 1. Los hallazgos

| Caso | Qué pasa hoy | CU | Qué guarda |
|---|---|---|---|
| **Rutinas · EDT-01** · Editar una rutina | Guardar responde 500 `Error al editar la rutina.` y la pantalla muestra «El servidor tuvo un problema. Intentá de nuevo en unos minutos.». Fran lo anotó en las tandas 3 y 4 (1 · Grave): «Agregar un nuevo ejercicio a la rutina falla.» («ejercicio» es el **circuito** que agrega el caso) | CU-E-17, pasos 3 a 5 | Un circuito que no estaba en la rutina (agregado) |
| **Rutinas · CIR-03** · Ordenar y quitar | Guardar la rutina responde 500 `Error al editar la rutina.` | CU-E-17, pasos 3 a 5 | El circuito repetido de CIR-02: un vínculo nuevo del mismo circuito |
| **Rutinas · CIR-05** · Editar un circuito desde la rutina | Guardar el circuito con un ejercicio nuevo responde 500 `Error al editar el circuito.`; guardar la rutina, 500 `Error al editar la rutina.`. Fran lo anotó en las tandas 3 y 4 (2 · Moderado): «edite las series del ejercicio original y tambien agregue un nuevo ejercicio» | CU-E-23 (el circuito) y CU-E-17 (la rutina) | Un ejercicio nuevo en un circuito, y la rutina que lo usa |
| **Rutinas · CIR-06** · Duplicar desde la rutina | Guardar la rutina responde 500 `Error al editar la rutina.` | CU-E-17, pasos 3 a 5 | La copia de Duplicar: un circuito nuevo que reemplaza al original en la rutina |
| **Rutinas · CIR-08** · Agregar circuitos: varios a la vez y en orden | La pantalla «Agregar circuitos» anda; al guardar la rutina responde 500 `Error al editar la rutina.`. Tanda 4 (Re-testear): «El CU funciona bien, falla al editar la rutina. Ver CU relacionado EDT-01» | CU-E-17, pasos 3 a 5 | Tres circuitos que no estaban |
| **Circuitos · EDT-02** · Cambiar los ejercicios | Guardar el circuito responde 500 `Error al editar el circuito.` | CU-E-23, paso 4 | Un ejercicio que no estaba en el circuito |

Los seis son **solo del backend**. El body que manda la web ya cumple el contrato.

**Efecto en los planes de prueba** (ya aplicado, ver [`Tests/Rutinas/`](../../Tests/Rutinas/Pruebas%20de%20rutinas.html) y [`Tests/Circuitos/`](../../Tests/Circuitos/Pruebas%20de%20circuitos.html)). Ningún caso cambia de sentido: los ids se mantienen y los resultados cruzan.

- **Pruebas de rutinas:**
  - **EDT-01, CIR-03, CIR-05 y CIR-06** llevan `kt` «Hoy falla.» y el `known` de la constante `BE46`: «Guardar una rutina con un circuito que no estaba (agregado, repetido o la copia de Duplicar) responde 500 «Error al editar la rutina.» y la pantalla muestra «El servidor tuvo un problema. Intentá de nuevo en unos minutos.». Lo arregla la BE-46 del back; hasta que esté en Render, marcalo Falla.»
  - **CIR-05** suma que guardar el circuito con un ejercicio nuevo también da 500 («Error al editar el circuito.»).
  - **EDT-01** suma en lo esperado que `POST /routine/edit/{id}` responde 200.
  - **CIR-08** ya tenía el aviso de la T59 (la pantalla). Ahora su `known` nombra las dos tareas: la T59 de la web arregla la pantalla y la BE-46 del back, el guardado. Conserva su `kt` «Hoy no cumple el CU.».
- **Pruebas de circuitos:** **EDT-02** lleva `kt` «Hoy falla.» y el `known`: «Sumarle un ejercicio a un circuito que ya existe responde 500 «Error al editar el circuito.». Lo arregla la BE-46 del back; hasta que esté en Render, marcalo Falla.»

---

## 2. La causa

Los dos métodos de `power-app/src/routine/routine.service.ts` tienen el mismo patrón (líneas al 09/11):

| | `editRoutine` | `editCircuit` |
|---|---|---|
| Carga el padre con su lista | `findOne(Routine, …, relations: ['routineCircuits'])` (≈ línea 292) | `findOne(Circuit, …, relations: ['routineExercises'])` (≈ línea 664) |
| Inserta los hijos nuevos **aparte** | `manager.save(manager.create(RoutineCircuit, …))` (≈ línea 398) | `manager.save(manager.create(RoutineExercise, …))` (≈ línea 764) |
| Al final guarda el padre entero | `manager.save(Routine, routine)` (≈ línea 416) | `manager.save(Circuit, circuit)` (≈ línea 805) |

**Qué pasa.** En TypeORM 0.3.27, `save()` de una entidad con una relación `OneToMany` cargada compara esa lista con las filas que hay **ahora** en la base, dentro de la misma transacción. El vínculo nuevo ya está en la base (se insertó antes) pero **no está en la lista cargada** (la lista se leyó al empezar y no se actualizó). `save()` lo toma por un hijo huérfano. Como `orphanedRowAction` es `'nullify'` por defecto, intenta desvincularlo:

```sql
UPDATE "Routine_Circuit" SET "routine_id" = NULL WHERE "id" = <el vínculo nuevo>
-- error 23502: null value in column "routine_id" violates not-null constraint
```

La transacción se deshace y el `catch` responde 500 `Error al editar la rutina.`. En `editCircuit` es el mismo error sobre `Routine_Exercise.circuit_id`, y responde 500 `Error al editar el circuito.`.

**Por qué solo falla con un hijo nuevo.** Si no se inserta ninguna fila, la base y la lista cargada coinciden y `save()` no encuentra huérfanos.

| Lo que se guarda | Hoy |
|---|---|
| Renombrar, cambiar o vaciar la nota o la descripción, reordenar | 200 |
| Quitar un circuito de la rutina o un ejercicio del circuito (baja lógica o física) | 200 |
| Reactivar el que estaba dado de baja y vuelve en la lista (lleva `id`) | 200 |
| Un circuito que no estaba en la rutina (sin `id`): agregado, repetido, la copia de Duplicar, o uno que se quitó y se vuelve a agregar | **500** |
| Un ejercicio que no estaba en el circuito (no lo trae `routineExercises`) | **500** |

**Por qué el build y los scripts no lo ven.** El build compila y los scripts descartables de las tareas anteriores corren el service sobre un mundo en memoria, que no ejecuta el cálculo de relaciones de TypeORM. Este error solo aparece contra una base real: por eso 4.2 pide Postgres local y empezar en rojo.

**Alcance.** El 09/11 se revisaron los demás `relations:` de `power-app/src`: son lecturas o `ManyToOne`. Solo `editRoutine` y `editCircuit` cargan un `OneToMany`, insertan hijos aparte y guardan al padre.

---

## 3. Contrato: no cambia

| Endpoint | Respuesta | Cambia |
|---|---|---|
| `POST /routine/edit/{id}` | **200** `RoutineDetailResponseDto` | No |
| `POST /routine/circuit/edit/{id}` | **200** `CircuitDetailResponseDto` | No |

- **Los 400 y los 404 siguen igual, con los mismos textos y en el mismo orden.** Los de `editRoutine`: los dos 400 de las listas («Dos circuitos no pueden ocupar la misma posición: el campo order tiene valores repetidos.» y «Un mismo circuito de la rutina no puede venir dos veces en la lista.»), el 404 «Rutina no encontrada», el 400 de la rutina dada de baja, los dos 400 de un `id` que no es de esta rutina o apunta a otro circuito, el 404 «Algunos circuitos no fueron encontrados» y el 400 del circuito dado de baja que se quiere agregar. Los de `editCircuit`: los 400 del payload (`validateCircuitPayload`), el 404 «Circuito no encontrado», el 400 del circuito dado de baja, los del tipo de circuito (BE-44) y el 404 «Algunos ejercicios no fueron encontrados».
- **El 500 se queda** (`Error al editar la rutina.` y `Error al editar el circuito.`) para un error real, no para este caso.
- **Swagger:** no cambia. Ya declara el 200 y el 500 de las dos rutas.
- **Lo que no cambia en el comportamiento:** el `order` se persiste 1..N según la posición; un circuito quitado queda con `active = false` y `order = NULL`; un ejercicio quitado se borra o se da de baja según tenga historial; y `updated_at` de la rutina y del circuito **se mueve en cada edición**, aunque solo cambien los vínculos o las series.

### 3.1 Aclaraciones que el pedido no decía (vetables)

Las fijó la sesión de docs para que el back haga lo que se espera. Si Fran no está de acuerdo con alguna, se cambia acá.

1. **El `update()` va donde estaba el `save()`:** después de reconciliar los hijos y antes del `commit`. El orden de los pasos dentro de la transacción no cambia.
2. **`updated_at` se pasa a mano**, como hoy: una edición que solo toca los vínculos tiene que mover la fecha de la rutina.
3. **Vaciar la nota o la descripción** guarda `NULL` (`?? null`), como hoy: EDT-02 de Rutinas y EDT-03 de Circuitos.
4. **`circuit_type_id` solo se escribe si cambió** (`circuitTypeChanged`), para no escribir el mismo id con otras mayúsculas: es lo que ya dice el comentario de `editCircuit`.
5. **La respuesta no cambia:** sigue saliendo de recargar el detalle después del `commit` (`findRoutineDetail` y `findCircuitDetail`).

---

## 4. Backend (BE-46)

**Repo:** `D:\Power App\Backend\PowerApp-Backend`. **Esfuerzo estimado:** 1 h. **Cambia el esquema:** no.

### 4.1 Qué hace el backend

| # | Cambio | Dónde |
|---|---|---|
| 1 | **`editRoutine`:** la cabecera se escribe con `update()` en vez de `save(Routine, routine)`: `await queryRunner.manager.update(Routine, routine.id, { name: editRoutineDto.name, coach_note: editRoutineDto.coach_note ?? null, updated_at: new Date() });`. Se sacan las tres asignaciones previas sobre `routine` (`name`, `coach_note` y `updated_at`): ya no se guarda ese objeto y la respuesta sale de recargar el detalle | `routine.service.ts` |
| 2 | **`editCircuit`:** lo mismo con `update(Circuit, circuit.id, { name: editCircuitDto.name, description: editCircuitDto.description ?? null, updated_at: new Date(), …(circuitTypeChanged ? { circuit_type_id: editCircuitDto.circuit_type_id } : {}) })`. El `circuit_type_id` va **solo si cambió**. Se sacan las asignaciones previas sobre `circuit` | `routine.service.ts` |
| 3 | **El comentario.** En cada método, el comentario de «La cabecera se pisa entera…» se reescribe y explica por qué **no va `save()`**. Por ejemplo: «No se usa save(): la lista cargada en `relations` no trae los vínculos que se insertaron arriba, y save() los toma por huérfanos y los desvincula (UPDATE … SET routine_id = NULL → 23502). update() escribe solo la cabecera. updated_at se pasa a mano: editar solo los vínculos deja la cabecera igual y la fecha no se movería». Conserva la razón de `updated_at` y, en `editCircuit`, la de `circuit_type_id` | `routine.service.ts` |
| 4 | **Status del backend:** la entrada del día, con CU-E-17 y CU-E-23 (bug de runtime). Se copia a `PowerApp-Docs/Status/` **sin stagear**, como siempre | `Status/` del backend |

**Descartado:** `orphanedRowAction: 'disable'` en los `ManyToOne` (`Routine_Circuit.routine` y `Routine_Exercise.circuit`). También evitaría el error, pero cambia el comportamiento de **cualquier** `save()` de esas entidades, en cualquier service, hoy y mañana. El `update()` de la cabecera toca solo esos dos métodos.

**No se toca:** las entidades, los DTO, el controller ni el Swagger; `createRoutine` y `createCircuit` (no cargan relaciones); `set-active` de rutinas y circuitos; `Db Creator`.

### 4.2 Cómo se verifica

**Con el build no alcanza:** el error es de runtime. Hay que probar **contra la base local** (Postgres, con el seed de `Db Creator`), con el service real, ya sea por el server local o por un script. **Un mundo en memoria no sirve:** no ejecuta el cálculo de relaciones de `save()` y daría verde con el bug.

**Primero, en rojo.** Antes de tocar el código, reproducir el 500 con los dos primeros casos de la lista de abajo (uno en rutina, uno en circuito). Si no sale el 500, el arreglo no queda probado.

| Qué | Pedido | Resultado esperado |
|---|---|---|
| Un circuito sin `id` | `POST /routine/edit/{id}` con la lista actual más un circuito sin `id` | **200**. El body trae el circuito nuevo con su `order`. En la base, el vínculo queda con el `routine_id` de esa rutina (no `NULL`), `active = true` y el `order` pedido |
| Repetir un circuito | El mismo `circuit_id` dos veces: uno con su `id` y otro sin `id` | **200**. La rutina queda con las dos copias, con `order` 1..N |
| La copia de Duplicar | Quitar el original de la lista y agregar otro circuito sin `id` en su lugar | **200**. El original queda con `active = false` y `order = NULL`; la copia, vigente en su lugar |
| Quitar y volver a agregar | Un circuito que se quita y se manda de nuevo sin `id` | **200**: entra como vínculo nuevo, y el viejo queda apagado |
| Un ejercicio nuevo | `POST /routine/circuit/edit/{id}` con la lista actual más un `exercise_id` que el circuito no tenía, con sus series | **200**. El body trae el ejercicio con sus series, y la fila queda con el `circuit_id` del circuito (no `NULL`) |
| Sin cambios | Renombrar; vaciar la nota o la descripción (`NULL`); reordenar; quitar un circuito; quitar un ejercicio con historial (baja lógica) y sin historial (borrado); volver a mandar uno dado de baja con su `id` (se reactiva) | **200**, igual que antes del cambio |
| El tipo (CU-E-23) | Conservar el tipo (aunque esté dado de baja); cambiarlo a uno activo; cambiarlo a uno dado de baja | 200 sin escribir `circuit_type_id`; 200 con el tipo nuevo; **400** con el texto de la BE-44 |
| Los 400 y los 404 | Todos los de la sección 3, incluida la rutina o el circuito dado de baja | Los mismos textos, el mismo código y **el mismo orden** (CU-E-23, regla 1) |
| `updated_at` | Una edición que solo cambia los vínculos (rutina) o solo las series (circuito) | La fecha de la rutina y del circuito **se mueve** |

**Regresión y build:**

- Si algún script de verificación que ya exista cubre `editRoutine` o `editCircuit` con un doble en memoria, se ajusta el doble para que acepte `update()`. No hace falta tocar el service por eso.
- **Build:** `npm --prefix power-app run build`, sin errores.

**Qué NO se verifica:** el runtime contra la base de Render (BE-35) ni las pantallas, que son de su repo.

**Qué le queda al usuario:** desplegar en Render. No hay patch ni nada que correr en la base.

---

## 5. Web

**Nada.** El body que manda hoy cumple el contrato: `POST /routine/edit/{id}` lleva los circuitos con el `id` del vínculo los que ya estaban y sin él los nuevos, y `POST /routine/circuit/edit/{id}` lleva la lista completa de ejercicios. La pantalla ya traduce el 500 a «El servidor tuvo un problema. Intentá de nuevo en unos minutos.»: con la BE-46 esa pantalla deja de salir en estos casos. No hay tarea de la web.

El aviso de la T59 en CIR-08 (la pantalla «Agregar circuitos») no tiene relación con esta tarea: es otro cambio, de la web.

---

## 6. Orden

1. **Backend (BE-46), único paso de código:** los dos `update()`, el comentario, la verificación contra la base local, el build y el Status, con el flujo de su repo.
2. **El usuario despliega** el backend en Render. No hay cambio de esquema ni patch.
3. **Docs:** con la BE-46 en Render, sacar los avisos amarillos y volver a correr los casos.
   - **Pruebas de rutinas:**
     - sacar el `kt` y el `known` de EDT-01, CIR-03, CIR-05 y CIR-06;
     - en CIR-08, dejar solo la parte de la T59 (la pantalla);
     - sacar las constantes `BE46_RUTINA`, `BE46_ARREGLO` y `BE46` cuando no las use nadie.
   - **Pruebas de circuitos:** sacar el `kt` y el `known` de EDT-02.
   - Si la tarea tomó otro número, corregirlo en todos esos avisos, en este plan y en el roadmap.
   - Las copias de `Status/` del backend las trae la sesión del back, sin stagear.
