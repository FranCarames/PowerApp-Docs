# BE-42 y T53 — Hallazgos de Pruebas de planificaciones del 31/10: las rutinas del plan por semana · Plan

> **Numeración (leer primero).** El pedido original llamaba a este cambio **BE-41** (backend) y **T52** (web). Esos números ya estaban usados cuando se escribió el plan: **BE-41** es «CU-A-17: no convertir una cuenta inactiva» (mergeada, [plan](2026-10-31-be-41-convertir-cuenta-inactiva-plan.md)) y **T52 / T52b** son tareas ya hechas de `PowerApp-Web`. Este cambio es **BE-42** (backend) y **T53** (web). Si alguien dice «la BE-41 y la T52» al hablar de las semanas con huecos, se refiere a estas dos. Los avisos amarillos del plan de pruebas ya dicen BE-42 y T53.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** En cada repo los cambios quedan **stageados** y el usuario revisa y commitea. La copia del Status en `PowerApp-Docs/Status/` queda **sin stagear** (así lo manda el `CLAUDE.md`).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación del backend es el build más **un script descartable en el scratchpad**, escrito **antes** del código y corrido en rojo. La del web es `typecheck`, `eslint src`, `build` y `prettier --check`, más el navegador.
> 3. **No se levanta el server de producción ni se instala nada** sin pedirlo.
>
> **Este plan es de diseño:** lo escribió la sesión de docs el 31/10 con el contrato cerrado por Fran. Lo leen la sesión del **backend** (sección 4) y la del **web** (sección 5). **Primero el back, después la web** (sección 6). Las decisiones de producto y su porqué están en la [spec](../specs/2026-10-31-planificacion-por-semanas-design.md).

**Fuente:** corrida del 31/10 de [Pruebas de planificaciones](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html) (el pedido la llama «tanda 5»; en el repo, el archivo con estas tres notas es [`4-pruebas-planificaciones.resultados.json`](../../Tests/Planificaciones/4-pruebas-planificaciones.resultados.json), exportado el 31/10 a las 00:18 UTC) y las decisiones de Fran del 31/10, variante C del canvas «PowerApp · Rutinas del plan por semana».
**Modelo:** sin cambios. **No cambia ninguna entidad ni el DDL**: no se toca `Db Creator`. `number_of_routines` sigue siendo la misma columna; cambia lo que significa.

**Goal:** que el entrenador arme un plan **por semanas**: que el alta muestre las semanas con sus huecos y las guarde junto con la cabecera, que pueda ordenar las rutinas de una semana y repetir una semana en otras, y que el plan no admita una duración menor a 1 semana desde la web.

---

## 1. Los hallazgos

Los tres salieron de la misma corrida. Los tres apuntan a lo mismo: el plan se piensa por semanas, y la pantalla no lo refleja.

| # | Caso del plan de pruebas | Gravedad | Lo que anotó Fran | CU | Qué se decidió |
|---|---|---|---|---|---|
| 1 | **CRE-01** · Crear una planificación | 1 · Grave | «Cuando indicás la cantidad de semanas, se deberían crear automáticamente las secciones de las semanas por debajo» (semana 1, 2, 3, cada una con su lugar) | [CU-E-09](../../Use%20Cases/entrenador/CU-E-09-crear-planificacion-sistemica.md), [CU-E-12](../../Use%20Cases/entrenador/CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) paso 2 | El alta muestra, debajo de los datos, las semanas 1 a la duración con tantos huecos como «Rutinas por semana». Se pueden llenar antes de crear y **«Crear planificación» guarda la cabecera y las rutinas juntas, todo o nada.** Al editar, la pantalla es la misma pero las rutinas se cambian al instante. Caso nuevo **CRE-05** |
| 2 | **CRE-03** · Tipo propio (y sin duración fija) | 2 · Moderado | «La sección de rutinas debería ser rutinas semanales. Cuando ingresás este valor se deberían crear esa cantidad de espacios en las secciones de semanas» | [CU-E-09](../../Use%20Cases/entrenador/CU-E-09-crear-planificacion-sistemica.md), [CU-E-10](../../Use%20Cases/entrenador/CU-E-10-editar-planificacion-sistemica.md) | `number_of_routines` pasa a significar **«rutinas por semana»** (define los huecos; no es un tope), sin cambiar el esquema. Y la **duración 0 queda fuera de alcance**: sin duración no hay semanas que armar. La web exige 1 semana o más; el backend sigue aceptando 0 y no se toca. CRE-03 pierde la parte de las 0 semanas; ADD-05 y ASG-08 se retiran y el paso del 0 de EDT-03 se reescribe |
| 3 | **ADD-02** · Varias en lote, con una repetida | 2 · Moderado | «Dentro de cada una de las semanas se debería poder editar el orden interno de las rutinas» | [CU-E-12e](../../Use%20Cases/entrenador/CU-E-12e-reordenar-rutinas-de-una-semana.md) (nuevo), [CU-E-12f](../../Use%20Cases/entrenador/CU-E-12f-repetir-una-semana-en-otras-semanas.md) (nuevo) | Cada rutina se ordena dentro de su semana con un **grabber** (arrastrar y soltar), con una alternativa por teclado: la semana entera se guarda en un POST y se renumera 1..n. De yapa, **«Repetir en las otras semanas»** copia una semana a otras. Casos nuevos **ADD-09** y **ADD-10**. También sale de «Fuera de alcance» del roadmap el «Reordenamiento masivo de `Routine_Asignation`» |

