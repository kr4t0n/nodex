import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const VIOLET_CONSUMER_SOURCE = `import {useEffect,useState} from 'react';
import {MeasurementLine} from './components/nodex/measurement-line/component';
import {ComparisonBars} from './components/nodex/comparison-bars/component';
import {ObservationMatrix} from './components/nodex/observation-matrix/component';
type Mode='normal'|'empty'|'zero'|'missing'|'invalid'|'single'|'long';
declare global {interface Window {nodexViolet:{setMode:(v:Mode)=>void}}}
const line=[{id:'a',label:'Start',x:0,value:0},{id:'b',label:'Second',x:1,value:10},{id:'c',label:'Missing',x:4,value:null},{id:'d',label:'Last',x:6,value:20}];
const bars=[{id:'a',label:'Aster',value:40},{id:'b',label:'Birch',value:20},{id:'c',label:'Zero',value:0},{id:'d',label:'Missing',value:null}];
const rows=[{id:'a',label:'Aster'},{id:'b',label:'Birch'}],columns=[{id:'x',label:'01'},{id:'y',label:'02'},{id:'z',label:'03'}];
const matrix=[{rowId:'a',columnId:'x',value:0},{rowId:'a',columnId:'y',value:null},{rowId:'a',columnId:'z',value:100},{rowId:'b',columnId:'x',value:40},{rowId:'b',columnId:'y',value:NaN},{rowId:'b',columnId:'z',value:Infinity}];
export function VioletConsumer(){
 const [mode,setMode]=useState<Mode>('normal');useEffect(()=>{window.nodexViolet={setMode};},[]);
 let readings=line.map(d=>({...d})),categories=bars.map(d=>({...d})),observations=matrix.map(d=>({...d}));
 if(mode==='empty'){readings=[];categories=[];observations=[];}
 if(mode==='zero'){readings=readings.map(d=>({...d,value:0}));categories=categories.map(d=>({...d,value:0}));observations=observations.map(d=>({...d,value:0}));}
 if(mode==='missing'){readings=readings.map(d=>({...d,value:NaN}));categories=categories.map(d=>({...d,value:NaN}));}
 if(mode==='single'){readings=readings.slice(0,1);categories=categories.slice(0,1);}
 if(mode==='invalid'){readings[1]!.x=0;categories[1]!.value=-1;observations[0]!.value=101;}
 if(mode==='long'){categories[0]!.label='An exceptionally long unbroken label WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW';}
 return <section data-violet id="violet-consumer" className="mx-auto w-full max-w-[660px] bg-[var(--nx-bg)]">
  <MeasurementLine data={readings} title="Daily readings" subtitle="Irregular observation intervals" unit="units" />
  <ComparisonBars data={categories} title="Group comparison" />
  <ObservationMatrix data={observations} rows={rows} columns={columns} domain={[0,100]} title="Observation matrix" />
  <div data-violet-sibling><MeasurementLine data={line} title="Unaffected sibling" /></div>
 </section>;
}
`;

