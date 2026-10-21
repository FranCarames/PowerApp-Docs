# Spec — El home del alumno en un solo pedido (U-08)

> **Fecha:** 2026-10-21 · **Tarea:** **BE-20e** (nueva), sobre BE-20 de la [spec del bloque B](2026-10-20-asignar-planificaciones-design.md) (§9) · **Estado:** diseño aprobado el 21/10. Se ajustó a BE-20 ya construida (D31 conserva `assigned-plan`, D36 es nueva), y esas dos decisiones esperan la revisión del usuario. Pendiente de plan
> **Depende de:** BE-12 (`GET /routine/assigned/:userId` y su progreso) y **BE-20** (`GET /routine/assigned-plan/:userId`, sus helpers y las cuentas de `plan_weeks.ts`), que se commitea tal como quedó antes de empezar esta tarea.
> **Complementa** a D28 y a §5.5 del bloque B: no revierte nada de lo construido.

## 1. Contexto y objetivo

El home del alumno (U-08) muestra las rutinas de sus próximos días, que llegan por dos vías:

- **La asignación individual** (`Routine_Asignation_User`): una rutina para un día. La sirve `GET /routine/assigned/:userId?from=&to=` (BE-12).
- **La planificación** (`User_Planification` → `Planification` → `Routine_Asignation`): las rutinas de cada semana del plan, sin día. La sirve `GET /routine/assigned-plan/:userId?from=&to=` (BE-20, D28), con un tope de 520 semanas por pedido.

Con BE-20, U-08 queda ✅: el cliente hace los dos pedidos con el lunes y el domingo de la semana y junta las fuentes. El usuario pidió una forma más cómoda para el home (21/10):

- **Un solo pedido** con las dos fuentes.
- **Un filtro por semanas** en lugar de por fechas: el cliente manda un día (`date`, generalmente hoy) y una cantidad de semanas (`week`), y el back devuelve sólo esas semanas, empezando por el lunes de la semana de `date`.

Esta tarea suma esa ruta **reutilizando lo que dejaron BE-12 y BE-20**. Las dos rutas existentes no cambian.

## 2. Decisiones

Tomadas con el usuario el 21/10. La numeración sigue la del bloque B.

| # | Decisión | Por qué |
|---|---|---|
| D31 | **El home tiene una ruta propia, `GET /routine/home/:userId`, que devuelve las dos fuentes agrupadas por semana del calendario.** `GET /routine/assigned/:userId` y `GET /routine/assigned-plan/:userId` **se quedan como están** | Un pedido en vez de dos. La semana es lo que las dos fuentes tienen en común: las rutinas del plan no tienen día (D28). `assigned/:userId` lo usa el coach para sacar el id de la asignación en E-19 y E-20. `assigned-plan/:userId` sin filtro es la vista del plan entero, que el home ya no da porque tiene un tope de 8 semanas. Las dos están construidas y verificadas: sacarlas sería rehacer trabajo sin ganar nada |
| D32 | **`date` se redondea al lunes de su semana** (`start_date`). Es opcional: **si no viene, es hoy en hora de Argentina** (`America/Argentina/Buenos_Aires`), no en el reloj del servidor | El home pide semanas de lunes a domingo, como las del plan (D16). El servidor corre en UTC: los domingos de 21 a 24 h de Argentina ya es lunes en UTC, y con el reloj del servidor el home saltaría a la semana siguiente |
| D33 | **`week` es la cantidad de semanas completas que se devuelven, contando la de `date`**: entero de 1 a 8, por defecto 1. El rango termina en `end_date = start_date + 7·week − 1`, siempre un domingo | Es la misma cuenta que el fin por defecto del plan (D17, `plan_weeks.ts`). El tope evita que un pedido traiga todo, que es justamente lo que el filtro quiere evitar; 8 semanas sobran para el home (1 a 4) |
| D34 | **La respuesta trae siempre `week` elementos**, uno por semana y en orden, aunque estén vacíos. **Un plan vigente sin rutinas visibles esa semana aparece con `routines: []`** | El índice del array es el desplazamiento desde la semana de `date`: el front no rellena huecos. El plan vacío ya es así en BE-20: el plan está vigente, sólo que esa semana no tiene nada cargado |
| D35 | **Se refina CU-U-08**, no se abre un CU nuevo | Es la misma pantalla, el mismo actor y el mismo flujo. Sólo cambia qué manda la aplicación. U-08 ya está ✅ desde BE-20, así que los conteos no se mueven |
| D36 | **Cada elemento de `individual` es idéntico a uno de `assigned/:userId`, y cada elemento de `plan`, a uno de `assigned-plan/:userId`**: mismos DTOs y mismos helpers. Los grupos del plan conservan su `week_start` y `week_end`, aunque repitan los de la semana | Iguales por construcción: el front tipa una sola forma por fuente y lo verificado en BE-12 y BE-20 sigue valiendo. Repetir dos fechas por grupo cuesta menos que mantener una segunda forma del grupo |

