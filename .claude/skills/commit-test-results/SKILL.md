---
name: commit-test-results
description: Levanta los resultados de tests nuevos de Tests/*/ y los commitea, uno por tanda, en la rama tests-results; después borra las copias locales. Usar cuando el usuario pida commitear/subir a la rama los resultados nuevos, o invoque /commit-test-results.
disable-model-invocation: true
---

# Commitear los resultados nuevos en `tests-results`

Lleva cada `N-<plan>.resultados.json` nuevo (sin trackear) de `Tests/<plan>/` a la rama `tests-results`, como un commit atómico por tanda: el JSON + su línea «Tanda N» en `Tests/README.md`, con el mensaje `Tests: tanda N de <plan>`. Trabaja en un worktree aparte (`.git/tests-results-wt`): **nunca toca `main` ni cambia de rama el checkout.** No pushea; eso lo hace `/upload-test-results`.

## Pasos

1. Correr `node .claude/tools/ingest-test-results.js` desde la raíz del repo.
   - Si hay varios resultados nuevos, los commitea **del más viejo al más nuevo** (fecha de modificación; dentro de un mismo plan, por número de tanda).
   - Antes de cada uno rebasea la rama sobre `main` si `main` avanzó (así valida contra el plan vigente).
   - Valida plan, casos, resumen y que el número sea la próxima tanda del índice.
   - Tras cada commit **borra la copia local** del JSON (ya está idéntica en la rama, así no choca con el `git pull`).
2. Informar la salida, tanda por tanda: plan, aprobados/total, fallas, re-testear, sin probar, y los `aviso:` si hubo.
3. Los `✗` no se commitean ni se borran: el archivo queda en su carpeta. Explicar el motivo al usuario (número de tanda que no corresponde, casos que no están en el plan, etc.) y qué corregir.
4. Si el script rebaseó una rama que ya estaba pusheada, avisar que el próximo `/upload-test-results` la sube con `--force-with-lease`.

## Reglas

- No mergear, no pushear, no commitear en `main`.
- No editar a mano la rama ni el README: si algo hay que corregir, se corrige el archivo y se vuelve a invocar.
