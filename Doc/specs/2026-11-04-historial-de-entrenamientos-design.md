# Spec — El historial de entrenamientos como pantalla (CU-E-06, CU-E-07)

> **Fecha:** 2026-11-04 · **Tarea:** **T55** (web), del [plan del cambio](../plans/2026-11-04-historial-de-entrenamientos-plan.md) · **Estado:** diseño elegido por Fran el 4/11 (artboard de Claude Design «PowerApp · Historial de entrenamientos»: pestaña Sesiones, pestaña Calendario, detalle de un ejercicio y sin historial, en celular y en escritorio).
> **Nace de:** cuatro hallazgos de la tanda 5 (4/11) de [Pruebas del detalle del alumno](../../Tests/Detalle%20del%20alumno/Pruebas%20del%20detalle%20del%20alumno.html): **HIS-02** (grave), **HIS-01**, **ERR-04** y **ERR-03**.
> **Reemplaza** el modal del historial de la T43 (`StudentHistoryModal`). **El backend no cambia:** todo sale de dos lecturas que ya existen (sección 13).

## 1. Por qué cambia

| Caso | Gravedad | Lo que anotó Fran |
|---|---|---|
| **HIS-02** · Las sesiones | 1 · Grave | «Se ve muy raro, deberia tener una pantalla completa y estar mucho mejor organizada la informacion. Quizas agregar algun grafico en la parte superior ayude» |
| **HIS-01** · Sin historial | 2 · Moderado | «Deberia ser una pantalla completa, para mas detalle ver HIS-02» |
| **ERR-04** · Teclado y lector de pantalla | 3 · Leve | «Mas detalle en HIS-02 / Deberia ser una pantalla completa, actualmente es muy confusa» |
| **ERR-03** · Celular y escritorio | 4 · Diferido | Sin nota. Es la misma pantalla: en escritorio, el historial sale en un modal de 460 px |

Hoy el historial es un modal que se abre desde la ficha del alumno: un selector «Filtrar por ejercicio» y la lista de sesiones. Con unas semanas de entrenamiento la lista se hace larga, no hay forma de ver de un vistazo cuánto y cuándo entrena el alumno, y el filtro cambia la lista por otra igual de larga. Los cuatro hallazgos piden lo mismo: **una pantalla propia, con la información mejor organizada y un gráfico arriba.**

## 2. Decisiones

Tomadas con Fran el 4/11, al elegir el diseño. La numeración sigue la de la [spec de las rutinas del plan por semana](2026-10-31-planificacion-por-semanas-design.md) (D51).

| # | Decisión | Por qué |
|---|---|---|
| D52 | **El historial es una pantalla, `/c/alumnos/:id/historial`.** La fila de la ficha navega ahí y el modal desaparece | Es lo que piden HIS-01, HIS-02 y ERR-04. Una pantalla tiene lugar para un resumen y un gráfico, y se recorre con el teclado como cualquier otra, sin un modal que atrape el foco |
| D53 | **Dos vistas en pestañas, «Sesiones» y «Calendario», que muestran el mismo mes.** La vista y el mes van en la URL | Contestan dos preguntas distintas: cuánto entrena por semana y qué días. Con el mismo mes en las dos, cambiar de pestaña no desorienta; en la URL, se puede volver y compartir |
| D54 | **Las semanas son completas, de lunes a domingo, y cada sesión cuenta en la semana de su fecha** (la de CU-E-06, paso 3). Una semana que cruza de mes aparece en los dos meses, con todas sus sesiones | Cortar la semana en el borde del mes daría barras chicas sin motivo y dos números distintos para la misma semana. La fecha de la sesión es la que ya ordena la lista |
| D55 | **El calendario mide ejercicios hechos por día (`finished_at`), no sesiones** | Una sesión del plan se puede hacer en varios días (D25 y D26 de la [spec del 20/10](2026-10-20-asignar-planificaciones-design.md)): el día de cada ejercicio es lo único que dice qué días entrenó |
| D56 | **El filtro por ejercicio abre el detalle de ese ejercicio** (`?ejercicio=`), en lugar de achicar la lista | Filtrar es preguntar por un ejercicio. El detalle contesta con números, la progresión del RM, las veces por semana, las notas y las sesiones |
| D57 | **La progresión sale de los RMs que registró el alumno (los de CU-E-04). Nunca se grafica el peso prescripto** | El modelo no registra la carga real (D7): la prescripción es la vigente y no dice cuánto levantó. Graficarla mostraría un progreso que no existe |
| D58 | **Todo lo demás se calcula en el front,** con las dos lecturas de siempre. Sin endpoints nuevos ni paginación | El historial de un alumno es chico (decenas de sesiones) y ya llega entero; los cálculos son sumas y agrupaciones por día. Tocar el backend no aporta nada hoy |

