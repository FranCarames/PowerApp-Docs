# CU-A-15 — Eliminar Grupo Muscular

**Rol:** Admin  
**Paquete:** Administrar Grupos Musculares

## Descripción breve

Elimina un grupo muscular, respetando la integridad referencial con los músculos que contiene.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja del Muscle_Group seleccionado.

**Fuera de alcance:**

- Baja de los músculos que pertenecen al grupo.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Muscle_Group existe.

## Postcondiciones

- El Muscle_Group deja de existir, siempre que no contenga músculos.

## Camino principal (flujo básico)

1. El admin solicita eliminar un grupo muscular.
2. El sistema verifica que no tenga músculos asociados.
3. El sistema elimina el Muscle_Group y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Grupo con músculos

1. El grupo aún contiene músculos.
2. El sistema impide la baja e informa la restricción.

### En el paso 1 — Grupo inexistente

1. El grupo no existe.
2. El sistema informa que no hay nada que eliminar.
