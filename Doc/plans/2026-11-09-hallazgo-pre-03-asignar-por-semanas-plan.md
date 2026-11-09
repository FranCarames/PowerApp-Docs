# T61 — Hallazgo PRE-03 de Pruebas del plan del alumno: al asignar una planificación se eligen las semanas · Plan

> **Numeración (leer primero).** La tarea del web es la **T61 (o el siguiente número libre)**: el 09/11 la última del `PLAN.md` del web es la T60 ([las rutinas quitadas del plan](2026-11-09-be-45-rutinas-quitadas-del-plan-plan.md)). Si al llegar ese número ya está usado, se toma el siguiente libre y se anota acá, en la constante `T61` de [Pruebas de planificaciones](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html), en el aviso de PRE-03 de [Pruebas del plan del alumno](../../Tests/Plan%20del%20alumno/Pruebas%20del%20plan%20del%20alumno.html) y en sus «Antes de empezar».
>
> **Cómo se entrega.** La sesión del web sigue el flujo de su repo, como lo dice su `CLAUDE.md`. Este plan no lo cambia. No hay tests automáticos (decisión del 16/10). Se verifica con `typecheck`, `eslint src`, `build` y `prettier --check`, más el navegador (4.9). No se levanta el server de producción ni se instala nada sin pedirlo.
>
> **Este plan es de diseño.** Lo escribió la sesión de docs el 09/11. Lo lee la sesión del **web** (sección 4). **No hay tarea de backend:** el contrato no cambia (sección 3). Los textos entre «» van **exactos**.

**Fuente:** PRE-03 de [Pruebas del plan del alumno](../../Tests/Plan%20del%20alumno/Pruebas%20del%20plan%20del%20alumno.html), tanda 4 (09/11, todavía no está en el repo: entra con `/commit-test-results`). La nota que sí está en el repo es la de las tandas [2](../../Tests/Plan%20del%20alumno/2-pruebas-plan-alumno.resultados.json) y [3](../../Tests/Plan%20del%20alumno/3-pruebas-plan-alumno.resultados.json) (28 y 31/10); se cita abajo.
**Modelo:** sin cambios. No cambia ninguna entidad ni el DDL, y no se toca `Db Creator`.
**Contrato:** sin cambios (sección 3).

**Goal:** que al asignar una planificación a un alumno el entrenador elija **cuántas semanas dura**, con la duración del plan ya cargada, y vea el rango de fechas que resulta antes de asignar, en vez de tener que contar y elegir un día de fin.

---

## 1. El hallazgo

| Caso | Gravedad | Lo que anotó Fran | CU | Qué se decidió |
|---|---|---|---|---|
| **Plan del alumno · PRE-03** · La planificación, asignada | 2 · Moderado | «En la asignacion de planificaciones no deberia estar presente la seleccion de fecha Vamos a modificar la seleccion de fechas de inicio y fin, necesito que al actualizar el input de fecha de inicio se calcule automaticamente con el valor ingresado en semanas si esta presente y es valido.» (tandas 2 y 3) | [CU-E-13](../../Use%20Cases/entrenador/CU-E-13-asignar-planificacion-a-alumno.md) | «Semanas» reemplaza a «Fecha de fin». Arranca en la duración del plan y un resumen muestra el rango que sale del inicio y de las semanas (sección 4) |
| **Plan del alumno · MAR-07** · La misma planificación dos veces | 2 · Moderado | «no vi el boton de asignar igual. asigno manualmente la fecha para que coincidan a partir de la segunda semana para la prueba» (tanda 3) | CU-E-13, paso 5 | El aviso de solapamiento y «Asignar igual» van junto al botón, no arriba del formulario (4.7) |

El segundo no es de la tanda 4: Fran lo pidió en el mismo pedido, porque es la misma pantalla. El caso MAR-07 no cambia (sección 1.2): con las semanas por defecto, la segunda asignación cae en las mismas fechas y el aviso sale junto al botón.

