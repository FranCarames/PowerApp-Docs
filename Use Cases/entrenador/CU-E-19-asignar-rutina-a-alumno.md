# CU-E-19 — Asignar Rutina a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Vía individual de asignación (alumnos nuevos, primeras clases): asigna una rutina a un alumno **para un día**, sin pasar por una planificación, creando un Routine_Asignation_User. Cada asignación es una sesión con su propio registro de ejecución, así que la misma rutina puede asignarse al mismo alumno en días distintos.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Routine_Asignation_User que liga una rutina a un alumno para un día.

**Fuera de alcance:**

- Asignación vía planificación (CU-E-13).
- Asignar la rutina a varios días de una vez: son tantas asignaciones como días.
- Listar las rutinas asignadas a un alumno.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La rutina existe y está activa.
- El alumno existe y su cuenta está abierta.
- El gimnasio es compartido: cualquier entrenador puede asignarle una rutina a cualquier alumno.

## Postcondiciones

- Existe un Routine_Asignation_User con la rutina, el alumno y el día elegidos, sin hora.
- El alumno ve la rutina ese día.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno, una rutina y el día en que el alumno la hace.
2. El sistema verifica que la rutina esté activa y que el destinatario sea un alumno con la cuenta abierta.
3. El sistema crea el Routine_Asignation_User.
4. El sistema confirma la asignación con su día y el nombre de la rutina.

## Caminos alternativos / excepciones

### En el paso 1 — El día es pasado o futuro

1. El entrenador elige un día que ya pasó o que todavía no llegó.
2. El sistema lo acepta: la fecha la define siempre el entrenador y el sistema no calcula «hoy».

### En el paso 1 — El alumno ya tiene otra rutina ese día

1. El alumno tiene asignada una rutina **distinta** ese día.
2. El sistema crea la asignación igual: lo que no se admite es repetir la misma rutina el mismo día.

### En el paso 2 — La rutina o el alumno no existen

1. El sistema informa cuál de los dos no se encontró y no crea la asignación.

### En el paso 2 — La rutina está dada de baja

1. La rutina existe pero está inactiva.
2. El sistema informa cuál es y no crea la asignación. Las asignaciones que ya tenía siguen vigentes.

### En el paso 2 — El destinatario no es un alumno o su cuenta está cerrada

1. El usuario elegido es un entrenador o un administrador, o es un alumno con la cuenta cerrada.
2. El sistema informa el motivo y no crea la asignación.

### En el paso 3 — Rutina ya asignada ese día

1. El alumno ya tiene esa rutina asignada ese mismo día (también si otro entrenador la asignó en ese instante).
2. El sistema informa y no duplica la asignación.
