# CU-U-17 — Registrar un RM

**Rol:** Usuario  
**Paquete:** Administrar Mis RMs

## Descripción breve

Crea un registro real de repetición máxima del usuario para un ejercicio, persistiéndolo en User_RM.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un User_RM (peso, reps, fecha) para un ejercicio.

**Fuera de alcance:**

- Cálculo de RM potencial (no persiste).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El ejercicio existe en el catálogo.

## Postcondiciones

- Existe un nuevo registro User_RM asociado al usuario y al ejercicio.

## Camino principal (flujo básico)

1. El usuario selecciona un ejercicio e ingresa peso, reps y fecha.
2. El sistema valida los datos.
3. El sistema crea el registro User_RM y confirma.
4. El nuevo RM queda disponible en "Mis RMs".

## Caminos alternativos / excepciones

### En el paso 2 — Datos inválidos

1. Peso/reps/fecha inválidos.
2. El sistema marca el error y no crea el registro.
