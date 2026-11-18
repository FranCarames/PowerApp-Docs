# Spec — Visor de diagramas en el sitio de Pages

> **Fecha:** 2026-11-17 · **Estado:** diseño aprobado por Fran el 17/11, pendiente de plan.
> **Alcance:** solo el sitio de GitHub Pages de este repo. **Modelo:** no cambia. **Backend y web:** no cambian.
> **Prototipo:** el que se mostró el 17/11 (portada con la card nueva + visor con barra lateral, con los SVG reales del modelo y del despliegue). No se versiona.

## 1. Contexto y objetivo

Hoy la portada tiene una card «Modelo de datos» que abre `Doc/modelo-db.html`: un visor con zoom y arrastre que carga **un solo** SVG (`Doc/PowerApp - Modelo DB.svg`, constante `SRC`). El resto de los diagramas del proyecto está en `Diagrams/` y no se ve desde el sitio:

| Diagrama | Archivos hoy |
|---|---|
| Modelo de datos | `Doc/PowerApp - Modelo DB.svg` + `.pdf` (versionados) |
| Diagrama de clases | `Diagrams/Diagrama de clases.pdf` (versionado, falta el SVG) |
| Componentes del servidor | `Diagrams/Diagramas de componentes del servidor.pdf` (versionado, falta el SVG) |
| Diagrama de despliegue | `Diagrams/Diagrama de despliegue.svg` + `.pdf` (sin versionar) |
| Casos de uso del Usuario, del Entrenador y del Admin | `Diagrams/Diag CU - <Rol>.svg` + `.pdf`: se sumaron durante la implementación (Fran los exportó el 18/11, junto con los SVG de clases y componentes) |

El objetivo es que **la portada lleve a todos los diagramas del proyecto**, en un visor con una **barra lateral** que los liste y que, al elegir uno, lo muestre **igual que hoy se ve el modelo de datos**.

## 2. Decisiones

| # | Decisión | Por qué |
|---|---|---|
| 1 | **Cada diagrama tiene su SVG y su PDF, con el mismo nombre y en la misma carpeta.** Fran exporta desde Miro el SVG de clases y el de componentes | El visor necesita el SVG para el zoom nítido. Lo eligió Fran sobre mostrar el PDF en el visor |
| 2 | **El visor nuevo es `Diagrams/index.html`** y la portada enlaza a `Diagrams/` | Mismo patrón que `Use Cases/` y `Tests/`: la carpeta es la vista |
| 3 | **La lista de diagramas sale de `Diagrams/README.md`** y el visor se auto-sincroniza desde ese índice | Lo eligió Fran (opción A) sobre una lista fija en el HTML. Sumar un diagrama no toca código, y en GitHub el README queda como índice de la carpeta |
| 4 | **El modelo de datos se queda en `Doc/`.** El índice lo enlaza con `../Doc/…` | Es la fuente de verdad del modelo y el backend y las specs viejas apuntan a esa ruta. Moverlo rompe referencias sin ganar nada |
| 5 | **`Doc/modelo-db.html` pasa a ser una redirección** a `../Diagrams/#modelo-de-datos` | El README del backend (`PowerApp-Backend/README.md`) y cualquier link compartido apuntan a esa URL publicada |
| 6 | **La card 04 de la portada pasa a ser «Diagramas del proyecto»**, una card-link entera (como la de CU), y el link del pie cambia a «Diagramas» | Lo pidió Fran: reemplazar el acceso al modelo por el acceso a los diagramas |
| 7 | **Cada diagrama tiene su link directo** con un hash que sale del título: `Diagrams/#diagrama-de-despliegue` | Permite compartir un diagrama puntual y es lo que usa la redirección del punto 5 |
| 8 | **Si un SVG no carga, se muestra el error** con botones para abrir el PDF y el SVG directo, sin estado especial de «solo PDF» | Con el punto 1 el caso es transitorio (mientras Fran exporta). El visor actual ya tiene ese estado de error |
| 9 | **La barra lateral se puede ocultar** para dar todo el ancho al diagrama; en el celular es un panel que se abre con un botón | El modelo mide 4411 × 1951 px: el ancho importa. En mobile es el mismo patrón que `Use Cases/` |

