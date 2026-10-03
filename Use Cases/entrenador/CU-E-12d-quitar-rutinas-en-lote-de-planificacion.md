# CU-E-12d — Quitar o Reincorporar Rutinas en Lote (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones  
**Incluido por:** [`CU-E-12`](CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) Gestionar Rutinas de una Planificación Sistémica

## Descripción breve

Da de baja lógica varios vínculos Routine_Asignation en una sola operación, o los reincorpora en bloque. Es la vía para vaciar un plan o rearmarlo sin repetir la operación rutina por rutina.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja lógica de varios vínculos Routine_Asignation en una sola operación.
- Reactivación en bloque de varios vínculos, que vuelven al final de su plan.

**Fuera de alcance:**

- Borrado físico de los vínculos.
- Indicar una posición puntual al reincorporar: para eso está CU-E-12c, que se ejecuta de a uno.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- Todos los vínculos seleccionados existen.

## Postcondiciones

- **Al quitar:** todos los vínculos quedan con active = false y sin posición, y sus planificaciones dejan de mostrarlos.
- **Al reincorporar:** todos vuelven a active = true, cada uno al final de la planificación a la que pertenece.
- En los dos casos, las User_Routine ya derivadas y los Routine_Exercise_Finished de los alumnos quedan intactos.

## Camino principal (flujo básico)

1. El entrenador selecciona varias rutinas de una planificación y elige quitarlas.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca todos los vínculos con active = false en una sola transacción, les quita la posición y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### Reincorporar en bloque

1. El entrenador vuelve a incorporar varios vínculos dados de baja.
2. El sistema los reactiva y agrega cada uno al final de su propia planificación, en el orden en que fueron seleccionados.

### En el paso 3 — Algún vínculo no existe

1. Uno o más identificadores no corresponden a ningún vínculo.
2. El sistema informa el error y **no modifica ninguno**.

### En el paso 1 — La selección tiene repetidos

1. El entrenador incluye el mismo vínculo dos veces en la selección.
2. El sistema rechaza la operación: pedir dos veces lo mismo en el mismo lote es un error de la solicitud.

### En el paso 1 — Selección vacía o demasiado grande

1. El entrenador no selecciona ningún vínculo, o supera el máximo admitido por operación.
2. El sistema marca el error y no persiste nada.

### Vínculos de planificaciones distintas

1. La selección incluye vínculos de más de una planificación.
2. El sistema los procesa igual: la operación no exige que pertenezcan al mismo plan.
