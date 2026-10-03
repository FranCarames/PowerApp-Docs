# CU-E-26 — Obtener estado de membresías

**Rol:** Entrenador  
**Paquete:** Gestionar Membresías

## Descripción breve

Devuelve contadores de cuántos alumnos hay activos, por vencer y vencidos, para las previews del panel. El estado se deriva de Membership_Payment.expired_at cruzado con la fecha actual.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Cálculo de los contadores de alumnos por estado de membresía (activa / por vencer / vencida).

**Fuera de alcance:**

- El detalle de alumnos de cada estado (CU «Obtener alumnos por estado de membresía»).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura; el estado es derivado, no almacenado como flag.

## Camino principal (flujo básico)

1. El entrenador abre el panel de membresías.
2. El sistema toma el último Membership_Payment de cada alumno y compara expired_at con la fecha actual.
3. El sistema calcula y presenta los contadores: activos, por vencer y vencidos.

## Caminos alternativos / excepciones

### En el paso 2 — Sin pagos registrados

1. No hay pagos en el sistema.
2. El sistema devuelve contadores en cero.
