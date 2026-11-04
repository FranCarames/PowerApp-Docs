# T55 — Hallazgos HIS-02, HIS-01, ERR-04 y ERR-03 de Pruebas del detalle del alumno: el historial de entrenamientos como pantalla · Plan

> **Numeración.** Fran le asignó a este cambio la **T55** del web. Ojo: el [plan de la biblioteca de ejercicios del entrenador](2026-11-04-hallazgo-rut-02-biblioteca-del-entrenador-plan.md) (hallazgo RUT-02) también se anotó como T55, con sus avisos en «Pruebas del panel y la navegación» y «Pruebas de wiki y temporizador». Son pantallas distintas y no se pisan, pero cada tarea lleva su número: si en el `PLAN.md` del web la T55 ya es la biblioteca, este cambio toma el siguiente número libre y se corrige acá, en la spec y en la constante `T55` del plan de pruebas.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** En el repo del web los cambios quedan **stageados** y el usuario revisa y commitea.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación del web es `typecheck`, `eslint src`, `build` y `prettier --check`, más el navegador (sección 4.6).
> 3. **No se levanta el server de producción ni se instala nada** sin pedirlo.
>
> **Este plan es de diseño:** lo escribió la sesión de docs el 4/11. Lo lee la sesión del **web** (sección 4). **No hay parte del backend** (sección 3).

**Fuente:** la tanda 5 (4/11) de [Pruebas del detalle del alumno](../../Tests/Detalle%20del%20alumno/Pruebas%20del%20detalle%20del%20alumno.html).
**Diseño:** la [spec](../specs/2026-11-04-historial-de-entrenamientos-design.md), que **manda en los textos y las reglas**, y el [prototipo](../../UI%20Front/powerapp-prototype-web.html) (como entrenador: Lucía Méndez › Historial de entrenamientos, ruta `#/c-hist`), como referencia visual.
**Modelo:** sin cambios. **Contrato del backend:** sin cambios. **CU:** CU-E-06 y CU-E-07 reescritos. **Roadmap del backend:** sin cambios; no hay fila BE.

**Goal:** que el historial de entrenamientos del alumno deje de ser un modal y pase a ser una pantalla propia, `/c/alumnos/:id/historial`, con un resumen, las sesiones por semana del mes, un calendario y, al filtrar por un ejercicio, su detalle con la progresión de los RMs.

---

## 1. Los hallazgos

| # | Hallazgo (tanda 5) | Gravedad | Lo que anotó Fran | Casos del plan de pruebas | CU | Qué se decidió |
|---|---|---|---|---|---|---|
| 1 | **HIS-02** · Las sesiones | 1 · Grave | «Se ve muy raro, deberia tener una pantalla completa y estar mucho mejor organizada la informacion. Quizas agregar algun grafico en la parte superior ayude» | **HIS-02** (y HIS-03 a HIS-06), **RES-01 a RES-04** y **CAL-01 a CAL-05** | [CU-E-06](../../Use%20Cases/entrenador/CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md), pasos 1 a 9 | Una pantalla propia con dos pestañas: Sesiones (resumen, gráfico del mes y la lista agrupada por semana) y Calendario (los días con su intensidad y lo que hizo el día elegido). Spec, D52 a D55 y secciones 5 a 7 |
| 2 | **HIS-01** · Sin historial | 2 · Moderado | «Deberia ser una pantalla completa, para mas detalle ver HIS-02» | **HIS-01** | CU-E-06, camino alternativo «Sin historial» | El estado vacío va en la pantalla, sin pestañas, resumen ni filtro. Spec, 5.2 |
| 3 | **ERR-04** · Teclado y lector de pantalla | 3 · Leve | «Mas detalle en HIS-02 / Deberia ser una pantalla completa, actualmente es muy confusa» | **ERR-04** | CU-E-06 y CU-E-07 | Sin modal no hay trampa de foco. Pestañas con flechas, tarjetas con `aria-expanded`, gráficos y días con texto alternativo con sus números, y el foco en la fila de la ficha al volver. Spec, sección 11 |
| 4 | **ERR-03** · Celular y escritorio | 4 · Diferido | Sin nota | **ERR-03** | — | Es la misma pantalla: en escritorio, el historial salía en un modal de 460 px. Desde 960 px, dos columnas, con la izquierda fija al hacer scroll. Spec, sección 10 |

