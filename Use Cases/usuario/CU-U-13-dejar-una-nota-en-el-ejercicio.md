# CU-U-13 — Dejar una nota en el ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento  
**Incluido por:** [`CU-U-12`](CU-U-12-marcar-serie-como-realizado.md) Marcar serie como realizado

## Descripción breve

Permite al usuario dejar o editar una nota personal (user_note) sobre un ejercicio que realizó en una asignación. La nota vive en el mismo registro que el «hecho» y se guarda con la misma operación que marcar el ejercicio, así que sólo se anota un ejercicio realizado.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta, edición y borrado del user_note (hasta 100 caracteres) del registro de un ejercicio realizado.

**Fuera de alcance:**

- La nota del coach (coach_note), que es de solo lectura para el usuario.
- Anotar un ejercicio que no se realizó.

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La asignación pertenece al usuario.
- El ejercicio está realizado en esa asignación, o se marca en la misma operación.

## Postcondiciones

- El registro del ejercicio queda con el user_note actualizado.

## Camino principal (flujo básico)

1. Desde el detalle del ejercicio, el usuario escribe o edita su nota.
2. El sistema persiste el texto en el registro del ejercicio realizado.
3. El sistema confirma el guardado.

## Caminos alternativos / excepciones

### En el paso 1 — Nota vacía

1. El usuario borra el contenido y guarda.
2. El sistema limpia user_note, y el ejercicio sigue marcado como realizado.

### En el paso 1 — Ejercicio todavía sin marcar

1. El usuario escribe una nota en un ejercicio que aún no marcó.
2. El sistema marca el ejercicio y guarda la nota en la misma operación.

### En el paso 1 — Sin cambios en la nota

1. El usuario guarda la misma nota que ya tenía.
2. El sistema no cambia nada y responde igual.

### En el paso 1 — Nota demasiado larga

1. El texto supera los 100 caracteres.
2. El sistema informa el error y no guarda.

### En el paso 1 — El entrenador sacó el ejercicio de la rutina

1. El ejercicio ya estaba realizado y el entrenador lo sacó de la rutina después.
2. El sistema permite editar la nota igual: forma parte de lo que el usuario hizo.

### En el paso 2 — Desmarcar el ejercicio

1. El usuario desmarca el ejercicio (CU «Marcar serie como realizado»).
2. El sistema elimina el registro y la nota con él.
