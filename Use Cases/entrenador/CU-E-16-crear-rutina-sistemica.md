# CU-E-16 — Crear Rutina Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Crea una rutina ensamblando circuitos existentes (p. ej. entrada en calor + piernas + cardio + estiramiento).

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Circuitos

## Alcance

**Cubre:**

- Alta de Routine y de sus vínculos Routine_Circuit en el orden elegido.

**Fuera de alcance:**

- Creación de circuitos (CU «Crear Circuito»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- Existen circuitos activos para ensamblar.

## Postcondiciones

- Existe una nueva Routine con sus Routine_Circuit asociados.

## Camino principal (flujo básico)

1. El entrenador inicia la creación de una rutina e ingresa sus datos.
2. El sistema lista los circuitos activos disponibles (<<include>> Obtener Circuitos), cada uno con su tipo y sus ejercicios. Permite buscarlos por nombre (sin distinguir mayúsculas ni tildes) y filtrarlos por tipo con chips: uno por cada tipo de los circuitos activos, por orden alfabético, y otro para verlos todos. La búsqueda y el chip se combinan.
3. El entrenador elige uno o varios circuitos a la vez, que se suman al final de la rutina en el orden en que los eligió (un circuito puede ir más de una vez), y los ordena. El sistema muestra cada circuito de la rutina con su tipo y sus ejercicios y, a pedido, las series de cada ejercicio.
4. El sistema persiste la Routine y los Routine_Circuit, y confirma.

## Caminos alternativos / excepciones

### En el paso 3 — Sin circuitos seleccionados

1. No se eligió ningún circuito.
2. El sistema impide crear una rutina vacía e informa.

### En el paso 4 — Datos inválidos

1. Datos de la rutina inválidos.
2. El sistema marca el error y no persiste.
