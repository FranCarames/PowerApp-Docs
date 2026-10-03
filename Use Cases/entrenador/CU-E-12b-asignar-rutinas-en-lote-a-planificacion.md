# CU-E-12b — Asignar Rutinas en Lote a una Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones  
**Incluido por:** [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) Gestionar Rutinas de una Planificación Sistémica

## Descripción breve

Vincula varias rutinas sistémicas a una planificación en una sola operación, agregándolas al final del plan en el orden en que fueron seleccionadas. Es la vía normal para armar un plan desde cero.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Rutinas Sistémicas

## Alcance

**Cubre:**

- Alta de un Routine_Asignation por cada rutina seleccionada, con posiciones consecutivas al final del plan.

**Fuera de alcance:**

- Indicar una posición puntual para cada rutina: para eso está CU-E-12a, que se ejecuta de a una.
- Creación de las rutinas.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La planificación existe y está activa.
- Todas las rutinas seleccionadas existen y están activas.

## Postcondiciones

- Existe un Routine_Asignation por cada rutina seleccionada, con posiciones consecutivas a continuación de la última rutina vigente del plan.
- La planificación muestra todas esas rutinas en su detalle, en el orden en que fueron seleccionadas.

## Camino principal (flujo básico)

1. El entrenador abre una planificación y elige agregar rutinas.
2. El sistema lista las rutinas sistémicas disponibles.
3. El entrenador selecciona varias.
4. El sistema crea todos los Routine_Asignation en una sola transacción y devuelve la planificación actualizada.

## Caminos alternativos / excepciones

### En el paso 3 — La misma rutina seleccionada más de una vez

1. El entrenador incluye la misma rutina dos veces en la selección.
2. El sistema crea un vínculo por cada aparición: la repetición está permitida y cada una ocupa su propia posición.

### En el paso 4 — Alguna rutina no existe

1. Uno o más identificadores no corresponden a ninguna rutina.
2. El sistema informa el error y **no crea ninguna** asignación.

### En el paso 4 — Alguna rutina está dada de baja

1. Una o más rutinas seleccionadas están inactivas.
2. El sistema informa cuáles son, por nombre, y **no crea ninguna** asignación.

### En el paso 4 — La planificación está dada de baja

1. La planificación está inactiva.
2. El sistema informa que hay que reactivarla antes de modificar su contenido.

### En el paso 3 — Selección vacía o demasiado grande

1. El entrenador no selecciona ninguna rutina, o supera el máximo admitido por operación.
2. El sistema marca el error y no persiste nada.
