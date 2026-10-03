# CU-A-21 — Crear Membresía

**Rol:** Admin  
**Paquete:** Administrar Membresías (Tipos)

## Descripción breve

Da de alta un tipo de membresía con su nombre, duración y precio.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Membership (name, duration, price).

**Fuera de alcance:**

- El registro de pagos de alumnos (paquete del Entrenador).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Existe un nuevo tipo de Membership.

## Camino principal (flujo básico)

1. El admin envía los datos del tipo de membresía.
2. El sistema valida los datos (nombre, duración y precio válidos).
3. El sistema crea el Membership y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Datos inválidos o nombre duplicado

1. Faltan datos o el nombre ya existe.
2. El sistema rechaza la operación e informa.
