# T56 — Hallazgos de Pruebas de músculos y grupos del 31/10: borrar un músculo en uso o un grupo con músculos · Plan

> **Numeración.** El pedido no le puso número a la tarea del web. La **T54** es el formato del teléfono y la **T55** ya la tomó «la biblioteca de ejercicios del entrenador» ([plan](2026-11-04-hallazgo-rut-02-biblioteca-del-entrenador-plan.md)), así que este cambio es la **T56**. Si al llegar al web ese número ya está usado en su `PLAN.md`, se toma el siguiente libre y se anota acá.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** En el repo del web los cambios quedan **stageados** y el usuario revisa y commitea.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación del web es `typecheck`, `eslint src`, `build` y `prettier --check`, más el navegador (sección 4.3).
> 3. **No se levanta el server de producción ni se instala nada** sin pedirlo.
>
> **Este plan es de diseño:** lo escribió la sesión de docs el 4/11. Lo lee la sesión del **web** (sección 4). **No hay parte del backend**: BE-24 y BE-25 ya responden `409` desde el 22/10.

**Fuente:** corrida del 31/10 de [Pruebas de músculos y grupos](../../Tests/Musculos/Pruebas%20de%20m%C3%BAsculos%20y%20grupos.html), tanda 4 ([`4-pruebas-musculos.resultados.json`](../../Tests/Musculos/4-pruebas-musculos.resultados.json)).
**Modelo:** sin cambios. **CU:** sin cambios. **Contrato del backend:** sin cambios.

**Goal:** que el catálogo del admin no ofrezca borrar un músculo en uso, y que cuando el backend rechace una baja con `409` (músculo en uso o grupo con músculos) la pantalla diga por qué y qué hacer, en vez del genérico «Ya existe un registro con esos datos.».

---

## 1. Los hallazgos

| # | Caso del plan de pruebas | Gravedad | Lo que anotó Fran | CU | Qué se decidió |
|---|---|---|---|---|---|
| 1 | **DEL-06** · Eliminar un músculo en uso | 3 · Leve | «Falla pero el mensaje de error es poco descriptivo» | [CU-A-10](../../Use%20Cases/admin/CU-A-10-eliminar-musculo.md), camino alternativo «Músculo en uso» | El diálogo todavía decía «Lo usa 1 ejercicio: se quita de él.» y pedía confirmar; el backend respondía `409` y salía el texto por defecto del `409`. Ahora un músculo en uso **no pide confirmación**: aparece el aviso «No se puede eliminar», como ya pasa con un grupo con músculos (DEL-05). Si el listado está viejo y el `409` llega igual, sale un toast que explica el motivo |
| 2 | **DEL-10** · Un grupo que recibió un músculo en otra pestaña | 3 · Leve | «Se borraron los dos registros, tanto el grupo como el musculo» | [CU-A-15](../../Use%20Cases/admin/CU-A-15-eliminar-grupo-muscular.md), camino alternativo «Grupo con músculos» | Con BE-25 el backend responde `409`. El web lo mapeaba en el `500` (de cuando el backend no decía el motivo) y el `409` caía en el texto por defecto. Ahora el `409` tiene su propio texto |

**Efecto en el plan de pruebas** (ya aplicado, ver [`Tests/Musculos/`](../../Tests/Musculos/)):

- **DEL-06** pierde el aviso amarillo. Espera el aviso sin confirmación para QA Músculo 1b y cubre el listado viejo con un músculo nuevo, **QA Músculo 6**, sumado a QA Ejercicio desde otra pestaña: ahí espera el `DELETE /muscles/{id}`, el `409` y el toast.
- **DEL-07 se retira** («El ejercicio que se quedó sin músculos»): dependía del borrado en cascada de DEL-06, que ya no pasa. Su id no se reutiliza.
- **DEL-11 es nuevo** («Un ejercicio sin músculos»): abrir QA Ejercicio, quitar todos los chips de músculos y guardar da «Elegí al menos un músculo». Después le pone un músculo del seed y elimina QA Músculo 1b y QA Músculo 6, para que QA Grupo A quede vacío como lo necesita DEL-08.
- **DEL-10** cambia el texto esperado y cita el `409`.

**Efecto en la tanda anterior:** las fallas de DEL-06 y DEL-10 se cierran cuando esté hecha la T56 y se vuelva a correr. DEL-10 conserva su id, así que su resultado anterior sigue cruzando; el de DEL-07 queda huérfano y no se muestra.

> **Ojo con DEL-10 de la tanda 4:** Fran anotó que se borraron el grupo y el músculo. Con BE-25 eso no puede pasar: `deleteMuscleGroup` cuenta los músculos antes de borrar y la FK es `RESTRICT`. Si en la próxima corrida se vuelve a borrar algo, no es de la T56 sino del backend desplegado (revisar que Render tenga BE-25).

---

## 2. Contrato (sin cambios)

Los dos endpoints ya responden así desde BE-24 y BE-25 (22/10). Los textos son los de `PowerApp-Backend/power-app/src/muscles/muscles.service.ts` (constantes `DELETE_MUSCLE_IN_USE_ERROR` y `DELETE_GROUP_WITH_MUSCLES_ERROR`):

| Endpoint | Caso | Respuesta |
|---|---|---|
| `DELETE /muscles/{id}` | El músculo tiene filas en `Exercised_Muscle` | `409` `{ "error": "No se puede eliminar el músculo: está asociado a ejercicios" }` |
| `DELETE /muscles/{id}` | No existe | `404` `{ "error": "Músculo no encontrado" }` |
| `DELETE /muscles/mg/{id}` | El grupo tiene músculos | `409` `{ "error": "No se puede eliminar el grupo muscular: todavía tiene músculos" }` |
| `DELETE /muscles/mg/{id}` | No existe | `404` `{ "error": "Grupo muscular no encontrado" }` |

