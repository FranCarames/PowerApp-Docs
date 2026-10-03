# CU-U-14 — Temporizador

**Rol:** Usuario  
**Paquete:** Mi Entrenamiento

## Descripción breve

Ofrece un temporizador de descanso entre series durante la ejecución del entrenamiento.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Conteo regresivo de descanso en el cliente, con inicio/pausa/reinicio.

**Fuera de alcance:**

- Persistencia del tiempo de descanso en la base de datos.

## Precondiciones

- Existe una sesión activa con rol Usuario.
- El usuario está ejecutando una rutina.

## Postcondiciones

- No hay cambios persistentes; es una utilidad de ejecución en el cliente.

## Camino principal (flujo básico)

1. El usuario inicia el temporizador al terminar una serie.
2. El cliente realiza el conteo regresivo del descanso.
3. Al llegar a cero, el cliente notifica que el descanso terminó.

## Caminos alternativos / excepciones

### En el paso 2 — Pausa / reinicio

1. El usuario pausa o reinicia el temporizador.
2. El cliente ajusta el conteo en consecuencia.
