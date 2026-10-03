# CU-A-19 — Eliminar Entrenador

**Rol:** Admin  
**Paquete:** Administrar Entrenadores

## Descripción breve

Da de baja a un entrenador, respetando la integridad referencial con sus alumnos y contenidos.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Baja del Coach (p. ej. active = false) según la política definida.

**Fuera de alcance:**

- Baja del contenido creado por el entrenador (circuitos, rutinas, planificaciones).

## Precondiciones

- Existe una sesión activa con rol Admin.
- El Coach existe.

## Postcondiciones

- El entrenador queda dado de baja según la política de integridad.

## Camino principal (flujo básico)

1. El admin solicita eliminar un entrenador.
2. El sistema verifica las dependencias (alumnos, contenidos).
3. El sistema aplica la baja (lógica o física según política) y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Entrenador con dependencias

1. El entrenador tiene alumnos o contenidos asociados.
2. El sistema aplica baja lógica o impide la baja según la política e informa.

### En el paso 1 — Entrenador inexistente

1. El entrenador no existe.
2. El sistema informa que no hay nada que eliminar.
