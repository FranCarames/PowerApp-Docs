# CU-E-12e — Reordenar las Rutinas de una Semana

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones  
**Incluido por:** [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) Gestionar Rutinas de una Planificación Sistémica

## Descripción breve

Cambia el orden de las rutinas vigentes de **una semana** del plan. El entrenador mueve una rutina a otro lugar de su semana —arrastrándola desde el grabber o, con el teclado, con las flechas— y el sistema guarda la semana entera con el orden nuevo, renumerada de 1 a n.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Reordenar, dentro de su semana, todas las rutinas vigentes de esa semana, en una sola operación.
- Dejar la semana con posiciones 1, 2, 3… sin huecos ni repetidas.

**Fuera de alcance:**

- Mover una rutina a otra semana: se quita y se agrega en la otra (CU-E-12c y CU-E-12a).
- Reordenar dos semanas a la vez.
- Mover las rutinas quitadas: no se ven, no participan.
- Reordenar mientras la planificación no está creada: en el alta el orden se cambia sólo en pantalla (CU-E-09, regla 2).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La planificación existe y está activa.
- La semana tiene al menos dos rutinas vigentes (con una sola no hay nada que mover).

## Postcondiciones

- Las rutinas vigentes de esa semana quedan con `order` 1 a n, en el orden indicado.
- El resto del plan no cambia: ni las otras semanas ni las rutinas quitadas, que conservan su semana y su orden.
- La planificación muestra la semana en el orden nuevo.

## Camino principal (flujo básico)

1. El entrenador, en una semana con rutinas, mueve una de ellas a otro lugar de la misma semana:
   - **Con el mouse o el dedo:** arrastra el grabber de la rutina y la suelta en su lugar nuevo.
   - **Con el teclado:** con el foco en el grabber, ↑ y ↓ mueven la rutina de a un lugar. El foco se queda en la rutina que se movió y el sistema anuncia su posición nueva («<rutina>: posición N de M»).
2. El sistema muestra el orden nuevo de inmediato.
3. Por cada movimiento (al soltar el arrastre, o con cada flecha), el sistema recibe **la semana entera** —todas sus rutinas vigentes, en el orden nuevo— en una sola operación, las renumera de 1 a n en una transacción y devuelve la planificación actualizada.

## Caminos alternativos / excepciones

### En el paso 1 — Soltar en el mismo lugar, o mover más allá de los extremos

1. El entrenador suelta la rutina donde estaba, o aprieta ↑ en la primera rutina o ↓ en la última.
2. El sistema no cambia nada y no manda ninguna operación.

### En el paso 3 — La lista no coincide con la semana

1. Mientras el entrenador reordenaba, la semana cambió por otro lado (otra pestaña o otro entrenador agregó, quitó o reincorporó una rutina), y la lista enviada no tiene exactamente las rutinas vigentes de la semana: falta alguna, sobra alguna o hay una repetida.
2. El sistema informa que la lista no coincide con la semana y que hay que recargar la planificación, y **no cambia nada**. La pantalla recarga la planificación y muestra el orden que realmente hay.

### En el paso 3 — La planificación está dada de baja

1. La planificación está inactiva.
2. El sistema informa que hay que reactivarla antes de modificar su contenido y no cambia nada.

### En el paso 3 — La planificación no existe

1. La planificación ya no existe.
2. El sistema informa el error y no cambia nada.

### Posiciones con huecos o repetidas

1. La semana tenía posiciones con huecos o repetidas (regla común 1 de CU-E-12: el alta de una rutina las admite).
2. Al reordenar, quedan 1 a n sin huecos ni repetidas. Una rutina quitada de esa semana puede volver a coincidir con otra si se reincorpora a su lugar.