## 3. Lo descartado

- **Mostrar el PDF dentro del visor** (pdf.js o `<iframe>`) para los diagramas que no tienen SVG (decisión 1).
- **Lista fija dentro del HTML** (decisión 3).
- **Mover el modelo a `Diagrams/`** (decisión 4).
- **Borrar `Doc/modelo-db.html`** sin redirección (decisión 5).
- **Recordar si la barra lateral estaba oculta** entre visitas: no aporta lo suficiente.

## 4. Índice: `Diagrams/README.md`

Formato, igual en espíritu al de `Tests/README.md`:

```markdown
# Diagramas

Diagramas del proyecto, exportados desde Miro en SVG y PDF. Este índice alimenta el visor
(`Diagrams/index.html`): para sumar un diagrama, dejar el `.svg` y el `.pdf` con el mismo
nombre y agregar una línea bajo su grupo.

## Casos de uso

- [Casos de uso del Usuario](Diag%20CU%20-%20Usuario.svg) — UML · casos de uso
- [Casos de uso del Entrenador](Diag%20CU%20-%20Entrenador.svg) — UML · casos de uso
- [Casos de uso del Admin](Diag%20CU%20-%20Admin.svg) — UML · casos de uso

## Datos

- [Modelo de datos](../Doc/PowerApp%20-%20Modelo%20DB.svg) — Entidad-relación

## Diseño

- [Diagrama de clases](Diagrama%20de%20clases.svg) — UML · clases

## Arquitectura

- [Componentes del servidor](Diagramas%20de%20componentes%20del%20servidor.svg) — UML · componentes
- [Diagrama de despliegue](Diagrama%20de%20despliegue.svg) — UML · despliegue
```

Reglas del parser:

- `## <Grupo>` abre un grupo. Los grupos se muestran en el orden del archivo.
- `- [<Título>](<ruta>.svg) — <tipo>` es un diagrama. La ruta es relativa a `Diagrams/` y va URL-encodeada (`%20`). El `— <tipo>` es opcional.
- El PDF es la misma ruta con `.pdf` en lugar de `.svg`.
- El **id** (hash) sale del título: sin tildes, en minúsculas, y lo que no sea letra o número pasa a `-` (`Modelo de datos` → `modelo-de-datos`).
- Cualquier otra línea (título, párrafo de introducción) se ignora.

## 5. Visor: `Diagrams/index.html`

### 5.1 Layout

Dos columnas, como en el prototipo:

- **Barra lateral** (≈290 px): marca PowerApp + «Diagramas», «← Volver a la portada», los grupos del índice (cabecera con punto de color y cantidad) y un ítem por diagrama: ícono teñido con el color del grupo, título y tipo. El ítem activo tiene fondo y borde izquierdo del color del grupo.
- **Panel**: la barra superior del visor actual (botón para ocultar la lateral, título `PowerApp — <Título>`, subtítulo `<tipo> · <ancho> × <alto> px`, zoom −/%/+, «Ajustar», «SVG ↓» con `download` y «PDF» en pestaña nueva) y el lienzo con zoom y arrastre.

**Colores de grupo:** se asignan por orden desde una paleta del sitio (azul, violeta, teal, naranja, verde, y vuelve a empezar), así un grupo nuevo no necesita tocar código.

**Íconos:** se eligen por palabra clave del tipo, sin distinguir mayúsculas (`casos de uso` → actor, `entidad` → base de datos, `clases`, `componentes`, `despliegue`) y, si no coincide ninguna, se usa un ícono genérico de diagrama.

### 5.2 Comportamiento

