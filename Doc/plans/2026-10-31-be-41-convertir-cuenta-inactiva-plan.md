# BE-41 — CU-A-17: no convertir una cuenta inactiva · Plan de implementación

> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Los cambios del backend quedan **stageados**, y en el repo de docs el plan y el roadmap también; la copia del Status en `PowerApp-Docs/Status/` queda **sin stagear** (así lo manda el `CLAUDE.md`). Cada repo tiene su commit y lo hace el usuario.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **un script descartable en el scratchpad**, que no entra a ningún repo. Se escribió **antes** del código y se corrió en rojo.
> 3. **No se levanta el server**, ni se instala nada.
>
> **Este plan registra lo hecho:** el usuario pidió BE-41 el 31/10 con el contrato cerrado (condición, status, texto exacto, dónde va y qué no se bloquea). No quedó ninguna decisión abierta; las dos cosas que la spec no dice están en la sección 1 y se pueden vetar.

**Fuente:** [BE-41 del roadmap](2026-10-16-roadmap-backend.md) (§3 y §5), `CU-A-17` (31/10) y los tests CNV-07 y CNV-10 de *Usuarios y entrenadores*.
**Modelo:** sin cambios. **No cambia ninguna entidad ni el DDL**: no se toca `Db Creator`.

**Goal:** que `POST /coach/promote_user` rechace con `400` a un alumno con la cuenta dada de baja, sin cambiar nada, y que un entrenador con la cuenta inactiva se siga editando (CU-A-18).

**El bug:** `promoteUserToCoach` sólo miraba que el usuario existiera y que no fuera administrador. Un alumno con `active = false` pasaba, quedaba con `role = coach`, con su `Coach` activo y con la cuenta todavía cerrada: un entrenador que no puede entrar. CNV-10 lo muestra (el backend lo convierte igual). CU-A-17 dice, en el paso 1, que hay que reactivar la cuenta antes de convertirla.

---

## 1. Decisiones del plan

**Las que el usuario fijó (31/10), en el pedido:**

1. **La condición es `user.role === UserRole.user && !user.active`.** Mira el `role`, no sólo `active`: un entrenador con la cuenta inactiva tiene `role = coach` y no entra en la regla.
2. **`400` con `{ error: 'No se puede convertir en entrenador a una cuenta inactiva.' }`**, en una constante `PROMOTE_INACTIVE_ERROR` junto a `PROMOTE_ADMIN_ERROR`. El front compara el texto, así que no se cambia.
3. **Dónde:** en `promoteUserToCoach`, después del chequeo del administrador y antes de los duplicados. Queda el orden `404` → `400` (administrador) → `400` (cuenta inactiva) → `409` del email → `409` del CUIL → la transacción. No cambia nada y no abre la transacción.
4. **Un entrenador con la cuenta inactiva se sigue editando** (CU-A-18): no se bloquea.
5. **El caso se declara en el `@ApiResponse` 400** de `promoteUserToCoach` (`coach.controller.ts`).

**Las que la spec no dice (se pueden vetar al revisar):**