**El filtro por ejercicio** ([CU-E-07](../../Use%20Cases/entrenador/CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md)) cambia por arrastre: deja de ser un selector que achica la lista y pasa a abrir el detalle del ejercicio (D56). Lo prueban **FIL-01 a FIL-03** y **EJE-01 a EJE-06**.

**Efecto en el plan de pruebas** (ya aplicado, solo los datos: `GROUPS`, `CASES` y «Antes de empezar»):

- **Cambian, con el mismo id** (cambia la pantalla, no el sentido del caso): **FCH-01** (la fila del historial navega y tiene subtítulo), **HIS-01 a HIS-06**, **FIL-01 a FIL-03** (los chips y «Otro…»), **ERR-03** (el historial ya no es un modal; en escritorio, dos columnas) y **ERR-04** (la accesibilidad de la spec).
- **Grupos nuevos,** en este orden: his, **res** («Resumen y gráfico», CU-E-06), **cal** («Calendario», CU-E-06), fil, **eje** («Detalle de un ejercicio», CU-E-07), err y cie.

| Caso | Qué prueba |
|---|---|
| RES-01 | El mes actual y el anterior con sus flechas, el subtítulo (con y sin promedio) y el `?mes` de la URL |
| RES-02 | Una semana que cruza de mes aparece en los dos, completa y con el mismo número |
| RES-03 | Las semanas futuras: punteadas, sin número y sin poder tocarse |
| RES-04 | «Ver semanas anteriores» y tocar una barra: la lista se abre hasta esa semana y la resalta |
| CAL-01 | La pestaña Calendario (`?vista=calendario`), su resumen con la racha y la intensidad de cada día |
| CAL-02 | Elegir un día: hoy de entrada, un día con sesiones y uno vacío |
| CAL-03 | Un día con parte de una sesión: «· empezó el …» |
| CAL-04 | El mes anterior: su último día entrenado y el mismo mes en las dos pestañas |
| CAL-05 | Un mes sin entrenamientos, entre dos con datos |
| EJE-01 | Los números del detalle (Veces, Última vez y RM actual) y la vuelta con «Todo el historial» y «atrás» |
| EJE-02 | La progresión con 3 RMs, uno de ellos de 3 repeticiones |
| EJE-03 | Un solo RM |
| EJE-04 | Sin RMs |
| EJE-05 | «Veces en <mes>» y su `?mes` |
| EJE-06 | Las notas y las sesiones del ejercicio |

- **Los datos cubren más de un mes:** RES-01 y CAL-05 le asignan a QA Detalle la rutina puntual en tres días pasados (P1 y P2 del mes anterior, P3 de hace tres meses) y QA Detalle los marca con «Lo hice otro día». Para EJE, QA Detalle registra RMs desde Mis RMs (EJE-01), y **CIE-01** los borra al final. Lo dice «Antes de empezar».
- **Todos los casos nuevos y los que cambian** llevan el aviso amarillo `kt: 'Hoy falla.'` con «Lo arregla la T55 (web): hoy el historial es un modal de 460 px. Marcalo Falla mientras tanto.» (una constante `T55`). **CIE-01** cambió solo para borrar esos RMs y no lleva aviso: hoy funciona.

**Efecto en la tanda anterior:** los ids se conservan, así que los resultados cruzan. HIS-01, HIS-02, ERR-03 y ERR-04 siguen en Falla hasta que la T55 esté en Render. Los que estaban en Funciona (FCH-01, HIS-03 a HIS-06 y FIL-01 a FIL-03) ahora esperan otra pantalla: hay que volver a marcarlos. RES, CAL y EJE arrancan sin probar.

---

## 2. Contrato (sin cambios)

La pantalla usa dos lecturas que ya existen. **Todo lo demás se calcula en el front** (spec, sección 9).

| Endpoint | Para qué | Roles |
|---|---|---|
| `GET /routine/history/{userId}` | La fila de la ficha, la pestaña Sesiones, el calendario, los chips y «Los que hizo el alumno» | coach, admin |
| `GET /routine/history/{userId}?exercise_id=` | El detalle de un ejercicio | coach, admin |
| `GET /user_rm/user/{id}` | La progresión del RM y el RM actual | user (solo el propio), coach y admin: **ya habilitado** desde BE-02 |

