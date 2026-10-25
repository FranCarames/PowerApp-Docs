# PowerApp Web — Estado de implementación vs. Casos de Uso

> **Corte:** 2026-10-24 · **Fuente:** `Use Cases/` de PowerApp-Docs comparado contra `PowerApp-Web` (`main` en `135649d`, `develop` en `909b717`) y `PLAN.md` v1.3
> **Método:** mapeo 1:1 de los 75 CU contra las rutas, pantallas y hooks del front, y contra el Swagger de Render del 24/10. Un CU cuenta como implementado si su pantalla existe, está en la navegación y llama al endpoint real del contrato; lo que el backend todavía no tiene queda como parcial o placeholder (hoy no hay nada así: los mocks se borraron en T44b).

## Resumen

| Estado | CU | % | Significado |
|---|---:|---:|---|
| ✅ Implementado | 75 | 100% | Pantalla en la navegación, conectada al endpoint real |
| 🟡 Parcial | 0 | 0% | Pantalla hecha, pero una parte depende de algo que el backend no tiene |
| 🔵 Placeholder | 0 | 0% | Ruta o sección con el aviso «Pantalla en construcción» |
| ⬜ No implementado | 0 | 0% | Sin pantalla ni ruta |
| **Total** | **75** | | |

**75 de 75 CU con pantalla funcional (✅ + 🟡, ~100%).** No queda ningún CU pendiente de trabajo en el front.

**48 de 49 tareas** del plan hechas (todas menos T45, los extras sin caso de uso, que se hacen solo si sobra tiempo; más T40b, T44b y T50, que no estaban en el plan original). Lo que queda no es de los CU: está en «Lo que queda», al final.

