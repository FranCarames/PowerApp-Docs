# Asignar y quitar rutinas a planificaciones (CU-E-12 y sus anidados) — Plan

> Los pasos usan checkbox (`- [ ]`) para ir tildando.
> **Spec:** `Doc/specs/2026-09-04-asignar-rutinas-a-planificacion-design.md` — ante cualquier duda de criterio, manda la spec.

**Goal:** Que el entrenador pueda armar una planificación asignándole rutinas —de a una o en lote— y deshacerlo con baja lógica, cerrando CU-E-12, que pasa a ser un CU agrupador con cuatro operaciones anidadas (E-12a a E-12d).

**Arquitectura:** Cuatro endpoints en el módulo `planification`, sobre `Routine_Asignation`. Las dos altas devuelven el detalle del plan; los dos `set-active` devuelven la o las asignaciones. Las operaciones en lote son transaccionales.

**Cambios de modelo que van con esto:** rename de `Routine_Asignation.routine_plan_id` a `planification_id`, `order` pasa a nullable, y **se elimina `Routine.routine_plan_id`**, que nunca estuvo en el diagrama de `Doc/`.

**Verificación:** compilación + prueba manual. Es el **primer bloque que puede probar con datos** el `routines` y el `routine_count` que el ABM devuelve vacíos desde el 31/8.

## Alcance

**Incluye:** los tres cambios de modelo, los 4 endpoints con sus DTOs, el desempate por `created_at` en las tres lecturas del ABM, las specs de CU-E-12 y sus cuatro anidados, el índice de CU y los artefactos de Status.

**No incluye:** CU-E-13 y CU-E-14 (`User_Planification` / `User_Routine`), ni E-19/E-20 (post-MVP).

---

### Paso 1: Entidades

**Files:**
- Modify: `power-app/src/entities/routine_asignation.entity.ts`
- Modify: `power-app/src/entities/routine.entity.ts`
- Modify: `power-app/src/entities/planification.entity.ts`

- [ ] **1.1 — `routine_asignation.entity.ts`: el import de Swagger**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
```

- [ ] **1.2 — `routine_asignation.entity.ts`: rename de la FK**

```typescript
    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    planification_id!: string;
```

Y más abajo, en las relaciones:

```typescript
    @JoinColumn({ name: 'planification_id' })
```

- [ ] **1.3 — `routine_asignation.entity.ts`: `order` nullable**

Reemplazar:

```typescript
    @ApiProperty({ example: 1 })
    @Column({ type: 'integer', nullable: false })
    order!: number;
```

por:

```typescript
    // Nullable a proposito: la baja logica le borra la posicion (order = null) y NO se
    // renumera el resto, asi que la secuencia puede tener huecos. Y como el alta persiste
    // el order recibido tal cual, tambien puede tener duplicados: order es una etiqueta
    // de orden, no una secuencia canonica. El desempate lo pone la lectura, por created_at
    @ApiPropertyOptional({ example: 1 })
    @Column({ type: 'integer', nullable: true })
    order?: number | null;
```

- [ ] **1.4 — `routine.entity.ts`: eliminar `routine_plan_id`**

Borrar el campo:

```typescript
    @ApiPropertyOptional({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: true })
    routine_plan_id?: string;
```

Borrar la relación:

```typescript
    @ManyToOne(() => Planification, planification => planification.routines, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'routine_plan_id' })
    planification?: Planification;
```

Y limpiar los imports, que quedan sin uso — era el **único** `@ManyToOne` y el único `@JoinColumn` del archivo:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
```

Borrar también `import { Planification } from './planification.entity';`.

- [ ] **1.5 — `planification.entity.ts`: eliminar el otro extremo**

Borrar:

```typescript
    @OneToMany(() => Routine, routine => routine.planification)
    routines!: Routine[];
```

Y el `import { Routine } from './routine.entity';` de arriba, que queda sin uso.

- [ ] **1.6 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0. Si falla por `planification.routines`, es que algo del código usaba la relación eliminada — buscar con `grep -rn "\.routines" power-app/src`.

---

### Paso 2: DDL y regeneración

**Files:**
- Modify: `Db Creator/ddl.py`
- Regenerate: `Db Creator/01_estructura.sql`

- [ ] **2.1 — `Routine`: sacar la columna**

