# CU-E-23 — Editar Circuito

**Rol:** Entrenador  
**Paquete:** Administrar Circuitos

## Descripción breve

Edita un circuito pasando la lista completa de ejercicios, que pisa la anterior: mantiene los que siguen, crea los nuevos y elimina los que ya no están. También permite cambiarle el tipo por otro tipo de circuito activo. Modificar un circuito afecta a todas las rutinas que lo usan.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Ejercicios

## Alcance

**Cubre:**

- Reconciliación de los ejercicios/series del Circuit (mantener / crear / eliminar) según la lista entregada.
- Cambio del Circuit_Type del circuito por otro **activo**, o conservar el que tiene aunque esté dado de baja.
- Propagación implícita del cambio a todas las rutinas que usan el circuito.

**Fuera de alcance:**

- Borrado del circuito (CU «Eliminar Circuito»).
- Administrar los tipos de circuito ([`CU-A-24`](../admin/CU-A-24-obtener-tipos-de-circuito.md) a [`CU-A-27`](../admin/CU-A-27-eliminar-tipo-de-circuito.md), del Admin).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El Circuit existe y está activo.

## Postcondiciones

- Los ejercicios y series del Circuit reflejan exactamente la lista entregada.
- El Circuit tiene el tipo elegido. Si el entrenador no lo cambió, conserva el que tenía, aunque esté dado de baja.
- Las rutinas que lo usan quedan afectadas por el cambio.

## Camino principal (flujo básico)

1. El entrenador abre un circuito con su tipo y sus ejercicios actuales.
2. El sistema lista los ejercicios del catálogo (<<include>> Obtener Ejercicios).
3. El entrenador define la nueva lista completa de ejercicios con series y reps y, si quiere, le cambia el tipo: puede elegir cualquier Circuit_Type **activo**, o conservar el que tiene.
4. El sistema reconcilia: mantiene los repetidos, crea los nuevos y elimina los ausentes.
5. El sistema persiste y confirma, advirtiendo que afecta a las rutinas que lo usan.

## Caminos alternativos / excepciones

### En el paso 4 — Lista vacía

1. La nueva lista no contiene ejercicios.
2. El sistema impide dejar el circuito vacío e informa.

### En el paso 1 — Circuito inexistente

1. El circuito ya no existe o fue dado de baja.
2. El sistema informa que no se puede editar.

### En el paso 3 — El circuito tiene un tipo dado de baja

1. El tipo actual del circuito fue dado de baja por el Admin ([`CU-A-27`](../admin/CU-A-27-eliminar-tipo-de-circuito.md)).
2. El sistema lo muestra como el tipo actual, marcado como dado de baja, y permite **conservarlo**: el circuito se guarda sin cambiarle el tipo.
3. Si el entrenador lo cambia, sólo puede elegir un tipo activo. Una vez guardado el cambio, ya no puede volver al tipo dado de baja.

### En el paso 4 — El tipo nuevo está dado de baja o no existe

1. El entrenador le cambió el tipo y, antes de guardar, el Admin dio de baja el tipo elegido; o el pedido trae un tipo que no existe. (Si el tipo no cambió, no se controla: conservar uno dado de baja está permitido.)
2. El sistema informa el error y no persiste nada. El entrenador elige otro tipo y vuelve a guardar.

## Reglas

1. **Orden de los errores.** Si el pedido tiene más de un problema, se informa el primero en este orden: los datos del circuito y de sus series, que el circuito exista y esté activo, el tipo nuevo (sólo si cambió: que exista y esté activo) y los ejercicios (que existan).
