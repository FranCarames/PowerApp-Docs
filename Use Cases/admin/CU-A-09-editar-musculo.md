# CU-A-09 — Editar Músculo

**Rol:** Admin  
**Paquete:** Administrar Músculos

## Descripción breve

Modifica los datos de un músculo, incluyendo opcionalmente su grupo muscular.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los datos del Muscle y de su vínculo a Muscle_Group.

**Fuera de alcance:**

- Edición de los ejercicios asociados.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Muscle existe.

## Postcondiciones

- El Muscle queda actualizado.

## Camino principal (flujo básico)

1. El admin envía los nuevos datos del músculo.
2. El sistema valida los datos (y la existencia del grupo si cambia).
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Músculo inexistente

1. El músculo no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Datos inválidos o grupo inexistente.
2. El sistema marca el error y no persiste.
