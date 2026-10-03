# Spec — Ajuste de modelo: circuitos reutilizables (`Circuit`, `Routine_Circuit`)

> **Fecha:** 2026-08-19 · **Bloque:** Circuitos (vence 21/8) · **Estado:** diseño aprobado, pendiente de plan
> **CU habilitados:** CU-E-21 → CU-E-24 (y desbloquea CU-E-15 → CU-E-18 y CU-U-12)

## 1. Contexto y objetivo

Las entidades TypeORM del backend quedaron desalineadas respecto del modelo vigente en `Doc/PowerApp - Modelo DB.svg` (y su `.pdf`), que es la fuente de verdad del proyecto. El desvío central: hoy `Circuit` cuelga de una rutina (`routine_id`, 1:N), mientras que el modelo lo define como **pieza global reutilizable** vinculada a rutinas por la tabla join `Routine_Circuit` (M:N con orden).

Ese desvío bloquea todo el bloque de Circuitos (CU-E-21 → CU-E-24), porque los cuatro CU asumen la forma reutilizable: el listado ofrece "piezas para armar rutinas", editar un circuito impacta en **todas** las rutinas que lo usan, y la baja es lógica justamente para no romper esas rutinas.

**Objetivo:** alinear las entidades y los scripts de base con el modelo de `Doc/`, sin implementar todavía ningún endpoint. Es el paso previo a los CRUD.

## 2. Alcance

**Incluye:**

- Reescritura de `Circuit`: sacar `routine_id`, agregar `description`, `type`, `active`.
- Nueva entidad `Routine_Circuit` (join M:N con `order`).
- `Routine`: reapuntar la relación `circuits` → `routineCircuits`.
- `Routine_Exercise`: quitar `user_note` y `finished`.
- Nueva entidad `Routine_Exercise_Set_Finished` (pieza A de la spec del 2026-08-10, que quedó sin implementar).
- Actualización de `Db Creator` (`ddl.py` → `01_estructura.sql`) y de los artefactos de `Status/`.

**Fuera de alcance:**

- Endpoints, DTOs y lógica de servicio de circuitos (CU-E-21 → CU-E-24): van en el paso siguiente.
- Endpoints de CU-U-12 (marcar set como realizado): la entidad se crea acá, los endpoints no.
- Ensamblado de rutinas (CU-E-15 → CU-E-18), bloque del 28/8.
- `Routine_Asignation_User` (le sobran `routine_asignation_id` y `order` respecto del modelo): decisión del usuario de dejarlo intacto — sus CU (E-19/E-20) son de los últimos y podrían quedar post-MVP.
- `Membership_Payment.name`: **no es un desvío**; el campo se agregó al diagrama, las entidades ya estaban bien.
- Definición del conjunto cerrado de valores de `Circuit.type` (ver §7).

## 3. Modelo de datos

### 3.1 `Circuit` (reescritura)

Deja de depender de `Routine`. Se elimina la columna `routine_id`, su FK, su índice y la relación `ManyToOne`.

| Campo | Tipo | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `name` | varchar(100) | NOT NULL |
| `description` | varchar(100) | nullable |
| `type` | varchar(30) | NOT NULL |
| `active` | boolean | NOT NULL, default `true` |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now, on update |

Relaciones: `OneToMany → Routine_Exercise` (`routineExercises`, ya existía) y `OneToMany → Routine_Circuit` (`routineCircuits`, nueva).

### 3.2 `Routine_Circuit` (nueva)

Tabla join que vincula rutinas con circuitos y fija el orden dentro de la rutina.

| Campo | Tipo | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `routine_id` | uuid | FK → `Routine.id`, `ON DELETE CASCADE`, NOT NULL |
| `circuit_id` | uuid | FK → `Circuit.id`, `ON DELETE RESTRICT`, NOT NULL |
| `order` | integer | NOT NULL |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now, on update |

- **Sin UNIQUE sobre (`routine_id`, `circuit_id`)**: un mismo circuito puede aparecer más de una vez en la misma rutina (p. ej. un bloque que se repite, o un calentamiento reusado como vuelta a la calma). El `order` distingue las apariciones. Consecuencia: la reconciliación de CU-E-17 tendrá que trabajar por posición y no por `circuit_id`.
- `order` es palabra reservada en Postgres → va escapada en el DDL (`"order"`). En la entidad se declara como el `order` de `Routine_Asignation`, sin `name` explícito: TypeORM cita los identificadores al generar SQL.
- `ON DELETE RESTRICT` en `circuit_id`: la baja de circuitos es **lógica** (CU-E-24), nunca física, así que el RESTRICT no limita ningún flujo de la app; actúa como red de seguridad para que un borrado manual en la base no vacíe rutinas en silencio.
- Índices: `(routine_id, "order")` y `(circuit_id)`.

### 3.3 `Routine` (ajuste de relación)

`@OneToMany(() => Circuit, circuit => circuit.routine) circuits` se reemplaza por `@OneToMany(() => RoutineCircuit, rc => rc.routine) routineCircuits`. No cambia ninguna columna de `Routine`.