## 3. Rutas y URL

| URL | Qué muestra |
|---|---|
| `/c/alumnos/:id/historial` | La pestaña Sesiones, en el mes actual |
| `…?vista=calendario` | La pestaña Calendario |
| `…?mes=AAAA-MM` | El mes de las dos pestañas y de «Veces en …» del detalle |
| `…?ejercicio=<id>` | El detalle de ese ejercicio. El id es el del catálogo (`Exercise.id`, el `exercise.id` del historial) |

- Sin `vista`, o con cualquier otro valor, es Sesiones. Sin `mes`, o con uno mal formado, es el mes actual; uno fuera del rango (9.3) se lleva al extremo más cercano.
- Se combinan: el detalle conserva `vista` y `mes`, y «Todo el historial» vuelve con los dos como estaban.
- **Cambiar de pestaña o de mes reemplaza la entrada del historial del navegador** (`replace`). **Entrar desde la ficha y abrir el detalle de un ejercicio agregan una** (`push`): «atrás» del navegador vuelve del detalle a la lista y, de la lista, a la ficha.
- **«Todo el historial» hace lo mismo que «atrás»** cuando el detalle se abrió desde la lista (`back`). Si se entró al detalle por un link o recargando la página, reemplaza la entrada con la lista (`replace`).
- **No van en la URL:** el día elegido del calendario, las tarjetas abiertas, cuántas semanas se ven, la semana resaltada y el buscador. Al volver del detalle de un ejercicio, el día elegido es el de por defecto (7.3).
- La ruta tiene la misma guarda de rol que el resto de `/c/*`.

## 4. La fila de la ficha

- «Historial de entrenamientos» pasa a ser **un link a la pantalla** (ya no abre un modal), con el mismo ícono y la flecha.
- **Subtítulo:**
  - con sesiones: «N sesiones · la última, <hoy | ayer | hace N días | fecha corta>» (9.1). Por ejemplo, «39 sesiones · la última, hoy» o «1 sesión · la última, 28 oct»;
  - sin sesiones: «Todavía no registra entrenamientos»;
  - mientras carga, o si la lectura falla: «Sesiones y ejercicios hechos». La fila navega igual y el error se ve en la pantalla.
- **Mini gráfico,** solo con sesiones, a la derecha y antes de la flecha: 8 barras finas (5 px de ancho, 26 px de alto como máximo), una por semana completa, de la de hace 7 semanas a la actual. Cada barra apila Plan (violeta, abajo) e Individual (naranja, arriba), con la escala de 9.6. Es decorativo (`aria-hidden`): lo que importa lo dice el subtítulo.
- **La ficha pide el historial al cargar** (`GET /routine/history/{id}`, para el subtítulo) y la pantalla comparte esa consulta (la misma clave de caché): si todavía está fresca, entrar no la repite.

## 5. La pantalla

### 5.1 Encabezado

«Volver» (lleva a la ficha, `/c/alumnos/:id`), el nombre del alumno como eyebrow y el título «Historial de entrenamientos». El nombre sale de la misma consulta del alumno que usa la ficha.

### 5.2 Sin historial

Si el alumno no tiene ninguna sesión: un bloque punteado con el ícono de lista, «Todavía no registra entrenamientos» y «Cuando el alumno marque ejercicios como hechos, sus sesiones van a aparecer acá.». Sin pestañas, resumen, gráfico ni filtro.

### 5.3 Pestañas

«Sesiones» (ícono de lista) y «Calendario» (ícono de calendario), en un control segmentado debajo del título; en escritorio, del ancho de la columna izquierda (hasta 380 px). Se entra por Sesiones, salvo que la URL diga otra cosa.

## 6. Pestaña Sesiones

