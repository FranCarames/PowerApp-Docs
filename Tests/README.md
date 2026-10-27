# PowerApp — Planes de prueba

Planes de prueba manuales de PowerApp. Cada plan es un HTML autocontenido: dice cómo probar cada caso y qué hay que ver, y deja marcar el resultado y anotar lo observado (se guarda en el navegador).

Se ven en el sitio publicado: **[francarames.github.io/PowerApp-Docs/Tests](https://francarames.github.io/PowerApp-Docs/Tests/)**. El visor `index.html` se arma solo a partir de este índice.

## Para agregar un plan

1. Crear una carpeta para el plan (por ejemplo `Acceso/`) y copiar ahí el HTML. Los resultados que se exporten van en la misma carpeta.
2. Sumar una línea bajo el `##` que corresponda (`Web`, `Backend`, `App iOS`…; si no existe, crear la sección) con el formato:

```
- [Título](Carpeta/nombre%20del%20archivo.html) — Descripción corta, con el rango de CU que cubre.
```

Los espacios del nombre de archivo van como `%20`. No hay que tocar `index.html`.

## Resultados

Lo que se marca en un plan queda en el `localStorage` del navegador. Para que quede en el repo y se vea desde cualquier dispositivo, cada tanda de pruebas se exporta a un JSON y se lista debajo de su plan:

1. **Exportar resultados** (botón del plan) descarga un JSON con el estado de todos los casos (resultado, nota y fecha). El plan le pone el nombre que va en el repo, con el número de la próxima tanda según este índice: `2-pruebas-acceso.resultados.json`. Si no puede leer el índice (por ejemplo, con el HTML abierto desde `file://`), usa la fecha y hora: `2026-10-11-1711-pruebas-acceso.resultados.json`.
2. Se guarda en la carpeta del plan (por ejemplo `Acceso/`).
3. Se suma como sub-bullet bajo el plan en este índice. **La última línea es la tanda más reciente:**

```
- [Pruebas de acceso](Acceso/Pruebas%20de%20acceso%20PowerApp.html) — Descripción.
  - [Tanda 1](Acceso/1-pruebas-acceso.resultados.json)
  - [Tanda 2](Acceso/2-pruebas-acceso.resultados.json)
```

Exportar solo descarga el archivo y dice qué línea sumar al índice: guardarlo en el repo y commitearlo queda a decisión de quien exporta.

Con eso, **no hace falta importar a mano**:

- El visor muestra en cada card el avance de la última tanda: el porcentaje de casos aprobados (sobre todos los del plan, redondeado hacia abajo) y cuántos están probados, con falla o por re-testear. El número cambia de color con el nivel: rojo por debajo del 50 %, amarillo hasta el 59 % y tonos de verde desde el 60 %, cada vez más intensos (90 % o más, el verde pleno).
- Antes de las cards, un **resumen** junta la última tanda de todos los planes: casos aprobados, fallas abiertas, por re-testear y sin probar, y tres escalas que cuentan cuántos planes (sobre todos los del índice; los que no tienen resultados no llegan a ningún umbral) tienen al menos 98 / 95 / 90 / 75 % de aprobados, cuántos están probados por completo o al menos al 95 / 90 / 75 %, y cuántos no tienen fallas, tienen 1 o 2, o 3 o más. Cada fila se despliega para ver qué planes cuenta.
- Al abrir el plan, se carga solo la última tanda y se combina con lo del navegador, caso por caso: gana el resultado con la fecha más reciente, así no se pierde lo marcado en el momento.

**Importar resultados** sigue disponible para cargar a mano un JSON cualquiera (por ejemplo, una tanda anterior). El archivo tiene que ser del mismo plan.

## Web

- [Pruebas de acceso](Acceso/Pruebas%20de%20acceso%20PowerApp.html) — Registro, login, recuperación y cambio de contraseña, cierre de sesión y navegación (CU-U-01 a CU-U-05).
  - [Tanda 1](Acceso/1-pruebas-acceso.resultados.json)
  - [Tanda 2](Acceso/2026-10-11-1842-pruebas-acceso.resultados.json)
  - [Tanda 3](Acceso/3-pruebas-acceso.resultados.json)
  - [Tanda 4](Acceso/4-pruebas-acceso.resultados.json)
- [Pruebas de ejercicios](Ejercicios/Pruebas%20de%20ejercicios.html) — Catálogo de ejercicios del Admin: listado, búsqueda y filtro por grupo, alta y edición con sus músculos, borrado, y cómo llegan a los circuitos, a la wiki y a los RMs del alumno (CU-A-01 a CU-A-06).
  - [Tanda 1](Ejercicios/1-pruebas-ejercicios.resultados.json)
  - [Tanda 2](Ejercicios/2-pruebas-ejercicios.resultados.json)
- [Pruebas de músculos y grupos](Musculos/Pruebas%20de%20m%C3%BAsculos%20y%20grupos.html) — Catálogo del Admin: alta, edición, detalle y borrado de grupos musculares y músculos, y cómo llegan a Ejercicios y a la wiki del alumno (CU-A-07 a CU-A-15).
  - [Tanda 1](Musculos/1-pruebas-musculos.resultados.json)
  - [Tanda 2](Musculos/2-pruebas-musculos.resultados.json)
- [Pruebas de usuarios y entrenadores](Usuarios%20y%20entrenadores/Pruebas%20de%20usuarios%20y%20entrenadores.html) — Gestión de cuentas del Admin: listado y detalle de usuarios, baja y reactivación, y entrenadores (convertir a un alumno, editar sus datos profesionales y darlo de baja) (CU-A-16 a CU-A-19).
  - [Tanda 1](Usuarios%20y%20entrenadores/1-pruebas-usuarios.resultados.json)
  - [Tanda 2](Usuarios%20y%20entrenadores/2-pruebas-usuarios.resultados.json)
  - [Tanda 3](Usuarios%20y%20entrenadores/3-pruebas-usuarios.resultados.json)
- [Pruebas de membresías](Membresias/Pruebas%20de%20membres%C3%ADas.html) — Tipos de membresía del Admin: listado, alta, edición, baja y reactivación, y cómo llegan al registro de pagos del Entrenador y al historial del alumno (CU-A-20 a CU-A-23).
  - [Tanda 1](Membresias/1-pruebas-membresias.resultados.json)
  - [Tanda 2](Membresias/2-pruebas-membresias.resultados.json)
- [Pruebas de circuitos](Circuitos/Pruebas%20de%20circuitos.html) — Circuitos desde el Admin y del lado del Entrenador: listado y filtros, alta y edición con sus ejercicios y bloques de series, duplicar, desactivar y reactivar (CU-E-21 a CU-E-24).
  - [Tanda 1](Circuitos/1-pruebas-circuitos.resultados.json)
  - [Tanda 2](Circuitos/2-pruebas-circuitos.resultados.json)
- [Pruebas del panel y la navegación](Panel%20y%20navegacion/Pruebas%20del%20panel%20y%20la%20navegaci%C3%B3n.html) — El marco de la app: el panel del Admin, «Más», el inicio del Entrenador y del alumno con su tab bar y barra lateral, qué rol entra a qué ruta, las direcciones que no existen, el aviso de servidor dormido y la sesión que se cierra sola (sin CU).
  - [Tanda 1](Panel%20y%20navegacion/1-pruebas-navegacion.resultados.json)
  - [Tanda 2 (la 1, adaptada al plan del 25/10)](Panel%20y%20navegacion/2-pruebas-navegacion.resultados.json)
- [Pruebas de mi cuenta](Mi%20cuenta/Pruebas%20de%20mi%20cuenta.html) — Mi cuenta con los tres roles: la pantalla de cada uno, los datos personales con sus validaciones y el historial de pagos del alumno (CU-U-06 y CU-U-07).
  - [Tanda 1](Mi%20cuenta/1-pruebas-cuenta.resultados.json)
- [Pruebas de wiki y temporizador](Wiki%20y%20temporizador/Pruebas%20de%20wiki%20y%20temporizador.html) — Herramientas del alumno: la biblioteca de ejercicios con búsqueda, filtro por grupo muscular y ficha de cada ejercicio, y el temporizador de descanso entre series (CU-U-14 y CU-U-15).
  - [Tanda 1](Wiki%20y%20temporizador/1-pruebas-wiki-timer.resultados.json)
- [Pruebas de RMs y calculadora](RMs%20y%20calculadora/Pruebas%20de%20RMs%20y%20calculadora.html) — Los récords del alumno: listado agrupado por ejercicio, registrar, editar y eliminar un RM, y la calculadora que estima el 1RM sin guardarlo (CU-U-16 a CU-U-20).
  - [Tanda 1](RMs%20y%20calculadora/1-pruebas-rms.resultados.json)
- [Pruebas del detalle del alumno](Detalle%20del%20alumno/Pruebas%20del%20detalle%20del%20alumno.html) — La ficha de un alumno desde el Entrenador: sus datos, sus RMs, su historial de pagos y su historial de entrenamientos con el filtro por ejercicio (CU-E-04 a CU-E-07).
  - [Tanda 1](Detalle%20del%20alumno/1-pruebas-detalle-alumno.resultados.json)
  - [Tanda 2 (la 1, adaptada al plan del 25/10)](Detalle%20del%20alumno/2-pruebas-detalle-alumno.resultados.json)
- [Pruebas de membresías del entrenador](Membresias%20del%20entrenador/Pruebas%20de%20membres%C3%ADas%20del%20entrenador.html) — El control de membresías del Entrenador: contadores por estado, alumnos filtrados por estado y por tipo, y el registro de un pago (CU-E-25 a CU-E-29).
  - [Tanda 1](Membresias%20del%20entrenador/1-pruebas-membresias-entrenador.resultados.json)
  - [Tanda 2 (la 1, adaptada al plan del 25/10)](Membresias%20del%20entrenador/2-pruebas-membresias-entrenador.resultados.json)
- [Pruebas de planificaciones](Planificaciones/Pruebas%20de%20planificaciones.html) — Planificaciones desde el Admin y el Entrenador: listado y filtros, alta y edición de la cabecera, las rutinas de cada semana (agregar, quitar y reincorporar), baja y reactivación, y la asignación a un alumno con sus fechas y el aviso de solapamiento (CU-E-08 a CU-E-14).
- [Pruebas de rutinas](Rutinas/Pruebas%20de%20rutinas.html) — Rutinas desde el Admin y el Entrenador: listado y búsqueda, alta y edición con sus circuitos en orden, baja y reactivación, y las rutinas puntuales de un alumno: asignarlas para un día y quitarlas (CU-E-15 a CU-E-20).
  - [Tanda 1](Rutinas/1-pruebas-rutinas.resultados.json)
- [Pruebas del plan del alumno](Plan%20del%20alumno/Pruebas%20del%20plan%20del%20alumno.html) — El entrenamiento del alumno: el inicio semana por semana, el detalle de cada rutina y de cada ejercicio, sus RMs del ejercicio, marcar y desmarcar lo hecho con su nota, y cómo se ve todo cuando el entrenador cambia algo (CU-U-08 a CU-U-13).
