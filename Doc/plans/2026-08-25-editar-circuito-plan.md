# Editar circuito (CU-E-23) — Plan de implementación

> **Spec:** `Doc/specs/2026-08-25-editar-circuito-design.md`
> Los pasos usan checkbox (`- [ ]`) para ir tildando.

**Goal:** `POST /routine/circuit/edit/:id` que pisa la cabecera y la lista completa de ejercicios de un circuito en una sola transacción, reconciliando por `exercise_id` sin destruir el historial de los alumnos.

**Architecture:** El registro de "hecho" se repunta de `Exercise_Set` a `Routine_Exercise` (renombrando la tabla a `Routine_Exercise_Finished`) y `Routine_Exercise` gana baja lógica. Con eso la reconciliación tiene dos caminos al eliminar —físico si nadie lo completó, `active = false` si hay historial— y las series se pueden reemplazar enteras porque ya nada las referencia. Las lecturas del entrenador filtran los inactivos con un helper parametrizado que la futura vista del alumno va a reusar pasándole los ejercicios que ese alumno sí completó.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL. Validación con `class-validator` / `class-transformer` vía el pipe global (`whitelist` + `forbidNonWhitelisted`).

**Convenciones:** no se commitea (queda stageado + mensaje sugerido); no se levanta el server; la verificación del agente es `npm --prefix power-app run build`. La base está vencida, así que las pruebas de runtime quedan para el usuario cuando la regenere.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `power-app/src/entities/routine_exercise.entity.ts` | Modificar | `+ active`; `coach_note` acepta `null` |
| `power-app/src/entities/circuit.entity.ts` | Modificar | `description` acepta `null` |
| `power-app/src/entities/routine_exercise_set_finished.entity.ts` | **Borrar** | Reemplazada por la de abajo |
| `power-app/src/entities/routine_exercise_finished.entity.ts` | Crear | Registro de "hecho", ahora colgando de `Routine_Exercise` |
| `power-app/src/routine/routine.module.ts` | Modificar | Import y `forFeature` de la entidad renombrada |
| `power-app/src/dtos/circuit/edit_circuit.dto.ts` | Crear | Body de la edición |
| `power-app/src/routine/routine.service.ts` | Modificar | `editCircuit`, `validateCircuitPayload`, filtros de inactivos, guarda de rollback |
| `power-app/src/routine/routine.controller.ts` | Modificar | `POST circuit/edit/:id` |
| `Db Creator/ddl.py` | Modificar | `active` en `Routine_Exercise` + tabla de "hecho" renombrada y repuntada |
| `Db Creator/01_estructura.sql` | Regenerar | Salida de `build_sql.py` |
| `Status/estado-implementacion-CU.md` | Modificar | E-23 a ✅, semántica de U-12, hallazgos, cronograma |
| `Status/dashboard-estado-CU.html` | Modificar | Lo mismo, en el dashboard |

`02_datos_estaticos.sql` y `03_datos_dinamicos.sql` **no cambian**: ningún generador inserta en `Routine_Exercise`, `Exercise_Set` ni en la tabla de "hecho" (verificado con grep sobre los cuatro `.py` de datos).

---

### Task 1: Modelo — baja lógica y renombre de la tabla de "hecho"

**Files:**
- Modify: `power-app/src/entities/routine_exercise.entity.ts`
- Modify: `power-app/src/entities/circuit.entity.ts`
- Create: `power-app/src/entities/routine_exercise_finished.entity.ts`
- Delete: `power-app/src/entities/routine_exercise_set_finished.entity.ts`
- Modify: `power-app/src/routine/routine.module.ts`

- [ ] **Step 1: `Routine_Exercise` gana `active` y `coach_note` acepta `null`**

En `routine_exercise.entity.ts`, reemplazar el bloque de `coach_note` por:

```ts
    // Acepta null explicito: al editar el circuito, el entrenador tiene que poder
    // borrar una nota que ya no aplica, y TypeORM ignora las propiedades undefined.
    // El type: 'varchar' es OBLIGATORIO con la union: TS emite design:type = Object
    // para string | null, y sin el tipo declarado TypeORM no sabe que columna crear
    @ApiPropertyOptional({ example: 'Bajar lento en 3 segundos', maxLength: 100 })
    @Column({ type: 'varchar', length: 100, nullable: true })
    coach_note?: string | null;

    // Baja logica: un ejercicio que sale del circuito pero que algun alumno ya completo
    // no se borra, se apaga. Mismo patron que Circuit, Routine y Planification
    @ApiProperty({ example: true })
    @Column({ nullable: false, default: true })
    active!: boolean;
```

- [ ] **Step 2: `Circuit.description` acepta `null`**

En `circuit.entity.ts`, reemplazar el bloque de `description` por:

```ts
    @ApiPropertyOptional({ example: 'Movilidad de hombro y activación de manguito', maxLength: 100 })
    @Column({ type: 'varchar', length: 100, nullable: true })
    description?: string | null;
```

No cambia el DDL (la columna ya era nullable): es sólo el tipo de TypeScript, para poder vaciar la descripción desde la edición.

> **`type: 'varchar'` no es opcional acá, y el `build` no lo detecta.** Con `?: string`, TypeScript emite `design:type = String` y TypeORM infiere la columna sola; con la unión `?: string | null` emite `Object`, y TypeORM levanta `DataTypeNotSupportedError: Data type "Object" ... is not supported by "postgres"` **en runtime**, al construir la metadata (`DataSource.initialize` → `buildMetadatas`). Es el mismo motivo por el que `User.temp_password` ya declara su tipo. Ojo con el mensaje: Nest envuelve cualquier fallo de `initialize` en un `Unable to connect to the database. Retrying...`, que hace parecer un problema de conexión cuando no lo es.

- [ ] **Step 3: Crear la entidad nueva**

Crear `power-app/src/entities/routine_exercise_finished.entity.ts`:

```ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoutine } from './user_routine.entity';
import { RoutineExercise } from './routine_exercise.entity';

// La existencia de la fila = ese ejercicio esta hecho en esa instancia de rutina.
// El registro se crea al completar el ejercicio ENTERO: el tildado serie por serie
// es maquillaje del front y no toca la base
@Entity('Routine_Exercise_Finished')
@Unique('uk_ref_user_routine_exercise', ['user_routine_id', 'routine_exercise_id'])
export class RoutineExerciseFinished {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    user_routine_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    routine_exercise_id!: string;

    @ApiPropertyOptional({ example: 'Me costó la última serie', maxLength: 100 })
    @Column({ length: 100, nullable: true })
    user_note?: string;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    // JOIN RELATIONSHIPS
    @ManyToOne(() => UserRoutine, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_routine_id' })
    userRoutine!: UserRoutine;

    // RESTRICT y no CASCADE, a proposito: la baja fisica de un Routine_Exercise solo pasa
    // cuando nadie lo completo, asi que si esta FK llega a frenar un delete es porque hay
    // un bug en la reconciliacion. Preferimos el error de la base antes que perder historial
    @ManyToOne(() => RoutineExercise, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'routine_exercise_id' })
    routineExercise!: RoutineExercise;
}
```

- [ ] **Step 4: Borrar la entidad vieja**

```bash
rm "power-app/src/entities/routine_exercise_set_finished.entity.ts"
```

- [ ] **Step 5: Actualizar `routine.module.ts`**

Reemplazar la línea del import:

```ts
import { RoutineExerciseSetFinished } from '../entities/routine_exercise_set_finished.entity';
```

por:

```ts
import { RoutineExerciseFinished } from '../entities/routine_exercise_finished.entity';
```

y dentro del `forFeature([...])`, reemplazar `RoutineExerciseSetFinished,` por `RoutineExerciseFinished,`.

> Que esté en el `forFeature` importa: `app.module.ts` usa `autoLoadEntities: true`, así que una entidad que no esté declarada en algún módulo no queda registrada en el `DataSource` y `manager.find(RoutineExerciseFinished, ...)` fallaría en runtime.

- [ ] **Step 6: Verificar compilación**

Run: `npm --prefix power-app run build`
Expected: build en verde. Si tira `Cannot find module '../entities/routine_exercise_set_finished.entity'`, quedó una referencia sin actualizar — buscarla con:

```bash
grep -rn "RoutineExerciseSetFinished\|routine_exercise_set_finished" power-app/src
```

Expected del grep: sin resultados.

---

### Task 2: DDL y regeneración del SQL

**Files:**
- Modify: `Db Creator/ddl.py`
- Regenerate: `Db Creator/01_estructura.sql`

- [ ] **Step 1: `active` en `Routine_Exercise`**

En `ddl.py`, dentro de `CREATE TABLE public."Routine_Exercise" (`, agregar la columna después de `coach_note`:

```sql
CREATE TABLE public."Routine_Exercise" (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id     UUID         NOT NULL,
    circuit_id      UUID         NOT NULL,
    exercise_order  INTEGER      NOT NULL,
    coach_note      VARCHAR(100),
    active          BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_routine_exercise_exercise
        FOREIGN KEY (exercise_id) REFERENCES public."Exercise"(id) ON DELETE CASCADE,
    CONSTRAINT fk_routine_exercise_circuit
        FOREIGN KEY (circuit_id)  REFERENCES public."Circuit"(id)  ON DELETE CASCADE
);
```

- [ ] **Step 2: Renombrar y repuntar la tabla de "hecho"**

