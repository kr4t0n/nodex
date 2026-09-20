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
import { BAR_FAMILY_CONSUMER_SOURCE, BAR_FAMILY_PRIMARY_SELECTORS, checkBarFamilyConsumer } from './lib/bar-family-consumer.ts';
import { BLOCK_BARS_CONSUMER_SOURCE, checkBlockBarsConsumer } from './lib/block-bars-consumer.ts';
import { NEO_CHARTS_CONSUMER_SOURCE, checkNeoChartsConsumer } from './lib/neo-charts-consumer.ts';
import { NEO_EXTENDED_CONSUMER_SOURCE, checkNeoExtendedConsumer } from './lib/neo-extended-consumer.ts';
import { BAR_EXTENSION_SLUGS, BAR_EXTENSIONS_CONSUMER_SOURCE, checkBarExtensionsConsumer } from './lib/bar-extensions-consumer.ts';
import { checkDualAreaConsumer, DUAL_AREA_CONSUMER_SOURCE } from './lib/dual-area-consumer.ts';
import { HEATMAP_CONSUMER_SOURCE, HEATMAP_SLUGS, checkHeatmapConsumer } from './lib/heatmap-consumer.ts';
import { checkPetalRoseConsumer, PETAL_ROSE_CONSUMER_SOURCE } from './lib/petal-rose-consumer.ts';
import { checkPrimitiveConsumer, PRIMITIVE_CONSUMER_SOURCE, PRIMITIVE_SLUGS } from './lib/primitive-consumer.ts';
import { MORPH_CONSUMER_SOURCE, MORPH_SLUGS, checkMorphConsumer } from './lib/morph-consumer.ts';
import { FORCE_CONSUMER_SOURCE, FORCE_SLUGS, checkForceConsumer, checkForceFit } from './lib/force-consumer.ts';
import { MAP_CONSUMER_SOURCE, MAP_SLUGS, checkMapConsumer } from './lib/map-consumer.ts';
import { HIERARCHY_CONSUMER_SOURCE, HIERARCHY_SLUGS, checkHierarchyConsumer } from './lib/hierarchy-consumer.ts';
import { CIRCULAR_CONSUMER_SOURCE, CIRCULAR_SLUGS, checkCircularConsumer } from './lib/circular-consumer.ts';
import { FLOW_CONSUMER_SOURCE, FLOW_SLUGS, checkFlowConsumer } from './lib/flow-consumer.ts';
import { POPULATION_CONSUMER_SOURCE, POPULATION_SLUGS, checkPopulationConsumer } from './lib/population-consumer.ts';
import { PATH_CONSUMER_SOURCE, PATH_SLUGS, checkPathConsumer } from './lib/path-consumer.ts';
import { ALMANAC_CONSUMER_SOURCE, ALMANAC_SLUGS, checkAlmanacConsumer } from './lib/almanac-consumer.ts';
import { RADIAL_CONSUMER_SOURCE, RADIAL_SLUGS, checkRadialConsumer } from './lib/radial-consumer.ts';
import { MARKET_CONSUMER_SOURCE, MARKET_SLUGS, checkMarketConsumer } from './lib/market-consumer.ts';
import { RACE_CONSUMER_SOURCE, RACE_SLUGS, checkRaceConsumer } from './lib/race-consumer.ts';
import { PROGRESS_CONSUMER_SOURCE, PROGRESS_SLUGS, checkProgressConsumer } from './lib/progress-consumer.ts';
import { UNIT_CONSUMER_SOURCE, UNIT_SLUGS, checkBallotLayout, checkRadialGeometry, checkUnitConsumer } from './lib/unit-consumer.ts';
import { CONNECTION_CONSUMER_SOURCE, CONNECTION_SLUGS, checkConnectionConsumer } from './lib/connection-consumer.ts';
import { TIMELINE_CONSUMER_SOURCE, TIMELINE_SLUGS, checkTimelineConsumer } from './lib/timeline-consumer.ts';
import { SUMMARY_CONSUMER_SOURCE, SUMMARY_SLUGS, checkSummaryConsumer } from './lib/summary-consumer.ts';
import { SCATTER_LAYOUT_CONSUMER_SOURCE, SCATTER_LAYOUT_SLUGS, checkScatterLayoutConsumer } from './lib/scatter-layout-consumer.ts';
import { SCATTER_FAMILY_CONSUMER_SOURCE, SCATTER_FAMILY_SLUGS, checkScatterFamilyConsumer } from './lib/scatter-family-consumer.ts';

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
          if (item.name === 'force-graph') await checkForceFit(page.locator('[data-nx-chart="force-graph"]'));
          if (item.name === 'ballot-tally') await checkBallotLayout(page.locator('[data-nx-chart="ballot-tally"]'));
          if (item.name === 'tick-donut' || item.name === 'tick-gauge') await checkRadialGeometry(page.locator(`[data-nx-chart="${item.name}"]`));
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
import { DualAreaConsumer } from './dual-area-consumer';
import { PetalRoseConsumer } from './petal-rose-consumer';
import { BarFamilyConsumer } from './bar-family-consumer';
import { BlockBarsConsumer } from './block-bars-consumer';
import { NeoChartsConsumer } from './neo-charts-consumer';
import { NeoExtendedConsumer } from './neo-extended-consumer';
import { BarExtensionsConsumer } from './bar-extensions-consumer';
import { ScatterFamilyConsumer } from './scatter-family-consumer';
import { HeatmapConsumer } from './heatmap-consumer';
import { ScatterLayoutConsumer } from './scatter-layout-consumer';
import { SummaryConsumer } from './summary-consumer';
import { TimelineConsumer } from './timeline-consumer';
import { ConnectionConsumer } from './connection-consumer';
import { UnitConsumer } from './unit-consumer';
import { ProgressConsumer } from './progress-consumer';
import { RaceConsumer } from './race-consumer';
import { MarketConsumer } from './market-consumer';
import { RadialConsumer } from './radial-consumer';
import { AlmanacConsumer } from './almanac-consumer';
import { PathConsumer } from './path-consumer';
import { PopulationConsumer } from './population-consumer';
import { FlowConsumer } from './flow-consumer';
import { CircularConsumer } from './circular-consumer';
import { HierarchyConsumer } from './hierarchy-consumer';
import { MapConsumer } from './map-consumer';
import { ForceConsumer } from './force-consumer';
import { MorphConsumer } from './morph-consumer';

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
    <DualAreaConsumer animate={animate} />
    <PetalRoseConsumer animate={animate} />
    <BarFamilyConsumer animate={animate} />
    <BlockBarsConsumer animate={animate} />
    <NeoChartsConsumer animate={animate} />
    <NeoExtendedConsumer animate={animate} />
    <BarExtensionsConsumer animate={animate} />
    <ScatterFamilyConsumer animate={animate} /><HeatmapConsumer animate={animate} /><ScatterLayoutConsumer animate={animate} /><SummaryConsumer animate={animate} /><TimelineConsumer animate={animate} /><ConnectionConsumer animate={animate} /><UnitConsumer animate={animate} /><ProgressConsumer animate={animate} /><RaceConsumer animate={animate} /><MarketConsumer animate={animate} /><RadialConsumer animate={animate} /><AlmanacConsumer animate={animate} /><PathConsumer animate={animate} /><PopulationConsumer animate={animate} /><FlowConsumer animate={animate} /><CircularConsumer animate={animate} /><HierarchyConsumer animate={animate} /><MapConsumer animate={animate} /><ForceConsumer animate={animate} /><MorphConsumer animate={animate} />
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
    const manifest = JSON.parse(await readFile(path.join(ROOT, 'public/r/registry.json'), 'utf8')) as { items: PreviewItem[] };
    const charts = manifest.items.filter((item) => item.meta.tier === 'expressive').map((item) => `${item.meta.language}/${item.name}`);
    await run(process.execPath, [cli, 'add', ...charts, ...PRIMITIVE_SLUGS], fixture);
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
    const neoTokens = await run(process.execPath, [cli, 'tokens', 'neo-brutalism'], fixture);
    await writeFile(path.join(fixture, 'src/styles/neo-tokens.css'), neoTokens.replace(':root', '[data-neo]'));
    await writeFile(path.join(fixture, 'src/styles/main.css'), '@import "tailwindcss";\n@import "./nodex-tokens.css";\n@import "./signal-tokens.css";\n@import "./neo-tokens.css";\n@source "../";\n');
    await writeFile(path.join(fixture, 'src/main.tsx'), CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/primitive-consumer.tsx'), PRIMITIVE_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/dual-area-consumer.tsx'), DUAL_AREA_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/petal-rose-consumer.tsx'), PETAL_ROSE_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/bar-family-consumer.tsx'), BAR_FAMILY_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/block-bars-consumer.tsx'), BLOCK_BARS_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/neo-charts-consumer.tsx'), NEO_CHARTS_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/neo-extended-consumer.tsx'), NEO_EXTENDED_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/bar-extensions-consumer.tsx'), BAR_EXTENSIONS_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/scatter-family-consumer.tsx'), SCATTER_FAMILY_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/heatmap-consumer.tsx'), HEATMAP_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/scatter-layout-consumer.tsx'), SCATTER_LAYOUT_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/summary-consumer.tsx'), SUMMARY_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/timeline-consumer.tsx'), TIMELINE_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/connection-consumer.tsx'), CONNECTION_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/unit-consumer.tsx'), UNIT_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/progress-consumer.tsx'), PROGRESS_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/race-consumer.tsx'), RACE_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/market-consumer.tsx'), MARKET_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/radial-consumer.tsx'), RADIAL_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/almanac-consumer.tsx'), ALMANAC_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/path-consumer.tsx'), PATH_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/population-consumer.tsx'), POPULATION_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/flow-consumer.tsx'), FLOW_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/circular-consumer.tsx'), CIRCULAR_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/hierarchy-consumer.tsx'), HIERARCHY_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/map-consumer.tsx'), MAP_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/force-consumer.tsx'), FORCE_CONSUMER_SOURCE);
    await writeFile(path.join(fixture, 'src/morph-consumer.tsx'), MORPH_CONSUMER_SOURCE);
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
  for (const selector of ['#line-primary', '#line-secondary', '#matrix', '#latency', '#petal-primary', '#petal-secondary']) {
    await expect(page.locator(`${selector} svg`)).toHaveCount(1);
  }
  await expect(page.locator('#matrix [data-nx-cell]')).toHaveCount(6);
  for (const selector of ['#dual-primary', '#dual-secondary']) {
    await expect(page.locator(`${selector} svg.recharts-surface`)).toHaveCount(2);
  }
  for (const selector of [...BAR_FAMILY_PRIMARY_SELECTORS, ...BAR_FAMILY_PRIMARY_SELECTORS.map((value) => value.replace('-primary', '-secondary'))]) {
    await expect(page.locator(`${selector} svg.recharts-surface`)).toHaveCount(1);
  }
  for (const scope of ['primary', 'secondary']) for (const slug of BAR_EXTENSION_SLUGS) {
    await expect(page.locator(`#bar-extensions-${scope} [data-nx-chart="${slug}"] svg.recharts-surface`)).toHaveCount(1);
  }
  for (const scope of ['primary', 'secondary']) for (const slug of SCATTER_FAMILY_SLUGS) {
    await expect(page.locator(`#scatter-${scope} [data-nx-chart="${slug}"] svg.recharts-surface`)).toHaveCount(1);
  }
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
      await Promise.all(['Inter', 'JetBrains Mono', 'Space Grotesk'].map((family) => document.fonts.load(`12px "${family}"`)));
      await document.fonts.ready;
      return [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/["']/g, ''));
    });
    assert(['Inter', 'JetBrains Mono', 'Space Grotesk'].every((family) => loadedFonts.includes(family)), 'All delivered design-language fonts must load without an external host');
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
    await checkDualAreaConsumer(page);
    await checkPetalRoseConsumer(page);
    await checkBarFamilyConsumer(page);
    await checkBlockBarsConsumer(page);
    await checkNeoChartsConsumer(page);
    await checkNeoExtendedConsumer(page);
    await checkBarExtensionsConsumer(page);
    await checkScatterFamilyConsumer(page);
    await checkHeatmapConsumer(page);
    await checkScatterLayoutConsumer(page);
    await checkSummaryConsumer(page);
    await checkTimelineConsumer(page);
    await checkConnectionConsumer(page);
    await checkUnitConsumer(page);
    await checkProgressConsumer(page);
    await checkRaceConsumer(page);
    await checkMarketConsumer(page);
    await checkRadialConsumer(page);
    await checkAlmanacConsumer(page);
    await checkPathConsumer(page);
    await checkPopulationConsumer(page);
    await checkFlowConsumer(page);
    await checkCircularConsumer(page);
    await checkHierarchyConsumer(page);
    await checkMapConsumer(page);
    await checkForceConsumer(page);
    await checkMorphConsumer(page);

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

    const motionSelectors = [...BAR_FAMILY_PRIMARY_SELECTORS, ...BAR_EXTENSION_SLUGS.map((slug) => `#bar-extensions-primary [data-nx-chart="${slug}"]`), ...SCATTER_FAMILY_SLUGS.map((slug) => `#scatter-primary [data-nx-chart="${slug}"]`), ...HEATMAP_SLUGS.map((slug) => `#heatmap-primary [data-nx-chart="${slug}"]`), ...SCATTER_LAYOUT_SLUGS.map((slug) => `#scatter-layout-primary [data-nx-chart="${slug}"]`), ...SUMMARY_SLUGS.map((slug) => `#summary-primary [data-nx-chart="${slug}"]`), ...TIMELINE_SLUGS.map((slug) => `#timeline-primary [data-nx-chart="${slug}"]`), ...CONNECTION_SLUGS.map((slug) => `#connection-primary [data-nx-chart="${slug}"]`), ...UNIT_SLUGS.map((slug) => `#unit-primary [data-nx-chart="${slug}"]`), ...PROGRESS_SLUGS.map((slug) => `#progress-primary [data-nx-chart="${slug}"]`), ...MORPH_SLUGS.map((slug) => `#morph-primary [data-nx-chart="${slug}"]`), ...FORCE_SLUGS.map((slug) => `#force-primary [data-nx-chart="${slug}"]`), ...MAP_SLUGS.map((slug) => `#map-primary [data-nx-chart="${slug}"]`), ...HIERARCHY_SLUGS.map((slug) => `#hierarchy-primary [data-nx-chart="${slug}"]`), ...CIRCULAR_SLUGS.map((slug) => `#circular-primary [data-nx-chart="${slug}"]`), ...FLOW_SLUGS.map((slug) => `#flow-primary [data-nx-chart="${slug}"]`), ...POPULATION_SLUGS.map((slug) => `#population-primary [data-nx-chart="${slug}"]`), ...PATH_SLUGS.map((slug) => `#path-primary [data-nx-chart="${slug}"]`), ...ALMANAC_SLUGS.map((slug) => `#almanac-primary [data-nx-chart="${slug}"]`), ...RADIAL_SLUGS.map((slug) => `#radial-primary [data-nx-chart="${slug}"]`), ...MARKET_SLUGS.map((slug) => `#market-primary [data-nx-chart="${slug}"]`), ...RACE_SLUGS.map((slug) => `#race-primary [data-nx-chart="${slug}"]`)];
    await page.evaluate(() => (window as unknown as { nodexFixture: { setAnimate: (value: boolean) => void } }).nodexFixture.setAnimate(true));
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#dual-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#petal-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    for (const selector of motionSelectors) await expect(page.locator(`${selector}:is([data-nx-animated]), ${selector} [data-nx-animated]`)).toHaveAttribute('data-nx-animated', 'false');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await expect(page.locator('#dual-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await expect(page.locator('#petal-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    for (const selector of motionSelectors) {
      await expect(page.locator(`${selector}:is([data-nx-animated]), ${selector} [data-nx-animated]`)).toHaveAttribute('data-nx-animated', 'true');
      await page.locator(selector).evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
      await expect(page.locator(`${selector}:is([data-nx-animated]), ${selector} [data-nx-animated]`)).toHaveAttribute('data-nx-animated', 'false');
      await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
      await page.locator(selector).evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '120ms'));
      await expect(page.locator(`${selector}:is([data-nx-animated]), ${selector} [data-nx-animated]`)).toHaveAttribute('data-nx-animated', 'true');
    }
    await page.locator('#petal-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
    await expect(page.locator('#petal-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.locator('#petal-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '120ms'));
    await expect(page.locator('#petal-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.locator('#dual-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
    await expect(page.locator('#dual-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.locator('#dual-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '120ms'));
    await expect(page.locator('#dual-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.locator('#line-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#matrix [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.locator('#line-primary').evaluate((element) => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '120ms'));
    await expect(page.locator('#line-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('#matrix [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#dual-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    await expect(page.locator('#petal-primary [data-nx-animated]')).toHaveAttribute('data-nx-animated', 'false');
    for (const selector of motionSelectors) await expect(page.locator(`${selector}:is([data-nx-animated]), ${selector} [data-nx-animated]`)).toHaveAttribute('data-nx-animated', 'false');

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
    console.log('Validated fresh CLI delivery and fonts offline, independent instances, data updates, keyboard/tooltips, coordinated dual-area plots, scoped paint/stroke/type/motion, resizing and edge cases.');
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