**Efecto en el plan de pruebas** (ya aplicado, ver [`Tests/Planificaciones/`](../../Tests/Planificaciones/)): CRE-01, CRE-02, CRE-03, ADD-01 a ADD-04, ADD-06, ADD-07, EDT-03, QUI-07, BAJ-03, FIL-01, ASG-09, ASG-11, ERR-03, ERR-04 y FIN-01 se ajustan; **nuevos** CRE-05, ADD-09, ADD-10 y ASG-12 («Asignar con fechas en el pasado», lo único útil de ASG-08); **retirados** ADD-05 y ASG-08 (dependían de la duración 0; sus ids no se reutilizan). Los casos que todavía no se pueden pasar llevan un aviso amarillo que dice que los arreglan la BE-42 y la T53.

**Efecto en la tanda anterior:** las fallas de CRE-01, CRE-03 y ADD-02 de esa corrida se cierran cuando estén hechas la BE-42 y la T53 y se vuelvan a correr. Los casos que no cambiaron de sentido conservan su id, así que sus resultados anteriores siguen cruzando.

---

## 2. Qué se decidió (31/10, variante C)

Resumen. El detalle y el porqué de cada punto están en la [spec](../specs/2026-10-31-planificacion-por-semanas-design.md).

1. **El alta muestra las semanas** 1..duración, cada una con tantos huecos como «Rutinas por semana». Se llenan antes de crear y se guardan **juntas con la cabecera, todo o nada** (un solo `POST /planification/create` con `weeks`).
2. **Al editar, la misma pantalla,** pero las rutinas se cambian **al instante**, como hoy (cada acción con su request). «Guardar planificación» sigue guardando sólo la cabecera.
3. **`number_of_routines` = «rutinas por semana».** Define los huecos; **no es un tope**: si una semana ya los llenó, aparece «Agregar otra rutina». Sin cambio de esquema; sólo cambia su descripción en el Swagger.
4. **Cada rutina se ordena dentro de su semana** con un grabber (arrastrar y soltar), con una alternativa por teclado. Se guarda la semana entera en un POST.
5. **«Repetir en las otras semanas»,** en cada semana que tiene rutinas: se eligen las semanas destino, con las vacías ya marcadas. En las que ya tienen rutinas, las nuevas se suman al final.
6. **En la web, la duración va de 1 semana en adelante.** El back sigue aceptando 0 y no se toca.
7. **Achicar la duración en el alta con rutinas en semanas que se van** da el mismo error que al editar.

---

## 3. Contrato

> Este es el contrato **tal cual lo fijó Fran el 31/10.** Los textos de error que ya existen en el backend se reusan **exactos** (se verificaron contra `planification.service.ts`). Lo que el pedido no decía y hubo que fijar para que dos sesiones no discrepen está aparte, en 3.5, para poder vetarlo.

### 3.1 `POST /planification/create` acepta además `weeks?: [{ week, routine_ids[] }]`

- `week`: entero de 1 a `duration`, sin semanas repetidas (400 «Una semana aparece más de una vez.»).
- `routine_ids`: de 1 a 50 por semana, en orden, con repetidos permitidos; quedan con `order` 1..n.
- Una sola transacción: si algo falla, no se crea nada.
- Errores:
  - semana fuera de la duración: 400 «La semana N supera la duración de la planificación (D semanas).»;
  - rutinas inexistentes: 404 «Algunas rutinas no fueron encontradas»;
  - rutinas dadas de baja: 400 «Estas rutinas están dadas de baja y no pueden asignarse: <nombres>.».
