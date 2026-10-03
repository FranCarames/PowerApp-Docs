# PowerApp Backend — Estado de implementación vs. Casos de Uso

> **Corte:** 2026-09-04 · **Fuente:** `Documentation/Especificaciones de CU/especificaciones/` comparado contra `power-app/src`
> **Método:** mapeo 1:1 de los 75 CU contra los `controller` y `service` presentes en el código.

## Resumen

| Estado | CU | % | Significado |
|---|---:|---:|---|
| ✅ Implementado | 63 | 84% | Endpoint existe y su service ejecuta lógica real |
| 🟡 Parcial | 1 | 1% | Funciona a medias / resuelto dentro de otro endpoint |
| 🔵 Andamiaje | 4 | 5% | Ruta declarada pero service vacío y llamada comentada |
| ⬜ No implementado | 7 | 9% | Sin endpoint, service ni módulo |
| **Total** | **75** | | |

**64 de 75 CU con código implementado o parcial (~85%).** Los otros 11 son trabajo pendiente (andamiaje + no implementado).
> **Nota (19/8):** la DB está **al día** con el modelo. El ajuste de circuitos se aplicó sobre la instancia existente con un delta puntual, sin recrearla, así que todos los endpoints se pueden probar en runtime.

### Cobertura por rol

| Rol | CU | ✅ | 🟡 | 🔵 | ⬜ | % implementado |
|---|---:|---:|---:|---:|---:|---:|
| Usuario | 20 | 14 | 1 | 2 | 3 | 70% |
| Entrenador | 32 | 26 | 0 | 2 | 4 | 81% |
| Admin | 23 | 23 | 0 | 0 | 0 | 100% |

> **Nota (4/9):** `CU-E-12` es un CU **agrupador** y no se cuenta a sí mismo; cuentan sus cuatro operaciones anidadas (`CU-E-12a` a `CU-E-12d`). Por eso el total pasó de 72 a **75** sin que haya funcionalidad nueva respecto del corte anterior.

## Cambios recientes (2026-09-04 · asignar rutinas a planificaciones)

- **CU-E-12 se reestructura y se cierra** 🔵 → ✅. Pasa de ser un CU con una sola operación a un **CU agrupador con cuatro operaciones anidadas** (`CU-E-12a` a `CU-E-12d`), una por endpoint. El agrupador concentra las reglas comunes —el `order` como etiqueta, la repetición permitida, la baja siempre lógica, el todo-o-nada de los lotes— y cada anidado documenta lo suyo. **El total del proyecto pasa de 72 a 75 CU**: el agrupador no se cuenta a sí mismo y sus cuatro hijos sí. Los endpoints: `POST /planification/routine/assign` (con `order` opcional), `POST /planification/routine/assign-bulk`, `POST /planification/routine/set-active/:id` —que **reemplaza al `DELETE /planification/routine/:id`** del andamiaje— y `POST /planification/routine/set-active-bulk`. Con esto el `routines` y el `routine_count` del ABM, que devolvían `[]` y `0` desde el 31/8, **se pueden llenar por fin**.
- **Se eliminó `Routine.routine_plan_id`**, cerrando la deuda anotada el 29/8. La columna era una FK directa de `Routine` a `Planification` que **nunca estuvo en el diagrama de `Doc/`** —ni en la versión anterior del modelo—: existía sólo en la entidad y en `ddl.py`, nadie la leía ni la escribía, y todas las filas la tenían en `NULL`. La relación rutina↔planificación queda con **un solo camino**, `Routine_Asignation`, que es además el único que soporta el `order` y la repetición. Se fue con ella su FK diferida y el `@OneToMany routines` de `Planification`.
- **`Routine_Asignation.routine_plan_id` pasó a llamarse `planification_id`** y **`order` pasó a ser nullable**, los dos siguiendo el modelo actualizado. El `order` nullable ya estaba en el `Doc/` committeado: era una desincronización preexistente que pasó desapercibida porque la tabla siempre estuvo vacía.
- **`order` es una etiqueta de orden, no una secuencia.** A diferencia de `Routine_Circuit` y `Routine_Exercise` —que E-16 y E-23 normalizan a 1..N— acá puede tener **huecos** (la baja pone `order = null` y no renumera el resto) y **duplicados** (el alta con `order` explícito lo persiste tal cual, sin desplazar a nadie). Es una decisión deliberada para no tocar N registros en cada alta y en cada baja.
- **Consecuencia obligatoria: el desempate.** Con `order` duplicado el orden de lectura deja de ser determinístico, así que `/all-plus` y el detalle ordenan por **`order ASC, created_at ASC`**: a igual posición, primero la que se asignó antes. Sin esto la pantalla del entrenador se reordena sola entre refrescos.
- **Reactivar acepta el `order` por body.** Como la baja borra la posición, `set-active` con `active = true` recibe un `order` opcional: si viene se usa, si no la asignación vuelve al final. Mandarlo con `active = false` es un `400`.
- **Una rutina puede repetirse en la misma planificación**, mismo criterio que `Routine_Circuit`: un "Día A" puede aparecer dos veces en la semana y la posición las distingue. Sin `UNIQUE` en la base. Esto dejó sin efecto el camino alternativo "vínculo duplicado → no duplica" que tenía el CU original.
- **Los dos endpoints de alta devuelven el detalle del plan** (el `planification_id` viene en el body, así que siempre se sabe cuál es); **los dos `set-active` devuelven la o las asignaciones**, porque el lote puede cruzar planificaciones y no hay un plan único que devolver.

## Cambios recientes (2026-08-31 · baja lógica en las asignaciones)

- **Tres columnas `active` nuevas**, en `Routine_Asignation`, `User_Planification` y `User_Routine`. El modelo de `Doc/` se actualizó primero y el código lo siguió. Con esto el proyecto pasa de **9 a 12 tablas con baja lógica** y queda cerrada la última cadena de borrado físico que destruía historial.
- **El motivo son las cascadas que ya existían:** `Planification` → `Routine_Asignation` → `User_Routine` → `Routine_Exercise_Finished`, todas con `ON DELETE CASCADE`. Un `DELETE` de **una sola** `Routine_Asignation` —quitarle una rutina a una planificación— se llevaba puestas todas las `User_Routine` derivadas y con ellas **lo que los alumnos efectivamente entrenaron**. Es el mismo agujero que se tapó el 22/8 un nivel más arriba con `Routine` y `Planification`.
- **Los tres `active` se llaman igual pero los dispara algo distinto**, y esto es lo que E-12, E-13 y E-14 tienen que implementar:

| Campo | Qué significa `false` | Quién lo dispara |
|---|---|---|
| `Routine_Asignation.active` | La rutina ya no forma parte de la planificación **sistémica** | El entrenador, al sacar una rutina del plan (paquete de CU-E-12) |
| `User_Planification.active` | El alumno **terminó** ese plan (o el entrenador se lo quitó) | CU-E-14, o la finalización del plan |
| `User_Routine.active` | Esa instancia de rutina ya no pertenece al plan vigente, pero **el registro de que existió y lo que el alumno completó se conserva** | **En bloque:** cuando su `User_Planification` pasa a inactiva, todas sus rutinas se apagan con ella |

- **Se sumaron los filtros al ABM de planificaciones** cerrado el mismo día: las tres lecturas de `planification.service.ts` (el conteo del listado, el join de `/all-plus` y el builder del detalle) ahora descartan los vínculos dados de baja, así que `routine_count` y `routines` son de rutinas vigentes. Hoy no cambia ninguna respuesta —las tablas están vacías— pero evita que el código quede contradiciendo al modelo cuando E-12 escriba la primera fila.
- **Sin índices sobre `active` en estas tres.** En el proyecto sólo los tienen `Coach`, `Planification`, `Circuit` y `Routine`, que se listan filtrando por estado; las tablas de vínculo análogas (`Routine_Circuit`, `Routine_Exercise`) no lo tienen, y acá siempre se consulta por el id del padre junto con `active`.
- **`Routine_Asignation_User` quedó afuera** a propósito: también cuelga de `Routine_Asignation` con CASCADE, pero es post-MVP y arrastra la limpieza pendiente del 27/8. Se decide con E-19 y E-20.
- **CU-E-14 reescrita** como baja lógica en cascada (título "(Lógico)", postcondición que preserva el historial y camino alternativo nuevo), y **CU-E-12 ajustada** con la baja del vínculo en "Fuera de alcance". **Ningún CU cambia de estado y los conteos no se mueven.**
- **Anotado para E-12:** el andamiaje tiene un `DELETE /planification/routine/:id` para quitar una rutina del plan que **no corresponde a ningún CU de los 72**. Con este cambio debería pasar a `set-active`; hay que decidir si se documenta como CU nuevo.

## Cambios recientes (2026-08-31 · ABM de planificaciones sistémicas)

