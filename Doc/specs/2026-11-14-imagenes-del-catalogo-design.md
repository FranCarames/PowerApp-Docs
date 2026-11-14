# Spec — Imágenes del catálogo (ejercicios, músculos y grupos musculares)

> **Fecha:** 2026-11-14 · **Tareas:** **BE-47** (backend) y **T62** (web); el repo de assets es nuevo y no tiene numeración. El plan del cambio todavía no está escrito: sale de esta spec. · **Estado:** decisiones de Fran del 14/11, tomadas sobre maquetas en el navegador. Siguen la numeración de la [spec de tipos de circuito](2026-11-04-tipos-de-circuito-design.md) (D64): son **D65 a D74**.
> **Nace de:** el pedido de Fran del 14/11 de poblar de imágenes la aplicación. Hoy los campos de imagen de los 207 ejercicios, los 35 músculos y los 8 grupos musculares están en `NULL`, y la web muestra en su lugar un ícono sobre un degradé.
> **Modelo:** no cambia. Se llenan columnas que ya existen.

## 1. Contexto y objetivo

El catálogo tiene tres tablas con campos de imagen, todos vacíos:

| Tabla | Filas | Campos |
|---|---|---|
| `Exercise` | 207 | `preview_image`, `bg_image`, `video_url` |
| `Muscle` | 35 | `image_url`, `preview_image` |
| `Muscle_Group` | 8 | `image_url`, `preview_image` |

La web ya los consume: `Thumb` muestra `preview_image` en un cuadrado de 48 px (o un ícono si falta o no carga), y la ficha del ejercicio usa `bg_image` de fondo.

El objetivo es que **cada fila del catálogo tenga su imagen, con una estética única y coherente con la app** (fondo `#0B0D16`, naranja `#E8450A`), y que el conjunto se pueda **regenerar entero** si cambia un color o una decisión de estilo.

## 2. Decisiones

| # | Decisión | Por qué |
|---|---|---|
| D65 | **Miniatura del ejercicio (`preview_image`): ilustración.** Figura humana como **silueta maciza gris** (`#5B6280`), el o los **músculos que trabajan en naranja** (`#E8450A`) y el **equipo** (barra, mancuerna, máquina) en **línea gris fina** (`#8892A8`). Fondo transparente: se ve el del `Thumb` | Es la mezcla que eligió Fran entre «línea» y «silueta». La silueta maciza es la que mejor se lee a 48 px; el naranja es el único foco. El equipo se probó en blanco y competía con el músculo, por eso baja al gris del texto secundario y se afina |
| D66 | **Detalle del ejercicio (`bg_image`): foto real** de un banco libre, **con un duotono naranja/oscuro** | La foto muestra la técnica real, que el pictograma no puede. El duotono es lo que la hace convivir con la app oscura: sin tratar, cada foto trae su fondo y su luz y queda como un parche |
| D67 | **Grupos y músculos: mapa del cuerpo, encuadre híbrido.** El **grupo** se dibuja sobre el **cuerpo entero** (de frente o de espalda) con la zona en naranja. El **músculo** se dibuja en **acercamiento** a su zona, con el músculo en naranja. Mismo lenguaje que D65 | El grupo necesita el cuerpo completo para ubicar la zona. Un músculo chico (antebrazo, serrato) casi no se distingue a 48 px sobre el cuerpo entero, así que hace zoom |
| D68 | **Alojamiento: un repo público nuevo de assets en GitHub, servido por GitHub Pages.** Las columnas guardan la URL absoluta | Gratis, versionado, URLs estables, e independiente de los deploys de la web y del back. El back en Render free-tier duerme: servir imágenes desde ahí haría que cada una pague ese arranque |
| D69 | **Las ilustraciones se generan por código**, como SVG: un script en Python sin librerías (como `Db Creator`) con una figura articulada, un conjunto de poses base y el mapa del cuerpo | Consistencia total entre las ~250 imágenes, archivos de pocos KB, y todo se regenera si cambia un color. Las generadas con IA no mantienen el mismo personaje y trazo en 207 imágenes sin revisar una por una |
| D70 | **El naranja sale de los datos.** El generador pinta los segmentos del cuerpo que corresponden a los músculos que el seed le asigna a cada ejercicio (`Exercised_Muscle`); no se elige a mano por ejercicio | Una sola fuente de verdad: la ilustración no puede decir algo distinto de lo que dice el catálogo. Si la relación está mal cargada, se ve y se corrige en el catálogo |
| D71 | **Ejercicio sin foto en el banco: `bg_image` queda en `NULL`.** La web muestra su degradé de siempre | Lo eligió Fran sobre usar la ilustración ampliada o buscar a mano en otros bancos. Es lo más simple y no obliga a revisar licencias imagen por imagen |
| D72 | **El duotono lo aplica la web con CSS**; el archivo que se guarda es la foto original | Se ajusta el tono sin reprocesar nada, y unifica también las fotos que un Admin cargue a mano desde el formulario |
| D73 | **Un archivo por fila, nombrado por su `id`.** En músculos y grupos, **`image_url` y `preview_image` apuntan al mismo SVG** | La URL se deduce del id y no cambia si se renombra un ejercicio. Un SVG escala sin pérdida: no hace falta una versión chica y otra grande |
| D74 | **Carga por `Db Creator` y un patch.** Los generadores completan las columnas de imagen y se regenera `02_datos_estaticos.sql`; un patch con `UPDATE` lleva la base viva al mismo estado. **No cambia el esquema ni el código de `power-app/src`** | Es el camino que ya existe para los datos estáticos. Los DTO de alta y edición ya aceptan estos campos |

