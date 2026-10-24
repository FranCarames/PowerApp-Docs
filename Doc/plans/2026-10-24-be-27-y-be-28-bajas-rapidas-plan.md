# BE-27 y BE-28 — `promote_user` transaccional con `409` y el pago con reglas (CU-A-17, CU-E-29) · Plan de implementación

> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Los cambios de esta tarea quedan **sin stagear** mientras haya tareas anteriores sin commitear: así cada commit lleva una sola tarea.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escribieron **antes** del código y se corrieron en rojo.
> 3. **No se levanta el server**, ni se instala nada.
>
> **Este plan registra lo hecho:** el usuario pidió seguir con BE-27 y BE-28 el 24/10. Las dos tareas van juntas porque son arreglos chicos de la fase 4 sin esquema ni spec nueva, y ya estaban decididas en el roadmap (BE-27 el 16/10). Los dos bordes que no estaban decididos se los consulté antes de escribir código.

**Fuente:** [BE-27 y BE-28 del roadmap](2026-10-16-roadmap-backend.md) y los hallazgos 3 y 7 del Status del web.
**Modelo:** sin cambios. **No cambia ninguna entidad ni el DDL**: no se toca `Db Creator`.

**Goal:**
- **BE-27:** que convertir en entrenador no pueda dejar a un usuario con `role = coach` sin su registro `Coach`, que un email profesional o un CUIL repetidos den `409` y que un administrador no se pueda convertir.
- **BE-28:** que no se pueda registrar un pago de un tipo dado de baja, a un destinatario que no es alumno ni a una cuenta cerrada, y que un tipo inexistente dé `404`.

---

## 1. Decisiones del plan

**Las que el usuario eligió (24/10):**

1. **Un administrador no se convierte en entrenador: `400`.** El roadmap sólo lo dejaba anotado como riesgo, pero un admin que se promueve por error pierde su acceso (y hay una sola cuenta admin). El web ya lo bloquea del lado del cliente (CNV-07).
2. **No se registra un pago a una cuenta cerrada: `400`.** Es una regla que el roadmap no pedía. **Confirmada por el usuario el 24/10, con el conflicto a la vista:** PAG-08 y el aviso del front dicen *«El pago se registra igual, pero no va a poder ingresar hasta que la reactives»*, y **el web se adapta** (ver sección 5).

**Las que la spec no dice (se pueden vetar al revisar):**

3. **`promote_user`: el orden de las comprobaciones** es `404` (el usuario no existe) → `400` (es admin) → `409` del email → `409` del CUIL → la transacción. Se informa un repetido por vez.
4. **Lo repetido se compara contra todos los entrenadores, también los dados de baja:** los únicos de la base (`uk_coach_email` y `uk_coach_cuil`) no distinguen. El email y el CUIL **del propio usuario no cuentan** (un entrenador dado de baja que vuelve, o uno activo que se edita por CU-A-18, no choca consigo mismo).
5. **La carrera.** Dos altas con el mismo dato pasan las dos la consulta previa y la segunda choca con el único: se traduce al **mismo `409`**, mirando el nombre de la constraint (el patrón de BE-11, BE-24 y BE-25), y la transacción se deshace. Un `23505` de otra constraint sigue siendo `500`.
6. **El rol y el `Coach` se escriben en una transacción** con `QueryRunner` y la guarda del rollback (el patrón del proyecto, con la conexión abierta dentro del `try`). El usuario se guarda primero y el `Coach` después, así que el caso que antes quedaba a medias —un email repetido— ahora deshace el cambio de rol. `CoachService` suma el `DataSource`; el módulo no cambia (el `DataSource` es global).
7. **`updated_at` del usuario y del `Coach` se setea a mano**, como el resto de las ediciones (el `onUpdate` de las entidades no hace nada en Postgres; lo cierra BE-30).
8. **La respuesta de `promote_user` no cambia:** `200` con el usuario y su `coach`, sin contraseña. Sobre un entrenador que ya existe sigue reactivando y editando (decisión del 16/10), y eso queda dicho en el Swagger.
9. **Pago: la existencia va antes que las reglas.** `404` del alumno, `404` del tipo (antes `400`), y recién después los `400`, en este orden: destinatario que no es alumno, cuenta cerrada, tipo dado de baja. Un solo mensaje por vez.
10. **Los textos nuevos:**
    - `promote_user`: `No se puede convertir en entrenador a un administrador.`, `Ya existe un entrenador con ese email profesional` y `Ya existe un entrenador con ese CUIL`.
    - Pago: `El destinatario del pago tiene que ser un alumno.`, `La cuenta del alumno está cerrada: no se puede registrar el pago.` y `El tipo de membresía está dado de baja.`