**La causa.** `AssignPlanForm` (`features/coach/components`) tiene dos campos de fecha: «Fecha de inicio» y «Fecha de fin (opcional)». Sin fin, el backend lo calcula (el domingo de la semana `duration`) y la pantalla lo anticipa con «Sin fecha de fin, termina el domingo …». Para otra cantidad de semanas hay que contar con el calendario y elegir el domingo a mano. Y el aviso de solapamiento sale **arriba** de las fechas (`AssignOverlapNote`, antes del primer campo): en un celular, quien toca «Asignar» abajo no lo ve.

### 1.1 Casos de uso (ya aplicado)

- **CU-E-13**, alcance y pasos 2 y 4: el entrenador define el inicio y cuántas semanas dura (por defecto, la duración de la planificación); el fin es el domingo de la última semana y se ve antes de asignar. Si no viene el fin (otro cliente, la API), el sistema lo sigue calculando desde la duración.
- Caminos alternativos: «El fin es anterior al inicio» y «El fin no coincide con la duración» pasaron a semanas («Las semanas están vacías o son menores que 1» y «Las semanas no coinciden con la duración»). Desde la web el fin cae siempre en domingo; el backend acepta igual cualquier fin: el contrato no cambia.
- Camino nuevo, en el paso 2: semanas vacías o menores que 1. La pantalla lo marca y no asigna.
- Duración 0: «Semanas» arranca vacío y es obligatorio (pasos 2 y 4).

### 1.2 Planes de prueba (ya aplicado)

Todos los casos nuevos o cambiados llevan el aviso amarillo con la tarea de la web. En [Pruebas del plan del alumno](../../Tests/Plan%20del%20alumno/Pruebas%20del%20plan%20del%20alumno.html) el aviso es **«Hoy falla.»**; en [Pruebas de planificaciones](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html), **«Hoy no cumple el CU.»** (el criterio de ese plan) con la constante `T61`.

| Plan | Caso | Qué cambia |
|---|---|---|
| Plan del alumno | **PRE-03** | Conserva el id. «Inicio hoy y 3 semanas (una más que la duración)», y lo esperado trae el resumen y el fin |
| Planificaciones | **ASG-01** | Conserva el id. «Semanas» precargado con la duración y el resumen, en vez de «Fecha de fin (opcional)» y su texto. El body lleva siempre `end_date` |
| Planificaciones | **ASG-04** | Conserva el id. Semanas vacías y 0, en vez del fin anterior al inicio |
| Planificaciones | **ASG-05** | Conserva el id. El aviso y «Asignar igual» donde los deja el prototipo: junto al botón |
| Planificaciones | **ASG-07** | **Se retira** (comentario en el lugar del caso): pedía un fin en miércoles y la web ya no lo permite. Su resultado queda huérfano y no se muestra; el id no se reutiliza |
| Planificaciones | **ASG-14** | **Nuevo.** Más semanas que la duración, desde el alumno, en el futuro (lo que ASG-07 cubría desde el alumno) |
| Planificaciones | **ASG-12** | Conserva el id. Pasado: «inicio hace tres meses, con las 2 semanas que trae» (no se puede elegir un fin). **Esto no lo pidió el pedido:** sin el cambio el caso no se podía hacer (4.10, vetable) |

No cambian: ASG-02 (el aviso confirma las fechas que guardó el backend; solo se cambió «el fin que calculó el backend» por «el fin que guardó el backend (los del resumen)»), ASG-03, ASG-06, ASG-09, ASG-10 y ASG-11 (cambiar la duración con alumnos asignados; solo se cambió «la de ASG-06, sin fin elegido» por «con las semanas del plan») de Planificaciones; y MAR-07, HOM-01 y HOM-02 de Plan del alumno. Los de «Pruebas del detalle del alumno» que asignan «desde hoy» tampoco: con las semanas por defecto salen igual que antes.

### 1.3 Prototipo (ya aplicado)

[`UI Front/powerapp-prototype-web.html`](../../UI%20Front/powerapp-prototype-web.html), pantalla `#/c-asignar` (en el prototipo, entrenador: **Planes › Asignar**). Está rehecha como la web de hoy, de a un alumno: arriba lo que ya viene elegido (la planificación o el alumno), el buscador del otro y, después, las fechas, la nota y el botón. Sirve para ver los textos y el orden; mobile-first hasta 560 px y escritorio desde 960 px.

