# CU-A-04 — Crear Ejercicio

**Rol:** Admin  
**Paquete:** Administrar Ejercicios

## Descripción breve

Da de alta un ejercicio en el catálogo global con sus datos (nombre, descripción, tips, video, imágenes).

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Exercise con sus datos descriptivos.

**Fuera de alcance:**

- Asignación de músculos (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Existe un nuevo Exercise en el catálogo.

## Camino principal (flujo básico)

1. El admin envía los datos del ejercicio.
2. El sistema valida los datos (p. ej. nombre obligatorio y único).
3. El sistema crea el Exercise y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Datos inválidos o nombre duplicado

1. Faltan datos obligatorios o el nombre ya existe.
2. El sistema rechaza la operación e informa el error.