11. **El pago válido no cambia:** `201`, con nombre, duración y precio copiados del tipo y vencimiento a fin de día.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/coach/coach.service.ts` | `promoteUserToCoach` con las comprobaciones previas, `savePromotion` (la transacción) y las constantes; el `DataSource` inyectado |
| `power-app/src/coach/coach.controller.ts` | El Swagger de `promote_user`: `400`, `404` y `409` |
| `power-app/src/membership/membership.service.ts` | `registerMembershipPayment` con las reglas y los textos |
| `power-app/src/membership/membership.controller.ts` | El Swagger de `payment/register`: `400` y `404` |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | La entrada del 24/10, las filas de A-17 y E-29, los conteos y la fase 4 |

**Docs (`D:\Power App\Docs\PowerApp-Docs`):** este plan, y `Use Cases/admin/CU-A-17-…md` (reescrito: sin «ya es entrenador», con la reactivación, la edición, el administrador, los repetidos y la atomicidad), `CU-A-18-…md` (los repetidos) y `Use Cases/entrenador/CU-E-29-…md` (los cinco caminos nuevos).

**Scratchpad** (fuera de los repos): `…/335dcfcb-52a1-4933-a5ac-194985358fde/scratchpad/be27/`.

---

## 3. Cobertura del roadmap

| Roadmap | Qué pide | Dónde |
|---|---|---|
| BE-27 | Una transacción para el rol y el `Coach` | `savePromotion` |
| BE-27 | `409` por `coach_email` o CUIL repetidos | las dos comprobaciones previas y la traducción del `23505` |
| BE-27 | Reescribir CU-A-17 sin «ya es entrenador» | `CU-A-17-…md` |
| BE-27 | Avisarle al web que T37 pasa a `promote_user` | Status, «Para el web» |
| BE-27 | El riesgo de promover a un admin | decisión 1: ahora es `400` |
| BE-28 | `400` si el tipo está dado de baja o el destinatario no es un alumno | `registerMembershipPayment` |
| BE-28 | `404` (antes `400`) si el tipo no existe | `registerMembershipPayment` |
| BE-28 | Acepta: pagar un tipo inactivo da `400` | `verify-payment-rules.js` |

---

## 4. Verificación (hecha el 24/10, sin levantar el server)

**Antes de escribir código**, los tres scripts corrieron **en rojo** (28, 16 y 8 fallas). Después, todo en verde:

| Script | Qué prueba | Chequeos |
|---|---|---:|
| `verify-promote-rules.js` | Los códigos y su orden; los repetidos (email, CUIL, los dos, de un entrenador dado de baja); el alta con el orden de la transacción y que nada se escriba fuera de ella; reactivar y editar un entrenador (su propio email no choca); **la atomicidad**, con una transacción falsa que restaura el estado al hacer rollback: la carrera por el email y por el CUIL, un `23505` de otra constraint, un fallo al guardar el `Coach` y otro al guardar el usuario, y la conexión caída; que la respuesta no traiga la contraseña | 50 |
| `verify-payment-rules.js` | El pago válido sin cambios; los `404`; los tres `400`; el orden entre las reglas; el `500` | 28 |
| `verify-controllers.js` | Rutas, verbos y roles sin cambios; que Nest pueda inyectar el `DataSource` en `CoachService`; el Swagger de los dos endpoints | 22 |

- **Build:** sin errores.

**Qué NO se verificó:**
- Que el `23505` real de Postgres llegue con los nombres `uk_coach_email` y `uk_coach_cuil`: son los del DDL de `Db Creator`, y la base de Render se creó con él. Si algún día un único tuviera otro nombre, una carrera daría `500` en vez de `409` (el camino normal, con la consulta previa, no depende de eso).
- Que Nest arranque con el módulo (se probó la inyección con un proveedor falso, no el arranque).
- El runtime contra la base (BE-35).

---

## 5. Para el web y lo que queda abierto

- **T37 (editar entrenador)** pasa a `POST /coach/promote_user`, que sobre un entrenador activo edita su email y su CUIL (decisión del 16/10).
- **PAG-07** (un tipo dado de baja mientras tanto) ahora lo rechaza el backend con `400` y `El tipo de membresía está dado de baja.`: el aviso de «ya no es válido» pasa a tener un `400` real detrás, y el `known` «Hoy no cumple el CU» del plan de pruebas queda viejo. Re-correr PAG-07.
- **PAG-08 (cuenta cerrada): el web se adapta (decidido el 24/10).** El front hoy deja elegir a un alumno con la cuenta cerrada y avisa que *«el pago se registra igual»*; el backend responde `400` con `La cuenta del alumno está cerrada: no se puede registrar el pago.` El web tiene que dejar de ofrecer a los alumnos cerrados para pagar (o mostrar ese `400`) y corregir el aviso y PAG-08.
- **El web ya bloquea del lado del cliente** convertir a un administrador (CNV-07, coincide con el `400`) y a una cuenta inactiva (el aviso «Reactivala desde Usuarios…»). **El backend sólo bloquea al administrador**: convertir en entrenador a una cuenta cerrada sigue siendo posible por API. Es la misma regla que la de los pagos, de otra dirección; si se quiere, es un `400` más.
- **`promote_user` sobre el propio admin ya no lo baja a entrenador.**
