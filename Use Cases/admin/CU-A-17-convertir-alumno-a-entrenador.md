# CU-A-17 — Convertir Alumno a Entrenador

**Rol:** Admin  
**Paquete:** Administrar Entrenadores

## Descripción breve

Promueve a un usuario alumno al rol de entrenador, creando su registro Coach con los datos profesionales.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Cambio de role del User a entrenador y alta del Coach asociado (coach_email, cuil, active).

**Fuera de alcance:**

- Alta de un usuario desde cero (lo hace el propio usuario).

## Precondiciones

- Existe una sesión activa con rol Admin.
- Existe un User con role = usuario a promover.

## Postcondiciones

- El User pasa a rol entrenador y existe su registro Coach.

## Camino principal (flujo básico)

1. El admin indica el alumno a promover y sus datos profesionales.
2. El sistema valida los datos (p. ej. cuil/coach_email).
3. El sistema actualiza el role del User y crea el Coach.
4. El sistema confirma la conversión.

## Caminos alternativos / excepciones

### En el paso 1 — Ya es entrenador

1. El usuario ya tiene rol entrenador.
2. El sistema informa y no realiza cambios.

### En el paso 2 — Datos profesionales inválidos

1. Faltan o son inválidos coach_email/cuil.
2. El sistema rechaza la operación e informa.
