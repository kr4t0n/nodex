import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';
export const RACE_SLUGS = ['bar-race'];
export const RACE_CONSUMER_SOURCE = `import {useEffect,useState} from 'react';
import {BarRace} from './components/nodex/bar-race/component';
type Mode='normal'|'revised'|'empty'|'invalid'|'zero'|'partial'|'single'|'incomplete'|'duplicate';
declare global {interface Window {nodexRaceFixture:{setMode:(mode:Mode)=>void;setEnabled:(value:boolean)=>void}}}
function Charts({mode,animate}:{mode:Mode;animate:boolean}){
 const products=[{id:'a',name:'Same'},{id:mode==='duplicate'?'a':'b',name:'B'},{id:'c',name:'Same'}];
 const values=[[30,20,10],[10,40,25],mode==='revised'?[15,60,25]:[50,15,35]];
 const frames=values.map((revenueK,index)=>({period:String(2019+index),revenueK:mode==='invalid'?[NaN,Infinity,-1]:mode==='zero'?[0,0,0]:mode==='partial'?[revenueK[0]!,null,revenueK[2]!]:mode==='incomplete'&&index===2?[10,20]:revenueK}));
 return <BarRace data={mode==='empty'?[]:mode==='single'?frames.slice(0,1).map(frame=>({...frame,revenueK:frame.revenueK.slice(0,1)})):frames} products={mode==='single'?products.slice(0,1):products} animate={animate}/>;
}
export function RaceConsumer({animate}:{animate:boolean}){
 const [mode,setMode]=useState<Mode>('normal');const [enabled,setEnabled]=useState(false);useEffect(()=>{window.nodexRaceFixture={setMode,setEnabled};},[]);
 return <><section id="race-primary" className="w-[660px] space-y-6"><Charts mode={mode} animate={animate||enabled}/></section><section id="race-secondary" className="w-[520px] space-y-6"><Charts mode="normal" animate={false}/></section></>;
}
`;
async function setMode(page:Page,mode:string){await page.evaluate(value=>(window as unknown as {nodexRaceFixture:{setMode:(mode:string)=>void}}).nodexRaceFixture.setMode(value),mode);}
export async function checkRaceConsumer(page:Page):Promise<void>{
 const node=page.locator('#race-primary [data-nx-chart="bar-race"]');const sibling=page.locator('#race-secondary [data-nx-chart="bar-race"]');
 await expect(node.locator('[data-nx-period]')).toHaveText('2021');await expect(node.locator('[data-nx-revenue-bar]')).toHaveCount(3);await expect(node.locator('[data-nx-revenue="a"]')).toHaveText('$50K');
 const y=(id:string)=>node.locator('[data-nx-revenue-bar="'+id+'"]').evaluate(e=>(e as SVGGraphicsElement).getBBox().y);
 assert(await y('a')<await y('c'));assert(await y('c')<await y('b'));
 await node.scrollIntoViewIfNeeded();await node.locator('[data-nx-revenue-bar="a"]').hover();const tooltip=node.locator('.recharts-tooltip-wrapper:visible');await expect(tooltip).toHaveText('Same — $50K');await page.mouse.move(880,10);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>r())));await node.locator('svg.recharts-surface').focus();await page.keyboard.press('ArrowLeft');await expect(tooltip).toHaveText('Same — $35K');await expect(sibling.locator('.recharts-tooltip-wrapper:visible')).toHaveCount(0);
 await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-ink','#123456');s.setProperty('--nx-grid','#234567');s.setProperty('--nx-type-plotValue-size','34px');});await expect.poll(()=>node.locator('[data-nx-revenue-bar="a"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');await expect.poll(()=>node.locator('[data-nx-period]').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(35, 69, 103)');await expect.poll(()=>node.locator('[data-nx-revenue="a"]').evaluate(e=>getComputedStyle(e).fontSize)).toBe('24px');assert.notEqual(await sibling.locator('[data-nx-revenue-bar="a"]').evaluate(e=>getComputedStyle(e).fill),'rgb(18, 52, 86)');
 const width=Number(await node.locator('svg').getAttribute('width'));await node.evaluate(e=>{(e as HTMLElement).style.width='340px';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBeLessThan(width);await node.evaluate(e=>{(e as HTMLElement).style.width='';});await expect.poll(async()=>Number(await node.locator('svg').getAttribute('width'))).toBe(width);
 await setMode(page,'revised');await expect(node.locator('[data-nx-revenue="b"]')).toHaveText('$60K');assert(await y('b')<await y('c'));await expect.poll(()=>node.locator('[data-nx-revenue-bar="b"]').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(18, 52, 86)');
 await setMode(page,'partial');await expect(node.locator('[data-nx-revenue-bar]')).toHaveCount(2);await expect(node.locator('[data-nx-revenue="b"]')).toHaveText('—');await expect(node.locator('[data-nx-product="b"]')).toHaveText('B');
 for(const mode of ['single','zero','invalid','empty','incomplete','duplicate']){await setMode(page,mode);if(['invalid','empty','incomplete','duplicate'].includes(mode))await expect(node.getByRole('status')).toContainText('available');else await expect(node.locator('svg.recharts-surface')).toHaveCount(1);if(mode==='zero'){await expect(node.locator('[data-nx-revenue-bar]')).toHaveCount(0);await expect(node.locator('[data-nx-revenue="a"]')).toHaveText('$0K');}if(mode==='single'){await expect(node.locator('[data-nx-period]')).toHaveText('2019');await expect(node.locator('[data-nx-revenue-bar]')).toHaveCount(1);}if(mode==='incomplete')await expect(node.getByRole('button',{name:/Replay/})).toHaveCount(1);assert.equal(await node.evaluate(e=>/NaN|Infinity/.test(e.innerHTML)),false);}
 await setMode(page,'normal');await node.evaluate(e=>{const s=(e as HTMLElement).style;s.setProperty('--nx-motion-draw-duration','800ms');s.setProperty('--nx-motion-draw-easing','linear');});
 await page.evaluate(()=>(window as unknown as {nodexRaceFixture:{setEnabled:(value:boolean)=>void}}).nodexRaceFixture.setEnabled(true));await expect(node).toHaveAttribute('data-nx-frame','2');await page.emulateMedia({reducedMotion:'no-preference'});await expect(node).toHaveAttribute('data-nx-frame','0');
 const trace=await node.evaluate(element=>new Promise<{frame:number;y:number;period:string}[]>(resolve=>{const start=performance.now();const samples:{frame:number;y:number;period:string}[]=[];const read=()=>{const bar=element.querySelector<SVGGraphicsElement>('[data-nx-revenue-bar="a"]');if(bar)samples.push({frame:Number(element.getAttribute('data-nx-frame')),y:bar.getBBox().y,period:element.querySelector('[data-nx-period]')?.textContent??''});if(performance.now()-start<3200)requestAnimationFrame(read);else resolve(samples);};read();}));
 assert(trace.some(sample=>sample.frame===0&&sample.period==='2019'));assert(trace.some(sample=>sample.frame===1&&sample.period==='2020'));assert(trace.some(sample=>sample.frame===2&&sample.period==='2021'));
 const firstY=trace.find(sample=>sample.frame===0)!.y;const second=trace.filter(sample=>sample.frame===1);const lastY=Math.max(...second.map(sample=>sample.y));assert(second.some(sample=>sample.y>firstY+1&&sample.y<lastY-1),'A stable product must visibly move between ranks, not jump straight to its new row');await expect(node).toHaveAttribute('data-nx-frame','2');
 await node.getByRole('button',{name:/Replay/}).focus();await page.keyboard.press('Enter');await expect(node).toHaveAttribute('data-nx-frame','0');await page.emulateMedia({reducedMotion:'reduce'});await expect(node).toHaveAttribute('data-nx-frame','2');await page.waitForTimeout(1100);await expect(node).toHaveAttribute('data-nx-frame','2');await expect(sibling).toHaveAttribute('data-nx-frame','2');
 await page.evaluate(()=>(window as unknown as {nodexRaceFixture:{setEnabled:(value:boolean)=>void}}).nodexRaceFixture.setEnabled(false));
 console.log('Validated finite ranked playback, visible identity-preserving movement, keyboard replay, final-frame reduced motion, scoped paint/labels, missing and repeated products, and independent instances.');
}
