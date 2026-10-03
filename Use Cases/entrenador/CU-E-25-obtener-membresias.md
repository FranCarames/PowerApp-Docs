# CU-E-25 — Obtener Membresías

**Rol:** Entrenador  
**Paquete:** Gestionar Membresías

## Descripción breve

Lista los tipos de membresía disponibles para usarlos en el panel de control de pagos del entrenador. (Distinto del CRUD de tipos del Admin.)

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los tipos de Membership (name, duration, price).

**Fuera de alcance:**

- Alta/edición/baja de tipos de membresía (competencia del Admin).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre el panel de membresías.
2. El sistema recupera los tipos de Membership.
3. El sistema presenta el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Sin tipos de membresía

1. No hay tipos definidos por el Admin.
2. El sistema muestra un estado vacío.
