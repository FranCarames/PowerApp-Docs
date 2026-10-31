#!/usr/bin/env node
// Levanta los resultados nuevos de Tests/<plan>/ y los commitea en la rama `tests-results`.
//
//   node .claude/tools/ingest-test-results.js            una pasada
//   node .claude/tools/ingest-test-results.js --watch    una pasada cada 1 min hasta que se corte
//
// Por cada `N-<plan>.resultados.json` nuevo (sin trackear) en la carpeta de un plan:
//   1. lo valida contra el HTML del plan (plan, casos, resumen) y contra el índice (N = próxima tanda);
//   2. lo copia y suma el sub-bullet «Tanda N» en Tests/README.md;
//   3. hace UN commit atómico (el JSON + el README): «Tests: tanda N de <plan>».
// Nunca toca main ni el checkout actual: trabaja en un worktree de la rama, en .git/tests-results-wt.
// Lo que no valida no se commitea: queda dicho en la salida y el archivo se deja donde estaba.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BRANCH = 'tests-results';
const BASE = 'main';
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim();
const GITDIR = path.resolve(ROOT, execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim());
const WT = path.join(GITDIR, 'tests-results-wt');
const PIDFILE = path.join(GITDIR, 'tests-results-watch.pid');

const git = (args, cwd = ROOT) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const log = (m) => console.log(`[${new Date().toLocaleTimeString('es-AR')}] ${m}`);

function ensureWorktree() {
  if (fs.existsSync(path.join(WT, '.git'))) return;
  git(['worktree', 'prune']);
  let exists = true;
  try { git(['show-ref', '--verify', '--quiet', `refs/heads/${BRANCH}`]); } catch { exists = false; }
  if (exists) git(['worktree', 'add', WT, BRANCH]);
  else git(['worktree', 'add', '-b', BRANCH, WT, BASE]);
  log(`worktree listo en ${WT} (rama ${BRANCH})`);
}

/** Casos y PAGE_ID de un plan, leídos de su HTML igual que hace el propio plan. */
function readPlan(htmlPath) {
  const src = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
  const g = (re) => re.exec(src)[0];
  const extra = (src.match(/^  const LONG_\w+ = .*$/gm) || []).join('\n');
  const head = g(/const DOCS = .*;\n.*const tok = .*;\n.*const ui = .*;/);
  const cases = g(/const CASES = \[[\s\S]*?\n  \];/);
  const CASES = new Function(`${head}\n${extra}\n${cases}\nreturn CASES;`)();
  const m = /const PAGE_ID = '([^']+)'/.exec(src) || /const PLAN_ID = '([^']+)'/.exec(src);
  return { cases: CASES, plan: m[1].replace(/-powerapp$/, '') };
}

/** Posición del plan de una carpeta en el README: título, línea y última línea de tandas. */
function findPlan(lines, folder) {
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = !fence; continue; }
    if (fence) continue;
    const m = /^-\s+\[([^\]]+)\]\(([^)]+)\)/.exec(lines[i]);
    if (!m || decodeURIComponent(m[2]).split('/')[0] !== folder) continue;
    let last = i, runs = 0;
    while (/^\s+-\s+\[/.test(lines[last + 1] || '')) { last++; runs++; }
    return { title: m[1], html: decodeURIComponent(m[2]), line: i, last, runs };
  }
  return null;
}

/** Valida el JSON contra el plan; devuelve { errors, warnings, json, n }. */
function validate(rel, bytes, plan, planInfo) {
  const errors = [], warnings = [];
  let json;
  try { json = JSON.parse(bytes.toString('utf8')); } catch (e) { return { errors: [`JSON inválido: ${e.message}`] }; }
  const file = path.basename(rel);
  const mn = /^(\d{1,3})-/.exec(file);
  if (!mn) errors.push(`el nombre «${file}» no empieza con el número de tanda (¿se exportó con fecha?)`);
  const n = mn ? Number(mn[1]) : 0;
  if (mn && n !== planInfo.runs + 1) errors.push(`el archivo es la tanda ${n} pero el índice de la rama tiene ${planInfo.runs}: toca la ${planInfo.runs + 1}`);
  if (json.plan !== plan.plan) errors.push(`el plan del JSON es «${json.plan}» y se esperaba «${plan.plan}»`);
  const res = json.results || {};
  const ids = plan.cases.map((c) => c.id);
  const missing = ids.filter((i) => !res[i]), extra = Object.keys(res).filter((i) => !ids.includes(i));
  if (missing.length) errors.push(`faltan casos en el JSON: ${missing.join(', ')}`);
  if (extra.length) errors.push(`sobran casos en el JSON: ${extra.join(', ')}`);
  const count = { ok: 0, fail: 0, retest: 0, none: 0 };
  for (const id of ids) {
    const r = res[id];
    if (!r) continue;
    if (![null, 'ok', 'fail', 'retest'].includes(r.status)) errors.push(`${id}: estado raro «${r.status}»`);
    count[r.status || 'none']++;
    const t = plan.cases.find((c) => c.id === id).t;
    if (r.title !== t) warnings.push(`${id}: el título cambió respecto del plan`);
  }
  const s = json.summary || {};
  if (!missing.length && (s.total !== ids.length || ['ok', 'fail', 'retest', 'none'].some((k) => s[k] !== count[k])))
    errors.push(`el summary no coincide con el conteo real ${JSON.stringify(count)}`);
  return { errors, warnings, json, n, count, total: ids.length };
}

