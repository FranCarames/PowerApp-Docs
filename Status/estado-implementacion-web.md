# PowerApp Web — Estado de implementación vs. Casos de Uso

> **Corte:** 2026-10-10 · **Fuente:** `Use Cases/` de PowerApp-Docs comparado contra `PowerApp-Web` (`main` en `b69a477`, `develop` en `ff3ebe2`) y `PLAN.md` v1.3
> **Método:** mapeo 1:1 de los 75 CU contra las rutas, pantallas, hooks y el registry de mocks del front. Un CU cuenta como implementado si su pantalla existe, está en la navegación y llama al endpoint real; lo que el backend todavía no tiene queda como mock o placeholder.

## Resumen

| Estado | CU | % | Significado |
|---|---:|---:|---|
| ✅ Implementado | 49 | 65% | Pantalla en la navegación, conectada al endpoint real |
| 🟡 Parcial | 2 | 3% | Pantalla hecha, pero una parte depende de algo que el backend no tiene |
| 🔵 Placeholder | 14 | 19% | Ruta o sección con el aviso «Pantalla en construcción» |
| ⬜ No implementado | 10 | 13% | Sin pantalla ni ruta |
| **Total** | **75** | | |

**51 de 75 CU con pantalla funcional (✅ + 🟡, ~68%).** Los otros 24 son trabajo pendiente (placeholder + no implementado).

**35 de 49 tareas** del plan hechas (T01 a T20, T26 a T37 y T46 a T48). Quedan ≈25,5 h estimadas en `PLAN.md`: 10,5 h de contratos, 13 h del bloque C2, 2 h de T44 (mocks a real).

> **Nota (10/10):** no hay nada del corte sin liberar: `main` (`b69a477`) y `develop` (`ff3ebe2`) tienen el mismo código, y ninguna tarea tiene un PR abierto.
>
> **Nota:** ✅ quiere decir «hecho contra el contrato», no «probado contra el backend real» (ver el hallazgo sobre verificación).
>
> **Nota:** `CU-E-12` es un CU **agrupador** y no se cuenta a sí mismo; cuentan sus cuatro operaciones (`CU-E-12a` a `CU-E-12d`), igual que en el status del backend.

### Cobertura por rol

| Rol | CU | ✅ | 🟡 | 🔵 | ⬜ | % implementado |
|---|---:|---:|---:|---:|---:|---:|
| Usuario | 20 | 13 | 1 | 1 | 5 | 65% |
| Entrenador | 32 | 14 | 0 | 13 | 5 | 44% |
| Admin | 23 | 22 | 1 | 0 | 0 | 96% |

## Cambios recientes

### 2026-10-12 · ejercicios y membresías: errores con motivo del backend, y un fix del detalle

