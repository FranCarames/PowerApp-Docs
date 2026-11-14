# Spec — Detalle de músculo en la biblioteca (web)

> **Fecha:** 2026-11-14 · **Tarea:** **T63** (web): la última del `PLAN.md` de la web es la T62. Sin tarea de backend. El plan es [2026-11-14-t63-detalle-de-musculo-plan.md](../plans/2026-11-14-t63-detalle-de-musculo-plan.md). · **Estado:** decisiones de Fran del 14/11. Siguen la numeración de la [spec de imágenes del catálogo](2026-11-14-imagenes-del-catalogo-design.md) y sus planes (D77): son **D78 a D87**.
> **Nace de:** un hallazgo de Fran del 14/11: el alumno no tiene forma de ver el detalle de un músculo y ni se entera de que existen los grupos musculares. Los músculos aparecen como pills sin acción en el ejercicio, y los grupos sólo como chips de filtro en la biblioteca.
> **Modelo:** no cambia. **Backend:** no cambia.

## 1. Contexto y objetivo

Hoy la web muestra los músculos de un ejercicio en dos lugares, con el mismo componente (`ExerciseHero`, bloque «Músculos que trabaja»):

| Pantalla | Ruta | CU |
|---|---|---|
| Ficha del ejercicio en la biblioteca | `/u/wiki/:id` (Usuario) · `/c/ejercicios/:id` (Entrenador) | CU-U-15 · CU-E-30 |
| Ejercicio dentro de una rutina | página del ejercicio de la rutina (`RoutineExercisePage`) | CU-U-10 |

En los dos son pills de texto: no se pueden tocar. El catálogo de músculos y grupos (`/a/catalogo`) es sólo del Admin.

El objetivo es que **el alumno y el entrenador puedan abrir un músculo desde el ejercicio**, ver dónde está, a qué grupo pertenece y qué otros ejercicios lo trabajan, y que **los grupos musculares sean visibles** como forma de recorrer el catálogo.

## 2. Decisiones

| # | Decisión | Por qué |
|---|---|---|
| D78 | **El músculo se abre desde los dos lugares donde se ve un ejercicio**: la ficha de la biblioteca y el ejercicio dentro de la rutina | Lo eligió Fran. Los dos usan `ExerciseHero`, así que es un solo cambio |
| D79 | **El detalle del músculo es una página propia de la biblioteca**, con URL, y no un modal ni un panel lateral | Lo eligió Fran sobre el modal (que no saca al alumno de la rutina) y el panel. Tiene URL para compartir y lugar para crecer |
| D80 | **Contenido de la página:** nombre, ilustración, grupo muscular con su mapa del cuerpo, descripción, «Ejercicios que lo trabajan» y «Otros ejercicios de \<grupo\>» | Lo eligió Fran. La lista de «otros músculos del grupo» se descartó: ese recorrido lo da el índice (D83) |
| D81 | **La descripción del músculo se muestra si existe.** `Muscle.description` ya está en el modelo y llega en `GET /muscles/all`. Vacía o `null`, la sección no se dibuja. **El grupo no tiene descripción** (`Muscle_Group` sólo tiene nombre e imágenes), así que el índice no muestra texto por grupo | Fran pidió no tocar el modelo en esta tarea; el campo ya existe y no hace falta. Redactar los textos queda fuera de alcance (sección 9) |
| D82 | **El grupo muscular no tiene página propia.** En la página del músculo es un dato (nombre y mapa) que lleva al índice, posicionado en ese grupo | Fran se retractó de la página de grupo: lo que aportaba (sus músculos y sus ejercicios) queda repartido entre el índice y la sección de D84 |
| D83 | **Índice «Músculos» en la biblioteca**: los 8 grupos como secciones, cada uno con su mapa y sus músculos | Es el único lugar donde se ve un grupo completo. Permite llegar a un músculo sin pasar por un ejercicio |
| D84 | **«Otros ejercicios de \<grupo\>»** va en la página del músculo: los ejercicios que trabajan algún otro músculo del mismo grupo y **no** trabajan este. Muestra hasta 6 y un «Ver todos» que abre la biblioteca filtrada por ese grupo | Lo pidió Fran. Excluir los que ya trabajan el músculo evita repetir la sección de arriba. El filtro por grupo ya existe y se guarda en la URL |
| D85 | **El Entrenador ve las mismas pantallas** bajo sus rutas | Ya comparte la biblioteca con el Usuario (`WikiPage` y `WikiExercisePage` reciben un `basePath`) |
| D86 | **Sin endpoints nuevos.** Todo sale de `GET /muscles/all`, `GET /muscles/mg/all` y `GET /exercise/all`, que la web ya consume y cachea. El músculo se busca por `id` en la lista; no se usa `GET /muscles/get/:id` | Son 35 músculos y 207 ejercicios: filtrar en el cliente es inmediato y la página abre sin esperar si la biblioteca ya se visitó |
| D87 | **No se crea un CU nuevo.** Se amplían CU-U-15 y CU-E-30 (página del músculo e índice) y CU-U-10 (músculos del ejercicio y acceso a su detalle). El total sigue en 82 | Es parte de consultar la biblioteca: mismo actor, misma precondición, sólo lectura |