> **Nota (24/10):** `main` está en `135649d` (el release #49 del 11/10) y `develop` en `909b717`: **41 commits sin liberar**, todo lo hecho desde T21. Render despliega `main`. El PR #69 (T50) está abierto.
>
> **Nota:** ✅ quiere decir «hecho contra el contrato», no «probado contra el backend real» (ver el hallazgo sobre verificación).
>
> **Nota:** `CU-E-12` es un CU **agrupador** y no se cuenta a sí mismo; cuentan sus cuatro operaciones (`CU-E-12a` a `CU-E-12d`), igual que en el status del backend.

### Cobertura por rol

| Rol | CU | ✅ | 🟡 | 🔵 | ⬜ | % implementado |
|---|---:|---:|---:|---:|---:|---:|
| Usuario | 20 | 20 | 0 | 0 | 0 | 100% |
| Entrenador | 32 | 32 | 0 | 0 | 0 | 100% |
| Admin | 23 | 23 | 0 | 0 | 0 | 100% |

## Cambios recientes

### 2026-10-24 · T50: el pago y los datos personales siguen los CU nuevos (PR #69, abierto)

- Docs cambió dos CU el 24/10 y el front seguía con la regla vieja. **CU-E-29:** el backend rechaza (400) el pago a una cuenta cerrada, a un destinatario que no es alumno y a un tipo dado de baja (BE-27 y BE-28), así que `/c/pago` solo ofrece alumnos con la cuenta abierta, avisa si `?alumno=` trae una cerrada y el detalle del alumno oculta «Registrar pago». `registerPaymentErrorMessage` explica cada 400 y 404, también cuando cierran la cuenta con el formulario abierto.
- **CU-U-06:** el email se muestra pero no se puede cambiar (BE-40). El campo va deshabilitado y no se manda: se hizo **antes** de que BE-40 llegue, porque con `forbidNonWhitelisted` un body con `email` va a dar 400. Se sacó el 409 de «El email ya está en uso».
- Con esto **no queda ningún CU abierto en el front**: las planificaciones (E-08 a E-14) y las rutinas puntuales (E-15 a E-20) ya estaban hechas. Verificado en el navegador contra el doble local (`.claude/fake-backend.cjs`, que ahora imita BE-28 y BE-40), no contra el backend real.

### 2026-10-24 · bloque C2: rutinas y planificaciones, completas para Admin y Entrenador (T22, T23, T24, T49, T41, T42)

- **T22 — editor de rutina** (CU-E-16 a E-18, PR #64): circuitos en orden con subir y bajar, un circuito puede repetirse y editar, crear o duplicar un circuito desde la rutina va y vuelve con el borrador en memoria. Se edita por lista completa: los vínculos que ya estaban llevan su `id` y los nuevos no.
- **T23 y T24 — planificaciones** (CU-E-08 a E-12d, PR #65 y #66): listado con búsqueda, chips por tipo e «Incluir inactivas», y editor con las rutinas **por semana** (contrato del 23/10). La cabecera se guarda con un botón y las rutinas, al instante. **Eliminar un plan no se lo quita a los alumnos que ya lo tienen:** el aviso lo dice, al revés que el prototipo.
- **T49 — Entrenador** (PR #67): monta los mismos componentes en `/c/planes` y `/c/rutinas`, sin duplicar nada, y suma «Asignar» en cada plan vigente y «Asignar a alumno» en el editor de rutina.
- **T41 — asignar planificación a alumno** (CU-E-13 y E-14, PR #67): una pantalla con dos entradas (desde el plan o desde el alumno). **Un alumno por asignación**, aunque el prototipo permite varios. El 409 de solapamiento trae `overlapping[]` y se puede ajustar las fechas, quitar la vieja o «Asignar igual». Quitar es la baja lógica de `set-active` y se puede reincorporar.
- **T42 — rutina puntual** (CU-E-19 y E-20, PR #68): una rutina para un día, con el día que el prototipo no pide. Quitar es una baja **física** y no se ofrece si el alumno ya hizo ejercicios (el backend daría 409).
- Todo contra el backend real y con los tipos del contrato (sin tipos provisionales nuevos). Verificado en el navegador contra dobles locales con las reglas de los specs, no contra Render.

### 2026-10-24 · el entrenamiento del alumno y el historial del Entrenador (T25, T38 a T40, T40b, T43)

- **T25 — contratos nuevos** (PR #56): Render publica B1 a B7 (83 operaciones; hoy 85). No queda ningún tipo provisional de B1 a B9: `pending.ts` solo conserva V1, V2 y V9.
- **T38 — home semanal** (CU-U-08, PR #57): un solo pedido, `GET /routine/home/{userId}?date=&week=1`, con el plan y las rutinas puntuales. El plan va **sin día** y lo individual, por día. **T39 — detalle de rutina** (CU-U-09, PR #58): una pantalla para las dos vías, porque el alumno no lee `GET /routine/{id}`.
- **T40 — ejercicio y ejecución** (CU-U-10 a U-13, PR #59) y **T40b — marcar dentro del plan** (PR #63, con BE-20c). **El hecho se registra por ejercicio y no por serie:** el tildado serie por serie es solo de la interfaz. La nota viaja con la marca. Actualización optimista que se revierte si falla.
- **T43 — historial** (CU-E-06 y E-07, PR #60): un modal del detalle del alumno. Con BE-20d trae también las sesiones del plan en la misma lista. **Las series son la prescripción vigente y no lo que levantó el alumno** (límite del modelo): lo dice un aviso.

### 2026-10-24 · T44 y T44b: no queda ningún mock (PR #61 y #62)

- Todo el registry quedó en `mock: false` (un endpoint se apaga si figura en el Swagger vivo de Render y no es un mock pendiente) y T44b borró los handlers y las fixtures (4.144 líneas). **Las cuentas de demo dejaron de existir**, en local y en el sitio desplegado: para recorrer la app hace falta una cuenta real. Fran sacó `VITE_USE_MOCKS` de Render.
- Queda el andamiaje (`registry.ts`, `browser.ts`, `endpoint.ts` y `responses.ts`) para el próximo mock. El Swagger de Render tiene 85 operaciones: las 83 de `openapi.json` más el par de marcar dentro de un plan (BE-20c).

### 2026-10-17 · el contrato del 17/10 y T21 (PR #52 a #55)

- **Contrato del 17/10** (PR #52): `GET /coach/all` y `GET /coach/get/{id}` pasan a pedir token de admin, y **B9 y V10 quedan resueltos** (el login trae `password_change_required` y los RMs traen `exercise_id`). **CU-U-02 deja de ser 🟡.**
- **B8 / T37** (PR #53): editar un entrenador pasa a `POST /coach/promote_user`, porque el backend no va a crear `POST /coach/edit/{id}`. **CU-A-18 deja de ser 🟡.**
- **T21 — rutinas del Admin** (CU-E-15, PR #54) y un arreglo del editor de series (PR #55): botones − y + y AMRAP y RM que arrancan en 1×1.

### 2026-10-12 · ejercicios y membresías: errores con motivo del backend, y un fix del detalle

- **El backend cambió su contrato** en cuatro endpoints y el front lo sigue (PR #51). `DELETE /exercise/{id}` ya no borra un ejercicio en circuitos, ya entrenado o con RMs registrados (antes se llevaba los RMs y lo sacaba de los circuitos, o caía en un 500): responde **409 con el motivo** y el front muestra un aviso por cada uno. **CU-A-06 pasa a cumplirse como está escrito.** El alta y la edición de ejercicios y de tipos de membresía responden 409 por un nombre repetido; la edición de membresía suma el 400 por duración repetida.
- **V7 sigue vigente** para músculos, grupos y entrenadores: su backend no cambió y siguen con el 500 genérico.
- **Fix del detalle de ejercicio** (PR #50): `GET /exercise/{id}` no aplana `exercisedMuscles` como el listado (manda el vínculo con el músculo anidado), así que el editor del Admin y la ficha de la wiki mostraban los músculos sin nombre, y el editor mandaba ids de vínculo al guardar. Suma a V9.

### 2026-10-11 · release #49 (develop → main)

- Es **el último release que llegó a `main`** (`135649d`). Sumó el arreglo NAV-07 (PR #48: login, registro y recuperar llevan al inicio del rol con la sesión abierta) a lo que ya estaba en `main` (T26 a T29, de los releases #44 y #47). Todo lo posterior sigue solo en `develop`.

### 2026-10-09 · el Usuario sin dependencias del backend queda completo (T26 a T29)

- **T26 — Mis RMs** (CU-U-17 a U-20, PR #42): `/u/rms` agrupa los RMs por ejercicio, con alta y edición en un modal y borrado con confirmación, todo contra los endpoints reales del contrato. **La fecha del RM viaja al mediodía** (`YYYY-MM-DDT12:00:00`): el service hace `new Date(date)` y lee día, mes y año en la zona horaria de su servidor, así que un `YYYY-MM-DD` pelado cae un día antes en un servidor al oeste de UTC. El editor no cambia el ejercicio de un RM (CU-U-18 habla de peso, repeticiones y fecha), aunque el backend lo permite.
- **T27 — calculadora de RM** (CU-U-16, PR #43): `/u/calculadora` calcula sola, 400 ms después del último cambio, con `POST /user_rm/potential`. **El cálculo lo hace el backend** (tabla de 1RM a 12RM): el front no repite Epley. Hallazgos: el endpoint pide y valida el ejercicio aunque la cuenta no dependa de él, y los `@Max` del DTO no traen mensaje en español.
- **T28 — wiki de ejercicios** (CU-U-15, PR #45): lista con búsqueda sin acentos y un chip por grupo muscular (los que trae el backend, no cinco fijos), y ficha con descripción, tips, video e imágenes. El buscador y los chips pasaron a `features/catalog` y los usa también el Admin. El prototipo **no tiene la ficha**: se armó con su cabecera de ejercicio. Hallazgo: las columnas opcionales de `Exercise` llegan en `null` y el Swagger las declara opcionales (suma a V9).
- **T29 — temporizador** (CU-U-14, PR #46): `/u/timer`, solo cliente. El estado vive fuera de React (`restTimerStore`) para que siga corriendo si cambiás de pantalla, y cuenta contra el reloj y no contando ticks, así una pestaña dormida no lo atrasa. Al llegar a cero avisa con un toast y vibra si el dispositivo puede. Sin notificación del sistema ni sonido, y **sin probar en un celular**.

### 2026-10-08 · release #41 en main y status del front

- El **release #41** (develop → main) llevó T16 a T18 (detalle de alumno, control de membresías y registrar pago) y T48 (circuitos del Entrenador) a `main`.
- Se armó este status y Fran lo sincronizó en `PowerApp-Docs/Status/` (commit `7d3da6c`), que además renombró los archivos del backend a `*-backend`.

### 2026-10-07 · el Entrenador queda completo con lo que tiene contrato (T16, T17, T18, T48)

- **T16 — detalle de alumno** (CU-E-03 a E-05): `/c/alumnos/:id` con la ficha, los RMs y los pagos en modales, y cerrar y reactivar la cuenta. **Hallazgo V10:** `GET /user_rm/user/{id}` recorta las columnas con un `select` y manda `exercise: { id, name }` sin `exercise_id`, aunque el contrato lo declara requerido; una primera versión agrupaba por `exercise_id` y habría fallado contra el backend real sin que los mocks lo mostraran. De paso se corrigió `formatDate`, que corría un día las fechas sin hora (`YYYY-MM-DD`) por leerlas en UTC.
- **T17 — control de membresías** (CU-E-25 a E-28): contadores del summary, lista por estado desde `status/users`, chips, selector de tipo y búsqueda local. **No usa `type/users`:** cada alumno ya trae su tipo, y CU-E-28 se resuelve filtrando en el cliente. Hallazgo: la lista por estado incluye cuentas inactivas sin decir cuáles.
- **T18 — registrar pago** (CU-E-29): `POST /membership/payment/register` manda solo `user_id` y `membership_id`. El backend calcula el vencimiento (hoy más la duración, al final del día) y **no suma los días que le quedaban** a una membresía vigente; la fecha de pago no se elige y un pago no se puede anular. Corrigió además un bug de T17 (claves repetidas en la lista tras registrar un pago).
- **T48 — circuitos del Entrenador** (CU-E-21 a E-24): los componentes de circuito pasaron de `features/admin` a `features/catalog` y se parametrizaron con `basePath` (`/a/circuitos` o `/c/circuitos`), así que Admin y Entrenador comparten listado y editor. Los segmentos Rutinas y Circuitos son dos rutas (`/c/rutinas`, `/c/circuitos`) y no un query param.

### 2026-10-06 · el Admin queda completo con lo que tiene contrato (T35 a T37, T19, T20, T44 primer tramo)

- **T35 a T37 — entrenadores** (CU-A-16 a A-19): V3 resuelto, porque `GET /users/all` es un query builder sin joins y no anida el coach, así que el listado cruza por id los usuarios `role=coach` con `GET /coach/all`. `delete_coach` es la baja lógica del `Coach` y le devuelve a su usuario el rol `user`.
- **T19 y T20 — circuitos** (CU-E-21 a E-24, vía Admin): listado con conteo de rutinas y editor con alta, edición, baja lógica y duplicado. **V2 resuelto** leyendo el service: el `exercise` del detalle manda la ficha completa aunque el Swagger lo declara vacío.
- **C1 (CORS) resuelto:** el backend lo habilitó el 5/10 y el 6/10 se comprobó con un preflight real: `OPTIONS /api/v1/users/login` con el origen del front responde 204 con `Access-Control-Expose-Headers: Authorization`. El login real desde el sitio desplegado sigue sin probarse.

### 2026-10-05 · plan v1.3: el Admin primero (T46, T30, T47, T31 a T34, T15)

- El prototipo del 5/10 le suma al Admin usuarios, circuitos, rutinas y planificaciones, y Fran decidió construir primero el Admin con todo lo que su backend ya permite. Rutinas y planificaciones esperaron al bloque C2, que arrancó el 17/10.
- **T46 — navegación del Admin** relevó los guards del código del backend (V8): el rol `admin` entra en todo lo del Entrenador. Salieron dos hallazgos: `GET /users/all` es `@Auth()` sin roles (lo puede llamar un alumno) y `GET /coach/all` y `/coach/get/{id}` no tenían guard.
- **T47 — usuarios:** `GET /planification/user/{id}/active` **cuelga** (el controller tiene la llamada al service comentada y, con `@Res()`, nunca responde); el front lo corta con un timeout de 3,5 s. **V1:** la forma de `status/users` y `type/users` sale del código del backend y quedó tipada en `pending.ts`.
- **T31 a T34 — ejercicios, músculos, grupos y tipos de membresía.** V9: el Swagger no declara lo que se devuelve en ejercicios y músculos (`exercisedMuscles`, `muscles`, `muscle_group`). **T15 — Mis alumnos** (CU-E-01 y E-02), pedida antes de lo que marcaba el plan.

### 2026-10-03 al 04 · fundaciones, Auth y Mi cuenta (T01 a T14)

- Repo, estilos globales, componentes base, AppShell con navegación por rol, capa de API tipada desde `openapi.json`, mocks con MSW, sesión con guards y aviso de arranque en frío, y el deploy en Render como Static Site (`https://powerapp-web.onrender.com`).
- Auth y Mi cuenta: login (T09), registro (T10), recuperar contraseña (T11), cambiar contraseña (T12), Mi cuenta y datos personales (T13) e historial de pagos (T14). V5 y V6 resueltos: el front valida la contraseña con el DTO (6 a 50 caracteres) y el registro vuelve al login.

---

## Hallazgos estructurales

> Lista de **hallazgos abiertos**. Los que se cerraron salieron de acá y quedan registrados en *Cambios recientes*: CORS, C1 (5/10, comprobado el 6/10) · V1, forma de `status/users` y `type/users` (T34 y T47: tipada a mano) · V2, detalle de circuito (T20: tipado a mano) · V3, listado de entrenadores (T35) · V4, el alumno no lee `GET /routine/{id}` (23/10: lee el detalle de su asignación) · V5 y V6, contraseña de 6 caracteres y registro que vuelve al login (T10 y T12) · V7, borrados rechazados (T31 a T35) · V8, permisos del admin (T46) · V10, RMs sin `exercise_id` (17/10) · B1 a B7 (23/10, T25) · B8, editar entrenador (17/10: `promote_user`) · B9, flag de contraseña temporal (17/10) · C2, backend de rutinas y planificaciones (17/10) · C3, B1 a B9 en Render (23/10, y BE-20c y BE-20d el 24/10) · T44, mocks a backend real (24/10).

1. **24/10 — `main` está 41 commits atrás de `develop`: el sitio desplegado no tiene nada de lo hecho desde el 12/10.** Render despliega `main`, que está en `135649d` (el release #49 del 11/10). `develop` está en `909b717`, con T50 en el PR #69 sin mergear. **Sin liberar:** T21 a T25, T38 a T44b, T49, T41 y T42 (PR #50 a #68), es decir, el entrenamiento del alumno, las rutinas, las planificaciones, el historial y el contrato del 17/10. Además `VITE_USE_MOCKS` ya no está en Render y las cuentas de demo no existen: hace falta un release develop → main para que el sitio vea el trabajo de las últimas dos semanas.
2. **24/10 — ✅ quiere decir «hecho contra el contrato», no «probado contra el backend real».** Lo único comprobado contra Render es CORS (preflight del 6/10), que su Swagger coincide con `openapi.json` (24/10: 85 operaciones) y la lectura sin token de los 25 endpoints de lectura del registry (los 4 públicos responden 200 con datos reales, entre ellos 207 ejercicios, 8 grupos y 35 músculos; los 21 protegidos, 401). **Sin credenciales de coach o admin, ningún endpoint protegido se llamó:** el entrenamiento, las planificaciones, las rutinas, el historial y los pagos se verificaron en el navegador contra dobles locales (`.claude/fake-backend.cjs`) con las reglas de los specs de PowerApp-Docs. Los textos de error de `assign` (T41), `assign-user` (T42) y de las rutinas de un plan (T24) se reconocen por palabras clave que salen de los specs, no del backend real. El checklist de pruebas manuales (apéndice A del plan) es un batch que hace Fran. Un ejemplo de lo que un doble no ve: en T16 los mocks no mostraron que `GET /user_rm/user/{id}` recorta columnas (V10).
3. **24/10 — sin mocks, y sin datos de entrenamiento en Render.** T44b dejó el registry vacío y borró los handlers y las fixtures: **no hay forma de recorrer la app sin una cuenta real**. Y según el relevamiento del 23/10, la base de Render no trae rutinas ni planificaciones (el seed es BE-21): el home, las rutinas, las planificaciones y el historial muestran el estado vacío hasta que alguien cree datos. El catálogo sí está cargado. La base recreada el 3/10 vence alrededor del 2/11 si el ciclo es de 30 días.
4. **B9 resuelto, C4 abierto: la contraseña temporal sigue sin llegar.** El flag `password_change_required` ya está en el contrato (17/10) y `useLogin` lo lee: CU-U-02 queda ✅. Lo que no funciona de punta a punta es la recuperación: el backend imprime la contraseña temporal en su consola en vez de mandarla por mail (C4, antes del 20/11), así que **CU-U-04 no sirve en producción** aunque el front cumple su parte. El login real desde el sitio desplegado sigue sin probarse.
5. **24/10 — BE-40, BE-27 y BE-28: el front ya sigue los CU nuevos, con tres cosas para Fran.** T50 (PR #69) adapta el pago (CU-E-29) y los datos personales (CU-U-06). Quedan abiertas tres cosas que el front no puede resolver:
   - `GET /membership/status/users` no dice qué cuentas están cerradas, así que el control de membresías sigue ofreciendo «Registrar pago» en esas filas; el aviso aparece recién al abrir `/c/pago`.
   - El plan de pruebas de PowerApp-Docs (PAG-07, PAG-08, DAT-04 y DAT-05) hay que actualizarlo del lado de Docs: el front no lo toca.
   - **BE-27:** convertir en entrenador a una cuenta cerrada sigue siendo posible por API (el backend solo bloquea al administrador); el front ya lo bloquea (T36).
6. **24/10 — quedan 3 tipos provisionales en `pending.ts` (V1, V2 y V9).** Son 16 marcas `// PENDIENTE-CONTRATO` de lo que el Swagger no declara o declara mal: **V1** (`status/users` y `type/users` sin schema), **V2** (el `exercise` del detalle de circuito y de los dos detalles de rutina sale como un objeto vacío) y **V9** (ejercicios y músculos con relaciones sin tipar). B1 a B9 y V10 ya salieron con T25. Salen de leer el código del backend; cuando Fran los declare en el Swagger, se borran y se regeneran los tipos.
7. **24/10 — Observaciones del backend, relevadas al hacer las tareas.** Para que Fran las revise; ninguna bloquea al front.
   - **Planificaciones (T23, T24):** `GET /planification/all` no trae las rutinas; `GET /planification/{id}` solo trae los vínculos vigentes, así que una rutina quitada solo se puede reincorporar mientras no se salga de la pantalla (un `include_inactive` en el detalle lo resolvería); ningún endpoint dice cuántos alumnos tiene un plan, así que los avisos de eliminar y de achicar la duración no pueden decirlo; el tope de 50 rutinas por lote está en la spec y no en el contrato; el `type` del filtro es un `ILIKE` sin escapar.
   - **Asignaciones (T41, T42):** el tipo generado exige `confirm_overlap` aunque el contrato no lo marca como requerido; reincorporar una asignación quitada no revisa el solapamiento (así lo pide CU-E-14); `GET /routine/assigned/{userId}` no pagina; los textos de los 400, 403, 404 y 409 salen de las specs (BE-11 y BE-18) y conviene confirmarlos contra Render; la spec dice que `assign-user` también es del Admin y el front lo ofrece solo al Entrenador, como pide el CU.
   - **Entrenamiento (T38 a T43):** `GET /routine/home/{userId}` repite `week_start` y `week_end` y no trae el nombre del entrenador ni el progreso del plan entero; los detalles no marcan qué ejercicios o circuitos quitó el entrenador; el historial muestra la prescripción vigente y no la carga real (límite del modelo).
   - **RMs (T26):** `weight` tiene `@Min(0.99)` en `CreateUserRmDto` y `EditUserRmDto` (parece un `1` mal escrito); editar responde 201 y el Swagger dice 200; el error al editar dice «Error al crear el RM de usuario»; y la fecha se normaliza con la zona horaria del servidor (conviene `getUTC*` o recibir un día sin hora).
   - **Calculadora y wiki (T27, T28):** `POST /user_rm/potential` exige el ejercicio y lo valida aunque Epley no dependa de él (solo sirve para devolver el nombre); los `@Max(1000)` y `@Max(100)` del DTO no llevan mensaje en español. Las columnas opcionales de `Exercise` llegan en `null` y el Swagger las declara opcionales; los links de video e imágenes son texto libre que el backend no valida como http.
   - **Permisos (T15, T46):** `GET /users/all` usa `@Auth()` sin roles y lo puede llamar un alumno; `POST /users/set-active/{id}` no restringe nada: un admin puede darse de baja. **CU que el backend no cumple como está escrito:** CU-A-10 (borra el músculo en cascada en vez de rechazarlo).
8. **24/10 — Diferencias entre el prototipo y los CU, resueltas a favor del CU.** Para que Fran las tenga a la vista; en todas el front sigue el caso de uso.
   - El prototipo asigna una planificación o una rutina a **varios alumnos a la vez** («Asignar a N alumnos»); CU-E-13 y CU-E-19 son de un alumno por asignación y el backend no tiene alta en lote.
   - El prototipo **no pide el día** de la rutina puntual y CU-E-19 sí; para la planificación pone dos fechas de ejemplo fijas.
   - El prototipo dice que eliminar una planificación **se quita de los alumnos que la tienen**; CU-E-11 y el contrato dicen que no.
   - El prototipo marca **serie por serie** y muestra la duración de las sesiones y el porcentaje del plan entero; el modelo registra el hecho por ejercicio y no guarda duración ni el progreso del plan.

---

## Próximas semanas — cronograma del front (hasta la entrega del 20/11)

| Semana | Foco | Casos de uso |
|---|---|---|
| **3 al 10/10 ✅** | Fundaciones, Auth, Mi cuenta y Admin<br>*T01 a T14, T46, T30, T47 y T31 a T37* | ✅ registro, login, recuperar y cambiar contraseña, Mi cuenta (**U-01 a U-07**)<br>✅ Admin: ejercicios, músculos, grupos, entrenadores y tipos de membresía (**A-01 a A-23**) |
| **11 al 17/10 ✅** | Circuitos, Entrenador con contrato y contrato del 17/10<br>*T19, T20, T15 a T18, T48, T37 (B8) y T21* | ✅ alumnos, detalle, RMs y pagos (**E-01 a E-05**)<br>✅ circuitos (**E-21 a E-24**)<br>✅ membresías y registrar pago (**E-25 a E-29**)<br>✅ editar entrenador por `promote_user` (**A-18**) y el flag de contraseña temporal (**U-02**): el contrato del 17/10 los resolvió |
| **18 al 24/10 ✅** | Usuario, historial, mocks a real y bloque C2<br>*T26 a T29, T25, T38 a T40, T40b, T43, T44, T44b, T22 a T24, T49, T41, T42 y T50* | ✅ Mis RMs (**U-17 a U-20**), calculadora (**U-16**), wiki (**U-15**) y temporizador (**U-14**)<br>✅ home, detalle de rutina y de ejercicio, marcar y notas (**U-08 a U-13**)<br>✅ historial de entrenamientos y su filtro (**E-06 y E-07**)<br>✅ rutinas y planificaciones, para Admin y Entrenador (**E-08 a E-18**)<br>✅ asignar planificación y rutina puntual a un alumno (**E-13, E-14, E-19 y E-20**)<br>✅ sin mocks (T44 y T44b) y los ajustes de CU del 24/10 (T50, PR #69 abierto)<br>🎯 Hito alcanzado: **75 de 75 CU ✅** contra el contrato |
| **25 al 31/10** | Liberar y probar contra el backend real<br>*sin tareas de CU* | mergear el PR #69 y liberar `develop` en `main`: Render despliega `main` y hoy está 41 commits atrás<br>probar con cuentas reales de alumno, entrenador y admin lo que solo se verificó contra dobles locales<br>T45, los extras sin caso de uso, solo si sobra tiempo |
| **1 al 20/11** | Debug y entrega<br>*entrega final el 20/11* | checklist de pruebas manuales (apéndice A) en celular y en desktop<br>⚠️ la base de Render, recreada el 3/10, vence alrededor del 2/11 si el ciclo es de 30 días: hay que recrearla y volver a correr los seeds |

## Detalle — Rol Usuario (20 CU · 100%)

### Administrar mi cuenta

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-U-01 | Registrar usuario | ✅ Implementado | `/registro` (T10) · `POST /users/register` · siempre `role: user`; vuelve al login (V6); un email repetido da 409 con links a login y a recuperar |
| CU-U-02 | Login | ✅ Implementado | `/login` (T09 · T25 · T44) · `POST /users/login` · credenciales inválidas con mensaje genérico y 403 de cuenta inactiva · el flag `password_change_required` (B9) ya está en el contrato (T25) y el guard deja solo `/cambiar-contrasena` · **el login real desde el sitio desplegado sigue sin probarse** |
| CU-U-03 | Cerrar sesión | ✅ Implementado | `/cuenta` (T13) · `POST /users/logout` · además descarta la sesión local |
| CU-U-04 | Recuperar contraseña | ✅ Implementado | `/recuperar` (T11) · `POST /users/recover-password` · mismo mensaje exista o no el email · **en producción la temporal no llega:** el backend la imprime en su consola (C4) |
| CU-U-05 | Cambiar contraseña | ✅ Implementado | `/cambiar-contrasena` (T12) · `POST /users/change-password` · también desde Mi cuenta · el 401 de «contraseña actual incorrecta» no cierra la sesión |
| CU-U-06 | Editar datos personales | ✅ Implementado | `/cuenta/datos` (T13 · T50) · `GET /users/get/{id}` · `POST /users/edit` · desde el 24/10 el **email se muestra pero no se puede cambiar** (BE-40): el campo va deshabilitado y no se manda · T50, PR #69 abierto |
| CU-U-07 | Obtener historial de pagos | ✅ Implementado | `/cuenta/pagos` (T14) · `GET /membership/payment/user/{id}` |

### Mi entrenamiento

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-U-08 | Obtener mi planificación | ✅ Implementado | `/u/plan` (T38) · `GET /routine/home/{userId}` · un solo pedido con el plan y las rutinas puntuales: una semana de lunes a domingo, con selector guardado en la URL (`?semana=`) · el plan agrupa sus rutinas **sin día** y lo individual va por día · el porcentaje de la tarjeta es el de la semana, porque el contrato no trae el del plan |
| CU-U-09 | Ver detalle de rutina | ✅ Implementado | `/u/rutina/:id` · `/u/rutina/plan/:userPlanificationId/:routineAsignationId` (T39) · `GET /routine/assign-user/{id}` · `GET /routine/assign-plan/{userPlanificationId}/{routineAsignationId}` · una pantalla para las dos vías: el alumno no lee `GET /routine/{id}` (V4), lee el detalle de su asignación · avisos de planificación quitada, rutina quitada del plan y rutina o plan dados de baja · el `exercise` del árbol sigue sin tipar (V2) |
| CU-U-10 | Ver detalle de un ejercicio | ✅ Implementado | `/u/rutina/:id/ejercicio/:routineExerciseId` · y la del plan (T40) · `GET /exercise/{id}` · sale del árbol del detalle, sin otro pedido · un 3×8 son tres filas con su tipo (normal, AMRAP o RM) · nota del entrenador, RMs y atajo al temporizador · rutas anidadas en vez del `/u/ejercicio/:id` del plan inicial |
| CU-U-11 | Ver mis RMs de un ejercicio | ✅ Implementado | dentro del ejercicio (T40) · `GET /user_rm/user/{id}` · `useUserRms` filtrado por el `id` de la ficha (V10) · se puede registrar un RM desde el ejercicio |
| CU-U-12 | Marcar serie como realizado | ✅ Implementado | dentro del ejercicio (T40 · T40b) · `POST /routine/assign-user/{id}/finished` · `DELETE /routine/assign-user/{id}/finished/{routineExerciseId}` · `POST /routine/assign-plan/{up}/{ra}/finished` · `DELETE /routine/assign-plan/{up}/{ra}/finished/{routineExerciseId}` · **se marca por ejercicio y no por serie** (el contrato no guarda series): tildar series es solo de la interfaz · hoy o en diferido (no futuro) · actualización optimista que se revierte si falla · con la planificación quitada solo se ve |
| CU-U-13 | Dejar una nota en el ejercicio | ✅ Implementado | dentro del ejercicio (T40 · T40b) · la nota (hasta 100 caracteres) viaja con la marca en el mismo `POST …/finished`: anotar un ejercicio sin marcar lo marca · vacía se borra y el ejercicio sigue marcado · desmarcar borra la nota |
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

## Detalle — Rol Entrenador (32 CU · 100%)

### Administrar alumnos

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-01 | Obtener alumnos | ✅ Implementado | `/c/alumnos` (T15) · `GET /users/all?role=user` · paginado de a 20 (cargar más), con chips Todos, Activos e Inactivos con sus contadores · botón de Membresías con badge de los alumnos por vencer y vencidos |
| CU-E-02 | Obtener alumnos — filtro por nombre | ✅ Implementado | `/c/alumnos` (T15) · `GET /users/all?keyword=` · búsqueda en el servidor con debounce de 300 ms (nombre, apellido y email) · la búsqueda y el chip quedan en la URL |
| CU-E-03 | Cerrar cuenta de alumno | ✅ Implementado | `/c/alumnos/:id` (T16) · `POST /users/set-active/{id}` · baja lógica con confirmación y reactivación · el login responde 403 a una cuenta cerrada |
| CU-E-04 | Obtener RMs del alumno | ✅ Implementado | `/c/alumnos/:id` (T16) · `GET /user_rm/user/{id}` · modal con los RMs agrupados por ejercicio · V10 (llegan sin `exercise_id`) |
| CU-E-05 | Historial de pagos de alumno | ✅ Implementado | `/c/alumnos/:id` (T16) · `GET /membership/payment/user/{id}` · modal de pagos |
| CU-E-06 | Historial de entrenamientos de alumno | ✅ Implementado | `/c/alumnos/:id` (modal) (T43) · `GET /routine/history/{userId}` · las sesiones individuales y las del plan en una sola lista, de la más nueva a la más vieja, en el orden del backend (BE-20d: «Plan · Semana N» con la plantilla) · **las series son la prescripción vigente, no lo que levantó el alumno**: lo dice un aviso y cada ejercicio rotula «Prescripto» · de a 10 con «Ver más sesiones» |
| CU-E-07 | Historial de entrenamientos — filtro ejercicio | ✅ Implementado | `/c/alumnos/:id` (modal) (T43) · `GET /routine/history/{userId}?exercise_id=` · selector con los ejercicios que hizo el alumno y el resto del catálogo (`GET /exercise/all`), para ver «Sin registros para este ejercicio» |

### Administrar planificaciones

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-08 | Obtener planificaciones sistémicas | ✅ Implementado | `/a/planes` · `/c/planes` (T23 · T49) · `GET /planification/all?include_inactive=true` · componente compartido con el Admin · búsqueda, chips por tipo e «Incluir inactivas», guardados en la URL · cada tarjeta muestra lo previsto (`number_of_routines`) y lo asignado (`routine_count`) y la duración en semanas · el Entrenador suma «Asignar» en las vigentes |
| CU-E-09 | Crear planificación sistémica | ✅ Implementado | `/a/planes/nuevo` · `/c/planes/nuevo` (T24 · T49) · `POST /planification/create` · al crear se abre el editor del plan, porque las rutinas solo se pueden agregar a un plan que existe · duración desde 0 (sin duración fija) · tipo de texto libre con los chips como atajo |
| CU-E-10 | Editar planificación sistémica | ✅ Implementado | `/a/planes/:id` · `/c/planes/:id` (T24 · T49) · `GET /planification/{id}` · `POST /planification/edit/{id}` · la cabecera se guarda con «Guardar planificación» y las rutinas, al instante · achicar la duración por debajo de la semana más alta con rutinas se avisa antes de pedirlo · un plan inactivo se ve sin acciones |
| CU-E-11 | Eliminar planificación sistémica (lógico) | ✅ Implementado | `/a/planes/:id` · `/c/planes/:id` (T24 · T49) · `POST /planification/set-active/{id}` · baja lógica con confirmación que dice que **no se quita a los alumnos que ya la tienen** (el prototipo dice lo contrario) · se puede reactivar · el aviso no puede decir cuántos alumnos la tienen: ningún endpoint lo da |
| CU-E-12 | Gestionar rutinas de una planificación | — *agrupador* | no se cuenta: agrupa a E-12a → E-12d |
| CU-E-12a | Asignar una rutina a planificación | ✅ Implementado | `/a/planes/:id` · `/c/planes/:id` (T24 · T49) · `POST /planification/routine/assign` · cada rutina va a una **semana** (obligatoria, de 1 a la duración) con su posición opcional (`order`, una etiqueta que puede repetirse) · una rutina se puede elegir más de una vez |
| CU-E-12b | Asignar rutinas en lote | ✅ Implementado | `/a/planes/:id` · `/c/planes/:id` (T24 · T49) · `POST /planification/routine/assign-bulk` · varias rutinas a una semana, hasta 50 y en el orden elegido (el tope sale de la spec del backend, no del contrato) |
| CU-E-12c | Quitar o reincorporar una rutina (lógico) | ✅ Implementado | `/a/planes/:id` · `/c/planes/:id` (T24 · T49) · `POST /planification/routine/set-active/{id}` · quitar es baja lógica con confirmación y conserva semana y posición · reincorporar a su lugar o a otro · mandar `order` con `active: false` da 400 · **lo quitado solo se puede reincorporar mientras no se salga de la pantalla**: el detalle del plan no lista los vínculos dados de baja |
| CU-E-12d | Quitar o reincorporar rutinas en lote (lógico) | ✅ Implementado | `/a/planes/:id` · `/c/planes/:id` (T24 · T49) · `POST /planification/routine/set-active-bulk` · quitar o reincorporar varias a la vez, o todas las quitadas a su lugar |
| CU-E-13 | Asignar planificación a alumno | ✅ Implementado | `/c/planes/:id/asignar` · `/c/alumnos/:id/asignar` (T41) · `POST /planification/user/assign` · solo el Entrenador (al Admin el backend le responde 403) · **un alumno por asignación** (el prototipo permite varios) · inicio, fin opcional (lo calcula el backend desde la duración; con duración 0 es obligatorio) y nota de hasta 100 caracteres · **solapamiento:** el 409 trae las asignaciones que se pisan y se puede ajustar las fechas, quitar la vieja o «Asignar igual» (`confirm_overlap: true`) · solo planes activos con rutinas y alumnos con la cuenta abierta |
| CU-E-14 | Eliminar planificación a alumno | ✅ Implementado | `/c/alumnos/:id` (modal «Planificaciones») (T41) · `GET /planification/user/{userId}` · `POST /planification/user/set-active/{id}` · baja lógica con confirmación y **se puede reincorporar**, con sus mismas fechas y sin revisar el solapamiento · el endpoint real es `set-active`, no el `DELETE` que figuraba · estados Vigente, Próxima, Terminada y Quitada, deducidos de las fechas · no hay edición: para cambiar fechas se quita y se asigna de nuevo |

### Administrar rutinas

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-15 | Obtener rutinas sistémicas | ✅ Implementado | `/a/rutinas` · `/c/rutinas` (T21 · T49) · `GET /routine/all-plus?include_inactive=true` · componente compartido con el Admin · búsqueda por nombre y nota del entrenador, sin acentos, e «Incluir inactivas» · cuenta los ejercicios de cada rutina |
| CU-E-16 | Crear rutina sistémica | ✅ Implementado | `/a/rutinas/nuevo` · `/c/rutinas/nuevo` (T22 · T49) · `POST /routine/create` · circuitos en orden (subir y bajar) · un circuito puede repetirse y se marca «En la rutina ×N» · agregar uno existente, nuevo o duplicado, yendo y viniendo del editor de circuitos con el borrador en memoria · hasta 50 circuitos |
| CU-E-17 | Editar rutina sistémica | ✅ Implementado | `/a/rutinas/:id` · `/c/rutinas/:id` (T22 · T49) · `GET /routine/{id}` · `POST /routine/edit/{id}` · la lista de circuitos se manda completa: cada vínculo con su `id` (el del `Routine_Circuit`, no el del circuito) y el nuevo sin él · la nota del entrenador se manda siempre · los 400 y 404 se traducen (rutina o circuito dados de baja) |
| CU-E-18 | Eliminar rutina sistémica (lógico) | ✅ Implementado | `/a/rutinas/:id` · `/c/rutinas/:id` (T22 · T49) · `POST /routine/set-active/{id}` · baja lógica con confirmación y reactivación · una rutina inactiva se ve con sus campos apagados y no ofrece asignar |
| CU-E-19 | Asignar rutina a alumno | ✅ Implementado | `/c/rutinas/:id/asignar` · `/c/alumnos/:id/asignar-rutina` (T42) · `POST /routine/assign-user` · una rutina para un día (son tantas asignaciones como días) · solo el Entrenador · **un alumno por asignación**, y el día que el prototipo no pide · el 409 de la misma rutina el mismo día se avisa y se va al cambiar el día · solo rutinas vigentes y alumnos con la cuenta abierta |
| CU-E-20 | Eliminar rutina a alumno | ✅ Implementado | `/c/alumnos/:id` (modal «Rutinas puntuales») (T42) · `GET /routine/assigned/{userId}` · `DELETE /routine/assign-user/{id}` · lista hoy y las que vienen, con «Incluir anteriores» y el avance de cada una · quitar es una baja **física** con confirmación · una rutina con ejercicios hechos no ofrece «Quitar» (el backend da 409) |

### Administrar circuitos

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-21 | Obtener circuitos | ✅ Implementado | `/c/circuitos` (T19 · T48) · `GET /routine/circuit/all-plus` · `GET /routine/all-plus` · componente compartido con el Admin · cuenta en cuántas rutinas se usa cada circuito |
| CU-E-22 | Crear circuito | ✅ Implementado | `/c/circuitos/:id` (T20 · T48) · `POST /routine/circuit/create` · circuito con ejercicios y series · un ejercicio no se repite (V2 resuelto) · el editor de series suma − y + (PR #55) |
| CU-E-23 | Editar circuito | ✅ Implementado | `/c/circuitos/:id` (T20 · T48) · `POST /routine/circuit/edit/{id}` · avisa que afecta a todas las rutinas que lo usan · duplicar |
| CU-E-24 | Eliminar circuito (lógico) | ✅ Implementado | `/c/circuitos` (T20 · T48) · `POST /routine/circuit/set-active/{id}` · baja lógica con confirmación y reactivación |

### Gestionar membresías

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-E-25 | Obtener membresías | ✅ Implementado | `/c/membresias` · `/c/pago` (T17 · T18) · `GET /membership/all` · tipos activos en los selectores |
| CU-E-26 | Obtener estado de membresías | ✅ Implementado | `/c/membresias` (T17) · `GET /membership/status/summary` · cuatro contadores, con «Sin pagos» · el mismo summary alimenta el badge de Mis alumnos · el backend cuenta también a los alumnos con la cuenta inactiva |
| CU-E-27 | Obtener alumnos por estado de membresía | ✅ Implementado | `/c/membresias` (T17) · `GET /membership/status/users?status=` · chips por estado · «Todas» son cuatro requests, todo o nada (V1) · la lista incluye cuentas cerradas sin decir cuáles |
| CU-E-28 | Obtener alumnos por tipo de membresía | ✅ Implementado | `/c/membresias` (T17) · selector de tipo **resuelto en el cliente**: cada alumno de `status/users` ya trae su tipo, así que no usa `type/users` (lo usa el Admin) |
| CU-E-29 | Registrar pago de alumno | ✅ Implementado | `/c/pago` (T18 · T50) · `POST /membership/payment/register` · manda solo `user_id` y `membership_id` · el vencimiento es hoy + duración y no suma lo que quedaba · un pago no se anula · desde el 24/10 **solo a alumnos con la cuenta abierta**: el backend rechaza (400) una cuenta cerrada, un destinatario que no es alumno y un tipo de baja, y el front no los ofrece (T50, PR #69 abierto) |

---

## Detalle — Rol Admin (23 CU · 100%)

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
| CU-A-16 | Obtener entrenadores | ✅ Implementado | `/a/entrenadores` (T35) · `GET /coach/all` · `GET /users/all?role=coach` · cruza por id el nombre (de `users`) con el email profesional (de `coach`) · V3 · desde el 17/10 `coach/all` pide token de admin |
| CU-A-17 | Convertir alumno a entrenador | ✅ Implementado | `/a/convertir` (T36) · `POST /coach/promote_user` · CUIL de 11 dígitos sin guiones · sobre un entrenador que ya lo es, reactiva y edita · el contrato del 24/10 documenta 400 para un admin y 409 por email o CUIL repetidos (BE-27); el front ya bloqueaba al admin y a la cuenta inactiva |
| CU-A-18 | Editar datos de entrenador | ✅ Implementado | `/a/entrenadores` (modal) (T37) · `POST /coach/promote_user` · desde el 17/10 se edita con `promote_user` (B8 resuelto: el backend no va a crear `POST /coach/edit/{id}`) · email profesional y CUIL · avisa antes un email repetido · reactiva el `Coach` si lo eliminaron con el modal abierto |
| CU-A-19 | Eliminar entrenador | ✅ Implementado | `/a/entrenadores` (T35) · `POST /coach/delete_coach/{id}` · baja lógica del `Coach`: el usuario vuelve a tener rol `user` · se reactiva volviendo a convertirlo |

### Administrar membresías (tipos)

| CU | Caso de uso | Estado | Pantalla · endpoint · nota |
|---|---|---|---|
| CU-A-20 | Obtener membresías | ✅ Implementado | `/a/membresias` (T34) · `GET /membership/all` · `GET /membership/type/users` · cuenta los alumnos de cada tipo (V1) |
| CU-A-21 | Crear membresía | ✅ Implementado | `/a/membresias` (modal) (T34) · `POST /membership/create` · una duración repetida da 400 y un nombre repetido, 409 |
| CU-A-22 | Editar membresía | ✅ Implementado | `/a/membresias` (modal) (T34) · `POST /membership/edit/{id}` · no es retroactivo: el pago copia nombre, duración y precio · repetir la duración (400) o el nombre (409) se avisa |
| CU-A-23 | Eliminar membresía | ✅ Implementado | `/a/membresias` (T34) · `POST /membership/set-active/{id}` · baja lógica con confirmación y reactivación |

> Pantallas del Admin sin CU propio (reutilizan los del Entrenador): **navegación** (T46: sidebar, tab bar y «Más»), **panel** (T30: conteos de seis endpoints), **usuarios** (T47: E-01 a E-03 más plan vigente, pagos y estado de membresía), **circuitos** (T19 y T20: E-21 a E-24), **rutinas** (T21 y T22: E-15 a E-18) y **planificaciones** (T23 y T24: E-08 a E-12d). Asignar a alumnos (E-13, E-14, E-19 y E-20) es solo del Entrenador: al Admin el backend le responde 403.

---

## Lo que queda

Los 75 CU están hechos contra el contrato. Lo que sigue no es de los CU:

| # | Qué | Detalle | Tareas | Estimado |
|---:|---|---|---|---:|
| 1 | **Liberar `develop` en `main`** | `main` está en `135649d` (el release #49 del 11/10) y `develop` en `909b717`, con T50 en el PR #69 sin mergear. Render despliega `main`: sin release, el sitio no tiene nada desde T21. | release | — |
| 2 | **Probar contra el backend real** | Cuentas de alumno, entrenador y admin en Render, con datos de entrenamiento (BE-21). Es el checklist del apéndice A del plan, en celular y en desktop. | apéndice A | — |
| 3 | **T45 · Extras sin caso de uso** | Progreso del alumno, adherencia y última sesión en Mis alumnos, y timer del Entrenador. Se hacen solo si sobra tiempo; los datos de B1 y B6 ya existen. | T45 | — |
| 4 | **Del backend (no son del front)** | C4 (el email con la contraseña temporal, antes del 20/11), BE-40 (el email no se edita: el front ya está listo), el seed de la cadena de entrenamiento (BE-21), recrear la base de Render antes del 2/11 y declarar en el Swagger lo que sigue en `pending.ts` (V1, V2 y V9). | C4, BE-40, BE-21 | — |

---

## Cómo leer los estados

- **✅ Implementado** — La pantalla existe, está en la navegación y llama a los endpoints reales del contrato. Ya no hay mocks (T44b).
- **🟡 Parcial** — La pantalla existe pero una parte del CU depende de algo que el backend no tiene o no devuelve (hoy: ninguno).
- **🔵 Placeholder** — La ruta o la sección está en la navegación con el aviso «Pantalla en construcción» (o una fila «Próximamente»): responde, pero no hace nada (hoy: ninguno).
- **⬜ No implementado** — No hay pantalla ni ruta que cubra el caso de uso (hoy: ninguno).