- Desde la planificación: **Planes › Asignar**. Desde el alumno: **Alumnos › un alumno › Asignar planificación** (entrada nueva en el prototipo, que antes no la tenía).
- Lucía Méndez, Tomás Ríos y Sofía Paz tienen una planificación vigente sembrada: asignarles con el inicio en hoy muestra el solapamiento. Martín Soto y Julián Vega no tienen: se asigna sin aviso.
- La rutina puntual (editor de rutina › Asignar a alumno) usa la misma pantalla, de a un alumno y con «Día». No es parte de este cambio (CU-E-19).

---

## 2. Qué se decidió

1. **«Semanas» reemplaza a «Fecha de fin».** No hay selector de fin en la web, ni opcional.
2. **Arranca en la duración del plan.** Con duración 0 arranca vacío y es obligatorio.
3. **El fin lo calcula la web:** el domingo de la última semana, contando como semana 1 la de lunes a domingo que contiene el inicio. Se ve antes de asignar, en un resumen que se recalcula al cambiar el inicio o las semanas.
4. **La web manda siempre `end_date`.** El backend sigue aceptando que no venga; el contrato no cambia.
5. **Se pueden elegir más o menos semanas que la duración.** El resumen avisa qué pasa: las de más se ven vacías; con menos, el alumno ve hasta la semana elegida.
6. **De a un alumno, como hoy.** El aviso de solapamiento y «Asignar igual» van junto al botón.

---

## 3. Contrato: sin cambios

`POST /planification/user/assign` (`AssignPlanificationToUserDto`, el tipo `AssignPlanificationBody` de `api/types.ts`):

```json
POST /planification/user/assign
{
  "planification_id": "<uuid>",
  "user_id": "<uuid>",
  "start_date": "2026-11-09",
  "end_date": "2026-11-29",
  "coach_note": "Arrancá suave",
  "confirm_overlap": false
}
```

- **`end_date` sigue siendo opcional en el contrato.** Sin él, el backend lo calcula desde la duración del plan (y con duración 0 no puede: lo pide y no crea la asignación, CU-E-13). Lo que cambia es el **cliente**: la web lo manda siempre.
- `coach_note` vacía no se manda (la cadena vacía da 400), como hoy. `confirm_overlap` queda como hoy: `false`, y `true` solo si el aviso de esas fechas está en pantalla.
- Los códigos y textos de respuesta no cambian: 201, el 409 con `overlapping`, los 400 y 404 de CU-E-13.
- El backend acepta cualquier fin (más corto o más largo que la duración, o uno que no cae en domingo). Desde la web siempre cae en domingo, porque es el cierre de una semana.

**No hay sección de backend:** no hay tarea BE, ni cambia el modelo, el DDL o el Swagger. La duración que se precarga (`duration`) ya la tienen las dos entradas: el detalle de la planificación y la fila del selector.

---

## 4. Web (T61 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de:** nada. **Estado: pendiente.**

Es solo `AssignPlanForm` y lo que lo rodea: sirve igual para las dos entradas (`/c/planes/:id/asignar` con `AssignPlanPage` y `/c/alumnos/:id/asignar` con `AssignStudentPlanPage`), que no cambian. `AssignLayout`, `PlanPicker` y `StudentPicker` tampoco.

### 4.1 Qué hace el web

| # | Cambio | Dónde |
|---|---|---|
| 1 | **El schema** deja de tener `end_date` y suma `weeks` (texto, como los demás números del formulario). Valida `weeks` (4.3) y que el fin quede en el calendario (4.4). Ya no necesita la duración del plan: la duración es solo la precarga, así que `assignPlanSchema()` pierde su parámetro. Su `transform` devuelve siempre `{ start_date, end_date, coach_note? }`, con `end_date = defaultEndDate(start_date, weeks)` | `features/coach/assignSchema.ts` |
| 2 | **`defaultEndDate(start, weeks)`** se reutiliza tal cual (el lunes de la semana del inicio + 7 × semanas − 1), pero su segundo parámetro pasa a ser **las semanas elegidas**, no la duración del plan. Se actualiza su comentario. Sigue devolviendo `null` si el inicio no es un día válido | `features/coach/assignSchema.ts` |
| 3 | **El formulario:** «Fecha de fin» sale y entra «Semanas» (`NumberStepper`), con su ayuda, el resumen y la aclaración. El body lleva siempre `end_date`. El aviso de solapamiento se muda al pie, junto al botón (4.7) | `features/coach/components/AssignPlanForm.tsx` (y su CSS) |
| 4 | **El resumen:** un componente nuevo (por ejemplo `AssignRangeSummary`) y la función que arma sus textos, con prueba a mano de las fechas (4.5) | `features/coach/components/` y `features/coach/assignRange.ts` (o donde convenga) |
| 5 | **Los textos de 4.8.** Salen los de «Fecha de fin» (4.8, última fila) | los mismos archivos |