**Una excepción acotada a "el servidor nunca calcula hoy"** (D25 y §4 del bloque B): D32 calcula hoy, pero **sólo como valor por defecto de un filtro de lectura**. No se guarda en ningún lado, y si el cliente manda `date`, el servidor no calcula nada. Lo recomendado para el front es mandar siempre `date` con el día del dispositivo.

## 3. Contrato — `GET /routine/home/:userId?date=&week=` (U-08)

Los roles son los mismos que en `assigned/:userId` y `assigned-plan/:userId`:

| Rol | Qué puede pedir |
|---|---|
| `user` | Sólo lo propio (`@Owner('userId')`): pedir otro id da `403` |
| `coach`, `admin` | Cualquier alumno (gimnasio compartido, D6) |

**Parámetros** (query, los dos opcionales):

| Parámetro | Formato | Por defecto | Uso |
|---|---|---|---|
| `date` | Día `yyyy-mm-dd` (`IsCalendarDay`) | Hoy en `America/Argentina/Buenos_Aires` | `start_date = mondayOf(date)` |
| `week` | Entero de 1 a 8 | 1 | `end_date = start_date + 7·week − 1` |

**Ejemplos** (`date` es el jueves 22/10, `start_date` el lunes 19/10):

| Pedido | Rango |
|---|---|
| `?date=2026-10-22&week=2` | 19/10 al 1/11 |
| `?date=2026-10-22` | 19/10 al 25/10 |
| `?week=2` | El lunes de hoy (Argentina) y 13 días más |
| (sin parámetros) | La semana actual (Argentina) |

`date` puede ser pasado o futuro: así el alumno vuelve a una semana anterior o mira las que vienen.

**Validaciones**, en este orden (los guards de Nest corren antes que la validación de la query):

| Código | Caso |
|---|---|
| `403` | Con el rol `user`, el `userId` no es el propio (`@Owner`) |
| `400` | `userId` no es un UUID, `date` no es un día válido o `week` no es un entero entre 1 y 8 |
| `400` | `end_date` cae después del 9999-12-31 (el mismo tope técnico de BE-18b): `El rango pedido termina después del 9999-12-31.` |
| `404` | El usuario no existe: `Usuario no encontrado` |
| `400` | El tope de 520 semanas de plan de BE-20, con su mismo texto. Con 8 semanas sólo se alcanza con más de 65 planes activos que conviven: se conserva porque viene con el helper compartido |

Como las otras dos rutas, no mira el rol ni la cuenta del usuario, sólo que exista: una cuenta cerrada conserva sus asignaciones.

## 4. Respuesta

**`200`** con un array de **exactamente `week` elementos**, uno por semana, ordenados por `week_start`:

```
[ { week_start: '2026-10-19', week_end: '2026-10-25',
    individual: [ <elemento de GET /routine/assigned/:userId> ],
    plan:       [ <elemento de GET /routine/assigned-plan/:userId> ] },
  { week_start: '2026-10-26', week_end: '2026-11-01', individual: [], plan: [] } ]
```

Desplegado:

```
{ week_start, week_end,
  individual: [ { id, routine_id, user_id, date, created_at, updated_at,
                  routine: { id, name, active },
                  progress: { finished, total } } ],
  plan: [ { user_planification: { id, start_date, end_date, coach_note,
                                  planification: { id, name, duration, active } },
            week, week_start, week_end,
            routines: [ { routine_asignation_id, order, active,
                          routine: { id, name, active },
                          progress: { finished, total } } ] } ] }
```

- **`week_start` y `week_end`** son el lunes y el domingo de esa semana del calendario.

### 4.1 `individual`

- Las `Routine_Asignation_User` del alumno con `date` dentro de la semana.
- **Cada elemento es el de `GET /routine/assigned/:userId`** (D36): el DTO `RoutineAssignedListItemResponseDto` y el progreso de §4.3 del bloque A.
- El orden también es el de esa ruta: día, nombre de rutina y alta.
- No se filtra por `active`: una rutina dada de baja se sigue viendo, y se puede ejecutar, con `routine.active: false` como dato informativo.

### 4.2 `plan`