function ingestOne(rel) {
  const src = path.join(ROOT, rel);
  const bytes = fs.readFileSync(src);
  const dst = path.join(WT, rel);
  if (fs.existsSync(dst)) {
    if (fs.readFileSync(dst).equals(bytes)) return 'ya-esta';
    return { error: `ya hay en ${BRANCH} un ${rel} con otro contenido` };
  }
  const folder = rel.split('/')[1];
  const readmePath = path.join(WT, 'Tests', 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const crlf = readme.includes('\r\n');
  const lines = readme.split('\n');
  const info = findPlan(lines, folder);
  if (!info) return { error: `la carpeta «${folder}» no tiene un plan en Tests/README.md (un plan nuevo se agrega a mano)` };
  let plan;
  try { plan = readPlan(path.join(WT, 'Tests', info.html)); }
  catch (e) { return { error: `no pude leer los casos de ${info.html}: ${e.message}` }; }
  const v = validate(rel, bytes, plan, info);
  if (v.errors.length) return { error: v.errors.join(' · ') };

  const href = `${folder}/${path.basename(rel)}`.replace(/ /g, '%20');
  lines.splice(info.last + 1, 0, `  - [Tanda ${v.n}](${href})${crlf ? '\r' : ''}`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, bytes);
  fs.writeFileSync(readmePath, lines.join('\n'));
  const msg = `Tests: tanda ${v.n} ${info.title.replace(/^Pruebas /, '')}`;
  git(['add', '--', rel, 'Tests/README.md'], WT);
  git(['commit', '-m', msg], WT);
  return { msg, count: v.count, total: v.total, warnings: v.warnings };
}

function pass(seen) {
  ensureWorktree();
  const out = git(['ls-files', '--others', '--exclude-standard', '-z', '--', 'Tests/*/*.resultados.json']);
  const files = out.split('\0').filter(Boolean).sort((a, b) => {
    const n = (f) => Number(/^(\d+)-/.exec(path.basename(f))?.[1] || 0);
    return a.split('/')[1] === b.split('/')[1] ? n(a) - n(b) : a.localeCompare(b);
  });
  for (const rel of files) {
    const mtime = fs.statSync(path.join(ROOT, rel)).mtimeMs;
    if (Date.now() - mtime < 2000) continue;            // todavía se está escribiendo
    const key = `${rel}@${mtime}`;
    if (seen.has(key)) continue;
    let r;
    try { r = ingestOne(rel); } catch (e) { r = { error: (e.stderr || e.message).toString().trim() }; }
    if (r === 'ya-esta') { seen.add(key); continue; }
    if (r.error) {
      seen.add(key);
      log(`✗ ${rel}: ${r.error}`);
      continue;
    }
    seen.add(key);
    log(`✓ ${r.msg}  (${r.count.ok}/${r.total} aprobados · ${r.count.fail} fallas · ${r.count.retest} re-testear · ${r.count.none} sin probar)`);
    r.warnings.forEach((w) => log(`  aviso: ${w}`));
  }
}

const seen = new Set();
if (process.argv.includes('--watch')) {
  try {
    const pid = Number(fs.readFileSync(PIDFILE, 'utf8'));
    if (pid && pid !== process.pid) { process.kill(pid, 0); console.log(`ya hay un watcher (pid ${pid})`); process.exit(0); }
  } catch { /* no hay watcher vivo */ }
  fs.writeFileSync(PIDFILE, String(process.pid));
  process.on('exit', () => { try { fs.unlinkSync(PIDFILE); } catch { /* ya no está */ } });
  log(`mirando Tests/*/ cada 1 min → rama ${BRANCH}`);
  const tick = () => { try { pass(seen); } catch (e) { log(`✗ ${(e.stderr || e.message).toString().trim()}`); } };
  tick();
  setInterval(tick, 60000);
} else {
  pass(seen);
}
