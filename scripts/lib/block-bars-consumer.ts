import assert from 'node:assert/strict';

import { expect, type Page } from '@playwright/test';

export const BLOCK_BARS_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { BlockBars, type BlockBarsDatum } from './components/nodex/block-bars/component';

type Mode = 'normal' | 'partial' | 'empty' | 'single' | 'zero' | 'invalid' | 'duplicates' | 'many';
declare global { interface Window { nodexBlockFixture: { setMode: (value: Mode) => void; setRevision: (value: number) => void; setAnimate: (value: boolean) => void } } }

export function BlockBarsConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(0);
  const [localAnimation, setAnimate] = useState(false);
  useEffect(() => { window.nodexBlockFixture = { setMode, setRevision, setAnimate }; }, []);
  const normal: BlockBarsDatum[] = [
    { id: 'alpha', label: 'Same', value: revision ? 40 : 100, tone: 'a' },
    { id: 'beta', label: 'Same', value: 75 },
    { id: 'gamma', label: 'Gamma', value: 50 },
    { id: 'delta', label: 'Delta', value: 25 },
  ];
  const data: BlockBarsDatum[] = mode === 'normal' ? (revision ? normal.toReversed() : normal)
    : mode === 'empty' ? []
    : mode === 'single' ? [{ id: 'only', label: 'Only', value: 3 }]
    : mode === 'zero' ? [{ id: 'zero', label: 'Zero', value: 0 }]
    : mode === 'invalid' ? [{ id: 'nan', label: 'NaN', value: NaN }, { id: 'infinity', label: 'Infinite', value: Infinity }, { id: 'negative', label: 'Negative', value: -1 }]
    : mode === 'duplicates' ? [{ id: 'same', label: 'One', value: 2 }, { id: 'same', label: 'Two', value: 3 }]
    : mode === 'many' ? Array.from({ length: 10 }, (_, index) => ({ id: String(index), label: 'Item ' + index, value: index + 1 }))
    : [{ id: 'present', label: 'Present', value: 20 }, { id: 'missing', label: 'Missing', value: null }, { id: 'zero', label: 'Zero', value: 0 }];
  return <div data-neo>
    <section id="block-primary" className="w-[720px]"><BlockBars data={data} height={440} unitLabel="Revenue" contextLabel="This month" valueFormatter={(value) => '$' + value} animate={animate || localAnimation} aria-label="Revenue by category" /></section>
    <section id="block-secondary" className="w-[520px]"><BlockBars data={[{ id: 'independent', label: 'Independent', value: 80, tone: 'a' }, { id: 'other', label: 'Other', value: 40 }]} height={360} animate={false} aria-label="Independent categories" /></section>
  </div>;
}
`;

const PRIMARY = '#block-primary';
const SECONDARY = '#block-secondary';

async function setMode(page: Page, mode: string) {
  await page.evaluate((value) => (window as unknown as { nodexBlockFixture: { setMode: (mode: string) => void } }).nodexBlockFixture.setMode(value), mode);
}

async function paint(page: Page, selector: string) {
  return page.locator(`${selector} [data-nx-block]`).evaluateAll((elements) => Object.fromEntries(elements.map((element) => {
    const style = getComputedStyle(element);
    return [element.getAttribute('data-nx-block'), { fill: style.fill, stroke: style.stroke, width: style.strokeWidth, shadow: style.filter }];
  })));
}

export async function checkBlockBarsConsumer(page: Page): Promise<void> {
  const primary = page.locator(PRIMARY);
  const marks = primary.locator('[data-nx-block]');
  const labels = primary.locator('[data-nx-block-value]');
  const tooltip = primary.locator('.recharts-tooltip-wrapper:visible');
  const surface = primary.locator('svg.recharts-surface');
  await primary.scrollIntoViewIfNeeded();
  await expect(marks).toHaveCount(4);
  await expect(labels).toHaveText(['$100', '$75', '$50', '$25']);
  await expect(primary.locator('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value')).toHaveText(['Same', 'Same', 'Gamma', 'Delta']);
  const boxes = await marks.evaluateAll((elements) => elements.map((element) => {
    const box = (element as SVGGraphicsElement).getBBox();
    return { height: box.height, baseline: box.y + box.height };
  }));
  for (const [index, box] of boxes.entries()) {
    assert(Math.abs(box.height / boxes[0]!.height - [1, 0.75, 0.5, 0.25][index]!) < 0.001, 'Front faces must preserve magnitude ratios');
    assert(Math.abs(box.baseline - boxes[0]!.baseline) < 0.01, 'All bars must start at zero');
  }

  await page.mouse.move(850, 10);
  await surface.focus();
  await expect(tooltip).toHaveText('Same$100 Revenue');
  for (const text of ['Same$75 Revenue', 'Gamma$50 Revenue', 'Delta$25 Revenue']) {
    await page.keyboard.press('ArrowRight');
    await expect(tooltip).toHaveText(text);
  }
  await expect(page.locator(`${SECONDARY} .recharts-tooltip-wrapper:visible`)).toHaveCount(0);
  await marks.first().hover();
  await expect(tooltip).toHaveText('Same$100 Revenue');

  const original = await paint(page, PRIMARY);
  const sibling = await paint(page, SECONDARY);
  await primary.evaluate((element) => {
    const node = element as HTMLElement;
    node.style.setProperty('--nx-seriesA', '#d5a1eb');
    node.style.setProperty('--nx-ink', '#24395a');
    node.style.setProperty('--nx-stroke-mark', '4px');
  });
  await expect.poll(async () => (await paint(page, PRIMARY)).alpha).toEqual({
    fill: 'rgb(213, 161, 235)', stroke: 'rgb(36, 57, 90)', width: '4px', shadow: 'drop-shadow(rgb(36, 57, 90) 6px 6px 0px)',
  });
  assert.deepEqual(await paint(page, SECONDARY), sibling, 'Descendant paint must not affect sibling charts');
  await primary.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
  await page.evaluate(() => (window as unknown as { nodexBlockFixture: { setRevision: (value: number) => void } }).nodexBlockFixture.setRevision(1));
  await expect(labels).toHaveText(['$25', '$50', '$75', '$40']);
  assert.deepEqual(await paint(page, PRIMARY), original, 'Explicit and default ID-based colors must survive reordering and value updates');
  await expect(page.locator(`${SECONDARY} [data-nx-block-value]`)).toHaveText(['80', '40']);

  for (const width of [375, 320]) {
    await primary.evaluate((element, value) => { (element as HTMLElement).style.width = value + 'px'; }, width);
    await expect.poll(() => surface.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThan(width);
    assert(await primary.evaluate((element) => element.scrollWidth <= element.clientWidth), 'The plot must fit its narrow container');
    await expect(labels).toHaveCount(4);
  }
  await setMode(page, 'many');
  await expect(marks).toHaveCount(10);
  assert(await primary.evaluate((element) => {
    const plot = element.querySelector('.overflow-x-auto')!;
    return plot.scrollWidth > plot.clientWidth && element.scrollWidth <= element.clientWidth;
  }), 'Many categories must scroll inside the chart');

  await primary.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
  await setMode(page, 'empty');
  await expect(surface).toHaveCount(0);
  await setMode(page, 'partial');
  await expect(marks).toHaveCount(1);
  await expect(labels).toHaveCount(3);
  await expect(primary.locator('[data-nx-block-value="present"]')).toHaveText('$20');
  await expect(primary.locator('[data-nx-block-value="missing"]')).toHaveText('—');
  await expect(primary.locator('[data-nx-block-value="zero"]')).toHaveText('$0');
  await page.mouse.move(850, 10);
  await surface.focus();
  await expect(tooltip).toHaveText('Present$20 Revenue');
  await page.keyboard.press('ArrowRight');
  await expect(tooltip).toHaveText('MissingUnavailable');
  await page.keyboard.press('ArrowRight');
  await expect(tooltip).toHaveText('Zero$0 Revenue');
  for (const [mode, expected] of [
    ['single', ['$3']], ['zero', ['$0']],
  ] as const) {
    await setMode(page, mode);
    await expect(labels).toHaveText([...expected]);
    await expect(marks).toHaveCount(mode === 'single' ? 1 : 0);
  }
  await setMode(page, 'invalid');
  await expect(primary.getByRole('status')).toHaveText('No observations available.');
  await expect(surface).toHaveCount(0);
  await setMode(page, 'empty');
  await expect(primary.getByRole('status')).toHaveText('No categories to compare.');
  await expect(surface).toHaveCount(0);
  await setMode(page, 'duplicates');
  await expect(primary.getByRole('status')).toHaveText('Each category needs a unique, nonempty ID.');
  await expect(surface).toHaveCount(0);

  await setMode(page, 'normal');
  await page.evaluate(() => (window as unknown as { nodexBlockFixture: { setAnimate: (value: boolean) => void } }).nodexBlockFixture.setAnimate(true));
  await expect(primary.locator('[data-nx-chart]')).toHaveAttribute('data-nx-animated', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(primary.locator('[data-nx-chart]')).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(primary.locator('[data-nx-chart]')).toHaveAttribute('data-nx-animated', 'false');
  await page.evaluate(() => (window as unknown as { nodexBlockFixture: { setAnimate: (value: boolean) => void } }).nodexBlockFixture.setAnimate(false));
  await expect(labels).toHaveText(['$25', '$50', '$75', '$40']);
  await setMode(page, 'partial');
  await expect(labels).toHaveCount(3);
  await expect(primary.locator('[data-nx-block-value="zero"]')).toHaveText('$0');
  await setMode(page, 'normal');
  await expect(labels).toHaveCount(4);
  console.log('Validated Block Bars geometry, categorical color identity, pointer/keyboard inspection, scoped paints/shadows, resizing, reduced motion and missing/zero/invalid data.');
}