- **Cada elemento es un grupo de `GET /routine/assigned-plan/:userId`** (D36), con el DTO `RoutineAssignedPlanWeekResponseDto` y las reglas de BE-20 (§5.4 y §5.5 del bloque B):
  - Aparecen las `User_Planification` **activas** con una semana del plan en esa semana del calendario. Las semanas del plan van de la 1 (la que contiene `start_date`, D16) a la que contiene `end_date`.
  - Por D16, en cada semana del calendario hay a lo sumo un grupo por asignación. `week` es su número dentro del plan. El `week_start` y el `week_end` del grupo son los de la semana del calendario.
  - Una asignación quitada (E-14) no aparece. Una plantilla dada de baja (E-11) sigue apareciendo, con `planification.active: false`.
  - Si conviven varias asignaciones (D21), aparecen todas, ordenadas por nombre de la planificación y alta de la asignación.
  - `routines` va por `order` y alta. Una `Routine_Asignation` dada de baja aparece sólo si el alumno completó algo en ella en esta asignación (D29), y entonces `finished = total`.
  - Un plan vigente sin rutinas visibles en esa semana viene con **`routines: []`** (D34).
  - Si la misma plantilla está asignada dos veces, cada asignación tiene su propio progreso.

### 4.3 Estado vacío

Si ninguna semana trae `individual` ni `plan`, el alumno no tiene entrenamiento asignado en el rango y el front muestra el mensaje. La respuesta sigue siendo `200`, con las `week` semanas vacías.

### 4.4 Ids para las pantallas que siguen

- El `id` de un elemento de `individual` abre `GET /routine/assign-user/:id` (U-09, BE-13).
- El par `user_planification.id` + `routine_asignation_id` abre una sesión del plan en `GET /routine/assign-plan/:userPlanificationId/:routineAsignationId` (BE-20b).

## 5. Implementación

**Dónde:** `routine/` (D27), en `routine.controller.ts` y `routine.service.ts`. No cambian el esquema, las entidades, `routine.module.ts` (los repositorios de BE-20 ya están registrados) ni `Db Creator`.

**`planification/plan_weeks.ts`** suma dos funciones puras sobre `yyyy-mm-dd` en UTC, junto a `mondayOf`, `planWeekOf` y `planWeekBounds`:
- `addDays(day, n)`.
- `todayIn(timeZone)`: el día de hoy en esa zona, con `Intl.DateTimeFormat`. Es la única que mira el reloj.

**Los helpers que se comparten.** Los cuerpos de `getAssignedRoutines` (BE-12) y de `getAssignedPlan` (BE-20) se parten en dos:
- **Un helper privado que devuelve los datos** para un `userId` ya validado y un rango opcional:
  - `findAssignedRoutinesInRange` arma la lista de BE-12.
  - `findAssignedPlanWeeks` arma los grupos de BE-20, o avisa que se pasó del tope de 520 semanas.
- **El handler**, que conserva sus validaciones, la búsqueda del usuario y los textos de error, y responde con lo que devuelve el helper.
- Así, **las dos rutas existentes responden igual que hoy**, y lo prueba su regresión (§8).

**El home** (`getRoutineHome`):
1. Arma `start_date` y `end_date` (D32, D33) y aplica el tope del 9999-12-31.
2. Busca el usuario una sola vez (`404`).
3. Llama a los dos helpers con `[start_date, end_date]`.
4. Reparte lo que devuelven en las `week` semanas: cada individual por el lunes de su `date`, cada grupo del plan por su `week_start`. Como el rango son semanas enteras de lunes a domingo, `week_start` siempre es uno de los lunes pedidos.
5. Las semanas sin nada quedan con `individual: []` y `plan: []`.

Son las mismas consultas que las dos rutas juntas, más la del usuario, que se hace una sola vez. Su cantidad no depende de cuántas semanas se pidan.

**DTOs** (en `dtos/routine/`):
- **La query:** `date` (`IsOptional`, `IsCalendarDay`) y `week` (`IsOptional`, convertido a número, `IsInt`, `Min(1)`, `Max(8)`).
- **La respuesta:** una clase para la semana, cuyo Swagger declara `individual` como `[RoutineAssignedListItemResponseDto]` y `plan` como `[RoutineAssignedPlanWeekResponseDto]`.

## 6. Spec de CU a reescribir

