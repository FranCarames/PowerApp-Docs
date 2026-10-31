# Spec — Las rutinas del plan por semana (CU-E-09, CU-E-12e, CU-E-12f)

> **Fecha:** 2026-10-31 · **Tareas:** **BE-42** (backend) y **T53** (web), del [plan del cambio](../plans/2026-10-31-be-42-hallazgos-planificaciones-plan.md) · **Estado:** diseño aprobado por Fran el 31/10 (variante C del canvas «PowerApp · Rutinas del plan por semana»).
> **Nace de:** tres hallazgos de la corrida del 31/10 de [Pruebas de planificaciones](../../Tests/Planificaciones/Pruebas%20de%20planificaciones.html): **CRE-01** (el alta no muestra las semanas), **CRE-03** («rutinas previstas» debería ser por semana) y **ADD-02** (no se puede ordenar una semana).
> **Depende de:** el refactor por semanas de la [spec del 17/10](2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md) (BE-10b), que dejó `Routine_Asignation` con `week` y `order`.
> **No revierte nada,** pero **cambia el significado de `number_of_routines`** (D40) y **reabre una decisión de alcance**: el «reordenamiento masivo», que el 4/9 se había dejado afuera «sólo si los `order` duplicados molestan en la práctica» (D47).

## 1. Contexto y objetivo

Desde el 17/10 una planificación se arma **por semanas**: cada rutina del plan vive en una semana y en un orden. Pero la pantalla seguía pensando el plan como una lista plana: el alta pedía «Rutinas previstas» (un total) y avisaba «Cuando la crees vas a poder agregarle sus rutinas, semana por semana». Para armar un plan de ocho semanas, el entrenador tenía que crear la cabecera, abrir el editor y cargar cada semana a mano, sin poder ordenarla ni copiarla.

El objetivo es que **el plan se vea y se arme como lo piensa el entrenador: semana por semana.** Eso son cuatro cosas: (1) el alta muestra las semanas con sus huecos y las guarda junto con la cabecera; (2) la cantidad de rutinas pasa a ser por semana; (3) cada semana se puede ordenar; y (4) una semana armada se puede repetir en otras. De yapa, se aclara que el plan no admite una duración menor a 1 semana desde la web.

## 2. Decisiones

Todas tomadas con Fran el 31/10. La numeración sigue la de la [spec de la sesión del plan](2026-10-22-detalle-de-una-sesion-del-plan-design.md) (D39).

