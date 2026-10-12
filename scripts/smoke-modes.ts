/** Exercise delivered mode CSS offline and retain visual evidence outside Git. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { build } from 'esbuild';
import type { PublishedLanguage } from '../packages/core/src/schema.ts';
import { resolveTokens, type Tokens } from '../packages/cli/src/tokens.ts';
import { renderFontFaces, tokenVariables } from './lib/tokens.ts';
import { modeRegistry } from './lib/mode-fixture.ts';
import { serveDirectory } from './lib/browser.ts';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const evidence = path.resolve(
  process.env.NODEX_EVIDENCE_DIR ?? 'artifacts/modes',
);
const temp = await mkdtemp(path.join(tmpdir(), 'nodex-modes-'));
const browser = await chromium.launch();
let server: Awaited<ReturnType<typeof serveDirectory>> | undefined;
try {
  await mkdir(evidence, { recursive: true });
  const registry = path.join(temp, 'registry');
  const fixture = await modeRegistry(registry);
  const consumer = path.join(temp, 'consumer');
  await mkdir(consumer);
  await writeFile(
    path.join(consumer, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: { react: '19.2.8', 'react-dom': '19.2.8' },
    }),
  );
  await symlink(
    path.join(root, 'node_modules'),
    path.join(consumer, 'node_modules'),
  );
  const cli = async (args: string[]) =>
    (
      await run(
        process.execPath,
        [
          path.join(root, 'packages/cli/src/index.ts'),
          ...args,
          '--registry',
          registry,
        ],
        { cwd: consumer, maxBuffer: 4 * 1024 * 1024 },
      )
    ).stdout;
  await cli(['init', 'mono-editorial']);
  await cli([
    'add',
    'button',
    'input',
    'select',
    'checkbox',
    'dialog',
    'prose',
    'hairline-line',
    '--no-install',
  ]);
  assert.equal(
    await readFile(path.join(consumer, 'src/styles/nodex-tokens.css'), 'utf8'),
    fixture.css,
  );
  assert.deepEqual(
    JSON.parse(await cli(['tokens', 'mono-editorial', '--json'])),
    fixture.tokens,
  );
  const listed = JSON.parse(
    await cli(['list', '--json']),
  ) as PublishedLanguage[];
  assert.deepEqual(
    listed.find((language) => language.slug === 'mono-editorial')!.modes,
    ['light', 'dark'],
  );
  await cli(['lint']);

  await writeFile(
    path.join(consumer, 'src/app.tsx'),
    `
    import { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { Button } from './components/nodex/button/component';
    import { Input } from './components/nodex/input/component';
    import { Select } from './components/nodex/select/component';
    import { Checkbox } from './components/nodex/checkbox/component';
    import { Dialog } from './components/nodex/dialog/component';
    import { Prose } from './components/nodex/prose/component';
    import { HairlineLine } from './components/nodex/hairline-line/component';
    function App() {
      const [open, setOpen] = useState(false);
      return <main style={{maxWidth:760,margin:'auto',padding:24,display:'grid',gap:16}}>
        <Prose><h1>Language modes</h1><h2>Section heading</h2><p>Shared geometry, local paint and preserved interaction.</p><h3>Reading hierarchy</h3></Prose>
        <Prose narrow><h2>Narrow section heading</h2><p>Reading intent keeps its own leading.</p></Prose>
        <Input label="Draft" defaultValue="A retained draft" />
        <Select label="Native selection" defaultValue="b"><option value="a">First choice</option><option value="b">Second choice</option></Select>
        <Checkbox label="Keep selection" defaultChecked />
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog title="Retained dialog" open={open} onOpenChange={setOpen}><Input label="Dialog draft" defaultValue="Modal state" /></Dialog>
        <HairlineLine data={[{label:'First',value:12},{label:'Second',value:24},{label:'Third',value:18}]} />
      </main>;
    }
    createRoot(document.getElementById('root')).render(<App />);
  `,
  );
  const output = path.join(consumer, 'dist');
  await build({
    entryPoints: [path.join(consumer, 'src/app.tsx')],
    outdir: output,
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  });
  await writeFile(
    path.join(consumer, 'input.css'),
    '@import "tailwindcss";\n@source "./src";',
  );
  await run(
    'pnpm',
    [
      'exec',
      'tailwindcss',
      '-i',
      path.join(consumer, 'input.css'),
      '-o',
      path.join(output, 'tailwind.css'),
    ],
    { cwd: root },
  );
  await writeFile(path.join(output, 'tokens.css'), fixture.css);
  await writeFile(
    path.join(output, 'index.html'),
    `<!doctype html><html lang="en" data-nx-language="mono-editorial"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="tailwind.css"><link rel="stylesheet" href="app.css"><link id="tokens" rel="stylesheet" href="tokens.css"><style>body{margin:0;background:var(--nx-bg);color:var(--nx-ink);font-family:var(--nx-font-sans)}</style></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>`,
  );
  await writeFile(
    path.join(output, 'first-paint.html'),
    `<!doctype html><html data-nx-language="mono-editorial" data-nx-mode="dark"><head><link rel="stylesheet" href="tokens.css"></head><body><input aria-label="Native first paint" style="color:var(--nx-ink);background:var(--nx-fieldFill)"></body></html>`,
  );
  server = await serveDirectory(output);
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === server!.origin
      ? route.continue()
      : route.abort(),
  );
  await page.goto(server.origin);
  await expect(page.locator('.recharts-line-curve')).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.context().setOffline(true);
  const input = page.getByRole('textbox', { name: 'Draft', exact: true });
  await input.fill('Persist across both modes');
  await input.focus();
  const chart = await page.locator('.recharts-surface').elementHandle();
  const lightInk = await input.evaluate((node) => getComputedStyle(node).color);
  await page.evaluate(() => (document.documentElement.dataset.nxMode = 'dark'));
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Persist across both modes');
  await expect(page.getByLabel('Keep selection')).toBeChecked();
  await expect(page.getByLabel('Native selection')).toHaveValue('b');
  assert(
    await page
      .locator('.recharts-surface')
      .evaluate((node, saved) => node === saved, chart),
  );
  assert.notEqual(
    await input.evaluate((node) => getComputedStyle(node).color),
    lightInk,
  );
  await expect(input).toHaveCSS('color-scheme', 'dark');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Native selection')).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Native selection')).toHaveValue('a');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Dialog draft').fill('Still open');
  await page.evaluate(
    () => (document.documentElement.dataset.nxMode = 'light'),
  );
  await expect(page.getByLabel('Dialog draft')).toBeFocused();
  await expect(page.getByLabel('Dialog draft')).toHaveValue('Still open');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open dialog' })).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-nx-chart]')).toHaveAttribute(
    'data-nx-animated',
    'false',
  );
  await page.context().setOffline(false);
  const initial = await browser.newPage({ javaScriptEnabled: false });
  await initial.goto(`${server.origin}/first-paint.html`);
  await expect(initial.locator('input')).toHaveCSS('color-scheme', 'dark');
  assert.equal(
    await initial
      .locator('input')
      .evaluate((node) => getComputedStyle(node).color),
    await page.evaluate(
      (color) => {
        const node = document.createElement('span');
        node.style.color = color;
        document.body.appendChild(node);
        const result = getComputedStyle(node).color;
        node.remove();
        return result;
      },
      (resolveTokens(fixture.tokens, 'dark').color as Record<string, string>)
        .ink!,
    ),
  );
  await initial.close();

  // Read the comparison revision's actual compiler and prose CSS, without checking
  // out or mutating another tree. Evidence is emitted only to ignored artifacts.
  const base =
    process.env.NODEX_BASE_REF ??
    (
      await run('git', ['merge-base', 'HEAD', 'origin/dev'], { cwd: root })
    ).stdout.trim();
  const before = async (file: string) =>
    (
      await run('git', ['show', `${base}:${file}`], {
        cwd: root,
        maxBuffer: 4 * 1024 * 1024,
      })
    ).stdout;
  const compilerFile = path.join(temp, 'before-tokens.mjs');
  await build({
    stdin: {
      contents: await before('scripts/lib/tokens.ts'),
      resolveDir: path.join(root, 'scripts/lib'),
      loader: 'ts',
    },
    outfile: compilerFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  const previous = (await import(pathToFileURL(compilerFile).href)) as {
    renderTokens: (
      tokens: Tokens,
      name: string,
      fonts: string,
      slug: string,
    ) => string;
    tokenVariables: (tokens: Tokens) => Record<string, string>;
  };
  const oldProse = await before('registry/primitives/prose/component.css');
  const languages = JSON.parse(
    await readFile(path.join(root, 'public/r/languages.json'), 'utf8'),
  ) as PublishedLanguage[];
  const comparisons: string[] = [];
  const existing = new Set(
    (
      await run(
        'git',
        ['ls-tree', '--name-only', `${base}:registry/languages`],
        { cwd: root },
      )
    ).stdout
      .trim()
      .split('\n'),
  );
  await page.getByLabel('Draft', { exact: true }).fill('A retained draft');
  await page.getByLabel('Native selection').selectOption('b');
  await page.evaluate(() => {
    document.getElementById('tokens')!.remove();
    (document.activeElement as HTMLElement)?.blur();
  });
  for (const language of languages) {
    if (!existing.has(language.slug)) continue;
    const source = `registry/languages/${language.slug}/tokens.json`;
    const oldTokens = JSON.parse(await before(source)) as Tokens;
    const currentTokens = JSON.parse(
      await readFile(path.join(root, source), 'utf8'),
    ) as Tokens;
    const currentVariables = tokenVariables(currentTokens);
    const oldVariables = previous.tokenVariables(oldTokens);
    for (const [key, value] of Object.entries(oldVariables))
      assert.equal(
        currentVariables[key],
        value,
        `${language.slug}: preserve ${key}`,
      );
    const priorCss = previous.renderTokens(
      oldTokens,
      language.name,
      await renderFontFaces(oldTokens, root),
      language.slug,
    );
    const currentCss = await readFile(
      path.join(root, 'public', language.files.tokens),
      'utf8',
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate((slug) => {
        document.documentElement.dataset.nxLanguage = slug;
        document.documentElement.dataset.nxMode = 'light';
      }, language.slug);
      const baseline = await page.addStyleTag({ content: priorCss + oldProse });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.waitForTimeout(100);
      const prefix = `${language.slug}-${width}`;
      const a = await page.screenshot({
        path: path.join(evidence, `${prefix}-before.png`),
        fullPage: true,
      });
      await baseline.evaluate((node) => node.parentNode?.removeChild(node));
      const updated = await page.addStyleTag({ content: currentCss });
      await page.waitForTimeout(100);
      const b = await page.screenshot({
        path: path.join(evidence, `${prefix}-after.png`),
        fullPage: true,
      });
      assert(a.equals(b), `${prefix}: default appearance must match ${base}`);
      comparisons.push(`${prefix}: pixel-identical`);
      await updated.evaluate((node) => node.parentNode?.removeChild(node));
    }
  }
  await page.addStyleTag({ content: fixture.css });
  await page.evaluate(
    () => (document.documentElement.dataset.nxLanguage = 'mono-editorial'),
  );
  for (const mode of ['light', 'dark']) {
    await page.evaluate(
      (mode) => (document.documentElement.dataset.nxMode = mode),
      mode,
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await input.focus();
      await page.screenshot({
        path: path.join(evidence, `consumer-${mode}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      '--nx-type-prose-sectionTransform',
      'none',
    ),
  );
  await expect(page.locator('.nx-prose h2').first()).toHaveCSS(
    'text-transform',
    'none',
  );
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      '--nx-type-prose-headingLineHeight',
      '1.2',
    ),
  );
  assert.equal(
    await page
      .locator('.nx-prose h2')
      .first()
      .evaluate((node) => {
        const style = getComputedStyle(node);
        return (
          Number.parseFloat(style.lineHeight) /
          Number.parseFloat(style.fontSize)
        );
      }),
    1.2,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(evidence, 'comparison.txt'),
    `Base: ${base}\n${comparisons.join('\n')}\nOffline delivered CSS/components, native focus/form/modal state, dark first paint and live reduced motion passed.\n`,
  );
  console.log(
    `Modes: offline CLI delivery, native behavior and ${comparisons.length} pixel-identical default comparisons passed`,
  );
} finally {
  await browser.close();
  await server?.close();
  await rm(temp, { recursive: true, force: true });
}