## 3. Lo descartado

- **Foto real sin tratar** como estética general. Es lo más barato, pero las fotos quedan desparejas sobre la app oscura.
- **Ilustración de línea pura** y **silueta contorneada** para la miniatura. Fran prefirió la silueta maciza.
- **Equipo en blanco, macizo oscuro o violeta de acento.** El blanco competía con el músculo; el violeta sumaba un segundo foco.
- **Cuerpo entero siempre** o **acercamiento siempre** para músculos y grupos (D67).
- **Ilustraciones generadas con IA** o **derivadas de recortar las fotos** (D69). La segunda además sólo sirve para los ejercicios que tengan foto y obliga a marcar el músculo a mano.
- **Alojar en `public/` de la web, en un servicio de imágenes o en el backend** (D68).
- **Duotono grabado en el archivo** (D72).

## 4. El repo de assets

Repo público nuevo, con GitHub Pages activado sobre la rama principal. **Lo crea Fran**; el nombre propuesto es `PowerApp-Assets`. La URL base de Pages sale del nombre del repo y se fija en el plan.

**Generador** (Python sin librerías, un módulo por responsabilidad):

| Módulo | Qué hace |
|---|---|
| Figura | La figura articulada: articulaciones, segmentos y cómo se dibuja cada uno (silueta, color, grosor) |
| Poses | Las poses base: coordenadas de las articulaciones para cada postura |
| Equipo | Barra, mancuerna, banco, polea, máquinas: formas en línea fina |
| Mapa del cuerpo | Figura de frente y de espalda, con una región por músculo, y los encuadres de acercamiento |
| Catálogo | Qué pose, qué equipo y qué vista le toca a cada ejercicio; qué región a cada músculo y grupo |
| Orquestador | Lee lo anterior y escribe todos los SVG; arma la hoja de contacto |

El generador necesita, por cada ejercicio, su `id` y sus músculos. Los toma de los generadores de `Db Creator` (la forma exacta, importarlos o exportar un archivo intermedio, se decide en el plan).

**Salida:**

| Ruta | Contenido |
|---|---|
| `exercise/preview/<id>.svg` | Miniatura del ejercicio |
| `exercise/bg/<id>.jpg` | Foto del detalle, sólo si existe |
| `muscle/<id>.svg` | Músculo en acercamiento |
| `muscle-group/<id>.svg` | Grupo en cuerpo entero |

