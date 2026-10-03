# Planificaciones sistémicas: ABM y lecturas (CU-E-08 → CU-E-11) — Plan

> Los pasos usan checkbox (`- [ ]`) para ir tildando.
> **Spec:** `Doc/specs/2026-08-29-planificaciones-abm-design.md` — ante cualquier duda de criterio, manda la spec.

**Goal:** Que las planificaciones sistémicas tengan ABM completo — listar, ver, crear, editar y dar de baja lógicamente — reemplazando el andamiaje vacío de `planification.controller.ts`.

**Arquitectura:** Espejo del bloque de rutinas un nivel más arriba del árbol. Seis endpoints en el módulo `planification`, un service que hoy tiene 4 líneas vacías, y tres helpers (`buildPlanificationsQuery`, `findPlanificationDetail`, `buildPlanificationDetailResponse`) que comparten los seis. Sin transacciones: el alta y la edición tocan **una sola fila**, porque enganchar rutinas al plan es CU-E-12.

**Stack:** NestJS 11 + TypeORM + PostgreSQL. Validación con `class-validator`, documentación con `@nestjs/swagger`.

**Verificación:** por **compilación** (`npm --prefix power-app run build`) y prueba manual en Swagger. El proyecto no tiene tests unitarios y este bloque no los introduce — misma convención que los 7 planes anteriores.

## Alcance

**Incluye:** los 6 endpoints de §3 de la spec, sus 6 DTOs, los 3 helpers, el cambio de tipos de `planification.entity.ts` (§4.4) y los artefactos de Status.

**No incluye:** CU-E-12, E-13, E-14 y U-08. Su andamiaje en el controller **se deja exactamente como está**.

**No toca el esquema.** El único cambio de entidad es de tipos de TypeScript y genera el mismo DDL; el Paso 6 lo verifica.

---

### Paso 1: Tipos de `planification.entity.ts`

**Files:**
- Modify: `power-app/src/entities/planification.entity.ts`

Para que "omitir el campo lo borra" funcione en la edición, el service tiene que poder persistir `null` — y TypeORM ignora las propiedades `undefined`. Los tres campos opcionales pasan a la unión, con el `type` explícito que TypeORM necesita cuando el tipo es unión.

- [ ] **1.1 — Reemplazar el bloque de `description`, `type` y `duration`**

Buscar:

```typescript
    @ApiPropertyOptional({ example: 'Planificación orientada a fuerza máxima' })
    @Column({ type: 'text', nullable: true })
    description?: string;

    @ApiPropertyOptional({ example: 'fuerza', maxLength: 30 })
    @Column({ length: 30, nullable: true })
    type?: string;

    @ApiPropertyOptional({ example: '12 semanas', maxLength: 50 })
    @Column({ length: 50, nullable: true })
    duration?: string;
```

Reemplazar por:

```typescript
    // Aceptan null explicito: al editar la planificacion, el entrenador tiene que poder
    // borrar una descripcion que ya no aplica, y TypeORM ignora las propiedades undefined.
    // El type explicito es OBLIGATORIO con la union: TS emite design:type = Object para
    // string | null, y sin el tipo declarado TypeORM no sabe que columna crear.
    // Mismo caso que Routine.coach_note y Circuit.description
    @ApiPropertyOptional({ example: 'Planificación orientada a fuerza máxima' })
    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @ApiPropertyOptional({ example: 'fuerza', maxLength: 30 })
    @Column({ type: 'varchar', length: 30, nullable: true })
    type?: string | null;

    @ApiPropertyOptional({ example: '12 semanas', maxLength: 50 })
    @Column({ type: 'varchar', length: 50, nullable: true })
    duration?: string | null;
```

`name` **no se toca**: es obligatorio en los dos DTOs, así que nunca se persiste `null`.

- [ ] **1.2 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Paso 2: DTOs de entrada

**Files:**
- Create: `power-app/src/dtos/planification/get_planifications_query.dto.ts`
- Create: `power-app/src/dtos/planification/create_planification.dto.ts`
- Create: `power-app/src/dtos/planification/edit_planification.dto.ts`
- Create: `power-app/src/dtos/planification/set_planification_active.dto.ts`

La carpeta `dtos/planification/` no existe: hay que crearla.

