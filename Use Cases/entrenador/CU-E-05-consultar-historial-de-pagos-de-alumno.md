# CU-E-05 — Consultar historial de pagos de alumno

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Muestra los pagos de membresía de un alumno (Membership_Payment) para revisar su situación. Este mismo CU se referencia también desde el paquete «Gestionar Membresías».

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Membership_Payment del alumno con sus fechas y vencimientos.

**Fuera de alcance:**

- Registrar un pago (CU «Registrar pago de alumno»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno está vinculado al coach.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre el historial de pagos del alumno.
2. El sistema recupera los Membership_Payment del alumno.
3. El sistema los presenta ordenados por fecha, indicando expired_at de cada pago.

## Caminos alternativos / excepciones

### En el paso 2 — Sin pagos

1. El alumno no tiene pagos registrados.
2. El sistema muestra un estado vacío.
