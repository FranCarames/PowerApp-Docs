# CU-E-09 — Crear Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Crea una planificación sistémica (plantilla) que agrupará rutinas a lo largo de varias semanas (de una semana hasta dos o tres meses). El entrenador puede dejarla vacía o llenar desde el alta las rutinas de cada semana: se guardan juntas, todo o nada.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de una Planification sistémica con sus datos base: nombre, notas, tipo, su duración en semanas (obligatoria, de 1 en adelante) y las **rutinas por semana** (obligatorias, de 1 en adelante).
- Mostrar, debajo de los datos, las semanas 1 a la duración, cada una con tantos huecos como rutinas por semana.
- Llenar esas semanas antes de crear: elegir, ordenar, quitar y repetir rutinas. Lo que se elige se guarda junto con la planificación.

**Fuera de alcance:**

- Asignar, quitar, reordenar o repetir las rutinas de una planificación que ya existe (CU-E-12).
- Asignación de la planificación a un alumno (CU-E-13).
- Por ahora, la planificación sin duración fija (duración 0): ver «Duración inválida».

## Reglas

1. **«Rutinas por semana» define los huecos, no es un tope.** Es el dato `number_of_routines` y significa cuántas rutinas lleva cada semana (antes se leía como el total del plan). Una semana puede terminar con más rutinas que las indicadas: aparece «Agregar otra rutina». Tampoco obliga a llenarlas: una semana puede quedar con menos, o vacía.
2. **Lo que se arma antes de crear vive sólo en pantalla.** Mientras la planificación no está creada, elegir, quitar, ordenar y repetir no mandan nada al sistema: se aplican a lo que se está armando, con las mismas reglas de [`CU-E-12e`](CU-E-12e-reordenar-rutinas-de-una-semana.md) y [`CU-E-12f`](CU-E-12f-repetir-una-semana-en-otras-semanas.md).
3. **La planificación y sus rutinas se guardan juntas, todo o nada.** Si algo falla, no se crea la planificación ni ninguna rutina.
4. **Cada semana guarda sus rutinas en el orden en que quedaron en pantalla,** con posiciones 1, 2, 3… sin huecos ni repetidas. Una misma rutina puede aparecer más de una vez (regla común 2 de [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md)). Las semanas vacías no se guardan.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- Las rutinas que se elijan existen y están activas.

## Postcondiciones

- Existe una nueva Planification sistémica.
- Por cada rutina elegida existe un Routine_Asignation que la liga al plan, en la semana donde se la puso y con su posición dentro de ella (1 a n por semana).
- Si no se eligió ninguna, la planificación queda sin rutinas, lista para llenarse desde CU-E-12.

## Camino principal (flujo básico)

1. El entrenador ingresa los datos de la planificación (nombre, notas, tipo, duración en semanas, rutinas por semana).
2. El sistema muestra debajo las semanas 1 a la duración, cada una con tantos huecos como rutinas por semana. Si el entrenador cambia la duración o las rutinas por semana, las semanas se rearman en el momento sin perder lo ya elegido.
3. Opcionalmente, el entrenador llena las semanas: elige la rutina de cada hueco, las ordena, quita las que no quiere y repite una semana en otras.
4. El entrenador confirma la creación.
5. El sistema valida los datos y las rutinas.
6. El sistema persiste la Planification y las rutinas de cada semana en una sola operación y confirma. Si no se eligió ninguna rutina, la crea sin rutinas.

## Caminos alternativos / excepciones

### En el paso 5 — Datos inválidos

1. Faltan campos obligatorios o son inválidos (entre ellos, las rutinas por semana: falta o no es un entero de 1 en adelante).
2. El sistema marca el error y no persiste nada.

### En el paso 5 — Duración inválida

1. La duración falta o no es un entero mayor o igual que 1. La duración se mide en **semanas**.
2. El sistema marca el error y no persiste.

> **Alcance de esta etapa (decisión del 31/10/2026).** La planificación sin duración fija (duración 0) queda fuera de alcance: la web exige una duración de 1 semana o más. El backend sigue aceptando 0 como "sin duración fija" y por ahora no se refina, así que queda como un desvío conocido entre la web y el back. Hasta esta decisión, el CU aceptaba 0 como "sin duración fija".

### En el paso 3 — Achicar la duración con rutinas en semanas que se van

1. El entrenador baja la duración por debajo de la semana más alta en la que ya eligió rutinas.
2. El sistema informa en qué semana hay rutinas —el mismo error que al editar la duración (CU-E-10)—, no permite achicar la duración hasta ahí y conserva lo elegido: la duración queda como estaba. Para achicarla, primero se quitan esas rutinas. Si las semanas que se van están vacías, se achica sin problema.

### En el paso 3 — Demasiadas rutinas en una semana

1. El entrenador quiere sumar más de 50 rutinas a una misma semana: es el máximo por semana al crear.
2. El sistema avisa y no suma más.

### En el paso 5 — Semana inválida

1. Una semana de las rutinas aparece más de una vez, es menor que 1 o supera la duración de la planificación.
2. El sistema informa el error y **no crea nada**: ni la planificación ni ninguna rutina. (La pantalla no lo permite; el caso protege al sistema de un cliente que lo intente.)

### En el paso 5 — Alguna rutina no existe

1. Una o más rutinas elegidas no existen (por ejemplo, las borraron mientras el entrenador armaba el plan).
2. El sistema informa el error y **no crea nada**.

### En el paso 5 — Alguna rutina está dada de baja

1. Una o más rutinas elegidas están inactivas (por ejemplo, las dieron de baja mientras el entrenador armaba el plan).
2. El sistema informa cuáles son, por nombre, y **no crea nada**. El entrenador conserva lo que armó para sacarlas o reemplazarlas.

### En el paso 4 — Cancela

1. El entrenador vuelve sin crear.
2. El sistema no guarda nada, ni los datos ni las rutinas elegidas.
