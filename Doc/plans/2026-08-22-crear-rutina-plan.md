# Crear rutina sistémica (CU-E-16) — Plan de implementación

> **Spec:** `Doc/specs/2026-08-22-crear-rutina-design.md`
> Los pasos usan checkbox (`- [ ]`) para ir tildando.

**Goal:** `POST /routine/create` que da de alta una rutina completa —cabecera + circuitos ordenados— en una sola llamada y una sola transacción.

**Architecture:** Un DTO con dos clases anidadas validadas en cascada, un método nuevo en `RoutineService` que valida, ordena, abre transacción con `QueryRunner` y persiste los dos niveles, y la extracción del armado del detalle de rutina a dos helpers privados que comparte con `getRoutineById`. Más un cambio de modelo puntual: `Routine.name` de `varchar(20)` a `varchar(50)`.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL. Validación con `class-validator` / `class-transformer` vía el pipe global (`whitelist` + `forbidNonWhitelisted`).

**Convenciones:** no se commitea (queda stageado + mensaje sugerido); no se levanta el server; la verificación del agente es `npm --prefix power-app run build`. La base está al día y con dos circuitos cargados, así que el usuario puede probar en runtime.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `power-app/src/dtos/routine/create_routine.dto.ts` | Crear | Body del alta, con sus dos clases anidadas |
| `power-app/src/entities/routine.entity.ts` | Modificar | `name` a `varchar(50)` |
| `power-app/src/routine/routine.service.ts` | Modificar | `createRoutine` + 2 helpers privados + refactor de `getRoutineById` |
| `power-app/src/routine/routine.controller.ts` | Modificar | El endpoint de andamiaje pasa a real |
| `Db Creator/ddl.py` | Modificar | `name VARCHAR(50)` en `CREATE TABLE public."Routine"` |
| `Db Creator/01_estructura.sql` | Regenerar | Salida de `build_sql.py` |

`RoutineModule` **no cambia**.

---

### Task 1: Cambio de modelo — `Routine.name` a `varchar(50)`

Va primero porque el DTO valida contra el largo nuevo.

**Files:**
- Modify: `power-app/src/entities/routine.entity.ts`
- Modify: `Db Creator/ddl.py`
- Regenerate: `Db Creator/01_estructura.sql`

- [ ] **Step 1: Entidad**

```typescript
    @ApiProperty({ example: 'Día A - Pecho y tríceps', maxLength: 50 })
    @Column({ length: 50, nullable: false })
    name!: string;
```

- [ ] **Step 2: `ddl.py`**

En `CREATE TABLE public."Routine"`, la línea de `name`:

```
    name            VARCHAR(50) NOT NULL,
```

- [ ] **Step 3: Regenerar los `.sql`**

Run: `cd "Db Creator" && python build_sql.py`
Expected: exit 0. `02_datos_estaticos.sql` y `03_datos_dinamicos.sql` deben quedar **sin cambios** (no hay INSERTs a `Routine`); sólo cambia `01_estructura.sql`.

- [ ] **Step 4: Confirmar el diff**

Run: `git diff --stat "Db Creator"`
Expected: sólo `ddl.py` y `01_estructura.sql`.

---

### Task 2: DTO del alta

**Files:**
- Create: `power-app/src/dtos/routine/create_routine.dto.ts`

- [ ] **Step 1: Crear el archivo con las dos clases**

El orden importa: `CreateRoutineCircuitDto` tiene que estar declarado antes de que lo referencie `CreateRoutineDto`.

```typescript
import {
  IsNotEmpty, IsUUID, IsArray, ArrayNotEmpty, ArrayMaxSize,
  ValidateNested, IsString, IsOptional, MaxLength, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoutineCircuitDto {

    @ApiProperty({ example: 'uuid-1234', description: 'ID del circuito a ensamblar. Puede repetirse dentro de la rutina: el order distingue las apariciones' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de circuito debe ser un UUID válido' })
    circuit_id!: string;

    @ApiProperty({ example: 1, minimum: 1, description: 'Posición del circuito. El server ordena por este campo y persiste 1..N; se aceptan valores espaciados (10, 20, 30) pero no duplicados' })
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    order!: number;
}

export class CreateRoutineDto {

    @ApiProperty({ example: 'Día A - Pecho y tríceps', maxLength: 50 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name!: string;

    @ApiPropertyOptional({ example: 'Cuidar el ritmo en las primeras series', maxLength: 100 })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    coach_note?: string;

    @ApiProperty({ type: [CreateRoutineCircuitDto], description: 'Circuitos de la rutina. Al menos uno, máximo 50. Todos tienen que estar activos' })
    @IsArray()
    @ArrayNotEmpty({ message: 'La rutina debe tener al menos un circuito' })
    @ArrayMaxSize(50, { message: 'Una rutina no puede tener más de 50 circuitos' })
    @ValidateNested({ each: true })
    @Type(() => CreateRoutineCircuitDto)
    circuits!: CreateRoutineCircuitDto[];
}
```