- **Al abrir:** se hace `fetch` del `README.md` y se arma la barra lateral. Se selecciona el diagrama del hash; si no hay hash o no existe, el primero del índice.
- **Al elegir un diagrama:** cada ítem es un link a `#<id>`, así que cambia el hash con una entrada nueva en el historial (como en `Use Cases/`). Eso dispara `hashchange`, que actualiza el título de la pestaña y la barra superior, carga el SVG y lo ajusta a la pantalla. En el celular se cierra el panel lateral.
- **`hashchange`** (clic en la lista, link pegado o atrás/adelante): selecciona el diagrama correspondiente.
- **Carga del SVG:** igual que hoy en `Doc/modelo-db.html`: `fetch` + `DOMParser`, se saca el `style` de la raíz, se fijan `width`/`height` y **se inyecta inline** (no `<img>`) para que carguen las `@font-face` de Miro. El SVG ya parseado se guarda en memoria: volver a un diagrama no lo pide de nuevo.
- **El diagrama no se selecciona ni se cliquea** (pedido de Fran del 18/11): el lienzo tiene `user-select: none` y el SVG `pointer-events: none`, así que hacer clic o arrastrar sobre un texto solo desplaza el diagrama, y los links que pueda traer el SVG de Miro no se siguen.
- **Zoom y arrastre:** el código actual de `Doc/modelo-db.html` sin cambios funcionales: rueda, doble clic, pinch, teclas `+ − 0 1`, clic en el % para volver al 100 %, re-ajuste al cambiar el tamaño si estaba ajustado. Ocultar o mostrar la barra lateral cambia el ancho del lienzo y dispara ese re-ajuste.
- **Mientras carga:** spinner y «Cargando el diagrama…». Los botones de zoom quedan deshabilitados hasta que hay un SVG.

### 5.3 Errores

| Caso | Qué se ve |
|---|---|
| No carga `README.md` (o se abre por `file://`) | Estado de error en el lienzo: «No se pudo cargar el índice de diagramas» + la nota actual sobre servirlo por HTTP. La barra lateral queda vacía |
| El índice no tiene diagramas | «No hay diagramas en el índice» |
| No carga el SVG elegido (falta, 404, no es SVG) | «No se pudo cargar el diagrama (\<motivo\>)» + botones «Abrir el PDF» y «Abrir el SVG directo». La barra lateral sigue usable |

### 5.4 Mobile (≤ 860 px)

Una sola columna. La barra lateral es un panel fijo que entra desde la izquierda con fondo oscurecido, y se abre con el botón de la barra superior. Se esconden el subtítulo y la ayuda de gestos, como hoy.

## 6. Redirección: `Doc/modelo-db.html`

Se reemplaza el visor por una página mínima que redirige a `../Diagrams/#modelo-de-datos` con `<meta http-equiv="refresh">` y `location.replace` (para no dejar la página vieja en el historial), y un link visible por si ninguna de las dos funciona.

## 7. Portada y documentación

**`index.html`**

- Card 04: `<a class="card" href="Diagrams/">`, eyebrow «Arquitectura y diseño», título «Diagramas del proyecto», texto «Todos los diagramas de PowerApp en un solo visor: casos de uso, modelo de datos, diseño y arquitectura. Se eligen desde una barra lateral y se ven con zoom y arrastre.», tags `casos de uso` · `modelo de datos` · `UML` · `zoom y arrastre`, pie «Abrir los diagramas →». Ícono de diagrama (tres cajas conectadas). Sin cantidades ni nombres de diagramas puntuales, para que el texto no quede viejo al sumar o sacar uno.
- Pie: «Modelo de datos» → «Diagramas» (`Diagrams/`).
- `<meta name="description">`: «modelo de datos de la base» → «diagramas del proyecto (casos de uso, modelo de datos y UML)».

**`README.md`**

