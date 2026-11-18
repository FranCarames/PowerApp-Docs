# Visor de diagramas en el sitio de Pages · Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Cómo se entrega.** Todo en este repo (`PowerApp-Docs`), en `main`. **Nunca `git commit` ni `git push`** (regla del `CLAUDE.md`): cada tarea termina **stageando** sus archivos y al final se sugiere el mensaje de commit. `Entrega Final/` no se toca ni se stagea.
>
> **Pruebas.** El repo no tiene framework de tests. Lo que se puede probar sin navegador (el parser del índice y que los archivos existan) lo cubre `.claude/tools/audit-diagrams.js`, que se escribe primero (tarea 1). El resto se verifica en el navegador sirviendo el repo por HTTP (tarea 7). **En esta máquina no hay Python**, así que para servirlo se usa un servidor estático de Node de una línea (tarea 7, paso 1). No se instala nada.
>
> **Los SVG de clases y componentes los exporta Fran desde Miro**, en paralelo. Mientras falten, la auditoría los marca como faltantes y el visor muestra el error con «Abrir el PDF»: es lo esperado.

**Spec:** [2026-11-17-visor-de-diagramas-design.md](../specs/2026-11-17-visor-de-diagramas-design.md).

**Goal:** que la portada lleve a un visor con una barra lateral que liste todos los diagramas del proyecto y muestre el elegido con zoom y arrastre, como hoy se ve el modelo de datos.

**Architecture:** un visor nuevo `Diagrams/index.html` que lee su lista de `Diagrams/README.md` (como `Use Cases/` y `Tests/`), con dos funciones puras de parseo en un `<script id="index-parser">` aparte, para que la auditoría de Node las pruebe sin duplicarlas. El motor de zoom y arrastre es el de `Doc/modelo-db.html`, sin cambios funcionales, y ese archivo pasa a ser una redirección a `Diagrams/#modelo-de-datos`.

**Tech Stack:** HTML, CSS y JavaScript sin dependencias ni build (mismo estilo ES5 de los otros visores). Node 22 para la auditoría y el servidor local.

---

## 1. Archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `.claude/tools/audit-diagrams.js` | Nuevo. Prueba el parser del visor y audita `Diagrams/README.md` contra los archivos | 1 |
| `Diagrams/README.md` | Nuevo. Índice de diagramas: grupos y una línea por diagrama | 2 |
| `Diagrams/Diagrama de despliegue.svg` / `.pdf` | Ya existen sin versionar: se stagean | 2 |
| `Diagrams/index.html` | Nuevo. Visor: barra lateral, barra superior, lienzo con zoom y arrastre, estados de carga y error | 3 |
| `Doc/modelo-db.html` | Pasa de visor a redirección | 4 |
| `index.html` | Card 04, pie y `meta description` | 5 |
| `README.md` · `CLAUDE.md` | Tabla de vistas, estructura y reglas de mantenimiento | 6 |

---

### Task 1: Auditoría del índice (primero, para que falle)

**Files:**
- Create: `.claude/tools/audit-diagrams.js`

- [ ] **Step 1: Escribir la auditoría**

Crear `.claude/tools/audit-diagrams.js` con exactamente esto:

```js
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
```

- [ ] **Step 2: Correrla y ver que falla**

Run: `node .claude/tools/audit-diagrams.js`
Expected: sale con código 1 e imprime `Falta Diagrams/index.html`.

- [ ] **Step 3: Stagear**

```bash
git add .claude/tools/audit-diagrams.js
```

---

### Task 2: Índice `Diagrams/README.md`

**Files:**
- Create: `Diagrams/README.md`
- Stage: `Diagrams/Diagrama de despliegue.svg`, `Diagrams/Diagrama de despliegue.pdf`

- [ ] **Step 1: Escribir el índice**

Crear `Diagrams/README.md` con exactamente esto:

```markdown
# Diagramas

Diagramas del proyecto, exportados desde Miro en SVG y PDF. Este índice alimenta el visor
([`index.html`](index.html), publicado en <https://francarames.github.io/PowerApp-Docs/Diagrams/>).

Para sumar un diagrama: dejar el `.svg` y el `.pdf` con el mismo nombre en esta carpeta y
agregar una línea `- [Título](archivo%20con%20espacios.svg) — tipo` bajo su grupo. El link
de cada diagrama en el visor sale del título (`Diagrama de despliegue` → `#diagrama-de-despliegue`).
Después, correr `node .claude/tools/audit-diagrams.js`.

El modelo de datos vive en `Doc/` porque es la fuente de verdad del modelo.

## Datos

- [Modelo de datos](../Doc/PowerApp%20-%20Modelo%20DB.svg) — Entidad-relación

## Diseño

- [Diagrama de clases](Diagrama%20de%20clases.svg) — UML · clases

## Arquitectura

