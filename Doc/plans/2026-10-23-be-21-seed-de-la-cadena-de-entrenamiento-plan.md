# BE-21 — Seed de la cadena de entrenamiento · Plan de implementación

> **Reglas del proyecto que pisan a la skill de planes:**
> 1. **No se commitea ni se pushea.** Los cambios de esta tarea quedan **sin stagear** mientras BE-20c y BE-20d sigan sin commitear: así cada commit lleva una sola tarea.
> 2. **No hay tests automáticos** (decisión del 16/10). La verificación es el build, `Db Creator` regenerado y **scripts descartables en el scratchpad**, que no entran a ningún repo.
> 3. **No se levanta el server**, ni se instala nada. El seed se probó en un SQLite en memoria (`sqlite3` de Python y `node:sqlite`, que ya vienen con las herramientas), no en un Postgres.
>
> **Este plan registra lo hecho:** el usuario pidió seguir con BE-21 el 23/10 y **aprobó el contenido completo** (los cinco escenarios, las cuatro plantillas y los tres casos borde) antes de que escribiera el generador.

**Qué manda:** [BE-21 del roadmap](2026-10-16-roadmap-backend.md) («Seed de la cadena de entrenamiento») y [§8 del bloque B](../specs/2026-10-20-asignar-planificaciones-design.md): *una planificación con semanas, asignaciones de plan (vigente, futura y quitada) y ejecuciones con `finished_at`, además de las individuales*. El roadmap habla de `User_Routine`, que ya no existe: lo reemplazan `Routine_Asignation_User` y las dos tablas de «hecho» (BE-10 y BE-18).
**Modelo:** sin cambios. **No cambia ninguna entidad ni el DDL**, así que `01_estructura.sql` y `02_datos_estaticos.sql` quedan byte-idénticos y sólo cambia `03_datos_dinamicos.sql`.

**Goal:** que, aplicados los tres `.sql`, cada flujo de U-08 a E-07 (y los ABM del coach) se pueda demostrar sin cargar nada a mano, con un escenario por alumno y con los casos de baja lógica que BE-35 nunca pudo probar.

**Architecture:** una sección nueva al final de `dynamic_data.py` que describe el escenario con tuplas legibles (circuitos, rutinas, planificaciones, asignaciones y marcas) y las traduce a filas con UUID v5; un helper genérico `_insert` en `build_sql.py` que arma cada `INSERT`. Todo se valida al generar: si una invariante no se cumple, la generación corta.

---

## 1. Decisiones del plan

**La que el usuario aprobó (23/10):**

1. **El diseño completo** (la otra opción era una versión más chica sin los casos borde, el plan libre ni el descontinuado). Cubre cada flujo y deja listo el material de BE-35.

**Las que la spec no dice (se pueden vetar al revisar):**

2. **Fechas fijas, de octubre a diciembre de 2026.** El seed no puede saber qué día se aplica, y la regeneración tiene que dar los mismos bytes (criterio de BE-21). Los lunes del escenario son 5/10, 12/10, 19/10, 26/10, 2/11, 9/11, 16/11 y 30/11. **Consecuencia:** el home se navega mandando `date`; después del 22/11 los planes de Lucía y Mateo ya terminaron, lo que también se puede probar. La entrega es el 20/11.
3. **Todo en `dynamic_data.py`**, como dice el roadmap, y no en un módulo nuevo: es dato de prueba y va al `03`. Se actualizó el mapa de `CLAUDE.md` y el README de `Db Creator`.
4. **`ON CONFLICT DO NOTHING` sin objetivo** en las once tablas nuevas (las anteriores usan `ON CONFLICT (id)`). Cubre el id **y** los únicos propios (`uk_rau_routine_user_date`, `uk_raef_asign_exercise`, `uk_ref_plan_asignation_exercise`): si alguien ya marcó algo a mano, re-aplicar el `03` no falla.
5. **Sobre la base viva alcanza con volver a aplicar el `03`** (BE-23): agrega la cadena sin tocar lo que ya haya. No hace falta un patch porque no cambia el esquema. Los alumnos y entrenadores del seed tienen UUID v5 deterministas, así que las referencias coinciden con los de la base ya sembrada.
6. **Los ejercicios salen del catálogo por nombre** y la generación corta si un nombre no existe. «Sentadilla» usa su UUID original.
7. **Los alumnos y entrenadores que ya existían no se tocan.** Las cuentas propias del usuario (Franco) quedan sin datos de entrenamiento.
8. **Las contraseñas siguen siendo `pass123`** para todos.

