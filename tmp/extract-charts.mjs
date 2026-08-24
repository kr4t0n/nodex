/**
 * ONE-SHOT EXTRACTOR — throwaway.
 *
 * Turns tmp/source-charts.html (a single-file demo holding 7 self-contained HTML
 * documents and 64 charts) into 64 self-contained component fragments under
 * registry/languages/mono-editorial/expressive/.
 *
 * This script is committed once for provenance and then deleted. It is one-time
 * per source but NOT one-run: expect to fix and re-run it rather than
 * hand-patching 64 folders.
 *
 * What it does, and why each step exists:
 *
 *  - Splits each page's <style> into page chrome (dropped), component rules
 *    (scoped under a per-component root class), and motion (kept). The source
 *    declares bare `*`, `body`, `h2` and `svg`, which are harmless in an iframe
 *    but would trash a consumer's project.
 *  - Rewrites `id="fan"` to `data-nx-mount="fan"` so two copies of a component
 *    on one page cannot collide, and so nothing depends on document-level IDs.
 *  - Wraps each chart's code in `mount(root)` and swaps the reveal helpers for
 *    root-scoped versions. The chart logic itself is left untouched.
 *  - Tree-shakes the shared helper preamble per component so an SVG chart does
 *    not carry ECharts plumbing it never calls.
 *
 * Usage:  node tmp/extract-charts.mjs [--dry]
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'tmp', 'source-charts.html');
const OUT_DIR = path.join(
  ROOT,
  'registry',
  'languages',
  'mono-editorial',
  'expressive',
);
const DRY = process.argv.includes('--dry');

/** Keep in sync with tokens.json stroke.lineMax. */
const LINE_MAX = 1.4;

/* ------------------------------------------------------------------ tables */

/**
 * Slug collisions, resolved with a qualifier naming what actually differs
 * rather than a counter. Keyed by `page:index` (index is 1-based card order).
 */
const SLUG_OVERRIDES = {
  'maps:1': 'choropleth-states',
  'maps:2': 'choropleth-world',
  'circular:1': 'circular-graph-dense',
  'force:1': 'force-graph-dense',
};

/**
 * slug -> [component type from the taxonomy enum, density]
 *
 * Density describes how a component is READ, not how it is drawn — which is why
 * the `basics` group splits rather than inheriting one value. A tick donut is a
 * glance read however fine its strokes; a nested treemap rewards study.
 */
