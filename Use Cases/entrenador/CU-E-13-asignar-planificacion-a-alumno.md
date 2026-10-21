# CU-E-13 — Asignar Planificación a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Vía principal de asignación (~90% de los casos): asigna una planificación entera a un alumno, desde un día de inicio hasta un día de fin, creando una User_Planification. Las rutinas del plan, sus semanas y su cabecera (nombre, descripción, tipo, duración) se leen siempre de la planificación: la asignación guarda sólo lo propio (el alumno, el entrenador que la asignó, las fechas y una nota).

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de una User_Planification con el día de inicio, el día de fin y una nota opcional del entrenador (coach_note).
- El cálculo del fin a partir de la duración de la planificación, cuando el entrenador no lo indica.
- El aviso de solapamiento con otra planificación vigente del alumno, y la confirmación para asignarla igual.

**Fuera de alcance:**

- Asignación de una rutina puntual sin planificación (CU-E-19).
- Quitar o reincorporar la planificación del alumno (CU-E-14).
- Editar una asignación: para cambiar sus fechas, el entrenador la quita y la asigna de nuevo.
- Reemplazar un plan por otro en una sola operación: el entrenador quita el viejo (CU-E-14) y asigna el nuevo.

## Precondiciones

- Existe una sesión activa con rol Entrenador, registrado como entrenador activo.
- La planificación existe, está activa y tiene al menos una rutina vigente.
- El alumno existe y su cuenta está abierta.
- El gimnasio es compartido: cualquier entrenador puede asignarle una planificación a cualquier alumno.

## Postcondiciones

- Existe una User_Planification con el alumno, la planificación, el entrenador que la asignó, el inicio, el fin y la nota.
- El alumno ve las rutinas del plan en su home, semana por semana. La semana 1 es la de lunes a domingo que contiene el inicio.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno y una planificación.
2. Define el día de inicio y, opcionalmente, el día de fin y una nota (coach_note).
3. El sistema verifica que el entrenador esté registrado como entrenador, que la planificación esté activa y tenga rutinas vigentes, y que el destinatario sea un alumno con la cuenta abierta.
4. Si el entrenador no indicó el fin, el sistema lo calcula: el domingo de la última semana de la planificación, contando como semana 1 la de lunes a domingo que contiene el inicio.
5. El sistema verifica que el alumno no tenga otra planificación vigente en esas fechas.
6. El sistema crea la User_Planification.
7. El sistema confirma la asignación con sus fechas y el nombre de la planificación.

## Caminos alternativos / excepciones

### En el paso 2 — El inicio es pasado o futuro

1. El entrenador elige un inicio que ya pasó o que todavía no llegó.
2. El sistema lo acepta: la fecha la define siempre el entrenador y el sistema no calcula «hoy».

### En el paso 2 — El fin es anterior al inicio

1. El sistema informa el error y no crea la asignación.

### En el paso 2 — El fin no coincide con la duración

1. El entrenador indica un fin más corto o más largo que la duración de la planificación, o uno que no cae en domingo.
2. El sistema lo acepta tal cual: si es más corto, la última semana se corta ahí; si es más largo, las semanas sin rutinas se ven vacías.

### En el paso 3 — El entrenador no está registrado como entrenador

1. El usuario tiene el rol de entrenador, pero no figura como entrenador activo.
2. El sistema informa el error y no crea la asignación.

### En el paso 3 — La planificación o el alumno no existen

1. El sistema informa cuál de los dos no se encontró y no crea la asignación.

### En el paso 3 — La planificación está dada de baja o no tiene rutinas

1. La planificación existe pero está inactiva, o no tiene ninguna rutina vigente.
2. El sistema informa el motivo y no crea la asignación. Las asignaciones que ya tenía siguen vigentes.

### En el paso 3 — El destinatario no es un alumno o su cuenta está cerrada

1. El usuario elegido es un entrenador o un administrador, o es un alumno con la cuenta cerrada.
2. El sistema informa el motivo y no crea la asignación.

### En el paso 4 — La planificación no tiene duración fija

1. La planificación tiene duración 0 y el entrenador no indicó el fin.
2. El sistema le pide que indique el fin y no crea la asignación.

### En el paso 5 — Solapamiento con un plan vigente

1. El alumno ya tiene una planificación vigente cuyas fechas se pisan con las nuevas, contando los dos extremos.
2. El sistema advierte el solapamiento, muestra cuáles se pisan y no crea la asignación.
3. El entrenador puede ajustar las fechas, quitar la planificación vieja (CU-E-14) o confirmar.
4. Si confirma, el sistema crea la asignación y las dos conviven: el alumno ve las dos en su home.
5. Si dos entrenadores le asignan planificaciones al mismo alumno en el mismo instante, el aviso puede no salir y las dos quedan conviviendo, igual que si se hubiera confirmado.

### En el paso 6 — Error al guardar

1. Falla la creación de la User_Planification.
2. El sistema informa el error. Como es una sola operación, no queda ninguna asignación a medias.
