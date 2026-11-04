# Hallazgo RUT-02 y T55 — La biblioteca de ejercicios del entrenador (CU-E-30) · Plan

> **Este plan es de diseño:** lo escribió la sesión de docs. Lo lee la sesión del **web** (sección 4). El **backend no cambia** (sección 3). Orden en la sección 6.

**Fuente:** la tanda 5 de [Pruebas del panel y la navegación](../../Tests/Panel%20y%20navegacion/Pruebas%20del%20panel%20y%20la%20navegaci%C3%B3n.html) (04/11), hallazgo **RUT-02**: el entrenador no tiene dónde consultar la biblioteca de ejercicios.
**Modelo:** sin cambios. No cambia ninguna entidad ni el DDL: no se toca `Db Creator`.
**Roadmap del backend:** sin cambios. No hay tarea BE.

**Goal:** que el entrenador pueda consultar la biblioteca de ejercicios como el alumno, **solo de lectura,** en su propia zona: `/c/ejercicios` y `/c/ejercicios/:id`, desde un tercer segmento en Rutinas.

---

## 1. El hallazgo

| Caso del plan de pruebas | Qué pasaba el 04/11 | CU | Lo arregla | Estado (04/11) |
|---|---|---|---|---|
| **Panel y navegación · RUT-02** · El entrenador fuera de su zona | `/u/wiki` lo devuelve a `/c/alumnos`, como corresponde, pero no tiene otra ruta donde ver la biblioteca: el entrenador no puede consultar un ejercicio mientras arma una rutina o un circuito | [CU-E-30](../../Use%20Cases/entrenador/CU-E-30-consultar-wiki-de-ejercicios.md) (nuevo) | T55 (web) | **Pendiente** |

La redirección de `/u/wiki` está bien y **no cambia**: la zona del alumno sigue siendo del alumno. Lo que falta es la misma biblioteca en la zona del entrenador.

**Casos de uso** (ya escritos):

- **CU-E-30 · Consultar wiki de ejercicios** (nuevo), rol Entrenador, paquete Biblioteca de Ejercicios. Copia la estructura de [CU-U-15](../../Use%20Cases/usuario/CU-U-15-consultar-wiki-de-ejercicios.md): mismo camino principal (abrir, buscar o filtrar, recuperar el catálogo, abrir la ficha) y mismo camino alternativo «Sin resultados de búsqueda». Solo de lectura. **Fuera de alcance:** crear, editar y borrar ejercicios, que son del Admin (CU-A-04 a CU-A-06). Precondición: sesión activa con rol Entrenador.
- **CU-U-15:** no cambia. Suma una línea en «Alcance» que remite al CU-E-30.
- **Índice:** CU-E-30 va al final de la lista del Entrenador, en un paquete propio. Los CU pasan de 77 a 78 (índice de `Use Cases/` y portada).

**Efecto en los planes de prueba** (ya aplicado):

- [Panel y navegación](../../Tests/Panel%20y%20navegacion/Pruebas%20del%20panel%20y%20la%20navegaci%C3%B3n.html):
  - **RUT-02** conserva el id y los pasos. El resultado esperado termina en «Los circuitos y la biblioteca de ejercicios los ve en sus propias rutas, `/c/circuitos` y `/c/ejercicios`.»
  - **RUT-03** (el admin en la zona del entrenador) suma `/c/ejercicios`: el admin también vuelve a `/a/inicio`.
  - **COA-04** suma el paso «En Rutinas, tocá el segmento Ejercicios y abrí un ejercicio», y en `/c/ejercicios` y en la ficha sigue marcada la tab Rutinas.
  - RUT-02 y COA-04 llevan aviso amarillo (T55). RUT-03 no: hoy `/c/ejercicios` no existe y el admin ya vuelve a `/a/inicio`.
- [Wiki y temporizador](../../Tests/Wiki%20y%20temporizador/Pruebas%20de%20wiki%20y%20temporizador.html): grupo nuevo **«Biblioteca del entrenador»** (CU-E-30), antes de «Errores y pantallas», con **BIE-01** a **BIE-05**. Los cinco llevan aviso amarillo (T55). Los textos de pantalla son los de la wiki del alumno (WIK-01 a FIC-05): no hay ninguno nuevo.