En el celular, en este orden: resumen, gráfico del mes, filtro, aviso y lista. En escritorio, los tres primeros a la izquierda y el aviso con la lista a la derecha (sección 10).

### 6.1 Resumen

Tres tarjetas: **«Sesiones»** (el total), **«Última»** (la fecha de la sesión más nueva, relativa: «Hoy», «Ayer», «Hace 3 días» o «28 oct») y **«Esta semana»** (las sesiones con fecha en la semana actual). Un valor de más de 6 caracteres («Hace 3 días») baja de 22 a 15 px.

### 6.2 Gráfico «Sesiones de <mes>»

- Tarjeta con el título «Sesiones de noviembre» (el mes en minúscula), el subtítulo y, a la derecha, las flechas «Mes anterior» y «Mes siguiente» (botones de 40 px con ese `aria-label`).
- **Una barra por cada semana completa que toca el mes** (9.2): de 4 a 6. Cada barra apila las sesiones del plan (violeta, abajo) y las individuales (naranja, arriba), separadas por una línea de 2 px del color de la pista. Arriba, el total («3»; un 0, en gris). Abajo, el lunes en dos líneas: el día («26») y el mes («oct»).
- **La semana actual** lleva contorno gris claro y su día en blanco. **Las semanas futuras** (las que empiezan después de hoy) van con la pista punteada, sin número, y no se pueden tocar.
- La escala, en 9.6.
- **Subtítulo:** «N sesiones en M semanas · X por semana», donde M son las semanas del gráfico que ya empezaron, N las sesiones de esas semanas y X = N / M con un decimal («2,3 por semana»). En el mes actual, «N sesiones en M semanas, hasta hoy», sin el promedio.
- **Leyenda,** debajo: Plan (cuadrado violeta), Individual (naranja) y, a la derecha, Esta semana (cuadrado con contorno).
- **Las flechas** van del mes de la primera actividad (9.3) al actual; en cada extremo, la del lado que se acabó queda deshabilitada. Cambian `?mes`, así que mueven también el calendario.
- **Tocar una barra** lleva a esa semana en la lista: si está más atrás de las semanas que se ven, la lista se abre hasta ella (como con «Ver semanas anteriores»); la pantalla se desplaza hasta su título, que toma el foco, y la semana queda resaltada con un contorno violeta, en la lista y en la barra (en lugar del gris de la semana actual), hasta que se toque otra barra o se cambie de mes. Se pueden tocar las semanas que van de la de la sesión más vieja a la actual; las anteriores (que dan 0) y las futuras, no.

### 6.3 Filtro por ejercicio

- El título «Filtrar por ejercicio» y una fila de chips: **«Todos»** (marcado en la lista), **los 3 ejercicios que hizo en más sesiones** (9.7; si hizo menos de 3, los que haya) y **«Otro…»**, con una lupa.
- **Tocar un ejercicio abre su detalle** (sección 8). Si el ejercicio abierto no está entre los 3, se suma como cuarto chip, marcado. «Todos» vuelve a la lista.
- **«Otro…»** abre debajo un buscador: el campo «Buscar ejercicio» (placeholder «Sentadilla, remo…») y dos grupos, cada uno por orden alfabético:
  - **«Los que hizo el alumno»,** con «N veces» a la derecha (9.7);
  - **«Otros del catálogo»** (`GET /exercise/all`, sin los que ya hizo), con «Sin registros».
- La búsqueda no distingue mayúsculas ni tildes y encuentra el texto en cualquier parte del nombre. Un grupo sin resultados no se muestra; si no queda ninguno: «No hay ejercicios con ese nombre.».
- Elegir uno cierra el buscador y abre su detalle. Tocar «Otro…» con el buscador abierto lo cierra. Si el catálogo no carga, el buscador muestra solo «Los que hizo el alumno».
- El filtro está en Sesiones y en el detalle de un ejercicio. **No está en Calendario.**

### 6.4 Aviso y lista

