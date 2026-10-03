# CU-E-27 — Obtener alumnos por estado de membresía

**Rol:** Entrenador  
**Paquete:** Gestionar Membresías

## Descripción breve

Lista los alumnos cuyo estado de membresía coincide con el filtro seleccionado: activa, por vencer o vencida.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Listado de alumnos filtrado por estado de membresía derivado de expired_at.

**Fuera de alcance:**

- Registro de pagos (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador selecciona un estado (activa / por vencer / vencida).
2. El sistema deriva el estado de cada alumno comparando su expired_at con la fecha actual.
3. El sistema presenta los alumnos que coinciden con el estado elegido.

## Caminos alternativos / excepciones

### En el paso 3 — Sin alumnos en ese estado

1. Ningún alumno está en el estado seleccionado.
2. El sistema muestra un estado vacío.
