# CU-E-23 — Editar Circuito

**Rol:** Entrenador  
**Paquete:** Administrar Circuitos

## Descripción breve

Edita un circuito pasando la lista completa de ejercicios, que pisa la anterior: mantiene los que siguen, crea los nuevos y elimina los que ya no están. Modificar un circuito afecta a todas las rutinas que lo usan.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Ejercicios

## Alcance

**Cubre:**

- Reconciliación de los ejercicios/series del Circuit (mantener / crear / eliminar) según la lista entregada.
- Propagación implícita del cambio a todas las rutinas que usan el circuito.

**Fuera de alcance:**

- Borrado del circuito (CU «Eliminar Circuito»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El Circuit existe y está activo.

## Postcondiciones

- Los ejercicios y series del Circuit reflejan exactamente la lista entregada.
- Las rutinas que lo usan quedan afectadas por el cambio.

## Camino principal (flujo básico)

1. El entrenador abre un circuito con sus ejercicios actuales.
2. El sistema lista los ejercicios del catálogo (<<include>> Obtener Ejercicios).
3. El entrenador define la nueva lista completa de ejercicios con series y reps.
4. El sistema reconcilia: mantiene los repetidos, crea los nuevos y elimina los ausentes.
5. El sistema persiste y confirma, advirtiendo que afecta a las rutinas que lo usan.

## Caminos alternativos / excepciones

### En el paso 4 — Lista vacía

1. La nueva lista no contiene ejercicios.
2. El sistema impide dejar el circuito vacío e informa.

### En el paso 1 — Circuito inexistente

1. El circuito ya no existe o fue dado de baja.
2. El sistema informa que no se puede editar.
