# CU-E-01 — Obtener alumnos

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Lista los alumnos vinculados al entrenador, como punto de entrada para gestionarlos.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura del conjunto de Users con role = usuario asociados al coach.

**Fuera de alcance:**

- Edición de los datos del alumno.
- Alta de alumnos (se registran ellos mismos).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre la sección de alumnos.
2. El sistema recupera los alumnos asociados al coach.
3. El sistema presenta el listado de alumnos.

## Caminos alternativos / excepciones

### En el paso 2 — Sin alumnos

1. El coach no tiene alumnos.
2. El sistema muestra un estado vacío.