- **CU-E-08 a CU-E-11** 🔵 → ✅: el service de planificaciones pasó de 4 líneas vacías a seis endpoints. `GET /planification/all` (con `keyword`, `type` e `include_inactive`, más `routine_count`), `GET /planification/all-plus`, `GET /planification/:id`, `POST /planification/create`, `POST /planification/edit/:id` y `POST /planification/set-active/:id`, que **reemplaza al `DELETE /:id`** del andamiaje. El bloque **no tocó el esquema**: `Db Creator` se regeneró y quedó byte por byte idéntico.
- **`number_of_routines` es declarativo y el conteo real va aparte.** El campo es la *intención* del plan —lo que el entrenador declara al crearlo— y los listados y el detalle devuelven además un **`routine_count`** derivado de las `Routine_Asignation` efectivamente cargadas. Los dos pueden diferir a propósito: `number_of_routines: 4` con `routine_count: 2` es un plan a medio armar, y esa es información útil para el front. Hacerlo derivado puro habría obligado a que E-12 y E-14 lo recalcularan en cada asignación, con riesgo de desincronizarse.
- **`name` es obligatorio en el DTO, no en la columna.** El modelo de `Doc/` lo tiene nullable y **no se tocó**; la exigencia vive en la validación. Como consecuencia el listado ordena por `name ASC NULLS LAST`, para que las filas sin nombre no encabecen.
- **En la edición, un campo opcional omitido borra el valor** (mismo contrato que `EditRoutineDto` con `coach_note`: el body es el estado completo de la cabecera). Para que TypeORM pueda persistir el `null`, `description`, `type` y `duration` de `planification.entity.ts` pasaron a `string | null` con el `type` explícito en el `@Column`. **Es un cambio de tipos de TypeScript, no de esquema:** el DDL generado es idéntico y no hubo nada que migrar.
- **`routines` viene vacío hasta CU-E-12.** No existe todavía ningún endpoint que cree una `Routine_Asignation`, así que el detalle y `/all-plus` devuelven `[]` y `routine_count: 0`. Es la misma situación en la que se construyó `/routine/:id` antes de que existiera E-16.
- **Deuda anotada, no resuelta:** `Routine.routine_plan_id` (FK directa) y `Routine_Asignation` (tabla de vínculo) son **dos formas de decir lo mismo**. Este bloque no las necesita; la elección le toca a **E-12**, que tiene mandato explícito de la spec de usar `Routine_Asignation`.

## Cambios recientes (2026-08-27 · editar rutina y baja lógica)

- **CU-E-17 (editar rutina sistémica)** ✅: `POST /routine/edit/:id` recibe la cabecera más la **lista completa de circuitos** y reconcilia en **una sola transacción**, respondiendo `200` con el árbol entero en el mismo formato del detalle. **La reconciliación va por `Routine_Circuit.id`, no por `circuit_id`** — es la consecuencia que quedó anotada el 22/8: como un mismo circuito **puede repetirse en la rutina a propósito** (entrada en calor al principio, movilidad del mismo bloque al final), `circuit_id` no identifica nada. Por eso el body suma un **`id` opcional por ítem**: con `id` el vínculo sobrevive, sin `id` es nuevo, y lo que el server tenía y no vuelve en la lista sale. Es justo el `id` que `/routine/all-plus` y `/routine/:id` ya devolvían.
- **CU-E-18 (eliminar rutina sistémica, lógico)** ✅: `POST /routine/set-active/:id`, espejo exacto del de circuitos — el mismo endpoint da de baja y reactiva, por eso es `POST` con body y no `DELETE`. **Reemplaza al andamiaje `DELETE /routine/:id`**, que quedó obsoleto el 22/8 cuando `Routine` pasó a baja lógica. La baja **no cascadea nada**: la rutina sale de circulación para ensamblados y asignaciones **nuevos**, pero lo ya asignado mantiene su integridad y el alumno lo sigue viendo (misma regla que fijó E-24 para circuitos). El camino alternativo "rutina en uso" del CU es informativo: el front avisa, el back no bloquea.
- **Cambio de modelo: `Routine_Circuit` gana `active` y su `order` pasa a nullable.** Sacar un circuito de la rutina lo **apaga** (`active = false`, `order = null`) en vez de borrarlo. **Acá la baja lógica no está para proteger historial** — ninguna FK apunta a `Routine_Circuit` (el historial cuelga de `User_Routine` y de `Routine_Exercise`), así que un `DELETE` habría sido seguro. Está para conservar la **traza de qué circuitos integraron la rutina y hasta cuándo**, que es lo que el alumno efectivamente ejecutó.
- **Por qué `order = null` en los apagados.** El `order` se normaliza a `1..N` en cada escritura (regla de E-16: el valor recibido es una instrucción de ordenamiento, no lo que se guarda). Si el vínculo apagado conservara su número viejo, la columna significaría dos cosas a la vez y habría filas repitiendo posiciones que ya ocupa otro circuito. **Es una diferencia deliberada con `Routine_Exercise`**, donde los inactivos conservan su `exercise_order`: ahí es inocuo porque `exercise_id` es único dentro del circuito, pero acá, con repeticiones permitidas, el número stale confunde. **Costo asumido:** el vínculo apagado pierde su posición, así que si mañana la vista del alumno lo muestra va a ir al final. Si esa posición llegara a importar, la salida es una columna aparte (`last_order`) y no reciclar `order`.
- **Un circuito dado de baja se puede conservar, pero no agregar.** E-16 rechaza cualquier circuito inactivo al crear, y esa regla se mantiene para lo que se **agrega** (`400` con el nombre). Pero aplicarla también a lo que **ya estaba** trabaría la edición de todas las rutinas que contienen un circuito dado de baja: el entrenador que sólo quería corregirle el nombre a la rutina se comería un `400` y tendría que reactivar el circuito o sacarlo, que es justo lo que no quería hacer. La distinción sale gratis porque **la presencia del `id` ya dice cuál de los dos casos es**.
- **Acá no hay baja física, a diferencia de E-23.** En circuitos la eliminación tiene dos caminos (físico si nadie completó el ejercicio, lógico si hay historial) porque un circuito se retoca decenas de veces mientras se arma y la baja lógica siempre habría dejado una fila muerta por cada tanteo. En rutinas se eligió **baja lógica única**: una rutina son 3 a 6 circuitos y no hay una tabla de "hecho" que consultar para decidir el camino, así que el doble camino compraría poco y costaría una query y una rama. El costo —armar una rutina a los tumbos deja vínculos apagados— se acepta.
- **Un circuito que se saca y se vuelve a agregar entra como vínculo NUEVO**, al revés que en `editCircuit`, donde el ejercicio se **reactiva**. Allá hace falta porque `exercise_id` es clave natural y tiene que seguir habiendo una sola fila por par; acá "el circuito volvió" no es una pregunta que se pueda responder, y las dos filas cuentan cosas distintas: una, que ese circuito estuvo en la rutina hasta tal fecha; la otra, que volvió a entrar después. Un `id` que apunte a un vínculo ya apagado igual se reactiva — no debería llegar nunca porque las lecturas no los devuelven, pero así la operación queda idempotente.
- **Las tres lecturas filtran los vínculos apagados** — `buildRoutineDetailResponse` (que cubre `GET /routine/:id` y las respuestas del alta y de la edición), el join de `/routine/all-plus` y el conteo SQL de `/routine/all`. El filtro es un **parámetro del helper**, igual que un nivel más abajo en `buildCircuitDetailResponse`, porque **hay un agujero real para la vista del alumno**: si el entrenador saca un circuito entero después de que el alumno lo hizo, los ejercicios que el alumno tildó le desaparecen del historial aunque sus filas de `Routine_Exercise_Finished` sigan ahí. **Contrato para U-08/U-09 y E-06/E-07:** el alumno ve un vínculo apagado si y sólo si completó algún ejercicio suyo en esa instancia de rutina; el set se arma yendo de `Routine_Exercise_Finished` → `routine_exercise_id` → `circuit_id` → el vínculo inactivo. La consulta se escribe con esos CU, que son los que la necesitan.
- **CU-E-19 y CU-E-20 pasan a post-MVP (decisión del usuario, 27/8), y E-19 baja de 🔵 a ⬜**: se le sacó el andamiaje que tenía en `planification.controller.ts`. **Hoy E-19 no es difícil, es imposible:** `Routine_Asignation_User.routine_asignation_id` es NOT NULL y apunta a `Routine_Asignation`, que a su vez exige un `routine_plan_id`, o sea que no se puede asignar una rutina a un alumno sin inventarle una planificación — exactamente lo contrario de lo que pide el CU ("sin planificación"). **Contrato acordado para cuando se retomen:** primero limpiar la tabla (borrar `routine_asignation_id` y `order`, dejándola igual al diagrama de `Doc/`) y agregar `UNIQUE (routine_id, user_id)` para cubrir en la base el "ya asignada → no duplica" del CU; los endpoints van en **`routine/`** y no en `planification/`, porque son del paquete "Administrar Rutinas": `POST /routine/assign-user`, `DELETE /routine/assign-user/:id` y `GET /routine/assigned/:userId` (el GET es de dónde el entrenador saca el id del vínculo para E-20).
- **Base de datos:** `ddl.py` + `01_estructura.sql` regenerado; **`02` y `03` sin cambios** — ningún generador de datos inserta en `Routine_Circuit` (verificado con grep sobre los cuatro `.py`). Se dejó `Db Creator/patches/2026-08-27-cu-e-17.sql` para llevar una instancia ya creada al esquema nuevo sin recrearla: agrega la columna y saca el `NOT NULL`, sin migrar datos (las filas existentes quedan `active = true` por el `DEFAULT` y conservan su `order`, que es lo que corresponde).
- **⚠️ Esquema aplicado, endpoints sin verificar en runtime.** La base viva **ya tiene el esquema nuevo**: el 29/8 se chequeó contra `information_schema` y las **diez** comprobaciones de modelo desde el 19/8 dan OK (incluidas `Routine_Circuit.active` y `order` nullable), así que el patch está aplicado y no hay migración pendiente. Lo que sigue sin ejecutarse es **el código**: ningún endpoint de E-17/E-18 se llamó todavía, la verificación llegó hasta la compilación. Quedan sin probar: la baja de un vínculo (`active = false` + `order = null`), el reordenamiento, el agregado, el caso del **circuito repetido** (dos vínculos al mismo `circuit_id`, sacar sólo uno y ver que se apaga exactamente ese), conservar un circuito inactivo vs. agregarlo, `set-active` en los dos sentidos, y los casos de error (404/400 de rutina inexistente, rutina inactiva, lista vacía, `order` repetido, `id` repetido, `id` ajeno a la rutina, `id` con `circuit_id` que no coincide).
- **Diagrama de `Doc/` actualizado por el usuario y validado (27/8).** `Routine_Circuit` quedó con `order Integer` (sin NOT NULL) y `active Boolean NOT NULL`, exactamente igual que el DDL y la entidad. Se compararon las **20 tablas** del `.svg` contra `01_estructura.sql` —columnas, nullability y tipos— y coinciden, salvo lo que ya se sabe que difiere a propósito: `Routine.routine_plan_id` y las dos columnas de más de `Routine_Asignation_User` (que el diagrama no tiene, y tiene razón — hallazgos 3 y post-MVP de E-19), y `User.role` / `User.profile_picture` (desalineaciones del dibujo, no del código).
- **De paso se limpiaron tres defectos del diagrama** que la validación destapó, en una segunda pasada del mismo día: `Routine_Exercise` figuraba con `updated_at` **dos veces** y sin `created_at` —el typo marcado el 25/8, que seguía abierto— y tres celdas tenían el tipo sin completar, con el placeholder literal *"Type"*, en `Membership_Payment.expired_at`, `Routine_Exercise_Finished.created_at` y `.updated_at`. Los cuatro quedaron corregidos y revalidados.
- **⚠️ Divergencia real que queda abierta: `User_Planification.number_of_routines`.** El diagrama lo marca **NOT NULL** y el DDL y la entidad lo tienen **nullable** — es la única de todo el modelo. Ojo que `Planification.number_of_routines` **sí** es NOT NULL en los dos lados, así que la inconsistencia está sólo en la tabla de asignación. Como el diagrama manda, hay que alinear el código; **se difiere al 4/9 a propósito**, junto con E-13, que es el CU que escribe esa fila y el que va a decir si el dato es realmente obligatorio al asignar.
- Spec: `Doc/specs/2026-08-27-editar-rutina-y-baja-logica-design.md` · plan: `Doc/plans/2026-08-27-editar-rutina-y-baja-logica-plan.md`.