`@IsUUID('all')` y no `'4'`: el seed genera ids deterministas v5 y los circuitos cargados pueden serlo. Es el bugfix transversal del 19/8.

---

### Task 3: Refactor de `getRoutineById` en dos helpers

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

Espejo exacto de lo que E-22 hizo con `getCircuitById`. Va antes del alta para que `createRoutine` reutilice el formato en vez de duplicarlo.

- [ ] **Step 1: Agregar los dos helpers al bloque `HELPERS DE RUTINA`**, debajo de `buildRoutinesQuery`

```typescript
    private async findRoutineDetail(idRoutine: string): Promise<Routine | null> {
        return this.routineRepository.findOne({
            where: { id: idRoutine },
            relations: [
                'routineCircuits',
                'routineCircuits.circuit',
                'routineCircuits.circuit.routineExercises',
                'routineCircuits.circuit.routineExercises.exercise',
                'routineCircuits.circuit.routineExercises.exerciseSets',
            ],
            order: {
                routineCircuits: {
                    order: 'ASC',
                    circuit: {
                        routineExercises: {
                            exercise_order: 'ASC',
                            exerciseSets: {
                                set_order: 'ASC',
                            },
                        },
                    },
                },
            },
        });
    }

    private buildRoutineDetailResponse(routine: Routine) {
        return {
            id: routine.id,
            name: routine.name,
            coach_note: routine.coach_note,
            active: routine.active,
            created_at: routine.created_at,
            updated_at: routine.updated_at,
            circuits: routine.routineCircuits.map(routineCircuit => ({
                id: routineCircuit.id,
                order: routineCircuit.order,
                // Mismo formato que GET /routine/circuit/:id
                circuit: this.buildCircuitDetailResponse(routineCircuit.circuit),
            })),
        };
    }
```

- [ ] **Step 2: Reemplazar el cuerpo de `getRoutineById` para que los use**

```typescript
    async getRoutineById(
        idRoutine: string,
        res: Response
    ) {
        try {
            const routine = await this.findRoutineDetail(idRoutine);

            if (!routine) {
                return res.status(404).send({ error: 'Rutina no encontrada' });
            }

            res.status(200).send(this.buildRoutineDetailResponse(routine));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener la rutina.' });
        }
    }
```

- [ ] **Step 3: Compilar para confirmar que el refactor no rompió nada**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Task 4: `createRoutine`

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 1: Sumar los imports que faltan**

```typescript
import { RoutineCircuit } from '../entities/routine_circuit.entity';
import { CreateRoutineDto } from '../dtos/routine/create_routine.dto';
```

`In`, `DataSource` y `Repository` ya están importados; `Circuit` y `Routine` también.

- [ ] **Step 2: Agregar el método al principio del bloque `RUTINAS`**, arriba de `getAllRoutines`