- Responde como hoy: 201 con el detalle, igual que `GET /planification/:id`.

```json
{
  "name": "QA Plan D", "type": "Fuerza", "duration": 3, "number_of_routines": 3,
  "weeks": [
    { "week": 1, "routine_ids": ["<P1>", "<P2>", "<P3>"] },
    { "week": 3, "routine_ids": ["<P3>"] }
  ]
}
```

### 3.2 `POST /planification/routine/repeat-week` con `{ planification_id, from_week, to_weeks[] }`

- `to_weeks`: de 1 a 50 semanas distintas, ninguna igual a `from_week`, cada una dentro de la duración.
- Copia las rutinas vigentes de `from_week`, en su orden, al final de cada semana destino, consecutivas. Todo o nada.
- Errores:
  - plan inexistente: 404 «Planificación no encontrada»;
  - plan dado de baja: 400 «La planificación está dada de baja. Reactivala antes de asignarle rutinas.»;
  - semana fuera de la duración: el 400 de 3.1;
  - `from_week` sin rutinas vigentes: 400 «La semana N no tiene rutinas para repetir.»;
  - una rutina de origen dada de baja: el 400 de dadas de baja de 3.1.
- Responde 201 con el detalle.

### 3.3 `POST /planification/routine/reorder` con `{ planification_id, week, routine_asignation_ids[] }`

- Los ids tienen que ser exactamente las vigentes de esa semana, sin faltantes, extras ni repetidos. Quedan con `order` 1..n, en una transacción.
- Errores:
  - plan inexistente o dado de baja: igual que en 3.2;
  - lista que no coincide: 400 «La lista no coincide con las rutinas vigentes de la semana N. Recargá la planificación.».
- Responde 200 con el detalle.

### 3.4 `number_of_routines` significa rutinas por semana

Cambia **sólo su descripción en Swagger,** en crear y en editar. No cambia el tipo, el mínimo (1), el nombre ni lo que valida.

**Web:** los textos de la duración son «Indicá la duración en semanas» y «Poné un número entero de semanas, de 1 en adelante», más los textos de la pantalla (sección 5.4).

### 3.5 Aclaraciones que el pedido no decía (vetables)

Las fijó la sesión de docs para que el back y la web hagan lo mismo. Si Fran no está de acuerdo con alguna, se cambia acá y en la [spec](../specs/2026-10-31-planificacion-por-semanas-design.md).

1. **Orden de las validaciones** en los tres endpoints, para que a igual pedido salga el mismo error:
   - `create`: (1) DTO; (2) semana repetida; (3) la primera semana, en el orden recibido, que supera la duración; (4) rutinas inexistentes (404); (5) rutinas dadas de baja (400); (6) se inserta todo.
   - `repeat-week`: (1) DTO; (2) plan inexistente (404); (3) plan dado de baja (400); (4) semana fuera de la duración: primero `from_week` y después `to_weeks` en el orden recibido; (5) `from_week` sin rutinas vigentes (400); (6) rutina de origen dada de baja (400); (7) se copia todo.
   - `reorder`: (1) DTO; (2) plan inexistente (404); (3) plan dado de baja (400); (4) la lista no coincide (400); (5) se renumera.
2. **Duración 0** (fuera de alcance para la web, pero el back la acepta): se usa la regla de siempre de `weekOutOfDuration`, **sin tope**. `create` con `weeks` y `duration: 0` acepta cualquier semana ≥ 1; `repeat-week` también. No se agrega ningún caso especial.
3. **`weeks` ausente o vacío** (`[]`): se crea la planificación sin rutinas, como hoy. Una entrada con `routine_ids: []` es un 400 del DTO (mínimo 1). Las semanas vacías no se mandan.
4. **Dentro de `create`,** los ids de todas las semanas se validan juntos: una sola consulta con los ids únicos, y el 404 y el 400 de baja se resuelven una vez para todo el pedido. Los nombres de las dadas de baja salen sin repetirse, entre comillas simples y separados por coma, como en `assign-bulk`.
5. **`repeat-week`:** las rutinas se copian ordenadas por `order` y luego por `created_at` (el mismo desempate que el detalle). En cada semana destino, la primera copia toma `max(order de las vigentes) + 1` (o 1 si no hay) y las demás siguen consecutivas. Las copias son vínculos nuevos: no heredan nada de los originales. Repetir dos veces la misma semana duplica las rutinas (está permitido).
6. **`reorder`:** `routine_asignation_ids` lleva al menos un id (DTO). Para una semana sin rutinas vigentes no hay nada que ordenar y cualquier lista da el 400 de «la lista no coincide». No hay tope propio de largo: la igualdad con las vigentes de la semana ya lo acota. Las rutinas quitadas de la semana **no se tocan**: conservan su `order`.
7. **Las respuestas** son siempre el detalle del plan con el formato de `buildPlanificationDetailResponse` (rutinas vigentes, ordenadas por semana, orden y `created_at`).
8. **Roles:** igual que los endpoints de rutinas del plan (`assign`, `assign-bulk`, `set-active`): entrenador y admin.