## Cambios recientes (2026-08-25 · editar circuito)

- **CU-E-23 (editar circuito)** ✅: `POST /routine/circuit/edit/:id` recibe el mismo body que el alta —cabecera más la lista completa de ejercicios— y reconcilia en **una sola transacción**. **La reconciliación va por `exercise_id`**, que es clave natural dentro del circuito desde E-22, así que el body no lleva ids de `Routine_Exercise` ni de `Exercise_Set`: el front manda la lista tal como quedó en pantalla y el server hace el diff. Con esto el bloque de circuitos queda **cerrado, 4 de 4**.
- **Eliminar tiene dos caminos, y es lo que destrabó el CU.** Si nadie completó el ejercicio se borra físico (las series se van por cascade); si hay filas en `Routine_Exercise_Finished` se apaga con `active = false` y el historial del alumno queda intacto. Quién tiene historial se resuelve con **una sola query** sobre los candidatos a salir, no una por ejercicio. La alternativa —baja lógica siempre— se descartó porque un circuito se edita muchas veces mientras se arma, casi siempre antes de que exista un alumno que lo haya hecho, y cada tanteo dejaría filas muertas para siempre.
- **Un ejercicio dado de baja que vuelve a la lista se reactiva, no se duplica.** El diff busca el `exercise_id` entre **todas** las filas del circuito y no sólo entre las activas, así queda una sola fila por (circuito, ejercicio), `exercise_id` sigue siendo clave natural de verdad y el historial viejo vuelve a colgar del ejercicio que efectivamente es.
- **Las series se reemplazan enteras**, también en los ejercicios que sobreviven: después de repuntar el "hecho" a `Routine_Exercise`, nada referencia a `Exercise_Set`, así que no hay nada que preservar y no hace falta reconciliar serie por serie ni conservar sus ids.
- **Cambio de modelo:** `Routine_Exercise` gana `active` (baja lógica, mismo patrón que `Circuit`/`Routine`/`Planification`) y **`Routine_Exercise_Set_Finished` pasa a `Routine_Exercise_Finished`**, colgando del ejercicio en vez de la serie. Su FK a `Routine_Exercise` queda en **`ON DELETE RESTRICT`** —la única del esquema que no es `CASCADE`, a propósito—: la baja física sólo ocurre cuando no hay historial, así que si esa FK llega a frenar un delete es un bug de la reconciliación, y es preferible el error de la base antes que perder historial en silencio. `Exercise_Set` no se tocó: no lleva `active`.
- **Las lecturas del entrenador filtran los inactivos** — `buildCircuitDetailResponse` (que cubre el detalle de circuito, el de rutina y las respuestas de los dos altas), el join de `circuit/all-plus` y el conteo SQL de `circuit/all`. El filtro es un **parámetro del helper**, no algo hardcodeado: la vista del alumno va a pasarle los ejercicios que ese `User_Routine` completó, porque **el alumno sí tiene que ver un inactivo que él hizo** — y sólo ése. Un inactivo que nunca hizo queda oculto: lo sacó el entrenador y no forma parte de su entrenamiento. Eso deja fijado el contrato de U-08/U-09/U-10 y del historial E-06/E-07.
- **Impacto en CU-U-12:** sigue ⬜, pero cambia de semántica — pasa de "marcar el bloque de series" a "marcar el ejercicio completo", y el registro que va a crear es `Routine_Exercise_Finished`.
- **Refactor:** `validateCircuitSetRules` pasa a `validateCircuitPayload` y absorbe el chequeo de `exercise_id` duplicado que estaba inline en `createCircuit`, así el alta y la edición validan por la misma puerta. `EditCircuitDto extends CreateCircuitDto`.
- **Base de datos:** además de `ddl.py` + `01_estructura.sql` regenerado, se dejó `Db Creator/patches/2026-08-25-cu-e-23.sql` para llevar una instancia ya creada al esquema nuevo sin recrearla (agrega la columna y reemplaza la tabla; no migra datos porque no había). El patch **ya está aplicado** sobre la base viva.
- **⚠️ Verificación en runtime a medias (25/8) — la rama de `active` no se ejecutó nunca.** Probado y OK: **baja física** (sacar un ejercicio que nadie completó no deja fila), **reemplazo de series**, **re-agregado** de un ejercicio y **guards** (401/403). **Sin probar:** todo lo que depende de que exista una fila en `Routine_Exercise_Finished` — que la baja sea **lógica** en vez de física, que el historial sobreviva, que el inactivo desaparezca de las tres lecturas del entrenador, y la **reactivación real** de una fila con `active = false`. Ojo con esto último: el "re-agregado" que se probó entró por la rama del `INSERT`, porque el ejercicio se había borrado físico y nunca hubo una fila inactiva que reactivar. También quedan sin probar los **casos de error** (404/400 de circuito inexistente, inactivo, lista vacía, `exercise_id` repetido, reglas de series).
  - **Por qué se frenó ahí:** marcar un ejercicio como hecho exige un `User_Routine`, y el seed no genera ninguno (`dynamic_data.py` llega hasta `User_RM`). Hay que crear a mano la cadena `Planification` → `Routine_Asignation` → `User_Routine`; es un solo `WITH`, y está en el plan junto con los seis escenarios.
- Spec: `Doc/specs/2026-08-25-editar-circuito-design.md` · plan: `Doc/plans/2026-08-25-editar-circuito-plan.md`.

## Cambios recientes (2026-08-22 · crear rutina)