`useAssignPlanification`, `AssignOverlapNote` (salvo su lugar) y `UserPlanificationCard` no cambian. **`assignErrors.ts` tampoco**, ni sus textos: traduce los 400 del servidor, y sus ramas de «duración fija», «anterior» y «calendario» siguen hablando del fin porque son lo que diría el backend. Desde este formulario ya no salen (la web manda siempre un `end_date` en el calendario y no anterior al inicio), pero se dejan como están. Los textos que **se van** (4.8) son los del formulario: `AssignPlanForm.tsx` y `assignSchema.ts`.

### 4.2 Cómo queda la pantalla

Después del encabezado, de lo que ya viene elegido y de lo que se elige (todo como hoy), el formulario, **en este orden**:

1. **«Fecha de inicio»** y **«Semanas»**, lado a lado (`Columns`), cada uno con su error debajo.
2. La ayuda **«El plan dura N semanas.»** (4.3).
3. El **resumen** (4.5), solo si el inicio y las semanas son válidos.
4. **«La semana 1 es la de lunes a domingo que contiene el inicio.»** Sigue siempre, haya o no resumen.
5. **«Nota del coach»**, como hoy (hasta 100 caracteres, «Opcional. La ve el alumno.»).
6. El error del servidor (`failed`), como hoy.
7. El **aviso de solapamiento**, si lo hay, y **el botón** (4.7).

Mobile-first (hasta 560 px) y escritorio (desde 960 px), con los tokens y la tipografía de siempre: el formulario es una columna angosta (`.narrow`, 540 px) en todos los anchos, como hoy.

### 4.3 «Semanas»

- **Control:** el `NumberStepper` de `shared/ui`, igual que «Duración (semanas)» de `PlanForm`, dentro de un `Controller` de react-hook-form: `min={1}`, `max={PLAN_WEEKS_MAX}`, `label="semanas"` (se anuncian «Disminuir semanas» y «Aumentar semanas») y `placeholder="Ej: 8"`. `−` se apaga en 1 y `+` en el tope. Desde el campo vacío, `+` arranca en 1.
- **Precarga:** `String(plan.duration)` si la duración es mayor que 0; si es 0, vacío (4.6). El formulario ya va con `key` por alumno y planificación: al cambiar alguno, vuelve a arrancar en la duración.
- **Tope:** `PLAN_WEEKS_MAX` (52, de `features/catalog/planSchema.ts`): **el mismo tope técnico del editor de planificación**. No es del contrato; es para que el rango sea manejable. Si se escribe más, el campo toma el tope, como en `PlanForm` (su `capped`: más que el tope → el tope; hoy es local de `PlanForm.tsx`, se exporta o se repite la línea).
- **Validación** (el texto es lo que hay escrito en el campo; vacío y los inválidos no tienen resumen):

| Lo escrito | Error |
|---|---|
| Nada (o solo espacios) | «Indicá cuántas semanas dura» |
| 0, un decimal (`1,5`), un texto (`abc`) o un negativo | «Poné un número entero de semanas, de 1 en adelante» |
| Un entero de 1 a 52 | Sin error |

  `parseCount` (`features/catalog/planRoutines.ts`) ya lee «el entero de 1 en adelante, o 0 si está vacío o no lo es»: sirve para la validez.
- **Cuándo se muestran los errores:** al salir del campo o al tocar «Asignar planificación», y desde ahí en más se actualizan al escribir. Con react-hook-form: `mode: 'onTouched'`. El resumen, en cambio, sigue siempre a lo escrito. «Fecha de inicio» vacía: «Elegí el día de inicio», como hoy.

### 4.4 El fin