- **Siguen** las dos que ya usaba: `GET /exercise/all` («Otros del catálogo», como el selector de la T43) y la consulta del alumno que usa la ficha (para el nombre del encabezado).
- **El historial** ya llega entero y ordenado (BE-16 y BE-20d; §5.9 de la [spec del 20/10](../specs/2026-10-20-asignar-planificaciones-design.md)): cada sesión con `source`, `date` (día), `routine`, la del plan con `planification { id, name | null }` y `week`, y `exercises[]` con `exercise { id, name }`, `user_note`, `finished_at` (día) y `sets`. Con `exercise_id`, cada sesión trae solo ese ejercicio y, la del plan, la fecha del día en que lo hizo.
- **Los RMs** traen `exercise_id`, `weight`, `reps` y `date` (día), desde BE-05.
- **Lo que se calcula en el front:** las semanas y los meses, el resumen, el gráfico, el calendario y su intensidad, la racha, los ejercicios que más hizo y sus veces, el buscador, la fecha de cada vez, la progresión del RM y el RM actual.

---

## 3. Backend

**No hay trabajo.** No hay tarea BE-NN ni fila nueva en el [roadmap del backend](2026-10-16-roadmap-backend.md). Si al implementar la web apareciera algo que el backend no da, se avisa acá y se abre una tarea; con lo de la sección 2 alcanza.

---

## 4. Web (T55)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de:** nada; el backend ya está. **Estado: pendiente.**

### 4.1 Rutas y parámetros de la URL

| URL | Qué muestra |
|---|---|
| `/c/alumnos/:id/historial` | Nueva. La pestaña Sesiones, en el mes actual |
| `…?vista=calendario` | La pestaña Calendario. Sin el parámetro (o con otro valor), Sesiones |
| `…?mes=AAAA-MM` | El mes de las dos pestañas y de «Veces en …». Sin él o mal formado, el mes actual; fuera del rango, el extremo más cercano |
| `…?ejercicio=<id>` | El detalle de ese ejercicio (`exercise.id`, el del catálogo) |

- **Historial del navegador:** cambiar de pestaña o de mes usa `replace`; entrar desde la ficha y abrir un ejercicio, `push`. «Todo el historial» hace `back` si el detalle se abrió desde la lista y, si no, `replace` con la lista. «Volver» lleva a `/c/alumnos/:id`.
- **No van en la URL:** el día elegido, las tarjetas abiertas, las semanas que se ven, la semana resaltada y el buscador.
- La ruta tiene la misma guarda de rol que el resto de `/c/*`, y la barra lateral marca Alumnos.
- Detalle en la spec, sección 3.

### 4.2 Qué se reemplaza

- **`StudentHistoryModal`** (T43) **se borra**, con su selector «Filtrar por ejercicio» y lo que sea solo suyo. No queda como alternativa.
- **La fila «Historial de entrenamientos» de la ficha** deja de abrir el modal: pasa a ser un link a la pantalla, con el subtítulo y el mini gráfico (spec, sección 4). **La ficha pide el historial al cargar,** con la misma clave de consulta que la pantalla, así entrar no lo repite mientras esté fresco.
- **Se reutiliza** de la T43 lo que no es del modal: las consultas del historial (con y sin `exercise_id`), la de los RMs del alumno y la del catálogo; el formato de la prescripción («3×8 · 60 kg»); el texto del aviso; y los bloques de carga y de error.
- **Los modales de RMs y de pagos no cambian.**

### 4.3 La pantalla

Todo está en la spec, con sus textos entre «»: el encabezado y el estado vacío (5), la pestaña Sesiones (6), Calendario (7), el detalle de un ejercicio (8), celular y escritorio (10), accesibilidad (11) y carga y errores (12). **No hay textos fuera de los de la spec.** Las clases y los tamaños de referencia están en el prototipo (`.hcols`, `.hleft`, `.hb`, `.hcal`, `.rmc`).

### 4.4 Qué se calcula en el front

| Qué | Regla |
|---|---|
| Fechas como días, sin pasar por UTC; fecha corta, relativa y rango de semana | Spec 9.1 |
| Fecha de una sesión, semanas completas y semanas de un mes | Spec 9.2 |
| Los meses que se pueden ver | Spec 9.3 |
| El resumen (Sesiones, Última, Esta semana) | Spec 6.1 |
| Las barras del mes y su subtítulo, y la escala | Spec 6.2 y 9.6 |
| La intensidad de cada día y el resumen del mes | Spec 7.1, 7.2 y 9.4 |
| La racha actual | Spec 9.5 |
| Las veces, los 3 ejercicios que más hizo y el buscador | Spec 6.3 y 9.7 |
| La fecha de cada vez, las notas, la progresión y el RM actual del detalle | Spec 8 y 9.8 |