const TYPES = {
  // lupi — close-read by the source's own labelling
  'launch-fan': ['radial-plot', 'close-read'],
  'dot-cascade': ['dot-plot', 'close-read'],
  'barcode-lollipop': ['lollipop', 'close-read'],
  'arc-matrix': ['bubble', 'close-read'],
  'radial-convergence': ['network', 'close-read'],
  'cluster-field': ['network', 'close-read'],
  'brand-spectrum': ['dot-plot', 'close-read'],
  'dotty-matrix': ['dot-matrix', 'close-read'],
  'bubble-almanac': ['bubble', 'close-read'],
  'radial-patchwork': ['polar-area', 'close-read'],
  'trend-lineage': ['bump', 'close-read'],
  'type-colonnade': ['bar', 'close-read'],
  'hourglass-stream': ['funnel', 'close-read'],
  'hundred-field': ['unit-chart', 'close-read'],
  'ballot-tally': ['unit-chart', 'close-read'],
  'matrix-heat': ['heatmap', 'close-read'],
  'calendar-heat': ['calendar-heatmap', 'close-read'],
  beeswarm: ['beeswarm', 'close-read'],
  ridgeline: ['ridgeline', 'close-read'],
  'parallel-coords': ['parallel-coordinates', 'close-read'],

  // basics — conventional types in Lupi grammar; density judged per component
  'rung-bars': ['bar', 'glance'],
  'hairline-line': ['line', 'glance'],
  'hairline-area': ['area', 'glance'],
  'tick-donut': ['donut', 'glance'],
  'tick-rows': ['bar', 'glance'],
  'paired-rungs': ['grouped-bar', 'glance'],
  'stacked-rungs': ['stacked-bar', 'glance'],
  'plumb-scatter': ['scatter', 'glance'],
  'rung-waterfall': ['waterfall', 'glance'],
  'dot-heat': ['heatmap', 'close-read'],
  'tick-gauge': ['gauge', 'glance'],
  'dumbbell-queue': ['dumbbell', 'glance'],
  'nested-treemap': ['treemap', 'close-read'],
  'rung-histogram': ['histogram', 'glance'],
  'tick-box': ['boxplot', 'close-read'],
  'stream-ribbon': ['streamgraph', 'close-read'],
  candlestick: ['candlestick', 'close-read'],

  // glance — quick-read by the source's own labelling
  'range-capsules': ['range-bar', 'glance'],
  'petal-rose': ['polar-area', 'glance'],
  'chunky-bars': ['bar', 'glance'],
  'donut-redesigned': ['donut', 'glance'],
  'pictorial-bar': ['pictorial-bar', 'glance'],
  'circular-graph': ['network', 'glance'],
  tree: ['tree', 'glance'],
  'dual-area': ['area', 'glance'],
  'scatter-morph': ['scatter', 'glance'],
  'diverging-bar': ['diverging-bar', 'glance'],
  'force-graph': ['network', 'glance'],
  'stagger-delay': ['bar', 'glance'],
  'custom-pie': ['pie', 'glance'],
  'single-axis': ['strip-plot', 'glance'],
  'jitter-strip': ['strip-plot', 'glance'],
  'bar-race': ['bar', 'glance'],
  'dynamic-data': ['line', 'glance'],
  'draw-in-counter': ['line', 'glance'],
  violin: ['violin', 'glance'],
  'matrix-heat-glance': ['heatmap', 'glance'],
  'rank-strip': ['bump', 'glance'],
  'aggregate-sankey': ['sankey', 'glance'],

  // maps + standalone
  'choropleth-states': ['choropleth', 'glance'],
  'choropleth-world': ['choropleth', 'glance'],
  'circular-graph-dense': ['network', 'close-read'],
  'force-graph-dense': ['network', 'close-read'],
  'thread-triptych': ['sankey', 'close-read'],
};

/**
 * The two Chart.js components, ported to ECharts.
 *
 * Chart.js served 2 of 64 components, and a third runtime means a third token
 * binding in DESIGN.md and a third set of conformance lints, permanently. These
 * ports are kept here rather than hand-edited into the output so that re-running
 * the extractor stays idempotent.
 *
 * Both are written as `eReveal(...)` calls so they flow through the same
 * machinery as every other ECharts component.
 */
