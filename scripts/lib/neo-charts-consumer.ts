import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const NEO_CHARTS_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { PunchArea, type PunchAreaDatum } from './components/nodex/punch-area/component';
import { SplitRing } from './components/nodex/split-ring/component';
import { StackedBlocks } from './components/nodex/stacked-blocks/component';

type Mode = 'normal' | 'partial' | 'last-missing' | 'empty' | 'single' | 'zero' | 'invalid' | 'duplicates' | 'many' | 'no-series' | 'overflow';
declare global { interface Window { nodexNeoFixture: { setMode: (value: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }

export function NeoChartsConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(false);
  const [localAnimation, setAnimate] = useState(false);
  useEffect(() => { window.nodexNeoFixture = { setMode, setRevision, setAnimate }; }, []);
  const normal: PunchAreaDatum[] = [
    { id: 'a', label: 'Same', value: 40 }, { id: 'b', label: 'Same', value: 30 },
    { id: 'c', label: 'Gamma', value: 20 }, { id: 'd', label: 'Delta', value: 10 },
  ];
  const data: PunchAreaDatum[] = mode === 'empty' ? []
    : mode === 'single' ? [{ id: 'only', label: 'Only', value: 3 }]
    : mode === 'zero' ? [{ id: 'zero', label: 'Zero', value: 0 }]
    : mode === 'invalid' ? [{ id: 'nan', label: 'NaN', value: NaN }, { id: 'infinite', label: 'Infinite', value: Infinity }, { id: 'negative', label: 'Negative', value: -1 }]
    : mode === 'duplicates' ? [{ id: 'same', label: 'One', value: 2 }, { id: 'same', label: 'Two', value: 3 }]
    : mode === 'partial' ? [{ id: 'present', label: 'Present', value: 40 }, { id: 'missing', label: 'Missing', value: null }, { id: 'zero', label: 'Zero', value: 0 }, { id: 'end', label: 'End', value: 10 }]
    : mode === 'last-missing' ? [...normal.slice(0, 3), { id: 'd', label: 'Delta', value: null }]
    : mode === 'many' ? Array.from({ length: 12 }, (_, index) => ({ id: String(index), label: 'Item ' + index, value: index + 1 }))
    : mode === 'overflow' ? [{ id: 'huge', label: 'Huge', value: Number.MAX_VALUE }, { id: 'huge2', label: 'Huge 2', value: Number.MAX_VALUE }]
    : revision ? normal.toReversed() : normal;
  const format = (value: number) => '$' + value;
  const series = [{ id: 'first', label: 'Build', tone: 'a' as const }, { id: 'second', label: 'Ship', tone: 'b' as const }];
  const composition = (rows: readonly PunchAreaDatum[]) => rows.map(row => ({ ...row, values: { first: row.value, second: row.value === null ? null : row.value / 2 } }));
  return <div data-neo>
    <div id="neo-primary" className="w-[720px]">
      <PunchArea data={data} unitLabel="Revenue" valueFormatter={format} animate={animate || localAnimation} />
      <SplitRing data={data.map(row => ({ ...row, tone: row.id === 'a' ? 'a' as const : undefined }))} unitLabel="Orders" valueFormatter={format} animate={animate || localAnimation} />
      <StackedBlocks data={composition(data)} series={mode === 'no-series' ? [] : revision ? series.toReversed() : series} unitLabel="Hours" valueFormatter={format} animate={animate || localAnimation} />
    </div>
    <div id="neo-secondary" className="w-[620px]">
      <PunchArea data={normal} animate={false} />
      <SplitRing data={normal} animate={false} />
      <StackedBlocks data={composition(normal)} series={series} animate={false} />
    </div>
  </div>;
}
`;

const slugs = ['punch-area', 'split-ring', 'stacked-blocks'] as const;
const chart = (page: Page, slug: string, scope = 'primary') => page.locator(`#neo-${scope} [data-nx-chart="${slug}"]`);
const setMode = (page: Page, mode: string) => page.evaluate(value => (window as unknown as { nodexNeoFixture: { setMode: (mode: string) => void } }).nodexNeoFixture.setMode(value), mode);

async function paints(page: Page, scope: string) {
  return page.locator(`#neo-${scope} [data-nx-ring-slice], #neo-${scope} [data-nx-stack], #neo-${scope} .recharts-area-area`).evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return { key: element.getAttribute('data-nx-ring-slice') ?? `${element.getAttribute('data-nx-stack')}/${element.getAttribute('data-nx-series')}`, fill: style.fill, stroke: style.stroke };
  }));
}

