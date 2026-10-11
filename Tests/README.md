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

- El visor muestra en cada card el avance de la última tanda (probados, fallas, por re-testear).
- Al abrir el plan, se carga solo la última tanda y se combina con lo del navegador, caso por caso: gana el resultado con la fecha más reciente, así no se pierde lo marcado en el momento.

**Importar resultados** sigue disponible para cargar a mano un JSON cualquiera (por ejemplo, una tanda anterior). El archivo tiene que ser del mismo plan.

## Web

- [Pruebas de acceso](Acceso/Pruebas%20de%20acceso%20PowerApp.html) — Registro, login, recuperación y cambio de contraseña, cierre de sesión y navegación (CU-U-01 a CU-U-05).
  - [Tanda 1](Acceso/1-pruebas-acceso.resultados.json)
