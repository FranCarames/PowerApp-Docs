# CU-U-19 — Obtener mis RMs

**Rol:** Usuario  
**Paquete:** Administrar Mis RMs

## Descripción breve

Lista todos los RM registrados del usuario a través de sus distintos ejercicios.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Lectura del conjunto de User_RM del usuario.

**Fuera de alcance:**

- RM potenciales (no persistidos).

## Precondiciones

- Existe una sesión activa con rol Usuario.

## Postcondiciones

- Operación de solo lectura.

## Camino principal (flujo básico)

1. El usuario abre la sección "Mis RMs".
2. El sistema recupera todos los User_RM del usuario.
3. El sistema los presenta agrupados/ordenados por ejercicio y fecha.

## Caminos alternativos / excepciones

### En el paso 2 — Sin RMs

1. El usuario no tiene RMs registrados.
2. El sistema muestra un estado vacío.
