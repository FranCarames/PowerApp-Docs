// Audita Tests/README.md: rótulos, rutas y existencia de cada tanda, y JSON sin indexar.
const fs = require('fs');
const path = require('path');
const TESTS = path.join(process.argv[2] || path.resolve(__dirname, '../..'), 'Tests');
const lines = fs.readFileSync(path.join(TESTS, 'README.md'), 'utf8').split(/\r?\n/);

let fence = false;
let plan = null;
const probs = [];
const runsByPlan = {};
const listed = new Set();

lines.forEach((l, i) => {
  if (/^\s*```/.test(l)) { fence = !fence; return; }
  if (fence) return;
  const p = /^-\s+\[([^\]]+)\]\(([^)]+)\)/.exec(l);
  if (p) { plan = p[1]; runsByPlan[plan] = []; return; }
  const r = /^\s+-\s+\[([^\]]+)\]\(([^)]+)\)/.exec(l);
  if (!r || !plan) return;
  const [, label, href] = r;
  const n = runsByPlan[plan].length + 1;
  runsByPlan[plan].push(href);
  const norm = decodeURIComponent(href.replace(/\\/g, '/'));
  listed.add(norm);
  const file = norm.split('/').pop();
  const m = /^(\d{1,3})-/.exec(file);
  const ln = /^Tanda (\d+)/.exec(label);
  if (href.includes('\\')) probs.push(`línea ${i + 1}: «${plan}»: barra invertida en el link → ${href}`);
  if (!fs.existsSync(path.join(TESTS, norm))) probs.push(`línea ${i + 1}: «${plan}»: el archivo no existe → ${href}`);
  if (ln && Number(ln[1]) !== n) probs.push(`línea ${i + 1}: «${plan}»: el rótulo dice «${label}» y es la tanda en posición ${n}`);
  if (m && ln && Number(m[1]) !== Number(ln[1])) probs.push(`línea ${i + 1}: «${plan}»: rótulo «${label}» pero el archivo es ${file}`);
});

for (const d of fs.readdirSync(TESTS, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(TESTS, d.name))) {
    if (f.endsWith('.resultados.json') && !listed.has(`${d.name}/${f}`)) probs.push(`sin indexar: ${d.name}/${f}`);
  }
}

console.log(probs.length ? probs.join('\n') : 'índice consistente');
console.log(`\nplanes: ${Object.keys(runsByPlan).length} · tandas: ${Object.values(runsByPlan).reduce((a, b) => a + b.length, 0)}`);
