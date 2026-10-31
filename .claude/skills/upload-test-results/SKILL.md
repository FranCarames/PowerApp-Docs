---
name: upload-test-results
description: Abre (o actualiza) un PR a main con todas las tandas de resultados acumuladas en la rama tests-results. Usar cuando el usuario pida subir los resultados de los tests, o invoque /upload-test-results.
disable-model-invocation: true
---

# Subir los resultados de tests: PR de `tests-results` a `main`

La rama `tests-results` acumula un commit atómico por tanda («Tests: tanda N de <plan>»: el JSON + la línea en `Tests/README.md`). Los crea `.claude/tools/ingest-test-results.js` en un worktree aparte (`.git/tests-results-wt`), sin tocar el checkout de `main`. Esta skill los lleva a GitHub. **Nunca mergea el PR ni toca `main`.**

## Pasos

1. **Levantar lo pendiente.** Correr `node .claude/tools/ingest-test-results.js` (una pasada). Si deja líneas `✗`, mostrárselas al usuario: esas tandas no entraron y hay que corregirlas antes.
2. **Ver qué hay.** `git fetch origin` y `git log --oneline origin/main..tests-results`. Si no hay commits, decirlo y terminar.
3. **Poner la rama al día con main** (en el worktree: `git -C .git/tests-results-wt rebase origin/main`). Si hay conflicto, `rebase --abort`, explicarlo y parar: lo resuelve el usuario.
4. **Auditar el índice** de la rama: `node .claude/tools/audit-index.js "$(pwd)/.git/tests-results-wt"` tiene que decir «índice consistente».
5. **Pushear:** `git -C .git/tests-results-wt push -u origin tests-results` (con `--force-with-lease` solo si el rebase del paso 3 reescribió commits ya pusheados).
6. **PR.** Si `gh pr list --head tests-results --state open` ya devuelve uno, el push lo actualizó: pasar su link. Si no, `gh pr create --base main --head tests-results` con:
   - título: `Tests: resultados acumulados (N tandas)`;
   - cuerpo: una línea por commit (plan, tanda, `aprobados/total`, fallas), sacada de los commits y de cada JSON; cerrar con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
7. **Informar** el link del PR y las tandas que incluye.

## Reglas

- No mergear, no auto-merge, no commits a mano en la rama: si algo hay que corregir, se corrige el archivo y se vuelve a ingestar.
- Tras el merge, los JSON que quedaron sin trackear en `main` chocan al hacer `git pull`: borrarlos antes (ya están en la rama).
- Después del merge, la rama se puede borrar y se recrea sola en la próxima tanda.
