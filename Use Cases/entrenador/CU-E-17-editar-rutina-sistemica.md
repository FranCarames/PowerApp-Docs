# CU-E-17 — Editar Rutina Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Edita una rutina pasando la lista completa de circuitos, que reconcilia el conjunto: mantiene los que siguen, crea los nuevos y elimina los que ya no están.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Circuitos

## Alcance

**Cubre:**

- Reconciliación de los Routine_Circuit de la rutina (mantener / crear / eliminar) según la lista entregada.

**Fuera de alcance:**

- Modificación interna de cada circuito (CU «Editar Circuito»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La rutina existe.

## Postcondiciones

- Los Routine_Circuit de la rutina reflejan exactamente la lista entregada.

## Camino principal (flujo básico)

1. El entrenador abre una rutina con sus circuitos actuales.
2. El sistema lista los circuitos disponibles (<<include>> Obtener Circuitos).
3. El entrenador define la nueva lista completa de circuitos y su orden.
4. El sistema reconcilia: mantiene los repetidos, crea los nuevos vínculos y elimina los ausentes.
5. El sistema persiste y confirma.

## Caminos alternativos / excepciones

### En el paso 4 — Lista vacía

1. La nueva lista no contiene circuitos.
2. El sistema impide dejar la rutina vacía e informa.

### En el paso 1 — Rutina inexistente

1. La rutina ya no existe.
2. El sistema informa que no se puede editar.