| Caso | Qué prueba |
|---|---|
| BIE-01 | Llegar desde el segmento Ejercicios de Rutinas: `/c/ejercicios`, los mismos requests que WIK-01 y la tab Rutinas marcada |
| BIE-02 | Buscar y filtrar por grupo, con la lógica de WIK-03 a WIK-05 |
| BIE-03 | La ficha en `/c/ejercicios/:id` y «Volver» a la lista con su búsqueda y su chip |
| BIE-04 | Solo de lectura: sin botones de crear, editar ni eliminar, solo `GET`, y `/a/ejercicios` vuelve a `/c/alumnos` |
| BIE-05 | `/c/ejercicios/abc` da «No encontramos el ejercicio» |

---

## 2. La regla

1. **La biblioteca del entrenador es la del alumno:** mismo listado, misma búsqueda sin acentos, mismos chips por grupo muscular, misma ficha y **mismos textos.** Lo único que cambia es la ruta.
2. **Solo de lectura.** No hay forma de crear, editar ni borrar un ejercicio desde la zona del entrenador. El catálogo lo administra el Admin en `/a/ejercicios`, que sigue siendo solo suya.
3. **Cada rol en su zona.** El entrenador ve la biblioteca en `/c/ejercicios`; `/u/wiki` y `/a/ejercicios` lo siguen devolviendo a `/c/alumnos`. El admin, en `/c/ejercicios`, vuelve a `/a/inicio` como en el resto de la zona del entrenador.

---

## 3. Backend: sin cambios

Los endpoints que usa la wiki ya le sirven al entrenador: son **públicos** o piden sesión con **`@Auth()` sin rol,** así que cualquier sesión válida los lee.

| Endpoint | Para qué | Auth hoy |
|---|---|---|
| `GET /exercise/all` | El listado | Público |
| `GET /muscles/mg/all` | Los chips por grupo muscular | Público |
| `GET /exercise/:id` | La ficha | `@Auth()` sin rol (cualquier sesión) |

- **Fuentes:** el Status del backend (CU-U-15, CU-A-01, CU-A-11 y la nota de CU-U-10 del 18/8, que expuso `GET /exercise/:id` con `@Auth()`) y el roadmap (DG2, «GET público, ABM de admin»). La sesión del web lo confirma contra el Swagger de Render antes de empezar; si alguno pidiera rol, se avisa acá y se abre una tarea BE.
- **Las escrituras siguen siendo del Admin** (`POST /exercise/create`, `POST /exercise/edit/:id`, `DELETE /exercise/:id`). No se tocan: el entrenador no las llama.
- **No se toca el roadmap del backend.** La decisión DG2 (si `GET /exercise/:id` pasa a ser público) sigue como está y no afecta este cambio: con sesión o sin ella, el entrenador ya la tiene.

---

## 4. Web (T55 de PowerApp-Web)

**Repo:** `D:\Power App\Web\PowerApp-Web`. **Depende de:** nada. El backend ya está y el contrato no cambia. **Estado: pendiente.**

### 4.1 Qué se pide

| # | Cambio | Detalle |
|---|---|---|
| 1 | **Rutas nuevas** `/c/ejercicios` y `/c/ejercicios/:id` | En la zona del entrenador, con su guard de rol: el alumno vuelve a `/u/plan` y el admin a `/a/inicio`, como en el resto de `/c/*` |
| 2 | **Tercer segmento en Rutinas:** «Ejercicios» | Rutinas pasa a tener **Rutinas**, **Circuitos** y **Ejercicios**. Como los otros dos (T48), es una ruta (`/c/ejercicios`) y no un query param |
| 3 | **La tab Rutinas** suma `also: '/c/ejercicios'` | Queda marcada en `/c/ejercicios` y en `/c/ejercicios/:id`, como ya pasa con `/c/circuitos`. Lo mismo en la barra lateral del escritorio |
| 4 | **Mover las pantallas de la wiki a `features/catalog`** con `basePath` | Lo mismo que hizo la T48 con los circuitos: la lista y la ficha se parametrizan con `basePath` (`/u/wiki` o `/c/ejercicios`) y las usan las dos zonas. `/u/wiki` no cambia en nada |

