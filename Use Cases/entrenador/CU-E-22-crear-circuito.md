# CU-E-22 — Crear Circuito

**Rol:** Entrenador  
**Paquete:** Administrar Circuitos

## Descripción breve

Crea un circuito reutilizable recibiendo su tipo y la lista completa de ejercicios con sus series y repeticiones. Es una pieza independiente que se crea antes que las rutinas. El tipo se elige entre los tipos de circuito activos, que administra el Admin.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Obtener Ejercicios

## Alcance

**Cubre:**

- Alta de un Circuit (name, su Circuit_Type, active = true). El Circuit_Type tiene que estar activo.
- Alta de sus Routine_Exercise y Exercise_Set a partir de la lista entregada.

**Fuera de alcance:**

- Ensamblado en rutinas (CU «Crear Rutina Sistémica»).
- Crear o administrar tipos de circuito ([`CU-A-25`](../admin/CU-A-25-crear-tipo-de-circuito.md) a [`CU-A-27`](../admin/CU-A-27-eliminar-tipo-de-circuito.md), del Admin).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- Existen ejercicios en el catálogo.
- Existe al menos un tipo de circuito activo.

## Postcondiciones

- Existe un nuevo Circuit activo, con su tipo, sus ejercicios y sus series.

## Camino principal (flujo básico)

1. El entrenador ingresa los datos del circuito: el nombre y su tipo, que elige entre los Circuit_Type **activos** (por orden alfabético). Los tipos dados de baja no se ofrecen.
2. El sistema lista los ejercicios del catálogo (<<include>> Obtener Ejercicios).
3. El entrenador arma la lista completa de ejercicios con series y reps.
4. El sistema persiste el Circuit con su tipo y sus ejercicios/series, y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Sin tipos de circuito activos

1. No hay ningún tipo de circuito activo.
2. El sistema informa que hace falta uno para crear un circuito y no permite guardar.
3. Al Admin le ofrece ir a Tipos de circuito para crearlo o reactivarlo ([`CU-A-25`](../admin/CU-A-25-crear-tipo-de-circuito.md), [`CU-A-27`](../admin/CU-A-27-eliminar-tipo-de-circuito.md)); al Entrenador le indica que se lo pida al Admin.

### En el paso 3 — Circuito sin ejercicios

1. La lista de ejercicios está vacía.
2. El sistema impide crear un circuito vacío e informa.

### En el paso 4 — Datos inválidos

1. Datos del circuito o de alguna serie inválidos, o falta el tipo.
2. El sistema marca el error y no persiste.

### En el paso 4 — El tipo está dado de baja o no existe

1. Entre que el entrenador eligió el tipo y guardó, el Admin lo dio de baja; o el pedido trae un tipo que no existe.
2. El sistema informa el error y no crea nada. El entrenador elige otro tipo y vuelve a guardar.

## Reglas

1. **Orden de los errores.** Si el pedido tiene más de un problema, se informa el primero en este orden: los datos del circuito y de sus series, el tipo (que no exista; que esté dado de baja) y los ejercicios (que no existan).
