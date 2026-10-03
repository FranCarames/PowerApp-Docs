# CU-U-11 — Ver mis RMs de un ejercicio

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra los RM registrados del propio usuario para un ejercicio puntual, como referencia durante la ejecución.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los User_RM del usuario filtrados por ejercicio.

**Fuera de alcance:**

- Cálculo de RM potencial (CU aparte).
- Alta/edición de RM (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. Desde el detalle del ejercicio, el usuario abre "Mis RMs".
2. El sistema recupera los User_RM del usuario para ese ejercicio.
3. El sistema presenta los RMs (peso, reps, fecha) ordenados.

## Caminos alternativos / excepciones

### En el paso 2 — Sin RMs registrados

1. No hay User_RM para ese ejercicio.
2. El sistema muestra un estado vacío e invita a registrar uno.
