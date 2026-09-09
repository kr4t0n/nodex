import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { chromium, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

import { renderedMarks, serveDirectory } from './lib/browser.ts';
import { checkPrimitiveConsumer, PRIMITIVE_CONSUMER_SOURCE, PRIMITIVE_SLUGS } from './lib/primitive-consumer.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runFile = promisify(execFile);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function run(command: string, args: string[], cwd: string): Promise<string> {
  try {
    const result = await runFile(command, args, { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    return result.stdout;
  } catch (cause) {
    const error = cause as Error & { stdout?: string; stderr?: string };
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}\n${error.stdout ?? ''}${error.stderr ?? ''}`, { cause });
  }
}

interface PreviewItem {
  name: string;
  meta: { tier: 'primitive' | 'expressive'; language: string; preview: { path: string; width: number; height: number } };
}

async function checkPreviews(browser: Browser): Promise<void> {
  const manifest = JSON.parse(await readFile(path.join(ROOT, 'public/r/registry.json'), 'utf8')) as { items: PreviewItem[] };
  assert(manifest.items.length > 0, 'Build the registry before running smoke tests');
  const server = await serveDirectory(path.join(ROOT, 'public'));
  const markCounts = new Map<string, number>();
  try {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ javaScriptEnabled, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        const failures: string[] = [];
        page.on('pageerror', (error) => failures.push(error.message));
        page.on('response', (response) => {
          if (response.url().startsWith(server.origin) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
        });
        for (const item of manifest.items) {
          await page.setViewportSize({ width: item.meta.preview.width, height: Math.max(400, item.meta.preview.height) });
          const response = await page.goto(`${server.origin}/${item.meta.preview.path}`);
          assert.equal(response?.status(), 200, `${item.name}: preview must be served statically`);
          if (javaScriptEnabled) await page.waitForFunction(() => document.documentElement.dataset.nxReady === 'true');
          assert(await page.locator('#nx-preview').evaluate((element) => element.childElementCount > 0), `${item.name}: preview is empty`);
          if (item.meta.tier === 'expressive') {
            const marks = (await renderedMarks(page)).filter((mark) => mark.tag !== 'text');
            assert(marks.length > 0, `${item.name}: chart has no visible marks with JS ${javaScriptEnabled ? 'on' : 'off'}`);
            const key = `${item.meta.language}/${item.name}`;
            if (javaScriptEnabled) assert.equal(marks.length, markCounts.get(key), `${key}: live and static previews disagree on mark count`);
            else markCounts.set(key, marks.length);
          }
          assert.deepEqual(failures, [], `${item.name}: preview errors`);
        }
      } finally {
        await context.close();
      }
    }
    console.log(`Validated ${manifest.items.length} built previews with JavaScript enabled and disabled.`);
  } finally {
    await server.close();
  }
}

// A consumer-authored fixture: imports only source that nodex add installs.
const CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HairlineLine, type HairlineDatum } from './components/nodex/hairline-line/component';
import { ArcMatrix, type ArcMatrixDatum } from './components/nodex/arc-matrix/component';
import { EndpointLatency, type EndpointDatum } from './components/nodex/endpoint-latency/component';
import { Button } from './components/nodex/button/component';
import { Input } from './components/nodex/input/component';
import { PrimitiveConsumer } from './primitive-consumer';

type Mode = 'normal' | 'empty' | 'single' | 'zero' | 'invalid';
declare global { interface Window { nodexFixture: { setMode: (value: Mode) => void; setAnimate: (value: boolean) => void } } }

function Consumer() {
  const [mode, setMode] = useState<Mode>('normal');
  const [animate, setAnimate] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  useEffect(() => { window.nodexFixture = { setMode, setAnimate }; }, []);
  const line: HairlineDatum[] = [
    { label: 'Mon', value: revision ? 20 : 10 }, { label: 'Tue', value: revision ? 11 : 25 },
    { label: 'Wed', value: revision ? 30 : 5 }, { label: 'Thu', value: revision ? 7 : 14 },
  ];
  const matrix: ArcMatrixDatum[] = [
    { product: 'Editor', city: 'London', value: 12 }, { product: 'Editor', city: 'Paris', value: 7 },
    { product: 'Editor', city: 'Berlin', value: 9 }, { product: 'Docs', city: 'London', value: 6 },
    { product: 'Docs', city: 'Paris', value: 0 }, { product: 'Docs', city: 'Berlin', value: 2 },
  ];
  const endpoints: EndpointDatum[] = [
    { route: '/checkout', p99Ms: 800 }, { route: '/catalog', p99Ms: 200 },
  ];
  const lineData = mode === 'empty' ? [] : mode === 'normal' ? line : [{ label: 'Only', value: mode === 'invalid' ? NaN : mode === 'zero' ? 0 : 3 }];
  const matrixData = mode === 'empty' ? [] : mode === 'normal' ? matrix : [{ product: 'Only', city: 'Here', value: mode === 'invalid' ? NaN : mode === 'zero' ? 0 : 3 }];
  const endpointData = mode === 'empty' ? [] : mode === 'normal' ? endpoints : [{ route: '/only', p99Ms: mode === 'invalid' ? NaN : mode === 'zero' ? 0 : 3 }];
  return <main className="flex flex-col gap-6 p-4">
    <section className="flex max-w-lg items-end gap-4"><Input label="Find a route" value={query} onChange={(event) => setQuery(event.target.value)} /><Button className="px-1 py-0 border-0" onClick={() => setRevision((value) => value + 1)}>Update observations</Button><Button className="hidden">Hidden action</Button><output>{query}</output></section>
    <section id="line-primary" className="w-[660px]"><HairlineLine data={lineData} height={320} animate={animate} aria-label="Primary observations" /></section>
    <section id="line-secondary" className="w-[660px]"><HairlineLine data={[{label:'Unchanged',value:8},{label:'Second',value:13}]} height={240} animate={false} aria-label="Independent observations" /></section>
    <section id="matrix" className="w-[660px]"><ArcMatrix data={matrixData} height={360} animate={animate} aria-label="Accounts by city and product" /></section>
    <section id="latency" data-signal className="w-[660px]"><EndpointLatency data={endpointData} objectiveMs={mode === 'invalid' ? NaN : 300} height={320} animate={animate} aria-label="Route latency" /></section>
    <PrimitiveConsumer />
  </main>;
}

createRoot(document.getElementById('root')!).render(<Consumer />);
`;

async function consumerFixture(): Promise<string> {
  const fixture = await mkdtemp(path.join(tmpdir(), 'nodex-consumer-'));
  try {
    await mkdir(path.join(fixture, 'src/styles'), { recursive: true });
    await writeFile(path.join(fixture, 'package.json'), `${JSON.stringify({
      name: 'nodex-consumer-smoke', private: true, type: 'module',
      dependencies: { react: '19.2.8', 'react-dom': '19.2.8' },
      devDependencies: { '@types/react': '19.2.8', '@types/react-dom': '19.2.5', typescript: '5.9.3', tailwindcss: '4.3.3', '@tailwindcss/cli': '4.3.3', esbuild: '0.28.2' },
    }, null, 2)}\n`);
    await writeFile(path.join(fixture, 'AGENTS.md'), '# Consumer project\n\nPreserve this project guidance.\n');
    console.log('Installing the standalone consumer platform into an OS temporary directory.');
    await run(npm, ['install', '--no-audit', '--no-fund'], fixture);
    await run(npm, ['run', 'build:cli'], ROOT);
    const cli = path.join(ROOT, 'packages/cli/dist/index.js');
    const registry = path.join(ROOT, 'public');
    await run(process.execPath, [cli, 'init', 'mono-editorial', '--registry', registry], fixture);
    await run(process.execPath, [cli, 'add', 'hairline-line', 'arc-matrix', 'signal-console/endpoint-latency', ...PRIMITIVE_SLUGS], fixture);
    const installed = JSON.parse(await readFile(path.join(fixture, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    assert.equal(installed.dependencies.recharts, '3.10.1', 'CLI must install the exact chart dependency');
    assert.equal(installed.dependencies['react-is'], installed.dependencies.react, 'react-is must match the consumer React version');
    assert.equal(installed.dependencies.react, '19.2.8', 'CLI must preserve the application platform');
    assert((await readFile(path.join(fixture, 'AGENTS.md'), 'utf8')).includes('Preserve this project guidance.'), 'init discarded consumer guidance');
    const files = await readdir(path.join(fixture, 'src/components/nodex'), { recursive: true });
    assert(!files.some((name) => /example|preview|meta\.json/.test(name)), 'Registry-only material leaked into delivery');
    assert(files.includes('_shared/use-chart-motion.ts') && files.includes('_shared/use-reduced-motion.ts'), 'The local dependency closure was not delivered');
    const delivered = await readFile(path.join(fixture, 'src/components/nodex/arc-matrix/component.tsx'), 'utf8');
    assert(!delivered.includes('../../../../_shared'), 'Shared imports still point at the authoring tree');
    const signalTokens = await run(process.execPath, [cli, 'tokens', 'signal-console'], fixture);
    assert(signalTokens.includes(':root'), 'CLI must deliver a real token stylesheet');
    await writeFile(path.join(fixture, 'src/styles/signal-tokens.css'), signalTokens.replace(':root', '[data-signal]'));
    await writeFile(path.join(fixture, 'src/styles/main.css'), '@import "tailwindcss";\n@import "./nodex-tokens.css";\n@import "./signal-tokens.css";\n@source "../";\n');
    await writeFile(path.join(fixture, 'src/main.tsx'), CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/primitive-consumer.tsx'), PRIMITIVE_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2023', lib: ['ES2023', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noUncheckedIndexedAccess: true, skipLibCheck: true, noEmit: true }, include: ['src'] }, null, 2));
    await writeFile(path.join(fixture, 'bundle.mjs'), `import { build } from 'esbuild';\nawait build({ entryPoints:['src/main.tsx'], outfile:'dist/main.js', bundle:true, format:'esm', jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'} });\n`);
    console.log('Checking and bundling only CLI-delivered source using the consumer’s own dependencies.');
    await run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], fixture);
    await run(process.execPath, ['bundle.mjs'], fixture);
    await run(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'src/styles/main.css', '-o', 'dist/tailwind.css'], fixture);
    await writeFile(path.join(fixture, 'dist/index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="tailwind.css"><link rel="stylesheet" href="main.css"></head><body><div id="root"></div><script type="module" src="main.js"></script></body></html>');
    return fixture;
  } catch (error) {
    console.error(`Consumer fixture retained for diagnosis: ${fixture}`);
    throw error;
  }
}

async function waitForCharts(page: Page) {
  for (const selector of ['#line-primary', '#line-secondary', '#matrix', '#latency']) {
    await expect(page.locator(`${selector} svg`)).toHaveCount(1);
  }
  await expect(page.locator('#matrix [data-nx-cell]')).toHaveCount(6);
}

async function checkConsumer(browser: Browser): Promise<void> {
  const fixture = await consumerFixture();
  const server = await serveDirectory(path.join(fixture, 'dist'));
  const context = await browser.newContext({ viewport: { width: 900, height: 1000 }, reducedMotion: 'reduce' });
  let passed = false;
  try {
    const page = await context.newPage();
    const failures: string[] = [];
    const externalRequests: string[] = [];
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (/^https?:/.test(url) && !url.startsWith(`${server.origin}/`)) {
        externalRequests.push(url);
        return route.abort();
      }
      return route.continue();
    });
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') failures.push(message.text()); });
    await page.goto(server.origin);
    await waitForCharts(page);
    const loadedFonts = await page.evaluate(async () => {
      await Promise.all(['Inter', 'JetBrains Mono'].map((family) => document.fonts.load(`12px "${family}"`)));
      await document.fonts.ready;
      return [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/["']/g, ''));
    });
    assert(loadedFonts.includes('Inter') && loadedFonts.includes('JetBrains Mono'), 'Both delivered design-language fonts must load without an external host');
    await checkPrimitiveConsumer(page);
    await expect(page.getByLabel('Find a route')).toBeVisible();
    await page.getByLabel('Find a route').fill('/catalog');
    await expect(page.locator('output')).toHaveText('/catalog');
    assert.equal(await page.getByRole('button', { name: 'Update observations' }).count(), 1, 'Button must render a single reusable control');
    await expect(page.getByText('Hidden action', { exact: true })).toBeHidden();
    const buttonStyle = await page.getByRole('button', { name: 'Update observations' }).evaluate((element) => {
      const style = getComputedStyle(element);
      return { paddingLeft: style.paddingLeft, paddingTop: style.paddingTop, borderWidth: style.borderTopWidth };
    });
    assert.deepEqual(buttonStyle, { paddingLeft: '4px', paddingTop: '0px', borderWidth: '0px' }, 'Consumer Tailwind utilities must override the preserved primitive treatment');
    const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
    assert.equal(new Set(ids).size, ids.length, 'Multiple installed components generated duplicate IDs');

    const linePath = page.locator('#line-primary .recharts-line-curve');
    const previousPath = await linePath.getAttribute('d');
    const otherPath = await page.locator('#line-secondary .recharts-line-curve').getAttribute('d');
    await page.getByRole('button', { name: 'Update observations' }).click();
    await expect(linePath).not.toHaveAttribute('d', previousPath!);
    await expect(page.locator('#line-secondary .recharts-line-curve')).toHaveAttribute('d', otherPath!);
    await page.locator('#line-primary .recharts-surface').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#line-primary .recharts-tooltip-wrapper')).toContainText('Tue: 11');

    await page.locator('#matrix [data-nx-cell="1"] circle').hover();
    await expect(page.locator('#matrix .recharts-tooltip-wrapper')).toContainText('Editor · Paris — 7 accounts');
    await page.locator('#matrix .recharts-surface').focus();
    for (let index = 0; index < 6; index++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('#matrix .recharts-tooltip-wrapper')).toContainText('Docs · Berlin — 2 accounts');
    await page.locator('#latency .recharts-surface').focus();
    // Recharts 3.10 reverses left/right traversal for a vertical bar chart.
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#latency .recharts-tooltip-wrapper')).toContainText('/catalog');
    await expect(page.locator('#latency .recharts-tooltip-wrapper')).toContainText('200ms p99');

    const originalSecondaryInk = await page.locator('#line-secondary .recharts-line-curve').evaluate((element) => getComputedStyle(element).stroke);
    await page.locator('#line-primary').evaluate((element) => {
      const node = element as HTMLElement;
      node.style.setProperty('--nx-ink', '#123456');
      node.style.setProperty('--nx-stroke-mark', '1.25px');
      node.style.setProperty('--nx-type-axis-size', '14px');
    });
    await expect.poll(() => linePath.evaluate((element) => getComputedStyle(element).stroke)).toBe('rgb(18, 52, 86)');
    await expect.poll(() => linePath.evaluate((element) => getComputedStyle(element).strokeWidth)).toBe('1.25px');
    assert.equal(await page.locator('#line-secondary .recharts-line-curve').evaluate((element) => getComputedStyle(element).stroke), originalSecondaryInk, 'A scoped override leaked into another chart');
    await expect.poll(() => page.locator('#line-primary .recharts-cartesian-axis-tick-value').first().evaluate((element) => getComputedStyle(element).fontSize)).toBe('14px');
    await page.locator('#latency').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-crit', '#e02040'));
    await expect.poll(() => page.locator('#latency .recharts-bar-rectangle path').first().evaluate((element) => getComputedStyle(element).fill)).toBe('rgb(224, 32, 64)');

    const previousWidth = Number(await page.locator('#line-primary svg').getAttribute('width'));
    await page.locator('#line-primary').evaluate((element) => { (element as HTMLElement).style.width = '340px'; });
    await expect.poll(async () => Number(await page.locator('#line-primary svg').getAttribute('width'))).toBeLessThan(previousWidth);
    assert(Number(await page.locator('#line-secondary svg').getAttribute('width')) > 340, 'Resizing one instance resized another');

    await page.evaluate(() => (window as unknown as { nodexFixture: { setAnimate: (value: boolean) => void } }).nodexFixture.setAnimate(true));
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.locator('#line-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#matrix [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.locator('#line-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '120ms'));
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('#matrix [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');

    for (const mode of ['empty', 'single', 'zero', 'invalid'] as const) {
      await page.evaluate((value) => (window as unknown as { nodexFixture: { setMode: (mode: string) => void } }).nodexFixture.setMode(value), mode);
      for (const selector of ['#line-primary', '#matrix', '#latency']) {
        if (mode === 'empty' || mode === 'invalid') await expect(page.locator(`${selector} [role="status"]`)).toContainText('available');
        else await expect(page.locator(`${selector} svg`)).toHaveCount(1);
        assert.equal(await page.locator(selector).evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `${selector}: ${mode} data generated invalid DOM`);
      }
    }
    assert.deepEqual(failures, [], 'The installed consumer reported browser errors');
    assert.deepEqual(externalRequests, [], 'The installed consumer reached outside its own static origin');
    passed = true;
    console.log('Validated fresh CLI delivery and fonts offline, independent instances, data updates, keyboard/tooltips, scoped paint/stroke/type/motion, resizing and edge cases.');
  } finally {
    await context.close();
    await server.close();
    if (passed) await rm(fixture, { recursive: true, force: true });
    else console.error(`Consumer fixture retained for diagnosis: ${fixture}`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await checkPreviews(browser);
  await checkConsumer(browser);
} finally {
  await browser.close();
}
