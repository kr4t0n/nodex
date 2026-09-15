import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const SUMMARY_SLUGS = ['tick-box', 'hairline-area', 'ridgeline', 'dumbbell-queue', 'barcode-lollipop'];
export const SUMMARY_CONSUMER_SOURCE = `import { useEffect, useState } from 'react';
import { TickBox, type TickBoxDatum } from './components/nodex/tick-box/component';
import { HairlineArea } from './components/nodex/hairline-area/component';
import { Ridgeline } from './components/nodex/ridgeline/component';
import { DumbbellQueue } from './components/nodex/dumbbell-queue/component';
import { BarcodeLollipop } from './components/nodex/barcode-lollipop/component';
type Mode = 'normal' | 'revised' | 'empty' | 'zero' | 'invalid' | 'partial' | 'single' | 'sparse';
declare global { interface Window { nodexSummaryFixture: { setMode: (value: Mode) => void } } }
function Charts({ mode, animate }: { mode: Mode; animate: boolean }) {
  const empty = mode === 'empty'; const zero = mode === 'zero'; const invalid = mode === 'invalid';
  const revised = mode === 'revised'; const partial = mode === 'partial'; const single = mode === 'single';
  const plans: TickBoxDatum[] = [
    {plan:'A',summary:invalid ? [4,3,2,1,0] : partial ? null : zero ? [0,0,0,0,0] : revised ? [0,2,4,6,8] : [0,1,2,3,4],outliers:invalid ? [NaN] : zero ? [] : [8]},
    {plan:'A',summary:invalid ? [-1,0,1,2,3] : partial ? null : zero ? [0,0,0,0,0] : [2,3,4,5,6],outliers:invalid ? [-1,Infinity] : zero ? [] : revised ? [10,40] : [10,12]},
  ];
  const values = [invalid ? NaN : partial ? null : zero ? 0 : revised ? 10 : 2,invalid ? -1 : zero ? 0 : 6,zero ? 0 : null,invalid ? Infinity : zero ? 0 : 4];
  const days = values.map((valueK,index)=>({day:'DAY',valueK,axisLabel:index === 0 ? 'START' : index === 3 ? 'END' : undefined}));
  const profiles = [[0.5,1,3,1,0.5],[0.5,2,1,4,0.5]].map((weights,row)=>({pipeline:'A',density:weights.map((weight,hours)=>({hours:invalid ? row === 0 ? NaN : 0 : mode === 'sparse' && row === 1 ? hours*2 : hours,density:partial ? row === 1 || hours % 2 === 0 ? null : weight : zero ? 0 : revised ? weight*2 : weight}))}));
  const steps=[{step:'STEP',beforeMinutes:invalid?NaN:partial?null:zero?0:revised?60:8,afterMinutes:invalid?-1:zero?0:2},{step:'STEP',beforeMinutes:invalid?0.5:zero?0:3,afterMinutes:invalid?Infinity:partial?null:zero?0:5}];
  const peaks=Array.from({length:13},(_,index)=>({day:'Caller day '+index,weekend:index===0,peakUsers:invalid?NaN:partial&&index>0?null:zero?0:index===3?null:index===0?100:index===1?revised?200:99:index===6?90:index===12?80:10,axisLabel:index===0?'Caller period':undefined}));
  return <><BarcodeLollipop data={empty?[]:single?peaks.slice(0,1):peaks} animate={animate}/><DumbbellQueue data={empty?[]:single?steps.slice(0,1):steps} animate={animate}/><TickBox data={empty ? [] : single ? plans.slice(0,1) : plans} animate={animate}/><HairlineArea data={empty ? [] : single ? days.slice(0,1) : days} animate={animate}/><Ridgeline data={empty ? [] : single ? profiles.slice(0,1) : profiles} animate={animate}/></>;
}
export function SummaryConsumer({ animate }: { animate: boolean }) {
  const [mode,setMode]=useState<Mode>('normal');
  useEffect(()=>{window.nodexSummaryFixture={setMode};},[]);
  return <><section id="summary-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate}/></section><section id="summary-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false}/></section></>;
}
`;