- **Arriba de la lista, el aviso de siempre,** con el mismo texto: «Las series son las que prescribió el entrenador en la rutina, tal como está hoy: la app no registra el peso ni las repeticiones que hizo el alumno.».
- **La lista va agrupada por semana completa,** de la actual hacia atrás, hasta la semana de la sesión más vieja. Si hay sesiones con fecha posterior a esta semana (una rutina puntual de un día que todavía no llegó, que el alumno ya marcó), arranca en la semana de la más nueva.
- **Cada semana** tiene su título («Esta semana», «Semana pasada» y, de ahí para atrás, el rango: «19 — 25 oct», o «26 oct — 1 nov» si cruza de mes; ver 9.1) y, a la derecha, «N sesiones». Una semana sin sesiones dice «Sin entrenamientos esta semana.» en un bloque punteado, sin contador.
- **Al entrar se ven 4 semanas.** «Ver semanas anteriores» suma 4 más y desaparece cuando ya se ve la de la sesión más vieja.
- Dentro de cada semana, las sesiones en el orden en que las manda el backend (CU-E-06, paso 3, y «Dos sesiones el mismo día»).
- **Tarjeta de sesión, plegable.** El encabezado es un botón con:
  - a la izquierda, el día («4», grande, en monoespaciada) y el mes («nov») de la fecha de la sesión;
  - en el medio, la rutina; «<planificación> · Semana N» si es del plan (si la planificación no tiene nombre, «Semana N») o «Rutina puntual» si es individual; y «N ejercicios · N notas» (las notas, solo si hay alguna);
  - a la derecha, la píldora «Plan» (violeta) o «Individual» (naranja) y el chevron.
- **La primera de la lista (la más nueva) viene abierta;** las demás, cerradas.
- **Abierta, muestra los ejercicios hechos,** en el orden del backend (por `finished_at` y después por alta), cada uno con:
  - el nombre, subrayado, que abre el detalle del ejercicio;
  - la prescripción a la derecha, con el formato de hoy (los bloques, como «3×8 · 60 kg»);
  - «Hecho el 4 nov» debajo, si lo hizo otro día que la fecha de la sesión;
  - la nota del alumno entre comillas («Me costó»), en un recuadro con el ícono de nota. El prefijo «Nota del alumno:» va solo para el lector de pantalla.

## 7. Pestaña Calendario

En el celular, en este orden: resumen del mes, calendario y el día elegido. En escritorio, los dos primeros a la izquierda y el día a la derecha.

### 7.1 Resumen del mes

**«Días entrenados»** (los días del mes con al menos un ejercicio hecho; con 1, «Día entrenado»), **«Sesiones»** (las sesiones con al menos un ejercicio hecho en un día del mes; con 1, «Sesión») y **«Racha actual»** («3 sem», 9.5; no depende del mes).

### 7.2 Calendario

- Tarjeta con el título «Noviembre 2026» (el mes con mayúscula y el año), el subtítulo «Días en que hizo ejercicios» y las mismas flechas de 6.2 (mismo rango, mismo `?mes`).
- Grilla de lunes a domingo, encabezada por «L M M J V S D». Antes del día 1, huecos vacíos. Cada día es un botón cuadrado (42 px como mínimo) con su número.
- **El color de cada día depende de su intensidad** (9.4): 0, sin relleno y con borde; 1–2, verde al 30 %; 3–4, verde al 62 %; 5 o más, verde pleno con el número oscuro.
- **Hoy** lleva un borde interno blanco; **el día elegido,** contorno violeta. **Los días futuros** quedan apagados (35 %) y deshabilitados.
- Debajo, a la derecha, la leyenda «Menos» ▢ ▢ ▢ ▢ «Más», con los cuatro niveles.

### 7.3 El día elegido

- **Al abrir la pestaña o cambiar de mes:** en el mes actual queda elegido hoy; en otro mes, su último día con ejercicios hechos; si el mes no tiene ninguno, ningún día.
- **Título:** el día con su nombre, «Miércoles 4 de noviembre». **Subtítulo:** «N sesiones · N ejercicios hechos» («1 sesión · 1 ejercicio hecho»).
- **Una tarjeta por cada sesión** con algún ejercicio hecho ese día, en el orden de la lista: la rutina, la misma línea de 6.4, la píldora y **solo los ejercicios hechos ese día**, con el nombre (que abre su detalle), la prescripción y la nota. Estas tarjetas no se pliegan.
- **Una sesión que empezó otro día** (su fecha, la de CU-E-06, no es el día elegido) suma a la línea «· empezó el 2 nov».
- **Un día sin ejercicios:** el título y «Sin entrenamientos ese día.» en un bloque punteado.
- **Sin día elegido** (un mes sin entrenamientos que no es el actual): el título «Tocá un día» y «En este mes no hay entrenamientos.». En el mes actual siempre queda elegido hoy, aunque el mes no tenga nada.
- En esta pestaña no están ni el filtro ni el aviso.

