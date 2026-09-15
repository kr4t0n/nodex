import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

export const PROGRESS_SLUGS = ['stagger-delay', 'dynamic-data', 'draw-in-counter'];
export const PROGRESS_CONSUMER_SOURCE = `import {useEffect,useState} from 'react';
import {AnimationControllerProvider,type AnimationController} from 'recharts';
import {StaggerDelay} from './components/nodex/stagger-delay/component';
import {DynamicData} from './components/nodex/dynamic-data/component';
import {DrawInCounter} from './components/nodex/draw-in-counter/component';
type Mode='normal'|'revised'|'partial'|'tail'|'zero'|'single'|'invalid'|'empty';
const pending=new Set<(progress:number)=>void>();
const controller:AnimationController=(_timer,handle,listener)=>{
 handle.tick(0);handle.tick(handle.getAnimationBegin());
 const seek=(progress:number)=>{handle.tick(handle.getAnimationBegin()+handle.getAnimationDuration()*progress);if(progress>=1)handle.complete();listener(handle.getInterpolated());};
 pending.add(seek);seek(0);return ()=>{pending.delete(seek);};
};
declare global {interface Window {nodexProgressFixture:{setMode:(mode:Mode)=>void;setManual:(enabled:boolean)=>void;seek:(progress:number)=>void;pending:()=>number}}}
function Charts({mode,animate}:{mode:Mode;animate:boolean}) {
 const values=mode==='invalid'?[NaN,Infinity,-1]:mode==='zero'?[0,0,0]:mode==='partial'?[20,null,100]:mode==='tail'?[20,60,null]:mode==='revised'?[80,30,50]:[20,60,100];
 const rows=(mode==='empty'?[]:mode==='single'?values.slice(0,1):values).map((value,index)=>({market:'Same',value,axisLabel:String(index+1),sample:'Same',usersK:value,day:'Day '+index,bookingsK:value===null?null:value*100}));
 return <><StaggerDelay data={rows} animate={animate}/><DynamicData data={rows} sourceStatus={mode==='revised'?'SAMPLED':'LIVE'} animate={animate}/><DrawInCounter data={rows} periodLabel={mode==='revised'?'REVISED PERIOD':'TEST PERIOD'} animate={animate}/></>;
}
export function ProgressConsumer({animate}:{animate:boolean}){
 const [mode,setMode]=useState<Mode>('normal');const [manual,setManual]=useState(false);
 useEffect(()=>{window.nodexProgressFixture={setMode,setManual,seek:progress=>pending.forEach(seek=>seek(progress)),pending:()=>pending.size};},[]);
 return <><section id="progress-primary" className="w-[660px] space-y-6"><AnimationControllerProvider value={controller}><Charts mode={mode} animate={animate||manual}/></AnimationControllerProvider></section><section id="progress-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false}/></section></>;
}
`;
async function setMode(page:Page,mode:string){await page.evaluate(value=>(window as unknown as {nodexProgressFixture:{setMode:(mode:string)=>void}}).nodexProgressFixture.setMode(value),mode);}
export async function checkProgressConsumer(page:Page):Promise<void>{
 const chart=(slug:string,scope='primary')=>page.locator(`#progress-${scope} [data-nx-chart="${slug}"]`);
 const bars=chart('stagger-delay');const feed=chart('dynamic-data');const counter=chart('draw-in-counter');
 await expect(bars.locator('[data-nx-market]')).toHaveCount(3);await expect(feed.locator('[data-nx-current]')).toHaveText('100k');await expect(counter.locator('[data-nx-total]')).toHaveText('$18.00M');
 const original=await feed.locator('.recharts-area-curve').getAttribute('d');assert(original?.includes('C'));await expect(counter.locator('[data-nx-period]')).toHaveText('TEST PERIOD');
 const ids=await page.locator('#progress-primary linearGradient, #progress-secondary linearGradient').evaluateAll(nodes=>nodes.map(e=>e.id));assert.equal(new Set(ids).size,ids.length);
 for(const slug of PROGRESS_SLUGS){const node=chart(slug);await node.scrollIntoViewIfNeeded();await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');const status=node.getByRole('status');await expect(status).toContainText(slug==='stagger-delay'?'Same — 20':slug==='dynamic-data'?'Same — 20k users':'Day 0 — $2000.00K cumulative');await page.keyboard.press('ArrowRight');await expect(status).toContainText(slug==='stagger-delay'?'Same — 60':slug==='dynamic-data'?'Same — 60k users':'Day 1 — $8000.00K cumulative');await expect(chart(slug,'secondary').getByRole('status')).toHaveCount(0);
  await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-stroke-emphasis','1.3px');s.setProperty('--nx-type-plotValue-size','34px');});
  if(slug==='stagger-delay')await expect.poll(()=>node.locator('[data-nx-market="2"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');else{await expect.poll(()=>node.locator('.recharts-area-curve').evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(18, 52, 86)');await expect.poll(()=>node.locator('.recharts-area-curve').evaluate(e=>getComputedStyle(e).strokeWidth)).toBe('1.3px');await expect.poll(()=>node.locator('stop').first().evaluate(e=>getComputedStyle(e).stopColor)).toBe('rgb(18, 52, 86)');}
  const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
 }
 await expect.poll(()=>counter.locator('[data-nx-total]').evaluate(e=>getComputedStyle(e).fontSize)).toBe('64px');assert.notEqual(await chart('dynamic-data','secondary').locator('.recharts-area-curve').evaluate(e=>getComputedStyle(e).stroke),'rgb(18, 52, 86)');
 await setMode(page,'revised');await expect(feed.locator('[data-nx-current]')).toHaveText('50k');await expect(feed.locator('[data-nx-source-status]')).toHaveText('SAMPLED');await expect(feed.locator('.recharts-area-curve')).not.toHaveAttribute('d',original!);await expect(counter.locator('[data-nx-total]')).toHaveText('$16.00M');await expect(counter.locator('[data-nx-period]')).toHaveText('REVISED PERIOD');await expect.poll(()=>bars.locator('[data-nx-market="0"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');
 await setMode(page,'partial');await expect(bars.locator('[data-nx-market]')).toHaveCount(2);await expect(counter.locator('[data-nx-total]')).toHaveText('—');const gapPath=await feed.locator('.recharts-area-curve').getAttribute('d');assert.equal(gapPath?.match(/M/g)?.length,2);await expect(feed.locator('[data-nx-current]')).toHaveText('100k');
 await setMode(page,'tail');await expect(feed.locator('[data-nx-current]')).toHaveText('—');await expect(counter.locator('[data-nx-total]')).toHaveText('—');
 for(const mode of ['zero','single','invalid','empty']){await setMode(page,mode);for(const slug of PROGRESS_SLUGS){const node=chart(slug);if(mode==='invalid'||mode==='empty')await expect(node.getByRole('status')).toContainText('available');else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);}if(mode==='zero'){await expect(bars.locator('[data-nx-market]')).toHaveCount(0);await expect(feed.locator('[data-nx-current]')).toHaveText('0k');await expect(counter.locator('[data-nx-total]')).toHaveText('$0.00M');}if(mode==='single')await expect(counter.locator('[data-nx-total]')).toHaveText('$2.00M');}
 await setMode(page,'normal');
 const fullHeights=await bars.locator('[data-nx-market]').evaluateAll(nodes=>nodes.map(e=>(e as SVGGraphicsElement).getBBox().height));
 await page.locator('#progress-primary').evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-motion-draw-duration','1s');s.setProperty('--nx-motion-draw-easing','linear');});
 await setMode(page,'zero');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>(window as unknown as {nodexProgressFixture:{setManual:(value:boolean)=>void}}).nodexProgressFixture.setManual(true));
 await expect(counter).toHaveAttribute('data-nx-animated','true');await expect.poll(()=>page.evaluate(()=>(window as unknown as {nodexProgressFixture:{pending:()=>number}}).nodexProgressFixture.pending())).toBeGreaterThanOrEqual(3);
 await setMode(page,'normal');await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await page.evaluate(()=>(window as unknown as {nodexProgressFixture:{seek:(progress:number)=>void}}).nodexProgressFixture.seek(0.5));await expect(counter.locator('[data-nx-total]')).toHaveText('$9.00M');
 const reveal=counter.locator('.nx-cumulative-area clipPath rect');await expect(reveal).toHaveCount(1);const clipWidth=Number(await reveal.getAttribute('width'));const plotWidth=Number(await counter.locator('svg').getAttribute('width'))-34;assert(Math.abs(clipWidth/plotWidth-0.5)<0.003,'The area must be half-revealed when the headline reaches half its total');
 const halfHeights=await bars.locator('[data-nx-market]').evaluateAll(nodes=>nodes.map(e=>(e as SVGGraphicsElement).getBBox().height));assert.equal(halfHeights.length,3);assert(halfHeights[0]!/fullHeights[0]!>halfHeights[2]!/fullHeights[2]!, 'Earlier bars must lead later bars at the same library animation time');
 for(const slug of PROGRESS_SLUGS)assert.equal(await chart(slug).evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false,'Animation produced invalid clip geometry');
 await page.evaluate(()=>(window as unknown as {nodexProgressFixture:{seek:(progress:number)=>void}}).nodexProgressFixture.seek(1));await expect(counter.locator('[data-nx-total]')).toHaveText('$18.00M');
 await page.evaluate(()=>(window as unknown as {nodexProgressFixture:{setManual:(value:boolean)=>void}}).nodexProgressFixture.setManual(false));await page.emulateMedia({reducedMotion:'reduce'});
 console.log('Validated native stagger timing, shared curve source delivery, synchronized cumulative count/area progress, current-sample gaps, scoped gradients/strokes, keyboard data and reduced motion.');
}
