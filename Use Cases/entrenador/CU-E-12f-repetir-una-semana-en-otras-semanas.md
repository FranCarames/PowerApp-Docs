# CU-E-12f — Repetir una Semana en Otras Semanas

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones  
**Incluido por:** [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) Gestionar Rutinas de una Planificación Sistémica

## Descripción breve

Copia las rutinas vigentes de una semana del plan, en su orden, al final de cada una de las semanas que el entrenador elige. Es la vía para armar un plan en el que varias semanas son iguales sin cargar las rutinas semana por semana.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Copiar todas las rutinas vigentes de una semana a una o varias semanas destino, en una sola operación.
- Sumarlas **al final** de cada semana destino, con posiciones consecutivas, aunque la semana ya tenga rutinas.

**Fuera de alcance:**

- Copiar sólo algunas rutinas de la semana.
- Reemplazar el contenido de una semana destino: lo que ya tiene se conserva y las copias se suman a continuación.
- Copiar de una planificación a otra.
- Repetir una semana mientras la planificación no está creada: en el alta se repite sólo en pantalla, con la misma regla (CU-E-09, regla 2).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La planificación existe y está activa.
- La semana de origen tiene al menos una rutina vigente.
- La planificación tiene al menos otra semana donde copiar (si dura una sola semana, la operación no se ofrece).

## Postcondiciones

- En cada semana destino existe un Routine_Asignation nuevo por cada rutina vigente de la semana de origen, a continuación de la última rutina vigente de esa semana (o desde la posición 1 si estaba vacía), en el mismo orden que en el origen.
- La semana de origen no cambia.
- Las rutinas de origen quitadas no se copian. Las copias no heredan el historial de nadie: son vínculos nuevos.

## Camino principal (flujo básico)

1. El entrenador, en una semana con rutinas, elige «Repetir en las otras semanas».
2. El sistema muestra el panel «Repetir la semana N»: las rutinas que se copian, en su orden, y una fila por cada otra semana de la duración. Las semanas **vacías** aparecen ya marcadas («Queda igual a la semana N.»); en las que ya tienen rutinas, sin marcar, el sistema avisa «Ya tiene X rutinas: estas se suman al final.». Cada fila muestra además cuánto tiene hoy («Vacía» o «X rutinas»).
3. El entrenador marca o desmarca semanas y confirma «Repetir en N semanas».
4. El sistema copia las rutinas en todas las semanas elegidas en una sola transacción y devuelve la planificación actualizada.

## Caminos alternativos / excepciones

### En el paso 3 — Ninguna semana elegida

1. El entrenador desmarca todas las semanas.
2. La confirmación queda apagada («Elegí una semana») y no se manda nada.

### En el paso 3 — Cancela

1. El entrenador cancela el panel.
2. El sistema no realiza cambios.

### En el paso 4 — La semana de origen quedó sin rutinas

1. Mientras el entrenador elegía, la semana de origen se vació por otro lado (otra pestaña o otro entrenador quitó sus rutinas).
2. El sistema informa que esa semana no tiene rutinas para repetir y **no copia nada**.

### En el paso 4 — Una rutina de origen está dada de baja

1. Una o más rutinas de la semana de origen están inactivas (la rutina en sí, no su vínculo).
2. El sistema informa cuáles son, por nombre, y **no copia nada**: ni en esa semana destino ni en las demás.

### En el paso 4 — Semana inválida

1. Una semana destino es igual a la de origen, está repetida en la lista, o la de origen o alguna destino supera la duración de la planificación. (La pantalla no lo permite; el caso protege al sistema de un cliente que lo intente.)
2. El sistema informa el error y **no copia nada**.

### En el paso 4 — Demasiadas semanas

1. El pedido no trae ninguna semana destino, o trae más de 50.
2. El sistema marca el error y no persiste nada.

### En el paso 4 — La planificación está dada de baja

1. La planificación está inactiva.
2. El sistema informa que hay que reactivarla antes de modificar su contenido y no copia nada.

### En el paso 4 — La planificación no existe

1. La planificación ya no existe.
2. El sistema informa el error y no copia nada.

### Repetir una semana más de una vez

1. El entrenador repite la misma semana de origen en la misma semana destino dos veces.
2. El sistema suma las copias de nuevo al final: la repetición está permitida (regla común 2 de CU-E-12). Si no la quería, quita las rutinas sobrantes (CU-E-12c o CU-E-12d).