En `ddl.py`, reemplazar el bloque completo que hoy empieza en `-- La existencia de la fila = ese set esta hecho...` (tabla `Routine_Exercise_Set_Finished` más su índice) por:

```sql
-- La existencia de la fila = ese ejercicio esta hecho en esa instancia de rutina
CREATE TABLE public."Routine_Exercise_Finished" (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_routine_id     UUID        NOT NULL,
    routine_exercise_id UUID        NOT NULL,
    user_note           VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ref_user_routine
        FOREIGN KEY (user_routine_id)     REFERENCES public."User_Routine"(id)     ON DELETE CASCADE,
    -- RESTRICT a proposito: la baja fisica de un Routine_Exercise solo ocurre cuando no
    -- tiene historial, asi que si esta FK frena un delete es un bug de la reconciliacion
    CONSTRAINT fk_ref_routine_exercise
        FOREIGN KEY (routine_exercise_id) REFERENCES public."Routine_Exercise"(id) ON DELETE RESTRICT,
    CONSTRAINT uk_ref_user_routine_exercise UNIQUE (user_routine_id, routine_exercise_id)
);

CREATE INDEX idx_ref_user_routine_id     ON public."Routine_Exercise_Finished"(user_routine_id);
CREATE INDEX idx_ref_routine_exercise_id ON public."Routine_Exercise_Finished"(routine_exercise_id);
```

La tabla queda donde está, bajo "TABLAS CON DEPENDENCIAS DE CUARTO NIVEL". Sus dos FKs (`User_Routine` y `Routine_Exercise`) ya están creadas para ese punto del script, así que el orden sigue siendo válido; conceptualmente ahora es de tercer nivel, pero moverla no aporta nada.

- [ ] **Step 3: Regenerar los `.sql`**

```bash
cd "Db Creator" && python build_sql.py
```

Expected: el script informa que escribió los tres `.sql` sin errores.

- [ ] **Step 4: Verificar que sólo cambió `01_estructura.sql`**

```bash
git status --short "Db Creator"
```

Expected: `01_estructura.sql` y `ddl.py` modificados. Si aparecen `02_datos_estaticos.sql` o `03_datos_dinamicos.sql`, algo más se tocó — revisar antes de seguir.

- [ ] **Step 5: Verificar el contenido generado**

```bash
grep -n "active\|Routine_Exercise_Finished\|routine_exercise_id" "Db Creator/01_estructura.sql" | grep -i "routine_exercise"
```

Expected: aparece `active BOOLEAN NOT NULL DEFAULT true` en `Routine_Exercise`, la tabla `Routine_Exercise_Finished` con `ON DELETE RESTRICT`, y **ninguna** mención a `Routine_Exercise_Set_Finished` ni a `routine_exercise_set_id`.

---

### Task 3: DTO de la edición

**Files:**
- Create: `power-app/src/dtos/circuit/edit_circuit.dto.ts`

- [ ] **Step 1: Crear el DTO**

```ts
import { CreateCircuitDto } from './create_circuit.dto';

// Mismo body que el alta: la edicion pisa la cabecera y la lista completa de ejercicios.
// Se declara como clase propia y no como alias para que Swagger muestre un schema con
// nombre distinto y para dejar lugar a que los dos bodies diverjan
export class EditCircuitDto extends CreateCircuitDto {}
```

- [ ] **Step 2: Verificar compilación**

Run: `npm --prefix power-app run build`
Expected: build en verde.

---

### Task 4: `validateCircuitPayload` y la guarda de rollback en `createCircuit`

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 1: Renombrar el helper y meterle el chequeo de duplicados**

Reemplazar el helper `validateCircuitSetRules` completo por:

```ts
    // Unica puerta de validacion del payload, compartida por el alta y la edicion:
    // la regla se define una sola vez y los dos endpoints devuelven el mismo mensaje
    private validateCircuitPayload(circuitDto: CreateCircuitDto): string | null {
        const exerciseIds = circuitDto.exercises.map(exercise => exercise.exercise_id);

        if (new Set(exerciseIds).size !== exerciseIds.length) {
            return 'El circuito no puede repetir el mismo ejercicio. Si necesitás el mismo movimiento dos veces, usá una variación del catálogo.';
        }

        for (const [exerciseIndex, exercise] of circuitDto.exercises.entries()) {
            for (const [setIndex, set] of exercise.sets.entries()) {
                const donde = `ejercicio ${exerciseIndex + 1}, serie ${setIndex + 1}`;

                if (set.amrap_time !== undefined && set.amrap !== true) {
                    return `En ${donde}: amrap_time sólo puede enviarse con amrap = true.`;
                }

                if (set.rpe !== undefined && set.rir !== undefined) {
                    return `En ${donde}: rpe y rir son mutuamente excluyentes, son la misma escala invertida.`;
                }

                if (set.rm === true && set.set_count !== 1) {
                    return `En ${donde}: una serie marcada como rm debe tener set_count = 1. Para dos intentos, enviá dos series iguales.`;
                }
            }
        }

        return null;
    }
```

