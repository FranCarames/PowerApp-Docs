# CU-E-03 — Cerrar cuenta de alumno

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Da de baja la cuenta de un alumno gestionado por el entrenador.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja de la cuenta del alumno (User) seleccionado.

**Fuera de alcance:**

- Eliminación del histórico de entrenamientos o pagos asociado, según política de integridad.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno existe y está vinculado al coach.

## Postcondiciones

- La cuenta del alumno queda cerrada y no puede iniciar sesión.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno y solicita cerrar su cuenta.
2. El sistema pide confirmación.
3. El sistema cierra la cuenta del alumno y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 3 — Restricciones de integridad

1. El alumno posee datos que impiden la baja directa.
2. El sistema aplica la política definida (baja lógica o impedimento) e informa el resultado.

## Implementación

Política elegida: **baja lógica** mediante el campo `User.active` (boolean, default `true`).

- Endpoint: `POST /users/set-active/:id` con body `{ "active": false }` para cerrar la cuenta (o `{ "active": true }` para reactivarla). Mismo patrón que la baja/alta de membresías (`POST /membership/set-active/:id`).
- Al cerrarse (`active = false`), el login queda bloqueado: `POST /users/login` responde **403** para cuentas inactivas, cumpliendo la postcondición «no puede iniciar sesión».
- No se elimina el histórico de pagos ni entrenamientos (baja lógica, integridad preservada).

> **Pendiente:** control de acceso por rol (que solo un Entrenador/Admin pueda cerrar cuentas). Hoy no hay guards; es un pendiente transversal.

