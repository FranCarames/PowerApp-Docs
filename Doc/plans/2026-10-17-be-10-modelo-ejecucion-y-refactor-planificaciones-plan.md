# BE-10 + BE-10b — Modelo de ejecución y refactor de planificaciones · Plan de implementación

> **Para quien ejecute este plan:** usar `superpowers:executing-plans`, **en esta misma sesión y sin subagentes** (el usuario no los pidió). Los pasos usan casillas (`- [ ]`) para ir tildando.
>
> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Donde la skill dice "commit", acá se hace `git add` y se propone el mensaje (Tarea 13).
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build más **scripts descartables en el scratchpad**, que no entran a ningún repo.
> 3. **No se levanta el server.** Ni siquiera en segundo plano.

> **Registro de ejecución (17/10):** plan aprobado con la fusión de BE-10 y BE-10b, **sin PGlite** (decisión del usuario: no instalar nada). Qué cambió en la ejecución respecto de lo escrito abajo:
> - **Tarea 1** (instalar PGlite): no se hizo.
> - **Tarea 9a:** `compare-ddl.js` lee el texto de los `CREATE TABLE` del `01` en vez del catálogo de un Postgres. Mismas comparaciones (nombres, tipos, nulabilidad, únicos y reglas de borrado de las FK) contra los metadatos de TypeORM.
> - **Tarea 9b** (ejecutar el patch): **no se corrió.** Se reemplazó por `patch-static.py`, un control estático (el patch agrega textualmente lo que dice el `01`, cubre con un `DROP` todo lo que el `01` quitó, las guardas van primero). No prueba la semántica del SQL.
> - **Tarea 10c:** el SQL que arma el service se genera sin conectarse y se verifica como texto; no se ejecuta.
> - **Tarea 9c** (el `01` contra el diagrama de `Doc/`) se hizo tal cual, sin cambios.

**Spec que manda:** [`2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md`](../specs/2026-10-17-rutina-individual-y-refactor-de-planificaciones-design.md), §2, §3, §5, §9, §10 y §12. **Diagrama:** `Doc/PowerApp - Modelo DB.pdf` / `.svg` (validado contra la spec el 17/10).
**Modelo contra el que se sincroniza (el último cargado en `Doc/`):** `PowerApp - Modelo DB.svg`, última modificación 17/10 16:26, sha256 `135ca4b6fb646a72dad03516627afa76d9ef07b6d017694ece564e7089cc7ede` (el `.pdf` es del mismo minuto, sha256 `5af42a0b…0a2`). El plan **lo compara contra el DDL de forma mecánica** (§3b y Tarea 9c) y no sólo contra la spec. Si el diagrama cambia antes de implementar, el paso 4 de la Tarea 0 lo detecta.
**Roadmap:** [`2026-10-16-roadmap-backend.md`](2026-10-16-roadmap-backend.md). Donde contradice a la spec (DA1 a DA6, BE-10 a BE-16), manda la spec.

**Goal:** dejar el esquema, las entidades y el código de planificaciones en el modelo del 17/10: ejecución propia para cada vía de asignación, `User_Routine` eliminada, y planificaciones armadas por semanas.

**Architecture:** una sola entrega que cambia las entidades TypeORM, `Db Creator` (`ddl.py` → `01`, más un patch idempotente) y el service/DTOs/Swagger de `planification/`. Las dos mitades se verifican por separado (esquema contra entidades; reglas del service con repositorios falsos), pero **compilan y se entregan juntas**.

**Tech Stack:** NestJS + TypeORM (Postgres) · Python 3 (`py`, sin librerías) para `Db Creator` · scripts de Node en el scratchpad · `@electric-sql/pglite` (Postgres en memoria, **sólo** en el scratchpad) para probar el DDL y el patch.

---

## 0. La decisión: ¿BE-10 sola o junto con BE-10b?

**El hallazgo, verificado en el código de hoy:** BE-10 sola **no compila** y, aunque se la forzara a compilar, **rompería E-12 en Render**.

| Dónde | Qué pasa con las entidades nuevas |
|---|---|
| `planification.service.ts:117` y `:159` | `duration` pasa de `string \| null` a `number`: `createPlanificationDto.duration ?? null` no compila |
| `planification.service.ts:517` | La respuesta mandaría `duration` como número, y el DTO de Swagger dice `string` |
| `planification.service.ts:365` y `:413` | `asignacion.order = null`: `order` pasa a `number` NOT NULL, no compila |
| `planification.service.ts:239-247`, `:308-318` | Aun parchado para compilar, el alta inserta sin `week` y la base responde **NOT NULL violation → 500**: las rutinas dejarían de poder asignarse a un plan |

Son exactamente las líneas que reescribe BE-10b (spec §5).

| Opción | Qué es | A favor | En contra |
|---|---|---|---|
| **A. Fusionar BE-10 + BE-10b (recomendada)** | Un solo plan, una sola entrega. Esquema, entidades, `Db Creator`, patch **y** el refactor de `planification/` | Todo compila y funciona a la vez. El web recibe el contrato nuevo **una sola vez** (D14). El código que corre contra el esquema nuevo es el definitivo, y la base de Render se regenera una vez (BE-23). No hay trabajo descartable | La entrega es más grande (≈ 8 h en vez de 4) y toca más archivos para revisar |
| B. BE-10 con un parche mínimo de compilación en el service, BE-10b después | El service se adapta lo justo (`duration` numérico, sin `order = null`, `week = 1` fijo) | Entrega más chica | Código **descartable** que BE-10b reescribe. Mientras tanto E-12a/b escribirían **todo en la semana 1**, datos falsos en una base compartida. El web vería el contrato cambiar dos veces. Dos pasadas por las mismas líneas |
| C. Dos commits del mismo trabajo (modelo / refactor) | Misma sesión que A, pero el stage se parte | Revisión por partes | El primer commit **no compila solo** (rompe bisect). `CLAUDE.md` pide `Db Creator` y entidades en el mismo movimiento |

**Recomendación: A.** El costo extra es el que ya estaba en la spec (BE-10b son 4 h aparte); lo único que se evita es hacer dos veces el service. Para que la revisión sea llevadera, el plan separa las dos mitades en tareas distintas, y el stage va **un commit por repo** (backend y PowerApp-Docs).

---

## 1. Hallazgos al preparar el plan (lo que la spec no dice)

1. **`editCircuit` ignora la tabla nueva y rompería el invariante de E-23 (`routine.service.ts:566-583`).** Hoy decide "baja lógica o física" de un `Routine_Exercise` mirando **sólo** `Routine_Exercise_Finished`. Con la tabla nueva `Routine_Asign_Exercise_Finished` (FK `RESTRICT` a `Routine_Exercise`), un ejercicio que un alumno hizo por la vía individual **parecería sin historial**: el service intentaría borrarlo y la base respondería un error de FK (500). Además, A-06 (`exercise.service.ts:285-299`) se apoya en que *"una fila inactiva de `Routine_Exercise` sólo existe si alguien ya la completó"*. **La spec (§3) dice que ningún service toca `User_Routine`, y es cierto, pero no menciona este caso.** Se corrige acá (Tarea 3): `editCircuit` consulta las dos tablas de "hecho".
2. **Comentarios que nombran `User_Routine`** en `routine.service.ts:825` y `:921` quedarían falsos. Se reescriben (Tarea 3).
3. **Idempotencia del patch.** Después de aplicarlo, `Routine_Asignation_User` va a tener filas (E-19), así que una guarda ingenua del tipo "abortar si tiene filas" **abortaría al re-correrlo**. Cada guarda se activa sólo si la tabla todavía tiene la *forma vieja* (la columna vieja existe). Y `User_Routine` se cuenta sólo si existe.
4. **La conversión de `duration` no convierte unidades.** "toma el primer número del texto" (spec §3) convierte `'3 meses'` en `3` **semanas**. Es lo que dice la spec; queda anotado en el patch y en el Status, junto con una consulta para revisar antes de aplicarlo.
5. **`LEAST` ignora los `NULL` en Postgres.** `LEAST(NULL, 2147483647)` devuelve `2147483647`, no `NULL`: el `COALESCE` tiene que ir **adentro** del `LEAST`. Se prueba en el patch (Tarea 9).
6. **`User_Planification.number_of_routines` a NOT NULL** puede chocar con filas existentes. Ningún endpoint escribe esa tabla, pero el patch lo contempla: completa desde la plantilla (DB3-a) y, si no puede, aborta **antes de tocar nada**.
7. **`Routine_Asignation_User.date` se tipa `string`, no `Date`.** TypeORM hidrata una columna `date` como `'YYYY-MM-DD'` (BE-05 lo verificó con `User_RM`), y la spec §4 trabaja con días sin hora. Los `date` viejos del proyecto están tipados `Date`; esos no se tocan.
8. **Tope técnico para `duration` y `week`.** La spec pide enteros `≥ 0` / `≥ 1`, sin máximo; un valor mayor que `2147483647` daría un 500 por "integer out of range" (la misma clase de bug que BE-31 lista para otros campos). Se agrega `@Max(2147483647)`: **un tope técnico, no de dominio**. Si el producto fija uno, se baja ahí.
9. **Índices que la spec no define** (decisión mía, se pueden vetar): `idx_rau_user_date (user_id, date)` para el listado por alumno y rango de fechas (BE-12, BE-16); `idx_raef_routine_exercise_id` e `idx_ref_routine_asignation_id`, que repiten lo que ya hace `idx_ref_routine_exercise_id` (la FK `RESTRICT` se chequea contra esa columna al borrar). Los únicos ya cubren el prefijo de las otras FK.
10. **Reactivar una asignación que ya estaba activa**, mandando `week` u `order`, la **mueve** (hoy la manda al final). La spec no lo prohíbe; se conserva esa tolerancia.

---

## 2. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `power-app/src/entities/user_routine.entity.ts` | **Se borra** |
| `power-app/src/entities/routine_asign_exercise_finished.entity.ts` | **Nuevo** |
| `power-app/src/entities/routine_asignation_user.entity.ts` | − `routine_asignation_id`, − `order`, + `date`, + único |
| `power-app/src/entities/routine_exercise_finished.entity.ts` | − `user_routine_id`, + `user_planification_id`, + `routine_asignation_id`, nuevo único |
| `power-app/src/entities/routine_asignation.entity.ts` | + `week`, `order` NOT NULL, − relaciones inversas a `UserRoutine` y a `RoutineAsignationUser` |
| `power-app/src/entities/planification.entity.ts` | `duration`: `varchar` nullable → `integer` NOT NULL |
| `power-app/src/entities/user_planification.entity.ts` | − `duration`, − `end_date`, `number_of_routines` NOT NULL |
| `power-app/src/planification/planification.module.ts`, `routine/routine.module.ts` | Sin `UserRoutine`; el módulo de rutinas suma la entidad nueva |
| `power-app/src/routine/routine.service.ts` | `editCircuit` consulta las dos tablas de "hecho"; dos comentarios |
| `power-app/src/dtos/planification/planification_limits.ts` | **Nuevo:** `INTEGER_MAX` |
| `power-app/src/dtos/planification/create_planification.dto.ts` (y `edit_…`, que lo extiende) | `duration` entero ≥ 0, obligatorio |
| `…/assign_routine_to_planification.dto.ts`, `assign_routines_to_planification.dto.ts` | `week` obligatoria |
| `…/set_routine_asignation_active.dto.ts` | `week` opcional; descripciones |
| `…/planification_list_item_response.dto.ts`, `planification_detail_response.dto.ts` | `duration` numérica; `week` |
| `power-app/src/planification/planification.service.ts` | El refactor de §5 de la spec |
| `power-app/src/planification/planification.controller.ts` | Códigos de error en el Swagger |
| `Db Creator/ddl.py` y `Db Creator/01_estructura.sql` (regenerado) | El esquema nuevo |
| `Db Creator/patches/2026-10-17-be-10.sql` | **Nuevo:** patch idempotente |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | Entrada del 17/10 y notas |

`Db Creator/02_datos_estaticos.sql` y `03_datos_dinamicos.sql` **no cambian** (se comprueba con hashes).

**Docs (`D:\Power App\Docs\PowerApp-Docs`)**: este plan, y las specs `Use Cases/entrenador/CU-E-09`, `CU-E-10`, `CU-E-12`, `CU-E-12a`, `CU-E-12b`, `CU-E-12c`, `CU-E-12d`. (E-13, E-14, E-06, U-08, U-09 las reescriben sus tareas: BE-17, BE-16, BE-12, BE-13.)

