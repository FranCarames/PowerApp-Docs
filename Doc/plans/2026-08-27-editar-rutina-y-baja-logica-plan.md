# Editar rutina y baja lógica (CU-E-17, CU-E-18) — Plan de implementación

> **Spec:** `Doc/specs/2026-08-27-editar-rutina-y-baja-logica-design.md`
> Los pasos usan checkbox (`- [ ]`) para ir tildando.

**Goal:** `POST /routine/edit/:id`, que pisa la cabecera y la lista completa de circuitos de una rutina en una sola transacción reconciliando por `Routine_Circuit.id`, y `POST /routine/set-active/:id` para la baja lógica. Con eso el bloque de Rutinas queda cerrado salvo E-19/E-20, que son post-MVP.

**Architecture:** `Routine_Circuit` gana baja lógica (`active`) y su `order` pasa a nullable: un vínculo que sale de la rutina se apaga con `order = null` en vez de borrarse, para conservar la traza de qué circuitos la integraron. La reconciliación va por el `id` del vínculo —no por `circuit_id`, que no identifica nada porque un circuito puede repetirse en la rutina—, así que el body lleva un `id` opcional por ítem: con `id` sobrevive, sin `id` es nuevo, y lo que no vuelve se apaga. Las lecturas del entrenador filtran los apagados con un helper parametrizado que la futura vista del alumno va a reusar.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL. Validación con `class-validator` / `class-transformer` vía el pipe global (`whitelist` + `forbidNonWhitelisted`).

**Convenciones:** no se commitea (queda stageado + mensaje sugerido); no se levanta el server; la verificación del agente es `npm --prefix power-app run build`. Las pruebas de runtime quedan para el usuario, aplicando el patch de `Db Creator/patches/`.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `power-app/src/entities/routine_circuit.entity.ts` | Modificar | `+ active`; `order` pasa a `number \| null` |
| `power-app/src/entities/routine.entity.ts` | Modificar | `coach_note` acepta `null` explícito |
| `power-app/src/dtos/routine/edit_routine.dto.ts` | Crear | Body de la edición, con `id?` por ítem |
| `power-app/src/dtos/routine/set_routine_active.dto.ts` | Crear | Body de la baja lógica |
| `power-app/src/dtos/routine/routine_detail_response.dto.ts` | Modificar | Documentar que sólo salen los vínculos activos |
| `power-app/src/dtos/routine/routine_list_item_plus_response.dto.ts` | Modificar | Ídem |
| `power-app/src/routine/routine.service.ts` | Modificar | `editRoutine`, `setRoutineActive`, filtros de inactivos |
| `power-app/src/routine/routine.controller.ts` | Modificar | `POST /edit/:id`; `DELETE /:id` → `POST /set-active/:id` |
| `power-app/src/planification/planification.controller.ts` | Modificar | Sacar los andamios de E-19/E-20 |
| `Db Creator/ddl.py` | Modificar | `active` + `order` nullable en `Routine_Circuit` |
| `Db Creator/01_estructura.sql` | Regenerar | Salida de `build_sql.py` |
| `Db Creator/patches/2026-08-27-cu-e-17.sql` | Crear | Delta idempotente para la base viva |
| `Status/estado-implementacion-CU.md` | Modificar | E-17/E-18 a ✅, E-19 a ⬜, conteos, hallazgos, cronograma |
| `Status/dashboard-estado-CU.html` | Modificar | Lo mismo, en el dashboard |

`02_datos_estaticos.sql` y `03_datos_dinamicos.sql` **no cambian**: ningún generador inserta en `Routine_Circuit` (verificado con grep sobre los cuatro `.py` de datos).

---

### Task 1: Modelo — baja lógica del vínculo rutina↔circuito

**Files:**
- Modify: `power-app/src/entities/routine_circuit.entity.ts`
- Modify: `power-app/src/entities/routine.entity.ts`

- [ ] **Step 1: `Routine_Circuit` gana `active` y su `order` pasa a nullable**

Reemplazar el bloque de `order` por:

```ts
    // Nullable a proposito: el order se normaliza a 1..N en cada escritura, asi que un
    // vinculo apagado no ocupa ninguna posicion. Dejarle el numero viejo haria que la
    // columna signifique dos cosas y repitiera posiciones que ya ocupa otro circuito
    @ApiPropertyOptional({ example: 1, description: 'null en los vinculos dados de baja' })
    @Column({ type: 'integer', nullable: true })
    order?: number | null;

    // Baja logica: un circuito que sale de la rutina no se borra, se apaga. Ninguna FK
    // apunta aca, asi que no es para proteger historial: es para conservar la traza de
    // que circuitos integraron la rutina, que es lo que el alumno efectivamente ejecuto
    @ApiProperty({ example: true })
    @Column({ nullable: false, default: true })
    active!: boolean;
```

Agregar `ApiPropertyOptional` al import de `@nestjs/swagger`.

- [ ] **Step 2: `Routine.coach_note` acepta `null`**