- [ ] **2.1 — `get_planifications_query.dto.ts`**

Espejo de `GetCircuitsQueryDto` — a diferencia de `Routine`, `Planification` sí tiene `type`.

```typescript
import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetPlanificationsQueryDto {

    @ApiPropertyOptional({ example: 'fuerza', description: 'Busca coincidencias parciales (sin distinguir mayúsculas) en nombre y descripción' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    keyword?: string;

    @ApiPropertyOptional({ example: 'fuerza', description: 'Filtra por tipo de planificación (coincidencia exacta, sin distinguir mayúsculas)' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    type?: string;

    @ApiPropertyOptional({ example: false, default: false, description: 'true para incluir también las planificaciones dadas de baja' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    include_inactive?: boolean = false;
}
```

- [ ] **2.2 — `create_planification.dto.ts`**

`name` va obligatorio aunque la columna sea nullable (§4.2 de la spec): un ABM sin nombre es inusable y el modelo de `Doc/` no se toca.

```typescript
import { IsNotEmpty, IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanificationDto {

    @ApiProperty({ example: 'Plan fuerza 3 días', maxLength: 50, description: 'Obligatorio acá aunque la columna sea nullable: no se cargan planificaciones sin nombre' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name!: string;

    @ApiProperty({ example: 3, minimum: 1, description: 'Rutinas que el entrenador declara para el plan. Es la intención del plan, no el conteo real: ese es routine_count, que sale de las rutinas efectivamente asignadas por CU-E-12' })
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    number_of_routines!: number;

    @ApiPropertyOptional({ example: 'Planificación orientada a fuerza máxima', maxLength: 1000, description: 'La columna es TEXT sin límite; el tope es sanidad de input' })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({ example: 'fuerza', maxLength: 30 })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(30)
    type?: string;

    @ApiPropertyOptional({ example: '12 semanas', maxLength: 50 })
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    duration?: string;
}
```

`active` no viaja en el body: se crea siempre en `true` (default de la columna) y se cambia sólo por `set-active`.

- [ ] **2.3 — `edit_planification.dto.ts`**

El body del alta y el de la edición son idénticos, así que se extiende — mismo criterio que `EditCircuitDto`.

```typescript
import { CreatePlanificationDto } from './create_planification.dto';

// Mismo body que el alta: la edicion pisa la cabecera entera, asi que un opcional omitido
// BORRA el valor que hubiera (mismo contrato que EditRoutineDto con coach_note).
// Se declara como clase propia y no como alias para que Swagger muestre un schema con
// nombre distinto y para dejar lugar a que los dos bodies diverjan
export class EditPlanificationDto extends CreatePlanificationDto {}
```

- [ ] **2.4 — `set_planification_active.dto.ts`**

```typescript
import { IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPlanificationActiveDto {

    @ApiProperty({ example: false, description: 'false para dar de baja la planificación (baja lógica), true para reactivarla' })
    @IsNotEmpty()
    @IsBoolean()
    active!: boolean;
}
```

---

### Paso 3: DTOs de respuesta

**Files:**
- Create: `power-app/src/dtos/planification/planification_list_item_response.dto.ts`
- Create: `power-app/src/dtos/planification/planification_detail_response.dto.ts`

- [ ] **3.1 — `planification_list_item_response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanificationListItemResponseDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiPropertyOptional({ example: 'Plan fuerza 3 días', description: 'Opcional acá y obligatorio en el alta: la columna es nullable y puede haber filas viejas sin nombre' })
    name?: string;

    @ApiPropertyOptional({ example: 'Planificación orientada a fuerza máxima' })
    description?: string;

    @ApiProperty({ example: 3, description: 'Rutinas declaradas por el entrenador: la intención del plan' })
    number_of_routines!: number;

    @ApiPropertyOptional({ example: 'fuerza' })
    type?: string;

    @ApiPropertyOptional({ example: '12 semanas' })
    duration?: string;

    @ApiProperty({ example: true })
    active!: boolean;

    @ApiProperty({ example: 2, description: 'Rutinas efectivamente asignadas al plan (Routine_Asignation). Puede diferir de number_of_routines, que es la meta' })
    routine_count!: number;

    @ApiProperty()
    created_at!: Date;

    @ApiProperty()
    updated_at!: Date;
}
```