---

## 2. El contenido

**Catálogo**
- **7 circuitos** con ejercicios reales del catálogo y series (`Piernas - Fuerza`, `Piernas - Hipertrofia`, `Empuje`, `Tracción`, `Core`, `Metabólico` y `Circuito en desuso`, de baja).
- **6 rutinas:** `Día A - Piernas`, `Día B - Empuje`, `Día C - Tracción`, `Full Body`, `Metabólico` y `Rutina de prueba (baja)`.
- **4 plantillas:** `Fuerza 4 semanas` (3 rutinas por semana y una quitada de la semana 2), `Hipertrofia 6 semanas` (semanas 1 a 3 cargadas), `Plan libre` (duración 0) y `Plan descontinuado` (de baja).

**Un escenario por alumno**

| Alumno | Qué tiene | Qué demuestra |
|---|---|---|
| Lucía | «Fuerza» vigente desde el 19/10, con la semana 1 casi completa (notas, una marca en diferido), parte de la 2 y una individual el 24/10 | Home combinado, progreso, marcar y desmarcar, historial con las dos fuentes, filtro por ejercicio, `409` de solapamiento al asignar |
| Mateo | «Fuerza» vigente desde el 26/10 sin marcas y una individual pasada, completa | Marcar desde cero |
| Sofía | «Fuerza» **quitado** con marcas de las semanas 1 y 2, y «Hipertrofia» vigente desde el 26/10 | Quitar y reincorporar, historial de una asignación quitada |
| Tomás | «Hipertrofia» **futura** (desde el 30/11) y una individual futura sin marcas | Plan que aún no empezó, quitar una individual sin historial |
| Valentina | **Sin plan**; individuales: una hecha el 19/10, dos el 26/10 y una el 2/11 | Asignar un plan sin conflicto, dos sesiones el mismo día, E-19 y E-20 |

**Casos borde de baja lógica**
- «Full Body» tiene el circuito `Metabólico` apagado (sin `order`) y Valentina completó un ejercicio suyo: el detalle muestra sólo lo completado.
- `Fondos en Paralelas` está dado de baja en `Empuje` y Lucía lo completó antes.
- `Metabólico` está quitada de la semana 2 del plan «Fuerza» y Sofía hizo algo en ella.

**Filas:** 7 circuitos, 6 rutinas, 18 ejercicios de circuito con 20 bloques de series, 12 vínculos rutina-circuito, 4 plantillas con 27 rutinas en semanas, 5 planes asignados, 7 individuales, 17 hechos individuales y 27 del plan.

---

## 3. Mapa de archivos

**Backend (`D:\Power App\Backend\PowerApp-Backend`)**

| Archivo | Cambio |
|---|---|
| `Db Creator/dynamic_data.py` | La sección «Cadena de entrenamiento»: `_CIRCUITS`, `_ROUTINES`, `_PLANS`, `_USER_PLANS`, `_INDIVIDUALS` y `_build_training()` con sus validaciones |
| `Db Creator/build_sql.py` | `_lit` y `_insert`, los once `INSERT` de la cadena en `build_dinamicos()` y el resumen que imprime |
| `Db Creator/03_datos_dinamicos.sql` | Regenerado (el único `.sql` que cambia) |
| `Db Creator/README.md`, `CLAUDE.md` | La descripción de la cadena y la fila nueva del mapa entidad → script |
| `Status/estado-implementacion-backend.md`, `Status/dashboard-estado-backend.html` | La entrada del 23/10 y la fase 3 |

**Docs (`D:\Power App\Docs\PowerApp-Docs`):** este plan.

