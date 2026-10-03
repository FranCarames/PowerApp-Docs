# CU-A-03 — Desasignar Músculo de Ejercicio

**Rol:** Admin  
**Paquete:** Administrar Ejercicios

## Descripción breve

Elimina la relación entre un ejercicio y un músculo, quitando el registro Exercised_Muscle.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja de un registro Exercised_Muscle (ejercicio ↔ músculo).

**Fuera de alcance:**

- Baja del ejercicio o del músculo.

## Precondiciones

- Existe una sesión activa con rol Admin.
- Existe la relación Exercised_Muscle entre el ejercicio y el músculo.

## Postcondiciones

- La relación Exercised_Muscle deja de existir.

## Camino principal (flujo básico)

1. El admin indica un ejercicio y un músculo a desvincular.
2. El sistema localiza el Exercised_Muscle y lo elimina.
3. El sistema confirma la baja de la relación.

## Caminos alternativos / excepciones

### En el paso 2 — Relación inexistente

1. El músculo no estaba asignado al ejercicio.
2. El sistema informa que no hay nada que desasignar.
