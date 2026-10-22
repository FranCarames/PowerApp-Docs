# CU-U-08 — Obtener mi Planificación

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Pantalla principal (home) del alumno: muestra las rutinas de una o más semanas, empezando por la semana del día que manda la aplicación (generalmente hoy). Llegan juntas las que vienen de una planificación asignada (~90%) y las individuales que el entrenador le asignó para un día concreto (~10%). Las rutinas del plan van por semana del plan, sin día, en el orden que les dio el entrenador; las individuales, por día. Cada rutina muestra su progreso: los ejercicios que ya hizo sobre el total.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Las semanas pedidas, de lunes a domingo: desde la que contiene el día que manda la aplicación, hasta 8 semanas seguidas.
- Las rutinas individuales de cada semana (Routine_Asignation_User), cada una con su día y su progreso.
- Las rutinas de cada semana de cada planificación activa del alumno (User_Planification → Planification → Routine_Asignation), cada una con su orden dentro de la semana y su progreso.
- Mostrar juntas las dos fuentes, semana por semana, cuando el alumno tiene ambas.
- Moverse a otras semanas, anteriores o posteriores.

**Fuera de alcance:**

- Detalle de cada rutina (ver CU "Ver detalle de Rutina").
- Marcar ejercicios como realizados (CU «Marcar como realizado»).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- Operación de solo lectura; no cambia el estado del sistema.

## Camino principal (flujo básico)

1. El usuario abre el home.
2. La aplicación manda un día, generalmente el de hoy, y la cantidad de semanas que quiere mostrar, de 1 a 8. El sistema toma el lunes de la semana de ese día y arma las semanas pedidas, de lunes a domingo.
3. Para cada semana, el sistema busca las rutinas individuales asignadas al alumno para esos días y calcula el progreso de cada una.
4. Para cada semana, el sistema busca las planificaciones activas del alumno que tienen una semana del plan en esa semana del calendario. La semana 1 del plan es la de lunes a domingo que contiene su fecha de inicio, y la última es la que contiene su fecha de fin. Trae las rutinas de esa semana del plan, en el orden que les dio el entrenador, y calcula el progreso de cada una.
5. El sistema presenta las semanas en orden, todas, aunque alguna esté vacía. En cada una van las rutinas individuales, ordenadas por día, y las del plan, agrupadas por planificación, con el nombre del plan y el número de semana.

## Caminos alternativos / excepciones

### En el paso 2 — La aplicación no manda el día

1. La aplicación pide el home sin indicar el día.
2. El sistema usa el día de hoy en la hora de Argentina para armar las semanas.

### En el paso 2 — La aplicación no manda la cantidad de semanas

1. La aplicación pide el home sin indicar cuántas semanas.
2. El sistema arma una sola semana.

### En el paso 2 — Datos inválidos

1. El día no es una fecha válida, o la cantidad de semanas es menor que 1 o mayor que 8.
2. El sistema informa el error y no muestra nada.

### En el paso 4 — Sin plan esa semana pero con rutinas individuales

1. El alumno no tiene ninguna planificación activa con una semana que caiga en esa semana (no tiene ninguna, todavía no empezó o ya terminó).
2. El sistema muestra en esa semana sólo sus rutinas individuales.

### En el paso 4 — Con plan y con rutinas individuales

1. El alumno tiene las dos cosas.
2. El sistema muestra las dos: una rutina individual asignada a propósito no queda oculta mientras dure el plan.

### En el paso 4 — Dos planificaciones en la misma semana

1. El alumno tiene dos planificaciones activas cuyas fechas se pisan (el entrenador confirmó el aviso de solapamiento de CU-E-13).
2. El sistema muestra las dos, cada una con sus rutinas de esa semana.

### En el paso 4 — El plan arranca o termina a mitad de semana

1. La fecha de inicio o la de fin del plan cae a mitad de la semana.
2. El sistema muestra igual esa semana del plan completa: sus rutinas no tienen día, así que el alumno las hace en los días que le quedan.

### En el paso 4 — Una semana del plan sin rutinas

1. La planificación no tiene rutinas para esa semana (por ejemplo, el entrenador le fijó al alumno un fin más largo que la duración de la planificación).
2. El sistema muestra la semana del plan, vacía.

### En el paso 4 — El entrenador quitó una rutina del plan

1. El entrenador quitó una rutina de esa semana de la planificación (CU-E-12c).
2. Si el alumno ya había hecho algo en ella, el sistema la sigue mostrando, indicando que fue quitada, y sólo con lo que hizo. Si no había hecho nada, no la muestra.

### En el paso 4 — Planificación quitada al alumno

1. El entrenador le quitó la planificación al alumno (CU-E-14).
2. El sistema no la muestra en el home. Lo que el alumno hizo en ella sigue en su historial.

### En los pasos 3 y 4 — La planificación o la rutina fueron dadas de baja después de asignarlas

1. El entrenador dio de baja la planificación (CU-E-11) o la rutina (CU-E-18) después de asignarla.
2. El sistema la sigue mostrando, indicando que está dada de baja: la asignación existe y el alumno puede ejecutarla.

### En los pasos 3 y 4 — Un ejercicio fue dado de baja

1. El entrenador sacó un ejercicio de la rutina después de que el alumno lo hizo.
2. El sistema lo cuenta en el progreso de esa rutina: se ve lo dado de baja que el alumno completó, y sólo eso.

### En el paso 5 — Una semana sin nada

1. Una de las semanas pedidas no tiene rutinas individuales ni del plan.
2. El sistema la muestra vacía, en su lugar entre las demás.

### En el paso 5 — El alumno se mueve a otras semanas

1. El alumno pide semanas anteriores o posteriores.
2. La aplicación manda otro día y el sistema repite los pasos 2 a 5, también si esas semanas ya pasaron: lo que hizo se sigue viendo en el progreso.

### En el paso 5 — Sin asignaciones

1. El alumno no tiene rutinas del plan ni rutinas individuales en ninguna de las semanas pedidas.
2. El sistema muestra un estado vacío indicando que aún no tiene entrenamiento asignado.