**Sugerencia:** que estos cálculos sean funciones puras en un módulo aparte, sin React, que reciban las respuestas y «hoy». Así se pueden revisar a mano con los datos de ejemplo del prototipo (`HSPEC` y `ARMS`) sin depender de la fecha real.

### 4.5 Lo que el diseño no fijaba (vetable)

El artboard dejó abiertas algunas cosas que la spec cierra así. Si Fran prefiere otra, se cambia en la spec y acá:

1. **El subtítulo de la fila** mientras carga o si la lectura falla: «Sesiones y ejercicios hechos». Sin sesiones: «Todavía no registra entrenamientos».
2. **La escala de las barras:** el mayor entre 4 (3 en «Veces en …») y la semana más alta. El artboard usaba 4 fijo, que con 5 sesiones se pasaba.
3. **El rango de meses** arranca en el mes del día más viejo del historial (una sesión o un ejercicio hecho), no en el de un RM.
4. **Una sesión con fecha futura** (una rutina puntual de un día que todavía no llegó, que el alumno ya marcó): la lista arranca en su semana y «Última» muestra la fecha corta.
5. **Las fechas de otro año** suman el año: «28 dic 2025».
6. **La píldora de la diferencia,** negativa, va en gris («−5 kg»); el artboard solo mostraba subidas.
7. **Las etiquetas de los puntos** llevan «kg» y, con más de una repetición, «× N». En el artboard eran solo el número.
8. **«Notas del alumno»** muestra todas las notas del ejercicio (en el artboard, una por sesión).
9. **El foco:** a la otra flecha si la tocada se deshabilita; al título al abrir el detalle o volver de él; al título de la semana al tocar una barra. Y el cambio de mes se anuncia (`aria-live`).
10. **«Todo el historial»** se comporta como «atrás» (sección 4.1).

### 4.6 Cómo se verifica

1. `npm run typecheck`, `npx eslint src`, `npm run build` y `npx prettier --check src`.
2. **En el navegador,** con una cuenta real de entrenador, contra Render o el backend local, **a 390 px y a 1280 px** (y a 959 y 960 px para el corte de las dos columnas), con Network abierto filtrado por `history` y `user_rm`. Del plan de pruebas, en este orden, porque los datos se van sumando (ver «Antes de empezar»): **FCH-01**, **HIS-01 a HIS-06**, **RES-01 a RES-04**, **CAL-01 a CAL-05**, **FIL-01 a FIL-03**, **EJE-01 a EJE-06**, **ERR-03** y **ERR-04**.
3. **Regresión:** RMS-01 a RMS-04, PAG-01 a PAG-04, ERR-01 y ERR-02 (los modales que quedan) dan lo mismo que en la tanda 5.
4. **Requests:** `GET /routine/history/{id}` sale al cargar la ficha y la pantalla lo reutiliza; el detalle pide `?exercise_id=` y `GET /user_rm/user/{id}`. No sale ningún endpoint nuevo.
5. **Sacar los avisos amarillos es de Docs** (sección 5).

### 4.7 Qué no hacer

- **No tocar el backend** ni pedir endpoints o agregados nuevos, y no paginar el historial (D58).
- **No graficar el peso prescripto** en ningún lado (D57): la progresión sale solo de los RMs.
- **No dejar el modal** como alternativa ni como vista «compacta».
- **No llevar a la URL** el día elegido, las tarjetas abiertas ni el buscador.

### 4.8 Después

- Actualizar el Status del web (`Status/estado-implementacion-web.md` y `dashboard-estado-web.html`): CU-E-06 y CU-E-07 con la T55 (la pantalla `/c/alumnos/:id/historial` en lugar del modal). La copia en `PowerApp-Docs/Status/` la hace Fran a mano.
- En `PLAN.md` del web, la T55 con referencia a este plan.

---

## 5. Orden

**Solo la web:** el backend no cambia.

1. **Docs: hecho** el 4/11 (spec, CU-E-06, CU-E-07, el plan de pruebas, el prototipo y este plan).
2. **Web (T55): pendiente,** sin dependencias. Tiene que llegar a Render para cerrar los hallazgos.
3. **Docs:** con la T55 en Render, sacar los avisos amarillos del plan de pruebas (la constante `T55` y los `kt`/`known` de FCH-01, HIS, RES, CAL, FIL, EJE, ERR-03 y ERR-04) y la línea «Lo que se sabe que hoy falla» de «Antes de empezar», y volver a correr esos casos.
