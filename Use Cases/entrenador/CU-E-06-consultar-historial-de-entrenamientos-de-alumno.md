# CU-E-06 — Consultar historial de entrenamientos de alumno

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Muestra el historial de entrenamientos de un alumno: las sesiones en las que marcó al menos un ejercicio como realizado, de la más reciente a la más antigua y agrupadas por semana, con los ejercicios que hizo y el día en que hizo cada uno, la prescripción del entrenador, la fecha de la sesión y la nota que el alumno dejó. Lo acompañan un resumen (cuántas sesiones, cuándo fue la última y cuántas lleva la semana actual) y las sesiones por semana de un mes. Una vista de calendario muestra los días del mes en que el alumno hizo ejercicios, con su intensidad, y lo que hizo el día que se elija. Una sesión es una rutina asignada para un día o una rutina de su planificación (la de una semana del plan); las dos se muestran juntas, en una sola lista, y cada sesión indica de cuál de las dos es. El sistema no registra la carga real que usó el alumno: lo que muestra de cada serie es lo prescrito.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de las sesiones del alumno con al menos un ejercicio realizado, ya sean de una asignación individual o de su planificación, y de esos ejercicios con sus series prescritas y la nota del alumno.
- El resumen del historial, las sesiones por semana de un mes y el calendario de un mes, que salen de esas mismas sesiones.

**Fuera de alcance:**

- Edición de la ejecución del alumno.
- Registrar o mostrar la carga real (peso y repeticiones efectivamente realizados).
- Filtrar por ejercicio y el detalle de un ejercicio (CU-E-07).

## Definiciones

1. **Fecha de una sesión.** En una asignación individual, el día de la asignación. En una sesión del plan, el día más viejo en que el alumno hizo alguno de sus ejercicios (camino alternativo «La fecha de una sesión del plan»).
2. **Semana completa.** De lunes a domingo. Una sesión cuenta en la semana de su fecha. Las semanas de un mes son todas las semanas completas que tienen al menos un día del mes: entre cuatro y seis. Una semana con días de dos meses es la misma en los dos y cuenta todas sus sesiones.
3. **Intensidad de un día.** La cantidad de ejercicios que el alumno hizo ese día (por el día en que hizo cada uno), sumando todas sus sesiones. Tiene cuatro niveles: ninguno, 1 o 2, 3 o 4, y 5 o más.
4. **Racha actual.** La cantidad de semanas completas seguidas con al menos una sesión, contando hacia atrás desde la semana actual. Si la semana actual todavía no tiene ninguna, se cuenta desde la anterior: una semana en curso no corta la racha. Se mide en semanas.
5. **Meses con historial.** Desde el mes del día más viejo del historial (la fecha de una sesión o el día de un ejercicio hecho, el que sea anterior) hasta el mes actual.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe.
- El gimnasio es compartido: cualquier entrenador puede consultar el historial de cualquier alumno.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre el historial de entrenamientos del alumno desde su ficha.
2. El sistema recupera las sesiones del alumno con al menos un ejercicio realizado y, de cada una, los ejercicios realizados con el día en que los hizo, su prescripción y la nota del alumno.
3. El sistema presenta el historial ordenado de la sesión más reciente a la más antigua, agrupado por semana completa y, dentro de cada sesión, los ejercicios por el día en que se hicieron. Si el alumno hizo un ejercicio otro día que la fecha de la sesión, lo indica.
4. El sistema presenta, junto al historial, un resumen (el total de sesiones, la fecha de la última y las de la semana actual) y las sesiones de cada semana completa del mes actual, separando las de la planificación de las individuales.
5. El entrenador cambia de mes: el sistema presenta las sesiones por semana de ese mes. Puede moverse entre los meses con historial, del más viejo al actual.
6. El entrenador elige una semana del mes: el sistema le muestra esa semana del historial.
7. El entrenador pasa a la vista de calendario: el sistema presenta, del mismo mes, cada día con su intensidad y un resumen del mes (los días entrenados, las sesiones y la racha actual). Queda elegido un día: hoy, en el mes actual; en otro mes, el último día en que el alumno hizo ejercicios.
8. El sistema presenta las sesiones del día elegido, cada una sólo con los ejercicios que el alumno hizo ese día.
9. El entrenador elige otro día, o cambia de mes: el sistema presenta lo de ese día o de ese mes, como en los pasos 7 y 8.

## Caminos alternativos / excepciones

### En el paso 2 — El alumno no existe

1. El sistema informa que no se encontró el alumno.

### En el paso 2 — Sin historial

1. El alumno no registra entrenamientos.
2. El sistema muestra un estado vacío, sin resumen, sesiones por semana ni calendario.

### En el paso 2 — Lo dado de baja que el alumno hizo

1. El entrenador dio de baja la rutina, sacó un circuito o sacó un ejercicio después de que el alumno lo hizo; o quitó la rutina del plan o la planificación al alumno.
2. El sistema lo muestra igual: si el alumno lo realizó, forma parte de su historial.

### En el paso 2 — Cada rutina del plan es una sesión

1. El alumno hizo ejercicios de más de una rutina de su planificación, o de la misma rutina del plan en dos asignaciones de la misma plantilla.
2. El sistema presenta cada rutina del plan de cada asignación como una sesión separada.

### En el paso 3 — Dos sesiones el mismo día

1. El alumno tuvo más de una rutina asignada el mismo día.
2. El sistema las presenta como sesiones separadas, ordenadas por el nombre de la rutina y, si el nombre coincide, por el orden en que se dieron de alta.

### En el paso 3 — La fecha de una sesión del plan

1. La rutina de una planificación no tiene un día propio: es de una semana del plan.
2. El sistema toma como fecha de la sesión el día más viejo en que el alumno hizo alguno de los ejercicios que muestra, y la ubica con ese día entre las demás sesiones y en la semana de ese día.

### En el paso 3 — Una semana sin sesiones

1. Entre la sesión más reciente y la más antigua hay una semana en la que el alumno no entrenó.
2. El sistema la presenta igual, indicando que no tuvo entrenamientos.

### En los pasos 4 y 5 — Una semana que cruza de mes

1. Una semana completa tiene días de dos meses.
2. El sistema la presenta en los dos meses, entera y con todas sus sesiones, también las de los días del otro mes.

### En los pasos 5 y 9 — Un mes sin entrenamientos

1. En el mes elegido el alumno no tiene ninguna sesión ni ningún ejercicio hecho.
2. El sistema presenta sus semanas sin sesiones y, en el calendario, ningún día con intensidad.
3. Si no es el mes actual, no queda ningún día elegido y el sistema informa que en ese mes no hay entrenamientos. En el mes actual queda elegido hoy, sin entrenamientos.

### En los pasos 8 y 9 — Una sesión que empezó otro día, vista desde el calendario

1. El alumno hizo ejercicios de una misma sesión en días distintos, y el día elegido no es la fecha de la sesión.
2. El sistema presenta la sesión en ese día sólo con los ejercicios que hizo ese día, e indica la fecha en que empezó.
3. En el día de la fecha de la sesión, la presenta con los ejercicios de ese día.

### En los pasos 8 y 9 — Un día sin entrenamientos

1. El alumno no hizo ningún ejercicio el día elegido.
2. El sistema informa que ese día no tiene entrenamientos.