Reemplazar:

```sql
CREATE TABLE public."Routine" (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_plan_id UUID,
    name            VARCHAR(50) NOT NULL,
```

por:

```sql
CREATE TABLE public."Routine" (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,
```

- [ ] **2.2 — `Routine`: sacar la FK diferida**

Borrar el bloque entero, comentario incluido:

```sql
-- FK diferida en Routine (depende de Planification)
ALTER TABLE public."Routine"
    ADD CONSTRAINT fk_routine_planification
        FOREIGN KEY (routine_plan_id) REFERENCES public."Planification"(id) ON DELETE SET NULL;
```

Ya no hace falta: sin la columna, `Routine` no depende de `Planification`.

- [ ] **2.3 — `Routine_Asignation`: rename y `order` nullable**

Reemplazar:

```sql
    routine_plan_id UUID        NOT NULL,
    "order" 		INTEGER		NOT NULL,
```

por:

```sql
    planification_id UUID       NOT NULL,
    "order" 		INTEGER,
```

Y la constraint, más abajo en el mismo `CREATE TABLE`:

```sql
    CONSTRAINT fk_routine_asignation_planification
        FOREIGN KEY (planification_id) REFERENCES public."Planification"(id) ON DELETE CASCADE
```

- [ ] **2.4 — Regenerar**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && python build_sql.py
```

- [ ] **2.5 — Confirmar que sólo cambió `01`**

Run: `git status --short "Db Creator"`
Expected: `ddl.py` y `01_estructura.sql`. Ni `02` ni `03` insertan en estas tablas ni nombran esa columna.

---

### Paso 3: Base viva *(lo ejecuta el usuario)*

- [ ] **3.1 — Gate antes del DROP**

```sql
SELECT count(*) AS routines_con_plan FROM public."Routine" WHERE routine_plan_id IS NOT NULL;
SELECT count(*) AS asignaciones      FROM public."Routine_Asignation";
```

Esperado: las dos en `0`. **Si `routines_con_plan` no da 0, parar**: habría dato real en una columna que estamos por borrar.

- [ ] **3.2 — Migrar**

```sql
BEGIN;

ALTER TABLE public."Routine_Asignation" RENAME COLUMN routine_plan_id TO planification_id;
ALTER TABLE public."Routine_Asignation" ALTER COLUMN "order" DROP NOT NULL;
ALTER TABLE public."Routine"            DROP COLUMN routine_plan_id;

COMMIT;
```

El `DROP COLUMN` se lleva la constraint `fk_routine_planification` solo; no hay que borrarla aparte.

- [ ] **3.3 — Verificar**

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Routine_Asignation'
ORDER BY ordinal_position;
```

Esperado: `planification_id` presente y `order` con `is_nullable = YES`. Y que `routine_plan_id` **no** aparezca en `Routine`.

---

### Paso 4: DTOs

**Files:** crear los 4 en `power-app/src/dtos/planification/`.

- [ ] **4.1 — `assign_routine_to_planification.dto.ts`**

```typescript
import { IsNotEmpty, IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoutineToPlanificationDto {

    @ApiProperty({ example: 'uuid-1234' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de planificación debe ser un UUID válido' })
    planification_id!: string;

    @ApiProperty({ example: 'uuid-1234', description: 'La misma rutina puede asignarse más de una vez a la misma planificación' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de rutina debe ser un UUID válido' })
    routine_id!: string;

    @ApiPropertyOptional({ example: 1, minimum: 1, description: 'Posición dentro del plan. Si se omite, la asignación va al final. Si se manda una posición ya ocupada se persiste igual: no se desplaza el resto y el order puede quedar duplicado' })
    @IsOptional()
    @IsInt()
    @Min(1)
    order?: number;
}
```

- [ ] **4.2 — `assign_routines_to_planification.dto.ts`**

```typescript
import { IsNotEmpty, IsUUID, IsArray, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoutinesToPlanificationDto {

    @ApiProperty({ example: 'uuid-1234' })
    @IsNotEmpty()
    @IsUUID('all', { message: 'El ID de planificación debe ser un UUID válido' })
    planification_id!: string;

    @ApiProperty({ example: ['uuid-1234', 'uuid-5678'], description: 'Se asignan al final del plan, consecutivas y en el orden del array. Se permiten ids repetidos: crean una asignación cada uno' })
    @IsArray()
    @ArrayNotEmpty({ message: 'Hay que enviar al menos una rutina' })
    @ArrayMaxSize(50, { message: 'No se pueden asignar más de 50 rutinas por vez' })
    @IsUUID('all', { each: true, message: 'Cada ID de rutina debe ser un UUID válido' })
    routine_ids!: string[];
}
```

