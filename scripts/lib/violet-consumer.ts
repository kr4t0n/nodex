import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const VIOLET_CONSUMER_SOURCE = `import {useEffect,useState} from 'react';
import {MeasurementLine} from './components/nodex/measurement-line/component';
import {ComparisonBars} from './components/nodex/comparison-bars/component';
import {ObservationMatrix} from './components/nodex/observation-matrix/component';
type Mode='normal'|'empty'|'zero'|'missing'|'invalid'|'single'|'long'|'large'|'headings'|'decimal'|'fraction';
declare global {interface Window {nodexViolet:{setMode:(v:Mode)=>void}}}
const line=[{id:'a',label:'Start',x:0,value:0},{id:'b',label:'Second',x:1,value:10},{id:'c',label:'Missing',x:4,value:null},{id:'d',label:'Last',x:6,value:20}];
const bars=[{id:'a',label:'Aster',value:40},{id:'b',label:'Birch',value:20},{id:'c',label:'Zero',value:0},{id:'d',label:'Missing',value:null}];
const rows=[{id:'a',label:'Aster'},{id:'b',label:'Birch'}],columns=[{id:'x',label:'01'},{id:'y',label:'02'},{id:'z',label:'03'}];
const matrix=[{rowId:'a',columnId:'x',value:0},{rowId:'a',columnId:'y',value:null},{rowId:'a',columnId:'z',value:100},{rowId:'b',columnId:'x',value:40},{rowId:'b',columnId:'y',value:NaN},{rowId:'b',columnId:'z',value:Infinity}];
export function VioletConsumer(){
 const [mode,setMode]=useState<Mode>('normal');useEffect(()=>{window.nodexViolet={setMode};},[]);
 let readings=line.map(d=>({...d})),categories=bars.map(d=>({...d})),observations=matrix.map(d=>({...d}));
 let gridRows=rows,gridColumns=columns,domain:[number,number]=[0,100];
 if(mode==='empty'){readings=[];categories=[];observations=[];}
 if(mode==='zero'){readings=readings.map(d=>({...d,value:0}));categories=categories.map(d=>({...d,value:0}));observations=observations.map(d=>({...d,value:0}));}
 if(mode==='missing'){readings=readings.map(d=>({...d,value:NaN}));categories=categories.map(d=>({...d,value:NaN}));}
 if(mode==='single'){readings=readings.slice(0,1);categories=categories.slice(0,1);}
 if(mode==='invalid'){readings[1]!.x=0;categories[1]!.value=-1;observations[0]!.value=101;}
 if(mode==='long'){categories[0]!.label='Aster Birch Cedar Delta Ember Fjord Grove Hazel';categories[1]!.label='An exceptionally long unbroken label WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW';}
 if(mode==='large'){categories=categories.map((d,i)=>({...d,value:[1234567.891,98765.4,123456,1234.5][i]!}));}
 if(mode==='headings'){gridRows=rows.slice(0,1);gridColumns=Array.from({length:5},(_,i)=>({id:String(i),label:'Very long column heading '+(i+1)}));observations=gridColumns.map((c,i)=>({rowId:'a',columnId:c.id,value:i*20}));}
 if(mode==='decimal'||mode==='fraction'){gridRows=rows.slice(0,1);gridColumns=Array.from({length:6},(_,i)=>({id:String(i),label:String(i)}));domain=mode==='decimal'?[0.1,0.6]:[0,3];const values=mode==='decimal'?[0.1,0.2,0.3,0.4,0.5,0.6]:[0,0.6,1.2,1.8,2.4,3];observations=gridColumns.map((c,i)=>({rowId:'a',columnId:c.id,value:values[i]!}));}
 return <section data-violet id="violet-consumer" className="mx-auto w-full max-w-[660px] bg-[var(--nx-bg)]">
  <MeasurementLine data={readings} title="Daily readings" subtitle="Irregular observation intervals" unit="units" />
  <ComparisonBars data={categories} title="Group comparison" unit={mode==='large'?'kWh':undefined} />
  <ObservationMatrix data={observations} rows={gridRows} columns={gridColumns} domain={domain} title="Observation matrix" />
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
    { width: 320, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await root.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    const frame = await root.screenshot({
      path: path.join(evidence, `charts-${viewport.width}.png`),
    });
    const frameBounds = (await root.boundingBox())!;
    // Screenshot edges round outward independently at fractional positions.
    assert(
      frame.readUInt32BE(20) >= Math.floor(frameBounds.height) &&
        frame.readUInt32BE(20) <= Math.ceil(frameBounds.height) + 1,
      'The evidence frame must include the whole chart group',
    );
    const bounds = await root.evaluate((el) => ({
      client: el.clientWidth,
      scroll: el.scrollWidth,
    }));
    assert.equal(
      bounds.scroll,
      bounds.client,
      'Violet chart frame must contain responsive overflow',
    );
    measurements.push({
      viewport,
      bounds,
      screenshot: {
        width: frame.readUInt32BE(16),
        height: frame.readUInt32BE(20),
      },
    });
    await mode('long');
    await expect(bars).toContainText('An exceptionally long');
    const labels = await bars.locator('[title]').count();
    assert.equal(
      labels,
      0,
      'Full bar labels must wrap visibly rather than depend on title hints',
    );
    const wrappedLabels = await bars
      .locator('[data-nx-comparison-row]')
      .evaluateAll((rows) =>
        rows.map((row) => {
          const label = row.querySelector('[data-nx-comparison-label]')!;
          const box = row.getBoundingClientRect(),
            text = label.getBoundingClientRect();
          return {
            row: box.height,
            text: text.height,
            contained: text.top >= box.top && text.bottom <= box.bottom,
          };
        }),
      );
    assert.equal(wrappedLabels.length, 4);
    assert(
      wrappedLabels.every((label) => label.contained),
      'Wrapped labels must fit inside their own bar rows',
    );
    await expect
      .poll(() =>
        bars.evaluate((el) =>
          ['a', 'b'].every((id) => {
            const row = el
              .querySelector(`[data-nx-comparison-row="${id}"]`)!
              .getBoundingClientRect();
            const mark = el
              .querySelector(`[data-nx-comparison="${id}"]`)!
              .getBoundingClientRect();
            return (
              Math.abs(row.top + row.height / 2 - mark.top - mark.height / 2) <
              1
            );
          }),
        ),
      )
      .toBe(true);
    await mode('large');
    await expect(bars.locator('[data-nx-comparison-value="a"]')).toContainText(
      '1,234,567.89',
    );
    const numbers = await bars
      .locator('[data-nx-comparison-value]')
      .evaluateAll((nodes) =>
        nodes.map((el) => {
          const range = document.createRange();
          const text = document
            .createTreeWalker(el, NodeFilter.SHOW_TEXT)
            .nextNode()!;
          range.selectNodeContents(text);
          const lines = [
            ...new Set(
              [...range.getClientRects()].map((r) => Math.round(r.top)),
            ),
          ];
          const box = range.getBoundingClientRect(),
            column = el.getBoundingClientRect();
          return {
            text: el.textContent,
            lines: lines.length,
            width: range.getBoundingClientRect().width,
            column: column.width,
            contained: box.left >= column.left && box.right <= column.right,
          };
        }),
      );
    assert(
      numbers.every(
        (n) => n.lines === 1 && n.width <= n.column + 0.5 && n.contained,
      ),
      'Each formatted value must stay on one line inside the intrinsic value column',
    );
    await expect
      .poll(() =>
        bars.locator('.recharts-cartesian-axis-tick-value').allTextContents(),
      )
      .toContain('1.2M');
    const ticks = await bars
      .locator('.recharts-cartesian-axis-tick-value')
      .allTextContents();
    assert(
      ticks.includes('0') &&
        ticks.some((t) => /[KM]/.test(t)) &&
        !ticks.some((t) => /\d{6}/.test(t)),
      'Large magnitudes need compact axis labels',
    );
    await bars.screenshot({
      path: path.join(evidence, `large-bars-${viewport.width}.png`),
    });
    const scroller = bars.locator('.overflow-x-auto');
    await scroller.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await bars.screenshot({
      path: path.join(evidence, `large-bars-end-${viewport.width}.png`),
    });
    await scroller.evaluate((el) => (el.scrollLeft = 0));
    await mode('headings');
    await expect(
      matrix
        .locator('foreignObject')
        .filter({ hasText: 'Very long column heading' })
        .last(),
    ).toContainText('Very long column heading');
    const headings = await matrix
      .locator('foreignObject')
      .filter({ hasText: 'Very long column heading' })
      .evaluateAll((nodes) =>
        nodes.map((el) => {
          const box = el.getBoundingClientRect(),
            svg = el.closest('svg')!.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(el);
          const text = range.getBoundingClientRect();
          return {
            bottom: text.bottom - svg.top,
            svgHeight: svg.height,
            height: text.height,
            contained:
              text.bottom <= box.bottom + 0.5 &&
              text.bottom <= svg.bottom + 0.5,
          };
        }),
      );
    assert.equal(headings.length, 5);
    assert(
      headings.every((h) => h.contained && h.height > 15),
      'Two-line matrix headings must fit the SVG and their foreignObject',
    );
    await matrix.screenshot({
      path: path.join(evidence, `wrapped-matrix-${viewport.width}.png`),
    });
    measurements.push({ viewport, wrappedLabels, numbers, ticks, headings });
    await mode('normal');
  }
  const fills = [
    'rgb(244, 239, 255)',
    'rgb(217, 204, 242)',
    'rgb(167, 139, 250)',
    'rgb(111, 66, 193)',
    'rgb(45, 11, 140)',
    'rgb(45, 11, 140)',
  ];
  for (const boundary of ['decimal', 'fraction']) {
    await mode(boundary);
    await expect(matrix.locator('[data-nx-observation]')).toHaveCount(6);
    await expect
      .poll(() =>
        matrix
          .locator('[data-nx-observation] rect')
          .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).fill)),
      )
      .toEqual(fills);
  }
  await mode('normal');
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
  await primitive.evaluate((el) => {
    const group = document.createElement('div');
    group.dataset.violetClassOnlyGroup = '';
    group.style.cssText = 'display:flex;gap:16px;padding:16px;flex-wrap:wrap';
    for (const [kind, className] of [
      ['button', 'nx-btn nx-btn--solid'],
      ['confirm', 'nx-dialog__action nx-dialog__action--confirm'],
    ]) {
      const action = document.createElement('button');
      action.className = className!;
      action.textContent = `Class-only ${kind}`;
      action.dataset.violetClassOnly = kind;
      group.append(action);
    }
    el.append(group);
  });
  try {
    const actions = primitive.locator('[data-violet-class-only]');
    for (const action of await actions.all()) {
      await expect(action).toHaveCSS('background-color', 'rgb(111, 66, 193)');
      await expect(action).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(action).toHaveCSS('border-top-color', 'rgb(111, 66, 193)');
      await action.focus();
      await expect(action).toHaveCSS('outline-style', 'solid');
    }
    await primitive.locator('[data-violet-class-only-group]').screenshot({
      path: path.join(evidence, 'class-only-actions.png'),
    });
    const nativeButton = primitive.locator('[data-violet-class-only="button"]');
    await nativeButton.hover();
    await expect(nativeButton).toHaveCSS(
      'background-color',
      'rgb(45, 11, 140)',
    );
    await nativeButton.evaluate(
      (el) => ((el as HTMLButtonElement).disabled = true),
    );
    await expect(nativeButton).toHaveCSS(
      'background-color',
      'rgb(111, 66, 193)',
    );
  } finally {
    await primitive
      .locator('[data-violet-class-only-group]')
      .evaluateAll((nodes) => nodes.forEach((n) => n.remove()));
  }
  await writeFile(
    path.join(evidence, 'measurements.json'),
    JSON.stringify(measurements, null, 2),
  );
  console.log(
    `Violet Draft: numeric spacing, gaps, zero/missing readings, fixed color bounds, keyboard inspection, scoped paint, offline fonts, cut paint/focus and live reduced motion passed. Evidence: ${evidence}`,
  );
}