---

## 4. Backend (BE-42)

**Repo:** `D:\Power App\Backend\PowerApp-Backend`. **Esfuerzo estimado:** 6 h. **Cambia el esquema:** no.

### 4.1 Qué hace el backend

| # | Cambio | Dónde |
|---|---|---|
| 1 | `CreatePlanificationDto` suma `weeks?` (`@IsOptional`, `@IsArray`, `@ValidateNested({ each: true })`) con un DTO anidado `{ week, routine_ids }`: `week` entero ≥ 1 (`@Max(INTEGER_MAX)`), `routine_ids` array de UUID con mínimo 1 y máximo 50, con repetidos permitidos. Su `@ApiProperty` documenta las reglas de 3.1 | `power-app/src/dtos/planification/create_planification.dto.ts` (y un archivo nuevo para el DTO anidado) |
| 2 | `createPlanification` pasa a ser **transaccional con `QueryRunner`**, como `assignRoutinesToPlanification`: valida `weeks` (3.5.1), inserta la cabecera y un `RoutineAsignation` por cada rutina, con `order` 1..n por semana, y responde 201 con el detalle. Sin `weeks` se comporta como hoy | `planification.service.ts` |
| 3 | `repeatWeek(dto)` y su ruta `POST /planification/routine/repeat-week`, con su DTO (`planification_id` UUID, `from_week` entero ≥ 1, `to_weeks` array de enteros ≥ 1, de 1 a 50 elementos, distintos entre sí y distintos de `from_week`) | `planification.service.ts`, `planification.controller.ts`, DTO nuevo |
| 4 | `reorderWeek(dto)` y su ruta `POST /planification/routine/reorder`, con su DTO (`planification_id` UUID, `week` entero ≥ 1, `routine_asignation_ids` array de UUID, mínimo 1) | ídem |
| 5 | La descripción de `number_of_routines` en **crear y editar** dice «rutinas por semana» y aclara que define los huecos, que no es un tope y que el conteo real es `routine_count` | `create_planification.dto.ts`, `edit_planification.dto.ts` |
| 6 | Los `@ApiResponse` de las rutas nuevas y de `create` declaran **todos** los códigos del contrato (201/200, 400, 404, 500) con los textos exactos | `planification.controller.ts` |
| 7 | Constantes para los textos nuevos («Una semana aparece más de una vez.», «La semana N no tiene rutinas para repetir.», «La lista no coincide con las rutinas vigentes de la semana N. Recargá la planificación.») junto a los existentes; los existentes (`weekOutOfDuration`, el 404 de rutinas, el 400 de dadas de baja, el del plan dado de baja) se **reusan**, no se copian | `planification.service.ts` |
| 8 | Status del backend: entrada del 31/10, las dos operaciones nuevas, E-12e y E-12f en el inventario (el total pasa de 75 a 77) y E-09; se copia a `PowerApp-Docs/Status/` **sin stagear** | `Status/` del backend |

**Reuso:** conviene extraer del lote existente (`assignRoutinesToPlanification`) lo que comparte con `create`: buscar los ids únicos, el 404, el 400 de baja con nombres y el cálculo de `order` consecutivo. Que `create` y `assign-bulk` no puedan diverger.

**`Db Creator`:** sin cambios. No cambia ninguna entidad.

### 4.2 Cómo se verifica (sin levantar el server)

El script descartable va en el scratchpad, **se escribe antes del código y se corre en rojo.** Corre **el service real** sobre un mundo en memoria, como los de BE-27 y BE-41, con transacción que restaura el estado al hacer rollback. Qué tiene que probar:

| Endpoint | Casos |
|---|---|
| `create` | Sin `weeks`: igual que antes (201, `routines: []`). Con `weeks` válido: 201, una asignación por rutina, `order` 1..n por semana, la semana vacía no se manda, `routine_count` correcto. **Repetidos permitidos** (P2, P1, P2). **Todo o nada:** semana repetida (400 «Una semana aparece más de una vez.»), semana fuera de la duración (400 con N y D exactos), rutina inexistente (404), rutina dada de baja (400 con los nombres), y en cada una el estado idéntico antes y después (ni la planificación ni ninguna asignación). Entrada con `routine_ids` vacío o con 51 ids: 400 del DTO. Orden de validación (3.5.1): un pedido con dos errores devuelve el primero de la lista. Duración 0 con `weeks`: acepta (3.5.2) |
| `repeat-week` | Copia en el orden del origen al final de cada destino: a una semana **vacía** (posiciones 1..n) y a una que **ya tiene rutinas** (a continuación de la última vigente). El origen no cambia. Varias destino en una llamada. **Todo o nada:** destino igual al origen, destino repetida, semana fuera de la duración (origen y destino), origen sin vigentes (400 «La semana N no tiene rutinas para repetir.»), rutina de origen dada de baja (400 con nombres), plan inexistente (404), plan dado de baja (400): estado idéntico. `to_weeks` vacío o con 51: 400 del DTO. Las rutinas **quitadas** del origen no se copian; las quitadas del destino no cuentan para el «final» |
| `reorder` | Reordena y renumera 1..n; **la semana entera en una transacción**. Posiciones con huecos o repetidas quedan 1..n. Las quitadas de la semana conservan su `order`. Las otras semanas no cambian. Lista con faltante, con extra, con repetido, con un id de otra semana o de otro plan: 400 «La lista no coincide con las rutinas vigentes de la semana N. Recargá la planificación.» y estado idéntico. Plan inexistente (404) y dado de baja (400) |
| Swagger | `verify-controllers.js` (el que lee el Swagger): las dos rutas nuevas existen con sus códigos; `create` declara 201/400/404; la descripción de `number_of_routines` dice «por semana» en crear y en editar; no quedó «Rutinas que el entrenador declara para el plan» |
| **Sobre el texto** | Los textos nuevos y los reusados coinciden con los de 3.1 a 3.3 |

**Regresión:**
- Los scripts de BE-12 a BE-41 sobre el `dist` nuevo, **0 fallas**. En especial los que cubren `assign`, `assign-bulk`, `set-active` y `set-active-bulk` (comparten con `create` lo que se extrae) y `verify-controllers.js`.
- **Build:** `npm --prefix power-app run build`, sin errores.
- **`Db Creator`:** no se regenera.

**Qué NO se verifica:** el runtime contra una base (BE-35) y las pantallas (son de su repo).

**Qué le queda al usuario:** desplegar en Render. **El web empieza después de eso** (sección 6).

---

## 5. Web (T53 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de la BE-42 desplegada en Render** (para `api:fetch`). **Referencia visual:** el [prototipo](../../UI%20Front/powerapp-prototype-web.html) (`planEditor`, ya en la variante C) y el canvas «PowerApp · Rutinas del plan por semana» (C-celular, C-repetir y C-escritorio).

### 5.1 Qué hace el web

