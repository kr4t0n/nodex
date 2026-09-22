import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const SOFT_STUDIO_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { SoftBars, type SoftBarsDatum } from './components/nodex/soft-bars/component';
import { SoftArea } from './components/nodex/soft-area/component';
import { SoftDonut } from './components/nodex/soft-donut/component';
import { SoftHeatmap } from './components/nodex/soft-heatmap/component';

type Mode = 'normal' | 'partial' | 'last-missing' | 'zero' | 'single' | 'empty' | 'invalid' | 'duplicates' | 'many' | 'overflow' | 'bad-x' | 'bad-maximum' | 'unknown-cell' | 'missing-cells';
declare global { interface Window { nodexStudio: { setMode: (mode: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }
export function SoftStudioConsumer() {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { window.nodexStudio = { setMode, setRevision, setAnimate }; }, []);
  const normal: SoftBarsDatum[] = [{ id: 'a', label: 'Same', value: 40, tone: 'a' }, { id: 'b', label: 'Same', value: 30 }, { id: 'c', label: 'Gamma', value: 20 }, { id: 'd', label: 'Delta', value: 10 }];
  const data: SoftBarsDatum[] = mode === 'empty' ? []
    : mode === 'single' ? [{ id: 'only', label: 'Only', value: 3 }]
    : mode === 'zero' ? [{ id: 'zero', label: 'Zero', value: 0 }]
    : mode === 'invalid' ? [{ id: 'nan', label: 'NaN', value: NaN }, { id: 'infinite', label: 'Infinite', value: Infinity }, { id: 'negative', label: 'Negative', value: -1 }]
    : mode === 'duplicates' ? [{ id: 'a', label: 'First', value: 2 }, { id: 'a', label: 'Second', value: 3 }]
    : mode === 'partial' ? [{ id: 'a', label: 'Present', value: 40 }, { id: 'b', label: 'Missing', value: null }, { id: 'c', label: 'Zero', value: 0 }, { id: 'd', label: 'End', value: 10 }]
    : mode === 'last-missing' ? [...normal.slice(0, 3), { id: 'd', label: 'Delta', value: null }]
    : mode === 'many' ? Array.from({ length: 18 }, (_, i) => ({ id: String(i), label: 'Item ' + i, value: i + 1 }))
    : revision ? normal.toReversed() : normal;
  const rows = [{ id: 'row1', label: 'Focus' }, { id: 'row2', label: 'Learn' }];
  const columns = mode === 'many' ? Array.from({ length: 18 }, (_, i) => ({ id: String(i), label: 'D' + i })) : [{ id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }];
  const cells = mode === 'missing-cells' ? [] : rows.flatMap((row, y) => columns.map((column, x) => ({ rowId: row.id, columnId: column.id, value: mode === 'zero' ? 0 : mode === 'invalid' ? NaN : y === 0 ? x === 0 ? 40 : 0 : x === 0 ? null : revision ? 80 : 100 })));
  if (mode === 'duplicates') cells.push(cells[0]!);
  if (mode === 'unknown-cell') cells.push({ rowId: 'absent', columnId: 'mon', value: 3 });
  const format = (value: number) => '$' + value;
  return <div data-studio>
    <div id="studio-primary" className="w-[720px]">
      <SoftBars data={data} unitLabel="Hours" valueFormatter={format} animate={animate} />
      <SoftArea data={data.map((point, i) => ({ ...point, x: mode === 'bad-x' ? 1 : i * (i + 1) / 2 }))} unitLabel="Sessions" valueFormatter={format} animate={animate} />
      <SoftDonut data={mode === 'overflow' ? [{ id: 'huge', label: 'Huge', value: Number.MAX_VALUE }, { id: 'huge2', label: 'Huge 2', value: Number.MAX_VALUE }] : data} unitLabel="Hours" valueFormatter={format} animate={animate} />
      <SoftHeatmap data={mode === 'empty' ? [] : cells} rows={mode === 'empty' ? [] : rows} columns={columns} maxValue={mode === 'bad-maximum' ? 0 : 100} unitLabel="Minutes" animate={animate} />
    </div>
    <div id="studio-secondary" className="w-[620px]">
      <SoftBars data={normal} animate={false} />
      <SoftArea data={normal.map((point, x) => ({ ...point, x }))} animate={false} />
      <SoftDonut data={normal} animate={false} />
      <SoftHeatmap data={[{ rowId: 'row1', columnId: 'mon', value: 40 }]} rows={rows} columns={[{ id: 'mon', label: 'Mon' }]} maxValue={100} animate={false} />
    </div>
  </div>;
}
`;

const slugs = ['soft-bars', 'soft-area', 'soft-donut', 'soft-heatmap'];
const chart = (page: Page, slug: string) => page.locator(`#studio-primary [data-nx-chart="${slug}"]`);
const mode = (page: Page, value: string) => page.evaluate(value => (window as unknown as { nodexStudio: { setMode: (mode: string) => void } }).nodexStudio.setMode(value), value);

async function categoryPaints(page: Page, scope = 'primary') {
  return page.locator(`#studio-${scope} [data-nx-soft-slice]`).evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-soft-slice'), getComputedStyle(element).fill])));
}

export async function checkSoftStudioConsumer(page: Page): Promise<void> {
  const bars = chart(page, 'soft-bars'); const area = chart(page, 'soft-area');
  const donut = chart(page, 'soft-donut'); const heat = chart(page, 'soft-heatmap');
  await expect(bars.locator('[data-nx-soft-bar]')).toHaveCount(4);
  await expect(area.locator('[data-nx-soft-point]')).toHaveCount(4);
  await expect(area.locator('[data-nx-soft-latest]')).toHaveText('$10');
  await expect(donut.locator('[data-nx-soft-total]')).toHaveText('$100');
  await expect(heat.locator('[data-nx-soft-cell]')).toHaveCount(4);
  const rectangles = await bars.locator('[data-nx-soft-bar]').evaluateAll(elements => elements.map(element => {
    const bounds = (element as SVGGraphicsElement).getBBox(); return { height: bounds.height, bottom: bounds.y + bounds.height };
  }));
  assert(Math.abs(rectangles[0]!.height / rectangles[3]!.height - 4) < 0.001, 'Rounding must retain exact bar heights');
  assert(rectangles.every(rect => Math.abs(rect.bottom - rectangles[0]!.bottom) < 0.001), 'Bars must share zero');
  await expect(bars.locator('[data-nx-soft-bar]').first()).toHaveCSS('rx', '10px');
  const xs = await area.locator('[data-nx-soft-point]').evaluateAll(elements => elements.map(element => Number(element.getAttribute('cx'))));
  assert(Math.abs((xs[2]! - xs[0]!) / (xs[1]! - xs[0]!) - 3) < 0.001, 'Numeric intervals must not become equal category spacing');
  const angles = await donut.locator('[data-nx-soft-slice]').evaluateAll(elements => elements.map(element => Math.abs(Number(element.getAttribute('data-nx-start')) - Number(element.getAttribute('data-nx-end')))));
  assert.deepEqual(angles.map(Math.round), [144, 108, 72, 36], 'Sector angles must be exact');
  await expect(heat.locator('[data-nx-soft-intensity]').first()).toHaveAttribute('fill-opacity', '0.4');

  for (const [node, first, second] of [
    [bars, 'Same$40 Hours', 'Same$30 Hours'],
    [area, 'Same$40 Sessions', 'Same$30 Sessions'],
    [donut, 'Same$40 · 40%', 'Same$30 · 30%'],
    [heat, 'Focus · Mon40 Minutes', 'Focus · Tue0 Minutes'],
  ] as const) {
    await node.scrollIntoViewIfNeeded(); await page.mouse.move(880, 10);
    await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(first);
    await page.keyboard.press('ArrowRight');
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(second);
  }
  await expect(page.locator('#studio-secondary .recharts-tooltip-wrapper:visible')).toHaveCount(0);
  await bars.locator('[data-nx-soft-bar="a"]').hover();
  await expect(bars.locator('.recharts-tooltip-wrapper:visible')).toHaveText('Same$40 Hours');

  const sibling = await categoryPaints(page, 'secondary');
  await page.locator('#studio-primary').evaluate(element => {
    const style = (element as HTMLElement).style;
    for (const name of ['--nx-seriesA', '--nx-trendLine', '--nx-trendFill', '--nx-heatFill']) style.setProperty(name, '#923b61');
    style.setProperty('--nx-radius-bar', '14px');
  });
  for (const mark of [bars.locator('[data-nx-soft-bar="a"]'), donut.locator('[data-nx-soft-slice="a"]'), area.locator('.recharts-area-area'), heat.locator('[data-nx-soft-intensity]').first()]) {
    await expect(mark).toHaveCSS('fill', 'rgb(146, 59, 97)');
  }
  await expect(area.locator('.recharts-area-curve')).toHaveCSS('stroke', 'rgb(146, 59, 97)');
  await expect(bars.locator('[data-nx-soft-bar="a"]')).toHaveCSS('rx', '14px');
  assert.deepEqual(await categoryPaints(page, 'secondary'), sibling, 'Scoped paint must not leak');
  await page.locator('#studio-primary').evaluate(element => element.removeAttribute('style'));
  const identities = await categoryPaints(page);
  await page.evaluate(() => (window as unknown as { nodexStudio: { setRevision: (value: boolean) => void } }).nodexStudio.setRevision(true));
  await expect(area.locator('[data-nx-soft-latest]')).toHaveText('$40');
  assert.deepEqual(await categoryPaints(page), identities, 'Reordering must preserve category colors');
  await expect(heat.locator('[data-nx-soft-intensity]').first()).toHaveAttribute('fill-opacity', '0.4');

  await mode(page, 'partial');
  await expect(bars.locator('[data-nx-soft-bar]')).toHaveCount(2);
  await expect(bars.locator('[data-nx-soft-reading]')).toHaveText(['$40', '—', '$0', '$10']);
  await expect(area.locator('[data-nx-soft-point]')).toHaveCount(3);
  await expect.poll(() => area.locator('.recharts-area-curve').getAttribute('d').then(d => (d?.match(/M/g) ?? []).length)).toBe(2);
  await expect(donut.locator('[data-nx-soft-slice]')).toHaveCount(0);
  await expect(donut.getByRole('status')).toHaveText('A complete breakdown is required.');
  await mode(page, 'last-missing');
  await expect(area.locator('[data-nx-soft-latest]')).toHaveText('—');
  await mode(page, 'zero');
  await expect(bars.locator('[data-nx-soft-bar]')).toHaveCount(0);
  await expect(bars.locator('[data-nx-soft-reading]')).toHaveText('$0');
  await expect(area.locator('[data-nx-soft-point]')).toHaveCount(1);
  await expect(donut.locator('[data-nx-soft-slice]')).toHaveCount(0);
  await expect(donut.locator('[data-nx-soft-key]')).toContainText('$0');
  await expect(heat.locator('[data-nx-value="0"] circle')).toHaveCount(4);
  await mode(page, 'single');
  await expect(bars.locator('[data-nx-soft-bar]')).toHaveCount(1);
  await expect(donut.locator('[data-nx-soft-slice]')).toHaveCount(1);
  await expect(area.locator('[data-nx-soft-point]')).toHaveCount(1);

  for (const value of ['empty', 'invalid', 'duplicates']) {
    await mode(page, value);
    for (const slug of slugs) await expect(chart(page, slug).getByRole('status')).toBeVisible();
    await expect(bars.locator('[data-nx-soft-bar]')).toHaveCount(0);
    await expect(area.locator('[data-nx-soft-point]')).toHaveCount(0);
    await expect(donut.locator('[data-nx-soft-slice]')).toHaveCount(0);
  }
  for (const [value, slug, message] of [
    ['overflow', 'soft-donut', 'A complete breakdown is required.'],
    ['bad-x', 'soft-area', 'Use unique, nonempty IDs and finite, strictly increasing X coordinates.'],
    ['bad-maximum', 'soft-heatmap', 'A finite, positive scale maximum is required.'],
    ['unknown-cell', 'soft-heatmap', 'Use unique axis IDs and one reading per declared row and column pair.'],
  ]) {
    await mode(page, value!); await expect(chart(page, slug!).getByRole('status')).toHaveText(message!);
  }
  await mode(page, 'missing-cells');
  await expect(heat.locator('[data-nx-value="missing"]')).toHaveCount(4);
  await mode(page, 'many');
  await page.locator('#studio-primary').evaluate(element => (element as HTMLElement).style.width = '280px');
  await expect(bars.locator('[data-nx-soft-bar]')).toHaveCount(18);
  await expect(heat.locator('[data-nx-soft-cell]')).toHaveCount(36);
  for (const slug of slugs) {
    assert(await chart(page, slug).evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${slug}: overflow must stay inside the plot`);
  }
  for (const node of [bars, area, heat]) {
    assert(await node.evaluate(element => [...element.querySelectorAll('div')].some(child => ['auto', 'scroll'].includes(getComputedStyle(child).overflowX) && child.scrollWidth > child.clientWidth)), 'Dense charts must scroll locally');
  }
  await page.locator('#studio-primary').evaluate(element => element.removeAttribute('style'));
  await mode(page, 'normal');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => (window as unknown as { nodexStudio: { setAnimate: (value: boolean) => void } }).nodexStudio.setAnimate(true));
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  assert.equal(await page.locator('#studio-primary svg').evaluateAll(elements => elements.some(element => /(?:NaN|Infinity)/.test(element.innerHTML))), false, 'Native geometry must remain finite');
  console.log('Validated Soft Studio: exact geometry, numeric time, stable identity, missing/zero/invalid data, native inspection, scoped tokens, narrow layouts and reduced motion.');
}
