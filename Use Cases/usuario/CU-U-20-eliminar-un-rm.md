# CU-U-20 — Eliminar un RM

**Rol:** Usuario  
**Paquete:** Administrar Mis RMs

## Descripción breve

Elimina de forma definitiva un RM registrado por el usuario (registro User_RM).

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja física del User_RM propio seleccionado.

**Fuera de alcance:**

- Borrado lógico (no aplica a RMs).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El User_RM existe y pertenece al usuario.

## Postcondiciones

- El registro User_RM deja de existir.

## Camino principal (flujo básico)

1. El usuario selecciona un RM y solicita eliminarlo.
2. El sistema pide confirmación.
3. El sistema elimina el registro User_RM y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El usuario cancela.
2. El sistema no elimina nada.

### En el paso 3 — RM inexistente

1. El RM ya fue eliminado.
2. El sistema informa que no existe.