| # | Decisión | Por qué |
|---|---|---|
| D40 | **`number_of_routines` pasa a significar «rutinas por semana».** Define los huecos de cada semana; **no es un tope**: si una semana ya los llenó, la pantalla ofrece «Agregar otra rutina». **No cambia el esquema ni el tipo ni la validación** (entero ≥ 1): sólo su descripción en el Swagger, en crear y en editar | Era «el total del plan», un número que el entrenador tenía que calcular de cabeza y que no decía en qué semana iba cada rutina. Por semana es lo que el entrenador piensa («tres días a la semana») y permite dibujar los huecos. Sin cambio de esquema porque el dato ya existe y sólo se lee distinto; no es un tope porque el plan real tiene semanas con más o menos días (una de descarga, una con doble sesión), y topar obligaría a editar el campo para agregar una |
| D41 | **El alta muestra, debajo de los datos, las semanas 1..duración,** cada una con tantos huecos como «Rutinas por semana», y se rearman en vivo al cambiar cualquiera de los dos campos | Resuelve CRE-01: la estructura del plan aparece apenas el entrenador dice cuánto dura, en lugar de esperar a que exista. Es la «variante C» del canvas (la A tenía las semanas en una lista, sin verlas hasta crear) |
| D42 | **Las semanas se pueden llenar antes de crear, y «Crear planificación» guarda la cabecera y las rutinas juntas, todo o nada.** Un solo `POST /planification/create` con `weeks`, en una transacción | Armar un plan de varias semanas no debería obligar a dos pasos con una pantalla en el medio, y un plan a medias (la cabecera sin sus rutinas) es peor que ninguno. Todo o nada: si una rutina ya no existe o la dieron de baja mientras se armaba, no queda una planificación creada que el entrenador no pidió |
| D43 | **Al editar, la pantalla es la misma, pero las rutinas se cambian al instante,** como hoy (cada acción con su request). «Guardar planificación» guarda sólo la cabecera. La sección conserva su texto «Los cambios de esta sección se aplican al instante, sin pasar por “Guardar planificación”.» | Una planificación existente ya tiene alumnos asignados y su historial cuelga de las rutinas del plan (CU-E-12, regla 3): cada cambio tiene que ser explícito y visible, no un borrador que se pierde. Un solo diseño para el alta y la edición evita tener dos pantallas que divergen |
| D44 | **En el alta, nada de lo que se arma sale de la pantalla hasta crear:** elegir, quitar, ordenar y repetir son locales. En la **edición**, las **semanas** siguen la duración **guardada** (si se escribe otra, la pantalla avisa que las semanas se ajustan al guardar); los **huecos** siguen el número escrito en «Rutinas por semana» en el momento | En el alta no hay plan contra el cual validar ni vínculos que proteger. En la edición, si las semanas siguieran lo que se escribe en la duración sin guardar, una rutina podría quedar en una semana que el plan todavía no tiene (el backend la rechazaría con un 400). Los huecos, en cambio, son sólo visuales: no hay nada que el backend rechace |
| D45 | **Cada rutina se ordena dentro de su semana con un grabber (arrastrar y soltar), con una alternativa por teclado** (con el foco en el grabber, ↑ y ↓ mueven la rutina de a un lugar). En la edición, **cada movimiento** manda **la semana entera** en un solo POST (`reorder`), y el backend la **renumera 1..n** | Resuelve ADD-02. El `order` es una etiqueta que admite huecos y repetidos (CU-E-12, regla 1), así que mover «una» rutina significaría tocar a las demás de todos modos; mandar la semana entera es una operación atómica, sin condiciones de carrera entre varios `PATCH` y deja la semana limpia. El teclado no es opcional: arrastrar no es accesible para quien no usa mouse ni dedo. Las flechas solas (sin «levantar» ni «soltar») son lo más simple que alcanza, y es lo que hace el prototipo |
| D46 | **«Repetir en las otras semanas»** aparece en **cada semana que tiene rutinas** (y sólo si el plan dura más de una semana). Abre un panel donde se eligen las semanas destino, con las **vacías ya marcadas**. En las que ya tienen rutinas, las nuevas **se suman al final** | Un plan real suele repetir semanas (la 1 es igual a la 2, a la 3…). Marcar de entrada las vacías hace que el caso común sea un toque. «Se suman al final» y no «reemplazan» porque nunca se pierde ni se pisa nada: lo que no se quiere se quita con CU-E-12c |
| D47 | **Sale de «Fuera de alcance» el «Reordenamiento masivo de `Routine_Asignation`».** Se hace como `reorder` (D45): ordenar una semana renumera sus vigentes 1..n; **no** se renumera el plan ni las semanas que no se tocaron | El 4/9 se había dejado afuera «sólo si los `order` duplicados molestan en la práctica». Molestaron: la corrida del 31/10 lo pidió. Se acota a una semana, que es lo que se ve y se mueve |
| D48 | **En la web, la duración va de 1 semana en adelante.** El backend **sigue aceptando 0** y no se toca: queda como desvío conocido (fila en «Fuera de alcance» del roadmap) | Sin duración no hay semanas que dibujar (D41). Refinar el backend no aporta nada hoy: la web nunca manda 0, y los planes viejos con 0 se siguen abriendo. Se evita tocar un contrato que otros clientes (la app iOS) podrían estar usando |
| D49 | **Achicar la duración en el alta con rutinas en semanas que se van da el mismo error que al editar** («El plan tiene rutinas en la semana N: la duración no puede ser menor.»): la duración queda como estaba y lo elegido se conserva. Si las semanas que se van están vacías, se achica sin problema | Es la misma regla de CU-E-10, y el mismo texto para que el entrenador no aprenda dos. No se borra lo elegido en silencio porque se perdería trabajo sin aviso |
| D50 | **El contador del plan compara contra duración × rutinas por semana** («N de M rutinas»), tanto en el editor como en la tarjeta de la lista | Consecuencia de D40: comparar el total vigente contra `number_of_routines` a secas ya no tiene sentido («9 de 3»). La píldora «N de M rutinas» del editor sale del canvas |
| D51 | **El selector de rutinas de siempre se conserva** y se entra por los huecos (y por «Agregar otra rutina»), ya situado en la semana. En el alta no pide semana ni posición; al editar conserva «Semana» y «Posición en la semana (opcional)». El botón «Agregar rutinas» de arriba desaparece | No hay motivo para rediseñar CU-E-12a y CU-E-12b, que funcionan y están probados (ADD-01 a ADD-08). Lo que cambia es la puerta de entrada |

