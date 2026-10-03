# CU-U-03 — Cerrar sesión

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Cierra la sesión activa del usuario y revoca/olvida el token de acceso en el dispositivo.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Invalidación de la sesión local y/o token.

**Fuera de alcance:**

- Eliminación de la cuenta.

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- La sesión deja de ser válida; el usuario vuelve a la pantalla de login.

## Camino principal (flujo básico)

1. El usuario selecciona "Cerrar sesión".
2. El sistema descarta el token/sesión del dispositivo.
3. El sistema redirige a la pantalla de login.

## Caminos alternativos / excepciones

### En el paso 2 — Sesión ya expirada

1. El token ya no es válido.
2. El sistema simplemente redirige al login sin error.
