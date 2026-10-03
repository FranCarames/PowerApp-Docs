# Baja lógica en Rutinas y Planificaciones — Plan

> Los pasos usan checkbox (`- [ ]`) para ir tildando.

**Goal:** Que `Routine` y `Planification` se den de baja lógicamente (`active = false`) en vez de borrarse físicamente, igual que `Circuit`.

**Motivo:** `Routine` tiene tres FKs apuntándole con `ON DELETE CASCADE`. Un `DELETE` cascadea a `Routine_Circuit`, `Routine_Asignation_User` y `Routine_Asignation`, y desde ahí a `User_Routine` y a `Routine_Exercise_Set_Finished`: **borra el historial de entrenamiento de todos los alumnos que hicieron esa rutina**. `Planification` tiene el mismo problema a través de `Routine_Asignation`. La spec actual lo intenta cubrir con un chequeo de "no está en uso", pero esa protección depende de que el chequeo esté bien escrito; con baja lógica el error es imposible por construcción.

**Timing:** se hace ahora porque las dos tablas están **vacías** (el ALTER no necesita backfill) y porque los endpoints de rutinas y planificaciones son andamiaje sin implementar — hacerlo después obligaría a rehacerlos.

## Alcance

**Incluye:** columna `active` en las dos entidades, DDL y scripts, ALTER sobre la base viva, reescritura de las specs CU-E-11 y CU-E-18, ajuste de CU-E-08 y CU-E-15, y los artefactos de Status.

**No incluye los endpoints `set-active`.** Se implementan con su bloque: E-18 con Rutinas (28/8) y E-11 con Planificaciones (4/9). Acá va sólo el modelo, que es lo barato-ahora / caro-después. Hoy no hay nada que listar ni que dar de baja.

**Regla de comportamiento** (espejo de CU-E-24): la baja lógica saca la pieza de circulación para **nuevos** ensamblados y asignaciones; lo ya asignado mantiene integridad y el alumno lo sigue viendo. Los listados devuelven sólo activas por defecto, con `include_inactive` opcional.

---

### Paso 1: Columna `active` en las entidades

**Files:**
- Modify: `power-app/src/entities/routine.entity.ts`
- Modify: `power-app/src/entities/planification.entity.ts`

- [ ] **1.1 — `routine.entity.ts`**

Insertar **después** de `coach_note` y antes de `created_at`:

```typescript
    @ApiProperty({ example: true })
    @Column({ nullable: false, default: true })
    active!: boolean;
```

- [ ] **1.2 — `planification.entity.ts`**

Insertar **después** de `duration` y antes de `created_at`, el mismo bloque:

```typescript
    @ApiProperty({ example: true })
    @Column({ nullable: false, default: true })
    active!: boolean;
```

Es el mismo patrón que ya usan `Circuit`, `Membership`, `User` y `Coach`.

---

### Paso 2: DDL y regeneración

**Files:**
- Modify: `Db Creator/ddl.py`
- Regenerate: `Db Creator/01_estructura.sql`

- [ ] **2.1 — `Routine`**

```sql
CREATE TABLE public."Routine" (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_plan_id UUID,
    name            VARCHAR(20) NOT NULL,
    coach_note      VARCHAR(100),
    active          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routine_active ON public."Routine"(active);
```

- [ ] **2.2 — `Planification`**

```sql
CREATE TABLE public."Planification" (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(50),
    description        TEXT,
    number_of_routines INTEGER     NOT NULL,
    type               VARCHAR(30),
    duration           VARCHAR(50),
    active             BOOLEAN     NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_planification_active ON public."Planification"(active);
```

Ojo: el índice de `Routine` va **después** del `ALTER TABLE` diferido que le agrega la FK a `Planification`, o donde no rompa el orden del archivo.

- [ ] **2.3 — Regenerar**

```bash
cd "D:/Power App/Backend/PowerApp-Backend/Db Creator" && python build_sql.py
```

- [ ] **2.4 — Confirmar que sólo cambió `01`**

Run: `git status --short "Db Creator"`
Expected: `ddl.py` y `01_estructura.sql`. Ni `02` ni `03` insertan en estas tablas.

---

### Paso 3: Base viva

- [ ] **3.1 — Correr el ALTER** *(lo ejecuta el usuario)*

Las dos tablas están vacías, así que no hay backfill ni riesgo:

```sql
BEGIN;

ALTER TABLE public."Routine"       ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public."Planification" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_routine_active       ON public."Routine"(active);
CREATE INDEX IF NOT EXISTS idx_planification_active ON public."Planification"(active);

COMMIT;
```

- [ ] **3.2 — Verificar**

```sql
SELECT table_name, column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'active'
ORDER BY table_name;
```

Esperado: `Circuit`, `Coach`, `Membership`, `Membership_Payment`, `Planification`, `Routine`, `User` — las siete con `is_nullable = NO` y default `true`.

---

### Paso 4: Verificación del código

- [ ] **4.1 — Compilar**

Run: `npm --prefix power-app run build`
Expected: exit code 0.

- [ ] **4.2 — Chequeo cruzado entidades ↔ DDL**

Correr el validador del scratchpad. Esperado: `Routine` con 7 columnas, `Planification` con 9, y `RESULTADO: TODO EN SYNC`.

---

### Paso 5: Specs de CU

