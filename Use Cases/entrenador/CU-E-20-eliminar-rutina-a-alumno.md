# CU-E-20 — Eliminar Rutina a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Quita una rutina puntual asignada a un alumno, eliminando el Routine_Asignation_User correspondiente.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja del vínculo Routine_Asignation_User entre la rutina y el alumno.

**Fuera de alcance:**

- Baja de la rutina sistémica.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno tiene esa rutina puntual asignada.

## Postcondiciones

- El alumno deja de tener esa rutina puntual; desaparece de su home.

## Camino principal (flujo básico)

1. El entrenador abre la rutina puntual del alumno y solicita quitarla.
2. El sistema pide confirmación.
3. El sistema elimina el Routine_Asignation_User y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.
