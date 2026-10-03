# CU-U-09 — Ver detalle de Rutina

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Muestra los circuitos y ejercicios que componen una rutina asignada al usuario, como punto de partida para ejecutarla.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Casos de uso incluidos («include»)

- Ver detalle de un ejercicio

## Alcance

**Cubre:**

- Listado ordenado de circuitos de la rutina y, dentro de cada uno, sus ejercicios.
- Acceso al detalle de cada ejercicio.

**Fuera de alcance:**

- Edición de la rutina (es competencia del Entrenador).

## Precondiciones

- Existe una sesión activa con rol Usuario.
- La rutina pertenece a una asignación vigente del usuario (User_Routine o vía puntual).

## Postcondiciones

- Operación de solo lectura sobre la estructura de la rutina.

## Camino principal (flujo básico)

1. El usuario selecciona una rutina desde su planificación.
2. El sistema recupera los circuitos de la rutina (Routine_Circuit) en su orden.
3. Para cada circuito, recupera sus ejercicios (Routine_Exercise) con series.
4. El sistema presenta la estructura completa y permite abrir el detalle de cada ejercicio (<<include>> Ver detalle de un ejercicio).

## Caminos alternativos / excepciones

### En el paso 1 — Rutina no asignada al usuario

1. La rutina no corresponde a una asignación vigente del usuario.
2. El sistema deniega el acceso.