## 3. La pantalla

El [prototipo](../../UI%20Front/powerapp-prototype-web.html) (`planEditor`, ya hecho) y el canvas son la referencia visual; ante una diferencia de detalle vale el prototipo, salvo donde el [plan](../plans/2026-10-31-be-42-hallazgos-planificaciones-plan.md) (sección 5.2) dice otra cosa. Lo que fija esta spec:

**Estructura.** Los datos (nombre, notas, tipo, **duración**, **rutinas por semana**) y debajo «Semanas del plan», con la píldora «N de M rutinas». Desde 960 px: dos columnas, los datos a la izquierda (hasta 360 px) y las semanas a la derecha, en tarjetas. En celular, apilado. Todas las semanas abren desplegadas y cada una se puede plegar. El alta arranca en 4 semanas y 3 rutinas por semana.

**Cada semana:** «Semana N», «X de K», sus rutinas (grabber, posición, nombre y quitar) y los huecos «Agregar rutina · Posición N»; si ya llenó los huecos, «Agregar otra rutina». Si tiene rutinas y el plan dura más de una semana, «Repetir en las otras semanas».

**Alta vs. edición.** Idénticas en la forma. En el alta: «Crear planificación» y debajo «Se crea con N rutinas en M semanas.» (M cuenta las semanas con alguna rutina; sin ninguna, «Se crea sin rutinas: las semanas se llenan después.»); la sección dice «Se arman solas con la duración y las rutinas por semana. Podés llenarlas ahora o después: lo que elijas acá se guarda al crear la planificación.». En la edición: «Guardar planificación», y la sección dice «Los cambios de esta sección se aplican al instante, sin pasar por “Guardar planificación”.».

**Panel «Repetir la semana N»** (hoja desde abajo en celular, modal en escritorio): el texto «<rutinas>, en ese orden. Elegí en qué semanas.»; una fila con casilla por cada otra semana, con «Queda igual a la semana N.» (vacía) o «Ya tiene X rutinas: estas se suman al final.», y la pastilla «Vacía» o «X rutinas»; y los botones «Repetir en N semanas» (apagado como «Elegí una semana») y «Cancelar».

Todos los textos y la accesibilidad están en el [plan, secciones 5.3 y 5.4](../plans/2026-10-31-be-42-hallazgos-planificaciones-plan.md).

## 4. Contrato

El contrato completo (campos, límites, errores y textos exactos) está en el [plan, sección 3](../plans/2026-10-31-be-42-hallazgos-planificaciones-plan.md), tal cual lo fijó Fran. Resumen:

| Endpoint | Qué hace | Éxito |
|---|---|---|
| `POST /planification/create` + `weeks?: [{ week, routine_ids[] }]` | Crea la cabecera y las rutinas de cada semana en una transacción | 201, el detalle |
| `POST /planification/routine/repeat-week` `{ planification_id, from_week, to_weeks[] }` | Copia las vigentes de una semana, en su orden, al final de cada destino | 201, el detalle |
| `POST /planification/routine/reorder` `{ planification_id, week, routine_asignation_ids[] }` | Renumera 1..n las vigentes de una semana con el orden recibido | 200, el detalle |

**Por qué `repeat-week` es 201 y `reorder` es 200:** `repeat-week` crea vínculos nuevos, como `assign` y `assign-bulk` (201); `reorder` modifica los que ya existen, como `set-active` (200).