- [ ] **3.2 — `planification_detail_response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanificationListItemResponseDto } from './planification_list_item_response.dto';

export class PlanificationRoutineResponseDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 'Día A - Pecho y tríceps' })
    name!: string;

    @ApiPropertyOptional({ example: 'Enfocarse en la contracción' })
    coach_note?: string;

    @ApiProperty({ example: true, description: 'Se devuelve a propósito: una rutina dada de baja sigue apareciendo en los planes que la referencian' })
    active!: boolean;
}

export class PlanificationAsignationResponseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id del Routine_Asignation (el vínculo), NO el de la rutina: es el que va a necesitar CU-E-12 para desasignar' })
    id!: string;

    @ApiProperty({ example: 1 })
    order!: number;

    @ApiProperty({ type: PlanificationRoutineResponseDto })
    routine!: PlanificationRoutineResponseDto;
}

// Extiende el item del listado porque el detalle es exactamente eso mas las rutinas.
// Es tambien la forma de cada fila de GET /planification/all-plus: el arbol de una
// planificacion termina en las rutinas, asi que el "plus" y el detalle coinciden y no
// hace falta un DTO aparte. Si el detalle algun dia baja a los circuitos, ahi se separan
export class PlanificationDetailResponseDto extends PlanificationListItemResponseDto {

    @ApiProperty({ type: [PlanificationAsignationResponseDto], description: 'Rutinas del plan, ordenadas por order. Vacío hasta que exista CU-E-12' })
    routines!: PlanificationAsignationResponseDto[];
}
```

- [ ] **3.3 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0. Los DTOs todavía no los usa nadie, pero tienen que compilar solos.

---

### Paso 4: Service

**Files:**
- Modify: `power-app/src/planification/planification.service.ts` (hoy son 4 líneas vacías)

- [ ] **4.1 — Reemplazar el archivo entero**

