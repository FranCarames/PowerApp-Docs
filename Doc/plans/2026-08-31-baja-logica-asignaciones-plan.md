# Baja lógica en las asignaciones — Plan

> Los pasos usan checkbox (`- [ ]`) para ir tildando.

**Goal:** Que `Routine_Asignation`, `User_Planification` y `User_Routine` se den de baja lógicamente (`active = false`) en vez de borrarse físicamente, cerrando la última cadena de cascadas que destruye historial de entrenamiento.

**Motivo:** el modelo de `Doc/` se actualizó el 31/8 sumándoles `active` a las tres. La razón está en las FKs que ya existen:

```
Planification ──CASCADE──▶ Routine_Asignation ──CASCADE──▶ User_Routine ──CASCADE──▶ Routine_Exercise_Finished
```

Un `DELETE` de **una sola** `Routine_Asignation` —quitarle una rutina a una planificación— se lleva puestas todas las `User_Routine` derivadas y con ellas los `Routine_Exercise_Finished`: **lo que los alumnos efectivamente entrenaron**. Es el mismo agujero que tapó el plan del 22/8 un nivel más arriba, con `Routine` y `Planification`; estas tres eran las que quedaban.

`User_Planification` es el caso distinto: ninguna FK la referencia, así que ahí no hay riesgo de cascada. Su `active` es semántico (ver abajo).

**Timing:** se hace ahora porque las tres tablas están **vacías** (el ALTER no necesita backfill) y porque E-12, E-13 y E-14 son andamiaje sin implementar — hacerlo después obligaría a rehacerlos. Mismo argumento barato-ahora / caro-después que el 22/8.

## Semántica de cada `active`

Los tres campos se llaman igual pero los dispara algo distinto. Esto es lo que E-12, E-13 y E-14 tienen que implementar:

| Campo | Qué significa `false` | Quién lo dispara |
|---|---|---|
| `Routine_Asignation.active` | La rutina ya no forma parte de la planificación **sistémica** | El entrenador, al sacar una rutina del plan (paquete de CU-E-12) |
| `User_Planification.active` | El alumno **terminó** ese plan (o el entrenador se lo quitó) | CU-E-14, o la finalización del plan |
| `User_Routine.active` | Esa instancia de rutina ya no pertenece al plan vigente del alumno, pero **el registro de que existió y lo que completó se conserva** | **En bloque:** cuando su `User_Planification` pasa a inactiva, todas sus rutinas se apagan con ella |

> **Confirmado con el usuario el 31/8.** `User_Routine.active` es el *tombstone* de la desasignación, **no** una cancelación de sesión suelta: no existe el caso de apagar un día puntual del plan dejando el resto activo.

## Alcance

**Incluye:** la columna en las tres entidades, el DDL y su regeneración, el `ALTER` sobre la base viva, **los filtros en las tres lecturas de `planification.service.ts`** que hoy no filtran, la reescritura de la spec de CU-E-14, y los artefactos de Status.

**No incluye los endpoints de baja y reactivación.** Se implementan con su bloque: el de `Routine_Asignation` con E-12, y el de `User_Planification` / `User_Routine` con E-13 y E-14. Acá va sólo el modelo más los filtros de lo que **ya está escrito y quedaría mal** el minuto que exista la columna.

**No incluye `Routine_Asignation_User`**, que también cuelga de `Routine_Asignation` con CASCADE pero es post-MVP y arrastra su propia limpieza pendiente del 27/8. Cuando se retomen E-19 y E-20 hay que decidirlo ahí.

**Sin índices sobre `active`.** En el proyecto sólo los tienen `Coach`, `Planification`, `Circuit` y `Routine`, que son las que se listan filtrando por estado. Las tablas de vínculo análogas —`Routine_Circuit` y `Routine_Exercise`— no lo tienen, y acá siempre se va a consultar por el id del padre junto con `active`, así que un índice sobre el booleano solo no aporta.

---

### Paso 1: Columna `active` en las tres entidades

**Files:**
- Modify: `power-app/src/entities/routine_asignation.entity.ts`
- Modify: `power-app/src/entities/user_planification.entity.ts`
- Modify: `power-app/src/entities/user_routine.entity.ts`

En las tres, insertar **después del último campo de datos y antes de `created_at`** el mismo bloque que ya usan `Circuit`, `Routine` y `Planification`:

```typescript
    @ApiProperty({ example: true })
    @Column({ nullable: false, default: true })
    active!: boolean;
```

- [ ] **1.1 — `routine_asignation.entity.ts`** — después de `order!: number;`

- [ ] **1.2 — `user_planification.entity.ts`** — después de `end_date!: Date;`

- [ ] **1.3 — `user_routine.entity.ts`** — después de `date!: Date;`

- [ ] **1.4 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Paso 2: DDL y regeneración

**Files:**
- Modify: `Db Creator/ddl.py`
- Regenerate: `Db Creator/01_estructura.sql`

- [ ] **2.1 — `Routine_Asignation`** (línea ~207)

Agregar `active` después de `"order"`:

```sql
CREATE TABLE public."Routine_Asignation" (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id      UUID        NOT NULL,
    routine_plan_id UUID        NOT NULL,
    "order" 		INTEGER		NOT NULL,
    active          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

El resto del `CREATE TABLE` (las dos constraints) no se toca.

- [ ] **2.2 — `User_Planification`** (línea ~220)

Agregar `active` después de `end_date`:

```sql
    start_date         DATE         NOT NULL,
    end_date           DATE         NOT NULL,
    active             BOOLEAN      NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
```

- [ ] **2.3 — `User_Routine`** (línea ~305)

Agregar `active` después de `date`:

```sql
CREATE TABLE public."User_Routine" (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_asignation_id UUID        NOT NULL,
    user_id               UUID        NOT NULL,
    date                  DATE        NOT NULL,
    active                BOOLEAN     NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

- [ ] **2.4 — Regenerar**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && python build_sql.py
```

- [ ] **2.5 — Confirmar que sólo cambió `01`**

Run: `git status --short "Db Creator"`
Expected: `ddl.py` y `01_estructura.sql`, nada más. Ni `02` ni `03` insertan en estas tablas.

---

### Paso 3: Base viva *(lo ejecuta el usuario)*

- [ ] **3.1 — Confirmar que están vacías**

```sql
SELECT 'Routine_Asignation' AS tabla, count(*) FROM public."Routine_Asignation"
UNION ALL SELECT 'User_Planification', count(*) FROM public."User_Planification"
UNION ALL SELECT 'User_Routine',       count(*) FROM public."User_Routine";
```

Esperado: las tres en `0`. **Si alguna tiene filas, parar acá**: el `DEFAULT true` las dejaría todas activas, que probablemente es lo correcto, pero conviene mirarlo antes en vez de asumirlo.

- [ ] **3.2 — Correr el ALTER**

```sql
BEGIN;

ALTER TABLE public."Routine_Asignation" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public."User_Planification" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public."User_Routine"       ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

COMMIT;
```

- [ ] **3.3 — Verificar**

```sql
SELECT table_name, column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'active'
ORDER BY table_name;
```

Esperado: **12 filas** — las 9 de antes (`Circuit`, `Coach`, `Membership`, `Membership_Payment`, `Planification`, `Routine`, `Routine_Circuit`, `Routine_Exercise`, `User`) más las tres nuevas, todas con `is_nullable = NO` y default `true`.

---

### Paso 4: Filtros en `planification.service.ts`

**Files:**
- Modify: `power-app/src/planification/planification.service.ts`

Las tres lecturas del ABM que se cerró el 31/8 leen `routineAsignations` **sin filtrar**. Con la columna puesta, una rutina sacada de la planificación seguiría contando en `routine_count` y apareciendo en `routines`.

- [ ] **4.1 — `getAllPlanifications`: el conteo**

Reemplazar:

```typescript
            // Routine_Asignation no tiene baja logica, asi que el conteo no filtra nada
            // (a diferencia de circuit_count en rutinas, que descarta los vinculos apagados)
            const planifications = await this.buildPlanificationsQuery(query)
                .loadRelationCountAndMap(
                    'planification.routine_count',
                    'planification.routineAsignations',
                )
                .getMany();
```

por:

```typescript
            // Los vinculos dados de baja no cuentan: routine_count es de rutinas vigentes.
            // El true va literal y no como parametro para no pisar el :active que
            // buildPlanificationsQuery usa para filtrar las planificaciones de baja
            const planifications = await this.buildPlanificationsQuery(query)
                .loadRelationCountAndMap(
                    'planification.routine_count',
                    'planification.routineAsignations',
                    'routineAsignation',
                    queryBuilder => queryBuilder.andWhere('routineAsignation.active = true'),
                )
                .getMany();
```

- [ ] **4.2 — `getAllPlanificationsPlus`: el join**

Reemplazar:

```typescript
                .leftJoinAndSelect('planification.routineAsignations', 'routineAsignation')
```

por:

```typescript
                .leftJoinAndSelect('planification.routineAsignations', 'routineAsignation', 'routineAsignation.active = true')
```

- [ ] **4.3 — `buildPlanificationDetailResponse`: el filtro del mapper**

`findPlanificationDetail` carga con `relations`, que no admite condición, así que el detalle filtra en el builder — mismo patrón que `buildRoutineDetailResponse` con los `Routine_Circuit` apagados. Reemplazar el cuerpo del método por:

```typescript
    private buildPlanificationDetailResponse(planification: Planification) {
        // Los vinculos dados de baja no se muestran ni cuentan: una rutina que el entrenador
        // saco del plan no reaparece. findPlanificationDetail carga con relations, que no
        // admite condicion, asi que el filtro va aca — mismo patron que
        // buildRoutineDetailResponse. En /all-plus el join ya filtro y esto es redundante
        // a proposito: el builder es el unico lugar que decide que se ve
        const asignaciones = planification.routineAsignations.filter(
            routineAsignation => routineAsignation.active
        );

        return {
            id: planification.id,
            name: planification.name,
            description: planification.description,
            number_of_routines: planification.number_of_routines,
            type: planification.type,
            duration: planification.duration,
            active: planification.active,
            routine_count: asignaciones.length,
            created_at: planification.created_at,
            updated_at: planification.updated_at,
            routines: asignaciones.map(routineAsignation => ({
                id: routineAsignation.id,
                order: routineAsignation.order,
                routine: {
                    id: routineAsignation.routine.id,
                    name: routineAsignation.routine.name,
                    coach_note: routineAsignation.routine.coach_note,
                    active: routineAsignation.routine.active,
                },
            })),
        };
    }
```

- [ ] **4.4 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

> **Sin efecto observable todavía:** las tres tablas están vacías, así que los filtros no cambian ninguna respuesta hasta que exista E-12. Se hacen ahora para que el código no quede en contradicción con el modelo.

---

### Paso 5: Specs de CU

**Files (fuera del repo):** `D:\Power App\Documentation\Especificaciones de CU\especificaciones\entrenador\`

- [ ] **5.1 — Reescribir `CU-E-14-eliminar-planificacion-a-alumno.md`**

Cambios respecto del original: el título pasa a "(Lógico)", el alcance deja de ser borrado y pasa a `active = false` en cascada lógica, y la postcondición aclara que el historial se conserva.

```markdown
# CU-E-14 — Eliminar Planificación a Alumno (Lógico)

**Rol:** Entrenador
**Paquete:** Administrar Planificaciones

## Descripción breve

Da de baja lógica la planificación asignada a un alumno (active = false) y, con ella, todas las User_Routine que derivaban de ese plan. Nunca se borra físicamente, para preservar el historial de entrenamiento del alumno.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado de la User_Planification como active = false.
- Marcado en bloque de las User_Routine derivadas como active = false.

**Fuera de alcance:**

- Borrado físico de los registros.
- Baja de la planificación sistémica (plantilla).
- Baja de los Routine_Exercise_Finished del alumno: el historial de lo que entrenó se conserva intacto.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- El alumno tiene la planificación asignada y activa.

## Postcondiciones

- La User_Planification queda con active = false y desaparece del home del alumno.
- Todas sus User_Routine quedan con active = false.
- El historial de entrenamiento (Routine_Exercise_Finished) se conserva y sigue siendo consultable desde CU-E-06.

## Camino principal (flujo básico)

1. El entrenador abre la asignación del alumno y solicita quitarla.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca la User_Planification y sus User_Routine como active = false, y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 1 — Planificación ya dada de baja

1. La planificación del alumno ya está inactiva.
2. El sistema informa que no hay nada que quitar.
```

- [ ] **5.2 — Ajustar `CU-E-12-asignar-rutina-a-planificacion-sistemica.md`**

En **Alcance → Fuera de alcance**, sumar: *"La baja del vínculo, que es lógica (Routine_Asignation.active = false) y no un borrado."* No hace falta tocar nada más: el CU es sólo el alta.

> **Nota:** el andamiaje tiene un `DELETE /planification/routine/:id` para quitar una rutina del plan que **no corresponde a ningún CU de los 72**. Cuando se implemente E-12 hay que decidir si pasa a `POST /planification/routine/set-active/:id` —que es lo que corresponde con este cambio— o si se documenta como CU nuevo.

---

### Paso 6: Diagramas *(ya hecho por el usuario)*

- [x] **6.1** — `active` agregado a `Routine_Asignation`, `User_Planification` y `User_Routine` en el modelo, con `PowerApp - Modelo DB.svg` y `.pdf` exportados a `Doc/` el 31/8.

> `Doc/modelo-db.html` no necesita cambios: es un visor que referencia el `.svg` y el `.pdf` por nombre.

---

### Paso 7: Status

**Files:** `Status/estado-implementacion-CU.md`, `Status/dashboard-estado-CU.html`

- [ ] **7.1** — Entrada nueva en cambios recientes: las tres columnas, el motivo (la cascada que destruye historial), la tabla de semántica de arriba y los filtros que se sumaron al ABM de planificaciones.

- [ ] **7.2** — Actualizar la nota de **CU-E-14** en la tabla de detalle: sigue 🔵, pero ahora es baja lógica en cascada. **Ningún CU cambia de estado y los conteos no se mueven.**

---

### Paso 8: Stage

- [ ] **8.1**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/entities power-app/src/planification "Db Creator/ddl.py" "Db Creator/01_estructura.sql" Doc Status
```

- [ ] **8.2 — Mensaje sugerido**

```
baja logica en Routine_Asignation, User_Planification y User_Routine
```

---

## Después de esto

El modelo queda cerrado para arrancar **E-12** (asignar rutina a planificación), que ahora nace con el vínculo en baja lógica y con las tres lecturas del ABM ya preparadas para filtrarlo. E-12 además tiene que resolver la deuda anotada en el spec del 29/8: `Routine.routine_plan_id` y `Routine_Asignation` son dos formas de decir lo mismo.