const PORTED_BLOCKS = {
  'range-capsules': `// Ported from Chart.js floating bars. ECharts has no native [min,max] bar,
// so this is two stacked series with the lower one transparent — which also
// keeps the pill radius on the visible segment only.
const ranges=[[195,235],[165,192],[150,232],[73,168],[122,202],[182,192],[138,178],
  [162,227],[195,235],[228,305],[218,232],[165,232],[118,210],[195,232]];
eReveal('c1',{
  animationDuration:800,animationEasing:'quarticOut',
  animationDelay:i=>i*40,
  grid:{left:46,right:14,top:16,bottom:30},
  tooltip:{trigger:'axis',backgroundColor:'#1C1C1A',borderWidth:0,padding:[10,14],
    axisPointer:{type:'none'},
    textStyle:{color:'#F0EFEB',fontFamily:'Inter',fontSize:12},
    formatter:p=>{
      const i=Array.isArray(p)?p[0].dataIndex:p.dataIndex;
      return ranges[i][0]+'K – '+ranges[i][1]+'K users';
    }},
  xAxis:{type:'category',data:ranges.map((_,i)=>i+1),
    axisLine:{show:false},axisTick:{show:false},
    axisLabel:{color:'#8F8E88',fontFamily:'Inter',fontSize:9,margin:10,
      formatter:(v,i)=>[0,6,13].includes(i)?(i+1)+' FEB':''}},
  yAxis:{type:'value',min:50,max:320,
    splitLine:{show:false},axisLine:{show:false},axisTick:{show:false},
    axisLabel:{color:'#8F8E88',fontFamily:'Inter',fontSize:9.5,margin:10,
      formatter:v=>v+'K'}},
  series:[
    {type:'bar',stack:'range',silent:true,barWidth:'32%',
      itemStyle:{color:'transparent'},data:ranges.map(r=>r[0])},
    {type:'bar',stack:'range',barWidth:'32%',
      itemStyle:{color:'#1C1C1A',borderRadius:99},
      data:ranges.map(r=>r[1]-r[0])},
  ],
});`,

  'chunky-bars': `// Ported from Chart.js. The value labels above each bar were a custom
// afterDatasetsDraw plugin there; ECharts does it with series label.
eReveal('c3',{
  animationDuration:900,animationEasing:'quarticOut',
  animationDelay:i=>i*110,
  grid:{left:10,right:10,top:48,bottom:28},
  tooltip:{backgroundColor:'#1C1C1A',borderWidth:0,padding:[10,14],
    textStyle:{color:'#F0EFEB',fontFamily:'Inter',fontSize:12},
    formatter:p=>'$'+p.value+'K MRR'},
  xAxis:{type:'category',data:['STARTER','PRO','TEAM','ENT'],
    axisLine:{show:false},axisTick:{show:false},
    axisLabel:{color:'#8F8E88',fontFamily:'Inter',fontSize:9,fontWeight:600,
      margin:10,letterSpacing:1}},
  yAxis:{show:false,max:540},
  series:[{type:'bar',barWidth:'52%',
    label:{show:true,position:'top',distance:10,color:'#1C1C1A',
      fontFamily:'Inter',fontSize:13,fontWeight:700,
      formatter:p=>'$'+p.value+'K'},
    data:[
      {value:182,itemStyle:{color:'#C6C5BF',borderRadius:[99,99,0,0]}},
      {value:486,itemStyle:{color:'#1C1C1A',borderRadius:[99,99,0,0]}},
      {value:391,itemStyle:{color:'#8F8E88',borderRadius:[99,99,0,0]}},
      {value:274,itemStyle:{color:'#B0AFA9',borderRadius:[99,99,0,0]}},
    ]}],
});`,
};

/** Selectors that belong to the demo page, not to any component. */
const CHROME_SELECTORS = [
  '*',
  'html',
  'body',
  '.grid2',
  '.pagehead',
  '.card.wide',
];

/* ------------------------------------------------------- tiny JS tokenizer */

/**
 * Split JavaScript into top-level statements, respecting strings, template
 * literals, comments, and nesting. Needed to tree-shake the helper preamble.
 */
function splitStatements(code) {
  const out = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  const push = (end) => {
    const chunk = code.slice(start, end).trim();
    if (chunk) out.push(chunk);
    start = end;
  };
  while (i < code.length) {
    const c = code[i];
    const next = code[i + 1];
    if (c === '/' && next === '/') {
      const nl = code.indexOf('\n', i);
      i = nl === -1 ? code.length : nl;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      i = end === -1 ? code.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i += 1;
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === quote) break;
        // template literal interpolation can nest braces and quotes
        if (quote === '`' && code[i] === '$' && code[i + 1] === '{') {
          let d = 1;
          i += 2;
          while (i < code.length && d > 0) {
            if (code[i] === '{') d += 1;
            else if (code[i] === '}') d -= 1;
            i += 1;
          }
          continue;
        }
        i += 1;
      }
      i += 1;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === ';' && depth === 0) {
      push(i + 1);
      i += 1;
      continue;
    }
    i += 1;
  }
  push(code.length);
  return out;
}

/** Drop leading line and block comments so declarations can be recognised. */
function stripLeadingComments(statement) {
  let s = statement;
  for (;;) {
    const trimmed = s.replace(/^\s+/, '');
    if (trimmed.startsWith('//')) {
      const nl = trimmed.indexOf('\n');
      if (nl === -1) return '';
      s = trimmed.slice(nl + 1);
      continue;
    }
    if (trimmed.startsWith('/*')) {
      const end = trimmed.indexOf('*/');
      if (end === -1) return '';
      s = trimmed.slice(end + 2);
      continue;
    }
    return trimmed;
  }
}