0. **El prototipo manda en lo visual y lo de interacción.** Está hecho y aprobado: `planEditor` en [`UI Front/powerapp-prototype-web.html`](../../UI%20Front/powerapp-prototype-web.html). Donde esta lista y el prototipo difieren en un detalle, se dice acá cuál vale.
1. **Contrato:** `api:fetch` desde Render y `api:gen`. Entran `weeks` en `create`, `repeat-week` y `reorder`, y la descripción nueva de `number_of_routines`.
2. **Un solo editor para el alta y la edición** (`/a/planes/nuevo`, `/a/planes/{id}`, `/c/planes/…`): los datos y debajo «Semanas del plan», en tarjetas por semana. Desde **960 px**, dos columnas: los datos a la izquierda (hasta 360 px) y las semanas a la derecha. En celular, apilado.
3. **Cada semana** muestra «Semana N», «X de K» (X = rutinas vigentes, K = rutinas por semana), sus rutinas (grabber, posición, nombre y quitar) y **los huecos vacíos** «Agregar rutina · Posición N». Si ya llenó los huecos o los superó, en vez de huecos ofrece **«Agregar otra rutina»**: K define los huecos, no es un tope. Si tiene rutinas, también ofrece **«Repetir en las otras semanas»** (no se ofrece si el plan dura una sola semana).
4. **Alta:** las semanas 1 a la duración se arman con la duración y las rutinas por semana, y se rearman en vivo sin perder lo elegido. Lo que se elige queda **en pantalla** (sin requests). **«Crear planificación»** manda **un solo** `POST /planification/create` con `weeks` (sólo las semanas con rutinas, en orden de semana, con los ids en el orden de la pantalla). Debajo del botón: «Se crea con N rutinas en M semanas.» (N = rutinas elegidas, M = semanas que tienen alguna).
5. **Edición:** las **semanas** siguen la duración **guardada** de la planificación: si el entrenador escribe otra, aparece «Cambiaste la duración a N semanas: las semanas se ajustan cuando guardes la planificación.» y las semanas cambian recién al guardar. Los **huecos** siguen, en cambio, el número escrito en «Rutinas por semana» en el momento (es sólo visual). Las rutinas se cambian **al instante,** cada acción con su request: agregar (`assign`, `assign-bulk`), quitar y reincorporar (`set-active`, `set-active-bulk`), **reordenar** (`reorder`) y **repetir** (`repeat-week`). El botón es «Guardar planificación» y guarda sólo la cabecera.
6. **Tocar un hueco** (o «Agregar otra rutina») abre el selector de rutinas de siempre, ya situado en esa semana. **En el alta** el selector no pide semana ni posición: las rutinas van al final de esa semana en el orden en que se eligen, y una semana admite hasta 50. **Al editar** conserva sus campos: «Semana» (con la de la tarjeta) y «Posición en la semana (opcional)» para una sola rutina (CU-E-12a), o varias a la vez (CU-E-12b). El botón «Agregar rutinas» de arriba desaparece: se entra por los huecos. (El prototipo simplifica el selector: una rutina por vez, sin semana ni posición. Es una maqueta; la web conserva el selector real, ver D51 de la spec.)
7. **Reordenar:** el grabber de cada rutina. **Con mouse o dedo,** se arrastra y se suelta dentro de su semana (no se puede soltar en otra). **Con teclado,** el grabber es un botón que recibe foco: ↑ y ↓ mueven la rutina de a un lugar y el foco se queda en ella. En la edición, **cada movimiento** (al soltar el arrastre, o con cada flecha) manda **un** `POST /planification/routine/reorder` con la semana entera (todos los ids vigentes, en el orden nuevo). Soltar donde estaba, o mover más allá de un extremo, no manda nada. Si el servidor responde «La lista no coincide…», la pantalla muestra ese texto y recarga la planificación. Si falla por otro motivo, vuelve al orden anterior con un aviso. En el alta, el orden se cambia en pantalla.
8. **Repetir:** «Repetir en las otras semanas» abre el panel «Repetir la semana N» (hoja desde abajo en celular, modal en escritorio) con una fila de casilla por cada **otra** semana de la duración; las **vacías** vienen marcadas. Al confirmar, en la edición sale **un** `POST /planification/routine/repeat-week`; en el alta, las rutinas se copian en pantalla al final de cada semana elegida.
9. **Duración de 1 en adelante:** el campo, el esquema de validación del formulario y los textos pasan de «0 en adelante» a «1 en adelante». Se saca la rama de «sin duración fija» (el texto «El plan no tiene duración fija: las rutinas pueden ir en cualquier semana.», la ayuda «0 si el plan no tiene duración fija», el «Sin duración fija» de la tarjeta). **Ojo:** los planes que ya existen con duración 0 (si los hay) se siguen abriendo sin romper: no tienen semanas que mostrar de antemano y se muestran las que tienen rutinas.
10. **Achicar la duración con rutinas en semanas que se van** (alta): se avisa «El plan tiene rutinas en la semana N: la duración no puede ser menor.» (N = la semana más alta con rutinas), **la duración queda como estaba** y lo elegido se conserva; para achicarla hay que quitar primero esas rutinas. Si las semanas que se van están vacías, se achica sin problema. Al editar, el error ya existe y sale al guardar (EDT-03); sólo cambia que el 0 deja de ser válido.
11. **Valores por defecto y topes.** El alta arranca con **4 semanas y 3 rutinas por semana** (así lo hace el prototipo). El prototipo topa en pantalla la duración en 52 semanas y las rutinas por semana en 10 (ajusta el número sin avisar); no son reglas del contrato —el backend admite más—, son para que la grilla sea manejable, y la T53 hace lo mismo. Cada campo tiene botones − y + (el − se apaga en 1).
12. **«Rutinas previstas» pasa a «Rutinas por semana»** en todos lados. El contador de la planificación compara contra **duración × rutinas por semana** (antes, contra `number_of_routines` a secas): la píldora de la tarjeta de la lista («N de M rutinas», con la ayuda «N rutinas asignadas de M previstas») y la del editor. Verde sólo si coinciden. (La tarjeta de la lista del prototipo dice «N semanas · K rutinas por semana · Tipo» y no tiene píldora porque la maqueta nunca la tuvo; la web conserva su píldora con el contador nuevo y la línea «N semanas · Tipo», como en FIL-01.)
13. **El plan de pruebas** ([`Tests/Planificaciones/`](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html)) es la lista de aceptación: CRE-01, CRE-02, CRE-03, CRE-05, ADD-01 a ADD-04, ADD-06, ADD-07, ADD-09, ADD-10, EDT-03, QUI-07, BAJ-03, FIL-01, ASG-09, ASG-12, ERR-03 y ERR-04.

