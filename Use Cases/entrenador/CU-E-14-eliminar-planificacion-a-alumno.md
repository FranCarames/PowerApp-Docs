# CU-E-14 — Eliminar Planificación a Alumno (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Quita la planificación asignada a un alumno dando de baja lógica su User_Planification (active = false), o la vuelve a incorporar. Nunca se borra físicamente, para preservar el historial de entrenamiento del alumno. Quitarla sólo apaga la asignación: las rutinas del plan se leen siempre de la planificación, así que no hay nada más que dar de baja.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- La consulta de las planificaciones asignadas al alumno, para elegir cuál quitar o reincorporar.
- Baja lógica de una User_Planification.
- Reincorporación de esa misma User_Planification, con sus mismas fechas.

**Fuera de alcance:**

- Borrado físico de la asignación.
- Baja de la planificación sistémica (plantilla, CU-E-11).
- Editar una asignación: para cambiar sus fechas, el entrenador la quita y la asigna de nuevo (CU-E-13).
- Baja de lo que el alumno entrenó: su historial se conserva intacto.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La asignación existe.
- El gimnasio es compartido: cualquier entrenador puede quitar o reincorporar la planificación de cualquier alumno, la haya asignado él o no.

## Postcondiciones

- **Al quitar:** la User_Planification queda con active = false. El plan sale del home del alumno y deja de contar para el aviso de solapamiento al asignarle otra planificación (CU-E-13). Lo que el alumno entrenó sigue en su historial (CU-E-06).
- **La asignación quitada queda congelada para el alumno:** puede seguir abriendo sus rutinas y viendo lo que hizo, pero ya no puede marcar, desmarcar ni anotar ejercicios en ella.
- **Al reincorporar:** la User_Planification vuelve a active = true, con sus mismas fechas, y el plan reaparece en el home del alumno.

## Camino principal (flujo básico)

1. El entrenador abre las planificaciones asignadas al alumno. Por defecto ve las activas (las que no se quitaron, incluidas las ya terminadas y las futuras); puede pedir también las quitadas.
2. Elige una y solicita quitarla.
3. El sistema pide confirmación, advirtiendo que es un borrado lógico.
4. El sistema marca la User_Planification con active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — El alumno no existe

1. El sistema informa el error.

### En el paso 3 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 4 — La planificación ya estaba dada de baja

1. La planificación del alumno ya está inactiva (por ejemplo, otro entrenador la quitó mientras tanto).
2. El sistema informa que ya está dada de baja: no hay nada que quitar.

### En el paso 4 — La asignación no existe

1. La asignación seleccionada ya no existe.
2. El sistema informa el error y no modifica nada.

### Reincorporar la planificación

1. En el paso 1, el entrenador pide también las quitadas, elige una y solicita reincorporarla.
2. El sistema la marca con active = true y confirma. Vuelve con sus mismas fechas.
3. El sistema **no vuelve a verificar el solapamiento**: si el alumno tiene otra planificación vigente en esas fechas, las dos conviven, como cuando se confirma el aviso en CU-E-13.
4. Tampoco verifica que la planificación siga activa ni que la cuenta del alumno siga abierta: reincorporar deshace la baja y deja la asignación como estaba antes de quitarla.

### Reincorporar una planificación que ya está activa

1. La planificación del alumno ya está activa (por ejemplo, otro entrenador la reincorporó mientras tanto).
2. El sistema informa que ya está activa y no modifica nada.
