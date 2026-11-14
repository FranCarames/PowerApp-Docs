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
- Detalle de un Muscle, al que se llega desde los músculos que trabaja un ejercicio o desde el índice de músculos: su imagen, su Muscle_Group, su descripción, los ejercicios que lo trabajan y otros ejercicios del mismo grupo muscular.
- Índice de músculos: los Muscle_Group, cada uno con sus Muscle.
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
4. El entrenador abre un ejercicio y el sistema muestra su ficha completa, con los músculos que trabaja.
5. Opcionalmente, el entrenador abre uno de esos músculos y el sistema muestra su detalle: imagen, grupo muscular, descripción (si tiene), los ejercicios que lo trabajan y otros ejercicios del mismo grupo muscular. Desde ahí puede abrir cualquiera de esos ejercicios.

## Caminos alternativos / excepciones

### En el paso 3 — Sin resultados de búsqueda

1. El filtro no arroja coincidencias.
2. El sistema muestra un estado vacío.

### En el paso 1 — Recorrer los músculos por grupo

1. El entrenador elige ver los músculos en lugar de los ejercicios.
2. El sistema muestra los grupos musculares, cada uno con sus músculos.
3. El entrenador abre un músculo y el sistema muestra su detalle (paso 5).

### En el paso 5 — El músculo ya no existe

1. El músculo fue eliminado del catálogo.
2. El sistema informa que el músculo ya no existe y ofrece volver a la biblioteca.

### En el paso 5 — Ningún ejercicio trabaja el músculo

1. El músculo no está asignado a ningún ejercicio.
2. El sistema muestra el detalle del músculo y avisa que todavía no hay ejercicios que lo trabajen.