### 5.2 Layout (de la variante C)

- **Celular (menos de 960 px):** apilado. Los datos, debajo «Semanas del plan» y al final el botón («Crear planificación» o «Guardar planificación» y «Eliminar planificación»). Al abrir la pantalla quedan **todas las semanas desplegadas**; cada una tiene un botón para plegarla («Plegar la semana N») y volver a mostrarla («Mostrar la semana N»), y plegada sigue mostrando «X de K».
- **Escritorio (960 px o más):** los datos a la izquierda y «Semanas del plan» a la derecha, las semanas en tarjetas en una grilla. El botón de crear o guardar queda en la columna de la izquierda, debajo de los datos. El pedido fija el ancho de los datos en **hasta 360 px**; el prototipo usa 340 px (diferencia menor): **vale 360 px**.
- El canvas (C-celular) muestra las semanas vacías plegadas con «0 de K · vacía»; el prototipo no lo hace y **vale el prototipo**.
- **Panel de repetir:** hoja desde abajo en celular, modal centrado en escritorio (como el resto de los modales).

### 5.3 Accesibilidad

- El grabber es un `<button>` con nombre accesible «Mover <rutina>, posición N de M» y una descripción (`aria-describedby`): «Arrastrala para cambiarle el lugar dentro de la semana, o usá las flechas arriba y abajo.» Con ↑ o ↓ la rutina se mueve, el foco se queda en su grabber y una región `aria-live="polite"` anuncia «<rutina>: posición N de M».
- Quitar: «Quitar <rutina> de la semana N». Hueco: «Agregar una rutina a la semana N». Semana llena: «Agregar otra rutina a la semana N». Repetir: el botón dice «Repetir en las otras semanas».
- Los botones − y + de la duración y de las rutinas por semana se anuncian «Disminuir duración (semanas)», «Aumentar duración (semanas)», «Disminuir rutinas por semana» y «Aumentar rutinas por semana».
- El panel de repetir es un diálogo modal con foco atrapado; las casillas están en un `fieldset` con la leyenda «Semanas donde se repite».
- Las tarjetas de semana se anuncian como grupos con su título «Semana N».

### 5.4 Textos

Los del pedido y los del [prototipo](../../UI%20Front/powerapp-prototype-web.html) van **exactos**. Los marcados con † los derivó la sesión de docs (no están en el pedido ni en el prototipo): se pueden cambiar, pero el [plan de pruebas](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html) los cita así. El prototipo da los errores de los campos con un aviso flotante; en la web siguen saliendo junto a su campo, como hoy.

