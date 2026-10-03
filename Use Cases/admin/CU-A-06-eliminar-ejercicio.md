# CU-A-06 — Eliminar Ejercicio

**Rol:** Admin  
**Paquete:** Administrar Ejercicios

## Descripción breve

Elimina un ejercicio del catálogo, respetando la integridad referencial (no se elimina un ejercicio en uso).

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja del Exercise seleccionado y de sus relaciones Exercised_Muscle.

**Fuera de alcance:**

- Baja de circuitos o rutinas que lo referencian.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Exercise existe.

## Postcondiciones

- El Exercise deja de existir, siempre que no esté en uso.

## Camino principal (flujo básico)

1. El admin solicita eliminar un ejercicio.
2. El sistema verifica que el ejercicio no esté en uso en circuitos/rutinas.
3. El sistema elimina el Exercise y sus relaciones, y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Ejercicio en uso

1. El ejercicio está referenciado por circuitos o rutinas.
2. El sistema impide la baja e informa la restricción de integridad.

### En el paso 1 — Ejercicio inexistente

1. El ejercicio no existe.
2. El sistema informa que no hay nada que eliminar.
