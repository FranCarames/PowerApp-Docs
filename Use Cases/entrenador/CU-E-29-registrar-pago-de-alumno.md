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
- El destinatario existe, es un alumno (no un entrenador ni un administrador) y su cuenta está abierta.
- El tipo de membresía existe y no está dado de baja.

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

### En el paso 2 — El alumno no existe

1. El sistema informa que no se encontró al alumno y no registra el pago.

### En el paso 2 — El tipo de membresía no existe

1. El sistema informa que no se encontró el tipo de membresía y no registra el pago.

### En el paso 2 — El destinatario no es un alumno

1. El usuario indicado es un entrenador o un administrador.
2. El sistema informa que el destinatario del pago tiene que ser un alumno y no registra el pago.

### En el paso 2 — La cuenta del alumno está cerrada

1. La cuenta del alumno fue cerrada (CU «Cerrar cuenta de alumno»).
2. El sistema informa que no se puede registrar el pago de una cuenta cerrada y no lo registra.

### En el paso 2 — El tipo de membresía está dado de baja

1. El tipo existe pero fue dado de baja (por ejemplo, mientras el entrenador cargaba el pago).
2. El sistema informa que el tipo está dado de baja y no registra el pago.

### Orden de las comprobaciones

El sistema primero verifica que existan el alumno y el tipo, y recién después que el destinatario sea un alumno, que su cuenta esté abierta y que el tipo siga vigente. Si hay más de un problema, informa el primero en ese orden.