**Scratchpad** (fuera de los repos): `…/335dcfcb-52a1-4933-a5ac-194985358fde/scratchpad/be21/`, con `verify_seed.py`, `harness.js`, `verify-seed-services.js` y la copia de `lib.js`.

---

## 4. Verificación (hecha el 23/10, sin levantar el server ni un Postgres)

| Qué | Resultado |
|---|---|
| `Db Creator` regenerado en dos corridas limpias | `01`, `02` y `03` **byte-idénticos** entre sí y contra lo versionado |
| `01` y `02` | Intactos (`git diff` vacío) |
| `npm --prefix power-app run build` | En verde |
| `verify_seed.py`: los tres `.sql` en un **SQLite en memoria con claves foráneas activas** | **51 chequeos**, 0 fallas |
| `verify-seed-services.js`: el **service real** de la API corriendo sus consultas sobre el seed | **56 chequeos**, 0 fallas, 121 consultas ejecutadas |

**`verify_seed.py`** traduce el SQL de Postgres a SQLite sólo en lo estrictamente necesario y comprueba:
- que no haya violaciones de FK, `NOT NULL` ni únicos, y que **re-aplicar el `03` no duplique nada**;
- el largo de los `VARCHAR` del DDL, que SQLite no aplica;
- las invariantes que la base no garantiza: `order` 1..N de los vínculos activos, `exercise_order` y `set_order` sin huecos, `rpe`/`rir` excluyentes, `rm` sólo con `set_count` 1, la semana dentro de la duración, inicio lunes y fin domingo, que la rutina del plan sea de la **misma plantilla** que la asignación, que cada ejercicio hecho sea de un circuito de la rutina, que ningún alumno tenga dos planes activos que se pisen y que los ids sean UUID v5;
- los tres casos borde, y lo que se puede demostrar con cada alumno.

**`verify-seed-services.js`** parchea el `PostgresQueryRunner` de TypeORM para que ejecute en `node:sqlite` el SQL que arma el service (el resto del camino, query builder y hidratación de entidades, es el real). Corre:
- **el home** de los cinco alumnos en las semanas que importan: el progreso de Lucía (6/6, 6/6 y 3/6, y la semana 2 con 2/6, 0/5 y 0/6), el plan quitado de Sofía fuera del home, el plan futuro de Tomás y las dos sesiones del mismo día de Valentina;
- **los detalles** individual y del plan: el circuito apagado con sólo el burpee, los fondos de baja que se ven porque se completaron, la rutina quitada con y sin nada hecho y el `403` de otro alumno;
- **el historial** de cada uno, con y sin filtro: el orden mezclado de las dos fuentes y el plan quitado de Sofía;
- **los listados del coach:** las asignaciones de un alumno, las planificaciones, las rutinas y los circuitos, con y sin `include_inactive`.

**Diferencias con Postgres que el arnés tuvo que neutralizar** (y que conviene recordar al interpretar los resultados):
- SQLite ordena los `NULL` primero en `ASC` y Postgres al final; el arnés lo hace explícito. Sin eso, el vínculo apagado salía primero en el detalle.
- `timestamptz` vuelve como `Date`, como con el driver `pg`.
- Las escrituras de TypeORM usan `DEFAULT` en los `VALUES` y no corren en SQLite: **marcar, desmarcar y asignar siguen verificados sólo con repositorios falsos**.

**Qué NO se verificó:**
- Que el `03` se aplique en un **Postgres**: es la primera vez que estas tablas reciben datos de prueba. Lo cubre BE-23 al regenerar la base de Render.
- El comportamiento de las consultas en Postgres (collation, `ORDER BY` de nombres): BE-35.
- Que el web y el iOS muestren estos escenarios.

---

## 5. Para BE-23 y BE-35

- **BE-23:** aplicar `01` → `02` → `03` en la base nueva, o sólo el `03` sobre la actual. Las cuentas de los alumnos y los entrenadores entran con `pass123`.
- **BE-35:** el plan de pruebas Backend puede apoyarse en estos escenarios en vez de armar datos a mano; los tres casos borde son justo la rama de baja lógica de E-23 y el orden anidado de tres niveles que el Status marca como «sin verificar en runtime».
