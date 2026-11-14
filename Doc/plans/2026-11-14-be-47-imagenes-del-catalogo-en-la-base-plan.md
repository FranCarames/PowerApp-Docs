# BE-47 y T62 — Imágenes del catálogo en la base y en la web · Plan 3 de 3

> **Spec:** [Imágenes del catálogo](../specs/2026-11-14-imagenes-del-catalogo-design.md) (D65 a D74). **Planes anteriores:** [1: el generador y el piloto](2026-11-14-imagenes-del-catalogo-generador-y-piloto-plan.md) y [2: el resto de los ejercicios y las fotos](2026-11-14-imagenes-del-catalogo-resto-de-ejercicios-y-fotos-plan.md).
>
> **Estado al 14/11.** Las imágenes existen (250 SVG y 161 fotos) en el repo local `D:\Power App\Assets\PowerApp-Assets`, stageadas. Fran creó el remoto `https://github.com/FranCarames/PowerApp-Assets`; **todavía está vacío y Pages no responde**: falta el commit, el push y activar Pages, que hace Fran.
>
> **Este plan es de diseño y espera la validación de Fran.** Trae tres decisiones nuevas (D75 a D77). No se implementa nada hasta que las apruebe.
>
> **Cómo se entrega.** El backend sigue el flujo de su `CLAUDE.md`: build, `Db Creator`, Status (y su copia a docs) y commit de Fran. La web se toca en su propio repo. No se levanta el server.

## 1. Decisiones nuevas

| # | Decisión | Por qué |
|---|---|---|
| D75 | **URL base: `https://francarames.github.io/PowerApp-Assets`**, en una sola constante de `Db Creator` | Es la URL de Pages del repo que creó Fran. Una sola constante: si el repo se renombra o se muda a un dominio propio, se cambia en un lugar y se regenera |
| D76 | **`Db Creator` no importa el repo de assets.** El repo de assets exporta un **manifiesto** (la lista de ids de ejercicios que tienen foto) y ese archivo se guarda en `Db Creator` | El generador de imágenes ya importa `Db Creator` para leer el catálogo. Si `Db Creator` importara a su vez el repo de assets, los dos repos dependerían uno del otro y la base no se podría regenerar sin tener el otro clonado. Las miniaturas no necesitan manifiesto: los 250 SVG existen siempre y su URL sale del id |
| D77 | **El patch sólo completa lo que está vacío:** cada `UPDATE` lleva `WHERE <columna> IS NULL` | En la base viva un Admin pudo haber cargado una imagen a mano desde el formulario; el patch no la pisa. Además lo hace idempotente: correrlo dos veces no cambia nada |

## 2. Backend (BE-47)

### 2.1 Qué se toca

| Archivo | Cambio |
|---|---|
| `Db Creator/imagenes.py` (nuevo) | `ASSETS_BASE` (D75), `EXERCISES_WITH_PHOTO` (el manifiesto de D76: un conjunto de ids) y cuatro funciones que arman la URL: miniatura de ejercicio, foto de ejercicio (o `None`), músculo y grupo |
| `Db Creator/build_sql.py` | En `build_estaticos()`, los tres `INSERT` (`Muscle_Group`, `Muscle`, `Exercise`) escriben la URL donde hoy escriben `NULL`. Suma `build_patch_imagenes()`, que genera el patch |
| `Db Creator/02_datos_estaticos.sql` | Regenerado |
| `Db Creator/patches/2026-11-14-be-47.sql` (nuevo) | Generado: los `UPDATE` de D77 |
| `Db Creator/README.md` | Una nota sobre `imagenes.py`, el manifiesto y el patch |
| `Status/estado-implementacion-backend.md` y `dashboard-estado-backend.html` | Una entrada en «Cambios recientes». **Sin cambios de conteo**: no cambia ningún CU |

**No cambia** `ddl.py`, el `01`, el `03`, ninguna entidad ni nada de `power-app/src`.

### 2.2 Valores (spec, sección 5)

