import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const HEATMAP_SLUGS = ['dot-heat', 'matrix-heat', 'matrix-heat-glance', 'calendar-heat', 'rank-strip'];
export const HEATMAP_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { DotHeat } from './components/nodex/dot-heat/component';
import { MatrixHeat } from './components/nodex/matrix-heat/component';
import { MatrixHeatGlance } from './components/nodex/matrix-heat-glance/component';
import { CalendarHeat } from './components/nodex/calendar-heat/component';
import { RankStrip } from './components/nodex/rank-strip/component';

type Mode = 'normal' | 'revised' | 'empty' | 'zero' | 'invalid' | 'partial' | 'single';
declare global { interface Window { nodexHeatmapFixture: { setMode: (value: Mode) => void } } }
function Charts({ mode, animate }: { mode: Mode; animate: boolean }) {
  const empty = mode === 'empty';
  const zero = mode === 'zero';
  const invalid = mode === 'invalid';
  const revised = mode === 'revised';
  const partial = mode === 'partial';
  const single = mode === 'single';
  const features = empty ? [] : single ? ['A'] : ['A', 'A', 'C'];
  const hours = [
    { day: 'MON', hour: invalid ? NaN : 8, tickets: invalid ? NaN : 0 },
    { day: 'MON', hour: invalid ? -1 : 9, tickets: invalid || partial ? null : zero ? 0 : 4 },
    { day: 'TUE', hour: invalid ? 24 : 8, tickets: invalid || partial ? null : zero ? 0 : revised ? 9 : 16 },
  ];
  const matrix = [
    [null, invalid ? Infinity : zero ? 0 : revised ? 35 : 40, invalid ? -1 : 0],
    [invalid || partial ? null : zero ? 0 : 40, null, invalid ? 101 : zero ? 0 : 6],
    [invalid || partial ? null : 0, invalid || partial ? null : zero ? 0 : 6, null],
  ];
  const releases = [
    { release: 'A', adoption: [invalid ? NaN : zero ? 0 : revised ? 60 : 70, invalid || partial ? null : zero ? 0 : 46, invalid ? -1 : 0] },
    { release: 'A', adoption: [null, invalid || partial ? null : zero ? 0 : 16, invalid || partial ? null : zero ? 0 : 64] },
  ];
  const weeks = [
    { week: 'Week A', deploys: [invalid ? NaN : 0, invalid || partial ? null : zero ? 0 : 4] },
    { week: 'Week B', deploys: [invalid || partial ? null : zero ? 0 : revised ? 9 : 16] },
  ];
  const ranks=[{name:'A',ranks:invalid?[NaN,0.5,Infinity]:zero?[0,0,0]:partial?[1,null,null]:[1,3,revised?3:1]},{name:'A',ranks:invalid?[-1,0,null]:zero?[0,0,0]:[5,1,2]}];
  return <>
    <RankStrip data={empty?[]:single?ranks.slice(0,1):ranks} periods={features} animate={animate}/>
    <DotHeat data={empty ? [] : single ? hours.slice(0, 1) : hours} animate={animate} />
    <MatrixHeat features={features} data={empty ? [] : single ? [[null]] : matrix} animate={animate} />
    <MatrixHeatGlance features={features} data={empty ? [] : single ? releases.slice(0, 1) : releases} animate={animate} />
    <CalendarHeat data={empty ? [] : single ? weeks.slice(0, 1) : weeks} periods={[{week:0,label:'Period A'},{week:1,label:'Period B'}]} peakLabel="Caller peak" animate={animate} />
  </>;
}
export function HeatmapConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  useEffect(() => { window.nodexHeatmapFixture = { setMode }; }, []);
  return <>
    <section id="heatmap-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate} /></section>
    <section id="heatmap-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false} /></section>
  </>;
}
`;

async function setMode(page: Page, mode: string) {
  await page.evaluate((value) => (window as unknown as { nodexHeatmapFixture: { setMode: (mode: string) => void } }).nodexHeatmapFixture.setMode(value), mode);
}

export async function checkHeatmapConsumer(page: Page): Promise<void> {
  const chart = (slug: string, scope = 'primary') => page.locator(`#heatmap-${scope} [data-nx-chart="${slug}"]`);
  const dot = chart('dot-heat');
  const matrix = chart('matrix-heat');
  const glance = chart('matrix-heat-glance');
  const calendar = chart('calendar-heat');
  const rank = chart('rank-strip');
  await expect(rank.locator('[data-nx-cell]')).toHaveCount(6);
  const originalRankY=await rank.locator('[data-nx-cell="0:0"]').getAttribute('y');
  assert.notEqual(await rank.locator('[data-nx-rank="0:0"]').evaluate(e=>getComputedStyle(e).fill),await rank.locator('[data-nx-rank="1:0"]').evaluate(e=>getComputedStyle(e).fill),'Rank labels must keep contrast against absolute rank tones');
  await expect(dot.locator('[data-nx-ticket]')).toHaveCount(3);
  await expect(dot.locator('[data-nx-ticket="0"]')).toHaveAttribute('r', '0.8');
  expect(Number(await dot.locator('[data-nx-ticket="1"]').getAttribute('r'))).toBeCloseTo(5.4);
  expect(Number(await dot.locator('[data-nx-ticket="2"]').getAttribute('r'))).toBeCloseTo(9.6);
  await expect(dot.locator('[data-nx-peak]')).toHaveCount(1);
  await expect(matrix.locator('[data-nx-cell]')).toHaveCount(4);
  await expect(matrix.locator('[data-nx-zero]')).toHaveCount(2);
  await expect(matrix.locator('[data-nx-self]')).toHaveCount(3);
  await expect(matrix.locator('[data-nx-peak]')).toHaveCount(1);
  await expect(glance.locator('[data-nx-cell]')).toHaveCount(5);
  await expect(glance.locator('[data-nx-value="0:2"]')).toHaveText('0');
  await expect(calendar.locator('[data-nx-deploys]')).toHaveCount(3);
  await expect(calendar.locator('[data-nx-deploys="0:0"]')).toHaveAttribute('r', '0.75');
  expect(Number(await calendar.locator('[data-nx-deploys="1:0"]').getAttribute('r'))).toBeCloseTo(7.3);
  await expect(calendar).toContainText('Caller peak — 16 deploys in a day');
  await expect(calendar).toContainText('Period A');
  assert.notEqual(await glance.locator('[data-nx-value="0:0"]').evaluate((node) => getComputedStyle(node).fill), await glance.locator('[data-nx-value="0:1"]').evaluate((node) => getComputedStyle(node).fill), 'Heatmap value contrast must follow its fixed tone band');

  for (const slug of HEATMAP_SLUGS) {
    const node = chart(slug);
    const dots = slug === 'dot-heat' || slug === 'calendar-heat';
    const first = slug === 'dot-heat' ? '[data-nx-ticket="2"]' : slug === 'calendar-heat' ? '[data-nx-deploys="1:0"]' : slug === 'matrix-heat' ? '[data-nx-cell="0:1"]' : '[data-nx-cell="0:0"]';
    await node.scrollIntoViewIfNeeded();
    await node.locator(dots ? first : slug === 'matrix-heat' ? '[data-nx-observation="0:1"]' : '[data-nx-observation="0:0"]').hover();
    const tooltip = node.locator('.recharts-tooltip-wrapper:visible');
    await expect(tooltip).toContainText(slug === 'dot-heat' ? 'tickets' : slug === 'calendar-heat' ? 'deploys' : slug === 'rank-strip' ? ' — #' : 'accounts');
    await page.mouse.move(880, 10);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await node.locator('svg.recharts-surface').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tooltip).toContainText(slug === 'dot-heat' ? 'tickets' : slug === 'calendar-heat' ? 'deploys' : slug === 'rank-strip' ? ' — #' : 'accounts');
    await expect(chart(slug, 'secondary').locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
    const siblingPaint = await chart(slug, 'secondary').locator(first).evaluate((element) => getComputedStyle(element).fill);
    await node.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--nx-ink', '#123456');
      style.setProperty('--nx-radius-heatCell', '7px');
      style.setProperty('--nx-radius-heatCellLarge', '12px');
      style.setProperty('--nx-radius-rankCell', '12px');
    });
    await expect.poll(() => node.locator(first).evaluate((element) => getComputedStyle(element).fill)).toBe('rgb(18, 52, 86)');
    assert.equal(await chart(slug, 'secondary').locator(first).evaluate((element) => getComputedStyle(element).fill), siblingPaint);
    if (!dots) await expect.poll(() => node.locator(first).evaluate((element) => getComputedStyle(element).rx)).toBe(slug === 'matrix-heat' ? '7px' : '12px');
    const width = Number(await node.locator('svg').getAttribute('width'));
    const cellWidth = dots ? 0 : Number(await node.locator(first).getAttribute('width'));
    await node.evaluate((element) => { (element as HTMLElement).style.width = '340px'; });
    await expect.poll(async () => Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);
    if (cellWidth) await expect.poll(async () => Number(await node.locator(first).getAttribute('width'))).toBeLessThan(cellWidth);
    await node.evaluate((element) => { (element as HTMLElement).style.width = ''; });
    await expect.poll(async () => Number(await node.locator('svg').getAttribute('width'))).toBe(width);
  }
  const highBand = matrix.getByRole('button', { name: '37+' });
  await highBand.click();
  await expect(highBand).toHaveAttribute('aria-pressed', 'false');
  await expect(matrix.locator('[data-nx-cell]')).toHaveCount(2);
  await expect(matrix.locator('[data-nx-zero]')).toHaveCount(2);
  await expect(chart('matrix-heat', 'secondary').locator('[data-nx-cell]')).toHaveCount(4);
  await highBand.press('Space');
  await expect(matrix.locator('[data-nx-cell]')).toHaveCount(4);
  await setMode(page, 'revised');
  await expect(glance.locator('[data-nx-value="0:0"]')).toHaveText('60');
  await expect(rank.locator('[data-nx-cell="0:0"]')).not.toHaveAttribute('y',originalRankY!);
  await expect(rank.locator('[data-nx-rank="0:2"]')).toHaveText('3');
  await expect(matrix.locator('[data-nx-observation="1:0"] [data-nx-peak]')).toHaveCount(1);
  await expect.poll(async () => Number(await dot.locator('[data-nx-ticket="2"]').getAttribute('r'))).toBeCloseTo(7.5);
  await expect(calendar).toContainText('Caller peak — 9 deploys in a day');
  await setMode(page, 'partial');
  await expect(dot.locator('[data-nx-ticket]')).toHaveCount(1);
  await expect(dot.locator('[data-nx-peak]')).toHaveCount(0);
  await expect(matrix.locator('[data-nx-observation]')).toHaveCount(3);
  await expect(glance.locator('[data-nx-cell]')).toHaveCount(2);
  await expect(calendar.locator('[data-nx-deploys]')).toHaveCount(1);
  await expect(rank.locator('[data-nx-cell]')).toHaveCount(4);
  assert(Number(await rank.locator('[data-nx-cell="0:0"]').getAttribute('y'))>Number(await rank.locator('[data-nx-cell="1:0"]').getAttribute('y')),'A missing final-period rank must sort after known finishers');
  for (const mode of ['single', 'zero', 'invalid', 'empty']) {
    await setMode(page, mode);
    for (const slug of HEATMAP_SLUGS) {
      const node = chart(slug);
      if (mode === 'invalid' || mode === 'empty' || mode === 'single' && slug === 'matrix-heat' || mode === 'zero' && slug === 'rank-strip') await expect(node.getByRole('status')).toContainText('available');
      else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);
      assert.equal(await node.evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `${slug}: ${mode} produced invalid DOM`);
    }
    if (mode === 'zero') {
      await expect(matrix.locator('[data-nx-zero]')).toHaveCount(6);
      await expect(matrix.locator('[data-nx-peak]')).toHaveCount(0);
      await expect(dot.locator('[data-nx-peak]')).toHaveCount(0);
      await expect(calendar.locator('[data-nx-peak]')).toHaveCount(0);
    }
  }
  await setMode(page, 'normal');
  console.log('Validated heatmap source delivery, fixed bands, zero/missing/self distinction, cell geometry and radii, scoped paint, legends, keyboard inspection and data changes.');
}