- `end_date = defaultEndDate(start_date, weeks)` = `addDays(mondayOf(start), 7 × weeks − 1)`: el domingo de la semana `weeks`, contando como semana 1 la de lunes a domingo que contiene el inicio. Con un inicio de miércoles, la semana 1 es la de ese miércoles: el fin sigue siendo el mismo domingo que con el lunes de esa semana.
- **Un fin fuera del calendario da error.** Solo pasa con un inicio en el año 9999: el fin caería en el año 10000, que `isCalendarDay` no acepta. El error va debajo de «Semanas» y no hay resumen: **«Con ese inicio el fin queda fuera del calendario: poné menos semanas o un inicio anterior»**. Un inicio que ya no es un día válido (año de 5 dígitos, `2026-02-30`) sigue dando «Elegí el día de inicio».
- **El body lleva siempre `end_date`**, con el domingo del resumen: ni vacío ni sin la clave. Ver 4.1, fila 1.

### 4.5 El resumen

Debajo de las ayudas, siempre presente en el DOM como región `role="status"` (un lector de pantalla oye los cambios), con contenido **solo si el inicio y las semanas son válidos y el fin está en el calendario**. Sin eso, está vacío y no se ve.

**Primera línea: el rango.** «Del {inicio} al {fin}», con cada fecha como «lun 9 nov»: día de la semana abreviado en minúscula (`dom`, `lun`, `mar`, `mié`, `jue`, `vie`, `sáb`), el día y el mes abreviado en minúscula (`ene`… `dic`). Es la `formatWeekdayDate` de `shared/lib/dates.ts` en minúscula. El **inicio** es el que se eligió (no el lunes de esa semana). El **año** se agrega a la fecha que no es del año en curso: «Del jue 31 dic al dom 3 ene 2027» (vetable, 4.10).

**Segunda línea: qué pasa si las semanas no son las del plan.** Solo si la duración del plan `D` es mayor que 0 y las semanas elegidas `N` son distintas de `D`:

| Caso | Texto |
|---|---|
| `N` = `D` + 1 | «La semana {D+1} no tiene rutinas: el alumno la ve vacía.» |
| `N` = `D` + 2 | «Las semanas {D+1} y {N} no tienen rutinas: el alumno las ve vacías.» |
| `N` ≥ `D` + 3 | «Las semanas {D+1} a {N} no tienen rutinas: el alumno las ve vacías.» |
| `N` < `D` | «El alumno ve hasta la semana {N}.» |
| `N` = `D`, o `D` = 0 | Sin segunda línea |

Ejemplo con un plan de 2 semanas y un inicio el lunes 9 de noviembre de 2026 (con el miércoles 11 pasa lo mismo, y el rango arranca en «mié 11 nov»):

| Semanas | Resumen |
|---|---|
| 1 | «Del lun 9 nov al dom 15 nov» y «El alumno ve hasta la semana 1.» |
| 2 | «Del lun 9 nov al dom 22 nov» |
| 3 | «Del lun 9 nov al dom 29 nov» y «La semana 3 no tiene rutinas: el alumno la ve vacía.» |
| 4 | «Del lun 9 nov al dom 6 dic» y «Las semanas 3 y 4 no tienen rutinas: el alumno las ve vacías.» |
| 5 | «Del lun 9 nov al dom 13 dic» y «Las semanas 3 a 5 no tienen rutinas: el alumno las ve vacías.» |

### 4.6 Duración 0

Un plan sin duración fija ya no se crea desde la web (CU-E-09), pero puede haber uno en la base y el backend sigue resolviéndolo. Con duración 0:

- **«Semanas» arranca vacío** y es obligatorio: con el campo vacío, «Indicá cuántas semanas dura», y no se asigna.
- La ayuda dice **«Este plan no tiene duración fija: indicá cuántas semanas dura.»**
- Con semanas válidas, el resumen tiene solo el rango, sin segunda línea.
- Se va el viejo «Este plan no tiene duración fija: indicá hasta cuándo dura.»

### 4.7 El aviso de solapamiento

Es lo de hoy (`AssignOverlapNote`, `readOverlapping`, `confirm_overlap`), con **tres cambios**:

1. **Va al pie del formulario, justo encima del botón**, después de la nota y del error del servidor, y no antes de «Fecha de inicio». Entre el aviso y el botón no hay nada. Así, quien toca «Asignar» lo ve sin subir ni bajar (el hallazgo de MAR-07).
2. **El botón «Asignar igual» queda pegado al aviso, y los dos quedan a la vista.** Al llegar el 409 el botón cambia de texto y el aviso aparece encima. Como el aviso empuja el botón hacia abajo, si no entran en pantalla se hace scroll hasta ellos (por ejemplo, `scrollIntoView({ block: 'center' })` sobre el pie del formulario, con el aviso, las tarjetas y el botón, sin animación). El foco se queda en el botón. El aviso sigue siendo `role="alert"`.
3. **El aviso es de las fechas con las que se pidió:** si cambia el inicio **o las semanas**, se va y el botón vuelve a «Asignar planificación» (antes la clave era `inicio|fin`; ahora, `inicio|semanas`). Al volver a lo de antes no reaparece hasta que se asigna de nuevo.

Los textos, las tarjetas de las que se pisan con «Quitar» (CU-E-14), su confirmación y «Asignar igual» con `confirm_overlap: true` **no cambian**.

### 4.8 Textos

| Dónde | Texto |
|---|---|
| Campo | «Semanas» |
| Stepper (nombre accesible de los botones) | «Disminuir semanas» y «Aumentar semanas» |
| Ayuda | «El plan dura N semanas.» («El plan dura 1 semana.» con una) |
| Ayuda, duración 0 | «Este plan no tiene duración fija: indicá cuántas semanas dura.» |
| Resumen, rango | «Del lun 9 nov al dom 29 nov» (4.5) |
| Resumen, de más | «La semana 3 no tiene rutinas: el alumno la ve vacía.», «Las semanas 3 y 4 no tienen rutinas: el alumno las ve vacías.» y «Las semanas 3 a 5 no tienen rutinas: el alumno las ve vacías.» |
| Resumen, de menos | «El alumno ve hasta la semana N.» |
| Aclaración (sigue) | «La semana 1 es la de lunes a domingo que contiene el inicio.» |
| Error, vacío | «Indicá cuántas semanas dura» |
| Error, inválido | «Poné un número entero de semanas, de 1 en adelante» |
| Error, fin fuera del calendario | «Con ese inicio el fin queda fuera del calendario: poné menos semanas o un inicio anterior» |
| Error, inicio | «Elegí el día de inicio» (como hoy) |
| Botón | «Asignar planificación» y, con el aviso, «Asignar igual» (como hoy) |
| **Se van** (del formulario: `AssignPlanForm.tsx` y `assignSchema.ts`; los de `assignErrors.ts` se quedan, 4.1) | «Fecha de fin (opcional)», «Fecha de fin», «Sin fecha de fin, termina el domingo …, al cerrar la semana N del plan.», «Este plan no tiene duración fija: indicá hasta cuándo dura.», «El fin no puede ser anterior al inicio» y «Elegí un día de fin válido» |

Los demás textos (el toast «<plan> asignada a <alumno> · del … al …», el aviso de solapamiento, «Nota del coach» y su ayuda) no cambian.

### 4.9 Cómo se verifica

- Los chequeos de siempre del web: `npm run typecheck`, `npx eslint src`, `npm run build` y `npx prettier --check src`.
- **En el navegador (Chromium, 390 px y escritorio), con DevTools › Network filtrado por `planification`,** desde la planificación y desde el alumno. Hay que ver:
  - que «Semanas» arranque en la duración del plan, con «El plan dura N semanas.», y que no haya «Fecha de fin» ni «Fecha de fin (opcional)»;
  - el resumen: el rango con el domingo correcto para un inicio en lunes, en miércoles y en domingo; y que se recalcule al cambiar el inicio y al cambiar las semanas (con los botones − y + y escribiendo);
  - las tres variantes de «de más» (1, 2 y 3 o más semanas), «de menos» y «igual a la duración», con un plan de 2 o más semanas;
  - un rango que cruza de año (inicio a fines de diciembre): el año en la fecha que no es del año en curso;
  - vacío, 0, `1,5` y `abc`: los errores y **ningún request ni resumen**; con 60 el campo toma 52, `+` se apaga en 52 y `−` en 1; `+` desde vacío arranca en 1;
  - un inicio vacío («Elegí el día de inicio») y, en un doble local, un inicio de fines de 9999 con pocas semanas (el error del calendario);
  - que **el body siempre tenga `end_date`** (el domingo del resumen), también al dejar las semanas como vienen, y nunca la clave sin valor;
  - la duración 0, con un plan así en el doble local (el contrato lo permite; la web ya no los crea);
  - el solapamiento: asignar dos veces con las mismas fechas; el aviso aparece **justo encima del botón** sin tener que hacer scroll a 390 px; cambiar el inicio o las semanas lo saca; volver no lo trae; «Quitar» (cancelar y confirmar); «Asignar igual» manda `confirm_overlap: true`;
  - que el toast siga diciendo el plan, el alumno y las fechas que guardó el backend;
  - sin scroll horizontal a 390 px con el stepper y con el error más largo.