- [ ] **Step 2: Que `createCircuit` use el helper**

En `createCircuit`, reemplazar el bloque de validaciones previas (desde `const exerciseIds = ...` hasta el `if (reglaIncumplida)` inclusive) por:

```ts
        // Validaciones que no dependen de la base, antes de abrir la transacción
        const reglaIncumplida = this.validateCircuitPayload(createCircuitDto);
        if (reglaIncumplida) {
            return res.status(400).send({ error: reglaIncumplida });
        }

        const exerciseIds = createCircuitDto.exercises.map(exercise => exercise.exercise_id);
```

`exerciseIds` se sigue necesitando más abajo, para buscar los ejercicios del catálogo.

- [ ] **Step 3: Portar la guarda de rollback**

En el `catch` de `createCircuit`, reemplazar `await queryRunner.rollbackTransaction();` por:

```ts
            // La recarga del detalle pasa despues del commit: si falla ahi, la transaccion ya
            // esta cerrada y un rollback incondicional tiraria un error nuevo dentro del catch
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
```

Es el mismo agujero que ya se tapó en `createRoutine`.

- [ ] **Step 4: Verificar compilación**

Run: `npm --prefix power-app run build`
Expected: build en verde. Si aparece `Property 'validateCircuitSetRules' does not exist`, quedó una llamada con el nombre viejo:

```bash
grep -n "validateCircuitSetRules" power-app/src/routine/routine.service.ts
```

Expected del grep: sin resultados.

---

### Task 5: Filtrar los ejercicios inactivos en las lecturas

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 1: Parametrizar `buildCircuitDetailResponse`**

Reemplazar la firma y el arranque del `exercises:` por:

```ts
    // visibleInactiveIds: ids de Routine_Exercise dados de baja que SI hay que mostrar.
    // Las lecturas del entrenador no pasan nada, asi que ven solo los activos. Las del
    // alumno (U-08/U-09/U-10 y el historial) van a pasar los que ese User_Routine tenga
    // en Routine_Exercise_Finished: un ejercicio que completo no tiene que desaparecerle
    // de la pantalla porque el entrenador lo saco del circuito
    private buildCircuitDetailResponse(circuit: Circuit, visibleInactiveIds?: Set<string>) {
```

y, dentro del objeto que devuelve, la línea `exercises: circuit.routineExercises.map(routineExercise => ({` por:

```ts
            exercises: circuit.routineExercises
                .filter(routineExercise => routineExercise.active || visibleInactiveIds?.has(routineExercise.id))
                .map(routineExercise => ({
```

El resto del `map` no se toca (sólo queda indentado un nivel más, opcional).

> `findCircuitDetail` y `findRoutineDetail` siguen trayendo los inactivos de la base: el filtro vive en el builder justo para que la vista del alumno pueda pedir los mismos datos y decidir distinto.

- [ ] **Step 2: Contar sólo los activos en `getAllCircuits`**

Reemplazar la llamada a `loadRelationCountAndMap` por:

```ts
            const circuits = await this.buildCircuitsQuery(query)
                .loadRelationCountAndMap(
                    'circuit.exercise_count',
                    'circuit.routineExercises',
                    'routineExercise',
                    qb => qb.andWhere('routineExercise.active = :activeExercise', { activeExercise: true }),
                )
                .getMany();
```

El alias del parámetro es `activeExercise` y no `active` para no pisar el que `buildCircuitsQuery` ya usa para el filtro de circuitos.

- [ ] **Step 3: Filtrar el join en `getAllCircuitsPlus`**

Reemplazar el primer `leftJoinAndSelect` por:

```ts
            const circuits = await this.buildCircuitsQuery(query)
                .leftJoinAndSelect(
                    'circuit.routineExercises',
                    'routineExercise',
                    'routineExercise.active = :activeExercise',
                    { activeExercise: true },
                )
                .leftJoinAndSelect('routineExercise.exercise', 'exercise')
                .addOrderBy('routineExercise.exercise_order', 'ASC')
                .getMany();
```

La condición va en el `ON` del join y no en un `where`: así un circuito que quedara sin ejercicios activos igual aparece en el listado, en vez de desaparecer entero.

`exercise_count` ya sale del `.length` del array cargado, que ahora viene filtrado — no hay que tocarlo.

- [ ] **Step 4: Verificar compilación**

Run: `npm --prefix power-app run build`
Expected: build en verde.

---

### Task 6: `editCircuit` en el service

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 1: Agregar los imports**

