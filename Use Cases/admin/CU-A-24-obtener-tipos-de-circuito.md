# CU-A-24 — Obtener Tipos de Circuito

**Rol:** Admin  
**Paquete:** Administrar Tipos de Circuito

## Descripción breve

Lista los tipos de circuito definidos en el sistema, con cuántos circuitos activos usa cada uno, y permite buscarlos por nombre. De entrada muestra sólo los activos; los dados de baja se ven a pedido. Los tipos clasifican los circuitos: el Entrenador elige uno al armar cada circuito ([`CU-E-22`](../entrenador/CU-E-22-crear-circuito.md), [`CU-E-23`](../entrenador/CU-E-23-editar-circuito.md)) y filtra con ellos el listado ([`CU-E-21`](../entrenador/CU-E-21-obtener-circuitos.md)).

## Actores involucrados

- **Principal:** Admin autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura de los Circuit_Type (type, description, active), activos y dados de baja.
- La cantidad de Circuit **activos** que usa cada tipo.
- La búsqueda por nombre y el filtro que suma los tipos dados de baja.

**Fuera de alcance:**

- Los circuitos en sí ([`CU-E-21`](../entrenador/CU-E-21-obtener-circuitos.md)).
- La lectura que hace el Entrenador para elegir un tipo al armar un circuito: es la misma operación, pero sólo con los tipos activos, y forma parte de `CU-E-22` y `CU-E-23`.

## Precondiciones

- Existe una sesión activa con rol Admin.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El admin abre Configuración › Tipos de circuito.
2. El sistema recupera los Circuit_Type, activos y dados de baja, y cuenta los circuitos activos de cada uno.
3. El sistema presenta los tipos **activos** por orden alfabético, cada uno con su nombre, su descripción (si tiene) y cuántos circuitos activos lo usan.
4. Opcionalmente, el admin busca por nombre: el sistema deja sólo los tipos cuyo nombre contiene lo escrito, sin distinguir mayúsculas ni tildes. La búsqueda no mira la descripción.
5. Opcionalmente, el admin pide ver también los dados de baja (el filtro de inactivos): el sistema los suma después de los activos, también por orden alfabético y marcados como inactivos. La búsqueda y el filtro se combinan.

## Caminos alternativos / excepciones

### En el paso 2 — Sin tipos definidos

1. No hay ningún tipo de circuito.
2. El sistema muestra un estado vacío que invita a crear el primero ([`CU-A-25`](CU-A-25-crear-tipo-de-circuito.md)), y avisa que sin un tipo activo no se pueden crear circuitos.

### En el paso 3 — Todos los tipos están dados de baja

1. Hay tipos, pero ninguno activo, y el admin no buscó nada ni pidió ver los dados de baja.
2. El sistema avisa que todos están dados de baja y que con el filtro de inactivos se ven.

### En los pasos 4 y 5 — Sin coincidencias

1. Ningún tipo de los que se ven coincide con la búsqueda.
2. El sistema informa que no hay coincidencias. Si algún tipo dado de baja coincide y el filtro de inactivos está apagado, avisa que con ese filtro se ven también los dados de baja.

## Reglas

1. **Quién los administra.** Sólo el Admin crea, edita, da de baja y reactiva tipos (`CU-A-25` a `CU-A-27`). El Entrenador los lee —para elegir uno y para filtrar— pero no tiene esta pantalla.
2. **Qué cuenta el número.** «N circuitos» cuenta los circuitos **activos** que tienen ese tipo. Los circuitos dados de baja ([`CU-E-24`](../entrenador/CU-E-24-eliminar-circuito-logico.md)) no suman, aunque conserven el tipo.
3. **Qué se ve.** Los tipos dados de baja se ven sólo con el filtro de inactivos: dar de baja un tipo con el filtro apagado lo saca del listado ([`CU-A-27`](CU-A-27-eliminar-tipo-de-circuito.md)), y para editarlo o reactivarlo se prende el filtro.
