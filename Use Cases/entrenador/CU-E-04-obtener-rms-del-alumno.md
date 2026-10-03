# CU-E-04 — Obtener RMs del alumno

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Consulta los RM registrados (User_RM) de un alumno para evaluar su progreso.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los User_RM del alumno seleccionado.

**Fuera de alcance:**

- Alta/edición de RMs del alumno (las gestiona el propio usuario).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno está vinculado al coach.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre el perfil del alumno y selecciona sus RMs.
2. El sistema recupera los User_RM del alumno.
3. El sistema los presenta agrupados por ejercicio.

## Caminos alternativos / excepciones

### En el paso 2 — Sin RMs

1. El alumno no tiene RMs registrados.
2. El sistema muestra un estado vacío.
