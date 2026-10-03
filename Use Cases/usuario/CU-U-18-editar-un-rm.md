# CU-U-18 — Editar un RM

**Rol:** Usuario  
**Paquete:** Administrar Mis RMs

## Descripción breve

Modifica un RM previamente registrado por el usuario (peso, reps o fecha) sobre el registro User_RM existente.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los campos de un User_RM propio.

**Fuera de alcance:**

- Edición de RMs de otros usuarios.

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El User_RM existe y pertenece al usuario.

## Postcondiciones

- El registro User_RM queda actualizado con los nuevos valores.

## Camino principal (flujo básico)

1. El usuario abre un RM existente y modifica sus valores.
2. El sistema valida los datos.
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — RM inexistente

1. El RM ya no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Valores fuera de rango o no numéricos.
2. El sistema marca el error y no persiste.