Mismo motivo que `Circuit.description` en E-23: TypeORM ignora las propiedades `undefined`, así que sin la unión explícita el entrenador no puede **borrar** una nota que ya no aplica. El `type: 'varchar'` es obligatorio con la unión (TS emite `design:type = Object` para `string | null`).

```ts
    @ApiPropertyOptional({ example: 'Enfocarse en la contracción', maxLength: 100 })
    @Column({ type: 'varchar', length: 100, nullable: true })
    coach_note?: string | null;
```

---

### Task 2: DTOs

**Files:**
- Create: `power-app/src/dtos/routine/edit_routine.dto.ts`
- Create: `power-app/src/dtos/routine/set_routine_active.dto.ts`

- [ ] **Step 3: `EditRoutineDto`**

No puede extender `CreateRoutineDto` como hizo `EditCircuitDto`, porque el ítem cambia de forma: suma `id?`. Se declara entero.

```ts
export class EditRoutineCircuitDto {
    // El id del Routine_Circuit, no el del Circuit. Su presencia es lo que distingue
    // un vinculo que sobrevive de uno nuevo: sin id se crea, con id se mantiene, y lo
    // que el server tenia y no vuelve en la lista se apaga
    @IsOptional() @IsUUID('all') id?: string;

    @IsNotEmpty() @IsUUID('all') circuit_id!: string;

    @IsNotEmpty() @IsInt() @Min(1) order!: number;
}

export class EditRoutineDto {
    name!: string;          // @IsNotEmpty @IsString @MaxLength(50)
    coach_note?: string;    // @IsOptional @IsString @MaxLength(100)
    circuits!: EditRoutineCircuitDto[];  // @ArrayNotEmpty @ArrayMaxSize(50) @ValidateNested
}
```

Copiar los decoradores y los `@ApiProperty` de `CreateRoutineDto`, ajustando las descripciones al contexto de edición. **`@IsUUID('all')`, no `'4'`** — los ids sembrados son v5.

- [ ] **Step 4: `SetRoutineActiveDto`**

Copia literal de `SetCircuitActiveDto` cambiando el texto del `@ApiProperty`.

---

### Task 3: Service — `editRoutine`

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 5: Validaciones previas a la transacción**

Antes de abrir el `QueryRunner`, igual que en `createRoutine`:

- `order` duplicado → `400 'Dos circuitos no pueden ocupar la misma posición: el campo order tiene valores repetidos.'`
- El mismo `id` de vínculo dos veces → `400 'Un mismo circuito de la rutina no puede venir dos veces en la lista.'`

- [ ] **Step 6: Carga y precondiciones**

Dentro de la transacción, cargar la rutina con `relations: ['routineCircuits']` — **todos**, activos e inactivos, para poder reactivar por `id` (§5.3 de la spec).

- `404 'Rutina no encontrada'` si no existe.
- `400` si `!routine.active`, con el mismo texto que `editCircuit`: *"La rutina «X» está dada de baja y no se puede editar. Reactivala primero."*

- [ ] **Step 7: Validar los `id` recibidos**

Por cada ítem con `id`, buscarlo en `routine.routineCircuits`:

- no está → `400 'El circuito con id ... no pertenece a esta rutina.'`
- está pero su `circuit_id` no coincide con el del body → `400 'El circuito ... no coincide con el vínculo enviado.'`

Son bugs del front, pero un mensaje explícito ahorra media hora de debug del otro lado.

- [ ] **Step 8: Validar los circuitos**

`find(Circuit, { where: { id: In(uniqueCircuitIds) }, select: { id, name, active } })`.

- Falta alguno → `404 'Algunos circuitos no fueron encontrados'` (mismo texto que el alta).
- Circuito inactivo **en un ítem sin `id`** → `400` con el nombre: *"El circuito «X» está dado de baja y no puede agregarse a la rutina."* Un inactivo en un ítem **con `id`** se acepta: ya estaba (§5.2).

- [ ] **Step 9: Reconciliar**

```
circuitsInOrder = [...dto.circuits].sort((a, b) => a.order - b.order)
keptIds = new Set(items con id)

// salen
for (rc of routine.routineCircuits.filter(rc => rc.active && !keptIds.has(rc.id))) {
    rc.active = false; rc.order = null; save(rc)
}

// entran / sobreviven
for ([index, item] of circuitsInOrder.entries()) {
    if (item.id) { existente.active = true; existente.order = index + 1; save(existente) }
    else          { save(create(RoutineCircuit, { routine_id, circuit_id, order: index + 1, active: true })) }
}
```

El `order` persistido sale de la posición tras ordenar, no del valor recibido — misma regla que el alta.

- [ ] **Step 10: Cabecera, commit y respuesta**

`name`, `coach_note ?? null`, `updated_at = new Date()` (el `onUpdate` es sintaxis de MySQL y en Postgres no hace nada). Commit, `findRoutineDetail`, `200` con `buildRoutineDetailResponse`.

El `catch` va con la guarda `if (queryRunner.isTransactionActive)`, porque la recarga del detalle pasa después del commit.

