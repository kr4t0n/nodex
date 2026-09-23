import assert from 'node:assert/strict';

import { expect, type Page } from '@playwright/test';

export const SKETCHBOOK_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { SketchBars, type SketchBarsDatum } from './components/nodex/sketch-bars/component';

type Mode = 'normal' | 'partial' | 'empty' | 'single' | 'zero' | 'invalid' | 'duplicates' | 'many';
declare global { interface Window { nodexSketchFixture: { setMode: (value: Mode) => void; setRevision: (value: number) => void; setAnimate: (value: boolean) => void } } }

export function SketchbookConsumer() {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(0);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { window.nodexSketchFixture = { setMode, setRevision, setAnimate }; }, []);
  const normal: SketchBarsDatum[] = [
    { id: 'alpha', label: 'Same', value: revision === 2 ? 50 : 100, tone: 'a' },
    { id: 'beta', label: 'Same', value: 75, tone: 'b' },
    { id: 'gamma', label: 'Gamma', value: 50 },
    { id: 'delta', label: 'Delta', value: 25 },
  ];
  const data: SketchBarsDatum[] = mode === 'normal' ? (revision === 1 ? normal.toReversed() : normal)
    : mode === 'empty' ? []
    : mode === 'single' ? [{ id: 'only', label: 'Only', value: 3 }]
    : mode === 'zero' ? [{ id: 'zero', label: 'Zero', value: 0 }]
    : mode === 'invalid' ? [{ id: 'nan', label: 'NaN', value: NaN }, { id: 'infinite', label: 'Infinite', value: Infinity }, { id: 'negative', label: 'Negative', value: -1 }]
    : mode === 'duplicates' ? [{ id: 'same', label: 'One', value: 2 }, { id: 'same', label: 'Two', value: 3 }]
    : mode === 'many' ? Array.from({ length: 10 }, (_, index) => ({ id: String(index), label: 'Item ' + index, value: index + 1 }))
    : [{ id: 'present', label: 'Present', value: 20 }, { id: 'missing', label: 'Missing', value: null }, { id: 'zero', label: 'Zero', value: 0 }];
  return <div data-sketchbook>
    <section id="sketch-primary" className="w-[720px]"><SketchBars data={data} height={420} unitLabel="Hours" valueFormatter={(value) => value + 'h'} animate={animate} /></section>
    <section id="sketch-secondary" className="w-[520px]"><SketchBars data={[{ id: 'independent', label: 'Independent', value: 80, tone: 'a' }, { id: 'other', label: 'Other', value: 40 }]} height={360} animate={false} /></section>
  </div>;
}
`;

async function state(page: Page, method: 'setMode' | 'setRevision' | 'setAnimate', value: string | number | boolean) {
  await page.evaluate(({ method, value }) => {
    (window as unknown as { nodexSketchFixture: Record<string, (value: unknown) => void> }).nodexSketchFixture[method]!(value);
  }, { method, value });
}

async function marks(page: Page, selector: string) {
  return page.locator(`${selector} [data-nx-sketch-bar]`).evaluateAll((elements) => Object.fromEntries(elements.map((element) => [
    element.getAttribute('data-nx-sketch-bar'), [...element.querySelectorAll('path')].map((path) => ({
      d: path.getAttribute('d'), stroke: getComputedStyle(path).stroke, width: getComputedStyle(path).strokeWidth,
    })),
  ])));
}

export async function checkSketchbookConsumer(page: Page): Promise<void> {
  const primary = page.locator('#sketch-primary');
  const bars = primary.locator('[data-nx-sketch-bounds]');
  const labels = primary.locator('[data-nx-sketch-value]');
  const surface = primary.locator('svg.recharts-surface');
  const tooltip = primary.locator('.recharts-tooltip-wrapper:visible');
  await primary.scrollIntoViewIfNeeded();
  await expect(primary.locator('[data-nx-sketch-part="fillSketch"]')).toHaveCount(4);
  await expect(labels).toHaveText(['100h', '75h', '50h', '25h']);
  await expect(primary.locator('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value')).toHaveText(['Same', 'Same', 'Gamma', 'Delta']);
  const boxes = await bars.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, bottom: bounds.bottom };
  }));
  for (const [index, box] of boxes.entries()) {
    assert(Math.abs(box.height / boxes[0]!.height - [1, 0.75, 0.5, 0.25][index]!) < 0.001, 'Native rectangles must preserve magnitude ratios');
    assert(Math.abs(box.bottom - boxes[0]!.bottom) < 0.01, 'Native bars must share zero');
  }
  assert(await primary.locator('[clip-path]').evaluateAll((elements) => elements.every((element) => {
    const id = element.getAttribute('clip-path')!.slice(5, -1);
    return Boolean(document.getElementById(id)?.querySelector('rect'));
  })), 'Bar fills must be clipped to their native quantity bounds');
  await page.mouse.move(850, 10);
  await surface.focus();
  await expect(tooltip).toHaveText('Same100h Hours');
  for (const text of ['Same75h Hours', 'Gamma50h Hours', 'Delta25h Hours']) {
    await page.keyboard.press('ArrowRight');
    await expect(tooltip).toHaveText(text);
  }
  await bars.first().hover();
  await expect(tooltip).toHaveText('Same100h Hours');

  const original = await marks(page, '#sketch-primary');
  const sibling = await marks(page, '#sketch-secondary');
  await state(page, 'setRevision', 1);
  await expect(labels).toHaveText(['25h', '50h', '75h', '100h']);
  assert.deepEqual(await marks(page, '#sketch-primary'), original, 'Reordering must preserve ID-based texture and paint');
  await state(page, 'setRevision', 0);
  await expect(labels).toHaveText(['100h', '75h', '50h', '25h']);
  await primary.evaluate((element) => {
    const node = element as HTMLElement;
    node.style.setProperty('--nx-seriesA', '#234567');
    node.style.setProperty('--nx-ink', '#453627');
    node.style.setProperty('--nx-stroke-mark', '1.75px');
    node.style.setProperty('--nx-sketch-fillWeight', '0.8');
    node.style.setProperty('--nx-sketch-roughness', '2');
    node.style.setProperty('--nx-sketch-hachureGap', '7');
  });
  const hatch = primary.locator('[data-nx-sketch-bar="alpha"] [data-nx-sketch-part="fillSketch"]');
  const outline = primary.locator('[data-nx-sketch-bar="alpha"] [data-nx-sketch-part="path"]');
  await expect.poll(() => hatch.evaluate((element) => getComputedStyle(element).stroke)).toBe('rgb(35, 69, 103)');
  await expect.poll(() => hatch.evaluate((element) => getComputedStyle(element).strokeWidth)).toBe('0.8px');
  await expect.poll(() => outline.evaluate((element) => getComputedStyle(element).stroke)).toBe('rgb(69, 54, 39)');
  await expect.poll(() => outline.evaluate((element) => getComputedStyle(element).strokeWidth)).toBe('1.75px');
  await expect.poll(() => hatch.getAttribute('d')).not.toBe(original.alpha![0]!.d);
  assert.deepEqual(await marks(page, '#sketch-secondary'), sibling, 'Scoped sketch changes must leave siblings untouched');
  await primary.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
  await expect.poll(() => marks(page, '#sketch-primary')).toEqual(original);

  // CSSOM edits do not emit DOM mutations; the public notification must refresh geometry.
  await page.evaluate(() => {
    const style = document.createElement('style'); style.id = 'sketch-test-style'; document.head.append(style);
  });
  await page.evaluate(() => {
    (document.getElementById('sketch-test-style') as HTMLStyleElement).sheet!.insertRule('#sketch-primary { --nx-sketch-fillStyle: solid; }');
    document.dispatchEvent(new Event('nodex:tokens-changed'));
  });
  await expect(primary.locator('[data-nx-sketch-part="fillPath"]')).toHaveCount(4);
  await page.evaluate(() => document.getElementById('sketch-test-style')!.remove());
  await expect.poll(() => marks(page, '#sketch-primary')).toEqual(original);

  await primary.evaluate((element) => (element as HTMLElement).style.setProperty('--nx-sketch-fillStyle', 'cross-hatch'));
  await expect.poll(() => hatch.getAttribute('d')).not.toBe(original.alpha![0]!.d);
  await primary.evaluate((element) => (element as HTMLElement).style.setProperty('--nx-sketch-hachureGap', 'invalid'));
  await expect(primary.locator('[data-nx-sketch-part]')).toHaveCount(0);
  await expect(bars).toHaveCount(4);
  await expect(labels).toHaveText(['100h', '75h', '50h', '25h']);
  await primary.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
  await expect.poll(() => marks(page, '#sketch-primary')).toEqual(original);

  await state(page, 'setRevision', 2);
  await expect(labels).toHaveText(['50h', '75h', '50h', '25h']);
  await expect(page.locator('#sketch-secondary [data-nx-sketch-value]')).toHaveText(['80', '40']);
  for (const width of [375, 320]) {
    await primary.evaluate((element, width) => { (element as HTMLElement).style.width = `${width}px`; }, width);
    await expect.poll(() => primary.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    assert(await primary.locator('.overflow-x-auto').evaluate((element) => element.scrollWidth > element.clientWidth), 'Dense labels must scroll locally');
  }
  await state(page, 'setMode', 'many');
  await expect(bars).toHaveCount(10);
  await primary.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
  await state(page, 'setMode', 'partial');
  await expect(bars).toHaveCount(1);
  await expect(labels).toHaveCount(3);
  for (const [id, text] of [['present', '20h'], ['missing', '—'], ['zero', '0h']]) {
    await expect(primary.locator(`[data-nx-sketch-value="${id}"]`)).toHaveText(text!);
  }
  await page.mouse.move(850, 10);
  await surface.focus();
  // Recharts retains and clamps the last keyboard index when data shrinks.
  // Traverse back from that last observation to inspect the new first reading.
  await page.keyboard.press('ArrowLeft');
  await expect(tooltip).toHaveText('MissingUnavailable');
  await page.keyboard.press('ArrowLeft');
  await expect(tooltip).toHaveText('Present20h Hours');
  await page.keyboard.press('ArrowRight');
  await expect(tooltip).toHaveText('MissingUnavailable');
  await page.keyboard.press('ArrowRight');
  await expect(tooltip).toHaveText('Zero0h Hours');
  for (const mode of ['empty', 'invalid', 'duplicates']) {
    await state(page, 'setMode', mode);
    await expect(surface).toHaveCount(0);
    await expect(primary.getByRole('status')).toContainText(mode === 'duplicates' ? 'unique' : mode === 'empty' ? 'No categories' : 'No observations');
  }
  await state(page, 'setMode', 'zero');
  await expect(bars).toHaveCount(0);
  await expect(labels).toHaveText(['0h']);
  await state(page, 'setMode', 'single');
  await expect(bars).toHaveCount(1);
  await expect(labels).toHaveText(['3h']);
  await state(page, 'setMode', 'normal');
  await state(page, 'setRevision', 0);
  await expect.poll(() => marks(page, '#sketch-primary')).toEqual(original);
  await state(page, 'setAnimate', true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(primary.locator('[data-nx-chart]')).toHaveAttribute('data-nx-animated', 'true');
  await state(page, 'setRevision', 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(primary.locator('[data-nx-chart]')).toHaveAttribute('data-nx-animated', 'false');
  await expect(labels).toHaveText(['50h', '75h', '50h', '25h']);
  console.log('Validated Sketchbook delivery, stable sketches, exact bar bounds, keyboard inspection, scoped paint/geometry, missing/zero/invalid data, narrow containers and live reduced motion.');
}
