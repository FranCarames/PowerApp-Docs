# Circuitos: listado, detalle y baja lógica — Plan de implementación

> **Spec:** `Doc/specs/2026-08-19-circuitos-listado-y-baja-design.md`
> Los pasos usan checkbox (`- [ ]`) para ir tildando.

**Goal:** Implementar CU-E-21 (obtener circuitos) y CU-E-24 (baja lógica), más el endpoint de detalle que CU-E-23 va a necesitar, dentro del módulo de rutinas.

**Architecture:** Tres endpoints en `routine.controller.ts` bajo el sub-path `circuit/`, con la lógica en `routine.service.ts` (que hoy está vacío y gana sus primeros métodos reales). Sin entidades nuevas: `Db Creator` no se toca.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL. Validación con `class-validator` / `class-transformer` vía el pipe global.

**Convenciones:** no se commitea (queda todo stageado + mensaje sugerido); no se levanta el server; la verificación es `npm --prefix power-app run build`.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `power-app/src/dtos/circuit/get_circuits_query.dto.ts` | Crear | Filtros del listado |
| `power-app/src/dtos/circuit/set_circuit_active.dto.ts` | Crear | Body de la baja/reactivación |
| `power-app/src/dtos/circuit/circuit_list_item_response.dto.ts` | Crear | Forma de cada fila del listado (Swagger) |
| `power-app/src/dtos/circuit/circuit_detail_response.dto.ts` | Crear | Forma anidada del detalle (Swagger) |
| `power-app/src/routine/routine.service.ts` | Modificar | Tres métodos nuevos |
| `power-app/src/routine/routine.controller.ts` | Modificar | Tres endpoints nuevos |

`RoutineModule` no cambia: `Circuit`, `RoutineExercise` y `ExerciseSet` ya están en su `forFeature`.

---

### Task 1: DTOs de entrada

**Files:**
- Create: `power-app/src/dtos/circuit/get_circuits_query.dto.ts`
- Create: `power-app/src/dtos/circuit/set_circuit_active.dto.ts`

- [ ] **Step 1: Crear `get_circuits_query.dto.ts`**

```typescript
import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetCircuitsQueryDto {

    @ApiPropertyOptional({ example: 'calor', description: 'Busca coincidencias parciales (sin distinguir mayúsculas) en nombre y descripción' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    keyword?: string;

    @ApiPropertyOptional({ example: 'cardio', description: 'Filtra por tipo de circuito (coincidencia exacta, sin distinguir mayúsculas)' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    type?: string;

    @ApiPropertyOptional({ example: false, default: false, description: 'true para incluir también los circuitos dados de baja' })
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

El `@Transform` es el mismo que usa `GetUsersQueryDto.active`: los query params llegan como string y `@IsBoolean()` los rechazaría.

- [ ] **Step 2: Crear `set_circuit_active.dto.ts`**

```typescript
import { IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCircuitActiveDto {

    @ApiProperty({ example: false, description: 'false para dar de baja el circuito (baja lógica), true para reactivarlo' })
    @IsNotEmpty()
    @IsBoolean()
    active!: boolean;
}
```

---

### Task 2: DTOs de respuesta (Swagger)

**Files:**
- Create: `power-app/src/dtos/circuit/circuit_list_item_response.dto.ts`
- Create: `power-app/src/dtos/circuit/circuit_detail_response.dto.ts`

Son solo documentación: el service responde objetos planos, estos DTOs le dan forma a Swagger.

- [ ] **Step 1: Crear `circuit_list_item_response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CircuitListItemResponseDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 'Entrada en calor - Tren superior' })
    name!: string;

    @ApiPropertyOptional({ example: 'Movilidad de hombro y activación de manguito' })
    description?: string;

    @ApiProperty({ example: 'entrada en calor' })
    type!: string;

    @ApiProperty({ example: true })
    active!: boolean;

    @ApiProperty({ example: 4, description: 'Cantidad de ejercicios que componen el circuito' })
    exercise_count!: number;

    @ApiProperty()
    created_at!: Date;

    @ApiProperty()
    updated_at!: Date;
}
```

- [ ] **Step 2: Crear `circuit_detail_response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CircuitSetResponseDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 1 })
    set_order!: number;

    @ApiProperty({ example: 3 })
    set_count!: number;

    @ApiProperty({ example: 8 })
    rep_count!: number;

    @ApiPropertyOptional({ example: 80.5 })
    weight?: number;

    @ApiPropertyOptional({ example: 7 })
    rpe?: number;

    @ApiPropertyOptional({ example: 2 })
    rir?: number;

    @ApiPropertyOptional({ example: 75 })
    rm_perc?: number;

    @ApiProperty({ example: false })
    amrap!: boolean;

    @ApiPropertyOptional({ example: 60 })
    amrap_time?: number;

    @ApiProperty({ example: false })
    rm!: boolean;
}

