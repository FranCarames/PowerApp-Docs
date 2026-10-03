# Contexto del backend para la app iOS

> Lo que la app necesita saber del back y Swagger no muestra. Ante cualquier duda, manda el código de `power-app/src`.
> Este archivo se mantiene desde el repo del back: si algo de esto cambia allá, se actualiza acá.

## Contrato de la API

### Base y rutas

- **URL base:** `<host>/api/v1`.
  - Local: `http://localhost:3000/api/v1`. En el simulador, `localhost` es la Mac y no la PC con Windows.
  - Deploy: `https://powerapp-backend.onrender.com/api/v1`. Es free tier de Render: puede tardar cerca de un minuto en despertar, o estar caído con la base vencida.
- **Swagger:** en `/docs`, fuera del prefijo. Puede no coincidir con la respuesta real, porque los controllers usan `@Res()`: **la respuesta real es la que arma el service en `res.status(...).send(...)`**.
- **Módulos:** `users`, `coach`, `membership`, `muscles` (los grupos musculares van en `muscles/mg/…`), `exercise`, `planification`, `routine` (los circuitos van en `routine/circuit/…`) y `user_rm`.
- **Convenciones:**
  - Listado: `GET …/all`, y `…/all-plus` para el árbol completo.
  - Detalle: `GET …/:id`. En `users`, `coach`, `membership` y `muscles` es `…/get/:id`.
  - Alta: `POST …/create`.
  - Edición: `POST …/edit/:id`. Es POST, no PUT ni PATCH.
  - Baja lógica: `POST …/set-active/:id` con `{ "active": false }`. Con `true` se reactiva.
  - `DELETE` existe sólo en el catálogo (admin) y en los RMs.
- **Paginación:** sólo `GET /users/all` pagina (`{ data, total, page, limit, totalPages }`). El resto de los listados devuelve arrays.
- **Públicos, sin token:** registro, login, recuperación de contraseña y las lecturas del catálogo (`exercise/all`, `muscles/all`, `muscles/mg/all`…). `GET /exercise/:id` sí pide sesión.

### Autenticación y sesión

- **Token:** `POST /users/login` y `POST /users/register` devuelven el usuario en el body y el token **en el header `Authorization` de la respuesta** (`Bearer <jwt>`), no en el body.
- **JWT:** sólo identifica al usuario (`sub`), dura 365 días y no hay refresh. El rol (`user` | `coach` | `admin`) viene en el usuario, no en el token.
- **Logout:** `POST /users/logout` sólo confirma; el logout real es descartar el token.
- **Respuestas del guard** en requests autenticadas:
  - `401`: el token falta, es inválido o está vencido. La sesión murió.
  - `403` con `"La cuenta está deshabilitada."`: hay que cerrar la sesión.
  - `403` con `"Acceso denegado. Permisos insuficientes."`: el rol no alcanza. **No** cierra la sesión.
- **Errores del login:**
  - `401 { "error": "Credenciales inválidas" }`. No es una sesión vencida: el manejo global del 401 aplica sólo a requests autenticadas.
  - `403 { "error": "La cuenta está cerrada" }`.

### Requests y respuestas

- **Hay dos formatos de error:**
  - Los que arman los services: `{ "error": "…" }`.
  - Los de los guards y la validación: `{ "statusCode", "message", "error" }`. El texto útil está en `message`, que puede ser un string o un array de strings; `error` es sólo la frase HTTP.
- **Un campo de más en el body es un 400** (`forbidNonWhitelisted`). Los DTOs de request tienen que ser idénticos a los del back, y los opcionales en `nil` se omiten.
- **Las ediciones no se comportan igual en todos los endpoints.**
  - Algunas reemplazan todo. En `EditRoutineDto`, omitir `coach_note` la borra, y `circuits` es la lista completa: un ítem con `id` se conserva, uno sin `id` se crea y lo que no vuelve se da de baja.
  - Otras son parciales: `POST /users/edit` sólo toca lo que viene.
  - La descripción `@ApiProperty` de cada DTO documenta cuál es cuál.
- **Ids de vínculo:** en los detalles, varios `id` son del vínculo y no de la entidad. Son los que piden las ediciones y las bajas.
  - En `GET /routine/:id`, cada circuito trae el id de su `Routine_Circuit`.
  - En el detalle de un circuito, cada ejercicio trae el id de su `Routine_Exercise`.
  - En el detalle de una planificación, cada rutina trae el id de su `Routine_Asignation`.