```typescript
import { Injectable } from '@nestjs/common';
import { Response } from 'express';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Planification } from '../entities/planification.entity';
import { GetPlanificationsQueryDto } from '../dtos/planification/get_planifications_query.dto';
import { CreatePlanificationDto } from '../dtos/planification/create_planification.dto';
import { EditPlanificationDto } from '../dtos/planification/edit_planification.dto';
import { SetPlanificationActiveDto } from '../dtos/planification/set_planification_active.dto';

@Injectable()
export class PlanificationService {
    constructor(
        @InjectRepository(Planification)
        private planificationRepository: Repository<Planification>,
    ) {
    }

    // ===================== PLANIFICACIONES SISTEMICAS (CU-E-08 a CU-E-11) =====================

    async getAllPlanifications(
        query: GetPlanificationsQueryDto,
        res: Response
    ) {
        try {
            // Routine_Asignation no tiene baja logica, asi que el conteo no filtra nada
            // (a diferencia de circuit_count en rutinas, que descarta los vinculos apagados)
            const planifications = await this.buildPlanificationsQuery(query)
                .loadRelationCountAndMap(
                    'planification.routine_count',
                    'planification.routineAsignations',
                )
                .getMany();

            res.status(200).send(planifications);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener las planificaciones.' });
        }
    }

    async getAllPlanificationsPlus(
        query: GetPlanificationsQueryDto,
        res: Response
    ) {
        try {
            // Con las rutinas ya cargadas, el conteo sale del array
            const planifications = await this.buildPlanificationsQuery(query)
                .leftJoinAndSelect('planification.routineAsignations', 'routineAsignation')
                .leftJoinAndSelect('routineAsignation.routine', 'routine')
                .addOrderBy('routineAsignation.order', 'ASC')
                .getMany();

            // Cada fila tiene la misma forma que el detalle, asi que reusa su builder
            const response = planifications.map(
                planification => this.buildPlanificationDetailResponse(planification)
            );

            res.status(200).send(response);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener las planificaciones.' });
        }
    }

    // Responde tambien para planificaciones inactivas, espejo del detalle de rutina
    async getPlanificationById(
        idPlanification: string,
        res: Response
    ) {
        try {
            const planification = await this.findPlanificationDetail(idPlanification);

            if (!planification) {
                return res.status(404).send({ error: 'Planificación no encontrada' });
            }

            res.status(200).send(this.buildPlanificationDetailResponse(planification));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener la planificación.' });
        }
    }

    // Sin transaccion, a diferencia de createRoutine: se inserta UNA fila. Enganchar
    // rutinas al plan es CU-E-12 y tiene su propio endpoint
    async createPlanification(
        createPlanificationDto: CreatePlanificationDto,
        res: Response
    ) {
        try {
            const planification = await this.planificationRepository.save(
                this.planificationRepository.create({
                    name: createPlanificationDto.name,
                    number_of_routines: createPlanificationDto.number_of_routines,
                    description: createPlanificationDto.description ?? null,
                    type: createPlanificationDto.type ?? null,
                    duration: createPlanificationDto.duration ?? null,
                })
            );

            // Se recarga para devolver el mismo formato que GET /:id (con routines: [])
            const created = await this.findPlanificationDetail(planification.id);
            return res.status(201).send(this.buildPlanificationDetailResponse(created!));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al crear la planificación.' });
        }
    }

    async editPlanification(
        idPlanification: string,
        editPlanificationDto: EditPlanificationDto,
        res: Response
    ) {
        try {
            const planification = await this.planificationRepository.findOne({
                where: { id: idPlanification },
            });

            if (!planification) {
                return res.status(404).send({ error: 'Planificación no encontrada' });
            }

            // Precondicion del CU. Espejo del 400 de editRoutine y editCircuit:
            // para editar una planificacion de baja hay que reactivarla primero
            if (!planification.active) {
                return res.status(400).send({
                    error: 'La planificación está dada de baja y no puede editarse. Reactivala primero.'
                });
            }

            // El body es el estado completo de la cabecera: lo que no viene se BORRA.
            // Por eso los tres opcionales van a null explicito y no a undefined, que
            // TypeORM ignoraria dejando el valor viejo
            planification.name = editPlanificationDto.name;
            planification.number_of_routines = editPlanificationDto.number_of_routines;
            planification.description = editPlanificationDto.description ?? null;
            planification.type = editPlanificationDto.type ?? null;
            planification.duration = editPlanificationDto.duration ?? null;

            await this.planificationRepository.save(planification);

            const updated = await this.findPlanificationDetail(planification.id);
            return res.status(200).send(this.buildPlanificationDetailResponse(updated!));
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al editar la planificación.' });
        }
    }

    // El mismo endpoint da de baja y reactiva, igual que setRoutineActive
    async setPlanificationActive(
        idPlanification: string,
        setPlanificationActiveDto: SetPlanificationActiveDto,
        res: Response
    ) {
        try {
            const planification = await this.planificationRepository.findOne({
                where: { id: idPlanification },
            });

            if (!planification) {
                return res.status(404).send({ error: 'Planificación no encontrada' });
            }

            // La baja no cascadea nada: ni las Routine_Asignation ni las User_Planification
            // se tocan. El plan sale de circulacion como plantilla para asignaciones NUEVAS,
            // lo ya asignado mantiene su integridad y el alumno lo sigue viendo
            planification.active = setPlanificationActiveDto.active;
            await this.planificationRepository.save(planification);

            res.status(200).send(planification);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al actualizar el estado de la planificación.' });
        }
    }

    // ===================== HELPERS =====================

    // Filtros compartidos por /all y /all-plus
    private buildPlanificationsQuery(query: GetPlanificationsQueryDto): SelectQueryBuilder<Planification> {
        // NULLS LAST porque name es nullable: sin esto los planes sin nombre encabezan
        const queryBuilder = this.planificationRepository
            .createQueryBuilder('planification')
            .orderBy('planification.name', 'ASC', 'NULLS LAST');

        if (!query.include_inactive) {
            queryBuilder.andWhere('planification.active = :active', { active: true });
        }

        if (query.keyword) {
            queryBuilder.andWhere(
                '(planification.name ILIKE :keyword OR planification.description ILIKE :keyword)',
                { keyword: `%${query.keyword}%` }
            );
        }

        if (query.type) {
            queryBuilder.andWhere('planification.type ILIKE :type', { type: query.type });
        }

        return queryBuilder;
    }

    private async findPlanificationDetail(idPlanification: string): Promise<Planification | null> {
        return this.planificationRepository.findOne({
            where: { id: idPlanification },
            relations: [
                'routineAsignations',
                'routineAsignations.routine',
            ],
            order: {
                routineAsignations: {
                    order: 'ASC',
                },
            },
        });
    }

    // Compartido por el detalle, el alta, la edicion y cada fila de /all-plus, para que
    // el formato no se duplique
    private buildPlanificationDetailResponse(planification: Planification) {
        return {
            id: planification.id,
            name: planification.name,
            description: planification.description,
            number_of_routines: planification.number_of_routines,
            type: planification.type,
            duration: planification.duration,
            active: planification.active,
            routine_count: planification.routineAsignations.length,
            created_at: planification.created_at,
            updated_at: planification.updated_at,
            routines: planification.routineAsignations.map(routineAsignation => ({
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

}
```