**Scratchpad** (`…\scratchpad\be10\`, fuera de los repos): `fixtures`, `compare-ddl.js`, `patch-test.js`, `rules-planification.js`, `dto-check.js`, `sql-check.js`.

---

## 3. Cobertura de la spec

| Spec | Qué pide | Tarea |
|---|---|---|
| §3 `Routine_Asignation_User` | − 2 columnas, + `date`, único | 2, 4, 5 |
| §3 `Routine_Asign_Exercise_Finished` | tabla nueva, FK `RESTRICT`, único | 2, 4, 5 |
| §3 `Routine_Exercise_Finished` | − `user_routine_id`, + 2 FK `RESTRICT`, único de las tres | 2, 4, 5 |
| §3 `User_Routine` | se elimina (entidad, `forFeature`, relación) | 2, 3, 4, 5 |
| §3 `Routine_Asignation` | + `week`, `order` NOT NULL | 2, 4, 5 |
| §3 `Planification.duration` | texto → entero NOT NULL | 2, 4, 5 |
| §3 `User_Planification` | − `duration`, − `end_date`, `number_of_routines` NOT NULL | 2, 4, 5 |
| §3 `Db Creator` | `ddl.py`, `01` regenerado, `02`/`03` sin cambios, patch | 4, 5, 9 |
| §5.1 crear y editar | `duration` entero ≥ 0 obligatorio; 400 al achicar | 6, 7, 10 |
| §5.2 listado y detalle | `duration` numérico, `week`, orden `week/order/created_at` | 6, 7, 10 |
| §5.3 asignar | `week` obligatoria y acotada; `order` por semana | 6, 7, 10 |
| §5.4 lote | una semana por lote | 6, 7, 10 |
| §5.5 y §5.6 quitar / reincorporar | la baja conserva el lugar; `week`/`order` al reincorporar | 6, 7, 10 |
| §7 specs de CU | E-09, E-10, E-12a a E-12d | 11 |
| §10 verificación | build · regeneración · SQL · reglas | 8, 9, 10 |
| **No está en la spec** | `editCircuit` con las dos tablas (hallazgo 1) | 3 |

---

## 3b. Sincronía con el modelo de `Doc/` (verificada el 17/10, antes de implementar)

Se leyó el texto del `.svg` vigente (20 tablas) y se lo comparó con el DDL de HEAD (20 tablas): columnas, tipos y `NOT NULL`. En las FK el diagrama no dibuja la nulabilidad, así que ahí sólo se compara que la columna exista. El comparador es el de la Tarea 9c.

| Resultado | Diferencias | Qué pasa con ellas |
|---|---|---|
| **15 diferencias que este plan resuelve** | `Planification.duration` (tipo y `NOT NULL`) · `Routine_Asignation.week` y `.order` NOT NULL · `Routine_Asignation_User` (+`date`, −`order`, −`routine_asignation_id`) · `Routine_Asign_Exercise_Finished` (tabla nueva) · `Routine_Exercise_Finished` (+`user_planification_id`, +`routine_asignation_id`, −`user_routine_id`) · `User_Planification` (−`duration`, −`end_date`, `number_of_routines` NOT NULL) · `User_Routine` (tabla de más) | Tareas 2 a 5. **Al terminar, la Tarea 9c tiene que dar 0 diferencias nuevas** |
| **3 desalineaciones previas del dibujo** | `User.role` (el dibujo dice `Varchar(150)`, el código usa el enum `User_role_enum`) · `User.profile_picture` (`Varchar(10)` en el dibujo, `VARCHAR(150)` en el DDL) · `User.email` (el dibujo no marca el `NOT NULL`, que sí tiene) | **No se tocan.** Están anotadas como desvíos conocidos desde antes (memoria del proyecto) y no son de este cambio. Si querés alinearlas, es una tarea aparte: cambiaría el tipo de `User.role` en la base |
| **Nada más** | Las 17 tablas restantes coinciden con el diagrama, incluidas `Exercise_Set.amrap`/`amrap_time`/`rm`, `Membership.active` y `User.active`/`email_verified`/`phone_verified` | — |

Lo que **no** se puede comparar mecánicamente: los `UNIQUE`, los índices y las reglas de borrado de las FK, que el diagrama no dibuja (los define la spec §3). Esos se verifican contra las entidades en la Tarea 9a.

---

## Tarea 0 — Línea de base

**Archivos:** ninguno (sólo lectura y copias al scratchpad).

- [ ] **Paso 1: partir de un árbol limpio y un build verde**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git status --short && npm --prefix power-app run build
```
Esperado: `git status` sin salida y el build sin errores.

> **Nota de shell:** el shell no conserva variables entre comandos. Cada bloque que usa `$SCRATCH` empieza redefiniéndola:
> `SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c6699336-c851-47d6-8ce5-57d1232610c2/scratchpad/be10"`

- [ ] **Paso 2: guardar la línea de base** (el `dist` de HEAD y el `01` de HEAD, para comparar "antes vs después" y para probar el patch)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c6699336-c851-47d6-8ce5-57d1232610c2/scratchpad/be10"
mkdir -p "$SCRATCH" && cd "D:/Power App/Backend/PowerApp-Backend"
cp -r power-app/dist "$SCRATCH/baseline-dist"
git show HEAD:"Db Creator/01_estructura.sql" > "$SCRATCH/baseline-01.sql"
cd "Db Creator" && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql | tee "$SCRATCH/baseline-hashes.txt"
```

- [ ] **Paso 3: comprobar que HEAD regenera byte-idéntico** (si no, hay una divergencia previa y hay que saberlo antes de seguir)

```bash
SCRATCH="C:/Users/caram/AppData/Local/Temp/claude/D--Power-App-Backend-PowerApp-Backend/c6699336-c851-47d6-8ce5-57d1232610c2/scratchpad/be10"
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && py build_sql.py > /dev/null && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql | diff - "$SCRATCH/baseline-hashes.txt" && echo "BASELINE OK" ; git status --short
```
Esperado: `BASELINE OK` y `git status` sin salida. Si difiere, **parar y avisar**.

- [ ] **Paso 4: confirmar que el modelo de `Doc/` es el mismo contra el que se armó el plan**

```bash
cd "D:/Power App/Docs/PowerApp-Docs/Doc" && sha256sum "PowerApp - Modelo DB.svg" | grep -q 135ca4b6fb646a72dad03516627afa76d9ef07b6d017694ece564e7089cc7ede && echo "MODELO SIN CAMBIOS" || echo "EL DIAGRAMA CAMBIO"
```
Esperado: `MODELO SIN CAMBIOS`. Si dice `EL DIAGRAMA CAMBIO`, **parar**: correr el comparador de la Tarea 9c contra el `01` de HEAD, ver qué se movió y actualizar el plan antes de seguir.

---

## Tarea 1 — Herramienta de verificación (PGlite)

> **Necesita tu OK explícito (descarga):** `@electric-sql/pglite`, paquete de npm (Postgres compilado a WASM, ≈ 10 a 20 MB), desde el registro de npm, instalado **en el scratchpad** (`--prefix`), **no** en `power-app/` ni en ningún repo. Sin él no se puede ejecutar el patch ni el `01` contra un Postgres de verdad: la verificación quedaría reducida a leer el SQL, y lo diría así. Corre en memoria, no se conecta a ninguna base ni levanta nada.

- [ ] **Paso 1: instalar**

```bash
cd "$SCRATCH" && npm init -y > /dev/null && npm install @electric-sql/pglite
node -e "const {PGlite}=require('@electric-sql/pglite');(async()=>{const d=new PGlite();console.log((await d.query('select version() v')).rows[0].v)})()"
```
Esperado: imprime la versión de PostgreSQL. Anotar la versión instalada de `@electric-sql/pglite` para el Status.

- [ ] **Paso 2: escribir primero los scripts de reglas y de DTOs, y correrlos en rojo.** Se crean `dto-check.js` y `rules-planification.js` tal como figuran en la Tarea 10 (pasos 1 y 3) y se corren **ahora**, contra el `dist` de HEAD (todavía no se modificó nada ni se recompiló):

```bash
cd "$SCRATCH" && node dto-check.js; node rules-planification.js
```
Esperado: **muchas `FALLA`** (HEAD acepta `duration` como texto, rechaza `week` por `forbidNonWhitelisted`, no limita semanas, borra el `order` en la baja). Si algo da `OK` por casualidad, revisar que la prueba no sea trivial. Es la prueba roja: confirma que los scripts miden lo que cambia.

---

## Tarea 2 — Entidades (modelo, spec §3)

**Archivos:** ver el mapa. Estilo del repo: comentarios sin tildes, `@ApiProperty` en cada columna.

- [ ] **Paso 1: borrar `user_routine.entity.ts`**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/power-app/src/entities" && git rm -q user_routine.entity.ts
```

- [ ] **Paso 2: `routine_asignation_user.entity.ts`** (reemplazo completo)

```ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Routine } from './routine.entity';
import { User } from './user.entity';

// Asignacion individual: una rutina suelta para un alumno, un dia. Cada fila es una sesion
// con su propio registro de ejecucion (Routine_Asign_Exercise_Finished), asi que la misma
// rutina se puede asignar al mismo alumno en dias distintos, pero no dos veces el mismo dia
@Entity('Routine_Asignation_User')
@Unique('uk_rau_routine_user_date', ['routine_id', 'user_id', 'date'])
export class RoutineAsignationUser {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    routine_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    user_id!: string;

    // Dia sin hora. La columna es date y TypeORM la hidrata como 'YYYY-MM-DD' (string), no
    // como Date: se tipa string para que el tipo diga lo que de verdad llega
    @ApiProperty({ example: '2026-10-20', description: 'Día en que el alumno hace la rutina (sin hora)' })
    @Column({ type: 'date', nullable: false })
    date!: string;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at!: Date;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at!: Date;

    // JOIN RELATIONSHIPS
    // CASCADE en las dos, aunque nunca se dispara: la baja de la rutina y la del alumno son
    // logicas. Si algun dia se borrara fisicamente, el RESTRICT de Routine_Asign_Exercise_Finished
    // frena el borrado de una asignacion ya entrenada
    @ManyToOne(() => Routine, routine => routine.routineAsignationUsers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'routine_id' })
    routine!: Routine;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;
}
```

- [ ] **Paso 3: `routine_asign_exercise_finished.entity.ts`** (nuevo)

```ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoutineAsignationUser } from './routine_asignation_user.entity';
import { RoutineExercise } from './routine_exercise.entity';

// Gemela de Routine_Exercise_Finished para la via individual (D1, 17/10): la existencia de la
// fila = ese ejercicio esta hecho en esa asignacion. Misma logica y misma nota; lo unico que
// cambia es de que cuelga. El tildado serie por serie es del front y no toca la base
@Entity('Routine_Asign_Exercise_Finished')
@Unique('uk_raef_asign_exercise', ['user_routine_asign_id', 'routine_exercise_id'])
export class RoutineAsignExerciseFinished {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234', description: 'Id de la Routine_Asignation_User' })
    @Column({ type: 'uuid', nullable: false })
    user_routine_asign_id!: string;

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
    // RESTRICT en las dos, a proposito (D4): una asignacion ya entrenada no se borra, y la baja
    // fisica de un Routine_Exercise solo pasa cuando nadie lo completo
    @ManyToOne(() => RoutineAsignationUser, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'user_routine_asign_id' })
    routineAsignationUser!: RoutineAsignationUser;

    @ManyToOne(() => RoutineExercise, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'routine_exercise_id' })
    routineExercise!: RoutineExercise;
}
```

- [ ] **Paso 4: `routine_exercise_finished.entity.ts`** (reemplazo completo)

```ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserPlanification } from './user_planification.entity';
import { RoutineAsignation } from './routine_asignation.entity';
import { RoutineExercise } from './routine_exercise.entity';

// Via de la planificacion. La existencia de la fila = ese ejercicio esta hecho en esa rutina
// (routine_asignation_id) de esa asignacion del plan al alumno (user_planification_id). Cuelga
// directo de las dos: no hay instancia intermedia (D11, 17/10).
// El registro se crea al completar el ejercicio ENTERO: el tildado serie por serie es
// maquillaje del front y no toca la base.
// Consistencia que la base NO garantiza: la Routine_Asignation tiene que ser de la misma
// planificacion que la User_Planification. Con dos FK simples no se puede expresar; la valida
// el service al marcar (bloque B)
@Entity('Routine_Exercise_Finished')
@Unique('uk_ref_plan_asignation_exercise', ['user_planification_id', 'routine_asignation_id', 'routine_exercise_id'])
export class RoutineExerciseFinished {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    user_planification_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    routine_asignation_id!: string;

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
    // RESTRICT en las tres, a proposito: el historial no se pierde por una cascada. La baja
    // fisica de un Routine_Exercise solo pasa cuando nadie lo completo, asi que si una de estas
    // FK llega a frenar un delete es porque hay un bug en la reconciliacion. Preferimos el error
    // de la base antes que perder historial
    @ManyToOne(() => UserPlanification, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'user_planification_id' })
    userPlanification!: UserPlanification;

    @ManyToOne(() => RoutineAsignation, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'routine_asignation_id' })
    routineAsignation!: RoutineAsignation;

    @ManyToOne(() => RoutineExercise, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'routine_exercise_id' })
    routineExercise!: RoutineExercise;
}
```

- [ ] **Paso 5: `routine_asignation.entity.ts`** (reemplazo completo)

```ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Routine } from './routine.entity';
import { Planification } from './planification.entity';

@Entity('Routine_Asignation')
export class RoutineAsignation {
    @ApiProperty({ example: 'uuid-1234' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    routine_id!: string;

    @ApiProperty({ example: 'uuid-1234' })
    @Column({ type: 'uuid', nullable: false })
    planification_id!: string;

    // NOT NULL desde el 17/10 (D10): la baja logica solo apaga active y la rutina CONSERVA su
    // lugar, asi que ya no hay un order nulo que representar. Sigue siendo una etiqueta de
    // orden dentro de la semana, no una secuencia canonica: el alta persiste el order recibido
    // tal cual, asi que puede tener duplicados y huecos. El desempate lo pone la lectura, por
    // created_at
    @ApiProperty({ example: 1, description: 'Posición dentro de la semana. Etiqueta de orden: puede repetirse' })
    @Column({ type: 'integer', nullable: false })
    order!: number;

    // Semana del plan en la que va la rutina: 1..Planification.duration, o sin tope si la
    // duracion es 0. El rango lo valida el service
    @ApiProperty({ example: 1, minimum: 1, description: 'Semana del plan en la que va la rutina' })
    @Column({ type: 'integer', nullable: false })
    week!: number;

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
    @ManyToOne(() => Routine, routine => routine.routineAsignations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'routine_id' })
    routine!: Routine;

    @ManyToOne(() => Planification, planification => planification.routineAsignations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'planification_id' })
    planification!: Planification;
}
```

- [ ] **Paso 6: `planification.entity.ts`** — reemplazar el bloque de `duration`

```ts
    // Semanas. 0 = sin duracion fija; si es mayor que 0 limita la semana (week) de las rutinas
    // del plan a 1..duration. Obligatoria desde el 17/10 (D9): era texto libre ('12 semanas')
    @ApiProperty({ example: 12, minimum: 0, description: 'Duración en semanas. 0 = sin duración fija' })
    @Column({ type: 'integer', nullable: false })
    duration!: number;
```
(reemplaza `@ApiPropertyOptional({ example: '12 semanas', maxLength: 50 }) @Column({ type: 'varchar', length: 50, nullable: true }) duration?: string | null;`. El import `ApiPropertyOptional` sigue en uso por `name`, `description` y `type`.)

- [ ] **Paso 7: `user_planification.entity.ts`** — borrar `duration` y `end_date`, y pasar `number_of_routines`

```ts
    // Se copia de la plantilla al asignar (DB3-a). NOT NULL como en el diagrama
    @ApiProperty({ example: 3 })
    @Column({ type: 'integer', nullable: false })
    number_of_routines!: number;
```
(reemplaza el `@ApiPropertyOptional … number_of_routines?: number;`.) Se borran los bloques `@ApiPropertyOptional({ example: '8 semanas'… }) duration?: string;` y `@ApiProperty({ example: '2024-03-01' }) end_date!: Date;`. **Comentario a dejar encima de `start_date`:**

```ts
    // No hay end_date (D12, 17/10): el fin se calcula como start_date + las semanas de la
    // plantilla (Planification.duration). Editar la duracion de la plantilla mueve el fin de
    // todos los que la tienen asignada; con duracion 0 la asignacion no tiene fin
```

- [ ] **Paso 8: confirmar que ya no queda ninguna referencia a la entidad borrada fuera de lo que arregla la Tarea 3**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/power-app/src" && grep -rn "UserRoutine\|user_routine.entity" . 
```
Esperado: sólo `planification.module.ts` y `routine.module.ts` (los arregla la Tarea 3).

---

## Tarea 3 — Módulos, `editCircuit` y comentarios

**Archivos:** `planification.module.ts`, `routine.module.ts`, `routine.service.ts`.

- [ ] **Paso 1: `planification.module.ts`** — sacar `UserRoutine` del import y del `forFeature`:

```ts
import { RoutineAsignationUser } from '../entities/routine_asignation_user.entity';
import { AuthModule } from '../authentication/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([
    Planification,
    Routine,
    RoutineAsignation,
    UserPlanification,
    RoutineAsignationUser,
  ]), AuthModule],
```

- [ ] **Paso 2: `routine.module.ts`** — cambiar `UserRoutine` por la entidad nueva:

```ts
import { RoutineExerciseFinished } from '../entities/routine_exercise_finished.entity';
import { RoutineAsignExerciseFinished } from '../entities/routine_asign_exercise_finished.entity';
import { AuthModule } from '../authentication/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([
    Routine,
    Circuit,
    RoutineCircuit,
    RoutineExercise,
    ExerciseSet,
    RoutineExerciseFinished,
    RoutineAsignExerciseFinished,
  ]), AuthModule],
```

- [ ] **Paso 3: `routine.service.ts`, `editCircuit`** — importar la entidad nueva (junto a la línea 12) y reemplazar el bloque de las líneas 566-573:

```ts
import { RoutineAsignExerciseFinished } from '../entities/routine_asign_exercise_finished.entity';
```
```ts
            // Dos queries, una por tabla de "hecho" (la de las planificaciones y la de las
            // asignaciones individuales), y no una por ejercicio. Si CUALQUIERA tiene una fila,
            // el ejercicio no se borra fisicamente: A-06 se apoya en que un Routine_Exercise
            // inactivo solo existe si alguien lo completo, y las FK RESTRICT lo frenarian igual
            let conHistorial: string[] = [];
            if (salen.length > 0) {
                const salenIds = salen.map(routineExercise => routineExercise.id);
                const finishedEnPlan = await queryRunner.manager.find(RoutineExerciseFinished, {
                    where: { routine_exercise_id: In(salenIds) },
                    select: { routine_exercise_id: true },
                });
                const finishedIndividual = await queryRunner.manager.find(RoutineAsignExerciseFinished, {
                    where: { routine_exercise_id: In(salenIds) },
                    select: { routine_exercise_id: true },
                });
                conHistorial = [...finishedEnPlan, ...finishedIndividual].map(row => row.routine_exercise_id);
            }
```

- [ ] **Paso 4: los dos comentarios** (líneas 825 y 921)

En `buildRoutineDetailResponse`, reemplazar `(U-08/U-09 y el historial E-06/E-07) van a pasar los vinculos apagados de los que ese\n    // User_Routine tenga algun ejercicio en Routine_Exercise_Finished — mismo contrato…` por:

```ts
    // (U-08/U-09 y el historial E-06/E-07) van a pasar los vinculos apagados de los que esa
    // asignacion (del plan o individual) tenga algun ejercicio hecho — mismo contrato que
```
En `buildCircuitDetailResponse`, reemplazar `los que ese User_Routine tenga\n    // en Routine_Exercise_Finished:` por:

```ts
    // alumno (U-08/U-09/U-10 y el historial) van a pasar los que esa asignacion tenga hechos
    // (Routine_Exercise_Finished o Routine_Asign_Exercise_Finished):
```
(Se conserva el resto de cada comentario; sólo cambia la mención de `User_Routine`.)

---

## Tarea 4 — `Db Creator/ddl.py` y `01_estructura.sql`

**Archivos:** `Db Creator/ddl.py`. Ojo: hay líneas con tabuladores (`"order" \t\tINTEGER`); leer el archivo y copiar el texto exacto en cada `Edit`.

- [ ] **Paso 1: `Planification`** — `duration           VARCHAR(50),` → `duration           INTEGER     NOT NULL,`

- [ ] **Paso 2: `Routine_Asignation`** — reemplazar la columna `order` y sumar `week` (el `order` pasa a NOT NULL):

```sql
    "order"         INTEGER     NOT NULL,
    week            INTEGER     NOT NULL,
    active          BOOLEAN     NOT NULL DEFAULT true,
```

- [ ] **Paso 3: `User_Planification`** — `number_of_routines INTEGER NOT NULL`, y borrar `duration` y `end_date`:

```sql
CREATE TABLE public."User_Planification" (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL,
    coach_id           UUID,
    planification_id   UUID,
    description        TEXT,
    number_of_routines INTEGER      NOT NULL,
    type               VARCHAR(30),
    coach_note         VARCHAR(100),
    -- Sin end_date ni duration (D12): el fin se calcula como start_date + las semanas de
    -- Planification.duration
    start_date         DATE         NOT NULL,
    active             BOOLEAN      NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_planification_user
        FOREIGN KEY (user_id)          REFERENCES public."User"(id)          ON DELETE CASCADE,
    CONSTRAINT fk_user_planification_coach
        FOREIGN KEY (coach_id)         REFERENCES public."Coach"(id)         ON DELETE SET NULL,
    CONSTRAINT fk_user_planification_planification
        FOREIGN KEY (planification_id) REFERENCES public."Planification"(id) ON DELETE SET NULL
);
```

- [ ] **Paso 4: `Routine_Asignation_User`** y borrar `User_Routine` (ambas están en "SEGUNDO NIVEL"):

```sql
-- Asignacion individual: una rutina suelta para un alumno, un dia. Cada fila es una sesion
CREATE TABLE public."Routine_Asignation_User" (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id  UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    date        DATE        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_routine_asignation_user_routine
        FOREIGN KEY (routine_id) REFERENCES public."Routine"(id) ON DELETE CASCADE,
    CONSTRAINT fk_routine_asignation_user_user
        FOREIGN KEY (user_id)    REFERENCES public."User"(id)    ON DELETE CASCADE,
    CONSTRAINT uk_rau_routine_user_date UNIQUE (routine_id, user_id, date)
);

CREATE INDEX idx_rau_user_date ON public."Routine_Asignation_User"(user_id, date);
```
Se elimina por completo el `CREATE TABLE public."User_Routine" (…);`.

- [ ] **Paso 5: la sección "CUARTO NIVEL"** (reemplaza el bloque de `Routine_Exercise_Finished`):

```sql
-- Via de la planificacion. La existencia de la fila = ese ejercicio esta hecho en esa rutina
-- de esa asignacion del plan al alumno. Cuelga directo de User_Planification y de
-- Routine_Asignation (no hay instancia intermedia). Todas las FK en RESTRICT: el historial
-- no se pierde por una cascada. La Routine_Asignation tiene que ser de la misma planificacion
-- que la User_Planification: con dos FK simples la base no lo puede expresar, lo valida el service
CREATE TABLE public."Routine_Exercise_Finished" (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_planification_id UUID        NOT NULL,
    routine_asignation_id UUID        NOT NULL,
    routine_exercise_id   UUID        NOT NULL,
    user_note             VARCHAR(100),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ref_user_planification
        FOREIGN KEY (user_planification_id) REFERENCES public."User_Planification"(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ref_routine_asignation
        FOREIGN KEY (routine_asignation_id) REFERENCES public."Routine_Asignation"(id) ON DELETE RESTRICT,
    -- RESTRICT a proposito: la baja fisica de un Routine_Exercise solo ocurre cuando no
    -- tiene historial, asi que si esta FK frena un delete es un bug de la reconciliacion
    CONSTRAINT fk_ref_routine_exercise
        FOREIGN KEY (routine_exercise_id)   REFERENCES public."Routine_Exercise"(id)   ON DELETE RESTRICT,
    CONSTRAINT uk_ref_plan_asignation_exercise
        UNIQUE (user_planification_id, routine_asignation_id, routine_exercise_id)
);

CREATE INDEX idx_ref_routine_asignation_id ON public."Routine_Exercise_Finished"(routine_asignation_id);
CREATE INDEX idx_ref_routine_exercise_id   ON public."Routine_Exercise_Finished"(routine_exercise_id);

-- Via individual (D1): misma logica que Routine_Exercise_Finished, colgando de la asignacion
-- individual. FK en RESTRICT: una asignacion ya entrenada no se borra (D4)
CREATE TABLE public."Routine_Asign_Exercise_Finished" (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_routine_asign_id UUID        NOT NULL,
    routine_exercise_id   UUID        NOT NULL,
    user_note             VARCHAR(100),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_raef_routine_asignation_user
        FOREIGN KEY (user_routine_asign_id) REFERENCES public."Routine_Asignation_User"(id) ON DELETE RESTRICT,
    CONSTRAINT fk_raef_routine_exercise
        FOREIGN KEY (routine_exercise_id)   REFERENCES public."Routine_Exercise"(id)        ON DELETE RESTRICT,
    CONSTRAINT uk_raef_asign_exercise UNIQUE (user_routine_asign_id, routine_exercise_id)
);

CREATE INDEX idx_raef_routine_exercise_id ON public."Routine_Asign_Exercise_Finished"(routine_exercise_id);
```
(El índice `idx_ref_user_routine_id` desaparece junto con la columna.)

- [ ] **Paso 6: regenerar dos veces y comprobar el determinismo y que `02`/`03` no cambian**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator"
py build_sql.py > /dev/null && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql > "$SCRATCH/run1.txt"
py build_sql.py > /dev/null && sha256sum 01_estructura.sql 02_datos_estaticos.sql 03_datos_dinamicos.sql > "$SCRATCH/run2.txt"
diff "$SCRATCH/run1.txt" "$SCRATCH/run2.txt" && echo "DOS CORRIDAS IDENTICAS"
diff <(grep -v 01_ "$SCRATCH/run2.txt") <(grep -v 01_ "$SCRATCH/baseline-hashes.txt") && echo "02 Y 03 SIN CAMBIOS"
grep -c "User_Routine\|user_routine" 01_estructura.sql ddl.py
```
Esperado: las dos primeras líneas de éxito; el `grep -c` da `0` en ambos. **Ojo con `grep -v 01_`:** el `02_` y el `03_` contienen `0` y `_`, pero no `01_`; el filtro sólo descarta la línea del `01`.

---

## Tarea 5 — El patch `Db Creator/patches/2026-10-17-be-10.sql`

Convenciones de los patches anteriores: `BEGIN`/`COMMIT`, cabecera con "QUE HACE", verificación comentada al final. Se agrega la **consulta previa** para revisar `duration`.

- [ ] **Paso 1: crear el archivo**

```sql
-- =============================================================
--  Patch 2026-10-17 - BE-10 (modelo de ejecucion y planificaciones por semanas)
--
--  Lleva una base YA CREADA al esquema nuevo, sin recrearla desde cero.
--  Equivale a los cambios que ddl.py metio en 01_estructura.sql.
--
--  QUE HACE
--    1. Routine_Asignation_User: borra routine_asignation_id y "order"; suma date NOT NULL
--       y UNIQUE (routine_id, user_id, date).
--    2. Crea Routine_Asign_Exercise_Finished (la ejecucion de la via individual).
--    3. Routine_Exercise_Finished: borra user_routine_id; suma user_planification_id y
--       routine_asignation_id (FK RESTRICT) y UNIQUE de las tres FK.
--    4. Borra User_Routine.
--    5. Routine_Asignation: suma week (las filas existentes quedan en la semana 1) y pasa
--       "order" a NOT NULL (las inactivas con order NULL van al final del plan).
--    6. Planification.duration: de VARCHAR(50) a INTEGER NOT NULL.
--    7. User_Planification: borra duration y end_date; number_of_routines a NOT NULL.
--
--  ABORTA, sin tocar nada, si:
--    - User_Routine, Routine_Exercise_Finished o Routine_Asignation_User tienen filas
--      (en su forma vieja). Ningun endpoint las escribe: si las tienen, alguien las lleno a
--      mano y hay que decidir que hacer con esos datos antes de borrar columnas y tablas.
--    - User_Planification tiene filas con number_of_routines NULL que no se pueden completar
--      desde la plantilla (planification_id NULL).
--
--  OJO con la conversion de Planification.duration: toma el PRIMER NUMERO del texto
--  ('12 semanas' -> 12; sin numero -> 0). NO convierte unidades: '3 meses' queda en 3 SEMANAS.
--  Antes de aplicarlo conviene revisar lo que hay:
--      SELECT id, name, duration FROM public."Planification" ORDER BY name;
--  y corregir a mano (en semanas) lo que no sea '<n> semanas'.
--
--  Es idempotente: correrlo dos veces no rompe nada, y las guardas solo miran la forma vieja
--  (despues del patch, Routine_Asignation_User se llena con E-19 y no debe abortar).
--  Correrlo con:  psql -v ON_ERROR_STOP=1 -f 2026-10-17-be-10.sql
--  Alternativa equivalente: recrear la base con 01 -> 02 -> 03.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 0. Guardas: abortan antes de cambiar nada
-- -------------------------------------------------------------
DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('public."User_Routine"') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public."User_Routine"' INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION 'Patch BE-10 abortado: User_Routine tiene % fila(s). Ningun endpoint la escribe; revisar de donde salieron antes de borrar la tabla.', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'Routine_Exercise_Finished'
                  AND column_name = 'user_routine_id') THEN
        EXECUTE 'SELECT COUNT(*) FROM public."Routine_Exercise_Finished"' INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION 'Patch BE-10 abortado: Routine_Exercise_Finished tiene % fila(s) con el esquema viejo (cuelgan de User_Routine). Revisar a mano.', n;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'Routine_Asignation_User'
                  AND column_name = 'routine_asignation_id') THEN
        EXECUTE 'SELECT COUNT(*) FROM public."Routine_Asignation_User"' INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION 'Patch BE-10 abortado: Routine_Asignation_User tiene % fila(s) con el esquema viejo (sin date). Revisar a mano.', n;
        END IF;
    END IF;

    SELECT COUNT(*) INTO n
      FROM public."User_Planification" up
      LEFT JOIN public."Planification" p ON p.id = up.planification_id
     WHERE up.number_of_routines IS NULL AND p.id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'Patch BE-10 abortado: User_Planification tiene % fila(s) con number_of_routines NULL y sin planificacion de la cual copiarlo.', n;
    END IF;
END $$;

