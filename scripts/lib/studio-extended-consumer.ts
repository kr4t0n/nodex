import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';
import { checkStudioGaugeGeometry } from './studio-preview-fit.ts';

export const STUDIO_EXTENDED_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { SoftLine } from './components/nodex/soft-line/component';
import { SoftStackedBars } from './components/nodex/soft-stacked-bars/component';
import { SoftScatter } from './components/nodex/soft-scatter/component';
import { SoftDumbbell } from './components/nodex/soft-dumbbell/component';
import { SoftGauge } from './components/nodex/soft-gauge/component';
type Mode = 'normal' | 'partial' | 'zero' | 'single' | 'empty' | 'invalid' | 'duplicates' | 'bad-series' | 'bad-x' | 'overflow' | 'full' | 'bad-target' | 'signed' | 'many';
declare global { interface Window { nodexStudioExtended: { setMode: (mode: Mode) => void; setRevision: (value: boolean) => void; setAnimate: (value: boolean) => void } } }
export function StudioExtendedConsumer() {
  const [mode, setMode] = useState<Mode>('normal');
  const [revision, setRevision] = useState(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { window.nodexStudioExtended = { setMode, setRevision, setAnimate }; }, []);
  const normal = [{ id: 'a', label: 'Same', x: 0, values: { focus: 10, rest: 4 } }, { id: 'b', label: 'Same', x: 1, values: { focus: 20, rest: 8 } }, { id: 'c', label: 'Last', x: 4, values: { focus: 30, rest: 12 } }];
  const series = [{ id: 'focus', label: 'Focus', tone: 'a' as const }, { id: 'rest', label: 'Rest', tone: 'b' as const }];
  const records = mode === 'empty' ? [] : mode === 'single' ? normal.slice(0, 1) : mode === 'many' ? Array.from({ length: 18 }, (_, i) => ({ id: String(i), label: 'Item ' + i, x: i, values: { focus: i + 1, rest: 2 } })) : normal;
  const rows = records.map((row, i) => ({ ...row, id: mode === 'duplicates' ? 'a' : row.id, x: mode === 'bad-x' ? 1 : row.x,
    values: { focus: mode === 'zero' ? 0 : mode === 'partial' && i === 1 ? null : mode === 'invalid' ? NaN : mode === 'signed' ? -row.values.focus : row.values.focus,
      rest: mode === 'zero' ? 0 : mode === 'invalid' ? Infinity : row.values.rest } }));
  const keys = mode === 'bad-series' ? [series[0]!, series[0]!] : revision ? series.toReversed() : series;
  const ordered = revision ? rows.toReversed() : rows;
  const scatter = ordered.map((row, i) => ({ id: row.id, label: row.label, tone: 'a' as const,
    x: mode === 'partial' && row.id === 'b' ? null : mode === 'invalid' ? NaN : mode === 'zero' ? 0 : mode === 'signed' ? -i : row.x,
    y: mode === 'invalid' ? Infinity : mode === 'zero' ? 0 : mode === 'signed' ? -i * 2 : row.x * 2 }));
  const pairs = ordered.map(row => ({ id: row.id, label: row.label,
    before: mode === 'partial' && row.id === 'b' ? null : mode === 'invalid' ? NaN : mode === 'zero' || row.id === 'c' ? 0 : mode === 'signed' ? -10 : row.values.focus,
    after: mode === 'invalid' ? Infinity : mode === 'zero' || row.id === 'c' ? 0 : row.id === 'a' ? 30 : 10 }));
  const value = mode === 'zero' ? 0 : mode === 'full' ? 100 : mode === 'overflow' ? 101 : mode === 'signed' ? -1 : mode === 'empty' || mode === 'partial' ? null : mode === 'invalid' ? NaN : 25;
  return <div data-studio>
    <div id="studio-extended-primary" className="w-[720px]">
      <SoftLine data={rows} series={keys} unitLabel="Hours" animate={animate} />
      <SoftStackedBars data={mode === 'overflow' ? [{ id: 'huge', label: 'Huge', values: { focus: Number.MAX_VALUE, rest: Number.MAX_VALUE } }] : ordered} series={keys} unitLabel="Hours" animate={animate} />
      <SoftScatter data={scatter} xLabel="Time" yLabel="Energy" animate={animate} />
      <SoftDumbbell data={pairs} unitLabel="Days" animate={animate} />
      <SoftGauge data={{ value, target: mode === 'bad-target' ? 0 : 100 }} unitLabel="Books" animate={animate} />
    </div>
    <div id="studio-extended-secondary" className="w-[620px]">
      <SoftLine data={normal} series={series} animate={false} />
      <SoftStackedBars data={normal} series={series} animate={false} />
      <SoftScatter data={[{ id: 'a', label: 'A', x: 1, y: 2, tone: 'a' }]} animate={false} />
      <SoftDumbbell data={[{ id: 'a', label: 'A', before: 1, after: 2 }]} animate={false} />
      <SoftGauge data={{ value: 25, target: 100 }} animate={false} />
    </div>
  </div>;
}
`;

const slugs = ['soft-line', 'soft-stacked-bars', 'soft-scatter', 'soft-dumbbell', 'soft-gauge'];
const chart = (page: Page, slug: string) => page.locator(`#studio-extended-primary [data-nx-chart="${slug}"]`);
const mode = (page: Page, value: string) => page.evaluate(value => (window as unknown as { nodexStudioExtended: { setMode: (value: string) => void } }).nodexStudioExtended.setMode(value), value);