export class CircuitExerciseResponseDto {

    @ApiProperty({ example: 'uuid-1234', description: 'Id del Routine_Exercise (no el del Exercise)' })
    id!: string;

    @ApiProperty({ example: 1 })
    exercise_order!: number;

    @ApiPropertyOptional({ example: 'Bajar lento en 3 segundos' })
    coach_note?: string;

    @ApiProperty({ description: 'Ficha del ejercicio del catálogo' })
    exercise!: Record<string, any>;

    @ApiProperty({ type: [CircuitSetResponseDto] })
    sets!: CircuitSetResponseDto[];
}

export class CircuitDetailResponseDto {

    @ApiProperty({ example: 'uuid-1234' })
    id!: string;

    @ApiProperty({ example: 'Entrada en calor - Tren superior' })
    name!: string;

    @ApiPropertyOptional({ example: 'Movilidad de hombro y activación de manguito' })
    description?: string;

    @ApiProperty({ example: 'entrada en calor' })
    type!: string;

    @ApiProperty({ example: true })
    active!: boolean;

    @ApiProperty()
    created_at!: Date;

    @ApiProperty()
    updated_at!: Date;

    @ApiProperty({ type: [CircuitExerciseResponseDto] })
    exercises!: CircuitExerciseResponseDto[];
}
```

---

### Task 3: Métodos del `RoutineService`

**Files:**
- Modify: `power-app/src/routine/routine.service.ts` (reemplazo completo — hoy son 5 líneas vacías)

- [ ] **Step 1: Reemplazar el archivo**

```typescript
import { Injectable } from '@nestjs/common';
import { Response } from 'express';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Circuit } from '../entities/circuit.entity';
import { GetCircuitsQueryDto } from '../dtos/circuit/get_circuits_query.dto';
import { SetCircuitActiveDto } from '../dtos/circuit/set_circuit_active.dto';

@Injectable()
export class RoutineService {
    constructor(
        @InjectRepository(Circuit)
        private circuitRepository: Repository<Circuit>,
    ) {
    }

    // ===================== CIRCUITOS =====================

    async getAllCircuits(
        query: GetCircuitsQueryDto,
        res: Response
    ) {
        try {
            const queryBuilder = this.circuitRepository
                .createQueryBuilder('circuit')
                .loadRelationCountAndMap('circuit.exercise_count', 'circuit.routineExercises')
                .orderBy('circuit.name', 'ASC');

            if (!query.include_inactive) {
                queryBuilder.andWhere('circuit.active = :active', { active: true });
            }

            if (query.type) {
                queryBuilder.andWhere('LOWER(circuit.type) = LOWER(:type)', { type: query.type });
            }

            if (query.keyword) {
                queryBuilder.andWhere(
                    '(circuit.name ILIKE :keyword OR circuit.description ILIKE :keyword)',
                    { keyword: `%${query.keyword}%` }
                );
            }

            const circuits = await queryBuilder.getMany();

            res.status(200).send(circuits);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener los circuitos.' });
        }
    }

