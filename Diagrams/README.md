# Diagramas

Diagramas del proyecto, exportados desde Miro en SVG y PDF. Este índice alimenta el visor
([`index.html`](index.html), publicado en <https://francarames.github.io/PowerApp-Docs/Diagrams/>).

Para sumar un diagrama: dejar el `.svg` y el `.pdf` con el mismo nombre en esta carpeta y
agregar una línea `- [Título](archivo%20con%20espacios.svg) — tipo` bajo su grupo. El link
de cada diagrama en el visor sale del título (`Diagrama de despliegue` → `#diagrama-de-despliegue`).
Después, correr `node .claude/tools/audit-diagrams.js`.

El modelo de datos vive en `Doc/` porque es la fuente de verdad del modelo.

## Casos de uso

- [Casos de uso del Usuario](Diagrama%20CU%20-%20Usuario%20-%202026.svg) — UML · casos de uso
- [Casos de uso del Entrenador](Diagrama%20CU%20-%20Entrenador%20-%202026.svg) — UML · casos de uso
- [Casos de uso del Admin](Diagrama%20CU%20-%20Admin%20-%202026.svg) — UML · casos de uso

## Datos

- [Modelo de datos](../Doc/PowerApp%20-%20Modelo%20DB.svg) — Entidad-relación

## Diseño

- [Diagrama de clases](Diagrama%20de%20clases.svg) — UML · clases

## Arquitectura

- [Componentes del servidor](Diagramas%20de%20componentes%20del%20servidor.svg) — UML · componentes
- [Diagrama de despliegue](Diagrama%20de%20despliegue.svg) — UML · despliegue
