# CU-U-06 — Editar datos personales

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Permite al usuario actualizar sus datos personales (nombre, apellido, teléfono y foto de perfil) sobre su propio registro User. El email se muestra, pero por ahora no se puede modificar.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de campos personales del propio User: nombre, apellido, teléfono y foto de perfil.

**Fuera de alcance:**

- Cambio del email: por ahora es solo de lectura. Es el dato con el que el usuario ingresa (CU-U-02) y recupera su contraseña (CU-U-04).
- Cambio de contraseña.
- Cambio de rol o de datos de membresía.

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- El registro User refleja los datos personales actualizados.
- El email del User no cambia.

## Camino principal (flujo básico)

1. El usuario abre la pantalla de datos personales con sus valores actuales precargados. El email aparece, pero no se puede editar.
2. Modifica los campos deseados.
3. El sistema valida el formato de los campos. Para el teléfono:
   - El número tiene solo dígitos, hasta 20. El largo cuenta solo los dígitos.
   - La pantalla acepta espacios y guiones mientras el usuario escribe y los saca antes de enviar: se guardan solo los dígitos.
   - El código de país es «+» seguido de 1 a 4 dígitos (y no pasa de 10 caracteres).
   - El tope de largo se controla antes que el formato.
4. El sistema persiste los cambios sobre el User y confirma. Si el pedido trae un email, el sistema no lo modifica.

## Caminos alternativos / excepciones

### En el paso 3 — Datos inválidos

1. Algún campo tiene formato inválido; por ejemplo, un teléfono con letras («abc») o un código de país que no es «+» con 1 a 4 dígitos.
2. El sistema marca el error y no persiste.
