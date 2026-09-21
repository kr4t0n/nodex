import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const BAR_EXTENSION_SLUGS = ['rung-histogram', 'diverging-bar', 'range-capsules', 'rung-waterfall', 'tick-rows', 'pictorial-bar'];
export const BAR_EXTENSIONS_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { RungHistogram } from './components/nodex/rung-histogram/component';
import { PictorialBar } from './components/nodex/pictorial-bar/component';
import { TickRows } from './components/nodex/tick-rows/component';
import { DivergingBar } from './components/nodex/diverging-bar/component';
import { RangeCapsules } from './components/nodex/range-capsules/component';
import { RungWaterfall, type RungWaterfallDatum } from './components/nodex/rung-waterfall/component';

type Mode = 'normal' | 'empty' | 'zero' | 'invalid' | 'partial' | 'revised';
declare global { interface Window { nodexBarExtensions: { setMode: (mode: Mode) => void } } }
function Charts({ mode, animate }: { mode: Mode; animate: boolean }) {
  const empty = mode === 'empty';
  const zero = mode === 'zero';
  const invalid = mode === 'invalid';
  const partial = mode === 'partial';
  const revised = mode === 'revised';
  const waterfall: RungWaterfallDatum[] = empty ? [] : [
    { label: 'Opening', kind: 'start', valueK: invalid ? NaN : zero ? 0 : revised ? 9 : 8 },
    { label: 'Deduction', kind: 'change', valueK: invalid || partial ? null : zero ? 0 : -3 },
    { label: 'Result', kind: 'total' },
  ];
  return <>
    <PictorialBar data={empty?[]:[{year:'Same',treesK:invalid?NaN:zero?0:revised?150:26},{year:'Same',treesK:invalid?Infinity:partial?null:zero?0:41}]} targetK={130} animate={animate}/>
    <TickRows data={empty?[]:[{team:'Same',releases:invalid?1.5:zero?0:revised?7:5},{team:'Same',releases:invalid?NaN:partial?null:zero?0:3}]} animate={animate}/>
    <RungHistogram data={empty ? [] : [
      { fromHours: 0, toHours: 2, tickets: invalid ? 1.5 : zero ? 0 : revised ? 7 : 5 },
      { fromHours: 2, toHours: 4, tickets: invalid ? NaN : partial ? null : zero ? 0 : 3 },
    ]} animate={animate} />
    <DivergingBar data={empty ? [] : [
      { segment: 'Same', netAccounts: invalid ? NaN : zero ? 0 : revised ? 14 : 8 },
      { segment: 'Same', netAccounts: invalid || partial ? null : zero ? 0 : -3 },
    ]} animate={animate} />
    <RangeCapsules data={empty ? [] : [
      { day: 'Day', lowK: invalid ? 20 : 5, highK: invalid ? 10 : zero ? 5 : revised ? 60 : 40 },
      { day: 'Day', lowK: invalid || partial ? null : 20, highK: invalid ? Infinity : zero ? 20 : 60 },
    ]} animate={animate} />
    <RungWaterfall data={waterfall} animate={animate} />
  </>;
}
export function BarExtensionsConsumer({ animate }: { animate: boolean }) {
  const [mode, setMode] = useState<Mode>('normal');
  useEffect(() => { window.nodexBarExtensions = { setMode }; }, []);
  return <>
    <section id="bar-extensions-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate} /></section>
    <section id="bar-extensions-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false} /></section>
  </>;
}
`;

async function setMode(page: Page, mode: string) {
  await page.evaluate((value) => (window as unknown as { nodexBarExtensions: { setMode: (mode: string) => void } }).nodexBarExtensions.setMode(value), mode);
}

export async function checkBarExtensionsConsumer(page: Page): Promise<void> {
  const chart = (slug: string, scope = 'primary') => page.locator(`#bar-extensions-${scope} [data-nx-chart="${slug}"]`);
  const histogram = chart('rung-histogram');
  const waterfall = chart('rung-waterfall');
  const tickRows = chart('tick-rows');
  const pictorial=chart('pictorial-bar');
  await expect(pictorial.locator('[data-nx-track]')).toHaveCount(2);
  await expect(pictorial.locator('[data-nx-total="0"]')).toHaveText('26k');
  const plantingWidth=()=>pictorial.locator('[data-nx-planting-clip="0"]').evaluate(e=>Number(e.getAttribute('width')));
  const targetWidth=()=>pictorial.locator('[data-nx-track="0"] clipPath rect').evaluate(e=>Number(e.getAttribute('width')));
  assert(Math.abs(await plantingWidth()/await targetWidth()-0.2)<1e-6);
  const clipIds=await page.locator('[data-nx-chart="pictorial-bar"] clipPath').evaluateAll(nodes=>nodes.map(e=>e.id));assert.equal(new Set(clipIds).size,clipIds.length);
  const originalTrees=await pictorial.locator('[data-nx-observation="0"] [data-nx-tree]').count();
  await expect(tickRows.locator('[data-nx-tally]')).toHaveCount(8);
  await expect(tickRows.locator('[data-nx-counting-dot]')).toHaveCount(1);
  await expect(tickRows.locator('[data-nx-total="0"]')).toHaveText('5');
  await expect(histogram.locator('rect[data-nx-rung]')).toHaveCount(8);
  await expect(histogram.locator('[data-nx-counting-dot]')).toHaveCount(1);
  await expect(waterfall.locator('[data-nx-observation="0"] rect[data-nx-rung]')).toHaveCount(8);
  await expect(waterfall.locator('[data-nx-broken-rung]')).toHaveCount(6);
  await expect(waterfall.locator('[data-nx-total="2"]')).toHaveText('5');
  await expect(chart('diverging-bar').locator('[data-nx-bar]')).toHaveCount(2);
  await expect(chart('range-capsules').locator('[data-nx-capsule]')).toHaveCount(2);

  for (const slug of BAR_EXTENSION_SLUGS) {
    const node = chart(slug);
    const frame = () => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await node.scrollIntoViewIfNeeded();
    await page.mouse.move(880, 10);
    await frame();
    await node.locator('svg.recharts-surface').focus();
    await page.keyboard.press(slug === 'diverging-bar' || slug === 'tick-rows' || slug === 'pictorial-bar' ? 'ArrowLeft' : 'ArrowRight');
    await frame();
    await expect(node.locator('.recharts-tooltip-wrapper:visible')).toContainText(slug === 'rung-histogram' ? 'tickets' : slug === 'diverging-bar' ? 'accounts' : slug === 'range-capsules' ? 'users' : slug === 'tick-rows' ? 'releases' : slug === 'pictorial-bar' ? 'trees' : '$');
    await expect(chart(slug, 'secondary').locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
    const sibling = await chart(slug, 'secondary').locator('svg').innerHTML();
    await node.evaluate((element) => {
      const style = (element as HTMLElement).style;
      style.setProperty('--nx-ink', '#123456');
      style.setProperty('--nx-markQuiet', '#123456');
      style.setProperty('--nx-grid', '#234567');
      style.setProperty('--nx-stroke-mark', '2px');
    });
    const mark = node.locator('[data-nx-bar], [data-nx-capsule], rect[data-nx-rung], rect[data-nx-tally], [data-nx-observation] [data-nx-tree]').first();
    await expect.poll(() => mark.evaluate((element) => getComputedStyle(element).fill)).toBe('rgb(18, 52, 86)');
    if(slug==='pictorial-bar') await expect.poll(()=>node.locator('[data-nx-track] [data-nx-tree]').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(35, 69, 103)');
    assert.equal(await chart(slug, 'secondary').locator('svg').innerHTML(), sibling, 'Scoped token updates changed an independent chart');
    const beforeWidth = Number(await node.locator('svg').getAttribute('width'));
    await node.evaluate((element) => { (element as HTMLElement).style.width = '340px'; });
    await expect.poll(async () => Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(beforeWidth);
    await node.evaluate((element) => { (element as HTMLElement).style.width = ''; });
  }
  await setMode(page, 'revised');
  await expect(pictorial.locator('[data-nx-total="0"]')).toHaveText('150k');
  // Labels can commit before Recharts has recalculated its native Bar geometry.
  await expect.poll(() => pictorial.evaluate((element) => {
    const planted = Number(element.querySelector('[data-nx-planting-clip="0"]')?.getAttribute('width'));
    const target = Number(element.querySelector('[data-nx-track="0"] clipPath rect')?.getAttribute('width'));
    return planted - target;
  })).toBeGreaterThan(0);
  assert(await pictorial.locator('[data-nx-observation="0"] [data-nx-tree]').count()>originalTrees);
  await expect(histogram.locator('rect[data-nx-rung]')).toHaveCount(10);
  await expect(tickRows.locator('[data-nx-tally]')).toHaveCount(10);
  await expect.poll(()=>tickRows.locator('[data-nx-tally]').first().evaluate(e=>getComputedStyle(e).width)).toBe('1.8px');
  await expect(waterfall.locator('[data-nx-total="2"]')).toHaveText('6');
  await setMode(page, 'partial');
  await expect(pictorial.locator('[data-nx-track]')).toHaveCount(1);
  await expect(pictorial.locator('[data-nx-total="1"]')).toHaveText('—');
  await expect(histogram.locator('.recharts-reference-line')).toHaveCount(0);
  await expect(waterfall.locator('[data-nx-total="2"]')).toHaveText('—');
  await expect(waterfall.locator('[data-nx-broken-rung]')).toHaveCount(0);
  await expect(chart('range-capsules').locator('[data-nx-capsule]')).toHaveCount(1);
  await expect(tickRows.locator('[data-nx-total="1"]')).toHaveText('—');
  await expect(tickRows.locator('[data-nx-tally]')).toHaveCount(5);
  for (const mode of ['zero', 'invalid', 'empty']) {
    await setMode(page, mode);
    for (const slug of BAR_EXTENSION_SLUGS) {
      const node = chart(slug);
      if (mode === 'zero') {
        if(slug==='pictorial-bar'){await expect(node.locator('[data-nx-total="0"]')).toHaveText('0k');await expect(node.locator('[data-nx-track]')).toHaveCount(2);await expect(node.locator('[data-nx-observation] [data-nx-tree]')).toHaveCount(0);}
        if(slug==='tick-rows') await expect(node.locator('[data-nx-total="0"]')).toHaveText('0');
        await expect(node.locator('svg.recharts-surface')).toHaveCount(1);
        await expect(node.locator('[data-nx-bar], [data-nx-capsule], rect[data-nx-rung], rect[data-nx-tally]')).toHaveCount(0);
      } else await expect(node.getByRole('status')).toContainText('available');
      assert.equal(await node.evaluate((element) => /NaN|Infinity/.test(element.innerHTML)), false, `${slug}: ${mode} leaked invalid coordinates`);
    }
  }
  await setMode(page, 'normal');
  console.log('Validated interval, signed-bar, histogram and waterfall delivery, token scopes, keyboard inspection, resizing, missing data and running totals.');
}
