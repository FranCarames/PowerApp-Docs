# PowerApp — Especificaciones de Casos de Uso

Índice de casos de uso (75 en total). Un archivo Markdown por CU.

> **CU-E-12** es un caso de uso **agrupador**: no se cuenta a sí mismo, sino sus cuatro operaciones anidadas (`CU-E-12a` a `CU-E-12d`), que sí figuran en el total.

## Rol Usuario


### Administrar Mi Cuenta

- [`CU-U-01` Registrar Usuario](usuario/CU-U-01-registrar-usuario.md)
- [`CU-U-02` Login](usuario/CU-U-02-login.md)
- [`CU-U-03` Cerrar sesión](usuario/CU-U-03-cerrar-sesion.md)
- [`CU-U-04` Recuperar contraseña](usuario/CU-U-04-recuperar-contrasena.md)
- [`CU-U-05` Cambiar contraseña](usuario/CU-U-05-cambiar-contrasena.md)
- [`CU-U-06` Editar datos personales](usuario/CU-U-06-editar-datos-personales.md)
- [`CU-U-07` Obtener historial de pagos](usuario/CU-U-07-obtener-historial-de-pagos.md)

### Mi Entrenamiento

- [`CU-U-08` Obtener mi Planificación](usuario/CU-U-08-obtener-mi-planificacion.md)
- [`CU-U-09` Ver detalle de Rutina](usuario/CU-U-09-ver-detalle-de-rutina.md)
- [`CU-U-10` Ver detalle de un ejercicio](usuario/CU-U-10-ver-detalle-de-un-ejercicio.md)
- [`CU-U-11` Ver mis RMs de un ejercicio](usuario/CU-U-11-ver-mis-rms-de-un-ejercicio.md)
- [`CU-U-12` Marcar serie como realizado](usuario/CU-U-12-marcar-serie-como-realizado.md)
- [`CU-U-13` Dejar una nota en el ejercicio](usuario/CU-U-13-dejar-una-nota-en-el-ejercicio.md)
- [`CU-U-14` Temporizador](usuario/CU-U-14-temporizador.md)
- [`CU-U-15` Consultar wiki de ejercicios](usuario/CU-U-15-consultar-wiki-de-ejercicios.md)

### Administrar Mis RMs

- [`CU-U-16` Calcular mis RM potenciales](usuario/CU-U-16-calcular-mis-rm-potenciales.md)
- [`CU-U-17` Registrar un RM](usuario/CU-U-17-registrar-un-rm.md)
- [`CU-U-18` Editar un RM](usuario/CU-U-18-editar-un-rm.md)
- [`CU-U-19` Obtener mis RMs](usuario/CU-U-19-obtener-mis-rms.md)
- [`CU-U-20` Eliminar un RM](usuario/CU-U-20-eliminar-un-rm.md)

## Rol Entrenador


### Administrar Alumnos

- [`CU-E-01` Obtener alumnos](entrenador/CU-E-01-obtener-alumnos.md)
- [`CU-E-02` Obtener alumnos — Filtro por nombre](entrenador/CU-E-02-obtener-alumnos-filtro-por-nombre.md)
- [`CU-E-03` Cerrar cuenta de alumno](entrenador/CU-E-03-cerrar-cuenta-de-alumno.md)
- [`CU-E-04` Obtener RMs del alumno](entrenador/CU-E-04-obtener-rms-del-alumno.md)
- [`CU-E-05` Consultar historial de pagos de alumno](entrenador/CU-E-05-consultar-historial-de-pagos-de-alumno.md)
- [`CU-E-06` Consultar historial de entrenamientos de alumno](entrenador/CU-E-06-consultar-historial-de-entrenamientos-de-alumno.md)
- [`CU-E-07` Consultar historial de entrenamientos — Filtro por ejercicio](entrenador/CU-E-07-consultar-historial-de-entrenamientos-filtro-por-ejercicio.md)

### Administrar Planificaciones

- [`CU-E-08` Obtener Planificaciones Sistémicas](entrenador/CU-E-08-obtener-planificaciones-sistemicas.md)
- [`CU-E-09` Crear Planificación Sistémica](entrenador/CU-E-09-crear-planificacion-sistemica.md)
- [`CU-E-10` Editar Planificación Sistémica](entrenador/CU-E-10-editar-planificacion-sistemica.md)
- [`CU-E-11` Eliminar Planificación Sistémica](entrenador/CU-E-11-eliminar-planificacion-sistemica.md)
- [`CU-E-12` Gestionar Rutinas de una Planificación Sistémica](entrenador/CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md) — *agrupador*
    - [`CU-E-12a` Asignar una Rutina a una Planificación Sistémica](entrenador/CU-E-12a-asignar-rutina-a-planificacion.md)
    - [`CU-E-12b` Asignar Rutinas en Lote a una Planificación Sistémica](entrenador/CU-E-12b-asignar-rutinas-en-lote-a-planificacion.md)
    - [`CU-E-12c` Quitar o Reincorporar una Rutina (Lógico)](entrenador/CU-E-12c-quitar-rutina-de-planificacion.md)
    - [`CU-E-12d` Quitar o Reincorporar Rutinas en Lote (Lógico)](entrenador/CU-E-12d-quitar-rutinas-en-lote-de-planificacion.md)
