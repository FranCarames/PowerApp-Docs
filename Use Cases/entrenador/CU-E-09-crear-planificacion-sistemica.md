# CU-E-09 — Crear Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Crea una planificación sistémica (plantilla) que agrupará rutinas a lo largo de varias semanas (de una semana hasta dos o tres meses).

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de una Planification sistémica con sus datos base.

**Fuera de alcance:**

- Asignación de rutinas a la planificación (CU aparte).
- Asignación de la planificación a un alumno (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Existe una nueva Planification sistémica.

## Camino principal (flujo básico)

1. El entrenador ingresa los datos de la planificación (nombre, duración, etc.).
2. El sistema valida los datos.
3. El sistema persiste la nueva Planification y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Datos inválidos

1. Faltan campos obligatorios o son inválidos.
2. El sistema marca el error y no persiste.
