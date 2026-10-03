# Ajuste de modelo: circuitos reutilizables — Plan de implementación

> **Para quien ejecute esto:** las tareas se hacen en orden y cada paso es una acción chica. Los pasos usan checkbox (`- [ ]`) para ir tildando.
> **Spec:** `Doc/specs/2026-08-19-ajuste-modelo-circuitos-design.md`

**Goal:** Alinear las entidades TypeORM y los scripts de `Db Creator` con el modelo vigente de `Doc/`, dejando `Circuit` como pieza global reutilizable vinculada a rutinas por `Routine_Circuit`. Sin endpoints.

**Architecture:** Cambio puramente de modelo. Se reescribe `Circuit` (pierde `routine_id`, gana `description`/`type`/`active`), se crean dos entidades nuevas (`Routine_Circuit`, `Routine_Exercise_Set_Finished`), se limpian de `Routine_Exercise` los campos de estado per-usuario, y se replica todo en `ddl.py` (fuente única del DDL) regenerando `01_estructura.sql`.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL. Scripts de base en Python sin dependencias externas.

**Convenciones de este repo (importantes):**
- **No se commitea.** Al final se deja todo *stageado* y se sugiere el mensaje; el usuario valida y commitea.
- **No se levanta el servidor.** La verificación es por compilación: `npm --prefix power-app run build`. La base está vencida (free tier), no hay runtime.
- El proyecto **no tiene tests unitarios** (solo un scaffold e2e sin usar). La verificación de este cambio es: build en verde + chequeo cruzado entidades ↔ DDL (Tarea 7).
- Estilo de entidades: 4 espacios de indentación, `@ApiProperty` en cada columna, bloque `// JOIN RELATIONSHIPS` al final.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `power-app/src/entities/circuit.entity.ts` | Modificar | Circuito como pieza global reutilizable |
| `power-app/src/entities/routine_circuit.entity.ts` | Crear | Join M:N rutina ↔ circuito, con orden |
| `power-app/src/entities/routine.entity.ts` | Modificar | Reapuntar la relación a `routineCircuits` |
| `power-app/src/entities/routine_exercise.entity.ts` | Modificar | Sacar estado per-usuario (`finished`, `user_note`) |
| `power-app/src/entities/routine_exercise_set_finished.entity.ts` | Crear | Set marcado como hecho por usuario |
| `power-app/src/routine/routine.module.ts` | Modificar | Registrar las entidades nuevas en `forFeature` |
| `Db Creator/ddl.py` | Modificar | DDL de las 4 tablas afectadas |
| `Db Creator/01_estructura.sql` | Regenerar | Salida de `build_sql.py` |
| `Status/estado-implementacion-CU.md` | Modificar | Cambios recientes + hallazgos |
| `Status/dashboard-estado-CU.html` | Modificar | Misma info que el informe |

---

### Task 1: Reescribir la entidad `Circuit`

**Files:**
- Modify: `power-app/src/entities/circuit.entity.ts` (reemplazo completo del archivo)

- [ ] **Step 1: Reemplazar el contenido del archivo**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoutineExercise } from './routine_exercise.entity';
import { RoutineCircuit } from './routine_circuit.entity';