- **CU-E-16 (crear rutina sistémica)** ✅: `POST /routine/create` da de alta la cabecera y sus `Routine_Circuit` en **una sola transacción** (`QueryRunner`), mismo patrón que E-22 un nivel más abajo. Responde `201` con el árbol completo, el mismo formato que `GET /routine/:id`, porque después de crear el front navega a la pantalla de la rutina y así se ahorra la segunda llamada. La rutina nace `active = true`; para desactivar está E-18.
- **El `order` viaja en el body y el server lo normaliza — acá E-16 se aparta de E-22 a propósito.** En circuitos, `exercise_order` y `set_order` los deriva el server de la posición en el array; en rutinas el `order` es un campo explícito porque el front maneja el reordenamiento como dato propio. A cambio, el server se protege de lo que eso habilita: **`order` duplicado → `400`** (dos circuitos no pueden ocupar la misma posición), mientras que huecos o valores espaciados (`10, 20, 30`) se aceptan. **El valor recibido es una instrucción de ordenamiento, no lo que se guarda:** se ordena ASC y se persiste la posición resultante, así la base siempre queda `1..N` sin huecos. Por eso el `201` devuelve el `order` ya renumerado.
- **Un mismo circuito PUEDE repetirse en la rutina, y el alta no valida nada al respecto.** `Routine_Circuit` no tiene unique sobre el par (decisión explícita del ajuste de modelo del 19/8) y el caso de uso es real: entrada en calor al principio y movilidad del mismo bloque al final. **Es al revés que en circuitos**, donde `exercise_id` sí es único. **Consecuencia para CU-E-17:** como `circuit_id` no es clave natural, la reconciliación **no puede** usar el patrón de `editExercise`; va por el **`Routine_Circuit.id`**, que es justo el que `/routine/all-plus` y `/routine/:id` ya exponen. La lista completa que reciba E-17 trae los ids de los vínculos que sobreviven, y los que no vengan se borran.
- **Un circuito dado de baja no se puede ensamblar** (precondición de E-16 y postcondición de E-24). Se distinguen dos errores porque son dos problemas distintos: **`404`** si el `circuit_id` no está en la base, y **`400` con el nombre del circuito en el mensaje** si existe pero está inactivo — un `404` ahí sería mentira y mandaría al front a buscar un bug de ids inexistente, cuando en realidad alcanza con reactivarlo por `set-active`. No contradice que los listados devuelvan el `active` de cada circuito: eso es para ver las rutinas **viejas** que referencian una pieza de baja; la restricción aplica sólo al alta.
- **El alta no acepta ningún campo de planificación.** El alcance de E-16 es "alta de Routine y de sus Routine_Circuit", y vincular a una planificación es exclusivamente CU-E-12. **Hallazgo nuevo:** `Routine.routine_plan_id` es una **columna obsoleta** — el vínculo rutina ↔ planificación lo modela `Routine_Asignation` (`routine_id` + `routine_plan_id` + `order`), que es lo que la spec de E-12 nombra explícitamente. La FK directa de `Routine` es un segundo camino que ningún CU usa. Queda nullable por ahora; sacarla conviene hacerlo con el bloque de planificaciones (ver hallazgo 8).
- **Cambio de modelo: `Routine.name` pasa de `varchar(20)` a `varchar(50)`.** Con 20 no entraba un nombre real — *"Día A - Pecho y tríceps"* son 23 caracteres. Se alinea con `Planification.name`, que es el nivel de arriba del árbol. **Se hizo ahora y no después** por el mismo argumento que se usó para meter `active`: la tabla está vacía, así que el `ALTER` es instantáneo y sin backfill. `Db Creator`: `ddl.py` + `01_estructura.sql` regenerado; **`02` y `03` sin cambios** — no hay ningún INSERT a `Routine` en el seed. El `ALTER` sobre la base viva y el diagrama de Miro los aplica el usuario. **Ningún CU cambia de estado por esto.**
- **Refactor (espejo del de E-22):** el armado del detalle de rutina salió de `getRoutineById` a dos helpers privados (`findRoutineDetail` + `buildRoutineDetailResponse`) que comparten el alta y el detalle. `buildRoutineDetailResponse` sigue delegando cada circuito a `buildCircuitDetailResponse`, que no se tocó.
- **Guarda en el rollback:** la recarga del detalle pasa **después** del commit, así que el `catch` sólo hace `rollbackTransaction()` si `queryRunner.isTransactionActive`. Sin eso, una falla en la recarga disparaba un rollback sobre una transacción ya cerrada, que tira un error nuevo dentro del `catch` y —como el controller no espera la promesa— deja la request colgada en vez de devolver `500`. ~~**`createCircuit` tiene el mismo agujero y conviene portarle la guarda** cuando se retome E-23.~~ **Portada el 25/8**, junto con E-23; `editCircuit` nace con la guarda puesta.
- **Esto destraba la verificación pendiente de la lectura:** ahora sí se puede crear una rutina y validar en runtime el **orden anidado de tres niveles** (`order` → `exercise_order` → `set_order`) que quedó sin probar el 22/8.
- Spec: `Doc/specs/2026-08-22-crear-rutina-design.md` · plan: `Doc/plans/2026-08-22-crear-rutina-plan.md`.

## Cambios recientes (2026-08-22 · lectura de rutinas)

- **CU-E-15 (obtener rutinas sistémicas)** ✅: `GET /routine/all` con dos filtros opcionales — `keyword` (parcial, sin distinguir mayúsculas, sobre `name` y `coach_note`) e `include_inactive` (por defecto `false`, sólo activas). Array ordenado por nombre con `circuit_count`. No hay filtro por `type`: a diferencia de `Circuit`, `Routine` no tiene ese campo.
- **`GET /routine/all-plus`** — no es un CU: el mismo listado con los circuitos de cada rutina (`id` del `Routine_Circuit`, `order`, y del circuito sólo `id`, `name`, `type` y `active`). Se incluye el `active` del circuito **a propósito**: una rutina puede referenciar un circuito dado de baja y el entrenador necesita verlo.
- **`GET /routine/:id`** — tampoco es un CU: el árbol completo, rutina → circuitos → ejercicios → series. Cada circuito anidado se arma con **`buildCircuitDetailResponse`, el helper que ya existía**: es el pago del refactor de CU-E-22, y evita que el formato del circuito se duplique en dos lugares.
- **`/routine/:id` quedó en coach + admin**, aunque el andamiaje declaraba también `user`. CU-U-09 pide esta misma estructura pero exige que la rutina pertenezca a una **asignación vigente del alumno**, y esa cadena todavía no existe: habilitar el rol `user` sin ese check dejaría que cualquier alumno leyera cualquier rutina. **U-09 sigue 🔵** y se cierra sumando el check cuando existan las asignaciones.
- **Helper `buildRoutinesQuery`**, espejo del de circuitos, con los filtros compartidos por los dos listados.
- Sin cambios de entidades → `Db Creator` intacto. Spec: `Doc/specs/2026-08-22-rutinas-lectura-design.md`.
- ~~**Pendiente de verificar en runtime:** no hay ninguna rutina cargada (E-16 no existe todavía), así que los listados devuelven `[]`.~~ **Destrabado (22/8):** con E-16 implementado ya no hace falta insertar nada a mano — se crea una rutina por `POST /routine/create` y con eso se validan los tres endpoints de lectura, incluido el **orden anidado de tres niveles** (`order` → `exercise_order` → `set_order`) de las find options de TypeORM, que era lo único que quedaba sin probar.

## Cambios recientes (2026-08-22 · baja lógica en Rutinas y Planificaciones)

Cambio de modelo: `Routine` y `Planification` suman `active` y pasan a **baja lógica**, como `Circuit`. **Ningún CU cambia de estado y los conteos no se mueven** — es sólo el modelo; los endpoints `set-active` se implementan con sus bloques (E-18 con Rutinas, E-11 con Planificaciones).

- **El motivo es una cascada que destruye historial.** `Routine` tiene tres FKs apuntándole con `ON DELETE CASCADE`: un `DELETE` se lleva `Routine_Circuit`, `Routine_Asignation_User` y `Routine_Asignation`, y desde ahí `User_Routine` y `Routine_Exercise_Set_Finished`. O sea, **borrar una rutina borraba en silencio el historial de entrenamiento de todos los alumnos que la hicieron**. `Planification` tenía el mismo problema vía `Routine_Asignation`. La spec anterior lo cubría con un chequeo de "no está en uso", protección que dependía de que ese chequeo estuviera bien escrito; con baja lógica el error es imposible por construcción.
- **Se hizo ahora y no después** porque las dos tablas están vacías (el `ALTER` no necesita backfill) y porque sus endpoints siguen siendo andamiaje: hacerlo más tarde obligaba a rehacer E-18, E-11 y los dos listados.
- **Regla de comportamiento** (espejo de CU-E-24): la baja saca la pieza de circulación para **nuevos** ensamblados y asignaciones, pero lo ya asignado mantiene integridad y el alumno lo sigue viendo.
- **Specs reescritas:** CU-E-18 y CU-E-11 pasan a "(Lógico)". Desaparece de ambas el camino alternativo *"en uso → impide la baja"*, reemplazado por una advertencia informativa: se puede dar de baja, pero eso no la quita de donde ya está asignada. CU-E-08 y CU-E-15 aclaran que listan las **activas**.
- **`Db Creator`:** columna + índice en las dos tablas, `01_estructura.sql` regenerado; `02` y `03` sin cambios. El `ALTER` se aplicó sobre la base viva.
- Diagramas de `Doc/` actualizados por el usuario (Miro → SVG/PDF). Plan: `Doc/plans/2026-08-22-baja-logica-rutinas-planificaciones-plan.md`.

## Cambios recientes (2026-08-19 · circuitos)

- **CU-E-21 (obtener circuitos)** ✅: `GET /routine/circuit/all` con tres filtros opcionales — `keyword` (parcial, sin distinguir mayúsculas, sobre nombre y descripción), `type` (exacto, sin distinguir mayúsculas) e `include_inactive` (por defecto `false`, solo activos como pide la spec). Devuelve un array plano ordenado por nombre, con `exercise_count` por circuito resuelto con `loadRelationCountAndMap` (sin query extra).
- **`GET /routine/circuit/all-plus`** (22/8) — tampoco es un CU: es el mismo listado de E-21 con los ejercicios de cada circuito (sólo `id` y `name`, sin series ni notas), pensado para que el front arme una rutina viendo el contenido de cada pieza sin una llamada por circuito. Se resolvió como **endpoint aparte y no como un parámetro `include_exercises`** del listado (decisión del usuario): así ningún endpoint devuelve dos formas distintas según el query string. Reutiliza el mismo `GetCircuitsQueryDto`, y los filtros compartidos se extrajeron a un helper privado `buildCircuitsQuery` para que un cambio futuro (por ejemplo, cuando `type` deje de ser string libre) se toque en un solo lugar. Acá el `exercise_count` sale del `.length` del array ya cargado, sin la query extra del listado normal.
- **`GET /routine/circuit/:id`** — no es un CU: es el «include» que CU-E-23 necesita para "abrir un circuito con sus ejercicios actuales". Devuelve el circuito con sus `Routine_Exercise` ordenados por `exercise_order` y sus `Exercise_Set` por `set_order`, aplanando las relaciones como hace `exercise.service.ts`. Responde también para circuitos inactivos, para que se puedan inspeccionar los dados de baja.
- **CU-E-24 (eliminar circuito, lógico)** ✅: `POST /routine/circuit/set-active/:id` con body `{ active }`, mismo patrón que `/membership/set-active/:id` y `/users/set-active/:id`. Un solo endpoint da de baja y reactiva. **No toca `Routine_Circuit`**: las rutinas que referencian el circuito quedan intactas, que es la postcondición explícita del CU.
- Los tres son `@Auth(coach, admin)` y viven en `routine.controller.ts` / `routine.service.ts`: **los circuitos no tienen módulo ni controller propio** (decisión del usuario — rutinas y circuitos dependen entre sí). El `RoutineService` deja de estar vacío.
- **CU-E-22 (crear circuito)** ✅: `POST /routine/circuit/create` da de alta la cabecera, sus ejercicios y sus series en **una sola transacción** (`QueryRunner`) — se aparta a propósito del patrón sin transacción de `createExercise`, porque con E-23 pausado un circuito creado a medias no se podría reparar desde la app. `exercise_order` y `set_order` los deriva el server de la posición en el array, así que no hay forma de recibir órdenes duplicados ni salteados. Responde `201` con el mismo formato anidado que el detalle, para que el front no tenga que hacer una segunda llamada.
  - **Reglas de negocio validadas:** `exercise_id` **único** dentro del circuito (400) — si hace falta el mismo movimiento dos veces se usa una variación del catálogo, y a cambio `exercise_id` queda como clave natural para la reconciliación de E-23; `amrap_time` sólo con `amrap = true`; `rpe` y `rir` mutuamente excluyentes (misma escala invertida); `rm = true` exige `set_count = 1`. Rangos: `set_count` 1–20, `rep_count` 1–1000 (cubre aeróbicos como saltos de soga), `weight` ≤1000, `rpe` 1–10, `rir` 0–10, `rm_perc` 1–125 (permite supramáximo).
  - **Semántica confirmada:** una fila de `Exercise_Set` es un **bloque de series iguales**, no una serie individual. **Actualizado el 25/8:** el bloque sigue siendo la unidad de prescripción, pero el "hecho" ya no se registra por bloque — `Routine_Exercise_Finished` cuelga del **ejercicio completo**, y el tildado serie por serie queda enteramente del lado del front.
  - **Refactor:** el armado de la respuesta anidada salió de `getCircuitById` a dos helpers privados (`findCircuitDetail` + `buildCircuitDetailResponse`) que comparten el alta y el detalle.
