# Spec — Separar la documentación del backend en un repo propio

> **Fecha:** 2026-10-03 · **Estado:** diseño aprobado, pendiente de plan
> **Repos:** `FranCarames/PowerApp-Backend` (origen) → `FranCarames/PowerApp-Docs` (destino, clonado en `D:\Power App\Docs\PowerApp-Docs`)

## 1. Contexto y objetivo

El repo del backend mezcla el código de la API (`power-app/`) con toda la documentación del proyecto: modelo de datos, especificaciones de CU, prototipos de UI, status y el sitio de GitHub Pages que los publica. El objetivo es que cada repo tenga una sola responsabilidad:

- **Backend:** el código de la API y lo necesario para levantar la base.
- **Docs:** documentación vigente y el sitio publicado.

## 2. Decisiones tomadas

| # | Decisión | Por qué |
|---|---|---|
| 1 | `Db Creator/` **se queda en el backend** | Depende 1:1 de las entidades TypeORM, se actualiza en el mismo commit que un cambio de entidad y es lo que hace falta para levantar la base al clonar el backend. |
| 2 | El repo nuevo parte **desde cero**, sin historial | Decisión del usuario: un solo commit inicial con el snapshot. El historial viejo sigue en el backend. |
| 3 | El repo de docs **ya existe** y está clonado en `D:\Power App\Docs\PowerApp-Docs` | Contiene solo un commit inicial y un `README.md` de 15 bytes, que se reemplaza. |
| 4 | La fuente de verdad de las specs de CU pasa a ser `Use Cases/` **del repo de docs** | Hoy hay dos copias idénticas (`Use Cases/` y `D:\Power App\Documentation\Especificaciones de CU\especificaciones`). La carpeta externa queda intacta como archivo histórico: no se toca ni se borra. |
| 5 | **`Status/` se queda en el backend**; el usuario copia a mano los archivos al repo de docs | Es seguimiento ligado al código y cada CU sigue siendo un solo commit en el backend. La copia al sitio es manual y responsabilidad del usuario. |
| 6 | Specs y planes nuevos de brainstorming van a `Doc/specs/` y `Doc/plans/` **del repo de docs** | Son documentación. Se dejan stageados ahí. |
| 7 | Se elimina del backend el `package.json` y `package-lock.json` de la raíz | Solo declaran `material-icon-theme` y `typeorm`, sin uso: `power-app/` tiene los suyos y el build corre con `npm --prefix power-app`. |
| 8 | El repo de docs lleva su propio `CLAUDE.md` | Una sesión abierta ahí necesita el contexto y las reglas de mantenimiento de Pages. |

## 3. Estado final por repo

### 3.1 `PowerApp-Backend`

Se queda: `power-app/`, `Db Creator/`, `Status/`, `CLAUDE.md`, `README.md`, `.gitignore`, `.vscode/`.

Sale: `Doc/`, `Use Cases/`, `UI Front/`, `index.html`, `.nojekyll`, `package.json`, `package-lock.json`.

Quedan sin versionar y sin tocar: `node_modules/` y `src/` (vacío) de la raíz. El usuario los borra si quiere.

### 3.2 `PowerApp-Docs`

Recibe, con el mismo árbol de carpetas (los links relativos no cambian):

- `Doc/` completo (modelo de datos, `app-ios/`, `plans/`, `specs/`, `um/`).
- `Use Cases/` (75 CU + visor `index.html`).
- `UI Front/` (prototipos app y web).
- `index.html` (portada de Pages) y `.nojekyll`.
- `Status/` con **solo** `estado-implementacion-CU.md` y `dashboard-estado-CU.html`, como copia inicial para que la card del dashboard funcione. De ahí en adelante la sincroniza el usuario.

Archivos nuevos: `README.md` (reemplaza el actual) y `CLAUDE.md`.

## 4. Contenido que se reescribe

Solo esto. Todo lo demás se copia byte a byte.

| Archivo | Cambio |
|---|---|
| Docs `index.html` (líneas ~401 y ~403) | El chip de repo pasa de `FranCarames/PowerApp-Backend` a `FranCarames/PowerApp-Docs`. |
| Docs `README.md` | Nuevo: qué es el repo, estructura, tabla de vistas con la URL del sitio nuevo, nota de que `Status/` se sincroniza a mano desde el backend. |
| Docs `CLAUDE.md` | Nuevo: ver §5. |
| Backend `README.md` | La tabla de documentación apunta a `francarames.github.io/PowerApp-Docs/`. La sección "Estructura del repositorio" refleja el árbol nuevo. Swagger, stack y puesta en marcha no cambian. El enlace a `Status/estado-implementacion-CU.md` sigue siendo local. |
| Backend `CLAUDE.md` | Ver §6. |

