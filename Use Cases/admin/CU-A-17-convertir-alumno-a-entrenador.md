# CU-A-17 — Convertir Alumno a Entrenador

**Rol:** Admin  
**Paquete:** Administrar Entrenadores

## Descripción breve

Promueve a un usuario alumno al rol de entrenador, creando su registro Coach con los datos profesionales. Con el mismo procedimiento se **reactiva** a un entrenador dado de baja (su registro Coach se actualiza y vuelve a estar activo) y se **editan** los datos profesionales de un entrenador activo (CU «Editar datos de entrenador»). El rol del usuario y el registro Coach se guardan juntos: o quedan los dos, o no cambia nada.

## Actores involucrados

- **Principal:** Admin (opera vía Postman)
- **Secundarios:** —

## Alcance

**Cubre:**

- Cambio de role del User a entrenador y alta del Coach asociado (coach_email, cuil, active).
- La reactivación de un entrenador dado de baja y la edición de sus datos profesionales, que usan el mismo procedimiento.

**Fuera de alcance:**

- Alta de un usuario desde cero (lo hace el propio usuario).
- Convertir en entrenador a un administrador.
- Convertir en entrenador una cuenta inactiva: primero se reactiva desde Usuarios.

## Precondiciones

- Existe una sesión activa con rol Admin.
- Existe el User a promover, no es un administrador y, si es un alumno, su cuenta está activa.

## Postcondiciones

- El User tiene rol entrenador y existe su registro Coach, activo y con el coach_email y el cuil indicados.
- Si la operación falla, ni el rol ni el Coach cambian.

## Camino principal (flujo básico)

1. El admin indica el usuario a promover y sus datos profesionales.
2. El sistema valida los datos (p. ej. cuil/coach_email) y que no pertenezcan a otro entrenador.
3. El sistema actualiza el role del User y crea el Coach, en una sola operación.
4. El sistema confirma la conversión.

## Caminos alternativos / excepciones

### En el paso 1 — El usuario no existe

1. El sistema informa que no se encontró el usuario y no realiza cambios.

### En el paso 1 — El usuario es un administrador

1. El usuario tiene rol administrador.
2. El sistema informa que un administrador no se puede convertir en entrenador y no realiza cambios: el administrador conserva su acceso.

### En el paso 1 — La cuenta del alumno está inactiva

1. El usuario es un alumno con la cuenta dada de baja.
2. El sistema informa que hay que reactivarla antes de convertirla y no realiza cambios. Un entrenador con la cuenta inactiva se sigue editando por CU-A-18: eso no cambia.

### En el paso 2 — Datos profesionales inválidos

1. Faltan o son inválidos coach_email/cuil.
2. El sistema rechaza la operación e informa.

### En el paso 2 — Email profesional o CUIL repetidos

1. El coach_email o el cuil ya pertenecen a otro entrenador. También cuenta un entrenador dado de baja.
2. El sistema informa cuál está repetido (el email, y si no, el CUIL) y no realiza cambios: ni el rol ni el Coach.
3. El email o el CUIL del propio usuario no cuentan como repetidos.

### En el paso 3 — El entrenador estaba dado de baja

1. El usuario ya tiene un registro Coach, inactivo.
2. El sistema actualiza ese registro con los datos indicados, lo deja activo y devuelve al usuario al rol de entrenador.

### En el paso 3 — El usuario ya es un entrenador activo

1. El usuario ya tiene rol entrenador y su Coach está activo.
2. El sistema actualiza su coach_email y su cuil con los datos indicados (CU «Editar datos de entrenador»).

### En el paso 3 — Error al guardar

1. Falla el guardado, o dos altas con el mismo email o CUIL chocan al mismo tiempo.
2. El sistema no deja nada a medias: el rol del usuario y el Coach quedan como estaban. Si fue por un dato repetido, informa cuál; si no, informa el error.
