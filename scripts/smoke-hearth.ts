/** Verify copied Hearth source and retain its reading/interaction evidence outside Git. */
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
import { chromium, expect } from '@playwright/test';
import { build } from 'esbuild';
import {
  PRIMITIVE_CONSUMER_SOURCE,
  PRIMITIVE_SLUGS,
} from './lib/primitive-consumer.ts';
import { serveDirectory } from './lib/browser.ts';
import { resolveTokens, type Tokens } from '../packages/cli/src/tokens.ts';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const temp = await mkdtemp(path.join(tmpdir(), 'nodex-hearth-consumer-'));
const evidence = process.env.NODEX_EVIDENCE_DIR
  ? path.resolve(process.env.NODEX_EVIDENCE_DIR)
  : await mkdtemp(path.join(tmpdir(), 'nodex-hearth-evidence-'));

const source = String.raw`
import { createRoot } from 'react-dom/client';
import { HearthBars } from './components/nodex/hearth-bars/component';
import { HearthLine } from './components/nodex/hearth-line/component';
import { Prose } from './components/nodex/prose/component';
import { Button } from './components/nodex/button/component';
import { Checkbox } from './components/nodex/checkbox/component';
import { Input } from './components/nodex/input/component';
import { PrimitiveScope } from './primitive-consumer';
const amounts = [{id:'carb',label:'Carbohydrate',value:42,tone:'a'},{id:'protein',label:'Protein',value:18,tone:'b'},{id:'fat',label:'Fat',value:11,tone:'c'},{id:'fibre',label:'Fibre',value:9,tone:'d'}] as const;
const readings = [24,21,23,18,19].map((value,index)=>({id:String(index),label:'Batch '+(index+1),x:index+1,value}));
function App() {
 return <main className="mx-auto max-w-[1120px] [padding:var(--nx-space-pagePadding)]">
  <section data-showcase>
   <article data-recipe>
    <p className="mb-4 text-[length:var(--nx-type-caption-size)] tracking-[var(--nx-type-caption-tracking)] text-[var(--nx-muted)]">From the kitchen · Autumn recipes</p>
    <Prose><h1>Roasted squash &amp; lentil bowl</h1><p>A generous bowl for slower afternoons: tender squash, earthy lentils and a bright spoonful of lemon dressing.</p></Prose>
    <p className="my-6 text-[length:var(--nx-type-body-size)] text-[var(--nx-muted)]">Prep 20 min · Cook 35 min · Serves 4</p>
    <div className="grid gap-8 md:grid-cols-[1fr_1.6fr]">
     <section className="min-w-0"><Prose><h2>Ingredients</h2></Prose><div className="mt-5 grid gap-4">
      <Checkbox label="1 small squash, cut into wedges" />
      <Checkbox label="200 g cooked green lentils" />
      <Checkbox label="2 tbsp olive oil" />
      <Checkbox label="½ lemon, juice and zest" />
     </div></section>
     <Prose><h2>At the table</h2><ol className="list-decimal"><li>Warm the oven to 200°C. Toss the squash with olive oil and spread it over a baking tray.</li><li>Roast until tender and golden at the edges. Warm the lentils while the squash cooks.</li><li>Spoon into bowls and finish with lemon. Taste, season and serve while still warm.</li></ol><h3>A note from the kitchen</h3><p><em>Keep the dressing separate if you are preparing the bowl ahead.</em></p></Prose>
    </div>
    <div className="my-8 flex flex-wrap items-end gap-4"><Input label="Your kitchen note" defaultValue="Try with toasted seeds" /><Button>Save to my cookbook</Button></div>
   </article>
   <div className="grid min-w-0 gap-6 md:grid-cols-2">
    <HearthBars data={amounts} unitLabel="Grams per serving" contextLabel="A nourishing bowl" />
    <HearthLine data={readings} unitLabel="Minutes of preparation" contextLabel="Five kitchen afternoons" />
   </div>
  </section>
  <section data-controls className="mt-8"><PrimitiveScope id="hearth-primitives" /></section>
  <section data-edge-cases className="grid gap-6">
   <div id="bars-zero"><HearthBars data={[{id:'zero',label:'Zero',value:0},{id:'missing',label:'Missing',value:null},{id:'negative',label:'Invalid negative',value:-1},{id:'nan',label:'Invalid number',value:NaN},{id:'half',label:'Half',value:5},{id:'whole',label:'Whole',value:10}]} /></div>
   <div id="bars-empty"><HearthBars data={[]} /></div>
   <div id="bars-unavailable"><HearthBars data={[{id:'missing',label:'Missing',value:null}]} /></div>
   <div id="bars-duplicate"><HearthBars data={[{id:'same',label:'First',value:1},{id:'same',label:'Second',value:2}]} /></div>
   <div id="line-gap"><HearthLine data={[{id:'start',label:'Start',x:0,value:-2},{id:'zero',label:'Zero',x:2,value:0},{id:'gap',label:'Missing',x:5,value:null},{id:'later',label:'Later',x:6,value:3},{id:'end',label:'End',x:9,value:1}]} /></div>
   <div id="line-single"><HearthLine data={[{id:'only',label:'Only',x:5,value:0}]} /></div>
   <div id="line-empty"><HearthLine data={[]} /></div>
   <div id="line-invalid"><HearthLine data={[{id:'a',label:'A',x:2,value:1},{id:'b',label:'B',x:1,value:2}]} /></div>
   <div id="line-unavailable"><HearthLine data={[{id:'a',label:'A',x:0,value:NaN}]} /></div>
  </section>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
`;