## 5. Modelo

**Sin cambios.** `Routine_Asignation` ya tiene `week` y `order`; `Planification.number_of_routines` ya existe (entero ≥ 1). No cambia ninguna entidad ni el DDL: no se toca `Db Creator` ni se aplica ningún patch a la base de Render.

**Lo que cambia es semántico,** y por eso queda escrito:

- `number_of_routines` = rutinas **por semana** (antes, rutinas del plan). Los planes que ya existen con un valor viejo no se migran: el número simplemente se lee como «por semana». Un plan que declaraba 3 rutinas en total y tiene 3 semanas ahora muestra 3 huecos por semana (9 en total), sin tocar ninguna rutina ya cargada.
- `order` dentro de una semana, después de `reorder`, es 1..n sin huecos ni repetidos. Antes de reordenar, sigue pudiendo tener huecos y repetidos (CU-E-12, regla 1).

## 6. Casos de uso

| CU | Cambio |
|---|---|
| [CU-E-09](../../Use%20Cases/entrenador/CU-E-09-crear-planificacion-sistemica.md) | «Rutinas por semana» en vez del total. El alta puede incluir las rutinas de cada semana, todo o nada, con los caminos alternativos de semana inválida y de rutina inexistente o dada de baja. «Fuera de alcance» ya no deja afuera las rutinas |
| [CU-E-10](../../Use%20Cases/entrenador/CU-E-10-editar-planificacion-sistemica.md) | Cambiar las rutinas por semana sólo cambia los huecos |
| [CU-E-12](../../Use%20Cases/entrenador/CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) | Paso 2: el detalle muestra todas las semanas de la duración, vacías incluidas, con sus huecos. Pasa a seis operaciones. Reglas comunes 5 y 6 |
| [CU-E-12e](../../Use%20Cases/entrenador/CU-E-12e-reordenar-rutinas-de-una-semana.md) (nuevo) | Reordenar las rutinas de una semana: la semana entera, todo o nada, renumera 1..n |
| [CU-E-12f](../../Use%20Cases/entrenador/CU-E-12f-repetir-una-semana-en-otras-semanas.md) (nuevo) | Repetir una semana en otras: copia las vigentes, en su orden, al final de cada semana elegida; todo o nada |

Los CU pasan de **75 a 77**.

## 7. Fuera de alcance

- **La duración 0** («sin duración fija») en la web. El backend la sigue aceptando (D48).
- **Mover una rutina a otra semana** arrastrándola entre tarjetas: sigue siendo quitar y agregar. El grabber ordena **dentro** de la semana.
- **Copiar sólo algunas rutinas** de una semana, o **reemplazar** el contenido de la semana destino (se suma al final, D46).
- **Copiar entre planificaciones.**
- **Deshacer** un reordenamiento o una repetición. Lo repetido de más se quita con CU-E-12c o CU-E-12d.
- **Cambiar el esquema** para que `number_of_routines` tenga otro nombre. Se evaluó y se descartó: renombrar la columna obliga a un patch en la base viva y a coordinar el contrato con la app iOS para ganar sólo claridad en el código.

## 8. Riesgos

- **Una descripción vieja en un cliente.** La app iOS o cualquier cliente que tipó `number_of_routines` como «total» lo va a leer mal hasta que actualice. No rompe nada (el campo y su validación no cambian) pero conviene avisar.
- **`create` pasa a ser transaccional** y comparte lógica con `assign-bulk`. Si diverge, un lote y un alta dan errores distintos para lo mismo. Por eso el plan pide extraer lo común.
- **Una flecha, un POST.** Con el teclado, cada flecha manda la semana entera. Es correcto y simple, pero si alguien apoya la tecla genera varios pedidos seguidos; la T53 puede agrupar pulsaciones muy seguidas mientras el último pedido lleve la semana entera.
- **El grabber en celular.** El arrastre táctil es lo más frágil del cambio; la alternativa por teclado no lo cubre en un celular sin teclado. Si el arrastre táctil no queda bien, el reordenamiento por pantalla táctil es un riesgo conocido, no un bloqueo: la semana se puede reordenar quitando y agregando, como hasta hoy.
