# CU-A-25 — Crear Tipo de Circuito

**Rol:** Admin  
**Paquete:** Administrar Tipos de Circuito

## Descripción breve

Da de alta un tipo de circuito con su nombre y una descripción opcional. Nace activo: desde ese momento el Entrenador lo puede elegir al crear o editar un circuito.

## Actores involucrados

- **Principal:** Admin autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Circuit_Type (type, description, active = true).

**Fuera de alcance:**

- Ponérselo a un circuito: lo hace el Entrenador al crearlo o editarlo ([`CU-E-22`](../entrenador/CU-E-22-crear-circuito.md), [`CU-E-23`](../entrenador/CU-E-23-editar-circuito.md)).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Existe un nuevo Circuit_Type activo, que se ofrece al crear un circuito y al cambiarle el tipo a uno existente.

## Camino principal (flujo básico)

1. El admin pide crear un tipo de circuito.
2. El admin ingresa el nombre (obligatorio, hasta 50 caracteres) y, si quiere, una descripción (hasta 100).
3. El sistema valida los datos y que el nombre no esté en uso. El nombre se compara **sin distinguir mayúsculas y sin los espacios de los bordes**, contra **todos** los tipos, activos y dados de baja.
4. El sistema crea el Circuit_Type activo y confirma.

## Caminos alternativos / excepciones

### En el paso 3 — Datos inválidos

1. Falta el nombre (o tiene solo espacios), o el nombre o la descripción superan su largo.
2. El sistema marca el error junto al campo y no crea nada.

### En el paso 3 — Nombre repetido

1. Ya existe un tipo con ese nombre, aunque esté dado de baja o difiera en mayúsculas o en espacios de los bordes («principal », «PRINCIPAL» y «Principal» son el mismo nombre).
2. El sistema informa que ya existe un tipo de circuito con ese nombre y no crea nada.
3. Para volver a usar el nombre de un tipo dado de baja, el admin lo reactiva ([`CU-A-27`](CU-A-27-eliminar-tipo-de-circuito.md)).

## Reglas

1. **El nombre y la descripción se guardan sin los espacios de los bordes.** Una descripción vacía (o con solo espacios) es lo mismo que no tenerla.
2. **Los nombres son únicos en todo momento**, también contra los tipos dados de baja: así reactivar uno nunca deja dos tipos con el mismo nombre. Es el mismo criterio que los nombres de membresía ([`CU-A-21`](CU-A-21-crear-membresia.md)).