export async function checkStudioExtendedConsumer(page: Page): Promise<void> {
  const line = chart(page, 'soft-line'); const stack = chart(page, 'soft-stacked-bars');
  const scatter = chart(page, 'soft-scatter'); const pair = chart(page, 'soft-dumbbell'); const gauge = chart(page, 'soft-gauge');
  await expect(line.locator('[data-nx-soft-line-point]')).toHaveCount(6);
  await expect(stack.locator('[data-nx-soft-stack]')).toHaveCount(6);
  await expect(scatter.locator('[data-nx-soft-scatter]')).toHaveCount(3);
  await expect(pair.locator('[data-nx-soft-pair]')).toHaveCount(3);
  await expect(gauge.locator('[data-nx-soft-gauge-percent]')).toHaveText('25%');
  const xs = await line.locator('[data-nx-soft-line-point][data-nx-series="focus"]').evaluateAll(es => es.map(e => Number(e.getAttribute('cx'))));
  assert(Math.abs((xs[2]! - xs[0]!) / (xs[1]! - xs[0]!) - 4) < 0.001, 'Lines must retain numeric time intervals');
  const segments = await stack.locator('[data-nx-soft-stack="a"]').evaluateAll(es => es.map(e => ({ x: Number(e.getAttribute('x')), width: Number(e.getAttribute('width')) })));
  assert(Math.abs(segments[0]!.width / segments[1]!.width - 2.5) < 0.001, 'Stack segment widths must be proportional to their values');
  assert(Math.abs(segments[0]!.x + segments[0]!.width - segments[1]!.x) < 0.001, 'Stack bounds must join without invented gaps');
  await expect(stack.locator('[data-nx-soft-stack-total]')).toHaveText(['14', '28', '42']);
  const scatterXs = await scatter.locator('[data-nx-soft-scatter]').evaluateAll(es => es.map(e => Number(e.getAttribute('cx'))));
  assert(Math.abs((scatterXs[2]! - scatterXs[0]!) / (scatterXs[1]! - scatterXs[0]!) - 4) < 0.001, 'Scatter uses numeric positions');
  assert.equal(new Set(await scatter.locator('[data-nx-soft-scatter]').evaluateAll(es => es.map(e => e.getAttribute('r')))).size, 1, 'Scatter area must not imply a third measurement');
  const decreasing = await pair.locator('[data-nx-soft-pair-rail="b"]').evaluate(e => Number(e.getAttribute('x1')) > Number(e.getAttribute('x2')));
  assert(decreasing, 'Decreases must preserve the caller endpoint order');
  assert.equal(await pair.locator('[data-nx-soft-before="c"]').getAttribute('cx'), await pair.locator('[data-nx-soft-after="c"]').getAttribute('cx'), 'Tied endpoints must coincide');
  const angles = () => gauge.locator('[data-nx-soft-gauge-arc]').evaluateAll(es => es.map(e => Math.abs(Number(e.getAttribute('data-nx-start')) - Number(e.getAttribute('data-nx-end')))));
  assert.deepEqual(await angles(), [45, 135], 'Gauge arcs must divide exactly 180 degrees');
  await checkStudioGaugeGeometry(gauge);
  // A wrapper without CSS aspect-ratio must still give Recharts a real height.
  const gaugeStage = gauge.locator('.recharts-responsive-container').locator('..');
  await gaugeStage.evaluate(element => { (element as HTMLElement).style.aspectRatio = 'auto'; });
  await page.locator('#studio-extended-primary').evaluate(element => { (element as HTMLElement).style.width = '320px'; });
  await expect.poll(() => gauge.locator('svg.recharts-surface').evaluate(element => element.getBoundingClientRect().width)).toBeLessThan(300);
  await checkStudioGaugeGeometry(gauge);
  await page.locator('#studio-extended-primary').evaluate(element => { (element as HTMLElement).style.width = '720px'; });
  await expect.poll(() => gauge.locator('svg.recharts-surface').evaluate(element => element.getBoundingClientRect().width)).toBe(400);
  await checkStudioGaugeGeometry(gauge);
  await gaugeStage.evaluate(element => element.removeAttribute('style'));
  await page.locator('#studio-extended-primary').evaluate(element => element.removeAttribute('style'));

  for (const [node, first, second, advance] of [
    [line, 'SameFocus: 10 HoursRest: 4 Hours', 'SameFocus: 20 HoursRest: 8 Hours', 'ArrowRight'],
    // Recharts reverses Left/Right progression on a vertical category axis.
    [stack, 'SameFocus: 10Rest: 414 Hours', 'SameFocus: 20Rest: 828 Hours', 'ArrowLeft'],
    [scatter, 'SameTime: 0Energy: 0', 'SameTime: 1Energy: 2', 'ArrowRight'],
    [pair, 'SameBefore: 10 DaysAfter: 30 Days', 'SameBefore: 20 DaysAfter: 10 Days', 'ArrowRight'],
    [gauge, 'Complete25 Books', 'Remaining75 Books', 'ArrowRight'],
  ] as const) {
    await node.scrollIntoViewIfNeeded(); await page.mouse.move(880, 10);
    await node.locator('svg.recharts-surface').focus();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(first);
    await page.keyboard.press(advance);
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(second);
    await page.keyboard.press(advance === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft');
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toHaveText(first);
  }
  await stack.locator('[data-nx-soft-stack="b"]').first().hover();
  await expect(stack.locator('.recharts-tooltip-wrapper:visible')).toHaveText('SameFocus: 20Rest: 828 Hours');
  await scatter.locator('[data-nx-soft-scatter="b"]').hover();
  await expect(scatter.locator('.recharts-tooltip-wrapper:visible')).toHaveText('SameTime: 1Energy: 2');
  await pair.locator('[data-nx-soft-after="a"]').hover();
  await expect(pair.locator('.recharts-tooltip-wrapper:visible')).toHaveText('SameBefore: 10 DaysAfter: 30 Days');

  const siblingPaint = await page.locator('#studio-extended-secondary svg').evaluateAll(es => es.map(e => e.innerHTML));
  await page.locator('#studio-extended-primary').evaluate(e => (e as HTMLElement).style.setProperty('--nx-seriesA', '#923b61'));
  await expect(line.locator('.recharts-line-curve').first()).toHaveCSS('stroke', 'rgb(146, 59, 97)');
  for (const mark of [stack.locator('[data-nx-soft-stack][data-nx-series="focus"]').first(), scatter.locator('[data-nx-soft-scatter]').first(), pair.locator('[data-nx-soft-after]').first(), gauge.locator('[data-nx-soft-gauge-arc="complete"]')]) await expect(mark).toHaveCSS('fill', 'rgb(146, 59, 97)');
  await expect(page.locator('#studio-extended-secondary [data-nx-soft-gauge-arc="complete"]')).toHaveCSS('fill', 'rgb(78, 115, 223)');
  assert.deepEqual(await page.locator('#studio-extended-secondary svg').evaluateAll(es => es.map(e => e.innerHTML)), siblingPaint, 'Overrides must retain sibling geometry');
  await page.locator('#studio-extended-primary').evaluate(e => e.removeAttribute('style'));
  const paints = await stack.locator('[data-nx-studio-key]').evaluateAll(es => Object.fromEntries(es.map(e => [e.getAttribute('data-nx-studio-key'), getComputedStyle(e).backgroundColor])));
  await page.evaluate(() => (window as unknown as { nodexStudioExtended: { setRevision: (value: boolean) => void } }).nodexStudioExtended.setRevision(true));
  await expect(stack.locator('[data-nx-soft-stack-total]')).toHaveText(['42', '28', '14']);
  assert.deepEqual(await stack.locator('[data-nx-studio-key]').evaluateAll(es => Object.fromEntries(es.map(e => [e.getAttribute('data-nx-studio-key'), getComputedStyle(e).backgroundColor]))), paints, 'Series reorder must preserve paint');
  await page.evaluate(() => (window as unknown as { nodexStudioExtended: { setRevision: (value: boolean) => void } }).nodexStudioExtended.setRevision(false));

  await mode(page, 'partial');
  await expect(line.locator('[data-nx-soft-line-point]')).toHaveCount(5);
  await expect.poll(() => line.locator('.recharts-line-curve').first().getAttribute('d').then(d => (d?.match(/M/g) ?? []).length)).toBe(2);
  await expect(stack.locator('[data-nx-soft-stack-total]')).toHaveText(['14', '—', '42']);
  await expect(stack.locator('[data-nx-soft-stack="b"]')).toHaveCount(0);
  await expect(scatter.locator('[data-nx-soft-scatter-count]')).toHaveText('2 observations · 1 unavailable');
  await expect(pair.locator('[data-nx-soft-before="b"]')).toHaveCount(0);
  await expect(pair.locator('[data-nx-soft-after="b"]')).toHaveCount(1);
  await expect(pair.locator('[data-nx-soft-pair-rail="b"]')).toHaveCount(0);
  await expect(gauge.getByRole('status')).toHaveText('Progress must be between zero and a finite, positive target.');
  await mode(page, 'zero');
  await expect(line.locator('[data-nx-soft-line-point]')).toHaveCount(6);
  await expect(stack.locator('[data-nx-soft-stack]')).toHaveCount(0);
  await expect(stack.locator('[data-nx-soft-stack-total]')).toHaveText(['0', '0', '0']);
  await expect(scatter.locator('[data-nx-soft-scatter]')).toHaveCount(3);
  await expect(pair.locator('[data-nx-soft-before]')).toHaveCount(3);
  await expect(gauge.locator('[data-nx-soft-gauge-arc="complete"]')).toHaveCount(0);
  await expect(gauge.locator('[data-nx-soft-gauge-percent]')).toHaveText('0%');
  assert.deepEqual(await angles(), [180]);
  await mode(page, 'full');
  await expect(gauge.locator('[data-nx-soft-gauge-arc="remaining"]')).toHaveCount(0);
  await expect(gauge.locator('[data-nx-soft-gauge-percent]')).toHaveText('100%');
  assert.deepEqual(await angles(), [180]);
  await mode(page, 'single');
  await expect(line.locator('[data-nx-soft-line-point]')).toHaveCount(2);
  await expect(stack.locator('[data-nx-soft-stack]')).toHaveCount(2);
  await expect(scatter.locator('[data-nx-soft-scatter]')).toHaveCount(1);
  await expect(pair.locator('[data-nx-soft-pair]')).toHaveCount(1);
  await mode(page, 'empty');
  for (const slug of slugs) await expect(chart(page, slug).getByRole('status')).toBeVisible();
  await mode(page, 'invalid');
  await expect(line.getByRole('status')).toHaveText('No observations available.');
  await expect(scatter.getByRole('status')).toHaveText('No complete observations available.');
  await expect(stack.locator('[data-nx-soft-stack-total]')).toHaveText(['—', '—', '—']);
  await expect(pair.locator('[data-nx-soft-pair]')).toHaveCount(3);
  await expect(pair.locator('[data-nx-soft-before], [data-nx-soft-after], [data-nx-soft-pair-rail]')).toHaveCount(0);
  await mode(page, 'duplicates');
  for (const slug of slugs.filter(slug => slug !== 'soft-gauge')) await expect(chart(page, slug).getByRole('status')).toContainText('unique, nonempty ID');
  await mode(page, 'bad-series');
  for (const node of [line, stack]) await expect(node.getByRole('status')).toContainText('unique, nonempty IDs');
  await mode(page, 'bad-x');
  await expect(line.getByRole('status')).toHaveText('X coordinates must be finite and strictly increasing.');
  await mode(page, 'overflow');
  await expect(stack.locator('[data-nx-soft-stack-total]')).toHaveText('—');
  await expect(stack.locator('[data-nx-soft-stack]')).toHaveCount(0);
  await expect(gauge.locator('[data-nx-soft-gauge-arc]')).toHaveCount(0);
  await mode(page, 'bad-target');
  await expect(gauge.getByRole('status')).toHaveText('Progress must be between zero and a finite, positive target.');
  await mode(page, 'signed');
  await expect(line.locator('[data-nx-soft-line-point]')).toHaveCount(6);
  await expect(scatter.locator('[data-nx-soft-scatter]')).toHaveCount(3);
  await expect(pair.locator('[data-nx-soft-pair-rail]')).toHaveCount(3);
  await expect(stack.locator('[data-nx-soft-stack]')).toHaveCount(0);
  await mode(page, 'many');
  await page.locator('#studio-extended-primary').evaluate(e => (e as HTMLElement).style.width = '280px');
  await expect(stack.locator('[data-nx-soft-stack-total]')).toHaveCount(18);
  for (const slug of slugs) assert(await chart(page, slug).evaluate(e => e.scrollWidth <= e.clientWidth + 1), `${slug}: narrow containers must retain local overflow`);
  for (const node of [line, stack, pair]) assert(await node.evaluate(e => [...e.querySelectorAll('div')].some(child => getComputedStyle(child).overflowX === 'auto' && child.scrollWidth > child.clientWidth)), 'Dense comparisons need a local scroll area');
  await page.locator('#studio-extended-primary').evaluate(e => e.removeAttribute('style'));
  await mode(page, 'normal');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => (window as unknown as { nodexStudioExtended: { setAnimate: (value: boolean) => void } }).nodexStudioExtended.setAnimate(true));
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of slugs) await expect(chart(page, slug)).toHaveAttribute('data-nx-animated', 'false');
  assert.equal(await page.locator('#studio-extended-primary svg').evaluateAll(es => es.some(e => /NaN|Infinity/.test(e.innerHTML))), false, 'Geometry must stay finite');
  console.log('Validated five additional Studio charts: exact scales and angles, gaps, missing endpoints, zero/full targets, invalid data, updates, native inspection, scoped tokens and motion.');
}
