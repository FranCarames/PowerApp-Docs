# CU-E-12c — Quitar o Reincorporar una Rutina de una Planificación Sistémica (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones  
**Incluido por:** [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) Gestionar Rutinas de una Planificación Sistémica

## Descripción breve

Saca una rutina de una planificación dando de baja lógica su vínculo (Routine_Asignation.active = false), o la vuelve a incorporar. Nunca se borra físicamente, para preservar el historial de entrenamiento de los alumnos. Quitarla **conserva su semana y su orden**. La rutina quitada **sigue visible en el detalle del plan, aparte de las vigentes**, y se puede reincorporar en cualquier momento, no solo en la misma edición.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja lógica de un vínculo Routine_Asignation.
- Reactivación de ese mismo vínculo, en su lugar de antes o en la semana y la posición que indique el entrenador.
- Mostrar las rutinas quitadas en el detalle del plan, separadas de las vigentes, cada vez que se abre.

**Fuera de alcance:**

- Borrado físico del vínculo.
- Baja o reincorporación de varios vínculos a la vez (CU-E-12d).
- Baja de la rutina sistémica: es reutilizable y sigue existiendo fuera de este plan.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El vínculo existe.

## Postcondiciones

- **Al quitar:** el vínculo queda con active = false y **conserva su semana y su posición**. La rutina deja de estar entre las vigentes del plan y deja de contarse en su total, pero **sigue apareciendo en el detalle, aparte, entre las quitadas**, también después de salir y volver a abrir la planificación.
- **Al reincorporar:** el vínculo vuelve a active = true y la rutina vuelve a estar entre las vigentes del plan.
- En los dos casos, los Routine_Exercise_Finished de los alumnos quedan intactos.

## Camino principal (flujo básico)

1. El entrenador abre una planificación y elige quitar una de sus rutinas.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca el vínculo con active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### Reincorporar la rutina

1. El entrenador elige una de las rutinas quitadas del detalle del plan y la vuelve a incorporar, indicando opcionalmente la semana y la posición. Puede hacerlo **en cualquier momento**: la quitada sigue en el detalle aunque haya salido de la planificación y la haya vuelto a abrir.
2. Sin ninguna de las dos, la rutina **vuelve a su lugar**: su semana y su posición de antes. Con semana y sin posición, va al final de esa semana. Con posición, se guarda tal cual (puede repetirse).
3. **No se revisa si la rutina sigue activa.** Una rutina dada de baja como rutina (CU-E-18) se reincorpora igual, sin bloqueo ni aviso, y aparece en el plan como cualquier rutina dada de baja. (Agregar una rutina dada de baja, en cambio, no se puede: CU-E-12a.)

### Reincorporar a una semana que ya no existe

1. La duración del plan se achicó mientras la rutina estaba de baja, y su semana (o la indicada) supera la duración actual.
2. El sistema lo informa, pide una semana válida y no reincorpora.

### En el paso 3 — El resto del plan no se renumera

1. Al quitar la rutina, las que quedan conservan su semana y su posición, y la quitada también.
2. La secuencia no se reescribe: se evita tocar todos los vínculos del plan en cada baja.

### En el paso 1 — Vínculo inexistente

1. El vínculo seleccionado ya no existe.
2. El sistema informa el error y no modifica nada.

### Indicar semana o posición al quitar

1. El entrenador intenta indicar una semana o una posición junto con la baja.
2. El sistema rechaza la operación: sólo tienen sentido al reincorporar, porque la baja siempre conserva el lugar.