- [ ] **4.3 — `set_routine_asignation_active.dto.ts`**

```typescript
import { IsNotEmpty, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetRoutineAsignationActiveDto {

    @ApiProperty({ example: false, description: 'false da de baja la asignación y le borra el order; true la reactiva' })
    @IsNotEmpty()
    @IsBoolean()
    active!: boolean;

    @ApiPropertyOptional({ example: 2, minimum: 1, description: 'Sólo válido con active = true: la posición con la que vuelve. Si se omite, vuelve al final. Mandarlo con active = false es un 400' })
    @IsOptional()
    @IsInt()
    @Min(1)
    order?: number;
}
```

- [ ] **4.4 — `set_routine_asignations_active.dto.ts`**

```typescript
import { IsNotEmpty, IsBoolean, IsArray, ArrayNotEmpty, ArrayMaxSize, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRoutineAsignationsActiveDto {

    @ApiProperty({ example: ['uuid-1234', 'uuid-5678'], description: 'Los ids pueden pertenecer a planificaciones distintas. No se aceptan repetidos' })
    @IsArray()
    @ArrayNotEmpty({ message: 'Hay que enviar al menos una asignación' })
    @ArrayMaxSize(50, { message: 'No se pueden modificar más de 50 asignaciones por vez' })
    @IsUUID('all', { each: true, message: 'Cada ID de asignación debe ser un UUID válido' })
    routine_asignation_ids!: string[];

    @ApiProperty({ example: false, description: 'Al reactivar en lote, cada asignación vuelve al final de su planificación' })
    @IsNotEmpty()
    @IsBoolean()
    active!: boolean;
}
```

- [ ] **4.5 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Paso 5: Módulo y desempate

**Files:**
- Modify: `power-app/src/planification/planification.module.ts`
- Modify: `power-app/src/planification/planification.service.ts`

- [ ] **5.1 — Sumar `Routine` al `forFeature`**

En `planification.module.ts`, agregar el import y la entidad:

```typescript
import { Routine } from '../entities/routine.entity';
```

```typescript
  imports: [TypeOrmModule.forFeature([
    Planification,
    Routine,
    RoutineAsignation,
    UserPlanification,
    RoutineAsignationUser,
    UserRoutine,
  ]), AuthModule],
```

- [ ] **5.2 — Desempate en `/all-plus`**

Con `order` duplicado el orden deja de ser determinístico. En `getAllPlanificationsPlus`, después del `addOrderBy` del order:

```typescript
                .addOrderBy('routineAsignation.order', 'ASC')
                .addOrderBy('routineAsignation.created_at', 'ASC')
```

- [ ] **5.3 — Desempate en el detalle**

En `findPlanificationDetail`, el `order` de las find options:

```typescript
            order: {
                routineAsignations: {
                    order: 'ASC',
                    created_at: 'ASC',
                },
            },
```

> El conteo de `getAllPlanifications` no necesita desempate: cuenta, no ordena.

- [ ] **5.4 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Paso 6: Service — las 4 operaciones

**Files:** `power-app/src/planification/planification.service.ts`

- [ ] **6.1 — Imports y constructor**

```typescript
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In, SelectQueryBuilder } from 'typeorm';
import { Routine } from '../entities/routine.entity';
import { RoutineAsignation } from '../entities/routine_asignation.entity';
import { AssignRoutineToPlanificationDto } from '../dtos/planification/assign_routine_to_planification.dto';
import { AssignRoutinesToPlanificationDto } from '../dtos/planification/assign_routines_to_planification.dto';
import { SetRoutineAsignationActiveDto } from '../dtos/planification/set_routine_asignation_active.dto';
import { SetRoutineAsignationsActiveDto } from '../dtos/planification/set_routine_asignations_active.dto';
```

