# Separar la documentación del backend en un repo propio — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover la documentación del repo `PowerApp-Backend` al repo `PowerApp-Docs` (ya creado y clonado), dejando cada repo con una sola responsabilidad y el sitio de GitHub Pages publicado desde el repo nuevo.

**Architecture:** Se copia un snapshot de lo versionado al repo de docs con el mismo árbol de carpetas (los links relativos no cambian), se valida con un verificador de links, el usuario publica, y recién entonces se borra lo movido del backend. Nada se borra hasta que Pages del repo nuevo esté validado.

**Tech Stack:** Git, Git Bash (`cp --parents`, `diff`), Python 3 (solo el verificador de links), GitHub Pages.

**Spec:** [`Doc/specs/2026-10-03-separar-repo-docs-design.md`](../specs/2026-10-03-separar-repo-docs-design.md)

## Reglas que rigen todo el plan

- **Nunca `git commit` ni `git push`.** Cada parte termina en `git add` y un mensaje sugerido; el usuario revisa y commitea (preferencia del usuario: valida cada commit antes de que entre al historial). Donde una skill pediría "Commit", acá el paso es **stagear y parar**.
- No se borra nada que no sea un archivo versionado listado en el plan. Si aparece algo suelto, se le muestra al usuario.
- Rutas que usa el plan (Git Bash):
  - `B` = `D:/Power App/Backend/PowerApp-Backend` (backend, origen)
  - `D` = `D:/Power App/Docs/PowerApp-Docs` (docs, destino)
- El estado del shell no persiste entre comandos: cada bloque redefine `B` y `D`.

## Estructura de archivos

**Repo `PowerApp-Docs` (`D`)**

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Copiar | `Doc/**` (30 archivos) | Modelo de datos, `app-ios/`, `plans/`, `specs/`, `um/` |
| Copiar | `Use Cases/**` (78 archivos) | Specs de CU por rol + índice + visor |
| Copiar | `UI Front/*.html` (2) | Prototipos app y web |
| Copiar | `index.html`, `.nojekyll` | Portada de Pages |
| Copiar | `Status/estado-implementacion-CU.md`, `Status/dashboard-estado-CU.html` | Copia inicial; luego la sincroniza el usuario |
| Modificar | `index.html` (líneas 401 y 403) | Chip de repo → `PowerApp-Docs` |
| Reemplazar | `README.md` | Presentación del repo y tabla de vistas |
| Crear | `CLAUDE.md` | Contexto y reglas de mantenimiento para sesiones en este repo |

**Repo `PowerApp-Backend` (`B`)**

| Acción | Archivo |
|---|---|
| Borrar (`git rm`) | `Doc/`, `Use Cases/`, `UI Front/`, `index.html`, `.nojekyll`, `package.json`, `package-lock.json` |
| Modificar | `README.md`, `CLAUDE.md` |
| Sin cambios | `power-app/`, `Db Creator/`, `Status/`, `.gitignore`, `.vscode/` |

---

# Parte A — Repo `PowerApp-Docs`

### Task 1: Verificador de links

Un script que comprueba que todo `href`, `src`, `fetch(...)` y `SRC = ...` relativo de las vistas HTML, y todo link relativo de los README, apunte a un archivo existente. Vive **fuera de los dos repos** (no es un entregable): en `D:\Power App\Docs\`, la carpeta que contiene al repo de docs. Se puede borrar al terminar.

**Files:**
- Create: `D:\Power App\Docs\check_links.py`

- [ ] **Step 1: Guardar el script en `D:\Power App\Docs\check_links.py`**

```python
"""Verifica que toda referencia relativa de las vistas HTML y de los README apunte a un archivo existente.

Uso: python check_links.py <raiz-del-repo>
Sale con codigo 1 si hay referencias rotas o archivos clave ausentes.
"""
import re
import sys
from pathlib import Path
from urllib.parse import unquote

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(sys.argv[1]).resolve()
errors = []
checked = 0

HTML_PATTERNS = [
    r"""(?:href|src)\s*=\s*["']([^"']*)["']""",
    r"""fetch\(\s*["']([^"']*)["']""",
    r"""\bSRC\s*=\s*["']([^"']*)["']""",
]
MD_PATTERN = r"\]\(([^)\s]+)\)"


def is_skippable(ref):
    return (
        not ref
        or ref.startswith("#")
        or re.match(r"^(https?:|mailto:|data:|javascript:|//)", ref) is not None
        or "$" in ref
        or "{" in ref
    )


