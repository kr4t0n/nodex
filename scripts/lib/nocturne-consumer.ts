import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const NOCTURNE_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { NocturneBars, type NocturneBarsDatum } from './components/nodex/nocturne-bars/component';
import { NocturneLine, type NocturneLineSeries } from './components/nodex/nocturne-line/component';
import { NocturneRing } from './components/nodex/nocturne-ring/component';

type Mode = 'normal' | 'partial' | 'last-missing' | 'zero' | 'single' | 'empty' | 'invalid' | 'duplicates' | 'ties' | 'many' | 'many-series' | 'long-readings' | 'overflow' | 'bad-x';
declare global { interface Window { nodexNocturne: { setMode: (mode: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }
export function NocturneConsumer() {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { window.nodexNocturne = { setMode, setRevision, setAnimate }; }, []);
  const normal: NocturneBarsDatum[] = [{ id: 'a', label: 'Same', value: 40 }, { id: 'b', label: 'Same', value: 30 }, { id: 'c', label: 'Gamma', value: 20 }, { id: 'd', label: 'Delta', value: 10 }];
  const data: NocturneBarsDatum[] = mode === 'empty' ? []
    : mode === 'single' ? [{ id: 'a', label: 'Only', value: 3 }]
    : mode === 'zero' ? [{ id: 'a', label: 'Zero', value: 0 }]
    : mode === 'invalid' ? [{ id: 'nan', label: 'NaN', value: NaN }, { id: 'infinite', label: 'Infinite', value: Infinity }, { id: 'negative', label: 'Negative', value: -1 }]
    : mode === 'duplicates' ? [{ id: 'a', label: 'First', value: 2 }, { id: 'a', label: 'Second', value: 3 }]
    : mode === 'partial' ? [{ id: 'a', label: 'Present', value: 40 }, { id: 'b', label: 'Missing', value: null }, { id: 'c', label: 'Zero', value: 0 }, { id: 'd', label: 'End', value: 10 }]
    : mode === 'last-missing' ? [...normal.slice(0, 3), { id: 'd', label: 'Delta', value: null }]
    : mode === 'ties' ? [{ id: 'c', label: 'First tie', value: 20 }, { id: 'b', label: 'Unavailable', value: null }, { id: 'a', label: 'Second tie', value: 20 }]
    : mode === 'many' ? Array.from({ length: 18 }, (_, i) => ({ id: String(i), label: 'Long category name ' + i, value: i + 1 }))
    : revision ? normal.toReversed().map(datum => ({ ...datum, value: datum.id === 'a' ? 5 : datum.id === 'b' ? 45 : datum.value })) : normal;
  const series: NocturneLineSeries[] = mode === 'many-series'
    ? Array.from({ length: 12 }, (_, index) => ({ id: 'series' + index, label: 'WWWWWWWWWWWWWWWW ' + index }))
    : [{ id: 'main', label: 'Main', tone: 'a' }, { id: 'other', label: 'Other' }];
  const trend = data.map((point, i) => ({ id: point.id, label: point.label, x: mode === 'bad-x' ? 1 : i * (i + 1) / 2,
    values: Object.fromEntries(series.map((item, index) => [item.id, mode === 'invalid' ? null : mode === 'many-series' ? 30 + index / 10 : index === 0 ? point.value : mode === 'zero' ? 0 : point.value === null ? 15 : point.value / 2 - 10])) }));
  const format = (value: number) => mode === 'long-readings' ? value + ' extremely long formatted units' : '$' + value;
  return <div data-nocturne>
    <div id="nocturne-primary" className="w-[720px]">
      <NocturneBars data={data} unitLabel="Hours" valueFormatter={format} animate={animate} />
      <NocturneLine data={trend} series={revision ? series.toReversed() : series} unitLabel="Sessions" valueFormatter={format} animate={animate} />
      <NocturneRing data={mode === 'overflow' ? [{ id: 'huge', label: 'Huge', value: Number.MAX_VALUE }, { id: 'huge2', label: 'Huge 2', value: Number.MAX_VALUE }] : data.map(point => ({ ...point, tone: point.id === 'a' ? 'a' as const : undefined }))} unitLabel="Hours" valueFormatter={format} animate={animate} />
    </div>
    <div id="nocturne-secondary" className="w-[620px]">
      <NocturneBars data={normal} animate={false} />
      <NocturneLine data={normal.map((point, x) => ({ ...point, x, values: { main: point.value } }))} series={[{ id: 'main', label: 'Main', tone: 'a' }]} animate={false} />
      <NocturneRing data={normal} animate={false} />
    </div>
  </div>;
}
`;

export const NOCTURNE_SLUGS = ['nocturne-bars', 'nocturne-line', 'nocturne-ring'];
const chart = (page: Page, slug: string) => page.locator('#nocturne-primary [data-nx-chart="' + slug + '"]');
const mode = (page: Page, value: string) => page.evaluate(value => (window as unknown as { nodexNocturne: { setMode: (mode: string) => void } }).nodexNocturne.setMode(value), value);
const revision = (page: Page, value: boolean) => page.evaluate(value => (window as unknown as { nodexNocturne: { setRevision: (value: boolean) => void } }).nodexNocturne.setRevision(value), value);

async function paints(page: Page, scope = 'primary') {
  return page.locator('#nocturne-' + scope + ' [data-nx-nocturne-slice]').evaluateAll(elements =>
    Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-nocturne-slice'), getComputedStyle(element).fill])));
}

export async function checkNocturneConsumer(page: Page): Promise<void> {
  const bars = chart(page, 'nocturne-bars'); const line = chart(page, 'nocturne-line');
  const ring = chart(page, 'nocturne-ring');
  await expect(bars.locator('[data-nx-nocturne-bar]')).toHaveCount(4);
  await expect(line.locator('[data-nx-nocturne-point]')).toHaveCount(8);
  await expect(line.locator('[data-nx-nocturne-latest="main"]')).toHaveText('$10');
  await expect(line.locator('[data-nx-nocturne-latest="other"]')).toHaveText('$-5');
  await expect(ring.locator('[data-nx-nocturne-total]')).toHaveText('$100');
  const rectangles = await bars.locator('[data-nx-nocturne-bar]').evaluateAll(elements => elements.map(element => {
    const bounds = (element as SVGGraphicsElement).getBBox(); return { width: bounds.width, x: bounds.x };
  }));
  assert(Math.abs(rectangles[0]!.width / rectangles[3]!.width - 4) < 0.001, 'Bar length must encode exact magnitude');
  assert(rectangles.every(rect => Math.abs(rect.x - rectangles[0]!.x) < 0.001), 'Ranked bars must share zero');
  const xs = await line.locator('[data-nx-nocturne-point][data-nx-series="main"]').evaluateAll(elements => elements.map(element => Number(element.getAttribute('cx'))));
  assert(Math.abs((xs[2]! - xs[0]!) / (xs[1]! - xs[0]!) - 3) < 0.001, 'Numeric intervals must not become equal spacing');
  const curves = await line.locator('.recharts-line-curve').evaluateAll(elements => elements.map(element => element.getAttribute('d')!));
  assert(curves.every(d => d.includes('L') && !/[CQ]/.test(d)), 'Series must use straight native segments');
  const angles = await ring.locator('[data-nx-nocturne-slice]').evaluateAll(elements => elements.map(element => Math.abs(Number(element.getAttribute('data-nx-start')) - Number(element.getAttribute('data-nx-end')))));
  assert.deepEqual(angles.map(Math.round), [144, 108, 72, 36], 'Allocation angles must be exact');

  for (const [node, first, second, key] of [
    [bars, 'Same$40 Hours', 'Same$30 Hours', 'ArrowLeft'],
    [line, 'SameMain: $40 SessionsOther: $10 Sessions', 'SameMain: $30 SessionsOther: $5 Sessions', 'ArrowRight'],
    [ring, 'Same$40 · 40%', 'Same$30 · 30%', 'ArrowRight'],
  ] as const) {
    await node.scrollIntoViewIfNeeded(); await page.mouse.move(880, 10);
    await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(first);
    await page.keyboard.press(key);
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(second);
  }
  await expect(page.locator('#nocturne-secondary .recharts-tooltip-wrapper:visible')).toHaveCount(0);
  await bars.locator('[data-nx-nocturne-bar="a"]').hover();
  await expect(bars.locator('.recharts-tooltip-wrapper:visible')).toHaveText('Same$40 Hours');

  const sibling = await paints(page, 'secondary');
  await page.locator('#nocturne-primary').evaluate(element => {
    const style = (element as HTMLElement).style;
    style.setProperty('--nx-seriesA', '#923b61'); style.setProperty('--nx-radius-bar', '5px');
  });
  for (const mark of [bars.locator('[data-nx-nocturne-bar="a"]'), ring.locator('[data-nx-nocturne-slice="a"]')]) {
    await expect(mark).toHaveCSS('fill', 'rgb(146, 59, 97)');
  }
  await expect(line.locator('.recharts-line-curve').first()).toHaveCSS('stroke', 'rgb(146, 59, 97)');
  await expect(bars.locator('[data-nx-nocturne-bar="a"]')).toHaveCSS('rx', '5px');
  assert.deepEqual(await paints(page, 'secondary'), sibling, 'Descendant paint overrides must stay local');
  await page.locator('#nocturne-primary').evaluate(element => element.removeAttribute('style'));
  const identities = await paints(page);
  await revision(page, true);
  await expect(ring.locator('[data-nx-nocturne-total]')).toHaveText('$80');
  await expect(line.locator('[data-nx-nocturne-latest="main"]')).toHaveText('$5');
  assert.deepEqual(await paints(page), identities, 'Category identity must survive reorder and value changes');
  assert.deepEqual(await bars.locator('[data-nx-nocturne-row]').evaluateAll(elements => elements.map(element => element.getAttribute('data-nx-nocturne-row'))), ['b', 'c', 'd', 'a'], 'Rank updates must follow values');
  await revision(page, false);
  await mode(page, 'partial');
  await expect(bars.locator('[data-nx-nocturne-reading]')).toHaveText(['$40', '$10', '$0', '—']);
  await expect(bars.locator('[data-nx-nocturne-bar]')).toHaveCount(2);
  await expect.poll(() => line.locator('.recharts-line-curve').first().getAttribute('d').then(d => (d?.match(/M/g) ?? []).length)).toBe(2);
  await expect.poll(() => line.locator('.recharts-line-curve').last().getAttribute('d').then(d => (d?.match(/M/g) ?? []).length)).toBe(1);
  await expect(ring.locator('[data-nx-nocturne-slice]')).toHaveCount(0);
  await expect(ring.getByRole('status')).toHaveText('A complete allocation is required.');
  await mode(page, 'last-missing');
  await expect(line.locator('[data-nx-nocturne-latest="main"]')).toHaveText('—');
  await expect(line.locator('[data-nx-nocturne-end="main"]')).toHaveCount(0);
  await mode(page, 'ties');
  await expect(bars.locator('[data-nx-nocturne-reading]')).toHaveText(['$20', '$20', '—']);
  assert.deepEqual(await bars.locator('[data-nx-nocturne-row]').evaluateAll(elements => elements.map(element => element.getAttribute('data-nx-nocturne-row'))), ['c', 'a', 'b'], 'Ties retain caller order, unavailable comes last');
  await mode(page, 'zero');
  await expect(bars.locator('[data-nx-nocturne-bar]')).toHaveCount(0);
  await expect(bars.locator('[data-nx-nocturne-reading]')).toHaveText('$0');
  await expect(line.locator('[data-nx-nocturne-point]')).toHaveCount(2);
  await expect(ring.locator('[data-nx-nocturne-slice]')).toHaveCount(0);
  await expect(ring.locator('[data-nx-nocturne-key]')).toContainText('$0');
  await mode(page, 'single');
  await expect(bars.locator('[data-nx-nocturne-bar]')).toHaveCount(1);
  await expect(ring.locator('[data-nx-nocturne-slice]')).toHaveCount(1);
  await expect(line.locator('[data-nx-nocturne-point]')).toHaveCount(2);

  for (const value of ['empty', 'invalid', 'duplicates']) {
    await mode(page, value);
    for (const slug of NOCTURNE_SLUGS) await expect(chart(page, slug).getByRole('status').first()).toBeAttached();
    await expect(bars.locator('[data-nx-nocturne-bar]')).toHaveCount(0);
    await expect(line.locator('[data-nx-nocturne-point]')).toHaveCount(0);
    await expect(ring.locator('[data-nx-nocturne-slice]')).toHaveCount(0);
  }
  for (const [value, slug, message] of [
    ['overflow', 'nocturne-ring', 'A complete allocation is required.'],
    ['bad-x', 'nocturne-line', 'X coordinates must be finite and strictly increasing.'],
  ] as const) {
    await mode(page, value); await expect(chart(page, slug).getByRole('status')).toHaveText(message);
  }
  await mode(page, 'long-readings');
  for (const reading of [bars.locator('[data-nx-nocturne-reading="a"]'), ring.locator('[data-nx-nocturne-total]')]) {
    await expect(reading).toContainText('extremely long formatted units');
    assert(await reading.evaluate(element => getComputedStyle(element).textOverflow === 'ellipsis'
      && element.scrollWidth > element.clientWidth && element.getAttribute('title') === element.textContent), 'Long numeric readings must show an ellipsis, never a clipped misleading suffix');
  }
  await mode(page, 'many-series');
  await expect(line.locator('[data-nx-nocturne-end]')).toHaveCount(12);
  const labels = await line.locator('[data-nx-nocturne-end-label]').evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect(); return { top: bounds.top, bottom: bounds.bottom };
  }).sort((a, b) => a.top - b.top));
  assert(labels.every((label, index) => index === 0 || label.top >= labels[index - 1]!.bottom), 'Endpoint labels must not overlap');
  assert(await line.locator('[data-nx-nocturne-end-label]').evaluateAll(elements => elements.every(element =>
    getComputedStyle(element).textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth && element.getAttribute('title') === element.textContent)), 'Long endpoint names must visibly truncate and retain their full label');
  await mode(page, 'many');
  await page.locator('#nocturne-primary').evaluate(element => (element as HTMLElement).style.width = '280px');
  await expect(bars.locator('[data-nx-nocturne-bar]')).toHaveCount(18);
  for (const slug of NOCTURNE_SLUGS) {
    assert(await chart(page, slug).evaluate(element => element.scrollWidth <= element.clientWidth + 1), slug + ': narrow overflow must remain inside the chart');
  }
  for (const node of [bars, line]) {
    assert(await node.evaluate(element => [...element.querySelectorAll('div')].some(child => ['auto', 'scroll'].includes(getComputedStyle(child).overflowX) && child.scrollWidth > child.clientWidth)), 'Dense plots must scroll locally');
  }
  await page.locator('#nocturne-primary').evaluate(element => element.removeAttribute('style'));
  await mode(page, 'normal');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => (window as unknown as { nodexNocturne: { setAnimate: (value: boolean) => void } }).nodexNocturne.setAnimate(true));
  for (const slug of NOCTURNE_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await page.locator('#nocturne-primary').evaluate(element => (element as HTMLElement).style.setProperty('--nx-motion-draw-duration', '0s'));
  for (const slug of NOCTURNE_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await page.locator('#nocturne-primary').evaluate(element => element.removeAttribute('style'));
  for (const slug of NOCTURNE_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of NOCTURNE_SLUGS) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  assert.equal(await page.locator('#nocturne-primary svg').evaluateAll(elements => elements.some(element => /(?:NaN|Infinity)/.test(element.innerHTML))), false, 'Native geometry must remain finite');
  console.log('Validated Nocturne: ranking, signed numeric time, exact allocation, endpoint labels, native inspection, stable identity, scoped tokens, narrow layouts and reduced motion.');
}
