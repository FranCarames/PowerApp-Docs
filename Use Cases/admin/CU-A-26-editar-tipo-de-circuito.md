# CU-A-26 — Editar Tipo de Circuito

**Rol:** Admin  
**Paquete:** Administrar Tipos de Circuito

## Descripción breve

Cambia el nombre o la descripción de un tipo de circuito existente, activo o dado de baja. Como los circuitos referencian al tipo, el cambio se ve en todos los circuitos que lo usan.

## Actores involucrados

- **Principal:** Admin autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición del type y la description de un Circuit_Type.
- Propagación implícita del nombre nuevo a todos los circuitos que lo tienen (activos y dados de baja).

**Fuera de alcance:**

- Darlo de baja o reactivarlo ([`CU-A-27`](CU-A-27-eliminar-tipo-de-circuito.md)).
- Cambiarle el tipo a un circuito ([`CU-E-23`](../entrenador/CU-E-23-editar-circuito.md)).

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Circuit_Type existe (activo o dado de baja).

## Postcondiciones

- El Circuit_Type queda con el nombre y la descripción nuevos.
- Su estado no cambia: si estaba dado de baja, sigue dado de baja.
- Los circuitos que lo usan lo muestran con el nombre nuevo.

## Camino principal (flujo básico)

1. El admin elige un tipo para editar.
2. El sistema muestra su nombre y su descripción, y avisa que el cambio se ve en todos los circuitos que lo usan.
3. El admin cambia el nombre, la descripción o los dos. Dejar la descripción vacía la borra.
4. El sistema valida los datos con las reglas del alta ([`CU-A-25`](CU-A-25-crear-tipo-de-circuito.md)). El nombre se controla **sólo si cambia**, sin contar mayúsculas ni los espacios de los bordes: cambiar «principal» por «Principal» no es un conflicto.
5. El sistema guarda los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 o en el paso 5 — Tipo inexistente

1. El tipo ya no existe.
2. El sistema informa que no se encontró y no guarda nada.

### En el paso 4 — Datos inválidos

1. Falta el nombre (o tiene solo espacios), o el nombre o la descripción superan su largo.
2. El sistema marca el error junto al campo y no guarda.

### En el paso 4 — Nombre en conflicto

1. Otro tipo, activo o dado de baja, ya tiene ese nombre (sin distinguir mayúsculas ni espacios de los bordes).
2. El sistema informa que ya existe un tipo de circuito con ese nombre y no guarda.

### En el paso 3 — Cancela

1. El admin cancela la edición.
2. El sistema no realiza cambios.
