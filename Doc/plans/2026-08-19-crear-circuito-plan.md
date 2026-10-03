# Crear circuito (CU-E-22) — Plan de implementación

> **Spec:** `Doc/specs/2026-08-19-crear-circuito-design.md`
> Los pasos usan checkbox (`- [ ]`) para ir tildando.

**Goal:** `POST /routine/circuit/create` que da de alta un circuito completo —cabecera + ejercicios + series— en una sola llamada y una sola transacción.

**Architecture:** Un DTO con tres clases anidadas validadas en cascada, un método nuevo en `RoutineService` que valida, abre transacción con `QueryRunner` y persiste los tres niveles, y la extracción del armado de la respuesta anidada a dos helpers privados que comparte con `getCircuitById`.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL. Validación con `class-validator` / `class-transformer` vía el pipe global (`whitelist` + `forbidNonWhitelisted`).

**Convenciones:** no se commitea (queda stageado + mensaje sugerido); no se levanta el server; la verificación del agente es `npm --prefix power-app run build`. **La base está migrada y al día**, así que esta vez el usuario sí puede probar en runtime.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `power-app/src/dtos/circuit/create_circuit.dto.ts` | Crear | Body del alta, con sus tres clases anidadas |
| `power-app/src/routine/routine.service.ts` | Modificar | `createCircuit` + 2 helpers privados + refactor de `getCircuitById` |
| `power-app/src/routine/routine.controller.ts` | Modificar | Endpoint nuevo |

`RoutineModule` **no cambia**. La validación de existencia de los ejercicios se hace con `queryRunner.manager`, que alcanza cualquier entidad registrada en el `DataSource` — `Exercise` ya lo está vía `ExerciseModule` — así que no hace falta sumarla al `forFeature`.

---

### Task 1: DTO del alta

**Files:**
- Create: `power-app/src/dtos/circuit/create_circuit.dto.ts`

- [ ] **Step 1: Crear el archivo con las tres clases**

El orden importa: `CreateCircuitSetDto` tiene que estar declarado antes de que lo referencie `CreateCircuitExerciseDto`.

```typescript
import {
  IsNotEmpty, IsUUID, IsArray, ArrayNotEmpty, ValidateNested,
  IsString, IsOptional, MaxLength, IsInt, IsNumber, IsBoolean, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCircuitSetDto {

    @ApiProperty({ example: 3, minimum: 1, maximum: 20, description: 'Cantidad de series del bloque. Una fila es un bloque de series iguales: set_count 3 con rep_count 8 es "3x8"' })
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Max(20)
    set_count!: number;

    @ApiProperty({ example: 8, minimum: 1, maximum: 1000, description: 'Repeticiones por serie. Con amrap = true se interpreta como reps objetivo; el valor 1 significa "sin objetivo"' })
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Max(1000)
    rep_count!: number;

    @ApiPropertyOptional({ example: 80.5, minimum: 0.01, maximum: 1000 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(1000)
    weight?: number;

    @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 10, description: 'Escala RPE. Mutuamente excluyente con rir' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    rpe?: number;

    @ApiPropertyOptional({ example: 2, minimum: 0, maximum: 10, description: 'Repeticiones en reserva. Mutuamente excluyente con rpe' })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(10)
    rir?: number;

    @ApiPropertyOptional({ example: 75, minimum: 1, maximum: 125, description: 'Porcentaje del 1RM. Llega a 125 para permitir trabajo supramáximo' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(125)
    rm_perc?: number;

    @ApiPropertyOptional({ example: false, default: false, description: 'Serie al fallo. Con amrap_time, AMRAP cronometrado' })
    @IsOptional()
    @IsBoolean()
    amrap?: boolean = false;

    @ApiPropertyOptional({ example: 60, minimum: 1, description: 'Duración del AMRAP en segundos. Sólo válido con amrap = true' })
    @IsOptional()
    @IsInt()
    @Min(1)
    amrap_time?: number;

    @ApiPropertyOptional({ example: false, default: false, description: 'Marca el bloque como intento de RM. Exige set_count = 1: dos intentos se mandan como dos series iguales' })
    @IsOptional()
    @IsBoolean()
    rm?: boolean = false;
}

export class CreateCircuitExerciseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'ID del ejercicio del catálogo. No puede repetirse dentro del circuito' })
    @IsNotEmpty()
    @IsUUID('4', { message: 'El ID de ejercicio debe ser un UUID válido' })
    exercise_id!: string;

    @ApiPropertyOptional({ example: 'Bajar lento en 3 segundos', maxLength: 100 })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    coach_note?: string;

    @ApiProperty({ type: [CreateCircuitSetDto], description: 'Series prescritas, en orden. Al menos una' })
    @IsArray()
    @ArrayNotEmpty({ message: 'Cada ejercicio debe tener al menos una serie' })
    @ValidateNested({ each: true })
    @Type(() => CreateCircuitSetDto)
    sets!: CreateCircuitSetDto[];
}

export class CreateCircuitDto {

    @ApiProperty({ example: 'Entrada en calor - Tren superior', maxLength: 100 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name!: string;

    @ApiPropertyOptional({ example: 'Movilidad de hombro y activación de manguito', maxLength: 100 })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    description?: string;

    @ApiProperty({ example: 'entrada en calor', maxLength: 30 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(30)
    type!: string;

    @ApiProperty({ type: [CreateCircuitExerciseDto], description: 'Ejercicios del circuito, en orden. Al menos uno' })
    @IsArray()
    @ArrayNotEmpty({ message: 'El circuito debe tener al menos un ejercicio' })
    @ValidateNested({ each: true })
    @Type(() => CreateCircuitExerciseDto)
    exercises!: CreateCircuitExerciseDto[];
}
```

