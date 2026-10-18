# CU-U-09 — Ver detalle de Rutina

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra los circuitos y ejercicios que componen la rutina de una asignación del usuario, junto con lo que ya hizo en ella, como punto de partida para ejecutarla. La rutina se abre **desde la asignación del día** y no directamente por la rutina.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Ver detalle de un ejercicio

## Alcance

**Cubre:**

- Listado ordenado de circuitos de la rutina y, dentro de cada uno, sus ejercicios con sus series.
- Los ejercicios que el alumno ya marcó como realizados en esa asignación, con su nota.
- Acceso al detalle de cada ejercicio.

**Fuera de alcance:**

- Edición de la rutina (es competencia del Entrenador).
- Marcar ejercicios como realizados (CU «Marcar como realizado»).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La asignación pertenece al usuario.

## Postcondiciones

- Operación de solo lectura sobre la estructura de la rutina y el registro de ejecución.

## Camino principal (flujo básico)

1. El usuario selecciona una asignación desde su home (CU «Obtener mi planificación»).
2. El sistema verifica que la asignación sea del usuario.
3. El sistema recupera los circuitos de la rutina (Routine_Circuit) en su orden.
4. Para cada circuito, recupera sus ejercicios (Routine_Exercise) con series.
5. El sistema recupera los ejercicios que el usuario ya marcó como realizados en esa asignación, con su nota.
6. El sistema presenta la estructura completa, señala lo realizado y permite abrir el detalle de cada ejercicio (<<include>> Ver detalle de un ejercicio).

## Caminos alternativos / excepciones

### En el paso 2 — La asignación no existe

1. El sistema informa que no se encontró la asignación.

### En el paso 2 — Asignación de otro alumno

1. La asignación pertenece a otro usuario.
2. El sistema deniega el acceso.

### En el paso 3 — La rutina fue dada de baja después de asignarla

1. El entrenador dio de baja la rutina después de asignarla.
2. El sistema la muestra igual, indicando que está dada de baja: la asignación existe y el usuario puede ejecutarla.

### En el paso 4 — Un ejercicio o un circuito fue dado de baja

1. El entrenador sacó un ejercicio de un circuito, o un circuito de la rutina, después de que el usuario completó algo de él en esa asignación.
2. El sistema lo sigue mostrando: lo dado de baja que el usuario completó no desaparece de su pantalla.
3. De un circuito que el entrenador sacó de la rutina se muestran únicamente los ejercicios que el usuario completó; los demás no aparecen como pendientes.
4. Lo dado de baja que el usuario **no** completó no se muestra.