export async function checkNeoChartsConsumer(page: Page): Promise<void> {
  const area = chart(page, 'punch-area');
  const ring = chart(page, 'split-ring');
  const stack = chart(page, 'stacked-blocks');
  await expect(area.locator('[data-nx-area-point]')).toHaveCount(4);
  await expect(area.locator('[data-nx-area-latest]')).toHaveText('$10');
  await expect(ring.locator('[data-nx-ring-total]')).toHaveText('$100');
  await expect(stack.locator('[data-nx-stack-total]')).toHaveText(['$60', '$45', '$30', '$15']);
  const angles = await ring.locator('[data-nx-ring-slice]').evaluateAll(elements => elements.map(element => Math.abs(Number(element.getAttribute('data-nx-start')) - Number(element.getAttribute('data-nx-end')))));
  assert.deepEqual(angles.map(angle => Math.round(angle)), [144, 108, 72, 36], 'Ring angles must preserve the exact allocation');
  const blocks = await stack.locator('[data-nx-stack="a"]').evaluateAll(elements => elements.map(element => {
    const box = (element as SVGGraphicsElement).getBBox();
    return { x: box.x, width: box.width };
  }));
  assert(Math.abs(blocks[0]!.width / blocks[1]!.width - 2) < 0.001, 'Stack widths must encode absolute segment values');
  assert(Math.abs(blocks[0]!.x + blocks[0]!.width - blocks[1]!.x) < 0.01, 'Segments must be contiguous');

  for (const [node, key, first, next] of [
    [area, 'ArrowRight', 'Same$40 Revenue', 'Same$30 Revenue'],
    [ring, 'ArrowRight', 'Same$40 · 40%', 'Same$30 · 30%'],
    [stack, 'ArrowLeft', 'SameBuild$40Ship$20$60 Hours', 'SameBuild$30Ship$15$45 Hours'],
  ] as const) {
    await node.scrollIntoViewIfNeeded();
    await page.mouse.move(880, 10);
    await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(first);
    await page.keyboard.press(key);
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(next);
  }
  await expect(page.locator('#neo-secondary .recharts-tooltip-wrapper:visible')).toHaveCount(0);
  await area.locator('[data-nx-area-point="a"]').hover();
  await expect(area.locator('.recharts-tooltip-wrapper:visible')).toHaveText('Same$40 Revenue');
  await stack.locator('[data-nx-stack="a"]').first().hover();
  await expect(stack.locator('.recharts-tooltip-wrapper:visible')).toHaveText('SameBuild$40Ship$20$60 Hours');

  const sibling = await paints(page, 'secondary');
  await page.locator('#neo-primary').evaluate(element => {
    const node = element as HTMLElement;
    node.style.setProperty('--nx-ink', '#24395a');
    node.style.setProperty('--nx-seriesA', '#d5a1eb');
    node.style.setProperty('--nx-seriesC', '#a2debc');
  });
  await expect.poll(() => ring.locator('[data-nx-ring-slice="a"]').evaluate(element => ({ fill: getComputedStyle(element).fill, stroke: getComputedStyle(element).stroke }))).toEqual({ fill: 'rgb(213, 161, 235)', stroke: 'rgb(36, 57, 90)' });
  await expect.poll(() => area.locator('.recharts-area-area').evaluate(element => getComputedStyle(element).fill)).toBe('rgb(162, 222, 188)');
  await expect.poll(() => stack.locator('[data-nx-series="first"]').first().evaluate(element => getComputedStyle(element).fill)).toBe('rgb(213, 161, 235)');
  assert.deepEqual(await paints(page, 'secondary'), sibling, 'Descendant chart tokens must not alter sibling instances');
  await page.locator('#neo-primary').evaluate(element => element.removeAttribute('style'));
  const identityColors = await ring.locator('[data-nx-ring-slice]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-ring-slice'), getComputedStyle(element).fill])));
  await page.evaluate(() => (window as unknown as { nodexNeoFixture: { setRevision: (value: boolean) => void } }).nodexNeoFixture.setRevision(true));
  await expect(area.locator('[data-nx-area-latest]')).toHaveText('$40');
  await expect(stack.locator('[data-nx-stack-total]')).toHaveText(['$15', '$30', '$45', '$60']);
  assert.deepEqual(await ring.locator('[data-nx-ring-slice]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-ring-slice'), getComputedStyle(element).fill]))), identityColors, 'Colors must follow IDs through reorder');

  for (const width of [375, 320]) {
    await page.locator('#neo-primary').evaluate((element, width) => { (element as HTMLElement).style.width = `${width}px`; }, width);
    for (const slug of slugs) {
      const node = chart(page, slug);
      await expect.poll(() => node.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await expect.poll(() => ring.evaluate(element => {
      const key = element.querySelector('ul')!.getBoundingClientRect();
      const plot = element.querySelector('.recharts-responsive-container')!.getBoundingClientRect();
      return key.top >= plot.bottom;
    })).toBe(true);
  }
  await setMode(page, 'many');
  await expect(area.locator('[data-nx-area-point]')).toHaveCount(12);
  assert(await area.locator('.overflow-x-auto').evaluate(element => element.scrollWidth > element.clientWidth), 'Long trends must scroll locally');
  await expect(stack.locator('[data-nx-stack-total]')).toHaveCount(12);
  await page.locator('#neo-primary').evaluate(element => element.removeAttribute('style'));

  await setMode(page, 'partial');
  await expect(area.locator('[data-nx-area-point]')).toHaveCount(3);
  await expect(area.locator('[data-nx-area-point="zero"]')).toHaveAttribute('data-nx-value', '0');
  const path = await area.locator('.recharts-area-curve').getAttribute('d');
  assert((path?.match(/M/g)?.length ?? 0) >= 2, 'Missing readings must break the line');
  await expect(ring.getByRole('status')).toHaveText('A complete breakdown is required.');
  await expect(ring.locator('[data-nx-ring-slice]')).toHaveCount(0);
  await expect(stack.locator('[data-nx-stack-total]')).toHaveText(['$60', '—', '$0', '$15']);
  await expect(stack.locator('[data-nx-stack="missing"], [data-nx-stack="zero"]')).toHaveCount(0);
  await setMode(page, 'last-missing');
  await expect(area.locator('[data-nx-area-latest]')).toHaveText('—');
  await setMode(page, 'single');
  await expect(area.locator('[data-nx-area-point]')).toHaveCount(1);
  await expect(ring.locator('[data-nx-ring-slice]')).toHaveCount(1);
  await expect(stack.locator('[data-nx-stack-total]')).toHaveText(['$4.5']);
  await setMode(page, 'zero');
  await expect(area.locator('[data-nx-area-latest]')).toHaveText('$0');
  await expect(area.locator('[data-nx-area-point]')).toHaveCount(1);
  await expect(ring.getByRole('status')).toHaveText('No positive values to compare.');
  await expect(stack.locator('[data-nx-stack-total]')).toHaveText(['$0']);
  for (const mode of ['empty', 'invalid', 'duplicates']) {
    await setMode(page, mode);
    for (const slug of slugs) {
      await expect(chart(page, slug).getByRole('status')).toBeVisible();
      await expect(chart(page, slug).locator('svg')).toHaveCount(0);
    }
  }
  await setMode(page, 'no-series');
  await expect(stack.getByRole('status')).toHaveText('No series to compare.');
  await setMode(page, 'overflow');
  await expect(ring.getByRole('status')).toHaveText('A complete breakdown is required.');
  await expect(stack.getByRole('status')).toHaveText('No complete observations available.');

  await setMode(page, 'normal');
  await page.evaluate(() => (window as unknown as { nodexNeoFixture: { setAnimate: (value: boolean) => void } }).nodexNeoFixture.setAnimate(true));
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  await expect(area.locator('[data-nx-area-point]')).toHaveCount(4);
  await expect(ring.locator('[data-nx-ring-slice]')).toHaveCount(4);
  await expect(stack.locator('[data-nx-stack-total]')).toHaveCount(4);
  await page.evaluate(() => (window as unknown as { nodexNeoFixture: { setAnimate: (value: boolean) => void } }).nodexNeoFixture.setAnimate(false));
  console.log('Validated Neo-brutalism area, ring and stacks: exact geometry, keyboard/pointer tooltips, scoped colors, identity, missing/zero/invalid data, responsive layout and interrupted reduced motion.');
}
