# CU-E-19 — Asignar Rutina a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Vía puntual de asignación (~10% de los casos): asigna una rutina directamente a un alumno sin planificación, mediante Routine_Asignation_User. Caso típico: alumno nuevo con una rutina diaria de principiante.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Routine_Asignation_User que liga una rutina directamente al alumno.

**Fuera de alcance:**

- Asignación vía planificación (CU «Asignar Planificación a Alumno»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno y la rutina existen.

## Postcondiciones

- Existe un Routine_Asignation_User; el alumno ve la rutina en su home.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno y una rutina.
2. El sistema crea el Routine_Asignation_User.
3. El sistema confirma la asignación.

## Caminos alternativos / excepciones

### En el paso 1 — Rutina ya asignada

1. El alumno ya tiene esa rutina puntual asignada.
2. El sistema informa y no duplica el vínculo.