---

### Task 4: Service — `setRoutineActive` y filtros de inactivos

**Files:**
- Modify: `power-app/src/routine/routine.service.ts`

- [ ] **Step 11: `setRoutineActive`**

Copia de `setCircuitActive` sobre `routineRepository`: `404` si no existe, si no `active = dto.active`, save y `200` con la entidad.

- [ ] **Step 12: Filtrar los apagados en las tres lecturas**

| Método | Cambio |
|---|---|
| `buildRoutineDetailResponse` | Segundo parámetro `visibleInactiveIds?: Set<string>`; `.filter(rc => rc.active \|\| visibleInactiveIds?.has(rc.id))` antes del `.map` |
| `getAllRoutinesPlus` | `leftJoinAndSelect('routine.routineCircuits', 'routineCircuit', 'routineCircuit.active = true')` — sigue siendo `leftJoin`, así que una rutina sin circuitos activos igual aparece |
| `getAllRoutines` | Cuarto argumento del `loadRelationCountAndMap`: `qb => qb.andWhere('routineCircuit.active = true')` |

Va el comentario de por qué el helper está parametrizado, con el contrato de §6.2 de la spec (el alumno ve un circuito apagado si y sólo si completó algún ejercicio suyo en esa instancia de rutina).

---

### Task 5: Controller

**Files:**
- Modify: `power-app/src/routine/routine.controller.ts`
- Modify: `power-app/src/planification/planification.controller.ts`

- [ ] **Step 13: `POST /edit/:id` y `POST /set-active/:id`**

Conectar `editRoutine` con `EditRoutineDto` y `@ApiResponse({ status: 200, type: RoutineDetailResponseDto })`.

Borrar el bloque `DELETE /:id` y poner en su lugar `POST /set-active/:id`, declarado igual que el de circuitos. Sacar el `Delete` del import de `@nestjs/common` si queda sin uso, y el `TODO` de los DTOs pendientes.

**Ojo con el orden de las rutas:** `set-active/:id` tiene dos segmentos, así que no matchea `/:id` y puede ir después. Igual conviene dejarlo junto a `edit/:id`.

- [ ] **Step 14: Sacar los andamios de E-19/E-20**

Borrar de `planification.controller.ts` los métodos `assignRoutineToUser` (`POST /routine/assign-user`) y `getUserRoutines` (`GET /user/:id/routines`), el import de `RoutineAsignationUser` y su línea del `TODO`. **No tocar** los andamios de E-08 a E-14 ni el `forFeature` del módulo.

---

### Task 6: Db Creator

**Files:**
- Modify: `Db Creator/ddl.py`
- Regenerate: `Db Creator/01_estructura.sql`
- Create: `Db Creator/patches/2026-08-27-cu-e-17.sql`

- [ ] **Step 15: `ddl.py`**

En `CREATE TABLE public."Routine_Circuit"`: `"order"` pasa a nullable (sacar el `NOT NULL`) y se agrega `active BOOLEAN NOT NULL DEFAULT true`. Los índices no se tocan.

- [ ] **Step 16: Regenerar**

`python build_sql.py` parado en `Db Creator/`. Verificar con `git diff --stat` que **sólo** cambió `01_estructura.sql`.

- [ ] **Step 17: Patch para la base viva**

`patches/2026-08-27-cu-e-17.sql`, con el mismo encabezado explicativo que el de E-23: `ADD COLUMN IF NOT EXISTS active` y `ALTER COLUMN "order" DROP NOT NULL`, dentro de un `BEGIN/COMMIT`. Idempotente.

---

### Task 7: Verificación y Status

- [ ] **Step 18: Build**

`npm --prefix power-app run build` en verde. Ojo con `order?: number | null` — el `create(RoutineCircuit, { order: index + 1 })` sigue compilando, pero cualquier lugar que asuma `number` va a fallar acá.

- [ ] **Step 19: `Status/estado-implementacion-CU.md`**

- Sección "Cambios recientes (2026-08-27 · editar rutina y baja lógica)" arriba de todo, con el **porqué** de: la reconciliación por `id`, `order = null`, "conservar sí, agregar no", por qué no hay baja física (a diferencia de E-23) y por qué E-19/E-20 quedan post-MVP con el contrato de §9.2 de la spec.
- Filas: E-17 y E-18 a ✅ con su endpoint; E-19 a ⬜ (se le sacó el andamiaje); E-20 sin cambios.
- Conteos: ✅ 55 · 🟡 1 · 🔵 9 · ⬜ 7. Entrenador 18/0/7/4 → 62%. Corte a 2026-08-27.
- Cronograma: 28/8 Rutinas cerrado con la excepción de E-19/E-20.
- Nota de verificación en runtime pendiente.

- [ ] **Step 20: `Status/dashboard-estado-CU.html`**

Mismos cambios: badges de E-17/E-18/E-19, endpoints, conteos del resumen y de la tabla por rol, y el bloque de cambios recientes.