@Entity('Circuit')
export class Circuit {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'Entrada en calor - Tren superior', maxLength: 100 })
    @Column({ length: 100, nullable: false })
    name!: string;

    @ApiPropertyOptional({ example: 'Movilidad de hombro y activacion de manguito', maxLength: 100 })
    @Column({ length: 100, nullable: true })
    description?: string;

    @ApiProperty({ example: 'entrada en calor', maxLength: 30 })
    @Column({ length: 30, nullable: false })
    type!: string;

    @ApiProperty({ example: true })
    @Column({ nullable: false, default: true })
    active!: boolean;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    // JOIN RELATIONSHIPS
    @OneToMany(() => RoutineExercise, routineExercise => routineExercise.circuit)
    routineExercises!: RoutineExercise[];

    @OneToMany(() => RoutineCircuit, routineCircuit => routineCircuit.circuit)
    routineCircuits!: RoutineCircuit[];
}
```

Desaparecen: la columna `routine_id`, el import de `Routine`, el import de `ManyToOne`/`JoinColumn` y la relación `routine`.

- [ ] **Step 2: No compilar todavía**

`routine_circuit.entity.ts` no existe aún, así que el build va a fallar con `Cannot find module './routine_circuit.entity'`. Es esperado: se compila recién en la Tarea 5.

---

### Task 2: Crear `Routine_Circuit` y reapuntar la relación en `Routine`

**Files:**
- Create: `power-app/src/entities/routine_circuit.entity.ts`
- Modify: `power-app/src/entities/routine.entity.ts`

- [ ] **Step 1: Crear la entidad nueva**

Archivo `power-app/src/entities/routine_circuit.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Routine } from './routine.entity';
import { Circuit } from './circuit.entity';

@Entity('Routine_Circuit')
export class RoutineCircuit {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    routine_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    circuit_id!: string;

    @ApiProperty({ example: 1 })
    @Column({ type: 'integer', nullable: false })
    order!: number;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    // JOIN RELATIONSHIPS
    @ManyToOne(() => Routine, routine => routine.routineCircuits, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'routine_id' })
    routine!: Routine;

    @ManyToOne(() => Circuit, circuit => circuit.routineCircuits, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'circuit_id' })
    circuit!: Circuit;
}
```

`order` va sin `name` explícito, igual que en `routine_asignation.entity.ts:20`: TypeORM cita los identificadores al generar SQL, así que la palabra reservada no molesta.

**No** lleva unique sobre `(routine_id, circuit_id)`: un circuito puede repetirse dentro de la misma rutina y el `order` distingue las apariciones.

- [ ] **Step 2: Cambiar el import en `routine.entity.ts`**

Reemplazar la línea:

```typescript
import { Circuit } from './circuit.entity';
```

por:

```typescript
import { RoutineCircuit } from './routine_circuit.entity';
```

- [ ] **Step 3: Cambiar la relación en `routine.entity.ts`**

Dentro del bloque `// JOIN RELATIONSHIPS`, reemplazar:

```typescript
    @OneToMany(() => Circuit, circuit => circuit.routine)
    circuits!: Circuit[];
```

por:

```typescript
    @OneToMany(() => RoutineCircuit, routineCircuit => routineCircuit.routine)
    routineCircuits!: RoutineCircuit[];
```

Ninguna columna de `Routine` cambia.

---

### Task 3: Limpiar `Routine_Exercise`

**Files:**
- Modify: `power-app/src/entities/routine_exercise.entity.ts`

- [ ] **Step 1: Borrar las dos columnas de estado per-usuario**

Eliminar estos dos bloques completos:

```typescript
    @ApiPropertyOptional({ example: 'Me costó la última serie', maxLength: 100 })
    @Column({ length: 100, nullable: true })
    user_note?: string;

    @ApiProperty({ example: false })
    @Column({ nullable: false, default: false })
    finished!: boolean;
```

`coach_note` se queda (es de la plantilla, lo define el entrenador). El import de `ApiPropertyOptional` también se queda, porque `coach_note` lo usa.

- [ ] **Step 2: Confirmar que nadie los leía**

Run: `grep -rn "\.finished\|user_note" power-app/src --include=*.ts`
Expected: cero resultados en archivos de `entities/`, `routine/`, `dtos/`. Si aparece algo fuera de eso, frenar y avisar (al escribir el plan solo existía `membership.service.ts:42`, que es un `console.log` con la palabra "finished" en una frase, no un acceso a la propiedad).

---

### Task 4: Crear `Routine_Exercise_Set_Finished`

