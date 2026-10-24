# BE-30 — `updated_at` automático en todas las entidades (hallazgo 4) · Plan de implementación

> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Los cambios de esta tarea quedan **sin stagear** mientras haya tareas anteriores sin commitear: así cada commit lleva una sola tarea.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build, `Db Creator` regenerado y **scripts descartables en el scratchpad**, que no entran a ningún repo. Se escribieron **antes** del código y se corrieron en rojo.
> 3. **No se levanta el server**, ni se instala nada. Las escrituras se probaron con el service real sobre el seed en un SQLite en memoria (`node:sqlite`, que ya viene con Node), no en un Postgres.
>
> **Este plan registra lo hecho:** el usuario pidió BE-30 el 24/10, en una sesión aparte. Las tres decisiones de diseño se las consulté **antes** de escribir código.

**Fuente:** [BE-30 del roadmap](2026-10-16-roadmap-backend.md) (§3 y §5) y el hallazgo 4 del Status.
**Modelo:** sin cambios. **No cambia el DDL**: la columna ya es `TIMESTAMPTZ NOT NULL DEFAULT NOW()` en las 20 tablas. `Db Creator` se regeneró y `01`, `02` y `03` quedaron **byte-idénticos**.

**Goal:** que `updated_at` se mueva sola cada vez que se escribe una fila, en todas las tablas, y que dejen de hacer falta los `updated_at = new Date()` a mano.

**Cómo funciona (verificado en el código de TypeORM 0.3.27, no de memoria):**
- `@UpdateDateColumn` hace que el `UPDATE` que arma `save()` o `update()` agregue `"updated_at" = CURRENT_TIMESTAMP`, **sólo si ya hay algo que escribir y sólo si el pedido no trae `updated_at`** (si lo trae, respeta el valor y no lo duplica: dos asignaciones a la misma columna las rechaza Postgres).
- **`save()` no escribe si no hay diferencias** (`mustBeUpdated` exige un cambio): las ediciones idempotentes siguen sin mover `updated_at`.
- **`save()` pide `RETURNING "updated_at"`** y TypeORM lo vuelca en la entidad, así que la respuesta trae el valor nuevo. **`repository.update()` no**: no pide `RETURNING`, y la entidad en memoria queda con el valor viejo. De ahí la decisión 3.

---

## 1. Decisiones del plan

**Las que el usuario eligió (24/10):**

1. **Las 20 entidades con `updated_at`, no las 18 del roadmap.** `Membership` y `Membership_Payment` ni siquiera tenían el `onUpdate` de MySQL (`Membership` lo seteaba a mano; el pago, nunca). Consecuencias: las bajas lógicas de rutina, circuito y planificación pasan a mover `updated_at`, y el cron que vence los pagos (`updateFinishedMembershipPayments`) mueve el `updated_at` del `Membership_Payment` que da de baja. Eso ya era así para usuario, tipo de membresía y plan del alumno, que lo hacían a mano.
2. **`editRoutine` y `editCircuit` conservan el seteo manual.** Editan los hijos (los circuitos de la rutina; los ejercicios y las series del circuito) y a veces dejan la cabecera igual; TypeORM no escribe una fila sin cambios, así que sin el seteo esa edición dejaría de mover la fecha: un retroceso respecto de hoy. Se conservan `routine.updated_at = new Date()` y `circuit.updated_at = new Date()`, con el comentario corregido (ya no dice «el `onUpdate` es de MySQL»: dice por qué se fuerza). Las otras dos opciones eran un toque con el reloj de la base (`update(Entity, id, {})`, una consulta más) o sacarlo sin más.
3. **Los tres `update()` que devuelven `updated_at` lo conservan en el `update()`.** Son marcar en la vía individual, marcar en la vía del plan y quitar o reincorporar el plan de un alumno. Como `repository.update()` no refresca la entidad, la respuesta necesita el valor: pasarlo a mano evita releer la fila, y TypeORM no lo duplica. No cambia ninguna respuesta ni ninguna consulta. Las otras dos opciones eran releer la fila (una consulta más por escritura y adaptar los scripts de BE-14, BE-18 y BE-20c) o un `UPDATE … RETURNING` (más código en cada sitio).

**Las que la spec no dice (se pueden vetar al revisar):**

