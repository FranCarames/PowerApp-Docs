# Roadmap para terminar el backend de PowerApp

> **Fecha:** 2026-10-16 · **Alcance:** `power-app/src` y `Db Creator/` del repo PowerApp-Backend, contra los 75 CU de [`Use Cases/`](../../Use%20Cases/README.md).
> **Fuentes:** el código (manda), el [Status del backend](https://github.com/FranCarames/PowerApp-Backend/blob/main/Status/estado-implementacion-backend.md) (corte del 12/10), el [Status del web](../../Status/estado-implementacion-web.md) (10/10), [`Doc/app-ios/`](../app-ios/contexto-backend.md), [`Tests/`](../../Tests/README.md) y el cronograma de `Doc/um/`. Jerarquía ante contradicciones: código > Status > docs (ver §7).
> **Método:** relevamiento por lectura, sin levantar el server ni conectarse a la base. Se verificó que `npm --prefix power-app run build` compila y que `Db Creator` regenerado en una copia queda **byte-idéntico** a los tres `.sql` versionados. Lo que depende del runtime está marcado *sin verificar*.
> **No consultado:** el `PLAN.md` del web (su repo no estaba en la sesión). Lo que significa cada dependencia B1–B9 del web se deduce de su Status.

## 1. Resumen ejecutivo

### Estado real hoy

Sale del inventario del anexo (§9), no del Status:

| Estado | CU (16/10) | Status (12/10) |
|---|---:|---:|
| ✅ Implementado | **56**, 9 de ellos con un defecto abierto (⚠) | 63 |
| 🟡 Parcial | **9** | 1 |
| 🔵 Andamiaje | **3** | 4 |
| ⬜ No implementado | **6** | 7 |
| — Sin backend (sólo cliente) | **1** | — |
| **Total** | **75** | 75 |

Por qué difiere del Status:

- **Siete CU pasan de ✅ a 🟡** porque un camino de su spec no se cumple: U-02, U-04, A-10, A-13, A-14, A-15 y A-17.
- **U-09 pasa de 🔵 a 🟡:** la lógica existe en `GET /routine/:id`; le falta el rol `user` con su check de asignación.
- **U-14 sale de ⬜:** su spec lo deja enteramente en el cliente, y el web ya lo tiene.

### Lo que ya está avanzado (punto de partida, no se rehace)

- **Bloques cerrados con lógica real:**
  - Circuitos (E-21 a E-24).
  - Rutinas sistémicas (E-15 a E-18).
  - Planificaciones sistémicas y sus rutinas (E-08 a E-12d).
  - Todo el Admin salvo las brechas de §5.

  El web puede arrancar su bloque C2 ya (BE-07).
- **El modelo de ejecución está casi listo:**
  - `Routine_Exercise_Finished` (el "hecho" por ejercicio, con `UNIQUE` y FK `RESTRICT`) existe desde el 25/8.
  - Hay `active` en `Routine_Asignation`, `User_Planification` y `User_Routine` desde el 31/8.
  - La regla de visibilidad de vínculos inactivos para el alumno (25/8 y 27/8) ya está implementada como parámetro de los builders (`routine.service.ts:816` y `:912`).
- **U-09 y U-10 están a medio camino:**
  - `GET /routine/:id` ya arma el árbol completo que pide U-09.
  - `GET /exercise/:id` devuelve la ficha de U-10.
  - U-11 tiene su check de dueño.
- **Contratos y decisiones previas:**
  - El contrato de E-19/E-20 está acordado desde el 27/8: limpiar `Routine_Asignation_User`, sumar `UNIQUE (routine_id, user_id)` y tres endpoints en `routine/`.
  - E-14 está decidido desde el 31/8 (baja lógica en cascada) y su spec ya está reescrita.
  - U-12 tiene un diseño previo con marcar, desmarcar y listar ([spec del 10/8](../specs/2026-08-10-routine-exercise-set-finished-design.md)), a adaptar del nivel serie al nivel ejercicio.
- **Patrones reutilizables:**
  - El `409` de "en uso" de A-06 (12/10).
  - La unicidad de nombre en memoria de membresías y ejercicios (12/10).
  - Las transacciones con `QueryRunner` y la guarda del rollback.
  - El `set-active` para bajas lógicas.
  - Los patches de `Db Creator/patches/` para llevar una base viva al esquema nuevo.
- **Seed:** usa UUID v5 deterministas y `ON CONFLICT DO NOTHING`, así que el `03` se puede re-aplicar sobre una base ya regenerada sin duplicar.
- **Clientes:**
  - El web tiene 49 CU con pantalla y tipos provisionales con nombres propuestos (por ejemplo `password_change_required`) que el contrato puede adoptar tal cual.
  - `Tests/` tiene 5 planes con tandas corridas.

### Qué falta

- **El flujo del alumno completo:**
  - Asignar una rutina puntual (E-19/E-20, que entran al MVP el 16/10) o una planificación (E-13/E-14).
  - Verla (U-08 a U-10) y ejecutarla (U-12/U-13).
  - El historial del entrenador (E-06/E-07).

  Requiere un cambio de modelo: **hoy una rutina puntual no se puede ejecutar** (BE-10).
- **Dos agujeros de seguridad expuestos en el deploy público:**
  - El registro acepta `role`, así que cualquiera puede registrarse como admin.
  - Varias lecturas abiertas al rol `user` no comparan contra el token.
- **Brechas y deuda:**
  - Cinco CU del Admin que no cumplen un camino de su spec.
  - El mail real de U-04 y el flag de contraseña temporal.
  - La deuda de contrato que anotó el web: V1, V9, V10 y el Swagger.
- **Entorno:** regenerar la base antes de que venza (~2/11) y armar un seed que permita demostrar los flujos.

### Esfuerzo y dependencias

**Esfuerzo:** 43 tareas, **≈ 98 h netas** (≈ 96 h sin la opcional BE-22). Criterio:

- Un desarrollador, horas netas.
- Incluye la spec y el plan cuando corresponden, el código, el build, `Db Creator` y el Status de cada tarea.
- **No incluye** el tiempo de correr las pruebas manuales.

Del 16/10 al 17/11 son ≈ 4,5 semanas, o sea **≈ 20 h por semana**.

| Tipo | Tareas | Horas |
|---|---:|---:|
| Funcional | 12 | 42,5 |
| Contrato con el front | 7 | 13 |
| Bug | 9 | 12 |
| Calidad | 5 | 10 |
| Entorno | 3 | 8,5 |
| Docs | 3 | 6 |
| Endurecimiento | 2 | 5 |

**Dependencias críticas:**

1. **El diagrama primero.** El usuario tiene que actualizar el diagrama de `Doc/` antes de BE-10 y BE-18, porque el modelo manda.
2. **La base vence alrededor del 2/11** (dato del Status web: se recreó el 3/10; *sin verificar*). Es una fecha fija: el cambio de esquema del bloque A (BE-10) tiene que estar antes.
3. **El mail necesita una cuenta.** BE-29 no arranca sin que el usuario cree la cuenta del proveedor y cargue la API key en Render.
4. **Nada del bloque C2 ni del flujo nuevo se probó en runtime.** BE-35 es la primera vez que se ejecutan.

## 2. Definición de "backend terminado"

Criterios de salida propuestos, a validar por el usuario:

1. **Cobertura.** Los **74 CU con backend** quedan ✅: los 75, menos U-14, que es del cliente. Ninguno en 🟡, 🔵 o ⬜, según el inventario del anexo puesto al día.
2. **Sin andamiaje.** Toda ruta declarada responde: no queda ningún handler con `@Res()` que no envíe respuesta. Toda ruta sin CU está justificada en el Status o se retira.
3. **Autorización:**
   - Cada endpoint declara sus roles.
   - Los que aceptan el rol `user` sobre datos de un alumno comparan contra el token.
   - Ningún dato personal (email, CUIL, RMs, pagos) sale de un endpoint público.
   - El registro sólo crea alumnos.
4. **Pruebas:**
   - La última tanda de cada plan de `Tests/` no tiene fallas del lado del backend.
   - Existe un plan **Backend** que cubre lo marcado "sin verificar en runtime" en el Status y el flujo de ejecución, y está corrido.
5. **Contrato:**
   - El Swagger declara la respuesta real y los códigos de error de cada endpoint.
   - Las dependencias B1 a B7 y B9 del web están cubiertas, y V1, V9 y V10 cerrados.
6. **Datos y entorno:**
   - `Db Creator` regenera byte-idéntico.
   - La base de Render está recreada con el esquema final y un seed que permite demostrar los flujos de los tres roles.
   - El arranque de producción está verificado.
7. **Documentación:**
   - El Status (informe y dashboard) tiene los conteos reales y el changelog al día.
   - Las specs de CU dicen lo que hace el código.
   - `npm --prefix power-app run build` está en verde.
8. **Sin tests automáticos** (decisión del 16/10). La verificación es por build y por los planes manuales.

## 3. Tabla maestra de tareas

Prioridad (orden por defecto): **P1** bloquea al web o a la app iOS · **P2** CU del MVP faltante o incompleto · **P3** bug o deuda · **P4** endurecimiento u opcional. Las marcadas con **P1\*** son una excepción por seguridad: no bloquean a nadie, pero son baratas y están expuestas en Render.

| ID | Fase | Tarea | Tipo | Fuente | Depende de | Esfuerzo | ¿Cambia esquema? | Prioridad |
|---|---|---|---|---|---|---:|---|---|
| BE-01 | 1 | Registro: el `role` del body no se respeta, siempre crea `user` | Bug | CU-U-01; `create_user.dto.ts:45-46`; `users.service.ts:115` | — | 0,5 h | No | P1\* |
| BE-02 | 1 | Autorización por rol y por dueño (matriz) | Endurecimiento | Status 18/8 (CU-U-10); Status web, hallazgo 7; CU-U-07, U-19, A-16, E-03 | — | 3 h | No | P1\* |
| BE-03 | 1 | Login: flag `password_change_required` | Contrato con el front | CU-U-02, paso 3; web B9; Tests Acceso LOG-09, LOG-10, REC-07 | — | 1 h | No | P1 |
| BE-04 | 1 | Promesas sin esperar: `return` en los handlers y try/catch en el alta y el login | Bug | `users.service.ts:102` y `:128`; los 8 controllers | — | 2 h | No | P3 |
| BE-05 | 1 | RMs con `exercise_id` y `user_id` en la respuesta (V10) | Contrato con el front | Status web, V10; `user_rm.service.ts:102` | — | 0,5 h | No | P1 |
| BE-06 | 1 | Higiene de producción: `config.ts`, `logging`, la temporal en los logs y el arranque en Render | Entorno | `app.module.ts:30`; `users.service.ts:202`; `power-app/config.ts` | — | 1,5 h | No | P3 |
| BE-07 | 1 | Confirmarle al web que C2 tiene backend (E-08 a E-12d, E-15 a E-18) | Contrato con el front | Status web, hallazgo 1 | — | 0,5 h | No | P1 |
| BE-08 | 1 | Status del backend al día con este inventario | Docs | Status: tabla del 4/9, hallazgos 1 y 3, encabezado | — | 2 h | — | P3 |
| BE-09 | 2 | Spec y plan del bloque A: rutina puntual y ejecución | Contrato con el front | CU-E-19, E-20, U-08 a U-13, E-06, E-07; web B2 a B6 | BE-02 | 3 h | Define | P1 |
| BE-10 | 2 | Modelo de ejecución: `Routine_Asignation_User` limpia y `User_Routine` para la vía puntual | Funcional | Status 27/8 (contrato de E-19); diagrama de `Doc/`; DA1 | BE-09; diagrama actualizado | 3 h | **Sí** | P1 |
| BE-11 | 2 | CU-E-19/E-20: asignar, quitar y listar rutinas puntuales | Funcional | CU-E-19, E-20; Status 27/8; `planification.controller.ts:33-36` | BE-10 | 2,5 h | No | P1 |
| BE-12 | 2 | CU-U-08, vía puntual: home del alumno | Funcional | CU-U-08; `planification.controller.ts:180-188` (cuelga) | BE-11 | 3 h | No | P1 |
| BE-13 | 2 | CU-U-09/U-10: detalle de rutina y de ejercicio para el alumno | Funcional | CU-U-09, U-10; `routine.controller.ts:61-63`; `routine.service.ts:816` y `:912` | BE-11 | 4 h | No | P1 |
| BE-14 | 2 | CU-U-12: marcar y desmarcar un ejercicio | Funcional | CU-U-12; Status, hallazgo 2; spec del 10/8 | BE-13 | 3 h | No | P1 |
| BE-15 | 2 | CU-U-13: nota del alumno | Funcional | CU-U-13; DA3 | BE-14 | 1,5 h | No | P1 |
| BE-16 | 2 | CU-E-06/E-07: historial del alumno y filtro por ejercicio | Funcional | CU-E-06, E-07; web B6; DA4 | BE-14 | 4 h | No | P1 |
| BE-17 | 3 | Spec y plan del bloque B: asignar planificaciones | Contrato con el front | CU-E-13, E-14, U-08; web B1, B7 | BE-14 | 2,5 h | Define | P1 |
| BE-18 | 3 | CU-E-13: asignar una planificación a un alumno | Funcional | CU-E-13; `planification.controller.ts:160-168`; Status 27/8 (`number_of_routines`) | BE-17 | 7 h | **Sí** (si DB3 = a) | P1 |
| BE-19 | 3 | CU-E-14: baja lógica en cascada y listado del alumno | Funcional | CU-E-14; Status 31/8; `planification.controller.ts:170-209` | BE-18 | 2,5 h | No | P1 |
| BE-20 | 3 | CU-U-08, vía planificación | Funcional | CU-U-08; DB4 | BE-12, BE-18 | 2 h | No | P1 |
| BE-21 | 3 | Seed de la cadena de entrenamiento | Entorno | Status 25/8 ("el seed no genera ningún `User_Routine`"); `dynamic_data.py` | BE-11, BE-18 | 5 h | No (cambia `03`) | P2 |
| BE-22 | 3 | *(Opcional, DG1)* `RESTRICT` en las FK del catálogo | Endurecimiento | Status 12/10 (CU-A-06) | DG1 | 2 h | **Sí** | P4 |
| BE-23 | 3 | Regenerar la base de Render antes de que venza | Entorno | `CLAUDE.md`; Status web (base del 3/10) | BE-10 (lo demás entra por patch) | 2 h | Aplica | P1 |
| BE-24 | 4 | CU-A-10: `409` si el músculo está en uso | Bug | CU-A-10; `muscles.service.ts:137`; Tests Músculos DEL-06 | — | 1,5 h | No | P2 |
| BE-25 | 4 | CU-A-15: `409` si el grupo tiene músculos | Bug | CU-A-15; `muscles.service.ts:249`; Tests Músculos DEL-10 (falla) | — | 1 h | No | P2 |
| BE-26 | 4 | CU-A-13/A-14: nombre de grupo muscular único | Bug | CU-A-13, A-14; Tests Músculos GRP-06 y GRP-09 (fallan) | — | 1,5 h | No | P2 |
| BE-27 | 4 | CU-A-17: `promote_user` transaccional, `409` por duplicados y spec sin "ya es entrenador" | Bug | CU-A-17; Status web, hallazgo 3 y obs. 7; `coach.service.ts:56-97` | decisión del 16/10 | 1,5 h | No | P2 |
| BE-28 | 4 | CU-E-29: rechazar un tipo dado de baja y un destinatario que no es alumno | Bug | CU-E-29, paso 2; `membership.service.ts:186-218` | — | 1 h | No | P3 |
| BE-29 | 4 | CU-U-04: mail real por API HTTP | Funcional | CU-U-04; Tests Acceso REC-09; web C4 | cuenta del proveedor (DG4) | 4 h | No | P2 |
| BE-30 | 4 | `updated_at` automático en todas las tablas | Calidad | Status, hallazgo 4 | — | 2,5 h | No (verificar el DDL) | P3 |
| BE-31 | 4 | DTOs alineados con las columnas | Bug | entidades contra DTOs; Status web, obs. 7 | — | 2 h | No | P3 |
| BE-32 | 4 | Códigos HTTP coherentes | Calidad | services (ver el detalle) | BE-34 (coordinar) | 2 h | No | P3 |
| BE-33 | 4 | `status/users`: exponer el estado de la cuenta del alumno | Contrato con el front | Status web (T17, CU-E-26) | — | 0,5 h | No | P3 |
| BE-34 | 4 | Swagger completo: respuestas reales y errores | Contrato con el front | Status web, V1, V9 y hallazgo 6; `Doc/app-ios/contexto-backend.md` | fases 2 a 4 | 5 h | No | P1 |
| BE-35 | 5 | Plan de pruebas Backend y verificación en runtime | Calidad | Status 25/8, 27/8, 31/8 y 4/9 ("sin verificar"); `Tests/README.md` | BE-23 | 4 h + la corrida | No | P2 |
| BE-36 | 5 | Borrar el e2e roto | Calidad | `test/app.e2e-spec.ts`; decisión del 16/10 | — | 0,5 h | No | P4 |
| BE-37 | 5 | Limpieza de código muerto | Calidad | `entities/ParaValidar/`; `auth.service.ts:56` y `:181-293` | — | 1 h | No | P4 |
| BE-38 | 5 | Specs de CU desactualizadas | Docs | CU-U-08, U-12, U-13, U-14, E-03 a E-07, E-13, A-17 | BE-09, BE-17, BE-27 | 3 h | — | P3 |
| BE-39 | 5 | Docs de contexto: `CLAUDE.md` del backend y `Doc/app-ios/` | Docs | `CLAUDE.md`; `CLAUDE-ios.md`; `prompts.md`; `contexto-backend.md` | — | 1 h | — | P3 |
| BE-40 | 4 | CU-U-06: el email deja de ser editable | Bug | CU-U-06 (24/10); Tests Mi cuenta DAT-04 y DAT-05 (fallan); `edit_user.dto.ts`; `users.service.ts:296-304` | coordinar con el web | 1 h | No | P2 |
| BE-41 | 4 | CU-A-17: no convertir una cuenta inactiva | Bug | CU-A-17 (31/10); Tests Usuarios y entrenadores CNV-07 y CNV-10; `coach.service.ts` `promoteUserToCoach` | — | 0,5 h | No | P3 |
| BE-42 | 4 | [Las rutinas del plan por semana: `weeks` en el alta, reordenar una semana y repetirla en otras](2026-10-31-be-42-hallazgos-planificaciones-plan.md) | Funcional | Tests Planificaciones CRE-01, CRE-03 y ADD-02 (31/10); CU-E-09, CU-E-12e y CU-E-12f (nuevos); `planification.service.ts` `createPlanification` | — (la T53 del web depende de ésta) | 6 h | No | P2 |
| BE-43 | 4 | [CU-U-06 y CU-U-01: formato del teléfono](2026-10-31-be-43-formato-del-telefono-plan.md) | Bug | CU-U-06 y CU-U-01 (31/10); Tests Mi cuenta VAL-05 y VAL-06, Acceso REG-10; `create_user.dto.ts`, `edit_user.dto.ts` | — | 0,5 h | No | P2 |

**Por fase:**

| Fase | Horas |
|---|---:|
| 1 | 11 |
| 2 | 24 |
| 3 | 23 |
| 4 | 30,5 |
| 5 | 9,5 |
| **Total** | **98** |

## 4. Fases e hitos

| Fase | Foco | Horas | Ventana objetivo | Hito |
|---|---|---:|---|---|
| **1** | Seguridad y contrato inmediato | 11 | 16 al 19/10 | **H1:** sin agujeros de seguridad conocidos, el web avisado de C2 y el Status con los conteos reales |
| **2** | Bloque A: rutina puntual y ejecución | 24 | 20 al 27/10 | **H2:** flujo puntual de punta a punta, demostrable: asignar → ver → marcar → nota → historial |
| ⏱ | **Fecha fija:** regenerar la base (BE-23) | 2 | ≈ 1/11 | Esquema del bloque A aplicado. Lo que cambie después entra por patch y por re-aplicar el `03`, que es idempotente |
| **3** | Bloque B: asignar planificaciones | 21 | 28/10 al 5/11 | **H3:** los 74 CU con código |
| **4** | Brechas de CU y deuda | 30,5 | 3 al 12/11, en paralelo con el final de la fase 3 | **H4:** ningún 🟡 y el Swagger completo, candidato a "terminado" |
| **5** | Verificación y cierre | 9,5 | 12 al 17/11 | **H5:** criterios de §2 cumplidos y código congelado. Del 18 al 20/11 sólo arreglos; **entrega el 20/11** |

### Por qué este orden

- **Fase 1, antes que nada.** Son arreglos de minutos a pocas horas con mucho impacto: el registro como admin y las lecturas ajenas están expuestas en Render. Además fijan el patrón de autorización (el check de dueño) que los endpoints nuevos del alumno van a usar desde el primer día. BE-04 va acá por la misma razón: los handlers nuevos ya nacen con `return`. BE-08 pone el Status en una base correcta para que cada tarea mueva conteos reales.
- **Fase 2 antes que la 3 (decisión del 16/10).** La asignación puntual es más simple y más fácil de probar y demostrar que la de planificaciones. Además el bloque A obliga a resolver la ejecución (`User_Routine`, `Routine_Exercise_Finished`), que el bloque B reutiliza tal cual. Es también el bloque que más espera el web (B2 a B6) y la app iOS (su Parte 3: inicio, detalle de rutina, marcar y notas).
- **La regeneración va el ~1/11, aunque la fase 3 no haya terminado.** El único cambio de esquema grande es BE-10. Los de la fase 3 son chicos (BE-18 y la opcional BE-22) y entran por patch, igual que el 25/8 y el 27/8.
- **La fase 4 no depende de las anteriores**, salvo el Swagger, que va al final para documentar los endpoints una sola vez. Puede intercalarse cuando una tarea del camino crítico espera algo del usuario: el diagrama, la cuenta de mail o una corrida de pruebas.

### Camino crítico

BE-09 → BE-10 → BE-11 → BE-13 → BE-14 → BE-17 → BE-18 → BE-21 → BE-23 → BE-35 → entrega. Son ≈ 36 h, más dos esperas que dependen del usuario: el diagrama antes de BE-10 y la corrida del plan de pruebas en BE-35.

### Qué tarea destraba cada dependencia de los clientes

| Dependencia | Qué es (deducido del Status web) | Tarea |
|---|---|---|
| C2 | Pantallas de rutinas y planificaciones del entrenador | BE-07, sin código nuevo |
| B1 | Rutinas de la semana (home del alumno) | BE-12, BE-20 |
| B2 | Detalle de rutina y de ejercicio para el alumno | BE-13 |
| B3 | Marcar como hecho | BE-14. **Ojo:** es por ejercicio, no por serie (§7, discrepancia 9) |
| B4 | Nota del alumno | BE-15 |
| B5 | Rutina puntual | BE-11 |
| B6 | Historial de entrenamientos | BE-16 |
| B7 | Asignar y quitar planificaciones | BE-18, BE-19 |
| B8 | Editar entrenador | Sin tarea de código: se mantiene `promote_user` (16/10) y el web pasa T37 a ese endpoint |
| B9 | Flag de contraseña temporal | BE-03 |
| C4 | Mail de recuperación | BE-29 |
| V1, V9 | Schemas que el Swagger no declara | BE-34 |
| V10 | `exercise_id` en los RMs | BE-05 |
| iOS | Partes 3 y 4 (networking y modelos) | BE-34 y el bloque A |

### Riesgos

- **Capacidad.** ≈ 20 h por semana sostenidas. Si no alcanzan, se recorta en este orden: BE-22, BE-37, BE-33, BE-32 y BE-30. Las cinco son P3 o P4 y ninguna es un CU.
- **La fecha de vencimiento de la base no está verificada.** Conviene mirarla en el panel de Render esta semana.
- **El runtime del bloque C2 no se probó nunca.** E-08 a E-12d y E-17/E-18 sólo se verificaron por compilación. El web puede ser el primero en llamarlos (BE-07), y conviene que lo sepa.
- **El modelo manda.** Si el diagrama no se actualiza a tiempo, BE-10 y BE-18 se frenan.

## 5. Detalle por tarea

### Fase 1 — Seguridad y contrato inmediato

#### BE-01 · Registro: siempre crea un alumno
- **Qué:** `CreateUserDto` acepta `role` (`create_user.dto.ts:45-46`) y `createUser` lo persiste tal cual (`users.service.ts:115`). Hay que forzar `role = user` en el service y, en el DTO, aceptar sólo `user` (`@IsIn`). No conviene borrar el campo: el web podría estar mandando `role: user` explícito (*sin verificar*), y con `forbidNonWhitelisted` daría 400.
- **Acepta:** `POST /users/register` con `"role":"admin"` → 400. Sin `role`, o con `"user"` → 201 con `role = user`.
- **Riesgo:** revisar si en la base de Render hay cuentas admin o coach que no sean del seed (*sin verificar*).

#### BE-02 · Autorización por rol y por dueño
- **Ya hecho:** `@Auth(...)` por endpoint (11/8) y el check de dueño de U-11 (`user_rm.service.ts:179`), que es el patrón a replicar.
- **Qué:**
  - `GET /users/all` → coach y admin.
  - `GET /users/get/:id`, `GET /membership/payment/user/:id` y `GET /user_rm/user/:id` → con el rol `user`, sólo el propio (403). Los pagos además salen ordenados por fecha descendente, como pide U-07.
  - `GET /user_rm/exercise/:id` → coach y admin (hoy un alumno ve los RMs de todos).
  - `GET /coach/all` y `/coach/get/:id` → admin (A-16; hoy son públicos y exponen el CUIL).
  - `POST /users/set-active/:id` → el coach sólo sobre alumnos, y nadie sobre sí mismo.
  - Ids comparados en minúscula (el iOS puede mandar mayúsculas).
- **Acepta:** un token de alumno recibe 403 al pedir datos de otro y 200 con los propios; un token de coach recibe 403 al cerrar la cuenta de otro coach.
- **Riesgo:** confirmar que el web no llama a `/coach/*` con el rol coach.

#### BE-03 · Flag de contraseña temporal en el login
- **Qué:** `loginUser` (`users.service.ts:142-150`) ya distingue si se entró con la temporal, pero no lo informa. Hay que sumar `password_change_required: true|false` al body del 200 (el nombre que ya propuso el web) y declararlo en el Swagger.
- **Acepta:** después de `recover-password`, un login con la temporal devuelve `true`; con la contraseña normal, `false`. LOG-09, LOG-10 y REC-07 pasan con una cuenta real.

#### BE-04 · Promesas sin esperar
- **Qué:**
  - Los controllers llaman al service sin `await` ni `return`.
  - `createUser` y `loginUser` (`users.service.ts:102` y `:128`) no tienen try/catch.
  - `queryRunner.connect()` corre antes del `try` en los métodos transaccionales.

  Un error de base deja un rechazo sin manejar, que en Node ≥ 15 corta el proceso (*sin verificar en runtime*). Hay que hacer `return this.service…` en todos los handlers y sumar try/catch con 500 en esos dos métodos.
- **Acepta:** con la base caída, el login responde 500 y el proceso sigue vivo. Build en verde.

#### BE-05 · RMs con `exercise_id` y `user_id` (V10)
- **Qué:** los `select` de `user_rm.service.ts` (`:40`, `:73`, `:107`, `:141` y `:183`) recortan las FK. Hay que sumar `exercise_id` y `user_id`.
- **Acepta:** `GET /user_rm/user/:id` trae `exercise_id` en cada ítem, y el Swagger lo declara.

#### BE-06 · Higiene de producción
- **Qué:**
  - Borrar `power-app/config.ts`. Es código muerto con un secreto JWT escrito a mano, y además corre el `rootDir`, que hace que el build emita `dist/src/main.js` y rompe `start:prod`. Se verificó hoy: `dist/main.js` no existe.
  - Dejar `logging: true` (`app.module.ts:30`) sólo en desarrollo, porque loguea los parámetros de cada query, hashes incluidos.
  - Sacar el `console.log` de la temporal (`users.service.ts:202`) en producción.
  - Verificar qué comando de arranque usa Render.
- **Acepta:** `npm --prefix power-app run build` emite `dist/main.js`, `start:prod` levanta, y los logs de Render no muestran SQL ni la temporal.
- **Riesgo:** si Render arranca con `node dist/src/main.js`, hay que cambiar el comando al mismo tiempo.

#### BE-07 · Confirmarle al web que C2 tiene backend
- **Ya hecho:** E-08 a E-12d y E-15 a E-18 están ✅ desde el 4/9, y su contrato ya está en `openapi.json`.
- **Qué:** avisarle al web, vía Status y mensaje, que C2 se puede adelantar, con la salvedad de que esos endpoints nunca se ejecutaron en runtime.
- **Acepta:** el hallazgo 1 del Status web queda cerrado del lado del backend.

#### BE-08 · Status del backend al día
- **Qué:** sin tocar el changelog:
  - Reemplazar la tabla de resumen del 4/9 por los conteos de §1 y el anexo.
  - Cerrar los hallazgos 1 y 3 (resueltos el 31/8 y el 4/9).
  - Corregir el encabezado ("Fuente: `Documentation/…`") y "Rol Entrenador (29 CU)", que son 32.
  - Reclasificar U-09 y U-14.
  - Reemplazar "Próximas semanas" y "Orden sugerido" por un link a este roadmap.
  - Actualizar el dashboard.
- **Acepta:** los conteos del informe y del dashboard coinciden con el anexo.

### Fase 2 — Bloque A: rutina puntual y ejecución

#### BE-09 · Spec y plan del bloque A
- **Ya hecho:**
  - El contrato de E-19/E-20 (27/8).
  - El modelo de "hecho" por ejercicio (25/8).
  - La visibilidad de vínculos inactivos (27/8).
  - El diseño de marcar, desmarcar y listar de la [spec del 10/8](../specs/2026-08-10-routine-exercise-set-finished-design.md).
- **Qué:** brainstorming con DA1 a DA6 (§6) y la spec en `Doc/specs/YYYY-MM-DD-rutina-puntual-y-ejecucion-design.md` con el contrato de E-19, E-20, U-08 (vía puntual), U-09, U-10, U-12, U-13, E-06 y E-07; después el plan. Pasarle el contrato al web y al iOS.
- **Acepta:** la spec está aprobada y el web puede tipar B2 a B6 sin `PENDIENTE-CONTRATO`.

#### BE-10 · Modelo de ejecución
- **Qué** (con DA1 = a):
  - `Routine_Asignation_User` queda igual al diagrama: sin `routine_asignation_id` ni `order`, y con `UNIQUE (routine_id, user_id)`.
  - `User_Routine` suma `routine_id` NOT NULL y su `routine_asignation_id` pasa a nullable.
  - El usuario actualiza el diagrama antes (manda el modelo).
- **Db Creator:** `ddl.py` y `01_estructura.sql` regenerados. El `02` y el `03` no cambian: ningún generador inserta en esas tablas (verificar con `grep`). Va un patch en `Db Creator/patches/` si la base sigue viva. Se actualiza el Status.
- **Acepta:** la regeneración da byte-idéntico al commit, el build compila, y las entidades, el DDL y el diagrama coinciden columna por columna.
- **Riesgo:** las dos tablas están vacías en la base viva (*sin verificar*). Si no lo están, el patch tiene que hacer backfill de `routine_id`.

#### BE-11 · CU-E-19/E-20: rutina puntual
- **Qué:** los tres endpoints acordados el 27/8, en `routine/`, con coach y admin:
  - `POST /routine/assign-user` (`409` si ya está asignada, `400` si la rutina está dada de baja o el usuario no es alumno).
  - `DELETE /routine/assign-user/:id` (físico, como dice la spec: el historial no cuelga de `Routine_Asignation_User` con DA1 = a).
  - `GET /routine/assigned/:userId`.
- **Acepta:** asignar, listar y quitar responden con los códigos de la spec, y una asignación duplicada da 409.

#### BE-12 · CU-U-08, vía puntual
- **Qué:** reemplazar el andamiaje de `GET /planification/user/:id/active` (`planification.controller.ts:180-188`, que hoy cuelga) por el home del alumno. Devuelve las rutinas puntuales asignadas con su progreso de hoy (ejercicios hechos sobre el total). Con el rol `user`, sólo el propio. El path final lo fija la spec.
- **Acepta:** el alumno recibe sus puntuales; sin asignaciones, `200` con la lista vacía; con el id de otro, 403.

#### BE-13 · CU-U-09/U-10: detalle para el alumno
- **Ya hecho:** el árbol completo de `buildRoutineDetailResponse` y el parámetro `visibleInactiveIds` en los dos builders (`routine.service.ts:816` y `:912`), pensados para este CU.
- **Qué:** según DA5. El rol `user` puede leer la rutina sólo si está en una asignación vigente suya (puntual o de plan). Se suma el estado de ejecución de la instancia: hecho y `user_note` por ejercicio. Se ven los vínculos inactivos que el alumno completó (contrato del 27/8). U-10 se resuelve dentro de la misma respuesta (series, notas) más U-11, que ya existe.
- **Acepta:** el alumno ve su rutina y recibe 403 en una ajena; un ejercicio que el coach sacó después de que el alumno lo hizo sigue apareciendo en su historial.

#### BE-14 · CU-U-12: marcar y desmarcar
- **Qué:** crear y borrar la fila de `Routine_Exercise_Finished`, con dueño, instancia activa y un `routine_exercise` que pertenezca a esa rutina y esté activo. La `User_Routine` nace según DA2. Marcar dos veces es idempotente (UNIQUE). Desmarcar borra la fila y, con ella, la nota (DA3).
- **Acepta:** marcar → aparece en el detalle de BE-13; desmarcar → desaparece; marcar en una instancia ajena → 403.
- **Riesgo:** el web espera marcar por serie (B3). El tildado por serie es del front (decisión del 25/8) y la spec lo tiene que decir.

#### BE-15 · CU-U-13: nota
- **Qué:** según DA3. Se escribe `user_note` (máximo 100) sobre la fila de "hecho"; vacía la limpia.
- **Acepta:** la nota aparece en el detalle; una nota sobre un ejercicio no hecho da el código que fije la spec.

#### BE-16 · CU-E-06/E-07: historial
- **Qué:** endpoint de coach y admin con las instancias del alumno que tienen ejercicios hechos, en orden cronológico, y filtro opcional `exercise_id` para E-07. Muestra lo que fije DA4.
- **Acepta:** después de BE-14, el entrenador ve lo marcado por el alumno con su fecha; filtrado por un ejercicio que no hizo, la lista viene vacía.

### Fase 3 — Bloque B: asignar planificaciones

#### BE-17 · Spec y plan del bloque B
- **Ya hecho:** E-14 decidido y su spec reescrita (31/8), la semántica de cada `active` y las reglas de instancia del bloque A.
- **Qué:** DB1 a DB4 y la spec de E-13, E-14 y U-08 (vía planificación), con los contratos B1 y B7 para el web.
- **Acepta:** la spec está aprobada y el web puede tipar B7.

#### BE-18 · CU-E-13: asignar una planificación
- **Qué:**
  - DTO real en lugar del `body: any` (`planification.controller.ts:164`).
  - Transacción que crea la `User_Planification`: `coach_id` sale del token, y cabecera y `number_of_routines` se copian de la plantilla (DB3).
  - Solapamiento según DB2.
  - `User_Routine` según DB1.
  - Precondiciones: la planificación activa y con rutinas, y el destinatario un alumno.
- **Db Creator:** si DB3 = a, `number_of_routines` pasa a NOT NULL en la entidad, `ddl.py` y `01`, más un patch si la base ya se regeneró. Se actualiza el Status.
- **Acepta:** asignar → el alumno lo ve en BE-20; un solapamiento da la respuesta de DB2; si falla a mitad, no queda una asignación parcial.

#### BE-19 · CU-E-14 y listado del alumno
- **Qué:**
  - `POST /planification/user/set-active/:id` apaga la `User_Planification` y sus `User_Routine` en bloque (31/8). Si ya estaba inactiva, informa que no hay nada que quitar.
  - `GET /planification/user/:id` lista las asignaciones del alumno, para el paso 1 de E-14.
  - Se retiran los andamiajes `POST /planification/user/edit/:id` (sin CU) y `DELETE /planification/user/:id`.
- **Acepta:** después de la baja, el plan desaparece del home y el historial de BE-16 se conserva.

#### BE-20 · CU-U-08, vía planificación
- **Qué:** el home suma el plan vigente (`start_date ≤ hoy ≤ end_date`, activo) y sus rutinas de la semana, combinado con las puntuales según DB4.
- **Acepta:** un alumno con plan vigente ve sus rutinas; con el plan vencido, no lo ve.

#### BE-21 · Seed de la cadena de entrenamiento
- **Qué:** sumar a `dynamic_data.py`, con UUID v5:
  - Circuitos y rutinas.
  - Una planificación con rutinas asignadas.
  - Una asignación puntual y otra de plan para alumnos del seed.
  - Algunas `User_Routine` con ejercicios hechos y notas.

  Va dentro del `03` regenerado. Si cambian las columnas de un INSERT, se actualizan el generador y el `.sql`.
- **Acepta:** la regeneración es estable (byte-idéntica en dos corridas) y, aplicados los tres `.sql`, cada flujo de U-08 a E-07 se puede demostrar sin cargar nada a mano.

#### BE-22 · *(Opcional, DG1)* `RESTRICT` en las FK del catálogo
- **Qué:** `User_RM.exercise_id`, `Routine_Exercise.exercise_id`, `Exercised_Muscle.muscle_id` y `Muscle.muscle_group_id` pasan de `CASCADE` a `RESTRICT`. La barrera sigue siendo el service (A-06, BE-24, BE-25); esto la respalda desde la base.
- **Db Creator:** `ddl.py` y `01`, el `onDelete` de las entidades y el Status.
- **Acepta:** borrar desde SQL un ejercicio con RMs falla en la base.

#### BE-23 · Regenerar la base de Render
- **Qué:** antes del ~2/11 (*sin verificar*), recrear la instancia y aplicar `01` → `02` → `03`, con el esquema de BE-10 como mínimo. Lo que cambie después se aplica por patch, y el seed por re-aplicar el `03`, que es idempotente. Lo ejecuta el usuario, y se anota la fecha de vencimiento nueva.
- **Acepta:** las credenciales del seed entran por el web desplegado y el Swagger de Render coincide con el local.
- **Riesgo:** lo cargado a mano en Render (circuitos de prueba) se pierde. Por eso va BE-21.

### Fase 4 — Brechas de CU y deuda

#### BE-24 · CU-A-10: músculo en uso
- **Qué:** mismo patrón que A-06 (12/10). `deleteMuscle` (`muscles.service.ts:137`) responde `409` si el músculo tiene filas en `Exercised_Muscle`, en vez de borrarlo en cascada.
- **Acepta:** DEL-06 pasa y DEL-07 deja de ser alcanzable. El diálogo del web ("se quita de él") hay que corregirlo.

#### BE-25 · CU-A-15: grupo con músculos
- **Qué:** `deleteMuscleGroup` (`muscles.service.ts:249`) responde `409` si el grupo tiene músculos. Hoy el FK `CASCADE` (`01_estructura.sql:136`) borra el grupo, sus músculos y sus vínculos.
- **Acepta:** DEL-10 pasa.

#### BE-26 · CU-A-13/A-14: nombre de grupo único
- **Qué:** mismo criterio que membresías y ejercicios (12/10): comparación en memoria, sin distinguir mayúsculas ni espacios, `409`, y en la edición sólo si el nombre cambia.
- **Acepta:** GRP-06 y GRP-09 pasan.

#### BE-27 · CU-A-17: `promote_user`
- **Qué** (decisión del 16/10: se mantiene `promote_user` para A-18):
  - Una transacción para el rol y el `Coach`. Hoy un `coach_email` repetido deja `role = coach` sin su `Coach`.
  - `409` por `coach_email` o CUIL repetidos (el CUIL tiene `UNIQUE` en `01_estructura.sql:42`).
  - Reescribir CU-A-17 sin el camino "ya es entrenador".
  - Avisarle al web que T37 pasa a `promote_user`.
- **Acepta:** un email profesional repetido da 409 y el rol no cambia.
- **Riesgo:** promover a un admin lo baja a coach. No es una regla de la spec; se deja anotado.

#### BE-28 · CU-E-29: pago válido
- **Qué:** `registerMembershipPayment` responde `400` si el tipo está dado de baja o el destinatario no es un alumno, y `404` (hoy `400`, `:200`) si el tipo no existe.
- **Acepta:** pagar un tipo inactivo da 400.

#### BE-29 · CU-U-04: mail real
- **Qué:** un servicio de mail detrás de una interfaz, con un proveedor por API HTTP (DG4) y la API key en una variable de entorno. Reemplaza el stub (`users.service.ts:201-202`). Si el proveedor falla, responde el error que pide el camino alternativo ("no pudo enviarse"). La variable nueva se documenta en el README.
- **Acepta:** REC-09 pasa con una cuenta real y la temporal no aparece en ningún log.
- **Riesgo:** los términos de la capa gratuita y la verificación del remitente están *sin verificar*.

#### BE-30 · `updated_at` automático
- **Qué:** el `onUpdate` de las 18 entidades es sintaxis de MySQL y no hace nada en Postgres. Hay que pasar a `@UpdateDateColumn({ type: 'timestamptz' })` y sacar los `updated_at = new Date()` a mano.
- **Db Creator:** regenerar y confirmar que `01` no cambia. Se actualiza el Status (cierra el hallazgo 4).
- **Acepta:** editar una planificación (`editPlanification` no lo setea hoy) devuelve `updated_at` nuevo.

#### BE-31 · DTOs alineados con las columnas
- **Qué:**
  - `@MaxLength(150)` en las URLs de ejercicio, músculo y grupo (hoy un valor de más de 150 da 500).
  - La `description` de ejercicio obligatoria y de 2000 como máximo, porque es NOT NULL (`01_estructura.sql:70`) y el DTO la tiene opcional.
  - Mensajes en español en los `@Max` de la calculadora.
  - Revisar el `@Min(0.99)` de los RMs.
- **Acepta:** esos casos dan 400 con un mensaje claro en vez de 500.

#### BE-32 · Códigos HTTP coherentes
- **Qué:**
  - Las ediciones que hoy devuelven 201 pasan a 200: ejercicio, membresía, músculo, grupo y RM.
  - Los `catch` que responden 404 ante cualquier error pasan a 500: `getUserId`, `getExerciseById`, `getMembershipById`, `getMuscleById`, `getMuscleGroupId`, `getUserMembershipPayments` y `getCoachId`.
  - `getUserRmById` devuelve 404 y no un array vacío.

  Coordinarlo con el web y el iOS antes de desplegar.
- **Acepta:** el Swagger y la respuesta real coinciden en cada código.

#### BE-33 · Estado de la cuenta en `status/users`
- **Qué:** sumar `active` de la cuenta a cada alumno de `getStudentsWithMembershipStatus`, sin cambiar la forma. Hoy el summary cuenta cuentas cerradas sin decir cuáles.
- **Acepta:** el campo aparece y está declarado en el Swagger.

#### BE-34 · Swagger completo
- **Qué:** declarar la respuesta real de cada endpoint, con los `@ApiResponse` de cada código de error:
  - Las formas de `status/users` y `type/users` (V1).
  - Las relaciones de ejercicios y músculos (V9).
  - La diferencia de forma entre `exercisedMuscles` de `/exercise/all` (aplanado) y de `/exercise/:id` (anidado), que se documenta sin cambiarla porque el web ya la consume (PR #50).

  Regla para las fases 2 a 4: cada tarea deja su Swagger al día, y esta pasada cierra lo viejo.
- **Acepta:** los tipos que el web genera desde `openapi.json` reemplazan los 15 de `pending.ts`.

#### BE-40 · CU-U-06: el email no se edita
- **Qué** (decisión del 24/10: el email es de sólo lectura "por ahora"; CU-U-06 ya está reescrito):
  - Sacar `email` de `EditUserDto` (`edit_user.dto.ts`). El `ValidationPipe` global tiene `forbidNonWhitelisted` (`main.ts:24-28`), así que un body con `email` pasa a dar `400`. El formulario del web hoy lo manda: tiene que dejar de hacerlo **antes o a la vez** que se despliega esto.
  - Sacar de `editUser` (`users.service.ts:296-304`) el bloque del email: el control de unicidad (`409`) y el `email_verified = false`.
  - Ajustar `verify-write-paths.js` (cubre `editUser`) y el Swagger.
  - Avisarle al web: el campo Email pasa a deshabilitado y `POST /users/edit` no lo manda.
- **Acepta:** DAT-05 pasa (un email armado a mano no cambia nada y da `400`) y DAT-04 pasa del lado del backend. El `409` por email repetido deja de existir en la edición; el del registro (CU-U-01) no cambia.
- **Riesgo:** no queda ninguna vía en la app para corregir un email mal escrito en el registro. El `coach_email` del entrenador es otro dato y se sigue editando por `promote_user` (CU-A-18).
- **Inventario (§9):** U-06 queda en ✅ porque el corte es del 16/10, anterior a este cambio de spec. Con la spec nueva es un 🟡 hasta que se haga esta tarea.

#### BE-41 · CU-A-17: no convertir una cuenta inactiva
- **Qué** (CU-A-17 del 31/10 y los tests CNV-07 y CNV-10):
  - `promoteUserToCoach` (`coach.service.ts`) responde `400` `{ error: 'No se puede convertir en entrenador a una cuenta inactiva.' }`, en una constante `PROMOTE_INACTIVE_ERROR` junto a `PROMOTE_ADMIN_ERROR`, cuando `user.role === UserRole.user && !user.active`. El front compara el texto.
  - Va después del chequeo del administrador y antes de buscar al `Coach` y los duplicados: no cambia nada y no abre la transacción.
  - Un entrenador con la cuenta inactiva (`role = coach`) se sigue editando (CU-A-18): no se bloquea.
  - El `@ApiResponse` 400 de `promoteUserToCoach` (`coach.controller.ts`) declara el caso.
- **Acepta:** CNV-10 pasa del lado del backend (hoy falla: `promote_user` no mira `User.active`) y CNV-07 sigue igual. La T52 del front es aparte.
- **Riesgo:** un entrenador dado de baja (`role = user`, `Coach.active = false`) cuya cuenta también está inactiva queda alcanzado por la regla: hay que reactivar la cuenta desde Usuarios antes de reactivarlo como entrenador. Es lo que dice la spec.
- **Inventario (§9):** A-17 queda como está porque el corte es del 16/10, anterior a este cambio de spec.

#### BE-42 · Las rutinas del plan por semana
- **Qué** (hallazgos CRE-01, CRE-03 y ADD-02 de la corrida del 31/10, decisiones de Fran del 31/10, variante C; [plan](2026-10-31-be-42-hallazgos-planificaciones-plan.md) y [spec](../specs/2026-10-31-planificacion-por-semanas-design.md)). El contrato completo está en la sección 3 del plan; en resumen:
  - `POST /planification/create` acepta además `weeks?: [{ week, routine_ids[] }]` (`week` de 1 a `duration`, sin repetidas; 1 a 50 ids por semana, con repetidos permitidos, que quedan con `order` 1..n). Una sola transacción: si algo falla, no se crea nada. Los errores reusan los textos de `assign-bulk` (semana fuera de la duración, rutinas inexistentes o dadas de baja) y suman «Una semana aparece más de una vez.». Responde 201 con el detalle.
  - `POST /planification/routine/repeat-week` `{ planification_id, from_week, to_weeks[] }`: copia las rutinas vigentes de `from_week`, en su orden, al final de cada semana destino (1 a 50 distintas, ninguna igual al origen). Todo o nada. Responde 201 con el detalle.
  - `POST /planification/routine/reorder` `{ planification_id, week, routine_asignation_ids[] }`: los ids tienen que ser exactamente las vigentes de la semana; quedan con `order` 1..n en una transacción. Si no coinciden, `400` «La lista no coincide con las rutinas vigentes de la semana N. Recargá la planificación.». Responde 200 con el detalle.
  - `number_of_routines` significa **rutinas por semana**: cambia sólo su descripción en el Swagger, en crear y en editar.
  - Conviene extraer del lote existente lo que comparte con `create` (ids únicos, 404, 400 de baja, `order` consecutivo).
- **Acepta:** el script descartable corre en rojo antes del código y en verde después (todo o nada en los tres endpoints, orden de las validaciones, Swagger con todos los códigos); los scripts anteriores siguen en verde; el build compila. CRE-01, CRE-03 y ADD-02 pasan del lado del backend; el resto es de la T53 del web, que empieza **después** de desplegar esta tarea.
- **No hace:** la duración 0 sigue aceptándose, sin tope de semana (el web exige 1 o más; ver §8).
- **Riesgo:** `create` pasa a ser transaccional y no debe diverger de `assign-bulk`. Un cliente que tipó `number_of_routines` como «total» lo lee mal hasta actualizar, aunque la validación no cambia.
- **Inventario (§9):** el corte es del 16/10, anterior. **CU-E-12e y CU-E-12f no figuran** y quedan ⬜ hasta esta tarea; el total de CU pasa de 75 a 77. E-09 sigue ✅ (sin `weeks` cumplía la spec de entonces).

### Fase 5 — Verificación y cierre

#### BE-35 · Plan de pruebas Backend
- **Qué:** un plan en `Tests/` (sección `## Backend` del índice) con lo que el Status marca "sin verificar en runtime" y el flujo nuevo:
  - E-08 a E-12d y E-17/E-18.
  - La rama de baja lógica de E-23.
  - El orden anidado de tres niveles.
  - BE-11 a BE-20.

  Lo corre el usuario contra Render con el seed de BE-21.
- **Acepta:** la tanda está registrada en el índice y no tiene fallas del backend.

#### BE-36 · Borrar el e2e roto
- **Qué:** `test/app.e2e-spec.ts` es el scaffold de Nest: espera `GET /` con "Hello World!", que no existe. Hay que borrarlo junto con `jest-e2e.json` y el script `test:e2e` (decisión del 16/10: sin tests automáticos).
- **Acepta:** no queda ningún script de test que mienta.

#### BE-37 · Limpieza de código muerto
- **Qué:**
  - `entities/ParaValidar/` (las entidades `@Entity()` sin columnas e importadas sin uso desde `user.entity.ts:5-6`).
  - `verifyAdminJwtToken` y el bloque comentado de `auth.service.ts`.
  - El `dtos/authenticable.dto.ts` duplicado.
  - Los imports comentados.
- **Db Creator:** no cambia, porque esas entidades nunca se cargan (no están en ningún `forFeature`).
- **Acepta:** el build está en verde y `grep ParaValidar` no devuelve nada.

#### BE-38 · Specs de CU desactualizadas
- **Qué:**
  - U-12 y U-13 dicen `finished` en `Exercise_Set` y `user_note` en `Routine_Exercise`, contra el modelo del 25/8.
  - U-08, por DB4.
  - U-14: dejarlo explícito como "sin backend".
  - E-03: su nota "Pendiente: … no hay guards" quedó vieja el 11/8.
  - E-03 a E-07 dicen "vinculado al coach" (DA6).
  - E-07, por DA4.
  - E-13, si DB1 = a.
  - A-17, en BE-27.

  Siempre en `Use Cases/` del repo de docs.
- **Acepta:** cada spec describe lo que hace el código.

#### BE-39 · Docs de contexto
- **Qué:**
  - `CLAUDE.md` del backend nombra `estado-implementacion-CU.md` y `dashboard-estado-CU.html`; los nombres reales son `*-backend`.
  - `Doc/app-ios/CLAUDE-ios.md` y `prompts.md` apuntan a `../PowerApp-Backend/Doc/…` y a `Status/estado-implementacion-CU.md`, que desde el 3/10 no existen ahí.
  - `contexto-backend.md` dice que "se mantiene desde el repo del back".
  - Sumar a ese contexto el flag de BE-03 y la matriz de BE-02.
- **Acepta:** todos los paths de esos archivos existen.

## 6. Decisiones pendientes

### Tomadas el 16/10 (se registran, no se reabren)

| Tema | Decisión | Efecto en el roadmap |
|---|---|---|
| E-19/E-20 | **Entran al MVP y van antes que las planificaciones**, porque son más simples de probar y demostrar | Bloque A (fase 2). El MVP pasa a 74 CU con backend |
| Mail de U-04 | **Mail real por API HTTP** | BE-29 |
| A-17/A-18 | **Se mantiene `promote_user`** para editar; se reescribe A-17 sin "ya es entrenador" | BE-27; el web pasa T37 |
| Tests automáticos | **Ninguno** | BE-36; criterio 8 de §2 |
| Email de U-06 (24/10) | **Es de sólo lectura por ahora**; se reescribió CU-U-06 | BE-40; el web deshabilita el campo |
| Cuenta inactiva en A-17 (31/10) | **No se convierte en entrenador: `400`**; un entrenador con la cuenta inactiva se sigue editando (A-18) | BE-41; el web ya la bloquea del lado del cliente (CNV-07) y muestra el `400` con la T52 (CNV-10) |
| Las rutinas del plan por semana (31/10) | **`number_of_routines` = rutinas por semana** (define los huecos, no es un tope). El alta puede traer las rutinas de cada semana, todo o nada; una semana se reordena (grabber) y se repite en otras. En la web la duración va de 1 en adelante; el back sigue aceptando 0 | BE-42; el web lo hace en la T53, después. Spec: [`2026-10-31-planificacion-por-semanas-design.md`](../specs/2026-10-31-planificacion-por-semanas-design.md) |

### Bloque A (se resuelven en BE-09)

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| DA1 | Cómo se ejecuta una rutina puntual. Hoy `User_Routine` sólo cuelga de `Routine_Asignation`, que es una planificación, así que una puntual no se puede marcar | **(a)** `User_Routine.routine_id` NOT NULL y `routine_asignation_id` nullable · **(b)** `User_Routine.routine_asignation_user_id`, más `active` en `Routine_Asignation_User` y E-20 lógico · **(c)** la puntual es sólo de lectura | **(a):** cambia una sola tabla, E-20 sigue físico como dicen su spec y el contrato del 27/8 (el historial no cuelga de `Routine_Asignation_User`), y cada instancia conoce su rutina sin un join (simplifica U-09, U-12 y E-06). El costo es que `routine_id` repite lo que ya dice `Routine_Asignation` en las instancias de plan, pero es inmutable |
| DA2 | Cuándo nace una `User_Routine` | **(a)** perezosa: al marcar el primer ejercicio del día, una por (alumno, rutina, día) con `date` = el día real · **(b)** una al asignar, reutilizada | **(a):** con (b), el `UNIQUE (user_routine_id, routine_exercise_id)` impide volver a marcar un ejercicio en otra sesión, y una rutina "diaria de principiante" se repite. Además deja el historial con fechas reales |
| DA3 | Nota (U-13) sobre un ejercicio que no está hecho. `user_note` vive en la fila de "hecho" | **(a)** la nota sólo se escribe sobre un ejercicio hecho, y desmarcar la borra · **(b)** tabla de notas aparte (esquema y diagrama) · **(c)** columna `finished` en la fila | **(a):** sin cambio de esquema. La (c) reabre la decisión del 25/8 ("la existencia de la fila es el hecho") y queda descartada |
| DA4 | Qué muestra E-07, que pide "peso, reps, fecha". No se registra la carga ejecutada | **(a)** la prescripción (`Exercise_Set`) y la fecha de la instancia · **(b)** registrar peso y reps reales (columnas nuevas) | **(a)** para el MVP; la (b) va a post-MVP |
| DA5 | Contrato de lectura del alumno (U-09/U-10) | **(a)** abrir `GET /routine/:id` al rol `user` con check de asignación, y un endpoint aparte con lo hecho de una instancia · **(b)** un endpoint nuevo que devuelve árbol y estado juntos | **(a):** no cambia la forma de un contrato que el web y el iOS ya tiparon, en línea con la preferencia de "contratos que no cambian de forma". La (b) ahorra una llamada |
| DA6 | "Alumno vinculado al coach", precondición de E-03 a E-07, sin soporte en el modelo | **(a)** gimnasio compartido: cualquier coach ve a cualquier alumno, y se reescribe la precondición · **(b)** derivarlo de `User_Planification.coach_id` | **(a):** la (b) deja afuera a los alumnos que sólo tienen una rutina puntual, y es lo que el código hace hoy |

### Bloque B (se resuelven en BE-17)

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| DB1 | Cómo se derivan las `User_Routine` de una planificación | **(a)** la misma regla que DA2: E-13 crea sólo la `User_Planification` y las instancias nacen al ejecutar · **(b)** como dice el CU: al asignar, una por rutina y por semana del rango, con `date` = inicio de la semana | **(a):** una sola regla para las dos vías, y los cambios de E-12 posteriores llegan solos al alumno. Con la (b) no le llegan a quien ya tiene el plan. Obliga a reescribir "deriva las User_Routine" en E-13. *En el chat del 16/10 se recomendó la (b); con E-19/E-20 adelantados y DA2 perezosa, la (a) es más coherente* |
| DB2 | Solapamiento con un plan vigente (E-13) | **(a)** `409` con el plan vigente en el body, y con `replace_current: true` el vigente se da de baja reutilizando E-14 · **(b)** coexistencia, y U-08 toma el de `start_date` más reciente · **(c)** rechazar siempre | **(a):** cumple el "advierte y solicita confirmación" del CU sin estado en el server |
| DB3 | `User_Planification.number_of_routines`: el diagrama lo tiene NOT NULL y el código nullable (abierto desde el 27/8) | **(a)** copiarlo de la plantilla al asignar, como copia `Membership_Payment`, y alinearlo a NOT NULL · **(b)** nullable, y se corrige el diagrama | **(a):** el diagrama manda y el dato siempre existe en la plantilla |
| DB4 | U-08 con un plan vigente y rutinas puntuales a la vez | **(a)** mostrar las dos · **(b)** como dice la spec: la puntual sólo si no hay plan | **(a):** con la (b), una puntual asignada a propósito queda invisible mientras dure el plan |

### Generales

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| DG1 | `RESTRICT` en las FK del catálogo (anotado como "endurecimiento a decidir" el 12/10) | **(a)** aplicarlo en la regeneración del ~1/11 (BE-22) · **(b)** diferirlo | **(a):** el argumento del 12/10 era no tocar la base en uso, y la regeneración lo elimina. No cambia la decisión de que la barrera esté en el service |
| DG2 | `GET /exercise/:id` pide sesión y `GET /exercise/all` es público (Status 18/8) | **(a)** los dos públicos, como el resto del catálogo · **(b)** los dos con sesión | **(a):** es el criterio del catálogo (GET público, ABM de admin) |
| DG3 | Renovar una membresía vigente | **(a)** desde la fecha de pago, como dice CU-E-29 · **(b)** sumarle los días que le quedaban | **(a)** para el MVP; la (b) va a post-MVP (§8) |
| DG4 | Proveedor de mail (BE-29) | Cualquiera con API HTTP y remitente verificable sin dominio propio | Elige el usuario, porque es su cuenta. Los términos de la capa gratuita están *sin verificar* |

## 7. Discrepancias entre fuentes

| # | Qué dice cada fuente | Manda | Acción |
|---|---|---|---|
| 1 | El Status da 63 ✅, 1 🟡, 4 🔵 y 7 ⬜ (tabla del 4/9); el inventario da 56 ✅, 9 🟡, 3 🔵, 6 ⬜ y 1 sin backend | Código | BE-08 |
| 2 | Los hallazgos 1 ("`planification.service.ts` vacío") y 3 ("`Routine.routine_plan_id` obsoleta") del Status siguen abiertos, pero se resolvieron el 31/8 y el 4/9 | Código | BE-08 |
| 3 | El Status dice que U-09 tiene el "service vacío"; `getRoutineById` está completo y sólo excluye al rol `user` | Código | BE-08, BE-13 |
| 4 | El Status dice "pendiente: columna `active` en DB" en A-23 (6/8); la base se regeneró después | Código | BE-08 |
| 5 | El encabezado del Status cita `Documentation/Especificaciones de CU/`, y la sección del Entrenador dice "29 CU · 62%" cuando son 32 | Use Cases | BE-08 |
| 6 | El `CLAUDE.md` del backend nombra los Status como `*-CU`; los archivos son `*-backend` | Archivos | BE-39 |
| 7 | Las specs de U-12 (`finished` en `Exercise_Set`) y U-13 (`user_note` en `Routine_Exercise`) contradicen el modelo del 25/8 (`Routine_Exercise_Finished` por ejercicio, con `user_note`) | Código y diagrama | BE-38 |
| 8 | El Status dice que U-04 está ✅ con el "email stubbeado"; la spec pone el envío como postcondición, y REC-09 sigue en re-test | Spec, por decisión del 16/10 | BE-29 |
| 9 | El web espera marcar una serie individual en B3 ("`set_count: 3` son tres filas"); la decisión del 25/8 es "hecho" por ejercicio, con las series como UI | Código | BE-09: el contrato lo explicita; el web adapta su B3 |
| 10 | El hito del web (73/75) contaba E-19/E-20, que el backend tenía como post-MVP (27/8) | Decisión del 16/10 | Resuelta: entran al MVP |
| 11 | El Status web dice que A-15 "rechaza un grupo con músculos, con un 500 genérico"; el DDL tiene `CASCADE` (`01_estructura.sql:136`) y en DEL-10 se borraron el grupo y su músculo | Código | BE-25; corregir la nota del Status web |
| 12 | A-18: el backend lo da ✅ vía `promote_user` (6/8), el web lo tiene 🟡 con el mock de `POST /coach/edit/{id}` (B8), y el camino "ya es entrenador" de CU-A-17 es incompatible con editar por `promote_user` | Decisión del 16/10 | BE-27; el web pasa T37 |
| 13 | El Status dice que U-14 está ⬜ ("probable front-end"); su spec lo deja en el cliente y el web lo da ✅ (T29) | Spec | BE-08: "sin backend" |
| 14 | CU-U-08 incluye la vía puntual y prioriza el plan; el Status la tenía post-MVP | Decisión del 16/10 y DB4 | BE-12, BE-20, BE-38 |
| 15 | E-03 a E-07 piden "alumno vinculado al coach", y no hay vínculo en el modelo | Código | DA6, BE-38 |
| 16 | CU-E-03 conserva la nota "Pendiente: … hoy no hay guards", vieja desde el 11/8 | Código | BE-38 |
| 17 | CU-E-07 pide "peso, reps, fecha", y el modelo no registra la carga ejecutada | Diagrama | DA4, BE-38 |
| 18 | `User_Planification.number_of_routines` es NOT NULL en el diagrama y nullable en la entidad y el DDL | Diagrama | DB3, BE-18 |
| 19 | El diagrama dice que una rutina puntual (`Routine_Asignation_User`) no tiene camino a `User_Routine`, y CU-U-12/U-13 la ejecutan | — (hueco del modelo) | DA1, BE-10 |
| 20 | `Doc/app-ios/CLAUDE-ios.md` y `prompts.md` apuntan a `../PowerApp-Backend/Doc/…` y a `estado-implementacion-CU.md`, que no existen desde el 3/10; `contexto-backend.md` dice que "se mantiene desde el repo del back" | Estructura actual | BE-39 |
| 21 | El README del backend indica `npm run start:prod`, pero el build emite `dist/src/main.js` y `dist/main.js` no existe (verificado hoy) | Código | BE-06 |
| 22 | `Coach.cuil` tiene `UNIQUE` en el DDL (`uk_coach_cuil`) y no en la entidad | DDL (es lo que corre) | BE-27 lo maneja con un 409 |
| 23 | El cronograma de `Doc/um/` fijaba el servidor completo el 4/9 y la app iOS del 11/9 al 2/10; no hay un Status del iOS que muestre su avance | — | Fuera de este roadmap. El avance del iOS queda *sin verificar* |
| 24 | La copia `Status/estado-implementacion-backend.md` de este repo es del 3/10; la del backend, del 12/10 | El repo del backend | Sincronización manual del usuario |

## 8. Fuera de alcance y post-MVP

| Ítem | Motivo |
|---|---|
| Registrar la carga ejecutada (peso y reps reales) | DA4: requiere columnas nuevas y el CU se cumple con la prescripción |
| Vínculo formal coach–alumno | DA6: el gimnasio es compartido |
| Propagar a los alumnos los cambios de una planificación ya asignada | Sólo aplica si DB1 = b; con la (a) es automático |
| Refresh token, expiración corta (hoy 365 días, `app.module.ts:41`) y denylist en el logout | El logout stateless se decidió el 11/8. Cambiarlo afecta al web y al iOS |
| Rate limiting en login y recuperación | Endurecimiento sin CU |
| `UNIQUE` en la base para los nombres | Decisión del 12/10: la barrera está en el service. Se puede revisar después de la regeneración, pero no se reabre acá |
| Infraestructura de migraciones TypeORM | Decisión del 25/8: `Db Creator` y patches a mano |
| Tests automáticos | Decisión del 16/10 |
| `Circuit.type` como conjunto cerrado | Status 19/8: es string libre a propósito, y cerrarlo no toca la base |
| Anular pagos, elegir la fecha de pago, sumar los días restantes | Sin CU (observación del web en T18) y DG3 |
| `last_order` para los vínculos de rutina apagados | Status 27/8: sólo si la posición del vínculo apagado llega a importar |
| Login social, verificación de email y teléfono, nutrición, medidas y funciones sociales | "Correcciones al documento" (`Doc/um/`): post-MVP del proyecto |
| Cambiar el email desde Mi cuenta | Decisión del 24/10: por ahora es de sólo lectura (CU-U-06). Volver a permitirlo se decide aparte |
| Interfaz propia del Admin | No es del backend |
| Planificaciones sin duración fija (duración 0) | Decisión del 31/10, tras la tanda 5 de las pruebas de planificaciones (CRE-03): la web exige 1 semana o más (CU-E-09). El back sigue aceptando 0 y no se refina por ahora: queda como desvío conocido |

## 9. Anexo — Matriz CU → endpoint → estado verificado

**Leyenda:**
- ✅ el endpoint existe y ejecuta lógica real.
- ⚠ además tiene un defecto abierto de seguridad o de contrato.
- 🟡 un camino de la spec no se cumple, o la lógica existe sin la ruta o el rol que pide el CU.
- 🔵 la ruta está declarada pero sin lógica: con `@Res()`, **no responde**.
- ⬜ no hay endpoint.
- — es del cliente, sin backend.

La columna "Status" es la del 12/10.

**Conteo:**

| Rol | ✅ | ⚠ (incluidos en ✅) | 🟡 | 🔵 | ⬜ | — | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Usuario | 12 | 3 | 4 | 1 | 2 | 1 | 20 |
| Entrenador | 26 | 4 | 0 | 2 | 4 | 0 | 32 |
| Admin | 18 | 2 | 5 | 0 | 0 | 0 | 23 |
| **Total** | **56** | **9** | **9** | **3** | **6** | **1** | **75** |

### Usuario (20)

| CU | Caso | Endpoint | Status | Verificado | Nota · tarea |
|---|---|---|---|---|---|
| U-01 | Registrar usuario | `POST /users/register` | ✅ | ✅ ⚠ | Acepta `role` desde el body · BE-01 |
| U-02 | Login | `POST /users/login` | ✅ | 🟡 | No informa el ingreso con la temporal (paso 3) · BE-03 |
| U-03 | Cerrar sesión | `POST /users/logout` | ✅ | ✅ | |
| U-04 | Recuperar contraseña | `POST /users/recover-password` | ✅ | 🟡 | No envía el mail; la temporal queda en los logs · BE-29 |
| U-05 | Cambiar contraseña | `POST /users/change-password` | ✅ | ✅ | |
| U-06 | Editar datos personales | `POST /users/edit` (más `GET /users/get/:id`) | ✅ | ✅ | `get/:id` no tiene check de dueño · BE-02. Desde el 24/10 el CU no permite editar el email y el DTO lo acepta · BE-40 |
| U-07 | Historial de pagos | `GET /membership/payment/user/:id` | ✅ | ✅ ⚠ | Sin check de dueño ni orden por fecha · BE-02 |
| U-08 | Mi planificación | `GET /planification/user/:id/active` | 🔵 | 🔵 | Llamada comentada: cuelga · BE-12, BE-20 |
| U-09 | Ver detalle de rutina | `GET /routine/:id` (coach, admin) | 🔵 | 🟡 | Lógica completa; falta el rol `user` con el check · BE-13 |
| U-10 | Ver detalle de un ejercicio | `GET /exercise/:id` | 🟡 | 🟡 | Ficha de catálogo; falta el contexto de rutina · BE-13 |
| U-11 | Ver mis RMs de un ejercicio | `GET /user_rm/user/:idUser/exercise/:idExercise` | ✅ | ✅ | El único check de dueño hoy |
| U-12 | Marcar serie como realizada | — | ⬜ | ⬜ | BE-14 |
| U-13 | Dejar una nota en el ejercicio | — | ⬜ | ⬜ | BE-15 |
| U-14 | Temporizador | — (cliente) | ⬜ | — | Sin backend por spec; el web lo tiene ✅ (T29) |
| U-15 | Consultar wiki de ejercicios | `GET /exercise/all`, `GET /exercise/:id` | ✅ | ✅ | DG2 |
| U-16 | Calcular mis RM potenciales | `POST /user_rm/potential` | ✅ | ✅ | |
| U-17 | Registrar un RM | `POST /user_rm/create` | ✅ | ✅ | |
| U-18 | Editar un RM | `POST /user_rm/edit/:id` | ✅ | ✅ | Responde 201 · BE-32 |
| U-19 | Obtener mis RMs | `GET /user_rm/user/:id` | ✅ | ✅ ⚠ | Sin check de dueño ni `exercise_id` · BE-02, BE-05 |
| U-20 | Eliminar un RM | `DELETE /user_rm/:id` | ✅ | ✅ | |

### Entrenador (32 que cuentan; CU-E-12 es agrupador)

| CU | Caso | Endpoint | Status | Verificado | Nota · tarea |
|---|---|---|---|---|---|
| E-01 | Obtener alumnos | `GET /users/all?role=user` | ✅ | ✅ ⚠ | El endpoint está abierto a cualquier rol · BE-02 |
| E-02 | Alumnos, filtro por nombre | `GET /users/all?keyword=` | ✅ | ✅ | |
| E-03 | Cerrar cuenta de alumno | `POST /users/set-active/:id` | ✅ | ✅ ⚠ | El coach puede cerrar la cuenta de un coach o un admin, y es posible la auto-baja · BE-02 |
| E-04 | RMs del alumno | `GET /user_rm/user/:id` | ✅ | ✅ ⚠ | Sin `exercise_id` (V10) · BE-05 |
| E-05 | Historial de pagos del alumno | `GET /membership/payment/user/:id` | ✅ | ✅ | |
| E-06 | Historial de entrenamientos | — | ⬜ | ⬜ | BE-16 |
| E-07 | Historial, filtro por ejercicio | — | ⬜ | ⬜ | BE-16 |
| E-08 | Obtener planificaciones | `GET /planification/all` | ✅ | ✅ | Runtime *sin verificar* · BE-35 |
| E-09 | Crear planificación | `POST /planification/create` | ✅ | ✅ | Ídem. Desde el 31/10 el alta puede traer las rutinas de cada semana (`weeks`) · BE-42 |
| E-10 | Editar planificación | `POST /planification/edit/:id` | ✅ | ✅ | No actualiza `updated_at` · BE-30 |
| E-11 | Eliminar planificación (lógico) | `POST /planification/set-active/:id` | ✅ | ✅ | |
| E-12a | Asignar una rutina al plan | `POST /planification/routine/assign` | ✅ | ✅ | Runtime *sin verificar* · BE-35 |
| E-12b | Asignar rutinas en lote | `POST /planification/routine/assign-bulk` | ✅ | ✅ | Ídem |
| E-12c | Quitar o reincorporar una rutina | `POST /planification/routine/set-active/:id` | ✅ | ✅ | Ídem |
| E-12d | Quitar o reincorporar en lote | `POST /planification/routine/set-active-bulk` | ✅ | ✅ | Ídem || E-13 | Asignar planificación a alumno | `POST /planification/user/assign` | 🔵 | 🔵 | `body: any`, llamada comentada, cuelga · BE-18 |
| E-14 | Eliminar planificación a alumno | `DELETE /planification/user/:id` | 🔵 | 🔵 | Ídem; pasa a `set-active` · BE-19 |
| E-15 | Obtener rutinas | `GET /routine/all` | ✅ | ✅ | |
| E-16 | Crear rutina | `POST /routine/create` | ✅ | ✅ | |
| E-17 | Editar rutina | `POST /routine/edit/:id` | ✅ | ✅ | Runtime *sin verificar* (27/8) · BE-35 |
| E-18 | Eliminar rutina (lógico) | `POST /routine/set-active/:id` | ✅ | ✅ | Ídem |
| E-19 | Asignar rutina a alumno | — (acordado: `POST /routine/assign-user`) | ⬜ | ⬜ | Entra al MVP (16/10) · BE-10, BE-11 |
| E-20 | Eliminar rutina a alumno | — (acordado: `DELETE /routine/assign-user/:id`) | ⬜ | ⬜ | Ídem · BE-11 |
| E-21 | Obtener circuitos | `GET /routine/circuit/all` | ✅ | ✅ | |
| E-22 | Crear circuito | `POST /routine/circuit/create` | ✅ | ✅ | |
| E-23 | Editar circuito | `POST /routine/circuit/edit/:id` | ✅ | ✅ | La rama de baja lógica está *sin verificar* (25/8) · BE-35 |
| E-24 | Eliminar circuito (lógico) | `POST /routine/circuit/set-active/:id` | ✅ | ✅ | |
| E-25 | Obtener membresías | `GET /membership/all` | ✅ | ✅ | |
| E-26 | Estado de membresías | `GET /membership/status/summary` | ✅ | ✅ | Cuenta cuentas cerradas · BE-33 |
| E-27 | Alumnos por estado | `GET /membership/status/users?status=` | ✅ | ✅ | Ídem · BE-33 |
| E-28 | Alumnos por tipo | `GET /membership/type/users` | ✅ | ✅ | |
| E-29 | Registrar pago de alumno | `POST /membership/payment/register` | ✅ | ✅ ⚠ | Acepta un tipo dado de baja y un destinatario que no es alumno · BE-28 |

### Admin (23)

| CU | Caso | Endpoint | Status | Verificado | Nota · tarea |
|---|---|---|---|---|---|
| A-01 | Obtener ejercicios | `GET /exercise/all` | ✅ | ✅ | |
| A-02 | Asignar músculo a ejercicio | `POST /exercise/create`, `POST /exercise/edit/:id` | ✅ | ✅ | Dentro del alta y la edición (decisión del 6/8) |
| A-03 | Desasignar músculo de ejercicio | `POST /exercise/edit/:id` | ✅ | ✅ | Ídem |
| A-04 | Crear ejercicio | `POST /exercise/create` | ✅ | ✅ ⚠ | `description` es opcional en el DTO y NOT NULL en la base (500) · BE-31 |
| A-05 | Editar ejercicio | `POST /exercise/edit/:id` | ✅ | ✅ | Responde 201 · BE-32 |
| A-06 | Eliminar ejercicio | `DELETE /exercise/:id` | ✅ | ✅ | `409` en uso desde el 12/10 |
| A-07 | Obtener músculos | `GET /muscles/all` | ✅ | ✅ | |
| A-08 | Crear músculo | `POST /muscles/create` | ✅ | ✅ | |
| A-09 | Editar músculo | `POST /muscles/edit/:id` | ✅ | ✅ | |
| A-10 | Eliminar músculo | `DELETE /muscles/:id` | ✅ | 🟡 | Borra en cascada en vez de impedirlo · BE-24 |
| A-11 | Obtener grupos musculares | `GET /muscles/mg/all` | ✅ | ✅ | |
| A-12 | Músculos del grupo | `GET /muscles/mg/get/:id` | ✅ | ✅ | |
| A-13 | Crear grupo muscular | `POST /muscles/mg/create` | ✅ | 🟡 | No valida el nombre único (GRP-06) · BE-26 |
| A-14 | Editar grupo muscular | `POST /muscles/mg/edit/:id` | ✅ | 🟡 | Ídem (GRP-09) · BE-26 |
| A-15 | Eliminar grupo muscular | `DELETE /muscles/mg/:id` | ✅ | 🟡 | Borra el grupo y sus músculos en cascada (DEL-10) · BE-25 |
| A-16 | Obtener entrenadores | `GET /coach/all` | ✅ | ✅ ⚠ | Público, expone el CUIL · BE-02 |
| A-17 | Convertir alumno a entrenador | `POST /coach/promote_user` | ✅ | 🟡 | Falta "ya es entrenador"; con la decisión del 16/10 se reescribe la spec y se arregla la transacción · BE-27. Desde el 31/10 el CU tampoco permite convertir una cuenta inactiva y el backend la convertía · BE-41 |
| A-18 | Editar datos de entrenador | `POST /coach/promote_user` | ✅ | ✅ | Se mantiene así (16/10) |
| A-19 | Eliminar entrenador | `POST /coach/delete_coach/:id` | ✅ | ✅ | |
| A-20 | Obtener membresías | `GET /membership/all` | ✅ | ✅ | |
| A-21 | Crear membresía | `POST /membership/create` | ✅ | ✅ | |
| A-22 | Editar membresía | `POST /membership/edit/:id` | ✅ | ✅ | Responde 201 · BE-32 |
| A-23 | Eliminar membresía (lógico) | `POST /membership/set-active/:id` | ✅ | ✅ | |

### Endpoints sin CU propio

| Endpoint | Roles | Situación |
|---|---|---|
| `GET /users/get/:id` | user, coach, admin | Soporte de U-06 y de la ficha del alumno; le falta el dueño · BE-02 |
| `GET /coach/get/:id` | público | Expone el CUIL · BE-02 |
| `GET /membership/get/:id`, `GET /muscles/get/:id`, `GET /exercise/ExMuscles/all` | público | Lecturas de catálogo; consistentes con el criterio de GET público |
| `GET /user_rm/all`, `GET /user_rm/:id` | coach, admin | `/:id` devuelve un array y nunca 404 · BE-32 |
| `GET /user_rm/exercise/:id` | user, coach, admin | Un alumno ve los RMs de todos · BE-02 |
| `GET /routine/all-plus`, `/routine/:id`, `/routine/circuit/all-plus`, `/routine/circuit/:id`, `/planification/all-plus`, `/planification/:id` | coach, admin | Lecturas de soporte, documentadas en el Status |
| `GET /planification/user/:id` | user, coach, admin | Andamiaje que cuelga; pasa a ser el listado de E-14 · BE-19 |
| `POST /planification/user/edit/:id` | coach, admin | Andamiaje sin CU que cuelga; se retira · BE-19 |