**Files:**
- Create: `power-app/src/entities/routine_exercise_set_finished.entity.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoutine } from './user_routine.entity';
import { ExerciseSet } from './exercise_set.entity';

@Entity('Routine_Exercise_Set_Finished')
@Unique('uk_resf_user_routine_set', ['user_routine_id', 'routine_exercise_set_id'])
export class RoutineExerciseSetFinished {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    user_routine_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    routine_exercise_set_id!: string;

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

    @ManyToOne(() => ExerciseSet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'routine_exercise_set_id' })
    exerciseSet!: ExerciseSet;
}
```

Ojo con el nombre del campo: `routine_exercise_set_id` **apunta a `Exercise_Set.id`**. Es el nombre del diagrama y se respeta.

---

### Task 5: Registrar las entidades en el módulo y compilar

**Files:**
- Modify: `power-app/src/routine/routine.module.ts`

- [ ] **Step 1: Reemplazar el contenido del archivo**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { Routine } from '../entities/routine.entity';
import { Circuit } from '../entities/circuit.entity';
import { RoutineCircuit } from '../entities/routine_circuit.entity';
import { RoutineExercise } from '../entities/routine_exercise.entity';
import { ExerciseSet } from '../entities/exercise_set.entity';
import { RoutineExerciseSetFinished } from '../entities/routine_exercise_set_finished.entity';
import { UserRoutine } from '../entities/user_routine.entity';
import { AuthModule } from '../authentication/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([
    Routine,
    Circuit,
    RoutineCircuit,
    RoutineExercise,
    ExerciseSet,
    RoutineExerciseSetFinished,
    UserRoutine,
  ]), AuthModule],
  controllers: [RoutineController],
  providers: [RoutineService]
})
export class RoutineModule {}
```

Sin este paso las entidades nuevas no se registran: `app.module.ts` usa `autoLoadEntities: true`, que solo toma las declaradas en algún `forFeature`.

- [ ] **Step 2: Compilar**

Run: `npm --prefix power-app run build`
Expected: termina sin errores (`webpack`/`tsc` sin output de error, exit code 0).

Si falla con `Property 'circuits' does not exist`, quedó algún consumidor de la relación vieja: buscarlo con `grep -rn "\.circuits" power-app/src --include=*.ts` y reapuntarlo a `routineCircuits`.

---

### Task 6: Actualizar `ddl.py` y regenerar los `.sql`

**Files:**
- Modify: `Db Creator/ddl.py`
- Regenerate: `Db Creator/01_estructura.sql`

Todo el DDL vive dentro del string `DDL = r"""..."""` de `ddl.py`. Los cuatro pasos siguientes son ediciones de texto dentro de ese string.

- [ ] **Step 1: Mover y reescribir `Circuit`**

Primero **borrar** el bloque viejo completo (está entre `User_Planification` y el header de segundo nivel):

```sql
-- Circuit ahora tiene FK a Routine
CREATE TABLE public."Circuit" (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id  UUID         NOT NULL,
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_circuit_routine
        FOREIGN KEY (routine_id) REFERENCES public."Routine"(id) ON DELETE CASCADE
);

