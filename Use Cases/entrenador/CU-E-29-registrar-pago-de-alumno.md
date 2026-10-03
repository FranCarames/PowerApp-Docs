# CU-E-29 — Registrar pago de alumno

**Rol:** Entrenador  
**Paquete:** Gestionar Membresías

## Descripción breve

Registra un pago de membresía de un alumno creando un nuevo Membership_Payment. Cubre tanto altas como renovaciones (no existe «renovar» como operación separada).

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Membership_Payment con su expired_at, que redefine el estado de membresía del alumno.

**Fuera de alcance:**

- Definición de los tipos de membresía (Admin).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe y hay un tipo de membresía aplicable.

## Postcondiciones

- Existe un nuevo Membership_Payment; el estado de membresía del alumno se recalcula a partir de su expired_at.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno y el tipo de membresía pagado.
2. El sistema calcula el expired_at según la duración del tipo y la fecha del pago.
3. El sistema crea el Membership_Payment y confirma.
4. El estado de membresía del alumno queda actualizado de forma derivada.

## Caminos alternativos / excepciones

### En el paso 2 — Datos de pago inválidos

1. Faltan datos o el tipo de membresía no es válido.
2. El sistema marca el error y no registra el pago.