```typescript
    constructor(
        @InjectRepository(Planification)
        private planificationRepository: Repository<Planification>,
        @InjectRepository(Routine)
        private routineRepository: Repository<Routine>,
        @InjectRepository(RoutineAsignation)
        private routineAsignationRepository: Repository<RoutineAsignation>,
        @InjectDataSource()
        private dataSource: DataSource,
    ) {
    }
```

- [ ] **6.2 — Alta individual**

Agregar después de `setPlanificationActive`, bajo una sección nueva:

```typescript
    // ===================== ASIGNACION DE RUTINAS (CU-E-12) =====================

    async assignRoutineToPlanification(
        assignRoutineDto: AssignRoutineToPlanificationDto,
        res: Response
    ) {
        try {
            const planification = await this.planificationRepository.findOne({
                where: { id: assignRoutineDto.planification_id },
            });

            if (!planification) {
                return res.status(404).send({ error: 'Planificación no encontrada' });
            }

            if (!planification.active) {
                return res.status(400).send({
                    error: 'La planificación está dada de baja. Reactivala antes de asignarle rutinas.'
                });
            }

            const routine = await this.routineRepository.findOne({
                where: { id: assignRoutineDto.routine_id },
            });

            if (!routine) {
                return res.status(404).send({ error: 'Rutina no encontrada' });
            }

            // Con el nombre en el mensaje: un 404 seria mentira y mandaria al front a
            // buscar un bug de ids inexistente. Mismo criterio que E-16 con los circuitos
            if (!routine.active) {
                return res.status(400).send({
                    error: `La rutina '${routine.name}' está dada de baja y no puede asignarse.`
                });
            }

            // Sin order explicito va al final. Con order se persiste TAL CUAL, aunque la
            // posicion ya este ocupada: no se desplaza ni se renumera nada, y el order
            // puede quedar duplicado. Es la decision del 4/9
            const order = assignRoutineDto.order
                ?? await this.nextOrder(assignRoutineDto.planification_id);

            await this.routineAsignationRepository.save(
                this.routineAsignationRepository.create({
                    routine_id: assignRoutineDto.routine_id,
                    planification_id: assignRoutineDto.planification_id,
                    order,
                })
            );

            const actualizada = await this.findPlanificationDetail(assignRoutineDto.planification_id);
            return res.status(201).send(this.buildPlanificationDetailResponse(actualizada!));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al asignar la rutina a la planificación.' });
        }
    }
```

- [ ] **6.3 — Alta en lote**

```typescript
    async assignRoutinesToPlanification(
        assignRoutinesDto: AssignRoutinesToPlanificationDto,
        res: Response
    ) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const planification = await queryRunner.manager.findOne(Planification, {
                where: { id: assignRoutinesDto.planification_id },
            });

            if (!planification) {
                await queryRunner.rollbackTransaction();
                return res.status(404).send({ error: 'Planificación no encontrada' });
            }

            if (!planification.active) {
                await queryRunner.rollbackTransaction();
                return res.status(400).send({
                    error: 'La planificación está dada de baja. Reactivala antes de asignarle rutinas.'
                });
            }

            // Se validan los ids UNICOS: el array puede traer repetidos a proposito,
            // y cada repeticion crea su propia asignacion
            const idsUnicos = [...new Set(assignRoutinesDto.routine_ids)];
            const routines = await queryRunner.manager.find(Routine, {
                where: { id: In(idsUnicos) },
            });

            if (routines.length !== idsUnicos.length) {
                await queryRunner.rollbackTransaction();
                return res.status(404).send({ error: 'Algunas rutinas no fueron encontradas' });
            }

            const inactivas = routines.filter(routine => !routine.active);
            if (inactivas.length > 0) {
                await queryRunner.rollbackTransaction();
                const nombres = inactivas.map(routine => `'${routine.name}'`).join(', ');
                return res.status(400).send({
                    error: `Estas rutinas están dadas de baja y no pueden asignarse: ${nombres}.`
                });
            }

            // Consecutivas desde el final, en el orden del array
            let order = await this.nextOrder(assignRoutinesDto.planification_id, queryRunner.manager);

            for (const routineId of assignRoutinesDto.routine_ids) {
                await queryRunner.manager.save(
                    queryRunner.manager.create(RoutineAsignation, {
                        routine_id: routineId,
                        planification_id: assignRoutinesDto.planification_id,
                        order: order++,
                    })
                );
            }

            await queryRunner.commitTransaction();

            const actualizada = await this.findPlanificationDetail(assignRoutinesDto.planification_id);
            return res.status(201).send(this.buildPlanificationDetailResponse(actualizada!));
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            console.error(error);
            res.status(500).send({ error: 'Error al asignar las rutinas a la planificación.' });
        } finally {
            await queryRunner.release();
        }
    }
```