CREATE INDEX idx_circuit_routine_id ON public."Circuit"(routine_id);
```

Después, en el bloque `TABLAS SIN DEPENDENCIAS`, insertar el `Circuit` nuevo **justo antes** de `CREATE TABLE public."Routine" (`:

```sql
-- Circuit es una pieza global reutilizable: no depende de Routine
CREATE TABLE public."Circuit" (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(100),
    type        VARCHAR(30)  NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circuit_active ON public."Circuit"(active);
CREATE INDEX idx_circuit_type   ON public."Circuit"(type);

```

Los dos índices sirven a CU-E-21, que lista circuitos activos y filtra por `type`.

- [ ] **Step 2: Agregar `Routine_Circuit`**

En el lugar donde estaba el `Circuit` viejo (bloque `TABLAS CON DEPENDENCIAS DE PRIMER NIVEL`, después de `User_Planification`), insertar:

```sql
-- Vinculo M:N Routine <-> Circuit. Sin unique: un circuito puede repetirse en la rutina
CREATE TABLE public."Routine_Circuit" (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id  UUID        NOT NULL,
    circuit_id  UUID        NOT NULL,
    "order"     INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_routine_circuit_routine
        FOREIGN KEY (routine_id) REFERENCES public."Routine"(id) ON DELETE CASCADE,
    CONSTRAINT fk_routine_circuit_circuit
        FOREIGN KEY (circuit_id) REFERENCES public."Circuit"(id) ON DELETE RESTRICT
);

CREATE INDEX idx_routine_circuit_routine_id ON public."Routine_Circuit"(routine_id, "order");
CREATE INDEX idx_routine_circuit_circuit_id ON public."Routine_Circuit"(circuit_id);
```

- [ ] **Step 3: Sacar `user_note` y `finished` de `Routine_Exercise`**

Dentro de `CREATE TABLE public."Routine_Exercise" (`, borrar estas dos líneas:

```sql
    user_note       VARCHAR(100),
    finished        BOOLEAN      NOT NULL DEFAULT false,
```

El resto de la tabla (incluido `coach_note`) queda igual.

- [ ] **Step 4: Agregar `Routine_Exercise_Set_Finished`**

Al final del bloque de tercer nivel, **después** de los dos `CREATE INDEX` de `Exercise_Set` y **antes** del header `TABLA DE OTRO PROYECTO`, insertar:

```sql

-- =============================================================
--  TABLAS CON DEPENDENCIAS DE CUARTO NIVEL
-- =============================================================

-- La existencia de la fila = ese set esta hecho en esa instancia de rutina
CREATE TABLE public."Routine_Exercise_Set_Finished" (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_routine_id         UUID        NOT NULL,
    routine_exercise_set_id UUID        NOT NULL,
    user_note               VARCHAR(100),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_resf_user_routine
        FOREIGN KEY (user_routine_id)         REFERENCES public."User_Routine"(id) ON DELETE CASCADE,
    CONSTRAINT fk_resf_exercise_set
        FOREIGN KEY (routine_exercise_set_id) REFERENCES public."Exercise_Set"(id)  ON DELETE CASCADE,
    CONSTRAINT uk_resf_user_routine_set UNIQUE (user_routine_id, routine_exercise_set_id)
);

CREATE INDEX idx_resf_user_routine_id ON public."Routine_Exercise_Set_Finished"(user_routine_id);
```

El nombre de la constraint unique (`uk_resf_user_routine_set`) tiene que coincidir con el `@Unique(...)` de la Tarea 4.

- [ ] **Step 5: Regenerar los `.sql`**

Run: `python build_sql.py` parado en `Db Creator/`

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && python build_sql.py
```

Expected: imprime `Generado: 01_estructura.sql ...`, `02_datos_estaticos.sql`, `03_datos_dinamicos.sql` y el resumen de conteos.

- [ ] **Step 6: Verificar que solo cambió `01`**

Run: `git status --short "Db Creator"`
Expected: exactamente dos archivos modificados — `Db Creator/ddl.py` y `Db Creator/01_estructura.sql`. Si aparecen `02_datos_estaticos.sql` o `03_datos_dinamicos.sql`, algún generador sí tocaba estas tablas: frenar y revisar antes de seguir.

---

### Task 7: Verificación cruzada entidades ↔ DDL

**Files:**
- Create (temporal, fuera del repo): `C:\Users\caram\AppData\Local\Temp\claude\D--Power-App-Backend-PowerApp-Backend\61c28e19-62cd-4d4f-aee4-e7c6f14d65f6\scratchpad\check_schema.py`

Reemplaza a los tests: compara las columnas declaradas en las entidades contra las del DDL generado, para las cinco tablas tocadas.

- [ ] **Step 1: Escribir el script**

```python
# -*- coding: utf-8 -*-
import os, re

ENT_DIR = r"D:/Power App/Backend/PowerApp-Backend/power-app/src/entities"
SQL_FILE = r"D:/Power App/Backend/PowerApp-Backend/Db Creator/01_estructura.sql"
TABLES = ["Circuit", "Routine_Circuit", "Routine_Exercise",
          "Exercise_Set", "Routine_Exercise_Set_Finished"]

def entity_columns():
    out = {}
    for f in os.listdir(ENT_DIR):
        if not f.endswith(".entity.ts"):
            continue
        s = open(os.path.join(ENT_DIR, f), encoding="utf-8").read()
        m = re.search(r"@Entity\('([^']+)'\)", s)
        if not m:
            continue
        cols = re.findall(r"@(?:Column|PrimaryGeneratedColumn)\([^\n]*\)\s*\n\s*([A-Za-z_]+)\??!?\s*:", s)
        out[m.group(1)] = cols
    return out

def sql_columns():
    s = open(SQL_FILE, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r'CREATE TABLE public\."([^"]+)" \((.*?)\n\);', s, re.S):
        cols = []
        for line in m.group(2).splitlines():
            line = line.strip()
            if not line or line.startswith("CONSTRAINT") or line.startswith("FOREIGN KEY"):
                continue
            name = line.split()[0].strip('"')
            cols.append(name)
        out[m.group(1)] = cols
    return out

ents, sqls = entity_columns(), sql_columns()
ok = True
for t in TABLES:
    e, q = set(ents.get(t, [])), set(sqls.get(t, []))
    if not e:
        print("FALTA entidad para", t); ok = False; continue
    if not q:
        print("FALTA tabla en el DDL:", t); ok = False; continue
    if e != q:
        ok = False
        print("DIFF en", t)
        print("   solo en entidad:", sorted(e - q))
        print("   solo en DDL    :", sorted(q - e))
    else:
        print("OK", t, "(%d columnas)" % len(e))
print("\nRESULTADO:", "TODO EN SYNC" if ok else "HAY DIFERENCIAS")
```

- [ ] **Step 2: Correrlo**

```bash
python "C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/61c28e19-62cd-4d4f-aee4-e7c6f14d65f6/scratchpad/check_schema.py"
```

Expected:

```
OK Circuit (7 columnas)
OK Routine_Circuit (6 columnas)
OK Routine_Exercise (7 columnas)
OK Exercise_Set (14 columnas)
OK Routine_Exercise_Set_Finished (6 columnas)

RESULTADO: TODO EN SYNC
```

Si sale `HAY DIFERENCIAS`, corregir el lado que esté mal (entidad o `ddl.py`) y volver a correr. Recordar que si el arreglo es en `ddl.py` hay que regenerar con `python build_sql.py` antes de reintentar.

- [ ] **Step 3: Build final**

Run: `npm --prefix power-app run build`
Expected: exit code 0, sin errores.

---

### Task 8: Actualizar los artefactos de `Status/`

**Files:**
- Modify: `Status/estado-implementacion-CU.md`
- Modify: `Status/dashboard-estado-CU.html`

Regla de mantenimiento del proyecto: todo cambio de estructura de entidades actualiza Status en el mismo cambio. **Ningún CU cambia de estado** — esto es solo modelo, no hay endpoints nuevos. Los conteos quedan igual (47 ✅ · 1 🟡 · 14 🔵 · 10 ⬜).

- [ ] **Step 1: Agregar una sección "Cambios recientes (2026-08-19)" al informe**

Va **arriba** de la sección `## Cambios recientes (2026-08-18)` (hoy en `Status/estado-implementacion-CU.md:27`):

```markdown
## Cambios recientes (2026-08-19)

Alineación de las entidades con el modelo vigente de `Doc/` (spec: `Doc/specs/2026-08-19-ajuste-modelo-circuitos-design.md`). Sin endpoints nuevos: ningún CU cambia de estado.

- `Circuit` pasa a pieza global reutilizable: se va `routine_id`, entran `description` (100), `type` (30) y `active`.
- Nueva `Routine_Circuit` (join M:N con `order`, sin unique sobre el par: un circuito puede repetirse en la rutina).
- `Routine_Exercise` pierde `finished` y `user_note` (estado per-usuario).
- Nueva `Routine_Exercise_Set_Finished` (`user_routine_id` + `routine_exercise_set_id` → `Exercise_Set.id`, `user_note`, unique del par). Habilita CU-U-12, que sigue ⬜ hasta tener endpoints.
- `Db Creator/ddl.py` + `01_estructura.sql` regenerados; `02`/`03` sin cambios. **Requiere regenerar la base.**
```

- [ ] **Step 2: Actualizar las dos menciones al desvío de modelo, que ya no aplica**

Son dos lugares concretos del informe:

**a)** En `## Próximas semanas` (hoy `Status/estado-implementacion-CU.md:104`), el "Riesgo abierto (18/8)" termina diciendo que arrancar Circuitos exige resolver antes el desvío `Circuit.routine_id` vs `Routine_Circuit`. Reemplazar esa última oración por:

```markdown
> **Actualización (19/8):** el desvío de modelo quedó resuelto — las entidades ya siguen el modelo de `Doc/` (`Circuit` reutilizable + `Routine_Circuit`). Falta **regenerar la base** para que el schema exista en Postgres, y escribir los CRUD de E-21→E-24.
```

**b)** En la fila del **21/8** de la tabla de cronograma (hoy `Status/estado-implementacion-CU.md:98`), donde dice crear el módulo `Circuit` desde cero *(entidad, módulo, controller, service)*, sacar "entidad" de esa lista: ya está hecha. Queda módulo, controller y service.

El hallazgo 3 (`Status/estado-implementacion-CU.md:83`, "no existe el módulo de Circuitos") y las notas "sin módulo Circuit" de las filas E-21→E-24 **siguen siendo ciertas** — no se tocan.

- [ ] **Step 3: Reflejar lo mismo en el dashboard**

Abrir `Status/dashboard-estado-CU.html` y replicar la entrada de cambios recientes y el ajuste de hallazgos. Los conteos y las tarjetas de CU no se tocan.

- [ ] **Step 4: Verificar que el dashboard no quedó roto**

Run: `grep -c "2026-08-19" Status/dashboard-estado-CU.html`
Expected: al menos 1.

---

### Task 9: Dejar todo stageado

**Files:** ninguno nuevo.

- [ ] **Step 1: Stagear los cambios**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/entities power-app/src/routine/routine.module.ts "Db Creator/ddl.py" "Db Creator/01_estructura.sql" Status Doc/specs Doc/plans
```

- [ ] **Step 2: Revisar qué quedó stageado**

Run: `git status --short`
Expected: los 6 archivos de código/scripts + los 2 de Status + spec y plan. **No** deben aparecer `02_datos_estaticos.sql` ni `03_datos_dinamicos.sql` como modificados.

- [ ] **Step 3: Sugerir el mensaje de commit al usuario**

No commitear. Pasarle este mensaje para que lo valide:

```
ajuste de modelo: Circuit reutilizable + Routine_Circuit + Routine_Exercise_Set_Finished
```

---

## Después de este plan

Con el modelo alineado quedan habilitados, en este orden:

1. **CU-E-21 → CU-E-24** — CRUD de circuitos dentro del módulo `routine` (el bloque que vence el 21/8).
2. **CU-E-15 → CU-E-18** — ensamblado de rutinas sobre `Routine_Circuit` (bloque del 28/8).
3. **CU-U-12** — endpoints de marcar/desmarcar set, que ya tienen entidad y diseño (`Doc/specs/2026-08-10-routine-exercise-set-finished-design.md`).

Y queda pendiente, fuera de este plan: **regenerar la base** cuando haya una instancia nueva, corriendo `01_estructura.sql` → `02_datos_estaticos.sql` → `03_datos_dinamicos.sql`.
