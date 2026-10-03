# CU-A-11 — Obtener Grupos Musculares

**Rol:** Admin  
**Paquete:** Administrar Músculos

## Descripción breve

Lista los grupos musculares disponibles, p. ej. para asignar un músculo a su grupo.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura del catálogo de Muscle_Group.

**Fuera de alcance:**

- Los músculos de cada grupo (CU «Obtener Músculos del Grupo Muscular»).

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El admin solicita el listado de grupos musculares.
2. El sistema recupera los Muscle_Group.
3. El sistema devuelve el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Catálogo vacío

1. No hay grupos cargados.
2. El sistema devuelve una colección vacía.