- [ ] **6.4 — Baja y reactivación individual**

```typescript
    async setRoutineAsignationActive(
        idRoutineAsignation: string,
        setActiveDto: SetRoutineAsignationActiveDto,
        res: Response
    ) {
        // El order solo tiene sentido al reactivar. Aceptarlo en silencio con
        // active = false esconderia un bug del cliente
        if (!setActiveDto.active && setActiveDto.order !== undefined) {
            return res.status(400).send({
                error: 'El campo order sólo aplica al reactivar una asignación.'
            });
        }

        try {
            const asignacion = await this.routineAsignationRepository.findOne({
                where: { id: idRoutineAsignation },
            });

            if (!asignacion) {
                return res.status(404).send({ error: 'Asignación no encontrada' });
            }

            if (setActiveDto.active) {
                // La baja le borro la posicion, asi que reactivar tiene que darle una:
                // la del body si vino, y si no al final
                asignacion.order = setActiveDto.order
                    ?? await this.nextOrder(asignacion.planification_id);
            } else {
                // Pierde la posicion y el resto NO se renumera: la secuencia queda con
                // un hueco, a proposito. Es la decision del 4/9
                asignacion.order = null;
            }

            asignacion.active = setActiveDto.active;
            await this.routineAsignationRepository.save(asignacion);

            res.status(200).send(asignacion);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al actualizar el estado de la asignación.' });
        }
    }
```

- [ ] **6.5 — Baja y reactivación en lote**

```typescript
    async setRoutineAsignationsActive(
        setActiveDto: SetRoutineAsignationsActiveDto,
        res: Response
    ) {
        const ids = setActiveDto.routine_asignation_ids;

        if (new Set(ids).size !== ids.length) {
            return res.status(400).send({
                error: 'La lista de asignaciones tiene ids repetidos.'
            });
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const asignaciones = await queryRunner.manager.find(RoutineAsignation, {
                where: { id: In(ids) },
            });

            if (asignaciones.length !== ids.length) {
                await queryRunner.rollbackTransaction();
                return res.status(404).send({ error: 'Algunas asignaciones no fueron encontradas' });
            }

            // Los ids pueden ser de planificaciones distintas, asi que el order de la
            // reactivacion se calcula por plan, dentro del loop
            for (const asignacion of asignaciones) {
                if (setActiveDto.active) {
                    asignacion.order = await this.nextOrder(asignacion.planification_id, queryRunner.manager);
                } else {
                    asignacion.order = null;
                }

                asignacion.active = setActiveDto.active;
                await queryRunner.manager.save(asignacion);
            }

            await queryRunner.commitTransaction();

            res.status(200).send(asignaciones);
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            console.error(error);
            res.status(500).send({ error: 'Error al actualizar el estado de las asignaciones.' });
        } finally {
            await queryRunner.release();
        }
    }
```

- [ ] **6.6 — El helper**

Agregar en la sección de helpers, junto a `buildPlanificationsQuery`:

```typescript
    // max(order) + 1 sobre las asignaciones ACTIVAS del plan, o 1 si no hay ninguna.
    // Las inactivas tienen order null, asi que no participan del maximo.
    // Recibe el manager para poder correr dentro de la transaccion de los lotes
    private async nextOrder(
        idPlanification: string,
        manager?: EntityManager
    ): Promise<number> {
        const repository = manager
            ? manager.getRepository(RoutineAsignation)
            : this.routineAsignationRepository;

        const resultado = await repository
            .createQueryBuilder('routineAsignation')
            .select('MAX(routineAsignation.order)', 'max')
            .where('routineAsignation.planification_id = :idPlanification', { idPlanification })
            .andWhere('routineAsignation.active = true')
            .getRawOne<{ max: number | null }>();

        return (resultado?.max ?? 0) + 1;
    }
```

- [ ] **6.7 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Paso 7: Controller