-- -------------------------------------------------------------
-- 1. Routine_Asignation_User: una rutina para un dia
-- -------------------------------------------------------------
-- Borrar la columna arrastra su FK (fk_routine_asignation_user_asignation)
ALTER TABLE public."Routine_Asignation_User" DROP COLUMN IF EXISTS routine_asignation_id;
ALTER TABLE public."Routine_Asignation_User" DROP COLUMN IF EXISTS "order";
-- La tabla esta vacia en este punto (la guarda lo asegura), asi que NOT NULL sin default entra
ALTER TABLE public."Routine_Asignation_User" ADD COLUMN IF NOT EXISTS date DATE NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'uk_rau_routine_user_date'
                      AND conrelid = 'public."Routine_Asignation_User"'::regclass) THEN
        ALTER TABLE public."Routine_Asignation_User"
            ADD CONSTRAINT uk_rau_routine_user_date UNIQUE (routine_id, user_id, date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rau_user_date ON public."Routine_Asignation_User"(user_id, date);

-- -------------------------------------------------------------
-- 2. Ejecucion de la via individual
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Routine_Asign_Exercise_Finished" (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_routine_asign_id UUID        NOT NULL,
    routine_exercise_id   UUID        NOT NULL,
    user_note             VARCHAR(100),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_raef_routine_asignation_user
        FOREIGN KEY (user_routine_asign_id) REFERENCES public."Routine_Asignation_User"(id) ON DELETE RESTRICT,
    CONSTRAINT fk_raef_routine_exercise
        FOREIGN KEY (routine_exercise_id)   REFERENCES public."Routine_Exercise"(id)        ON DELETE RESTRICT,
    CONSTRAINT uk_raef_asign_exercise UNIQUE (user_routine_asign_id, routine_exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_raef_routine_exercise_id ON public."Routine_Asign_Exercise_Finished"(routine_exercise_id);

-- -------------------------------------------------------------
-- 3. Routine_Exercise_Finished cuelga directo del plan y de la rutina
-- -------------------------------------------------------------
-- Borrar la columna arrastra su FK, su UNIQUE y idx_ref_user_routine_id
ALTER TABLE public."Routine_Exercise_Finished" DROP COLUMN IF EXISTS user_routine_id;
-- Vacia en este punto (la guarda lo asegura)
ALTER TABLE public."Routine_Exercise_Finished" ADD COLUMN IF NOT EXISTS user_planification_id UUID NOT NULL;
ALTER TABLE public."Routine_Exercise_Finished" ADD COLUMN IF NOT EXISTS routine_asignation_id UUID NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_ref_user_planification'
                      AND conrelid = 'public."Routine_Exercise_Finished"'::regclass) THEN
        ALTER TABLE public."Routine_Exercise_Finished"
            ADD CONSTRAINT fk_ref_user_planification
            FOREIGN KEY (user_planification_id) REFERENCES public."User_Planification"(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_ref_routine_asignation'
                      AND conrelid = 'public."Routine_Exercise_Finished"'::regclass) THEN
        ALTER TABLE public."Routine_Exercise_Finished"
            ADD CONSTRAINT fk_ref_routine_asignation
            FOREIGN KEY (routine_asignation_id) REFERENCES public."Routine_Asignation"(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'uk_ref_plan_asignation_exercise'
                      AND conrelid = 'public."Routine_Exercise_Finished"'::regclass) THEN
        ALTER TABLE public."Routine_Exercise_Finished"
            ADD CONSTRAINT uk_ref_plan_asignation_exercise
            UNIQUE (user_planification_id, routine_asignation_id, routine_exercise_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ref_routine_asignation_id ON public."Routine_Exercise_Finished"(routine_asignation_id);

-- -------------------------------------------------------------
-- 4. User_Routine desaparece (D11). Ya no la referencia ninguna FK
-- -------------------------------------------------------------
DROP TABLE IF EXISTS public."User_Routine";

-- -------------------------------------------------------------
-- 5. Routine_Asignation: semana y orden obligatorios
-- -------------------------------------------------------------
ALTER TABLE public."Routine_Asignation" ADD COLUMN IF NOT EXISTS week INTEGER;
UPDATE public."Routine_Asignation" SET week = 1 WHERE week IS NULL;

-- Las inactivas tenian "order" NULL (la baja se lo borraba). Pasan al final del plan, despues
-- del order mas alto que tenga, en el orden en que se asignaron
UPDATE public."Routine_Asignation" ra
   SET "order" = n.nuevo
  FROM (
        SELECT r.id,
               COALESCE(m.max_order, 0)
               + ROW_NUMBER() OVER (PARTITION BY r.planification_id ORDER BY r.created_at, r.id) AS nuevo
          FROM public."Routine_Asignation" r
          LEFT JOIN (SELECT planification_id, MAX("order") AS max_order
                       FROM public."Routine_Asignation"
                      GROUP BY planification_id) m
            ON m.planification_id = r.planification_id
         WHERE r."order" IS NULL
       ) n
 WHERE ra.id = n.id;

ALTER TABLE public."Routine_Asignation" ALTER COLUMN week SET NOT NULL;
ALTER TABLE public."Routine_Asignation" ALTER COLUMN "order" SET NOT NULL;

-- -------------------------------------------------------------
-- 6. Planification.duration: de texto a semanas (entero)
-- -------------------------------------------------------------
-- El COALESCE va ADENTRO del LEAST: LEAST ignora los NULL y devolveria el tope
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'Planification'
                  AND column_name = 'duration' AND data_type = 'character varying') THEN
        ALTER TABLE public."Planification"
            ALTER COLUMN duration TYPE INTEGER
            USING LEAST(COALESCE(substring(duration FROM '[0-9]+')::numeric, 0), 2147483647)::integer;
    END IF;
END $$;
ALTER TABLE public."Planification" ALTER COLUMN duration SET NOT NULL;

-- -------------------------------------------------------------
-- 7. User_Planification: sin duration ni end_date (D12), number_of_routines obligatorio
-- -------------------------------------------------------------
-- Se completa desde la plantilla (DB3-a); la guarda de arriba ya garantizo que se puede
UPDATE public."User_Planification" up
   SET number_of_routines = p.number_of_routines
  FROM public."Planification" p
 WHERE up.planification_id = p.id AND up.number_of_routines IS NULL;

ALTER TABLE public."User_Planification" ALTER COLUMN number_of_routines SET NOT NULL;
ALTER TABLE public."User_Planification" DROP COLUMN IF EXISTS duration;
ALTER TABLE public."User_Planification" DROP COLUMN IF EXISTS end_date;

COMMIT;

-- =============================================================
--  VERIFICACION (correr despues, deberia devolver 8 filas con 'ok')
-- =============================================================
-- SELECT 'User_Routine no existe' AS chequeo,
--        CASE WHEN to_regclass('public."User_Routine"') IS NULL THEN 'ok' ELSE 'SIGUE' END AS resultado
-- UNION ALL
-- SELECT 'Routine_Asign_Exercise_Finished existe',
--        CASE WHEN to_regclass('public."Routine_Asign_Exercise_Finished"') IS NOT NULL THEN 'ok' ELSE 'FALTA' END
-- UNION ALL
-- SELECT 'Routine_Asignation_User tiene date y no tiene order',
--        CASE WHEN (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Routine_Asignation_User'
--                      AND column_name IN ('date')) = 1
--              AND (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Routine_Asignation_User'
--                      AND column_name IN ('order','routine_asignation_id')) = 0 THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'Routine_Exercise_Finished cuelga del plan',
--        CASE WHEN (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Routine_Exercise_Finished'
--                      AND column_name IN ('user_planification_id','routine_asignation_id')) = 2
--              AND (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Routine_Exercise_Finished'
--                      AND column_name = 'user_routine_id') = 0 THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'Routine_Asignation.week y order NOT NULL',
--        CASE WHEN (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Routine_Asignation'
--                      AND column_name IN ('week','order') AND is_nullable = 'NO') = 2 THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'Planification.duration es integer NOT NULL',
--        CASE WHEN (SELECT data_type || '/' || is_nullable FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='Planification'
--                      AND column_name='duration') = 'integer/NO' THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'User_Planification sin duration ni end_date',
--        CASE WHEN (SELECT COUNT(*) FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='User_Planification'
--                      AND column_name IN ('duration','end_date')) = 0 THEN 'ok' ELSE 'MAL' END
-- UNION ALL
-- SELECT 'User_Planification.number_of_routines NOT NULL',
--        CASE WHEN (SELECT is_nullable FROM information_schema.columns
--                    WHERE table_schema='public' AND table_name='User_Planification'
--                      AND column_name='number_of_routines') = 'NO' THEN 'ok' ELSE 'MAL' END;
```

---

## Tarea 6 — DTOs (spec §5)

**Archivos:** `power-app/src/dtos/planification/`.

- [ ] **Paso 1: `planification_limits.ts`** (nuevo)

```ts
// Tope tecnico de duration y week: el maximo de un INTEGER de Postgres. NO es una regla de
// dominio, solo evita el 500 por "integer out of range". Si el producto fija un tope, se baja aca
export const INTEGER_MAX = 2147483647;
```

- [ ] **Paso 2: `create_planification.dto.ts`** — importar `Max` y `INTEGER_MAX`, y reemplazar el bloque de `duration`:

```ts
import { IsNotEmpty, IsString, IsOptional, MaxLength, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INTEGER_MAX } from './planification_limits';
```
```ts
    @ApiProperty({ example: 12, minimum: 0, maximum: INTEGER_MAX, description: 'Duración del plan en semanas. 0 = sin duración fija. Si es mayor que 0, limita la semana (week) de las rutinas del plan a 1..duration. Obligatoria, también al editar. Al editar, si es mayor que 0 no puede ser menor que la semana más alta usada por una rutina vigente del plan (400)' })
    @IsNotEmpty()
    @IsInt()
    @Min(0)
    @Max(INTEGER_MAX)
    duration!: number;
```
(`edit_planification.dto.ts` la hereda; no se toca.)

- [ ] **Paso 3: `assign_routine_to_planification.dto.ts`** — sumar `week` y actualizar `order`:

```ts
import { IsNotEmpty, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INTEGER_MAX } from './planification_limits';
```
```ts
    @ApiProperty({ example: 1, minimum: 1, description: 'Semana del plan en la que va la rutina. Si la planificación tiene duración mayor que 0, no puede superarla (400)' })
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Max(INTEGER_MAX)
    week!: number;

    @ApiPropertyOptional({ example: 1, minimum: 1, description: 'Posición dentro de la semana. Si se omite, la asignación va al final de esa semana. Si se manda una posición ya ocupada se persiste igual: no se desplaza el resto y el order puede quedar duplicado' })
    @IsOptional()
    @IsInt()
    @Min(1)
    order?: number;
```
(`week` va entre `routine_id` y `order`.)

- [ ] **Paso 4: `assign_routines_to_planification.dto.ts`**

```ts
import { IsNotEmpty, IsUUID, IsArray, ArrayNotEmpty, ArrayMaxSize, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { INTEGER_MAX } from './planification_limits';
```
```ts
    @ApiProperty({ example: 1, minimum: 1, description: 'Semana del plan en la que van todas las rutinas del lote (una semana por lote). Si la planificación tiene duración mayor que 0, no puede superarla (400)' })
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Max(INTEGER_MAX)
    week!: number;

    @ApiProperty({ example: ['uuid-1234', 'uuid-5678'], description: 'Se asignan al final de esa semana, consecutivas y en el orden del array. Se permiten ids repetidos: crean una asignación cada uno' })
```
(`week` va entre `planification_id` y `routine_ids`.)

- [ ] **Paso 5: `set_routine_asignation_active.dto.ts`** (reemplazo completo)

```ts
import { IsNotEmpty, IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INTEGER_MAX } from './planification_limits';

export class SetRoutineAsignationActiveDto {

    @ApiProperty({ example: false, description: 'false da de baja la asignación y la rutina CONSERVA su semana y su orden; true la reactiva' })
    @IsNotEmpty()
    @IsBoolean()
    active!: boolean;

    @ApiPropertyOptional({ example: 2, minimum: 1, description: 'Sólo válido con active = true: la semana con la que vuelve. Si se omite, vuelve a la que tenía. Si la semana resultante queda fuera de la duración actual del plan, es un 400. Mandarlo con active = false es un 400' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(INTEGER_MAX)
    week?: number;

    @ApiPropertyOptional({ example: 2, minimum: 1, description: 'Sólo válido con active = true: la posición con la que vuelve, tal cual (puede repetirse). Si se omite, vuelve a su lugar; con week y sin order, va al final de esa semana. Mandarlo con active = false es un 400' })
    @IsOptional()
    @IsInt()
    @Min(1)
    order?: number;
}
```
(`SetRoutineAsignationsActiveDto` no cambia, salvo su descripción de `active`: `'Al reactivar en lote, cada asignación vuelve a su lugar (su semana y su orden). Si alguna queda fuera de la duración actual de su plan, es un 400 y no se aplica ninguna'`.)

- [ ] **Paso 6: DTOs de respuesta**

`planification_list_item_response.dto.ts`:
```ts
    @ApiProperty({ example: 12, description: 'Duración en semanas. 0 = sin duración fija' })
    duration!: number;
```
(reemplaza `@ApiPropertyOptional({ example: '12 semanas' }) duration?: string;`. `ApiPropertyOptional` sigue en uso.)

`planification_detail_response.dto.ts`, en `PlanificationAsignationResponseDto`:
```ts
    @ApiProperty({ example: 1, minimum: 1, description: 'Semana del plan en la que va la rutina' })
    week!: number;

    @ApiProperty({ example: 1, description: 'Posición dentro de la semana. Etiqueta de orden: puede repetirse' })
    order!: number;
```
y la descripción de `routines`: `'Rutinas vigentes del plan, ordenadas por week, order y fecha de asignación. La lista es plana: el cliente agrupa por semana. Vacía si no tiene ninguna'`.

---

## Tarea 7 — `planification.service.ts` y controller (spec §5)

**Archivos:** `planification.service.ts`, `planification.controller.ts`. Los handlers siguen llamando `await this.service…` (regla BE-04), las transacciones abren `connect()` y `startTransaction()` **dentro** del `try`, y los errores van en español con `{ error }`.

- [ ] **Paso 1: `createPlanification` y `editPlanification`**

En `createPlanification`: `duration: createPlanificationDto.duration,` (ya no `?? null`).

En `editPlanification`, después del chequeo de `!planification.active` y antes de pisar la cabecera:

```ts
            // Achicar la duracion por debajo de una semana en uso dejaria rutinas fuera del plan.
            // Solo cuentan las VIGENTES: una dada de baja puede quedar en una semana que ya no
            // existe, y reincorporarla se rechaza ahi (set-active). Con 0 no hay tope
            if (editPlanificationDto.duration > 0) {
                const maxWeek = await this.maxActiveWeek(planification.id);
                if (maxWeek > editPlanificationDto.duration) {
                    return res.status(400).send({
                        error: `La planificación tiene rutinas en la semana ${maxWeek}: la duración no puede ser menor.`
                    });
                }
            }
```
y `planification.duration = editPlanificationDto.duration;` (ya no `?? null`).

- [ ] **Paso 2: `assignRoutineToPlanification`** — después del chequeo de `!planification.active`:

```ts
            const weekError = this.weekOutOfDuration(assignRoutineDto.week, planification.duration);
            if (weekError) {
                return res.status(400).send({ error: weekError });
            }
```
y reemplazar el cálculo del `order` y el `save`:

```ts
            // Sin order explicito va al final DE ESA SEMANA. Con order se persiste TAL CUAL,
            // aunque la posicion ya este ocupada: no se desplaza ni se renumera nada, y el order
            // puede quedar duplicado. Es la decision del 4/9
            const order = assignRoutineDto.order
                ?? await this.nextOrder(assignRoutineDto.planification_id, assignRoutineDto.week);

            await this.routineAsignationRepository.save(
                this.routineAsignationRepository.create({
                    routine_id: assignRoutineDto.routine_id,
                    planification_id: assignRoutineDto.planification_id,
                    week: assignRoutineDto.week,
                    order,
                })
            );
```

- [ ] **Paso 3: `assignRoutinesToPlanification`** — después del chequeo de `!planification.active`:

```ts
            const weekError = this.weekOutOfDuration(assignRoutinesDto.week, planification.duration);
            if (weekError) {
                await queryRunner.rollbackTransaction();
                return res.status(400).send({ error: weekError });
            }
```
y el alta consecutiva:

```ts
            // Consecutivas desde el final de la semana, en el orden del array
            let order = await this.nextOrder(
                assignRoutinesDto.planification_id,
                assignRoutinesDto.week,
                queryRunner.manager,
            );

            for (const routineId of assignRoutinesDto.routine_ids) {
                await queryRunner.manager.save(
                    queryRunner.manager.create(RoutineAsignation, {
                        routine_id: routineId,
                        planification_id: assignRoutinesDto.planification_id,
                        week: assignRoutinesDto.week,
                        order: order++,
                    })
                );
            }
```

- [ ] **Paso 4: `setRoutineAsignationActive`** (reemplazo completo del método)

```ts
    async setRoutineAsignationActive(
        idRoutineAsignation: string,
        setActiveDto: SetRoutineAsignationActiveDto,
        res: Response
    ) {
        // week y order solo tienen sentido al reactivar. Aceptarlos en silencio con
        // active = false esconderia un bug del cliente
        if (!setActiveDto.active && (setActiveDto.week !== undefined || setActiveDto.order !== undefined)) {
            return res.status(400).send({
                error: 'Los campos week y order sólo aplican al reactivar una asignación.'
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
                // Sin week ni order vuelve a su lugar: la baja se los conservo (D10). Con week y
                // sin order va al final de esa semana; con order se guarda tal cual
                const week = setActiveDto.week ?? asignacion.week;

                // La duracion pudo achicarse mientras estaba de baja: editPlanification solo mira
                // las vigentes. El plan siempre existe (FK NOT NULL con CASCADE)
                const planification = await this.planificationRepository.findOne({
                    where: { id: asignacion.planification_id },
                });
                const weekError = this.weekOutOfDuration(week, planification!.duration);
                if (weekError) {
                    return res.status(400).send({ error: `${weekError} Indicá una semana válida.` });
                }

                if (setActiveDto.order !== undefined) {
                    asignacion.order = setActiveDto.order;
                } else if (setActiveDto.week !== undefined) {
                    asignacion.order = await this.nextOrder(asignacion.planification_id, week);
                }
                asignacion.week = week;
            }
            // La baja (active = false) solo apaga el flag: el resto del plan no se renumera y la
            // rutina conserva su semana y su orden

            asignacion.active = setActiveDto.active;
            await this.routineAsignationRepository.save(asignacion);

            res.status(200).send(asignacion);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error al actualizar el estado de la asignación.' });
        }
    }
```
Hace falta inyectar el repositorio de planificaciones: ya existe (`this.planificationRepository`).

- [ ] **Paso 5: `setRoutineAsignationsActive`** — reemplazar el `for` (después del `404`):

```ts
            // Reincorporar: cada una vuelve a su lugar, pero la duracion pudo achicarse mientras
            // estaba de baja. Se valida TODO antes de guardar nada (es todo o nada). Los ids
            // pueden ser de planificaciones distintas, asi que se mira la de cada una
            if (setActiveDto.active) {
                const planificationIds = [...new Set(asignaciones.map(asignacion => asignacion.planification_id))];
                const planifications = await queryRunner.manager.find(Planification, {
                    where: { id: In(planificationIds) },
                });
                const durationByPlanification = new Map(planifications.map(p => [p.id, p.duration]));

                for (const asignacion of asignaciones) {
                    const weekError = this.weekOutOfDuration(
                        asignacion.week,
                        durationByPlanification.get(asignacion.planification_id)!,
                    );
                    if (weekError) {
                        await queryRunner.rollbackTransaction();
                        return res.status(400).send({
                            error: `La asignación ${asignacion.id} no se puede reincorporar: ${weekError}`
                        });
                    }
                }
            }

            // Quitar y reincorporar solo cambian el flag: la rutina conserva su semana y su orden
            for (const asignacion of asignaciones) {
                asignacion.active = setActiveDto.active;
                await queryRunner.manager.save(asignacion);
            }
```

- [ ] **Paso 6: helpers** (reemplazan a `nextOrder`)

```ts
    // La semana cabe si el plan no tiene duracion fija (0) o si no la supera. El minimo
    // (week >= 1) lo valida el DTO. Devuelve el mensaje de error, o null si la semana es valida
    private weekOutOfDuration(week: number, duration: number): string | null {
        if (duration === 0 || week <= duration) {
            return null;
        }
        return `La semana ${week} supera la duración de la planificación (${duration} semanas).`;
    }

    // max(order) + 1 sobre las asignaciones ACTIVAS de esa semana del plan, o 1 si no hay
    // ninguna. Las inactivas conservan su order (D10) pero no cuentan: la rutina de baja no
    // ocupa lugar. Recibe el manager para poder correr dentro de la transaccion de los lotes
    private async nextOrder(
        idPlanification: string,
        week: number,
        manager?: EntityManager
    ): Promise<number> {
        const repository = manager
            ? manager.getRepository(RoutineAsignation)
            : this.routineAsignationRepository;

        const resultado = await repository
            .createQueryBuilder('routineAsignation')
            .select('MAX(routineAsignation.order)', 'max')
            .where('routineAsignation.planification_id = :idPlanification', { idPlanification })
            .andWhere('routineAsignation.week = :week', { week })
            .andWhere('routineAsignation.active = true')
            .getRawOne<{ max: number | null }>();

        return (resultado?.max ?? 0) + 1;
    }

    // Semana mas alta usada por una asignacion ACTIVA del plan, o 0 si no tiene ninguna
    private async maxActiveWeek(idPlanification: string): Promise<number> {
        const resultado = await this.routineAsignationRepository
            .createQueryBuilder('routineAsignation')
            .select('MAX(routineAsignation.week)', 'max')
            .where('routineAsignation.planification_id = :idPlanification', { idPlanification })
            .andWhere('routineAsignation.active = true')
            .getRawOne<{ max: number | null }>();

        return resultado?.max ?? 0;
    }
```

- [ ] **Paso 7: orden y respuesta**

`getAllPlanificationsPlus`: sumar `.addOrderBy('routineAsignation.week', 'ASC')` **antes** del `addOrderBy('routineAsignation.order', 'ASC')`, y actualizar el comentario del desempate.

`findPlanificationDetail`:
```ts
            order: {
                routineAsignations: {
                    week: 'ASC',
                    order: 'ASC',
                    // Mismo desempate que /all-plus: el order admite duplicados
                    created_at: 'ASC',
                },
            },
```
`buildPlanificationDetailResponse`, en cada rutina: `week: routineAsignation.week,` antes de `order`. (`duration: planification.duration` queda igual: ahora sale como número.)

- [ ] **Paso 8: Swagger en el controller** — para `POST /create`, `/edit/:id`, `/routine/assign`, `/routine/assign-bulk`, `/routine/set-active/:id` y `/routine/set-active-bulk`, agregar bajo el `@ApiResponse` existente (importar nada nuevo: `ApiResponse` ya está):

```ts
    @ApiResponse({ status: 400, description: 'Datos inválidos (duration o week fuera de rango, o rutina de baja)' })
```
con la descripción específica de cada uno: `edit` → `'Datos inválidos, planificación de baja, o duración menor que la semana más alta usada por una rutina vigente'`; `assign` / `assign-bulk` → `'Datos inválidos, planificación o rutina de baja, o semana mayor que la duración del plan'`; `set-active` → `'week u order junto con active = false, o semana fuera de la duración actual del plan'`; `set-active-bulk` → `'Ids repetidos, o alguna asignación quedaría fuera de la duración actual de su plan (no se aplica ninguna)'`. Y `@ApiResponse({ status: 404, description: … })` en `assign`, `assign-bulk`, `edit`, `set-active` y `set-active-bulk` (`'Planificación, rutina o asignación no encontrada'`).

---

## Tarea 8 — Compilar

- [ ] **Paso 1:** `cd "D:/Power App/Backend/PowerApp-Backend" && npm --prefix power-app run build`. Esperado: sin errores. Si falla por una referencia que quedó a `UserRoutine`, `end_date`, `duration` de texto o `order = null`, corregir ahí (no dejar parches).
- [ ] **Paso 2:** `git grep -n "UserRoutine\|user_routine_id\|User_Routine" -- power-app/src "Db Creator/ddl.py" "Db Creator/01_estructura.sql"`. Esperado: sin resultados.

---

## Tarea 9 — Verificar el esquema: `01` contra entidades, y el patch

### 9a. `01` regenerado contra las entidades (columna por columna)

- [ ] **Paso 1: `compare-ddl.js`** (en el scratchpad). Aplica el `01` a un Postgres en memoria, lee su catálogo, arma el `DataSource` con las entidades **compiladas y sin conectarse** (`buildMetadatas`) y compara por tabla: columnas (nombre, tipo, largo, nulabilidad), únicos (nombre y columnas) y FK (columnas, tabla referida, regla de borrado). Recibe el `dist` y el `01` como argumentos, para correrlo también contra la línea de base.

```js
// node compare-ddl.js <dist> <01.sql> [--all]
const path = require('path'), fs = require('fs'), { createRequire } = require('module');
const PROJECT = 'D:/Power App/Backend/PowerApp-Backend/power-app';
const req = createRequire(PROJECT + '/package.json');
req('reflect-metadata');
const { DataSource } = req('typeorm');
const { PGlite } = require('@electric-sql/pglite');

const [dist, sqlFile] = process.argv.slice(2);
const SCOPE = new Set(['Routine_Asignation', 'Routine_Asignation_User', 'Routine_Asign_Exercise_Finished',
  'Routine_Exercise_Finished', 'Planification', 'User_Planification']);
const ONLY_SCOPE = !process.argv.includes('--all');
const DELETE = { a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT' };

const dbType = r => {
  const t = r.data_type;
  if (t === 'character varying') return `varchar(${r.character_maximum_length})`;
  if (t === 'numeric') return `numeric(${r.numeric_precision},${r.numeric_scale})`;
  if (t === 'timestamp with time zone') return 'timestamptz';
  if (t === 'USER-DEFINED') return 'enum';
  return t; // uuid, integer, boolean, text, date
};
const entType = c => {
  const t = typeof c.type === 'function' ? c.type.name.toLowerCase() : String(c.type);
  if (['varchar', 'character varying', 'string'].includes(t)) return `varchar(${c.length || 255})`;
  if (['int', 'integer', 'number'].includes(t)) return 'integer';
  if (['decimal', 'numeric'].includes(t)) return `numeric(${c.precision},${c.scale})`;
  if (['timestamptz', 'timestamp with time zone'].includes(t)) return 'timestamptz';
  if (['boolean', 'bool'].includes(t)) return 'boolean';
  if (t === 'enum') return 'enum';
  return t; // uuid, text, date
};

(async () => {
  const db = new PGlite();
  await db.exec(fs.readFileSync(sqlFile, 'utf8'));
  const cols = (await db.query(`select table_name, column_name, data_type, is_nullable,
      character_maximum_length, numeric_precision, numeric_scale
      from information_schema.columns where table_schema='public'`)).rows;
  const cons = (await db.query(`
    select t.relname tbl, c.conname, c.contype, c.confdeltype, rt.relname reftbl,
      array(select a.attname from unnest(c.conkey) with ordinality k(n,o) join pg_attribute a
            on a.attrelid=c.conrelid and a.attnum=k.n order by k.o) cols,
      array(select a.attname from unnest(c.confkey) with ordinality k(n,o) join pg_attribute a
            on a.attrelid=c.confrelid and a.attnum=k.n order by k.o) refcols
    from pg_constraint c join pg_class t on t.oid=c.conrelid left join pg_class rt on rt.oid=c.confrelid
    where t.relnamespace='public'::regnamespace and c.contype in ('f','u')`)).rows;

  // Barras hacia adelante: TypeORM resuelve las rutas de `entities` como globs y en Windows no entiende "\"
  const files = fs.readdirSync(path.join(dist, 'entities')).filter(f => f.endsWith('.entity.js'))
    .map(f => path.join(dist, 'entities', f).split(path.sep).join('/'));
  const ds = new DataSource({ type: 'postgres', entities: files });
  await ds.buildMetadatas();

  const diffs = [];
  const dbTables = new Set(cols.map(c => c.table_name));
  const entTables = new Set(ds.entityMetadatas.map(m => m.tableName));
  for (const t of dbTables) if (!entTables.has(t) && (!ONLY_SCOPE || SCOPE.has(t))) diffs.push(`${t}: tabla en el 01 sin entidad`);
  for (const t of entTables) if (!dbTables.has(t) && (!ONLY_SCOPE || SCOPE.has(t))) diffs.push(`${t}: entidad sin tabla en el 01`);

  for (const m of ds.entityMetadatas) {
    const t = m.tableName;
    if (!dbTables.has(t) || (ONLY_SCOPE && !SCOPE.has(t))) continue;
    const dbCols = Object.fromEntries(cols.filter(c => c.table_name === t).map(c => [c.column_name, c]));
    const entCols = Object.fromEntries(m.columns.map(c => [c.databaseName, c]));
    for (const n of Object.keys(dbCols)) if (!entCols[n]) diffs.push(`${t}.${n}: columna en el 01 sin campo en la entidad`);
    for (const n of Object.keys(entCols)) {
      const e = entCols[n], d = dbCols[n];
      if (!d) { diffs.push(`${t}.${n}: campo de la entidad sin columna en el 01`); continue; }
      const et = entType(e), dt = dbType(d);
      if (et !== dt) diffs.push(`${t}.${n}: tipo entidad=${et} 01=${dt}`);
      const eNull = e.isPrimary ? false : e.isNullable, dNull = d.is_nullable === 'YES';
      if (eNull !== dNull) diffs.push(`${t}.${n}: nulabilidad entidad=${eNull} 01=${dNull}`);
    }
    const dbU = cons.filter(c => c.tbl === t && c.contype === 'u').map(c => `${c.conname}(${c.cols.join(',')})`).sort();
    const enU = m.uniques.map(u => `${u.name}(${u.columns.map(c => c.databaseName).join(',')})`).sort();
    // El unico de columna simple (User.email, Coach.*) puede no estar como @Unique: solo se exige igualdad de los compuestos del alcance
    for (const u of enU) if (!dbU.includes(u)) diffs.push(`${t}: unico ${u} de la entidad no esta en el 01`);
    for (const u of dbU) if (!enU.includes(u)) diffs.push(`${t}: unico ${u} del 01 no esta en la entidad`);
    const dbF = cons.filter(c => c.tbl === t && c.contype === 'f')
      .map(c => `${c.cols.join(',')}->${c.reftbl}(${c.refcols.join(',')}) ${DELETE[c.confdeltype]}`).sort();
    const enF = m.foreignKeys.map(f => `${f.columnNames.join(',')}->${f.referencedEntityMetadata.tableName}(${f.referencedColumnNames.join(',')}) ${f.onDelete || 'NO ACTION'}`).sort();
    for (const f of enF) if (!dbF.includes(f)) diffs.push(`${t}: FK ${f} de la entidad no esta en el 01`);
    for (const f of dbF) if (!enF.includes(f)) diffs.push(`${t}: FK ${f} del 01 no esta en la entidad`);
  }
  console.log(diffs.length ? diffs.join('\n') : 'SIN DIFERENCIAS');
  process.exit(0);
})();
```

- [ ] **Paso 2: línea de base** (HEAD contra HEAD, con `--all`, para saber qué diferencias son **previas**):

```bash
cd "$SCRATCH" && node compare-ddl.js "$SCRATCH/baseline-dist" "$SCRATCH/baseline-01.sql" --all | tee baseline-diffs.txt
```
Esperado: una lista (posiblemente vacía) de diferencias preexistentes, p. ej. `Coach.cuil` (único en el DDL, no en la entidad; roadmap §7, discrepancia 22). **No se corrigen acá**; sólo se anotan.

- [ ] **Paso 3: después del cambio**, alcance estricto y modelo completo:

```bash
node compare-ddl.js "D:/Power App/Backend/PowerApp-Backend/power-app/dist" "D:/Power App/Backend/PowerApp-Backend/Db Creator/01_estructura.sql"
node compare-ddl.js "D:/Power App/Backend/PowerApp-Backend/power-app/dist" "D:/Power App/Backend/PowerApp-Backend/Db Creator/01_estructura.sql" --all > after-diffs.txt; diff baseline-diffs.txt after-diffs.txt && echo "MISMAS DIFERENCIAS PREVIAS"
```
Esperado: la primera, `SIN DIFERENCIAS` (las seis tablas: nombres, tipos, nulabilidad, únicos y reglas de borrado de las FK); la segunda, **idéntica** a la línea de base.

### 9b. El patch, ejecutado

- [ ] **Paso 4: `patch-test.js`** (scratchpad). Parte del `01` **viejo**, siembra datos, aplica el patch y compara el catálogo resultante con el del `01` **nuevo** (como conjuntos: `ADD COLUMN` agrega al final, así que el orden de las columnas no cuenta). Cubre: conversión de datos, equivalencia de esquema, idempotencia (dos veces, y de nuevo con una fila nueva en `Routine_Asignation_User`) y las cuatro guardas (con el esquema sin tocar tras abortar).

```js
const fs = require('fs');
const { PGlite } = require('@electric-sql/pglite');
const REPO = 'D:/Power App/Backend/PowerApp-Backend/Db Creator';
const OLD = fs.readFileSync(process.env.SCRATCH + '/baseline-01.sql', 'utf8');
const NEW = fs.readFileSync(REPO + '/01_estructura.sql', 'utf8');
const PATCH = fs.readFileSync(REPO + '/patches/2026-10-17-be-10.sql', 'utf8');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA'), m); if (!c) fails++; };

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SEED = `
INSERT INTO "User"(id,first_name,last_name,email,password) VALUES ('${id(900)}','A','B','a@b.c','x');
INSERT INTO "Planification"(id,name,number_of_routines,duration) VALUES
 ('${id(1)}','A',3,'12 semanas'),('${id(2)}','B',3,'3 meses'),('${id(3)}','C',3,NULL),
 ('${id(4)}','D',3,'sin fecha'),('${id(5)}','E',3,'2 a 4 semanas'),('${id(6)}','F',3,'99999999999999 semanas');
INSERT INTO "Routine"(id,name) VALUES ('${id(10)}','R1'),('${id(11)}','R2'),('${id(12)}','R3');
INSERT INTO "Routine_Asignation"(id,routine_id,planification_id,"order",active,created_at) VALUES
 ('${id(20)}','${id(10)}','${id(1)}',1,true ,'2026-10-01'),
 ('${id(21)}','${id(11)}','${id(1)}',2,true ,'2026-10-02'),
 ('${id(22)}','${id(12)}','${id(1)}',NULL,false,'2026-10-03'),
 ('${id(23)}','${id(10)}','${id(1)}',NULL,false,'2026-10-04'),
 ('${id(24)}','${id(10)}','${id(2)}',NULL,false,'2026-10-05');
INSERT INTO "User_Planification"(id,user_id,planification_id,number_of_routines,start_date,end_date,duration)
 VALUES ('${id(30)}','${id(900)}','${id(1)}',NULL,'2026-10-01','2026-12-01','12 semanas');`;

// Firma del catalogo: columnas, constraints (con su definicion) e indices, como conjuntos
async function signature(db) {
  const cols = (await db.query(`select table_name||'.'||column_name||' '||data_type||
      coalesce('('||character_maximum_length||')','')||' null='||is_nullable||' def='||coalesce(column_default,'') s
      from information_schema.columns where table_schema='public'`)).rows.map(r => r.s);
  const cons = (await db.query(`select t.relname||' '||c.conname||' '||pg_get_constraintdef(c.oid) s
      from pg_constraint c join pg_class t on t.oid=c.conrelid where t.relnamespace='public'::regnamespace`)).rows.map(r => r.s);
  const idx = (await db.query(`select indexdef s from pg_indexes where schemaname='public'`)).rows.map(r => r.s);
  return { cols: new Set(cols), cons: new Set(cons), idx: new Set(idx) };
}
const diffSets = (a, b) => [...a].filter(x => !b.has(x));
async function runPatch(db) { try { await db.exec(PATCH); return null; } catch (e) { try { await db.exec('ROLLBACK'); } catch {} return e.message; } }
const fresh = async (sql) => { const d = new PGlite(); await d.exec(sql); return d; };

(async () => {
  // 1) conversion y equivalencia con el 01 nuevo
  const db = await fresh(OLD); await db.exec(SEED);
  const err = await runPatch(db);
  ok(err === null, 'el patch corre sobre el esquema viejo con datos' + (err ? ': ' + err : ''));
  const dur = Object.fromEntries((await db.query('select name, duration from "Planification"')).rows.map(r => [r.name, r.duration]));
  ok(dur.A === 12 && dur.B === 3 && dur.C === 0 && dur.D === 0 && dur.E === 2, 'duration: 12 / 3 / NULL->0 / sin numero->0 / primer numero (2)');
  ok(dur.F === 2147483647, 'duration: un numero gigante se topa en 2147483647 en vez de fallar');
  const ra = Object.fromEntries((await db.query('select id, week, "order", active from "Routine_Asignation"')).rows.map(r => [r.id, r]));
  ok(Object.values(ra).every(r => r.week === 1), 'week = 1 en todas las filas');
  ok(ra[id(22)].order === 3 && ra[id(23)].order === 4, 'las inactivas del plan A van al final: 3 y 4, por fecha de alta');
  ok(ra[id(24)].order === 1, 'la inactiva del plan B (sin activas) queda en 1');
  ok(ra[id(20)].order === 1 && ra[id(21)].order === 2, 'las activas conservan su order');
  const up = (await db.query('select number_of_routines from "User_Planification"')).rows[0];
  ok(up.number_of_routines === 3, 'User_Planification.number_of_routines se copia de la plantilla');

  const ref = await fresh(NEW);
  const sPatched = await signature(db), sNew = await signature(ref);
  for (const k of ['cols', 'cons', 'idx']) {
    ok(diffSets(sPatched[k], sNew[k]).length === 0 && diffSets(sNew[k], sPatched[k]).length === 0, `esquema parcheado == 01 nuevo (${k})`);
    for (const x of diffSets(sPatched[k], sNew[k])) console.log('   solo parcheado:', x);
    for (const x of diffSets(sNew[k], sPatched[k])) console.log('   solo 01 nuevo :', x);
  }

  // 2) idempotencia
  ok((await runPatch(db)) === null, 'segunda corrida: sin error');
  const s2 = await signature(db);
  ok(diffSets(s2.cols, sPatched.cols).length + diffSets(s2.cons, sPatched.cons).length + diffSets(s2.idx, sPatched.idx).length === 0, 'segunda corrida: el esquema no cambia');
  await db.exec(`INSERT INTO "Routine_Asignation_User"(routine_id,user_id,date) VALUES ('${id(10)}','${id(900)}','2026-10-20')`);
  ok((await runPatch(db)) === null, 'tercera corrida con filas en Routine_Asignation_User: NO aborta');
  const dup = await db.exec(`INSERT INTO "Routine_Asignation_User"(routine_id,user_id,date) VALUES ('${id(10)}','${id(900)}','2026-10-20')`).then(() => 'acepto', e => 'rechazo');
  ok(dup === 'rechazo', 'el unico (routine_id, user_id, date) rechaza el duplicado');

  // 3) guardas: abortan con mensaje claro y no cambian nada
  const guard = async (label, setup, re) => {
    const d = await fresh(OLD); await d.exec(SEED); await setup(d);
    const before = await signature(d);
    const e = await runPatch(d);
    ok(e && re.test(e), `guarda: ${label} -> ${e ? e.slice(0, 90) : 'NO ABORTO'}`);
    const after = await signature(d);
    ok(diffSets(before.cols, after.cols).length + diffSets(after.cols, before.cols).length === 0, `guarda: ${label} -> el esquema queda intacto`);
  };
  await guard('User_Routine con filas',
    d => d.exec(`INSERT INTO "User_Routine"(routine_asignation_id,user_id,date) VALUES ('${id(20)}','${id(900)}','2026-10-01')`), /User_Routine tiene 1/);
  await guard('Routine_Asignation_User con filas (forma vieja)',
    d => d.exec(`INSERT INTO "Routine_Asignation_User"(routine_id,user_id,routine_asignation_id,"order") VALUES ('${id(10)}','${id(900)}','${id(20)}',1)`), /Routine_Asignation_User tiene 1/);
  await guard('Routine_Exercise_Finished con filas (forma vieja)', async d => {
    await d.exec(`INSERT INTO "Exercise"(id,name,description) VALUES ('${id(40)}','E','d');
      INSERT INTO "Circuit"(id,name,type) VALUES ('${id(41)}','C','t');
      INSERT INTO "Routine_Exercise"(id,exercise_id,circuit_id,exercise_order) VALUES ('${id(42)}','${id(40)}','${id(41)}',1);
      ALTER TABLE "Routine_Exercise_Finished" DROP CONSTRAINT fk_ref_user_routine;
      INSERT INTO "Routine_Exercise_Finished"(user_routine_id,routine_exercise_id) VALUES ('${id(43)}','${id(42)}')`);
  }, /Routine_Exercise_Finished tiene 1/);
  await guard('User_Planification con number_of_routines NULL y sin plantilla',
    d => d.exec(`UPDATE "User_Planification" SET planification_id = NULL`), /number_of_routines NULL/);

  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
```

- [ ] **Paso 5:** `cd "$SCRATCH" && SCRATCH="$SCRATCH" node patch-test.js`. Esperado: todas las líneas `OK` y `TODO OK`. Cualquier `FALLA` se corrige en el patch (o en `ddl.py`, si la diferencia es del `01`) y se vuelve a correr.

---

### 9c. El `01` regenerado contra el diagrama de `Doc/`

- [ ] **Paso 6: `svg_vs_ddl.py`** (scratchpad). Lee el texto del `.svg` (tabla → columnas con tipo y etiquetas `PK`/`FK`/`NOT NULL`), parsea los `CREATE TABLE` del `01` y compara columnas, tipos y `NOT NULL`. Sólo tolera las tres desalineaciones previas de la sección 3b, y las rotula `PREVIA`. Sale con código 1 si hay una diferencia nueva.

```python
# py svg_vs_ddl.py <01_estructura.sql> [<modelo.svg>]
import re, sys
SVG = sys.argv[2] if len(sys.argv) > 2 else r'D:/Power App/Docs/PowerApp-Docs/Doc/PowerApp - Modelo DB.svg'
PREVIAS = {'User.email:NOT NULL', 'User.profile_picture:tipo', 'User.role:tipo'}
svg = open(SVG, encoding='utf-8').read()
txt = [t.strip() for t in re.findall(r'>([^<>]{1,80})<', svg) if t.strip()]
TAGS = {'PK', 'FK', 'NOT NULL', 'NOT_NULL', 'UNIQUE'}
TYPE = re.compile(r'^(UNIQUEIDENTIFIER|Bit|Varchar\(\w+\)|Datetime|Date|Integer|Boolean|Decimal\(\d+,\d+\))$', re.I)
starts = [i for i, t in enumerate(txt) if i + 1 < len(txt) and txt[i + 1] == 'PK' and t not in TAGS]
model = {}
for k, i in enumerate(starts):
    j = starts[k + 1] if k + 1 < len(starts) else len(txt)
    toks, cols, tags, n = txt[i + 1:j], {}, set(), 0
    while n < len(toks):
        if toks[n] in TAGS: tags.add(toks[n]); n += 1
        elif n + 1 < len(toks) and TYPE.match(toks[n + 1]): cols[toks[n]] = (toks[n + 1], set(tags)); tags = set(); n += 2
        else: n += 1
    model[txt[i]] = cols

ddl = open(sys.argv[1], encoding='utf-8').read()
db = {}
for m in re.finditer(r'CREATE TABLE public\."(\w+)" \((.*?)\n\);', ddl, re.S):
    cols = {}
    for line in m.group(2).splitlines():
        line = line.split('--')[0].strip().rstrip(',')
        mm = re.match(r'^("?\w+"?)\s+([A-Za-z_."]+(?:\(\d+(?:,\d+)?\))?)(.*)$', line)
        if not mm or mm.group(1).upper() in ('CONSTRAINT', 'FOREIGN', 'PRIMARY', 'UNIQUE'): continue
        cols[mm.group(1).strip('"')] = (mm.group(2), 'NOT NULL' in mm.group(3) or 'PRIMARY KEY' in mm.group(3))
    db[m.group(1)] = cols

NORM = {'UNIQUEIDENTIFIER': 'UUID', 'DATETIME': 'TIMESTAMPTZ', 'VARCHAR(MAX)': 'TEXT', 'BIT': 'BOOLEAN'}
nt = lambda t: NORM.get(t.upper(), t.upper())
nuevas = 0
def informar(clave, msg):
    global nuevas
    previa = clave in PREVIAS
    if not previa: nuevas += 1
    print(('PREVIA ' if previa else 'DIFF   ') + msg)
for t in sorted(set(model) | set(db)):
    if t not in model: informar(t, f'{t}: tabla solo en el DDL'); continue
    if t not in db: informar(t, f'{t}: tabla solo en el diagrama'); continue
    for c in sorted(set(model[t]) | set(db[t])):
        if c not in model[t]: informar(f'{t}.{c}', f'{t}.{c}: columna solo en el DDL'); continue
        if c not in db[t]: informar(f'{t}.{c}', f'{t}.{c}: columna solo en el diagrama'); continue
        mt, tags = model[t][c]; dt, dnn = db[t][c]
        if nt(mt) != nt(dt): informar(f'{t}.{c}:tipo', f'{t}.{c}: tipo diagrama={mt} ddl={dt}')
        if not tags & {'FK', 'PK'}:
            mnn = bool(tags & {'NOT NULL', 'NOT_NULL'})
            if mnn != dnn: informar(f'{t}.{c}:NOT NULL', f'{t}.{c}: NOT NULL diagrama={mnn} ddl={dnn}')
print(f'tablas: diagrama={len(model)} ddl={len(db)} | diferencias nuevas: {nuevas}')
sys.exit(1 if nuevas else 0)
```

- [ ] **Paso 7: correrlo dos veces**

```bash
cd "D:/Power App/Backend/PowerApp-Backend"
py "$SCRATCH/svg_vs_ddl.py" "$SCRATCH/baseline-01.sql"   # contra HEAD: 15 DIFF (las de la sección 3b) + 3 PREVIA
py "$SCRATCH/svg_vs_ddl.py" "Db Creator/01_estructura.sql"  # contra el 01 regenerado: sólo las 3 PREVIA
```
Esperado: la primera termina con `diferencias nuevas: 15` (confirma que el comparador detecta lo que cambia); la segunda, con `diferencias nuevas: 0`, y sólo las tres líneas `PREVIA`. **Ese es el criterio de "sincronizado con el último modelo cargado en `Doc/`".**

- [ ] **Paso 8: lo mismo contra el patch.** El esquema parcheado también tiene que quedar sincronizado, no sólo el `01`. Se agrega a `patch-test.js`, justo después de la comparación con el `01` nuevo, un volcado del DDL de la base parcheada (columnas con tipo y nulabilidad, en el formato de un `CREATE TABLE`) a un archivo temporal y se corre el comparador sobre él. Si el patch y el `01` son iguales como conjuntos (ya lo prueba el paso 5), esto es redundante a propósito: la fuente de verdad es el diagrama, no el `01`.

```js
  // 1b) el esquema parcheado contra el diagrama de Doc/ (mismo comparador que el 01)
  const cols = (await db.query(`select table_name t, column_name c,
        case data_type when 'character varying' then 'VARCHAR('||character_maximum_length||')'
                       when 'timestamp with time zone' then 'TIMESTAMPTZ' when 'numeric' then 'DECIMAL('||numeric_precision||','||numeric_scale||')'
                       when 'USER-DEFINED' then 'public."User_role_enum"' else upper(data_type) end ty, is_nullable n
        from information_schema.columns where table_schema='public' order by table_name, ordinal_position`)).rows;
  const byT = {}; for (const r of cols) (byT[r.t] ||= []).push(`    ${/^[a-z_]+$/.test(r.c) && r.c !== 'order' ? r.c : '"' + r.c + '"'} ${r.ty}${r.n === 'NO' ? ' NOT NULL' : ''}`);
  const ddlParcheado = Object.entries(byT).map(([t, l]) => `CREATE TABLE public."${t}" (\n${l.join(',\n')}\n);`).join('\n\n');
  fs.writeFileSync(process.env.SCRATCH + '/parcheado-ddl.sql', ddlParcheado);
```
y, después de correr `patch-test.js`: `py "$SCRATCH/svg_vs_ddl.py" "$SCRATCH/parcheado-ddl.sql"`. Esperado: `diferencias nuevas: 0` y sólo las tres `PREVIA`.

---

## Tarea 10 — Verificar las reglas del refactor (spec §5, §10)

### 10a. Validación de los DTOs

- [ ] **Paso 1: `dto-check.js`** — usa los DTOs **compilados** con el mismo `ValidationPipe` de `main.ts` (`whitelist`, `forbidNonWhitelisted`, `transform`).

```js
const { createRequire } = require('module');
const PROJECT = 'D:/Power App/Backend/PowerApp-Backend/power-app';
const req = createRequire(PROJECT + '/package.json');
req('reflect-metadata');
const { ValidationPipe } = req('@nestjs/common');
const dto = f => req(`${PROJECT}/dist/dtos/planification/${f}`);
const { CreatePlanificationDto } = dto('create_planification.dto.js');
const { EditPlanificationDto } = dto('edit_planification.dto.js');
const { AssignRoutineToPlanificationDto } = dto('assign_routine_to_planification.dto.js');
const { AssignRoutinesToPlanificationDto } = dto('assign_routines_to_planification.dto.js');
const { SetRoutineAsignationActiveDto } = dto('set_routine_asignation_active.dto.js');
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const U = '11111111-1111-4111-8111-111111111111';
let fails = 0;
async function check(label, type, body, expectOk) {
  let ok = true, msg = '';
  try { await pipe.transform(body, { type: 'body', metatype: type }); } catch (e) { ok = false; msg = JSON.stringify(e.getResponse().message); }
  const pass = ok === expectOk; if (!pass) fails++;
  console.log(pass ? 'OK   ' : 'FALLA', label, ok ? '' : '-> ' + msg);
}
(async () => {
  const base = { name: 'Plan', number_of_routines: 3 };
  await check('create: duration 12', CreatePlanificationDto, { ...base, duration: 12 }, true);
  await check('create: duration 0 (sin duracion fija)', CreatePlanificationDto, { ...base, duration: 0 }, true);
  await check('create: sin duration', CreatePlanificationDto, base, false);
  await check('create: duration -1', CreatePlanificationDto, { ...base, duration: -1 }, false);
  await check('create: duration 1.5', CreatePlanificationDto, { ...base, duration: 1.5 }, false);
  await check('create: duration "12 semanas" (el contrato viejo)', CreatePlanificationDto, { ...base, duration: '12 semanas' }, false);
  await check('create: duration 2147483648 (fuera de INTEGER)', CreatePlanificationDto, { ...base, duration: 2147483648 }, false);
  await check('edit: sin duration (la edicion tambien la exige)', EditPlanificationDto, base, false);
  await check('assign: week 1', AssignRoutineToPlanificationDto, { planification_id: U, routine_id: U, week: 1 }, true);
  await check('assign: week 1 con order', AssignRoutineToPlanificationDto, { planification_id: U, routine_id: U, week: 1, order: 2 }, true);
  await check('assign: sin week', AssignRoutineToPlanificationDto, { planification_id: U, routine_id: U }, false);
  await check('assign: week 0', AssignRoutineToPlanificationDto, { planification_id: U, routine_id: U, week: 0 }, false);
  await check('assign: week 2147483648', AssignRoutineToPlanificationDto, { planification_id: U, routine_id: U, week: 2147483648 }, false);
  await check('bulk: week 2', AssignRoutinesToPlanificationDto, { planification_id: U, week: 2, routine_ids: [U] }, true);
  await check('bulk: sin week', AssignRoutinesToPlanificationDto, { planification_id: U, routine_ids: [U] }, false);
  await check('set-active: active false', SetRoutineAsignationActiveDto, { active: false }, true);
  await check('set-active: active true con week y order', SetRoutineAsignationActiveDto, { active: true, week: 3, order: 1 }, true);
  await check('set-active: week 0', SetRoutineAsignationActiveDto, { active: true, week: 0 }, false);
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
```

- [ ] **Paso 2:** ya se corrió en rojo en la Tarea 1; ahora, con el build de la Tarea 8: `cd "$SCRATCH" && node dto-check.js`. Esperado: `TODO OK`.

### 10b. Reglas del service con repositorios falsos

- [ ] **Paso 3: `rules-planification.js`** — instancia el `PlanificationService` **compilado** con un mini-ORM en memoria (tablas `Planification`, `Routine`, `RoutineAsignation`), un `DataSource` falso con `QueryRunner` que snapshotea al `startTransaction` y restaura al `rollbackTransaction`, y un `res` falso. Verifica códigos, mensajes, qué se guardó y qué no.

```js
const { createRequire } = require('module');
const PROJECT = 'D:/Power App/Backend/PowerApp-Backend/power-app';
const req = createRequire(PROJECT + '/package.json');
req('reflect-metadata');
const E = n => req(`${PROJECT}/dist/entities/${n}.entity.js`);
const { Planification } = E('planification'), { Routine } = E('routine'), { RoutineAsignation } = E('routine_asignation');
const { PlanificationService } = req(`${PROJECT}/dist/planification/planification.service.js`);

// ---- mini ORM en memoria ----
let seq = 1000;
const newId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const db = { Planification: [], Routine: [], RoutineAsignation: [] };
const T = cls => ({ [Planification.name]: 'Planification', [Routine.name]: 'Routine', [RoutineAsignation.name]: 'RoutineAsignation' })[cls.name];
const snap = () => JSON.parse(JSON.stringify(db));
// In(...) de TypeORM es un FindOperator con _type 'in' y _value (campos privados en TS, visibles en JS)
const matches = (row, where) => Object.entries(where || {}).every(([k, v]) =>
  v && v._type === 'in' ? v._value.includes(row[k]) : row[k] === v);
const mkRepo = (cls, getRows) => ({
  _cls: cls,
  create: o => ({ ...o }),
  async findOne(opts) {
    const row = getRows(cls).find(r => matches(r, opts.where)); if (!row) return null;
    const out = { ...row };
    if (cls === Planification && opts.relations) {   // detalle: rutinas + orden pedido
      db.__lastDetailOrder = opts.order;
      out.routineAsignations = db.RoutineAsignation.filter(a => a.planification_id === row.id)
        .sort((a, b) => a.week - b.week || a.order - b.order || a.created_at - b.created_at)
        .map(a => ({ ...a, routine: db.Routine.find(r => r.id === a.routine_id) }));
    }
    return out;
  },
  async find(opts) { return getRows(cls).filter(r => matches(r, opts.where)).map(r => ({ ...r })); },
  async save(e) {
    const rows = getRows(cls);
    if (!e.id) { e.id = newId(); e.created_at = new Date(seq); e.active = e.active ?? true; rows.push({ ...e }); }
    else { Object.assign(rows.find(r => r.id === e.id), e); }
    return e;
  },
  createQueryBuilder() {   // solo el MAX(...) de nextOrder y maxActiveWeek
    const params = {}; let sel = '';
    const qb = {
      select(s) { sel = s; return qb; },
      where(_, p) { Object.assign(params, p); return qb; }, andWhere(_, p) { Object.assign(params, p); return qb; },
      async getRawOne() {
        const rows = db.RoutineAsignation.filter(a => a.planification_id === params.idPlanification && a.active
          && (params.week === undefined || a.week === params.week));
        const col = /week\)/.test(sel) ? 'week' : 'order';
        return { max: rows.length ? Math.max(...rows.map(a => a[col])) : null };
      },
    };
    return qb;
  },
});
const live = () => db;
let tx = null;
const queryRunner = {
  isTransactionActive: false, calls: [],
  async connect() {}, async release() {},
  async startTransaction() { tx = snap(); this.isTransactionActive = true; },
  async commitTransaction() { this.isTransactionActive = false; tx = null; this.calls.push('commit'); },
  async rollbackTransaction() { Object.assign(db, tx); this.isTransactionActive = false; this.calls.push('rollback'); },
  manager: {
    findOne: (cls, o) => mkRepo(cls, c => live()[T(c)]).findOne(o),
    find: (cls, o) => mkRepo(cls, c => live()[T(c)]).find(o),
    create: (cls, o) => ({ ...o }),
    save: e => mkRepo(RoutineAsignation, () => db.RoutineAsignation).save(e),   // el service solo guarda asignaciones por aca
    getRepository: cls => mkRepo(cls, c => db[T(c)]),
  },
};
const service = new PlanificationService(
  mkRepo(Planification, c => db[T(c)]), mkRepo(Routine, c => db[T(c)]), mkRepo(RoutineAsignation, c => db[T(c)]),
  { createQueryRunner: () => queryRunner });

// ---- helpers de la prueba ----
const mkRes = () => ({ code: null, body: null, status(c) { this.code = c; return this; }, send(b) { this.body = b; return this; } });
let fails = 0;
const ok = (c, m) => { console.log(c ? 'OK   ' : 'FALLA', m); if (!c) fails++; };
const reset = () => { db.Planification = []; db.Routine = []; db.RoutineAsignation = []; queryRunner.calls = []; };
const plan = (duration, o = {}) => { const p = { id: newId(), name: 'P', number_of_routines: 3, duration, active: true, ...o }; db.Planification.push(p); return p; };
const routine = (o = {}) => { const r = { id: newId(), name: 'R', active: true, ...o }; db.Routine.push(r); return r; };
const asig = (p, r, week, order, active = true) => { const a = { id: newId(), routine_id: r.id, planification_id: p.id, week, order, active, created_at: new Date(++seq) }; db.RoutineAsignation.push(a); return a; };
const get = id => db.RoutineAsignation.find(a => a.id === id);

(async () => {
  let res;
  // ---------- crear y editar (E-09, E-10) ----------
  reset(); res = mkRes();
  await service.createPlanification({ name: 'Plan', number_of_routines: 3, duration: 12 }, res);
  ok(res.code === 201 && res.body.duration === 12 && typeof res.body.duration === 'number', 'create: 201 con duration numerica');
  reset(); res = mkRes();
  await service.createPlanification({ name: 'Plan', number_of_routines: 3, duration: 0 }, res);
  ok(res.code === 201 && res.body.duration === 0, 'create: duration 0 se guarda como 0 (no null)');

  reset(); let p = plan(10), r = routine(); asig(p, r, 6, 1); asig(p, r, 9, 1, false);
  res = mkRes(); await service.editPlanification(p.id, { name: 'P', number_of_routines: 3, duration: 4 }, res);
  ok(res.code === 400 && res.body.error === 'La planificación tiene rutinas en la semana 6: la duración no puede ser menor.', 'edit: achicar a 4 con rutina vigente en la semana 6 -> 400 con el texto de la spec');
  ok(db.Planification[0].duration === 10, 'edit: el 400 no cambia la duracion');
  res = mkRes(); await service.editPlanification(p.id, { name: 'P', number_of_routines: 3, duration: 6 }, res);
  ok(res.code === 200 && res.body.duration === 6, 'edit: achicar justo hasta la semana mas alta (6) -> 200; la inactiva de la semana 9 no cuenta');
  res = mkRes(); await service.editPlanification(p.id, { name: 'P', number_of_routines: 3, duration: 0 }, res);
  ok(res.code === 200 && res.body.duration === 0, 'edit: duration 0 (sin tope) -> 200 aunque haya rutinas');

  // ---------- asignar una rutina (E-12a) ----------
  reset(); p = plan(4); r = routine(); asig(p, r, 1, 1); asig(p, r, 1, 2); asig(p, r, 1, 3); asig(p, r, 2, 1); asig(p, r, 2, 7, false);
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: p.id, routine_id: r.id, week: 1 }, res);
  ok(res.code === 201 && db.RoutineAsignation.at(-1).week === 1 && db.RoutineAsignation.at(-1).order === 4, 'assign: sin order va al final de la semana 1 (order 4)');
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: p.id, routine_id: r.id, week: 2 }, res);
  ok(db.RoutineAsignation.at(-1).week === 2 && db.RoutineAsignation.at(-1).order === 2, 'assign: semana 2 -> order 2 (la inactiva con order 7 no cuenta)');
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: p.id, routine_id: r.id, week: 3 }, res);
  ok(db.RoutineAsignation.at(-1).week === 3 && db.RoutineAsignation.at(-1).order === 1, 'assign: semana vacia -> order 1');
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: p.id, routine_id: r.id, week: 1, order: 2 }, res);
  ok(db.RoutineAsignation.at(-1).order === 2 && db.RoutineAsignation.filter(a => a.week === 1 && a.order === 2).length === 2, 'assign: con order se guarda tal cual, aunque se repita');
  const antes = db.RoutineAsignation.length;
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: p.id, routine_id: r.id, week: 5 }, res);
  ok(res.code === 400 && /semana 5 supera la duración de la planificación \(4 semanas\)/.test(res.body.error) && db.RoutineAsignation.length === antes, 'assign: semana 5 con duration 4 -> 400 y no guarda nada');
  const p0 = plan(0);
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: p0.id, routine_id: r.id, week: 99 }, res);
  ok(res.code === 201 && db.RoutineAsignation.at(-1).week === 99, 'assign: duration 0 no limita la semana');
  const pOff = plan(4, { active: false });
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: pOff.id, routine_id: r.id, week: 1 }, res);
  ok(res.code === 400 && /dada de baja/.test(res.body.error), 'assign: plan de baja -> 400 (regla que ya existia)');
  const rOff = routine({ active: false, name: 'Vieja' });
  res = mkRes(); await service.assignRoutineToPlanification({ planification_id: p.id, routine_id: rOff.id, week: 1 }, res);
  ok(res.code === 400 && /Vieja/.test(res.body.error), 'assign: rutina de baja -> 400 con el nombre (regla que ya existia)');

  // ---------- asignar en lote (E-12b) ----------
  reset(); p = plan(3); r = routine(); const r2 = routine(); asig(p, r, 2, 1); asig(p, r, 2, 2);
  res = mkRes(); await service.assignRoutinesToPlanification({ planification_id: p.id, week: 2, routine_ids: [r.id, r2.id, r.id] }, res);
  const nuevas = db.RoutineAsignation.slice(2);
  ok(res.code === 201 && nuevas.length === 3 && nuevas.every(a => a.week === 2) && nuevas.map(a => a.order).join() === '3,4,5', 'bulk: consecutivas al final de la semana 2 (3,4,5), con repetidos permitidos');
  ok(queryRunner.calls.at(-1) === 'commit', 'bulk: commit');
  const n = db.RoutineAsignation.length; queryRunner.calls = [];
  res = mkRes(); await service.assignRoutinesToPlanification({ planification_id: p.id, week: 4, routine_ids: [r.id] }, res);
  ok(res.code === 400 && db.RoutineAsignation.length === n && queryRunner.calls.includes('rollback'), 'bulk: semana 4 con duration 3 -> 400, rollback y nada guardado');

  // ---------- quitar / reincorporar (E-12c) ----------
  reset(); p = plan(4); r = routine(); let a = asig(p, r, 3, 5);
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: false }, res);
  ok(res.code === 200 && !get(a.id).active && get(a.id).week === 3 && get(a.id).order === 5, 'set-active false: solo apaga el flag; conserva week y order');
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: false, week: 2 }, res);
  ok(res.code === 400 && /week y order/.test(res.body.error), 'set-active false + week -> 400');
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: false, order: 2 }, res);
  ok(res.code === 400, 'set-active false + order -> 400');
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: true }, res);
  ok(res.code === 200 && get(a.id).active && get(a.id).week === 3 && get(a.id).order === 5, 'reincorporar sin nada: vuelve a su lugar (week 3, order 5)');
  await service.setRoutineAsignationActive(a.id, { active: false }, mkRes()); asig(p, r, 1, 1); asig(p, r, 1, 2);
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: true, week: 1 }, res);
  ok(get(a.id).week === 1 && get(a.id).order === 3, 'reincorporar con week y sin order: al final de esa semana (3)');
  await service.setRoutineAsignationActive(a.id, { active: false }, mkRes());
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: true, order: 1 }, res);
  ok(get(a.id).week === 1 && get(a.id).order === 1, 'reincorporar solo con order: se guarda tal cual, en su semana');
  await service.setRoutineAsignationActive(a.id, { active: false }, mkRes());
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: true, week: 2, order: 9 }, res);
  ok(get(a.id).week === 2 && get(a.id).order === 9, 'reincorporar con week y order: los dos tal cual');
  db.Planification[0].duration = 1; await service.setRoutineAsignationActive(a.id, { active: false }, mkRes());
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: true }, res);
  ok(res.code === 400 && /semana 2 supera la duración de la planificación \(1 semanas\)\. Indicá una semana válida\./.test(res.body.error) && !get(a.id).active, 'reincorporar: duracion achicada mientras estaba de baja -> 400 y sigue de baja');
  res = mkRes(); await service.setRoutineAsignationActive(a.id, { active: true, week: 1 }, res);
  ok(res.code === 200 && get(a.id).week === 1, 'reincorporar con una semana valida: 200');
  res = mkRes(); await service.setRoutineAsignationActive(newId(), { active: true }, res);
  ok(res.code === 404, 'set-active: asignacion inexistente -> 404');

  // ---------- quitar / reincorporar en lote (E-12d) ----------
  reset(); p = plan(5); const p2 = plan(2); r = routine();
  const a1 = asig(p, r, 4, 1, false), a2 = asig(p, r, 2, 3, false), a3 = asig(p2, r, 2, 1, false);
  queryRunner.calls = [];
  res = mkRes(); await service.setRoutineAsignationsActive({ routine_asignation_ids: [a1.id, a2.id, a3.id], active: true }, res);
  ok(res.code === 200 && [a1, a2, a3].every(x => get(x.id).active), 'bulk reincorporar: todas vuelven (planes distintos)');
  ok(get(a1.id).week === 4 && get(a1.id).order === 1 && get(a2.id).week === 2 && get(a2.id).order === 3, 'bulk reincorporar: cada una en su lugar (week y order)');
  res = mkRes(); await service.setRoutineAsignationsActive({ routine_asignation_ids: [a1.id, a2.id, a3.id], active: false }, res);
  ok(res.code === 200 && [a1, a2, a3].every(x => !get(x.id).active) && get(a1.id).week === 4 && get(a1.id).order === 1, 'bulk quitar: conserva el lugar');
  db.Planification.find(x => x.id === p.id).duration = 3;       // a1 (semana 4) queda fuera
  queryRunner.calls = [];
  res = mkRes(); await service.setRoutineAsignationsActive({ routine_asignation_ids: [a2.id, a1.id, a3.id], active: true }, res);
  ok(res.code === 400 && new RegExp(a1.id).test(res.body.error) && [a1, a2, a3].every(x => !get(x.id).active) && queryRunner.calls.includes('rollback'),
    'bulk reincorporar: una fuera de la duracion -> 400, ninguna se aplica, rollback');
  res = mkRes(); await service.setRoutineAsignationsActive({ routine_asignation_ids: [a1.id, a1.id], active: false }, res);
  ok(res.code === 400 && /repetidos/.test(res.body.error), 'bulk: ids repetidos -> 400');
  res = mkRes(); await service.setRoutineAsignationsActive({ routine_asignation_ids: [a1.id, newId()], active: false }, res);
  ok(res.code === 404, 'bulk: alguna no existe -> 404');

  // ---------- lectura (E-08, detalle) ----------
  reset(); p = plan(6); r = routine(); const x = asig(p, r, 2, 1), y = asig(p, r, 1, 2), z = asig(p, r, 1, 1), off = asig(p, r, 1, 9, false);
  res = mkRes(); await service.getPlanificationById(p.id, res);
  ok(res.code === 200 && res.body.duration === 6, 'detalle: duration numerica');
  ok(res.body.routines.map(q => q.id).join() === [z.id, y.id, x.id].join(), 'detalle: ordenado por week, order (las inactivas no salen)');
  ok(res.body.routines.every(q => typeof q.week === 'number') && res.body.routines[0].week === 1 && res.body.routines[2].week === 2, 'detalle: cada rutina trae su week');
  ok(JSON.stringify(db.__lastDetailOrder) === JSON.stringify({ routineAsignations: { week: 'ASC', order: 'ASC', created_at: 'ASC' } }), 'detalle: pide a la base el orden week, order, created_at');

  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
  process.exit(fails ? 1 : 0);
})();
```

- [ ] **Paso 4:** `cd "$SCRATCH" && node rules-planification.js`. Esperado: `TODO OK`. Si el mini-ORM no soporta algo que el service llama, **ampliar el falso, no el service**.

### 10c. El SQL real de las consultas nuevas

- [ ] **Paso 5: `sql-check.js`** — arma un `DataSource` **sin conectarse**, deja que el service genere el SQL de `nextOrder` y de `maxActiveWeek` con repositorios reales (interceptando `getRawOne`), y ejecuta ese mismo SQL en PGlite sobre el `01` nuevo con datos. Verifica además el `ORDER BY` de `/all-plus`.

```js
const fs = require('fs'), { createRequire } = require('module');
const PROJECT = 'D:/Power App/Backend/PowerApp-Backend/power-app';
const req = createRequire(PROJECT + '/package.json');
req('reflect-metadata');
const { DataSource } = req('typeorm');
const { PGlite } = require('@electric-sql/pglite');
const { PlanificationService } = req(`${PROJECT}/dist/planification/planification.service.js`);
const E = n => req(`${PROJECT}/dist/entities/${n}.entity.js`);
const files = fs.readdirSync(PROJECT + '/dist/entities').filter(f => f.endsWith('.entity.js')).map(f => `${PROJECT}/dist/entities/${f}`);
let fails = 0; const ok = (c, m) => { console.log(c ? 'OK   ' : 'FALLA', m); if (!c) fails++; };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

