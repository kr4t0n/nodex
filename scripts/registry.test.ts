import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

import { chromium } from '@playwright/test';
import { componentMetaSchema, loadSource, publishedLanguageSchema, registrySchema, relativePathSchema } from '../packages/core/src/index.ts';
import { lintRendered, lintSource, rulesFromTokens } from '../packages/cli/src/lint.ts';
import { registryPath } from '../packages/cli/src/safety.ts';
import { renderedMarks } from './lib/browser.ts';
import { prepareDelivery } from './lib/delivery.ts';
import { fontFaces, renderFontFaces, renderTokens, tokenVariables } from './lib/tokens.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const run = promisify(execFile);
const tokens = JSON.parse(await readFile(path.join(ROOT, 'registry/languages/mono-editorial/tokens.json'), 'utf8'));
const rules = rulesFromTokens(tokens);

test('authored contracts reject legacy metadata, ambiguous entrypoints and unsafe addresses', () => {
  const valid = { slug: 'test-chart', title: 'Test', component: 'line', tier: 'expressive', runtime: 'react', entry: 'component.tsx', exports: ['Chart'], files: ['component.tsx'], example: { entry: 'example.tsx', export: 'Example', width: 640, height: 320 } };
  assert.ok(componentMetaSchema.safeParse(valid).success);
  for (const override of [{ runtime: 'echarts' }, { mounts: ['chart'] }, { data: [] }, { entry: 'missing.tsx' }, { files: ['component.tsx', 'example.tsx'] }, { exports: [] }, { aspectRatio: '640/0' }]) {
    assert.equal(componentMetaSchema.safeParse({ ...valid, ...override }).success, false, JSON.stringify(override));
  }
  for (const address of ['../secret', '/secret', 'api/../../secret', 'a\\b', 'https://host/file', '%2e%2e/secret', 'file?download', 'a//b', 'a\u0000b', 'a b', '日本語.ts']) {
    assert.equal(relativePathSchema.safeParse(address).success, false, address);
    assert.throws(() => registryPath(address));
  }
});