El control se hace antes del `DELETE` y el `catch` cubre la carrera (un ejercicio que suma el músculo, o un músculo que se crea en el grupo, entre el control y el borrado): las dos vías dan el mismo `409`. El web no muestra el texto crudo del servidor (regla de `src/api/errors.ts`), así que los textos de abajo son del front.

---

## 3. Backend

No hay sección del backend: no cambia nada y no hay BE-NN nueva. En el [roadmap del backend](2026-10-16-roadmap-backend.md), BE-24 queda anotada con que el diálogo del web lo corrige la T56.

---

## 4. Web (T56)

**Archivos:** `src/features/admin/components/MusclesSection.tsx` y `src/features/admin/components/GroupsSection.tsx`.

### 4.1 Músculo en uso: aviso sin confirmación (DEL-06)

Mismo patrón que el grupo con músculos de `GroupsSection.tsx` (DEL-05):

- Si al tocar el tacho el músculo lo usan ejercicios (`usedBy > 0`, contado con `useExercises()` como hoy), **no se abre la confirmación**. Se abre un `Modal` con `icon="alert"`, `tone="warn"`, título **«No se puede eliminar»** y un único botón **«Entendido»**. El cuerpo dice cuántos ejercicios lo usan y que hay que quitarlo de ellos primero; por ejemplo: «**QA Músculo 1b** lo usa 1 ejercicio: el servidor no deja eliminar un músculo mientras lo usen ejercicios. Quitalo de él primero.» (en plural, «lo usan N ejercicios … Quitalo de ellos primero.»).
- **No sale ningún request:** ni `DELETE` ni otro.
- Se borra el agregado «Lo usa N ejercicio(s): se quita de él/ellos.» de la confirmación. La confirmación queda para el músculo sin uso, con el texto de siempre: «¿Eliminar **X**? No se puede deshacer.» (DEL-01).
- Si `useExercises()` todavía no llegó o falló, `usedBy` es `undefined`: se pide la confirmación de siempre y, si el músculo está en uso, el backend responde `409` (4.2). No hace falta esperar a la lista de ejercicios para abrir el diálogo.

### 4.2 `409` al eliminar un músculo (DEL-06, listado viejo)

En `confirmDelete` de `MusclesSection.tsx`, sumar el `409` al mapa de `getErrorMessage`:

- `409`: **«No se puede eliminar el músculo: lo usan ejercicios. Quitalo de ellos antes de eliminarlo.»**

Se muestra como toast de error, se cierra el diálogo y el músculo queda en la lista. Conviene invalidar la consulta de ejercicios al recibir el `409`, para que el próximo intento ya muestre el aviso de 4.1 (opcional; el caso de prueba acepta las dos cosas).

El `500` («No se pudo eliminar el músculo. Puede que todavía lo use otro dato.») y su comentario sobre V7 quedan de cuando el backend no decía el motivo: con BE-24 un `500` ya no es «está en uso». Se cambia el `500` por el texto genérico de servidor (sacarlo del mapa alcanza) y se corrige el comentario.

### 4.3 `409` al eliminar un grupo (DEL-10)

En `confirmDelete` de `GroupsSection.tsx`, sumar el `409`:

- `409`: **«No se puede eliminar el grupo: todavía tiene músculos. Movelos a otro grupo o eliminalos antes.»**

Igual que 4.2: toast de error, se cierra el diálogo y el grupo queda en la lista. Conviene invalidar la consulta de grupos para que el contador muestre el músculo nuevo. El `500` con «Si todavía tiene músculos…» y su comentario sobre V7 se sacan por la misma razón que en 4.2. El aviso de DEL-05 («No se puede eliminar» con «Entendido») no cambia.

### 4.4 Cómo se verifica

1. `npm run typecheck`, `npx eslint src`, `npm run build` y `npx prettier --check src`.
2. En el navegador, con una cuenta admin real y contra un backend con BE-24 y BE-25 (local o Render), correr del plan de pruebas **DEL-01, DEL-05, DEL-06, DEL-11, DEL-08 y DEL-10**, en ese orden y después de los casos INT que crean QA Ejercicio:
   - **DEL-06:** QA Músculo 1b muestra «No se puede eliminar» sin confirmación y en Network no sale el `DELETE`. Con el listado viejo (dos pestañas, QA Músculo 6), sale `DELETE /muscles/{id}` → `409` y el toast de 4.2.
   - **DEL-10:** `DELETE /muscles/mg/{id}` → `409` y el toast de 4.3. Al recargar siguen QA Grupo B2 y QA Músculo 5.
   - **DEL-01** y **DEL-08** siguen pidiendo la confirmación de siempre para lo que no tiene uso.
3. Para forzar el listado viejo sin depender del tiempo: con la pestaña A en Músculos, sumar el músculo al ejercicio en la pestaña B y volver enseguida a la A (la lista se refresca sola al volver a la pestaña cuando los datos tienen más de 30 s, por el `staleTime` de `src/api/queryClient.ts`).

### 4.5 Después

- Actualizar el Status del web (`Status/estado-implementacion-web.md` y `dashboard-estado-web.html`): CU-A-10 y CU-A-15 con la T56. La copia en `PowerApp-Docs/Status/` la hace Fran a mano.
- En `PLAN.md` del web, la T56 con referencia a este plan.
