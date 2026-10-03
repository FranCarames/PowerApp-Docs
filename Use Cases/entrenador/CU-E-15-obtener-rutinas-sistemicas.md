# CU-E-15 — Obtener Rutinas Sistémicas

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Lista las rutinas sistémicas disponibles para el entrenador.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura del catálogo de Routine sistémicas **activas** (active = true).

**Fuera de alcance:**

- Las rutinas dadas de baja lógicamente (active = false).
- Las rutinas instanciadas a alumnos (User_Routine).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre la sección de rutinas.
2. El sistema recupera las Routine sistémicas.
3. El sistema presenta el listado.

## Caminos alternativos / excepciones

### En el paso 2 — Sin rutinas

1. No hay rutinas creadas.
2. El sistema muestra un estado vacío.