### 3.4 `Routine_Exercise` (ajuste)

Se eliminan las columnas `user_note` y `finished`: son estado **por usuario y por instancia de rutina**, y `Routine_Exercise` es parte de la plantilla genérica y compartida del circuito. Ese estado pasa a `Routine_Exercise_Set_Finished`. `coach_note` se mantiene (lo define el entrenador sobre la plantilla).

### 3.5 `Routine_Exercise_Set_Finished` (nueva)

Junction cuya **existencia** representa que el set está hecho, para esa instancia de rutina de ese usuario.

| Campo | Tipo | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `user_routine_id` | uuid | FK → `User_Routine.id`, `ON DELETE CASCADE`, NOT NULL |
| `routine_exercise_set_id` | uuid | FK → **`Exercise_Set.id`**, `ON DELETE CASCADE`, NOT NULL |
| `user_note` | varchar(100) | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now, on update |

- **UNIQUE (`user_routine_id`, `routine_exercise_set_id`)** — un set no se marca dos veces en la misma instancia.
- El nombre `routine_exercise_set_id` es el del diagrama y se mantiene, aunque referencie a `Exercise_Set.id`. La spec del 2026-08-10 proponía renombrarlo a `exercise_set_id`; queda descartado.
- `Exercise_Set` no cambia (no lleva `finished`).

### 3.6 Wiring en NestJS

`RoutineModule.forFeature` suma `RoutineCircuit`, `RoutineExerciseSetFinished` y `UserRoutine`. Es necesario: con `autoLoadEntities: true`, TypeORM solo registra las entidades declaradas en algún `forFeature`.

## 4. Impacto en `Db Creator`

En `ddl.py` (fuente del DDL):

- `Circuit`: quitar `routine_id`, la FK `fk_circuit_routine` y el índice `idx_circuit_routine_id`; agregar `description`, `type`, `active`. **Mover el `CREATE TABLE` al bloque de tablas sin dependencias**, porque ya no depende de `Routine`.
- `Routine_Circuit`: crear tabla con sus dos FKs (routine CASCADE / circuit RESTRICT) e índices.
- `Routine_Exercise`: quitar `user_note` y `finished`.
- `Routine_Exercise_Set_Finished`: crear tabla con FKs CASCADE y el UNIQUE.

Luego `python build_sql.py` (parado en `Db Creator/`) regenera `01_estructura.sql`.

**`02_datos_estaticos.sql` y `03_datos_dinamicos.sql` no cambian:** se verificó que ningún generador (`gen_seed.py`, `static_extra.py`, `catalogo_ejercicios.py`, `dynamic_data.py`) inserta en `Circuit`, `Routine_Circuit`, `Routine_Exercise`, `Exercise_Set` ni `Routine_Exercise_Set_Finished`.

## 5. Impacto en `Status/`

Ningún CU pasa a ✅ con este cambio (no hay endpoints nuevos). Se actualizan:

- `Status/estado-implementacion-CU.md`: sección "Cambios recientes" y los hallazgos que hoy declaran que `Circuit` está desalineado del modelo y que `finished` está en la clase equivocada. CU-U-12 sigue ⬜ (la entidad existe, los endpoints no).
- `Status/dashboard-estado-CU.html`: mismo contenido, sin cambios de conteos.

## 6. Verificación

- **Compilación:** `npm --prefix power-app run build` en verde. Es la verificación principal: la base del proyecto está vencida (free tier), así que no hay runtime.
- **Sincronía de scripts:** regenerar con `python build_sql.py` y confirmar que `01_estructura.sql` refleja los cambios y que `02`/`03` quedan idénticos.
- **Regresión por grep:** confirmar que ningún archivo fuera de `entities/` referencia `circuit.routine_id`, `routine_exercise.finished` ni `routine_exercise.user_note`. Estado al escribir esta spec: la única mención a `Circuit` fuera de las entidades es el `forFeature` de `routine.module.ts`, y no hay lecturas de `finished`/`user_note`.
- **Aplicación a la base:** queda pendiente de que haya una base nueva. Los `.sql` quedan listos para correr en orden 01 → 02 → 03.

## 7. Riesgos y notas

- **`Circuit.type` es string libre por ahora.** La intención es cerrarlo a un conjunto de valores por función dentro de la rutina (entrada en calor / principal / accesorio / cardio / estiramiento), pero la definición queda para más adelante. Manteniéndolo `varchar(30)`, cerrarlo después es solo agregar validación en el DTO: no toca la base ni requiere regenerarla.
- **Editar un circuito impacta en todas las rutinas que lo usan.** Es el comportamiento buscado (CU-E-23 lo dice explícitamente), pero conviene que el front lo advierta al entrenador.
- **Sin unique en `Routine_Circuit`**, la reconciliación de CU-E-17 es más cara (por posición, no por id de circuito). Es el costo aceptado de permitir repeticiones.
- **`user_note` queda acoplado al "hecho":** solo existe nota si el set está marcado. Decisión ya aceptada en la spec del 2026-08-10.
- La regeneración de la base es destructiva: se recrea desde cero. No hay datos productivos en juego (la base está vencida).
