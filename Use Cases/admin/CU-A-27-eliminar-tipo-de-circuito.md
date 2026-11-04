# CU-A-27 — Eliminar Tipo de Circuito (Lógico)

**Rol:** Admin  
**Paquete:** Administrar Tipos de Circuito

## Descripción breve

Da de baja lógica un tipo de circuito (active = false), o reactiva uno dado de baja. Nunca se borra físicamente: los circuitos que ya lo tienen lo conservan, lo siguen mostrando y se siguen editando sin cambiarlo. Un tipo dado de baja deja de ofrecerse para los circuitos nuevos y para cambiarle el tipo a uno existente.

## Actores involucrados

- **Principal:** Admin autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado del Circuit_Type como active = false (baja lógica).
- Reactivación de un Circuit_Type dado de baja (active = true).

**Fuera de alcance:**

- Borrado físico del registro: no existe.
- Cambiarles el tipo a los circuitos que lo usan ([`CU-E-23`](../entrenador/CU-E-23-editar-circuito.md)) o darlos de baja ([`CU-E-24`](../entrenador/CU-E-24-eliminar-circuito-logico.md)).

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Circuit_Type existe.

## Postcondiciones

**Al darlo de baja:**

- El Circuit_Type queda con active = false.
- No se ofrece al crear un circuito ([`CU-E-22`](../entrenador/CU-E-22-crear-circuito.md)) ni al cambiarle el tipo a uno existente ([`CU-E-23`](../entrenador/CU-E-23-editar-circuito.md)).
- Los circuitos que ya lo tienen lo conservan: lo siguen mostrando (en su tarjeta, en su editor, en las rutinas y en lo que ve el alumno) y se pueden seguir editando sin cambiarlo.
- Su nombre sigue ocupado: no se puede crear otro tipo con el mismo nombre ([`CU-A-25`](CU-A-25-crear-tipo-de-circuito.md)).
- Si algún circuito del listado lo tiene, el filtro por tipo del listado lo sigue ofreciendo ([`CU-E-21`](../entrenador/CU-E-21-obtener-circuitos.md)).

**Al reactivarlo:**

- El Circuit_Type queda con active = true y vuelve a ofrecerse para crear circuitos y para cambiarles el tipo.

## Camino principal (flujo básico)

1. El admin pide eliminar un tipo activo.
2. El sistema pide confirmación, avisando que es una baja lógica: deja de ofrecerse para circuitos nuevos, los circuitos que ya lo tienen lo conservan y se puede reactivar cuando se quiera.
3. El admin confirma.
4. El sistema marca el Circuit_Type como active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 3 — Cancela la confirmación

1. El admin cancela.
2. El sistema no realiza cambios.

### En el paso 1 — Reactivar un tipo dado de baja

1. El admin pide reactivar un tipo dado de baja.
2. El sistema lo marca como active = true **sin pedir confirmación** y confirma.

### En el paso 2 — El tipo está en uso

1. Uno o más circuitos tienen ese tipo.
2. La baja se hace igual: es lógica y no rompe nada. Esos circuitos conservan el tipo (ver Postcondiciones).

### En el paso 4 — Tipo inexistente

1. El tipo ya no existe.
2. El sistema informa que no se encontró y no realiza cambios.