```typescript
    async createRoutine(
        createRoutineDto: CreateRoutineDto,
        res: Response
    ) {
        // Validaciones que no dependen de la base, antes de abrir la transacción.
        // A diferencia de los circuitos, el mismo circuit_id PUEDE repetirse en una rutina
        // (Routine_Circuit no tiene unique sobre el par); lo que no puede repetirse es el order
        const orders = createRoutineDto.circuits.map(circuit => circuit.order);

        if (new Set(orders).size !== orders.length) {
            return res.status(400).send({
                error: 'Dos circuitos no pueden ocupar la misma posición: el campo order tiene valores repetidos.'
            });
        }

        // El order es una instrucción de ordenamiento, no el valor que se guarda:
        // se ordena por él y se persiste la posición resultante, así la base queda siempre 1..N
        const circuitsInOrder = [...createRoutineDto.circuits].sort((a, b) => a.order - b.order);
        const circuitIds = circuitsInOrder.map(circuit => circuit.circuit_id);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Se buscan por el set de ids únicos: un circuito repetido es una sola fila de Circuit
            const uniqueCircuitIds = [...new Set(circuitIds)];

            const circuits = await queryRunner.manager.find(Circuit, {
                where: { id: In(uniqueCircuitIds) },
                select: { id: true, name: true, active: true },
            });

            if (circuits.length !== uniqueCircuitIds.length) {
                await queryRunner.rollbackTransaction();
                return res.status(404).send({ error: 'Algunos circuitos no fueron encontrados' });
            }

            // Un circuito dado de baja no puede ensamblarse en una rutina nueva (precondición de
            // CU-E-16 y postcondición de CU-E-24). Va el nombre en el mensaje: el id existe, así
            // que un 404 mandaría al front a buscar un bug de ids que no está
            const inactiveCircuit = circuits.find(circuit => !circuit.active);

            if (inactiveCircuit) {
                await queryRunner.rollbackTransaction();
                return res.status(400).send({
                    error: `El circuito '${inactiveCircuit.name}' está dado de baja y no puede usarse en una rutina nueva.`
                });
            }

            const routine = await queryRunner.manager.save(
                queryRunner.manager.create(Routine, {
                    name: createRoutineDto.name,
                    coach_note: createRoutineDto.coach_note,
                    active: true,
                })
            );

            // El order persistido sale de la posición tras ordenar, no del valor recibido
            for (const [index, circuit] of circuitsInOrder.entries()) {
                await queryRunner.manager.save(
                    queryRunner.manager.create(RoutineCircuit, {
                        routine_id: routine.id,
                        circuit_id: circuit.circuit_id,
                        order: index + 1,
                    })
                );
            }

            await queryRunner.commitTransaction();

            // Se recarga con las relaciones para devolver el mismo formato que el detalle
            const created = await this.findRoutineDetail(routine.id);
            return res.status(201).send(this.buildRoutineDetailResponse(created!));
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(error);
            res.status(500).send({ error: 'Error al crear la rutina.' });
        } finally {
            await queryRunner.release();
        }
    }
```

Notas sobre el cuerpo:

- **`uniqueCircuitIds`** es necesario justamente porque la repetición está permitida: sin deduplicar, `[c1, c2, c1]` daría `circuits.length === 2 !== 3` y devolvería un `404` falso.
- El `finally` corre también cuando se sale por `return`, así que la conexión siempre se libera.
- `routine_plan_id` no se setea: la rutina nace suelta y vincularla es CU-E-12.

---

### Task 5: Endpoint en el controller

**Files:**
- Modify: `power-app/src/routine/routine.controller.ts`

- [ ] **Step 1: Sumar el import del DTO y sacar el TODO**

```typescript
import { CreateRoutineDto } from '../dtos/routine/create_routine.dto';
```

En el bloque de TODOs de arriba, borrar la línea comentada de `CreateRoutineDto` y dejar sólo la de `EditRoutineDto`:

```typescript
// TODO: crear los siguientes DTOs en src/dtos/routine/
// import { EditRoutineDto } from '../dtos/routine/edit_routine.dto';
```

- [ ] **Step 2: Reemplazar el andamiaje de `createRoutine`**

```typescript
    @Post('/create')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 201, type: RoutineDetailResponseDto })
    async createRoutine(
        @Body() createRoutineDto: CreateRoutineDto,
        @Res() res: Response,
    ) {
        this.routineService.createRoutine(createRoutineDto, res);
    }
```

Cambia el `type` del `@ApiResponse` de `Routine` (la entidad) a `RoutineDetailResponseDto`, que ya está importado y es lo que realmente devuelve.

- [ ] **Step 3: Verificar si `Routine` quedó sin uso en el controller**

Run: `grep -n "Routine\b" power-app/src/routine/routine.controller.ts`
Si el import de la entidad `Routine` ya no lo usa nadie (los otros dos andamiajes, `editRoutine` y `deleteRoutine`, todavía lo referencian en sus `@ApiResponse`), **dejarlo**. No sacarlo por las dudas: lo va a necesitar E-17.

- [ ] **Step 4: Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

- [ ] **Step 5: Confirmar la ruta en el bundle**

Run: `grep -c "createRoutine" power-app/dist/src/routine/routine.controller.js`
Expected: 1 o más.

