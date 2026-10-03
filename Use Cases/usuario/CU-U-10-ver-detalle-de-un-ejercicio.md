# CU-U-10 — Ver detalle de un ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra el detalle de un ejercicio dentro de la rutina (series, reps, notas, video/tips) y habilita las acciones de ejecución asociadas.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Ver mis RMs de un ejercicio
- Marcar serie como realizado
- Dejar una nota en el ejercicio

## Alcance

**Cubre:**

- Presentación del Exercise y sus Exercise_Set (orden, reps, peso, RPE/RIR, AMRAP/RM).
- Acceso a RMs propios del ejercicio, marcado de series y nota personal.

**Fuera de alcance:**

- Edición de la definición del ejercicio (Admin).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El ejercicio forma parte de una rutina asignada vigente del usuario.

## Postcondiciones

- Operación de solo lectura sobre el detalle; las acciones incluidas pueden modificar estado por separado.

## Camino principal (flujo básico)

1. Desde el detalle de la rutina, el usuario abre un ejercicio.
2. El sistema recupera el Exercise y sus Exercise_Set ordenadas.
3. El sistema presenta reps, peso, tipo de serie (normal / AMRAP / RM) y notas (coach_note / user_note).
4. El sistema ofrece las acciones incluidas: ver RMs, marcar serie y dejar nota.

## Caminos alternativos / excepciones

### En el paso 2 — Ejercicio sin series cargadas

1. El ejercicio no tiene Exercise_Set.
2. El sistema muestra el detalle informativo sin series ejecutables.