- Los casos de aceptación son **PRE-03, ASG-01, ASG-04, ASG-05, ASG-12 y ASG-14**; de regresión, **ASG-02, ASG-03, ASG-06, ASG-09 a ASG-11 y MAR-07**. **Sacar los avisos amarillos** de esos casos es de Docs (sección 5).
- Sin tests automáticos nuevos en el repo.

**Qué NO se verifica:** el runtime contra la base de Render con una cuenta real, si no se tiene; ni un lector de pantalla real.

### 4.10 Aclaraciones que el pedido no decía (vetables)

Las fijó la sesión de docs para que el web y el prototipo hagan lo mismo. Si Fran no está de acuerdo con alguna, se cambia acá y en los planes de prueba.

1. **El año del resumen** se agrega a cada fecha que no es del año en curso.
2. **Los textos de «de más»** son tres (una semana, dos y tres o más): el pedido solo daba «no tienen rutinas: el alumno las ve vacías». Con una semana, singular.
3. **El error del calendario** («Con ese inicio el fin queda fuera del calendario: poné menos semanas o un inicio anterior») es texto nuevo: el pedido solo dice que un fin fuera del calendario da error.
4. **Los errores salen al salir del campo o al asignar** (`mode: 'onTouched'`), no al abrir la pantalla, para que con la duración 0 («Semanas» vacío) no arranque con un error.
5. **La ayuda con duración 0** es una versión de «Este plan no tiene duración fija: indicá hasta cuándo dura.».
6. **Sin segunda línea con duración 0:** no hay duración contra la que comparar.
7. **ASG-12 cambió** («inicio hace tres meses, con las 2 semanas que trae»): sin «Fecha de fin» no se puede pedir «un fin hace dos meses».
8. **El prototipo** suma lo que la web ya tiene y no estaba: la entrada desde el alumno, «Quitar» con su confirmación y la rutina puntual de a un alumno. Es solo para poder ver las dos entradas y el solapamiento.

### 4.11 Qué no hacer

- **No tocar el backend** ni pedir un endpoint nuevo.
- **No mandar el body sin `end_date`**, y no dejar el fin ni como campo opcional.
- **No cambiar `AssignRoutineForm`** (la rutina puntual, CU-E-19): solo tiene el día.
- **No cambiar lo que pasa con la duración del plan** al editarla (CU-E-10, ASG-11): es otra decisión.

### 4.12 Después

- En el `PLAN.md` del web, la T61 (o el número que tome) con referencia a este plan.
- Actualizar el Status del web (`Status/estado-implementacion-web.md` y `dashboard-estado-web.html`): CU-E-13 con la T61. La copia en `PowerApp-Docs/Status/` la hace Fran.

---

## 5. Orden

1. **Docs: hecho** el 09/11 (CU-E-13, el prototipo, los dos planes de prueba y este plan).
2. **Web (T61): pendiente,** sin dependencias. Tiene que llegar a Render para cerrar el hallazgo.
3. **Docs:** con la T61 en Render, sacar los avisos amarillos (la constante `T61` y los `kt` y `known` que la usan en Planificaciones; el de PRE-03 en Plan del alumno) y sus líneas en «Antes de empezar»; corregir el número si tomó otro; y volver a correr esos casos. La copia de `Status/` del web la trae Fran.
