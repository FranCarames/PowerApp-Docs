# Imágenes del catálogo — Plan 1 de 3: el generador y el piloto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tener un generador de SVG por código que produzca las miniaturas de 10 ejercicios piloto, los 35 músculos y los 8 grupos musculares, más una hoja de contacto para que Fran decida si el nivel de pictograma alcanza.

**Architecture:** Un repo nuevo de assets con un generador en Python sin librerías. Lee el catálogo (ids, nombres y músculos) importando los generadores de `Db Creator`, dibuja cada ejercicio como una figura articulada de perfil con los músculos pintados según `Exercised_Muscle`, y dibuja músculos y grupos sobre un mapa del cuerpo de frente o de espalda. Escribe un SVG por fila, nombrado por su `id`.

**Tech Stack:** Python 3 (se invoca con `py`), sólo biblioteca estándar; `unittest` para los tests; SVG a mano.

**Spec:** [Imágenes del catálogo](../specs/2026-11-14-imagenes-del-catalogo-design.md) (D65 a D74).

> **Por qué son tres planes.** La spec tiene una compuerta: el piloto decide si D69 (ilustración por código) se sostiene para los ejercicios. Todo lo demás depende de eso, de la URL del repo (que todavía no existe) y de la cobertura de fotos (sin medir). Este plan llega hasta la compuerta. **Plan 2:** el resto de las poses y las fotos. **Plan 3:** BE-47 (`Db Creator` y el patch) y T62 (el duotono en la web). Se escriben cuando Fran apruebe el piloto.
>
> **Cómo se entrega.** No se commitea ni se pushea: todo queda stageado y el commit lo hace Fran. El repo se crea **local**; el remoto en GitHub y Pages los crea Fran. No se levanta ningún server.
>
> **Dos cosas que agrega este plan y la spec no dice.** (1) El **músculo primario** (el primero de la lista del catálogo) va en naranja pleno y los **secundarios** al 45 % de opacidad; si todos fueran plenos, un peso muerto (cinco músculos) saldría casi todo naranja. (2) La figura de **espalda** del mapa del cuerpo lleva una línea fina de columna para distinguirla de la de frente. Las dos se ven en el piloto y se pueden revertir.

---

## Estructura de archivos

Repo local: `D:\Power App\Assets\PowerApp-Assets\`

| Archivo | Responsabilidad |
|---|---|
| `generator/palette.py` | Los colores y la opacidad de los secundarios |
| `generator/svg.py` | Primitivas SVG: línea, círculo, anillo, polilínea, envoltorio |
| `generator/catalog.py` | Lee de `Db Creator` los ejercicios, músculos y grupos |
| `generator/figure.py` | La figura de perfil: segmentos, regiones por músculo, render |
| `generator/equipment.py` | El equipo en línea fina |
| `generator/poses.py` | Las poses: coordenadas de las articulaciones |
| `generator/exercises.py` | Qué pose y qué equipo le toca a cada ejercicio |
| `generator/bodymap.py` | El mapa del cuerpo: regiones por músculo, SVG de grupo y de músculo |
| `generator/build.py` | Orquestador: escribe los SVG y la hoja de contacto |
| `generator/tests/test_*.py` | Tests con `unittest` |
| `exercise/preview/<id>.svg` | Salida: miniaturas de ejercicios |
| `muscle/<id>.svg`, `muscle-group/<id>.svg` | Salida: músculos y grupos |
| `contact-sheet.html` | Salida: la hoja de contacto |

Todos los comandos se corren parados en `D:\Power App\Assets\PowerApp-Assets`.

**Convenciones del dibujo de perfil.** Lienzo `0 0 100 100`, piso en `y = 90`. Una pose es un diccionario de articulaciones `(x, y)`: `head`, `shoulder`, `elbow`, `hand`, `hip`, `knee`, `ankle`, `toe`; las del lado lejano son opcionales y terminan en `2` (`elbow2`, `hand2`, `knee2`, `ankle2`, `toe2`). `front` vale `1` o `-1` y dice hacia qué lado mira el frente del cuerpo: la normal de un segmento `a → b` es `(-dy, dx) * front`. Con `front = 1`, una figura de pie que mira a la izquierda tiene el frente hacia `-x`.

---

### Task 0: Crear el repo local

**Files:**
- Create: `D:\Power App\Assets\PowerApp-Assets\.gitignore`
- Create: `D:\Power App\Assets\PowerApp-Assets\README.md`

- [ ] **Step 1: Crear la carpeta e iniciar git**

```bash
mkdir -p "/d/Power App/Assets/PowerApp-Assets/generator/tests" && cd "/d/Power App/Assets/PowerApp-Assets" && git init -b main
```

Expected: `Initialized empty Git repository in D:/Power App/Assets/PowerApp-Assets/.git/`

- [ ] **Step 2: Escribir `.gitignore`**

```
__pycache__/
```

- [ ] **Step 3: Escribir `README.md`**

```markdown
# PowerApp-Assets

Imágenes del catálogo de PowerApp (ejercicios, músculos y grupos musculares), generadas por código.

## Regenerar

    py generator/build.py

Lee el catálogo de `Db Creator` del backend. Si no está en `D:\Power App\Backend\PowerApp-Backend\Db Creator`, indicar la ruta en la variable de entorno `POWERAPP_DB_CREATOR`.

`py generator/build.py --check` termina con error si algún ejercicio del catálogo no tiene ilustración.

## Tests

    py -m unittest discover -s generator/tests -v

## Revisar

Abrir `contact-sheet.html`: muestra todas las imágenes a 48 px y ampliadas, sobre los colores de la app.

## Salida

- `exercise/preview/<id>.svg`
- `muscle/<id>.svg`
- `muscle-group/<id>.svg`

El nombre de cada archivo es el `id` de la fila en la base.
```

---

### Task 1: Leer el catálogo

**Files:**
- Create: `generator/catalog.py`
- Test: `generator/tests/test_catalog.py`

- [ ] **Step 1: Escribir el test que falla**

`generator/tests/test_catalog.py`:

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import catalog


class CatalogTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cat = catalog.load()

    def test_counts(self):
        self.assertEqual(len(self.cat["exercises"]), 207)
        self.assertEqual(len(self.cat["muscles"]), 35)
        self.assertEqual(len(self.cat["groups"]), 8)

    def test_ids_are_unique(self):
        for kind in ("exercises", "muscles", "groups"):
            ids = [row["id"] for row in self.cat[kind]]
            self.assertEqual(len(ids), len(set(ids)), kind)

    def test_every_exercise_has_known_muscles(self):
        keys = {m["key"] for m in self.cat["muscles"]}
        for ex in self.cat["exercises"]:
            self.assertTrue(ex["muscles"], ex["name"])
            for key in ex["muscles"]:
                self.assertIn(key, keys, ex["name"])

    def test_original_exercise_keeps_its_id(self):
        by_name = {ex["name"]: ex for ex in self.cat["exercises"]}
        self.assertEqual(by_name["Sentadilla"]["id"], "2c164517-e18f-4c97-a3a7-d31b9865640e")
        self.assertEqual(by_name["Sentadilla"]["muscles"][0], "cuadriceps")

    def test_every_group_lists_its_muscles(self):
        total = sum(len(g["muscles"]) for g in self.cat["groups"])
        self.assertEqual(total, 35)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `py -m unittest discover -s generator/tests -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'catalog'`

- [ ] **Step 3: Escribir `generator/catalog.py`**

```python
# -*- coding: utf-8 -*-
"""Lee el catalogo (ejercicios, musculos, grupos) de los generadores de Db Creator."""
import contextlib
import io
import os
import sys