/**
 * Every identifier a statement declares. Must handle multi-declarator lines —
 * the source opens with `const INK='#1C1C1A',PAPER='#F0EFEB',MUTED=...`, and
 * returning only `INK` would let a component that uses just `GRID` lose it.
 */
function declaredNames(statement) {
  const s = stripLeadingComments(statement);
  const fn = /^function\s+([A-Za-z_$][\w$]*)/.exec(s);
  if (fn) return [fn[1]];
  const decl = /^(?:const|let|var)\s+([\s\S]*)$/.exec(s);
  if (!decl) return [];
  const names = [];
  const rest = decl[1];
  let depth = 0;
  let expectName = true;
  let i = 0;
  while (i < rest.length) {
    const c = rest[i];
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === ',' && depth === 0) expectName = true;
    else if (expectName && depth === 0 && /[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(rest.slice(i));
      if (m) {
        names.push(m[0]);
        i += m[0].length;
        expectName = false;
        continue;
      }
    }
    i += 1;
  }
  return names;
}

function referencesName(code, name) {
  return new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(code);
}

/* ------------------------------------------------------- tiny CSS splitter */

/** Split a stylesheet into top-level blocks: {selector, body, atRule}. */
function splitCssBlocks(css) {
  const blocks = [];
  let i = 0;
  let head = '';
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    if (c === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth += 1;
        else if (css[j] === '}') depth -= 1;
        j += 1;
      }
      const selector = head.trim();
      blocks.push({
        selector,
        body: css.slice(i + 1, j - 1),
        atRule: selector.startsWith('@'),
      });
      head = '';
      i = j;
      continue;
    }
    head += c;
    i += 1;
  }
  return blocks;
}

/**
 * Is this one selector part page chrome? Checks the leading compound too, so
 * descendants like `.pagehead p` are dropped along with `.pagehead` — otherwise
 * dead rules for elements that only existed on the demo page survive.
 */
function isChromePart(part) {
  const s = part.trim();
  if (!s) return true;
  if (CHROME_SELECTORS.includes(s)) return true;
  const head = s.split(/[\s>+~]+/)[0];
  return CHROME_SELECTORS.includes(head);
}

/**
 * Scope the component parts of a selector, dropping chrome parts individually
 * rather than discarding a whole rule because one part of its comma list was
 * chrome.
 */
function scopeSelector(selector, scope) {
  const parts = selector
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !isChromePart(p))
    .map((p) => (p === ':root' ? null : `${scope} ${p}`))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(',\n') : null;
}

function isChrome(selector) {
  return selector
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .every(isChromePart);
}

/**
 * Synthesise a `prefers-reduced-motion` guard for animated selectors.
 *
 * The source only ships one on 2 of 7 pages, so 39 components animate with no
 * escape hatch. DESIGN.md makes the guard mandatory and CI enforces it, so
 * generate it rather than importing the gap.
 */
function reducedMotionGuard(componentRules, scope) {
  const animated = [];
  const dashed = [];
  for (const rule of componentRules) {
    const m = /^([\s\S]*?)\s*\{([\s\S]*)\}$/.exec(rule);
    if (!m) continue;
    const [, selector, body] = m;
    if (!/animation\s*:/.test(body)) continue;
    animated.push(selector.trim());
    if (/stroke-dash/.test(body)) dashed.push(selector.trim());
  }
  if (animated.length === 0) return null;
  const lines = [
    `@media (prefers-reduced-motion: reduce) {`,
    `${animated.join(',\n')} {\n    animation: none;\n  }`,
  ];
  if (dashed.length > 0) {
    lines.push(
      `${dashed.join(',\n')} {\n    stroke-dasharray: none;\n    stroke-dashoffset: 0;\n  }`,
    );
  }
  lines.push('}');
  void scope;
  return lines.join('\n');
}

