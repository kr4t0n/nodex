import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const SCATTER_LAYOUT_SLUGS = ['dotty-matrix', 'beeswarm', 'violin'];
export const SCATTER_LAYOUT_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { DottyMatrix } from './components/nodex/dotty-matrix/component';
import { Beeswarm } from './components/nodex/beeswarm/component';
import { Violin } from './components/nodex/violin/component';

type Mode = 'normal' | 'revised' | 'empty' | 'zero' | 'invalid' | 'partial' | 'single';
declare global { interface Window { nodexScatterLayoutFixture: { setMode: (value: Mode) => void } } }
function Charts({ mode, animate }: { mode: Mode; animate: boolean }) {
  const empty = mode === 'empty';
  const zero = mode === 'zero';
  const invalid = mode === 'invalid';
  const revised = mode === 'revised';
  const partial = mode === 'partial';
  const single = mode === 'single';
  const decks = Array.from({length:4}, (_,index) => ({squad:'SAME',tasks:[
    [invalid ? NaN : 0, invalid || partial ? null : zero ? 0 : revised ? 16 : 4],
    [invalid || partial ? null : zero ? 0 : 9, null],
    ...(revised && index === 0 ? [[4, 1, 0]] : []),
  ]}));
  const deals = [
    {valueK:invalid ? NaN : zero ? 0 : revised ? 20 : 8,enterprise:false},
    {valueK:invalid || partial ? null : zero ? 0 : 9,enterprise:false},
    {valueK:invalid || partial ? null : zero ? 0 : revised ? 360 : 180,enterprise:true},
  ];
  const plans = [
    {plan:'A',hours:invalid ? [NaN, -1] : zero ? [0,0,0] : revised ? [7,8,9] : partial ? [1,null,3] : [1,2,3],bandwidth:invalid ? 0 : 1},
    {plan:'A',hours:invalid || partial ? [null,null] : zero ? [0,0,0] : [3,4,5],bandwidth:invalid ? Infinity : 1},
  ];
  return <>
    <DottyMatrix data={empty ? [] : single ? decks.slice(0,1) : decks} animate={animate} />
    <Beeswarm data={empty ? [] : single ? deals.slice(0,1) : deals} animate={animate} />
    <Violin data={empty ? [] : single ? plans.slice(0,1) : plans} animate={animate} />
  </>;
}
export function ScatterLayoutConsumer({ animate }: { animate: boolean }) {
  const [mode,setMode]=useState<Mode>('normal');
  useEffect(()=>{window.nodexScatterLayoutFixture={setMode};},[]);
  return <>
    <section id="scatter-layout-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate}/></section>
    <section id="scatter-layout-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false}/></section>
  </>;
}
`;

async function setMode(page: Page, mode: string) {
  await page.evaluate((value) => (window as unknown as {nodexScatterLayoutFixture:{setMode:(mode:string)=>void}}).nodexScatterLayoutFixture.setMode(value),mode);
}

export async function checkScatterLayoutConsumer(page: Page): Promise<void> {
  const chart = (slug: string, scope = 'primary') => page.locator(`#scatter-layout-${scope} [data-nx-chart="${slug}"]`);
  const dotty = chart('dotty-matrix'); const bee = chart('beeswarm'); const violin = chart('violin');
  await expect(dotty.locator('[data-nx-task]')).toHaveCount(12);
  await expect(dotty.locator('[data-nx-deck]')).toHaveCount(4);
  await expect(dotty.locator('[data-nx-task="0:0:0"]')).toHaveAttribute('r','0.7');
  expect(Number(await dotty.locator('[data-nx-task="0:0:1"]').getAttribute('r'))).toBeCloseTo(3.3);
  await expect(bee.locator('[data-nx-deal]')).toHaveCount(3);
  await expect(bee.locator('[data-nx-enterprise="true"]')).toHaveCount(1);
  assert.equal(await bee.locator('[data-nx-deal="0"]').getAttribute('cx'),await bee.locator('[data-nx-deal="1"]').getAttribute('cx'),'Deals in the same calibrated lane must pile vertically');
  assert.notEqual(await bee.locator('[data-nx-deal="0"]').getAttribute('cy'),await bee.locator('[data-nx-deal="1"]').getAttribute('cy'));
  await expect(bee.locator('[data-nx-median]')).toHaveText('MEDIAN $9k');
  await expect(violin.locator('[data-nx-violin]')).toHaveCount(2);
  await expect(violin.locator('[data-nx-median="0"]')).toHaveText('2.0h');
  await expect(violin.locator('[data-nx-median="1"]')).toHaveText('4.0h');
  const originalDensity = await violin.locator('[data-nx-violin="0"]').getAttribute('d');

  for (const slug of SCATTER_LAYOUT_SLUGS) {
    const node=chart(slug);
    const first=slug==='dotty-matrix'?'[data-nx-task="3:0:1"]':slug==='beeswarm'?'[data-nx-deal="0"]':'[data-nx-violin="0"]';
    await node.scrollIntoViewIfNeeded();
    if (slug === 'violin') {
      const median = await node.locator('[data-nx-median-rule="0"]').boundingBox();
      assert(median);
      // The full outline includes an empty, zero-width tail; inspect its actual belly.
      await page.mouse.move(median.x + median.width / 2, median.y + median.height / 2);
    } else await node.locator(first).hover();
    const tooltip=node.locator('.recharts-tooltip-wrapper:visible');
    await expect(tooltip).toContainText(slug==='dotty-matrix'?'tasks':slug==='beeswarm'?'k':'median');
    await page.mouse.move(880,10);
    await page.evaluate(()=>new Promise<void>((resolve)=>requestAnimationFrame(()=>resolve())));
    await node.locator('svg.recharts-surface').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tooltip).toContainText(slug==='dotty-matrix'?'tasks':slug==='beeswarm'?'k':'median');
    await expect(chart(slug,'secondary').locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
    const siblingPaint=await chart(slug,'secondary').locator(first).evaluate((element)=>getComputedStyle(element).fill);
    await node.evaluate((element)=>{const style=(element as HTMLElement).style;style.setProperty('--nx-ink','#123456');style.setProperty('--nx-markSoft','#567890');style.setProperty('--nx-type-plotValue-size','34px');});
    await expect.poll(()=>node.locator(first).evaluate((element)=>getComputedStyle(element).fill)).toBe('rgb(18, 52, 86)');
    assert.equal(await chart(slug,'secondary').locator(first).evaluate((element)=>getComputedStyle(element).fill),siblingPaint);
    if (slug!=='dotty-matrix') await expect.poll(()=>node.locator('[data-nx-median]').first().evaluate((element)=>getComputedStyle(element).fontSize)).toBe(slug==='beeswarm'?'19px':'18px');
    const width=Number(await node.locator('svg').getAttribute('width'));
    await node.evaluate((element)=>{(element as HTMLElement).style.width='340px';});
    await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);
    await node.evaluate((element)=>{(element as HTMLElement).style.width='';});
    await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
  }
  await expect.poll(()=>dotty.locator('[data-nx-task="1:0:1"]').evaluate((element)=>getComputedStyle(element).fill)).toBe('rgb(86, 120, 144)');
  await setMode(page,'revised');
  await expect(dotty.locator('[data-nx-task]')).toHaveCount(15);
  expect(Number(await dotty.locator('[data-nx-task="0:0:1"]').getAttribute('r'))).toBeCloseTo(5.6);
  await expect(bee.locator('[data-nx-median]')).toHaveText('MEDIAN $20k');
  await expect(violin.locator('[data-nx-median="0"]')).toHaveText('8.0h');
  await expect(violin.locator('[data-nx-violin="0"]')).not.toHaveAttribute('d',originalDensity!);
  await expect.poll(()=>violin.locator('[data-nx-violin="1"]').evaluate((element)=>getComputedStyle(element).fill)).toBe('rgb(18, 52, 86)');
  const largest=await bee.locator('[data-nx-deal="2"]').boundingBox();const surface=await bee.locator('svg.recharts-surface').boundingBox();
  assert(largest&&surface&&largest.x+largest.width<=surface.x+surface.width,'Expanded deal values must remain inside the chart');
  await setMode(page,'partial');
  await expect(dotty.locator('[data-nx-task]')).toHaveCount(4);
  await expect(bee.locator('[data-nx-deal]')).toHaveCount(1);
  await expect(violin.locator('[data-nx-violin]')).toHaveCount(1);
  await expect(violin.locator('[data-nx-median="0"]')).toHaveText('3.0h');
  for(const mode of ['single','zero','invalid','empty']) {
    await setMode(page,mode);
    for(const slug of SCATTER_LAYOUT_SLUGS) {
      const node=chart(slug);
      if(mode==='invalid'||mode==='empty') await expect(node.getByRole('status')).toContainText('available');
      else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);
      assert.equal(await node.evaluate((element)=>/NaN|Infinity/.test(element.innerHTML)),false,`${slug}: ${mode} produced invalid DOM`);
    }
    if(mode==='zero') {await expect(bee.locator('[data-nx-deal]')).toHaveCount(3);await expect(violin.locator('[data-nx-median="0"]')).toHaveText('0.0h');}
  }
  await setMode(page,'normal');
  console.log('Validated projected decks, calibrated deal piles, caller-data violin densities, ranking/medians, scoped tokens, keyboard tooltips, independent instances and unavailable/zero data.');
}