## 8. Detalle de un ejercicio (`?ejercicio=<id>`)

Pide `GET /routine/history/{userId}?exercise_id=<id>` y `GET /user_rm/user/{id}`. En el celular, en este orden: encabezado, resumen, «Progresión del RM», «Veces en <mes>», filtro, notas y sesiones. En escritorio, del resumen al filtro a la izquierda y las notas con las sesiones a la derecha.

### 8.1 Encabezado

«Todo el historial» (vuelve a la lista, con `vista` y `mes` como estaban; ver la sección 3), el eyebrow «<alumno> · Historial de entrenamientos» y el nombre del ejercicio como título. **Sin pestañas.** El nombre sale del historial o, si no lo hizo nunca, del catálogo. Si el id no está en ninguno de los dos: «No encontramos el ejercicio», con «Todo el historial».

### 8.2 Resumen

**«Veces»** (las sesiones en las que lo hizo, 9.7; con 1, «Vez»), **«Última vez»** (la fecha relativa de la vez más nueva, o «—») y **«RM actual»** (el peso del último RM, 9.8, como «85 kg», o «—»).

### 8.3 «Progresión del RM»

- El título y un subtítulo: con 2 RMs o más, «N registros desde el 22 jul»; con 1, «Un solo registro»; sin ninguno, «Sin registros».
- **Con 2 RMs o más:**
  - a la derecha del título, una píldora con la diferencia entre el último y el primero: «+15 kg» en verde; si es negativa, «−5 kg» en gris;
  - una línea violeta con un punto por RM, por orden de fecha, con el eje horizontal proporcional al tiempo; el último punto, más grande;
  - arriba de cada punto, su valor: el peso («72,5 kg») y, si el RM tiene más de una repetición, también las repeticiones («85 kg × 3»);
  - la escala vertical va del peso menor al mayor con un 25 % de margen de cada lado (si son todos iguales, ±1 kg), con una guía punteada a la mitad;
  - debajo, la fecha del primero a la izquierda y la del último a la derecha.
- **Con un solo RM:** su valor, grande («80 kg × 5», o «80 kg» si es de una repetición), y «el 28 oct de 2026».
- **Sin RMs:** «Todavía no tiene RMs de este ejercicio.» en un bloque punteado.
- **Al pie, siempre:** «Sale de los RMs que registró el alumno. Las series del historial son las prescriptas: no dicen cuánto levantó.».
- **Nunca se grafica el peso prescripto.** La tarjeta se muestra aunque el alumno no haya hecho nunca el ejercicio.

### 8.4 «Veces en <mes>»

- Solo si lo hizo al menos una vez. El título «Veces en noviembre», el subtítulo «N veces en estas semanas» («, hasta hoy» en el mes actual) y las mismas flechas y semanas de 6.2 (mismo `?mes`).
- Una barra verde por semana con las veces de esa semana (cada vez cuenta en la semana del día en que lo hizo, 9.7), con el número arriba y el lunes abajo. La semana actual con contorno; las futuras, punteadas y sin número. Estas barras no se tocan. La escala, en 9.6.

### 8.5 Filtro

El de 6.3, con el ejercicio marcado.

### 8.6 «Notas del alumno»

Solo si dejó alguna nota en ese ejercicio. El título y, a la derecha, cuántas son. Una tarjeta por nota, de la más nueva a la más vieja: el texto entre comillas («Me costó») y, debajo, «4 nov · Día A — Empuje» (el día en que lo hizo y la rutina).

### 8.7 «Sesiones»

- El título y, a la derecha, «N sesiones».
- **Una tarjeta por cada sesión en la que lo hizo,** de la más nueva a la más vieja, **fechada el día en que lo hizo** (el `finished_at` más viejo de ese ejercicio en esa sesión; en una individual, no es el `date`): el día y el mes, la rutina, la línea de 6.4 y la píldora. Debajo, **solo ese ejercicio:** «Prescripto», la prescripción y la nota.
- **Si lo hizo más de una vez en la misma sesión,** una fila por vez, cada una con «Hecho el 4 nov» en lugar de «Prescripto», en el orden del backend.
- Se ven 6. **«Ver más sesiones (N)»** suma 6 más; N es cuántas faltan.
- **Si no lo hizo nunca:** en lugar de las notas y las sesiones, «Sin registros para este ejercicio» y «El alumno no hizo **<ejercicio>** en ninguna sesión.». La tarjeta del RM se muestra igual.