- ~~**CU-E-23 (editar circuito)** queda como el **único pendiente del bloque**, pausado por decisión de diseño.~~ **Resuelto el 25/8** — ver la sección de cambios recientes de esa fecha.
- Sin cambios de entidades → `Db Creator` intacto.
- **La base ya está migrada al schema nuevo** (19/8): se aplicó el delta de circuitos sobre la instancia existente en vez de recrearla, así que los endpoints de circuitos se pueden probar en runtime.
- **`ias_users` fuera del DDL:** era una tabla de otro proyecto arrastrada en `ddl.py`. Se sacó de los scripts para que no vuelva a crearse al regenerar; **la tabla existente en la base no se toca** (decisión del usuario). Ahora la correspondencia entidades ↔ tablas es 20 a 20, sin excepciones.
- **Bugfix transversal — `@IsUUID('4')` → `@IsUUID('all')` en los 17 usos (12 DTOs).** El seed genera ids **deterministas v5** (`uuid5(namespace, nombre)`, en `gen_seed.py` y `dynamic_data.py`), mientras que la app genera **v4 aleatorios** (`gen_random_uuid()` / TypeORM). Los validadores exigían v4, así que **cualquier endpoint que recibiera un id del seed devolvía 400**: 939 de 984 ids del catálogo y 131 de 142 de los datos dinámicos son v5. Afectaba a `ParameterIdDto` (todos los `:id`), a los ids de ejercicio y músculo de ejercicios y RMs, y a usuarios y membresías sembrados. Se detectó probando el alta de circuitos con ejercicios reales del catálogo.
  - **Decisión:** no se toca la generación de ids. El v5 del seed es deliberado — es lo que hace que los INSERT sean idempotentes (`ON CONFLICT (id) DO NOTHING`), que los `.sql` regenerados queden byte-idénticos y que los ids se puedan citar en payloads y documentación. La app no puede usar v5 porque en runtime no hay clave natural que hashear. El error estaba en el validador, que afirmaba una propiedad que el sistema nunca garantizó: `'all'` sigue exigiendo un UUID bien formado, sólo deja de exigir que sea aleatorio.
- Spec: `Doc/specs/2026-08-19-crear-circuito-design.md` · plan: `Doc/plans/2026-08-19-crear-circuito-plan.md`.
- Spec del bloque: `Doc/specs/2026-08-19-circuitos-listado-y-baja-design.md` · plan: `Doc/plans/2026-08-19-circuitos-listado-y-baja-plan.md`.

## Cambios recientes (2026-08-19 · modelo)

Alineación de las entidades con el modelo vigente de `Doc/` (spec: `Doc/specs/2026-08-19-ajuste-modelo-circuitos-design.md`, plan: `Doc/plans/2026-08-19-ajuste-modelo-circuitos-plan.md`). **Sin endpoints nuevos: ningún CU cambia de estado ni se mueven los conteos.**

- **`Circuit` pasa a pieza global reutilizable**: se va `routine_id` (la forma 1:N que tenía el código), entran `description` varchar(100) nullable, `type` varchar(30) y `active` boolean. `type` queda como **string libre** por ahora — la idea es cerrarlo más adelante a un conjunto de valores por función dentro de la rutina (entrada en calor / principal / accesorio / cardio / estiramiento), y al ser varchar eso no va a requerir tocar la base.
- **Nueva `Routine_Circuit`**: join M:N rutina ↔ circuito con `order`. **Sin unique sobre (`routine_id`, `circuit_id`)** — un mismo circuito puede repetirse dentro de la rutina y el `order` distingue las apariciones. FKs: `routine_id` CASCADE, `circuit_id` RESTRICT (la baja de circuitos es lógica, así que el RESTRICT sólo protege de un borrado manual en la base).
- **`Routine_Exercise` pierde `finished` y `user_note`**: era estado per-usuario viviendo en la plantilla genérica y compartida del circuito. `coach_note` se queda.
- **Nueva `Routine_Exercise_Set_Finished`**: `user_routine_id` + `routine_exercise_set_id` (→ `Exercise_Set.id`) + `user_note`, con unique del par. La existencia de la fila *es* el "hecho". Habilita **CU-U-12**, que sigue ⬜ hasta que existan los endpoints. **Superada el 25/8:** pasó a llamarse `Routine_Exercise_Finished` y su FK subió un nivel, de `Exercise_Set` a `Routine_Exercise` (ver los cambios del 25/8).
- **`Db Creator`**: `ddl.py` + `01_estructura.sql` actualizados y regenerados con `build_sql.py`; `02` y `03` sin cambios de contenido. El schema se aplicó a la base existente con un `ALTER` puntual (19/8), sin recrearla.
- Verificado por compilación (`npm --prefix power-app run build`) y por chequeo cruzado columna a columna entre entidades y `01_estructura.sql`.

## Cambios recientes (2026-08-18)

- **CU-U-05 (cambiar contraseña)** ✅: `POST /users/change-password` con body `{ current_password, new_password }`. Acepta como contraseña actual tanto la normal como la **temporal** (cubre el cambio obligatorio tras una recuperación) y en ambos casos deja `temp_password` en `null`. Valida que la actual sea correcta (401) y que la nueva cumpla los requisitos de formato (mínimo 6, máximo 50). **Decisión (18/8):** la repetición de la contraseña nueva **no viaja al server** — esa confirmación se valida en el front, así que el camino alternativo «confirmación no coincide» de la spec queda del lado del cliente.
- **CU-U-06 (editar datos personales)** ✅: `POST /users/edit` sobre el **propio** registro — el id sale de `@CurrentUser()`, no del path, así que no hay forma de editar a otro usuario. Todos los campos son opcionales (`first_name`, `last_name`, `email`, `phone_prefix`, `phone_number`, `profile_picture`); sólo se persisten los que vienen. Si cambia el email se valida unicidad (409) y se resetea `email_verified`; si cambia el teléfono se resetea `phone_verified`.
- **Nuevo helper `AuthService.comparePassword(plain, hash)`**: compara contra un hash ya persistido y devuelve `false` si el hash es null, en vez de dejar que `bcrypt.compare` rompa.
- **`User.temp_password` pasó a `string | null` en TypeScript** para reflejar el `nullable: true` que la columna ya tenía. **No es un cambio de schema** — la DB no cambia y `Db Creator` no se toca.
- **CU-U-11 (ver mis RMs de un ejercicio)** ✅ *(era 🟡 parcial)*: nuevo `GET /user_rm/user/:idUser/exercise/:idExercise` con **check de dueño** — si el rol es `user`, el `:idUser` tiene que coincidir con el del token (403 si no); coach y admin consultan el de cualquier alumno. Devuelve los RMs ordenados por `date` DESC. Se eligió el path con los dos ids (en vez de un `/me/...`) para que el mismo endpoint le sirva al entrenador como drill-down por ejercicio sobre CU-E-04. Nuevo DTO `UserExerciseParamsDto` (dos UUIDs), porque `ParameterIdDto` sólo contempla uno.
- **CU-U-10 (ver detalle de un ejercicio)** 🟡 *sigue parcial*: se expuso `GET /exercise/:id` con `@Auth()`, que devuelve la **ficha de catálogo** del ejercicio (descripción, tips, video, imágenes y músculos trabajados) reutilizando el `getExerciseById` que ya existía en el service.
  - **Ojo con el alcance:** la spec de U-10 no pide sólo la ficha, sino el detalle del ejercicio **dentro de la rutina** — el `Exercise` con sus `Exercise_Set` ordenadas (reps, peso, RPE/RIR, AMRAP/RM) y las notas `coach_note`/`user_note` — con la precondición de que el ejercicio pertenezca a una rutina asignada vigente, e incluye («include») a U-11, U-12 y U-13. Ese camino pasa por `Routine_Exercise` → `Exercise_Set` desde la rutina del usuario, o sea por `RoutineService` (vacío) y el módulo `Circuit` (inexistente): **queda atado al bloque del 28/8**. La nota anterior del informe («falta exponer `GET /exercise/:id`») subestimaba el alcance real.
  - **Inconsistencia de auth a resolver:** el endpoint nuevo pide sesión (`@Auth()`), siguiendo la precondición de la spec, pero `GET /exercise/all` sigue siendo **público**. Conviene alinear los dos criterios.
