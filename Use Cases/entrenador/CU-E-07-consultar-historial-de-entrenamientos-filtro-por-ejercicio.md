# CU-E-07 — Consultar historial de entrenamientos — Filtro por ejercicio

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Variante de «Consultar historial de entrenamientos de alumno» que acota el historial a un ejercicio puntual del catálogo: sólo las sesiones donde el alumno lo hizo y, en cada una, únicamente ese ejercicio, con su prescripción, la fecha y la nota del alumno.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Filtrado del historial de entrenamientos del alumno por un ejercicio específico del catálogo.

**Fuera de alcance:**

- Otros filtros del historial.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe.
- El gimnasio es compartido: cualquier entrenador puede consultar el historial de cualquier alumno.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador selecciona un ejercicio para filtrar el historial.
2. El sistema recupera las sesiones del alumno donde realizó ese ejercicio y, de cada una, únicamente ese ejercicio.
3. El sistema presenta el historial filtrado, de la sesión más reciente a la más antigua, con la fecha, la prescripción (series, repeticiones, peso) y la nota del alumno.

## Caminos alternativos / excepciones

### En el paso 2 — El alumno no existe

1. El sistema informa que no se encontró el alumno.

### En el paso 2 — Sin registros para el ejercicio

1. El alumno no entrenó ese ejercicio.
2. El sistema muestra un estado vacío.

### En el paso 2 — El ejercicio aparece más de una vez en una sesión

1. La rutina incluye el mismo ejercicio del catálogo en más de un lugar y el alumno lo realizó en varios.
2. El sistema los muestra todos dentro de esa sesión, en el orden en que el alumno los marcó.
