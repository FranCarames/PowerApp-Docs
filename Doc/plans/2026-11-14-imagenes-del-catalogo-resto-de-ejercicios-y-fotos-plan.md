# Imágenes del catálogo — Plan 2 de 3: el resto de los ejercicios y las fotos

> **Spec:** [Imágenes del catálogo](../specs/2026-11-14-imagenes-del-catalogo-design.md) (D65 a D74). **Plan anterior:** [Plan 1: el generador y el piloto](2026-11-14-imagenes-del-catalogo-generador-y-piloto-plan.md).
>
> **Estado al 14/11.** Fran aprobó el piloto («alcanza»): D69 se sostiene para los ejercicios. **La parte A (ilustraciones) está hecha** y stageada en el repo local `D:\Power App\Assets\PowerApp-Assets`, sin commitear. **La parte B (fotos) está hecha**: con el permiso de Fran se copiaron 161 fotos (9,7 MB): las 135 confirmadas y las 26 dudosas, que Fran revisó en pantalla y aprobó el 14/11. Quedan 46 ejercicios sin foto (ver «Resultado de la parte B»).
>
> **Cómo se entrega.** Igual que el Plan 1: nada se commitea ni se pushea; el remoto y Pages los crea Fran.

## Parte A — Las ilustraciones de los 197 ejercicios restantes (hecha)

### Qué cambió respecto del Plan 1

| Archivo | Cambio |
|---|---|
| `generator/poses.py` | Suma `fk()`: arma una pose a partir de **ángulos**, con el largo de cada segmento fijo. Las 10 poses del piloto siguen escritas en coordenadas; las 84 nuevas usan `fk()`. Si una figura no entra en el lienzo se achica y la pose lleva `scale` |
| `generator/figure.py` | Respeta `scale` en los anchos de la silueta y del naranja |
| `generator/equipment.py` | Un punto puede ser una articulación desplazada, `("hand", dx, dy)`, y `"@N"` fija una coordenada (por ejemplo `"@88"`, el piso) |
| `generator/presets.py` (nuevo) | Equipo frecuente con nombre (banco, asiento, polea alta y baja, barra, mancuerna, cajón, saco…), para combinar con `P("seat", "cable_high")` |
| `generator/exercises.py` | Los 207 ejercicios: los 10 del piloto con su equipo a mano y el resto con una pose y presets |
| `generator/tests/` | 40 tests. `test_art` exige que **todo** ejercicio del catálogo tenga ilustración |

### Por qué ángulos y no coordenadas

Con coordenadas, cada pose nueva obliga a cuidar a mano que el muslo mida lo mismo que en las demás. Con ángulos las proporciones salen iguales por construcción, y una pose es una línea: `"squat_front": fk(torso=25, thigh=97, shin=205, arm=140, forearm=0)`. Convención: 0 = arriba, 90 = adelante, 180 = abajo, −90 = atrás; son ángulos absolutos.

### Resultado

- `py generator/build.py --check` termina bien: **250 SVG** (207 ejercicios, 35 músculos, 8 grupos), ninguno sin ilustración. Pesan alrededor de 1 MB en total.
- 94 poses para 207 ejercicios: muchos ejercicios comparten pose y cambian el equipo.

### Lo que queda flojo y conviene que Fran mire

- **Ejercicios de «cuerpo completo».** Si el músculo primario del catálogo es `full_body` (por ejemplo, la Cargada), la figura sale entera naranja. Es lo que dice el dato (D70); si no gusta, se cambia la regla para `full_body`, no el catálogo.
- **Movimientos laterales.** La figura es de perfil: una elevación lateral, una plancha lateral o una sentadilla cossack se dibujan con una pose de perfil aproximada.
- **Poses compartidas.** Variantes del mismo gesto (press de banca plano, con pausa, declinado, cerrado) usan la misma imagen o difieren sólo en el equipo.
- **Máquinas.** Se dibujan con pocas líneas (asiento, respaldo, polea). La prensa y la hack son las menos claras.
- **Revisión visual.** Se revisó una imagen por pose (94), no las 207 una por una.

## Parte B — Las fotos del detalle (pendiente)

Pasos, en orden:

1. **Licencia.** Leer el archivo de licencia del repo `yuhonas/free-exercise-db` y confirmar que permite copiar y redistribuir las imágenes. Si no lo permite, parar y volver a la spec (D66).
2. **Permiso de descarga.** Pedirle a Fran el visto bueno antes de bajar nada: el índice del banco (un JSON) y después las fotos elegidas.
3. **Cobertura.** Con el índice, proponer para cada uno de los 207 ejercicios el equivalente del banco (los nombres están en inglés) y contar cuántos tienen. Los dudosos se listan para que Fran decida.
4. **Tabla de correspondencia.** `generator/photos.py`: nombre del ejercicio → id del banco. Sólo las correspondencias confirmadas.
5. **Copia.** Un script baja cada foto a `exercise/bg/<id>.jpg` y escribe `CREDITS.md` con la fuente y la licencia. Los ejercicios sin correspondencia no tienen archivo (D71: `bg_image` queda en `NULL`).
6. **Verificación.** Un test: cada archivo de `exercise/bg/` corresponde a un ejercicio del catálogo y figura en la tabla. La hoja de contacto suma una sección con las fotos.

### Resultado de la parte B

- **Licencia:** `free-exercise-db` se publica bajo The Unlicense (dominio público), según su `LICENSE.md`. El origen de las fotos en sí no está documentado: el README dice que el banco reestructura los datos de otro proyecto (`wrkout/exercises.json`).
- **Cobertura:** de 207 ejercicios, **161 con foto** (135 elegidas de entrada y 26 dudosas que Fran aprobó) y **46 sin foto** (casi todo boxeo, saltos y estáticos como L-Sit, Hollow Hold o Wall Sit).
- **Tabla:** `generator/photos.py`, con `PHOTOS` (se copian) y `DOUBTFUL` (no se copian hasta que Fran decida).
- **Copia:** `py generator/fetch_photos.py` baja la primera imagen de cada ejercicio a `exercise/bg/<id>.jpg` y escribe `CREDITS.md`. Es idempotente y borra las que salgan de la tabla.
- **Verificación:** 46 tests; la hoja de contacto suma la sección «Fotos del detalle».
- **Sin verificar:** las confirmadas se eligieron por nombre y se miraron en pantalla unas 40; el resto no se revisó una por una. Cuatro fotos del banco quedan asignadas a más de un ejercicio (contando las dudosas): remo con barra, goblet squat, thruster con kettlebell y salto a la soga.

## Qué queda para el Plan 3

`Db Creator`, el `02` y el patch para la base viva (BE-47); el duotono por CSS en la web (T62). Necesita la URL de Pages, que existe recién cuando Fran cree el repo remoto.
