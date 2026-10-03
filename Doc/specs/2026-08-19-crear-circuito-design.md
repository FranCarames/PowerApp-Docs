# Spec — Crear circuito (CU-E-22)

> **Fecha:** 2026-08-19 · **Bloque:** Circuitos (vence 21/8) · **Estado:** diseño aprobado, pendiente de plan
> **Depende de:** `Doc/specs/2026-08-19-ajuste-modelo-circuitos-design.md` (modelo) y `Doc/specs/2026-08-19-circuitos-listado-y-baja-design.md` (listado, detalle y baja)

## 1. Contexto y objetivo

Es el último CU del bloque de circuitos que se implementa en esta etapa. El entrenador arma un circuito **completo en una sola llamada**: la cabecera (`name`, `description`, `type`) más la lista de ejercicios, cada uno con sus series prescritas. El circuito nace activo y queda disponible como pieza reutilizable para ensamblar rutinas (CU-E-16).

**CU-E-23 (editar circuito) queda pausado** por decisión del usuario, para no arrastrar la complejidad de la reconciliación a este bloque. Ver §8.

## 2. Alcance

**Incluye:**

- `POST /routine/circuit/create` — alta de `Circuit` + sus `Routine_Exercise` + sus `Exercise_Set`, en una transacción.
- Validaciones de estructura, de campo y cruzadas.
- Extracción del armado de la respuesta anidada a un helper reutilizable, compartido con `getCircuitById`.

**Fuera de alcance:**

- CU-E-23 (editar circuito) — pausado.
- Ensamblado de rutinas (CU-E-15 → CU-E-18).
- Cambios de entidades: **no se toca ninguna**, `Db Creator` queda intacto y la base no se migra.

## 3. Endpoint

`POST /routine/circuit/create` · `@Auth(UserRole.coach, UserRole.admin)`

Vive en `routine.controller.ts` / `routine.service.ts`, igual que los otros tres endpoints de circuitos: **no hay módulo ni controller propio de circuitos** (decisión del usuario — rutinas y circuitos dependen entre sí).

### 3.1 Body

```json
{
  "name": "Entrada en calor - Tren superior",
  "description": "Movilidad de hombro y activación de manguito",
  "type": "entrada en calor",
  "exercises": [
    { "exercise_id": "uuid-ejercicio",
      "coach_note": "Bajar lento en 3 segundos",
      "sets": [
        { "set_count": 3, "rep_count": 8, "weight": 80.5, "rpe": 7 },
        { "set_count": 1, "rep_count": 5, "weight": 90, "rir": 1 }
      ] }
  ]
}
```

**`exercise_order` y `set_order` no viajan en el body:** los asigna el server según la posición en el array (índice + 1). El orden dentro de un circuito no es un dato que el entrenador elija aparte, es cómo quedó la lista en la pantalla. Derivarlo elimina la posibilidad de recibir órdenes duplicados, salteados o inconsistentes, y le saca dos campos al payload.

**`active` arranca siempre en `true`.** La spec del CU no da opción; para desactivar está CU-E-24.

### 3.2 Semántica de `Exercise_Set`

**Una fila es un bloque de series iguales**, no una serie individual: `set_count: 3, rep_count: 8, weight: 80` significa "3×8 con 80 kg". El `set_order` ordena los bloques dentro del ejercicio.

Consecuencia asumida y aceptada: en CU-U-12 el alumno marca el **bloque** como hecho, no cada serie por separado — `Routine_Exercise_Set_Finished` referencia la fila entera. Si en la app se quiere que el alumno tilde serie por serie, es maquillaje del front sobre un único registro.

## 4. Validaciones

### 4.1 Estructura

| Regla | Respuesta si falla |
|---|---|
| `exercises` con al menos 1 ítem | `400` — es el camino alternativo "circuito sin ejercicios" de la spec |
| Cada ejercicio con al menos 1 set | `400` — un ejercicio sin series prescritas no le sirve al alumno |
| `exercise_id` único dentro del circuito | `400` |
| Todos los `exercise_id` existen en el catálogo | `404` — mismo patrón que `createExercise` con los músculos |

**Sobre la unicidad de `exercise_id`:** es una restricción deliberada. Si el entrenador quiere el mismo movimiento dos veces, usa una variación del catálogo (plano al principio, inclinado o con pausa al final). A cambio, `exercise_id` queda como **clave natural del circuito**, y eso permite que CU-E-23 se resuelva con el mismo patrón que `editExercise` usa con `exercised_muscles_ids`: comparar la lista actual contra la nueva, calcular `toAdd` / `toRemove`, y dejar intactos los que siguen.

### 4.2 Por campo

| Campo | Obligatorio | Regla |
|---|---|---|
| `name` | sí | string, 1–100 |
| `description` | no | string, ≤100 |
| `type` | sí | string, 1–30 |
| `exercises[].exercise_id` | sí | uuid |
| `exercises[].coach_note` | no | string, ≤100 |
| `sets[].set_count` | sí | entero, 1–20 |
| `sets[].rep_count` | sí | entero, 1–1000 |
| `sets[].weight` | no | número > 0, ≤ 1000, máximo 2 decimales |
| `sets[].rpe` | no | entero, 1–10 |
| `sets[].rir` | no | entero, 0–10 |
| `sets[].rm_perc` | no | entero, 1–125 |
| `sets[].amrap` | no | booleano, default `false` |
| `sets[].amrap_time` | no | entero > 0 (segundos) |
| `sets[].rm` | no | booleano, default `false` |

