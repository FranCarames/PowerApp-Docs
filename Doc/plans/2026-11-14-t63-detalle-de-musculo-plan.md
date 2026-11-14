# T63 — Detalle de músculo e índice de músculos en la biblioteca · Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Numeración.** La tarea del web es la **T63**: el 14/11 la última del `PLAN.md` del web es la T62. Si al llegar ese número ya está usado, se toma el siguiente libre y se anota acá y en la [spec](../specs/2026-11-14-detalle-de-musculo-design.md).
>
> **Cómo se entrega.** La sesión del web sigue el flujo de su repo, como lo dice su `CLAUDE.md` (rama `feature/T63-detalle-de-musculo` desde `develop`, resumen de la tarea, `PLAN.md` en el mismo PR). Este plan no lo cambia. No hay tests automáticos (decisión del 16/10): cada tarea se verifica con `npm run typecheck` y `npx eslint src`, y al final con `npm run build`, `npx prettier --check src` y el navegador (tarea 9). No se instala nada.
>
> **Este plan lo escribió la sesión de docs el 14/11.** Lo lee la sesión del **web**. **No hay tarea de backend** ni cambio de contrato. Los textos entre «» van **exactos**.

**Spec:** [2026-11-14-detalle-de-musculo-design.md](../specs/2026-11-14-detalle-de-musculo-design.md) (decisiones D78 a D87).
**Modelo:** sin cambios. **Contrato:** sin cambios.

**Goal:** que el alumno y el entrenador puedan abrir un músculo desde un ejercicio (en la biblioteca o dentro de la rutina) y ver su ilustración, su grupo, su descripción y los ejercicios relacionados; y que la biblioteca tenga un índice de músculos por grupo.

**Architecture:** dos páginas nuevas en `features/catalog/pages` (índice y detalle), montadas con `basePath` como ya se hace con `WikiPage` y `WikiExercisePage`. Todo se arma en el cliente con tres queries que ya existen y están en caché (`useMuscles`, `useMuscleGroups`, `useExerciseCatalog`); las dos listas de ejercicios salen de una función pura. «Volver» usa el historial del navegador cuando se llegó navegando dentro de la app, para devolver al alumno a la rutina o a la ficha tal como las dejó.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, CSS Modules. Sin dependencias nuevas.

---

## 1. Lo que ya se hizo en Docs

Aplicado el 14/11, junto con este plan:

- [CU-U-15](../../Use%20Cases/usuario/CU-U-15-consultar-wiki-de-ejercicios.md) y [CU-E-30](../../Use%20Cases/entrenador/CU-E-30-consultar-wiki-de-ejercicios.md): alcance, paso 5 (detalle del músculo) y tres caminos alternativos (recorrer los músculos por grupo, el músculo ya no existe, ningún ejercicio lo trabaja).
- [CU-U-10](../../Use%20Cases/usuario/CU-U-10-ver-detalle-de-un-ejercicio.md): alcance y paso 5 (los músculos del ejercicio abren su detalle y se vuelve sin perder lo marcado).
- `Use Cases/README.md` no cambia: no hay CU nuevo (D87).

No se tocaron el prototipo de `UI Front/` ni los planes de `Tests/` (fuera de alcance, spec sección 9).

## 2. Lo que se confirmó leyendo el código

| Punto | Qué se encontró | Dónde |
|---|---|---|
| El ejercicio de la rutina ya muestra los músculos | `RoutineExercisePage` usa `ExerciseHero`, el mismo de la ficha | `src/features/user/pages/RoutineExercisePage.tsx:252` |
| El mapa del grupo llega | `GET /muscles/mg/all` manda `id`, `name`, `image_url` y `preview_image` de cada grupo, y `id`, `name` y `description` de cada músculo | backend `power-app/src/muscles/muscles.service.ts` (`getAllMuscleGroups`) |
| Las imágenes del músculo sólo vienen en `GET /muscles/all` | `MuscleWithGroup`: `id`, `name`, `description`, `image_url`, `preview_image` y `muscle_group { id, name }` | `src/api/pending.ts:184` |
| El grupo no tiene descripción | `MuscleGroup` del contrato: `id`, `name`, `image_url`, `preview_image` | `src/api/schema.d.ts` |
| Cada ejercicio ya sabe sus grupos | `useExerciseCatalog` devuelve `CatalogExercise` con `groups`, y los grupos ordenados por nombre | `src/features/catalog/hooks/useExerciseCatalog.ts` |
| El filtro por grupo va en la URL | `?grupo=<id del grupo>` | `src/features/catalog/hooks/useExerciseSearch.ts` |
| El scroll al ancla | `ScrollRestoration` está en `RootLayout`; igual se agrega un efecto, porque en una carga en frío los grupos llegan después | `src/app/RootLayout.tsx` |

## 3. Archivos

