# PowerApp iOS — Contexto del proyecto

## Qué es

- App iOS nativa en **SwiftUI** de **PowerApp**, una app de gimnasio y entrenamiento. Es mi proyecto de tesis: las especificaciones de casos de uso (CU) son entregable de la materia.
- Consume la API REST del backend (NestJS + TypeORM + PostgreSQL), clonado al lado de este repo en `../PowerApp-Backend` (https://github.com/FranCarames/PowerApp-Backend). **Desde acá es de sólo lectura.**
- La app cubre dos roles: **Usuario** (alumno) y **Entrenador**. Admin existe en la API pero no tiene interfaz: se opera por Swagger.
- Los CU se nombran `CU-X-NN` (U = Usuario, E = Entrenador, A = Admin). Son 75: 20 de Usuario, 32 de Entrenador y 23 de Admin.

## Fuentes de verdad

Todas viven en `../PowerApp-Backend/`. Al empezar cada sesión, corré `git -C ../PowerApp-Backend pull --ff-only`.

| Tema | Dónde |
|---|---|
| Contrato de la API y modelo, resumidos para la app | `Doc/app-ios/contexto-backend.md`. **Leelo antes de tocar networking o modelos.** |
| Modelo de datos (manda si hay diferencias) | `Doc/PowerApp - Modelo DB.svg` (y `.pdf`) |
| Contrato HTTP real | `power-app/src/`: los controllers (rutas y roles), los services (la respuesta real está en `res.status(...).send(...)`), `dtos/` y `entities/` |
| Qué hace cada CU | `Use Cases/` (el índice está en `README.md`) |
| Qué existe hoy en el back | `Status/estado-implementacion-CU.md` |
| Identidad visual | `UI Front/powerapp-prototype-app.html` |

## Hoja de ruta

1. Base técnica: arquitectura, networking y modelos.
2. Registro, login y recuperación de contraseña.
3. Usuario: inicio, mi planificación, detalle de rutina, marcar ejercicios y notas.
4. Usuario: wiki de ejercicios, temporizador, RMs y RMs potenciales.
5. Entrenador: alumnos, circuitos, rutinas y planificaciones.

## Arquitectura

*(Se completa en la Parte 2.)*

## Cómo trabajamos

- **Validá conmigo cada decisión de diseño antes de escribir código.** De a una, con opciones y tu recomendación (usá AskUserQuestion).
- **Flujo:** diseño acordado → spec en `Docs/specs/YYYY-MM-DD-<tema>-design.md` → plan en `Docs/plans/YYYY-MM-DD-<tema>-plan.md` → implementación → build y tests. Si tenés las skills de superpowers, usalas.
- **Documentá el porqué** de cada decisión, no sólo el qué.
- **Nunca corras `git commit` ni `git push`**, y tampoco `--amend`, `reset` ni `revert`. Dejá todo stageado, mostrame `git status --short` y sugerime el mensaje.
- **No levantes el backend.** Verificá con build y tests. Si hay que probar contra la API, pasame los pasos y lo corro yo.
- **El back es de sólo lectura.** Si encontrás un hueco o una inconsistencia, anotalo en la sección "Huecos del back" de `Docs/api-contract.md` y avisame.
- **Sin complejidad especulativa**, y sin dependencias de terceros sin mi OK.
- **Idioma:** los identificadores van en inglés, siguiendo a las entidades del back (`Routine`, `ExerciseSet`…). Los comentarios, la documentación y los textos de la UI van en español.

## Verificación

*(Se completa en la Parte 1, con el scheme y el simulador reales.)*
