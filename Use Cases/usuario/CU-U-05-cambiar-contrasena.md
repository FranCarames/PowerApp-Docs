# CU-U-05 — Cambiar contraseña

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Permite al usuario establecer una nueva contraseña, tanto de forma voluntaria como de forma obligatoria tras haber ingresado con una contraseña temporal.

## Actores involucrados

- **Principal:** Usuario autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Validación de la contraseña actual (o temporal).
- Persistencia del nuevo hash de contraseña.
- Limpieza de temp_password si aplica.

**Fuera de alcance:**

- Generación de contraseña temporal (ver "Recuperar contraseña").

## Precondiciones

- Existe una sesión activa con rol Usuario (puede haberse iniciado con temp_password).

## Postcondiciones

- La contraseña del User queda actualizada.
- temp_password queda anulada si la sesión provenía de una recuperación.

## Camino principal (flujo básico)

1. El usuario ingresa su contraseña actual (o temporal) y la nueva contraseña dos veces.
2. El sistema valida la contraseña actual y que la nueva cumpla los requisitos.
3. El sistema hashea y persiste la nueva contraseña y limpia temp_password si corresponde.
4. El sistema confirma el cambio.

## Caminos alternativos / excepciones

### En el paso 2 — Contraseña actual incorrecta

1. La contraseña actual no coincide.
2. El sistema informa el error y no actualiza nada.

### En el paso 2 — Confirmación no coincide o débil

1. Las dos nuevas contraseñas difieren o no cumplen requisitos.
2. El sistema marca el error y no persiste.