Después de `import { CreateCircuitDto } from '../dtos/circuit/create_circuit.dto';`:

```ts
import { EditCircuitDto } from '../dtos/circuit/edit_circuit.dto';
```

Y después del import de `ExerciseSet`:

```ts
import { RoutineExerciseFinished } from '../entities/routine_exercise_finished.entity';
```

- [ ] **Step 2: Escribir el método**

Insertarlo en la sección `// ===================== CIRCUITOS =====================`, justo después de `createCircuit`:

```ts
    async editCircuit(
        idCircuit: string,
        editCircuitDto: EditCircuitDto,
        res: Response
    ) {
        // Validaciones que no dependen de la base, antes de abrir la transacción
        const reglaIncumplida = this.validateCircuitPayload(editCircuitDto);
        if (reglaIncumplida) {
            return res.status(400).send({ error: reglaIncumplida });
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Se cargan TODOS los Routine_Exercise, activos e inactivos: un ejercicio dado
            // de baja que vuelve a la lista se reactiva en vez de duplicarse, asi queda una
            // sola fila por (circuito, ejercicio) y exercise_id sigue siendo clave natural
            const circuit = await queryRunner.manager.findOne(Circuit, {
                where: { id: idCircuit },
                relations: ['routineExercises'],
            });

            if (!circuit) {
                await queryRunner.rollbackTransaction();
                return res.status(404).send({ error: 'Circuito no encontrado' });
            }

            // Precondicion del CU: el circuito tiene que estar activo. Va 400 y no 404
            // porque el id existe: alcanza con reactivarlo por set-active
            if (!circuit.active) {
                await queryRunner.rollbackTransaction();
                return res.status(400).send({
                    error: `El circuito "${circuit.name}" está dado de baja y no se puede editar. Reactivalo primero.`
                });
            }

            const exerciseIds = editCircuitDto.exercises.map(exercise => exercise.exercise_id);

            // Todos los ejercicios tienen que existir en el catálogo
            const exercises = await queryRunner.manager.find(Exercise, {
                where: { id: In(exerciseIds) },
                select: { id: true },
            });

            if (exercises.length !== exerciseIds.length) {
                await queryRunner.rollbackTransaction();
                return res.status(404).send({ error: 'Algunos ejercicios no fueron encontrados' });
            }

            // Los que estaban activos y no vienen en la lista nueva
            const salen = circuit.routineExercises.filter(
                routineExercise => routineExercise.active && !exerciseIds.includes(routineExercise.exercise_id)
            );

            // Una sola query para saber cuales tienen historial, no una por ejercicio
            let conHistorial: string[] = [];
            if (salen.length > 0) {
                const finished = await queryRunner.manager.find(RoutineExerciseFinished, {
                    where: { routine_exercise_id: In(salen.map(routineExercise => routineExercise.id)) },
                    select: { routine_exercise_id: true },
                });
                conHistorial = finished.map(row => row.routine_exercise_id);
            }

            for (const routineExercise of salen) {
                if (conHistorial.includes(routineExercise.id)) {
                    // Alguien ya lo completo: baja logica, el historial queda intacto
                    routineExercise.active = false;
                    await queryRunner.manager.save(routineExercise);
                } else {
                    // Nadie lo hizo: baja fisica, las series se van por cascade
                    await queryRunner.manager.remove(routineExercise);
                }
            }

            // exercise_order y set_order salen de la posición en el array, igual que en el alta
            for (const [exerciseIndex, exercise] of editCircuitDto.exercises.entries()) {
                const existente = circuit.routineExercises.find(
                    routineExercise => routineExercise.exercise_id === exercise.exercise_id
                );

                let routineExercise: RoutineExercise;

                if (existente) {
                    // Sobrevive o reaparece: en los dos casos queda activo y con el orden nuevo
                    existente.active = true;
                    existente.exercise_order = exerciseIndex + 1;
                    existente.coach_note = exercise.coach_note ?? null;
                    routineExercise = await queryRunner.manager.save(existente);

                    // Las series no se reconcilian: despues de repuntar el "hecho" a
                    // Routine_Exercise nadie referencia a Exercise_Set, asi que se reemplazan
                    await queryRunner.manager.delete(ExerciseSet, { routine_exercise_id: routineExercise.id });
                } else {
                    routineExercise = await queryRunner.manager.save(
                        queryRunner.manager.create(RoutineExercise, {
                            circuit_id: circuit.id,
                            exercise_id: exercise.exercise_id,
                            exercise_order: exerciseIndex + 1,
                            coach_note: exercise.coach_note,
                            active: true,
                        })
                    );
                }

                for (const [setIndex, set] of exercise.sets.entries()) {
                    await queryRunner.manager.save(
                        queryRunner.manager.create(ExerciseSet, {
                            routine_exercise_id: routineExercise.id,
                            set_order: setIndex + 1,
                            set_count: set.set_count,
                            rep_count: set.rep_count,
                            weight: set.weight,
                            rpe: set.rpe,
                            rir: set.rir,
                            rm_perc: set.rm_perc,
                            amrap: set.amrap ?? false,
                            amrap_time: set.amrap_time,
                            rm: set.rm ?? false,
                        })
                    );
                }
            }

            // La cabecera se pisa entera. updated_at se setea a mano porque el onUpdate de
            // las entidades es sintaxis de MySQL y en Postgres no hace nada: sin esto, un
            // circuito editado seguiria mostrando la fecha del alta
            circuit.name = editCircuitDto.name;
            circuit.description = editCircuitDto.description ?? null;
            circuit.type = editCircuitDto.type;
            circuit.updated_at = new Date();
            await queryRunner.manager.save(Circuit, circuit);

            await queryRunner.commitTransaction();

            // Se recarga con las relaciones para devolver el mismo formato que el detalle
            const updated = await this.findCircuitDetail(circuit.id);
            return res.status(200).send(this.buildCircuitDetailResponse(updated!));
        } catch (error) {
            // La recarga del detalle pasa despues del commit: si falla ahi, la transaccion ya
            // esta cerrada y un rollback incondicional tiraria un error nuevo dentro del catch
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            console.error(error);
            res.status(500).send({ error: 'Error al editar el circuito.' });
        } finally {
            await queryRunner.release();
        }
    }
```