- [Componentes del servidor](Diagramas%20de%20componentes%20del%20servidor.svg) — UML · componentes
- [Diagrama de despliegue](Diagrama%20de%20despliegue.svg) — UML · despliegue
```

- [ ] **Step 2: Correr la auditoría**

Run: `node .claude/tools/audit-diagrams.js`
Expected: sigue fallando con `Falta Diagrams/index.html` (el visor es la tarea 3).

- [ ] **Step 3: Stagear el índice y los archivos de despliegue**

```bash
git add Diagrams/README.md "Diagrams/Diagrama de despliegue.svg" "Diagrams/Diagrama de despliegue.pdf"
```

---

### Task 3: Visor `Diagrams/index.html`

**Files:**
- Create: `Diagrams/index.html`

- [ ] **Step 1: Escribir el visor**

Crear `Diagrams/index.html` con exactamente esto. El motor de zoom y arrastre es el de `Doc/modelo-db.html` (líneas 190-376) con dos cambios: el tamaño `W`/`H` sale del diagrama elegido y `fit()` no hace nada si no hay diagrama o el lienzo no tiene ancho.

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<title>PowerApp — Diagramas</title>
<meta name="description" content="Visor de los diagramas de PowerApp: modelo de datos, clases, componentes del servidor y despliegue, con zoom, arrastre y descarga en SVG o PDF.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700;800&family=Saira:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --base:#06070D; --card:#13161F; --card2:#0F1219; --el:#1B1F2E;
    --border:#232739; --border2:#2E3347;
    --pri:#E8450A; --priL:#FF6B3D; --acc:#8B5CF6; --teal:#12B3A6; --blue:#4F8DF7; --green:#3DD47A;
    --tp:#F5F1EB; --ts:#8892A8; --tm:#4A5068;
    --fDisplay:"Saira Condensed",-apple-system,sans-serif;
    --fBody:"Saira",-apple-system,BlinkMacSystemFont,sans-serif;
    --fMono:"JetBrains Mono","SF Mono",monospace;
    --side-w:290px;
  }
  *{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
  html,body{height:100%;overflow:hidden;}
  body{background:var(--base);font-family:var(--fBody);color:var(--tp);}
  [hidden]{display:none!important;}

  .app{
    height:100%;display:grid;grid-template-columns:var(--side-w) minmax(0,1fr);
    transition:grid-template-columns .28s cubic-bezier(.2,.7,.2,1);
  }
  .app.collapsed{grid-template-columns:0 minmax(0,1fr);}

  /* ---------- Barra lateral ---------- */
  .side{
    min-width:0;overflow:hidden auto;
    background:linear-gradient(180deg,rgba(19,22,31,.92),rgba(15,18,25,.92));
    border-right:1px solid var(--border);
  }
  .app.collapsed .side{visibility:hidden;transition:visibility 0s .28s;}
  .side::-webkit-scrollbar{width:8px;}
  .side::-webkit-scrollbar-thumb{background:var(--border2);border-radius:8px;}
  .side-in{width:var(--side-w);padding:20px 14px 28px;}

  .brand{display:flex;align-items:center;gap:11px;padding:4px 8px 16px;}
  .brand .mark{
    width:34px;height:34px;border-radius:10px;flex:0 0 auto;position:relative;
    background:linear-gradient(135deg,var(--pri),var(--priL));
    display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(232,69,10,.35);
  }
  .brand .mark svg{width:17px;height:17px;}
  .brand .mark::after{content:"";position:absolute;top:-3px;right:-3px;width:11px;height:11px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px var(--acc);}
  .brand .txt b{font-family:var(--fDisplay);font-size:19px;font-weight:800;letter-spacing:-.3px;display:block;line-height:1;}
  .brand .txt span{font-family:var(--fMono);font-size:10px;color:var(--ts);letter-spacing:.4px;}
  .home-link{display:inline-flex;align-items:center;gap:6px;font-family:var(--fMono);font-size:11px;color:var(--ts);padding:0 8px 18px;text-decoration:none;transition:color .2s;}
  .home-link:hover{color:var(--pri);}

  .grp-head{
    display:flex;align-items:center;gap:9px;padding:12px 10px 7px;
    font-family:var(--fMono);font-size:10.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--ts);
  }
  .grp-head .dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;}
  .grp-head .n{margin-left:auto;color:var(--tm);font-size:10px;background:var(--el);border-radius:20px;padding:2px 7px;}
  .dg{
    display:flex;align-items:center;gap:11px;padding:9px 10px;margin-bottom:2px;border-radius:10px;
    border-left:2px solid transparent;text-decoration:none;color:inherit;
    transition:background .15s,border-color .15s;
  }
  .dg:hover{background:rgba(255,255,255,.035);}
  .dg:focus-visible{outline:2px solid var(--gc);outline-offset:-2px;}
  .dg-ico{
    width:30px;height:30px;border-radius:9px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
    background:color-mix(in srgb,var(--gc) 12%,transparent);
    border:1px solid color-mix(in srgb,var(--gc) 30%,transparent);color:var(--gc);
  }
  .dg-ico svg{width:16px;height:16px;}
  .dg-txt{min-width:0;flex:1;}
  .dg .name{display:block;font-size:13.5px;color:var(--ts);line-height:1.25;}
  .dg .kind{display:block;font-family:var(--fMono);font-size:10px;color:var(--tm);margin-top:2px;}
  .dg.active{background:color-mix(in srgb,var(--gc) 12%,transparent);border-left-color:var(--gc);}
  .dg.active .name{color:var(--tp);font-weight:600;}

  /* ---------- Panel ---------- */
  .pane{min-width:0;min-height:0;display:flex;flex-direction:column;}
  .bar{
    flex:0 0 auto;min-height:60px;
    display:flex;align-items:center;gap:14px;flex-wrap:wrap;
    padding:10px clamp(12px,2.4vw,20px);
    background:linear-gradient(180deg,var(--card),rgba(19,22,31,.82));
    border-bottom:1px solid var(--border);
    z-index:5;
  }
  .titles{flex:1 1 200px;min-width:0;}
  .titles h1{font-family:var(--fDisplay);font-size:21px;font-weight:700;letter-spacing:-.2px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .titles h1 b{color:var(--pri);font-weight:700;}
  .titles .sub{font-family:var(--fMono);font-size:10.5px;color:var(--tm);letter-spacing:.3px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

  .tools{display:flex;align-items:center;gap:8px;flex:0 0 auto;flex-wrap:wrap;}
  .grp{display:flex;align-items:stretch;background:var(--el);border:1px solid var(--border);border-radius:11px;overflow:hidden;}
  .grp .btn{border:0;border-radius:0;background:transparent;}
  .btn{
    font-family:var(--fMono);font-size:12px;font-weight:500;color:var(--ts);
    background:var(--el);border:1px solid var(--border);border-radius:11px;
    padding:9px 13px;cursor:pointer;text-decoration:none;line-height:1;
    display:inline-flex;align-items:center;gap:7px;
    transition:color .18s,background .18s,border-color .18s;
  }
  .btn:hover{color:var(--tp);background:#232842;}
  .btn:focus-visible{outline:2px solid var(--blue);outline-offset:2px;}
  .btn.ico{min-width:38px;justify-content:center;font-size:15px;}
  .btn.ico svg{width:16px;height:16px;}
  .btn.pri{color:var(--tp);border-color:color-mix(in srgb, var(--blue) 42%, transparent);background:color-mix(in srgb, var(--blue) 12%, transparent);}
  .btn.pri:hover{background:color-mix(in srgb, var(--blue) 22%, transparent);}
  .btn:disabled,.btn[aria-disabled="true"],#zoomLabel:disabled{opacity:.35;cursor:default;pointer-events:none;}
  #zoomLabel{
    font-family:var(--fMono);font-size:11.5px;color:var(--tp);
    min-width:64px;text-align:center;padding:0 4px;cursor:pointer;
    background:transparent;border:0;border-left:1px solid var(--border);border-right:1px solid var(--border);
  }
  #zoomLabel:hover{color:var(--blue);}
  #zoomLabel:focus-visible{outline:2px solid var(--blue);outline-offset:-2px;}

  /* ---------- Lienzo ---------- */
  .stage{
    flex:1 1 auto;position:relative;overflow:hidden;
    background:
      radial-gradient(700px 420px at 12% 0%, rgba(232,69,10,.10), transparent 62%),
      radial-gradient(700px 460px at 92% 100%, rgba(79,141,247,.10), transparent 62%),
      var(--base);
    cursor:grab;touch-action:none;
  }
  .stage::after{
    content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
    background-image:
      linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
    background-size:44px 44px;
  }
  .stage.drag{cursor:grabbing;}
  .canvas{
    position:absolute;top:0;left:0;transform-origin:0 0;
    background:#fff;
    box-shadow:0 30px 90px -30px rgba(0,0,0,.9);
    will-change:transform;
  }
  .canvas svg{display:block;}

  /* ---------- Estados ---------- */
  .state{
    position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px;cursor:default;
  }
  .state p{font-family:var(--fMono);font-size:12.5px;color:var(--ts);max-width:52ch;line-height:1.7;}
  .state code{background:var(--el);border:1px solid var(--border);border-radius:6px;padding:2px 7px;color:var(--tp);}
  .err-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
  .spin{
    width:26px;height:26px;border-radius:50%;
    border:2px solid var(--border2);border-top-color:var(--pri);
    animation:spin .8s linear infinite;
  }
  @keyframes spin{to{transform:rotate(360deg);}}

  /* ---------- Ayuda ---------- */
  .hint{
    position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:3;
    font-family:var(--fMono);font-size:10.5px;color:var(--tm);
    background:rgba(6,7,13,.78);border:1px solid var(--border);border-radius:999px;
    padding:7px 15px;pointer-events:none;white-space:nowrap;
    transition:opacity .6s;
  }

  /* ---------- Mobile: la barra lateral es un panel ---------- */
  .scrim{display:none;}
  @media (max-width:860px){
    .app,.app.collapsed{grid-template-columns:minmax(0,1fr);}
    .side{
      position:fixed;left:0;top:0;bottom:0;z-index:40;width:min(var(--side-w),86vw);
      transform:translateX(-102%);transition:transform .28s cubic-bezier(.2,.7,.2,1);
    }
    .app.collapsed .side{visibility:visible;transition:transform .28s cubic-bezier(.2,.7,.2,1);}
    .side-in{width:100%;}
    body.nav-open .side{transform:none;}
    .scrim{
      display:block;position:fixed;inset:0;z-index:30;background:rgba(3,4,8,.6);
      opacity:0;visibility:hidden;transition:opacity .28s,visibility .28s;
    }
    body.nav-open .scrim{opacity:1;visibility:visible;}
  }
  @media (max-width:700px){
    .titles .sub{display:none;}
    .titles h1{font-size:18px;}
    .btn{padding:8px 11px;}
    .hint{display:none;}
  }
  @media (prefers-reduced-motion:reduce){
    .spin{animation:none;}
    .app,.side,.scrim{transition:none!important;}
  }
</style>
</head>
<body>
<div class="app" id="app">

  <aside class="side" id="side" aria-label="Lista de diagramas">
    <div class="side-in">
      <div class="brand">
        <span class="mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="#fff"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>
        </span>
        <span class="txt"><b>PowerApp</b><span>Diagramas</span></span>
      </div>
      <a class="home-link" href="../index.html">&larr; Volver a la portada</a>
      <nav id="nav" aria-label="Diagramas"></nav>
    </div>
  </aside>

  <div class="pane">
    <header class="bar">
      <button class="btn ico" id="toggleSide" aria-controls="side" aria-expanded="true"
              title="Mostrar u ocultar la lista" aria-label="Mostrar u ocultar la lista de diagramas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/>
        </svg>
      </button>
      <div class="titles">
        <h1 id="title">Power<b>App</b> — Diagramas</h1>
        <div class="sub" id="meta">Cargando el índice&hellip;</div>
      </div>
      <div class="tools">
        <div class="grp">
          <button class="btn ico" id="zOut" title="Alejar (tecla −)" aria-label="Alejar" disabled>&minus;</button>
          <button id="zoomLabel" title="Volver al 100% (tecla 1)" aria-label="Nivel de zoom, click para volver al 100%" disabled>100%</button>
          <button class="btn ico" id="zIn" title="Acercar (tecla +)" aria-label="Acercar" disabled>+</button>
        </div>
        <button class="btn" id="fit" title="Ajustar a la pantalla (tecla 0)" disabled>Ajustar</button>
        <a class="btn pri" id="lnkSvg" href="#" download aria-disabled="true" title="Descargar el diagrama en SVG">SVG&nbsp;&darr;</a>
        <a class="btn" id="lnkPdf" href="#" target="_blank" rel="noopener" aria-disabled="true" title="Abrir el diagrama en PDF">PDF</a>
      </div>
    </header>

    <div class="stage" id="stage">
      <div class="canvas" id="canvas" hidden></div>

      <div class="state" id="loading">
        <div class="spin" aria-hidden="true"></div>
        <p>Cargando&hellip;</p>
      </div>

      <div class="state" id="error" hidden>
        <p id="errMsg"></p>
        <p id="errHelp">Si estás abriendo el archivo desde el disco, el navegador bloquea la carga.
           Servido por <code>GitHub Pages</code> o cualquier servidor HTTP funciona.</p>
        <div class="err-actions" id="errActions">
          <a class="btn pri" id="errPdf" href="#" target="_blank" rel="noopener">Abrir el PDF</a>
          <a class="btn" id="errSvg" href="#" target="_blank" rel="noopener">Abrir el SVG directo</a>
        </div>
      </div>

      <div class="hint" id="hint">arrastrá para mover &middot; rueda para zoom &middot; doble clic para acercar</div>
    </div>
  </div>

</div>
<div class="scrim" id="scrim"></div>

<script id="index-parser">
/* Índice de diagramas (Diagrams/README.md). Funciones puras, sin DOM:
   también las usa .claude/tools/audit-diagrams.js. */
function slugify(s){
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function parseIndex(md){
  var out = [], group = null, fence = false;
  String(md).replace(/\r\n?/g, "\n").split("\n").forEach(function(line){
    if (/^\s*```/.test(line)){ fence = !fence; return; }
    if (fence) return;
    var g = /^##\s+(.+?)\s*$/.exec(line);
    if (g){ group = g[1]; return; }
    var d = /^-\s+\[([^\]]+)\]\(([^)\s]+\.svg)\)(?:\s+[—–-]\s+(.+?))?\s*$/i.exec(line);
    if (!d || !group) return;
    out.push({
      group: group,
      title: d[1],
      id: slugify(d[1]),
      kind: d[3] || "",
      svg: d[2],
      pdf: d[2].replace(/\.svg$/i, ".pdf")
    });
  });
  return out;
}
</script>

