# CU-A-20 — Obtener Membresías

**Rol:** Admin  
**Paquete:** Administrar Membresías (Tipos)

## Descripción breve

Lista los tipos de membresía definidos en el sistema. (CRUD de tipos, distinto del panel de control del Entrenador.)

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Membership (name, duration, price).

**Fuera de alcance:**

- El control de pagos/vencimientos de alumnos (paquete del Entrenador).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El admin solicita el listado de tipos de membresía.
2. El sistema recupera los Membership.
3. El sistema devuelve el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Sin tipos definidos

1. No hay tipos de membresía.
2. El sistema devuelve una colección vacía.