- Tabla de vistas: la fila «🗃️ Modelo de datos» pasa a «🗺️ Diagramas» → `Diagrams/`, con «Visor de los diagramas del proyecto (casos de uso, modelo de datos, diseño y arquitectura), con zoom y arrastre. El índice está en [`Diagrams/README.md`](Diagrams/README.md)».
- Estructura: se suma `Diagrams/ → Diagramas del proyecto (SVG + PDF exportados de Miro) + índice (README.md) y visor.` y la línea de `Doc/` deja de decir «+ visor».

**`CLAUDE.md`**

- Estructura: se suma `Diagrams/`.
- Mantenimiento: la regla de la constante `SRC` se reemplaza por **«Diagrama nuevo o renombrado:** dejar el `.svg` y el `.pdf` con el mismo nombre y agregar o corregir su línea en `Diagrams/README.md` (formato `- [Título](archivo.svg) — tipo` bajo un `## Grupo`). El visor se auto-sincroniza. Después, correr `node .claude/tools/audit-diagrams.js`. Si cambia el nombre del archivo del modelo en `Doc/`, se corrige su línea ahí. El título «Modelo de datos» no se cambia: la redirección apunta a su hash.»
- «Nombres con espacios» suma los archivos de `Diagrams/`.
- La lista de visores que usan `fetch` cambia `Doc/modelo-db.html` por `Diagrams/index.html`, y la nota del SVG inline pasa a hablar de `Diagrams/index.html`.

## 8. Archivos

| Archivo | Cambio |
|---|---|
| `Diagrams/index.html` | Nuevo: visor |
| `Diagrams/README.md` | Nuevo: índice |
| `.claude/tools/audit-diagrams.js` | Nuevo: prueba el parser del visor y audita el índice (cada diagrama con SVG y PDF, ids únicos, ningún SVG sin indexar). Mismo estilo que `audit-index.js` de `Tests/` |
| `Diagrams/Diagrama de despliegue.svg` / `.pdf` | Se suman al repo (hoy sin versionar) |
| `Diagrams/Diagrama de clases.svg` | Lo exporta Fran |
| `Diagrams/Diagramas de componentes del servidor.svg` | Lo exporta Fran |
| `Doc/modelo-db.html` | Pasa a redirección |
| `index.html` · `README.md` · `CLAUDE.md` | Sección 7 |

Las specs y planes viejos que nombran `Doc/modelo-db.html` no se tocan: son históricos. `Entrega Final/` no es parte de este cambio.

## 9. Verificación

`node .claude/tools/audit-diagrams.js` pasa, salvo los SVG que todavía no se exportaron. Después, servir la raíz del repo por HTTP y comprobar:

1. La portada abre `Diagrams/` desde la card y desde el pie.
2. La barra lateral muestra los tres grupos y los cuatro diagramas en el orden del índice.
3. Cada diagrama con SVG se ve ajustado a la pantalla, con zoom, arrastre y teclas funcionando, y sus botones SVG y PDF apuntan a los archivos correctos.
4. Un diagrama sin SVG (mientras falte la exportación) muestra el error con «Abrir el PDF».
5. `Diagrams/#diagrama-de-despliegue` abre directo ese diagrama; atrás y adelante del navegador cambian de diagrama.
6. `Doc/modelo-db.html` redirige a `Diagrams/#modelo-de-datos`.
7. Ocultar la barra lateral re-ajusta el diagrama; en 375 px de ancho la lateral es un panel y el diagrama ocupa toda la pantalla.
8. No hay errores en la consola.

## 10. Fuera de alcance

- **El link del README del backend** (`PowerApp-Backend/README.md`, fila «Modelo de datos») sigue funcionando por la redirección. Actualizarlo a `Diagrams/` es un cambio de otro repo que queda para Fran.
- **Exportar los SVG** de clases y componentes desde Miro (lo hace Fran).
- Búsqueda en la barra lateral: con cuatro diagramas no hace falta.