6. **El `400` de la cuenta inactiva gana a los `409`.** Si el alumno está inactivo y además el email o el CUIL están repetidos, responde `400`, no `409`: no se consulta ningún `Coach`. Es consecuencia del orden de la decisión 3, y el aviso útil para el admin es el primero (reactivar la cuenta).
7. **Un entrenador dado de baja con la cuenta también inactiva queda alcanzado.** `deleteCoach` pone `role = user` y `Coach.active = false` y **no toca `User.active`**. Si ese alumno ex entrenador además tiene la cuenta cerrada, `role === user && !active` es verdadero: hay que reactivar la cuenta desde Usuarios antes de reactivarlo como entrenador. Es lo que dice la spec («hay que reactivarla antes de convertirla») y lo que pide la condición; el caso normal (cuenta activa) no cambia. Queda probado.
8. **Los textos del Swagger** pasan a nombrar los tres casos del `400` (datos inválidos, administrador y cuenta inactiva) y aclaran que un entrenador inactivo sí se edita.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/coach/coach.service.ts` | La constante `PROMOTE_INACTIVE_ERROR`, el chequeo en `promoteUserToCoach` y el comentario del método |
| `power-app/src/coach/coach.controller.ts` | El `@ApiResponse` 400 de `promote_user` declara el caso de la cuenta inactiva |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | La entrada del 31/10, la fila de CU-A-17 y la fase 4 (se copian a `PowerApp-Docs/Status/`) |

**`Db Creator`:** sin cambios. No cambia ninguna entidad.

**Docs (`D:\Power App\Docs\PowerApp-Docs`):** este plan y la fila BE-41 del roadmap (con su detalle, los totales y el inventario). `CU-A-17` y los tests CNV-07 y CNV-10 **ya estaban al día** (commit `dcff396`): no se tocan.

**Scratchpad** (fuera de los repos): `…/9c65d612-a8df-4774-bb24-b7dfb45704c3/scratchpad/be41/`.

---

## 3. Cobertura del roadmap

| Roadmap | Qué pide | Dónde |
|---|---|---|
| BE-41 | `400` con el texto exacto si `role === user && !active` | `coach.service.ts`, `promoteUserToCoach` |
| BE-41 | La constante `PROMOTE_INACTIVE_ERROR` junto a `PROMOTE_ADMIN_ERROR` | `coach.service.ts` |
| BE-41 | Después del admin y antes de los duplicados | El orden del método (verificado por texto y por comportamiento) |
| BE-41 | No bloquear a un entrenador inactivo | La condición mira `role`; probado con `role = coach` |
| BE-41 | Declararlo en el `@ApiResponse` 400 | `coach.controller.ts` |
| BE-41 | Build en verde, Status al día y copiado | Secciones 4 y 5 |

---

## 4. Verificación (hecha el 31/10, sin levantar el server)

**Antes de escribir código**, el script nuevo corrió **en rojo: 17 fallas** (12 chequeos ya en verde). La primera es el bug: el alumno con la cuenta cerrada se convertía con `200`, quedaba `role = coach` y la transacción se abría. Después, todo en verde:

| Script | Qué prueba | Chequeos |
|---|---|---:|
| `verify-promote-inactive.js` | **El `CoachService` real** sobre un mundo en memoria (el de BE-27, con transacción que restaura el estado al hacer rollback): alumno inactivo → `400` con el cuerpo exacto `{ error }`, estado idéntico antes y después, sin conectar ni abrir la transacción ni consultar ningún `Coach`; con email y CUIL repetidos igual `400`; administrador inactivo → el `400` del administrador; usuario inexistente → `404`; **entrenador con la cuenta inactiva → `200`** (edita el email, conserva el rol y no le reactiva la cuenta); alumno activo, y entrenador dado de baja con la cuenta activa → `200` como siempre; el ex entrenador con la cuenta inactiva → `400` (decisión 7); el `409` del email no cambió. Y **sobre el texto**: la constante con el texto exacto y justo después de `PROMOTE_ADMIN_ERROR`, la condición literal del contrato entre el chequeo del administrador y la búsqueda del `Coach`, y el `@ApiResponse` 400 nombrando el administrador, la cuenta inactiva y al entrenador que sí se edita | 29 |

**Regresión:**
- Los 26 scripts de BE-12 a BE-28 sobre el `dist` nuevo, **0 fallas**, incluidos `verify-controllers.js` y `verify-payment-rules.js` de BE-27 y BE-28 (el primero lee el Swagger de `promote_user`).
- `verify-promote-rules.js` de BE-27 (la copia adaptada por BE-30): **50 chequeos, 0 fallas**. Sus usuarios tienen la cuenta activa, así que no cambia nada: los `404`, `400` del administrador, `409`, la transacción y los rollbacks siguen igual.

- **Build:** `npm --prefix power-app run build`, sin errores.
- **`Db Creator`:** no se regeneró, porque no cambia ninguna entidad.

**Qué NO se verificó:**
- El runtime contra una base: la regla se probó con el service real y un repositorio en memoria, no contra Postgres (BE-35). Lo que depende de la base es sólo que `findOne` traiga `active`, y trae la entidad completa.
- La pantalla del web (CNV-07, CNV-10): es de su repo.

---

## 5. Para el web y lo que queda abierto

- **No cambia ningún contrato salvo el caso nuevo:** `POST /coach/promote_user` ahora puede responder `400` `{ error: 'No se puede convertir en entrenador a una cuenta inactiva.' }`. El front compara ese texto para mostrar *«La cuenta de … está inactiva. Reactivala desde Usuarios para poder convertirla en entrenador.»* Ese aviso ya sale al elegir una cuenta inactiva (CNV-07); que salga también ante este `400` (CNV-10) es de la T52 del web, en su repo.
- **CNV-10 deja de ser un `known` «Hoy falla»** del lado del backend: el texto del plan de pruebas (*«Hoy el backend la convierte igual»*) queda viejo en cuanto se despliegue. Re-correrlo al desplegar. CNV-07 no cambia.
- **El Status:** no cambian los conteos (73 ✅ · 1 🟡). A-17 ya figuraba ✅ con el corte del 16/10; la spec nueva del 31/10 lo habría vuelto 🟡 y esta tarea lo deja ✅ de nuevo, con la misma lógica de BE-40 para U-06.
- **Sin acción sobre la base de Render:** el DDL no cambió.