async function setMode(page: Page, mode: string) {
  await page.evaluate((value)=>(window as unknown as {nodexSummaryFixture:{setMode:(mode:string)=>void}}).nodexSummaryFixture.setMode(value),mode);
}

export async function checkSummaryConsumer(page: Page): Promise<void> {
  const chart=(slug:string,scope='primary')=>page.locator(`#summary-${scope} [data-nx-chart="${slug}"]`);
  const box=chart('tick-box');const area=chart('hairline-area');
  const ridge=chart('ridgeline');const dumbbell=chart('dumbbell-queue');const barcode=chart('barcode-lollipop');
  await expect(barcode.locator('[data-nx-calendar-day]')).toHaveCount(13);await expect(barcode.locator('[data-nx-peak-day]')).toHaveCount(12);
  assert.deepEqual(await barcode.locator('[data-nx-highlight]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-nx-highlight'))),['0','6','12'],'Peak labels must stay separated by six day positions');
  await barcode.scrollIntoViewIfNeeded();await barcode.locator('[data-nx-peak-day="0"]').hover();await expect(barcode.locator('.recharts-tooltip-wrapper:visible')).toHaveText('Caller day 0 — 100 peak users');
  await page.mouse.move(880,10);await barcode.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');await expect(barcode.locator('.recharts-tooltip-wrapper:visible')).toContainText('peak users');
  await expect(chart('barcode-lollipop','secondary').locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
  await barcode.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-bg','#eeeecc');s.setProperty('--nx-stroke-emphasis','1.4px');});
  await expect.poll(()=>barcode.locator('[data-nx-peak-day="0"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(238, 238, 204)');
  await expect.poll(()=>barcode.locator('[data-nx-peak-day="1"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');
  await expect.poll(()=>barcode.locator('[data-nx-gravity="0"]').evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1.4px');
  assert.notEqual(await chart('barcode-lollipop','secondary').locator('[data-nx-peak-day="1"]').evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
  const barcodeWidth=Number(await barcode.locator('svg').getAttribute('width'));await barcode.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await barcode.locator('svg').getAttribute('width'))).toBeLessThan(barcodeWidth);await barcode.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await barcode.locator('svg').getAttribute('width'))).toBe(barcodeWidth);
  await expect(dumbbell.locator('[data-nx-endpoint]')).toHaveCount(4);
  await expect(dumbbell.locator('[data-nx-minute]')).toHaveCount(6);
  const beadY=await dumbbell.locator('[data-nx-minute]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('cy')));
  assert.equal(new Set(beadY).size,1,'Minute beads retain the original categorical row placement');
  await dumbbell.scrollIntoViewIfNeeded();await dumbbell.locator('[data-nx-endpoint="0:before"]').hover();
  await expect(dumbbell.locator('.recharts-tooltip-wrapper:visible')).toHaveText('STEP — 8 min → 2 min');
  await page.mouse.move(880,10);await dumbbell.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');
  await expect(dumbbell.locator('.recharts-tooltip-wrapper:visible')).toContainText('min →');
  await expect(chart('dumbbell-queue','secondary').locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
  await dumbbell.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-stroke-mark','1.4px');});
  await expect.poll(()=>dumbbell.locator('[data-nx-endpoint="0:after"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');
  await expect.poll(()=>dumbbell.locator('[data-nx-endpoint="0:before"]').evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1.82px');
  assert.notEqual(await chart('dumbbell-queue','secondary').locator('[data-nx-endpoint="0:after"]').evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
  const dumbbellWidth=Number(await dumbbell.locator('svg').getAttribute('width'));
  await dumbbell.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await dumbbell.locator('svg').getAttribute('width'))).toBeLessThan(dumbbellWidth);
  await dumbbell.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await dumbbell.locator('svg').getAttribute('width'))).toBe(dumbbellWidth);
  await expect(box.locator('[data-nx-box]')).toHaveCount(2);
  await expect(box.locator('[data-nx-outlier]')).toHaveCount(3);
  await expect(box.locator('[data-nx-median="0:box"]')).toHaveText('2.0h');
  await expect(area.locator('[data-nx-day]')).toHaveCount(3);
  await expect(area.locator('[data-nx-peak="1"]')).toContainText('6k');
  const originalLine=await area.locator('.recharts-line-curve').getAttribute('d');
  assert((originalLine?.match(/M/g)?.length??0)>1,'An unavailable day must split the line');
  await expect(ridge.locator('.nx-ridge-crest .recharts-line-curve')).toHaveCount(2);
  await expect(ridge.locator('.nx-ridge-fill .recharts-area-area')).toHaveCount(2);
  await expect(ridge.locator('[data-nx-ridge]')).toHaveCount(6);
  const originalRidges=await ridge.locator('.nx-ridge-crest .recharts-line-curve').evaluateAll((nodes)=>nodes.map((node)=>node.getAttribute('d')));
  for(const slug of ['tick-box','hairline-area']) {
    const node=chart(slug);
    await node.scrollIntoViewIfNeeded();
    if(slug==='tick-box') await node.locator('[data-nx-observation="0:box"]').hover();
    else {const mark=await node.locator('[data-nx-day="1"]').boundingBox();assert(mark);await page.mouse.move(mark.x,mark.y+mark.height/2);}
    const tooltip=node.locator('.recharts-tooltip-wrapper:visible');
    await expect(tooltip).toContainText(slug==='tick-box'?'1–3h':'6k');
    await page.mouse.move(880,10);
    await page.evaluate(()=>new Promise<void>((resolve)=>requestAnimationFrame(()=>resolve())));
    await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');
    await expect(tooltip).toContainText(slug==='tick-box'?'tickets':'DAY');
    await expect(chart(slug,'secondary').locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
    const mark=slug==='tick-box'?'[data-nx-box="0:box"]':'.recharts-line-curve';
    const property=slug==='tick-box'?'fill':'stroke';
    const siblingPaint=await chart(slug,'secondary').locator(mark).evaluate((element,key)=>getComputedStyle(element).getPropertyValue(key),property);
    await node.evaluate((element)=>{const style=(element as HTMLElement).style;style.setProperty('--nx-ink','#123456');style.setProperty('--nx-muted','#987654');style.setProperty('--nx-stroke-hairline','1.4px');style.setProperty('--nx-stroke-mark','2px');});
    await expect.poll(()=>node.locator(mark).evaluate((element,key)=>getComputedStyle(element).getPropertyValue(key),property)).toBe('rgb(18, 52, 86)');
    assert.equal(await chart(slug,'secondary').locator(mark).evaluate((element,key)=>getComputedStyle(element).getPropertyValue(key),property),siblingPaint);
    await expect.poll(()=>node.locator(slug==='tick-box'?mark:'[data-nx-day="1"]').evaluate((element)=>getComputedStyle(element).strokeWidth)).toBe(slug==='tick-box'?'2px':'1.1px');
    const width=Number(await node.locator('svg').getAttribute('width'));
    await node.evaluate((element)=>{(element as HTMLElement).style.width='340px';});
    await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);
    await node.evaluate((element)=>{(element as HTMLElement).style.width='';});
    await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
  }
  await box.scrollIntoViewIfNeeded();await box.locator('[data-nx-outlier="1:outlier:1"]').hover();
  await expect(box.locator('.recharts-tooltip-wrapper:visible')).toHaveText('A — 12h outlier');
  await ridge.scrollIntoViewIfNeeded();await page.mouse.move(880,10);
  await ridge.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowRight');
  const reading=ridge.locator('.recharts-tooltip-wrapper [role="status"]');
  await expect(reading).toContainText('hours. A:');
  const readingBox=await reading.boundingBox();assert(readingBox&&readingBox.width<=1&&readingBox.height<=1,'Ridgeline must retain its presentation without a visible tooltip');
  await ridge.evaluate((element)=>{const style=(element as HTMLElement).style;style.setProperty('--nx-ink','#123456');style.setProperty('--nx-stroke-hairline','1.4px');});
  await expect.poll(()=>ridge.locator('.nx-ridge-crest .recharts-line-curve').first().evaluate((element)=>getComputedStyle(element).stroke)).toBe('rgb(18, 52, 86)');
  await expect.poll(()=>ridge.locator('[data-nx-ridge]').first().evaluate((element)=>getComputedStyle(element).strokeWidth)).toBe('1px');
  assert.notEqual(await chart('ridgeline','secondary').locator('.nx-ridge-crest .recharts-line-curve').first().evaluate((element)=>getComputedStyle(element).stroke),'rgb(18, 52, 86)');
  const ridgeWidth=Number(await ridge.locator('svg').getAttribute('width'));
  await ridge.evaluate((element)=>{(element as HTMLElement).style.width='340px';});
  await expect.poll(async()=>Number(await ridge.locator('svg').getAttribute('width'))).toBeLessThan(ridgeWidth);
  await ridge.evaluate((element)=>{(element as HTMLElement).style.width='';});
  await expect.poll(async()=>Number(await ridge.locator('svg').getAttribute('width'))).toBe(ridgeWidth);
  await setMode(page,'sparse');
  await ridge.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');
  await expect(reading).toContainText('0.00 hours');
  await page.keyboard.press('ArrowRight');
  await expect(reading).toHaveText('1.00 hours. A: 1.00. A: unavailable');
  await setMode(page,'normal');
  await setMode(page,'revised');
  await expect(box.locator('[data-nx-median="0:box"]')).toHaveText('4.0h');
  await expect(dumbbell.locator('[data-nx-minute]')).toHaveCount(58);
  await expect(barcode.locator('[data-nx-highlight="0"]')).toHaveCount(0);await expect(barcode.locator('[data-nx-highlight="1"]')).toHaveText('200');
  const endpoint=await dumbbell.locator('[data-nx-endpoint="0:before"]').boundingBox();const dumbbellSurface=await dumbbell.locator('svg').boundingBox();assert(endpoint&&dumbbellSurface&&endpoint.x+endpoint.width<=dumbbellSurface.x+dumbbellSurface.width,'Larger times must expand the minute scale');
  await expect(area.locator('[data-nx-peak="0"]')).toContainText('10k');
  await expect(area.locator('.recharts-line-curve')).not.toHaveAttribute('d',originalLine!);
  await expect.poll(()=>ridge.locator('.nx-ridge-crest .recharts-line-curve').evaluateAll((nodes)=>nodes.map((node)=>node.getAttribute('d')))).toEqual(originalRidges);
  const outlier=await box.locator('[data-nx-outlier="1:outlier:1"]').boundingBox();const surface=await box.locator('svg').boundingBox();
  assert(outlier&&surface&&outlier.y>=surface.y,'An expanded outlier must remain in the chart');
  await setMode(page,'partial');
  await expect(box.locator('[data-nx-box]')).toHaveCount(0);await expect(box.locator('[data-nx-outlier]')).toHaveCount(3);
  await expect(area.locator('[data-nx-day]')).toHaveCount(2);
  await expect(barcode.locator('[data-nx-calendar-day]')).toHaveCount(13);await expect(barcode.locator('[data-nx-peak-day]')).toHaveCount(1);
  await expect(ridge.locator('[data-nx-ridge]')).toHaveCount(0);
  await expect(dumbbell.locator('[data-nx-minute]')).toHaveCount(0);await expect(dumbbell.locator('[data-nx-endpoint]')).toHaveCount(2);
  await dumbbell.scrollIntoViewIfNeeded();await dumbbell.locator('[data-nx-endpoint="0:after"]').hover();await expect(dumbbell.locator('.recharts-tooltip-wrapper:visible')).toHaveText('STEP — unavailable → 2 min');
  for(const mode of ['single','zero','invalid','empty']) {
    await setMode(page,mode);
    for(const slug of SUMMARY_SLUGS) {
      const node=chart(slug);
      if(mode==='invalid'||mode==='empty') await expect(node.getByRole('status')).toContainText('available');
      else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);
      assert.equal(await node.evaluate((element)=>/NaN|Infinity/.test(element.innerHTML)),false,`${slug}: ${mode} produced invalid DOM`);
    }
    if(mode==='zero'){await expect(box.locator('[data-nx-median="0:box"]')).toHaveText('0.0h');await expect(area.locator('[data-nx-peak]')).toContainText('0k');}
  }
  await setMode(page,'normal');
  console.log('Validated five-number summaries and individual outliers, hairline/line composition, missing-day gaps, peak changes, tokenized hairline widths, scales, tooltips and independent instances.');
}
