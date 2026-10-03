# CU-A-16 — Obtener Entrenadores

**Rol:** Admin  
**Paquete:** Administrar Entrenadores

## Descripción breve

Lista los entrenadores registrados con sus datos profesionales (Coach).

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Coach (coach_email, cuil, active) y su User asociado.

**Fuera de alcance:**

- Edición de los entrenadores (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El admin solicita el listado de entrenadores.
2. El sistema recupera los Coach con sus datos.
3. El sistema devuelve el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Sin entrenadores

1. No hay entrenadores registrados.
2. El sistema devuelve una colección vacía.
