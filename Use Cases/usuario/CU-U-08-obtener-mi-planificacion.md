# CU-U-08 — Obtener mi Planificación

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Pantalla principal (home) del alumno: muestra el plan vigente y las rutinas de la semana, ya sea proveniente de una planificación asignada (~90%) o de una rutina puntual (~10%).

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Resolución de la asignación vigente vía User_Planification → Routine_Asignation → User_Routine.
- Resolución de la vía puntual vía Routine_Asignation_User.
- Listado de rutinas de la semana actual.

**Fuera de alcance:**

- Detalle de cada rutina (ver CU "Ver detalle de Rutina").

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El usuario tiene al menos una planificación o rutina asignada vigente.

## Postcondiciones

- Operación de solo lectura; no cambia el estado del sistema.

## Camino principal (flujo básico)

1. El usuario abre el home.
2. El sistema busca la planificación vigente del usuario (start_date/end_date que contienen la fecha actual).
3. Si no hay planificación, busca una rutina puntual asignada (Routine_Asignation_User).
4. El sistema arma y presenta las rutinas correspondientes a la semana actual.

## Caminos alternativos / excepciones

### En el paso 2 — Sin planificación vigente pero con rutina puntual

1. No hay User_Planification vigente.
2. El sistema usa la rutina puntual asignada y la muestra.

### En el paso 3 — Sin asignaciones

1. El usuario no tiene planificación ni rutina puntual.
2. El sistema muestra un estado vacío indicando que aún no tiene entrenamiento asignado.