- [ ] **4.2 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0. El controller todavía no llama a nada, así que el service compila aislado.

---

### Paso 5: Controller

**Files:**
- Modify: `power-app/src/planification/planification.controller.ts`

Se reemplazan las 5 rutas de andamiaje del ABM, se suma `/all-plus` y **se borra el `DELETE /:id`** (lo reemplaza `set-active`). El bloque de E-12 / E-13 / E-14 / U-08 —de `@Post('/routine/assign')` en adelante— **no se toca**.

- [ ] **5.1 — Reemplazar el encabezado de imports**

Buscar desde `import {` hasta la línea del `@Controller('planification')` inclusive, y reemplazar por:

```typescript
import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    Res,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { PlanificationService } from './planification.service';
import { Response } from 'express';
import { ParameterIdDto } from '../dtos/parameter_id.dto';
import { Planification } from '../entities/planification.entity';
import { UserPlanification } from '../entities/user_planification.entity';
import { RoutineAsignation } from '../entities/routine_asignation.entity';
import { UserRole } from '../entities/user.entity';
import { Auth } from '../authentication/decorators/auth.decorator';
import { GetPlanificationsQueryDto } from '../dtos/planification/get_planifications_query.dto';
import { CreatePlanificationDto } from '../dtos/planification/create_planification.dto';
import { EditPlanificationDto } from '../dtos/planification/edit_planification.dto';
import { SetPlanificationActiveDto } from '../dtos/planification/set_planification_active.dto';
import { PlanificationListItemResponseDto } from '../dtos/planification/planification_list_item_response.dto';
import { PlanificationDetailResponseDto } from '../dtos/planification/planification_detail_response.dto';
// TODO: crear los siguientes DTOs en src/dtos/planification/ (CU-E-12, E-13 y E-14)
// import { AssignRoutineToPlanificationDto } from '../dtos/planification/assign_routine_to_planification.dto';
// import { AssignPlanificationToUserDto } from '../dtos/planification/assign_planification_to_user.dto';
// import { EditUserPlanificationDto } from '../dtos/planification/edit_user_planification.dto';
// CU-E-19 y CU-E-20 (asignar/quitar rutina puntual a un alumno) salieron de aca el 27/8:
// son del paquete "Administrar Rutinas", dependen de Routine_Asignation_User —declarada
// post-MVP— y cuando se retomen van a vivir en routine/ (POST /routine/assign-user,
// DELETE /routine/assign-user/:id, GET /routine/assigned/:userId)

@ApiTags('Planification')
@Controller('planification')
```

Los TODO de `CreatePlanificationDto` y `EditPlanificationDto` salen de la lista comentada: ya existen.

- [ ] **5.2 — Reemplazar las 5 rutas del ABM**

Buscar desde `@Get('/all')` hasta el cierre del método `deletePlanification` (el `DELETE /:id`, justo antes de `@Post('/routine/assign')`) y reemplazar todo ese bloque por:

```typescript
    // ===================== PLANIFICACIONES SISTEMICAS (CU-E-08 a CU-E-11) =====================

    @Get('/all')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: [PlanificationListItemResponseDto] })
    async getAllPlanifications(
        @Query() query: GetPlanificationsQueryDto,
        @Res() res: Response,
    ) {
        this.planificationService.getAllPlanifications(query, res);
    }

    // Va declarado ANTES de /:id: es de un solo segmento y si no la request cae en el
    // :id y devuelve 400 por UUID invalido. Mismo caso que circuit/all-plus y routine/all-plus
    @Get('/all-plus')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: [PlanificationDetailResponseDto] })
    async getAllPlanificationsPlus(
        @Query() query: GetPlanificationsQueryDto,
        @Res() res: Response,
    ) {
        this.planificationService.getAllPlanificationsPlus(query, res);
    }

    @Get('/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: PlanificationDetailResponseDto })
    async getPlanificationById(
        @Param() idPlanification: ParameterIdDto,
        @Res() res: Response,
    ) {
        this.planificationService.getPlanificationById(idPlanification.id, res);
    }

    @Post('/create')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 201, type: PlanificationDetailResponseDto })
    async createPlanification(
        @Body() createPlanificationDto: CreatePlanificationDto,
        @Res() res: Response,
    ) {
        this.planificationService.createPlanification(createPlanificationDto, res);
    }

    @Post('/edit/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: PlanificationDetailResponseDto })
    async editPlanification(
        @Param() idPlanification: ParameterIdDto,
        @Body() editPlanificationDto: EditPlanificationDto,
        @Res() res: Response,
    ) {
        this.planificationService.editPlanification(idPlanification.id, editPlanificationDto, res);
    }

    // Baja logica: reemplaza al DELETE /:id del andamiaje. Se elige POST con body porque
    // no es un borrado y porque reactivar necesita el mismo camino.
    // Espejo exacto de POST /routine/set-active/:id
    @Post('/set-active/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: Planification })
    async setPlanificationActive(
        @Param() idPlanification: ParameterIdDto,
        @Body() setPlanificationActiveDto: SetPlanificationActiveDto,
        @Res() res: Response,
    ) {
        this.planificationService.setPlanificationActive(idPlanification.id, setPlanificationActiveDto, res);
    }

    // ===================== ASIGNACIONES (CU-E-12, E-13, E-14, U-08) =====================
```

- [ ] **5.3 — Verificar que el andamiaje siguiente quedó intacto**

Los 7 métodos de `assignRoutineToPlanification` en adelante tienen que seguir exactamente como estaban, con sus llamadas comentadas y sus `@Body() ...: any`. El único import que perdieron es ninguno: `RoutineAsignation` y `UserPlanification` siguen en el encabezado del Paso 5.1.

- [ ] **5.4 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

---

### Paso 6: Verificar que el esquema no se movió

El Paso 1 cambió tipos de TypeScript, no columnas. Este paso lo demuestra.

- [ ] **6.1 — Regenerar los SQL**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && python build_sql.py
```

- [ ] **6.2 — Confirmar que no cambió nada**

Run: `git status --short "Db Creator"`
Expected: **salida vacía**. Si aparece `01_estructura.sql` modificado, el cambio de tipos movió el DDL y hay que revisar el Paso 1 antes de seguir.

---

### Paso 7: Pruebas de runtime *(las corre el usuario)*

La base está al día y la tabla `Planification` está **vacía**, así que este bloque se prueba de punta a punta sin insertar nada a mano. Con el server levantado, desde Swagger y con token de entrenador o admin:

- [ ] **7.1 — Camino feliz**

| # | Request | Esperado |
|---|---|---|
| 1 | `GET /planification/all` | `200` con `[]` |
| 2 | `POST /planification/create` con `name`, `number_of_routines: 3`, `type: "fuerza"` | `201` con el detalle, `active: true`, `routines: []`, `routine_count: 0` |
| 3 | `GET /planification/all` | `200` con la fila, `routine_count: 0` |
| 4 | `GET /planification/all-plus` | `200`, misma fila más `routines: []` |
| 5 | `GET /planification/:id` con el id del alta | `200`, misma forma que una fila de `all-plus` |
| 6 | `POST /planification/edit/:id` cambiando `name` y **omitiendo** `type` | `200` y `type: null` — el opcional omitido borra |
| 7 | `POST /planification/set-active/:id` con `{ "active": false }` | `200`, y la planificación desaparece de `GET /all` |
| 8 | `GET /planification/all?include_inactive=true` | `200`, vuelve a aparecer |
| 9 | `GET /planification/:id` de la inactiva | `200` — el detalle responde igual |
| 10 | `POST /planification/set-active/:id` con `{ "active": true }` | `200`, reaparece en `GET /all` |

- [ ] **7.2 — Errores**

| # | Request | Esperado |
|---|---|---|
| 1 | `POST /create` sin `name` | `400` |
| 2 | `POST /create` con `number_of_routines: 0` | `400` |
| 3 | `GET /planification/:id` con un UUID que no existe | `404` |
| 4 | `GET /planification/:id` con `abc` | `400` (UUID inválido) |
| 5 | `POST /edit/:id` sobre una planificación dada de baja | `400` con el mensaje de reactivar |
| 6 | `POST /set-active/:id` con un id inexistente | `404` |
| 7 | Cualquiera de los 6 con token de `user` | `403` |

- [ ] **7.3 — Filtros**

Crear una segunda planificación con `type: "hipertrofia"` y verificar: `?type=fuerza` devuelve sólo la primera, `?type=FUERZA` también (ILIKE), y `?keyword=` con un fragmento del nombre o de la descripción filtra las dos.

---

### Paso 8: Status

**Files:**
- Modify: `Status/estado-implementacion-CU.md`
- Modify: `Status/dashboard-estado-CU.html`

- [ ] **8.1 — `estado-implementacion-CU.md`: entrada nueva en "Cambios recientes"**

Insertar **arriba** de `## Cambios recientes (2026-08-27 · editar rutina y baja lógica)`:

```markdown
## Cambios recientes (2026-08-29 · ABM de planificaciones sistémicas)

- **CU-E-08 a CU-E-11** 🔵 → ✅: el service de planificaciones pasó de 4 líneas vacías a seis endpoints. `GET /planification/all` (con `keyword`, `type` e `include_inactive`, más `routine_count`), `GET /planification/all-plus`, `GET /planification/:id`, `POST /planification/create`, `POST /planification/edit/:id` y `POST /planification/set-active/:id`, que reemplaza al `DELETE /:id` del andamiaje. El bloque **no tocó el esquema**: `Db Creator` quedó intacto.
- **`number_of_routines` es declarativo y el conteo real va aparte.** El campo es la *intención* del plan —lo que el entrenador declara al crearlo— y los listados y el detalle devuelven además un `routine_count` derivado de las `Routine_Asignation` efectivamente cargadas. Los dos pueden diferir a propósito; unificarlos habría obligado a que E-12 y E-14 recalcularan el campo en cada asignación.
- **`name` es obligatorio en el DTO, no en la columna.** El modelo de `Doc/` lo tiene nullable y no se tocó; la exigencia vive en la validación. Como consecuencia el listado ordena por `name ASC NULLS LAST`.
- **En la edición, un opcional omitido borra el valor** (mismo contrato que `EditRoutineDto` con `coach_note`). Para que TypeORM pueda persistir el `null`, `description`, `type` y `duration` de `planification.entity.ts` pasaron a `string | null` con el `type` explícito en el decorador. **Es un cambio de tipos de TypeScript, no de esquema:** el DDL generado es idéntico.
- **`routines` viene vacío hasta CU-E-12.** No existe todavía ningún endpoint que cargue `Routine_Asignation`, así que el detalle y `/all-plus` devuelven `[]` y `routine_count: 0`. Es la misma situación en la que se construyó `/routine/:id` antes de que existiera E-16.
- **Deuda anotada, no resuelta:** `Routine.routine_plan_id` y `Routine_Asignation` son dos formas de decir lo mismo. Este bloque no las necesita; la elección es de **E-12**.
```

- [ ] **8.2 — `estado-implementacion-CU.md`: tabla de detalle del rol Entrenador**

Las 4 filas pasan de `🔵 Andamiaje` a `✅ Implementado` con su endpoint real:

| CU | Nueva nota de la columna endpoint |
|---|---|
| CU-E-08 | `GET /planification/all` · keyword/type/include_inactive + routine_count |
| CU-E-09 | `POST /planification/create` · 201 con el detalle |
| CU-E-10 | `POST /planification/edit/:id` · 400 si está de baja |
| CU-E-11 | `POST /planification/set-active/:id` · baja y reactivación |

- [ ] **8.3 — `estado-implementacion-CU.md`: conteos**