## 9. Cálculos

Todo se calcula en el front con las respuestas de la sección 13.

### 9.1 Fechas y textos

- **Las fechas son días sin hora** (`AAAA-MM-DD`): el `date` y el `finished_at` del historial, y el `date` de los RMs. Se comparan y se agrupan como días en la hora local, sin pasar por UTC (el error que corrigió la T16 en `formatDate`). «Hoy» es el día local del navegador.
- **Fecha corta:** «4 nov», con el día y el mes de tres letras en minúscula (ene, feb, mar, abr, may, jun, jul, ago, sep, oct, nov, dic). Si no es del año actual, se suma el año: «28 dic 2025».
- **Fecha relativa** («Última», «Última vez» y el subtítulo de la ficha): hoy, «Hoy»; ayer, «Ayer»; de 2 a 6 días atrás, «Hace N días»; 7 o más, o una fecha posterior a hoy, la fecha corta. En el subtítulo de la ficha va en minúscula («la última, hace 3 días»).
- **Rango de una semana:** el día del lunes y la fecha corta del domingo, «19 — 25 oct»; si cruzan de mes, las dos fechas cortas, «26 oct — 1 nov».
- **Números** con coma decimal y un decimal como máximo: «2,3 por semana», «72,5 kg».
- **Singular:** 1 sesión, 1 semana, 1 ejercicio, 1 ejercicio hecho, 1 nota, 1 vez, 1 registro.

### 9.2 La fecha de una sesión y las semanas

- **Fecha de una sesión:** la de CU-E-06, paso 3. En una individual, el día de la asignación; en una del plan, el día más viejo en que el alumno hizo alguno de sus ejercicios. Es el `date` que ya manda el backend.
- **Semana completa:** de lunes a domingo. Una sesión cuenta en la semana de su fecha.
- **Semanas de un mes:** todas las semanas completas con al menos un día del mes, de la que tiene el día 1 a la que tiene el último: entre 4 y 6. Una semana que cruza de mes es la misma en los dos y cuenta todas sus sesiones, también las de los días del otro mes.
- **Semana actual:** la que tiene hoy. **Semana futura:** la que empieza después de hoy.

### 9.3 Los meses que se pueden ver

Del mes del día más viejo del historial (la fecha de una sesión o el día de un ejercicio hecho, el que sea anterior) al mes actual.

### 9.4 Intensidad de un día

Cuántos ejercicios hizo ese día (`finished_at`), sumando todas las sesiones. Cuatro niveles: 0, 1–2, 3–4 y 5 o más.

### 9.5 Racha actual

Las semanas completas seguidas con al menos una sesión, contando hacia atrás desde la actual. **Si la actual todavía no tiene ninguna, se cuenta desde la anterior:** una semana en curso no corta la racha. Si la anterior tampoco tiene, la racha es 0. Se muestra «N sem».

### 9.6 Escala de los gráficos de barras

El alto de cada barra es su valor sobre el mayor entre **4** y la semana más alta de las que se ven (el mes del gráfico, o las 8 semanas del mini gráfico de la ficha). En «Veces en …», el mínimo es **3**. Así, una semana con 1 no llena la barra.

### 9.7 Las veces y los ejercicios que más hizo

- Un ejercicio se identifica por `exercise.id`, el del catálogo.
- **Una vez** es una sesión en la que hizo el ejercicio, aunque lo haya hecho más de una vez en ella. Su fecha es el día en que lo hizo (el más viejo, si fueron varios).
- Las «N veces» del buscador salen del historial completo; las del detalle, de la lectura con `exercise_id`. Dan lo mismo.
- **Los 3 que más hizo:** por cantidad de veces, de más a menos; a igual cantidad, por nombre.

### 9.8 Los RMs del ejercicio

