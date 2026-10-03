# CU-A-10 — Eliminar Músculo

**Rol:** Admin  
**Paquete:** Administrar Músculos

## Descripción breve

Elimina un músculo del catálogo, respetando la integridad referencial con los ejercicios.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja del Muscle seleccionado.

**Fuera de alcance:**

- Baja de los ejercicios asociados.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Muscle existe.

## Postcondiciones

- El Muscle deja de existir, siempre que no esté en uso.

## Camino principal (flujo básico)

1. El admin solicita eliminar un músculo.
2. El sistema verifica que no esté asociado a ejercicios (Exercised_Muscle).
3. El sistema elimina el Muscle y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Músculo en uso

1. El músculo está asociado a ejercicios.
2. El sistema impide la baja e informa la restricción.

### En el paso 1 — Músculo inexistente

1. El músculo no existe.
2. El sistema informa que no hay nada que eliminar.
