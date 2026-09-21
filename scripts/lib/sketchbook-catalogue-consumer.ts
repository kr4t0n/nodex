import assert from 'node:assert/strict';
import { expect, type Page, type Locator } from '@playwright/test';

export const SKETCHBOOK_CATALOGUE_SOURCE = `import { useEffect, useState } from 'react';
import { SketchBarsHorizontal } from './components/nodex/sketch-bars-horizontal/component';
import { SketchStackedBars } from './components/nodex/sketch-stacked-bars/component';
import { SketchLine } from './components/nodex/sketch-line/component';
import { SketchScatter } from './components/nodex/sketch-scatter/component';
import { SketchPie } from './components/nodex/sketch-pie/component';
import { SketchDonut } from './components/nodex/sketch-donut/component';
import { SketchForce } from './components/nodex/sketch-force/component';
import { SketchNetwork } from './components/nodex/sketch-network/component';

type Mode = 'normal' | 'partial' | 'empty' | 'invalid' | 'duplicates' | 'zero' | 'single' | 'bad-x' | 'bad-links';
declare global { interface Window { nodexSketchCatalogue: { setMode: (value: Mode) => void; setRevision: (value: number) => void; setAnimate: (value: boolean) => void } } }
const base = [{ id: 'alpha', label: 'Same', value: 100, tone: 'a' as const }, { id: 'beta', label: 'Same', value: 50, tone: 'b' as const }, { id: 'gamma', label: 'Gamma', value: 25, tone: 'c' as const }];
const originalSeries = [{ id: 'a', label: 'A', tone: 'a' as const }, { id: 'b', label: 'B', tone: 'b' as const }];
export function SketchbookCatalogueConsumer() {
  const [mode, setMode] = useState<Mode>('normal'); const [revision, setRevision] = useState(0); const [animate, setAnimate] = useState(false);
  useEffect(() => { window.nodexSketchCatalogue = { setMode, setRevision, setAnimate }; }, []);
  const normal = base.map((datum, index) => ({ ...datum, value: revision === 2 && index === 0 ? 75 : datum.value }));
  const ordered = mode === 'empty' ? [] : mode === 'single' || mode === 'zero' ? [{ id: 'only', label: 'Only', value: mode === 'zero' ? 0 : 9, tone: 'a' as const }]
    : mode === 'duplicates' ? [{...normal[0]!, id:'same'}, {...normal[1]!, id:'same'}]
    : normal.map((datum, index) => ({ ...datum, value: mode === 'invalid' ? NaN : mode === 'partial' ? index === 1 ? null : index === 2 ? 0 : 100 : datum.value }));
  const data = revision === 1 ? ordered.toReversed() : ordered;
  const series = revision === 1 ? originalSeries.toReversed() : originalSeries;
  const stacks = data.map(row => ({ id: row.id, label: row.label, values: { a: row.value === null ? null : row.value * 0.6, b: row.value === null ? null : row.value * 0.4 } }));
  const line = ordered.map((row, i) => ({ id: row.id, label: row.label, x: mode === 'bad-x' ? 0 : i * i, values: { a: row.value, b: mode === 'partial' ? i + 1 : row.value === null ? null : row.value * 0.8 } }));
  const scatter = data.map(row => ({ ...row, x: row.value === null ? null : mode === 'invalid' ? Infinity : row.id === 'alpha' ? revision === 2 ? -2 : 0 : row.id === 'beta' ? 1 : 4, y: row.value }));
  const links = data.length < 2 ? [] : mode === 'bad-links' ? [{id:'bad',source:data[0]!.id,target:'unknown'}] : [{id:'ab',source:'alpha',target:'beta'},{id:'bc',source:'beta',target:'gamma'}];
  return <div data-sketchbook>
    <section id="catalogue-horizontal" className="w-[720px]"><SketchBarsHorizontal data={data} height={400} unitLabel="Hours" animate={animate} /></section>
    <section id="catalogue-stacked" className="w-[720px]"><SketchStackedBars data={stacks} series={series} height={420} unitLabel="Hours" animate={animate} /></section>
    <section id="catalogue-line" className="w-[720px]"><SketchLine data={line} series={series} height={420} unitLabel="Hours" animate={animate} /></section>
    <section id="catalogue-scatter" className="w-[720px]"><SketchScatter data={scatter} height={400} xLabel="Days" yLabel="Hours" animate={animate} /></section>
    <section id="catalogue-pie" className="w-[720px]"><SketchPie data={data} height={430} unitLabel="Hours" animate={animate} /></section>
    <section id="catalogue-donut" className="w-[720px]"><SketchDonut data={data} height={430} unitLabel="Hours" animate={animate} /></section>
    <section id="catalogue-force" className="w-[720px]"><SketchForce data={data} height={420} unitLabel="Hours" animate={animate} /></section>
    <section id="catalogue-network" className="w-[720px]"><SketchNetwork data={data} links={links} height={420} unitLabel="Hours" animate={animate} /></section>
    <section id="catalogue-sibling" className="w-[600px]"><SketchDonut data={base} height={400} animate={false} /><SketchNetwork data={base} links={[{id:'ab',source:'alpha',target:'beta'}]} height={400} animate={false} /></section>
  </div>;
}
`;
const families = ['horizontal', 'stacked', 'line', 'scatter', 'pie', 'donut', 'force', 'network'] as const;
async function update(page: Page, method: 'setMode' | 'setRevision' | 'setAnimate', value: string | number | boolean) {
  await page.evaluate(({ method, value }) => (window as unknown as { nodexSketchCatalogue: Record<string, (value: unknown) => void> }).nodexSketchCatalogue[method]!(value), { method, value });
}
async function fingerprint(scope: Locator, selector: string) {
  return scope.locator(selector).evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-sketch-node') ?? element.getAttribute('data-nx-sketch-point') ?? element.getAttribute('data-nx-horizontal-bar'), {
    paths: [...element.querySelectorAll('path')].map(path => path.getAttribute('d')),
    paint: [...element.querySelectorAll('path')].map(path => getComputedStyle(path).stroke),
  }])));
}
async function nativeBox(scope: Locator, selector: string) {
  return scope.locator(selector).evaluateAll(elements => elements.map(element => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; }));
}

