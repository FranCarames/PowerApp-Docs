// Audita Diagrams/README.md con el mismo parser que usa el visor (Diagrams/index.html):
// prueba el parser con un índice de ejemplo, y después revisa el índice real: que cada
// línea se entienda, que cada diagrama tenga su SVG y su PDF, que no se repitan los ids
// y que no quede ningún SVG de Diagrams/ sin indexar.
// Uso: node .claude/tools/audit-diagrams.js [raíz del repo]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
const DIR = path.join(ROOT, 'Diagrams');
const VIEWER = path.join(DIR, 'index.html');
const INDEX = path.join(DIR, 'README.md');
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

for (const f of [VIEWER, INDEX]) {
  if (!fs.existsSync(f)) { console.error(`Falta ${rel(f)}`); process.exit(1); }
}

// 1. El parser sale del visor: se prueba el mismo código que corre en el sitio.
const html = fs.readFileSync(VIEWER, 'utf8');
const m = /<script id="index-parser">([\s\S]*?)<\/script>/.exec(html);
if (!m) { console.error('Diagrams/index.html: falta <script id="index-parser">'); process.exit(1); }
const ctx = {};
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
const { slugify, parseIndex } = ctx;
if (typeof slugify !== 'function' || typeof parseIndex !== 'function') {
  console.error('Diagrams/index.html: el parser tiene que definir slugify y parseIndex');
  process.exit(1);
}

const probs = [];
const eq = (what, got, want) => {
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a !== b) probs.push(`parser: ${what}\n      esperado ${b}\n      obtenido ${a}`);
};

eq('slugify saca tildes y símbolos', slugify('Diseño de Clases (v2)'), 'diseno-de-clases-v2');
eq('índice de ejemplo', parseIndex([
  '# Diagramas',
  '',
  'Texto que se ignora, con un [link](algo.svg) en el medio.',
  '- [Antes de un grupo](suelto.svg) — se ignora',
  '',
  '## Datos',
  '',
  '- [Modelo de datos](../Doc/PowerApp%20-%20Modelo%20DB.svg) — Entidad-relación',
  '',
  '## Arquitectura',
  '- [Despliegue](Diagrama%20de%20despliegue.svg)',
  '- [No es SVG](algo.pdf) — se ignora',
  '### Un subtítulo no abre grupo',
  '- [Componentes](Componentes.SVG) – UML',
].join('\r\n')), [
  { group: 'Datos', title: 'Modelo de datos', id: 'modelo-de-datos', kind: 'Entidad-relación',
    svg: '../Doc/PowerApp%20-%20Modelo%20DB.svg', pdf: '../Doc/PowerApp%20-%20Modelo%20DB.pdf' },
  { group: 'Arquitectura', title: 'Despliegue', id: 'despliegue', kind: '',
    svg: 'Diagrama%20de%20despliegue.svg', pdf: 'Diagrama%20de%20despliegue.pdf' },
  { group: 'Arquitectura', title: 'Componentes', id: 'componentes', kind: 'UML',
    svg: 'Componentes.SVG', pdf: 'Componentes.pdf' },
]);

// 2. El índice real.
const lines = fs.readFileSync(INDEX, 'utf8').split(/\r?\n/);
lines.forEach((l, i) => {
  if (/^-\s+\[/.test(l) && parseIndex('## x\n' + l).length === 0) {
    probs.push(`README.md línea ${i + 1}: no se reconoce como diagrama (¿espacios sin %20 o no termina en .svg?) → ${l}`);
  }
});

const list = parseIndex(lines.join('\n'));
if (!list.length) probs.push('README.md: no hay diagramas en el índice');

const ids = new Set();
const indexed = new Set();
for (const d of list) {
  if (ids.has(d.id)) probs.push(`«${d.title}»: id repetido (${d.id})`);
  ids.add(d.id);
  if (d.svg.includes('\\')) probs.push(`«${d.title}»: barra invertida en el link → ${d.svg}`);
  for (const href of [d.svg, d.pdf]) {
    const file = path.resolve(DIR, decodeURIComponent(href));
    indexed.add(file.toLowerCase());
    if (!fs.existsSync(file)) probs.push(`«${d.title}»: falta ${rel(file)}`);
  }
}
for (const f of fs.readdirSync(DIR)) {
  if (f.toLowerCase().endsWith('.svg') && !indexed.has(path.join(DIR, f).toLowerCase())) {
    probs.push(`sin indexar: Diagrams/${f}`);
  }
}

if (probs.length) {
  console.log(`${probs.length} problema(s):`);
  probs.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
const groups = new Set(list.map((d) => d.group)).size;
console.log(`OK: ${list.length} diagramas en ${groups} grupos, todos con SVG y PDF.`);
