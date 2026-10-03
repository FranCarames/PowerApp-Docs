# CU-E-22 — Crear Circuito

**Rol:** Entrenador  
**Paquete:** Administrar Circuitos

## Descripción breve

Crea un circuito reutilizable recibiendo la lista completa de ejercicios con sus series y repeticiones. Es una pieza independiente que se crea antes que las rutinas.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Ejercicios

## Alcance

**Cubre:**

- Alta de un Circuit (name, type, active = true).
- Alta de sus Routine_Exercise y Exercise_Set a partir de la lista entregada.

**Fuera de alcance:**

- Ensamblado en rutinas (CU «Crear Rutina Sistémica»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- Existen ejercicios en el catálogo.

## Postcondiciones

- Existe un nuevo Circuit activo con sus ejercicios y series.

## Camino principal (flujo básico)

1. El entrenador ingresa los datos del circuito (name, type).
2. El sistema lista los ejercicios del catálogo (<<include>> Obtener Ejercicios).
3. El entrenador arma la lista completa de ejercicios con series y reps.
4. El sistema persiste el Circuit y sus ejercicios/series, y confirma.

## Caminos alternativos / excepciones

### En el paso 3 — Circuito sin ejercicios

1. La lista de ejercicios está vacía.
2. El sistema impide crear un circuito vacío e informa.

### En el paso 4 — Datos inválidos

1. Datos del circuito o de alguna serie inválidos.
2. El sistema marca el error y no persiste.
