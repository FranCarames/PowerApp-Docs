# CU-E-30 — Consultar wiki de ejercicios

**Rol:** Entrenador  
**Paquete:** Biblioteca de Ejercicios

## Descripción breve

Permite al entrenador explorar la biblioteca/catálogo global de ejercicios para consultar su descripción, tips, video e imágenes, igual que el alumno, mientras arma rutinas y circuitos.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Búsqueda y lectura del catálogo de Exercise.
- Visualización de descripción, tips, video e imágenes.
- Es la misma consulta que la del alumno ([CU-U-15](../usuario/CU-U-15-consultar-wiki-de-ejercicios.md)), desde la zona del entrenador.

**Fuera de alcance:**

- Crear, editar y borrar ejercicios (competencia del Admin: [CU-A-04](../admin/CU-A-04-crear-ejercicio.md), [CU-A-05](../admin/CU-A-05-editar-ejercicio.md) y [CU-A-06](../admin/CU-A-06-eliminar-ejercicio.md)).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre la wiki de ejercicios.
2. Opcionalmente busca o filtra por nombre.
3. El sistema recupera los Exercise del catálogo.
4. El entrenador abre un ejercicio y el sistema muestra su ficha completa.

## Caminos alternativos / excepciones

### En el paso 3 — Sin resultados de búsqueda

1. El filtro no arroja coincidencias.
2. El sistema muestra un estado vacío.
