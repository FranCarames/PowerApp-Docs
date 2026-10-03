# CU-A-13 — Crear Grupo Muscular

**Rol:** Admin  
**Paquete:** Administrar Grupos Musculares

## Descripción breve

Da de alta un grupo muscular en el catálogo.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de un Muscle_Group.

**Fuera de alcance:**

- Alta de los músculos del grupo.

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Existe un nuevo Muscle_Group.

## Camino principal (flujo básico)

1. El admin envía el nombre del grupo muscular.
2. El sistema valida los datos (nombre obligatorio y único).
3. El sistema crea el Muscle_Group y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Datos inválidos o nombre duplicado

1. Faltan datos o el nombre ya existe.
2. El sistema rechaza la operación e informa.
