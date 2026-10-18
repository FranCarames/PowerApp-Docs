# CU-E-20 — Eliminar Rutina a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Quita una rutina asignada a un alumno para un día, eliminando el Routine_Asignation_User correspondiente. Sólo se puede mientras el alumno no la haya entrenado: una asignación con ejercicios ya realizados no se borra, para no destruir su historial.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja física del vínculo Routine_Asignation_User entre la rutina y el alumno, para ese día.

**Fuera de alcance:**

- Baja de la rutina sistémica (CU-E-18).
- Quitar una planificación asignada a un alumno (CU-E-14).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- Existe la asignación individual que se quiere quitar.
- El gimnasio es compartido: cualquier entrenador puede quitar la asignación de cualquier alumno.

## Postcondiciones

- La asignación deja de existir; el alumno deja de ver esa rutina ese día.

## Camino principal (flujo básico)

1. El entrenador consulta las rutinas asignadas al alumno, abre la que quiere quitar y solicita quitarla.
2. El sistema pide confirmación.
3. El sistema elimina el Routine_Asignation_User y confirma, mostrando la asignación que se quitó.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 3 — La asignación ya no existe

1. La asignación fue quitada por otro entrenador entre que se abrió y se confirmó.
2. El sistema informa que no se encontró y no realiza cambios.

### En el paso 3 — El alumno ya entrenó la rutina

1. El alumno ya marcó como realizado al menos un ejercicio de esa asignación.
2. El sistema informa que no se puede quitar porque el alumno ya la entrenó y no realiza cambios: el historial del alumno se conserva.
