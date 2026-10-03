# CU-U-02 — Login

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Autentica a un usuario contra sus credenciales y abre una sesión con su rol, habilitando el acceso al resto de la aplicación.

## Actores involucrados

- **Principal:** Usuario (no autenticado)
- **Secundarios:** —

## Alcance

**Cubre:**

- Validación de credenciales.
- Emisión del token/sesión.
- Detección de contraseña temporal para forzar cambio.

**Fuera de alcance:**

- Registro de cuenta.
- Recuperación de contraseña.

## Precondiciones

- El usuario posee una cuenta registrada (User existente).
- No hay sesión activa en el dispositivo.

## Postcondiciones

- El usuario queda autenticado con una sesión válida asociada a su rol.
- Si ingresó con contraseña temporal, queda marcado para cambio obligatorio de contraseña.

## Camino principal (flujo básico)

1. El usuario ingresa email y contraseña.
2. El sistema valida las credenciales contra el registro User.
3. El sistema verifica si la contraseña usada es la temporal (temp_password).
4. El sistema emite la sesión/token y carga la pantalla principal según el rol.

## Caminos alternativos / excepciones

### En el paso 2 — Credenciales inválidas

1. Email inexistente o contraseña incorrecta.
2. El sistema informa el error sin precisar cuál campo falló y no abre sesión.

### En el paso 3 — Ingreso con contraseña temporal

1. La contraseña coincide con temp_password.
2. El sistema obliga a redirigir al CU "Cambiar contraseña" antes de continuar.
