# CU-E-28 — Obtener alumnos por tipo de membresía

**Rol:** Entrenador  
**Paquete:** Gestionar Membresías

## Descripción breve

Lista los alumnos agrupados por el tipo de membresía contratado (mensual, trimestral, etc.).

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Agrupación/listado de alumnos por su tipo de Membership.

**Fuera de alcance:**

- El estado (activa/vencida), que se cubre en otro CU.

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador selecciona un tipo de membresía (o ve todos agrupados).
2. El sistema recupera los alumnos según el tipo de membresía asociado a sus pagos.
3. El sistema presenta los alumnos agrupados por tipo.

## Caminos alternativos / excepciones

### En el paso 3 — Sin alumnos para el tipo

1. Ningún alumno tiene ese tipo de membresía.
2. El sistema muestra un estado vacío.