Los topes de `set_count`, `rep_count` y `weight` no son reglas de dominio: son redes contra el error de tipeo, para que un `800` en lugar de `80` no entre a la base. `rep_count` llega a 1000 para cubrir trabajo aeróbico (saltos de soga y similares). `rm_perc` llega a 125 para no bloquear trabajo supramáximo (excéntricas, isométricas por encima del 100%).

### 4.3 Cruzadas

Se validan en el service, antes de abrir la transacción, con mensaje explícito en castellano:

- **`amrap_time` solo si `amrap = true`** → `400` si viene con `amrap` en `false`. Al revés se permite: `amrap` sin tiempo es una serie al fallo, `amrap` con tiempo es un AMRAP cronometrado.
- **`rpe` y `rir` son mutuamente excluyentes** → `400` si vienen los dos. Son la misma escala invertida (RPE 8 = RIR 2). `rm_perc` sí puede convivir con cualquiera de los dos: prescribir "80% @ RPE 8" es normal.
- **`rm = true` exige `set_count = 1`** → `400` si no. Un test de máximo es un intento; dos intentos se mandan como dos sets iguales.
- **`rep_count` con `amrap = true`** se interpreta como **reps objetivo** (el alumno ve "8+"). El valor `1` es placeholder y significa "sin objetivo". No genera error en ningún caso: es una convención de lectura.

Las dos últimas se documentan en Swagger, porque no son deducibles del nombre del campo.

## 5. Transacción

El alta toca tres tablas en cascada (`Circuit` → `Routine_Exercise` → `Exercise_Set`). Se envuelve en una transacción con `QueryRunner`: o entra todo o no entra nada.

**Es un desvío consciente del patrón del repo:** `createExercise` guarda el ejercicio y después sus músculos sin transacción, y una falla intermedia deja un ejercicio sin músculos. Acá hay dos niveles más de anidamiento y, con CU-E-23 pausado, **no habría forma de reparar desde la app un circuito creado a medias**.

## 6. Respuesta

`201` con el circuito creado **en el mismo formato anidado que `GET /routine/circuit/:id`**, para que el front pinte el detalle sin una segunda llamada.

Eso obliga a extraer el armado de esa respuesta —hoy inline en `getCircuitById`— a un **helper privado** del service que usen los dos métodos. Es la única refactorización que trae este CU.

**Errores:** `400` (validaciones de campo o cruzadas), `404` (algún `exercise_id` inexistente), `401`/`403` (guards), `500` (inesperado).

## 7. Archivos

**Crear:** `power-app/src/dtos/circuit/create_circuit.dto.ts` — con las tres clases anidadas (`CreateCircuitSetDto`, `CreateCircuitExerciseDto`, `CreateCircuitDto`), validadas en cascada con `@ValidateNested({ each: true })` + `@Type(...)`.

**Modificar:** `power-app/src/routine/routine.controller.ts` (endpoint nuevo) y `power-app/src/routine/routine.service.ts` (método nuevo + extracción del helper de respuesta).

`RoutineModule` no cambia: `Circuit`, `RoutineExercise` y `ExerciseSet` ya están en su `forFeature`.

## 8. Impacto en `Status/`

- **CU-E-22** ⬜ → ✅. Totales: ✅ 49 → **50**, ⬜ 8 → **7**. Rol Entrenador: 12 → **13** de 29 (41% → **45%**).
- **CU-E-23** queda como el único pendiente del bloque de circuitos, anotado como **pausado por decisión de diseño**: la reconciliación de la lista de ejercicios define qué pasa con los `Exercise_Set` que los alumnos ya marcaron como hechos, y eso merece su propio refinamiento.

## 9. Verificación

- **Compilación:** `npm --prefix power-app run build` en verde.
- **Ruta registrada:** `circuit/create` presente en el bundle compilado.
- **Runtime:** la base **está al día** con el modelo (se migró el 19/8), así que este endpoint sí se puede probar de verdad. Casos mínimos: alta feliz con 2 ejercicios y varias series; `exercises: []` → `400`; ejercicio repetido → `400`; `exercise_id` inexistente → `404`; `amrap_time` con `amrap: false` → `400`; `rpe` y `rir` juntos → `400`; `rm: true` con `set_count: 2` → `400`. Y después del alta feliz, que `GET /routine/circuit/all` lo liste con el `exercise_count` correcto.

## 10. Riesgos y notas

- **La unicidad de `exercise_id` es una decisión de producto, no técnica.** Si más adelante aparece un caso real que la necesite, levantar la restricción es fácil pero obliga a repensar la clave de reconciliación de CU-E-23.
- **El helper de respuesta compartido** hace que un cambio en el formato del detalle afecte también a la respuesta del alta. Es lo buscado (que no se desincronicen), pero conviene tenerlo presente.
- **`type` sigue siendo string libre.** Un circuito creado con `type: "Cardio"` y otro con `"cardio"` conviven; el filtro de CU-E-21 los trae juntos porque compara sin distinguir mayúsculas, pero en el listado se ven como escritos. Se resuelve cuando se cierre el conjunto de valores.
