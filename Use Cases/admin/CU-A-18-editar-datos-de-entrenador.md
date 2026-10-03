# CU-A-18 — Editar datos de entrenador

**Rol:** Admin  
**Paquete:** Administrar Entrenadores

## Descripción breve

Modifica los datos profesionales de un entrenador (registro Coach).

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los campos del Coach (coach_email, cuil, active).

**Fuera de alcance:**

- Edición de los datos personales del User (los gestiona el propio usuario).

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Coach existe.

## Postcondiciones

- El Coach queda actualizado.

## Camino principal (flujo básico)

1. El admin envía los nuevos datos del entrenador.
2. El sistema valida los datos.
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Entrenador inexistente

1. El entrenador no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Datos profesionales inválidos.
2. El sistema marca el error y no persiste.
