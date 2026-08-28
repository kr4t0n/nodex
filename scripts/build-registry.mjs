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
// The same checks `nodex lint` runs, from the same file. They used to be two
// implementations, and only this one existed — which is how five components
// shipped a 2px mark under a 1.4px ceiling: the regex here could not read a
// ternary, and nothing downstream could check at all.
import { lint as lintSource, rulesFromTokens } from '../packages/cli/src/lint.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const REGISTRY_DIR = path.join(ROOT, 'registry');
const OUT_DIR = path.join(ROOT, 'public', 'r');
const CHECK_ONLY = process.argv.includes('--check');

const HOMEPAGE = 'https://nodex.dev';
/**
 * Web font links for a language's previews.
 *
 * Was a hardcoded Inter link shared by every language, which was invisible
 * while one language existed and wrong the moment a second one arrived: a
 * console language asking for Inter renders in the fallback stack and looks
 * nothing like itself.
 *
 * The family comes from `tokens.json` `font.webfont`. A language that omits it
 * ships no link and relies on locally installed faces, which is the honest
 * behaviour for a face that is not on Google Fonts.
 */
function fontLinks(tokens) {
  const spec = tokens.font?.webfont;
  if (!spec) return '';
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link href="https://fonts.googleapis.com/css2?family=${spec}&display=swap" rel="stylesheet">`,
  ].join('\n');
}
const ECHARTS_CDN =
  'https://cdn.jsdelivr.net/npm/echarts@6/dist/echarts.min.js';

const problems = [];
const notes = [];

function fail(where, message) {
  problems.push(`${where}: ${message}`);
}

/* --------------------------------------------------------------- tokens.css */

/**
 * `$comment` is documentation, not a token.
 *
 * It is legal anywhere in `tokens.json`, and the nested ones under `ramp` and
 * `stroke` were always skipped because those objects are read field by field.
 * The maps below are iterated wholesale, so a comment inside `color` or
 * `radius` used to emit `--nx-$comment: <prose>;`, which is not a valid custom
 * property and drops silently in the browser. Found by adding a second
 * language, which is the first one to document those two groups.
 */
const isComment = (key) => key.startsWith('$');

function flattenTokens(tokens) {
  const vars = [];
  for (const [key, value] of Object.entries(tokens.color ?? {})) {
    if (isComment(key)) continue;
    vars.push([`--nx-${key}`, value]);
  }
  vars.push(['--nx-font-sans', tokens.font?.sans ?? 'sans-serif']);
  if (tokens.font?.mono) vars.push(['--nx-font-mono', tokens.font.mono]);
  for (const [key, value] of Object.entries(tokens.radius ?? {})) {
    if (isComment(key)) continue;
    vars.push([`--nx-radius-${key}`, value]);
  }
  for (const [key, value] of Object.entries(tokens.stroke ?? {})) {
    if (isComment(key)) continue;
    if (typeof value === 'string' && value.endsWith('px')) {
      vars.push([`--nx-stroke-${key}`, value]);
    }
  }
  vars.push(['--nx-hairline', tokens.stroke?.hairline ?? '0.7px']);
  for (const [key, value] of Object.entries(tokens.space ?? {})) {
    if (isComment(key)) continue;
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
  const face = tokens.font?.webfont
    ? tokens.font.webfont.split(':')[0].replace(/\+/g, ' ')
    : undefined;
  const fontNote = face
    ? `${face} is expected on the page. Add the Google Fonts links, or run
   \`nodex init ${language.slug}\`, which prints them.`
    : `This language names no web font, so it renders in whatever the stack in
   \`font.sans\` resolves to locally.`;

  return `/* ${language.name} — generated from tokens.json by scripts/build-registry.mjs.
   Do not edit by hand.

   ${fontNote} */

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
function renderPreview({ language, tokens, meta, fragment, needsEcharts }) {
  const echarts = needsEcharts
    ? `\n<script src="${ECHARTS_CDN}"></script>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${meta.title} — ${language.name}</title>
${fontLinks(tokens)}
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

  /* Embedded mode.
     A fragment carries its own title and subtitle, because the card anatomy
     DESIGN.md fixes includes them and that is what a consumer receives. An
     embedder that prints those same two strings from the manifest above the
     frame therefore labels every chart twice. A bare=1 query parameter drops
     the fragment's copy so the embedder can own the label; opened directly, the
     preview still shows the component whole. */
  [data-nx-bare] .nx-preview h2,
  [data-nx-bare] .nx-preview .sub { display: none; }
</style>
<script>
  /* Applied before first paint. Doing this from the module below would let the
     header render and then vanish, which reads as a layout glitch in a grid of
     sixty-four frames. */
  if (new URLSearchParams(location.search).get('bare') === '1') {
    document.documentElement.setAttribute('data-nx-bare', '');
  }
</script>
</head>
<body>
<div class="nx-preview">
${fragment.trim()}
</div>
<script type="module">
  import { mount } from './component.js';
  const root = document.querySelector('.nx-preview');
  mount(root);

  /* Report content height to an embedding gallery.
     The card's real height depends on its title, subtitle, notes and caption, so
     a chart's viewBox ratio is only ever an approximation and guessing it clips
     the footer. Measuring and posting the true height removes the guess. */
  /* Measure the content wrapper, not documentElement. scrollHeight can never
     report less than the frame's own height, so a component shorter than the
     embedder's initial guess would lock at that guess forever. */
  const post = () => {
    const pad = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
    const height = root
      ? Math.ceil(root.getBoundingClientRect().height + pad * 2)
      : document.documentElement.scrollHeight;
    parent.postMessage({ type: 'nx-preview-size', height }, '*');
  };
  post();
  new ResizeObserver(post).observe(root ?? document.documentElement);
  addEventListener('load', post);
</script>
</body>
</html>
`;
}

/**
 * Standalone preview for a shared primitive.
 *
 * Primitives belong to no single language, so the token layer is chosen at view
 * time from a `?lang=` parameter rather than baked in. That keeps one file per
 * primitive instead of one per primitive per language, and means a new language
 * gets primitive previews for free.
 *
 * No module import here: primitives are presentational and ship no JavaScript.
 */
function renderPrimitivePreview({ meta, defaultLanguage, allTokens }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${meta.title} - nodex primitive</title>
${allTokens.map(fontLinks).filter(Boolean).join('\n')}
<link rel="stylesheet" href="./component.css">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    background: var(--nx-bg);
    color: var(--nx-ink);
    font-family: var(--nx-font-sans);
    padding: 28px;
    -webkit-font-smoothing: antialiased;
  }
  .nx-preview {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 18px 20px;
  }
  /* Children may shrink. A flex value of 0 0 auto would forbid it, so any
     primitive naturally wider than its frame (prose sets a 68ch measure) would
     overflow and be clipped rather than wrapping. min-width 0 is required too,
     since a flex item's default minimum is its content size.
     Deliberately no max-width here: it would tie with a primitive's own
     max-width on specificity and, coming later, silently override the measure
     prose sets for itself. */
  .nx-preview > * {
    flex: 0 1 auto;
    min-width: 0;
  }
</style>
</head>
<body>
<div class="nx-preview">
${meta.markup.trim()}
</div>
<script>
  /* Token layer by query parameter, so one preview serves every language. */
  (function () {
    var lang = new URLSearchParams(location.search).get('lang') || '${defaultLanguage}';
    if (!/^[a-z0-9-]+$/.test(lang)) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../../languages/' + lang + '/tokens.css';
    document.head.insertBefore(link, document.head.firstChild);
  })();

  /* Measure the wrapper, not documentElement: scrollHeight cannot report less
     than the frame height, so a short primitive would lock at the embedder's
     initial guess and never shrink to its real size. */
  var wrap = document.querySelector('.nx-preview');
  var post = function () {
    var pad = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
    var height = wrap
      ? Math.ceil(wrap.getBoundingClientRect().height + pad * 2)
      : document.documentElement.scrollHeight;
    parent.postMessage({ type: 'nx-preview-size', height: height }, '*');
  };
  post();
  new ResizeObserver(post).observe(wrap || document.documentElement);
  addEventListener('load', post);
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
/**
 * Primitives are shared across languages, so they carry `language: "shared"`
 * rather than being duplicated once per language. The gallery still displays
 * them under each language it renders: storage location and browse location are
 * decoupled, which is the manifest's whole job.
 *
 * Their preview takes the token layer from a `?lang=` parameter, so a single
 * generated file serves every language rather than one per pairing.
 */
function primitiveItem({ meta, dir }) {
  const rel = path.relative(REGISTRY_DIR, dir).split(path.sep).join('/');
  const files = ['component.html', 'component.css'].map((name) => ({
    path: `registry/${rel}/${name}`,
    type: 'registry:file',
    target: `nodex/primitives/${meta.slug}/${name}`,
  }));
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: meta.slug,
    type: 'registry:ui',
    title: meta.title,
    ...(meta.description ? { description: meta.description } : {}),
    files,
    meta: {
      language: 'shared',
      tier: meta.tier,
      component: meta.component,
      runtime: meta.runtime,
      tags: meta.tags,
    },
  };
}

function lintComponent({ languageMeta, tokens, meta, css, js, where }) {
  // Reduced motion, stroke discipline, palette membership and determinism all
  // come from the shared module, so the registry and a consumer's project are
  // held to the same rules by the same code.
  for (const finding of lintSource({ css, js }, rulesFromTokens(tokens), {
    strokeAsArea: meta.strokeAsArea,
  })) {
    if (finding.severity === 'error') fail(where, finding.message);
    else notes.push(`${where}: ${finding.message}`);
  }

  // The rest are registry-only: they check metadata a consumer does not have.

  // Density must be a value the language declares.
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
      // Must reach the manifest, or the CLI cannot warn about it and declaring
      // it in the component's meta.json accomplishes nothing.
      ...(meta.externalData?.length ? { externalData: meta.externalData } : {}),
      tags: meta.tags,
    },
  };
}

/**
 * Split a stylesheet into top-level rules keyed by selector, with bodies
 * normalised so formatting differences do not read as drift.
 */
function topLevelRules(css) {
  const rules = new Map();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  let head = '';
  let body = '';
  for (const char of withoutComments) {
    if (char === '{') {
      depth += 1;
      if (depth === 1) continue;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const selector = head.trim().replace(/\s+/g, ' ');
        // At-rules nest and are not comparable this way.
        if (selector && !selector.startsWith('@')) {
          rules.set(selector, body.trim().replace(/\s+/g, ' '));
        }
        head = '';
        body = '';
        continue;
      }
    }
    if (depth === 0) head += char;
    else body += char;
  }
  return rules;
}

/**
 * Primitives are copied individually, so a wrapper needed by several of them is
 * duplicated on purpose rather than imported. The cost is that the copies can
 * drift apart silently: `.nx-field` lives in three primitives and `.nx-choice`
 * in three more, so changing a label treatment is a multi-file edit with nothing
 * checking the edit was complete.
 *
 * This compares every selector defined by more than one primitive and fails when
 * the bodies differ. Selectors unique to one primitive are untouched, so a
 * primitive may still add modifiers of its own.
 */
function lintDuplicatedRules(sheets) {
  const bySelector = new Map();
  for (const [name, css] of sheets) {
    for (const [selector, body] of topLevelRules(css)) {
      if (!bySelector.has(selector)) bySelector.set(selector, []);
      bySelector.get(selector).push({ name, body });
    }
  }

  for (const [selector, copies] of bySelector) {
    if (copies.length < 2) continue;
    const bodies = new Set(copies.map((c) => c.body));
    if (bodies.size === 1) continue;
    const where = copies.map((c) => c.name).join(', ');
    fail(
      `primitives: ${selector}`,
      `defined differently in ${where}. A wrapper shared across primitives is ` +
        `duplicated deliberately, so the copies must stay identical. Either ` +
        `make them match, or rename one if the difference is intentional`,
    );
  }
}

async function main() {
  const source = await loadSource(REGISTRY_DIR);
  const items = [];
  const slugs = new Map();
  const generated = [];
  const primitiveSheets = [];

  /**
   * Every language's token layer, read once.
   *
   * A primitive's preview picks its tokens at view time from `?lang=`, so one
   * generated file serves every language and it cannot know at build time which
   * face it will need. It therefore links all of them. That is a handful of
   * extra font requests on a preview page, against the alternative of one
   * generated file per primitive per language.
   */
  const allTokens = await Promise.all(
    source.languages.map(async (language) =>
      JSON.parse(await readFile(path.join(language.dir, 'tokens.json'), 'utf8')),
    ),
  );

  // Primitives first: shared, no preview document, rendered inline by the app.
  for (const primitive of source.primitives) {
    const where = `primitives/${primitive.meta.slug}`;
    if (primitive.meta.tier !== 'primitive') {
      fail(where, `tier is "${primitive.meta.tier}" but it lives in primitives/`);
    }
    if (path.basename(primitive.dir) !== primitive.meta.slug) {
      fail(
        where,
        `directory is "${path.basename(primitive.dir)}" but slug is "${primitive.meta.slug}"`,
      );
    }
    if (primitive.meta.density) {
      fail(where, 'primitives must not declare density');
    }
    // A primitive that hardcodes a colour cannot be themed, which defeats the
    // entire point of it being shared.
    const css = await readFile(
      path.join(primitive.dir, 'component.css'),
      'utf8',
    );
    const literals = [...new Set([...css.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0]))];
    if (literals.length > 0) {
      fail(
        where,
        `hardcodes colour(s) ${literals.join(', ')} - primitives may only reference token variables`,
      );
    }

    const markup = await readFile(
      path.join(primitive.dir, 'component.html'),
      'utf8',
    );

    // A primitive must be self-contained: it is copied on its own, so markup
    // referencing a class defined in a sibling primitive's stylesheet hands the
    // consumer something with no styles for it. Duplicating a shared wrapper is
    // the correct fix, not importing across primitives.
    const usedClasses = new Set();
    for (const attr of markup.matchAll(/class="([^"]+)"/g)) {
      for (const name of attr[1].split(/\s+/).filter(Boolean)) {
        usedClasses.add(name);
      }
    }
    const definedClasses = new Set(
      [...css.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]),
    );
    const undefinedClasses = [...usedClasses].filter(
      (name) => !definedClasses.has(name),
    );
    if (undefinedClasses.length > 0) {
      fail(
        where,
        `markup uses class(es) its own stylesheet does not define: ` +
          `${undefinedClasses.join(', ')}. Primitives are copied individually, ` +
          `so duplicate the rules rather than relying on a sibling primitive`,
      );
    }
    generated.push({
      file: path.join(primitive.dir, 'index.html'),
        content: renderPrimitivePreview({
          meta: { ...primitive.meta, markup },
          defaultLanguage: source.languages[0]?.meta.slug ?? 'mono-editorial',
          allTokens,
        }),
    });

    primitiveSheets.push([primitive.meta.slug, css]);
    items.push(primitiveItem(primitive));
  }

  lintDuplicatedRules(primitiveSheets);

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
            tokens,
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

  // Language metadata travels separately: registrySchema mirrors shadcn's shape
  // and would strip a non-standard `languages` key, so adding it there would
  // silently lose the data.
  await writeFile(
    path.join(OUT_DIR, 'languages.json'),
    `${JSON.stringify(
      source.languages.map((l) => ({
        ...l.meta,
        counts: {
          expressive: l.expressive.length,
          primitives: source.primitives.length,
        },
      })),
      null,
      2,
    )}\n`,
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
