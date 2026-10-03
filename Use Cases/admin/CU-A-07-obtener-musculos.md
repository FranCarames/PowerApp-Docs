# CU-A-07 — Obtener Músculos

**Rol:** Admin  
**Paquete:** Administrar Músculos

## Descripción breve

Lista los músculos del catálogo, cada uno perteneciente a un grupo muscular.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura del catálogo de Muscle con su Muscle_Group.

**Fuera de alcance:**

- Edición de músculos (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El admin solicita el listado de músculos.
2. El sistema recupera los Muscle con su grupo asociado.
3. El sistema devuelve el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Catálogo vacío

1. No hay músculos cargados.
2. El sistema devuelve una colección vacía.