- [ ] **Step 3: Verificar compilación**

Run: `npm --prefix power-app run build`
Expected: build en verde.

Si aparece `Type 'null' is not assignable to type 'string | undefined'` en `coach_note` o `description`, faltó el Task 1 (los dos campos tienen que aceptar `null`).

---

### Task 7: Endpoint en el controller

**Files:**
- Modify: `power-app/src/routine/routine.controller.ts`

- [ ] **Step 1: Agregar el import**

Después de `import { CreateCircuitDto } from '../dtos/circuit/create_circuit.dto';`:

```ts
import { EditCircuitDto } from '../dtos/circuit/edit_circuit.dto';
```

- [ ] **Step 2: Agregar el endpoint**

Justo después de `createCircuit` en el bloque de circuitos:

```ts
    @Post('circuit/edit/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: CircuitDetailResponseDto })
    async editCircuit(
        @Param() idCircuit: ParameterIdDto,
        @Body() editCircuitDto: EditCircuitDto,
        @Res() res: Response,
    ) {
        this.routineService.editCircuit(idCircuit.id, editCircuitDto, res);
    }
```

No hace falta cuidar el orden de declaración como con `circuit/all-plus`: `circuit/edit/:id` tiene dos segmentos después de `circuit`, así que no colisiona con el patrón `circuit/:id`.

- [ ] **Step 3: Actualizar el comentario de sección**

Reemplazar `// ===================== CIRCUITOS (CU-E-21, CU-E-24) =====================` por:

```ts
    // ===================== CIRCUITOS (CU-E-21, CU-E-22, CU-E-23, CU-E-24) =====================
```

- [ ] **Step 4: Verificar compilación**

Run: `npm --prefix power-app run build`
Expected: build en verde.

---

### Task 8: Actualizar los artefactos de `Status/`

**Files:**
- Modify: `Status/estado-implementacion-CU.md`
- Modify: `Status/dashboard-estado-CU.html`

- [ ] **Step 1: Fila de CU-E-23 en la tabla del rol entrenador**

Reemplazar:

```
| CU-E-23 | Editar circuito | ⬜ No implementado | pendiente de refinar la reconciliación |
```

por:

```
| CU-E-23 | Editar circuito | ✅ Implementado | `POST /routine/circuit/edit/:id` · reconciliación por `exercise_id`, baja lógica si hay historial |
```

- [ ] **Step 2: Fila de CU-U-12**

Reemplazar:

```
| CU-U-12 | Marcar serie como realizado | ⬜ No implementado | sin endpoint (Exercise_Set) |
```

por:

```
| CU-U-12 | Marcar serie como realizado | ⬜ No implementado | sin endpoint · el registro pasa a ser por ejercicio (`Routine_Exercise_Finished`) |
```

- [ ] **Step 3: Corregir la semántica fijada en la nota de CU-E-22**

En la nota que hoy dice que el alumno marca el bloque completo y que "tildar serie por serie sería maquillaje del front", reemplazar la oración final por:

```
**Semántica actualizada (25/8):** una fila de `Exercise_Set` sigue siendo un **bloque de series iguales**, pero el "hecho" ya no se registra por bloque: `Routine_Exercise_Finished` cuelga del **ejercicio completo**, y el tildado serie por serie queda enteramente del lado del front.
```

