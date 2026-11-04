# CU-E-07 — Consultar historial de entrenamientos — Filtro por ejercicio

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Variante de «Consultar historial de entrenamientos de alumno» que acota el historial a un ejercicio puntual del catálogo y lo presenta como el detalle de ese ejercicio: cuántas veces lo hizo el alumno, cuándo fue la última y su RM actual; la progresión de los RMs que registró para ese ejercicio (los mismos que consulta «Obtener RMs del alumno»); cuántas veces lo hizo en cada semana de un mes; las notas que dejó; y las sesiones donde lo hizo (de una asignación individual o de su planificación), cada una con únicamente ese ejercicio, su prescripción, el día en que lo hizo y la nota del alumno.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Filtrado del historial de entrenamientos del alumno por un ejercicio específico del catálogo, presentado como el detalle de ese ejercicio.
- Lectura de los RMs del alumno para ese ejercicio (User_RM, como en CU-E-04), para su progresión y su RM actual.

**Fuera de alcance:**

- Otros filtros del historial.
- Registrar o mostrar la carga real: la progresión sale de los RMs, nunca de la prescripción.
- Alta y edición de RMs (las gestiona el propio alumno).

## Definiciones

1. **Una vez.** Una sesión en la que el alumno hizo el ejercicio, aunque lo haya hecho más de una vez en ella. Su fecha es el día en que lo hizo (el más viejo, si lo hizo más de una vez).
2. **RM actual.** El último RM que el alumno registró para el ejercicio: el de fecha más reciente.
3. **Progresión del RM.** Los RMs del alumno para el ejercicio, ordenados por fecha, cada uno con su peso y, si es de más de una repetición, sus repeticiones. La diferencia es el peso del último menos el del primero.
4. **Veces por semana.** Las semanas completas del mes, como en CU-E-06; cada vez cuenta en la semana de su fecha.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe.
- El gimnasio es compartido: cualquier entrenador puede consultar el historial de cualquier alumno.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador selecciona un ejercicio para filtrar el historial: uno de los que el alumno hizo más veces, cualquiera del catálogo con un buscador, o uno de los ejercicios de una sesión.
2. El sistema recupera las sesiones del alumno donde realizó ese ejercicio y, de cada una, únicamente ese ejercicio; y los RMs del alumno para ese ejercicio.
3. El sistema presenta el detalle del ejercicio: cuántas veces lo hizo, cuándo fue la última y su RM actual; la progresión de sus RMs, con el valor y la fecha de cada uno y la diferencia entre el primero y el último; cuántas veces lo hizo en cada semana completa del mes actual; las notas que dejó en ese ejercicio; y el historial filtrado, de la sesión más reciente a la más antigua, con el día en que hizo el ejercicio, la prescripción (series, repeticiones, peso) y la nota del alumno.
4. El entrenador cambia de mes: el sistema presenta las veces por semana de ese mes, entre los meses con historial de CU-E-06.
5. El entrenador vuelve al historial completo (CU-E-06).

## Caminos alternativos / excepciones

### En el paso 2 — El alumno no existe

1. El sistema informa que no se encontró el alumno.

### En el paso 2 — Sin registros para el ejercicio

1. El alumno no entrenó ese ejercicio.
2. El sistema muestra un estado vacío en lugar de las veces por semana, las notas y las sesiones.
3. La progresión de los RMs se presenta igual.

### En el paso 3 — Sin RMs

1. El alumno no registró ningún RM de ese ejercicio.
2. El sistema informa que no tiene RMs del ejercicio y deja el RM actual sin valor. El resto del detalle no cambia.

### En el paso 3 — Un solo RM

1. El alumno registró un único RM de ese ejercicio.
2. El sistema presenta ese RM, con su valor y su fecha, en lugar de la progresión, y sin diferencia.

### En el paso 3 — La fecha de una sesión del plan

1. La sesión es una rutina de la planificación del alumno, que no tiene un día propio.
2. El sistema toma como fecha de la sesión el día en que el alumno hizo ese ejercicio (el más viejo, si lo hizo más de una vez en la sesión).

### En el paso 2 — El ejercicio aparece más de una vez en una sesión

1. La rutina incluye el mismo ejercicio del catálogo en más de un lugar y el alumno lo realizó en varios.
2. El sistema los muestra todos dentro de esa sesión, por el día en que los hizo y, dentro del mismo día, en el orden en que los marcó, cada uno con el día en que lo hizo.
3. La sesión cuenta como una sola vez.
