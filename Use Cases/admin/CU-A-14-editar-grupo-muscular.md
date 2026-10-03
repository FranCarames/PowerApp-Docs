# CU-A-14 — Editar Grupo Muscular

**Rol:** Admin  
**Paquete:** Administrar Grupos Musculares

## Descripción breve

Modifica los datos de un grupo muscular existente.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los datos del Muscle_Group.

**Fuera de alcance:**

- Reasignación de músculos al grupo.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Muscle_Group existe.

## Postcondiciones

- El Muscle_Group queda actualizado.

## Camino principal (flujo básico)

1. El admin envía los nuevos datos del grupo.
2. El sistema valida los datos.
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Grupo inexistente

1. El grupo no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Datos inválidos o nombre en conflicto.
2. El sistema marca el error y no persiste.