test('delivery follows explicit imports, rejects missing/unused files and excludes examples', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'nodex-delivery-test-'));
  const dir = path.join(root, 'languages/test/expressive/test-chart');
  const meta = componentMetaSchema.parse({ slug: 'test-chart', title: 'Test', component: 'line', tier: 'expressive', runtime: 'react', entry: 'component.tsx', exports: ['Chart'], files: ['component.tsx'], shared: ['use-value.ts'], example: { entry: 'example.tsx', export: 'Example', width: 640, height: 320 } });
  const loaded = { dir, meta, files: meta.files };
  try {
    await mkdir(dir, { recursive: true });
    await mkdir(path.join(root, '_shared'));
    await writeFile(path.join(root, '_shared/use-value.ts'), 'export const value = 3; export interface Datum { value: number }');
    await writeFile(path.join(dir, 'example.tsx'), 'export const fixture = [1, 2, 3];');
    await writeFile(path.join(dir, 'component.tsx'), "import { value } from '../../../../_shared/use-value'; export function Chart() { return value; }");
    const files = await prepareDelivery(loaded, root);
    assert.deepEqual(files.map((file) => file.target), ['test-chart/component.tsx', '_shared/use-value.ts']);
    assert.match(files[0]!.content, /from "\.\.\/_shared\/use-value"/);
    assert.equal(files.some((file) => file.content.includes('fixture')), false);
    // Type imports disappear from the gallery bundle but remain part of the
    // delivered TypeScript API. Their files and rewritten paths must survive.
    for (const declaration of [
      "import type { Datum } from '../../../../_shared/use-value'; export type Props = { data: Datum[] };",
      "export type Props = { data: import('../../../../_shared/use-value').Datum[] };",
      "export type Props = { value: typeof import('../../../../_shared/use-value').value };",
      "import type Shared = require('../../../../_shared/use-value'); export type Props = { data: Shared.Datum[] };",
    ]) {
      await writeFile(path.join(dir, 'component.tsx'), `${declaration} export function Chart() { return null; }`);
      const typed = await prepareDelivery(loaded, root);
      assert.deepEqual(typed.map((file) => file.target), ['test-chart/component.tsx', '_shared/use-value.ts']);
      assert.match(typed[0]!.content, /"\.\.\/_shared\/use-value"/);
      assert.doesNotMatch(typed[0]!.content, /\.\.\/\.\.\/\.\.\/\.\.\/_shared/);
    }
    for (const dependencies of [['react@19.2.8'], ['recharts@^3.10.1'], ['recharts@3.10.1', 'recharts@3.10.0']]) {
      await assert.rejects(prepareDelivery({ ...loaded, meta: { ...meta, dependencies } }, root), /platform dependency|exact package version|conflicting versions/);
    }
    await writeFile(path.join(dir, 'component.tsx'), "import { fixture } from './example'; export function Chart() { return fixture; }");
    await assert.rejects(prepareDelivery(loaded, root), /not included in files\/shared/);
    await writeFile(path.join(dir, 'component.tsx'), "import missing from 'some-runtime'; export const Chart = missing;");
    await assert.rejects(prepareDelivery(loaded, root), /undeclared dependency/);
    for (const declaration of [
      "export type Props = import('./example').Props;",
      "import type Fixture = require('./example'); export type Props = Fixture.Props;",
    ]) {
      await writeFile(path.join(dir, 'component.tsx'), `${declaration} export function Chart() { return null; }`);
      await assert.rejects(prepareDelivery(loaded, root), /not included in files\/shared/);
    }
    await writeFile(path.join(dir, 'component.tsx'), "export type Props = import('some-runtime').Props; export function Chart() { return null; }");
    await assert.rejects(prepareDelivery(loaded, root), /undeclared dependency/);
    for (const declaration of [
      'const source = "./example"; const data = import(source);',
      'const source = "./example"; const data = require(source);',
      'export type Props = import(Source).Props;',
      'import type Fixture = require(source);',
    ]) {
      await writeFile(path.join(dir, 'component.tsx'), `${declaration} export function Chart() { return null; }`);
      await assert.rejects(prepareDelivery(loaded, root), /imports must name a literal module/);
    }
    await writeFile(path.join(dir, 'component.tsx'), "export type Element = import('react').ReactNode; export function Chart() { return null; }");
    await assert.rejects(prepareDelivery(loaded, root), /unused delivery files/);
    await writeFile(path.join(dir, 'component.tsx'), 'export function Chart() { return null; }');
    await assert.rejects(prepareDelivery(loaded, root), /unused delivery files/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('tokens and source checks reject literal paint, unknown roles and unguarded animation', () => {
  assert.match(renderTokens(tokens, 'Test'), /--nx-stroke-hairline:/);
  assert.throws(() => tokenVariables({ ...tokens, color: { ...tokens.color, incorrect: 'var(--nx-missing)' } }), /missing token/);
  assert.deepEqual(lintSource({ tsx: '<path stroke="var(--nx-ink)" strokeWidth="var(--nx-stroke-mark)" />' }, rules), []);
  for (const source of [{ tsx: '<path stroke="#ff0000" />' }, { css: '.chart { color: red; }' }, { tsx: '<path fill="var(--nx-undefined)" />' }, { tsx: '<Line isAnimationActive={true} />' }, { css: '.chart { animation: spin 1s linear infinite; }' }]) {
    assert.ok(lintSource(source, rules).some((finding) => finding.severity === 'error'), JSON.stringify(source));
  }
});

test('font metadata becomes licensed embedded assets, never invalid CSS declarations', async () => {
  const variables = tokenVariables(tokens);
  assert.equal(Object.keys(variables).some((name) => /faces|webfont/.test(name)), false);
  const css = await renderFontFaces(tokens, ROOT);
  assert.match(css, /SIL OPEN FONT LICENSE/);
  assert.match(css, /data:font\/woff2;base64,/);
  assert.throws(() => tokenVariables({ ...tokens, font: { ...tokens.font, webfont: 'Inter:wght@400;500' } }), /obsolete/);
  const face = fontFaces(tokens)[0]!;
  assert.throws(() => fontFaces({ font: { faces: [{ ...face, file: '../outside.woff2' }] } }), /Unsafe/);
  await assert.rejects(renderFontFaces({ font: { faces: [{ ...face, package: '@fontsource-variable/inter@0.0.0' }] } }, ROOT), /must be pinned/);
  const sketchbook = JSON.parse(await readFile(path.join(ROOT, 'registry/languages/sketchbook/tokens.json'), 'utf8'));
  const staticCss = await renderFontFaces(sketchbook, ROOT);
  assert.match(staticCss, /font-family: "Gaegu";/);
  for (const weight of [400, 700]) assert.match(staticCss, new RegExp(`font-weight: ${weight};`));
  assert.match(staticCss, /SIL OPEN FONT LICENSE/);
  assert.throws(() => fontFaces({ font: { faces: [{ ...face, package: '@other/inter@5.3.0' }] } }), /must come from/);
  await assert.rejects(renderFontFaces({ font: { faces: [{ ...face, package: '@fontsource/gaegu@0.0.0' }] } }, ROOT), /must be pinned/);
});

test('rendered conformance resolves variables, inherited paint, gradients and scaled strokes', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${renderTokens(tokens, 'Test')}</style><main id="nx-preview"><svg width="400" height="200"><g fill="var(--nx-ink)"><circle cx="30" cy="30" r="8" /></g><line x1="10" y1="60" x2="90" y2="60" stroke="var(--nx-grid)" stroke-width="var(--nx-stroke-hairline)" /></svg></main>`);
    assert.deepEqual(lintRendered(await renderedMarks(page), rules), []);
    await page.locator('circle').evaluate((circle) => { circle.style.fill = '#FF0000'; });
    assert.ok(lintRendered(await renderedMarks(page), rules).some((finding) => finding.rule === 'palette'));
    await page.locator('circle').evaluate((circle) => { circle.style.fill = 'var(--nx-ink)'; });
    await page.locator('line').evaluate((line) => { line.setAttribute('transform', 'scale(4)'); });
    assert.ok(lintRendered(await renderedMarks(page), rules).some((finding) => finding.rule === 'stroke'));
    await page.locator('line').evaluate((line) => { line.setAttribute('vector-effect', 'non-scaling-stroke'); });
    assert.deepEqual(lintRendered(await renderedMarks(page), rules), []);
    await page.locator('svg').evaluate((svg) => { svg.insertAdjacentHTML('beforeend', '<defs><linearGradient id="paint"><stop stop-color="#FF0000" /></linearGradient></defs><rect x="100" width="20" height="20" fill="url(#paint)" />'); });
    assert.ok(lintRendered(await renderedMarks(page), rules).some((finding) => finding.rule === 'palette'));
  } finally { await browser.close(); }
});

test('every manifest address is published and runtime source is independent of examples', async () => {
  const manifest = registrySchema.parse(JSON.parse(await readFile(path.join(ROOT, 'public/r/registry.json'), 'utf8')));
  const languages = JSON.parse(await readFile(path.join(ROOT, 'public/r/languages.json'), 'utf8')).map((value: unknown) => publishedLanguageSchema.parse(value));
  const source = await loadSource(path.join(ROOT, 'registry'));
  assert.equal(manifest.items.length, source.primitives.length + source.languages.reduce((total, language) => total + language.expressive.length, 0));
  for (const item of manifest.items) {
    assert.ok((await stat(path.join(ROOT, 'public', item.meta.preview.path))).isFile());
    for (const file of item.files) {
      assert.equal(await readFile(path.join(ROOT, 'public', file.path), 'utf8'), file.content);
      assert.doesNotMatch(file.target, /example|preview|meta\.json/);
      assert.doesNotMatch(file.content!, /from ['"][^'"]*example/);
    }
  }
  for (const language of languages) {
    for (const file of Object.values(language.files) as string[]) assert.ok((await stat(path.join(ROOT, 'public', file))).isFile());
  }
});

async function fingerprint(directory: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else {
        const info = await stat(file);
        result[path.relative(directory, file)] = `${info.mtimeMs}:${createHash('sha256').update(await readFile(file)).digest('hex')}`;
      }
    }
  }
  await walk(directory);
  return result;
}

test('--check leaves authored sources and existing build outputs untouched', { timeout: 120_000 }, async () => {
  const before = await Promise.all(['registry', 'public'].map((dir) => fingerprint(path.join(ROOT, dir))));
  const result = await run(process.execPath, ['scripts/build-registry.ts', '--check'], { cwd: ROOT, timeout: 110_000 });
  assert.match(result.stdout, /validated .* React components/);
  const after = await Promise.all(['registry', 'public'].map((dir) => fingerprint(path.join(ROOT, dir))));
  assert.deepEqual(after, before);
});