En la tabla "Resumen" y en "Cobertura por rol":

| | Antes | Después |
|---|---:|---:|
| ✅ Implementado | 55 (76%) | **59 (82%)** |
| 🔵 Andamiaje | 9 (13%) | **5 (7%)** |
| Línea "X de 72 con código implementado o parcial" | 56 (~78%) | **60 (~83%)** |
| Entrenador | 18 ✅ · 7 🔵 (62%) | **22 ✅ · 3 🔵 (76%)** |

🟡 (1) y ⬜ (7) no se mueven. Entrenador queda con 🔵 E-12, E-13 y E-14.

- [ ] **8.4 — `estado-implementacion-CU.md`: cronograma**

En la fila del **4/9**, `🔵 service de planificaciones (E-08→E-11)` pasa a `✅ ABM de planificaciones (E-08→E-11)`. El resto de la fila (E-12→E-14, U-08, U-09, pruebas de integración) queda igual.

- [ ] **8.5 — `dashboard-estado-CU.html`: las mismas cifras**

Reemplazos exactos:

| Dónde | Antes | Después |
|---|---|---|
| Tile *Implementado* | `<div class="n">55</div>` … `76% · endpoint + lógica` | `59` … `82% · endpoint + lógica` |
| Tile *Andamiaje* | `<div class="n">9</div>` … `13% · ruta sin lógica` | `5` … `7% · ruta sin lógica` |
| `aria-label` de la barra | `55 implementados, 1 parcial, 9 andamiaje, 7 no implementados de 72` | `59 implementados, 1 parcial, 5 andamiaje, 7 no implementados de 72` |
| `span.s-done` | `width:76.39%` | `width:81.94%` |
| `span.s-stub` | `width:12.50%` | `width:6.94%` |
| `bar-cap` | `<b>56 de 72</b> … (78%)` y `<b>16</b> pendientes` | `<b>60 de 72</b> … (83%)` y `<b>12</b> pendientes` |
| Role card Entrenador | `style="color:var(--stub)">62%` | `style="color:var(--done)">76%` |
| `role-sub` de Entrenador | `18 implementados · …` | `22 implementados · planificaciones sistémicas cerradas, quedan las asignaciones (E-12→E-14)` |
| `mini-bar` de Entrenador | `62.07%` / `24.14%` / `13.79%` | `75.86%` / `10.34%` / `13.79%` |
| `sec-head` de Entrenador | `29 CU · 62% implementado` | `29 CU · 76% implementado` |

`s-partial` (1.39%) y `s-missing` (9.72%) no se tocan.

- [ ] **8.6 — `dashboard-estado-CU.html`: las 4 filas y el footer**

En las filas de CU-E-08 a CU-E-11, cambiar `<span class="chip stub"><span class="cd"></span>Andamiaje</span>` por `<span class="chip done"><span class="cd"></span>Implementado</span>` y reemplazar el `<span class="muted">· comentado</span>` por la nota de 8.2. La fila de E-11 además pierde el `<span class="muted">pasa a baja lógica (22/8): será </span>` que la precede.

**El footer está desactualizado de antes:** dice `52 impl · 1 parc · 12 andam · 7 falta — de 72`, que no coincidía ya con el corte del 27/8. Corregirlo a `59 impl · 1 parc · 5 andam · 7 falta — de 72`.

---

### Paso 9: Stage

- [ ] **9.1**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/entities/planification.entity.ts power-app/src/dtos/planification power-app/src/planification Status Doc/plans Doc/specs
```

- [ ] **9.2 — Mensaje sugerido**

```
CU-E-08 a CU-E-11: ABM de planificaciones sistemicas con baja logica
```

---

## Después de esto

Quedan **E-12** (asignar rutina a planificación) y **E-13/E-14** (asignar y quitar planificación a un alumno). E-12 es el que llena el `routines` que este bloque deja vacío, y el que tiene que resolver la deuda anotada en §9 de la spec: `Routine.routine_plan_id` y `Routine_Asignation` son dos formas de decir lo mismo, y hay que elegir una. E-13 es la pieza cara del bloque —crea la `User_Planification` y **deriva** las `User_Routine` en transacción— y es la que destraba U-08, U-09, U-12, U-13, E-06 y E-07.
