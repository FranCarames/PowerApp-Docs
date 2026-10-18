# CU-E-12a — Asignar una Rutina a una Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones  
**Incluido por:** [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) Gestionar Rutinas de una Planificación Sistémica

## Descripción breve

Vincula una rutina sistémica a una planificación creando un Routine_Asignation, en la semana que indica el entrenador y con una posición indicada por él o calculada al final de esa semana.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Rutinas Sistémicas

## Alcance

**Cubre:**

- Alta de un vínculo Routine_Asignation entre una rutina y una planificación, con su week y su order.

**Fuera de alcance:**

- Alta de varias rutinas a la vez (CU-E-12b).
- Creación de la rutina.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La planificación existe y está activa.
- La rutina existe y está activa.

## Postcondiciones

- Existe un Routine_Asignation nuevo que liga la rutina al plan, con su semana y su posición.
- La planificación muestra esa rutina en su detalle.

## Camino principal (flujo básico)

1. El entrenador abre una planificación y elige agregar una rutina.
2. El sistema lista las rutinas sistémicas disponibles.
3. El entrenador selecciona una, indica la semana y, opcionalmente, la posición.
4. El sistema crea el Routine_Asignation y devuelve la planificación actualizada.

## Caminos alternativos / excepciones

### En el paso 3 — Sin posición indicada

1. El entrenador no indica un order.
2. El sistema agrega la rutina al final **de esa semana**, después de la última rutina vigente de ella (o en la posición 1 si la semana está vacía).

### En el paso 3 — Semana inválida

1. La semana falta, no es un entero mayor o igual que 1, o supera la duración de la planificación (cuando esta es mayor que 0).
2. El sistema informa el error y no crea el vínculo.

### En el paso 3 — Posición ya ocupada

1. El entrenador indica un order que otra rutina de esa semana del plan ya tiene.
2. El sistema lo acepta y persiste esa posición: no desplaza al resto ni renumera nada. Las dos rutinas comparten posición dentro de la semana y se muestran en el orden en que fueron asignadas.

### En el paso 3 — La misma rutina más de una vez

1. El entrenador asigna una rutina que el plan ya contiene.
2. El sistema crea un vínculo nuevo: la repetición está permitida.

### En el paso 4 — La rutina está dada de baja

1. La rutina existe pero está inactiva.
2. El sistema informa cuál es y no crea el vínculo.

### En el paso 4 — La planificación está dada de baja

1. La planificación está inactiva.
2. El sistema informa que hay que reactivarla antes de modificar su contenido.