**U-08** (BE-20e), en `Use Cases/usuario/CU-U-08-obtener-mi-planificacion.md`, sobre la versión que dejó BE-20:
- **La app manda un día y una cantidad de semanas**, de 1 a 8. El sistema redondea el día al lunes y repite la búsqueda de las dos fuentes por cada semana del rango.
- **El sistema presenta las semanas en orden.** En cada una van las rutinas individuales por día y las del plan agrupadas por planificación, como hoy.
- **El camino "el alumno se mueve a otra semana"** pasa a ser "el alumno pide otro día". Se puede pedir un día pasado o futuro.
- **Caminos alternativos nuevos:**
  - La app no manda el día: se usa hoy en hora de Argentina.
  - La cantidad de semanas está fuera de rango: error.
  - Una semana del rango no tiene nada: la semana se muestra vacía.
- **Se conservan** los caminos que BE-20 dejó: sin plan esa semana, dos planificaciones juntas, plan que arranca o termina a mitad de semana, semana del plan sin rutinas, rutina quitada del plan, planificación quitada, bajas de plantilla, rutina o ejercicio, y sin asignaciones.

## 7. Fuera de alcance

- Cambiar `GET /routine/assigned/:userId`, `GET /routine/assigned-plan/:userId` o sus filtros `from`/`to`.
- El detalle, marcar y el historial de una sesión del plan, que son BE-20b, BE-20c y BE-20d y no cambian.
- Una zona horaria por usuario o por gimnasio: la zona por defecto es fija.
- Pedir más de 8 semanas: para ver más, el cliente pide con otro `date`, o el coach usa `assigned-plan/:userId`.

## 8. Verificación

- **Build** (`npm --prefix power-app run build`).
- **Las cuentas nuevas de `plan_weeks`**, con un script aparte sobre el código compilado:
  - `date` en cada día de la semana, incluido el domingo, y en un cambio de año.
  - `week = 1` y `week = 8`, y el tope del 9999-12-31.
  - `todayIn` con una hora fija en la franja del domingo de 21 a 24 h de Argentina.
  - Que el ICU de Node resuelva la zona.
- **El home, con repositorios falsos** sobre el código compilado:
  - Sin parámetros, sólo `date` y sólo `week`.
  - Semanas vacías y un plan sin rutinas.
  - Una individual y un grupo del plan en la semana correcta.
  - Dos asignaciones de la misma plantilla, y un plan que termina a mitad del rango.
  - Que una individual y un grupo del plan sean idénticos a los que dan `assigned/:userId` y `assigned-plan/:userId` para el mismo rango.
- **El SQL** no cambia (son las consultas de BE-12 y BE-20), pero se vuelve a generar sin base, con el `DataSource` armado sobre las entidades compiladas, para confirmar que la extracción a helpers no lo tocó.
- **Regresión:** los scripts de BE-12 y de BE-20 siguen en verde. Prueban que las dos rutas existentes responden igual.
- **El runtime** lo prueba el usuario en BE-35, contra Render regenerado y con el seed de BE-21.

## 9. Impacto

- **Status:** U-08 sigue ✅ y los conteos no se mueven. La fila de U-08 suma `GET /routine/home/:userId?date=&week=` como la ruta del home, y el changelog lleva el porqué de D31 a D36.
- **Spec del bloque B:** se agregan notas en D28 y en §5.5 que apuntan a esta spec, y una fila de BE-20e en §9. No se reescribe nada.
- **Web:** B1 (rutinas de la semana) tipa el home contra esta ruta, con un pedido en lugar de dos. Las otras dos rutas siguen para el coach.
- **iOS:** el inicio usa esta ruta y manda `date` con el día del dispositivo.
- **Orden:** BE-20e va después del commit de BE-20. Se propone hacerla antes de BE-20b, porque cambia el contrato contra el que tipa B1, y BE-20b a BE-20d no dependen de ella. Esfuerzo estimado: 2 h.

## 10. Riesgos y notas

- **Hoy en hora de Argentina** asume que el gimnasio y sus alumnos están en Argentina. Si eso cambia, el front ya manda `date` y el valor por defecto deja de importar.
- **`Intl` con zonas horarias** necesita el ICU completo de Node, que viene por defecto desde Node 13. Se verifica en el script de `plan_weeks`.
- **Extraer los helpers toca dos handlers ya verificados.** Por eso la regresión de BE-12 y BE-20 es parte de la tarea y no un extra.
- **Las asignaciones que conviven** (D21) se muestran todas, como en BE-20. Si se acumulan planes viejos sin quitar, la limpieza es E-14.
- **Una rutina del plan en una semana posterior al fin** (fin manual más corto que la duración) no aparece nunca en el home, igual que en BE-20. Se puede abrir y marcar por su ruta (D5).