`exercise_order` y `set_order` **no están** a propósito: los deriva el server de la posición en el array.

---

### Task 2: Refactor de `getCircuitById` en dos helpers

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

Antes de agregar el alta, se extrae el armado de la respuesta para que `createCircuit` lo reutilice. Sin este paso, el formato del detalle quedaría duplicado en dos métodos y se desincronizaría.

- [ ] **Step 1: Agregar los dos helpers privados al final de la clase**

```typescript
    // ===================== HELPERS DE CIRCUITO =====================

    private async findCircuitDetail(idCircuit: string): Promise<Circuit | null> {
        return this.circuitRepository.findOne({
            where: { id: idCircuit },
            relations: ['routineExercises', 'routineExercises.exercise', 'routineExercises.exerciseSets'],
            order: {
                routineExercises: {
                    exercise_order: 'ASC',
                    exerciseSets: {
                        set_order: 'ASC',
                    },
                },
            },
        });
    }

    private buildCircuitDetailResponse(circuit: Circuit) {
        return {
            id: circuit.id,
            name: circuit.name,
            description: circuit.description,
            type: circuit.type,
            active: circuit.active,
            created_at: circuit.created_at,
            updated_at: circuit.updated_at,
            exercises: circuit.routineExercises.map(routineExercise => ({
                id: routineExercise.id,
                exercise_order: routineExercise.exercise_order,
                coach_note: routineExercise.coach_note,
                exercise: {
                    id: routineExercise.exercise.id,
                    name: routineExercise.exercise.name,
                    description: routineExercise.exercise.description,
                    safety_tips: routineExercise.exercise.safety_tips,
                    activation_tips: routineExercise.exercise.activation_tips,
                    video_url: routineExercise.exercise.video_url,
                    preview_image: routineExercise.exercise.preview_image,
                    bg_image: routineExercise.exercise.bg_image,
                },
                sets: routineExercise.exerciseSets.map(exerciseSet => ({
                    id: exerciseSet.id,
                    set_order: exerciseSet.set_order,
                    set_count: exerciseSet.set_count,
                    rep_count: exerciseSet.rep_count,
                    weight: exerciseSet.weight,
                    rpe: exerciseSet.rpe,
                    rir: exerciseSet.rir,
                    rm_perc: exerciseSet.rm_perc,
                    amrap: exerciseSet.amrap,
                    amrap_time: exerciseSet.amrap_time,
                    rm: exerciseSet.rm,
                })),
            })),
        };
    }
```

- [ ] **Step 2: Reemplazar el cuerpo de `getCircuitById` para que los use**

```typescript
    async getCircuitById(
        idCircuit: string,
        res: Response
    ) {
        try {
            const circuit = await this.findCircuitDetail(idCircuit);

            if (!circuit) {
                return res.status(404).send({ error: 'Circuito no encontrado' });
            }

            res.status(200).send(this.buildCircuitDetailResponse(circuit));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener el circuito.' });
        }
    }
```

- [ ] **Step 3: Compilar para confirmar que el refactor no rompió nada**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Task 3: Validaciones cruzadas

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 1: Agregar el validador al bloque de helpers**

Devuelve el mensaje del primer problema, o `null` si está todo bien. Se recorre entero antes de tocar la base.