export async function checkVioletConsumer(page: Page): Promise<void> {
  const root = page.locator('#violet-consumer');
  const line = root.locator('[data-nx-chart="measurement-line"]').first();
  const bars = root.locator('[data-nx-chart="comparison-bars"]');
  const matrix = root.locator('[data-nx-chart="observation-matrix"]');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root).toHaveCSS('color-scheme', 'light');
  await expect(root).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'light' });
  const mode = (value: string) =>
    page.evaluate(
      (value) =>
        (
          window as unknown as { nodexViolet: { setMode: (v: string) => void } }
        ).nodexViolet.setMode(value),
      value,
    );
  await expect(line.locator('[data-nx-measurement]')).toHaveCount(3);
  const xs = await line
    .locator('[data-nx-measurement]')
    .evaluateAll((nodes) => nodes.map((n) => Number(n.getAttribute('cx'))));
  assert(
    Math.abs((xs[1]! - xs[0]!) / (xs[2]! - xs[0]!) - 1 / 6) < 0.001,
    'Line must use numeric spacing, not category indices',
  );
  const curve = await line.locator('.recharts-line-curve').getAttribute('d');
  assert.equal(
    (curve?.match(/M/g) ?? []).length,
    2,
    'Missing reading must split the path',
  );
  const lengths = await bars
    .locator('[data-nx-comparison]')
    .evaluateAll((nodes) =>
      nodes.map(
        (n) =>
          [
            n.getAttribute('data-nx-comparison'),
            Number(n.getAttribute('width')),
          ] as const,
      ),
    );
  const width = (id: string) => lengths.find((d) => d[0] === id)?.[1] ?? 0;
  assert(Math.abs(width('a') / width('b') - 2) < 0.001);
  assert.equal(width('c'), 0);
  await expect(bars.locator('[data-nx-comparison-value="d"]')).toHaveText('—');
  await expect(matrix.locator('[data-nx-observation]')).toHaveCount(6);
  await expect(matrix.locator('[data-nx-value="missing"]')).toHaveCount(3);
  await expect(matrix.locator('[data-nx-value="0"] rect')).toHaveCSS(
    'fill',
    'rgb(244, 239, 255)',
  );
  await expect(matrix.locator('[data-nx-value="100"] rect')).toHaveCSS(
    'fill',
    'rgb(45, 11, 140)',
  );
  await page.mouse.move(0, 0);
  for (const chart of [line, matrix]) {
    await chart.locator('svg.recharts-surface').focus();
    await page.keyboard.press('ArrowRight');
    await expect(chart.locator('.recharts-tooltip-wrapper')).toBeVisible();
    await expect(chart.locator('[role="status"]')).not.toBeEmpty();
  }
  await bars.locator('svg.recharts-surface').focus();
  await expect(bars.getByRole('status')).toHaveText('Aster: 40');
  // Recharts reverses the horizontal navigation direction for vertical bars.
  await page.keyboard.press('ArrowLeft');
  await expect(bars.getByRole('status')).toHaveText('Birch: 20');
  await root.evaluate((el) =>
    (el as HTMLElement).style.setProperty('--nx-seriesA', '#173f69'),
  );
  await expect(line.locator('[data-nx-measurement]').first()).toHaveCSS(
    'fill',
    'rgb(23, 63, 105)',
  );
  await expect(bars.locator('[data-nx-comparison="a"]')).toHaveCSS(
    'fill',
    'rgb(23, 63, 105)',
  );
  await root.evaluate((el) =>
    (el as HTMLElement).style.setProperty('--nx-heatLow', '#e3f0fa'),
  );
  await expect(matrix.locator('[data-nx-value="0"] rect')).toHaveCSS(
    'fill',
    'rgb(227, 240, 250)',
  );
  await root.evaluate((el) =>
    (el as HTMLElement).style.removeProperty('--nx-heatLow'),
  );
  await root.evaluate((el) =>
    (el as HTMLElement).style.removeProperty('--nx-seriesA'),
  );
  for (const value of ['invalid', 'empty', 'missing', 'single', 'zero']) {
    await mode(value);
    if (value === 'invalid') {
      await expect(line.getByRole('status')).toContainText('unique IDs');
      await expect(bars.getByRole('status')).toContainText('nonnegative');
      await expect(matrix.getByRole('status')).toContainText(
        'finite, increasing',
      );
    } else if (value === 'empty' || value === 'missing') {
      await expect(line.getByRole('status')).toHaveText(
        'No measurements available.',
      );
      if (value === 'empty')
        await expect(matrix.locator('[data-nx-value="missing"]')).toHaveCount(
          6,
        );
    } else {
      await expect(line.locator('[data-nx-measurement]')).toHaveCount(
        value === 'single' ? 1 : 4,
      );
    }
    await expect(
      root.locator('[data-violet-sibling] [data-nx-measurement]'),
    ).toHaveCount(3);
  }
  await mode('normal');
  const evidence = process.env.NODEX_EVIDENCE_DIR
    ? path.join(process.env.NODEX_EVIDENCE_DIR, 'violet')
    : await mkdtemp(path.join(tmpdir(), 'nodex-violet-evidence-'));
  await mkdir(evidence, { recursive: true });
  const measurements: unknown[] = [];
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await root.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.screenshot({
      path: path.join(evidence, `charts-${viewport.width}.png`),
      clip: (await root.boundingBox()) ?? undefined,
    });
    const bounds = await root.evaluate((el) => ({
      client: el.clientWidth,
      scroll: el.scrollWidth,
    }));
    assert.equal(
      bounds.scroll,
      bounds.client,
      'Violet chart frame must contain responsive overflow',
    );
    measurements.push({ viewport, bounds });
    await mode('long');
    await expect(bars).toContainText('An exceptionally long');
    const labels = await bars.locator('[title]').count();
    assert.equal(
      labels,
      0,
      'Full bar labels must wrap visibly rather than depend on title hints',
    );
    await mode('normal');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const primitive = page.locator('#primitives-violet-draft-original');
  const button = primitive.locator('[data-submit]');
  await button.focus();
  await expect(button).toHaveCSS('clip-path', 'none');
  await expect(button.locator('.nx-btn__paint')).toHaveCSS('clip-path', /12px/);
  await expect(button).toHaveCSS('outline-style', 'solid');
  await expect(primitive.locator('.nx-card__title')).toHaveCSS(
    'font-stretch',
    '110%',
  );
  await expect(
    primitive.getByRole('textbox', { name: 'Report title' }),
  ).toHaveCSS('border-top-color', 'rgb(111, 104, 128)');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(
      () =>
        button
          .locator('.nx-btn__paint')
          .evaluate(
            (el) => getComputedStyle(el, '::before').transitionDuration,
          ),
      // Resuming motion also wakes the other charts in this consumer fixture.
      { timeout: 15_000, message: 'Violet action motion resumes' },
    )
    .toBe('0.32s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(
      () =>
        button
          .locator('.nx-btn__paint')
          .evaluate(
            (el) => getComputedStyle(el, '::before').transitionDuration,
          ),
      { timeout: 15_000, message: 'Violet action respects reduced motion' },
    )
    .toBe('0s');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(button.locator('.nx-btn__paint')).toHaveCSS('clip-path', 'none');
  await expect(button).toHaveCSS('outline-style', 'solid');
  await page.emulateMedia({ forcedColors: 'none' });
  await primitive.locator('[data-open-dialog]').focus();
  await page.keyboard.press('Enter');
  const confirm = primitive.getByRole('button', { name: 'Confirm review' });
  await confirm.focus();
  await expect(confirm).toHaveCSS('clip-path', 'none');
  await expect(confirm.locator('.nx-dialog__paint')).toHaveCSS(
    'clip-path',
    /10px/,
  );
  await expect(confirm).toHaveCSS('outline-style', 'solid');
  await confirm.hover();
  await expect
    .poll(() =>
      confirm
        .locator('.nx-dialog__paint')
        .evaluate((el) => getComputedStyle(el, '::before').backgroundPositionX),
    )
    .toBe('100%');
  await confirm.evaluate((el) => ((el as HTMLButtonElement).disabled = true));
  await expect
    .poll(() =>
      confirm
        .locator('.nx-dialog__paint')
        .evaluate((el) => getComputedStyle(el, '::before').backgroundPositionX),
    )
    .toBe('0%');
  await confirm.evaluate((el) => ((el as HTMLButtonElement).disabled = false));
  await page.keyboard.press('Escape');
  await writeFile(
    path.join(evidence, 'measurements.json'),
    JSON.stringify(measurements, null, 2),
  );
  console.log(
    `Violet Draft: numeric spacing, gaps, zero/missing readings, fixed color bounds, keyboard inspection, scoped paint, offline fonts, cut paint/focus and live reduced motion passed. Evidence: ${evidence}`,
  );
}
