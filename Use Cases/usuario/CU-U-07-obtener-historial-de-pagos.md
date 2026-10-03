# CU-U-07 — Obtener historial de pagos

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Lista los pagos de membresía realizados por el propio usuario, derivados de sus registros Membership_Payment.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Membership_Payment del propio usuario.
- Presentación de fechas, montos y vencimientos.

**Fuera de alcance:**

- Registrar pagos (lo hace el Entrenador).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- El sistema no cambia de estado (operación de solo lectura).

## Camino principal (flujo básico)

1. El usuario abre su historial de pagos.
2. El sistema recupera los Membership_Payment asociados a su User.
3. El sistema presenta la lista ordenada por fecha (incluyendo expired_at de cada pago).

## Caminos alternativos / excepciones

### En el paso 2 — Sin pagos registrados

1. El usuario no posee pagos.
2. El sistema muestra un estado vacío informativo.