```typescript
    private validateCircuitSetRules(createCircuitDto: CreateCircuitDto): string | null {
        for (const [exerciseIndex, exercise] of createCircuitDto.exercises.entries()) {
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

---

### Task 4: `createCircuit`

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 1: Sumar los imports que faltan**

```typescript
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Circuit } from '../entities/circuit.entity';
import { Exercise } from '../entities/exercise.entity';
import { RoutineExercise } from '../entities/routine_exercise.entity';
import { ExerciseSet } from '../entities/exercise_set.entity';
import { GetCircuitsQueryDto } from '../dtos/circuit/get_circuits_query.dto';
import { SetCircuitActiveDto } from '../dtos/circuit/set_circuit_active.dto';
import { CreateCircuitDto } from '../dtos/circuit/create_circuit.dto';
```

- [ ] **Step 2: Sumar el `DataSource` al constructor**

```typescript
    constructor(
        @InjectRepository(Circuit)
        private circuitRepository: Repository<Circuit>,
        @InjectDataSource()
        private dataSource: DataSource,
    ) {
    }
```

- [ ] **Step 3: Agregar el método, arriba de `getAllCircuits`**

```typescript
    async createCircuit(
        createCircuitDto: CreateCircuitDto,
        res: Response
    ) {
        // Validaciones que no dependen de la base, antes de abrir la transacción
        const exerciseIds = createCircuitDto.exercises.map(exercise => exercise.exercise_id);

        if (new Set(exerciseIds).size !== exerciseIds.length) {
            return res.status(400).send({
                error: 'El circuito no puede repetir el mismo ejercicio. Si necesitás el mismo movimiento dos veces, usá una variación del catálogo.'
            });
        }

        const reglaIncumplida = this.validateCircuitSetRules(createCircuitDto);
        if (reglaIncumplida) {
            return res.status(400).send({ error: reglaIncumplida });
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Todos los ejercicios tienen que existir en el catálogo
            const exercises = await queryRunner.manager.find(Exercise, {
                where: { id: In(exerciseIds) },
                select: { id: true },
            });

            if (exercises.length !== exerciseIds.length) {
                await queryRunner.rollbackTransaction();
                return res.status(404).send({ error: 'Algunos ejercicios no fueron encontrados' });
            }

            const circuit = await queryRunner.manager.save(
                queryRunner.manager.create(Circuit, {
                    name: createCircuitDto.name,
                    description: createCircuitDto.description,
                    type: createCircuitDto.type,
                    active: true,
                })
            );

            // exercise_order y set_order salen de la posición en el array
            for (const [exerciseIndex, exercise] of createCircuitDto.exercises.entries()) {
                const routineExercise = await queryRunner.manager.save(
                    queryRunner.manager.create(RoutineExercise, {
                        circuit_id: circuit.id,
                        exercise_id: exercise.exercise_id,
                        exercise_order: exerciseIndex + 1,
                        coach_note: exercise.coach_note,
                    })
                );

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

            await queryRunner.commitTransaction();

            // Se recarga con las relaciones para devolver el mismo formato que el detalle
            const created = await this.findCircuitDetail(circuit.id);
            return res.status(201).send(this.buildCircuitDetailResponse(created!));
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(error);
            res.status(500).send({ error: 'Error al crear el circuito.' });
        } finally {
            await queryRunner.release();
        }
    }
```

El `finally` corre también cuando se sale por `return`, así que la conexión siempre se libera.

---

### Task 5: Endpoint en el controller

**Files:**
- Modify: `power-app/src/routine/routine.controller.ts`

- [ ] **Step 1: Sumar el import del DTO**

```typescript
import { CreateCircuitDto } from '../dtos/circuit/create_circuit.dto';
```

- [ ] **Step 2: Agregar el endpoint en el bloque de circuitos, antes de `getAllCircuits`**

```typescript
    @Post('circuit/create')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 201, type: CircuitDetailResponseDto })
    async createCircuit(
        @Body() createCircuitDto: CreateCircuitDto,
        @Res() res: Response,
    ) {
        this.routineService.createCircuit(createCircuitDto, res);
    }