**Fotos.** Salen de `free-exercise-db`. Se **copian** al repo (no se enlazan al banco) con un archivo de créditos y licencia. La correspondencia entre cada ejercicio del catálogo (en español) y el del banco (en inglés) se carga a mano en una tabla del generador.

## 5. Qué va en cada campo

| Tabla | Campo | Valor |
|---|---|---|
| `Exercise` | `preview_image` | `<base>/exercise/preview/<id>.svg` |
| `Exercise` | `bg_image` | `<base>/exercise/bg/<id>.jpg`, o `NULL` si no hay foto |
| `Exercise` | `video_url` | No se toca |
| `Muscle` | `image_url` y `preview_image` | `<base>/muscle/<id>.svg` |
| `Muscle_Group` | `image_url` y `preview_image` | `<base>/muscle-group/<id>.svg` |

## 6. Cambios por repo

**Assets (nuevo).** Todo lo de la sección 4.

**Backend (BE-47).**
- `Db Creator`: los generadores de datos estáticos completan las columnas de imagen; se regenera `02_datos_estaticos.sql`.
- `Db Creator/patches`: un patch idempotente con los `UPDATE` para la base viva.
- Status: no cambia ningún CU ni los conteos; va una entrada en «Cambios recientes».
- Sin cambios en `power-app/src` ni en `ddl.py`.

**Web (T62).**
- El duotono por CSS sobre el fondo de la ficha del ejercicio.
- Confirmar que `Thumb` muestra bien un SVG de fondo transparente sobre su degradé.

## 7. Orden de trabajo

1. **Piloto.** Unos 10 ejercicios variados (al menos uno con máquina grande, uno en el piso y uno colgado), los 8 grupos y algunos músculos. Fran los revisa en la hoja de contacto. **Si el nivel de pictograma no alcanza para los ejercicios, se reabre D69 sólo para ejercicios**; músculos y grupos siguen por código.
2. El resto de las poses y de los ejercicios.
3. Fotos: verificar la licencia del banco, medir la cobertura, cargar la correspondencia y copiar los archivos.
4. `Db Creator` y el patch.
5. El duotono en la web.

## 8. Verificación

- Un chequeo del orquestador: cada `id` del catálogo tiene su SVG, y no hay archivos sin fila.
- La **hoja de contacto**: una página con todas las imágenes sobre los colores de la app, a 48 px y ampliadas, para la revisión visual.
- Los `.sql` quedan en sync con los `.py`: se regenera y se compara.
- Cada URL que se escribe en el `02` responde en Pages.

## 9. Fuera de alcance

- `video_url` de los ejercicios.
- Imágenes para los tipos de circuito: la tabla no tiene campo de imagen.
- Fotos de perfil (`User.profile_picture`).
- Subida de archivos desde la app: el Admin sigue cargando una URL.

## 10. Riesgos

- **Fidelidad.** La figura es un pictograma, no un dibujo anatómico. El piloto (sección 7) existe para decidir si alcanza antes de producir las 207.
- **Cantidad de poses.** La estimación es de 40 a 60 poses base para los 207 ejercicios; no está medida contra el catálogo.
- **Máquinas grandes.** En prensa o poleas el equipo ocupa mucha superficie; hay que ver en el piloto que la línea gris no tape la figura.
- **Cobertura de fotos.** No está medido cuántos de los 207 tienen equivalente en el banco. Los que no, quedan sin fondo (D71).
- **Licencia de las fotos.** `free-exercise-db` se recuerda como de dominio público; se verifica en el repo del banco antes de copiar nada.
- **Calidad de `Exercised_Muscle`.** Por D70, un ejercicio con músculos mal asignados sale con el naranja en el lugar equivocado. Es un error del catálogo, y la hoja de contacto lo hace visible.
