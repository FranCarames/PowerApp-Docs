# PowerApp Docs — Contexto del repo

## Qué es

Repo de documentación de **PowerApp** (app de gimnasio/entrenamiento): modelo de datos, especificaciones de casos de uso (CU), prototipos de UI y el sitio de **GitHub Pages** que los publica. Es el hermano documental de **`D:\Power App\Backend\PowerApp-Backend`** (código NestJS + TypeORM + PostgreSQL), de donde se separó el 2026-10-03.

Sitio publicado: https://francarames.github.io/PowerApp-Docs/ (Pages → "Deploy from a branch" → `main` / root). El archivo `.nojekyll` desactiva Jekyll y sirve los HTML tal cual.

## Estructura y fuentes de verdad

```
Doc/         → Documentación vigente (fuente de verdad del modelo de datos), specs/ y plans/ de cada cambio, app-ios/, um/.
Use Cases/   → Especificaciones de CU (fuente de verdad) por rol: admin/, entrenador/, usuario/ + README.md (índice) + index.html (visor).
UI Front/    → Prototipos HTML (app mobile y web).
Tests/       → Planes de prueba manuales: una subcarpeta por plan (p. ej. `Acceso/`) con el .html autocontenido y sus JSON de resultados + README.md (índice) + index.html (visor) + errores.html (tablero de fallas por gravedad).
Status/      → COPIA de los informes y dashboards de avance por CU, del backend y de la web (ver más abajo).
index.html   → Portada de Pages.
```

- **Modelo de datos:** `Doc/PowerApp - Modelo DB.svg` / `.pdf` (el usuario lo mantiene en Miro y exporta acá). Ante conflicto con las entidades TypeORM del backend, **manda este modelo**: se corrigen las entidades, no el diagrama.
- **Especificaciones de CU:** `Use Cases/`. La vieja copia en `D:\Power App\Documentation\Especificaciones de CU\` quedó como archivo histórico: no se usa ni se edita.
- **Specs y planes de cada cambio** (brainstorming → spec → plan): se escriben en `Doc/specs/YYYY-MM-DD-<tema>-design.md` y `Doc/plans/YYYY-MM-DD-<tema>-plan.md`, aunque el cambio sea de código del backend.

## `Status/` es una copia (IMPORTANTE)

Hay dos pares de archivos, uno por cada código que se audita contra los CU:

| Par | Fuente (se actualiza junto con cada cambio de código) |
|---|---|
| `Status/estado-implementacion-backend.md` + `Status/dashboard-estado-backend.html` | carpeta `Status/` del repo del **backend** (`D:\Power App\Backend\PowerApp-Backend`) |
| `Status/estado-implementacion-web.md` + `Status/dashboard-estado-web.html` | carpeta `Status/` del repo de la **web** (`D:\Power App\Web\PowerApp-Web`) |

**Los `*-backend` se sincronizan automáticamente (desde el 2026-10-24):** cada vez que se actualiza el Status del backend, ese mismo paso copia los dos archivos acá (`cp`, byte a byte) y los deja **sin stagear**; el usuario commitea cada repo. Los `*-web` los sigue copiando el usuario a mano. **No editar `Status/` desde acá** salvo que el usuario lo pida: los cambios se pisarían en la próxima sincronización.

Los nombres de archivo están enlazados desde la portada (`index.html`, card "Estado de implementación" con un botón por par) y desde el `README.md`: si se renombran, actualizar ambos.

## Mantenimiento del sitio (Pages)

- **Vista HTML nueva o renombrada:** actualizar la card/enlace en `index.html` **y** la tabla de vistas del `README.md`.
- **Nombres con espacios** (`Doc/PowerApp - Modelo DB.*`, `UI Front/`, `Use Cases/`): en todo link hay que URL-encodear (`%20`).
- **Cambia el nombre del archivo del modelo en `Doc/`:** tocar a mano la constante `SRC` de `Doc/modelo-db.html` y los links al PDF (no hay glob).
- **CU nuevo:** agregarlo a `Use Cases/README.md` con su link relativo (formato `- [`CU-..` Título](path)` bajo `## Rol X` / `### Paquete`). El visor `Use Cases/index.html` se auto-sincroniza desde ese índice; no hay que tocarlo.
- **Plan de prueba nuevo:** copiar el HTML a una subcarpeta propia de `Tests/` y agregarlo a `Tests/README.md` (formato `- [Título](Carpeta/archivo%20con%20espacios.html) — descripción` bajo un `## Web` / `## Backend` / `## App iOS`). El visor `Tests/index.html` se auto-sincroniza desde ese índice; no hay que tocarlo. Si el plan trae el guardado por portapapeles («Copiar respaldo» / «Restaurar respaldo») en vez de Exportar/Importar, reemplazarlo por el bloque de `Tests/Acceso/Pruebas de acceso PowerApp.html` (sección «Exportar / importar resultados» y «Resultados guardados en el repo»); el `plan` del JSON sale de `PAGE_ID` sin el sufijo `-powerapp`. Los planes son archivos del usuario: no editarlos desde acá salvo que lo pida. Cada plan guarda los resultados en `localStorage` y trae Exportar/Importar a un JSON (el export sale ya nombrado `<N>-<plan>.resultados.json`, con N = próxima tanda según el índice; si no puede leerlo usa la fecha); si un plan se regenera, hay que conservar esos botones y la carga automática desde el repo, y también la gravedad de las fallas (fila «Gravedad» con 1 Grave / 2 Moderado / 3 Leve / 4 Diferido, filtro, conteo en el resumen y `sev` en el export; ver `Tests/README.md`). **Resultados nuevos:** cuando el usuario sume un JSON de resultados a la carpeta de un plan, agregarlo como sub-bullet (`  - [Tanda N](Carpeta/archivo.json)`) bajo ese plan en `Tests/README.md`; la última línea es la tanda vigente. Ese índice alimenta tanto el avance de las cards del visor como la carga automática al abrir el plan.
- **`Tests/errores.html`** (tablero de fallas) lee la última tanda de cada plan desde `Tests/README.md` y escribe lo que el usuario mueve en el `localStorage` de cada plan, con la clave `powerapp.<plan>.v1` (`<plan>` = el campo `plan` del JSON, p. ej. `pruebas-acceso`). Si un plan cambia su `LOCAL_KEY` o el formato de sus resultados, hay que ajustar el tablero. Se ve desde `Tests/index.html` (botón en el encabezado), la tabla de vistas del `README.md` y el pie de la portada.
- Los visores (`Use Cases/index.html`, `Doc/modelo-db.html`, `Tests/index.html`, `Tests/errores.html`) usan `fetch`: **no andan por `file://`**, hay que servirlos por HTTP (`python -m http.server`).
- `Doc/modelo-db.html` inyecta el SVG inline (no `<img>`) para que carguen las `@font-face` que el SVG trae adentro.

## Flujo de trabajo

1. Hacer el cambio.
2. Verificar que no se rompieron links relativos (probar el sitio con `python -m http.server`).
3. **Nunca `git commit` ni `git push`:** dejar todo stageado (`git add`) y sugerir el mensaje de commit. El usuario revisa y commitea.