**Files:** `power-app/src/planification/planification.controller.ts`

- [ ] **7.1 — Imports**

Sumar los 4 DTOs y `RoutineAsignation` ya está importado. Sacar de la lista de TODO comentados los que ahora existen (`AssignRoutineToPlanificationDto`).

```typescript
import { AssignRoutineToPlanificationDto } from '../dtos/planification/assign_routine_to_planification.dto';
import { AssignRoutinesToPlanificationDto } from '../dtos/planification/assign_routines_to_planification.dto';
import { SetRoutineAsignationActiveDto } from '../dtos/planification/set_routine_asignation_active.dto';
import { SetRoutineAsignationsActiveDto } from '../dtos/planification/set_routine_asignations_active.dto';
```

- [ ] **7.2 — Reemplazar el andamiaje de asignación de rutinas**

Buscar el bloque que va desde `@Post('/routine/assign')` hasta el cierre de `removeRoutineFromPlanification` (el `DELETE /routine/:id`) y reemplazarlo por:

```typescript
    @Post('/routine/assign')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 201, type: PlanificationDetailResponseDto })
    async assignRoutineToPlanification(
        @Body() assignRoutineDto: AssignRoutineToPlanificationDto,
        @Res() res: Response,
    ) {
        this.planificationService.assignRoutineToPlanification(assignRoutineDto, res);
    }

    @Post('/routine/assign-bulk')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 201, type: PlanificationDetailResponseDto })
    async assignRoutinesToPlanification(
        @Body() assignRoutinesDto: AssignRoutinesToPlanificationDto,
        @Res() res: Response,
    ) {
        this.planificationService.assignRoutinesToPlanification(assignRoutinesDto, res);
    }

    // Reemplaza al DELETE /planification/routine/:id del andamiaje: la baja es logica
    // desde el 31/8, y el mismo endpoint reactiva
    @Post('/routine/set-active/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: RoutineAsignation })
    async setRoutineAsignationActive(
        @Param() idRoutineAsignation: ParameterIdDto,
        @Body() setActiveDto: SetRoutineAsignationActiveDto,
        @Res() res: Response,
    ) {
        this.planificationService.setRoutineAsignationActive(idRoutineAsignation.id, setActiveDto, res);
    }

    @Post('/routine/set-active-bulk')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: [RoutineAsignation] })
    async setRoutineAsignationsActive(
        @Body() setActiveDto: SetRoutineAsignationsActiveDto,
        @Res() res: Response,
    ) {
        this.planificationService.setRoutineAsignationsActive(setActiveDto, res);
    }
```

- [ ] **7.3 — Verificar que el andamiaje de E-13/E-14 quedó intacto**

Los 5 métodos de `assignPlanificationToUser` en adelante siguen con su llamada comentada.

- [ ] **7.4 — Compilar y revisar rutas**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

Confirmar el orden de declaración: `/routine/assign`, `/routine/assign-bulk`, `/routine/set-active/:id`, `/routine/set-active-bulk`. Ninguna es de un solo segmento, así que no compiten con `/planification/:id`.

---

### Paso 8: Specs de CU — CU-E-12 pasa a agrupador