function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(
      (start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255,
    );
    const linear = channels.map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
    return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
  };
  const low = Math.min(luminance(a), luminance(b));
  const high = Math.max(luminance(a), luminance(b));
  return (high + 0.05) / (low + 0.05);
}

const browser = await chromium.launch();
let server: Awaited<ReturnType<typeof serveDirectory>> | undefined;
try {
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(temp, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        react: '19.2.8',
        'react-dom': '19.2.8',
        recharts: '3.10.1',
      },
    }),
  );
  await symlink(
    path.join(root, 'node_modules'),
    path.join(temp, 'node_modules'),
  );
  const cli = async (args: string[]) =>
    (
      await run(
        process.execPath,
        [
          path.join(root, 'packages/cli/src/index.ts'),
          ...args,
          '--registry',
          path.join(root, 'public'),
        ],
        { cwd: temp, maxBuffer: 8 * 1024 * 1024 },
      )
    ).stdout;
  await cli(['init', 'hearth']);
  await cli([
    'add',
    ...PRIMITIVE_SLUGS,
    'hearth-bars',
    'hearth-line',
    '--no-install',
  ]);
  await cli(['lint']);
  await writeFile(path.join(temp, 'src/app.tsx'), source);
  await writeFile(
    path.join(temp, 'src/primitive-consumer.tsx'),
    PRIMITIVE_CONSUMER_SOURCE,
  );
  const output = path.join(temp, 'dist');
  await build({
    entryPoints: [path.join(temp, 'src/app.tsx')],
    outdir: output,
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  });
  await writeFile(
    path.join(temp, 'input.css'),
    '@import "tailwindcss";\n@source "./src";',
  );
  await run(
    'pnpm',
    [
      'exec',
      'tailwindcss',
      '-i',
      path.join(temp, 'input.css'),
      '-o',
      path.join(output, 'tailwind.css'),
    ],
    { cwd: root },
  );
  await writeFile(
    path.join(output, 'tokens.css'),
    await readFile(path.join(temp, 'src/styles/nodex-tokens.css'), 'utf8'),
  );
  await writeFile(
    path.join(output, 'reference.css'),
    await cli(['tokens', 'mono-editorial']),
  );
  await writeFile(
    path.join(output, 'index.html'),
    '<!doctype html><html lang="en" data-nx-language="hearth"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="tailwind.css"><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="reference.css"><link rel="stylesheet" href="tokens.css"><style>body{margin:0;background:var(--nx-bg);color:var(--nx-ink);font-family:var(--nx-font-sans)}</style></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>',
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
  await expect(
    page.locator('[data-showcase] [data-nx-hearth-bar]'),
  ).toHaveCount(4);
  await expect(
    page.locator('[data-showcase] [data-nx-hearth-point]'),
  ).toHaveCount(5);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('italic 400 18px "Source Sans 3"');
    await document.fonts.load('italic 500 24px Newsreader');
  });
  await page.context().setOffline(true);
  const tokens = JSON.parse(
    await readFile(
      path.join(root, 'registry/languages/hearth/tokens.json'),
      'utf8',
    ),
  ) as Tokens;
  const comparisons: string[] = [];
  for (const mode of ['light', 'dark'] as const) {
    const colors = resolveTokens(tokens, mode).color as Record<string, string>;
    for (const ground of ['bg', 'surfaceFill', 'fieldFill']) {
      for (const role of [
        'ink',
        'muted',
        'faint',
        'border',
        'seriesA',
        'seriesB',
        'seriesC',
        'seriesD',
        'valueFill',
        'valueQuietFill',
      ]) {
        const ratio = contrast(colors[role]!, colors[ground]!);
        assert(
          ratio >= (['ink', 'muted', 'faint'].includes(role) ? 4.5 : 3),
          `${mode} ${role}/${ground}: ${ratio}`,
        );
        comparisons.push(`${mode} ${role}/${ground}: ${ratio.toFixed(2)}:1`);
      }
    }
    for (const [fg, bg] of [
      ['actionText', 'actionFill'],
      ['actionText', 'actionHoverFill'],
      ['selectionText', 'selectionFill'],
      ['badgeText', 'badgeFill'],
      ['onDarkMuted', 'ink'],
      ['onDarkFaint', 'ink'],
    ])
      assert(contrast(colors[fg!]!, colors[bg!]!) >= 4.5);
    await page.evaluate((mode) => {
      document.documentElement.dataset.nxMode = mode;
    }, mode);
    await expect(page.locator('html')).toHaveCSS('color-scheme', mode);
    await expect(page.locator('[data-recipe] .nx-prose h2').first()).toHaveCSS(
      'text-transform',
      'none',
    );
    await expect(page.locator('[data-recipe] .nx-prose h2').first()).toHaveCSS(
      'line-height',
      '33.6px',
    );
    assert.match(
      await page
        .locator('h1')
        .evaluate((el) => getComputedStyle(el).fontFamily),
      /Newsreader/,
    );
    assert.match(
      await page
        .getByLabel('Your kitchen note')
        .evaluate((el) => getComputedStyle(el).fontFamily),
      /Source Sans 3/,
    );
    assert.deepEqual(
      await page
        .locator('[data-controls] [data-primitive]')
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute('data-primitive')).sort(),
        ),
      [...PRIMITIVE_SLUGS].sort(),
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
      await page.locator('[data-showcase]').screenshot({
        path: path.join(evidence, `hearth-${mode}-${width}.png`),
      });
      await page.locator('[data-controls]').screenshot({
        path: path.join(evidence, `hearth-primitives-${mode}-${width}.png`),
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.dataset.nxLanguage = 'mono-editorial';
    document.documentElement.dataset.nxMode = 'light';
  });
  await page.locator('[data-recipe]').screenshot({
    path: path.join(evidence, 'recipe-reference-mono-editorial.png'),
  });
  await page.evaluate(() => {
    document.documentElement.dataset.nxLanguage = 'hearth';
  });
  const input = page.getByLabel('Your kitchen note');
  await input.fill('Preserved across modes');
  await input.focus();
  const svg = await page
    .locator('[data-showcase] .recharts-surface')
    .first()
    .elementHandle();
  await page.evaluate(() => {
    document.documentElement.dataset.nxMode = 'dark';
  });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Preserved across modes');
  assert(await svg!.evaluate((node) => node.isConnected));
  await input.press('Tab');
  const action = page.getByRole('button', { name: 'Save to my cookbook' });
  await expect(action).toBeFocused();
  assert(await action.evaluate((node) => node.matches(':focus-visible')));
  await page
    .locator('[data-recipe]')
    .screenshot({ path: path.join(evidence, 'hearth-keyboard-focus.png') });

  const zero = page.locator('#bars-zero');
  await expect(zero.locator('[data-nx-hearth-bar]')).toHaveCount(2);
  await expect(zero.locator('[data-nx-hearth-reading="zero"]')).toHaveText('0');
  for (const id of ['missing', 'negative', 'nan'])
    await expect(zero.locator(`[data-nx-hearth-reading="${id}"]`)).toHaveText(
      '—',
    );
  const widths = await zero
    .locator('[data-nx-hearth-bar]')
    .evaluateAll((marks) =>
      marks.map((mark) => Number(mark.getAttribute('width'))),
    );
  assert(
    Math.abs(widths[0]! / widths[1]! - 0.5) < 0.001,
    'Bar widths must share a zero baseline',
  );
  await expect(page.locator('#bars-empty')).toContainText(
    'No categories to compare.',
  );
  await expect(page.locator('#bars-unavailable')).toContainText(
    'No observations available.',
  );
  await expect(page.locator('#bars-duplicate')).toContainText(
    'unique, nonempty ID',
  );
  await expect(page.locator('#line-empty')).toContainText(
    'No observations available.',
  );
  await expect(page.locator('#line-unavailable')).toContainText(
    'No observations available.',
  );
  await expect(page.locator('#line-invalid')).toContainText(
    'strictly increasing',
  );
  await expect(page.locator('#line-single [data-nx-hearth-point]')).toHaveCount(
    1,
  );
  const gap = page.locator('#line-gap');
  await expect(gap.locator('[data-nx-hearth-point]')).toHaveCount(4);
  assert.equal(
    (await gap.locator('.recharts-line-curve').getAttribute('d'))!.match(/M/g)
      ?.length,
    2,
    'Missing readings must break the path',
  );
  const positions = await gap
    .locator('[data-nx-hearth-point]')
    .evaluateAll((marks) =>
      marks.map((mark) => Number(mark.getAttribute('cx'))),
    );
  assert(
    Math.abs(
      (positions[1]! - positions[0]!) / (positions[3]! - positions[2]!) - 2 / 3,
    ) < 0.001,
    'X spacing must remain numeric',
  );
  await page.mouse.move(0, 0);
  const barSvg = page.locator(
    '[data-showcase] [data-nx-chart="hearth-bars"] .recharts-surface',
  );
  await barSvg.focus();
  await barSvg.press('ArrowLeft');
  await expect(
    page.locator(
      '[data-showcase] [data-nx-chart="hearth-bars"] [role="status"]',
    ),
  ).toBeVisible();
  await barSvg.press('ArrowLeft');
  await expect(
    page.locator(
      '[data-showcase] [data-nx-chart="hearth-bars"] [role="status"]',
    ),
  ).toContainText('Fat');
  await expect(barSvg).toHaveCSS('outline-width', '2px');
  await expect(barSvg).toHaveCSS('outline-offset', '-2px');
  await page
    .locator('[data-showcase] [data-nx-chart="hearth-bars"]')
    .screenshot({ path: path.join(evidence, 'hearth-chart-focus.png') });
  const lineSvg = gap.locator('.recharts-surface');
  await lineSvg.focus();
  await lineSvg.press('ArrowRight');
  await expect(gap.getByRole('status')).toContainText('Zero');
  await lineSvg.press('ArrowRight');
  await expect(gap.getByRole('status')).toContainText('Unavailable');
  const siblingPaint = await gap
    .locator('[data-nx-hearth-point]')
    .first()
    .evaluate((node) => getComputedStyle(node).stroke);
  await zero.evaluate((node) =>
    (node as HTMLElement).style.setProperty('--nx-seriesA', '#123456'),
  );
  await expect(zero.locator('[data-nx-hearth-bar]').first()).toHaveCSS(
    'fill',
    'rgb(18, 52, 86)',
  );
  assert.equal(
    await gap
      .locator('[data-nx-hearth-point]')
      .first()
      .evaluate((node) => getComputedStyle(node).stroke),
    siblingPaint,
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(
    page.locator('[data-showcase] [data-nx-chart]').first(),
  ).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    page.locator('[data-showcase] [data-nx-chart]').first(),
  ).toHaveAttribute('data-nx-animated', 'false');
  await expect(input).toHaveValue('Preserved across modes');
  const ids = await page
    .locator('[id]')
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(errors, []);
  comparisons.push(
    'Passed: copied source, fonts offline, all 24 primitives in both modes, desktop/mobile fit, retained focus/state, keyboard chart inspection, zero/missing/invalid/single data, numeric geometry, scoped paint and live reduced motion.',
  );
  await writeFile(
    path.join(evidence, 'hearth-checks.txt'),
    comparisons.join('\n') + '\n',
  );
} finally {
  await browser.close();
  await server?.close();
  await rm(temp, { recursive: true, force: true });
}
console.log(`Hearth consumer checks passed. Visual evidence: ${evidence}`);