<script>
(function(){
  "use strict";

  var PAD = 48;               // margen al ajustar
  var MIN = 0.02, MAX = 12;   // límites de zoom
  var PALETTE = ["var(--blue)", "var(--acc)", "var(--teal)", "var(--pri)", "var(--green)"];
  var ICONS = {
    db:  '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>',
    cls: '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>',
    cmp: '<rect x="7" y="4" width="13" height="16" rx="2"/><rect x="4" y="8" width="6" height="3" rx=".8"/><rect x="4" y="13" width="6" height="3" rx=".8"/>',
    dep: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
    any: '<rect x="3" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="8.5" y="16" width="7" height="5" rx="1.2"/><path d="M6.5 8v3.5h11V8M12 11.5V16"/>'
  };

  function $(id){ return document.getElementById(id); }
  var app = $("app"), nav = $("nav"), stage = $("stage"), canvas = $("canvas");
  var loading = $("loading"), errBox = $("error"), errMsg = $("errMsg"), errHelp = $("errHelp"), errActions = $("errActions");
  var label = $("zoomLabel"), hint = $("hint"), titleEl = $("title"), meta = $("meta");
  var lnkSvg = $("lnkSvg"), lnkPdf = $("lnkPdf"), toggle = $("toggleSide");
  var btnIn = $("zIn"), btnOut = $("zOut"), btnFit = $("fit");
  var mobile = window.matchMedia("(max-width:860px)");

  var list = [], byId = {}, cache = {};   // cache: id -> { node, W, H }
  var current = null, token = 0;
  var k = 1, tx = 0, ty = 0;   // escala y traslación actuales
  var W = 0, H = 0;            // tamaño natural del diagrama elegido
  var wasFit = true;           // ¿el usuario sigue en "ajustado"?

  function esc(s){
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function iconFor(kind){
    var t = kind.toLowerCase();
    if (t.indexOf("entidad") !== -1)     return ICONS.db;
    if (t.indexOf("clases") !== -1)      return ICONS.cls;
    if (t.indexOf("componentes") !== -1) return ICONS.cmp;
    if (t.indexOf("despliegue") !== -1)  return ICONS.dep;
    return ICONS.any;
  }

  /* ---------- estados ---------- */
  function setTools(on){
    btnIn.disabled = btnOut.disabled = btnFit.disabled = label.disabled = !on;
    lnkSvg.setAttribute("aria-disabled", on ? "false" : "true");
  }
  function showLoading(){
    canvas.hidden = true; errBox.hidden = true; loading.hidden = false;
    setTools(false);
  }
  // d: el diagrama que falló (muestra los botones al PDF y al SVG); help: la nota de file://
  function showError(msg, d, help){
    canvas.hidden = true; loading.hidden = true; errBox.hidden = false;
    setTools(false);
    errMsg.textContent = msg;
    errHelp.hidden = !help;
    errActions.hidden = !d;
    if (d){ $("errPdf").href = d.pdf; $("errSvg").href = d.svg; }
    hint.style.opacity = 0;
  }

  /* ---------- barra lateral ---------- */
  function buildNav(){
    var groups = [], html = "";
    list.forEach(function(d){ if (groups.indexOf(d.group) === -1) groups.push(d.group); });
    groups.forEach(function(g, i){
      var color = PALETTE[i % PALETTE.length];
      var items = list.filter(function(d){ return d.group === g; });
      html += '<div class="grp-head"><span class="dot" style="background:' + color + '"></span>'
            + esc(g) + '<span class="n">' + items.length + '</span></div>';
      items.forEach(function(d){
        html += '<a class="dg" href="#' + d.id + '" data-id="' + d.id + '" style="--gc:' + color + '">'
              +   '<span class="dg-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + iconFor(d.kind) + '</svg></span>'
              +   '<span class="dg-txt"><span class="name">' + esc(d.title) + '</span>'
              +   (d.kind ? '<span class="kind">' + esc(d.kind) + '</span>' : '')
              +   '</span></a>';
      });
    });
    nav.innerHTML = html;
  }

  function syncToggle(){
    var open = mobile.matches ? document.body.classList.contains("nav-open") : !app.classList.contains("collapsed");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function closeDrawer(){
    document.body.classList.remove("nav-open");
    syncToggle();
  }
  toggle.addEventListener("click", function(){
    if (mobile.matches) document.body.classList.toggle("nav-open");
    else app.classList.toggle("collapsed");
    syncToggle();
  });
  $("scrim").addEventListener("click", closeDrawer);
  nav.addEventListener("click", function(e){ if (e.target.closest(".dg")) closeDrawer(); });
  if (mobile.addEventListener) mobile.addEventListener("change", syncToggle);
  syncToggle();

  /* ---------- elegir un diagrama ---------- */
  function route(){
    if (!list.length) return;
    var d = byId[decodeURIComponent(location.hash.replace(/^#/, ""))] || list[0];
    if (d !== current) select(d);
  }

  function select(d){
    current = d;
    var my = ++token;
    nav.querySelectorAll(".dg").forEach(function(a){
      var on = a.getAttribute("data-id") === d.id;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = "PowerApp — " + d.title;
    titleEl.innerHTML = "Power<b>App</b> — " + esc(d.title);
    meta.textContent = d.kind || "Diagrama";
    lnkSvg.href = d.svg;
    lnkPdf.href = d.pdf;
    lnkPdf.setAttribute("aria-disabled", "false");

    if (cache[d.id]) { show(d, cache[d.id]); return; }
    showLoading();
    fetch(d.svg)
      .then(function(res){
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function(txt){
        var doc = new DOMParser().parseFromString(txt, "image/svg+xml");
        var svg = doc.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== "svg") throw new Error("el archivo no es un SVG válido");
        var w = parseFloat(svg.getAttribute("width"))  || 1000;
        var h = parseFloat(svg.getAttribute("height")) || 1000;
        svg.removeAttribute("style");
        svg.setAttribute("width",  w);
        svg.setAttribute("height", h);
        cache[d.id] = { node: document.importNode(svg, true), W: w, H: h };
        if (my === token) show(d, cache[d.id]);
      })
      .catch(function(err){
        if (my === token) showError("No se pudo cargar el diagrama (" + err.message + ").", d, false);
      });
  }

  function show(d, c){
    W = c.W; H = c.H;
    canvas.replaceChildren(c.node);
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    loading.hidden = true; errBox.hidden = true; canvas.hidden = false;
    setTools(true);
    meta.textContent = (d.kind ? d.kind + " · " : "") + Math.round(W) + " × " + Math.round(H) + " px";
    fit();
  }

  /* ---------- carga del índice ---------- */
  fetch("README.md")
    .then(function(res){
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function(md){
      list = parseIndex(md);
      if (!list.length){
        meta.textContent = "Sin diagramas";
        showError("No hay diagramas en el índice (Diagrams/README.md).", null, false);
        return;
      }
      list.forEach(function(d){ byId[d.id] = d; });
      buildNav();
      window.addEventListener("hashchange", route);
      route();
      setTimeout(function(){ hint.style.opacity = 0; }, 6000);
    })
    .catch(function(err){
      meta.textContent = "Sin índice";
      showError("No se pudo cargar el índice de diagramas (" + err.message + ").", null, true);
    });

  /* ---------- zoom (igual que el visor del modelo) ---------- */
  function clamp(v){ return Math.min(MAX, Math.max(MIN, v)); }

  function apply(){
    canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + k + ")";
    label.textContent = Math.round(k * 100) + "%";
  }

  function fit(){
    var r = stage.getBoundingClientRect();
    if (!W || !H || !r.width || !r.height) return;
    k  = clamp(Math.min((r.width - PAD) / W, (r.height - PAD) / H));
    tx = (r.width  - W * k) / 2;
    ty = (r.height - H * k) / 2;
    wasFit = true;
    apply();
  }

  // zoom dejando fijo el punto (cx,cy), en coordenadas del stage
  function zoomAt(cx, cy, factor){
    var nk = clamp(k * factor);
    if (nk === k) return;
    tx = cx - (cx - tx) * (nk / k);
    ty = cy - (cy - ty) * (nk / k);
    k  = nk;
    wasFit = false;
    apply();
  }

  function zoomCenter(factor){
    var r = stage.getBoundingClientRect();
    zoomAt(r.width / 2, r.height / 2, factor);
  }

  function local(e){
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* ---------- arrastre y pinch ---------- */
  var pointers = new Map(), panFrom = null, pinch = null;

  function pinchState(){
    var a = Array.from(pointers.values());
    var r = stage.getBoundingClientRect();
    return {
      dist: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y),
      cx: (a[0].x + a[1].x) / 2 - r.left,
      cy: (a[0].y + a[1].y) / 2 - r.top
    };
  }

  stage.addEventListener("pointerdown", function(e){
    if (canvas.hidden) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.setPointerCapture(e.pointerId);
    if (pointers.size === 1){
      var p = local(e);
      panFrom = { x: p.x - tx, y: p.y - ty };
      stage.classList.add("drag");
    } else if (pointers.size === 2){
      panFrom = null;
      pinch = pinchState();
    }
  });

  stage.addEventListener("pointermove", function(e){
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinch){
      var now = pinchState();
      if (now.dist > 0 && pinch.dist > 0){
        zoomAt(pinch.cx, pinch.cy, now.dist / pinch.dist);
        tx += now.cx - pinch.cx;
        ty += now.cy - pinch.cy;
        apply();
      }
      pinch = now;
      return;
    }

    if (panFrom){
      var p = local(e);
      tx = p.x - panFrom.x;
      ty = p.y - panFrom.y;
      wasFit = false;
      apply();
    }
  });

  function endPointer(e){
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0){
      panFrom = null;
      stage.classList.remove("drag");
    } else if (pointers.size === 1){
      var only = pointers.values().next().value;
      var r = stage.getBoundingClientRect();
      panFrom = { x: (only.x - r.left) - tx, y: (only.y - r.top) - ty };
    }
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  /* ---------- rueda ---------- */
  stage.addEventListener("wheel", function(e){
    if (canvas.hidden) return;
    e.preventDefault();
    var p = local(e);
    var step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(p.x, p.y, Math.exp(-step * 0.0016));
  }, { passive: false });

  /* ---------- doble clic ---------- */
  stage.addEventListener("dblclick", function(e){
    if (canvas.hidden) return;
    var p = local(e);
    zoomAt(p.x, p.y, 1.8);
  });

  /* ---------- botones y teclado ---------- */
  function toActualSize(){
    var r = stage.getBoundingClientRect();
    zoomAt(r.width / 2, r.height / 2, 1 / k);
  }

  btnIn.addEventListener("click",  function(){ zoomCenter(1.25); });
  btnOut.addEventListener("click", function(){ zoomCenter(1 / 1.25); });
  btnFit.addEventListener("click", fit);
  label.addEventListener("click",  toActualSize);

  document.addEventListener("keydown", function(e){
    if (canvas.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "+" || e.key === "=")      { zoomCenter(1.25);     e.preventDefault(); }
    else if (e.key === "-" || e.key === "_") { zoomCenter(1 / 1.25); e.preventDefault(); }
    else if (e.key === "0")                  { fit();                e.preventDefault(); }
    else if (e.key === "1")                  { toActualSize();       e.preventDefault(); }
  });

  /* ---------- resize (y ocultar la lista): si estaba ajustado, se re-ajusta ---------- */
  if (window.ResizeObserver){
    new ResizeObserver(function(){
      if (!canvas.hidden && wasFit) fit();
    }).observe(stage);
  } else {
    window.addEventListener("resize", function(){
      if (!canvas.hidden && wasFit) fit();
    });
  }
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Correr la auditoría**

Run: `node .claude/tools/audit-diagrams.js`
Expected: el parser pasa (no aparece ninguna línea `parser: …`). Si Fran todavía no exportó los dos SVG, sale con código 1 y **solo** estos dos problemas:

```
2 problema(s):
  - «Diagrama de clases»: falta Diagrams/Diagrama de clases.svg
  - «Componentes del servidor»: falta Diagrams/Diagramas de componentes del servidor.svg
```

Con los dos SVG ya exportados: `OK: 4 diagramas en 3 grupos, todos con SVG y PDF.` Cualquier otro problema se corrige antes de seguir.

- [ ] **Step 3: Stagear**

```bash
git add Diagrams/index.html
```

---

### Task 4: `Doc/modelo-db.html` pasa a redirección

**Files:**
- Modify: `Doc/modelo-db.html` (se reemplaza todo el contenido)

- [ ] **Step 1: Reemplazar el visor por la redirección**

Reemplazar todo el contenido de `Doc/modelo-db.html` por exactamente esto:

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PowerApp — Modelo de datos</title>
<!-- El visor del modelo ahora es parte del visor de diagramas. Esta página queda para los links viejos. -->
<meta http-equiv="refresh" content="0; url=../Diagrams/#modelo-de-datos">
<script>location.replace("../Diagrams/#modelo-de-datos");</script>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
       background:#06070D;color:#8892A8;font:13px/1.7 "JetBrains Mono","SF Mono",monospace;text-align:center;}
  a{color:#E8450A;}
</style>
</head>
<body>
<p>El modelo de datos ahora está en el <a href="../Diagrams/#modelo-de-datos">visor de diagramas</a>.</p>
</body>
</html>
```

- [ ] **Step 2: Stagear**

```bash
git add Doc/modelo-db.html
```

---

### Task 5: Portada

**Files:**
- Modify: `index.html:7` (`meta description`), `index.html:378-404` (card 04), `index.html:434` (pie)

- [ ] **Step 1: `meta description`**

En `index.html`, reemplazar:

```html
<meta name="description" content="Portada de documentación de PowerApp (backend y web): documentación de la API en Swagger, prototipo de interfaces, estado de implementación de los casos de uso, modelo de datos de la base y planes de prueba.">
```

por:

```html
<meta name="description" content="Portada de documentación de PowerApp (backend y web): documentación de la API en Swagger, prototipo de interfaces, estado de implementación de los casos de uso, diagramas del proyecto (modelo de datos y UML) y planes de prueba.">
```

- [ ] **Step 2: Card 04**

Reemplazar el bloque completo de la card del modelo (desde `<div class="card card--multi">` con `<span class="card-idx">04 / 05</span>` hasta su `</div>` de cierre, después del botón `PDF`):

```html
    <div class="card card--multi">
      <div class="card-top">
        <span class="card-idx">04 / 05</span>
        <span class="card-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="8" ry="3"/>
            <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/>
            <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>
          </svg>
        </span>
      </div>
      <div class="eyebrow">Base de datos</div>
      <h2>Modelo de datos</h2>
      <p>Diagrama entidad-relación vigente: tablas, columnas, claves y relaciones. Es la fuente de verdad del modelo del backend.</p>
      <div class="tags">
        <span class="tag">entidad-relación</span><span class="tag">zoom y arrastre</span>
        <span class="tag">vigente</span>
      </div>
      <div class="card-actions">
        <a class="card-btn" href="Doc/modelo-db.html">
          Abrir el visor <span class="arw">→</span>
        </a>
        <a class="card-btn sec" href="Doc/PowerApp%20-%20Modelo%20DB.pdf" target="_blank" rel="noopener">
          PDF <span class="arw">↓</span>
        </a>
      </div>
    </div>
```

por:

```html
    <a class="card" href="Diagrams/">
      <div class="card-top">
        <span class="card-idx">04 / 05</span>
        <span class="card-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/>
            <rect x="8.5" y="16" width="7" height="5" rx="1.2"/><path d="M6.5 8v3.5h11V8M12 11.5V16"/>
          </svg>
        </span>
      </div>
      <div class="eyebrow">Arquitectura y diseño</div>
      <h2>Diagramas del proyecto</h2>
      <p>Todos los diagramas de PowerApp en un solo visor: modelo de datos, clases, componentes del servidor y despliegue. Se eligen desde una barra lateral y se ven con zoom y arrastre.</p>
      <div class="tags">
        <span class="tag">modelo de datos</span><span class="tag">UML</span>
        <span class="tag">zoom y arrastre</span>
      </div>
      <div class="card-go">Abrir los diagramas <span class="arw">→</span></div>
    </a>
```

- [ ] **Step 3: Pie**

Reemplazar:

```html
    <a href="Doc/modelo-db.html">Modelo de datos</a>
```

por:

```html
    <a href="Diagrams/">Diagramas</a>
```

- [ ] **Step 4: Comprobar que no quedan links al visor viejo**

Run: `grep -n "modelo-db.html\|Modelo%20DB.pdf" index.html`
Expected: sin salida.

- [ ] **Step 5: Stagear**

```bash
git add index.html
```

---

### Task 6: `README.md` y `CLAUDE.md`

**Files:**
- Modify: `README.md:19` (tabla de vistas), bloque «Estructura»
- Modify: `CLAUDE.md` (estructura y «Mantenimiento del sitio»)

- [ ] **Step 1: `README.md`, tabla de vistas**

Reemplazar la fila:

```markdown
| 🗃️ **[Modelo de datos](https://francarames.github.io/PowerApp-Docs/Doc/modelo-db.html)** | Visor del diagrama entidad-relación de la base, con zoom y arrastre ([PDF](https://francarames.github.io/PowerApp-Docs/Doc/PowerApp%20-%20Modelo%20DB.pdf)) |
```

por:

```markdown
| 🗺️ **[Diagramas](https://francarames.github.io/PowerApp-Docs/Diagrams/)** | Visor de los diagramas del proyecto (modelo de datos, clases, componentes y despliegue), con zoom y arrastre. El índice está en [`Diagrams/README.md`](Diagrams/README.md) |
```

- [ ] **Step 2: `README.md`, estructura**

Reemplazar:

```
Doc/         → Documentación vigente: modelo de datos (SVG/PDF + visor), specs y planes de cada cambio, contexto para la app iOS.
```

por:

```
Doc/         → Documentación vigente: modelo de datos (SVG/PDF), specs y planes de cada cambio, contexto para la app iOS.
Diagrams/    → Diagramas del proyecto (SVG + PDF exportados de Miro) + índice (README.md) y visor.
```

- [ ] **Step 3: `CLAUDE.md`, estructura**

Reemplazar:

```
Doc/         → Documentación vigente (fuente de verdad del modelo de datos), specs/ y plans/ de cada cambio, app-ios/, um/.
```

por:

```
Doc/         → Documentación vigente (fuente de verdad del modelo de datos), specs/ y plans/ de cada cambio, app-ios/, um/.
Diagrams/    → Diagramas del proyecto (SVG + PDF exportados de Miro) + README.md (índice) + index.html (visor).
```

- [ ] **Step 4: `CLAUDE.md`, nombres con espacios**

Reemplazar:

```markdown
- **Nombres con espacios** (`Doc/PowerApp - Modelo DB.*`, `UI Front/`, `Use Cases/`): en todo link hay que URL-encodear (`%20`).
```

por:

```markdown
- **Nombres con espacios** (`Doc/PowerApp - Modelo DB.*`, los archivos de `Diagrams/`, `UI Front/`, `Use Cases/`): en todo link hay que URL-encodear (`%20`).
```

- [ ] **Step 5: `CLAUDE.md`, regla del modelo**

Reemplazar:

```markdown
- **Cambia el nombre del archivo del modelo en `Doc/`:** tocar a mano la constante `SRC` de `Doc/modelo-db.html` y los links al PDF (no hay glob).
```

por:

```markdown
- **Diagrama nuevo o renombrado:** dejar el `.svg` y el `.pdf` con el mismo nombre en `Diagrams/` (el modelo de datos sigue en `Doc/`) y agregar o corregir su línea en `Diagrams/README.md` (formato `- [Título](archivo%20con%20espacios.svg) — tipo` bajo un `## Grupo`). El visor `Diagrams/index.html` se auto-sincroniza desde ese índice y el link de cada diagrama (`#…`) sale de su título. Después, correr `node .claude/tools/audit-diagrams.js`: avisa si falta un SVG o un PDF, si una línea no se entiende o si quedó un SVG sin indexar. Si cambia el nombre del archivo del modelo en `Doc/`, se corrige su línea en ese índice. El título «Modelo de datos» no se cambia: `Doc/modelo-db.html` redirige a `Diagrams/#modelo-de-datos`.
```

- [ ] **Step 6: `CLAUDE.md`, visores**

Reemplazar:

```markdown
- Los visores (`Use Cases/index.html`, `Doc/modelo-db.html`, `Tests/index.html`, `Tests/errores.html`) usan `fetch`: **no andan por `file://`**, hay que servirlos por HTTP (`python -m http.server`).
- `Doc/modelo-db.html` inyecta el SVG inline (no `<img>`) para que carguen las `@font-face` que el SVG trae adentro.
```

por:

```markdown
- Los visores (`Use Cases/index.html`, `Diagrams/index.html`, `Tests/index.html`, `Tests/errores.html`) usan `fetch`: **no andan por `file://`**, hay que servirlos por HTTP (`python -m http.server`).
- `Diagrams/index.html` inyecta el SVG inline (no `<img>`) para que carguen las `@font-face` que el SVG trae adentro. `Doc/modelo-db.html` es sólo una redirección a `Diagrams/#modelo-de-datos`, para los links viejos (por ejemplo, el README del backend).
```

- [ ] **Step 7: Comprobar que no quedan referencias vigentes al visor viejo**

Run: `grep -n "modelo-db.html" README.md CLAUDE.md index.html`
Expected: solo la línea nueva de `CLAUDE.md` que dice que `Doc/modelo-db.html` es una redirección (y la de la regla del modelo).

- [ ] **Step 8: Stagear**

```bash
git add README.md CLAUDE.md
```

---

### Task 7: Verificación en el navegador

**Files:** ninguno (si algo falla, se corrige en el archivo de la tarea correspondiente y se vuelve a stagear).

- [ ] **Step 1: Servir el repo por HTTP**

Desde la raíz del repo, en segundo plano:

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path'),r=process.cwd(),t={'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.md':'text/markdown; charset=utf-8','.pdf':'application/pdf','.json':'application/json','.js':'text/javascript','.css':'text/css'};h.createServer((q,s)=>{let u=decodeURIComponent(q.url.split(/[?#]/)[0]);if(u.endsWith('/'))u+='index.html';const x=p.join(r,u);if(x.startsWith(r)===false)return s.writeHead(403).end();f.readFile(x,(e,b)=>{if(e)return s.writeHead(404).end('404');s.writeHead(200,{'Content-Type':t[p.extname(x)]||'application/octet-stream'}).end(b)})}).listen(8000,'127.0.0.1',()=>console.log('http://localhost:8000/'))"
```

Expected: imprime `http://localhost:8000/`.

- [ ] **Step 2: Portada**

Abrir `http://localhost:8000/`. La card 04 dice «Diagramas del proyecto» con el ícono de tres cajas, y la tarjeta entera es un link a `Diagrams/`. El pie dice «Diagramas» y también lleva a `Diagrams/`.

- [ ] **Step 3: Barra lateral y cada diagrama**

En `http://localhost:8000/Diagrams/`:

- Se ven tres grupos en este orden: Datos (1), Diseño (1) y Arquitectura (2). Cada grupo tiene un color distinto y cada diagrama, su ícono.
- Sin hash, queda elegido «Modelo de datos». Se ve ajustado a la pantalla y el subtítulo dice `Entidad-relación · 4411 × 1951 px`.
- Se elige «Diagrama de despliegue». La URL pasa a `#diagrama-de-despliegue`, se ve el diagrama y el subtítulo dice `UML · despliegue · 1449 × 876 px`.
- En los dos diagramas andan la rueda, el arrastre, el doble clic y las teclas `+`, `−`, `0` y `1`, y el clic en el % lleva al 100 %.
- «SVG ↓» descarga el archivo correcto. «PDF» abre el PDF correcto en otra pestaña: para el modelo es `Doc/PowerApp - Modelo DB.pdf`.

- [ ] **Step 4: Error de un SVG que falta**

Si los SVG de clases o componentes todavía no están, se elige uno de esos dos. Si ya están los dos, se agrega temporalmente esta línea bajo `## Diseño` en `Diagrams/README.md`, se recarga y se elige «Prueba»:

```markdown
- [Prueba](no-existe.svg) — prueba
```

Expected: el error dice «No se pudo cargar el diagrama (HTTP 404).», con los botones «Abrir el PDF» y «Abrir el SVG directo». No aparece la nota de `file://`, los botones de zoom y «SVG ↓» quedan deshabilitados y la barra lateral sigue usable: al elegir otro diagrama, se vuelve a ver. Si se agregó la línea de prueba, **se borra** y se corre `node .claude/tools/audit-diagrams.js` para confirmar que no quedó (no tiene que aparecer «Prueba»).

- [ ] **Step 5: Links directos, historial y redirección**

- Abrir `http://localhost:8000/Diagrams/#diagrama-de-despliegue` en una pestaña nueva: abre directo ese diagrama.
- Elegir otro diagrama y volver con «atrás» del navegador: vuelve al diagrama anterior, y «adelante» lo deshace.
- Abrir `http://localhost:8000/Doc/modelo-db.html`: termina en `http://localhost:8000/Diagrams/#modelo-de-datos`, mostrando el modelo.

- [ ] **Step 6: Ocultar la lista y mobile**

- Con un diagrama ajustado, el botón de la izquierda de la barra superior oculta la barra lateral. El diagrama se re-ajusta al ancho nuevo y, al volver a tocarlo, la lista vuelve.
- En 375 × 812 (preset mobile) la barra lateral no se ve y el diagrama ocupa todo el ancho. El mismo botón abre la lista como panel con fondo oscurecido; elegir un diagrama la cierra y lo muestra, y tocar el fondo también la cierra.
- Volver a la vista de escritorio al terminar.

- [ ] **Step 7: Consola**

Expected: no hay errores en la consola durante los pasos 2 a 6, salvo el 404 esperado del paso 4.

- [ ] **Step 8: Apagar el servidor**

Detener el proceso de Node del paso 1.

---

### Task 8: Cierre

- [ ] **Step 1: Auditoría final**

Run: `node .claude/tools/audit-diagrams.js`
Expected: `OK: 4 diagramas en 3 grupos, todos con SVG y PDF.`, o solo los SVG que Fran todavía no exportó (tarea 3, paso 2).

- [ ] **Step 2: Si Fran ya exportó los SVG, stagearlos**

```bash
git add "Diagrams/Diagrama de clases.svg" "Diagrams/Diagramas de componentes del servidor.svg"
```

Si cambió alguno de los PDF al volver a exportar, se stagean también.

- [ ] **Step 3: Revisar lo stageado**

Run: `git status --short`
Expected: stageados (`A` o `M`) estos archivos y ningún otro de este cambio:
- `.claude/tools/audit-diagrams.js`
- `CLAUDE.md`
- `Diagrams/README.md`, `Diagrams/index.html` y `Diagrams/Diagrama de despliegue.svg` / `.pdf`
- los SVG nuevos, si ya estaban
- `Doc/modelo-db.html`
- `Doc/plans/2026-11-17-visor-de-diagramas-plan.md` y `Doc/specs/2026-11-17-visor-de-diagramas-design.md`
- `README.md` e `index.html`

`Entrega Final/` sigue como `??`.

- [ ] **Step 4: Sugerir el mensaje de commit**

```
Visor de diagramas: Diagrams/ con barra lateral (índice en Diagrams/README.md), card de la portada y redirección del visor del modelo
```

---

## 2. Qué queda para Fran

- Exportar desde Miro `Diagrams/Diagrama de clases.svg` y `Diagrams/Diagramas de componentes del servidor.svg`, con el mismo nombre que sus PDF, y correr `node .claude/tools/audit-diagrams.js`.
- Revisar y commitear lo stageado.
- Opcional, en el repo del backend: la fila «Modelo de datos» del `README.md` puede apuntar a `Diagrams/`. Igual sigue funcionando por la redirección.
