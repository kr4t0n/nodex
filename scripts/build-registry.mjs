/**
 * Build and validate the nodex registry.
 *
 * Permanent tooling — runs on every registry change and in CI. Three jobs:
 *
 *  1. Validate. Schemas, slug uniqueness, taxonomy enum membership, and density
 *     values against each language's declaration. These checks are what stop a
 *     future import from silently corrupting search.
 *  2. Lint the design language. Because components inline their helpers instead
 *     of importing a shared lib, no module can enforce the language contract.
 *     The contract lives in DESIGN.md and is enforced here.
 *  3. Generate. tokens.css from tokens.json, a standalone preview document per
 *     component from its fragment, and the public manifest plus per-item JSON.
 *
 * Usage:
 *   node scripts/build-registry.mjs           build and write
 *   node scripts/build-registry.mjs --check   validate only, no writes (CI)
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { loadSource, registrySchema } from '@nodex/core';

const ROOT = path.resolve(import.meta.dirname, '..');
const REGISTRY_DIR = path.join(ROOT, 'registry');
const OUT_DIR = path.join(ROOT, 'public', 'r');
const CHECK_ONLY = process.argv.includes('--check');

const HOMEPAGE = 'https://nodex.dev';
const FONT_LINKS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">',
].join('\n');
const ECHARTS_CDN =
  'https://cdn.jsdelivr.net/npm/echarts@6/dist/echarts.min.js';

const problems = [];
const notes = [];

function fail(where, message) {
  problems.push(`${where}: ${message}`);
}

/* --------------------------------------------------------------- tokens.css */

function flattenTokens(tokens) {
  const vars = [];
  for (const [key, value] of Object.entries(tokens.color ?? {})) {
    vars.push([`--nx-${key}`, value]);
  }
  vars.push(['--nx-font-sans', tokens.font?.sans ?? 'sans-serif']);
  for (const [key, value] of Object.entries(tokens.radius ?? {})) {
    vars.push([`--nx-radius-${key}`, value]);
  }
  for (const [key, value] of Object.entries(tokens.stroke ?? {})) {
    if (typeof value === 'string' && value.endsWith('px')) {
      vars.push([`--nx-stroke-${key}`, value]);
    }
  }
  vars.push(['--nx-hairline', tokens.stroke?.hairline ?? '0.7px']);
  for (const [key, value] of Object.entries(tokens.space ?? {})) {
    vars.push([`--nx-space-${key}`, value]);
  }
  return vars;
}

function renderTokensCss(language, tokens) {
  const vars = flattenTokens(tokens);
  const width = Math.max(...vars.map(([name]) => name.length));
  const body = vars
    .map(([name, value]) => `  ${name.padEnd(width)}: ${value};`)
    .join('\n');
  return `/* ${language.name} — generated from tokens.json by scripts/build-registry.mjs.
   Do not edit by hand.

   Inter is expected on the page. Add the Google Fonts links, or run
   \`nodex init ${language.slug}\`, which prints them. */

:root {
${body}
}
`;
}

/* ------------------------------------------------------------ preview shell */

/**
 * Wrap a fragment in a standalone document. Page chrome lives here and never in
 * the fragment: `body { padding }` is page padding, not component padding, and a
 * global `*` reset would trash a consumer's layout.
 */
