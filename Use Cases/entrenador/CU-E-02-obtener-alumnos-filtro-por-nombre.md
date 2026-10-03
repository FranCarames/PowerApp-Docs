# CU-E-02 — Obtener alumnos — Filtro por nombre

**Rol:** Entrenador  
**Paquete:** Administrar Alumnos

## Descripción breve

Variante de «Obtener alumnos» que acota el listado a los alumnos cuyo **nombre, apellido o email** coinciden con un texto de búsqueda.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Filtrado del listado de alumnos por coincidencia parcial (sin distinguir mayúsculas) en nombre, apellido y email.

**Fuera de alcance:**

- Filtros por otros criterios (estado/tipo de membresía, que tienen CU propios).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador ingresa un texto de búsqueda (`keyword`).
2. El sistema recupera los alumnos cuyo nombre, apellido o email contienen ese texto.
3. El sistema presenta el listado filtrado (paginado).

## Caminos alternativos / excepciones

### En el paso 2 — Sin coincidencias

1. Ningún alumno coincide con la búsqueda.
2. El sistema devuelve una página vacía.

## Implementación

Resuelto sobre el mismo endpoint que «Obtener alumnos»: `GET /users/all`, con el query param `keyword` — coincidencia parcial (ILIKE) sobre `first_name`, `last_name`, el nombre completo (`first_name || ' ' || last_name`) y `email`. Es combinable con los demás filtros (`role`, `active`) y con la paginación (`page`, `limit`; respuesta `{ data, total, page, limit, totalPages }`).

> **Nota de modelo:** hoy no existe un vínculo directo coach↔alumno, por lo que «alumnos» equivale a los usuarios con `role=user`. Acotar por entrenador queda pendiente de un cambio de modelo.
