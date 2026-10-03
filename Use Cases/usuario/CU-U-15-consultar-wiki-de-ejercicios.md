# CU-U-15 — Consultar wiki de ejercicios

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Permite al usuario explorar la biblioteca/catálogo global de ejercicios para consultar su descripción, tips, video e imágenes.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Búsqueda y lectura del catálogo de Exercise.
- Visualización de descripción, tips, video e imágenes.

**Fuera de alcance:**

- Edición del catálogo (competencia del Admin).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El usuario abre la wiki de ejercicios.
2. Opcionalmente busca o filtra por nombre.
3. El sistema recupera los Exercise del catálogo.
4. El usuario abre un ejercicio y el sistema muestra su ficha completa.

## Caminos alternativos / excepciones

### En el paso 3 — Sin resultados de búsqueda

1. El filtro no arroja coincidencias.
2. El sistema muestra un estado vacío.
