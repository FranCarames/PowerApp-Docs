# CU-E-21 — Obtener Circuitos

**Rol:** Entrenador  
**Paquete:** Administrar Circuitos

## Descripción breve

Lista los circuitos activos disponibles como piezas reutilizables para armar rutinas.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Circuit con active = true, con su type.

**Fuera de alcance:**

- Circuitos dados de baja lógicamente (active = false).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre la sección de circuitos.
2. El sistema recupera los Circuit activos.
3. El sistema presenta el listado, pudiendo filtrar por type.

## Caminos alternativos / excepciones

### En el paso 2 — Sin circuitos

1. No hay circuitos activos.
2. El sistema muestra un estado vacío.