Todas las rutas son del repo **PowerApp-Web**.

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/features/catalog/wikiState.ts` | Modificar | Suma el `state` que marca «llegué navegando dentro de la app» |
| `src/features/catalog/hooks/useHistoryBack.ts` | Crear | El `onBack` de `PageHeader` que vuelve por el historial |
| `src/features/catalog/muscleExercises.ts` | Crear | Función pura: ejercicios que trabajan un músculo y otros de su grupo |
| `src/features/catalog/components/LibrarySegments.tsx` | Crear | Selector «Ejercicios \| Músculos» |
| `src/features/catalog/components/ExerciseSheet.tsx` y `.module.css` | Modificar | Pills de músculo como links |
| `src/features/catalog/components/MuscleSheet.tsx` y `.module.css` | Crear | El cuerpo de la página del músculo |
| `src/features/catalog/pages/MusclePage.tsx` | Crear | Página del músculo: carga, error, inexistente |
| `src/features/catalog/pages/MusclesIndexPage.tsx` y `.module.css` | Crear | Índice de músculos por grupo |
| `src/features/catalog/pages/WikiPage.tsx` | Modificar | Muestra el selector |
| `src/features/catalog/pages/WikiExercisePage.tsx` | Modificar | Pasa la ruta de músculos; «Volver» por historial |
| `src/features/user/pages/RoutineExercisePage.tsx` | Modificar | Pasa la ruta de músculos a `ExerciseHero` |
| `src/features/coach/pages/MusclesPage.tsx` | Crear | El índice del Entrenador, con sus segmentos |
| `src/features/user/routes.tsx`, `src/features/coach/routes.tsx` | Modificar | Rutas nuevas |
| `CLAUDE.md`, `PLAN.md`, `Status/` | Modificar | Rutas, tarea y estado de los CU |

---

### Task 1: Estado de navegación y «Volver» por historial

**Files:**
- Modify: `src/features/catalog/wikiState.ts`
- Create: `src/features/catalog/hooks/useHistoryBack.ts`

- [ ] **Step 1: Sumar el estado a `wikiState.ts`**

Agregar al final del archivo:

```ts
/**
 * Lo que lleva en el `state` una navegación hecha desde un link de la app hacia la página de un
 * músculo o hacia una ficha abierta desde ella. Dice que la pantalla anterior está en el historial,
 * así "Volver" puede regresar a ella tal como quedó (la rutina con sus series, la ficha con su filtro).
 */
export interface InHistoryState {
  inHistory: true;
}

export const IN_HISTORY: InHistoryState = { inHistory: true };

/** Si la pantalla se abrió desde un link de la app. Un link directo o una recarga no lo traen. */
export function cameThroughApp(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'inHistory' in state &&
    state.inHistory === true
  );
}
```

- [ ] **Step 2: Crear `useHistoryBack.ts`**

```ts
import type { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { cameThroughApp } from '../wikiState';

/**
 * El `onBack` de <PageHeader> para una pantalla a la que se llega desde varios lugares (la página de
 * un músculo, la ficha abierta desde ella). Si se llegó por un link de la app, "Volver" retrocede en
 * el historial y la pantalla anterior queda como estaba. Si no (link directo, recarga), devuelve
 * `undefined` y el enlace va a su destino de siempre.
 */
export function useHistoryBack() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!cameThroughApp(state)) return undefined;

  return (event: MouseEvent<HTMLAnchorElement>) => {
    // Con Ctrl, Cmd, Shift o el botón del medio se quiere abrir el destino en otra pestaña.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    event.preventDefault();
    void navigate(-1);
  };
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/wikiState.ts src/features/catalog/hooks/useHistoryBack.ts
git commit -m "T63: volver por historial desde las pantallas de la biblioteca"
```

---

### Task 2: Las dos listas de ejercicios de un músculo

**Files:**
- Create: `src/features/catalog/muscleExercises.ts`

- [ ] **Step 1: Crear la función**

```ts
import type { CatalogExercise } from './hooks/useExerciseCatalog';

/** Cuántos "otros ejercicios del grupo" muestra la página del músculo antes de "Ver todos" (D84). */
export const OTHER_EXERCISES_LIMIT = 6;

export interface MuscleExercises {
  /** Los ejercicios que tienen asignado el músculo. */
  working: CatalogExercise[];
  /** Los que trabajan otro músculo del mismo grupo y no este. */
  others: CatalogExercise[];
}

const byName = (a: CatalogExercise, b: CatalogExercise) =>
  a.name.localeCompare(b.name, 'es');

/**
 * Reparte el catálogo según un músculo: los ejercicios que lo trabajan y los otros de su grupo
 * muscular, cada lista en orden alfabético. Un ejercicio que trabaja el músculo no se repite en
 * `others`, aunque trabaje además otro músculo del grupo.
 */