function renderPreview({ language, meta, fragment, needsEcharts }) {
  const echarts = needsEcharts
    ? `\n<script src="${ECHARTS_CDN}"></script>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${meta.title} — ${language.name}</title>
${FONT_LINKS}
<link rel="stylesheet" href="../../tokens.css">
<link rel="stylesheet" href="./component.css">${echarts}
<style>
  /* Page chrome — belongs to the preview, never to the distributed fragment. */
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    background: var(--nx-bg);
    color: var(--nx-ink);
    font-family: var(--nx-font-sans);
    padding: var(--nx-space-pagePadding, 40px);
    -webkit-font-smoothing: antialiased;
  }
  .nx-preview { max-width: 1400px; margin: 0 auto; }
</style>
</head>
<body>
<div class="nx-preview">
${fragment.trim()}
</div>
<script type="module">
  import { mount } from './component.js';
  mount(document.querySelector('.nx-preview'));
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------- lints */

/**
 * Conformance lints for a design language. These replace what a shared module
 * would have enforced if components imported one instead of inlining.
 */
function lintComponent({ languageMeta, tokens, meta, css, js, where }) {
  // 1. Reduced motion. Anything that animates needs an escape hatch.
  if (/animation\s*:/.test(css) && !/prefers-reduced-motion/.test(css)) {
    fail(where, 'animates but ships no prefers-reduced-motion guard');
  }

  // 2. Stroke discipline. Hairlines are the language's signature. A component
  //    may opt out via `strokeAsArea` when the stroke IS the area and its width
  //    encodes magnitude — thinning it would lose information. Declared per
  //    component rather than inferred from type, since the same chart type can
  //    be drawn either way.
  const lineMax = Number.parseFloat(tokens.stroke?.lineMax ?? '1.4');
  if (!meta.strokeAsArea) {
    const widths = [...js.matchAll(/'stroke-width'\s*:\s*([0-9.]+)/g)]
      .map((m) => Number.parseFloat(m[1]))
      .filter((w) => w > lineMax);
    if (widths.length > 0) {
      fail(
        where,
        `stroke-width ${[...new Set(widths)].join(', ')} exceeds lineMax ${lineMax}px. ` +
          `If the stroke is the area rather than an outline, set "strokeAsArea": true`,
      );
    }
  }

  // 3. Palette membership. Marks are drawn imperatively in JS with literal hex,
  //    so there is no var() to check. Enforce membership of the recorded ramp
  //    instead: this freezes today's palette and catches additions.
  const ramp = new Set(
    (tokens.ramp?.steps ?? []).map((s) => s.toUpperCase()),
  );
  const semantic = new Set(
    Object.values(tokens.color ?? {}).map((s) => String(s).toUpperCase()),
  );
  const strays = [
    ...new Set(
      [...`${js}\n${css}`.matchAll(/#[0-9A-Fa-f]{6}/g)]
        .map((m) => m[0].toUpperCase())
        .filter((hex) => !ramp.has(hex) && !semantic.has(hex)),
    ),
  ];
  if (strays.length > 0) {
    fail(
      where,
      `colour(s) outside the recorded ramp: ${strays.join(', ')} — ` +
        `add to tokens.json ramp.steps if intended`,
    );
  }

  // 4. Density must be a value the language declares.
  if (meta.density) {
    if (!languageMeta.density?.includes(meta.density)) {
      fail(
        where,
        `declares density "${meta.density}" but language declares ` +
          `${JSON.stringify(languageMeta.density ?? [])}`,
      );
    }
  }

  // 5. Card anatomy. The subtitle tells the reader what one mark means, which
  //    is the only thing that makes a one-mark-per-record chart legible.
  if (meta.tier === 'expressive' && !meta.description) {
    notes.push(`${where}: no subtitle — DESIGN.md requires the .sub line`);
  }
}

/* ------------------------------------------------------------------- build */

function itemFor({ languageMeta, meta, componentDir }) {
  const rel = path
    .relative(REGISTRY_DIR, componentDir)
    .split(path.sep)
    .join('/');
  const target = `nodex/${meta.slug}`;
  const fileType = 'registry:file';
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: meta.slug,
    type: 'registry:block',
    title: meta.title,
    ...(meta.description ? { description: meta.description } : {}),
    ...(meta.dependencies.length ? { dependencies: meta.dependencies } : {}),
    files: [
      {
        path: `registry/${rel}/component.html`,
        type: fileType,
        target: `${target}/component.html`,
      },
      {
        path: `registry/${rel}/component.css`,
        type: fileType,
        target: `${target}/component.css`,
      },
      {
        path: `registry/${rel}/component.js`,
        type: fileType,
        target: `${target}/component.js`,
      },
    ],
    meta: {
      language: languageMeta.slug,
      tier: meta.tier,
      component: meta.component,
      runtime: meta.runtime,
      ...(meta.density ? { density: meta.density } : {}),
      ...(meta.aspectRatio ? { aspectRatio: meta.aspectRatio } : {}),
      tags: meta.tags,
    },
  };
}

async function main() {
  const source = await loadSource(REGISTRY_DIR);
  const items = [];
  const slugs = new Map();
  const generated = [];

  for (const language of source.languages) {
    const tokens = JSON.parse(
      await readFile(path.join(language.dir, 'tokens.json'), 'utf8'),
    );

    generated.push({
      file: path.join(language.dir, 'tokens.css'),
      content: renderTokensCss(language.meta, tokens),
    });

    // Featured components must exist, or the gallery index renders holes.
    const present = new Set(language.expressive.map((c) => c.meta.slug));
    for (const slug of language.meta.featured) {
      if (!present.has(slug)) {
        fail(
          `${language.meta.slug}/meta.json`,
          `featured "${slug}" is not a component in this language`,
        );
      }
    }

    for (const component of language.expressive) {
      const { meta, dir } = component;
      const where = `${language.meta.slug}/${meta.slug}`;

      const key = `${language.meta.slug}/${meta.slug}`;
      if (slugs.has(key)) {
        fail(where, `duplicate slug, also at ${slugs.get(key)}`);
      }
      slugs.set(key, where);

      if (path.basename(dir) !== meta.slug) {
        fail(where, `directory is "${path.basename(dir)}" but slug is "${meta.slug}"`);
      }

      const css = await readFile(path.join(dir, 'component.css'), 'utf8');
      const js = await readFile(path.join(dir, 'component.js'), 'utf8');
      const fragment = await readFile(
        path.join(dir, 'component.html'),
        'utf8',
      );

      lintComponent({
        languageMeta: language.meta,
        tokens,
        meta,
        css,
        js,
        where,
      });

      generated.push({
        file: path.join(dir, 'index.html'),
        content: renderPreview({
          language: language.meta,
          meta,
          fragment,
          needsEcharts: meta.runtime === 'echarts',
        }),
      });

      items.push(
        itemFor({ languageMeta: language.meta, meta, componentDir: dir }),
      );
    }
  }

  const registry = registrySchema.parse({
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'nodex',
    homepage: HOMEPAGE,
    items,
  });

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n`);
    console.error(problems.map((p) => `  ${p}`).join('\n'));
    console.error('');
    process.exitCode = 1;
    return;
  }

  if (notes.length > 0) {
    console.log(`${notes.length} note(s):`);
    console.log(notes.map((n) => `  ${n}`).join('\n'));
    console.log('');
  }

  if (CHECK_ONLY) {
    console.log(
      `ok — ${registry.items.length} items across ${source.languages.length} language(s) validated`,
    );
    return;
  }

  for (const { file, content } of generated) {
    await writeFile(file, content);
  }

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, 'registry.json'),
    `${JSON.stringify(registry, null, 2)}\n`,
  );
  for (const item of registry.items) {
    const file = path.join(OUT_DIR, `${item.meta.language}`, `${item.name}.json`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(item, null, 2)}\n`);
  }

  console.log(
    `built ${registry.items.length} items across ${source.languages.length} language(s)`,
  );
  console.log(`  ${generated.length} generated file(s)`);
  console.log(`  manifest -> public/r/registry.json`);
}

await main();