- [ ] **Step 4: Reemplazar el párrafo que dejaba a E-23 pausado**

Reemplazar el bullet que hoy empieza con "**CU-E-23 (editar circuito)** queda como el **único pendiente del bloque**, pausado por decisión de diseño..." por:

```
- **CU-E-23 (editar circuito)** ✅: `POST /routine/circuit/edit/:id` recibe el mismo body que el alta —cabecera más la lista completa de ejercicios— y reconcilia en una sola transacción. **La reconciliación va por `exercise_id`**, que es clave natural dentro del circuito desde E-22, así que el body no lleva ids de `Routine_Exercise` ni de `Exercise_Set`.
  - **Eliminar tiene dos caminos**, y es lo que destrabó el CU: si nadie completó el ejercicio se borra físico (las series se van por cascade); si hay filas en `Routine_Exercise_Finished` se apaga con `active = false` y el historial del alumno queda intacto. Quién tiene historial se resuelve con **una sola query** sobre los candidatos a salir, no una por ejercicio.
  - **Un ejercicio dado de baja que vuelve a la lista se reactiva**, no se duplica: el diff busca el `exercise_id` entre todas las filas del circuito y no sólo entre las activas, así queda una sola fila por (circuito, ejercicio) y su historial vuelve a colgar del ejercicio que efectivamente es.
  - **Las series se reemplazan enteras**, también en los ejercicios que sobreviven: después de repuntar el "hecho" a `Routine_Exercise`, nada referencia a `Exercise_Set`, así que no hay nada que preservar.
  - **Las lecturas del entrenador filtran los inactivos** (`buildCircuitDetailResponse`, el join de `circuit/all-plus` y el conteo SQL de `circuit/all`). El filtro es un parámetro del helper, no algo hardcodeado: la vista del alumno va a pasarle los ejercicios que ese `User_Routine` completó, porque **el alumno sí tiene que ver un inactivo que él hizo** — y sólo ése.
```

- [ ] **Step 5: Cerrar el pendiente del rollback y actualizar hallazgos y cronograma**

- En la nota de CU-E-16 que dice que `createCircuit` tiene el mismo agujero del rollback "y conviene portarle la guarda cuando se retome E-23": marcarla como resuelta el 25/8, con la guarda ya portada.
- **Hallazgo 3** ("Circuitos: cerrado salvo E-23"): pasa a cerrado sin excepciones, con las 4 CU del paquete en ✅.
- **Cronograma**, fila del 21/8: sacar el ⏸️ de E-23 y dejarla como bloque completo (4 de 4).
- En el párrafo de actualización que dice que E-23 "quedó pausado a propósito y no bloquea a Rutinas": marcarlo como cerrado el 25/8.
- Agregar a la lista de hallazgos el nuevo: **`updated_at` no se actualiza solo** — el `onUpdate: 'CURRENT_TIMESTAMP'` de las entidades es sintaxis de MySQL, en Postgres no hace nada y no hay triggers en el DDL, así que hoy queda congelado en la fecha de alta en todas las tablas. Resuelto sólo en `editCircuit` (se setea a mano); generalizarlo queda pendiente.

- [ ] **Step 6: Sección "Cambios recientes" y conteos**

Agregar la entrada del 25/8 describiendo el cambio de modelo (`Routine_Exercise.active`, `Routine_Exercise_Set_Finished` → `Routine_Exercise_Finished` apuntando al ejercicio) y CU-E-23. Actualizar el conteo de CU implementados del rol entrenador (+1) y el total.

- [ ] **Step 7: Replicar en el dashboard**

Aplicar los mismos cambios en `Status/dashboard-estado-CU.html`: estado de CU-E-23, nota de CU-U-12, conteos, cronograma y hallazgos.

- [ ] **Step 8: Verificar que no quedó nada desalineado**

```bash
grep -n "E-23" Status/estado-implementacion-CU.md Status/dashboard-estado-CU.html
```

Expected: ninguna línea que siga diciendo "pausado", "pendiente" o "⏸️" para E-23.

---

### Task 9: Dejar todo stageado

- [ ] **Step 1: Verificación final de compilación**

Run: `npm --prefix power-app run build`
Expected: build en verde.

- [ ] **Step 2: Stagear**

```bash
git add power-app/src Status "Db Creator" Doc/plans Doc/specs
```

- [ ] **Step 3: Revisar qué quedó**

```bash
git status --short
```

Expected: la entidad vieja como borrada (`D`), la nueva y el DTO como agregados (`A`), y como modificados el service, el controller, el módulo, las dos entidades, `ddl.py`, `01_estructura.sql` y los dos artefactos de Status.

- [ ] **Step 4: Sugerir el mensaje de commit**

No commitear. Proponer:

