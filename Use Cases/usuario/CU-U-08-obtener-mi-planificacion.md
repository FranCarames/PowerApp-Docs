# CU-U-08 — Obtener mi Planificación

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Pantalla principal (home) del alumno: muestra las rutinas de su semana, las que vienen de una planificación asignada (~90%) y las individuales que el entrenador le asignó para un día concreto (~10%). Cada rutina individual muestra su progreso: los ejercicios que ya hizo sobre el total.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Las rutinas individuales de la semana (Routine_Asignation_User), cada una con su día y su progreso.
- El plan vigente del alumno y las rutinas de su semana (User_Planification → Routine_Asignation).
- Mostrar juntas las dos fuentes cuando el alumno tiene ambas.

**Fuera de alcance:**

- Detalle de cada rutina (ver CU "Ver detalle de Rutina").
- Marcar ejercicios como realizados (CU «Marcar como realizado»).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- Operación de solo lectura; no cambia el estado del sistema.

## Camino principal (flujo básico)

1. El usuario abre el home.
2. El sistema busca las rutinas individuales asignadas al alumno para los días de la semana (de lunes a domingo, según las fechas que manda la aplicación) y calcula el progreso de cada una.
3. El sistema busca el plan vigente del alumno (la fecha actual está dentro de su período) y las rutinas de la semana que corresponde.
4. El sistema presenta juntas las rutinas individuales y las del plan, ordenadas por día.

## Caminos alternativos / excepciones

### En el paso 3 — Sin plan vigente pero con rutinas individuales

1. El alumno no tiene un plan vigente.
2. El sistema muestra sólo sus rutinas individuales de la semana.

### En el paso 3 — Con plan vigente y con rutinas individuales

1. El alumno tiene las dos cosas.
2. El sistema muestra las dos: una rutina individual asignada a propósito no queda oculta mientras dure el plan.

### En el paso 2 — La rutina individual fue dada de baja después de asignarla

1. El entrenador dio de baja la rutina después de asignarla.
2. El sistema la sigue mostrando, indicando que está dada de baja: la asignación existe y el alumno puede ejecutarla.

### En el paso 2 — Un ejercicio fue dado de baja

1. El entrenador sacó un ejercicio de la rutina después de que el alumno lo hizo.
2. El sistema lo cuenta en el progreso de esa asignación: se ve lo dado de baja que el alumno completó, y sólo eso.

### En el paso 4 — Sin asignaciones

1. El alumno no tiene plan vigente ni rutinas individuales esa semana.
2. El sistema muestra un estado vacío indicando que aún no tiene entrenamiento asignado.
