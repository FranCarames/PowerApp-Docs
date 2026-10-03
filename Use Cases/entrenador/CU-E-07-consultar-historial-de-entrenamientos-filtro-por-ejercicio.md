# CU-E-07 — Consultar historial de entrenamientos — Filtro por ejercicio

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Variante de «Consultar historial de entrenamientos de alumno» que acota el historial a un ejercicio puntual.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Filtrado del historial de entrenamientos del alumno por un ejercicio específico.

**Fuera de alcance:**

- Otros filtros del historial.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno está vinculado al coach.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador selecciona un ejercicio para filtrar el historial.
2. El sistema recupera las ejecuciones del alumno acotadas a ese ejercicio.
3. El sistema presenta el historial filtrado (peso, reps, fecha).

## Caminos alternativos / excepciones

### En el paso 2 — Sin registros para el ejercicio

1. El alumno no entrenó ese ejercicio.
2. El sistema muestra un estado vacío.
