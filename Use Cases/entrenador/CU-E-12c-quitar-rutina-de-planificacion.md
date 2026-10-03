# CU-E-12c — Quitar o Reincorporar una Rutina de una Planificación Sistémica (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones  
**Incluido por:** [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) Gestionar Rutinas de una Planificación Sistémica

## Descripción breve

Saca una rutina de una planificación dando de baja lógica su vínculo (Routine_Asignation.active = false), o la vuelve a incorporar. Nunca se borra físicamente, para preservar las User_Routine derivadas y el historial de entrenamiento de los alumnos.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja lógica de un vínculo Routine_Asignation.
- Reactivación de ese mismo vínculo, con la posición que indique el entrenador o al final del plan.

**Fuera de alcance:**

- Borrado físico del vínculo.
- Baja o reincorporación de varios vínculos a la vez (CU-E-12d).
- Baja de la rutina sistémica: es reutilizable y sigue existiendo fuera de este plan.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El vínculo existe.

## Postcondiciones

- **Al quitar:** el vínculo queda con active = false y **sin posición**; la planificación deja de mostrar esa rutina y deja de contarla en su total.
- **Al reincorporar:** el vínculo vuelve a active = true con una posición, y la rutina reaparece en el detalle del plan.
- En los dos casos, las User_Routine ya derivadas y los Routine_Exercise_Finished de los alumnos quedan intactos.

## Camino principal (flujo básico)

1. El entrenador abre una planificación y elige quitar una de sus rutinas.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca el vínculo con active = false, le quita la posición y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### Reincorporar la rutina

1. El entrenador vuelve a incorporar un vínculo dado de baja e indica, opcionalmente, la posición.
2. Si indicó posición, el sistema se la asigna; si no, la rutina vuelve al final del plan, porque la baja le había borrado la que tenía.

### En el paso 3 — El resto del plan no se renumera

1. Al quitar la rutina, las que quedan conservan su posición.
2. La secuencia queda con un hueco, a propósito: se evita reescribir todos los vínculos del plan en cada baja.

### En el paso 1 — Vínculo inexistente

1. El vínculo seleccionado ya no existe.
2. El sistema informa el error y no modifica nada.

### Indicar una posición al quitar

1. El entrenador intenta indicar una posición junto con la baja.
2. El sistema rechaza la operación: la posición sólo tiene sentido al reincorporar, porque la baja siempre la borra.
