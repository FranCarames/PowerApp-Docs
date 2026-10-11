# PowerApp — Planes de prueba

Planes de prueba manuales de PowerApp. Cada plan es un HTML autocontenido: dice cómo probar cada caso y qué hay que ver, y deja marcar el resultado y anotar lo observado (se guarda en el navegador).

Se ven en el sitio publicado: **[francarames.github.io/PowerApp-Docs/Tests](https://francarames.github.io/PowerApp-Docs/Tests/)**. El visor `index.html` se arma solo a partir de este índice.

## Para agregar un plan

1. Copiar el HTML a esta carpeta.
2. Sumar una línea bajo el `##` que corresponda (`Web`, `Backend`, `App iOS`…; si no existe, crear la sección) con el formato:

```
- [Título](nombre%20del%20archivo.html) — Descripción corta, con el rango de CU que cubre.
```

Los espacios del nombre de archivo van como `%20`. No hay que tocar `index.html`.

## Resultados

Los resultados que se marcan en un plan quedan en el `localStorage` del navegador. Para conservarlos o llevarlos a otro dispositivo, cada plan tiene **Exportar resultados** e **Importar resultados**:

- **Exportar** descarga un JSON con el estado de todos los casos (resultado, nota y fecha). Se guarda en el repo en `Tests/resultados/`, uno por plan (por ejemplo `pruebas-acceso.resultados.json`); cada nueva exportación pisa la anterior y el historial queda en git.
- **Importar** lee ese JSON y lo combina con lo que hay en el navegador, caso por caso: gana el resultado con la fecha más reciente, así no se pierde lo marcado en el momento. El archivo tiene que ser del mismo plan.

## Web

- [Pruebas de acceso](Pruebas%20de%20acceso%20PowerApp.html) — Registro, login, recuperación y cambio de contraseña, cierre de sesión y navegación (CU-U-01 a CU-U-05).
