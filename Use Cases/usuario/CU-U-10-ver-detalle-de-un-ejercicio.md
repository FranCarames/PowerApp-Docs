# CU-U-10 — Ver detalle de un ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra el detalle de un ejercicio dentro de la rutina de una asignación (series, reps, notas, video/tips) y habilita las acciones de ejecución asociadas. Los datos llegan **dentro del detalle de la rutina** (CU «Ver detalle de Rutina»), así que abrirlo no requiere una consulta aparte.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Ver mis RMs de un ejercicio
- Marcar serie como realizado
- Dejar una nota en el ejercicio

## Alcance

**Cubre:**

- Presentación del Exercise y sus Exercise_Set (orden, reps, peso, RPE/RIR, AMRAP/RM) tal como están en la rutina.
- Acceso a RMs propios del ejercicio, marcado de series y nota personal.

**Fuera de alcance:**

- Edición de la definición del ejercicio (Admin).
- La ficha del catálogo fuera de una rutina (CU «Consultar wiki de ejercicios»).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El ejercicio forma parte de la rutina de una asignación del usuario.

## Postcondiciones

- Operación de solo lectura sobre el detalle; las acciones incluidas pueden modificar estado por separado.

## Camino principal (flujo básico)

1. Desde el detalle de la rutina, el usuario abre un ejercicio.
2. El sistema ya tiene el Exercise y sus Exercise_Set ordenadas, recuperados junto con el detalle de la rutina.
3. El sistema presenta reps, peso, tipo de serie (normal / AMRAP / RM) y notas: la del entrenador (coach_note) y la propia del usuario (user_note), si dejó una en esa asignación.
4. El sistema ofrece las acciones incluidas: ver RMs, marcar serie y dejar nota.

## Caminos alternativos / excepciones

### En el paso 2 — Ejercicio sin series cargadas

1. El ejercicio no tiene Exercise_Set.
2. El sistema muestra el detalle informativo sin series ejecutables.

### En el paso 3 — Ejercicio dado de baja que el usuario completó

1. El entrenador sacó el ejercicio de la rutina después de que el usuario lo completó en esa asignación.
2. El sistema lo sigue mostrando, con su nota, porque forma parte de lo que hizo.