    async getCircuitById(
        idCircuit: string,
        res: Response
    ) {
        try {
            const circuit = await this.circuitRepository.findOne({
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

            if (!circuit) {
                return res.status(404).send({ error: 'Circuito no encontrado' });
            }

            res.status(200).send({
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
            });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al obtener el circuito.' });
        }
    }

    async setCircuitActive(
        idCircuit: string,
        setCircuitActiveDto: SetCircuitActiveDto,
        res: Response
    ) {
        try {
            const circuit = await this.circuitRepository.findOne({ where: { id: idCircuit } });

            if (!circuit) {
                return res.status(404).send({ error: 'Circuito no encontrado' });
            }

            circuit.active = setCircuitActiveDto.active;
            await this.circuitRepository.save(circuit);

            res.status(200).send(circuit);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al actualizar el estado del circuito.' });
        }
    }
}
```

Notas de implementación:
- `loadRelationCountAndMap` mapea `exercise_count` sobre la instancia en runtime; no está declarado en la entidad `Circuit` y no hace falta que lo esté.
- El detalle responde también para circuitos inactivos: es a propósito (el listado permite verlos con `include_inactive`).
- `weight` ya viene como `number` gracias al `transformer` que tiene la columna en `exercise_set.entity.ts`.

---

### Task 4: Endpoints del `RoutineController`

**Files:**
- Modify: `power-app/src/routine/routine.controller.ts`

- [ ] **Step 1: Agregar los imports que faltan**

Al import de `@nestjs/common` sumarle `Query`:

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
```

Y después de los imports existentes, agregar:

```typescript
import { GetCircuitsQueryDto } from '../dtos/circuit/get_circuits_query.dto';
import { SetCircuitActiveDto } from '../dtos/circuit/set_circuit_active.dto';
import { CircuitListItemResponseDto } from '../dtos/circuit/circuit_list_item_response.dto';
import { CircuitDetailResponseDto } from '../dtos/circuit/circuit_detail_response.dto';
import { Circuit } from '../entities/circuit.entity';
```

- [ ] **Step 2: Agregar los tres endpoints al final de la clase**

Antes del `}` que cierra `RoutineController`:

```typescript
    // ===================== CIRCUITOS (CU-E-21, CU-E-24) =====================

    @Get('circuit/all')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: [CircuitListItemResponseDto] })
    async getAllCircuits(
        @Query() query: GetCircuitsQueryDto,
        @Res() res: Response,
    ) {
        this.routineService.getAllCircuits(query, res);
    }

    @Get('circuit/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: CircuitDetailResponseDto })
    async getCircuitById(
        @Param() idCircuit: ParameterIdDto,
        @Res() res: Response,
    ) {
        this.routineService.getCircuitById(idCircuit.id, res);
    }

    @Post('circuit/set-active/:id')
    @Auth(UserRole.coach, UserRole.admin)
    @ApiResponse({ status: 200, type: Circuit })
    async setCircuitActive(
        @Param() idCircuit: ParameterIdDto,
        @Body() setCircuitActiveDto: SetCircuitActiveDto,
        @Res() res: Response,
    ) {
        this.routineService.setCircuitActive(idCircuit.id, setCircuitActiveDto, res);
    }
```

No hay conflicto con el `@Get('/:id')` del andamiaje de rutinas: ese matchea un solo segmento y las rutas de circuito tienen dos.

- [ ] **Step 3: Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0, sin errores.

---

### Task 5: Verificar que las rutas quedan registradas

- [ ] **Step 1: Confirmar los tres handlers en el bundle compilado**

```bash
grep -c "circuit/all\|circuit/set-active" power-app/dist/src/routine/routine.controller.js
```

Expected: 2 o más. Confirma que los decoradores de ruta llegaron al build (no reemplaza a probar contra la base, que no se puede hasta regenerarla).

---

### Task 6: Actualizar `Status/`

**Files:**
- Modify: `Status/estado-implementacion-CU.md`
- Modify: `Status/dashboard-estado-CU.html`

Esta vez **sí se mueven los conteos**.

- [ ] **Step 1: Filas de detalle de E-21 y E-24**

En el informe, la tabla `### Administrar circuitos`:

```markdown
| CU-E-21 | Obtener circuitos | ✅ Implementado | `GET /routine/circuit/all` · filtros keyword/type/include_inactive + `exercise_count` |
| CU-E-22 | Crear circuito | ⬜ No implementado | pendiente de refinar el contrato de alta |
| CU-E-23 | Editar circuito | ⬜ No implementado | pendiente de refinar la reconciliación |
| CU-E-24 | Eliminar circuito (lógico) | ✅ Implementado | `POST /routine/circuit/set-active/:id` · flag `{ active }` |
```

En el dashboard, las filas equivalentes: cambiar el chip `missing` por `done` en E-21 y E-24 y actualizar la columna de endpoint.

- [ ] **Step 2: Actualizar los conteos en los dos artefactos**

- Tabla de resumen: ✅ 47 → **49** (65% → **68%**), ⬜ 10 → **8** (14% → **11%**). Total sigue 72.
- "48 de 72 CU con código implementado o parcial (~67%)" → **50 de 72 (~69%)**.
- Cobertura por rol, fila Entrenador: `| Entrenador | 29 | 10 | 0 | 12 | 7 |` → `| Entrenador | 29 | 12 | 0 | 12 | 5 |`, y 34% → **41%**.
- En el dashboard: las tiles del panorama general, el kicker `29 CU · 34% implementado` de la sección Entrenador y la barra/porcentaje de cobertura por rol.

- [ ] **Step 3: Sección de cambios recientes**

Agregar arriba de todo en el informe:

```markdown
## Cambios recientes (2026-08-19 · circuitos)

- **CU-E-21 (obtener circuitos)** ✅: `GET /routine/circuit/all` con tres filtros opcionales — `keyword` (parcial, case-insensitive, sobre nombre y descripción), `type` (exacto, case-insensitive) e `include_inactive` (por defecto `false`, solo activos como pide la spec). Devuelve un array plano ordenado por nombre, con `exercise_count` por circuito resuelto con `loadRelationCountAndMap`.
- **`GET /routine/circuit/:id`** (no es un CU: es el «include» que CU-E-23 necesita para abrir un circuito con sus ejercicios): devuelve el circuito con `Routine_Exercise` ordenados por `exercise_order` y sus `Exercise_Set` por `set_order`. Responde también para circuitos inactivos.
- **CU-E-24 (eliminar circuito, lógico)** ✅: `POST /routine/circuit/set-active/:id` con body `{ active }`, mismo patrón que `/membership/set-active/:id`. Sirve para dar de baja y para reactivar. **No toca `Routine_Circuit`**: las rutinas que referencian el circuito quedan intactas.
- Todo vive en `routine.controller.ts` / `routine.service.ts` — **los circuitos no tienen módulo propio** (decisión del usuario: rutinas y circuitos dependen entre sí). El `RoutineService` deja de estar vacío.
- **CU-E-22 y CU-E-23 quedan pendientes por decisión de diseño**, no por falta de tiempo: el contrato de alta/edición (lista completa de ejercicios + reconciliación) necesita refinarse antes de codificarse.
- Sin cambios de entidades → `Db Creator` intacto. Sigue pendiente **regenerar la base** con el schema del ajuste de modelo.
```

Replicar lo esencial en el dashboard.

---

### Task 7: Dejar todo stageado

- [ ] **Step 1: Stagear**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/dtos/circuit power-app/src/routine Status Doc/specs Doc/plans
```

- [ ] **Step 2: Revisar**

Run: `git status --short`
Expected: 4 DTOs nuevos, controller y service modificados, los 2 de Status, spec y plan.

- [ ] **Step 3: Mensaje sugerido**

```
CU-E-21 y CU-E-24: listado, detalle y baja logica de circuitos
```