/**
 * Partition a page stylesheet. `:root` tokens are handled by the language's
 * tokens.css, page chrome is dropped, everything else is scoped.
 */
function partitionCss(css, scope) {
  const component = [];
  const motion = [];
  for (const block of splitCssBlocks(css)) {
    const { selector, body, atRule } = block;
    if (!atRule) {
      if (selector === ':root' || isChrome(selector)) continue;
      const scoped = scopeSelector(selector, scope);
      if (scoped) component.push(`${scoped} {${body}}`);
      continue;
    }
    if (selector.startsWith('@keyframes')) {
      motion.push(`${selector} {${body}}`);
      continue;
    }
    if (selector.startsWith('@media')) {
      const inner = splitCssBlocks(body)
        .filter((b) => !isChrome(b.selector) && b.selector !== ':root')
        .map((b) => {
          const scoped = scopeSelector(b.selector, scope);
          return scoped ? `  ${scoped} {${b.body}}` : null;
        })
        .filter(Boolean)
        .join('\n');
      if (inner.trim()) motion.push(`${selector} {\n${inner}\n}`);
      continue;
    }
    component.push(`${selector} {${body}}`);
  }
  return { component, motion };
}

/* ------------------------------------------------------------ HTML helpers */

/** Extract balanced `<div class="card...">...</div>` blocks. */
function extractCards(body) {
  const cards = [];
  const open = /<div class="card([^"]*)"[^>]*>/g;
  let m;
  while ((m = open.exec(body))) {
    const start = m.index;
    const tag = /<\/?div\b[^>]*>/g;
    tag.lastIndex = start;
    let depth = 0;
    let t;
    while ((t = tag.exec(body))) {
      depth += t[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        cards.push({ html: body.slice(start, t.index + t[0].length) });
        open.lastIndex = t.index + t[0].length;
        break;
      }
    }
    if (depth !== 0) break;
  }
  return cards;
}

/**
 * Strip CJK from code.
 *
 * The source is Chinese-authored and nodex is English-only. Verified safe: all
 * CJK in the collection sits in comments — 231 full-line and 15 trailing — and
 * none in string literals, so nothing rendered is lost.
 */
function stripCjk(code) {
  const CJK_CHARS = /[\u3000-\u303f\u4e00-\u9fff\uff01-\uff60\u30fb]/g;
  const HAS_CJK = /[\u4e00-\u9fff]/;
  return code
    .split('\n')
    .map((line) => {
      if (!HAS_CJK.test(line)) return line;
      let out = line.replace(CJK_CHARS, '');
      // A comment that held only CJK is now empty — drop the whole line.
      const commentOnly = /^(\s*)\/\/(.*)$/.exec(out);
      if (commentOnly && !/[A-Za-z0-9]/.test(commentOnly[2])) return null;
      // A trailing comment that held only CJK: drop the marker, keep the code.
      // Safe against URLs, which always contain alphanumerics after `//`.
      out = out.replace(/\/\/[^A-Za-z0-9\n]*$/, '');
      return out.trimEnd();
    })
    .filter((line) => line !== null)
    .join('\n');
}

/**
 * Drop the demo page's classification badges.
 *
 * All 30 read like "LUPI 编辑型 · 蜂群" — family plus chart type. That is
 * precisely what `meta.density` and `meta.component` now carry, so the badges
 * are redundant with the manifest as well as being non-English. The `.badge`
 * CSS stays, since badge is one of the primitives.
 */
function stripBadges(markup) {
  return markup
    .replace(/[ \t]*<span class="badge[^"]*">[\s\S]*?<\/span>\s*\n?/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ------------------------------------------------------------- the extract */

function parsePages(html) {
  const line = html.split('\n')[23];
  return JSON.parse(line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1));
}