```
CU-E-23: edicion de circuitos con baja logica de Routine_Exercise

Routine_Exercise_Set_Finished pasa a Routine_Exercise_Finished y cuelga del
ejercicio en vez de la serie. Routine_Exercise gana active: al sacar un
ejercicio del circuito se borra fisico si nadie lo completo y se apaga si
hay historial. Las series se reemplazan enteras y las lecturas del
entrenador filtran los inactivos.
```

---

## Pendientes para el usuario

- **Regenerar la base** con `01_estructura.sql` → `02_datos_estaticos.sql` → `03_datos_dinamicos.sql`. El schema cambió (columna nueva y tabla renombrada) y `synchronize` está en `false`.
- **Corregir el diagrama de `Doc/`**: `Routine_Exercise` figura con `updated_at` dos veces; el primero debería ser `created_at`.
- **Generalizar `updated_at`** (trigger en el DDL o `@UpdateDateColumn` en las entidades): hoy queda congelado en la fecha de alta en todas las tablas salvo donde se setea a mano.

## Pruebas en runtime (para el usuario)

> **Estado al 25/8:** patch aplicado sobre la base viva. **Probados y OK: 1, 4 y 6**, más un re-agregado que —al no haber corrido el 2— entró por la rama del `INSERT` y no por la de reactivar. **Pendientes: 2, 3 y 5**, o sea toda la rama de `active`.

**Preparación.** Los escenarios 2 y 3 necesitan una fila en `Routine_Exercise_Finished`, cuya FK exige un `User_Routine` que el seed **no** genera (`dynamic_data.py` llega hasta `User_RM`). Esto arma la cadena entera y devuelve el id; requiere al menos una `Routine` en la base (si no hay, crearla con `POST /routine/create`):

```sql
WITH plan AS (
  INSERT INTO public."Planification" (name, number_of_routines, type, duration)
  VALUES ('TEST E-23', 1, 'test', '1 semana')
  RETURNING id
), asig AS (
  INSERT INTO public."Routine_Asignation" (routine_id, routine_plan_id, "order")
  SELECT r.id, plan.id, 1
    FROM plan, public."Routine" r
   ORDER BY r.created_at DESC
   LIMIT 1
  RETURNING id
)
INSERT INTO public."User_Routine" (routine_asignation_id, user_id, date)
SELECT asig.id, u.id, CURRENT_DATE
  FROM asig, public."User" u
 WHERE u.email = 'lucia.fernandez@test.com'
RETURNING id AS user_routine_id;
```

Con ese id, marcar un ejercicio como hecho es:

```sql
INSERT INTO public."Routine_Exercise_Finished" (user_routine_id, routine_exercise_id)
VALUES ('<user_routine_id>', '<routine_exercise_id>');
```

El `routine_exercise_id` sale de `exercises[].id` del detalle del circuito (es el `Routine_Exercise`, no el `Exercise`). Query de control después de cada edición:

```sql
SELECT re.id, e.name, re.exercise_order, re.active
  FROM public."Routine_Exercise" re
  JOIN public."Exercise" e ON e.id = re.exercise_id
 WHERE re.circuit_id = '<circuit_id>'
 ORDER BY re.active DESC, re.exercise_order;
```

**Escenarios.**

1. ✅ **Edición sin historial** — crear un circuito con 3 ejercicios, editarlo dejando 2. El tercero desaparece de `GET /routine/circuit/:id` y **no queda fila** en `Routine_Exercise` (la query de control devuelve 2).
2. ⬜ **Edición con historial** — marcar un ejercicio como hecho con el `INSERT` de arriba, sacarlo de la lista y editar. La fila de `Routine_Exercise` queda con `active = false`, la de historial **sigue ahí**, y el ejercicio ya no aparece en el detalle ni en `circuit/all-plus`, ni suma al `exercise_count` de `circuit/all`.
3. ⬜ **Reactivación** — volver a agregar ese mismo ejercicio y editar. Vuelve al detalle **con el mismo `id`** que tenía antes (no se creó otra fila) y su historial sigue colgando de él. **Sólo vale si antes corrió el 2:** sin una fila en `active = false` no hay nada que reactivar y el ejercicio entra por la rama del `INSERT`, que es la del escenario 1.
4. ✅ **Series reemplazadas** — editar un ejercicio que sobrevive cambiando sus series. Las series nuevas salen con `set_order` 1..N y las viejas ya no existen.
5. ⬜ **Errores** — circuito inexistente → `404`; circuito dado de baja por `set-active` → `400`; lista vacía → `400`; `exercise_id` repetido → `400`; `rm = true` con `set_count = 2` → `400`; `exercise_id` que no está en el catálogo → `404`.
6. ✅ **Guards** — sin token → `401`; con token de rol `user` → `403`.
