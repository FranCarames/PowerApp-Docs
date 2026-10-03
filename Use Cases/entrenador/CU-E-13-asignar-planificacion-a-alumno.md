# CU-E-13 — Asignar Planificación a Alumno

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Vía principal de asignación (~90% de los casos): asigna una planificación entera a un alumno, instanciando User_Planification y, a través de Routine_Asignation, las User_Routine correspondientes.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de User_Planification (start_date, end_date, coach_note).
- Derivación de las User_Routine a partir de las rutinas de la planificación.

**Fuera de alcance:**

- Asignación de una rutina puntual sin planificación (CU «Asignar Rutina a Alumno»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno y la planificación existen.
- La planificación tiene rutinas asignadas.

## Postcondiciones

- Existe una User_Planification para el alumno y se generan sus User_Routine.
- El alumno ve el plan en su home.

## Camino principal (flujo básico)

1. El entrenador selecciona un alumno y una planificación.
2. Define fecha de inicio/fin y una nota opcional (coach_note).
3. El sistema crea la User_Planification y deriva las User_Routine desde Routine_Asignation.
4. El sistema confirma la asignación.

## Caminos alternativos / excepciones

### En el paso 2 — Solapamiento con plan vigente

1. El alumno ya tiene una planificación vigente en ese rango.
2. El sistema advierte el solapamiento y solicita confirmación o ajuste de fechas.

### En el paso 3 — Error de persistencia

1. Falla al crear los registros.
2. El sistema revierte y no deja una asignación parcial.