- **CU-U-16 (calcular mis RM potenciales)** ✅: `POST /user_rm/potential` con body `{ exercise_id, weight, max_reps }`. Valida que el ejercicio exista (404), que el peso sea > 0 y que las reps sean un entero ≥ 1. **No persiste nada**, como pide la spec.
  - **Forma elegida (decisión del usuario):** en vez de devolver un único número, devuelve la **tabla completa de 1RM a 12RM**. Se calcula el 1RM con Epley directo (`peso × (1 + reps/30)`) y de ahí se derivan las demás filas con la inversa (`1RM / (1 + n/30)`). La fila `n = max_reps` devuelve exactamente el peso informado, lo que valida la tabla.
  - **Fila 1RM:** usa el Epley **directo**, no la inversa. La inversa en n=1 da ~3% menos y no coincidiría con el 1RM que muestra cualquier otra calculadora; se privilegió que el número sea cruzable con el resto del mundo.
  - **Rango fijo 1→12**, sin importar el `max_reps` recibido: es el rango estándar y más allá de 12 repeticiones Epley pierde precisión.
  - Valores con 2 decimales; el redondeo a disco queda del lado del cliente.
  - **Caso borde `max_reps = 1` contemplado:** Epley asume más de una repetición, así que aplicarlo a 1 rep inflaba el resultado un 3.3% (informar «120 kg a 1 repetición» devolvía `1RM = 124`). Ahora, si `max_reps === 1`, el peso informado **es** el 1RM y la tabla se deriva de ahí. Verificado sobre 6 combinaciones de peso/reps: en todas, la fila `n = max_reps` devuelve exactamente el peso informado.
- **CU-E-26 / E-27 / E-28 (estado y tipo de membresía)** ✅: tres endpoints nuevos en `MembershipController`, todos `@Auth(coach, admin)`.
  - `GET /membership/status/summary` — contadores de alumnos por estado.
  - `GET /membership/status/users?status=` — alumnos filtrados por estado.
  - `GET /membership/type/users?membership_id=` — alumnos por tipo; **sin** el parámetro devuelve todos los tipos agrupados (404 si el `membership_id` no existe).
  - **Estado derivado, no persistido:** la spec de E-26 pide explícitamente derivarlo de `Membership_Payment.expired_at` contra la fecha actual. Se ignora a propósito el flag `active` del pago, que lo pisa un cron a las 03:00 y durante el día puede estar desfasado. De cada alumno manda el pago de `expired_at` más lejano.
  - **Ventana "por vencer" configurable:** variable de entorno **`MEMBERSHIP_EXPIRING_SOON_DAYS`**, default **7** días. Se lee una vez al construir el service vía `ConfigService`; si falta o no es un entero ≥ 0, cae al default y avisa por consola. El valor se devuelve en las respuestas como `expiring_soon_days`. **No está expuesta al cliente** (no es query param). Como `.env` está gitignoreado, hay que agregarla a mano en cada entorno donde se quiera cambiar el default.
  - **Alumnos sin pagos:** no entran en activa/por vencer/vencida; van a un contador propio `no_payments` y quedan fuera de la agrupación por tipo (se informan aparte como `without_payments`).
  - **Corte de la ventana a fin de día:** los vencimientos se persisten a las 23:59:59.999 (ver `calculateExpirationDate`), así que el umbral también se corta a fin del día N. Si no, una membresía que vence justo dentro de N días quedaba como "activa" por unas horas de diferencia. Verificado sobre 8 casos de borde (vencida ayer, vence hoy, en 3, en 7, en 8 y en 30 días).
  - **Resolución en memoria:** se traen los alumnos con sus pagos y se clasifica en JS, en vez de un `DISTINCT ON`. Es específico de PostgreSQL, más frágil de mantener, y el volumen es de escala gimnasio.
- **Bloque del 14/8 cerrado** (7 de 8 + U-10 parcial). Lo que sigue es **Circuitos (21/8)**.

## Cambios recientes (2026-08-11)

- **Autorización centralizada (Guards):** se reemplazó la verificación manual de token por Guards + decorador `@Auth(...)` de NestJS en los 7 controllers (rol por endpoint, `@Auth(user)` + check de dueño en User RM). Resuelve el hallazgo #6.
- **CU-U-03 (cerrar sesión)** ✅: `POST /users/logout` responde 200 (ack). El JWT es stateless → el logout efectivo lo hace el cliente descartando el token; sin denylist server-side (no lo pide la spec).
- **CU-U-04 (recuperar contraseña)** ✅: `POST /users/recover-password` genera una `temp_password` aleatoria, la hashea/persiste y responde el **mismo mensaje** exista o no el email (no revela). **Email stubbeado** (la temporal se loguea en consola; falta integrar un servicio de mail real). No requiere cambio de schema (`temp_password` ya existía).
- El módulo `/auth` viejo (todo comentado) se **eliminó**; logout y recuperación viven en `/users`.
- Se corrigió un crash de login: `authenticateTemporaryPassword` cortaba con `bcrypt.compare(null)` cuando `temp_password` es null → ahora devuelve 401 limpio.

## Cambios recientes (2026-08-06)

- **CU-A-18** reclasificado a ✅ **Implementado**: la spec define los campos editables del Coach como `coach_email`, `cuil`, `active`, exactamente lo que actualiza `POST /coach/promote_user` cuando el usuario ya es coach.
- **CU-A-23** implementado en código (baja lógica de membresía):
  - Nueva columna `active: boolean` (default `true`) en la entidad `Membership`.
  - Nuevo DTO `SetMembershipActiveDto` (`{ active: boolean }`).
  - Nuevo método `setMembershipActive` en `MembershipService`.
  - Nuevo endpoint `POST /membership/set-active/:id` — un mismo endpoint activa o da de baja según el flag del body.
  - Los listados (`GET /membership/all`) siguen devolviendo activas e inactivas (sin filtro).
  - **Schema:** se agregó `active BOOLEAN NOT NULL DEFAULT true` a la tabla `Membership` en `Db Creator/ddl.py` (fuente del DDL, generado por `build_sql.py`) y `Db Creator/01_estructura.sql`. Los INSERT de seed usan lista de columnas explícita, así que el `DEFAULT true` los cubre. **Falta regenerar la base** para aplicarlo; hasta entonces los endpoints de membresía fallarán (TypeORM seleccionará una columna inexistente).
- **CU-A-02 / CU-A-03** reclasificados a ✅ **Implementado**: la asignación/desasignación de músculos se gestiona dentro de la creación y edición de ejercicios (`POST /exercise/create` y `POST /exercise/edit/:id`), no como endpoints separados. **Admin queda 23/23 (100%).**
- **Filtros + paginación en `GET /users/all`** (cierra **CU-E-01** y **CU-E-02**): query params `role` (user/coach/admin), `keyword` (coincidencia parcial en nombre, apellido y email), `active` (estado de cuenta) y paginación `page`/`limit` (default 1/20, máx 100). La respuesta pasó a ser paginada: `{ data, total, page, limit, totalPages }` (cambio de contrato — antes era un array). Orden interno por `created_at` DESC (no expuesto como parámetro).
- **Nuevo campo `User.active`** (boolean, default `true`): estado de la cuenta, independiente de si la membresía está vigente. Agregado a la entidad `User` y a los scripts de DB (`Db Creator/ddl.py` y `Db Creator/01_estructura.sql`). Los usuarios nuevos y el seed quedan `active = true` por el DEFAULT. Igual que `Membership.active`, **requiere regenerar la base**; hasta entonces los endpoints de usuarios fallan (TypeORM selecciona una columna inexistente).
- **CU-E-03 (cerrar cuenta de alumno)** implementado: endpoint `POST /users/set-active/:id` con body `{ active }` (mismo patrón que membresías) para baja/alta lógica de la cuenta. Además, `POST /users/login` ahora responde **403** para cuentas con `active = false`, cumpliendo la postcondición «no puede iniciar sesión». Falta control de acceso por rol (guards) — pendiente transversal.

---

## Hallazgos estructurales

> Lista de **hallazgos abiertos**. Los que se cerraron salieron de acá y quedan registrados en *Cambios recientes*: módulo `/auth` comentado (resuelto 11/8), autorización manual sin Guards (11/8), gestión de cuenta del usuario — U-05, U-06, U-16 (18/8), alumnos y membresías — E-01→E-03, E-26→E-28 (6/8 y 18/8) y circuitos incompletos (cerrado 25/8, 4 de 4).

