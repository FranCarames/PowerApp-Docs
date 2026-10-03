# CU-E-06 — Consultar historial de entrenamientos de alumno

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Muestra el historial de entrenamientos ejecutados por un alumno, a partir de sus rutinas instanciadas y series realizadas.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura del historial de User_Routine del alumno y del estado de sus series (finished).

**Fuera de alcance:**

- Edición de la ejecución del alumno.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno está vinculado al coach.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre el historial de entrenamientos del alumno.
2. El sistema recupera las rutinas ejecutadas (User_Routine) y sus series.
3. El sistema presenta el historial ordenado cronológicamente.

## Caminos alternativos / excepciones

### En el paso 2 — Sin historial

1. El alumno no registra entrenamientos.
2. El sistema muestra un estado vacío.
