# CU-A-05 — Editar Ejercicio

**Rol:** Admin  
**Paquete:** Administrar Ejercicios

## Descripción breve

Modifica los datos de un ejercicio existente del catálogo.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los datos descriptivos del Exercise.

**Fuera de alcance:**

- Gestión de músculos asociados (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Exercise existe.

## Postcondiciones

- El Exercise queda actualizado.

## Camino principal (flujo básico)

1. El admin envía los nuevos datos del ejercicio.
2. El sistema valida los datos.
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Ejercicio inexistente

1. El ejercicio no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Datos inválidos o nombre en conflicto.
2. El sistema marca el error y no persiste.
