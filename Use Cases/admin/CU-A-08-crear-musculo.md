# CU-A-08 — Crear Músculo

**Rol:** Admin  
**Paquete:** Administrar Músculos

## Descripción breve

Da de alta un músculo y lo asocia a un grupo muscular existente.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Muscle vinculado a un Muscle_Group.

**Fuera de alcance:**

- Creación del grupo muscular (CU aparte).

## Precondiciones

- Existe una sesión activa con rol Admin.
- El grupo muscular indicado existe.

## Postcondiciones

- Existe un nuevo Muscle asociado a su grupo.

## Camino principal (flujo básico)

1. El admin envía el nombre del músculo y su grupo muscular.
2. El sistema valida los datos y la existencia del grupo.
3. El sistema crea el Muscle y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Grupo inexistente o datos inválidos

1. El grupo muscular no existe o faltan datos.
2. El sistema rechaza la operación e informa.
