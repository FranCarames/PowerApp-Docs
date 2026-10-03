# CU-E-08 — Obtener Planificaciones Sistémicas

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Lista las planificaciones sistémicas (plantillas) disponibles para el entrenador.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura del catálogo de Planification sistémicas **activas** (active = true).

**Fuera de alcance:**

- Las planificaciones dadas de baja lógicamente (active = false).
- Las planificaciones asignadas a alumnos (User_Planification).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre la sección de planificaciones.
2. El sistema recupera las Planification sistémicas.
3. El sistema presenta el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Sin planificaciones

1. No hay planificaciones creadas.
2. El sistema muestra un estado vacío.
