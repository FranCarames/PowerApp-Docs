# CU-A-01 — Obtener Ejercicios

**Rol:** Admin  
**Paquete:** Administrar Ejercicios

## Descripción breve

Lista los ejercicios del catálogo global, punto de entrada para administrarlos y gestionar su relación con músculos.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Asignar Músculo a Ejercicio
- Desasignar Músculo de Ejercicio

## Alcance

**Cubre:**

- Lectura del catálogo de Exercise con sus datos y músculos asociados.

**Fuera de alcance:**

- Edición de la definición del ejercicio (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El admin solicita el listado de ejercicios.
2. El sistema recupera los Exercise del catálogo con sus músculos (Exercised_Muscle).
3. El sistema devuelve el listado, desde el cual se puede asignar o desasignar músculos.

## Caminos alternativos / excepciones

### En el paso 2 — Catálogo vacío

1. No hay ejercicios cargados.
2. El sistema devuelve una colección vacía.
