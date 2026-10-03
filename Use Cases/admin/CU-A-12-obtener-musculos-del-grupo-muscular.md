# CU-A-12 — Obtener Músculos del Grupo Muscular

**Rol:** Admin  
**Paquete:** Administrar Grupos Musculares

## Descripción breve

Lista los músculos que pertenecen a un grupo muscular determinado.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Muscle asociados a un Muscle_Group puntual.

**Fuera de alcance:**

- Edición de los músculos.

## Precondiciones

- Existe una sesión activa con rol Admin.
- El grupo muscular existe.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El admin indica un grupo muscular.
2. El sistema recupera los Muscle de ese grupo.
3. El sistema devuelve el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Grupo sin músculos

1. El grupo no tiene músculos asociados.
2. El sistema devuelve una colección vacía.