DB_CREATOR = os.environ.get(
    "POWERAPP_DB_CREATOR",
    r"D:\Power App\Backend\PowerApp-Backend\Db Creator",
)


def load():
    """Devuelve {"exercises": [...], "muscles": [...], "groups": [...]}.

    exercise: {"id", "name", "muscles": [key, ...]}  (el primero es el primario)
    muscle:   {"id", "key", "name", "group_id"}
    group:    {"id", "name", "muscles": [key, ...]}
    """
    if DB_CREATOR not in sys.path:
        sys.path.insert(0, DB_CREATOR)
    # gen_seed imprime al importarse: se silencia.
    with contextlib.redirect_stdout(io.StringIO()):
        import build_sql
        import catalogo_ejercicios
        import gen_seed
        import static_extra

    muscles = [
        {"id": m["id"], "key": key, "name": m["name"], "group_id": m["group"]}
        for key, m in gen_seed.MUSCLES.items()
    ]
    key_by_id = {m["id"]: m["key"] for m in muscles}

    groups = [
        {
            "id": gid,
            "name": name,
            "muscles": [m["key"] for m in muscles if m["group_id"] == gid],
        }
        for name, gid in gen_seed.GROUPS.items()
    ]

    exercises = []
    for row in static_extra.ORIGINAL_EXERCISES:
        eid, name = row[0], row[1]
        keys = [
            key_by_id[link[2]]
            for link in static_extra.ORIGINAL_EXERCISED_MUSCLE
            if link[1] == eid
        ]
        exercises.append({"id": eid, "name": name, "muscles": keys})
    for row in catalogo_ejercicios.EXERCISES:
        name, keys = row[0], row[1]
        if name in build_sql.EXISTING_EXERCISE_NAMES:
            continue
        exercises.append({"id": build_sql.ex_uuid(name), "name": name, "muscles": list(keys)})

    return {"exercises": exercises, "muscles": muscles, "groups": groups}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `py -m unittest discover -s generator/tests -v`
Expected: 5 tests, `OK`.

Si `test_original_exercise_keeps_its_id` falla porque el primer músculo de «Sentadilla» no es `cuadriceps`, el orden lo da `ORIGINAL_EXERCISED_MUSCLE` en `static_extra.py`: es un dato del catálogo, no un error del lector. Ajustar la aserción al primer músculo real y anotarlo para Fran.

---

### Task 2: Primitivas SVG y paleta

**Files:**
- Create: `generator/palette.py`
- Create: `generator/svg.py`
- Test: `generator/tests/test_svg.py`

- [ ] **Step 1: Escribir el test que falla**

`generator/tests/test_svg.py`:

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import svg