- **El backend cambió su contrato** en cuatro endpoints y el front lo sigue (rama `fix/mensajes-error-baja-ejercicio`, sin mergear). `DELETE /exercise/{id}` ya no borra un ejercicio en circuitos, ya entrenado o con RMs registrados (antes se llevaba los RMs y lo sacaba de los circuitos, o caía en un 500): responde **409 con el motivo** y el front muestra un aviso por cada uno. **CU-A-06 pasa a cumplirse como está escrito.** El alta y la edición de ejercicios y de tipos de membresía responden 409 por un nombre repetido; la edición de membresía suma el 400 por duración repetida.
- **V7 sigue vigente** para músculos, grupos y entrenadores: su backend no cambió y siguen con el 500 genérico.
- **No probado contra el backend real:** el cambio puede no estar desplegado todavía en Render. Se verificó en el navegador con los mocks, que ahora tienen un ejercicio por cada motivo.
- **Fix del detalle de ejercicio** (PR #50, en `develop`): `GET /exercise/{id}` no aplana `exercisedMuscles` como el listado (manda el vínculo con el músculo anidado), así que el editor del Admin y la ficha de la wiki mostraban los músculos sin nombre, y el editor mandaba ids de vínculo al guardar. Suma a V9.

### 2026-10-09 · el Usuario sin dependencias del backend queda completo (T26 a T29)

- **T26 — Mis RMs** (CU-U-17 a U-20, PR #42): `/u/rms` agrupa los RMs por ejercicio, con alta y edición en un modal y borrado con confirmación, todo contra los endpoints reales del contrato. **La fecha del RM viaja al mediodía** (`YYYY-MM-DDT12:00:00`): el service hace `new Date(date)` y lee día, mes y año en la zona horaria de su servidor, así que un `YYYY-MM-DD` pelado cae un día antes en un servidor al oeste de UTC. El editor no cambia el ejercicio de un RM (CU-U-18 habla de peso, repeticiones y fecha), aunque el backend lo permite.
- **T27 — calculadora de RM** (CU-U-16, PR #43): `/u/calculadora` calcula sola, 400 ms después del último cambio, con `POST /user_rm/potential`. **El cálculo lo hace el backend** (tabla de 1RM a 12RM): el front no repite Epley. Hallazgos: el endpoint pide y valida el ejercicio aunque la cuenta no dependa de él, y los `@Max` del DTO no traen mensaje en español.
- **T28 — wiki de ejercicios** (CU-U-15, PR #45): lista con búsqueda sin acentos y un chip por grupo muscular (los que trae el backend, no cinco fijos), y ficha con descripción, tips, video e imágenes. El buscador y los chips pasaron a `features/catalog` y los usa también el Admin. El prototipo **no tiene la ficha**: se armó con su cabecera de ejercicio. Hallazgo: las columnas opcionales de `Exercise` llegan en `null` y el Swagger las declara opcionales (suma a V9).
- **T29 — temporizador** (CU-U-14, PR #46): `/u/timer`, solo cliente. El estado vive fuera de React (`restTimerStore`) para que siga corriendo si cambiás de pantalla, y cuenta contra el reloj y no contando ticks, así una pestaña dormida no lo atrasa. Al llegar a cero avisa con un toast y vibra si el dispositivo puede. Sin notificación del sistema ni sonido, y **sin probar en un celular**.
- Releases **#44** (T26 y T27) y **#47** (T28 y T29) a `main`: `main` quedó en `b69a477` y `develop` en `ff3ebe2`, que solo difieren en los dos merges de release. No queda nada sin liberar.

### 2026-10-08 · release #41 en main y status del front

- El **release #41** (develop → main) llevó T16 a T18 (detalle de alumno, control de membresías y registrar pago) y T48 (circuitos del Entrenador) a `main`.
- Se armó este status y Fran lo sincronizó en `PowerApp-Docs/Status/` (commit `7d3da6c`), que además renombró los archivos del backend a `*-backend`.

### 2026-10-07 · el Entrenador queda completo con lo que tiene contrato (T16, T17, T18, T48)

- **T16 — detalle de alumno** (CU-E-03 a E-05): `/c/alumnos/:id` con la ficha, los RMs y los pagos en modales, y cerrar y reactivar la cuenta. **Hallazgo V10:** `GET /user_rm/user/{id}` recorta las columnas con un `select` y manda `exercise: { id, name }` sin `exercise_id`, aunque el contrato lo declara requerido; una primera versión agrupaba por `exercise_id` y habría fallado contra el backend real sin que los mocks lo mostraran. De paso se corrigió `formatDate`, que corría un día las fechas sin hora (`YYYY-MM-DD`) por leerlas en UTC.
- **T17 — control de membresías** (CU-E-25 a E-28): contadores del summary, lista por estado desde `status/users`, chips, selector de tipo y búsqueda local. **No usa `type/users`:** cada alumno ya trae su tipo, y CU-E-28 se resuelve filtrando en el cliente. Hallazgo: la lista por estado incluye cuentas inactivas sin decir cuáles.
- **T18 — registrar pago** (CU-E-29): `POST /membership/payment/register` manda solo `user_id` y `membership_id`. El backend calcula el vencimiento (hoy más la duración, al final del día) y **no suma los días que le quedaban** a una membresía vigente; la fecha de pago no se elige y un pago no se puede anular. Corrigió además un bug de T17 (claves repetidas en la lista tras registrar un pago).
- **T48 — circuitos y placeholders del Entrenador** (CU-E-21 a E-24): los componentes de circuito pasaron de `features/admin` a `features/catalog` y se parametrizaron con `basePath` (`/a/circuitos` o `/c/circuitos`), así que Admin y Entrenador comparten listado y editor. Los segmentos Rutinas y Circuitos son dos rutas (`/c/rutinas`, `/c/circuitos`) y no un query param. `/c/rutinas` y `/c/planes` quedan con placeholder hasta C2.

### 2026-10-06 · el Admin queda completo con lo que tiene contrato (T35 a T37, T19, T20, T44 primer tramo)

- **T35 a T37 — entrenadores** (CU-A-16 a A-19): V3 resuelto, porque `GET /users/all` es un query builder sin joins y no anida el coach, así que el listado cruza por id los usuarios `role=coach` con `GET /coach/all`. `delete_coach` es la baja lógica del `Coach` y le devuelve a su usuario el rol `user`; `promote_user` no mira el rol ni `User.active`.
- **B8 abierto (T37):** el endpoint de edición de entrenadores no existe ni en Render ni en el backend local (los mismos 72 paths que `openapi.json`). Se mockeó `POST /coach/edit/{id}` como propuesta del front y el modal avisa del 404 de ruta que da el backend real. **CU-A-18 queda 🟡.**
- **T19 y T20 — circuitos** (CU-E-21 a E-24, vía Admin): listado con conteo de rutinas y editor con alta, edición, baja lógica y duplicado. **V2 resuelto** leyendo el service: el `exercise` del detalle manda la ficha completa aunque el Swagger lo declara vacío.
- **T44, primer tramo:** Fran confirmó que el backend de circuitos está completo y probado, y se apagaron en el registry los seis endpoints de circuitos y `routine/all-plus` (`mock: false`). Con una cuenta de verdad nada cambia; **la cuenta de demo del Admin ya no entra al panel** (su token falso recibe un 401 en `circuit/all`). Se verificó contra el doble local, no contra el backend real.
- **C1 (CORS) resuelto:** el backend lo habilitó el 5/10 y el 6/10 se comprobó con un preflight real: `OPTIONS /api/v1/users/login` con el origen del front responde 204 con `Access-Control-Expose-Headers: Authorization`. El login real desde el sitio desplegado sigue sin probarse.
- Release #34 (develop → main) con T35 a T37, T19 y T20.

### 2026-10-05 · plan v1.3: el Admin primero (T46, T30, T47, T31 a T34, T15)

- El prototipo del 5/10 le suma al Admin usuarios, circuitos, rutinas y planificaciones, y Fran decidió construir primero el Admin con todo lo que su backend ya permite. **Rutinas y planificaciones quedan con placeholder hasta el bloque C2**, que arranca cuando Fran avise que su backend está completo. Se suman T48 y T49, nuevas, para el Entrenador.
- **T46 — navegación del Admin** relevó los guards del código del backend (V8): el rol `admin` entra en todo lo del Entrenador. Salieron dos hallazgos: `GET /users/all` es `@Auth()` sin roles (lo puede llamar un alumno) y `GET /coach/all` y `/coach/get/{id}` no tienen guard y devuelven CUIL y email profesional.
- **T47 — usuarios:** `GET /planification/user/{id}/active` **cuelga** (el controller tiene la llamada al service comentada y, con `@Res()`, nunca responde); el front lo corta con un timeout de 3,5 s. **V1:** la forma de `status/users` y `type/users` sale del código del backend y quedó tipada en `pending.ts`.
- **T31 a T34 — ejercicios, músculos, grupos y tipos de membresía.** V9: el Swagger no declara lo que se devuelve en ejercicios y músculos (`exercisedMuscles`, `muscles`, `muscle_group`). V7: cada borrado rechazado cae en un 500 genérico, salvo el de músculos, que no se rechaza nunca.
- **T15 — Mis alumnos** (CU-E-01 y E-02), pedida antes de lo que marcaba el plan.

### 2026-10-03 al 04 · fundaciones, Auth y Mi cuenta (T01 a T14)

- Repo, estilos globales, componentes base, AppShell con navegación por rol, capa de API tipada desde `openapi.json`, mocks con MSW, sesión con guards y aviso de arranque en frío, y el deploy en Render como Static Site (`https://powerapp-web.onrender.com`).
- Auth y Mi cuenta: login (T09), registro (T10), recuperar contraseña (T11), cambiar contraseña (T12), Mi cuenta y datos personales (T13) e historial de pagos (T14). V5 y V6 resueltos: el front valida la contraseña con el DTO (6 a 50 caracteres) y el registro vuelve al login.
- El login real desde el sitio desplegado sigue sin probarse.

---

## Hallazgos estructurales

> Lista de **hallazgos abiertos**. Los que se cerraron salieron de acá y quedan registrados en *Cambios recientes*: CORS, C1 (5/10, comprobado el 6/10) · V1, forma de `status/users` y `type/users` (T34 y T47) · V2, detalle de circuito (T20) · V3, listado de entrenadores (T35) · V5 y V6, contraseña de 6 caracteres y registro que vuelve al login (T10 y T12) · V7, borrados rechazados (T31 a T35) · V8, permisos del admin (T46).

1. **8/10 — C2: el contrato ya trae los endpoints, el front espera el aviso de Fran.** Rutinas y planificaciones suman **16 CU (21%)**: 12 en placeholder (E-08 a E-12d y E-15 a E-18) y 4 sin pantalla (E-13, E-14, E-19 y E-20). Esperan el bloque C2 por una decisión del 5/10: el front no arranca hasta que Fran avise que su backend está completo. Pero `openapi.json` (72 paths) **ya declara** los 14 paths de `/planification/*` y los 6 de `/routine/*` (sin contar circuitos), y el status del backend (copia del 4/9) da E-08 a E-12d y E-15 a E-18 por ✅. **Si ese estado sigue vigente, el bloque C2 (≈13 h) se puede adelantar.** Falta que Fran lo confirme: la copia puede estar vieja, y las asignaciones a alumnos (E-13, E-14, E-19, E-20) dependen igual de B7 y B5. Al 10/10 el backend no tuvo commits de código nuevos desde el 29/9 (el último es un renombre de archivos).
2. **10/10 — el flujo del alumno espera contratos que el backend no define.** **8 CU** (U-08 a U-13, E-06 y E-07) dependen de B1 a B4 y B6. La raíz está en el backend: según su status del 4/9, `Routine_Exercise_Finished` solo se lee y ningún endpoint la escribe (su hallazgo 02), así que no hay cómo marcar un ejercicio (B3), dejar una nota (B4) ni consultar historial (B6). Además `GET /routine/{id}` es solo de coach y admin, y un alumno recibe 403 (lo resuelve B2), y `GET /planification/user/{id}/active` cuelga. **El 10/10 el Swagger de Render es idéntico a `openapi.json`** (72 paths, 75 operaciones y los mismos schemas): ninguno de B1 a B9 llegó. Con T26 a T29 hechas, `/u/plan` es el único placeholder del Usuario y las pantallas de rutina y de ejercicio no existen.
3. **6/10 — CU-A-18: el front mockea un endpoint que no existe, pero el backend lo cubre con `promote_user`.** T37 usa `POST /coach/edit/{id}`, una propuesta del front que no está en el contrato (B8): contra el backend real el modal recibe un 404 de ruta. El status del backend, en cambio, da CU-A-18 por ✅ porque `POST /coach/promote_user` sobre un usuario que ya es coach **reactiva su `Coach` y pisa `coach_email` y `cuil`**. **Opción:** que T37 llame a `promote_user` y B8 se cierre sin tocar el backend. Con la salvedad de que ese endpoint no mira el rol ni `User.active` y devuelve 500 ante un `coach_email` repetido.
4. **B9 y C4: la contraseña temporal no funciona de punta a punta.** El login no devuelve ningún flag de contraseña temporal (B9; el front propone `password_change_required`), así que con una cuenta real **nunca se fuerza el cambio**: solo lo simula la cuenta de demo. Y el backend imprime la temporal en su consola en vez de mandarla por mail (C4), de modo que **CU-U-04 no sirve en producción**. El front cumple su parte (CU-U-02 queda 🟡, CU-U-04 ✅) y queda a la espera.
5. **10/10 — ✅ quiere decir «hecho contra el contrato», no «probado contra el backend real».** Cada tarea se verificó en el navegador con mocks y contra un doble local del contrato (`.claude/fake-backend.cjs`), que imita formatos y errores leyendo el código del backend. **Lo único comprobado contra Render es CORS** (preflight del 6/10) y que su Swagger coincide con el contrato local (10/10). T26 a T29 se verificaron igual: en el navegador con mocks y contra el doble, no contra el backend real. Sin credenciales de coach o admin no se pudo llamar a los endpoints que las piden (los de circuitos, por ejemplo); el checklist de pruebas manuales (apéndice A del plan) es un batch que hace Fran. Un ejemplo de lo que un doble no ve: en T16 los mocks no mostraron que `GET /user_rm/user/{id}` recorta columnas (V10); se descubrió leyendo el service. En el registry hay **48 endpoints**: 41 con mock (atienden solo a las cuentas de demo y una cuenta de verdad pasa al backend real, salvo B8, que no existe) y 7 apagados (circuitos y `routine/all-plus`, T44 primer tramo).
6. **10/10 — 15 tipos provisionales en `pending.ts`.** Cada uno lleva `// PENDIENTE-CONTRATO` con el id de la dependencia: lo que el Swagger no declara o declara mal. **V1** (`status/users` y `type/users` sin schema), **V2** (el `exercise` del detalle de circuito sale vacío), **V9** (ejercicios y músculos con relaciones sin tipar), **V10** (RMs sin `exercise_id`), más **B7**, **B8** y **B9**. Salen de leer el código del backend; cuando Fran los declare en el Swagger, se borran y se regeneran los tipos (T25 y T44).
7. **10/10 — Observaciones del backend, relevadas al hacer las tareas.** Para que Fran las revise; ninguna bloquea al front.
   - **RMs (T26):** `weight` tiene `@Min(0.99)` en `CreateUserRmDto` y `EditUserRmDto` (parece un `1` mal escrito); editar responde 201 y el Swagger dice 200; el error al editar dice «Error al crear el RM de usuario»; y la fecha se normaliza con la zona horaria del servidor (conviene `getUTC*` o recibir un día sin hora).
   - **Calculadora y wiki (T27, T28):** `POST /user_rm/potential` exige el ejercicio y lo valida aunque Epley no dependa de él (solo sirve para devolver el nombre); los `@Max(1000)` y `@Max(100)` del DTO no llevan mensaje en español. Las columnas opcionales de `Exercise` llegan en `null` y el Swagger las declara opcionales; los links de video e imágenes son texto libre que el backend no valida como http.
   - **Permisos (T15, T46):** `GET /users/all` usa `@Auth()` sin roles y lo puede llamar un alumno; `GET /coach/all` y `/coach/get/{id}` no tienen guard y devuelven CUIL y email profesional. `POST /users/set-active/{id}` no restringe nada: un admin puede darse de baja.
   - **CU que el backend no cumple como están escritos:** CU-A-10 (borra el músculo en cascada en vez de rechazarlo) y CU-A-17 (el camino «ya es entrenador» no existe: `promote_user` pisa email y CUIL).
   - **Sin transacción (T36):** `promote_user` cambia el rol antes de guardar el `Coach`; un `coach_email` repetido (es `unique`) da 500 y deja `role=coach` sin `Coach`.

---

## Próximas semanas — cronograma del front (hasta la entrega del 20/11)

| Semana | Foco | Casos de uso |
|---|---|---|
| **3 al 10/10 ✅** | Fundaciones, Auth, Mi cuenta y Admin<br>*T01 a T14, T46, T30, T47 y T31 a T37* | ✅ registro, login, recuperar y cambiar contraseña, Mi cuenta (**U-01 a U-07**), con **U-02** 🟡 por B9<br>✅ Admin: ejercicios, músculos, grupos, entrenadores y tipos de membresía (**A-01 a A-23**)<br>🟡 editar entrenador (**A-18**): mock, el endpoint no existe (B8) |
| **11 al 17/10 ✅** | Circuitos y Entrenador con contrato<br>*T19, T20, T15 a T18 y T48 · cerrada el 7/10* | ✅ alumnos, detalle, RMs y pagos (**E-01 a E-05**)<br>✅ circuitos (**E-21 a E-24**)<br>✅ membresías y registrar pago (**E-25 a E-29**)<br>🔵 rutinas y planificaciones del Entrenador: placeholder (T48) |
| **18 al 24/10 ⏳** | Usuario sin dependencias, contratos nuevos y núcleo<br>*T26 a T29 cerradas el 9/10 · quedan T25 y T38 a T40* | ✅ Mis RMs (**U-17 a U-20**, T26), calculadora (**U-16**, T27), wiki (**U-15**, T28) y temporizador (**U-14**, T29): adelantadas, ya en `main`<br>⬜ incorporar los contratos B1 a B9 (T25): no llegaron, el Swagger de Render no cambió<br>🔵 home semanal (**U-08**, T38): placeholder, espera B1 y B5<br>⬜ detalle de rutina y de ejercicio, marcar series y notas (**U-09 a U-13**, T39 y T40): esperan B2, B3 y B4 |
| **25 al 31/10** | Pendientes y backend real<br>*T43 y T44 (resto)* | ⬜ historial de entrenamientos y su filtro (**E-06, E-07**, T43, B6)<br>🟡 pasar a backend real lo que sigue en mock, incluido el flag de contraseña temporal (T44) |
| **Bloque C2** | Rutinas y planificaciones · cuando Fran avise (previsto antes del 31/10)<br>*T21 a T24, T49, T41 y T42 · ≈13 h* | 🔵 listado y editor de rutinas (**E-15 a E-18**) y de planificaciones (**E-08 a E-12d**), para Admin y Entrenador<br>⬜ asignar planificación a un alumno (**E-13, E-14**, B7) y rutina puntual (**E-19, E-20**, B5)<br>🎯 Hito: **73 de 75 CU ✅**; los dos que quedan son U-02 y A-18, que esperan B9 y B8 |
| **1 al 20/11** | Debug y entrega<br>*entrega final el 20/11* | checklist de pruebas manuales (apéndice A) en celular y en desktop; pasar a real lo que quede en mock<br>⚠️ la base de Render, recreada el 3/10, vence alrededor del 2/11 si el ciclo es de 30 días |

## Detalle — Rol Usuario (20 CU · 65%)

### Administrar mi cuenta

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-U-01 | Registrar usuario | ✅ Implementado | `/registro` (T10) · `POST /users/register` · siempre `role: user`; vuelve al login (V6); un email repetido da 409 con links a login y a recuperar |
| CU-U-02 | Login | 🟡 Parcial | `/login` (T09) · `POST /users/login` · credenciales inválidas con mensaje genérico y 403 de cuenta inactiva · **parcial:** el cambio obligatorio por contraseña temporal depende de B9, que el backend no devuelve, así que con una cuenta real nunca se activa (la cuenta de demo lo simula) |
| CU-U-03 | Cerrar sesión | ✅ Implementado | `/cuenta` (T13) · `POST /users/logout` · además descarta la sesión local |
| CU-U-04 | Recuperar contraseña | ✅ Implementado | `/recuperar` (T11) · `POST /users/recover-password` · mismo mensaje exista o no el email · **en producción la temporal no llega:** el backend la imprime en su consola (C4) |
| CU-U-05 | Cambiar contraseña | ✅ Implementado | `/cambiar-contrasena` (T12) · `POST /users/change-password` · también desde Mi cuenta · el 401 de «contraseña actual incorrecta» no cierra la sesión |
| CU-U-06 | Editar datos personales | ✅ Implementado | `/cuenta/datos` (T13) · `GET /users/get/{id}` · `POST /users/edit` |
| CU-U-07 | Obtener historial de pagos | ✅ Implementado | `/cuenta/pagos` (T14) · `GET /membership/payment/user/{id}` |

### Mi entrenamiento

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-U-08 | Obtener mi planificación | 🔵 Placeholder | `/u/plan` (T38) · `GET /planification/user/{id}/active` · es el **único placeholder que le queda al Usuario** · espera B1 (rutinas por semana) y B5 (rutina puntual) · el endpoint actual **cuelga** en el backend |
| CU-U-09 | Ver detalle de rutina | ⬜ No implementado | `/u/rutina/:id` (sin ruta) (T39) · `GET /routine/{id}` · espera B2: hoy el endpoint es solo de coach y admin (un alumno recibe 403) |
| CU-U-10 | Ver detalle de un ejercicio | ⬜ No implementado | `/u/ejercicio/:id` (sin ruta) (T40) · `GET /exercise/{id}` · espera B2 (series y estado dentro de la rutina) · la ficha de catálogo ya la muestra el Admin |
| CU-U-11 | Ver mis RMs de un ejercicio | ⬜ No implementado | dentro de `/u/ejercicio/:id` (T40) · `GET /user_rm/user/{idUser}/exercise/{idExercise}` · endpoint real; falta la pantalla del ejercicio · `useUserRms` filtrado por `exercise.id` también sirve |
| CU-U-12 | Marcar serie como realizado | ⬜ No implementado | sin ruta (T40) · espera B3: marcar una serie individual (`set_count: 3` son tres filas) |
| CU-U-13 | Dejar una nota en el ejercicio | ⬜ No implementado | sin ruta (T40) · espera B4: nota por ejercicio (crear, editar y borrar) |
| CU-U-14 | Temporizador | ✅ Implementado | `/u/timer` (T29) · solo cliente, sin backend · sigue corriendo si cambiás de pantalla (el estado vive fuera de React y cuenta contra el reloj) · al llegar a cero avisa con un toast y vibra si el dispositivo puede |
| CU-U-15 | Consultar wiki de ejercicios | ✅ Implementado | `/u/wiki` · `/u/wiki/:id` (T28) · `GET /exercise/all` · `GET /exercise/{id}` · `GET /muscles/mg/all` · búsqueda sin acentos y chips por grupo muscular, guardados en la URL · ficha con descripción, tips, video e imágenes (el prototipo no tiene la ficha) · comparte buscador y chips con el Admin |

### Administrar mis RMs

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-U-16 | Calcular mis RM potenciales | ✅ Implementado | `/u/calculadora` (T27) · `POST /user_rm/potential` · calcula solo, 400 ms después del último cambio · el cálculo es del backend (tabla 1RM→12RM), el front no repite Epley · avisa que no se guarda |
| CU-U-17 | Registrar un RM | ✅ Implementado | `/u/rms` (T26) · `POST /user_rm/create` · la fecha viaja al mediodía para esquivar la zona horaria del servidor |
| CU-U-18 | Editar un RM | ✅ Implementado | `/u/rms` (T26) · `POST /user_rm/edit/{id}` · no cambia el ejercicio · el backend responde 201 (el Swagger dice 200) |
| CU-U-19 | Obtener mis RMs | ✅ Implementado | `/u/rms` (T26) · `GET /user_rm/user/{id}` · agrupados por ejercicio, del más reciente al más antiguo · llegan sin `exercise_id` (V10) |
| CU-U-20 | Eliminar un RM | ✅ Implementado | `/u/rms` (T26) · `DELETE /user_rm/{id}` · borrado físico con confirmación |

---

## Detalle — Rol Entrenador (32 CU · 44%)

### Administrar alumnos

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-01 | Obtener alumnos | ✅ Implementado | `/c/alumnos` (T15) · `GET /users/all?role=user` · paginado de a 20 (cargar más), con chips Todos, Activos e Inactivos con sus contadores · botón de Membresías con badge de los alumnos por vencer y vencidos |
| CU-E-02 | Obtener alumnos — filtro por nombre | ✅ Implementado | `/c/alumnos` (T15) · `GET /users/all?keyword=` · búsqueda en el servidor con debounce de 300 ms (nombre, apellido y email) · la búsqueda y el chip quedan en la URL |
| CU-E-03 | Cerrar cuenta de alumno | ✅ Implementado | `/c/alumnos/:id` (T16) · `POST /users/set-active/{id}` · baja lógica con confirmación y reactivación · el login responde 403 a una cuenta cerrada |
| CU-E-04 | Obtener RMs del alumno | ✅ Implementado | `/c/alumnos/:id` (T16) · `GET /user_rm/user/{id}` · modal con los RMs agrupados por ejercicio · V10 (llegan sin `exercise_id`) |
| CU-E-05 | Historial de pagos de alumno | ✅ Implementado | `/c/alumnos/:id` (T16) · `GET /membership/payment/user/{id}` · modal de pagos |
| CU-E-06 | Historial de entrenamientos de alumno | 🔵 Placeholder | `/c/alumnos/:id` (T43) · fila «Historial de entrenamientos» con «Próximamente» · espera B6 |
| CU-E-07 | Historial de entrenamientos — filtro ejercicio | ⬜ No implementado | sin pantalla (T43) · espera B6 |

### Administrar planificaciones

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-08 | Obtener planificaciones sistémicas | 🔵 Placeholder | `/c/planes` (T23) · `GET /planification/all` · placeholder hasta el bloque C2 (T48) · el endpoint ya está en el contrato |
| CU-E-09 | Crear planificación sistémica | 🔵 Placeholder | `/c/planes/:id` (sin ruta) (T24) · `POST /planification/create` · bloque C2 |
| CU-E-10 | Editar planificación sistémica | 🔵 Placeholder | `/c/planes/:id` (sin ruta) (T24) · `POST /planification/edit/{id}` · bloque C2 |
| CU-E-11 | Eliminar planificación sistémica (lógico) | 🔵 Placeholder | `/c/planes` (T24) · `POST /planification/set-active/{id}` · bloque C2 · el aviso tiene que decir que no se quita a los alumnos que ya la tienen |
| CU-E-12 | Gestionar rutinas de una planificación | — *agrupador* | no se cuenta: agrupa a E-12a → E-12d |
| CU-E-12a | Asignar una rutina a planificación | 🔵 Placeholder | `/c/planes/:id` (sin ruta) (T24) · `POST /planification/routine/assign` · bloque C2 · `order` opcional |
| CU-E-12b | Asignar rutinas en lote | 🔵 Placeholder | `/c/planes/:id` (sin ruta) (T24) · `POST /planification/routine/assign-bulk` · bloque C2 |
| CU-E-12c | Quitar o reincorporar una rutina (lógico) | 🔵 Placeholder | `/c/planes/:id` (sin ruta) (T24) · `POST /planification/routine/set-active/{id}` · bloque C2 · mandar `order` con `active: false` es 400 |
| CU-E-12d | Quitar o reincorporar rutinas en lote (lógico) | 🔵 Placeholder | `/c/planes/:id` (sin ruta) (T24) · `POST /planification/routine/set-active-bulk` · bloque C2 |
| CU-E-13 | Asignar planificación a alumno | ⬜ No implementado | sin pantalla (T41) · `POST /planification/user/assign` · espera B7: body, solapamiento y cómo se confirma igual |
| CU-E-14 | Eliminar planificación a alumno | ⬜ No implementado | sin pantalla (T41) · `DELETE /planification/user/{id}` · espera B7: qué id recibe y si hace la baja lógica que pide el CU |

### Administrar rutinas

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-15 | Obtener rutinas sistémicas | 🔵 Placeholder | `/c/rutinas` (T21) · `GET /routine/all-plus` · placeholder hasta el bloque C2 (T48) |
| CU-E-16 | Crear rutina sistémica | 🔵 Placeholder | `/c/rutinas/:id` (sin ruta) (T22) · `POST /routine/create` · bloque C2 |
| CU-E-17 | Editar rutina sistémica | 🔵 Placeholder | `/c/rutinas/:id` (sin ruta) (T22) · `POST /routine/edit/{id}` · bloque C2 · reconciliación por el id del vínculo, la nota del coach se manda siempre |
| CU-E-18 | Eliminar rutina sistémica (lógico) | 🔵 Placeholder | `/c/rutinas` (T22) · `POST /routine/set-active/{id}` · bloque C2 |
| CU-E-19 | Asignar rutina a alumno | ⬜ No implementado | sin pantalla (T42) · espera B5 (rutina puntual) |
| CU-E-20 | Eliminar rutina a alumno | ⬜ No implementado | sin pantalla (T42) · espera B5 |

### Administrar circuitos

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-21 | Obtener circuitos | ✅ Implementado | `/c/circuitos` (T19 · T48) · `GET /routine/circuit/all-plus` · `GET /routine/all-plus` · componente compartido con el Admin · cuenta en cuántas rutinas se usa cada circuito · **sin mock desde el 6/10** |
| CU-E-22 | Crear circuito | ✅ Implementado | `/c/circuitos/:id` (T20 · T48) · `POST /routine/circuit/create` · circuito con ejercicios y series · un ejercicio no se repite (V2 resuelto) |
| CU-E-23 | Editar circuito | ✅ Implementado | `/c/circuitos/:id` (T20 · T48) · `POST /routine/circuit/edit/{id}` · avisa que afecta a todas las rutinas que lo usan · duplicar |
| CU-E-24 | Eliminar circuito (lógico) | ✅ Implementado | `/c/circuitos` (T20 · T48) · `POST /routine/circuit/set-active/{id}` · baja lógica con confirmación y reactivación |

### Gestionar membresías

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-25 | Obtener membresías | ✅ Implementado | `/c/membresias` · `/c/pago` (T17 · T18) · `GET /membership/all` · tipos activos en los selectores |
| CU-E-26 | Obtener estado de membresías | ✅ Implementado | `/c/membresias` (T17) · `GET /membership/status/summary` · cuatro contadores, con «Sin pagos» · el mismo summary alimenta el badge de Mis alumnos · el backend cuenta también a los alumnos con la cuenta inactiva |
| CU-E-27 | Obtener alumnos por estado de membresía | ✅ Implementado | `/c/membresias` (T17) · `GET /membership/status/users?status=` · chips por estado · «Todas» son cuatro requests, todo o nada (V1) |
| CU-E-28 | Obtener alumnos por tipo de membresía | ✅ Implementado | `/c/membresias` (T17) · selector de tipo **resuelto en el cliente**: cada alumno de `status/users` ya trae su tipo, así que no usa `type/users` (lo usa el Admin) |
| CU-E-29 | Registrar pago de alumno | ✅ Implementado | `/c/pago` (T18) · `POST /membership/payment/register` · manda solo `user_id` y `membership_id` · el vencimiento es hoy + duración y no suma lo que quedaba · un pago no se anula |

---

## Detalle — Rol Admin (23 CU · 96%)

### Administrar ejercicios

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-A-01 | Obtener ejercicios | ✅ Implementado | `/a/ejercicios` (T31) · `GET /exercise/all` · búsqueda por nombre y chips por grupo muscular, que cruzan tres endpoints (V9) |
| CU-A-02 | Asignar músculo a ejercicio | ✅ Implementado | `/a/ejercicios/:id` (T31) · `POST /exercise/create` · `POST /exercise/edit/{id}` · dentro del editor, como en el backend |
| CU-A-03 | Desasignar músculo de ejercicio | ✅ Implementado | `/a/ejercicios/:id` (T31) · `POST /exercise/edit/{id}` · dentro del editor |
| CU-A-04 | Crear ejercicio | ✅ Implementado | `/a/ejercicios/nuevo` (T31) · `POST /exercise/create` · las imágenes se cargan como URL · un nombre repetido da 409 |
| CU-A-05 | Editar ejercicio | ✅ Implementado | `/a/ejercicios/:id` (T31) · `POST /exercise/edit/{id}` · un campo opcional no se puede vaciar · un nombre repetido da 409 |
| CU-A-06 | Eliminar ejercicio | ✅ Implementado | `/a/ejercicios` (T31) · `DELETE /exercise/{id}` · un ejercicio en circuitos, ya entrenado o con RMs registrados no se elimina: el backend responde 409 con el motivo y el front avisa cada caso |

### Administrar músculos

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-A-07 | Obtener músculos | ✅ Implementado | `/a/catalogo` (Músculos) (T32) · `GET /muscles/all` |
| CU-A-08 | Crear músculo | ✅ Implementado | `/a/catalogo` (modal) (T32) · `POST /muscles/create` |
| CU-A-09 | Editar músculo | ✅ Implementado | `/a/catalogo` (modal) (T32) · `POST /muscles/edit/{id}` |
| CU-A-10 | Eliminar músculo | ✅ Implementado | `/a/catalogo` (T32) · `DELETE /muscles/{id}` · el backend borra el músculo con sus vínculos en cascada y no lo rechaza, al revés de lo que dice el CU |
| CU-A-11 | Obtener grupos musculares | ✅ Implementado | `/a/catalogo` (Grupos musculares) (T33) · `GET /muscles/mg/all` |

### Administrar grupos musculares

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-A-12 | Obtener músculos del grupo muscular | ✅ Implementado | `/a/catalogo` (Grupos musculares) (T33) · `GET /muscles/mg/all` · `GET /muscles/all` · los músculos del grupo se filtran de `/muscles/all` |
| CU-A-13 | Crear grupo muscular | ✅ Implementado | `/a/catalogo` (modal) (T33) · `POST /muscles/mg/create` |
| CU-A-14 | Editar grupo muscular | ✅ Implementado | `/a/catalogo` (modal) (T33) · `POST /muscles/mg/edit/{id}` |
| CU-A-15 | Eliminar grupo muscular | ✅ Implementado | `/a/catalogo` (T33) · `DELETE /muscles/mg/{id}` · el backend rechaza un grupo con músculos, con un 500 genérico |

### Administrar entrenadores

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-A-16 | Obtener entrenadores | ✅ Implementado | `/a/entrenadores` (T35) · `GET /coach/all` · `GET /users/all?role=coach` · cruza por id el nombre (de `users`) con el email profesional (de `coach`) · V3 |
| CU-A-17 | Convertir alumno a entrenador | ✅ Implementado | `/a/convertir` (T36) · `POST /coach/promote_user` · CUIL de 11 dígitos sin guiones · el camino «ya es entrenador» no existe en el backend |
| CU-A-18 | Editar datos de entrenador | 🟡 Parcial | `/a/entrenadores` (modal) (T37) · `POST /coach/edit/{id}` · **mock (B8):** el endpoint es una propuesta del front y no existe, así que contra el backend real el modal recibe un 404 de ruta · el status del backend lo da por cubierto con `promote_user` |
| CU-A-19 | Eliminar entrenador | ✅ Implementado | `/a/entrenadores` (T35) · `POST /coach/delete_coach/{id}` · baja lógica del `Coach`: el usuario vuelve a tener rol `user` · se reactiva volviendo a convertirlo |

### Administrar membresías (tipos)

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-A-20 | Obtener membresías | ✅ Implementado | `/a/membresias` (T34) · `GET /membership/all` · `GET /membership/type/users` · cuenta los alumnos de cada tipo (V1) |
| CU-A-21 | Crear membresía | ✅ Implementado | `/a/membresias` (modal) (T34) · `POST /membership/create` · una duración repetida da 400 y un nombre repetido, 409 |
| CU-A-22 | Editar membresía | ✅ Implementado | `/a/membresias` (modal) (T34) · `POST /membership/edit/{id}` · no es retroactivo: el pago copia nombre, duración y precio · repetir la duración (400) o el nombre (409) se avisa |
| CU-A-23 | Eliminar membresía | ✅ Implementado | `/a/membresias` (T34) · `POST /membership/set-active/{id}` · baja lógica con confirmación y reactivación |

> Pantallas del Admin sin CU propio (reutilizan los del Entrenador): **navegación** (T46: sidebar, tab bar y «Más»), **panel** (T30: conteos de seis endpoints), **usuarios** (T47: E-01 a E-03 más plan vigente, pagos y estado de membresía) y **circuitos** (T19 y T20: E-21 a E-24). **Rutinas** y **planificaciones** muestran un placeholder hasta el bloque C2.

---

## Orden sugerido para cerrar la brecha

Parte de **49 ✅** y suma lo que cada bloque habilita. Las horas son las del plan e incluyen la revisión.

| # | Qué lo bloquea | CU | Tareas | Estimado | ✅ acumulado |
|---:|---|---|---|---:|---:|
| 1 | **Contratos B1 a B4 y B6**<br>*Se pueden armar ya contra mock con tipos provisionales; conviene empezar por T39, porque la estructura de `GET /routine/{id}` ya está en el contrato. U-08 usa además B5; U-11 ya tiene endpoint y espera la pantalla de T40* | U-08 a U-13, E-06, E-07 (8) | T25, T38, T39, T40, T43 | ≈10,5 h | 57 de 75 |
| 2 | **Bloque C2 (aviso de Fran) más B5 y B7**<br>*Con el aviso de Fran, T21 a T24 y T49 (≈9,5 h) salen contra el backend real porque el contrato ya está; T41 y T42 esperan B7 y B5* | E-08 a E-12d, E-13 a E-20 (16) | T21 a T24, T49, T41, T42 | ≈13 h | 73 de 75 |
| 3 | **B8 y B9 (los dos 🟡)**<br>*Las 2 h son las de T44 (resto de mocks a real); A-18 se puede cerrar antes pasando T37 a `promote_user`* | A-18, U-02 (2) | T37, T09, T44 | ≈2 h | 75 de 75 |

---

## Cómo leer los estados

- **✅ Implementado** — La pantalla existe, está en la navegación y llama a los endpoints reales del contrato. Los mocks del registry atienden solo a las cuentas de demo.
- **🟡 Parcial** — La pantalla existe pero una parte del CU depende de algo que el backend no tiene o no devuelve (hoy: B8 y B9).
- **🔵 Placeholder** — La ruta o la sección está en la navegación con el aviso «Pantalla en construcción» (o una fila «Próximamente»): responde, pero no hace nada.
- **⬜ No implementado** — No hay pantalla ni ruta que cubra el caso de uso.
