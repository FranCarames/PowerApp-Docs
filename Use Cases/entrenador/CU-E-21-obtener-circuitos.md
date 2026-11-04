# CU-E-21 — Obtener Circuitos

**Rol:** Entrenador  
**Paquete:** Administrar Circuitos

## Descripción breve

Lista los circuitos activos disponibles como piezas reutilizables para armar rutinas, cada uno con su tipo, y permite filtrarlos por tipo.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Circuit con active = true, cada uno con su Circuit_Type (el nombre del tipo y si está activo).
- El filtro por tipo: uno por cada Circuit_Type que tengan los circuitos del listado, incluidos los tipos dados de baja que algún circuito conserve.

**Fuera de alcance:**

- Circuitos dados de baja lógicamente (active = false).
- Administrar los tipos de circuito: crearlos, editarlos, darlos de baja o reactivarlos es del Admin ([`CU-A-24`](../admin/CU-A-24-obtener-tipos-de-circuito.md) a [`CU-A-27`](../admin/CU-A-27-eliminar-tipo-de-circuito.md)).

## Precondiciones

- Existe una sesión activa con rol Entrenador.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El entrenador abre la sección de circuitos.
2. El sistema recupera los Circuit activos, cada uno con su Circuit_Type.
3. El sistema presenta el listado, cada circuito con el nombre de su tipo, y permite filtrarlo por tipo: ofrece un filtro por cada Circuit_Type que tengan los circuitos del listado —por orden alfabético, más uno para ver todos— y, al elegir uno, muestra sólo los circuitos de ese tipo.

## Caminos alternativos / excepciones

### En el paso 2 — Sin circuitos

1. No hay circuitos activos.
2. El sistema muestra un estado vacío, sin filtro por tipo.

### En el paso 3 — El tipo elegido ya no está en el listado

1. El filtro elegido (por ejemplo, el que venía en un enlace) es de un tipo que ningún circuito del listado tiene.
2. El sistema muestra todos los circuitos, como si no hubiera filtro.
