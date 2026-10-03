# PowerApp Docs — Contexto del repo

## Qué es

Repo de documentación de **PowerApp** (app de gimnasio/entrenamiento): modelo de datos, especificaciones de casos de uso (CU), prototipos de UI y el sitio de **GitHub Pages** que los publica. Es el hermano documental de **`D:\Power App\Backend\PowerApp-Backend`** (código NestJS + TypeORM + PostgreSQL), de donde se separó el 2026-10-03.

Sitio publicado: https://francarames.github.io/PowerApp-Docs/ (Pages → "Deploy from a branch" → `main` / root). El archivo `.nojekyll` desactiva Jekyll y sirve los HTML tal cual.

## Estructura y fuentes de verdad

```
Doc/         → Documentación vigente (fuente de verdad del modelo de datos), specs/ y plans/ de cada cambio, app-ios/, um/.
Use Cases/   → Especificaciones de CU (fuente de verdad) por rol: admin/, entrenador/, usuario/ + README.md (índice) + index.html (visor).
UI Front/    → Prototipos HTML (app mobile y web).
Status/      → COPIA del informe y dashboard de avance por CU (ver más abajo).
index.html   → Portada de Pages.
```

- **Modelo de datos:** `Doc/PowerApp - Modelo DB.svg` / `.pdf` (el usuario lo mantiene en Miro y exporta acá). Ante conflicto con las entidades TypeORM del backend, **manda este modelo**: se corrigen las entidades, no el diagrama.
- **Especificaciones de CU:** `Use Cases/`. La vieja copia en `D:\Power App\Documentation\Especificaciones de CU\` quedó como archivo histórico: no se usa ni se edita.
- **Specs y planes de cada cambio** (brainstorming → spec → plan): se escriben en `Doc/specs/YYYY-MM-DD-<tema>-design.md` y `Doc/plans/YYYY-MM-DD-<tema>-plan.md`, aunque el cambio sea de código del backend.

## `Status/` es una copia (IMPORTANTE)

La fuente de `estado-implementacion-CU.md` y `dashboard-estado-CU.html` es la carpeta `Status/` **del backend**: se actualiza junto con cada cambio de código. El usuario las copia a mano a este repo. **No editar `Status/` desde acá** salvo que el usuario lo pida: los cambios se pisarían en la próxima sincronización.

## Mantenimiento del sitio (Pages)

- **Vista HTML nueva o renombrada:** actualizar la card/enlace en `index.html` **y** la tabla de vistas del `README.md`.
- **Nombres con espacios** (`Doc/PowerApp - Modelo DB.*`, `UI Front/`, `Use Cases/`): en todo link hay que URL-encodear (`%20`).
- **Cambia el nombre del archivo del modelo en `Doc/`:** tocar a mano la constante `SRC` de `Doc/modelo-db.html` y los links al PDF (no hay glob).
- **CU nuevo:** agregarlo a `Use Cases/README.md` con su link relativo (formato `- [`CU-..` Título](path)` bajo `## Rol X` / `### Paquete`). El visor `Use Cases/index.html` se auto-sincroniza desde ese índice; no hay que tocarlo.
- Los visores (`Use Cases/index.html`, `Doc/modelo-db.html`) usan `fetch`: **no andan por `file://`**, hay que servirlos por HTTP (`python -m http.server`).
- `Doc/modelo-db.html` inyecta el SVG inline (no `<img>`) para que carguen las `@font-face` que el SVG trae adentro.

## Flujo de trabajo

1. Hacer el cambio.
2. Verificar que no se rompieron links relativos (probar el sitio con `python -m http.server`).
3. **Nunca `git commit` ni `git push`:** dejar todo stageado (`git add`) y sugerir el mensaje de commit. El usuario revisa y commitea.