- **Las claves del JSON mezclan convenciones.** Las columnas vienen en snake_case (`first_name`). `totalPages` y varias relaciones vienen en camelCase (`exercisedMuscles`, `routineCircuits`), pero no todas (`muscle_group`). Usá `CodingKeys` explícitas.
- **Fechas:**
  - Las columnas `timestamptz` vienen en ISO 8601 con milisegundos (`2026-08-27T23:07:12.345Z`).
  - Las columnas `date` vienen como `"yyyy-MM-dd"`: `start_date` y `end_date` de `User_Planification`, y `date` de `User_RM` y de `User_Routine`.
  - Las `date` son días calendario. Si se modelan como `Date` a medianoche UTC, en −03:00 se muestran un día antes. Se envían como `"yyyy-MM-dd"`.
- **UUIDs:** conviven los v4 (los genera la app) con los v5 (los del seed), así que no hay que validar la versión. El back compara los ids como strings (por ejemplo, en el check de dueño de los RMs): nunca mandes mayúsculas. `UUID().uuidString` las devuelve.
- **Números:** `weight` y `price` llegan como número JSON. Los límites de una serie son deliberados, no los "corrijas":

  | Campo | Rango |
  |---|---|
  | `set_count` | 1 a 20 |
  | `rep_count` | 1 a 1000 (por los aeróbicos) |
  | `weight` | hasta 1000 |
  | `rpe` | 1 a 10 |
  | `rir` | 0 a 10 |
  | `rm_perc` | 1 a 125 (por el trabajo supramáximo) |
- **Usuarios de prueba:** están en `Db Creator/dynamic_data.py`. No copies credenciales al repo iOS.

## Modelo de dominio

- **El diagrama (`Doc/PowerApp - Modelo DB.svg`) tiene 20 tablas:**
  - Usuarios y membresías: `User`, `Coach`, `Membership`, `Membership_Payment`.
  - Catálogo y RMs: `Muscle_Group`, `Muscle`, `Exercise`, `Exercised_Muscle`, `User_RM`.
  - Circuitos y rutinas: `Circuit`, `Routine_Exercise`, `Exercise_Set`, `Routine`, `Routine_Circuit`.
  - Planificaciones y ejecución: `Planification`, `Routine_Asignation`, `User_Planification`, `User_Routine`, `Routine_Exercise_Finished`, `Routine_Asignation_User`.

  Lo que está en `entities/ParaValidar/` no es parte del modelo.
- **`Coach` extiende a `User` 1:1:** comparten el id, y `Coach` suma `coach_email` y `cuil`.
- **`Circuit` es una pieza global reutilizable.** Entra en las rutinas a través de `Routine_Circuit`, con `order`, y puede repetirse dentro de una misma rutina. Dentro de un circuito, cada ejercicio aparece una sola vez.
- **Una fila de `Exercise_Set` es un bloque de series iguales** ("3×8"), no una serie.
- **"Hecho" es por ejercicio entero.** Una fila en `Routine_Exercise_Finished`, con su `user_note`, marca ese ejercicio como hecho en esa instancia de rutina. El tildado serie por serie es sólo UI y no se guarda.
- **`order` no significa lo mismo en todos lados:**
  - En `Routine_Circuit` se normaliza a 1..N, y el vínculo dado de baja queda con `order = null`.
  - En `Routine_Exercise` también se normaliza, pero el inactivo conserva su posición.
  - En `Routine_Asignation` es una etiqueta: puede tener huecos y duplicados, y se desempata por `created_at`.
- **Hay baja lógica (`active`) en 12 tablas.** Lo dado de baja puede seguir apareciendo donde está referenciado: por ejemplo, una rutina inactiva dentro de un plan.
- **El estado de membresía es derivado**, no se guarda: `active` | `expiring_soon` | `expired` | `no_payments`.
- **`User_Planification` es una planificación asignada a un alumno**, con `start_date`, `end_date` y `coach_note`. Al asignarla se derivan sus `User_Routine`, que son las instancias de rutina del alumno.
- **`Routine_Asignation_User` es post-MVP** (CU-E-19 y CU-E-20): se modela, pero no tiene endpoints.
- **CU sin endpoint:** si el Status marca un CU como 🔵 o ⬜, todavía no tiene contrato. No lo inventes.
- **Desvíos conocidos entre el diagrama y el back.** No son bugs:
  - `User.role` es un enum en el back y figura como Varchar en el dibujo.
  - `User.profile_picture` figura como Varchar(10) en el dibujo; en el back es de 150.
  - En el back, `Routine_Asignation_User` tiene `routine_asignation_id` y `order`, que el diagrama no tiene.