class SvgTest(unittest.TestCase):
    def test_line(self):
        self.assertEqual(
            svg.line((1, 2), (3, 4), 5, "#fff"),
            '<path d="M1.0 2.0 L3.0 4.0" fill="none" stroke="#fff" stroke-width="5.0" stroke-linecap="round"/>',
        )

    def test_opacity_only_when_below_one(self):
        self.assertNotIn("opacity", svg.circle((0, 0), 1, "#fff"))
        self.assertIn('opacity="0.45"', svg.circle((0, 0), 1, "#fff", 0.45))

    def test_wrap(self):
        out = svg.wrap("0 0 100 100", ["<g/>"])
        self.assertTrue(out.startswith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'))
        self.assertTrue(out.endswith("</svg>\n"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `py -m unittest discover -s generator/tests -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'svg'`

- [ ] **Step 3: Escribir `generator/palette.py`**

```python
# -*- coding: utf-8 -*-
"""Colores de las ilustraciones (D65). Salen de los tokens de la web."""
BODY = "#5B6280"       # silueta (--tm)
BODY_FAR = "#474D66"   # brazo y pierna del lado lejano, un tono mas oscuro
MUSCLE = "#E8450A"     # musculo que trabaja (--pri)
EQUIP = "#8892A8"      # equipo, en linea fina (--ts)
EQUIP_WIDTH = 1.4
SECONDARY_OPACITY = 0.45
```

- [ ] **Step 4: Escribir `generator/svg.py`**

```python
# -*- coding: utf-8 -*-
"""Primitivas SVG. Todas devuelven un string con un elemento."""


def _op(opacity):
    return "" if opacity >= 1 else ' opacity="{:g}"'.format(opacity)


def line(a, b, width, color, opacity=1):
    return (
        '<path d="M{:.1f} {:.1f} L{:.1f} {:.1f}" fill="none" stroke="{}" '
        'stroke-width="{:.1f}" stroke-linecap="round"{}/>'
    ).format(a[0], a[1], b[0], b[1], color, width, _op(opacity))


def circle(c, r, color, opacity=1):
    return '<circle cx="{:.1f}" cy="{:.1f}" r="{:.1f}" fill="{}"{}/>'.format(
        c[0], c[1], r, color, _op(opacity))


def ring(c, r, color, width):
    return (
        '<circle cx="{:.1f}" cy="{:.1f}" r="{:.1f}" fill="none" stroke="{}" stroke-width="{:.1f}"/>'
    ).format(c[0], c[1], r, color, width)


def polyline(points, color, width):
    d = " ".join("{:.1f},{:.1f}".format(x, y) for x, y in points)
    return (
        '<polyline points="{}" fill="none" stroke="{}" stroke-width="{:.1f}" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    ).format(d, color, width)


def wrap(viewbox, parts):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="{}">\n{}\n</svg>\n'.format(
        viewbox, "\n".join(parts))
```

- [ ] **Step 5: Correr el test y ver que pasa**

Run: `py -m unittest discover -s generator/tests -v`
Expected: 8 tests, `OK`.

---

### Task 3: La figura de perfil

**Files:**
- Create: `generator/figure.py`
- Test: `generator/tests/test_figure.py`

- [ ] **Step 1: Escribir el test que falla**

`generator/tests/test_figure.py`:

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import catalog
import figure
from palette import MUSCLE

SQUAT = {
    "front": 1,
    "head": (37, 24), "shoulder": (41, 36), "elbow": (50, 44), "hand": (46, 35),
    "hip": (62, 58), "knee": (36, 61), "ankle": (46, 84), "toe": (34, 86),
}


class FigureTest(unittest.TestCase):
    def test_every_catalog_muscle_has_a_region(self):
        for m in catalog.load()["muscles"]:
            self.assertIn(m["key"], figure.MUSCLE_REGIONS)

    def test_front_of_the_thigh_is_up_in_a_squat(self):
        n = figure.normal(SQUAT["hip"], SQUAT["knee"], SQUAT["front"])
        self.assertLess(n[1], -0.9)

    def test_front_flips_the_normal(self):
        a, b = (32, 57), (60, 58)  # torso acostado, cabeza a la izquierda
        self.assertGreater(figure.normal(a, b, 1)[1], 0)
        self.assertLess(figure.normal(a, b, -1)[1], 0)

    def test_render_is_an_svg(self):
        out = figure.render(SQUAT)
        self.assertTrue(out.startswith("<svg"))
        self.assertIn('viewBox="0 0 100 100"', out)
        self.assertNotIn(MUSCLE, out)

    def test_primary_is_solid_and_secondary_is_dimmed(self):
        out = figure.render(SQUAT, primary=["cuadriceps"], secondary=["gluteo_mayor"])
        solid = [l for l in out.splitlines() if MUSCLE in l and "opacity" not in l]
        dimmed = [l for l in out.splitlines() if MUSCLE in l and 'opacity="0.45"' in l]
        self.assertEqual(len(solid), 1)
        self.assertEqual(len(dimmed), 1)

    def test_far_limbs_are_drawn_only_when_present(self):
        from palette import BODY_FAR
        self.assertNotIn(BODY_FAR, figure.render(SQUAT))
        lunge = dict(SQUAT, knee2=(70, 76), ankle2=(84, 82), toe2=(82, 89))
        self.assertEqual(figure.render(lunge).count(BODY_FAR), 3)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `py -m unittest discover -s generator/tests -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'figure'`

- [ ] **Step 3: Escribir `generator/figure.py`**

```python
# -*- coding: utf-8 -*-
"""La figura de perfil: silueta maciza, musculos pintados por region (D65, D70)."""
import math

import svg
from palette import BODY, BODY_FAR, MUSCLE, SECONDARY_OPACITY

HEAD_R = 6.5
NECK_W = 5
WIDTH = {"torso": 11, "upper_arm": 6.5, "forearm": 6, "thigh": 8.5, "shin": 7.5, "foot": 5}

# segmento -> (articulacion proximal, articulacion distal)
SEGMENTS = {
    "torso": ("shoulder", "hip"),
    "thigh": ("hip", "knee"),
    "shin": ("knee", "ankle"),
    "foot": ("ankle", "toe"),
    "upper_arm": ("shoulder", "elbow"),
    "forearm": ("elbow", "hand"),
}
FAR_SEGMENTS = {
    "thigh": ("hip", "knee2"),
    "shin": ("knee2", "ankle2"),
    "foot": ("ankle2", "toe2"),
    "upper_arm": ("shoulder", "elbow2"),
    "forearm": ("elbow2", "hand2"),
}

# Region:
#   ("seg", segmento, t0, t1, lado)   lado: "front" | "back" | "full"
#   ("blob", articulacion, lado, radio)   lado: "front" | "back" | "center"
#   ("neck",)   ("all",)
MUSCLE_REGIONS = {
    "cuadriceps": [("seg", "thigh", 0.10, 0.95, "front")],
    "isquios": [("seg", "thigh", 0.10, 0.95, "back")],
    "aductores": [("seg", "thigh", 0.05, 0.55, "back")],
    "gluteo_mayor": [("blob", "hip", "back", 5.0)],
    "gluteo_medio": [("blob", "hip", "back", 3.5)],
    "flexores_cadera": [("blob", "hip", "front", 3.5)],
    "gemelos": [("seg", "shin", 0.05, 0.70, "back")],
    "pec_superior": [("seg", "torso", 0.05, 0.30, "front")],
    "pec_medio": [("seg", "torso", 0.10, 0.40, "front")],
    "pec_inferior": [("seg", "torso", 0.25, 0.45, "front")],
    "serrato": [("seg", "torso", 0.30, 0.50, "front")],
    "recto_abdominal": [("seg", "torso", 0.50, 0.95, "front")],
    "oblicuo": [("seg", "torso", 0.55, 0.90, "front")],
    "transverso": [("seg", "torso", 0.65, 0.95, "front")],
    "trapecio": [("seg", "torso", 0.00, 0.30, "back")],
    "romboide": [("seg", "torso", 0.10, 0.35, "back")],
    "redondo_mayor": [("seg", "torso", 0.15, 0.35, "back")],
    "dorsal": [("seg", "torso", 0.25, 0.70, "back")],
    "erectores": [("seg", "torso", 0.55, 1.00, "back")],
    "delt_anterior": [("blob", "shoulder", "center", 4.2)],
    "delt_lateral": [("blob", "shoulder", "center", 4.2)],
    "delt_posterior": [("blob", "shoulder", "center", 4.2)],
    "biceps_larga": [("seg", "upper_arm", 0.15, 0.90, "front")],
    "biceps_corta": [("seg", "upper_arm", 0.15, 0.90, "front")],
    "braquial": [("seg", "upper_arm", 0.55, 1.00, "front")],
    "triceps_larga": [("seg", "upper_arm", 0.15, 0.90, "back")],
    "triceps_lateral": [("seg", "upper_arm", 0.15, 0.90, "back")],
    "triceps_medial": [("seg", "upper_arm", 0.55, 1.00, "back")],
    "flexores_antebrazo": [("seg", "forearm", 0.05, 0.90, "front")],
    "extensores_antebrazo": [("seg", "forearm", 0.05, 0.90, "back")],
    "braquiorradial": [("seg", "forearm", 0.00, 0.60, "front")],
    "agarre": [("blob", "hand", "center", 3.2)],
    "cuello": [("neck",)],
    "cardiovascular": [("seg", "torso", 0.05, 0.45, "full")],
    "full_body": [("all",)],
}


def normal(a, b, front):
    """Normal unitaria del segmento a -> b que apunta al frente del cuerpo."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy) or 1.0
    return (-dy / length * front, dx / length * front)


def _lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def _shift(p, n, amount):
    return (p[0] + n[0] * amount, p[1] + n[1] * amount)


def _body(pose, color):
    parts = [svg.line(pose["head"], pose["shoulder"], NECK_W, color)]
    for seg, (a, b) in SEGMENTS.items():
        parts.append(svg.line(pose[a], pose[b], WIDTH[seg], color))
    parts.append(svg.circle(pose["head"], HEAD_R, color))
    return parts


def _highlight(pose, key, opacity):
    front = pose.get("front", 1)
    parts = []
    for region in MUSCLE_REGIONS[key]:
        kind = region[0]
        if kind == "all":
            parts.append(svg.line(pose["head"], pose["shoulder"], NECK_W, MUSCLE, opacity))
            for seg, (a, b) in SEGMENTS.items():
                parts.append(svg.line(pose[a], pose[b], WIDTH[seg], MUSCLE, opacity))
            parts.append(svg.circle(pose["head"], HEAD_R, MUSCLE, opacity))
        elif kind == "neck":
            parts.append(svg.line(pose["head"], pose["shoulder"], NECK_W, MUSCLE, opacity))
        elif kind == "seg":
            _, seg, t0, t1, side = region
            a, b = pose[SEGMENTS[seg][0]], pose[SEGMENTS[seg][1]]
            p0, p1 = _lerp(a, b, t0), _lerp(a, b, t1)
            width = WIDTH[seg]
            if side != "full":
                sign = 1 if side == "front" else -1
                n = normal(a, b, front)
                p0 = _shift(p0, n, width * 0.22 * sign)
                p1 = _shift(p1, n, width * 0.22 * sign)
                width = width * 0.56
            parts.append(svg.line(p0, p1, width, MUSCLE, opacity))
        elif kind == "blob":
            _, joint, side, radius = region
            sign = {"front": 1, "back": -1, "center": 0}[side]
            n = normal(pose["shoulder"], pose["hip"], front)
            center = _shift(pose[joint], n, WIDTH["torso"] * 0.22 * sign)
            parts.append(svg.circle(center, radius, MUSCLE, opacity))
        else:
            raise ValueError("region desconocida: {!r}".format(region))
    return parts


def render(pose, primary=(), secondary=(), equipment_parts=()):
    """SVG de la figura. primary va en naranja pleno; secondary, atenuado."""
    parts = []
    for seg, (a, b) in FAR_SEGMENTS.items():
        if a in pose and b in pose:
            parts.append(svg.line(pose[a], pose[b], WIDTH[seg], BODY_FAR))
    parts.extend(_body(pose, BODY))
    for key in secondary:
        parts.extend(_highlight(pose, key, SECONDARY_OPACITY))
    for key in primary:
        parts.extend(_highlight(pose, key, 1))
    parts.extend(equipment_parts)
    return svg.wrap("0 0 100 100", parts)
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `py -m unittest discover -s generator/tests -v`
Expected: 14 tests, `OK`.

---

### Task 4: El equipo

**Files:**
- Create: `generator/equipment.py`
- Test: `generator/tests/test_equipment.py`

- [ ] **Step 1: Escribir el test que falla**

`generator/tests/test_equipment.py`:

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import equipment
from palette import EQUIP

POSE = {"hand": (40, 30)}


class EquipmentTest(unittest.TestCase):
    def test_points_can_be_joints_or_coordinates(self):
        out = equipment.render(POSE, [("line", "hand", (40, 6))])
        self.assertEqual(len(out), 1)
        self.assertIn("M40.0 30.0 L40.0 6.0", out[0])
        self.assertIn(EQUIP, out[0])

    def test_plate_is_two_rings(self):
        self.assertEqual(len(equipment.render(POSE, [("plate", "hand", 9)])), 2)

    def test_dumbbell_is_a_bar_and_two_rings(self):
        self.assertEqual(len(equipment.render(POSE, [("dumbbell", "hand")])), 3)

    def test_unknown_kind_raises(self):
        with self.assertRaises(ValueError):
            equipment.render(POSE, [("laser", "hand")])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `py -m unittest discover -s generator/tests -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'equipment'`

- [ ] **Step 3: Escribir `generator/equipment.py`**

```python
# -*- coding: utf-8 -*-
"""El equipo, en linea gris fina (D65).

Cada item es una tupla; los puntos son el nombre de una articulacion o (x, y):
    ("line", p, q)
    ("polyline", [p, q, ...])
    ("circle", p, radio)
    ("plate", p, radio)      disco de barra visto de canto
    ("dumbbell", p)          mancuerna
"""
import svg
from palette import EQUIP, EQUIP_WIDTH


def _pt(pose, p):
    return pose[p] if isinstance(p, str) else p


def render(pose, items):
    parts = []
    for item in items:
        kind = item[0]
        if kind == "line":
            parts.append(svg.line(_pt(pose, item[1]), _pt(pose, item[2]), EQUIP_WIDTH, EQUIP))
        elif kind == "polyline":
            parts.append(svg.polyline([_pt(pose, p) for p in item[1]], EQUIP, EQUIP_WIDTH))
        elif kind == "circle":
            parts.append(svg.ring(_pt(pose, item[1]), item[2], EQUIP, EQUIP_WIDTH))
        elif kind == "plate":
            c = _pt(pose, item[1])
            parts.append(svg.ring(c, item[2], EQUIP, EQUIP_WIDTH))
            parts.append(svg.ring(c, 1.8, EQUIP, EQUIP_WIDTH))
        elif kind == "dumbbell":
            x, y = _pt(pose, item[1])
            parts.append(svg.line((x - 3.5, y), (x + 3.5, y), EQUIP_WIDTH, EQUIP))
            parts.append(svg.ring((x - 4.5, y), 2.6, EQUIP, EQUIP_WIDTH))
            parts.append(svg.ring((x + 4.5, y), 2.6, EQUIP, EQUIP_WIDTH))
        else:
            raise ValueError("equipo desconocido: {!r}".format(kind))
    return parts
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `py -m unittest discover -s generator/tests -v`
Expected: 18 tests, `OK`.

---

### Task 5: Las poses y los ejercicios del piloto

Los 10 del piloto cubren lo que pide la spec (sección 7): máquina grande (prensa), piso (plancha), colgado (dominadas), y además banco, polea, mancuernas, pierna lejana y un deporte de combate.

**Files:**
- Create: `generator/poses.py`
- Create: `generator/exercises.py`
- Test: `generator/tests/test_art.py`

- [ ] **Step 1: Escribir el test que falla**

`generator/tests/test_art.py`:

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import catalog
import equipment
from exercises import EXERCISE_ART
from poses import POSES

REQUIRED = ("head", "shoulder", "elbow", "hand", "hip", "knee", "ankle", "toe")


class ArtTest(unittest.TestCase):
    def test_pilot_has_ten_exercises(self):
        self.assertEqual(len(EXERCISE_ART), 10)

    def test_every_art_names_a_catalog_exercise(self):
        names = {ex["name"] for ex in catalog.load()["exercises"]}
        for name in EXERCISE_ART:
            self.assertIn(name, names)

    def test_every_art_uses_a_known_pose_and_valid_equipment(self):
        for name, (pose_name, items) in EXERCISE_ART.items():
            self.assertIn(pose_name, POSES, name)
            equipment.render(POSES[pose_name], items)

    def test_every_pose_is_complete_and_inside_the_canvas(self):
        for pose_name, pose in POSES.items():
            for joint in REQUIRED:
                self.assertIn(joint, pose, pose_name)
            self.assertIn(pose.get("front", 1), (1, -1), pose_name)
            for joint, value in pose.items():
                if joint == "front":
                    continue
                self.assertTrue(0 <= value[0] <= 100 and 0 <= value[1] <= 100,
                                "{}.{}".format(pose_name, joint))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `py -m unittest discover -s generator/tests -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'exercises'`

- [ ] **Step 3: Escribir `generator/poses.py`**

```python
# -*- coding: utf-8 -*-
"""Poses: coordenadas de las articulaciones en un lienzo de 100 x 100 (piso en y = 90).

front = 1: una figura de pie mirando a la izquierda tiene el frente hacia -x.
front = -1: la figura espejada (por ejemplo, acostada boca arriba con la cabeza a la izquierda).
Las articulaciones que terminan en 2 son las del lado lejano y son opcionales.
"""

POSES = {
    # Sentadilla abajo, manos en la barra sobre los hombros.
    "squat": {
        "front": 1,
        "head": (37, 24), "shoulder": (41, 36), "elbow": (50, 44), "hand": (46, 35),
        "hip": (62, 58), "knee": (36, 61), "ankle": (46, 84), "toe": (34, 86),
    },
    # Bisagra de cadera, barra por debajo de la rodilla.
    "hinge": {
        "front": 1,
        "head": (29, 31), "shoulder": (38, 38), "elbow": (39, 52), "hand": (40, 66),
        "hip": (64, 48), "knee": (52, 64), "ankle": (56, 86), "toe": (44, 88),
    },
    # Acostado boca arriba en un banco, cabeza a la izquierda, brazos extendidos.
    "bench_press": {
        "front": -1,
        "head": (22, 56), "shoulder": (32, 57), "elbow": (33, 42), "hand": (34, 28),
        "hip": (60, 58), "knee": (76, 56), "ankle": (78, 80), "toe": (86, 82),
    },
    # Colgado de la barra, a mitad de la dominada.
    "hang": {
        "front": 1,
        "head": (45, 22), "shoulder": (48, 32), "elbow": (56, 26), "hand": (48, 12),
        "hip": (50, 60), "knee": (50, 76), "ankle": (58, 88), "toe": (54, 93),
    },
    # Prensa a 45 grados: espalda en el respaldo, pies en la plataforma.
    "leg_press": {
        "front": 1,
        "head": (90, 40), "shoulder": (86, 50), "elbow": (80, 66), "hand": (70, 72),
        "hip": (66, 70), "knee": (56, 48), "ankle": (36, 50), "toe": (41, 45),
    },
    # Plancha sobre antebrazos, cabeza a la izquierda, mirando al piso.
    "plank": {
        "front": 1,
        "head": (18, 58), "shoulder": (28, 62), "elbow": (28, 82), "hand": (18, 84),
        "hip": (58, 66), "knee": (74, 72), "ankle": (88, 80), "toe": (88, 86),
    },
    # De pie, antebrazo flexionado a mitad del curl.
    "stand_curl": {
        "front": 1,
        "head": (48, 13), "shoulder": (49, 24), "elbow": (50, 42), "hand": (38, 36),
        "hip": (50, 52), "knee": (49, 71), "ankle": (50, 88), "toe": (42, 90),
    },
    # Sentado, brazos arriba tirando de la barra de la polea.
    "seated_pulldown": {
        "front": 1,
        "head": (58, 21), "shoulder": (60, 32), "elbow": (50, 38), "hand": (46, 22),
        "hip": (56, 60), "knee": (38, 60), "ankle": (38, 84), "toe": (30, 86),
    },
    # Zancada: pierna de adelante flexionada, la lejana atras.
    "lunge": {
        "front": 1,
        "head": (49, 13), "shoulder": (50, 24), "elbow": (51, 40), "hand": (52, 54),
        "hip": (52, 52), "knee": (36, 62), "ankle": (36, 86), "toe": (28, 88),
        "knee2": (62, 76), "ankle2": (78, 82), "toe2": (76, 89),
    },
    # Guardia de boxeo con el jab extendido.
    "boxing_jab": {
        "front": 1,
        "head": (49, 15), "shoulder": (52, 26), "elbow": (40, 27), "hand": (27, 27),
        "hip": (56, 52), "knee": (48, 70), "ankle": (50, 88), "toe": (42, 90),
        "elbow2": (52, 38), "hand2": (46, 26),
        "knee2": (64, 70), "ankle2": (70, 88), "toe2": (62, 90),
    },
}
```

- [ ] **Step 4: Escribir `generator/exercises.py`**

```python
# -*- coding: utf-8 -*-
"""Que pose y que equipo le toca a cada ejercicio.

nombre del ejercicio (igual que en el catalogo) -> (pose, [items de equipo])
Los musculos NO se cargan aca: salen del catalogo (D70).
"""

EXERCISE_ART = {
    "Sentadilla con Barra Alta": ("squat", [("plate", (46, 34), 9)]),
    "Peso Muerto Convencional": ("hinge", [("plate", "hand", 11)]),
    "Press de Banca Plano": ("bench_press", [
        ("plate", "hand", 9),
        ("line", (16, 63), (64, 63)),
        ("line", (22, 63), (22, 86)),
        ("line", (58, 63), (58, 86)),
    ]),
    "Dominadas Pronas": ("hang", [
        ("circle", (48, 9), 2.2),
        ("line", (30, 9), (45.8, 9)),
        ("line", (50.2, 9), (66, 9)),
    ]),
    "Prensa de Piernas 45 Grados": ("leg_press", [
        ("line", (70, 80), (94, 50)),       # respaldo
        ("line", (74, 86), (22, 34)),       # riel
        ("line", (28, 58), (46, 40)),       # plataforma
        ("line", (60, 86), (92, 86)),       # base
    ]),
    "Plancha Abdominal": ("plank", [("line", (8, 89), (96, 89))]),
    "Curl con Barra": ("stand_curl", [("plate", "hand", 6)]),
    "Jalón al Pecho en Polea": ("seated_pulldown", [
        ("line", "hand", (46, 6)),          # cable
        ("circle", (46, 6), 2.2),           # polea
        ("polyline", [(46, 4), (72, 4), (72, 88)]),   # torre
        ("line", (50, 65), (64, 65)),       # asiento
        ("line", (57, 65), (57, 88)),
        ("line", (33, 54), (44, 54)),       # sujeta piernas
    ]),
    "Zancadas con Mancuernas": ("lunge", [("dumbbell", "hand")]),
    "Jab al Saco": ("boxing_jab", [
        ("polyline", [(10, 14), (24, 14), (24, 62), (10, 62), (10, 14)]),   # saco
        ("line", (17, 14), (17, 4)),        # cadena
    ]),
}
```

- [ ] **Step 5: Correr el test y ver que pasa**

Run: `py -m unittest discover -s generator/tests -v`
Expected: 22 tests, `OK`.

---

### Task 6: El mapa del cuerpo (músculos y grupos)

**Files:**
- Create: `generator/bodymap.py`
- Test: `generator/tests/test_bodymap.py`

- [ ] **Step 1: Escribir el test que falla**

`generator/tests/test_bodymap.py`:

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import bodymap
import catalog
from palette import MUSCLE


class BodymapTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cat = catalog.load()

    def test_every_catalog_muscle_has_a_region(self):
        for m in self.cat["muscles"]:
            self.assertIn(m["key"], bodymap.REGIONS)

    def test_group_is_the_whole_body(self):
        out = bodymap.group_svg("Piernas", ["cuadriceps", "gemelos"])
        self.assertIn('viewBox="0 0 60 100"', out)
        self.assertIn(MUSCLE, out)

    def test_muscle_is_a_square_zoom_smaller_than_the_body(self):
        out = bodymap.muscle_svg("cuadriceps")
        viewbox = out.split('viewBox="')[1].split('"')[0].split()
        width, height = float(viewbox[2]), float(viewbox[3])
        self.assertEqual(width, height)
        self.assertLess(width, 60)
        self.assertGreaterEqual(width, 26)

    def test_symmetric_muscles_are_drawn_on_both_sides(self):
        left = bodymap.expand("cuadriceps")
        self.assertEqual(len(left), 2)
        self.assertEqual(left[0][1] + left[1][1], 60)

    def test_back_view_has_a_spine(self):
        self.assertIn(bodymap.SPINE_MARK, bodymap.muscle_svg("dorsal"))
        self.assertNotIn(bodymap.SPINE_MARK, bodymap.muscle_svg("cuadriceps"))

    def test_every_group_has_a_view(self):
        for g in self.cat["groups"]:
            self.assertIn(bodymap.group_view(g["name"]), ("F", "B"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `py -m unittest discover -s generator/tests -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'bodymap'`

- [ ] **Step 3: Escribir `generator/bodymap.py`**

```python
# -*- coding: utf-8 -*-
"""El mapa del cuerpo (D67): figura de frente o de espalda con regiones por musculo.

Lienzo de 60 x 100. Primitivas:
    ("line", x1, y1, x2, y2, ancho)
    ("circle", cx, cy, radio)
Lo que esta a un costado se dibuja una vez (lado izquierdo de la imagen) y se espeja en x = 30.
"""
import svg
from palette import BODY, BODY_FAR, MUSCLE

CENTER = [
    ("circle", 30, 10, 6),
    ("line", 30, 15, 30, 20, 5),
    ("line", 21, 24, 39, 24, 8),
    ("line", 30, 26, 30, 46, 16),
    ("line", 25.5, 50, 34.5, 50, 8),
]
SIDE = [
    ("line", 16, 27, 14.5, 38, 5.5),
    ("line", 14.5, 38, 13, 50, 5),
    ("circle", 12.8, 52.5, 2.4),
    ("line", 25, 54, 24, 72, 8.5),
    ("line", 24, 72, 23, 92, 7),
]

# Marca que lleva solo la vista de espalda: la columna.
SPINE_MARK = svg.line((30, 22), (30, 46), 1, BODY_FAR)


def _mirror(p):
    if p[0] == "circle":
        return ("circle", 60 - p[1], p[2], p[3])
    return ("line", 60 - p[1], p[2], 60 - p[3], p[4], p[5])


BASE = CENTER + SIDE + [_mirror(p) for p in SIDE]

# musculo -> (vista, simetrico, [primitivas])   vista: "F" frente | "B" espalda
REGIONS = {
    "cuadriceps": ("F", True, [("line", 25, 56, 24.2, 70, 7)]),
    "isquios": ("B", True, [("line", 25, 56, 24.2, 70, 7)]),
    "aductores": ("F", True, [("line", 27.5, 55, 27, 66, 3.5)]),
    "gluteo_mayor": ("B", True, [("circle", 25.5, 50, 4.6)]),
    "gluteo_medio": ("B", True, [("circle", 24, 46.5, 3)]),
    "flexores_cadera": ("F", True, [("line", 25, 50, 26, 55, 4)]),
    "gemelos": ("B", True, [("line", 24, 75, 23.5, 84, 6)]),
    "pec_superior": ("F", True, [("line", 24, 24.5, 29, 24.5, 3)]),
    "pec_medio": ("F", True, [("line", 24, 28, 29, 28, 3.5)]),
    "pec_inferior": ("F", True, [("line", 24.5, 31.5, 29, 31.5, 3)]),
    "serrato": ("F", True, [("line", 22.8, 32, 23.3, 36, 2.5)]),
    "recto_abdominal": ("F", False, [("line", 30, 35, 30, 47, 7)]),
    "oblicuo": ("F", True, [("line", 24, 36, 24.5, 46, 3)]),
    "transverso": ("F", False, [("line", 25, 44, 35, 44, 4)]),
    "delt_anterior": ("F", True, [("circle", 19, 25, 3.6)]),
    "delt_lateral": ("F", True, [("circle", 17.5, 24.5, 3.2)]),
    "delt_posterior": ("B", True, [("circle", 19, 25, 3.6)]),
    "biceps_larga": ("F", True, [("line", 15.2, 29, 14.4, 36, 3)]),
    "biceps_corta": ("F", True, [("line", 17, 29, 16, 36, 3)]),
    "braquial": ("F", True, [("line", 15.5, 35, 15, 39, 4)]),
    "triceps_larga": ("B", True, [("line", 17, 29, 16, 36, 3)]),
    "triceps_lateral": ("B", True, [("line", 15.2, 29, 14.4, 35, 3)]),
    "triceps_medial": ("B", True, [("line", 15.5, 35, 15, 39, 4)]),
    "flexores_antebrazo": ("F", True, [("line", 14.5, 40, 13.3, 49, 4.5)]),
    "extensores_antebrazo": ("B", True, [("line", 14.5, 40, 13.3, 49, 4.5)]),
    "braquiorradial": ("F", True, [("line", 13.8, 39, 13, 45, 3)]),
    "agarre": ("F", True, [("circle", 12.8, 52.5, 2.6)]),
    "trapecio": ("B", False, [("line", 30, 19, 30, 31, 7), ("line", 23, 23, 37, 23, 4)]),
    "romboide": ("B", True, [("line", 27, 27, 27, 32, 4)]),
    "redondo_mayor": ("B", True, [("line", 22.5, 29, 25, 31, 3)]),
    "dorsal": ("B", True, [("line", 24.5, 31, 26.5, 42, 6)]),
    "erectores": ("B", True, [("line", 28.3, 36, 28.3, 48, 3)]),
    "cuello": ("F", False, [("line", 30, 15, 30, 20, 5)]),
    "cardiovascular": ("F", False, [("circle", 32, 28, 4)]),
    "full_body": ("F", False, BASE),
}

# Vista de cada grupo. Los que no estan aca van de frente.
GROUP_VIEWS = {"Espalda": "B"}

ZOOM_PADDING = 6
ZOOM_MIN = 26


def group_view(name):
    return GROUP_VIEWS.get(name, "F")


def expand(key):
    """Las primitivas de un musculo, con su espejo si es simetrico."""
    _view, symmetric, prims = REGIONS[key]
    return list(prims) + ([_mirror(p) for p in prims] if symmetric else [])


def _draw(p, color):
    if p[0] == "circle":
        return svg.circle((p[1], p[2]), p[3], color)
    return svg.line((p[1], p[2]), (p[3], p[4]), p[5], color)


def _bbox(prims):
    xs, ys = [], []
    for p in prims:
        if p[0] == "circle":
            xs += [p[1] - p[3], p[1] + p[3]]
            ys += [p[2] - p[3], p[2] + p[3]]
        else:
            half = p[5] / 2
            xs += [p[1] - half, p[1] + half, p[3] - half, p[3] + half]
            ys += [p[2] - half, p[2] + half, p[4] - half, p[4] + half]
    return min(xs), min(ys), max(xs), max(ys)


def _svg(view, orange, viewbox):
    parts = [_draw(p, BODY) for p in BASE]
    if view == "B":
        parts.append(SPINE_MARK)
    parts.extend(_draw(p, MUSCLE) for p in orange)
    return svg.wrap(viewbox, parts)


def group_svg(name, muscle_keys):
    """Grupo: cuerpo entero con la zona de todos sus musculos en naranja."""
    orange = []
    for key in muscle_keys:
        orange.extend(expand(key))
    return _svg(group_view(name), orange, "0 0 60 100")


def muscle_svg(key):
    """Musculo: acercamiento cuadrado a su zona."""
    orange = expand(key)
    x0, y0, x1, y1 = _bbox(orange)
    side = max(x1 - x0, y1 - y0) + 2 * ZOOM_PADDING
    side = max(side, ZOOM_MIN)
    side = min(side, 59)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    viewbox = "{:.1f} {:.1f} {:.1f} {:.1f}".format(cx - side / 2, cy - side / 2, side, side)
    return _svg(REGIONS[key][0], orange, viewbox)
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `py -m unittest discover -s generator/tests -v`
Expected: 28 tests, `OK`.

Nota: `full_body` abarca todo el cuerpo, así que su acercamiento se recorta a 59 (el tope) y muestra el torso y parte de las piernas. Es el único músculo cuyo «acercamiento» no entra; se mira en el piloto.

---

### Task 7: El orquestador y la hoja de contacto

**Files:**
- Create: `generator/build.py`
- Test: `generator/tests/test_build.py`

- [ ] **Step 1: Escribir el test que falla**

`generator/tests/test_build.py`:

```python
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import build


class BuildTest(unittest.TestCase):
    def test_build_writes_one_svg_per_row(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = build.build(root)
            self.assertEqual(len(list((root / "exercise" / "preview").glob("*.svg"))), 10)
            self.assertEqual(len(list((root / "muscle").glob("*.svg"))), 35)
            self.assertEqual(len(list((root / "muscle-group").glob("*.svg"))), 8)
            self.assertEqual(len(result["missing"]), 197)
            self.assertTrue((root / "contact-sheet.html").exists())

    def test_build_removes_stale_svgs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            stale = root / "muscle" / "viejo.svg"
            stale.parent.mkdir(parents=True)
            stale.write_text("<svg/>", encoding="utf-8")
            build.build(root)
            self.assertFalse(stale.exists())

    def test_contact_sheet_lists_every_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            build.build(root)
            html = (root / "contact-sheet.html").read_text(encoding="utf-8")
            self.assertEqual(html.count('class="item"'), 53)
            self.assertIn("Prensa de Piernas 45 Grados", html)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `py -m unittest discover -s generator/tests -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'build'`

- [ ] **Step 3: Escribir `generator/build.py`**

```python
# -*- coding: utf-8 -*-
"""Orquestador: escribe los SVG del catalogo y la hoja de contacto.

    py generator/build.py            genera todo
    py generator/build.py --check    ademas, falla si algun ejercicio no tiene ilustracion
"""
import html
import sys
from pathlib import Path

import bodymap
import catalog
import equipment
import figure
from exercises import EXERCISE_ART
from poses import POSES

ROOT = Path(__file__).resolve().parent.parent
EXERCISE_DIR = Path("exercise") / "preview"
MUSCLE_DIR = Path("muscle")
GROUP_DIR = Path("muscle-group")

SHEET_HEAD = """<!doctype html>
<html lang="es">
<meta charset="utf-8">
<title>PowerApp-Assets - hoja de contacto</title>
<style>
  body{margin:0;padding:24px;background:#0B0D16;color:#F5F1EB;font-family:system-ui,sans-serif}
  h1{font-size:20px} h2{font-size:15px;color:#8892A8;margin:28px 0 12px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
  .item{background:#13161F;border:1px solid #232739;border-radius:10px;padding:10px}
  .big{aspect-ratio:1/1;border-radius:10px;background:linear-gradient(135deg,#1B1F2E,#13161F);display:flex;align-items:center;justify-content:center}
  .big img{width:92%;height:92%}
  .row{display:flex;align-items:center;gap:8px;margin-top:8px}
  .thumb{width:48px;height:48px;flex:none;border-radius:8px;background:linear-gradient(135deg,#1B1F2E,#13161F)}
  .thumb img{width:100%;height:100%}
  .name{font-size:13px}
</style>
<h1>PowerApp-Assets - hoja de contacto</h1>
"""


def _clean(directory):
    directory.mkdir(parents=True, exist_ok=True)
    for old in directory.glob("*.svg"):
        old.unlink()


def _item(path, name):
    src = html.escape(path.as_posix())
    return (
        '<div class="item"><div class="big"><img src="{0}" alt=""></div>'
        '<div class="row"><div class="thumb"><img src="{0}" alt=""></div>'
        '<div class="name">{1}</div></div></div>'
    ).format(src, html.escape(name))


def _section(title, items):
    return "<h2>{} ({})</h2>\n<div class=\"grid\">\n{}\n</div>\n".format(
        html.escape(title), len(items), "\n".join(items))


def build(root=ROOT):
    """Escribe todo bajo root. Devuelve {"written": n, "missing": [nombres sin ilustracion]}."""
    root = Path(root)
    cat = catalog.load()
    for directory in (EXERCISE_DIR, MUSCLE_DIR, GROUP_DIR):
        _clean(root / directory)

    written = 0
    missing = []
    exercise_items, muscle_items, group_items = [], [], []

    for ex in cat["exercises"]:
        art = EXERCISE_ART.get(ex["name"])
        if art is None:
            missing.append(ex["name"])
            continue
        pose_name, items = art
        pose = POSES[pose_name]
        out = figure.render(
            pose,
            primary=ex["muscles"][:1],
            secondary=ex["muscles"][1:],
            equipment_parts=equipment.render(pose, items),
        )
        rel = EXERCISE_DIR / "{}.svg".format(ex["id"])
        (root / rel).write_text(out, encoding="utf-8")
        exercise_items.append(_item(rel, ex["name"]))
        written += 1

    for g in cat["groups"]:
        rel = GROUP_DIR / "{}.svg".format(g["id"])
        (root / rel).write_text(bodymap.group_svg(g["name"], g["muscles"]), encoding="utf-8")
        group_items.append(_item(rel, g["name"]))
        written += 1

    for m in cat["muscles"]:
        rel = MUSCLE_DIR / "{}.svg".format(m["id"])
        (root / rel).write_text(bodymap.muscle_svg(m["key"]), encoding="utf-8")
        muscle_items.append(_item(rel, m["name"]))
        written += 1

    sheet = (
        SHEET_HEAD
        + _section("Ejercicios", exercise_items)
        + _section("Grupos musculares", group_items)
        + _section("Músculos", muscle_items)
        + "</html>\n"
    )
    (root / "contact-sheet.html").write_text(sheet, encoding="utf-8")
    return {"written": written, "missing": missing}


if __name__ == "__main__":
    result = build()
    print("Escritos: {} SVG".format(result["written"]))
    print("Ejercicios sin ilustracion: {}".format(len(result["missing"])))
    if "--check" in sys.argv and result["missing"]:
        for name in result["missing"]:
            print("  - " + name)
        sys.exit(1)
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `py -m unittest discover -s generator/tests -v`
Expected: 31 tests, `OK`.

- [ ] **Step 5: Generar la salida real**

Run: `py generator/build.py`
Expected:

```
Escritos: 53 SVG
Ejercicios sin ilustracion: 197
```

- [ ] **Step 6: Confirmar que `--check` falla mientras falten ejercicios**

Run: `py generator/build.py --check; echo "exit=$?"`
Expected: la lista de 197 nombres y `exit=1`. Es lo esperado en el piloto; `--check` pasa a ser la compuerta del Plan 2.

---

### Task 8: Ajuste visual

Las coordenadas de las poses y de las regiones están escritas sin haberlas visto dibujadas. Este paso las corrige mirándolas. No cambia la estructura: sólo números en `poses.py`, `exercises.py` y `bodymap.py`.

**Files:**
- Modify: `generator/poses.py`
- Modify: `generator/exercises.py`
- Modify: `generator/bodymap.py`

- [ ] **Step 1: Abrir la hoja de contacto**

Abrir `D:\Power App\Assets\PowerApp-Assets\contact-sheet.html` en el navegador integrado y tomar una captura de cada sección.

- [ ] **Step 2: Revisar cada ejercicio contra esta lista**

1. La figura entra completa en el lienzo; nada se corta.
2. La pose se reconoce sin leer el nombre.
3. Las proporciones son parejas entre poses: torso de unas 28 unidades, muslo y pierna de unas 22 cada uno, brazo de unas 15 y antebrazo de unas 14.
4. El naranja cae del lado correcto: cuádriceps arriba del muslo en la sentadilla, pectoral hacia arriba en el press de banca, abdomen hacia el piso en la plancha, dorsal del lado de la espalda en el jalón.
5. El equipo no tapa la figura y toca la mano o el cuerpo donde corresponde.
6. A 48 px se distingue la figura y se ve dónde está el naranja.

- [ ] **Step 3: Revisar grupos y músculos contra esta lista**

1. Cada grupo pinta la zona que le corresponde y sólo esa.
2. Cada músculo queda centrado en su acercamiento y se entiende qué parte del cuerpo es.
3. Los músculos chicos (serrato, braquiorradial, redondo mayor, agarre) se ven a 48 px.
4. La vista de espalda se distingue de la de frente.

- [ ] **Step 4: Corregir, regenerar y volver a mirar**

Por cada punto que falle, cambiar las coordenadas y correr:

Run: `py -m unittest discover -s generator/tests -v && py generator/build.py`
Expected: 31 tests, `OK`, y `Escritos: 53 SVG`.

Repetir desde el Step 1 hasta que las dos listas pasen. Si un punto no se puede resolver cambiando números (por ejemplo, una pose que el esqueleto no puede representar), no forzarlo: anotarlo para el Task 9.

---

### Task 9: La compuerta del piloto

- [ ] **Step 1: Stagear todo**

```bash
cd "/d/Power App/Assets/PowerApp-Assets" && git add -A && git status --short
```

Expected: los archivos del generador, los 53 SVG, `contact-sheet.html`, `README.md` y `.gitignore`, todos con `A`. Ningún `__pycache__`.

- [ ] **Step 2: Presentarle el piloto a Fran**

Mostrarle la hoja de contacto y decirle:
- qué quedó bien y qué puntos del Task 8 no se pudieron resolver;
- las dos cosas que este plan agregó a la spec (secundarios al 45 %, columna en la vista de espalda), para que las confirme o las revierta;
- la pregunta de la spec (sección 7): **¿el nivel de pictograma alcanza para los ejercicios?**

- [ ] **Step 3: Actuar según la respuesta**

- **Alcanza:** escribir el Plan 2 (el resto de las poses y las fotos).
- **No alcanza para ejercicios:** se reabre D69 sólo para ejercicios; músculos y grupos siguen por código. Volver a la spec antes de escribir más planes.
- **Hay ajustes de estilo:** aplicarlos acá, regenerar y volver al Step 2.

Mensaje de commit sugerido (lo commitea Fran): `Generador de ilustraciones y piloto: 10 ejercicios, 35 músculos y 8 grupos`.

---

## Qué queda para los otros planes

| Punto de la spec | Plan |
|---|---|
| El resto de los 207 ejercicios (sección 7, paso 2) | 2 |
| Fotos: licencia, cobertura, correspondencia y copia (D66, D71) | 2 |
| El repo remoto y Pages (D68), y que cada URL responda (sección 8) | 2, cuando Fran cree el repo |
| `Db Creator`, el `02` y el patch (D73, D74); la entrada en Status | 3 |
| El duotono por CSS y la verificación de `Thumb` (D72) | 3 |