```

No hay conflicto de rutas con `@Get('circuit/:id')`: distinto verbo.

- [ ] **Step 3: Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

- [ ] **Step 4: Confirmar la ruta en el bundle**

Run: `grep -c "circuit/create" power-app/dist/src/routine/routine.controller.js`
Expected: 1 o más.

---

### Task 6: Actualizar `Status/`

**Files:**
- Modify: `Status/estado-implementacion-CU.md`
- Modify: `Status/dashboard-estado-CU.html`

- [ ] **Step 1: Fila de detalle de E-22**

En el informe:

```markdown
| CU-E-22 | Crear circuito | ✅ Implementado | `POST /routine/circuit/create` · circuito + ejercicios + series en una transacción |
```

En el dashboard, la fila equivalente: chip `missing` → `done` y la columna de endpoint con `<span class="verb">POST</span> /routine/circuit/create`.

- [ ] **Step 2: Conteos en los dos artefactos**

- Resumen: ✅ 49 → **50** (68% → **69%**), ⬜ 8 → **7** (11% → **10%**).
- Línea de totales: "50 de 72 (~69%)" → **"51 de 72 (~71%)"**, y "los otros 22" → **21**.
- Cobertura por rol, Entrenador: `| Entrenador | 29 | 12 | 0 | 12 | 5 | 41% |` → `| Entrenador | 29 | 13 | 0 | 12 | 4 | 45% |`.
- Título de la sección de detalle: `## Detalle — Rol Entrenador (29 CU · 41%)` → **45%**.
- Dashboard: tiles (49 → 50 con 69%, 8 → 7 con 10%), barra general (`s-done` 69.44%, `s-missing` 9.72%, aria-label), bar-cap (`51 de 72 ... (71%)` y `21 pendientes`), role-card de Entrenador (45%, 13 impl., 4 falta, mini-bar 44.83% / 41.38% / 13.79%) y el kicker `29 CU · 45% implementado`.

- [ ] **Step 3: Entrada en el changelog del informe**

Se suma a la sección `## Cambios recientes (2026-08-19 · circuitos)`:

```markdown
- **CU-E-22 (crear circuito)** ✅: `POST /routine/circuit/create` da de alta la cabecera, sus ejercicios y sus series en **una sola transacción** (`QueryRunner`) — se aparta a propósito del patrón sin transacción de `createExercise`, porque con E-23 pausado un circuito creado a medias no se podría reparar desde la app. `exercise_order` y `set_order` los deriva el server de la posición en el array, así que no hay forma de recibir órdenes duplicados ni salteados. Responde `201` con el mismo formato anidado que el detalle, para que el front no tenga que hacer una segunda llamada.
  - **Reglas de negocio validadas:** `exercise_id` único dentro del circuito (400) — si hace falta el mismo movimiento dos veces se usa una variación del catálogo, y a cambio `exercise_id` queda como clave natural para la reconciliación de E-23; `amrap_time` sólo con `amrap = true`; `rpe` y `rir` mutuamente excluyentes (misma escala invertida); `rm = true` exige `set_count = 1`. Rangos: `set_count` 1–20, `rep_count` 1–1000 (cubre aeróbicos), `weight` ≤1000, `rpe` 1–10, `rir` 0–10, `rm_perc` 1–125 (permite supramáximo).
  - **Refactor:** el armado de la respuesta anidada salió de `getCircuitById` a dos helpers privados (`findCircuitDetail` + `buildCircuitDetailResponse`) que comparten el alta y el detalle.
- **CU-E-23 (editar circuito)** queda como el **único pendiente del bloque**, pausado por decisión de diseño: la reconciliación define qué pasa con los `Exercise_Set` que los alumnos ya marcaron como hechos vía `Routine_Exercise_Set_Finished`, y eso merece su propio refinamiento.
```

- [ ] **Step 4: Hallazgo 3 (circuitos a mitad de camino)**

Actualizar en los dos artefactos: ahora sólo falta E-23, no E-22 y E-23.

---

### Task 7: Dejar todo stageado

- [ ] **Step 1: Stagear**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/dtos/circuit power-app/src/routine Status Doc/specs Doc/plans
```

- [ ] **Step 2: Revisar**

Run: `git status --short`
Expected: el DTO nuevo, controller y service modificados, los 2 de Status, spec y plan.

- [ ] **Step 3: Mensaje sugerido**

```
CU-E-22: creacion de circuitos con ejercicios y series en una transaccion
```

---

## Pruebas en runtime (para el usuario)

La base está al día, así que esta vez se puede probar de verdad. Con un token de coach (`charly.tauros@test.com` / `pass123`):

| Caso | Esperado |
|---|---|
| Alta con 2 ejercicios y varias series | `201` + el circuito anidado |
| `exercises: []` | `400` "El circuito debe tener al menos un ejercicio" |
| Un ejercicio con `sets: []` | `400` "Cada ejercicio debe tener al menos una serie" |
| Mismo `exercise_id` dos veces | `400` con el mensaje de la variación del catálogo |
| `exercise_id` inexistente | `404` |
| `amrap_time: 60` con `amrap: false` | `400` |
| `rpe: 7` y `rir: 2` juntos | `400` |
| `rm: true` con `set_count: 2` | `400` |
| Después del alta, `GET /routine/circuit/all` | La fila nueva con el `exercise_count` correcto |
