# CU-A-23 — Eliminar Membresía

**Rol:** Admin  
**Paquete:** Administrar Membresías (Tipos)

## Descripción breve

Elimina un tipo de membresía, respetando la integridad referencial con los pagos que lo referencian.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja del Membership seleccionado.

**Fuera de alcance:**

- Baja de los Membership_Payment ya registrados.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Membership existe.

## Postcondiciones

- El Membership deja de estar disponible, siempre que no esté en uso.

## Camino principal (flujo básico)

1. El admin solicita eliminar un tipo de membresía.
2. El sistema verifica que no esté referenciado por pagos.
3. El sistema elimina el Membership y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Membresía en uso

1. El tipo está referenciado por pagos existentes.
2. El sistema impide la baja (o la hace lógica) e informa la restricción.

### En el paso 1 — Membresía inexistente

1. El tipo no existe.
2. El sistema informa que no hay nada que eliminar.
