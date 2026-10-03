# CU-E-10 — Editar Planificación Sistémica

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Modifica los datos de una planificación sistémica existente.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Edición de los datos de la Planification sistémica.

**Fuera de alcance:**

- Reasignación de rutinas (CU «Asignar Rutina a Planificación»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La Planification existe.

## Postcondiciones

- La Planification queda actualizada.

## Camino principal (flujo básico)

1. El entrenador abre una planificación y modifica sus datos.
2. El sistema valida los datos.
3. El sistema persiste los cambios y confirma.

## Caminos alternativos / excepciones

### En el paso 1 — Planificación inexistente

1. La planificación ya no existe.
2. El sistema informa que no se puede editar.

### En el paso 2 — Datos inválidos

1. Datos inválidos.
2. El sistema marca el error y no persiste.