| Tabla | Columna | Valor |
|---|---|---|
| `Exercise` | `preview_image` | `<base>/exercise/preview/<id>.svg` |
| `Exercise` | `bg_image` | `<base>/exercise/bg/<id>.jpg` si el id está en el manifiesto; si no, `NULL` (D71) |
| `Exercise` | `video_url` | `NULL`, como hoy |
| `Muscle` | `image_url` y `preview_image` | `<base>/muscle/<id>.svg` |
| `Muscle_Group` | `image_url` y `preview_image` | `<base>/muscle-group/<id>.svg` |

### 2.3 El manifiesto

En el repo de assets, un script nuevo `generator/export_manifest.py` lee `photos.PHOTOS` y el catálogo, y escribe en `Db Creator/imagenes.py` el bloque `EXERCISES_WITH_PHOTO` (161 ids, ordenados). Se corre cada vez que cambia la tabla de fotos. Un test en assets comprueba que el manifiesto de `Db Creator` coincide con los archivos de `exercise/bg/`.

### 2.4 El patch

- Encabezado con el formato de los patches anteriores: qué hace, cuándo aborta, cómo se corre.
- Un `UPDATE` por fila y por columna, con `WHERE id = … AND <columna> IS NULL` (D77).
- **No cambia `updated_at`**: completar una imagen del seed no es una edición (mismo criterio que el patch de BE-44).
- Avisa con `NOTICE` cuántas filas completó por tabla.
- Hace falta porque el `02` inserta con `ON CONFLICT (id) DO NOTHING`: volver a correrlo sobre una base viva no actualiza las filas que ya existen.

### 2.5 Verificación

1. `python build_sql.py` dos veces: la segunda no cambia ningún byte (los `.sql` quedan en sync con los `.py`).
2. En el `02`: 207 ejercicios con `preview_image`, 161 con `bg_image` y 46 con `NULL`; 35 músculos y 8 grupos con sus dos columnas.
3. `npm --prefix power-app run build` (no debería cambiar nada, se corre por el flujo).
4. **Cuando Pages esté activo:** un script pide cada URL distinta del `02` (411) y todas responden 200. Hasta entonces este punto queda pendiente y se dice.
5. El patch, contra una base descartable creada con el `02` anterior: completa las filas, y corrido de nuevo no cambia nada.

## 3. Web (T62)

En el repo `PowerApp-Web`:

- **El duotono (D72).** El fondo de la ficha del ejercicio (`ExerciseSheet`) muestra `bg_image` en escala de grises con una capa de color encima, del naranja de marca al fondo de la app, y un degradé inferior para que el texto se lea. Se aplica a **toda** `bg_image`, también a las que cargue un Admin a mano. Los valores exactos del filtro se ajustan mirándolo sobre fotos reales.
- **`Thumb`.** Confirmar que un SVG de fondo transparente se ve bien sobre su degradé a 40 y 48 px, y que el `onError` sigue cayendo en el ícono.
- **Músculos y grupos.** Revisar dónde se muestran `image_url` y `preview_image` (`WikiRow` y los formularios del Admin) y que el SVG en acercamiento no se recorte.

Depende de BE-47 sólo para probar con datos reales; el CSS se puede escribir antes con cualquier URL.

## 4. Orden

1. Fran: commit y push del repo de assets, y activar Pages (rama `main`, raíz).
2. `export_manifest.py` y `imagenes.py`.
3. `build_sql.py`, regenerar el `02` y generar el patch.
4. Verificación 1 a 3; la 4 cuando Pages responda; la 5 si hay una base donde probar.
5. Status y su copia a docs.
6. T62 en la web.
7. Fran corre el patch en Render cuando quiera.

## 5. Riesgos

- **Pages tarda o cambia la URL.** Si la URL real difiere de D75, se cambia la constante y se regenera; no hay otro lugar donde esté escrita.
- **Mayúsculas en la ruta.** En Pages el nombre del repo distingue mayúsculas: `/PowerApp-Assets/` tiene que escribirse igual que el repo.
- **Fotos de terceros.** El banco declara dominio público, pero no documenta el origen de las fotos (plan 2). Si alguna hubiera que quitarla, se saca de `photos.PHOTOS`, se regenera el manifiesto y el `02`, y un `UPDATE` la pone en `NULL`.
- **El patch no pisa lo cargado a mano (D77).** Si en la base viva algún ejercicio tiene una URL vieja o rota, queda como está: hay que limpiarla aparte.