4. **La declaración es `@UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })`**: el mismo tipo y el mismo default que tenía la columna, y por eso el DDL no cambia. `created_at` no se toca. Se saca el `onUpdate: 'CURRENT_TIMESTAMP'` (TypeORM lo completa solo con `now()`, y para Postgres no se usa).
5. **Se sacan los seteos manuales que `save()` ya cubre:** `users.service` (cuatro: `editUser`, `setUserActive`, `recoverPassword` y `changePassword`), `muscles.service` (dos), `membership.service` (dos) y `CoachService.savePromotion` (el usuario y el `Coach`, con su `const now`). La respuesta sigue trayendo el valor nuevo, porque `save()` lo trae de vuelta con `RETURNING`.
6. **Una edición que no cambia nada ya no mueve `updated_at`.** Antes, `editUser`, `setUserActive` al mismo estado, `editMuscle`, `editMembership` o `promote_user` con los mismos datos escribían igual (el seteo manual siempre generaba una diferencia). Ahora `save()` no escribe y la fecha no se mueve: es lo que dice «última vez que cambió la fila» y es lo que ya hacían los caminos idempotentes de marcar. **La excepción son `editRoutine` y `editCircuit`** (decisión 2).
7. **Dos relojes.** Casi todo usa el de la base (`CURRENT_TIMESTAMP`); los cinco sitios de las decisiones 2 y 3 usan el de la app (`new Date()`). Un desfase entre los dos, de milisegundos o segundos, podría hacer que un `updated_at` automático posterior quede un poco *antes* que uno forzado. No hay nada que dependa de esa comparación.
8. **BE-27 dejó el `updated_at` del usuario y del `Coach` «seteado a mano (lo cierra BE-30)»**: esto lo cumple. `savePromotion` ya no lo setea.
9. **Los comentarios de los sitios que quedan** dicen la razón de ahora; ninguno sigue hablando de «sintaxis de MySQL».

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/entities/*.entity.ts` (las 20) | `updated_at` pasa a `@UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })`; el import suma `UpdateDateColumn` |
| `power-app/src/users/users.service.ts` | Sin los cuatro `user.updated_at = new Date()` |
| `power-app/src/muscles/muscles.service.ts` | Sin los dos seteos (`editMuscle`, `editMuscleGroup`) |
| `power-app/src/membership/membership.service.ts` | Sin los dos seteos (`editMembership`, `setMembershipActive`) |
| `power-app/src/coach/coach.service.ts` | `savePromotion` sin `now` ni los dos seteos; el comentario |
| `power-app/src/routine/routine.service.ts` | Sólo comentarios: `editRoutine` y `editCircuit` (por qué se fuerza) y las dos marcas (por qué va en el `update()`) |
| `power-app/src/planification/planification.service.ts` | Sólo el comentario de `setUserPlanificationActive` |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | La entrada del 24/10, el hallazgo 4 cerrado, la fila de CU-E-10 y la fase 4 |

**`Db Creator`:** sin cambios. Se regeneró con `py build_sql.py` y los hashes de `01`, `02` y `03` no cambiaron.

**Docs (`D:\Power App\Docs\PowerApp-Docs`):** este plan. No cambia ningún CU ni ningún contrato.

**Scratchpad** (fuera de los repos): `…/abc3d83f-b086-4fe2-8a53-778219226d42/scratchpad/be30/`.

---

## 3. Cobertura del roadmap

| Roadmap | Qué pide | Dónde |
|---|---|---|
| BE-30 | `@UpdateDateColumn({ type: 'timestamptz' })` en todas | Las 20 entidades (decisión 1) |
| BE-30 | Sacar los `updated_at = new Date()` a mano | `users`, `muscles`, `membership`, `coach` (decisión 5). Se conservan cinco, con razón (decisiones 2 y 3) |
| BE-30 | `Db Creator`: regenerar y confirmar que `01` no cambia | `01`, `02` y `03` byte-idénticos |
| BE-30 | Aceptación: editar una planificación devuelve `updated_at` nuevo | `verify-write-paths.js`, con el `editPlanification` real |
| BE-30 | Actualizar el Status (cierra el hallazgo 4) | El informe y el dashboard |

---

## 4. Verificación (hecha el 24/10, sin levantar el server)

**Antes de escribir código**, los tres scripts nuevos corrieron **en rojo** (78, 66 y 13 fallas). Después, todo en verde:

| Script | Qué prueba | Chequeos |
|---|---|---:|
| `verify-entities-metadata.js` | La metadata real de las 20 entidades, con un `DataSource` sin conexión sobre `dist/entities`: `updated_at` es `isUpdateDate`, `timestamptz`, no nula, con el default `CURRENT_TIMESTAMP` y sin el `onUpdate` de MySQL; `created_at` no se tocó. Con el SQL real: un `UPDATE` agrega `"updated_at" = CURRENT_TIMESTAMP` **una vez**, con un `updated_at` explícito va el valor y no se duplica, y el `INSERT` deja que la base ponga el valor | 302 |
| `verify-source-sets.js` | El texto de `power-app/src`: las 20 entidades con `@UpdateDateColumn` y sin `onUpdate`; **qué seteos manuales quedan** (sólo los cinco, en `routine.service` y `planification.service`); que ningún comentario diga «sintaxis de MySQL» y que los de `editRoutine` y `editCircuit` expliquen la razón nueva | 93 |
| `verify-write-paths.js` | **Los services reales sobre el seed** (SQLite como base; el SQL de TypeORM es el de Postgres): `editPlanification` (la aceptación), las bajas de planificación, rutina y circuito, `editUser`, `setUserActive`, `updateUserRole`, `editMuscle`, `editMuscleGroup`, `editMembership`, `setMembershipActive`, `promote_user` (reactivar con la transacción real, y editar sólo el email), `editRoutine` con un circuito menos y la cabecera igual, marcar y quitar el plan, y el cron de pagos. En cada una: `updated_at` se mueve, `created_at` no, **la respuesta trae el mismo valor que la base**, el `UPDATE` nombra `updated_at` una sola vez, y un pedido sin cambios no escribe | 105 |

**Regresión:** los 27 scripts de BE-12 a BE-28 corren sobre el `dist` nuevo, **0 fallas**, con una excepción buscada: `verify-promote-rules.js` de BE-27 afirmaba «el `updated_at` se setea a mano» y ya no corresponde. La copia adaptada (en `be30/`) afirma lo contrario, y el efecto real lo prueba `verify-write-paths.js`.

- **Build:** sin errores.
- **`Db Creator`:** `py build_sql.py` y los `sha256` de `01`, `02` y `03` antes y después son iguales; el `01` trae `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` en las 20 tablas, que es lo que declaran las entidades.

**Qué NO se verificó:**
- Que un **Postgres real** ejecute el `UPDATE … SET "updated_at" = CURRENT_TIMESTAMP … RETURNING "updated_at"`. Se vio el SQL que arma TypeORM y se ejecutó en SQLite, que traduce `CURRENT_TIMESTAMP` a la hora actual.
- Los `INSERT`: no corren en SQLite (TypeORM usa `DEFAULT` en los `VALUES`). Se verificaron como SQL (`updated_at` va en `DEFAULT`, nunca como parámetro), pero no se ejecutaron.
- **`editCircuit` de punta a punta:** reemplaza las series con `INSERT`. Se probó el mecanismo que usa (un `save()` sin cambios no escribe; con `updated_at` forzado sí), y que la línea siga en el código.
- El cron en su horario (se corrió la función, no el `@Cron`), y el runtime contra la base (BE-35).

---

## 5. Para el web y lo que queda abierto

- **No cambia ningún contrato.** Las respuestas ya traían `updated_at`; lo que cambia es que ahora **se mueve cuando se edita**. Antes quedaba en la fecha de alta casi siempre (las ediciones de planificación, ejercicio, grupo muscular… nunca lo movían). Si el web mostraba «editado el…», ahora va a mostrar fechas distintas de la de alta, que es lo correcto.
- **Un pedido que no cambia nada no mueve la fecha** (decisión 6), salvo `editRoutine` y `editCircuit`.
- **Si molesta el reloj de la app** en los cinco sitios que lo conservan, la salida es el toque con el reloj de la base (`update(Entity, id, {})` para el forzado y releer la fila para los tres `update()`); no hace falta ahora.
- **Sin acción sobre la base de Render:** el DDL no cambió, así que BE-23 no depende de esta tarea.
