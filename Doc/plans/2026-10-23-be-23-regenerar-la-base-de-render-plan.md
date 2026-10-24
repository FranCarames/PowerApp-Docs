# BE-23 — Regenerar la base de Render · Plan y runbook

> **Quién lo ejecuta:** el usuario. Es una operación sobre su cuenta de Render y su base: desde acá no se crea ninguna instancia ni se toca ninguna credencial. Lo que sí se hizo desde acá es **todo lo que se puede comprobar sin Postgres** (sección 4), para que la corrida real sea lo más corta y segura posible.
>
> **Reglas del proyecto:** no se commitea ni se pushea. **No cambia código de la API**: la base se cambia por variables de entorno (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`; el `ssl` con `rejectUnauthorized: false` ya está en `app.module.ts`).

**Fuente:** [BE-23 del roadmap](2026-10-16-roadmap-backend.md) («recrear la instancia y aplicar `01` → `02` → `03`, con el esquema de BE-10 como mínimo; se anota la fecha de vencimiento nueva») y [BE-21](2026-10-23-be-21-seed-de-la-cadena-de-entrenamiento-plan.md), que existe justamente para que lo que se pierde de la base vieja no haga falta.
**Aceptación:** las credenciales del seed entran por el web desplegado, el Swagger de Render coincide con el local, y la fecha de vencimiento nueva queda anotada.

---

## 1. Decisiones

1. **BE-22 queda fuera de esta regeneración** (el usuario eligió «No» el 23/10): la base nueva sale con el `01` de hoy. Es lo más corto y deja una sola cosa nueva que probar. Si después se quiere, se hace con un patch sobre la base nueva; las dos FK de `Exercise` (`User_RM.exercise_id` y `Routine_Exercise.exercise_id`) siguen en `CASCADE`, protegidas por el `409` del service (A-06).
2. **Cuándo crearla.** La base free de Render dura 30 días desde que se crea (dato del proyecto). La vieja se creó el 3/10 y vence ≈ 2/11 (**mirá la fecha real en el panel**). La entrega es el 20/11. Crear la nueva:
   - el **23/10 (hoy)** vence ≈ 22/11: sólo 2 días de margen sobre la entrega;
   - entre el **30/10 y el 1/11** vence entre el 29/11 y el 1/12: cubre la entrega con ~10 días.
   - **Recomendado: 30/10 a 1/11**, dejando la vieja como respaldo hasta entonces. No esperar al 2/11: es el día en que se cae.
3. **El apuntador es el último paso.** Las variables del web service no se tocan hasta tener la base nueva cargada y verificada. Si algo falla antes, la vieja sigue sirviendo.
4. **Todo en una transacción.** En Postgres el DDL es transaccional: `01`, `02` y `03` se aplican con *commit manual*, se verifica, y recién ahí `COMMIT`. Si el `01` falla (nunca se aplicó desde cero desde BE-10, BE-18, BE-24 y BE-25), `ROLLBACK` deja la base vacía y se repite.

---

## 2. Qué se pierde

Lo cargado a mano en la base vieja: circuitos, rutinas y planificaciones de prueba, usuarios creados desde el web, pagos, RMs y lo que hayan dejado las tandas de `Tests/`. **Se conserva lo del seed**: 10 usuarios, 3 entrenadores, membresías, pagos, RMs, el catálogo de ejercicios y la cadena de entrenamiento de BE-21. Si hay algo que quieras guardar, exportalo antes (DBeaver → clic derecho en la tabla → *Export Data*).

---

## 3. Pasos

**0. Antes de empezar**
- [ ] Anotar la **fecha de vencimiento real** de la base vieja (panel de Render).
- [ ] Tener a mano DBeaver y los tres archivos de `Db Creator/`: `01_estructura.sql`, `02_datos_estaticos.sql` y `03_datos_dinamicos.sql`. Si pasó algo desde esta tarea, regenerarlos con `python build_sql.py`.

**1. Crear la base nueva** en Render (PostgreSQL, plan free, la misma región que el web service; versión 13 o mayor: el `01` usa `gen_random_uuid()`). Anotar los datos de conexión que muestra el panel: *Hostname*, *Port*, *Database*, *Username* y *Password*. Render da una URL **interna** (sólo funciona desde otros servicios de Render de la misma región) y una **externa** (la de DBeaver).

**2. Conectar DBeaver** a la base nueva con la URL externa y SSL activado (modo *require*).

**3. Aplicar los tres scripts en una transacción**
1. Pasar la conexión a **commit manual** (botón *Auto/Manual commit* de la barra).
2. Abrir `01_estructura.sql` → *Execute Script* (Alt+X). Si pide qué hacer ante un error, elegir **Stop**.
3. Lo mismo con `02_datos_estaticos.sql` y después con `03_datos_dinamicos.sql`.
4. **Si cualquiera falla:** *Rollback*, copiar el mensaje exacto y la sentencia que falló, y avisar. La base queda vacía.

**4. Verificar antes del commit.** Pegar y ejecutar:

```sql
-- Conteo por tabla: 20 filas, todas en 'ok'
SELECT t.tabla, t.filas, t.esperado, CASE WHEN t.filas = t.esperado THEN 'ok' ELSE 'REVISAR' END AS estado
FROM (
  SELECT 'User' AS tabla, COUNT(*) AS filas, 10 AS esperado FROM public."User"
  UNION ALL SELECT 'Coach', COUNT(*), 3 FROM public."Coach"
  UNION ALL SELECT 'Membership', COUNT(*), 3 FROM public."Membership"
  UNION ALL SELECT 'Membership_Payment', COUNT(*), 43 FROM public."Membership_Payment"
  UNION ALL SELECT 'User_RM', COUNT(*), 83 FROM public."User_RM"
  UNION ALL SELECT 'Muscle_Group', COUNT(*), 8 FROM public."Muscle_Group"
  UNION ALL SELECT 'Muscle', COUNT(*), 35 FROM public."Muscle"
  UNION ALL SELECT 'Exercise', COUNT(*), 207 FROM public."Exercise"
  UNION ALL SELECT 'Exercised_Muscle', COUNT(*), 734 FROM public."Exercised_Muscle"
  UNION ALL SELECT 'Circuit', COUNT(*), 7 FROM public."Circuit"
  UNION ALL SELECT 'Routine', COUNT(*), 6 FROM public."Routine"
  UNION ALL SELECT 'Routine_Exercise', COUNT(*), 18 FROM public."Routine_Exercise"
  UNION ALL SELECT 'Exercise_Set', COUNT(*), 20 FROM public."Exercise_Set"
  UNION ALL SELECT 'Routine_Circuit', COUNT(*), 12 FROM public."Routine_Circuit"
  UNION ALL SELECT 'Planification', COUNT(*), 4 FROM public."Planification"
  UNION ALL SELECT 'Routine_Asignation', COUNT(*), 27 FROM public."Routine_Asignation"
  UNION ALL SELECT 'User_Planification', COUNT(*), 5 FROM public."User_Planification"
  UNION ALL SELECT 'Routine_Asignation_User', COUNT(*), 7 FROM public."Routine_Asignation_User"
  UNION ALL SELECT 'Routine_Asign_Exercise_Finished', COUNT(*), 17 FROM public."Routine_Asign_Exercise_Finished"
  UNION ALL SELECT 'Routine_Exercise_Finished', COUNT(*), 27 FROM public."Routine_Exercise_Finished"
) t ORDER BY t.tabla;

-- El esquema: 20 tablas y 24 claves foráneas (11 RESTRICT y 13 CASCADE)
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tablas,
  (SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace) AS fk,
  (SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND confdeltype = 'r' AND connamespace = 'public'::regnamespace) AS fk_restrict,
  (SELECT COUNT(*) FROM pg_constraint WHERE contype = 'f' AND confdeltype = 'c' AND connamespace = 'public'::regnamespace) AS fk_cascade;
```

Esperado en la segunda consulta: `tablas = 20`, `fk = 24`, `fk_restrict = 11`, `fk_cascade = 13`. Las dos FK de BE-24 y BE-25 (`fk_muscle_muscle_group` y `fk_exercised_muscle_muscle`) tienen que ser `RESTRICT`.

Si todo está en `ok`: **`COMMIT`**. Si no, `ROLLBACK` y avisar qué tabla no coincide.

**5. Cambiar el apuntador.** En el web service de Render, actualizar `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` con los de la base nueva (si el servicio y la base están en la misma región, se puede usar el hostname **interno**). **No tocar** `JWT_SECRET`, `DB_LOGGING` ni `LOG_TEMP_PASSWORD`. Render redespliega solo al cambiar las variables. Si querés trabajar en local contra la base nueva, actualizá también el `.env` (está fuera de git).

**6. Verificar el servicio**
- [ ] Los logs de Render arrancan sin errores de conexión a la base.
- [ ] El Swagger de Render (`/docs`) coincide con el local: mismos endpoints y los mismos DTOs (en particular `RoutineHistoryIndividualSessionDto` y `RoutineHistoryPlanSessionDto` en el historial).
- [ ] Entran por el **web desplegado**, con `pass123`: `lucia.fernandez@test.com` (alumna), `charly.tauros@test.com` (entrenador) y `caramesfranco@gmail.com` (admin).
- [ ] **Humo por escenario** (con el prefijo `/api/v1`; los números salen de correr el service real sobre el seed, ver sección 4):

| Pedido (con el token de…) | Tiene que dar |
|---|---|
| `GET /routine/home/<id de Lucía>?date=2026-10-19&week=2` | Semana 1: individual «Metabólico» 1/2; plan «Fuerza 4 semanas», semana 1: Día A 6/6, Día B 6/6, Día C 3/6. Semana 2: Día A 2/6, Día B 0/5, Día C 0/6 |
| `GET /routine/home/<id de Mateo>?date=2026-10-19&week=2` | Semana 1: «Full Body» 8/8 y ningún plan. Semana 2: «Fuerza», semana 1, con 0/6, 0/5 y 0/6 |
| `GET /routine/home/<id de Sofía>?date=2026-10-26&week=1` | Sólo «Hipertrofia 6 semanas», semana 1 (el plan «Fuerza» quitado no aparece) |
| `GET /routine/home/<id de Tomás>?date=2026-11-30&week=1` | «Hipertrofia 6 semanas», semana 1 |
| `GET /routine/home/<id de Valentina>?date=2026-10-26&week=1` | «Full Body» 0/8 y «Metabólico» 0/2, las dos el 26/10, sin plan |
| `GET /routine/history/<id de Lucía>` (coach) | 5 sesiones: plan Día A semana 2 (26/10), individual «Metabólico» (24/10), plan Día C (23/10), plan Día B (21/10) y plan Día A (19/10) |
| `GET /planification/user/<id de Sofía>?include_inactive=true` (coach) | 2 asignaciones: «Hipertrofia» vigente y «Fuerza» quitada |

**7. Anotar la fecha de vencimiento nueva** (creación + 30 días) y pasármela: la dejo en el Status (la nota de «Base de datos»), en la memoria del proyecto y en el roadmap. Poner un recordatorio unos días antes.

**8. Cuando todo ande,** suspender o borrar la base vieja (o dejar que venza).

---

## 4. Qué se comprobó desde acá (23/10, sin Postgres) y qué no

**Comprobado**

| Qué | Cómo | Resultado |
|---|---|---|
| Que `01` → `02` → `03` regeneran idénticos a lo versionado | `python build_sql.py` en dos copias limpias | byte-idénticos |
| Que el `01` se pueda aplicar en este orden en Postgres | `preflight.py`: cada FK apunta a una tabla creada **antes**, índices y constraints con nombres únicos, tipo ENUM antes de su uso, nada suelto fuera de `CREATE TYPE/TABLE/INDEX` | 16 chequeos, 0 fallas |
| Que los `INSERT` calcen con el DDL | mismas pruebas: tabla y columnas existentes, `NOT NULL` sin default presentes, padres antes que hijos entre el `02` y el `03` | 0 fallas |
| Que el esquema calce con lo que esperan las entidades | `entities-vs-ddl.js`: tablas, columnas, nulabilidad, `ON DELETE` y únicos, con la metadata real de TypeORM | 254 chequeos, **7 diferencias heredadas** (abajo) |
| Que el seed funcione con la API | BE-21: los `.sql` en SQLite con FK activas (51) y el service real corriendo sus consultas sobre el seed (56) | 0 fallas |

**No comprobado:** que el `01` se aplique en un Postgres de verdad (por eso la transacción y el paso 4), el rendimiento y el comportamiento propio de Postgres (collation, orden de nombres). Eso lo cubre esta corrida y, después, BE-35.

**Diferencias heredadas entre las entidades y el `01`** (siete, anteriores a estas tareas; ninguna cambia lo que hace la API, porque `synchronize` está en `false` y manda el DDL; no bloquean la regeneración):
- `Coach.coach_email` y `Coach.cuil` son `NOT NULL` en la entidad y nulables en el DDL.
- `Coach.id` declara una FK a `User` que el DDL no crea.
- `Membership_Payment.user_id`, `Membership_Payment.membership_id`, `User_RM.user_id` y `User_RM.exercise_id` no declaran `onDelete` en la entidad; el DDL tiene `CASCADE` y `RESTRICT`.

Alinearlas es una decisión de modelo (el diagrama manda) y puede entrar en BE-22 o en la limpieza de la fase 5.

---

## 5. Qué sigue

- **BE-35** (plan de pruebas Backend) puede apoyarse en los escenarios del seed en vez de armar datos a mano.
- **Fase 4:** BE-27 y BE-28 son las bajas rápidas; BE-29 necesita que crees la cuenta del proveedor de mail.