- Son los de `GET /user_rm/user/{id}` con ese ejercicio (`exercise_id`).
- Se ordenan por fecha; a igual fecha, en el orden en que los devuelve el backend. **El RM actual es el último de ese orden.**
- La diferencia de la píldora es el peso del último menos el del primero.

## 10. Celular y escritorio

- **Celular (hasta 959 px):** una sola columna, con la barra de tabs abajo; cada bloque a todo el ancho, sin scroll horizontal. Los nombres largos (de rutina, de ejercicio o una nota) hacen salto de línea.
- **Escritorio (desde 960 px):** el encabezado y las pestañas arriba. Debajo, dos columnas separadas por 28 px:
  - **la izquierda** (de 320 a 380 px), con el resumen, el gráfico o el calendario y el filtro, **queda fija al hacer scroll** (`sticky`, a 24 px del borde). Si es más alta que la ventana (por ejemplo, con el buscador abierto), se desplaza con la página;
  - **la derecha** (el resto), con el aviso y la lista, el día elegido o, en el detalle, las notas y las sesiones.
- Es una pantalla más de la zona del entrenador: con la barra lateral en escritorio, como la ficha.

## 11. Accesibilidad

- **Pestañas** (el patrón de tabs de WAI-ARIA): `role="tablist"` con `aria-label="Vista del historial"`; cada pestaña, `role="tab"` con `aria-selected` y `aria-controls`; el contenido, `role="tabpanel"` con `aria-labelledby`. Un solo Tab entra a la pestaña elegida (la otra lleva `tabindex="-1"`); **← y →** pasan a la otra y la eligen; **Inicio** y **Fin** van a la primera y a la última.
- **Tarjetas de sesión:** el encabezado es un `button` con `aria-expanded` y `aria-controls` hacia la lista de ejercicios.
- **Cada gráfico tiene un texto alternativo con sus números:**
  - cada barra de «Sesiones de <mes>» es un botón con `aria-label`: «Semana del 26 oct al 1 nov: 3 sesiones, 2 del plan y 1 individual. Ver en la lista.». Con 0: «Semana del 19 oct al 25 oct: 0 sesiones. Ver en la lista.»; una que no se puede tocar, sin «Ver en la lista»; una futura: «Semana del 9 nov al 15 nov: todavía no llegó.». El número, la pista y el lunes van con `aria-hidden`;
  - cada barra de «Veces en <mes>» es `role="img"` con «Semana del 26 oct al 1 nov: 2 veces»;
  - «Progresión del RM» es `role="img"` con todos sus puntos: «RM de Press de banca: 70 kg el 22 jul, 72,5 kg el 19 ago y 85 kg × 3 el 28 oct»;
  - el mini gráfico de la ficha es `aria-hidden`.
- **Días del calendario:** cada día es un botón con `aria-label` «4 de noviembre, hoy: 2 sesiones, 5 ejercicios» o «3 de noviembre: sin entrenamientos», y `aria-pressed` en el elegido. Los futuros, `disabled`.
- **Chips:** con `aria-pressed`. «Otro…» lleva `aria-expanded` y `aria-controls` hacia el buscador; su campo tiene el `label` «Buscar ejercicio» y toma el foco al abrirse.
- **El cambio de mes se anuncia:** el título y el subtítulo de la tarjeta del gráfico o del calendario están en una región `aria-live="polite"`. Si la flecha que se tocó queda deshabilitada (se llegó al extremo), el foco pasa a la otra.
- **El foco al cambiar de vista:** al abrir el detalle de un ejercicio y al volver con «Todo el historial», la página vuelve arriba y el foco va al título (`h1` con `tabindex="-1"`). Al tocar una barra, va al título de esa semana.
- **Al volver a la ficha** (con «Volver» o con «atrás» del navegador), **el foco queda en la fila «Historial de entrenamientos».**
- El foco siempre se ve (el `:focus-visible` de la app). Con `prefers-reduced-motion`, el desplazamiento hasta una semana no se anima.

## 12. Carga y errores