## 3. Lo descartado

- **Modal sobre el ejercicio** y **panel lateral** (D79).
- **Página de grupo muscular** (D82).
- **Lista de otros músculos del grupo** dentro de la página del músculo (D80).
- **Sumar la descripción como campo nuevo.** Se planteó por error como cambio de modelo: el campo ya existe (D81).
- **«Otros ejercicios del grupo» en la ficha del ejercicio.** Va sólo en la página del músculo (D84).
- **CU propio para el detalle del músculo** (D87).

## 4. Rutas

| Pantalla | Usuario | Entrenador |
|---|---|---|
| Índice de músculos | `/u/wiki/musculos` | `/c/ejercicios/musculos` |
| Página del músculo | `/u/wiki/musculos/:id` | `/c/ejercicios/musculos/:id` |

`musculos` es un segmento fijo que convive con `wiki/:id` (la ficha del ejercicio): la ruta fija tiene que ganarle a la dinámica. Los `id` de ejercicio son UUID, así que no hay choque de valores.

Las dos páginas reciben el `basePath`, igual que `WikiPage` y `WikiExercisePage`.

## 5. Pantallas

### 5.1 Entrada: pills tocables

En `ExerciseHero`, cada pill de «Músculos que trabaja» pasa a ser un link a la página del músculo.

- `ExerciseHero` recibe el `basePath` de la biblioteca para armar el link. En la rutina del alumno es `/u/wiki`.
- El link lleva en el `state` de navegación de dónde se vino, para el «Volver» (5.2).
- La pill tiene que verse tocable (cursor, hover, foco visible) y anunciarse como link.
- El editor de ejercicios del Admin no cambia: usa otro componente.

### 5.2 Página del músculo

```
‹ Volver
[ilustración]   Pectoral mayor
                Grupo: Pecho  [mapa de cuerpo entero]

Descripción                              (sólo si tiene)

Ejercicios que lo trabajan  (n)
  Press de banca
  Aperturas con mancuernas
  …

Otros ejercicios de Pecho  (n)
  Fondos en paralelas
  …                                      Ver todos →
```

| Bloque | Contenido | Origen |
|---|---|---|
| Volver | Regresa a la pantalla de origen si vino en el `state` (ficha del ejercicio o ejercicio de la rutina). Si se entró por URL directa, va al índice de músculos | `state` de navegación |
| Ilustración | `image_url` del músculo. Si falta o no carga, el ícono sobre degradé que ya usa la app | `GET /muscles/all` |
| Título | Nombre del músculo | `GET /muscles/all` |
| Grupo | Nombre del grupo y su mapa (`preview_image` del grupo). Es un link al índice, posicionado en ese grupo | `muscle_group` del músculo · `GET /muscles/mg/all` para la imagen |
| Descripción | `description` del músculo. Sin texto, no se dibuja | `GET /muscles/all` |
| Ejercicios que lo trabajan | Ejercicios cuyo `exercisedMuscles` incluye este músculo, en orden alfabético, con el total. Cada fila usa la fila de la biblioteca (`WikiRow`) y abre la ficha del ejercicio | `GET /exercise/all` |
| Otros ejercicios de \<grupo\> | Ejercicios que tienen algún músculo del mismo grupo y no este (D84), en orden alfabético. Hasta 6 filas; con más, «Ver todos» abre la biblioteca con el chip del grupo activo | `GET /exercise/all` · `GET /muscles/all` para saber el grupo de cada músculo |

**Estados:**

| Caso | Qué se ve |
|---|---|
| Cargando | Esqueleto de la página |
| El `id` no está en el catálogo | Estado vacío «Este músculo ya no existe», con link a la biblioteca |
| Falla la carga | El error con reintento que ya usa la biblioteca |
| Ningún ejercicio lo trabaja | La sección queda con el mensaje «Todavía no hay ejercicios que trabajen este músculo» |
| No hay otros ejercicios del grupo | La sección «Otros ejercicios de \<grupo\>» no se dibuja |

### 5.3 Índice de músculos

En la biblioteca se suma un selector **«Ejercicios | Músculos»** arriba de la lista. «Ejercicios» es la biblioteca de hoy; «Músculos» abre el índice.

```
Biblioteca        [ Ejercicios | Músculos ]

[mapa]  Pecho                            3 músculos
          [mini] Pectoral mayor      ›
          [mini] Pectoral menor      ›
          [mini] Serrato anterior    ›

[mapa]  Espalda                          6 músculos
          …
```