export async function checkSketchbookCatalogueConsumer(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scopes = Object.fromEntries(families.map(family => [family, page.locator(`#catalogue-${family}`)])) as Record<typeof families[number], Locator>;
  for (const family of families) {
    await expect(scopes[family].locator('svg.recharts-surface')).toBeVisible();
    await expect.poll(() => scopes[family].locator('[data-nx-sketch-part]').count()).toBeGreaterThan(0);
  }
  await expect(scopes.horizontal.locator('[data-nx-horizontal-value]')).toHaveText(['100', '50', '25']);
  const horizontal = await nativeBox(scopes.horizontal, '[data-nx-sketch-rect]');
  horizontal.forEach((box, index) => {
    assert(Math.abs(box.width / horizontal[0]!.width - [1, 0.5, 0.25][index]!) < 0.001, 'Horizontal bars preserve exact magnitude ratios');
    assert(Math.abs(box.x - horizontal[0]!.x) < 0.01, 'Horizontal bars share zero');
  });
  await expect(scopes.stacked.locator('[data-nx-sketch-total]')).toHaveText(['100', '50', '25']);
  const stack = await nativeBox(scopes.stacked, '[data-nx-sketch-stack="alpha"] [data-nx-sketch-rect]');
  assert(Math.abs(stack[0]!.height / stack[1]!.height - 1.5) < 0.001, 'Stack segment heights preserve 60:40');
  assert(Math.abs(stack[1]!.bottom - stack[0]!.y) < 0.01, 'Stack segments touch without gaps or overlap');
  await expect(scopes.line.locator('[data-nx-sketch-segment]')).toHaveCount(4);
  const dots = await nativeBox(scopes.line, '[data-nx-line-point][data-nx-series="a"] [data-nx-sketch-circle]');
  assert(Math.abs((dots[1]!.x - dots[0]!.x) / (dots[2]!.x - dots[0]!.x) - 0.25) < 0.001, 'Line uses numeric spacing, not category spacing');
  const points = await nativeBox(scopes.scatter, '[data-nx-sketch-circle]');
  assert(points.every(point => Math.abs(point.width - 16) < 0.01), 'Scatter symbols retain equal size');
  assert(Math.abs((points[1]!.x - points[0]!.x) / (points[2]!.x - points[0]!.x) - 0.25) < 0.001, 'Scatter positions follow numeric X');
  for (const kind of ['pie', 'donut'] as const) {
    const slices = await scopes[kind].locator('[data-nx-sketch-slice]').evaluateAll(elements => elements.map(element => ({ start: Number(element.getAttribute('data-nx-start')), end: Number(element.getAttribute('data-nx-end')), inner: Number(element.getAttribute('data-nx-inner')) })));
    slices.forEach((slice, i) => assert(Math.abs(Math.abs(slice.end - slice.start) / 360 - [100 / 175, 50 / 175, 25 / 175][i]!) < 0.0001, 'Sectors must use exact shares'));
    assert(slices.every(slice => kind === 'pie' ? slice.inner === 0 : slice.inner > 0), 'Pie and donut must retain distinct inner geometry');
    assert(await scopes[kind].locator('[data-nx-sketch-part="fillSketch"]').evaluateAll(elements => elements.every(element => (element.getAttribute('d')?.length ?? 0) > 100)), 'Every positive sector needs visible hatching, not just a valid clip boundary');
    assert(await scopes[kind].locator('[data-nx-sketch-slice] clipPath').evaluateAll(elements => elements.every(element => Boolean(element.querySelector('path')))), 'Native sector paths must clip hatching, including the donut hole');
  }
  for (const kind of ['force', 'network'] as const) {
    const circles = await nativeBox(scopes[kind], '[data-nx-sketch-circle]');
    circles.forEach((circle, i) => assert(Math.abs((circle.width / circles[0]!.width) ** 2 - [1, 0.5, 0.25][i]!) < 0.001, 'Force bubbles encode value with area'));
    for (const [i, a] of circles.entries()) for (const b of circles.slice(i + 1)) assert(Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2) + 0.2 >= (a.width + b.width) / 2, 'Collision layout must keep circles apart');
  }
  await expect(scopes.force.locator('[data-nx-sketch-edge]')).toHaveCount(0);
  await expect(scopes.network.locator('[data-nx-sketch-edge]')).toHaveCount(2);

  // Keyboard and pointer inspection belong to the native chart composition.
  for (const family of families) {
    const scope = scopes[family]; await scope.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
    const surface = scope.locator('svg.recharts-surface'); await surface.focus();
    const tooltip = scope.locator('.recharts-tooltip-wrapper:visible');
    await expect(tooltip).toContainText('Same');
    // Recharts 3 uses ArrowLeft to advance a vertical-layout category axis.
    const next = family === 'horizontal' ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.press(next); await expect(tooltip).toContainText('50');
    await page.keyboard.press(next); await expect(tooltip).toContainText('Gamma');
  }
  await scopes.horizontal.locator('[data-nx-horizontal-bar="alpha"] [data-nx-sketch-rect]').hover();
  await expect(scopes.horizontal.locator('.recharts-tooltip-wrapper:visible')).toContainText('100 Hours');
  const stable = await Promise.all([
    fingerprint(scopes.horizontal, '[data-nx-horizontal-bar]'), fingerprint(scopes.scatter, '[data-nx-sketch-point]'),
    fingerprint(scopes.force, '[data-nx-sketch-node]'), fingerprint(scopes.network, '[data-nx-sketch-node]'),
  ]);
  const forcePositions = await scopes.force.locator('[data-nx-sketch-node]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-sketch-node'), [element.getAttribute('data-nx-model-x'), element.getAttribute('data-nx-model-y')]])));
  await update(page, 'setRevision', 1);
  await expect(scopes.horizontal.locator('[data-nx-horizontal-value]')).toHaveText(['25', '50', '100']);
  await expect.poll(async () => Promise.all([
    fingerprint(scopes.horizontal, '[data-nx-horizontal-bar]'), fingerprint(scopes.scatter, '[data-nx-sketch-point]'),
    fingerprint(scopes.force, '[data-nx-sketch-node]'), fingerprint(scopes.network, '[data-nx-sketch-node]'),
  ])).toEqual(stable);
  assert.deepEqual(await scopes.force.locator('[data-nx-sketch-node]').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute('data-nx-sketch-node'), [element.getAttribute('data-nx-model-x'), element.getAttribute('data-nx-model-y')]]))), forcePositions, 'Reordering retains force positions');
  await update(page, 'setRevision', 0); await expect(scopes.horizontal.locator('[data-nx-horizontal-value]')).toHaveText(['100', '50', '25']);

  const sibling = page.locator('#catalogue-sibling');
  const siblingMarkup = await sibling.innerHTML();
  for (const family of families) {
    const scope = scopes[family];
    const before = await scope.locator('[data-nx-sketch-part="fillSketch"]').first().getAttribute('d');
    await scope.evaluate(element => { const style = (element as HTMLElement).style; style.setProperty('--nx-seriesA', '#234567'); style.setProperty('--nx-ink', '#453627'); style.setProperty('--nx-sketch-fillWeight', '0.8'); style.setProperty('--nx-sketch-roughness', '2'); });
    await expect.poll(() => scope.locator('[data-nx-sketch-part="fillSketch"]').first().getAttribute('d')).not.toBe(before);
    const paints = await scope.locator('[data-nx-sketch-part="fillSketch"]').evaluateAll(elements => elements.map(element => getComputedStyle(element).stroke));
    assert(paints.includes('rgb(35, 69, 103)'), `${family}: scoped categorical paint must reach hatching`);
    await expect.poll(() => scope.locator('[data-nx-sketch-part="path"]').first().evaluate(element => getComputedStyle(element).stroke)).toBe('rgb(69, 54, 39)');
    await scope.evaluate(element => (element as HTMLElement).style.setProperty('--nx-sketch-hachureGap', 'invalid'));
    await expect(scope.locator('[data-nx-sketch-part]')).toHaveCount(0);
    await expect(scope.locator('svg.recharts-surface')).toBeVisible();
    await scope.evaluate(element => (element as HTMLElement).removeAttribute('style'));
    await expect.poll(() => scope.locator('[data-nx-sketch-part]').count()).toBeGreaterThan(0);
  }
  assert.equal(await sibling.innerHTML(), siblingMarkup, 'Scoped decoration changes must leave sibling instances untouched');
  await update(page, 'setRevision', 2);
  await expect(scopes.horizontal.locator('[data-nx-horizontal-value]')).toHaveText(['75', '50', '25']);
  await expect(scopes.donut.locator('[data-nx-sketch-polar-total]')).toHaveText('150');
  await expect(scopes.scatter.locator('[data-nx-sketch-point="alpha"]')).toHaveAttribute('data-nx-x', '-2');

  await update(page, 'setMode', 'partial');
  await expect(scopes.horizontal.locator('[data-nx-horizontal-bar]')).toHaveCount(1);
  await expect(scopes.horizontal.locator('[data-nx-horizontal-value="beta"]')).toHaveText('—');
  await expect(scopes.horizontal.locator('[data-nx-horizontal-value="gamma"]')).toHaveText('0');
  await expect(scopes.stacked.locator('[data-nx-sketch-stack]')).toHaveCount(2);
  await expect(scopes.stacked.locator('[data-nx-sketch-total="beta"]')).toHaveText('—');
  await expect(scopes.line.locator('[data-nx-sketch-line="a"] [data-nx-sketch-segment]')).toHaveCount(0);
  await expect(scopes.line.locator('[data-nx-sketch-line="b"] [data-nx-sketch-segment]')).toHaveCount(2);
  await expect(scopes.scatter.locator('[data-nx-sketch-point]')).toHaveCount(2);
  await expect(scopes.scatter.locator('[data-nx-sketch-omitted]')).toHaveText('1 unavailable');
  for (const kind of ['pie', 'donut'] as const) { await expect(scopes[kind].locator('[data-nx-sketch-slice]')).toHaveCount(0); await expect(scopes[kind].getByRole('status')).toContainText('complete breakdown'); }
  for (const kind of ['force', 'network'] as const) { await expect(scopes[kind].locator('[data-nx-sketch-node]')).toHaveCount(3); await expect(scopes[kind].locator('[data-nx-sketch-circle]')).toHaveCount(1); }
  await expect(scopes.network.locator('[data-nx-sketch-edge]')).toHaveCount(2);
  for (const mode of ['empty', 'invalid', 'duplicates']) {
    await update(page, 'setMode', mode);
    for (const family of families) { await expect(scopes[family].locator('svg.recharts-surface')).toHaveCount(0); await expect(scopes[family].getByRole('status')).toBeVisible(); }
  }
  await update(page, 'setMode', 'bad-x'); await expect(scopes.line.getByRole('status')).toContainText('strictly increasing');
  await update(page, 'setMode', 'bad-links'); await expect(scopes.network.getByRole('status')).toContainText('existing endpoints');
  await update(page, 'setMode', 'zero');
  await expect(scopes.horizontal.locator('[data-nx-sketch-rect]')).toHaveCount(0); await expect(scopes.horizontal.locator('[data-nx-horizontal-value]')).toHaveText('0');
  await expect(scopes.stacked.locator('[data-nx-sketch-stack]')).toHaveCount(0); await expect(scopes.stacked.locator('[data-nx-sketch-total]')).toHaveText('0');
  for (const kind of ['pie', 'donut'] as const) await expect(scopes[kind].getByRole('status')).toContainText('No positive');
  for (const kind of ['force', 'network'] as const) { await expect(scopes[kind].locator('[data-nx-sketch-node]')).toHaveText('0'); await expect(scopes[kind].locator('[data-nx-sketch-circle]')).toHaveCount(0); }
  await update(page, 'setMode', 'single');
  for (const family of families) await expect(scopes[family].locator('svg.recharts-surface')).toBeVisible();
  await expect(scopes.pie.locator('[data-nx-sketch-slice]')).toHaveCount(1);
  assert.equal(await scopes.pie.locator('[data-nx-sketch-slice]').evaluate(element => Math.abs(Number(element.getAttribute('data-nx-start')) - Number(element.getAttribute('data-nx-end')))), 360);
  await update(page, 'setMode', 'normal'); await update(page, 'setRevision', 0);
  for (const width of [375, 320]) for (const family of families) {
    const scope = scopes[family]; await scope.evaluate((element, width) => (element as HTMLElement).style.width = `${width}px`, width);
    await expect.poll(() => scope.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  for (const family of families) await scopes[family].evaluate(element => (element as HTMLElement).removeAttribute('style'));
  await update(page, 'setAnimate', true); await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const family of families) await expect(scopes[family].locator('[data-nx-chart]')).toHaveAttribute('data-nx-animated', 'true');
  await update(page, 'setRevision', 2); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const family of families) await expect(scopes[family].locator('[data-nx-chart]')).toHaveAttribute('data-nx-animated', 'false');
  await expect(scopes.donut.locator('[data-nx-sketch-polar-total]')).toHaveText('150');
  console.log('Validated all eight added Sketchbook charts: native geometry/keyboard inspection, exact shares and area ratios, deterministic force layout, scoped sketch/paint fallbacks, independent instances, missing/zero/invalid data, numeric spacing, narrow containers and live reduced motion.');
}
