import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const TIMELINE_SLUGS = ['trend-lineage', 'launch-fan', 'dot-cascade'];
export const TIMELINE_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { LaunchFan } from './components/nodex/launch-fan/component';
import { DotCascade } from './components/nodex/dot-cascade/component';
import { TrendLineage, type TrendLineageDatum } from './components/nodex/trend-lineage/component';
type Mode = 'normal' | 'revised' | 'partial' | 'empty' | 'invalid' | 'zero' | 'single' | 'window';
declare global { interface Window { nodexTimelineFixture: { setMode: (value: Mode) => void } } }
function Charts({ mode, animate }: { mode: Mode; animate: boolean }) {
  const zero=mode==='zero'; const invalid=mode==='invalid'; const revised=mode==='revised';
  const data: TrendLineageDatum[] = [
    {name:'A',alive:!revised,events:[{year:invalid?NaN:zero?0:2018,kind:'shipped'},{year:mode==='partial'?null:zero?0:2021,kind:'reworked'},{year:zero?0:2022,kind:'reworked'}]},
    {name:'A',alive:revised,events:[{year:invalid?Infinity:zero?0:2017,kind:'shipped'}]},
  ];
  const observations=[{feature:'A',week:invalid?NaN:zero?0:revised?12:1,cause:'A',incidents:invalid?0.5:zero?0:revised?9:5},{feature:'A',week:invalid?Infinity:mode==='partial'?null:zero?0:6,cause:'A',incidents:invalid?NaN:mode==='partial'?null:zero?0:3}];
  const rows=mode==='empty'?[]:mode==='single'?observations.slice(0,1):observations;
  return <><LaunchFan data={rows} guideWeeks={[5,10,15,20,5,NaN,-1]} animate={animate}/><DotCascade data={rows} animate={animate}/><TrendLineage data={mode==='empty'?[]:mode==='single'?data.slice(1):data} years={mode==='window'?[2026,2016]:zero?[0,0]:[2016,2026]} animate={animate}/></>;
}
export function TimelineConsumer({ animate }: { animate: boolean }) {
  const [mode,setMode]=useState<Mode>('normal');
  useEffect(()=>{window.nodexTimelineFixture={setMode};},[]);
  return <><section id="timeline-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate}/></section><section id="timeline-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false}/></section></>;
}
`;
async function setMode(page: Page, mode: string) {
  await page.evaluate((value)=>(window as unknown as {nodexTimelineFixture:{setMode:(mode:string)=>void}}).nodexTimelineFixture.setMode(value),mode);
}
export async function checkTimelineConsumer(page: Page): Promise<void> {
  const node=page.locator('#timeline-primary [data-nx-chart="trend-lineage"]');
  const sibling=page.locator('#timeline-secondary [data-nx-chart="trend-lineage"]');
  await expect(node.locator('[data-nx-event]')).toHaveCount(4);
  await expect(node.locator('[data-nx-lifeline="dormant"]')).toHaveCount(1);
  await expect(node.locator('[data-nx-lifeline="active"]')).toHaveCount(1);
  await expect(node.locator('[data-nx-tail="0"]')).toHaveCount(1);
  await expect(node.locator('[data-nx-terminal="retired"]')).toHaveCount(1);
  await node.scrollIntoViewIfNeeded();await node.locator('[data-nx-observation="0:1"]').hover();
  const tooltip=node.locator('.recharts-tooltip-wrapper:visible');
  await expect(tooltip).toHaveText('A — reworked 2021');
  await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));
  await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');
  await expect(tooltip).toHaveText(/A — (shipped|reworked) \d+/);
  await page.keyboard.press('ArrowLeft');await expect(tooltip).toHaveText('A — shipped 2018');
  await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — reworked 2021');
  await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — reworked 2022');
  await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText('A — shipped 2017');
  for(let i=0;i<6;i++) {await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText(/A — (shipped|reworked) \d+/);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));}
  await expect(sibling.locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
  const siblingPaint=await sibling.locator('[data-nx-event="shipped"]').first().evaluate(e=>getComputedStyle(e).fill);
  await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-bg','#eeeecc');s.setProperty('--nx-stroke-mark','1.25px');});
  await expect.poll(()=>node.locator('[data-nx-event="shipped"]').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');
  await expect.poll(()=>node.locator('[data-nx-event="reworked"]').first().evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(238, 238, 204)');
  await expect.poll(()=>node.locator('[data-nx-event="reworked"]').first().evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1.75px');
  assert.equal(await sibling.locator('[data-nx-event="shipped"]').first().evaluate(e=>getComputedStyle(e).fill),siblingPaint);
  const width=Number(await node.locator('svg').getAttribute('width'));
  await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});
  await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);
  await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
  await setMode(page,'revised');await expect(node.locator('[data-nx-tail="0"]')).toHaveCount(0);await expect(node.locator('[data-nx-tail="1"]')).toHaveCount(1);
  await setMode(page,'partial');await expect(node.locator('[data-nx-event]')).toHaveCount(1);await expect(node.locator('[data-nx-tail]')).toHaveCount(0);
  for(const mode of ['single','zero','invalid','empty','window']) {
    await setMode(page,mode);
    if(['invalid','empty','window'].includes(mode)) await expect(node.getByRole('status')).toHaveText('No events available.');
    else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);
    assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false,`${mode} produced invalid timeline geometry`);
  }
  await setMode(page,'normal');
  await checkGeometricTimelines(page);
  console.log('Validated event-only inspection, dormant intervals, survival tails, repeated feature names, scoped event paint/strokes, resizing and incomplete timelines.');
}

async function checkGeometricTimelines(page:Page):Promise<void>{
 const fan=page.locator('#timeline-primary [data-nx-chart="launch-fan"]');const dots=page.locator('#timeline-primary [data-nx-chart="dot-cascade"]');
 await expect(fan.locator('[data-nx-launch]')).toHaveCount(2);await expect(fan.locator('[data-nx-spoke]')).toHaveCount(2);await expect(fan.locator('[data-nx-week-guide]')).toHaveCount(4);await expect(dots.locator('[data-nx-incident-dot], [data-nx-stack-top]')).toHaveCount(5);await expect(dots.locator('[data-nx-stack-top]')).toHaveCount(2);await expect(dots.locator('[data-nx-cause]')).toHaveCount(2);await expect(dots.locator('[data-nx-total="0"]')).toHaveText('5');
 assert.notEqual(await dots.locator('[data-nx-stack-top="0"]').getAttribute('cx'),await dots.locator('[data-nx-stack-top="1"]').getAttribute('cx'));
 const originalY=Number(await fan.locator('[data-nx-launch="0"]').getAttribute('cy'));
 for(const [node,mark,expected] of [[fan,'[data-nx-launch="0"]','A · W1'],[dots,'[data-nx-stack-top="0"]','A — 5 incidents']] as const){await node.scrollIntoViewIfNeeded();await node.locator(mark).hover();const tooltip=node.locator('.recharts-tooltip-wrapper:visible');await expect(tooltip).toHaveText(expected);await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');await expect(tooltip).toHaveText(node===fan?'A · W6':'A — 3 incidents');await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-grid','#234567');s.setProperty('--nx-plotFaint','#234567');s.setProperty('--nx-stroke-mark','1.4px');s.setProperty('--nx-type-plotValue-size','34px');});await expect.poll(()=>node.locator(mark).evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');const guide=node.locator('[data-nx-floor], [data-nx-week-guide]').first();await expect.poll(()=>guide.evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(35, 69, 103)');await expect.poll(()=>guide.evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1.4px');const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);}
 await expect.poll(()=>dots.locator('[data-nx-total="0"]').evaluate(e=>getComputedStyle(e).fontSize)).toBe('18px');assert.notEqual(await page.locator('#timeline-secondary [data-nx-launch="0"]').evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
 await setMode(page,'revised');await expect(fan.locator('[data-nx-launch-label="0"]')).toHaveText('A · W12');assert(Number(await fan.locator('[data-nx-launch="0"]').getAttribute('cy'))<originalY);await expect(dots.locator('[data-nx-incident-dot], [data-nx-stack-top]')).toHaveCount(7);
 await setMode(page,'partial');await expect(fan.locator('[data-nx-launch]')).toHaveCount(1);await expect(fan.locator('[data-nx-spoke]')).toHaveCount(1);await expect(fan.locator('[data-nx-launch-label="1"]')).toHaveText('A · —');await expect(dots.locator('[data-nx-total="1"]')).toHaveText('—');await expect(dots.locator('[data-nx-incident-dot], [data-nx-stack-top]')).toHaveCount(3);
 for(const mode of ['single','zero','invalid','empty']){await setMode(page,mode);for(const node of [fan,dots]){if(mode==='invalid'||mode==='empty')await expect(node.getByRole('status')).toContainText('available');else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);}if(mode==='zero'){await expect(fan.locator('[data-nx-launch]')).toHaveCount(2);await expect(fan.locator('[data-nx-spoke]')).toHaveCount(0);await expect(dots.locator('[data-nx-stack-top], [data-nx-incident-dot]')).toHaveCount(0);await expect(dots.locator('[data-nx-total="0"]')).toHaveText('0');}if(mode==='single'){await expect(fan.locator('[data-nx-launch]')).toHaveCount(1);await expect(dots.locator('[data-nx-stack-top]')).toHaveCount(1);}}
 await setMode(page,'normal');
}