**No se tocan** (verificado):

- `Doc/app-ios/CLAUDE-ios.md` y `Doc/app-ios/prompts.md`: sus menciones a `FranCarames/PowerApp-Backend` apuntan al repo del backend (para clonarlo), que sigue existiendo y sigue siendo correcto.
- Specs y planes históricos de `Doc/`: sus rutas en texto describen el estado de ese momento.
- `Status/estado-implementacion-CU.md`: sus 16 menciones a `Doc/...` son rutas en texto entre backticks, no links, así que no se rompen. Siguen siendo legibles sabiendo que `Doc/` vive en el repo de docs.
- `Db Creator/` y `power-app/src`: no referencian nada de lo que se mueve.

## 5. `CLAUDE.md` del repo de docs

Corto, en el mismo tono que el del backend. Contiene:

- Qué es el repo y su relación con el backend (`D:\Power App\Backend\PowerApp-Backend`).
- Estructura de carpetas y qué publica Pages (`main` / root, `.nojekyll`).
- **Fuente de verdad:** `Doc/` (modelo de datos) y `Use Cases/` (specs de CU).
- **Mantenimiento de Pages**, tomado de las notas actuales: al agregar o renombrar una vista HTML hay que actualizar la card en `index.html` y la tabla de vistas del `README.md`; los nombres con espacios van URL-encodeados (`%20`); si cambia el archivo del modelo en `Doc/`, hay que tocar a mano la constante `SRC` de `Doc/modelo-db.html` y los links al PDF; los CU del visor se auto-sincronizan desde `Use Cases/README.md`.
- `Status/` es una copia que el usuario sincroniza a mano desde el backend: no se edita acá en el flujo normal.
- Nunca commitear ni pushear: dejar stageado y sugerir el mensaje.

## 6. `CLAUDE.md` del backend

- **Ubicaciones clave:** `Doc/` y las specs de CU pasan a `D:\Power App\Docs\PowerApp-Docs\Doc` y `...\Use Cases`. Se elimina la referencia a `D:\Power App\Documentation\...`. `Status/` y `Db Creator/` quedan igual.
- **Regla de mantenimiento:** sin cambios de fondo. El paso de Status sigue siendo en el backend; se aclara que la copia al repo de docs es manual del usuario y que **no** hay que editar el repo de docs en ese paso.
- **Flujo por cambio:** la spec y el plan de cada cambio se escriben en `Doc/specs/` y `Doc/plans/` del repo de docs (rutas absolutas arriba), stageados allí, no en el backend.

## 7. Orden de ejecución

No se borra nada del backend hasta que el repo de docs esté validado.

1. **Docs, armado:** copiar lo listado en §3.2, reescribir lo de §4, crear `README.md` y `CLAUDE.md`. Verificar con un script que todo `href`, `src` y `fetch` relativo apunta a un archivo existente. Dejar **stageado**, sin commitear.
2. **Usuario, publicación:** commitear y pushear Docs; activar Pages (Settings → Pages → `main` / root); confirmar que `francarames.github.io/PowerApp-Docs/` carga y que los visores (CU y modelo) anden.
3. **Backend, limpieza:** `git rm` de lo listado en §3.1; actualizar `README.md` y `CLAUDE.md`. Dejar **stageado**. El usuario commitea y apaga Pages del backend.
4. **Memoria:** actualizar las notas de memoria del proyecto con las rutas nuevas.

## 8. Riesgos y fuera de alcance

- **El historial del backend no se reescribe.** Los archivos movidos siguen en `git log` del backend; el repo de docs no los hereda.
- **Las URLs viejas de Pages dejan de funcionar** al apagar Pages del backend. Sin redirect. En `D:\Power App` solo aparecen dentro del propio repo (verificado), pero no se puede saber si la URL vieja quedó pegada en otro lado (entregas, mensajes, perfiles); eso lo revisa el usuario antes de apagar Pages.
- **Los visores usan `fetch`**, así que no se pueden probar por `file://`. La verificación del paso 1 es estática (links); la visual es después de publicar.
- **`Status/` puede quedar desactualizado en el sitio** si el usuario olvida sincronizarlo. Es una consecuencia aceptada de la decisión 5.
- **Fuera de alcance:** reorganizar el contenido de `Doc/`, borrar `D:\Power App\Documentation`, reescribir historial, y cualquier cambio de código en `power-app/`.