**Files (fuera del repo):** `D:\Power App\Documentation\Especificaciones de CU\especificaciones\entrenador\`

> **Cambio de alcance decidido con el usuario el 4/9, durante la ejecución.** El plan original reescribía CU-E-12 como un único CU con las cuatro operaciones. Se reemplazó por un **CU agrupador con cuatro anidados**, uno por operación: es más fiel a que son cuatro cosas distintas, con distinto disparador y distinta postcondición. **El agrupador no se cuenta a sí mismo**, así que el total del proyecto pasa de 72 a **75 CU**.

- [x] **8.1 — Renombrar y reescribir el CU padre**

Se borra `CU-E-12-asignar-rutina-a-planificacion-sistemica.md` y se crea `CU-E-12-gestionar-rutinas-de-planificacion-sistemica.md` — **Gestionar Rutinas de una Planificación Sistémica**. Lleva los «include» a los cuatro hijos y **concentra las reglas comunes** para no repetirlas cinco veces: el `order` como etiqueta (huecos y duplicados), la repetición de rutinas permitida, la baja siempre lógica, la planificación tiene que estar activa, y los lotes son todo o nada.

- [x] **8.2 — Los cuatro CU anidados**

Cada uno con su encabezado `Incluido por:` apuntando al padre, y sólo sus propios caminos alternativos:

| Archivo | CU | Endpoint |
|---|---|---|
| `CU-E-12a-asignar-rutina-a-planificacion.md` | Asignar una Rutina | `POST /planification/routine/assign` |
| `CU-E-12b-asignar-rutinas-en-lote-a-planificacion.md` | Asignar Rutinas en Lote | `POST /planification/routine/assign-bulk` |
| `CU-E-12c-quitar-rutina-de-planificacion.md` | Quitar o Reincorporar una Rutina (Lógico) | `POST /planification/routine/set-active/:id` |
| `CU-E-12d-quitar-rutinas-en-lote-de-planificacion.md` | Quitar o Reincorporar en Lote (Lógico) | `POST /planification/routine/set-active-bulk` |

- [x] **8.3 — Índice de CU**

En `README.md`: el total pasa a **75**, se agrega la nota que explica que el agrupador no se cuenta, y el bloque de E-12 queda con el padre marcado como *agrupador* y los cuatro hijos indentados debajo.
### Paso 9: Status

**Files:** `Status/estado-implementacion-CU.md`, `Status/dashboard-estado-CU.html`

- [x] **9.1** — Entrada nueva en cambios recientes: los 4 endpoints, el rename, el `order` nullable con su semántica de etiqueta (huecos + duplicados + desempate), **la eliminación de `Routine.routine_plan_id`** cerrando la deuda del 29/8, y la reestructuración de CU-E-12 en agrupador + cuatro anidados.

- [x] **9.2** — **CU-E-12** deja de contarse y pasa a fila de *agrupador*; se agregan las cuatro filas de **E-12a a E-12d**, las cuatro ✅, cada una con su endpoint.

- [x] **9.3 — Conteos** *(el total cambia porque el agrupador no se cuenta y sus 4 hijos sí)*

| | Antes | Después |
|---|---:|---:|
| **Total de CU** | 72 | **75** |
| ✅ Implementado | 59 (82%) | **63 (84%)** |
| 🟡 Parcial | 1 (1%) | 1 (1%) |
| 🔵 Andamiaje | 5 (7%) | **4 (5%)** |
| ⬜ No implementado | 7 (10%) | 7 (**9%**) |
| Con código o parcial | 60 de 72 (~83%) | **64 de 75 (~85%)** |
| Entrenador | 22 ✅ · 3 🔵 de 29 (76%) | **26 ✅ · 2 🔵 de 32 (81%)** |

Suma de control: 63 + 1 + 4 + 7 = 75, y por rol 20 + 32 + 23 = 75.

- [x] **9.4 — Dashboard**

Los mismos valores, más lo que sólo vive en el HTML: `kicker` a `75 CU clasificados`, el badge `<b>75</b> casos de uso`, el lede, el `aria-label`, las cuatro barras a `84.00% / 1.33% / 5.33% / 9.33%`, la mini-barra del Entrenador a `81.25% / 6.25% / 12.50%`, el `<h3>Entrenador <em>32 CU</em></h3>`, el `sec-head` a `32 CU · 81% implementado`, y el footer a `63 impl · 1 parc · 4 andam · 7 falta — de 75`.

- [x] **9.5 — El hito del cronograma**

Los dos artefactos estaban desalineados de antes: el informe decía "los 72 CU cubiertos" y el dashboard "70 de los 72". Se unificaron en **"73 de los 75 CU"**, que es lo correcto desde que E-19 y E-20 salieron del MVP el 27/8.
### Paso 10: Stage

- [ ] **10.1**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src "Db Creator/ddl.py" "Db Creator/01_estructura.sql" Doc Status
```

- [ ] **10.2 — Mensaje sugerido**

```
CU-E-12: asignar y quitar rutinas a planificaciones, y baja de Routine.routine_plan_id
```

---

## Después de esto

Queda **CU-E-13** (asignar planificación a un alumno), que es la pieza cara del bloque: crea la `User_Planification` y **deriva** las `User_Routine` desde las `Routine_Asignation` que este bloque acaba de hacer creables. Es la que destraba U-08, U-09, U-12, U-13, E-06 y E-07 — seis CU de un saque.