(async () => {
  const ds = new DataSource({ type: 'postgres', entities: files });
  await ds.buildMetadatas();
  const pg = new PGlite();
  await pg.exec(fs.readFileSync('D:/Power App/Backend/PowerApp-Backend/Db Creator/01_estructura.sql', 'utf8'));
  await pg.exec(`INSERT INTO "Planification"(id,name,number_of_routines,duration) VALUES ('${id(1)}','P',3,6);
    INSERT INTO "Routine"(id,name) VALUES ('${id(2)}','R');
    INSERT INTO "Routine_Asignation"(routine_id,planification_id,week,"order",active) VALUES
     ('${id(2)}','${id(1)}',1,1,true),('${id(2)}','${id(1)}',1,2,true),('${id(2)}','${id(1)}',1,3,true),
     ('${id(2)}','${id(1)}',2,1,true),('${id(2)}','${id(1)}',2,7,false),('${id(2)}','${id(1)}',3,9,false)`);

  // Repositorio real (sin conexion) cuyo getRawOne ejecuta el SQL generado en PGlite
  const captured = [];
  const repo = ds.getRepository(E('routine_asignation').RoutineAsignation);
  const orig = repo.createQueryBuilder.bind(repo);
  repo.createQueryBuilder = alias => {
    const qb = orig(alias);
    qb.getRawOne = async function () {
      const [sql, params] = this.getQueryAndParameters(); captured.push(sql);
      return (await pg.query(sql, params)).rows[0];
    };
    return qb;
  };
  const svc = new PlanificationService({}, {}, repo, {});
  ok(await svc.nextOrder(id(1), 1) === 4, 'nextOrder(semana 1) = 4');
  ok(await svc.nextOrder(id(1), 2) === 2, 'nextOrder(semana 2) = 2: la inactiva con order 7 no cuenta');
  ok(await svc.nextOrder(id(1), 3) === 1, 'nextOrder(semana 3) = 1: solo hay una inactiva');
  ok(await svc.nextOrder(id(1), 4) === 1, 'nextOrder(semana vacia) = 1');
  ok(await svc.maxActiveWeek(id(1)) === 2, 'maxActiveWeek = 2: la inactiva de la semana 3 no cuenta');
  ok(await svc.maxActiveWeek(id(99)) === 0, 'maxActiveWeek de un plan sin rutinas = 0');
  console.log('   SQL de nextOrder:', captured[0]);

  // ORDER BY del detalle y de /all-plus
  const planRepo = ds.getRepository(E('planification').Planification);
  const qb = planRepo.createQueryBuilder('planification').setFindOptions({
    where: { id: id(1) }, relations: ['routineAsignations', 'routineAsignations.routine'],
    order: { routineAsignations: { week: 'ASC', order: 'ASC', created_at: 'ASC' } },
  });
  const sql = qb.getQuery(); const ob = sql.slice(sql.indexOf('ORDER BY'));
  ok(/week"? ASC.*order"? ASC.*created_at"? ASC/s.test(ob), 'detalle: el ORDER BY generado es week, order, created_at');
  ok((await pg.query(qb.getQueryAndParameters()[0].replace(/\$1/g, `'${id(1)}'`))).rows.length === 6, 'detalle: el SQL generado corre en Postgres y trae las 6 asignaciones');
  console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK'); process.exit(fails ? 1 : 0);
})();
```

- [ ] **Paso 6:** `node sql-check.js`. Esperado: `TODO OK`. (`nextOrder` y `maxActiveWeek` son privados en TypeScript pero accesibles desde JS.)

### 10d. Control de `editCircuit` (hallazgo 1)

- [ ] **Paso 7: comprobar el SQL de las dos consultas de historial** (sin base): en `sql-check.js`, agregar al final:

```js
  const finI = ds.getRepository(E('routine_asign_exercise_finished').RoutineAsignExerciseFinished).createQueryBuilder('f')
    .select('f.routine_exercise_id').where('f.routine_exercise_id IN (:...ids)', { ids: [id(2)] });
  ok(/"Routine_Asign_Exercise_Finished"/.test(finI.getQuery()) && /routine_exercise_id/.test(finI.getQuery()), 'editCircuit: la entidad nueva apunta a la tabla Routine_Asign_Exercise_Finished');
```
Y, **leyendo el código**, confirmar que `editCircuit` consulta las dos entidades antes de decidir entre `save` (baja lógica) y `remove` (física). Que el caso real (ejercicio entrenado por la vía individual → baja lógica) funcione **no se prueba en runtime**: queda en el plan de pruebas de BE-35.

---

## Tarea 11 — Specs de CU (en el repo PowerApp-Docs)

**Archivos:** `Use Cases/entrenador/CU-E-09`, `CU-E-10`, `CU-E-12`, `CU-E-12a`, `CU-E-12b`, `CU-E-12c`, `CU-E-12d`. Se reescribe sólo lo que cambió; el resto queda igual. (El E-08 no cambia: su spec no enumera campos.)

- [ ] **E-09 (crear)** — paso 1: `El entrenador ingresa los datos de la planificación (nombre, duración en semanas, etc.).` Y un camino alternativo nuevo:

```md
### En el paso 2 — Duración inválida

1. La duración no es un entero mayor o igual que 0, o falta. La duración se mide en **semanas**; 0 significa "sin duración fija".
2. El sistema marca el error y no persiste.
```
y en Alcance → Cubre: `- Alta de una Planification sistémica con sus datos base, incluida su duración en semanas (obligatoria).`

- [ ] **E-10 (editar)** — Cubre: `- Edición de los datos de la Planification sistémica, incluida su duración en semanas (obligatoria, como al crearla).` Camino alternativo nuevo:

```md
### En el paso 2 — Duración menor que la semana más alta en uso

1. La nueva duración es mayor que 0 y menor que la semana más alta ocupada por una rutina **vigente** del plan.
2. El sistema informa en qué semana hay rutinas, no permite achicar la duración hasta ahí y no persiste. Con duración 0 (sin duración fija) no hay límite.

### Consecuencia en las asignaciones a alumnos

1. La duración de la plantilla fija el fin de cada asignación a un alumno (inicio + semanas).
2. Editarla mueve el fin de **todos** los alumnos que tienen el plan asignado: es una consecuencia asumida.
```

- [ ] **E-12 (agrupador)** — Descripción: `…qué rutinas la componen, en qué semana, en qué orden, y cuáles se quitan.` Reglas comunes (reemplazan 1 y 3):

```md
1. **El plan se arma por semanas.** Cada rutina va en una `week` (entera, ≥ 1). Si la planificación tiene duración mayor que 0, la semana no puede superarla; con duración 0 no hay tope. Dentro de la semana, el `order` es una **etiqueta de orden**, no una posición exclusiva: puede tener huecos y duplicados —el alta persiste la posición recibida sin desplazar a nadie—. A igual `order`, se muestra primero la rutina que se asignó antes. La lista que devuelve el sistema es plana, ordenada por semana y orden; agrupar por semana es del cliente.
```
```md
3. **La baja del vínculo es siempre lógica y conserva su lugar.** Nunca se borra físicamente, porque del Routine_Asignation cuelga el historial de entrenamiento de los alumnos (Routine_Exercise_Finished). La baja sólo apaga el vínculo: la rutina conserva su semana y su orden, y reincorporarla la devuelve a su lugar.
```
Alcance → Fuera de alcance, sin cambios. Se borra la referencia a `User_Routine`.

- [ ] **E-12a (asignar una)** — Descripción: `…con la semana indicada por el entrenador y una posición indicada o calculada al final de esa semana.` Cubre: `- Alta de un vínculo Routine_Asignation entre una rutina y una planificación, con su week y su order.` Camino principal paso 3: `El entrenador selecciona una, indica la semana y, opcionalmente, la posición.` Postcondición: `…con su semana y su posición.` Alternativos (reemplazan "Sin posición" y suman la semana):

```md
### En el paso 3 — Sin posición indicada

1. El entrenador no indica un order.
2. El sistema agrega la rutina al final **de esa semana**, después de la última rutina vigente de ella (o en la posición 1 si la semana está vacía).

### En el paso 3 — Semana inválida

1. La semana falta, no es un entero mayor o igual que 1, o supera la duración de la planificación (cuando esta es mayor que 0).
2. El sistema informa el error y no crea el vínculo.
```
y "Posición ya ocupada": `…Las dos rutinas comparten posición **dentro de la semana** y se muestran…`.

- [ ] **E-12b (lote)** — Descripción: `…agregándolas al final de **una semana** del plan, en el orden en que fueron seleccionadas.` Cubre: `…con la misma semana y posiciones consecutivas al final de esa semana.` Paso 3: `El entrenador elige la semana y selecciona varias rutinas.` Postcondición: `…con la semana indicada y posiciones consecutivas a continuación de la última rutina vigente de esa semana.` Alternativo nuevo:

```md
### En el paso 3 — Semana inválida

1. La semana falta, no es un entero mayor o igual que 1, o supera la duración de la planificación (cuando esta es mayor que 0).
2. El sistema informa el error y **no crea ninguna** asignación.
```
Fuera de alcance suma: `- Repartir las rutinas del lote en semanas distintas: un lote es de una sola semana.`

- [ ] **E-12c (quitar o reincorporar una)** — Descripción: `…Nunca se borra físicamente, para preservar el historial de entrenamiento de los alumnos. Quitarla **conserva su semana y su orden**.` Postcondiciones: `Al quitar: el vínculo queda con active = false **y conserva su semana y su posición**; la planificación deja de mostrar esa rutina y deja de contarla en su total.` / `Al reincorporar: el vínculo vuelve a active = true y la rutina reaparece en el detalle del plan.` / `En los dos casos los Routine_Exercise_Finished de los alumnos quedan intactos.` Paso 3: `…marca el vínculo con active = false y confirma.` Alternativos (reemplazan "Reincorporar", "El resto no se renumera" y "Indicar una posición al quitar"):

```md
### Reincorporar la rutina

1. El entrenador vuelve a incorporar un vínculo dado de baja e indica, opcionalmente, la semana y la posición.
2. Sin ninguna de las dos, la rutina **vuelve a su lugar**: su semana y su posición de antes. Con semana y sin posición, va al final de esa semana. Con posición, se guarda tal cual (puede repetirse).

### Reincorporar a una semana que ya no existe

1. La duración del plan se achicó mientras la rutina estaba de baja, y su semana (o la indicada) supera la duración actual.
2. El sistema lo informa, pide una semana válida y no reincorpora.

### En el paso 3 — El resto del plan no se renumera

1. Al quitar la rutina, las que quedan conservan su semana y su posición, y la quitada también.
2. La secuencia no se reescribe: se evita tocar todos los vínculos del plan en cada baja.

### Indicar semana o posición al quitar

1. El entrenador intenta indicar una semana o una posición junto con la baja.
2. El sistema rechaza la operación: sólo tienen sentido al reincorporar, porque la baja siempre conserva el lugar.
```

- [ ] **E-12d (lote)** — Descripción: `…o los reincorpora en bloque, cada uno a su lugar.` Cubre: `- Reactivación en bloque de varios vínculos, que vuelven a su semana y su posición.` Fuera de alcance: `- Indicar una semana o una posición puntual al reincorporar: para eso está CU-E-12c, que se ejecuta de a uno.` Postcondiciones: `Al quitar: todos quedan con active = false y conservan su semana y su posición…` / `Al reincorporar: todos vuelven a active = true, cada uno a su lugar.` / `En los dos casos los Routine_Exercise_Finished de los alumnos quedan intactos.` Paso 3: `…marca todos los vínculos con active = false en una sola transacción y confirma.` Alternativos: "Reincorporar en bloque" → `El sistema los reactiva en una sola transacción, cada uno en su semana y su posición.`; y uno nuevo:

```md
### En el paso 3 — Algún vínculo queda fuera de la duración

1. Al reincorporar, uno o más vínculos están en una semana que supera la duración actual de su planificación.
2. El sistema informa cuál es y **no reincorpora ninguno**.
```

- [ ] **Verificación de las specs:** `grep -rn "User_Routine\|sin posición\|posición, porque la baja" "Use Cases/entrenador/CU-E-12*" "Use Cases/entrenador/CU-E-09*" "Use Cases/entrenador/CU-E-10*"` no devuelve texto viejo.

---

## Tarea 12 — Status (informe y dashboard)

**Archivos:** `Status/estado-implementacion-backend.md` y `Status/dashboard-estado-backend.html`. Sólo en este repo (la copia a `PowerApp-Docs` la sincroniza el usuario). **Los conteos no cambian** (57 ✅ · 8 🟡 · 3 🔵 · 6 ⬜ · 1 sin backend): ningún CU cambia de estado.

- [ ] **Paso 1: entrada nueva arriba de "Cambios recientes"**: `## Cambios recientes (2026-10-17 · modelo de ejecución y planificaciones por semanas)`. Va **con el porqué de cada cambio** (pedido del usuario: que nadie "corrija" en la dirección equivocada). Puntos obligatorios:
  1. **Qué tareas son** (BE-10 y BE-10b, fusionadas) y **por qué se fusionaron** (BE-10 sola no compila y rompería E-12 en Render: las 5 líneas del hallazgo de la §0).
  2. **Las dos vías de ejecución separadas** (D1) y por qué no se unificó en `User_Routine`.
  3. **`Routine_Asignation_User`**: por qué se sacaron `routine_asignation_id` y `order`, y por qué `date` + único (D2).
  4. **`User_Routine` eliminada** (D11): sin fecha no guardaba nada propio y no distinguía dos asignaciones del mismo plan; `Routine_Exercise_Finished` cuelga de `User_Planification` + `Routine_Asignation`, todas `RESTRICT` (y la consistencia que la base no garantiza y valida el service).
  5. **`Routine_Asignation.week` y `order` NOT NULL** (D10): la baja conserva el lugar; `order` sigue siendo etiqueta.
  6. **`Planification.duration` en semanas** (D9) y **`User_Planification` sin `duration` ni `end_date`** (D12), con la consecuencia asumida (editar la duración mueve el fin de todos) y que `number_of_routines` quedó NOT NULL (DB3).
  7. **Contrato nuevo para el web** (E-09, E-10, E-12a a E-12d): `duration` y `week` obligatorios, el 400 al achicar, la lista plana ordenada. **Rompe** a un cliente que mande `duration` como texto o `assign` sin `week` (`forbidNonWhitelisted`).
  8. **Hallazgo: `editCircuit`** ahora consulta las dos tablas de "hecho", y por qué (invariante de E-23/A-06).
  9. **El patch** (`Db Creator/patches/2026-10-17-be-10.sql`): las guardas, la idempotencia, y la advertencia de que `duration` no convierte unidades (`'3 meses'` → 3 semanas) y cómo revisarlo antes.
  10. **Decisiones menores**: `date` tipado `string`, el tope técnico `2147483647`, los tres índices nuevos, la tolerancia de mover una asignación ya activa al reactivar.
  11. **Verificación**, con lo que se corrió y lo que **no**: build · dos regeneraciones idénticas (`02` y `03` sin cambios) · **`01` y esquema parcheado contra el diagrama de `Doc/`** (con su fecha y sha256; 0 diferencias nuevas, y las tres desalineaciones previas del dibujo, `User.role`, `User.profile_picture` y `User.email`, anotadas como no tocadas) · `01` contra entidades (`buildMetadatas`, sin conexión) · patch ejecutado en PGlite (versión usada) · reglas del service con repositorios falsos · DTOs · SQL de las consultas nuevas. **Sin verificar:** nada de esto corrió contra Render ni contra el server real; el patch se probó en PGlite y no en el Postgres de Render; el camino real de `editCircuit` con un ejercicio entrenado por la vía individual queda para BE-35.
  12. **Para el web y el iOS**: qué regenerar. **Para BE-23**: el esquema ya está; al regenerar la base no hace falta el patch.

- [ ] **Paso 2: arreglar lo que quedó falso** (secciones vivas; los cambios fechados de agosto y septiembre **no se tocan**, son historia):
  - **Hallazgo 2** (md y dashboard): hoy dice *"hoy `User_Routine` sólo cuelga de una planificación (DA1)"*. Reescribir: las dos tablas de ejecución existen (`Routine_Exercise_Finished` y `Routine_Asign_Exercise_Finished`), sigue sin haber ningún endpoint que las escriba, y lo resuelve el bloque A.
  - **Detalle del Entrenador** (md): notas de E-09, E-10, E-12a a E-12d (`duration` en semanas, `week`, la baja conserva el lugar); E-13 y E-14 (nombran `User_Routine`: E-14 "apaga la `User_Planification`", sin sus instancias).
  - **Tabla "Plan de trabajo"**: la fase 2 pasa de "⏭ sigue" a "en curso: BE-10 y BE-10b hechas el 17/10".
  - **Dashboard**: las mismas notas en las filas de E-09/E-10/E-12a–d/E-13/E-14, el hallazgo 2 y el chip de la fase 2. El "corte" sigue en 2026-10-17.
  - `grep -n "User_Routine" Status/*` → quedan sólo menciones **históricas** (entradas fechadas).

---

## Tarea 13 — Stage y mensajes de commit

- [ ] **Paso 1: backend** (todo lo de este repo; `git rm` ya dejó la baja de la entidad):

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src "Db Creator/ddl.py" "Db Creator/01_estructura.sql" "Db Creator/patches/2026-10-17-be-10.sql" Status && git status --short && git diff --cached --stat | tail -3
```
Esperado: ningún archivo ajeno (ni `Db Creator/02_*`, ni `03_*`, ni `__pycache__`).

- [ ] **Paso 2: docs**

```bash
cd "D:/Power App/Docs/PowerApp-Docs" && git add "Doc/plans/2026-10-17-be-10-modelo-ejecucion-y-refactor-planificaciones-plan.md" "Use Cases/entrenador" && git status --short
```
- [ ] **Paso 3:** proponer un mensaje por repo, **sin commitear ni pushear**.

---

## Tarea 14 — Memoria del proyecto

- [ ] Actualizar `project_cu_status.md` (BE-10 y BE-10b hechas, sigue BE-11) y `project_data_model_reconciliation.md` (el desvío de `Routine_Asignation_User` quedó resuelto; el esquema del 17/10 ya está en entidades y `Db Creator`; `User_Routine` ya no existe). Y la regla nueva que deja el hallazgo 1: **toda tabla nueva que referencie `Routine_Exercise` obliga a revisar `editCircuit`**.

---

## 4. Qué NO verifica este plan

- **Runtime.** Nada corre contra Render ni contra el server (lo levantás vos). El patch se ejecuta en **PGlite** (Postgres real, pero en memoria y no el de Render): prueba la lógica y la sintaxis, no los permisos ni el tamaño de la base viva.
- **Las consultas `find` con orden anidado de tres niveles** (riesgo del detalle de rutina, spec §12): sigue sin probarse contra una base; BE-35.
- **`editCircuit` con un ejercicio realmente entrenado por la vía individual**: el código consulta las dos tablas, pero el camino de punta a punta necesita datos que recién crea BE-14. Queda para BE-35.
- **El mini-ORM de los scripts** es un falso: prueba las reglas del service, no el SQL que TypeORM arma para cada `find`/`save`. Eso lo cubre en parte `sql-check.js` (las dos agregaciones y el `ORDER BY`).

## 5. Autoevaluación contra la spec

- **Cobertura:** cada fila de la tabla de la sección 3 tiene tarea. Lo único fuera de la spec es la Tarea 3 (hallazgo 1), y está marcado.
- **Sincronía con el modelo:** las 15 diferencias entre el diagrama de `Doc/` y el DDL de HEAD (sección 3b) son exactamente las que cubren las Tareas 2 a 5; la Tarea 9c las vuelve a medir al final. No hay ninguna diferencia del diagrama que el plan ignore, salvo las tres previas, declaradas.
- **Placeholders:** no quedan "TBD" ni "a completar". Lo que el plan **no** puede fijar de antemano es el texto final de la entrada del Status (depende de los resultados de la verificación): se especificó punto por punto qué debe decir.
- **Consistencia de nombres:** `weekOutOfDuration`, `nextOrder(idPlanification, week, manager?)`, `maxActiveWeek`, `INTEGER_MAX`, `RoutineAsignExerciseFinished`, `uk_rau_routine_user_date`, `uk_raef_asign_exercise`, `uk_ref_plan_asignation_exercise` se usan igual en las entidades, el DDL, el patch, el service y los scripts.
- **Reglas del proyecto:** los handlers no cambian (siguen con `await`); el `connect()`/`startTransaction()` de los lotes sigue dentro del `try`; los mensajes van en español con `{ error }`; ningún 403 nuevo (no se agrega ninguno).

## 6. Después de esto

La tarea siguiente es **BE-11** (asignar y quitar rutinas individuales, E-19 y E-20; spec §4.1 y §4.2): ya tiene la tabla, el único y el `RESTRICT` que necesita.