export function exercisesOfMuscle(
  exercises: readonly CatalogExercise[],
  muscleId: string,
  groupId: string,
): MuscleExercises {
  const working: CatalogExercise[] = [];
  const others: CatalogExercise[] = [];

  for (const exercise of exercises) {
    if (exercise.exercisedMuscles.some(({ id }) => id === muscleId)) {
      working.push(exercise);
    } else if (exercise.groups.some(({ id }) => id === groupId)) {
      others.push(exercise);
    }
  }

  return { working: working.sort(byName), others: others.sort(byName) };
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/catalog/muscleExercises.ts
git commit -m "T63: ejercicios que trabajan un músculo y otros de su grupo"
```

---

### Task 3: Pills de músculo como links

**Files:**
- Modify: `src/features/catalog/components/ExerciseSheet.tsx`
- Modify: `src/features/catalog/components/ExerciseSheet.module.css`
- Modify: `src/features/catalog/pages/WikiExercisePage.tsx`
- Modify: `src/features/user/pages/RoutineExercisePage.tsx:252-255`

- [ ] **Step 1: `ExerciseHero` recibe la ruta de músculos**

En `ExerciseSheet.tsx`, sumar los imports:

```tsx
import { Link } from 'react-router';

import { IN_HISTORY } from '../wikiState';
```

Reemplazar `HeroProps` y el `<li>` de cada músculo:

```tsx
interface HeroProps {
  exercise: ExerciseSheetData;
  /** Los músculos que trabaja. Sin ellos (`undefined`, todavía no llegaron) no se muestra el bloque. */
  muscles: readonly ExerciseMuscle[] | undefined;
  /**
   * De dónde cuelgan las páginas de músculo: `/u/wiki/musculos` o `/c/ejercicios/musculos`. Con ella,
   * cada músculo es un link a su página; sin ella, es solo una etiqueta.
   */
  musclesPath?: string;
}
```

```tsx
export function ExerciseHero({ exercise, muscles, musclesPath }: HeroProps) {
```

```tsx
                {muscles.map((muscle) => (
                  <li key={muscle.id}>
                    {musclesPath ? (
                      <Link
                        to={`${musclesPath}/${muscle.id}`}
                        state={IN_HISTORY}
                        className={styles.pillLink}
                      >
                        <Pill>{muscle.name}</Pill>
                      </Link>
                    ) : (
                      <Pill>{muscle.name}</Pill>
                    )}
                  </li>
                ))}
```

- [ ] **Step 2: `ExerciseSheet` la pasa**

```tsx
export function ExerciseSheet({
  exercise,
  musclesPath,
}: {
  exercise: ExerciseWithMuscles;
  musclesPath?: string;
}) {
  return (
    <article className={styles.sheet}>
      <ExerciseHero
        exercise={exercise}
        muscles={exercise.exercisedMuscles}
        musclesPath={musclesPath}
      />
      <ExerciseDetails exercise={exercise} />
    </article>
  );
}
```

- [ ] **Step 3: Estilo del link**

En `ExerciseSheet.module.css`, después de `.pills`:

```css
/* Una pill que abre la página del músculo. El padding vertical agranda la zona de toque. */
.pillLink {
  display: inline-flex;
  padding: 4px 0;
  border-radius: 999px;
  text-decoration: none;
}

.pillLink > span {
  color: var(--tp);
  transition: background 0.15s;
}

.pillLink:hover > span {
  background: var(--border2);
}

.pillLink:focus-visible {
  outline: 2px solid var(--priL);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .pillLink > span {
    transition: none;
  }
}
```

- [ ] **Step 4: La ficha de la biblioteca pasa la ruta y vuelve por historial**

En `WikiExercisePage.tsx`, sumar `import { useHistoryBack } from '../hooks/useHistoryBack';` y, dentro de `WikiExercise`:

```tsx
  const { state } = useLocation();
  // Abierta desde la página de un músculo, "Volver" regresa a ella.
  const onBack = useHistoryBack();
```

```tsx
      <PageHeader
        eyebrow="Biblioteca"
        title={exercise?.name ?? 'Ejercicio'}
        back={{ pathname: basePath, search: wikiListSearch(state) }}
        onBack={onBack}
      />
      {exercise ? (
        <ExerciseSheet
          exercise={exercise}
          musclesPath={`${basePath}/musculos`}
        />
      ) : query.isError ? (
```

- [ ] **Step 5: El ejercicio de la rutina pasa la ruta**

En `RoutineExercisePage.tsx`:

```tsx
      <ExerciseHero
        exercise={catalog}
        muscles={detail.data?.exercisedMuscles}
        musclesPath="/u/wiki/musculos"
      />
```

- [ ] **Step 6: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores. Las pills ya son links, pero llevan a una ruta que todavía no existe: se prueba en la tarea 9.

- [ ] **Step 7: Commit**

```bash
git add src/features/catalog/components/ExerciseSheet.tsx src/features/catalog/components/ExerciseSheet.module.css src/features/catalog/pages/WikiExercisePage.tsx src/features/user/pages/RoutineExercisePage.tsx
git commit -m "T63: los músculos del ejercicio abren su página"
```

---

### Task 4: Selector «Ejercicios | Músculos»

**Files:**
- Create: `src/features/catalog/components/LibrarySegments.tsx`
- Modify: `src/features/catalog/pages/WikiPage.tsx`

- [ ] **Step 1: Crear `LibrarySegments.tsx`**

```tsx
import { useNavigate } from 'react-router';

import { Segmented } from '@/shared/ui';

interface LibrarySegmentsProps {
  /** De dónde cuelga la biblioteca: `/u/wiki` (Usuario) o `/c/ejercicios` (Entrenador). */
  basePath: string;
  value: 'ejercicios' | 'musculos';
}

/**
 * Los segmentos de la biblioteca: los ejercicios (`<basePath>`) o los músculos por grupo
 * (`<basePath>/musculos`). Cada uno es una ruta.
 */
export function LibrarySegments({ basePath, value }: LibrarySegmentsProps) {
  const navigate = useNavigate();

  return (
    <Segmented
      label="Ver ejercicios o músculos"
      value={value}
      options={[
        { value: 'ejercicios', label: 'Ejercicios' },
        { value: 'musculos', label: 'Músculos' },
      ]}
      onChange={(next) =>
        void navigate(next === 'musculos' ? `${basePath}/musculos` : basePath, {
          replace: true,
        })
      }
    />
  );
}
```

- [ ] **Step 2: Mostrarlo en `WikiPage.tsx`**

Sumar `import { LibrarySegments } from '../components/LibrarySegments';` y dejar el comienzo del `return` así:

```tsx
      <PageHeader eyebrow="Biblioteca" title="Ejercicios" back={back} />
      {nav}
      <LibrarySegments basePath={basePath} value="ejercicios" />
      <ExerciseFilters
```

En el Entrenador quedan dos filas de segmentos: «Rutinas | Circuitos | Ejercicios» (`nav`) y, debajo, «Ejercicios | Músculos». Si la separación entre las dos no es la misma que entre los segmentos y el buscador, igualarla con un `className` en `LibrarySegments` (el componente `Segmented` lo acepta).

- [ ] **Step 3: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/components/LibrarySegments.tsx src/features/catalog/pages/WikiPage.tsx
git commit -m "T63: segmentos Ejercicios y Músculos en la biblioteca"
```

---

### Task 5: Índice de músculos

**Files:**
- Create: `src/features/catalog/pages/MusclesIndexPage.tsx`
- Create: `src/features/catalog/pages/MusclesIndexPage.module.css`

- [ ] **Step 1: Crear la página**

```tsx
import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate, type To } from 'react-router';

import { getErrorMessage } from '@/api/errors';
import {
  EmptyState,
  ErrorState,
  List,
  ListItem,
  ListSkeleton,
  PageHeader,
  Thumb,
} from '@/shared/ui';

import { LibrarySegments } from '../components/LibrarySegments';
import { useMuscleGroups } from '../hooks/useMuscleGroups';
import { useMuscles } from '../hooks/useMuscles';
import { IN_HISTORY } from '../wikiState';
import styles from './MusclesIndexPage.module.css';

interface MusclesIndexPageProps {
  /** De dónde cuelga la biblioteca: `/u/wiki` (Usuario) o `/c/ejercicios` (Entrenador). */
  basePath: string;
  /** Destino de "Volver". Sin él, no se muestra. */
  back?: To;
  /** Lo que va entre el encabezado y los segmentos: los del tab Rutinas del Entrenador. */
  nav?: ReactNode;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'es');

/**
 * El índice de músculos de la biblioteca (CU-U-15 y CU-E-30), en `<basePath>/musculos`: los grupos
 * musculares, cada uno con su mapa del cuerpo y sus músculos. Cada músculo abre su página en
 * `<basePath>/musculos/:id`. Cada grupo es un ancla (`#<id del grupo>`): es adonde lleva el grupo de
 * la página de un músculo.
 */
export function MusclesIndexPage({
  basePath,
  back,
  nav,
}: MusclesIndexPageProps) {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const groupsQuery = useMuscleGroups();
  // Las miniaturas de los músculos solo vienen en `GET /muscles/all`. Si no llegan, va el ícono.
  const musclesQuery = useMuscles();

  const groups = useMemo(
    () =>
      groupsQuery.data &&
      [...groupsQuery.data].sort(byName).map((group) => ({
        ...group,
        muscles: [...group.muscles].sort(byName),
      })),
    [groupsQuery.data],
  );
  const previewOfMuscle = useMemo(
    () =>
      new Map(
        musclesQuery.data?.map(({ id, preview_image }) => [id, preview_image]),
      ),
    [musclesQuery.data],
  );

  // En una carga en frío los grupos llegan después de que el navegador buscó el ancla.
  useEffect(() => {
    if (!groups || !hash) return;
    document
      .getElementById(decodeURIComponent(hash.slice(1)))
      ?.scrollIntoView();
  }, [groups, hash]);

  return (
    <>
      <PageHeader eyebrow="Biblioteca" title="Músculos" back={back} />
      {nav}
      <LibrarySegments basePath={basePath} value="musculos" />
      {groups ? (
        groups.length === 0 ? (
          <EmptyState
            icon="grid"
            title="Todavía no hay grupos musculares"
            message="Cuando se carguen, los vas a encontrar acá."
          />
        ) : (
          groups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              className={styles.group}
              aria-labelledby={`${group.id}-name`}
            >
              <div className={styles.head}>
                <Thumb icon="user" src={group.preview_image} size={56} />
                <h2 id={`${group.id}-name`} className={styles.name}>
                  {group.name}
                </h2>
                <span className={styles.count}>
                  {group.muscles.length}{' '}
                  {group.muscles.length === 1 ? 'músculo' : 'músculos'}
                </span>
              </div>
              {group.muscles.length === 0 ? (
                <EmptyState message="Este grupo todavía no tiene músculos." />
              ) : (
                <List columns={2}>
                  {group.muscles.map((muscle) => (
                    <ListItem
                      key={muscle.id}
                      leading={
                        <Thumb
                          icon="user"
                          src={previewOfMuscle.get(muscle.id)}
                        />
                      }
                      title={muscle.name}
                      chevron
                      onClick={() =>
                        void navigate(`${basePath}/musculos/${muscle.id}`, {
                          state: IN_HISTORY,
                        })
                      }
                    />
                  ))}
                </List>
              )}
            </section>
          ))
        )
      ) : groupsQuery.isError ? (
        <ErrorState
          message={getErrorMessage(groupsQuery.error)}
          onRetry={() => void groupsQuery.refetch()}
          retrying={groupsQuery.isRefetching}
        />
      ) : (
        <ListSkeleton columns={2} rows={6} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Crear los estilos**

`MusclesIndexPage.module.css`:

```css
.group {
  margin-top: 24px;
  /* Al llegar por el ancla, el encabezado del grupo no queda pegado al borde. */
  scroll-margin-top: 16px;
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.name {
  flex: 1;
  min-width: 0;
  font-family: var(--fD);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--tp);
}

.count {
  font-size: 12px;
  font-weight: 600;
  color: var(--ts);
  white-space: nowrap;
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/pages/MusclesIndexPage.tsx src/features/catalog/pages/MusclesIndexPage.module.css
git commit -m "T63: índice de músculos por grupo"
```

---

### Task 6: Cuerpo de la página del músculo

**Files:**
- Create: `src/features/catalog/components/MuscleSheet.tsx`
- Create: `src/features/catalog/components/MuscleSheet.module.css`

- [ ] **Step 1: Crear `MuscleSheet.tsx`**

```tsx
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';

import { getErrorMessage } from '@/api/errors';
import type { MuscleWithGroup } from '@/api/pending';
import {
  EmptyState,
  ErrorState,
  List,
  ListSkeleton,
  SectionHeader,
  Thumb,
} from '@/shared/ui';

import {
  useExerciseCatalog,
  type CatalogExercise,
} from '../hooks/useExerciseCatalog';
import { exercisesOfMuscle, OTHER_EXERCISES_LIMIT } from '../muscleExercises';
import { IN_HISTORY } from '../wikiState';
import styles from './MuscleSheet.module.css';
import { WikiRow } from './WikiRow';

interface MuscleSheetProps {
  muscle: MuscleWithGroup;
  /** De dónde cuelga la biblioteca: `/u/wiki` (Usuario) o `/c/ejercicios` (Entrenador). */
  basePath: string;
}

/**
 * La página de un músculo (CU-U-15 y CU-E-30): su ilustración, su grupo muscular con el mapa del
 * cuerpo, su descripción, los ejercicios que lo trabajan y otros ejercicios del mismo grupo. Lo que el
 * músculo no trae no se muestra.
 */
export function MuscleSheet({ muscle, basePath }: MuscleSheetProps) {
  const navigate = useNavigate();
  const catalog = useExerciseCatalog();
  const group = muscle.muscle_group;
  // El mapa del grupo viene en `GET /muscles/mg/all`, que el catálogo ya trae.
  const groupImage = catalog.groups?.find(({ id }) => id === group.id)
    ?.preview_image;

  const lists = useMemo(
    () =>
      catalog.exercises &&
      exercisesOfMuscle(catalog.exercises, muscle.id, group.id),
    [catalog.exercises, muscle.id, group.id],
  );

  function openExercise({ id }: CatalogExercise) {
    void navigate(`${basePath}/${id}`, { state: IN_HISTORY });
  }

  return (
    <article>
      <div className={styles.intro}>
        <div className={styles.hero}>
          <Thumb
            icon="user"
            src={muscle.image_url ?? muscle.preview_image}
            size={96}
            className={styles.illustration}
          />
          <Link
            to={{ pathname: `${basePath}/musculos`, hash: `#${group.id}` }}
            className={styles.group}
          >
            <Thumb icon="user" src={groupImage} size={44} />
            <span className={styles.groupText}>
              <span className={styles.groupLabel}>Grupo muscular</span>
              <span className={styles.groupName}>{group.name}</span>
            </span>
          </Link>
        </div>
        {muscle.description && (
          <>
            <SectionHeader title="Descripción" />
            <p className={styles.text}>{muscle.description}</p>
          </>
        )}
      </div>

      {lists ? (
        <>
          <SectionHeader
            title="Ejercicios que lo trabajan"
            aside={<span className={styles.count}>{lists.working.length}</span>}
          />
          {lists.working.length === 0 ? (
            <EmptyState
              icon="dumbbell"
              message="Todavía no hay ejercicios que trabajen este músculo."
            />
          ) : (
            <List columns={2}>
              {lists.working.map((exercise) => (
                <WikiRow
                  key={exercise.id}
                  exercise={exercise}
                  onOpen={openExercise}
                />
              ))}
            </List>
          )}

          {lists.others.length > 0 && (
            <>
              <SectionHeader
                title={`Otros ejercicios de ${group.name}`}
                aside={
                  lists.others.length > OTHER_EXERCISES_LIMIT ? (
                    <Link
                      to={{ pathname: basePath, search: `?grupo=${group.id}` }}
                      className={styles.seeAll}
                    >
                      Ver todos
                    </Link>
                  ) : (
                    <span className={styles.count}>{lists.others.length}</span>
                  )
                }
              />
              <List columns={2}>
                {lists.others
                  .slice(0, OTHER_EXERCISES_LIMIT)
                  .map((exercise) => (
                    <WikiRow
                      key={exercise.id}
                      exercise={exercise}
                      onOpen={openExercise}
                    />
                  ))}
              </List>
            </>
          )}
        </>
      ) : catalog.isError ? (
        <ErrorState
          message={getErrorMessage(catalog.error)}
          onRetry={catalog.refetch}
          retrying={catalog.isRefetching}
        />
      ) : (
        <ListSkeleton columns={2} rows={4} />
      )}
    </article>
  );
}
```

- [ ] **Step 2: Crear los estilos**

`MuscleSheet.module.css`:

```css
/* La cabecera y la descripción se leen mejor en una columna angosta, como la ficha del ejercicio. */
.intro {
  max-width: 640px;
}

/* El mismo degradé que la cabecera de la ficha del ejercicio. */
.hero {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  padding: 20px;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(232, 69, 10, 0.28), rgba(139, 92, 246, 0.28)),
    var(--card);
}

.illustration {
  border-radius: 18px;
  background: rgba(11, 13, 22, 0.45);
  color: var(--tp);
}

/* El grupo muscular: lleva al índice de músculos, posicionado en el grupo. */
.group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 14px 8px 8px;
  border-radius: 16px;
  background: rgba(11, 13, 22, 0.45);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s;
}

.group:hover {
  background: rgba(11, 13, 22, 0.7);
}

.group:focus-visible {
  outline: 2px solid var(--priL);
  outline-offset: 2px;
}

.groupText {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.groupLabel {
  font-size: 12px;
  font-weight: 600;
  color: var(--ts);
}

.groupName {
  font-size: 15px;
  font-weight: 700;
  color: var(--tp);
  overflow-wrap: anywhere;
}

.text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.count {
  font-size: 12px;
  font-weight: 600;
  color: var(--ts);
}

.seeAll {
  font-size: 13px;
  font-weight: 600;
  color: var(--acc);
  text-decoration: none;
}

.seeAll:hover {
  text-decoration: underline;
}

@media (prefers-reduced-motion: reduce) {
  .group {
    transition: none;
  }
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/components/MuscleSheet.tsx src/features/catalog/components/MuscleSheet.module.css
git commit -m "T63: cuerpo de la página del músculo"
```

---

### Task 7: Página del músculo

**Files:**
- Create: `src/features/catalog/pages/MusclePage.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import { useNavigate, useParams } from 'react-router';

import { getErrorMessage } from '@/api/errors';
import {
  Button,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  VisuallyHidden,
} from '@/shared/ui';

import { MuscleSheet } from '../components/MuscleSheet';
import { useHistoryBack } from '../hooks/useHistoryBack';
import { useMuscles } from '../hooks/useMuscles';

interface MusclePageProps {
  /** De dónde cuelga la biblioteca: `/u/wiki` (Usuario) o `/c/ejercicios` (Entrenador). */
  basePath: string;
}

/**
 * La página de un músculo de la biblioteca, solo de lectura (CU-U-15 y CU-E-30), en
 * `<basePath>/musculos/:id`. Se llega desde los músculos de un ejercicio (la ficha o la rutina) o
 * desde el índice de músculos.
 */
export function MusclePage({ basePath }: MusclePageProps) {
  const { id } = useParams();
  // La ruta siempre trae el id.
  if (!id) return null;
  return <Muscle id={id} basePath={basePath} />;
}

function Muscle({ id, basePath }: { id: string; basePath: string }) {
  const navigate = useNavigate();
  // Desde un ejercicio o el índice, "Volver" regresa ahí; con un link directo, va al índice.
  const onBack = useHistoryBack();
  // El músculo sale de `GET /muscles/all`, que ya está en caché si se vino de la biblioteca.
  const query = useMuscles();
  const muscle = query.data?.find((item) => item.id === id);

  let content;
  if (muscle) {
    content = <MuscleSheet muscle={muscle} basePath={basePath} />;
  } else if (query.data) {
    content = (
      <EmptyState
        icon="search"
        title="Este músculo ya no existe"
        message="Puede que lo hayan sacado del catálogo."
        action={
          <Button sm variant="sec" onClick={() => void navigate(basePath)}>
            Ir a la biblioteca
          </Button>
        }
      />
    );
  } else if (query.isError) {
    content = (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
        retrying={query.isRefetching}
      />
    );
  } else {
    content = (
      <div aria-busy="true">
        <VisuallyHidden role="status">Cargando el músculo…</VisuallyHidden>
        <ListSkeleton columns={2} rows={4} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Músculo"
        title={muscle?.name ?? 'Músculo'}
        back={`${basePath}/musculos`}
        onBack={onBack}
      />
      {content}
    </>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores. Si `VisuallyHidden` no acepta `role`, mirar cómo lo usa `ExerciseSheetSkeleton.tsx` (lo usa igual).

- [ ] **Step 3: Commit**

```bash
git add src/features/catalog/pages/MusclePage.tsx
git commit -m "T63: página del músculo"
```

---

### Task 8: Rutas del Usuario y del Entrenador

**Files:**
- Modify: `src/features/user/routes.tsx:33-35`
- Create: `src/features/coach/pages/MusclesPage.tsx`
- Modify: `src/features/coach/routes.tsx:46-51`

- [ ] **Step 1: Rutas del Usuario**

En `user/routes.tsx`, sumar los imports y las dos rutas. `wiki/musculos` es un segmento fijo y React Router lo prefiere a `wiki/:id`, sin importar el orden.

```tsx
import { MusclePage } from '@/features/catalog/pages/MusclePage';
import { MusclesIndexPage } from '@/features/catalog/pages/MusclesIndexPage';
```

```tsx
  // La biblioteca de ejercicios es compartida con el Entrenador (`/c/ejercicios`).
  { path: 'wiki', element: <WikiPage basePath="/u/wiki" back="/u/plan" /> },
  // Los músculos por grupo y la página de cada uno. `musculos` es fijo: le gana a `wiki/:id`.
  {
    path: 'wiki/musculos',
    element: <MusclesIndexPage basePath="/u/wiki" back="/u/plan" />,
  },
  { path: 'wiki/musculos/:id', element: <MusclePage basePath="/u/wiki" /> },
  { path: 'wiki/:id', element: <WikiExercisePage basePath="/u/wiki" /> },
```

- [ ] **Step 2: Índice del Entrenador**

`coach/pages/MusclesPage.tsx`:

```tsx
import { MusclesIndexPage } from '@/features/catalog/pages/MusclesIndexPage';

import { RoutinesSegments } from '../components/RoutinesSegments';

/**
 * El índice de músculos de la biblioteca del Entrenador (CU-E-30): el mismo del Usuario
 * (`MusclesIndexPage`), dentro del segmento Ejercicios del tab Rutinas.
 */
export function MusclesPage() {
  return (
    <MusclesIndexPage
      basePath="/c/ejercicios"
      nav={<RoutinesSegments value="ejercicios" />}
    />
  );
}
```

- [ ] **Step 3: Rutas del Entrenador**

En `coach/routes.tsx`:

```tsx
import { MusclePage } from '@/features/catalog/pages/MusclePage';
```

```tsx
import { MusclesPage } from './pages/MusclesPage';
```

```tsx
  // La biblioteca de ejercicios, solo de lectura: la misma ficha que la wiki del Usuario.
  { path: 'ejercicios', Component: ExercisesPage },
  // Los músculos por grupo y la página de cada uno. `musculos` es fijo: le gana a `ejercicios/:id`.
  { path: 'ejercicios/musculos', Component: MusclesPage },
  {
    path: 'ejercicios/musculos/:id',
    element: <MusclePage basePath="/c/ejercicios" />,
  },
  {
    path: 'ejercicios/:id',
    element: <WikiExercisePage basePath="/c/ejercicios" />,
  },
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck` y `npx eslint src`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/features/user/routes.tsx src/features/coach/pages/MusclesPage.tsx src/features/coach/routes.tsx
git commit -m "T63: rutas de músculos para el Usuario y el Entrenador"
```

---

### Task 9: Verificación en el navegador

**Files:** ninguno, salvo los arreglos que salgan.

- [ ] **Step 1: Chequeos estáticos completos**

Run: `npm run typecheck`, `npx eslint src`, `npm run build` y `npx prettier --check src`
Expected: los cuatro sin errores. `npm run lint` puede fallar por los worktrees viejos de `.claude/worktrees` (anotado en la T62): por eso `npx eslint src`.

- [ ] **Step 2: Levantar la web**

Run: `npm run dev` (contra el backend local o con `VITE_API_URL` de Render, como en las tareas anteriores).

- [ ] **Step 3: Recorrido como Usuario**

| # | Pasos | Esperado |
|---|---|---|
| 1 | Biblioteca → buscar «press» → abrir un ejercicio → tocar un músculo | Abre `/u/wiki/musculos/<id>` con el nombre del músculo de título, la ilustración (o el ícono si no hay imagen), «Grupo muscular» con su nombre y las dos listas |
| 2 | «Volver» | Regresa a la ficha del ejercicio. Otro «Volver» deja la biblioteca con «press» en el buscador |
| 3 | Rutina del día → un ejercicio → marcar dos series → tocar un músculo → «Volver» | Regresa al ejercicio de la rutina con las dos series marcadas |
| 4 | En la página de un músculo, abrir un ejercicio de «Ejercicios que lo trabajan» → «Volver» | Regresa a la página del músculo |
| 5 | Tocar «Grupo muscular» | Abre `/u/wiki/musculos#<id del grupo>` con ese grupo a la vista |
| 6 | Un músculo de un grupo con más de 6 ejercicios ajenos → «Ver todos» | Abre la biblioteca con el chip de ese grupo activo |
| 7 | Un músculo con 6 o menos «otros» | No hay «Ver todos»: va la cantidad |
| 8 | Un ejercicio que trabaja dos músculos del mismo grupo, mirado desde uno de ellos | Está en «Ejercicios que lo trabajan» y no en «Otros ejercicios de …» |
| 9 | Biblioteca → «Músculos» | Los grupos en orden alfabético, cada uno con su mapa (o el ícono), su cantidad y sus músculos. «Ejercicios» vuelve a la lista |
| 10 | Pegar `/u/wiki/musculos/<id>` en la barra y cargar → «Volver» | La página abre sola; «Volver» va al índice |
| 11 | Cargar `/u/wiki/musculos/no-existe` | «Este músculo ya no existe» con «Ir a la biblioteca» |
| 12 | Tab hasta una pill de músculo en la ficha → Enter | El foco se ve; Enter abre la página |

Si en la base hay un músculo sin ejercicios asignados, abrirlo desde el índice: va «Todavía no hay ejercicios que trabajen este músculo.» y, si su grupo tiene ejercicios, la sección «Otros ejercicios de …». Si no hay ninguno, anotarlo en el resumen como no probado.

- [ ] **Step 4: Recorrido como Entrenador**

Repetir 1, 2, 5, 9 y 10 bajo `/c/ejercicios`. Además: en el índice y en la página del músculo, la tab «Rutinas» sigue marcada, y en el índice se ven las dos filas de segmentos con «Ejercicios» activo en la de arriba y «Músculos» en la de abajo.

- [ ] **Step 5: Anchos**

Mirar la página del músculo y el índice a 375 px y a 1280 px: la cabecera no se desborda con un nombre de grupo largo, y las listas pasan a dos columnas en escritorio.

- [ ] **Step 6: Commit de los arreglos**

```bash
git add src
git commit -m "T63: ajustes de la verificación en el navegador"
```

Sólo si hubo arreglos.

---

### Task 10: Documentación del repo web

**Files:**
- Modify: `CLAUDE.md` (sección «Navegación y rutas» y la fila de `catalog/` en «Estructura de carpetas»)
- Modify: `PLAN.md`
- Modify: `Status/` del web

- [ ] **Step 1: `CLAUDE.md`**

En «Rutas», sumar a **Usuario** `/u/wiki/musculos` y `/u/wiki/musculos/:id` (el índice de músculos por grupo y la página de un músculo), y a **Entrenador** `/c/ejercicios/musculos` y `/c/ejercicios/musculos/:id`. En la fila del Entrenador de la tabla de tabs, aclarar que Ejercicios tiene a su vez los segmentos «Ejercicios | Músculos». En la descripción de `catalog/`, sumar «el índice de músculos y la página de un músculo» a lo que comparten el Usuario y el Entrenador.

- [ ] **Step 2: `PLAN.md`**

Sumar la T63 con el formato de la T62: título «T63 · Detalle de músculo e índice de músculos en la biblioteca · CU-U-15, CU-U-10, CU-E-30», la referencia a la spec y a este plan en PowerApp-Docs, lo que se hizo, los endpoints (`GET /muscles/all`, `GET /muscles/mg/all` y `GET /exercise/all`, los tres reales y públicos), cómo probarlo (el recorrido de la tarea 9) y lo pendiente. Sumar las rutas nuevas a las filas «Wiki de ejercicios» y «Biblioteca de ejercicios» de la tabla de pantallas. Marcarla como hecha.

- [ ] **Step 3: Status del web**

Regenerar el Status del web como en las tareas anteriores: CU-U-10, CU-U-15 y CU-E-30 con la T63 y la entrada en «Cambios recientes». La copia a PowerApp-Docs la hace Fran.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md PLAN.md Status
git commit -m "T63: rutas, plan y estado"
```

- [ ] **Step 5: Resumen de la tarea**

Entregar el resumen que pide el `CLAUDE.md` del web. En «Diferencias con el prototipo» va que el prototipo no tiene estas dos pantallas (fuera de alcance, spec sección 9). En «Pendiente»: las descripciones de los músculos, que hoy pueden venir vacías (D81).

---

## 4. Qué queda para Fran

1. Copiar a PowerApp-Docs el Status del web regenerado.
2. Cargar las descripciones de los músculos desde el catálogo del Admin, si se quieren mostrar (D81).
3. Decidir si el prototipo de `UI Front/` y un plan de `Tests/` suman estas pantallas (fuera de alcance de la T63).
