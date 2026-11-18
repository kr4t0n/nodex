import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const VIOLET_CONSUMER_SOURCE = `import {useEffect,useState} from 'react';
import {MeasurementLine} from './components/nodex/measurement-line/component';
import {ComparisonBars} from './components/nodex/comparison-bars/component';
import {ObservationMatrix} from './components/nodex/observation-matrix/component';
type Mode='normal'|'empty'|'zero'|'missing'|'invalid'|'single'|'long'|'large'|'billions'|'ticks'|'headings'|'decimal'|'fraction';
declare global {interface Window {nodexViolet:{setMode:(v:Mode)=>void;setMaximum:(v:number)=>void}}}
const line=[{id:'a',label:'Start',x:0,value:0},{id:'b',label:'Second',x:1,value:10},{id:'c',label:'Missing',x:4,value:null},{id:'d',label:'Last',x:6,value:20}];
const bars=[{id:'a',label:'Aster',value:40},{id:'b',label:'Birch',value:20},{id:'c',label:'Zero',value:0},{id:'d',label:'Missing',value:null}];
const rows=[{id:'a',label:'Aster'},{id:'b',label:'Birch'}],columns=[{id:'x',label:'01'},{id:'y',label:'02'},{id:'z',label:'03'}];
const matrix=[{rowId:'a',columnId:'x',value:0},{rowId:'a',columnId:'y',value:null},{rowId:'a',columnId:'z',value:100},{rowId:'b',columnId:'x',value:40},{rowId:'b',columnId:'y',value:NaN},{rowId:'b',columnId:'z',value:Infinity}];
export function VioletConsumer(){
 const [mode,setMode]=useState<Mode>('normal'),[maximum,setMaximum]=useState(40);useEffect(()=>{window.nodexViolet={setMode,setMaximum};},[]);
 let readings=line.map(d=>({...d})),categories=bars.map(d=>({...d})),observations=matrix.map(d=>({...d}));
 let gridRows=rows,gridColumns=columns,domain:[number,number]=[0,100];
 if(mode==='empty'){readings=[];categories=[];observations=[];}
 if(mode==='zero'){readings=readings.map(d=>({...d,value:0}));categories=categories.map(d=>({...d,value:0}));observations=observations.map(d=>({...d,value:0}));}
 if(mode==='missing'){readings=readings.map(d=>({...d,value:NaN}));categories=categories.map(d=>({...d,value:NaN}));}
 if(mode==='single'){readings=readings.slice(0,1);categories=categories.slice(0,1);}
 if(mode==='invalid'){readings[1]!.x=0;categories[1]!.value=-1;observations[0]!.value=101;}
 if(mode==='long'){categories[0]!.label='Aster Birch Cedar Delta Ember Fjord Grove Hazel';categories[1]!.label='An exceptionally long unbroken label WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW';}
 if(mode==='large'){categories=categories.map((d,i)=>({...d,value:[1234567.891,98765.4,123456,1234.5][i]!}));}
 if(mode==='billions'){categories=categories.map((d,i)=>({...d,value:[9900000000,6600000000,3300000000,0][i]!}));}
 if(mode==='ticks'){categories=categories.map((d,i)=>({...d,value:maximum*[1,0.66,0.33,0][i]!}));}
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

/** Isolated so the same assertions can run against a built base fixture. */
export async function checkVioletSizing(page: Page, evidence: string) {
  const root = page.locator('#violet-consumer');
  const bars = root.locator('[data-nx-chart="comparison-bars"]');
  const measurements = [];
  const failures: string[] = [];
  // Match the native gallery specimen width. The full consumer page has its
  // own 16px gutters, which otherwise turn a 320px specimen into 288px.
  const originalWidth = await root.evaluate((el) => {
    const node = el as HTMLElement;
    const width = node.style.width;
    node.style.width = 'min(660px, 100vw)';
    return width;
  });
  try {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() =>
        (
          window as unknown as { nodexViolet: { setMode: (v: string) => void } }
        ).nodexViolet.setMode('normal'),
      );
      await expect(bars.locator('[data-nx-comparison-value="a"]')).toHaveText(
        '40',
      );
      await root.screenshot({
        path: path.join(evidence, `sizing-${width}.png`),
      });
      assert.equal(
        await root.evaluate((el) => el.clientWidth),
        Math.min(width, 660),
      );
      const regions = await root
        .locator('[data-nx-chart]')
        .evaluateAll((charts) =>
          charts.map((chart) => {
            // The line has no scroller; measure its plot region as well.
            const region =
              chart.querySelector('.overflow-x-auto') ??
              chart.querySelector('.recharts-responsive-container')!
                .parentElement!;
            return {
              chart: chart.getAttribute('data-nx-chart'),
              client: region.clientWidth,
              scroll: region.scrollWidth,
            };
          }),
        );
      for (const region of regions) {
        if (region.scroll !== region.client)
          failures.push(
            `${width}px ${region.chart}: fitting data scrollWidth ${region.scroll} != clientWidth ${region.client}`,
          );
      }
      await page.evaluate(() =>
        (
          window as unknown as { nodexViolet: { setMode: (v: string) => void } }
        ).nodexViolet.setMode('billions'),
      );
      await expect(bars.locator('[data-nx-comparison-value="a"]')).toHaveText(
        '9,900,000,000',
      );
      await expect
        .poll(() =>
          bars.locator('.recharts-cartesian-axis-tick-value').allTextContents(),
        )
        .toContain('9.9B');
      const scroller = bars.locator('.overflow-x-auto');
      await scroller.evaluate((el) => (el.scrollLeft = el.scrollWidth));
      await bars.screenshot({
        path: path.join(evidence, `billions-${width}.png`),
      });
      const ticks = await bars
        .locator('.recharts-cartesian-axis-tick-value')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const box = node.getBoundingClientRect(),
              svg = node.closest('svg')!.getBoundingClientRect();
            return {
              text: node.textContent,
              left: box.left,
              right: box.right,
              svgLeft: svg.left,
              svgRight: svg.right,
            };
          }),
        );
      assert(
        ticks.length >= 2,
        'Billion-scale bars must retain start and end ticks',
      );
      for (const tick of ticks) {
        if (tick.left < tick.svgLeft || tick.right > tick.svgRight)
          failures.push(
            `${width}px tick ${tick.text}: box [${tick.left}, ${tick.right}] outside SVG [${tick.svgLeft}, ${tick.svgRight}]`,
          );
      }
      const wide = await scroller.evaluate((el) => ({
        client: el.clientWidth,
        scroll: el.scrollWidth,
      }));
      if (width === 320)
        assert(
          wide.scroll > wide.client,
          'Intrinsic long values must retain local scrolling',
        );
      measurements.push({ width, regions, ticks, wide });
      await scroller.evaluate((el) => (el.scrollLeft = 0));
    }
  } finally {
    await root.evaluate(
      (el, width) => ((el as HTMLElement).style.width = width),
      originalWidth,
    );
  }

  await page.evaluate(() =>
    (
      window as unknown as { nodexViolet: { setMode: (v: string) => void } }
    ).nodexViolet.setMode('normal'),
  );
  await writeFile(
    path.join(evidence, 'sizing.json'),
    JSON.stringify(measurements, null, 2),
  );
  console.log(`Violet sizing evidence: ${evidence}`);
  assert.deepEqual(
    failures,
    [],
    'Violet fitting data and tick labels must remain inside their regions',
  );
}

/** A fresh document per host font avoids Recharts' shared text-width cache. */
export async function checkVioletTickSpacing(page: Page, evidence: string) {
  const measurements = [];
  const failures: string[] = [];
  for (const font of [
    'sans-serif',
    'serif',
    '"Liberation Sans Narrow", sans-serif',
  ]) {
    const probe = await page.context().newPage();
    const url = page.url();
    try {
      await probe.route(url, async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          body: (await response.text()).replace(
            '</head>',
            `<style>body { font-family: ${font}; }</style></head>`,
          ),
        });
      });
      await probe.setViewportSize({ width: 1440, height: 1000 });
      await probe.goto(url);
      const root = probe.locator('#violet-consumer');
      const bars = root.locator('[data-nx-chart="comparison-bars"]');
      await expect(bars.locator('[data-nx-comparison]')).not.toHaveCount(0);
      await probe.evaluate(() => document.fonts.ready);
      await expect(probe.locator('body')).toHaveCSS('font-family', font);
      await probe.mouse.move(0, 0);
      for (const maximum of [
        0.000000044, 0.000044, 0.0012, 0.01, 0.0123, 0.013, 0.024, 0.044, 0.05,
        0.066, 0.099, 0.1, 0.13, 0.24, 0.3, 0.30001, 0.33, 0.5, 0.66, 84,
        999900, 1234567.891, 2.4e9, 9.9e9, 777.7e9, 2.4e12, 555.5e12, 9.99e15,
      ]) {
        await probe.evaluate((maximum) => {
          const fixture = (
            window as unknown as {
              nodexViolet: {
                setMode: (v: string) => void;
                setMaximum: (v: number) => void;
              };
            }
          ).nodexViolet;
          fixture.setMaximum(maximum);
          fixture.setMode('ticks');
        }, maximum);
        await expect(bars.locator('[data-nx-comparison-value="a"]')).toHaveText(
          new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
            maximum,
          ),
        );
        for (const width of [
          300, 320, 333.5, 348, 384, 387.25, 388, 390, 480, 660,
        ]) {
          await root.evaluate(
            (el, width) => ((el as HTMLElement).style.width = `${width}px`),
            width,
          );
          await probe.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
          const ticks = await bars
            .locator(
              '.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value',
            )
            .evaluateAll((nodes) =>
              nodes.map((node) => {
                const box = node.getBoundingClientRect(),
                  svg = node.closest('svg')!.getBoundingClientRect();
                return {
                  text: node.textContent,
                  left: box.left - svg.left,
                  right: box.right - svg.left,
                  svgWidth: svg.width,
                };
              }),
            );
          assert(
            ticks.length >= 2,
            'Start and end tick labels must remain visible',
          );
          assert.equal(ticks[0]!.text, '0');
          const labels = ticks.map((tick) => tick.text);
          if (new Set(labels).size !== labels.length)
            failures.push(
              `${font}, max ${maximum}, frame ${width}px: repeated tick labels ${labels.join(' / ')}`,
            );
          const expectedEnd = new Map([
            [0.000000044, '4.4E-8'],
            [0.000044, '4.4E-5'],
            [0.01, '0.01'],
            [0.044, '0.044'],
            [0.1, '0.1'],
            [0.24, '0.24'],
            [0.30001, '0.3'],
            [84, '84'],
            [1234567.891, '1.2M'],
          ]).get(maximum);
          if (expectedEnd && labels.at(-1) !== expectedEnd)
            failures.push(
              `${font}, max ${maximum}: expected end label ${expectedEnd}, got ${labels.at(-1)}`,
            );
          assert.equal(ticks.at(-1)!.right, ticks.at(-1)!.svgWidth);
          assert(
            ticks.every(
              (tick) => tick.left >= 0 && tick.right <= tick.svgWidth,
            ),
            'Tick labels must remain inside the SVG',
          );
          const gaps = ticks
            .slice(1)
            .map((tick, index) => tick.left - ticks[index]!.right);
          if (gaps.some((gap) => gap < 2))
            failures.push(
              `${font}, max ${maximum}, frame ${width}px: neighbouring tick gap ${Math.min(...gaps).toFixed(3)}px < 2px`,
            );
          measurements.push({ font, maximum, width, ticks, gaps });
          if (
            (font === 'sans-serif' && maximum === 0.5 && width === 348) ||
            (font === 'serif' && maximum === 2.4e9 && width === 300)
          )
            await bars.screenshot({
              path: path.join(evidence, `tick-spacing-${font}.png`),
            });
          if (
            font === 'sans-serif' &&
            maximum === 0.044 &&
            [320, 660].includes(width)
          )
            await bars.screenshot({
              path: path.join(evidence, `tick-labels-${width}.png`),
            });
        }
      }
    } finally {
      await probe.close();
    }
  }
  await writeFile(
    path.join(evidence, 'tick-spacing.json'),
    JSON.stringify(measurements, null, 2),
  );
  console.log(`Violet neighbouring tick evidence: ${evidence}`);
  assert.deepEqual(
    failures,
    [],
    'Violet ticks must be distinct and separated across host fonts',
  );
}

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
  await checkVioletSizing(page, evidence);
  await checkVioletTickSpacing(page, evidence);
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
    if (viewport.width === 1440)
      assert.deepEqual(ticks, ['0', '450K', '900K', '1.2M']);
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
    const dense = await matrix.locator('.overflow-x-auto').evaluate((el) => ({
      client: el.clientWidth,
      scroll: el.scrollWidth,
    }));
    assert(
      dense.scroll > dense.client,
      'Wide matrix columns must retain local scrolling',
    );
    assert.equal(
      await root.evaluate((el) => el.scrollWidth - el.clientWidth),
      0,
    );
    await matrix.screenshot({
      path: path.join(evidence, `wrapped-matrix-${viewport.width}.png`),
    });
    measurements.push({
      viewport,
      wrappedLabels,
      numbers,
      ticks,
      headings,
      dense,
    });
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