---

### Task 6: Actualizar `Status/`

**Files:**
- Modify: `Status/estado-implementacion-CU.md`
- Modify: `Status/dashboard-estado-CU.html`

- [ ] **Step 1: Fila de detalle de E-16**

En el informe:

```markdown
| CU-E-16 | Crear rutina sistémica | ✅ Implementado | `POST /routine/create` · rutina + Routine_Circuit ordenados, en una transacción |
```

En el dashboard, la fila equivalente: chip de andamiaje → `done` y la columna de endpoint con `<span class="verb">POST</span> /routine/create`.

- [ ] **Step 2: Conteos en los dos artefactos**

- Resumen: ✅ 51 → **52** (71% → **72%**), 🔵 13 → **12** (18% → **17%**).
- Línea de totales: "52 de 72 ... (~72%)" → **"53 de 72 (~74%)"**, y "los otros 20" → **19**.
- Cobertura por rol, Entrenador: `| Entrenador | 29 | 14 | 0 | 11 | 4 | 48% |` → `| Entrenador | 29 | 15 | 0 | 10 | 4 | 52% |`.
- Título de la sección de detalle del rol Entrenador: 48% → **52%**.
- Dashboard: tiles, barra general, bar-cap, role-card de Entrenador y su kicker, con los mismos números.

- [ ] **Step 3: Entrada nueva en el changelog del informe**

Sección `## Cambios recientes (2026-08-22 · crear rutina)`, arriba de la de lectura de rutinas. Cubre: el endpoint, el `order` explícito y su normalización, la repetición permitida y qué implica para E-17, el circuito inactivo, `routine_plan_id` obsoleto, el cambio de `name` a `varchar(50)` y el refactor en dos helpers.

- [ ] **Step 4: Hallazgo nuevo**

Registrar en los dos artefactos que `Routine.routine_plan_id` es una columna obsoleta superada por `Routine_Asignation`, que ningún CU la usa, y que sacarla conviene hacerlo con el bloque de planificaciones.

- [ ] **Step 5: Bajar la nota "pendiente de verificar en runtime" de la lectura**

La sección del 22/8 dice que los listados devuelven `[]` porque no hay rutinas cargadas y que el orden anidado de tres niveles quedó sin validar. Con E-16 eso se destraba: actualizar la nota para que apunte a que ahora se prueba creando una rutina.

---

### Task 7: Dejar todo stageado

- [ ] **Step 1: Stagear**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src Status Doc/specs Doc/plans "Db Creator"
```

- [ ] **Step 2: Revisar**

Run: `git status --short`
Expected: el DTO nuevo, entity/controller/service modificados, `ddl.py` + `01_estructura.sql`, los 2 de Status, spec y plan.

- [ ] **Step 3: Mensaje sugerido**

```
CU-E-16: alta de rutinas ensamblando circuitos en una transaccion
```

---

## Pendientes para el usuario

- [ ] **`ALTER` sobre la base viva** (el agente no toca la base):

```sql
ALTER TABLE public."Routine" ALTER COLUMN name TYPE VARCHAR(50);
```

- [ ] **Diagrama de `Doc/`**: actualizar `Routine.name` a `varchar(50)` en Miro y reexportar SVG/PDF.

## Pruebas en runtime (para el usuario)

Con un token de coach (`charly.tauros@test.com` / `pass123`) y los dos circuitos ya cargados:

| Caso | Esperado |
|---|---|
| Alta con los 2 circuitos, `order` 1 y 2 | `201` + el árbol completo |
| Alta con `order` `10` y `20` | `201`, persistido como `1` y `2` |
| Alta con el mismo circuito dos veces | `201` — la repetición está permitida |
| `circuits: []` | `400` "al menos un circuito" |
| Dos ítems con el mismo `order` | `400` |
| `circuit_id` inexistente | `404` |
| `circuit_id` de un circuito dado de baja (`set-active` primero) | `400` con el nombre del circuito |
| `name` de 51 caracteres | `400` |
| `name` de 23 caracteres ("Día A - Pecho y tríceps") | `201` — antes no entraba |
| Después del alta, `GET /routine/all` | La rutina con `circuit_count` correcto |
| Después del alta, `GET /routine/:id` | El árbol de tres niveles, **valida el orden anidado** que quedó sin probar |
