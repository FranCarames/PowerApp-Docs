# CU-U-06 — Editar datos personales

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Permite al usuario actualizar sus datos personales (nombre, contacto, etc.) sobre su propio registro User.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de campos personales del propio User.

**Fuera de alcance:**

- Cambio de contraseña.
- Cambio de rol o de datos de membresía.

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- El registro User refleja los datos personales actualizados.

## Camino principal (flujo básico)

1. El usuario abre la pantalla de datos personales con sus valores actuales precargados.
2. Modifica los campos deseados.
3. El sistema valida formato y unicidad cuando aplica (ej. email).
4. El sistema persiste los cambios sobre el User y confirma.

## Caminos alternativos / excepciones

### En el paso 3 — Datos inválidos

1. Algún campo tiene formato inválido o el nuevo email ya existe.
2. El sistema marca el error y no persiste.