- **Mientras carga,** el indicador de carga de las otras pantallas, con el encabezado ya visible.
- **Si falla el historial:** «No pudimos cargar los datos», el motivo y «Reintentar», en lugar del contenido (como en la ficha, ERR-01).
- **Si el alumno no existe** (o el id no es de un alumno): «No encontramos al alumno» y «No hay ningún alumno con ese enlace. Volvé a la lista.», como la ficha (FCH-03).
- **En el detalle, si falla la lectura con `exercise_id`:** el mismo bloque de error, con «Reintentar», debajo del encabezado y en lugar de todo lo demás.
- **En el detalle, si fallan los RMs:** el bloque de error con «Reintentar» dentro de la tarjeta «Progresión del RM», y «RM actual» en «—». El resto del detalle se muestra.

## 13. Contrato

**Sin cambios.** La pantalla usa dos lecturas que ya existen:

| Endpoint | Para qué | Roles |
|---|---|---|
| `GET /routine/history/{userId}` | La fila de la ficha, la pestaña Sesiones, el calendario, los chips y «Los que hizo el alumno» | coach, admin |
| `GET /routine/history/{userId}?exercise_id=` | El detalle de un ejercicio | coach, admin |
| `GET /user_rm/user/{id}` | La progresión y el RM actual del detalle | user (solo el propio), coach y admin; ya habilitado (BE-02) |

Además siguen las dos que la pantalla ya usaba: `GET /exercise/all` («Otros del catálogo», como el selector de la T43) y la del alumno que usa la ficha (el nombre del encabezado).

**Lo que llega del historial** (§5.9 de la [spec del 20/10](2026-10-20-asignar-planificaciones-design.md), BE-16 y BE-20d): una lista de sesiones ya ordenada (por `date` descendente, el nombre de la rutina y el alta), cada una con `source` (`'individual'` o `'plan'`), `date` (día), `routine { id, name }`, la del plan con `planification { id, name | null }` y `week`, y `exercises[]` con `exercise { id, name }`, `user_note`, `finished_at` (día) y `sets` (la prescripción vigente). Los RMs traen `exercise_id`, `weight`, `reps` y `date` (día), desde BE-05.

**Lo que se calcula en el front** (sección 9): las semanas y los meses, el resumen, el gráfico y sus barras, el calendario y su intensidad, la racha, los ejercicios que más hizo y sus veces, el buscador, las fechas de cada vez, la progresión y el RM actual.

## 14. Casos de uso

| CU | Cambio |
|---|---|
| [CU-E-06](../../Use%20Cases/entrenador/CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md) | El camino principal suma el resumen, las sesiones por semana del mes (con el cambio de mes y elegir una semana) y la vista Calendario. Definiciones: fecha de una sesión, semana completa, intensidad, racha y meses con historial. Caminos alternativos nuevos: un mes sin entrenamientos, una semana que cruza de mes y una sesión que empezó otro día, vista desde el calendario. La carga real sigue en «Fuera de alcance» |
| [CU-E-07](../../Use%20Cases/entrenador/CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md) | El filtro abre el detalle del ejercicio: los números, la progresión del RM (los datos de CU-E-04), las veces por semana, las notas y sus sesiones. Caminos alternativos nuevos: sin RMs y un solo RM. Se mantienen «Sin registros» y «El ejercicio aparece más de una vez en una sesión». El título no cambia |

La cantidad de CU no cambia (78).

## 15. Plan de pruebas

En [Pruebas del detalle del alumno](../../Tests/Detalle%20del%20alumno/Pruebas%20del%20detalle%20del%20alumno.html), solo los datos (ver el [plan, sección 1](../plans/2026-11-04-historial-de-entrenamientos-plan.md)):

- Cambian, con el mismo id: **FCH-01**, **HIS-01 a HIS-06**, **FIL-01 a FIL-03**, **ERR-03** y **ERR-04**.
- Grupos nuevos: **«Resumen y gráfico»** (RES-01 a RES-04) y **«Calendario»** (CAL-01 a CAL-05), los dos de CU-E-06, y **«Detalle de un ejercicio»** (EJE-01 a EJE-06), de CU-E-07.
- Todos los nuevos y los que cambian llevan el aviso amarillo de la T55 hasta que esté en Render.
- **CIE-01** borra también los RMs que suma EJE-01.

## 16. Fuera de alcance

- **La carga real** (peso y repeticiones que hizo el alumno): el modelo no la registra (D7).
- **Endpoints nuevos, agregados en el servidor y paginación del historial** (D58).
- El historial que ve el propio alumno, la app iOS y la edición de lo que hizo el alumno.