/** Root-scoped replacements for the source's document-level reveal helpers. */
function revealHelpers(needs) {
  const parts = [
    `const q = (name) => root.querySelector(\`[data-nx-mount="\${name}"]\`);`,
  ];
  if (needs.obsReveal) {
    parts.push(`const timers = {};
const keep = (name, t) => { (timers[name] = timers[name] || []).push(t); };
const obsReveal = (name, fn) => {
  const node = q(name);
  if (!node) return;
  const go = () => {
    (timers[name] || []).forEach(clearInterval);
    timers[name] = [];
    node.innerHTML = '';
    fn(node);
  };
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { go(); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(node);
  node.style.cursor = 'pointer';
  node.addEventListener('click', go);
};`);
  }
  if (needs.eReveal) {
    parts.push(`const eReveal = (name, opt) => obsReveal(name, (node) => {
  const chart = echarts.getInstanceByDom(node) || echarts.init(node);
  chart.clear();
  chart.setOption(opt);
  window.addEventListener('resize', () => chart.resize());
});`);
  }
  return parts.join('\n\n');
}

function buildComponentJs({ preamble, block, usesEcharts }) {
  const statements = splitStatements(preamble);
  // The source's reveal helpers resolve by document ID; replace rather than keep.
  const REPLACED = new Set(['obsReveal', 'eReveal', 'cReveal', 'timers', 'keep']);
  const named = [];
  const bare = [];
  for (const statement of statements) {
    // Chart.js is being removed from this language, so its global config block
    // (`Chart.defaults.color = ...`, twelve bare statements in the glance
    // preamble) must not ride along. Bare statements are otherwise always
    // included, which leaked `Chart is not defined` into 22 components.
    if (/\bChart\b/.test(stripLeadingComments(statement))) continue;
    const names = declaredNames(statement);
    if (names.length === 0) {
      bare.push(statement);
      continue;
    }
    if (names.some((n) => REPLACED.has(n))) continue;
    named.push({ names, statement });
  }

  // Transitive closure: keep a helper only if the body (or another kept
  // helper) actually calls it, so SVG charts do not carry ECharts plumbing.
  const keep = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of named) {
      if (keep.has(entry)) continue;
      const haystack =
        block + [...keep].map((e) => e.statement).join('\n') + bare.join('\n');
      if (entry.names.some((n) => referencesName(haystack, n))) {
        keep.add(entry);
        changed = true;
      }
    }
  }

  const needs = {
    obsReveal: /\bobsReveal\s*\(|\beReveal\s*\(/.test(block),
    eReveal: /\beReveal\s*\(/.test(block),
  };

  const kept = named.filter((e) => keep.has(e)).map((e) => e.statement);
  const body = block.replace(/document\.getElementById\(/g, 'q(');

  const lines = [];
  if (usesEcharts) {
    lines.push(
      '/* Requires ECharts 6 on the page: see meta.json `dependencies`. */',
      '',
    );
  }
  lines.push('export function mount(root) {');
  const inner = [revealHelpers(needs), ...bare, ...kept, body]
    .filter((s) => s && s.trim())
    .join('\n\n');
  lines.push(
    inner
      .split('\n')
      .map((l) => (l.trim() ? `  ${l}` : l))
      .join('\n'),
  );
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const html = await readFile(SOURCE, 'utf8');
  const pages = parsePages(html);

  if (!DRY) {
    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });
  }

  const seen = new Map();
  const report = [];
  const injectedGuards = new Set();

  for (const [pageKey, page] of Object.entries(pages)) {
    const doc = page.html;
    const styleCss = /<style>([\s\S]*?)<\/style>/.exec(doc)?.[1] ?? '';
    const bodyStart = doc.indexOf('<body');
    const scriptStart = doc.lastIndexOf('<script>');
    const bodyHtml = doc.slice(bodyStart, scriptStart);
    const scriptRaw = doc.slice(
      scriptStart + '<script>'.length,
      doc.lastIndexOf('</script>'),
    );

    const cards = extractCards(bodyHtml);
    const claimed = new Set();

    // Multi-card pages have a helper preamble then banner-delimited blocks.
    // Single-card pages are one whole script with no preamble boundary.
    const bannerRe = /\n\/\/\s*[═=]{3,}[^\n]*\n/g;
    const cuts = [...scriptRaw.matchAll(bannerRe)].map((m) => m.index);
    const firstIife = scriptRaw.search(/\n\(\(\)\s*=>\s*\{/);
    const boundary =
      cards.length === 1
        ? -1
        : [cuts[0] ?? -1, firstIife].filter((x) => x >= 0).sort((a, b) => a - b)[0] ??
          -1;

    const preamble = boundary >= 0 ? scriptRaw.slice(0, boundary) : '';
    const rest = boundary >= 0 ? scriptRaw.slice(boundary) : scriptRaw;

    // Split into per-chart blocks by balanced top-level statement, NOT by
    // banner comment: several charts contain internal banners and nested
    // IIFEs, so comment-based splitting cuts them in half.
    const blocks =
      cards.length === 1 ? [rest] : splitStatements(rest).filter((s) => s.trim());

    // Pass 1: assign blocks to cards by mount id, then fold anything unclaimed
    // into the preamble. The maps page declares a shared `MAP_LEGEND` const
    // that references no mount id; as preamble it gets tree-shaken into
    // whichever components actually use it instead of being dropped.
    const mountIdsFor = cards.map((card) =>
      [...card.html.matchAll(/ id="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]),
    );
    const blocksFor = cards.map((_, n) =>
      cards.length === 1
        ? blocks
        : blocks.filter((b) =>
            mountIdsFor[n].some((id) =>
              new RegExp(`['"\`]${id}['"\`]`).test(b),
            ),
          ),
    );
    const claimedBlocks = new Set(blocksFor.flat());
    const unclaimed = blocks.filter((b) => !claimedBlocks.has(b));
    const effectivePreamble = [preamble, ...unclaimed]
      .filter((s) => s.trim())
      .join('\n\n');
    for (const b of unclaimed) {
      const head = stripLeadingComments(b).slice(0, 56).replace(/\s+/g, ' ');
      if (head) report.push(`shared    ${pageKey}: ${head}… -> preamble`);
    }

    for (const [n, card] of cards.entries()) {
      const ordinal = n + 1;
      const title = /<h2>([\s\S]*?)<\/h2>/.exec(card.html)?.[1]?.trim() ?? '';
      const srcLine =
        /class="src">([\s\S]*?)</.exec(card.html)?.[1]?.trim() ?? '';
      const segments = srcLine.split('·').map((s) => s.trim());
      const slug =
        SLUG_OVERRIDES[`${pageKey}:${ordinal}`] ?? slugify(segments[0] ?? '');
      const sub = /class="sub">([\s\S]*?)<\/div>/.exec(card.html)?.[1]?.trim();

      if (!slug) throw new Error(`${pageKey} card ${ordinal}: no slug`);
      if (seen.has(slug)) {
        throw new Error(
          `duplicate slug "${slug}" (${pageKey}:${ordinal} and ${seen.get(slug)}) — ` +
            `add a SLUG_OVERRIDES entry naming what differs`,
        );
      }
      seen.set(slug, `${pageKey}:${ordinal}`);

      const typeEntry = TYPES[slug];
      if (!typeEntry) throw new Error(`no TYPES entry for slug "${slug}"`);
      const [componentType, density] = typeEntry;

      // Mount points: rewrite ids so nothing depends on document-level IDs.
      const mountIds = mountIdsFor[n];
      let markup = stripBadges(card.html);
      for (const id of mountIds) {
        markup = markup.replace(` id="${id}"`, ` data-nx-mount="${id}"`);
      }

      const scope = `.nx-${slug}`;
      markup = `<div class="nx-${slug}">\n${markup
        .split('\n')
        .map((l) => (l.trim() ? `  ${l}` : l))
        .join('\n')}\n</div>\n`;

      let block = PORTED_BLOCKS[slug] ?? blocksFor[n].join('\n\n');
      if (!block.trim()) {
        report.push(`UNJOINED  ${pageKey}:${ordinal}  ${slug}`);
        block = '';
      }

      const maxStroke = Math.max(
        0,
        ...[...block.matchAll(/'stroke-width'\s*:\s*([0-9.]+)/g)].map((m) =>
          Number.parseFloat(m[1]),
        ),
      );

      const externalData = [
        ...new Set(
          [...block.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]),
        ),
      ];

      const usesChartJs = /\bcReveal\s*\(|new Chart\(/.test(block);
      const usesEcharts = /\becharts\b|\beReveal\s*\(/.test(block);
      // The two Chart.js components are being ported to ECharts, so they carry
      // the echarts runtime and dependency from the start; the port itself is
      // flagged in the report below.
      const runtime = usesEcharts || usesChartJs ? 'echarts' : 'svg';

      const { component, motion } = partitionCss(styleCss, scope);
      const hasGuard = motion.some((m) => m.includes('prefers-reduced-motion'));
      if (!hasGuard) {
        const guard = reducedMotionGuard(component, scope);
        if (guard) {
          motion.push(guard);
          injectedGuards.add(slug);
        }
      }
      const css = [`/* ${title || slug} — mono-editorial */`, ...component, ...motion]
        .join('\n\n')
        // Namespace the custom properties. Bare `--bg` in a consumer's project
        // is a likely collision; `--nx-bg` is not.
        .replace(/var\(--(bg|dark|ink|muted|faint|grid|paper)\)/g, 'var(--nx-$1)');

      const js = stripCjk(
        buildComponentJs({
          preamble: effectivePreamble,
          block,
          usesEcharts: runtime === 'echarts',
        }),
      );

      // Intrinsic proportions, so the gallery can reserve the box before the
      // iframe mounts and avoid layout shift.
      const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(card.html);
      const aspectRatio = viewBox ? `${viewBox[1]}/${viewBox[2]}` : undefined;

      const tags = segments
        .slice(2)
        .flatMap((s) => slugify(s).split('-'))
        .filter((t) => t && t.length > 2);

      const meta = {
        slug,
        title,
        ...(sub ? { description: sub } : {}),
        component: componentType,
        tier: 'expressive',
        runtime,
        density,
        ...(aspectRatio ? { aspectRatio } : {}),
        tags: [...new Set(tags)],
        dependencies: runtime === 'echarts' ? ['echarts@6'] : [],
        // Record which components draw the stroke AS the area, so the hairline
        // ceiling can be enforced on everything else. Derived from the source
        // here; for new components it is a deliberate authoring decision.
        ...(maxStroke > LINE_MAX ? { strokeAsArea: true } : {}),
        // Runtime data fetches are a supply-chain surface, so declare them
        // rather than leaving them buried in the chart body.
        ...(externalData.length > 0 ? { externalData } : {}),
      };

      if (PORTED_BLOCKS[slug]) {
        report.push(`ported    ${slug} Chart.js -> ECharts`);
      } else if (usesChartJs) {
        report.push(
          `PORT-ME   ${slug} uses Chart.js but has no PORTED_BLOCKS entry`,
        );
      }
      if (externalData.length > 0) {
        report.push(
          `external  ${slug} fetches data at runtime: ${externalData.join(', ')}`,
        );
      }

      if (!DRY) {
        const dir = path.join(OUT_DIR, slug);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'component.html'), markup);
        await writeFile(path.join(dir, 'component.css'), `${css}\n`);
        await writeFile(path.join(dir, 'component.js'), js);
        await writeFile(
          path.join(dir, 'meta.json'),
          `${JSON.stringify(meta, null, 2)}\n`,
        );
      }
      report.push(
        `ok        ${slug.padEnd(24)} ${componentType.padEnd(22)} ${runtime.padEnd(8)} ${density}`,
      );
    }

  }

  console.log(report.join('\n'));
  console.log(`\n${seen.size} components ${DRY ? 'planned' : 'written'}`);
  if (injectedGuards.size > 0) {
    console.log(
      `\ninjected prefers-reduced-motion into ${injectedGuards.size} component(s) ` +
        `(the source ships a guard on only 2 of 7 pages)`,
    );
  }
  const problems = report.filter(
    (l) => l.startsWith('UNJOINED') || l.startsWith('PORT-ME'),
  );
  if (problems.length) {
    console.log(`\n${problems.length} item(s) need attention:`);
    console.log(problems.map((p) => `  ${p}`).join('\n'));
  }
}

await main();