def check(source, ref):
    global checked
    ref = ref.strip()
    if is_skippable(ref):
        return
    target = unquote(ref.split("#")[0].split("?")[0])
    if not target:
        return
    checked += 1
    if not (source.parent / target).resolve().exists():
        errors.append(f"{source.relative_to(ROOT)}: '{ref}' -> no existe")


def read(path):
    if not path.exists():
        errors.append(f"{path.relative_to(ROOT)}: el archivo no existe")
        return None
    return path.read_text(encoding="utf-8")


html_files = [
    ROOT / "index.html",
    ROOT / "Use Cases" / "index.html",
    ROOT / "Doc" / "modelo-db.html",
    ROOT / "Status" / "dashboard-estado-CU.html",
    ROOT / "UI Front" / "powerapp-prototype-app.html",
    ROOT / "UI Front" / "powerapp-prototype-web.html",
]
md_files = [ROOT / "README.md", ROOT / "Use Cases" / "README.md"]

for f in html_files:
    text = read(f)
    if text is None:
        continue
    for pattern in HTML_PATTERNS:
        for ref in re.findall(pattern, text):
            check(f, ref)

for f in md_files:
    text = read(f)
    if text is None:
        continue
    for ref in re.findall(MD_PATTERN, text):
        check(f, ref)

print(f"Referencias relativas verificadas: {checked}")
for e in errors:
    print("ERROR", e)
