# CU-U-01 — Registrar Usuario

**Rol:** Usuario  
**Paquete:** Administrar Mi Cuenta

## Descripción breve

Permite a una persona crear una cuenta de alumno en PowerApp, generando un registro User con rol "usuario" antes de poder iniciar sesión por primera vez.

## Actores involucrados

- **Principal:** Visitante (persona no autenticada)
- **Secundarios:** —

## Alcance

**Cubre:**

- Alta de credenciales y datos personales mínimos.
- Creación del registro User con role = usuario.

**Fuera de alcance:**

- Asignación de planificaciones o rutinas (lo realiza el Entrenador).
- Registro de pago o alta de membresía.
- Conversión a entrenador (rol Admin).

## Precondiciones

- No existe una sesión activa.
- El email ingresado no está registrado previamente en el sistema.

## Postcondiciones

- Existe un nuevo registro User con role = usuario y credenciales válidas.
- La persona puede iniciar sesión con dichas credenciales.

## Camino principal (flujo básico)

1. El visitante abre la pantalla de registro.
2. Ingresa sus datos personales (nombre, email, contraseña).
3. El sistema valida el formato de los datos y la unicidad del email.
4. El sistema hashea la contraseña y persiste un nuevo registro User con role = usuario.
5. El sistema confirma el alta y redirige a la pantalla de login.

## Caminos alternativos / excepciones

### En el paso 3 — Email ya registrado

1. El sistema detecta que el email ya existe.
2. Informa que el email está en uso y ofrece iniciar sesión o recuperar contraseña.
3. No se crea la cuenta.

### En el paso 3 — Datos inválidos

1. Formato de email/contraseña inválido o campos obligatorios faltantes.
2. El sistema marca los errores en el formulario y no persiste nada.

### En el paso 4 — Error de persistencia

1. Falla al guardar en la base de datos.
2. El sistema informa el error y la cuenta no queda creada.
