# CU-U-13 — Dejar una nota en el ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Permite al usuario registrar una nota personal (user_note) sobre un ejercicio de su rutina.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta/edición del campo user_note del Routine_Exercise correspondiente.

**Fuera de alcance:**

- La nota del coach (coach_note), que es de solo lectura para el usuario.

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El ejercicio pertenece a una rutina asignada vigente del usuario.

## Postcondiciones

- El Routine_Exercise queda con el user_note actualizado.

## Camino principal (flujo básico)

1. Desde el detalle del ejercicio, el usuario escribe o edita su nota.
2. El sistema persiste el texto en user_note.
3. El sistema confirma el guardado.

## Caminos alternativos / excepciones

### En el paso 1 — Nota vacía

1. El usuario borra el contenido y guarda.
2. El sistema limpia user_note.