1. **Rutinas cerrado salvo E-19/E-20; Planification sigue siendo andamiaje** *(actualizado 27/8)*. `routine.service.ts` tiene **los circuitos completos** (E-21→E-24) y **el ciclo de vida entero de la rutina**: lectura (E-15, más `/all-plus` y el detalle), alta (E-16), edición (E-17) y baja lógica (E-18). Lo único que queda del bloque es **E-19/E-20** (asignar y quitar rutina puntual a un alumno), **post-MVP por decisión del 27/8**: dependen de `Routine_Asignation_User`, cuya FK obligatoria a `Routine_Asignation` hace imposible el "sin planificación" que pide el CU (ver los cambios del 27/8 para el contrato acordado). Planificaciones sigue entero: `planification.service.ts` está **vacío** (4 líneas) y las 12 rutas que le quedan al controller responden con la llamada comentada. De acá salen los **9 CU en andamiaje** (E-08→E-14, U-08, U-09), más E-19 y E-20 sin ruta.
2. **Nada escribe el registro de ejecución de entrenamientos** *(nuevo 25/8 — absorbe lo que quedaba vivo de los hallazgos 4 y 5 anteriores)*. `Routine_Exercise_Finished` existe como entidad y como tabla, pero en todo el código **sólo se lee**: la única consulta está en `editCircuit`, para detectar historial y decidir si la baja es lógica. **Ningún endpoint inserta una fila.** De ahí cuelgan 4 CU: marcar serie realizada (**U-12**) y nota del ejercicio (**U-13**) del lado del alumno, e historial de entrenamientos (**E-06**) y su filtro por ejercicio (**E-07**) del lado del entrenador. Es también lo que mantiene a **U-10** en parcial — la ficha de catálogo está expuesta, falta el detalle en contexto de rutina. Todo depende del bloque de Rutinas (28/8). **Consecuencia inmediata:** es lo que dejó la rama de `active` de CU-E-23 **sin verificar en runtime** (ver los cambios del 25/8) — para probarla hay que insertar el "hecho" a mano, y eso obliga a armar la cadena `Planification` → `Routine_Asignation` → `User_Routine` que el seed tampoco genera.
3. **`Routine.routine_plan_id` es una columna obsoleta** *(22/8)*. El modelo tiene **dos caminos** de `Routine` a `Planification`: la FK directa `Routine.routine_plan_id` (nullable, `ON DELETE SET NULL`) y la tabla `Routine_Asignation` (`routine_id` + `routine_plan_id` + `order`). **La spec de CU-E-12 nombra explícitamente la segunda**, y ningún CU usa la primera. Mantener las dos deja dos verdades posibles sobre el mismo hecho, que ningún endpoint reconcilia. **Decisión (22/8):** el alta de rutinas no la toca (queda en `null`) y la columna se deja nullable; sacarla implica `ALTER` + `ddl.py` + `01_estructura.sql` + diagrama, y conviene hacerlo junto al bloque de planificaciones (4/9), donde se implementa E-12.
4. **`updated_at` no se actualiza solo, en ninguna tabla** *(25/8)*. Las entidades declaran `@Column({ onUpdate: 'CURRENT_TIMESTAMP' })` en 18 archivos, que es **sintaxis de MySQL**: en Postgres no hace nada, el DDL no tiene triggers y ninguna entidad usa `@UpdateDateColumn`. O sea que hoy `updated_at` queda **congelado en la fecha de alta** en las 20 tablas. Se resolvió a mano en `editCircuit` y, desde el 27/8, también en `editRoutine`, porque un endpoint de edición que devuelve la fecha vieja es directamente un dato incorrecto. **Ya son dos endpoints parcheando lo mismo**, así que conviene generalizarlo —trigger en `ddl.py` o `@UpdateDateColumn` en las entidades— antes de que sean cinco; el bloque de planificaciones (4/9) es la próxima oportunidad, porque va a tocar el DDL igual.

---

## Próximas semanas — cronograma del servidor (hasta 4/9)

> Organizado por **viernes** (clases). El **7/8** (infra y transversales) está **cerrado**: DB regenerada, autorización centralizada con Guards y CU-U-03/U-04 implementados. El **14/8** quedó **parcial** (ver abajo). Lo que sigue, hasta la **fecha límite de entrega del servidor (4/9)**:

| Viernes | Foco | Casos de uso |
|---|---|---|
| **14/8** ✅ | CU sin dependencias — **7 de 8** (+ U-10 parcial) | ✅ cambiar contraseña (**U-05**)<br>✅ editar datos personales (**U-06**)<br>✅ filtrar RMs por usuario (**U-11**)<br>✅ RMs potenciales (**U-16**)<br>✅ estado y tipos de membresía + alumnos por estado/tipo (**E-26→E-28**)<br>🟡 detalle de ejercicio (**U-10**): ficha de catálogo expuesta, el resto depende de Rutinas |
| **21/8** ✅ | Circuitos — **4 de 4** | ✅ obtener (**E-21**)<br>✅ crear (**E-22**)<br>✅ editar (**E-23**), cerrado el **25/8**: el "hecho" se repuntó a `Routine_Exercise` y la baja pasa a ser lógica cuando hay historial<br>✅ baja lógica (**E-24**)<br>✅ el detalle y el listado con ejercicios (`/all-plus`) |
| **28/8** ✅ | Rutinas — **el núcleo cerrado, 4 de 6** | ✅ obtener (**E-15**) + `/all-plus` y el detalle<br>✅ crear (**E-16**)<br>✅ editar (**E-17**), reconciliación por `Routine_Circuit.id` con baja lógica del vínculo<br>✅ baja lógica (**E-18**), `POST /routine/set-active/:id`<br>⬜ asignar rutina a alumno (**E-19**) — **post-MVP (27/8)**, depende de `Routine_Asignation_User`<br>⬜ desasignar rutina a alumno (**E-20**) — ídem<br>⬜ marcar series realizadas (**U-12**)<br>⬜ notas del ejercicio (**U-13**)<br>⬜ historial de entrenamientos y su filtro (**E-06, E-07**) |
| **4/9** | Planificaciones y cierre | ✅ ABM de planificaciones (**E-08→E-11**), sin tocar el esquema<br>✅ asignar y quitar rutinas al plan (**E-12**), ampliado a 4 operaciones<br>🔵 asignar planificaciones a alumnos (**E-13, E-14**)<br>🔵 planificación activa y detalle de rutina del usuario (**U-08, U-09**)<br>Pruebas de integración sobre la API + Swagger<br>**🎯 Hito: servidor con 73 de los 75 CU** — E-19 y E-20 quedaron fuera del MVP el 27/8 |

> Secuencia según dependencias: primero los CU independientes, luego **Circuitos**, sobre ellos las **Rutinas** y por último las **Planificaciones** que las agrupan.

> **Riesgo abierto (18/8):** los 6 CU pausados del 14/8 no bloquean a nadie, pero **Circuitos sí** — es la base de las Rutinas (28/8) y éstas de las Planificaciones (4/9). Si el 21/8 se corre, se corre toda la cadena hasta el hito del servidor.

> **Actualización (27/8):** **Rutinas deja de ser el cuello de botella.** E-15→E-18 están implementados, así que **Planificaciones (4/9) ya se puede arrancar** sobre rutinas reales. **Pero el hito del 4/9 cambia de forma:** con E-19 y E-20 fuera del MVP, el objetivo pasa de "los 72 CU cubiertos" a **70 de 72**, y los dos que faltan quedan documentados con su contrato para retomarlos después de la entrega.

> **Actualización (22/8):** **Circuitos deja de ser el cuello de botella.** E-21, E-22 y E-24 están implementados y la base está migrada, así que **Rutinas (28/8) ya se puede arrancar**: `Routine_Circuit` existe y hay circuitos reales para ensamblar. ~~E-23 quedó pausado a propósito y **no bloquea a Rutinas**.~~ **Cerrado el 25/8:** el bloque de circuitos ya no tiene pendientes.

---

## Detalle — Rol Usuario (20 CU · 70%)

### Administrar mi cuenta
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-U-01 | Registrar usuario | ✅ Implementado | `POST /users/register` |
| CU-U-02 | Login | ✅ Implementado | `POST /users/login` |
| CU-U-03 | Cerrar sesión | ✅ Implementado | `POST /users/logout` · ack 200, el cliente descarta el token |
| CU-U-04 | Recuperar contraseña | ✅ Implementado | `POST /users/recover-password` · genera `temp_password`; email stubbeado |
| CU-U-05 | Cambiar contraseña | ✅ Implementado | `POST /users/change-password` · acepta contraseña actual o temporal; anula `temp_password` |
| CU-U-06 | Editar datos personales | ✅ Implementado | `POST /users/edit` · sobre el propio registro (`@CurrentUser`), campos opcionales |
| CU-U-07 | Obtener historial de pagos | ✅ Implementado | `GET /membership/payment/user/:id` |

### Mi entrenamiento
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-U-08 | Obtener mi planificación | 🔵 Andamiaje | `GET /planification/user/:id/active` · service vacío |
| CU-U-09 | Ver detalle de rutina | 🔵 Andamiaje | `GET /routine/:id` · service vacío |
| CU-U-10 | Ver detalle de un ejercicio | 🟡 Parcial | `GET /exercise/:id` ✅ expuesto (ficha de catálogo) · **falta** el detalle en contexto de rutina (`Exercise_Set` ordenadas, notas) — depende de Rutinas |
| CU-U-11 | Ver mis RMs de un ejercicio | ✅ Implementado | `GET /user_rm/user/:idUser/exercise/:idExercise` · check de dueño para rol `user`, orden por fecha DESC |
| CU-U-12 | Marcar serie como realizado | ⬜ No implementado | sin endpoint · el registro pasa a ser por ejercicio (`Routine_Exercise_Finished`) |
| CU-U-13 | Dejar una nota en el ejercicio | ⬜ No implementado | sin endpoint |
| CU-U-14 | Temporizador | ⬜ No implementado | sin endpoint (probable front-end) |
| CU-U-15 | Consultar wiki de ejercicios | ✅ Implementado | `GET /exercise/all` |

### Administrar mis RMs
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-U-16 | Calcular mis RM potenciales | ✅ Implementado | `POST /user_rm/potential` · Epley, tabla 1RM→12RM, no persiste |
| CU-U-17 | Registrar un RM | ✅ Implementado | `POST /user_rm/create` |
| CU-U-18 | Editar un RM | ✅ Implementado | `POST /user_rm/edit/:id` |
| CU-U-19 | Obtener mis RMs | ✅ Implementado | `GET /user_rm/user/:id` |
| CU-U-20 | Eliminar un RM | ✅ Implementado | `DELETE /user_rm/:id` |

---

## Detalle — Rol Entrenador (29 CU · 62%)

