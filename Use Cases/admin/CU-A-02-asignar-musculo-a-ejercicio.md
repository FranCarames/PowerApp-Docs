# CU-A-02 — Asignar Músculo a Ejercicio

**Rol:** Admin  
**Paquete:** Administrar Ejercicios

## Descripción breve

Crea la relación entre un ejercicio y un músculo mediante la tabla puente Exercised_Muscle.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un registro Exercised_Muscle (ejercicio ↔ músculo).

**Fuera de alcance:**

- Creación del ejercicio o del músculo.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El ejercicio y el músculo existen.

## Postcondiciones

- Existe la relación Exercised_Muscle entre el ejercicio y el músculo.

## Camino principal (flujo básico)

1. El admin indica un ejercicio y un músculo a vincular.
2. El sistema verifica que ambos existan y que no estén ya vinculados.
3. El sistema crea el Exercised_Muscle y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Relación ya existente

1. El músculo ya está asignado al ejercicio.
2. El sistema informa y no duplica la relación.

### En el paso 2 — Ejercicio o músculo inexistente

1. Alguno de los dos no existe.
2. El sistema informa el error y no crea la relación.
