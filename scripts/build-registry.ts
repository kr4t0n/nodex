/** Build the React registry into public/. --check uses only an OS temporary directory. */
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { chromium } from '@playwright/test';
import { build } from 'esbuild';

import { loadSource, registrySchema, publishedLanguageSchema } from '../packages/core/src/index.ts';
import type { LoadedComponent } from '../packages/core/src/load.ts';
import type { GalleryRegistry, RegistryItem } from '../packages/core/src/schema.ts';
import { lintRendered, lintSource, rulesFromTokens } from '../packages/cli/src/lint.ts';
import { renderedMarks, serveDirectory } from './lib/browser.ts';
import { prepareDelivery } from './lib/delivery.ts';
import { fontFaces, renderFontFaces, renderTokens, tokenVariables, type Tokens } from './lib/tokens.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK = process.argv.includes('--check');
const run = promisify(execFile);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
const slash = (value: string) => value.split(path.sep).join('/');

interface Preview {
  key: string;
  component: LoadedComponent;
  item: RegistryItem;
  languages: Array<{ slug: string; tokens: Tokens }>;
}

async function put(root: string, file: string, content: string | Uint8Array) {
  const destination = path.join(root, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

function bootstrap(preview: Preview): string {
  return `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { isValidElementType } from 'react-is';
import * as component from ${JSON.stringify(path.join(preview.component.dir, preview.component.meta.entry))};
import * as examples from ${JSON.stringify(path.join(preview.component.dir, preview.component.meta.example.entry))};
for (const name of ${scriptJson(preview.component.meta.exports)}) {
  if (!isValidElementType(component[name])) throw new Error('Invalid declared React export: ' + name);
}
const Example = examples[${JSON.stringify(preview.component.meta.example.export)}];
if (!isValidElementType(Example)) throw new Error('Invalid declared example export');
const fontsByLanguage = ${scriptJson(Object.fromEntries(preview.languages.map((language) => [language.slug, fontFaces(language.tokens)])))};
const selectedFonts = fontsByLanguage[new URLSearchParams(location.search).get('lang')] ?? fontsByLanguage[${JSON.stringify(preview.languages[0]!.slug)}];
for (const font of selectedFonts) {
  const loaded = await document.fonts.load(font.style + ' ' + font.weight.split(' ')[0] + ' 14px ' + JSON.stringify(font.family));
  if (!loaded.length) throw new Error('Declared preview font did not load: ' + font.family);
}
await document.fonts.ready;
const node = document.getElementById('nx-preview');
const root = createRoot(node);
const animate = new URLSearchParams(location.search).get('static') !== '1';
flushSync(() => root.render(createElement(Example, { animate })));
function reportSize() {
  const body = getComputedStyle(document.body);
  const height = Math.ceil(node.getBoundingClientRect().height + parseFloat(body.paddingTop) + parseFloat(body.paddingBottom));
  parent.postMessage({ type: 'nx-preview-size', height, ready: document.documentElement.dataset.nxReady === 'true' }, '*');
}
new ResizeObserver(reportSize).observe(node);
requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
  document.documentElement.dataset.nxReady = 'true';
  reportSize();
})));
`;
}

function previewDocument(preview: Preview, assets: Set<string>, content = ''): string {
  const filename = preview.item.meta.preview.path;
  const relative = (target: string) => slash(path.relative(path.dirname(filename), target));
  const tokens = Object.fromEntries(preview.languages.map((language) => [language.slug, relative(`registry/languages/${language.slug}/tokens.css`)]));
  const first = preview.languages[0]!;
  const module = `registry/_preview/${preview.key}.js`;
  const css = `registry/_preview/${preview.key}.css`;
  const themeScript = preview.item.meta.tier === 'primitive'
    ? `<script>const themes=${scriptJson(tokens)};const selected=new URLSearchParams(location.search).get('lang');if(selected&&themes[selected])document.getElementById('nx-tokens').href=themes[selected];</script>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(preview.item.title)}</title>
<link id="nx-tokens" rel="stylesheet" href="${escapeHtml(tokens[first.slug]!)}">
${themeScript}
<link rel="stylesheet" href="${relative('registry/_preview/styles.css')}">
${assets.has(css) ? `<link rel="stylesheet" href="${relative(css)}">` : ''}
<style>html,body{background:var(--nx-bg);color:var(--nx-ink);font-family:var(--nx-font-sans)}body{margin:0;padding:${preview.item.meta.tier === 'primitive' ? '28px' : 'var(--nx-space-pagePadding)'};-webkit-font-smoothing:antialiased}#nx-preview{min-width:0}*,*::before,*::after{box-sizing:border-box}</style>
</head><body><main id="nx-preview">${content}</main>
<script type="module" src="${relative(module)}"></script></body></html>\n`;
}

async function main() {
  const stage = await mkdtemp(path.join(tmpdir(), 'nodex-registry-'));
  try {
    const source = await loadSource(path.join(ROOT, 'registry'));
    if (!source.languages.length) throw new Error('At least one design language is required');
    const languages = await Promise.all(source.languages.map(async (language) => ({
      ...language,
      tokens: JSON.parse(await readFile(path.join(language.dir, 'tokens.json'), 'utf8')) as Tokens,
    })));
    const items: RegistryItem[] = [];
    const previews: Preview[] = [];
    const publicFiles = new Map<string, string>();
    const findings: string[] = [];
    const publishedLanguages = languages.map((language) => publishedLanguageSchema.parse({
      ...language.meta,
      files: {
        tokens: `registry/languages/${language.meta.slug}/tokens.css`,
        tokensJson: `registry/languages/${language.meta.slug}/tokens.json`,
        design: `registry/languages/${language.meta.slug}/DESIGN.md`,
      },
      counts: { expressive: language.expressive.length, primitives: source.primitives.length },
    }));
    for (const language of languages) {
      tokenVariables(language.tokens);
      const published = publishedLanguages.find((entry) => entry.slug === language.meta.slug)!;
      await put(stage, published.files.tokens, renderTokens(language.tokens, language.meta.name, await renderFontFaces(language.tokens, ROOT)));
      await put(stage, published.files.tokensJson, `${JSON.stringify(language.tokens, null, 2)}\n`);
      await put(stage, published.files.design, await readFile(path.join(language.dir, 'DESIGN.md'), 'utf8'));
      for (const featured of language.meta.featured) {
        if (!language.expressive.some((component) => component.meta.slug === featured)) throw new Error(`${language.meta.slug}: featured chart ${featured} does not exist`);
      }
    }
    const authored = [
      ...source.primitives.map((component) => ({ component, language: 'shared', themes: languages })),
      ...languages.flatMap((language) => language.expressive.map((component) => ({ component, language: language.meta.slug, themes: [language] }))),
    ];
    const keys = new Set<string>();
    for (const { component, language, themes } of authored) {
      const { meta } = component;
      const where = `${language}/${meta.slug}`;
      if (keys.has(where)) throw new Error(`Duplicate component ${where}`);
      keys.add(where);
      if (path.basename(component.dir) !== meta.slug) throw new Error(`${where}: directory and slug differ`);
      if ((language === 'shared') !== (meta.tier === 'primitive')) throw new Error(`${where}: component tier differs from storage`);
      if (meta.tier === 'primitive' && meta.density) throw new Error(`${where}: primitives do not declare density`);
      if (meta.density && !themes[0]!.meta.density?.includes(meta.density)) throw new Error(`${where}: undeclared density ${meta.density}`);
      if (meta.tier === 'expressive' && meta.library !== 'recharts') throw new Error(`${where}: this reconstruction requires Recharts charts`);
      const delivered = await prepareDelivery(component, path.join(ROOT, 'registry'));
      const exampleSource = await readFile(path.join(component.dir, meta.example.entry), 'utf8');
      for (const theme of themes) {
        for (const finding of lintSource({ tsx: exampleSource }, rulesFromTokens(theme.tokens))) {
          if (finding.severity === 'error') findings.push(`${where} (${theme.meta.slug}) ${meta.example.entry}: ${finding.message}`);
        }
      }
      for (const file of delivered) {
        const previous = publicFiles.get(file.path);
        if (previous !== undefined && previous !== file.content) throw new Error(`${file.path}: conflicting shared file content`);
        publicFiles.set(file.path, file.content);
        if (/\.(tsx?|css)$/.test(file.source)) {
          for (const theme of themes) {
            for (const finding of lintSource(file.source.endsWith('.css') ? { css: file.content } : { tsx: file.content }, rulesFromTokens(theme.tokens))) {
              if (finding.severity === 'error') findings.push(`${where} (${theme.meta.slug}) ${file.target}: ${finding.message}`);
            }
          }
        }
      }
      const entry = `${meta.slug}/${meta.entry}`;
      const previewPath = `registry/${slash(path.relative(path.join(ROOT, 'registry'), component.dir))}/index.html`;
      const item: RegistryItem = {
        name: meta.slug,
        type: meta.tier === 'primitive' ? 'registry:ui' : 'registry:component',
        title: meta.title,
        description: meta.description,
        dependencies: meta.dependencies,
        files: delivered.map(({ path: filePath, target, content, type }) => ({ path: filePath, target, content, type })),
        meta: {
          language, tier: meta.tier, runtime: meta.runtime, library: meta.library,
          component: meta.component, density: meta.density, tags: meta.tags,
          aspectRatio: meta.aspectRatio ?? `${meta.example.width}/${meta.example.height}`,
          entry, exports: meta.exports, props: meta.props,
          externalData: meta.externalData, strokeAsArea: meta.strokeAsArea,
          preview: { path: previewPath, width: meta.example.width, height: meta.example.height },
        },
      };
      items.push(item);
      previews.push({ key: where, component, item, languages: themes.map((theme) => ({ slug: theme.meta.slug, tokens: theme.tokens })) });
    }
    if (findings.length) throw new Error([...new Set(findings)].join('\n'));
    for (const [file, content] of publicFiles) await put(stage, file, content);
    registrySchema.parse({ name: 'nodex', items });

    // esbuild bundles the actual examples and their React components. Dependencies
    // become local static assets; previews do not import runtime modules from CDNs.
    const byKey = new Map(previews.map((preview) => [preview.key, preview]));
    const bundled = await build({
      absWorkingDir: ROOT,
      entryPoints: Object.fromEntries(previews.map((preview) => [preview.key, `nodex-preview:${preview.key}`])),
      outdir: path.join(stage, 'registry/_preview'),
      bundle: true, splitting: true, format: 'esm', platform: 'browser', jsx: 'automatic',
      minify: true, write: false, target: 'es2022', logLevel: 'silent',
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [{ name: 'registry-examples', setup(context) {
        context.onResolve({ filter: /^nodex-preview:/ }, (args) => ({ path: args.path.slice('nodex-preview:'.length), namespace: 'registry-example' }));
        context.onLoad({ filter: /.*/, namespace: 'registry-example' }, (args) => ({ contents: bootstrap(byKey.get(args.path)!), loader: 'tsx', resolveDir: ROOT }));
      } }],
    });
    const assets = new Set<string>();
    for (const output of bundled.outputFiles) {
      const relative = slash(path.relative(stage, output.path));
      assets.add(relative);
      await put(stage, relative, output.contents);
    }
    const inputCss = path.join(stage, 'preview-input.css');
    await writeFile(inputCss, [
      `@import ${JSON.stringify(path.join(ROOT, 'node_modules/tailwindcss/index.css'))};`,
      `@import ${JSON.stringify(path.join(ROOT, 'styles/scrollbars.css'))};`,
      `@source ${JSON.stringify(path.join(ROOT, 'registry'))};`,
    ].join('\n'));
    await run(path.join(ROOT, 'node_modules/.bin/tailwindcss'), ['-i', inputCss, '-o', path.join(stage, 'registry/_preview/styles.css'), '--minify'], { cwd: ROOT });
    for (const preview of previews) await put(stage, preview.item.meta.preview.path, previewDocument(preview, assets));

    const browser = await chromium.launch({ headless: true });
    const host = await serveDirectory(stage);
    try {
      // Serial pages keep SVG IDs, layout and snapshots reproducible.
      for (const preview of previews) {
        const page = await browser.newPage({ viewport: { width: preview.component.meta.example.width, height: preview.component.meta.example.height }, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        try {
          await page.goto(`${host.origin}/${preview.item.meta.preview.path}?static=1`);
          await page.waitForFunction(() => document.documentElement.dataset.nxReady === 'true');
          await page.evaluate(async () => { await document.fonts.ready; });
          if (preview.item.meta.tier === 'expressive') {
            await page.waitForFunction(() => document.querySelector('#nx-preview svg :is(path,circle,ellipse,rect,line,polyline,polygon):not(defs *)') !== null);
            const marks = await renderedMarks(page);
            if (!marks.some((mark) => mark.tag !== 'text' && (mark.fill !== 'none' || mark.stroke !== 'none'))) throw new Error(`${preview.key}: rendered no chart marks`);
            const problems = lintRendered(marks, rulesFromTokens(preview.languages[0]!.tokens), { strokeAsArea: preview.item.meta.strokeAsArea });
            if (problems.length) throw new Error(`${preview.key}: ${problems.map((problem) => problem.message).join('; ')}`);
          }
          if (errors.length) throw new Error(`${preview.key}: ${errors.join('; ')}`);
          const snapshot = await page.locator('#nx-preview').evaluate((root) => {
            const clone = root.cloneNode(true) as HTMLElement;
            const actual = root.querySelectorAll('input,textarea,option');
            clone.querySelectorAll('input,textarea,option').forEach((copy, index) => {
              const original = actual[index];
              if (original instanceof HTMLInputElement) {
                copy.toggleAttribute('checked', original.checked);
                copy.setAttribute('value', original.value);
              } else if (original instanceof HTMLTextAreaElement) copy.textContent = original.value;
              else if (original instanceof HTMLOptionElement) copy.toggleAttribute('selected', original.selected);
            });
            const body = getComputedStyle(document.body);
            const height = Math.ceil(root.getBoundingClientRect().height + Number.parseFloat(body.paddingTop) + Number.parseFloat(body.paddingBottom));
            // Keep the standalone document and chart geometry intact. The
            // gallery can frame the content using these measured outer spaces
            // instead of shrinking page and card padding into its thumbnails.
            const chart = root.querySelector<HTMLElement>(':scope > [data-nx-chart]');
            const bounds = chart?.getBoundingClientRect();
            const style = chart && getComputedStyle(chart);
            const insets = bounds && style ? {
              top: bounds.top + Number.parseFloat(style.paddingTop),
              right: window.innerWidth - bounds.right + Number.parseFloat(style.paddingRight),
              bottom: height - bounds.bottom + Number.parseFloat(style.paddingBottom),
              left: bounds.left + Number.parseFloat(style.paddingLeft),
            } : undefined;
            return { html: clone.innerHTML, height, insets };
          });
          if (!snapshot.html.trim()) throw new Error(`${preview.key}: empty example`);
          preview.item.meta.preview.height = snapshot.height;
          if (preview.item.meta.tier === 'expressive') preview.item.meta.preview.insets = snapshot.insets;
          await put(stage, preview.item.meta.preview.path, previewDocument(preview, assets, snapshot.html));
        } finally { await page.close(); }
      }
    } finally {
      await browser.close();
      await host.close();
    }
    // Validation and rendering are complete before publishing any output.
    const manifest = registrySchema.parse({ $schema: 'https://ui.shadcn.com/schema/registry.json', name: 'nodex', homepage: 'https://nodex.kubitnodes.com', items });
    const gallery: GalleryRegistry = {
      ...manifest,
      items: manifest.items.map((item) => ({
        ...item,
        files: item.files.map(({ path, target, type }) => ({ path, target, type })),
      })),
    };
    await put(stage, 'r/registry.json', `${JSON.stringify(manifest, null, 2)}\n`);
    await put(stage, 'r/gallery.json', `${JSON.stringify(gallery, null, 2)}\n`);
    await put(stage, 'r/languages.json', `${JSON.stringify(publishedLanguages, null, 2)}\n`);
    for (const item of items) await put(stage, `r/${item.meta.language}/${item.name}.json`, `${JSON.stringify({ $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...item }, null, 2)}\n`);
    if (!CHECK) {
      for (const folder of ['registry', 'r']) {
        await rm(path.join(ROOT, 'public', folder), { recursive: true, force: true });
        await mkdir(path.join(ROOT, 'public'), { recursive: true });
        await cp(path.join(stage, folder), path.join(ROOT, 'public', folder), { recursive: true });
      }
    }
    console.log(`${CHECK ? 'validated' : 'built'} ${items.length} React components across ${languages.length} languages; previews rendered in Chromium`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

await main();