### 4.2 Qué tiene que pasar

1. **Los links salen del `basePath`.** En `/c/ejercicios`, tocar una fila abre `/c/ejercicios/:id`; «Volver» de la ficha vuelve a `/c/ejercicios` con la misma búsqueda y el mismo chip (`?q=…&grupo=…`). Nunca se navega a `/u/wiki` desde la zona del entrenador.
2. **Los mismos textos** que en `/u/wiki`: «Biblioteca», «Ejercicios», «Buscar ejercicio», «Todos», los dos estados vacíos, «Músculos que trabaja», «Descripción», los tips, «Video», «Ver video» y «No encontramos el ejercicio». No se agrega ninguno.
3. **Los mismos requests** que en `/u/wiki`: `GET /exercise/all` y `GET /muscles/mg/all` en la lista, `GET /exercise/:id` en la ficha. Nada más.
4. **Sin escrituras:** ni la lista ni la ficha muestran botones de crear, editar o eliminar. No se reutiliza el editor del Admin.
5. **La wiki del alumno no cambia:** los casos WIK-01 a FIC-05 tienen que dar lo mismo que antes (incluido «Volver» de la lista a `/u/plan`, WIK-02).

### 4.3 Aclaración que el pedido no decía (vetable)

- **«Volver» de la lista** en `/c/ejercicios`: en `/u/wiki` lleva a `/u/plan`. En la zona del entrenador, la lista se abre desde un segmento de Rutinas, igual que `/c/circuitos`, así que se sugiere mostrarla como esa pantalla (con los segmentos) y que, si queda un «Volver», lleve a `/c/rutinas`. Ningún caso de prueba lo fija; si Fran prefiere otra cosa, se cambia acá.

### 4.4 Cómo se verifica

- Los chequeos de siempre del web: `typecheck`, `eslint src`, `build` y `prettier --check`.
- **En el navegador, con Network abierto** (filtrado por `exercise` o `muscles`), en celular (390 px) y en escritorio:
  - Como entrenador: BIE-01 a BIE-05 de [Wiki y temporizador](../../Tests/Wiki%20y%20temporizador/Pruebas%20de%20wiki%20y%20temporizador.html), y RUT-02 y COA-04 de [Panel y navegación](../../Tests/Panel%20y%20navegacion/Pruebas%20del%20panel%20y%20la%20navegaci%C3%B3n.html).
  - Como admin: RUT-03 (`/c/ejercicios` vuelve a `/a/inicio`).
  - Como alumno: WIK-01 a FIC-05, para comprobar que `/u/wiki` no cambió, y RUT-01.
- Sin tests automáticos nuevos en el repo.
- **Sacar los avisos amarillos es de Docs** (sección 6).

### 4.5 Qué no hacer

- **No tocar el backend** ni pedir un endpoint nuevo: los tres de la sección 3 alcanzan.
- **No abrir `/u/wiki` al entrenador** ni `/a/ejercicios`: cada rol en su zona (regla 3).
- **No duplicar las pantallas** de la wiki en la zona del entrenador: se comparten desde `features/catalog`.

---

## 5. Los datos

- **No se migra nada.** El entrenador lee el mismo catálogo que el alumno y el admin.

---

## 6. Orden

1. **Docs: hecho** el 04/11 (CU-E-30, CU-U-15, índice, los dos planes de prueba y este plan).
2. **Web (T55): pendiente,** sin dependencias. Tiene que llegar a Render para cerrar el hallazgo.
3. **Docs:** con la T55 en Render, sacar los avisos amarillos (`kt` y `known`) de RUT-02, COA-04 y BIE-01 a BIE-05, la mención en «Antes de empezar» de los dos planes de prueba (y la constante `T55` del plan de wiki), y volver a correr esos casos. La copia de `Status/` del web la trae el usuario.
