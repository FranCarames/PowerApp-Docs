# CU-E-06 — Consultar historial de entrenamientos de alumno

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Muestra el historial de entrenamientos de un alumno: las sesiones en las que marcó al menos un ejercicio como realizado, de la más reciente a la más antigua, con los ejercicios que hizo y el día en que hizo cada uno, la prescripción del entrenador, la fecha de la sesión y la nota que el alumno dejó. El sistema no registra la carga real que usó el alumno: lo que muestra de cada serie es lo prescrito.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de las sesiones del alumno con al menos un ejercicio realizado, y de esos ejercicios con sus series prescritas y la nota del alumno.

**Fuera de alcance:**

- Edición de la ejecución del alumno.
- Registrar o mostrar la carga real (peso y repeticiones efectivamente realizados).
- Filtrar por ejercicio (CU «Consultar historial de entrenamientos — Filtro por ejercicio»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe.
- El gimnasio es compartido: cualquier entrenador puede consultar el historial de cualquier alumno.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre el historial de entrenamientos del alumno.
2. El sistema recupera las sesiones del alumno con al menos un ejercicio realizado y, de cada una, los ejercicios realizados con el día en que los hizo, su prescripción y la nota del alumno.
3. El sistema presenta el historial ordenado de la sesión más reciente a la más antigua y, dentro de cada sesión, los ejercicios por el día en que se hicieron.

## Caminos alternativos / excepciones

### En el paso 2 — El alumno no existe

1. El sistema informa que no se encontró el alumno.

### En el paso 2 — Sin historial

1. El alumno no registra entrenamientos.
2. El sistema muestra un estado vacío.

### En el paso 2 — Lo dado de baja que el alumno hizo

1. El entrenador dio de baja la rutina, sacó un circuito o sacó un ejercicio después de que el alumno lo hizo.
2. El sistema lo muestra igual: si el alumno lo realizó, forma parte de su historial.

### En el paso 3 — Dos sesiones el mismo día

1. El alumno tuvo más de una rutina asignada el mismo día.
2. El sistema las presenta como sesiones separadas, ordenadas por el nombre de la rutina.