**Files (fuera del repo):** `D:\Power App\Documentation\Especificaciones de CU\especificaciones\entrenador\`

- [ ] **5.1 — Reescribir `CU-E-18-eliminar-rutina-sistemica.md`**

Cambios respecto del original: el título pasa a "(Lógico)", la postcondición deja de ser "deja de estar disponible" y pasa a `active = false` preservando asignaciones e historial, y **desaparece el camino alternativo "rutina en uso → impide la baja"**, que se reemplaza por una advertencia informativa.

```markdown
# CU-E-18 — Eliminar Rutina Sistémica (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Rutinas

## Descripción breve

Da de baja lógica una rutina sistémica (active = false). Nunca se borra físicamente, para preservar el historial de entrenamiento de los alumnos que la realizaron.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado de la Routine como active = false (borrado lógico).

**Fuera de alcance:**

- Borrado físico del registro.
- Baja de los circuitos que la componen (son reutilizables).
- Baja de las planificaciones que la referencian.

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La rutina existe y está activa.

## Postcondiciones

- La Routine queda con active = false y deja de ofrecerse para nuevas planificaciones y asignaciones.
- Las planificaciones y asignaciones existentes mantienen su integridad; el historial de entrenamiento de los alumnos se conserva.

## Camino principal (flujo básico)

1. El entrenador selecciona una rutina y solicita eliminarla.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca la Routine como active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 1 — Rutina en uso

1. La rutina forma parte de planificaciones o está asignada a alumnos.
2. El sistema informa que la baja no la quita de las asignaciones vigentes y permite continuar.
```

- [ ] **5.2 — Reescribir `CU-E-11-eliminar-planificacion-sistemica.md`**

```markdown
# CU-E-11 — Eliminar Planificación Sistémica (Lógico)

**Rol:** Entrenador  
**Paquete:** Administrar Planificaciones

## Descripción breve

Da de baja lógica una planificación sistémica (active = false). Nunca se borra físicamente, para preservar las asignaciones y el historial de entrenamiento de los alumnos.

## Actores involucrados

- **Principal:** Entrenador autenticado
- **Secundarios:** —

## Alcance

**Cubre:**

- Marcado de la Planification como active = false (borrado lógico).

**Fuera de alcance:**

- Borrado físico del registro.
- Baja de las planificaciones ya asignadas a alumnos (User_Planification).
- Baja de las rutinas que la componen (son reutilizables).

## Precondiciones

- Existe una sesión activa con rol Entrenador.
- La Planification existe y está activa.

## Postcondiciones

- La Planification queda con active = false y deja de ofrecerse como plantilla para nuevas asignaciones.
- Las asignaciones existentes mantienen su integridad; el historial de entrenamiento de los alumnos se conserva.

## Camino principal (flujo básico)

1. El entrenador selecciona una planificación y solicita eliminarla.
2. El sistema pide confirmación, advirtiendo que es un borrado lógico.
3. El sistema marca la Planification como active = false y confirma.

## Caminos alternativos / excepciones

### En el paso 2 — Cancela la confirmación

1. El entrenador cancela.
2. El sistema no realiza cambios.

### En el paso 1 — Planificación en uso

1. La planificación está asignada a alumnos.
2. El sistema informa que la baja no la quita de las asignaciones vigentes y permite continuar.
```

- [ ] **5.3 — Ajustar los dos listados**

En `CU-E-15-obtener-rutinas-sistemicas.md` y `CU-E-08-obtener-planificaciones-sistemicas.md`, en **Alcance → Cubre**, aclarar que se listan las **activas**, y en **Fuera de alcance** sumar "las dadas de baja lógicamente (active = false)". Es el mismo texto que ya tiene CU-E-21 para circuitos.

> **Nota:** los nombres de archivo se dejan como están. CU-E-24 sí se llama `...-logico.md`, así que si querés uniformidad habría que renombrar estos dos y actualizar el `README.md` índice. No lo hago para no romper el índice de los 72 CU.

---

### Paso 6: Diagramas *(lo hace el usuario)*

- [ ] **6.1** — Sumar `active` (Boolean, NOT NULL) a `Routine` y a `Planification` en el modelo de Miro, y exportar `PowerApp - Modelo DB.svg` y `.pdf` a `Doc/`.

---

### Paso 7: Status

**Files:** `Status/estado-implementacion-CU.md`, `Status/dashboard-estado-CU.html`

- [ ] **7.1** — Entrada nueva en cambios recientes explicando el cambio y el motivo (la cascada que destruye historial).
- [ ] **7.2** — Actualizar las notas de E-11 y E-18 en las tablas de detalle: siguen 🔵/⬜, pero ahora son baja lógica. **Ningún CU cambia de estado y los conteos no se mueven.**

---

### Paso 8: Stage

- [ ] **8.1**

```bash
cd "D:/Power App/Backend/PowerApp-Backend" && git add power-app/src/entities "Db Creator/ddl.py" "Db Creator/01_estructura.sql" Status Doc/plans
```

- [ ] **8.2 — Mensaje sugerido**

```
baja logica en Routine y Planification (evita cascada que borra historial)
```

---

## Después de esto

Queda el modelo definitivo para arrancar los tres endpoints de rutinas (`/all`, `/all-plus`, `/:id`), ahora con `include_inactive` en los listados y con `POST /routine/set-active/:id` reemplazando al `DELETE` del andamiaje cuando toque E-18.