| Dónde | Texto |
|---|---|
| Duración, falta | «Indicá la duración en semanas» |
| Duración, inválida (0, no entera, texto) | «Poné un número entero de semanas, de 1 en adelante» |
| Rutinas por semana, falta | «Indicá cuántas rutinas tiene cada semana» |
| Rutinas por semana, inválida | «Poné un número entero de rutinas, de 1 en adelante» |
| Campo | «Rutinas por semana» (antes «Rutinas previstas») |
| Ayuda de la duración, en el alta | «La duración va de 1 semana en adelante, y cada semana tiene los huecos que indiques.» |
| Ayuda de la duración, en la edición | «La duración va de 1 semana en adelante. Si la cambiás, se mueve el fin de las asignaciones de todos los alumnos que lo tienen.» (se saca «0 si el plan no tiene duración fija.»; ver ASG-11) |
| Edición, duración cambiada sin guardar | «Cambiaste la duración a N semanas: las semanas se ajustan cuando guardes la planificación.» |
| Sección | «Semanas del plan», con la píldora «N de M rutinas» † (M = duración × rutinas por semana) |
| Sección, en el alta | «Se arman solas con la duración y las rutinas por semana. Podés llenarlas ahora o después: lo que elijas acá se guarda al crear la planificación.» |
| Sección, en la edición | «Los cambios de esta sección se aplican al instante, sin pasar por “Guardar planificación”.» |
| Alta, botón | «Crear planificación» |
| Alta, debajo del botón | «Se crea con N rutinas en M semanas.» (con «1 rutina» y «1 semana» en singular; M = semanas con alguna rutina). Con nada elegido: «Se crea sin rutinas: las semanas se llenan después.» |
| Edición, botón | «Guardar planificación» |
| Semana | «Semana N», «X de K» (plegada o desplegada) |
| Avisos al editar | «1 rutina agregada a la semana N», «Rutina quitada del plan» (después de confirmar «Quitar rutina del plan»), «Orden de la semana N actualizado» (al soltar un arrastre; con las flechas no hay aviso, sólo el anuncio) |
| Hueco | «Agregar rutina · Posición N» |
| Semana llena | «Agregar otra rutina» |
| Repetir, botón de la semana | «Repetir en las otras semanas» |
| Repetir, título | «Repetir la semana N» |
| Repetir, texto | «<rutinas>, en ese orden. Elegí en qué semanas.» (las rutinas separadas por coma y la última con «y»: «A, B y C») |
| Repetir, fila de semana vacía | «Queda igual a la semana N.» y la pastilla «Vacía» |
| Repetir, fila de semana con rutinas | «Ya tiene X rutinas: estas se suman al final.» y la pastilla «X rutinas» (con «1 rutina» en singular) |
| Repetir, botones | «Repetir en N semanas» (con «Repetir en 1 semana» en singular; apagado: «Elegí una semana») y «Cancelar» |
| Repetir, aviso al terminar | «Semana N repetida en M semanas» (con «en 1 semana» en singular) |
| Tope del alta † | «Una semana admite hasta 50 rutinas.» |
| Reordenar, error del servidor | el texto del 400: «La lista no coincide con las rutinas vigentes de la semana N. Recargá la planificación.» |
| Achicar la duración con rutinas | «El plan tiene rutinas en la semana N: la duración no puede ser menor.» (el de hoy) |

### 5.5 Cómo se verifica

- `typecheck`, `eslint src`, `build` y `prettier --check` en verde.
- **Navegador (Chromium, 390 px y escritorio)** contra el doble local que imite la BE-42 con los textos exactos de la sección 3 (y, cuando la BE-42 esté en Render, contra el backend real): el alta con las semanas en vivo; llenar, quitar, ordenar y repetir en pantalla; el body **único** de `create` con `weeks`; la duración 0 rechazada; el error de achicar con rutinas; en un plan creado, agregar (los dos modos), quitar, reincorporar, reordenar con el mouse y con el teclado (un solo `reorder` con la semana entera), repetir a una vacía y a una con rutinas (un solo `repeat-week`), y el 400 de «La lista no coincide…» con dos pestañas.
- Los casos del plan de pruebas de la sección 5.1.12 como lista de aceptación. **Sacar los avisos amarillos** de esos casos es de Docs (sección 6).

**Qué NO se verifica:** el runtime contra la base de Render hasta que la BE-42 esté desplegada, y el comportamiento táctil real del grabber en un celular físico (se prueba con la emulación del navegador).

---

## 6. Orden

1. **Backend (BE-42)** primero: spec de este plan → script rojo → código → build → regresión → Status. Cada cosa en el repo del backend, **stageada**.
2. **El usuario despliega** el backend en Render (`main`).
3. **Web (T53)** después: `api:fetch` y `api:gen` sobre el Swagger ya desplegado, y recién ahí las pantallas. No empieza antes porque `repeat-week`, `reorder` y `weeks` no existen en el contrato hasta entonces.
4. **Docs:** al cerrar las dos, sacar los avisos amarillos (`kt` y `known`) de CRE-01, CRE-02, CRE-05, ADD-09, ADD-10, EDT-03 y FIL-01 del plan de pruebas, y volver a correr esos casos más CRE-03, ADD-02, ADD-01 a ADD-04, ADD-06, ADD-07, QUI-07, BAJ-03, ASG-09, ASG-12, ERR-03 y ERR-04. Las copias de `Status/` (backend y web) las trae el usuario.

**Lo que se decide en el camino y no está resuelto acá:** ASG-11 (si el fin de las asignaciones se mueve al cambiar la duración) sigue abierto desde antes y no es parte de este cambio.