- Una sección por grupo, en orden alfabético (el mismo de los chips de la biblioteca), con su mapa (`preview_image` del grupo), su nombre y la cantidad de músculos.
- Cada músculo es una fila con su miniatura (`preview_image`, vía `Thumb`) y su nombre; abre la página del músculo.
- Cada sección tiene un ancla con el `id` del grupo. Es adonde llega el link del grupo de la página del músculo (D82).
- Un grupo sin músculos se muestra igual, con el mensaje «Este grupo todavía no tiene músculos».
- El índice no tiene buscador: son 35 filas.
- El buscador y los chips por grupo de «Ejercicios» no cambian.

## 6. Datos

| Dato | Endpoint | Hook existente |
|---|---|---|
| Músculos con su grupo, descripción e imágenes | `GET /muscles/all` | `useMuscles` |
| Grupos con sus músculos e imagen | `GET /muscles/mg/all` | `useMuscleGroups` |
| Ejercicios con sus músculos | `GET /exercise/all` | el del catálogo de la biblioteca |

Los tres son públicos y ya están en caché cuando se viene de la biblioteca.

Las dos listas de ejercicios de la página del músculo salen de una función pura que recibe el `id` del músculo, los ejercicios y los músculos, y devuelve «los que lo trabajan» y «los otros del grupo». Va separada de los componentes para poder leerla y revisarla sola.

Confirmado al escribir el plan, leyendo `muscles.service.ts` del backend: `GET /muscles/mg/all` manda de cada grupo `id`, `name`, `image_url` y `preview_image`, y de cada músculo `id`, `name` y `description`. El mapa del grupo sale de ahí. Las imágenes de cada músculo sólo vienen en `GET /muscles/all`.

## 7. Cambios por repo

**Web (T63).**
- Página del músculo e índice de músculos en `features/catalog/pages`, con sus rutas en Usuario y Entrenador.
- `ExerciseHero`: pills como links, con el `basePath`.
- `WikiPage`: el selector «Ejercicios | Músculos».
- La función de las dos listas de ejercicios.
- Status de la web: actualizar las filas de CU-U-10, CU-U-15 y CU-E-30 y sumar la entrada en «Cambios recientes».

**Docs (este repo).**
- `Use Cases/usuario/CU-U-15-consultar-wiki-de-ejercicios.md` y `Use Cases/entrenador/CU-E-30-consultar-wiki-de-ejercicios.md`: sumar al alcance y al camino principal el índice de músculos y la página del músculo, y el camino alternativo del músculo inexistente.
- `Use Cases/usuario/CU-U-10-ver-detalle-de-un-ejercicio.md`: sumar que el detalle presenta los músculos que trabaja el ejercicio y que cada uno abre su página en la biblioteca.
- `Use Cases/README.md` no cambia: no hay CU nuevo (D87).

**Backend.** Sin cambios.

## 8. Verificación

- La web no tiene tests automáticos (decisión del 16/10): se verifica con `typecheck`, `lint` y `build`, más el navegador.
- Casos de las listas a mirar en el navegador: un músculo sin ejercicios, un ejercicio que trabaja dos músculos del mismo grupo (va sólo en «los que lo trabajan»), un grupo de un solo músculo (sin «otros»), y el corte en 6.
- Recorrido a mano, como Usuario y como Entrenador:
  - Ficha de la biblioteca → pill → página del músculo → «Volver» regresa a la ficha, con el filtro de la biblioteca intacto.
  - Ejercicio de una rutina → pill → página del músculo → «Volver» regresa al ejercicio de la rutina, con las series marcadas intactas.
  - Página del músculo → grupo → índice, posicionado en el grupo.
  - «Ver todos» → biblioteca con el chip del grupo activo.
  - URL directa a un músculo, y a un `id` que no existe.
- Con las imágenes en `NULL` (el estado de hoy, hasta que entre T62) las dos pantallas se ven bien con el ícono sobre degradé.
- Teclado y lector de pantalla: las pills se alcanzan con Tab y se anuncian como links.

## 9. Fuera de alcance

- **Redactar las descripciones** de los 35 músculos. El campo se muestra si tiene texto; cargarlo es otra tarea.
- **Descripción del grupo muscular**: el campo no existe y no se suma.
- **Página propia del grupo muscular** (D82).
- **App iOS.** Esta spec es de la web.
- **Prototipo de `UI Front/`** y **planes de prueba de `Tests/`**: no se actualizan en esta tarea.
- **Cambios en el catálogo del Admin** (`/a/catalogo`).

## 10. Riesgos

- **Depende de las imágenes del catálogo.** Sin T62 y BE-47, la ilustración y el mapa son el ícono genérico: la página funciona, pero pierde lo que mejor explica dónde está el músculo.
- **Salir de la rutina.** Por D79, tocar un músculo mientras se entrena navega a otra página. El «Volver» tiene que devolver al ejercicio sin perder lo marcado; está en la verificación.
- **Calidad de `Exercised_Muscle`.** Las dos listas salen de esa relación: un ejercicio con músculos mal asignados aparece en la página equivocada.
- **Página casi vacía.** Con descripciones sin cargar y un músculo con pocos ejercicios, la página queda corta. Se acepta: la sección «Otros ejercicios de \<grupo\>» es la que le da cuerpo.
