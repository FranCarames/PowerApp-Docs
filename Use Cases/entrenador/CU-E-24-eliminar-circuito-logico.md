# CU-E-24 — Eliminar Circuito (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Circuitos

## Descripción breve

Da de baja lógica un circuito (active = false). Nunca se borra físicamente, para preservar la integridad de las rutinas que lo referencian.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado del Circuit como active = false (borrado lógico).

**Fuera de alcance:**

- Borrado físico del registro.
- Baja de las rutinas que lo usan.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El Circuit existe y está activo.

## Postcondiciones

- El Circuit queda con active = false y deja de ofrecerse para nuevos ensamblados.
- Las rutinas existentes que lo referencian mantienen su integridad.

## Camino principal (flujo básico)

1. El entrenador selecciona un circuito y solicita eliminarlo.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca el Circuit como active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.
