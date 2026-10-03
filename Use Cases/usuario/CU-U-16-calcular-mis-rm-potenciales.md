# CU-U-16 — Calcular mis RM potenciales

**Rol:** Usuario  
**Paquete:** Administrar Mis RMs

## Descripción breve

Estima los RM potenciales del usuario aplicando la fórmula de Epley sobre datos de peso y repeticiones. El resultado NO se persiste en la base de datos.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Cálculo de RM estimado con fórmula de Epley a partir de peso y reps.

**Fuera de alcance:**

- Persistencia del resultado (es un cálculo efímero).
- Registro de RM real (CU "Registrar un RM").

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- No hay cambios en la base de datos: el RM potencial es un valor calculado y volátil.

## Camino principal (flujo básico)

1. El usuario ingresa peso y repeticiones (o el sistema los toma de una serie ejecutada).
2. El sistema aplica la fórmula de Epley para estimar el RM potencial.
3. El sistema muestra el RM estimado, indicando que no se guarda.

## Caminos alternativos / excepciones

### En el paso 1 — Datos inválidos

1. Peso o reps no válidos (cero, negativos o no numéricos).
2. El sistema marca el error y no calcula.
