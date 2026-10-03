# CU-U-12 — Marcar serie como realizado

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Registra el cumplimiento de una serie individual de un ejercicio, a nivel de serie y no de ejercicio completo.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Actualización del flag finished de un Exercise_Set puntual.

**Fuera de alcance:**

- Marcar el ejercicio entero de una sola vez.
- Edición de reps/peso de la serie.

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La serie pertenece a una rutina asignada vigente del usuario.

## Postcondiciones

- El Exercise_Set correspondiente queda con finished = true (o se revierte si se desmarca).

## Camino principal (flujo básico)

1. Durante la ejecución, el usuario marca una serie como realizada.
2. El sistema identifica el Exercise_Set y actualiza su flag finished a true.
3. El sistema confirma visualmente el cambio.

## Caminos alternativos / excepciones

### En el paso 1 — Desmarcar serie

1. El usuario desmarca una serie ya completada.
2. El sistema vuelve finished a false.

### En el paso 2 — Error de persistencia

1. Falla al guardar.
2. El sistema revierte la marca visual e informa el error.