### Administrar alumnos
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-E-01 | Obtener alumnos | ✅ Implementado | `GET /users/all?role=user` · filtros rol/keyword/active + paginación |
| CU-E-02 | Obtener alumnos — filtro por nombre | ✅ Implementado | `GET /users/all?keyword=` · busca en nombre, apellido y email |
| CU-E-03 | Cerrar cuenta de alumno | ✅ Implementado | `POST /users/set-active/:id` · baja lógica `{ active }` + bloqueo de login (403) |
| CU-E-04 | Obtener RMs del alumno | ✅ Implementado | `GET /user_rm/user/:id` |
| CU-E-05 | Historial de pagos de alumno | ✅ Implementado | `GET /membership/payment/user/:id` |
| CU-E-06 | Historial de entrenamientos de alumno | ⬜ No implementado | sin tracking ni endpoint |
| CU-E-07 | Historial entrenamientos — filtro ejercicio | ⬜ No implementado | sin endpoint |

### Administrar planificaciones
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-E-08 | Obtener planificaciones sistémicas | ✅ Implementado | `GET /planification/all` · keyword/type/include_inactive + routine_count |
| CU-E-09 | Crear planificación sistémica | ✅ Implementado | `POST /planification/create` · 201 con el detalle |
| CU-E-10 | Editar planificación sistémica | ✅ Implementado | `POST /planification/edit/:id` · 400 si está de baja · el opcional omitido borra |
| CU-E-11 | Eliminar planificación sistémica (lógico) | ✅ Implementado | `POST /planification/set-active/:id` · baja y reactivación |
| CU-E-12 | Gestionar rutinas de una planificación | — *agrupador* | no se cuenta: agrupa a E-12a → E-12d |
| CU-E-12a | Asignar una rutina a planificación | ✅ Implementado | `POST /planification/routine/assign` · `order` opcional, al final si se omite |
| CU-E-12b | Asignar rutinas en lote | ✅ Implementado | `POST /planification/routine/assign-bulk` · transaccional, consecutivas al final |
| CU-E-12c | Quitar o reincorporar una rutina (lógico) | ✅ Implementado | `POST /planification/routine/set-active/:id` · `order` opcional al reincorporar |
| CU-E-12d | Quitar o reincorporar rutinas en lote (lógico) | ✅ Implementado | `POST /planification/routine/set-active-bulk` · transaccional |
| CU-E-13 | Asignar planificación a alumno | 🔵 Andamiaje | `POST /planification/user/assign` · comentado |
| CU-E-14 | Eliminar planificación a alumno | 🔵 Andamiaje | pasa a baja lógica en cascada (31/8): será `POST /planification/user/set-active/:id`, apaga la `User_Planification` y sus `User_Routine` |

### Administrar rutinas
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-E-15 | Obtener rutinas sistémicas | ✅ Implementado | `GET /routine/all` · filtros keyword/include_inactive + `circuit_count` |
| CU-E-16 | Crear rutina sistémica | ✅ Implementado | `POST /routine/create` · rutina + `Routine_Circuit` ordenados, en una transacción |
| CU-E-17 | Editar rutina sistémica | ✅ Implementado | `POST /routine/edit/:id` · reconciliación por `Routine_Circuit.id`, en una transacción |
| CU-E-18 | Eliminar rutina sistémica (lógico) | ✅ Implementado | `POST /routine/set-active/:id` · baja y reactivación |
| CU-E-19 | Asignar rutina a alumno | ⬜ No implementado | **post-MVP (27/8)** · andamiaje retirado; irá en `POST /routine/assign-user` |
| CU-E-20 | Eliminar rutina a alumno | ⬜ No implementado | **post-MVP (27/8)** · irá en `DELETE /routine/assign-user/:id` |

### Administrar circuitos
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-E-21 | Obtener circuitos | ✅ Implementado | `GET /routine/circuit/all` · filtros keyword/type/include_inactive + `exercise_count` |
| CU-E-22 | Crear circuito | ✅ Implementado | `POST /routine/circuit/create` · circuito + ejercicios + series en una transacción |
| CU-E-23 | Editar circuito | ✅ Implementado | `POST /routine/circuit/edit/:id` · reconciliación por `exercise_id`, baja lógica si hay historial |
| CU-E-24 | Eliminar circuito (lógico) | ✅ Implementado | `POST /routine/circuit/set-active/:id` · flag `{ active }` |

### Gestionar membresías
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-E-25 | Obtener membresías | ✅ Implementado | `GET /membership/all` |
| CU-E-26 | Obtener estado de membresías | ✅ Implementado | `GET /membership/status/summary` · contadores derivados de `expired_at` |
| CU-E-27 | Obtener alumnos por estado de membresía | ✅ Implementado | `GET /membership/status/users?status=` · active / expiring_soon / expired / no_payments |
| CU-E-28 | Obtener alumnos por tipo de membresía | ✅ Implementado | `GET /membership/type/users?membership_id=` · sin el param, agrupa por tipo |
| CU-E-29 | Registrar pago de alumno | ✅ Implementado | `POST /membership/payment/register` |

---

## Detalle — Rol Admin (23 CU · 100%)

### Administrar ejercicios
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-A-01 | Obtener ejercicios | ✅ Implementado | `GET /exercise/all` |
| CU-A-02 | Asignar músculo a ejercicio | ✅ Implementado | se gestiona al crear/editar ejercicios (`POST /exercise/create` y `/exercise/edit/:id`) |
| CU-A-03 | Desasignar músculo de ejercicio | ✅ Implementado | se gestiona al editar ejercicios (`POST /exercise/edit/:id`) |
| CU-A-04 | Crear ejercicio | ✅ Implementado | `POST /exercise/create` |
| CU-A-05 | Editar ejercicio | ✅ Implementado | `POST /exercise/edit/:id` |
| CU-A-06 | Eliminar ejercicio | ✅ Implementado | `DELETE /exercise/:id` |

### Administrar músculos
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-A-07 | Obtener músculos | ✅ Implementado | `GET /muscles/all` |
| CU-A-08 | Crear músculo | ✅ Implementado | `POST /muscles/create` |
| CU-A-09 | Editar músculo | ✅ Implementado | `POST /muscles/edit/:id` |
| CU-A-10 | Eliminar músculo | ✅ Implementado | `DELETE /muscles/:id` |
| CU-A-11 | Obtener grupos musculares | ✅ Implementado | `GET /muscles/mg/all` |

### Administrar grupos musculares
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-A-12 | Obtener músculos del grupo muscular | ✅ Implementado | `GET /muscles/mg/get/:id` · incluye músculos |
| CU-A-13 | Crear grupo muscular | ✅ Implementado | `POST /muscles/mg/create` |
| CU-A-14 | Editar grupo muscular | ✅ Implementado | `POST /muscles/mg/edit/:id` |
| CU-A-15 | Eliminar grupo muscular | ✅ Implementado | `DELETE /muscles/mg/:id` |

### Administrar entrenadores
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-A-16 | Obtener entrenadores | ✅ Implementado | `GET /coach/all` |
| CU-A-17 | Convertir alumno a entrenador | ✅ Implementado | `POST /coach/promote_user` |
| CU-A-18 | Editar datos de entrenador | ✅ Implementado | `POST /coach/promote_user` · si el user ya es coach, actualiza `coach_email`, `cuil`, `active` |
| CU-A-19 | Eliminar entrenador | ✅ Implementado | `POST /coach/delete_coach/:id` · baja lógica (`active: false`) |

### Administrar membresías (tipos)
| CU | Caso de uso | Estado | Endpoint / nota |
|---|---|---|---|
| CU-A-20 | Obtener membresías | ✅ Implementado | `GET /membership/all` |
| CU-A-21 | Crear membresía | ✅ Implementado | `POST /membership/create` |
| CU-A-22 | Editar membresía | ✅ Implementado | `POST /membership/edit/:id` |
| CU-A-23 | Eliminar membresía | ✅ Implementado | `POST /membership/set-active/:id` · baja lógica con flag `{ active }` · **pendiente:** columna `active` en DB |

---

## Orden sugerido para cerrar la brecha

1. **Admin cerrado (23/23):** A-18 cubierto por `promote_user`; A-02/A-03 se resuelven al crear/editar ejercicios; A-23 implementado y con la columna `active` ya agregada a los scripts de DB (falta regenerar la base para aplicarlo).
2. **Routine + Planification**: implementar los services stubbed → desbloquea 14 CU y hace usable el rol Entrenador y "Mi Entrenamiento" del Usuario.
3. ~~**Circuitos** (E-21→E-24)~~ **cerrado del todo el 25/8**, con E-23 (editar) incluido. ~~Lo que sigue es **Rutinas** (E-15→E-18)~~ **cerrado el 27/8**; E-19/E-20 quedaron post-MVP. Lo que sigue es **Planificaciones** (E-08→E-14) y, con ellas, los CU de ejecución (U-08, U-09, U-12, U-13, E-06, E-07), que hoy están frenados porque nada escribe `Routine_Exercise_Finished` (hallazgo 2).
4. ~~**Gestión de cuenta del Usuario** (U-05, U-06) y auth (U-03, U-04).~~ **Cerrado** (U-03/U-04 el 11/8, U-05/U-06 el 18/8).
5. ~~**Transversal:** Guards de autenticación/roles.~~ **Cerrado el 11/8.** El manejo de schema no es una decisión pendiente: **`Db Creator` es la fuente** y los cambios se aplican a mano desde ahí.

---

## Cómo leer los estados

- **✅ Implementado** — el endpoint existe y su service ejecuta lógica real y validada.
- **🟡 Parcial** — funciona a medias: resuelto dentro de otro endpoint, sin filtro por usuario, o con la lógica lista pero sin ruta expuesta.
- **🔵 Andamiaje** — la ruta está declarada pero el service está vacío y la llamada comentada: responde, no ejecuta nada.
- **⬜ No implementado** — no existe endpoint, service ni módulo que cubra el caso de uso.