print(f"{len(errors)} errores")
sys.exit(1 if errors else 0)
```

- [ ] **Step 2: Línea base — correrlo contra el backend actual (árbol bueno)**

```bash
python "D:/Power App/Docs/check_links.py" "D:/Power App/Backend/PowerApp-Backend"; echo "exit=$?"
```

Expected:

```
Referencias relativas verificadas: 91
0 errores
exit=0
```

- [ ] **Step 3: Control negativo — correrlo contra el repo de docs todavía vacío**

```bash
python "D:/Power App/Docs/check_links.py" "D:/Power App/Docs/PowerApp-Docs"; echo "exit=$?"
```

Expected: `exit=1`, con 7 líneas `ERROR ...: el archivo no existe` (los 6 HTML y `Use Cases\README.md`) y `7 errores`. Si da `exit=0` el verificador no sirve: no seguir.

(Sin stage: el script no está en ningún repo.)

---

### Task 2: Copiar lo versionado desde el backend

Se copian **solo archivos versionados** (`git ls-files`), así nunca viaja basura ni se pisa lo que ya hay en destino (`Doc/specs/2026-10-03-...-design.md` y este plan).

**Files:**
- Create: `D/Doc/**`, `D/Use Cases/**`, `D/UI Front/**`, `D/index.html`, `D/.nojekyll`

- [ ] **Step 1: Copiar**

```bash
B="D:/Power App/Backend/PowerApp-Backend"; D="D:/Power App/Docs/PowerApp-Docs"
cd "$B" && git ls-files -z -- Doc "Use Cases" "UI Front" index.html .nojekyll | xargs -0 cp --parents -t "$D"
```

- [ ] **Step 2: Verificar la cantidad**

```bash
B="D:/Power App/Backend/PowerApp-Backend"; D="D:/Power App/Docs/PowerApp-Docs"
echo "origen versionado: $(git -C "$B" ls-files -- Doc 'Use Cases' 'UI Front' index.html .nojekyll | wc -l)"
echo "destino:           $(cd "$D" && find Doc 'Use Cases' 'UI Front' index.html .nojekyll -type f | wc -l)"
```

Expected: origen `112`, destino `114` (los 112 más la spec y este plan, que ya estaban en destino).

- [ ] **Step 3: Verificar que la copia es idéntica byte a byte**

```bash
B="D:/Power App/Backend/PowerApp-Backend"; D="D:/Power App/Docs/PowerApp-Docs"
for p in Doc "Use Cases" "UI Front"; do diff -rq "$B/$p" "$D/$p"; done
cmp "$B/index.html" "$D/index.html" && cmp "$B/.nojekyll" "$D/.nojekyll" && echo "raiz identica"
```

Expected: exactamente estas dos líneas de `diff` (los archivos que solo existen en destino) y `raiz identica`:

```
Only in D:/Power App/Docs/PowerApp-Docs/Doc/plans: 2026-10-03-separar-repo-docs-plan.md
Only in D:/Power App/Docs/PowerApp-Docs/Doc/specs: 2026-10-03-separar-repo-docs-design.md
```

Cualquier otra diferencia = copia incorrecta: repetir el Step 1.

- [ ] **Step 4: El verificador debe fallar solo por `Status/`**

```bash
python "D:/Power App/Docs/check_links.py" "D:/Power App/Docs/PowerApp-Docs"; echo "exit=$?"
```

Expected: `exit=1` y errores **únicamente** sobre `Status` (`Status\dashboard-estado-CU.html: el archivo no existe` y `index.html: 'Status/dashboard-estado-CU.html' -> no existe`). Es lo que arregla el Task 3.

(Stage: se hace al final, en el Task 7.)

---

### Task 3: Copiar los dos archivos de `Status/`

Es una **copia inicial**: de acá en adelante la sincroniza el usuario a mano desde el backend (decisión 5 de la spec).

**Files:**
- Create: `D/Status/estado-implementacion-CU.md`, `D/Status/dashboard-estado-CU.html`

- [ ] **Step 1: Copiar**

```bash
B="D:/Power App/Backend/PowerApp-Backend"; D="D:/Power App/Docs/PowerApp-Docs"
mkdir -p "$D/Status" && cp "$B/Status/estado-implementacion-CU.md" "$B/Status/dashboard-estado-CU.html" "$D/Status/"
cmp "$B/Status/estado-implementacion-CU.md" "$D/Status/estado-implementacion-CU.md" && cmp "$B/Status/dashboard-estado-CU.html" "$D/Status/dashboard-estado-CU.html" && echo "Status identico"
```

Expected: `Status identico`.

- [ ] **Step 2: El verificador ya debe pasar**

```bash
python "D:/Power App/Docs/check_links.py" "D:/Power App/Docs/PowerApp-Docs"; echo "exit=$?"
```

Expected: `0 errores` y `exit=0` (el conteo de referencias será menor que 91 porque el README de docs todavía es el de 15 bytes).

---

### Task 4: Chip de repo del `index.html`

Es el único cambio de contenido en un archivo copiado (spec §4). Las demás menciones a "backend" del HTML son descripciones que siguen siendo ciertas.

**Files:**
- Modify: `D/index.html:401` y `D/index.html:403`

- [ ] **Step 1: Cambiar el `href`** (línea 401)

Con la herramienta Edit sobre `D:\Power App\Docs\PowerApp-Docs\index.html`:

- `old_string`: `href="https://github.com/FranCarames/PowerApp-Backend"`
- `new_string`: `href="https://github.com/FranCarames/PowerApp-Docs"`

- [ ] **Step 2: Cambiar el texto visible** (línea 403)

- `old_string`: `      FranCarames/PowerApp-Backend` (6 espacios de indentación, sin nada después)
- `new_string`: `      FranCarames/PowerApp-Docs`

- [ ] **Step 3: Verificar**

```bash
D="D:/Power App/Docs/PowerApp-Docs"
grep -n "PowerApp-Backend" "$D/index.html"; echo "(vacio = sin menciones al repo viejo)"
grep -n "FranCarames/PowerApp-Docs" "$D/index.html"
```

Expected: primer `grep` sin salida; segundo `grep` con 2 líneas (la 401 con el `href` y la 403 con el texto).

---

### Task 5: `README.md` del repo de docs

**Files:**
- Modify (reemplazo completo): `D/README.md`

- [ ] **Step 1: Leer el archivo actual**

Leer `D:\Power App\Docs\PowerApp-Docs\README.md` (15 bytes, solo un título). La herramienta Write exige haberlo leído antes de sobrescribirlo.

- [ ] **Step 2: Escribir el contenido completo**

````markdown
# PowerApp — Docs

Documentación de **PowerApp**, una aplicación de gimnasio y entrenamiento: modelo de datos, especificaciones de casos de uso (CU), prototipos de interfaces y el sitio de GitHub Pages que los publica.

El código de la API vive en el repo hermano **[PowerApp-Backend](https://github.com/FranCarames/PowerApp-Backend)**, y todos sus servicios REST están documentados en **[Swagger](https://powerapp-backend.onrender.com/docs)**.

🌐 **Sitio publicado:** **[francarames.github.io/PowerApp-Docs](https://francarames.github.io/PowerApp-Docs/)**

---

## 📚 Vistas

| Vista | Descripción |
|---|---|
| 🧭 **[Portada](https://francarames.github.io/PowerApp-Docs/)** | Índice de toda la documentación |
| 📱 **[Prototipo de interfaces](https://francarames.github.io/PowerApp-Docs/UI%20Front/powerapp-prototype-app.html)** | Mockups navegables de las pantallas, por rol — app mobile y [versión web](https://francarames.github.io/PowerApp-Docs/UI%20Front/powerapp-prototype-web.html) |
| 📊 **[Estado de implementación](https://francarames.github.io/PowerApp-Docs/Status/dashboard-estado-CU.html)** | Dashboard de avance: cada CU vs. el código (copia, ver nota) |
| 📄 **[Especificaciones de CU](https://francarames.github.io/PowerApp-Docs/Use%20Cases/)** | Las especificaciones de casos de uso, por rol y paquete |
| 🗃️ **[Modelo de datos](https://francarames.github.io/PowerApp-Docs/Doc/modelo-db.html)** | Visor del diagrama entidad-relación de la base, con zoom y arrastre ([PDF](https://francarames.github.io/PowerApp-Docs/Doc/PowerApp%20-%20Modelo%20DB.pdf)) |

---

## 📁 Estructura

```
Doc/         → Documentación vigente: modelo de datos (SVG/PDF + visor), specs y planes de cada cambio, contexto para la app iOS.
Use Cases/   → Especificaciones de los casos de uso (1 .md por CU, por rol) + índice y visor.
UI Front/    → Prototipos HTML de las interfaces (app y web).
Status/      → Copia del informe y del dashboard de avance por CU.
index.html   → Portada de GitHub Pages.
```

## Fuentes de verdad

- **Modelo de datos:** `Doc/PowerApp - Modelo DB.svg` / `.pdf`. Ante un conflicto con las entidades TypeORM del backend, manda este modelo.
- **Especificaciones de CU:** `Use Cases/`. El índice `Use Cases/README.md` alimenta el visor.

> **`Status/` es una copia.** La fuente es la carpeta `Status/` del repo [PowerApp-Backend](https://github.com/FranCarames/PowerApp-Backend), porque el avance se actualiza junto con el código. Se sincroniza a mano: puede estar desactualizada respecto del backend.

## Ver el sitio en local

Los visores usan `fetch`, así que **no funcionan abriendo el HTML con `file://`**. Servir la carpeta por HTTP:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000/`.
````

- [ ] **Step 3: Verificar**

```bash
D="D:/Power App/Docs/PowerApp-Docs"
grep -c "francarames.github.io/PowerApp-Backend" "$D/README.md"
python "D:/Power App/Docs/check_links.py" "$D"; echo "exit=$?"
```

Expected: el `grep -c` imprime `0`; el verificador da `0 errores` y `exit=0`. (Los links del README son absolutos, así que el verificador no suma referencias nuevas; lo que se comprueba es que no se rompió nada.)

---

### Task 6: `CLAUDE.md` del repo de docs

**Files:**
- Create: `D/CLAUDE.md`

- [ ] **Step 1: Escribir el archivo**

````markdown
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
````

- [ ] **Step 2: Verificar que no queda ninguna mención a Pages del backend**

```bash
D="D:/Power App/Docs/PowerApp-Docs"
grep -n "francarames.github.io/PowerApp-Backend" "$D/CLAUDE.md" "$D/README.md" "$D/index.html"; echo "(vacio = correcto)"
```

Expected: sin salida.

---

### Task 7: Verificación final y stage — **PARAR acá**

**Files:** ninguno nuevo.

- [ ] **Step 1: Verificador de links, versión final**

```bash
python "D:/Power App/Docs/check_links.py" "D:/Power App/Docs/PowerApp-Docs"; echo "exit=$?"
```

Expected: `0 errores`, `exit=0`.

- [ ] **Step 2: Stagear**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && git add Doc "Use Cases" "UI Front" Status index.html .nojekyll README.md CLAUDE.md
git status --short | cut -c1-2 | sort | uniq -c
```

Expected (117 archivos nuevos y 1 modificado):

```
    117 A 
      1 M 
```

Desglose de los 117: `Doc` 32 (30 copiados + spec + plan), `Use Cases` 78, `UI Front` 2, `Status` 2, `index.html` + `.nojekyll` 2, `CLAUDE.md` 1. El `M` es el `README.md`.

- [ ] **Step 3: Confirmar que no se stageó nada ajeno**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && git status --short | grep -v '^[AM] ' ; echo "(vacio = nada sin stagear ni ajeno)"
```

Expected: sin salida.

- [ ] **Step 4: Sugerir el mensaje de commit y parar**

Mostrarle al usuario el resultado de `git diff --cached --stat | tail -1` y este mensaje para que lo copie:

```
Documentación separada del repo del backend: Doc, Use Cases, UI Front, Status (copia) y sitio de Pages
```

**No commitear.** Pasar a la Parte B.

---

# Parte B — Compuerta del usuario

### Task 8: Publicar y validar el repo de docs

Lo hace **el usuario**; el agente no avanza a la Parte C hasta que lo confirme.

- [ ] **Step 1:** Commitear y pushear `PowerApp-Docs` (`git commit` con el mensaje sugerido y `git push`).
- [ ] **Step 2:** En GitHub: repo `PowerApp-Docs` → Settings → Pages → Source = "Deploy from a branch", branch `main`, carpeta `/ (root)`.
- [ ] **Step 3:** Esperar a que termine el despliegue (pestaña Actions o el aviso verde de Pages) y abrir https://francarames.github.io/PowerApp-Docs/ . Comprobar a mano:
  - La portada carga y las 4 cards (prototipo, dashboard, CU, modelo) abren.
  - El visor de CU (`/Use%20Cases/`) muestra el sidebar y abre un CU.
  - El visor del modelo (`/Doc/modelo-db.html`) muestra el diagrama con zoom.
  - Los dos prototipos abren.
- [ ] **Step 4:** Avisar al agente: "Docs publicado y validado".

---

# Parte C — Repo `PowerApp-Backend`

> Solo después de la confirmación del Task 8. Cwd: `D:\Power App\Backend\PowerApp-Backend`.

### Task 9: Precondiciones

- [ ] **Step 1: Docs pusheado y el sitio responde**

```bash
D="D:/Power App/Docs/PowerApp-Docs"
git -C "$D" fetch --quiet && git -C "$D" status -sb | head -1
for u in "" "Doc/modelo-db.html" "Use%20Cases/README.md" "Status/dashboard-estado-CU.html" "UI%20Front/powerapp-prototype-web.html"; do
  printf "%s  %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "https://francarames.github.io/PowerApp-Docs/$u")" "/$u"
done
```

Expected: la primera línea es `## main...origin/main` **sin** `[ahead N]`, y las cinco URLs devuelven `200`. Si no, parar y avisar al usuario.

- [ ] **Step 2: El backend está limpio y nada suelto queda atrás**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git status --short; echo "(vacio = limpio)"
git status --short --ignored -- Doc "Use Cases" "UI Front" index.html .nojekyll package.json package-lock.json; echo "(vacio = nada suelto)"
```

Expected: ambos sin salida. Si hay archivos sin versionar en esas carpetas, mostrárselos al usuario y no seguir hasta que decida.

---

### Task 10: Sacar lo movido del backend

**Files:**
- Delete: `Doc/`, `Use Cases/`, `UI Front/`, `index.html`, `.nojekyll`, `package.json`, `package-lock.json`

- [ ] **Step 1: `git rm`**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
git rm -r -q -- Doc "Use Cases" "UI Front" index.html .nojekyll package.json package-lock.json
git status --short | cut -c1-2 | sort | uniq -c
```

Expected: `    114 D ` (Doc 30 + Use Cases 78 + UI Front 2 + `index.html` + `.nojekyll` + los 2 de `package*.json`).

- [ ] **Step 2: Confirmar que las carpetas desaparecieron y que lo que se queda está intacto**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
ls -d Doc "Use Cases" "UI Front" 2>&1 | head -3
git ls-files | awk -F/ '{print $1}' | LC_ALL=C sort -u
```

Expected: el `ls` responde `No such file or directory` para las tres. El listado de raíces versionadas queda exactamente así:

```
.gitignore
.vscode
CLAUDE.md
Db Creator
README.md
Status
power-app
```

Si alguna carpeta sigue existiendo, `ls -la` y mostrarle al usuario lo que quedó (no borrarlo).

---

### Task 11: `README.md` del backend

**Files:**
- Modify: `README.md` (secciones "Documentación", "Estructura del repositorio" y "Estado del proyecto")

- [ ] **Step 1: Leer el archivo** (la herramienta Edit lo exige)

- [ ] **Step 2: Reescribir el párrafo introductorio de "Documentación"** (hacerlo **antes** del Step 3, porque su `old_string` contiene la URL vieja)

- `old_string`:

```
La documentación visual está publicada en **[francarames.github.io/PowerApp-Backend](https://francarames.github.io/PowerApp-Backend/)** y la de la API, en **Swagger**. Todo es accesible desde la portada:
```

- `new_string`:

```
La documentación de la API está en **Swagger**. El resto (modelo de datos, especificaciones de CU, prototipos) vive en el repo **[PowerApp-Docs](https://github.com/FranCarames/PowerApp-Docs)** y se publica en **[francarames.github.io/PowerApp-Docs](https://francarames.github.io/PowerApp-Docs/)**. Todo es accesible desde la portada:
```

- [ ] **Step 3: Apuntar el resto de las URLs al sitio nuevo** (Edit con `replace_all: true`)

- `old_string`: `francarames.github.io/PowerApp-Backend`
- `new_string`: `francarames.github.io/PowerApp-Docs`

Esto actualiza las filas de la tabla y el link del dashboard en "Estado del proyecto".

- [ ] **Step 4: Reducir "Estructura del repositorio"**

`old_string` (empieza en la línea `power-app/` y **termina en la línea de cierre ` ``` ` del bloque de código** del README):

````
power-app/         → Código de la API (NestJS). Entidades en src/entities.
Use Cases/         → Especificaciones de los 75 casos de uso (1 .md por CU) + índice.
Status/            → Informe y dashboard del avance de implementación por CU.
Db Creator/        → Scripts (Python) que regeneran la base desde cero → 3 archivos .sql.
Doc/               → Documentación vigente del proyecto (modelo de datos actualizado).
UI Front/          → Prototipo HTML de las interfaces.
index.html         → Portada de GitHub Pages.
```
````

`new_string` (también **cierra** el bloque de código del README antes de la cita):

````
power-app/         → Código de la API (NestJS). Entidades en src/entities.
Status/            → Informe y dashboard del avance de implementación por CU.
Db Creator/        → Scripts (Python) que regeneran la base desde cero → 3 archivos .sql.
```

> La documentación (modelo de datos, especificaciones de CU, prototipos y el sitio de GitHub Pages) vive en el repo hermano **[PowerApp-Docs](https://github.com/FranCarames/PowerApp-Docs)**. `Status/` es la fuente del avance; el sitio publica una copia que se sincroniza a mano.
````

- [ ] **Step 5: Verificar**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
grep -n "PowerApp-Backend/" README.md; echo "(vacio = ninguna URL de Pages vieja)"
grep -c "francarames.github.io/PowerApp-Docs" README.md
grep -nE "Use Cases/|UI Front/|Doc/ " README.md; echo "(vacio = sin rutas locales a lo movido)"
```

Expected: primer `grep` sin salida; el conteo imprime `7`; el tercer `grep` sin salida.

---

### Task 12: `CLAUDE.md` del backend

**Files:**
- Modify: `CLAUDE.md` (secciones "Ubicaciones clave", "Artefactos de Status" y "Flujo de trabajo por cambio")

- [ ] **Step 1: Leer el archivo**

- [ ] **Step 2: Encabezado y párrafo de `Doc/`**

Edit 1 — `old_string`: `### Documentación actualizada del proyecto (`Doc/`)` → `new_string`: `### Documentación actualizada del proyecto (`Doc/`, repo PowerApp-Docs)`

Edit 2 — `old_string`:

```
`Doc/` (raíz del backend) guarda la documentación **vigente** del proyecto — sobre todo el **modelo de datos actualizado**.
```

`new_string`:

```
`Doc/` vive en el **repo de documentación** (`D:\Power App\Docs\PowerApp-Docs\Doc`, GitHub `FranCarames/PowerApp-Docs`), no en este, y guarda la documentación **vigente** del proyecto — sobre todo el **modelo de datos actualizado**.
```

Edit 3 — `old_string`: `Toda documentación nueva del proyecto se guarda en esta carpeta.`

`new_string`: `Toda documentación nueva del proyecto, incluidas las specs y planes de cada cambio (`Doc/specs/`, `Doc/plans/`), se guarda en ese repo, no en este.`

- [ ] **Step 3: Especificaciones de CU**

- `old_string`:

```
### Especificaciones de Casos de Uso (72 CU)
`D:\Power App\Documentation\Especificaciones de CU\especificaciones\` (directorio de Documentación, **fuera del repo**).
- Subcarpetas por rol: `admin/`, `entrenador/`, `usuario/`.
- `README.md` es el índice de los 72 CU.
```

- `new_string`:

```
### Especificaciones de Casos de Uso
`D:\Power App\Docs\PowerApp-Docs\Use Cases\` (repo de documentación, **fuera de este repo**; es la fuente de verdad). La vieja copia en `D:\Power App\Documentation\` quedó como archivo histórico: no se usa.
- Subcarpetas por rol: `admin/`, `entrenador/`, `usuario/`.
- `README.md` es el índice de los CU.
```

- [ ] **Step 4: Artefactos de Status**

- `old_string`: `Reflejan el avance de implementación de los CU. **Se mantienen a mano.**`

- `new_string`:

```
Reflejan el avance de implementación de los CU. **Se mantienen a mano.**
El repo de documentación (`PowerApp-Docs`) publica una **copia** de estos dos archivos, que **el usuario sincroniza a mano**. En el flujo de Status se editan **sólo** los de este repo: no tocar `PowerApp-Docs`.
```

- [ ] **Step 5: Flujo de trabajo por cambio**

Edit 1 — `old_string`: `4. Actualizar los **artefactos de Status** (informe `.md` + dashboard `.html`).`

`new_string`: `4. Actualizar los **artefactos de Status** (informe `.md` + dashboard `.html`), sólo en este repo (la copia al sitio de `PowerApp-Docs` la sincroniza el usuario).`

Edit 2 — `old_string`: `5. Commit (el usuario commitea con su estilo).`

`new_string`:

```
5. Commit (el usuario commitea con su estilo).

> Las **specs** (`Doc/specs/`) y **planes** (`Doc/plans/`) de cada cambio se escriben en el repo `PowerApp-Docs` y se dejan stageados ahí. Cada repo tiene su propio commit, que hace el usuario.
```

- [ ] **Step 6: Verificar**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
grep -n "Documentation" CLAUDE.md; echo "(vacio = sin referencias a la carpeta vieja)"
grep -n "72 CU\|(raíz del backend)" CLAUDE.md; echo "(vacio = sin textos viejos)"
grep -c "PowerApp-Docs" CLAUDE.md
```

Expected: el primer `grep` muestra solo la línea que dice que la copia vieja quedó como archivo histórico (menciona `D:\Power App\Documentation\`); el segundo, sin salida; el conteo, `6` o más.

---

### Task 13: Compilación, stage y cierre — **PARAR acá**

- [ ] **Step 1: Verificar que el build sigue andando** (se sacó el `package.json` de la raíz)

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build; echo "exit=$?"
```

Expected: `exit=0`. No se levanta el servidor (el usuario prueba el entorno).

- [ ] **Step 2: Stagear lo editado** (`git rm` ya dejó stageadas las bajas)

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add README.md CLAUDE.md
git status --short | cut -c1-2 | sort | uniq -c
```

Expected: `    114 D ` y `      2 M `.

- [ ] **Step 3: Sugerir el mensaje de commit y parar**

```
Documentación movida al repo PowerApp-Docs: se sacan Doc, Use Cases, UI Front, index.html y package.json de la raíz
```

**No commitear.** Avisar al usuario de lo que le toca:

1. Commitear (con el mensaje sugerido) y pushear el backend.
2. **Antes de apagar Pages del backend**, revisar si pegó la URL vieja (`francarames.github.io/PowerApp-Backend/...`) en entregas, mensajes o perfiles.
3. Apagar Pages del backend: repo `PowerApp-Backend` → Settings → Pages → Source = "None" (o "Unpublish site").
4. Opcional: borrar a mano `node_modules/` y el `src/` vacío de la raíz del backend (sin versionar).

---

# Parte D — Memoria del proyecto

### Task 14: Actualizar las notas de memoria

Las notas están en `C:\Users\caram\.claude\projects\D--Power-App-Backend-PowerApp-Backend\memory\`. Cada edición se aplica con la herramienta Edit sobre ese archivo.

- [ ] **Step 1: `project_github_pages.md`**

- `old_string`: `El repo `FranCarames/PowerApp-Backend` es público y publica su documentación HTML vía **GitHub Pages**.`
  `new_string`: `Desde 2026-10-03 la documentación HTML se publica vía **GitHub Pages** desde el repo **`FranCarames/PowerApp-Docs`** (clonado en `D:\Power App\Docs\PowerApp-Docs`); el backend ya no publica Pages. Todas las rutas de esta nota (`index.html`, `Doc/`, `Use Cases/`, `UI Front/`) son relativas a ese repo. `Status/` allá es una **copia** que el usuario sincroniza a mano desde `Status/` del backend (la fuente).`
- `old_string`: `- **URL pública:** https://FranCarames.github.io/PowerApp-Backend/`
  `new_string`: `- **URL pública:** https://FranCarames.github.io/PowerApp-Docs/`
- `old_string` (línea `description:` del front matter): `description: Setup de GitHub Pages del backend — sirve la doc HTML desde main/root con un landing index.html`
  `new_string`: `description: Setup de GitHub Pages — desde 2026-10-03 vive en el repo PowerApp-Docs (main/root, landing index.html); el backend ya no publica`

- [ ] **Step 2: `project_cu_status.md`**

- `old_string`: `contra `Documentation/Especificaciones de CU/especificaciones/` (72 CU, fuera del repo).`
  `new_string`: `contra `D:\Power App\Docs\PowerApp-Docs\Use Cases\` (repo PowerApp-Docs, fuente de verdad desde 2026-10-03; la vieja copia en `D:\Power App\Documentation\` quedó como archivo).`
- `old_string`: `` `Doc/PowerApp - Cronograma 2do cuatrimestre.docx`, organizado por viernes: ``
  `new_string`: `` `Doc/um/PowerApp - Cronograma 2do cuatrimestre.docx` (repo PowerApp-Docs), organizado por viernes: ``
- `old_string`: `Diseño viejo en `Doc/specs/2026-08-10-routine-exercise-set-finished-design.md``
  `new_string`: `Diseño viejo en `Doc/specs/2026-08-10-routine-exercise-set-finished-design.md` (repo PowerApp-Docs)`

- [ ] **Step 3: `project_data_model_reconciliation.md`**

- `old_string`: `**El diagrama de `Doc/PowerApp - Modelo DB.svg` / `.pdf` es la fuente de verdad**`
  `new_string`: `**El diagrama de `Doc/PowerApp - Modelo DB.svg` / `.pdf` (repo PowerApp-Docs: `D:\Power App\Docs\PowerApp-Docs\Doc`) es la fuente de verdad**`

- [ ] **Step 4: `feedback_working_style.md`**

- `old_string`: `brainstorming → spec en `Doc/specs/YYYY-MM-DD-<tema>-design.md` → plan en `Doc/plans/` → implementar → actualizar `Status/` → dejar stageado. Las specs y planes se commitean junto con el código.`
  `new_string`: `brainstorming → spec en `Doc/specs/YYYY-MM-DD-<tema>-design.md` → plan en `Doc/plans/` (ambos en el repo PowerApp-Docs desde 2026-10-03) → implementar → actualizar `Status/` (en el backend) → dejar stageado en cada repo. Un commit por repo, que hace el usuario.`

- [ ] **Step 5: Nueva nota `project_repo_split.md`**

```markdown
---
name: separacion-repo-docs
description: El 2026-10-03 la documentación se separó del backend al repo PowerApp-Docs; qué quedó dónde y qué sincroniza el usuario a mano
metadata:
  type: project
---

El 2026-10-03 la documentación salió del repo `PowerApp-Backend` hacia **`FranCarames/PowerApp-Docs`**, clonado en `D:\Power App\Docs\PowerApp-Docs` (sin historial: snapshot con un commit; el historial viejo sigue en el backend).

- **Backend se queda con:** `power-app/`, `Db Creator/`, `Status/`, `CLAUDE.md`, `README.md`.
- **Docs recibe:** `Doc/`, `Use Cases/`, `UI Front/`, `index.html`, `.nojekyll`, y una **copia** de `Status/`.
- **`Status/` es del backend; el usuario copia a mano** los dos archivos al repo de docs. No editar el repo de docs en el paso de Status.
- **Specs y planes nuevos** van a `Doc/specs/` y `Doc/plans/` del repo de docs, stageados ahí.
- Las specs de CU de `D:\Power App\Documentation\` quedaron como archivo histórico: la fuente es `Use Cases/` del repo de docs.

**Why:** el repo del backend mezclaba código con mucha documentación y el usuario quería separar responsabilidades. Eligió dejar `Status/` en el backend porque se actualiza junto con el código, y asumió la sincronización manual.

**How to apply:** ante cualquier ruta a `Doc/` o `Use Cases/`, buscarla en `D:\Power App\Docs\PowerApp-Docs`. No intentar sincronizar `Status/` entre repos. Ver [[project-github-pages]], [[working-style-powerapp]] y [[no-commitear-ni-pushear]]. Spec: `Doc/specs/2026-10-03-separar-repo-docs-design.md` (repo de docs).
```

Y agregar esta línea a `MEMORY.md`:

```
- [Separación backend/docs](project_repo_split.md) — Desde 2026-10-03 la doc vive en PowerApp-Docs; Status queda en el backend y se copia a mano
```

- [ ] **Step 6: Actualizar los ganchos de `MEMORY.md`**

- `old_string`: `El diagrama de `Doc/` manda;` → `new_string`: `El diagrama de `Doc/` (repo PowerApp-Docs) manda;`
- `old_string`: `Publica la doc HTML desde main/root con landing index.html; URL pública y mantenimiento` → `new_string`: `Publica la doc HTML desde PowerApp-Docs (main/root, landing index.html); URL pública y mantenimiento`

(Memoria: no es parte de ningún repo, no se stagea.)

---

## Fin de plan

Al terminar las partes A–D el estado es el de la spec §3: el backend solo con código, `Db Creator/` y `Status/`; el repo de docs con todo lo demás y Pages publicado desde ahí.
