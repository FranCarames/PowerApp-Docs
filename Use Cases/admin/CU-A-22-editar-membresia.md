# CU-A-22 — Editar Membresía

**Rol:** Admin  
**Paquete:** Administrar Membresías (Tipos)

## Descripción breve

Modifica los datos de un tipo de membresía existente.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los datos del Membership (name, duration, price).

**Fuera de alcance:**

- Modificación retroactiva de pagos ya registrados.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Membership existe.

## Postcondiciones

- El Membership queda actualizado para futuros pagos.

## Camino principal (flujo básico)

1. El admin envía los nuevos datos del tipo de membresía.
2. El sistema valida los datos.
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Membresía inexistente

1. El tipo de membresía no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Datos inválidos o nombre en conflicto.
2. El sistema marca el error y no persiste.