- [`CU-E-13` Asignar Planificación a Alumno](entrenador/CU-E-13-asignar-planificacion-a-alumno.md)
- [`CU-E-14` Eliminar Planificación a Alumno (Lógico)](entrenador/CU-E-14-eliminar-planificacion-a-alumno.md)

### Administrar Rutinas

- [`CU-E-15` Obtener Rutinas Sistémicas](entrenador/CU-E-15-obtener-rutinas-sistemicas.md)
- [`CU-E-16` Crear Rutina Sistémica](entrenador/CU-E-16-crear-rutina-sistemica.md)
- [`CU-E-17` Editar Rutina Sistémica](entrenador/CU-E-17-editar-rutina-sistemica.md)
- [`CU-E-18` Eliminar Rutina Sistémica](entrenador/CU-E-18-eliminar-rutina-sistemica.md)
- [`CU-E-19` Asignar Rutina a Alumno](entrenador/CU-E-19-asignar-rutina-a-alumno.md)
- [`CU-E-20` Eliminar Rutina a Alumno](entrenador/CU-E-20-eliminar-rutina-a-alumno.md)

### Administrar Circuitos

- [`CU-E-21` Obtener Circuitos](entrenador/CU-E-21-obtener-circuitos.md)
- [`CU-E-22` Crear Circuito](entrenador/CU-E-22-crear-circuito.md)
- [`CU-E-23` Editar Circuito](entrenador/CU-E-23-editar-circuito.md)
- [`CU-E-24` Eliminar Circuito (Lógico)](entrenador/CU-E-24-eliminar-circuito-logico.md)

### Gestionar Membresías

- [`CU-E-25` Obtener Membresías](entrenador/CU-E-25-obtener-membresias.md)
- [`CU-E-26` Obtener estado de membresías](entrenador/CU-E-26-obtener-estado-de-membresias.md)
- [`CU-E-27` Obtener alumnos por estado de membresía](entrenador/CU-E-27-obtener-alumnos-por-estado-de-membresia.md)
- [`CU-E-28` Obtener alumnos por tipo de membresía](entrenador/CU-E-28-obtener-alumnos-por-tipo-de-membresia.md)
- [`CU-E-29` Registrar pago de alumno](entrenador/CU-E-29-registrar-pago-de-alumno.md)

## Rol Admin


### Administrar Ejercicios

- [`CU-A-01` Obtener Ejercicios](admin/CU-A-01-obtener-ejercicios.md)
- [`CU-A-02` Asignar Músculo a Ejercicio](admin/CU-A-02-asignar-musculo-a-ejercicio.md)
- [`CU-A-03` Desasignar Músculo de Ejercicio](admin/CU-A-03-desasignar-musculo-de-ejercicio.md)
- [`CU-A-04` Crear Ejercicio](admin/CU-A-04-crear-ejercicio.md)
- [`CU-A-05` Editar Ejercicio](admin/CU-A-05-editar-ejercicio.md)
- [`CU-A-06` Eliminar Ejercicio](admin/CU-A-06-eliminar-ejercicio.md)

### Administrar Músculos

- [`CU-A-07` Obtener Músculos](admin/CU-A-07-obtener-musculos.md)
- [`CU-A-08` Crear Músculo](admin/CU-A-08-crear-musculo.md)
- [`CU-A-09` Editar Músculo](admin/CU-A-09-editar-musculo.md)
- [`CU-A-10` Eliminar Músculo](admin/CU-A-10-eliminar-musculo.md)
- [`CU-A-11` Obtener Grupos Musculares](admin/CU-A-11-obtener-grupos-musculares.md)

### Administrar Grupos Musculares

- [`CU-A-12` Obtener Músculos del Grupo Muscular](admin/CU-A-12-obtener-musculos-del-grupo-muscular.md)
- [`CU-A-13` Crear Grupo Muscular](admin/CU-A-13-crear-grupo-muscular.md)
- [`CU-A-14` Editar Grupo Muscular](admin/CU-A-14-editar-grupo-muscular.md)
- [`CU-A-15` Eliminar Grupo Muscular](admin/CU-A-15-eliminar-grupo-muscular.md)

### Administrar Entrenadores

- [`CU-A-16` Obtener Entrenadores](admin/CU-A-16-obtener-entrenadores.md)
- [`CU-A-17` Convertir Alumno a Entrenador](admin/CU-A-17-convertir-alumno-a-entrenador.md)
- [`CU-A-18` Editar datos de entrenador](admin/CU-A-18-editar-datos-de-entrenador.md)
- [`CU-A-19` Eliminar Entrenador](admin/CU-A-19-eliminar-entrenador.md)

### Administrar Membresías (Tipos)

- [`CU-A-20` Obtener Membresías](admin/CU-A-20-obtener-membresias.md)
- [`CU-A-21` Crear Membresía](admin/CU-A-21-crear-membresia.md)
- [`CU-A-22` Editar Membresía](admin/CU-A-22-editar-membresia.md)
- [`CU-A-23` Eliminar Membresía](admin/CU-A-23-eliminar-membresia.md)
