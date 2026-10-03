# CU-U-04 — Recuperar contraseña

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Genera una contraseña temporal y la envía por email al usuario; al iniciar sesión con ella, el sistema obliga a definir una nueva contraseña.

## Actores involucrados

- **Principal:** Usuario (no autenticado)
- **Secundarios:** Servicio de email

## Alcance

**Cubre:**

- Generación y persistencia de temp_password.
- Envío del email con la contraseña temporal.

**Fuera de alcance:**

- El cambio definitivo de contraseña (ver CU "Cambiar contraseña").

## Precondiciones

- No hay sesión activa.
- Existe un User asociado al email indicado.

## Postcondiciones

- El User tiene una temp_password válida persistida.
- Se envió un email con la contraseña temporal.

## Camino principal (flujo básico)

1. El usuario ingresa su email en la pantalla de recuperación.
2. El sistema verifica que exista un User con ese email.
3. El sistema genera una contraseña temporal, la persiste como temp_password y la envía por email.
4. El sistema confirma que el correo fue enviado.

## Caminos alternativos / excepciones

### En el paso 2 — Email no registrado

1. No existe User con ese email.
2. Por seguridad, el sistema muestra el mismo mensaje de confirmación sin revelar si el email existe.

### En el paso 3 — Falla en el envío de email

1. El servicio de email no responde.
2. El sistema informa que no pudo enviarse y permite reintentar.
