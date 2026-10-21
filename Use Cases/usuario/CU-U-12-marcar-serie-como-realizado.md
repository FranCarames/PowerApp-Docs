# CU-U-12 — Marcar serie como realizado

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Registra que el usuario realizó un ejercicio de la rutina de su asignación, y permite deshacerlo. El registro es **por ejercicio y no por serie**: el tildado serie por serie es de la interfaz, y el sistema guarda el ejercicio completo cuando el usuario lo termina. La existencia del registro es el «hecho». Junto con el ejercicio se registra el día en que el usuario lo hizo, que él mismo indica: puede marcar en diferido.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Dejar una nota en el ejercicio

## Alcance

**Cubre:**

- Registrar un ejercicio como realizado en una asignación del usuario, y deshacerlo.
- Indicar el día en que se realizó el ejercicio, y corregirlo.
- Dejar o editar la nota del usuario sobre ese ejercicio en la misma operación (CU «Dejar una nota en el ejercicio»).

**Fuera de alcance:**

- Marcar cada serie por separado: el sistema no guarda el avance serie por serie.
- Edición de reps/peso de la serie.
- El registro de ejecución de una planificación (se resuelve en su propio bloque).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La asignación pertenece al usuario.
- El ejercicio forma parte de la rutina de esa asignación.

## Postcondiciones

- El ejercicio queda registrado como realizado en esa asignación, con el día en que se hizo y su nota si la hay (o se elimina el registro si se desmarca).

## Camino principal (flujo básico)

1. Durante la ejecución, el usuario termina un ejercicio y lo marca como realizado, indicando el día en que lo hizo (la aplicación propone el día actual).
2. El sistema verifica que la asignación sea del usuario y que el ejercicio forme parte de su rutina.
3. El sistema registra el ejercicio como realizado en esa asignación, con el día indicado.
4. El sistema confirma el registro.

## Caminos alternativos / excepciones

### En el paso 1 — Marcar fuera de fecha

1. El usuario marca un ejercicio de una asignación de cualquier día, pasado o futuro.
2. El sistema lo acepta: no hay una ventana de fechas.

### En el paso 1 — Marcar en diferido

1. El usuario marca un ejercicio que hizo otro día e indica ese día.
2. El sistema registra el día indicado, no el del momento en que marca.

### En el paso 1 — Corregir el día

1. El usuario vuelve a marcar un ejercicio ya realizado indicando otro día.
2. El sistema corrige el día en el mismo registro, sin duplicarlo.

### En el paso 1 — Desmarcar el ejercicio

1. El usuario desmarca un ejercicio ya realizado.
2. El sistema elimina el registro y, con él, la nota que el usuario hubiera dejado.
3. Si el ejercicio no estaba marcado, el sistema responde igual: deshacer es idempotente.
4. El usuario puede desmarcar también un ejercicio que el entrenador sacó de la rutina después de que lo realizó.

### En el paso 1 — Dejar o editar la nota

1. El usuario marca el ejercicio indicando una nota, o vuelve a marcar uno ya realizado con una nota nueva.
2. El sistema guarda la nota en el mismo registro (CU «Dejar una nota en el ejercicio»).

### En el paso 2 — La asignación no existe

1. El sistema informa que no se encontró la asignación.

### En el paso 2 — Sin el día

1. El usuario marca un ejercicio que todavía no estaba realizado sin indicar el día.
2. El sistema informa el error y no registra nada.

### En el paso 2 — Asignación de otro alumno

1. La asignación pertenece a otro usuario.
2. El sistema deniega el acceso.

### En el paso 2 — El ejercicio no pertenece a la rutina

1. El ejercicio no forma parte de la rutina de esa asignación.
2. El sistema informa el error y no registra nada.

### En el paso 2 — El entrenador sacó el ejercicio de la rutina

1. El ejercicio todavía no estaba marcado y el entrenador lo dio de baja, o sacó de la rutina el circuito que lo contiene.
2. El sistema informa que ya no se puede marcar y no registra nada.
3. Si el ejercicio ya estaba marcado, el sistema lo acepta igual y no cambia el registro: sólo pueden editarse su nota y el día en que se hizo.

### En el paso 3 — Marcado repetido

1. El usuario marca un ejercicio que ya estaba realizado (también si lo marcó desde dos lugares a la vez).
2. El sistema no duplica el registro y responde igual: marcar es idempotente.

### En el paso 3 — Error de persistencia

1. Falla al guardar.
2. El sistema revierte la marca visual e informa el error.
